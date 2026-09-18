-- ============================================================================
-- CO-LAB CONNECT | Migration 004 - Platform Audit Trail
-- Target: Supabase PostgreSQL (15+). Safe to run more than once.
-- Run AFTER 003_workforce.sql in the SQL Editor
-- or via:  psql "$SUPABASE_DB_URL" -f 004_audit.sql
-- The whole file runs in ONE transaction.
-- ============================================================================

begin;

create table if not exists public.audit_logs (
    id serial primary key,
    actor_id integer references public.users(id) on delete set null,
    actor_role varchar(50),
    action varchar(100) not null,
    entity_type varchar(50),
    entity_id integer,
    details text,
    created_at timestamptz not null default now()
);
create index if not exists ix_audit_logs_actor on public.audit_logs(actor_id);
create index if not exists ix_audit_logs_entity
    on public.audit_logs(entity_type, entity_id);
create index if not exists ix_audit_logs_created on public.audit_logs(created_at);

commit;

-- ============================================================================
-- ROLLBACK (run manually)
-- ============================================================================
-- drop table if exists public.audit_logs;
