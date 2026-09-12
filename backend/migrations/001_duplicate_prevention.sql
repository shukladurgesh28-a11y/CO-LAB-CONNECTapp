-- ============================================================================
-- CO-LAB CONNECT | Migration 001 - Duplicate Prevention
-- Target: Supabase PostgreSQL (15+). Safe to run more than once.
-- Run AFTER the base schema (backend/supabase/schema.sql) in the SQL Editor
-- or via:  psql "$SUPABASE_DB_URL" -f 001_duplicate_prevention.sql
--
-- Guarantees:
--   1) bookings        : one booking per (customer_id, request_id)
--   2) service_history : one history row per booking_id
--   3) invoices        : one invoice per booking_id
--   4) ratings         : one rating per booking_id
--
-- COLUMN-NAME NOTE (the task sheet said customer_id + service_id + scheduled_at):
--   bookings has NO service_id and NO scheduled_at column on this schema.
--   Each booking is tied to exactly one service through request_id
--   (bookings.request_id -> service_requests.id -> service_requests.service_id),
--   and the scheduled slot lives in service_date + time_start.
--   So the correct composite key here is (customer_id, request_id).
--   If you want a denormalized service_id/scheduled_at on bookings instead,
--   that is a schema refactor, not a constraint - raise it separately.
--
-- service_history, invoices and ratings already carry a unique booking_id in
-- the base schema; this migration makes that explicit on any database where
-- it is missing and backfills existing duplicates (oldest row wins).
--
-- The whole file runs in ONE transaction; if any statement fails, nothing
-- is applied.
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- 1) BOOKINGS : prevent the same customer from creating a second booking for
--               the same service request (i.e. the same service booking slot).
-- ----------------------------------------------------------------------------
do $$
begin
    -- Backfill: if duplicate (customer_id, request_id) rows already exist,
    -- keep the oldest (lowest id) and delete the rest.
    delete from public.bookings b
    using public.bookings b2
    where b.id > b2.id
      and b.customer_id = b2.customer_id
      and b.request_id = b2.request_id;

    -- Add the unique index only if no unique index already covers BOTH columns.
    if not exists (
        select 1
        from pg_index i
        where i.indrelid = 'public.bookings'::regclass
          and i.indisunique
          and i.indpred is null
          and i.indnkeyatts = 2
          and i.indkey::smallint[] @> (
              select array_agg(a.attnum::smallint)
              from pg_attribute a
              where a.attrelid = 'public.bookings'::regclass
                and a.attname in ('customer_id', 'request_id')
          )
    ) then
        create unique index uq_bookings_customer_request
            on public.bookings (customer_id, request_id);
        raise notice 'created index uq_bookings_customer_request';
    else
        raise notice 'uq_bookings_customer_request already covered; skipped';
    end if;
end $$;

-- ----------------------------------------------------------------------------
-- 2) SERVICE_HISTORY : one history row per booking.
-- ----------------------------------------------------------------------------
do $$
begin
    delete from public.service_history b
    using public.service_history b2
    where b.id > b2.id
      and b.booking_id = b2.booking_id;

    if not exists (
        select 1
        from pg_index i
        where i.indrelid = 'public.service_history'::regclass
          and i.indisunique
          and i.indpred is null
          and i.indnkeyatts = 1
          and i.indkey::smallint[] @> (
              select array_agg(a.attnum::smallint)
              from pg_attribute a
              where a.attrelid = 'public.service_history'::regclass
                and a.attname = 'booking_id'
          )
    ) then
        create unique index uq_service_history_booking_id
            on public.service_history (booking_id);
        raise notice 'created index uq_service_history_booking_id';
    else
        raise notice 'service_history.booking_id already unique; skipped';
    end if;
end $$;

-- ----------------------------------------------------------------------------
-- 3) INVOICES : one invoice per booking.
-- ----------------------------------------------------------------------------
do $$
begin
    delete from public.invoices b
    using public.invoices b2
    where b.id > b2.id
      and b.booking_id = b2.booking_id;

    if not exists (
        select 1
        from pg_index i
        where i.indrelid = 'public.invoices'::regclass
          and i.indisunique
          and i.indpred is null
          and i.indnkeyatts = 1
          and i.indkey::smallint[] @> (
              select array_agg(a.attnum::smallint)
              from pg_attribute a
              where a.attrelid = 'public.invoices'::regclass
                and a.attname = 'booking_id'
          )
    ) then
        create unique index uq_invoices_booking_id
            on public.invoices (booking_id);
        raise notice 'created index uq_invoices_booking_id';
    else
        raise notice 'invoices.booking_id already unique; skipped';
    end if;
end $$;

-- ----------------------------------------------------------------------------
-- 4) RATINGS : one rating per booking.
-- ----------------------------------------------------------------------------
do $$
begin
    delete from public.ratings b
    using public.ratings b2
    where b.id > b2.id
      and b.booking_id = b2.booking_id;

    if not exists (
        select 1
        from pg_index i
        where i.indrelid = 'public.ratings'::regclass
          and i.indisunique
          and i.indpred is null
          and i.indnkeyatts = 1
          and i.indkey::smallint[] @> (
              select array_agg(a.attnum::smallint)
              from pg_attribute a
              where a.attrelid = 'public.ratings'::regclass
                and a.attname = 'booking_id'
          )
    ) then
        create unique index uq_ratings_booking_id
            on public.ratings (booking_id);
        raise notice 'created index uq_ratings_booking_id';
    else
        raise notice 'ratings.booking_id already unique; skipped';
    end if;
end $$;

-- ----------------------------------------------------------------------------
-- Verify: each check must return (0 rows), the index list must show all 4.
-- ----------------------------------------------------------------------------
select 'duplicate bookings'   as check_name, count(*) as dup_rows
  from (select customer_id, request_id from public.bookings
        group by customer_id, request_id having count(*) > 1) x
union all
select 'duplicate service_history', count(*)
  from (select booking_id from public.service_history
        group by booking_id having count(*) > 1) x
union all
select 'duplicate invoices', count(*)
  from (select booking_id from public.invoices
        group by booking_id having count(*) > 1) x
union all
select 'duplicate ratings', count(*)
  from (select booking_id from public.ratings
        group by booking_id having count(*) > 1) x;

select indexname
from pg_indexes
where schemaname = 'public'
  and indexname in (
        'uq_bookings_customer_request',
        'uq_service_history_booking_id',
        'uq_invoices_booking_id',
        'uq_ratings_booking_id'
      )
order by indexname;

commit;

-- ============================================================================
-- ROLLBACK (run manually, in order, if you need to revert this migration)
-- ============================================================================
-- drop index if exists uq_bookings_customer_request;
-- drop index if exists uq_service_history_booking_id;
-- drop index if exists uq_invoices_booking_id;
-- drop index if exists uq_ratings_booking_id;