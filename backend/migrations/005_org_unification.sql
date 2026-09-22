-- ============================================================================
-- CO-LAB CONNECT | Migration 005 - Org unification (one Admin Panel)
-- Target: Supabase PostgreSQL (15+). Safe to run more than once.
-- Run AFTER 004_audit.sql in the SQL Editor
-- or via:  psql "$SUPABASE_DB_URL" -f 005_org_unification.sql
--
-- Org model (single panel serves all org roles):
--   Federation > Society (Co-op, SAME `cooperatives` table) > Workers
--   * "Society" and "Cooperative" are the same registry. The `societies`
--     view below is a read-only alias so dashboards/APIs can query either name.
--   * Every worker carries exactly one cooperative_id (its society).
--   * Every request lands in exactly one society (cooperative_id).
--   * Federation managers see their societies; society managers see their own.
--   * Platform admin sees everything.
--
-- The whole file runs in ONE transaction; if any statement fails, nothing
-- is applied.
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- 1) Document the model on the tables themselves.
-- ----------------------------------------------------------------------------
comment on table public.cooperatives is
  'Society registry (Society == Co-op). Each row is one society/cooperative managed inside the single Admin Panel.';
comment on column public.cooperatives.federation_id is
  'Parent federation. A society always belongs to exactly one federation.';
comment on table public.federations is
  'Federation registry. A federation oversees many societies; it never allocates single jobs.';
comment on column public.workers.cooperative_id is
  'Owning society (co-op). A worker belongs to exactly one society.';

-- ----------------------------------------------------------------------------
-- 2) Guarantee the federation link exists (idempotent).
-- ----------------------------------------------------------------------------
do $$
begin
    if not exists (
        select 1 from pg_constraint
        where conrelid = 'public.cooperatives'::regclass
          and conname = 'cooperatives_federation_id_fkey'
    ) then
        alter table public.cooperatives
            add constraint cooperatives_federation_id_fkey
            foreign key (federation_id) references public.federations(id)
            on delete set null;
    end if;
exception when duplicate_object then
    raise notice 'federation FK already present; skipped';
end $$;

create index if not exists ix_cooperatives_federation on public.cooperatives(federation_id);
create index if not exists ix_workers_cooperative on public.workers(cooperative_id);

-- ----------------------------------------------------------------------------
-- 3) `societies` read alias — Society == Cooperative, query either name.
-- ----------------------------------------------------------------------------
create or replace view public.societies as
select
    id,
    name as society_name,
    name,
    registration_number,
    contact_email,
    contact_phone,
    address,
    latitude,
    longitude,
    service_area_km,
    admin_user_id as society_manager_id,
    admin_user_id,
    federation_id,
    is_active,
    created_at,
    updated_at
from public.cooperatives;

comment on view public.societies is
  'Read alias for cooperatives. Society and Co-op are the same entity.';

-- ----------------------------------------------------------------------------
-- 4) Org hierarchy rollup for the Admin Panel Organization tab.
-- ----------------------------------------------------------------------------
create or replace view public.v_org_hierarchy as
select
    f.id as federation_id,
    f.name as federation_name,
    f.is_active as federation_active,
    count(distinct c.id) as society_count,
    count(distinct case when c.is_active then c.id end) as societies_active,
    count(distinct w.id) as worker_count,
    count(distinct case when w.verification_status = 'verified' then w.id end) as workers_verified
from public.federations f
left join public.cooperatives c on c.federation_id = f.id
left join public.workers w on w.cooperative_id = c.id
group by f.id, f.name, f.is_active
order by f.id;

comment on view public.v_org_hierarchy is
  'Federation > societies > workers rollup powering the single Admin Panel Organization tab.';

commit;

-- ============================================================================
-- ROLLBACK (run manually, in order, if you need to revert this migration)
-- ============================================================================
-- drop view if exists public.v_org_hierarchy;
-- drop view if exists public.societies;
