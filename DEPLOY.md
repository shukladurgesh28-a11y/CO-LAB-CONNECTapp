# CO-LAB CONNECT — Deploy Guide

Free-tier, single-owner-friendly stack. Stay on free plans and this costs nothing.

| Piece     | Host        | Why / notes                                                        |
|-----------|-------------|--------------------------------------------------------------------|
| Frontend  | **Vercel**  | Static React/Vite SPA; `frontend/vercel.json` handles SPA rewrites. |
| Backend   | **Render**  | Flask + gunicorn; `backend/render.yaml` is a deployable blueprint.  |
| Database  | **Supabase**| Managed Postgres with RLS (schema + migration in `backend/supabase/`).|
| Auth emails | Resend (free 100/day) | OTP delivery. Sandbox mode logs codes to API anyway — no account needed to start. |
| Files/notify | Firebase / Supabase Storage (optional) | Skipped cleanly when credentials are absent. |

> **Money rule:** all amounts are computed server-side via
> `backend/app/services/pricing.py` (single source of truth, `Decimal`).
> Never re-add GST math on the client. Frontend only displays what the backend
> returns.

---

## 0. Preflight (very important)

The repo currently lives under **OneDrive**. CI/deployment tools, GPU workers
and git hooks all misbehave there (sync locks, `.git` conflicts). **Do this
once before you start:**

```bash
# 1) Copy the app OUT of OneDrive (e.g. D:\dev\colab-connect)
robocopy "C:\Users\durge\OneDrive\Desktop\collabconnectapp" "D:\dev\colab-connect" /E /XD node_modules .venv .pytest_cache
cd /d D:\dev\colab-connect
git init
git add .
git commit -m "CO-LAB CONNECT: initial commit"
```

Push to GitHub (create an empty repo first):

```bash
git remote add origin https://github.com/<you>/colab-connect.git
git branch -M main
git push -u origin main
```

---

## 1. Database — Supabase (30 min)

1. Create project at supabase.com → name it `colab-connect`.
2. **SQL Editor** → open `backend/supabase/schema.sql` → **Run**. Creates all
   tables, indexes, RLS policies, triggers and the 4 demo users
   (`customer@demo.com` etc., password `CoLab!Demo2026`).
3. **SQL Editor** → open `backend/migrations/001_duplicate_prevention.sql` →
   **Run**. (Adds/guarantees the unique constraints from migration DBMS. Safe to
   re-run — it only creates what's missing.)
4. Get your connection string:
   - Dashboard → **Project Settings → Database → Connection string**,
     pick **direct** entry, copy the `postgresql://...` URL.
   - Replace `[YOUR-PASSWORD]` with the database password.
5. Copy your **Project URL** and the **anon / publishable key** from
   Project Settings → API. (Service-role key, if you ever use it, is
   backend-only.)
6. Optional (needed only for real OTP emails + realtime): **Auth → Settings →
   SMTP** (see Resend section below).

## 2. Backend — Render (API)

Fastest path — click **New → Blueprint** on Render and point at the repo; it
reads `backend/render.yaml`. Otherwise:

1. **New → Web Service** → connect GitHub repo.
2. **Root directory:** `backend`
3. **Environment:** `Python`
4. **Build command:** `pip install -r requirements.txt`
5. **Start command:** `gunicorn -c gunicorn.conf.py run:app`
6. **Add environment variables** (copy into Render's dashboard):

| Variable | Local/dev value | Production value |
|---|---|---|
| `SUPABASE_DB_URL` | (blank local) | supabase `postgresql://...` with real password |
| `DATABASE_URL` | `sqlite:///collabconnect.db` | same as `SUPABASE_DB_URL` (used when Supabase empty) |
| `ALLOW_SQLITE_FALLBACK` | `true` | leave unset / `false` |
| `SECRET_KEY` | random hex | generate with `python -c "import secrets; print(secrets.token_hex(32))"` |
| `JWT_SECRET_KEY` | random hex | same generator (different value) |
| `DEMO_PASSWORD` | `CoLab!Demo2026` | keep `CoLab!Demo2026` (login buttons hardcode it) |
| `CORS_ORIGINS` | `*` | your Vercel URL, e.g. `https://colab-connect.vercel.app` |
| `SUPABASE_URL` | `https://<project>.supabase.co` | same (anon key only) |
| `SUPABASE_PUBLISHABLE_KEY` | your anon key | same |
| `PAYMENT_MODE` | `sandbox` | `sandbox` until you wire a real gateway (Task 5) |
| `COMMISSION_RATE` | `0.10` | `0.10` |
| `WELFARE_RATE` | `0.05` | `0.05` (keep consistent with config.py) |
| `TAX_RATE` | `0.00` | `0.00` (set `0.18` only when you enable GST end-to-end) |
| `GOOGLE_MAPS_API_KEY` | (blank) | your key (matching/geocoding) |
| `FIREBASE_CREDENTIALS_PATH` | (blank) | (blank) unless you use FCM |

3 cuts to remember:
- **Health check:** the app exposes `GET /api/health` — set Render health check
  to `/api/health` so the service stays awake instead of being flagged dead.
- **Serving:** Render serves the API only. Do **not** `flask run`; use the
  gunicorn start command above.
- **Secrets:** `SECRET_KEY`/`JWT_SECRET_KEY` are **required** in production —
  `backend/app/__init__.py` refuses to boot without them (see
  ProductionConfig). Generate both, never commit them.

## 3. Frontend — Vercel

1. Push the repo to GitHub (Section 0), then **Vercel → Add New Project →
   Import** the repo.
2. **Root directory:** `frontend`
3. Framework preset auto-detected as **Vite**.
4. Build command `npm run build`, output `dist`.
5. **Environment variables** (Vercel):

| Variable | Value |
|---|---|
| `VITE_API_URL` | your Render https URL, e.g. `https://colab-connect-api.onrender.com/api` |

   > The value must be the **full path to `/api`**. Vite injects it at build-time
   > via `import.meta.env.VITE_API_URL` (see `frontend/src/api/axios.js`).

6. Deploy. `frontend/vercel.json` adds the SPA rewrite + caching headers so
   deep links (`/customer/bookings/123`) work on refresh.

## 4. Optional — Send OTP mail via Resend (free)

Backend defaults to "sandbox" OTP (code returned/logged, no email). To send
real emails from your own domain later:

1. Create account at resend.com → add + verify a domain.
2. Render (or Supabase Auth SMTP) → point at Resend's SMTP:
   - Host `smtp.resend.com`, port `587`, TLS on.
   - Username/password = your Resend API key ("API Key" as both).
   - From: `[email protected]`.
3. Toggle `OTP_EXPOSE_IN_RESPONSE=false` in `.env` and set mail env vars so
   codes stop leaking to the API response.

## 5. First-run sanity checklist

```bash
# Health (backend)
curl https://<your-api>.onrender.com/api/health
# -> {"success": true, "message": "CO-LAB CONNECT API is running"}

# A logged-in call against the live API
# (login via the app UI, then:)
curl -H "Authorization: Bearer <token>" https://<your-api>.onrender.com/api/users/me
```

In the browser:
1. Log in as `customer@demo.com` / `CoLab!Demo2026` → dashboard loads.
2. Create a booking → worker flow → complete → pay (sandbox) → get invoice.
3. Open the invoice; verify total = service + material (no phantom 18% GST),
   and worker's payout reconciles to `net − commission − welfare`.

## 6. Security quick-list before you show anyone

- [ ] `.env` files are git-ignored (both `backend/.env` and `frontend/.env`).
- [ ] Real `SECRET_KEY`/`JWT_SECRET_KEY` in production (not the demo defaults).
- [ ] `CORS_ORIGINS` set to your exact frontend origin (not `*`).
- [ ] Supabase **service-role key** lives backend-only; only the anon
      (publishable) key reaches the browser.
- [ ] `PAYMENT_MODE=sandbox` until a real gateway is wired (Task 5).
- [ ] No client-side tax/money math — single source of truth is
      `backend/app/services/pricing.py`.

## 7. Rollback

Every deployment is a new immutable image; Render/Vercel keep 3 hot versions.

- **Code:** in Render/Vercel → Deployments → "Redeploy" the previous
  successful build.
- **Database:** not a code problem — use Supabase **Database → Backups** (daily
  PITR on paid, or a manual `pg_dump`). Suggested before release:
  ```bash
  pg_dump "postgresql://<user>:<pass>@<db>.supabase.co:5432/postgres" | gzip > backup-$(date +%F).sql.gz
  ```
