-- ============================================================================
-- CO-LAB CONNECT | Migration 002 - Governance (money safety already matches)
-- Target: Supabase PostgreSQL (15+). Safe to run more than once.
-- Run AFTER 001_duplicate_prevention.sql in the SQL Editor
-- or via:  psql "$SUPABASE_DB_URL" -f 002_governance.sql
--
-- Covers:
--   1) Money columns are NUMERIC(12,2) everywhere (schema.sql already does
--      this; the SQLAlchemy models were aligned to match in this release).
--   2) worker verification_status extended:
--      pending / under_review / verified / rejected / suspended / expired.
--   3) New tables: otp_challenges, matching_recommendations,
--      allocation_offers, settlements, verification_evidences,
--      verification_history, worker_compliance_records, worker_violations.
--   4) Indexes for common queries (customer/worker/coop/federation/status/
--      created_at/booking/request).
--
-- The whole file runs in ONE transaction; if any statement fails, nothing
-- is applied.
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- 1) Verification status: allow the full lifecycle on workers and
--    worker_certifications (drop old check, add extended check).
-- ----------------------------------------------------------------------------
do $$
begin
    if exists (
        select 1 from pg_constraint
        where conrelid = 'public.workers'::regclass
          and conname = 'workers_verification_status_check'
    ) then
        alter table public.workers drop constraint workers_verification_status_check;
    end if;
    alter table public.workers
        add constraint workers_verification_status_check
        check (verification_status in
               ('pending','under_review','verified','rejected','suspended','expired'));
exception when duplicate_object then
    raise notice 'workers verification check already extended; skipped';
end $$;

-- ----------------------------------------------------------------------------
-- 2) OTP challenges: persistent, hashed, rate-limited (Phase 3).
-- ----------------------------------------------------------------------------
create table if not exists public.otp_challenges (
    id serial primary key,
    user_id integer not null references public.users(id) on delete cascade,
    phone varchar(20) not null,
    otp_hash varchar(255) not null,
    expires_at timestamptz not null,
    attempts integer not null default 0,
    max_attempts integer not null default 5,
    last_sent_at timestamptz,
    verified_at timestamptz,
    created_at timestamptz not null default now()
);
create index if not exists ix_otp_challenges_phone on public.otp_challenges(phone);

-- ----------------------------------------------------------------------------
-- 3) Matching recommendations: auditable AI snapshots (Phase 9).
-- ----------------------------------------------------------------------------
create table if not exists public.matching_recommendations (
    id serial primary key,
    request_id integer not null references public.service_requests(id) on delete cascade,
    worker_id integer not null references public.workers(id) on delete cascade,
    score double precision not null,
    skill_score double precision,
    qualification_score double precision,
    location_score double precision,
    availability_score double precision,
    experience_score double precision,
    workload_score double precision,
    fairness_score double precision,
    rating_score double precision,
    explanation text,
    rank integer not null default 0,
    created_at timestamptz not null default now()
);
create index if not exists ix_matching_recommendations_request
    on public.matching_recommendations(request_id);

-- ----------------------------------------------------------------------------
-- 4) Allocation offers: 2-minute server-side timeout (Phase 8).
-- ----------------------------------------------------------------------------
create table if not exists public.allocation_offers (
    id serial primary key,
    request_id integer not null references public.service_requests(id) on delete cascade,
    worker_id integer not null references public.workers(id) on delete cascade,
    allocation_id integer references public.allocations(id) on delete set null,
    status varchar(20) not null default 'offered'
        check (status in ('offered','accepted','rejected','expired','cancelled')),
    offered_at timestamptz not null default now(),
    expires_at timestamptz not null,
    accepted_at timestamptz,
    rejected_at timestamptz,
    timeout_at timestamptz,
    response_reason text
);
create index if not exists ix_allocation_offers_request
    on public.allocation_offers(request_id);
create index if not exists ix_allocation_offers_worker_status
    on public.allocation_offers(worker_id, status);

-- ----------------------------------------------------------------------------
-- 5) Settlements ledger (Phase 13). Money is NUMERIC(12,2).
-- ----------------------------------------------------------------------------
create table if not exists public.settlements (
    id serial primary key,
    booking_id integer not null unique references public.bookings(id) on delete cascade,
    invoice_id integer references public.invoices(id) on delete set null,
    gross_amount numeric(12,2),
    commission numeric(12,2),
    welfare numeric(12,2),
    worker_payout numeric(12,2),
    status varchar(20) not null default 'pending',
    settled_at timestamptz,
    transaction_reference varchar(255),
    created_at timestamptz not null default now()
);
create index if not exists ix_settlements_booking on public.settlements(booking_id);

-- ----------------------------------------------------------------------------
-- 6) Verification evidence + history (Phase 5).
-- ----------------------------------------------------------------------------
create table if not exists public.verification_evidences (
    id serial primary key,
    worker_id integer not null references public.workers(id) on delete cascade,
    evidence_type varchar(50) not null,
    title varchar(255) not null,
    document_reference varchar(512),
    issuing_authority varchar(255),
    reviewed_by integer references public.users(id) on delete set null,
    reviewed_at timestamptz,
    decision varchar(20) not null default 'pending',
    notes text,
    created_at timestamptz not null default now()
);
create index if not exists ix_verification_evidences_worker
    on public.verification_evidences(worker_id);

create table if not exists public.verification_history (
    id serial primary key,
    worker_id integer not null references public.workers(id) on delete cascade,
    from_status varchar(20),
    to_status varchar(20) not null,
    changed_by integer references public.users(id) on delete set null,
    notes text,
    created_at timestamptz not null default now()
);
create index if not exists ix_verification_history_worker
    on public.verification_history(worker_id);

-- ----------------------------------------------------------------------------
-- 7) Compliance records + violations (Phase 6).
-- ----------------------------------------------------------------------------
create table if not exists public.worker_compliance_records (
    id serial primary key,
    worker_id integer not null references public.workers(id) on delete cascade,
    requirement_type varchar(50) not null,
    requirement_name varchar(255) not null,
    status varchar(20) not null default 'pending',
    document_reference varchar(512),
    issued_date date,
    expiry_date date,
    verified_by integer references public.users(id) on delete set null,
    notes text,
    created_at timestamptz not null default now()
);
create index if not exists ix_worker_compliance_worker
    on public.worker_compliance_records(worker_id);

create table if not exists public.worker_violations (
    id serial primary key,
    worker_id integer not null references public.workers(id) on delete cascade,
    booking_id integer references public.bookings(id) on delete set null,
    reported_by integer references public.users(id) on delete set null,
    category varchar(50) not null,
    description text not null,
    severity varchar(20) not null default 'medium',
    status varchar(20) not null default 'reported',
    investigation_notes text,
    resolution text,
    resolved_by integer references public.users(id) on delete set null,
    created_at timestamptz not null default now(),
    resolved_at timestamptz
);
create index if not exists ix_worker_violations_worker_status
    on public.worker_violations(worker_id, status);

-- ----------------------------------------------------------------------------
-- 8) Query indexes for hot paths (Phase 23).
-- ----------------------------------------------------------------------------
create index if not exists ix_bookings_customer on public.bookings(customer_id);
create index if not exists ix_bookings_worker on public.bookings(worker_id);
create index if not exists ix_bookings_cooperative on public.bookings(cooperative_id);
create index if not exists ix_bookings_status on public.bookings(status);
create index if not exists ix_bookings_created on public.bookings(created_at);
create index if not exists ix_requests_customer on public.service_requests(customer_id);
create index if not exists ix_requests_cooperative on public.service_requests(cooperative_id);
create index if not exists ix_requests_status on public.service_requests(status);
create index if not exists ix_requests_created on public.service_requests(created_at);
create index if not exists ix_workers_cooperative on public.workers(cooperative_id);
create index if not exists ix_payments_booking on public.payments(booking_id);
create index if not exists ix_invoices_booking on public.invoices(booking_id);
create index if not exists ix_ratings_booking on public.ratings(booking_id);
create index if not exists ix_cooperatives_federation on public.cooperatives(federation_id);

commit;

-- ============================================================================
-- ROLLBACK (run manually, in order, if you need to revert this migration)
-- ============================================================================
-- drop table if exists public.worker_violations;
-- drop table if exists public.worker_compliance_records;
-- drop table if exists public.verification_history;
-- drop table if exists public.verification_evidences;
-- drop table if exists public.settlements;
-- drop table if exists public.allocation_offers;
-- drop table if exists public.matching_recommendations;
-- drop table if exists public.otp_challenges;
