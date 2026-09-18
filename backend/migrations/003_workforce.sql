-- ============================================================================
-- CO-LAB CONNECT | Migration 003 - Society Workforce Requirements
-- Target: Supabase PostgreSQL (15+). Safe to run more than once.
-- Run AFTER 002_governance.sql in the SQL Editor
-- or via:  psql "$SUPABASE_DB_URL" -f 003_workforce.sql
--
-- Tables: society_workforce_requirements, society_workforce_items,
--         worker_allocations. Money stays NUMERIC(12,2) project-wide.
-- The whole file runs in ONE transaction.
-- ============================================================================

begin;

create table if not exists public.society_workforce_requirements (
    id serial primary key,
    cooperative_id integer not null references public.cooperatives(id) on delete cascade,
    federation_id integer references public.federations(id) on delete set null,
    created_by integer references public.users(id) on delete set null,
    title varchar(255) not null,
    description text,
    work_type varchar(50) not null default 'Other',
    location_address varchar(500),
    latitude double precision,
    longitude double precision,
    start_date date,
    end_date date,
    daily_start_time time,
    daily_end_time time,
    break_minutes integer not null default 60,
    flexible_timing boolean not null default false,
    working_days jsonb,
    status varchar(30) not null default 'DRAFT'
        check (status in ('DRAFT','SUBMITTED','UNDER_REVIEW','MATCHING',
                          'PARTIALLY_FULFILLED','FULLY_FULFILLED',
                          'WORK_IN_PROGRESS','COMPLETED','CANCELLED','EXPIRED')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);
create index if not exists ix_workforce_requirements_coop
    on public.society_workforce_requirements(cooperative_id);
create index if not exists ix_workforce_requirements_federation
    on public.society_workforce_requirements(federation_id);
create index if not exists ix_workforce_requirements_status
    on public.society_workforce_requirements(status);

create table if not exists public.society_workforce_items (
    id serial primary key,
    requirement_id integer not null
        references public.society_workforce_requirements(id) on delete cascade,
    service_id integer not null references public.services(id),
    quantity_required integer not null default 1 check (quantity_required > 0),
    skill_requirement varchar(255),
    minimum_experience integer not null default 0,
    start_date date,
    end_date date,
    working_hours_per_day double precision not null default 8.0,
    priority varchar(20) not null default 'normal',
    special_requirements text,
    gender_preference varchar(20),
    accommodation_required boolean not null default false,
    equipment_provided boolean not null default false,
    notes text,
    status varchar(30) not null default 'PENDING'
        check (status in ('PENDING','PARTIALLY_FULFILLED','FULLY_FULFILLED','CANCELLED')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);
create index if not exists ix_workforce_items_requirement
    on public.society_workforce_items(requirement_id);
create index if not exists ix_workforce_items_status
    on public.society_workforce_items(status);

create table if not exists public.worker_allocations (
    id serial primary key,
    workforce_item_id integer not null
        references public.society_workforce_items(id) on delete cascade,
    worker_id integer not null references public.workers(id) on delete cascade,
    allocated_by integer references public.users(id) on delete set null,
    status varchar(20) not null default 'offered'
        check (status in ('offered','accepted','declined','completed','cancelled')),
    worker_response text,
    offered_at timestamptz not null default now(),
    responded_at timestamptz,
    start_date date,
    end_date date,
    constraint uq_workforce_alloc_item_worker
        unique (workforce_item_id, worker_id)
);
create index if not exists ix_workforce_alloc_worker
    on public.worker_allocations(worker_id);
create index if not exists ix_workforce_alloc_status
    on public.worker_allocations(status);

commit;

-- ============================================================================
-- ROLLBACK (run manually, in order)
-- ============================================================================
-- drop table if exists public.worker_allocations;
-- drop table if exists public.society_workforce_items;
-- drop table if exists public.society_workforce_requirements;
