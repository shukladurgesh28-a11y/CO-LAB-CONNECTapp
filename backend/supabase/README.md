# Supabase setup

The SQL migration in `schema.sql` creates the CO-LAB CONNECT PostgreSQL schema, demo records, RLS policies, indexes, timestamp triggers, and Realtime publication entries.

## 1. Create the project

The configured project is `https://scadpoxbwpqdhnoofgsh.supabase.co`.

In the Supabase dashboard:

1. Open **SQL Editor**.
2. Run `schema.sql`.
3. In **Project Settings > Database**, copy the connection string from **Connect**. Use the transaction pooler URL for a deployed Flask API and append `sslmode=require` if it is not already present.
4. In **Project Settings > API**, copy the Project URL and publishable/anon key.

## 2. Configure Flask

Set these values in `backend/.env`:

```dotenv
SUPABASE_URL=https://scadpoxbwpqdhnoofgsh.supabase.co
SUPABASE_PUBLISHABLE_KEY=<publishable-or-anon-key>
SUPABASE_DB_URL=postgresql://postgres:[YOUR-PASSWORD]@db.scadpoxbwpqdhnoofgsh.supabase.co:5432/postgres
```

The Flask API uses `SUPABASE_DB_URL` first, then `NEON_DATABASE_URL`, then `DATABASE_URL`. Keep `SUPABASE_SERVICE_ROLE_KEY` server-only and do not expose it to React.

`PAYMENT_MODE=sandbox` is the safe demo default. Sandbox payments are explicitly labeled by the API; production payment gateways should drive completion through `/api/payments/webhook`.

OTP verification is rate-limited by `OTP_MAX_ATTEMPTS` and `OTP_RESEND_COOLDOWN_SECONDS`. OTP values are not returned in API responses unless `OTP_EXPOSE_IN_RESPONSE=true` is explicitly enabled for a local development-only delivery setup.

Authorized JSON exports are available through `/api/exports?resource=bookings`, `/api/exports?resource=requests`, and `/api/exports?resource=history`.

The notification database is authoritative. Firebase push delivery is an optional adapter and is not live until `FIREBASE_CREDENTIALS_PATH` points to valid server-only credentials. The frontend continues to use Supabase Realtime when configured, with polling fallback.

Worker availability supports weekly slots plus `effective_from`, `effective_until`, and `is_available=false` leave ranges. Matching excludes workers whose explicit slot does not cover the requested date/time.

The current payment integration is sandbox-only. A production gateway must call `/api/payments/webhook` and confirm completion before a payment is treated as completed. No card or UPI secret is stored.

For production deployment, replace the development `SECRET_KEY` and `JWT_SECRET_KEY`, set `FLASK_ENV=production`, configure `CORS_ORIGINS`, provide a real PostgreSQL URL, and use a real OTP delivery provider. `OTP_EXPOSE_IN_RESPONSE` must remain disabled.

Install the PostgreSQL driver and start the API:

```powershell
cd backend
pip install -r requirements.txt
python run.py
```

## 3. RLS identity mapping

Flask currently owns registration and JWT issuance. Its direct PostgreSQL connection is the trusted server path. For direct Supabase client access, link a Supabase Auth UUID to the application user row after Auth signup:

```sql
update public.users
set auth_user_id = '<supabase-auth-user-uuid>'
where email = 'customer@demo.com';
```

The RLS policies resolve `auth.uid()` through `users.auth_user_id` and then apply customer, worker, cooperative-admin, and federation-admin access rules. The demo users inserted by `schema.sql` intentionally have a null `auth_user_id` because they are used by the Flask demo login.

## Hosted project URL

```text
https://scadpoxbwpqdhnoofgsh.supabase.co
```
