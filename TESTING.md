# CO-LAB CONNECT — Testing Methodology (Pre-Deployment)

## Overview

This document describes how to test the CO-LAB CONNECT application before deployment to Google Cloud / Render / Vercel. All testing follows the same patterns used by engineering teams at Google and similar companies: **unit tests → integration tests → end-to-end tests → staging deployment**.

---

## 1. Unit Tests (Backend)

### What They Test
Individual functions and logic in isolation, without external dependencies.

### How to Run
```bash
cd backend
pip install -r requirements.txt
python -m pytest tests/ -v
```

### Test Files
| File | What It Tests |
|------|---------------|
| `tests/test_pricing.py` | Invoice computation logic (Decimal math, commission, welfare, tax, worker payout reconciliation) |
| `tests/test_auth_safety.py` | OTP limits, login attempt throttling, password security |
| `tests/test_availability.py` | Worker availability matching, leave exclusion |
| `tests/test_core_flow.py` | Full end-to-end flow: customer → admin → worker → payment → invoice → rating |
| `tests/test_database_health.py` | Supabase/PostgreSQL connection and table verification |

### Current Results
```
14 passed, 1 skipped (Supabase health check requires live DB)
```

### Pricing Service Tests (New)
The `compute_invoice()` function in `backend/app/services/pricing.py` is the **single source of truth** for all money math. Tests verify:
- Zero amounts produce all zeros
- Commission (10%), welfare (5%), and tax (18%) calculations
- Materials are exempt from commission by default
- `commission_applies_to_material` flag works correctly
- No floating-point rounding bugs (ROUND_HALF_UP, 2 decimals)
- Worker payout always reconciles: `worker_payout = net_amount - commission - welfare`
- Bankers rounding is NOT used (ROUND_HALF_UP is correct)

---

## 2. Integration Tests (API Endpoints)

### What They Test
API endpoints respond correctly with proper authentication, authorization, and data validation.

### Endpoints Tested
The `test_core_flow.py` test exercises these endpoints in sequence:

```
GET  /api/auth/login           → Login and get JWT token
GET  /api/users/me              → Verify authenticated user profile
POST /api/requests              → Customer creates service request
GET  /api/requests              → Admin sees their requests
GET  /api/analytics/heatmap     → Cooperative sees demand heatmap
POST /api/matching/recommend    → AI generates worker recommendations
GET  /api/workers/{id}          → Admin views worker profile
POST /api/welfare               → Worker enrolls in welfare scheme
POST /api/allocations           → Cooperative admin allocates worker
GET  /api/bookings              → Worker/Admin/Customer views bookings
POST /api/payments/initiate     → Customer initiates payment
PATCH /api/bookings/{id}/status → Worker updates booking status
GET  /api/payments/invoice/{id} → Customer views invoice
POST /api/ratings               → Customer rates completed service
GET  /api/history               → Customer/Worker views history
GET  /api/cooperative/dashboard → Admin views cooperative dashboard
GET  /api/bookings (federation) → Federation admin sees all bookings
POST /api/bookings/{id}/cancel  → Customer cancels booking
```

### Run All Integration Tests
```bash
cd backend
python -m pytest tests/test_core_flow.py -v
```

---

## 3. End-to-End (E2E) Testing

### Manual Testing Checklist

#### Customer Flow
1. **Login** as `customer@demo.com` / `CoLab!Demo2026`
2. **Create request**: Select service, provide location, preferred date/time
3. **View request**: Verify request appears in "My Requests"
4. **Wait for allocation**: Cooperative admin allocates a worker
5. **View booking**: Check booking status changes from `confirmed` → `accepted` → `service_started` → `completed`
6. **Make payment**: After completion, initiate UPI payment (sandbox)
7. **View invoice**: Verify invoice math: `Total = Service + Material`, `Worker Payout = Net - Commission - Welfare`
8. **Rate service**: Submit rating (1-5 stars)
9. **View history**: Confirm completed service appears in history

#### Cooperative Admin Flow
1. **Login** as `coop@demo.com` / `CoLab!Demo2026`
2. **View dashboard**: Check active bookings, pending requests, revenue
3. **Review requests**: See pending service requests in queue
4. **Get AI recommendations**: Click "Match" to see ranked worker suggestions
5. **Allocate worker**: Select worker and confirm allocation
6. **Verify booking**: Confirm booking is created with correct details
7. **Update status**: Change booking status through the lifecycle
8. **View performance**: Check fulfillment rate, average rating, revenue

#### Worker Flow
1. **Login** as `worker@demo.com` / `CoLab!Demo2026`
2. **View bookings**: See assigned bookings
3. **Update status**: Mark as accepted → en_route → service_started → completed
4. **Add materials**: Add material requirements during service
5. **View earnings**: Check worker payout (not total amount)
6. **View history**: See completed services

#### Federation Admin Flow
1. **Login** as `federation@demo.com` / `CoLab!Demo2026`
2. **View all bookings**: See bookings across all cooperatives
3. **View cooperative performance**: Check each cooperative's metrics
4. **View workforce overview**: See worker distribution across cooperatives

---

## 4. Frontend Testing

### Build Verification
```bash
cd frontend
npm install
npm run build
```
- Verify zero errors in build output
- Check that `dist/` folder is generated

### Dev Server
```bash
cd frontend
npm run dev
```
- Open `http://localhost:3000`
- Verify all pages load correctly
- Test navigation between Customer/Worker/Cooperative/Federation views

### Key Frontend Validations
- Currency displays as `₹` (Rupees) not `$`
- Worker earnings show `financials.worker_payout` not `totalAmount`
- Booking detail shows `final_amount` not just `total_amount`
- Cancel button visible for `pending`, `reviewing`, `confirmed`, `accepted` statuses
- Real-time polling updates booking status every 15 seconds for active bookings
- Payment authorization allows worker and federation admin access

---

## 5. Deployment Testing (Google/Render/Vercel)

### Pre-Deployment Checklist

#### Backend (Render)
- [ ] `ALLOW_SQLITE_FALLBACK=false` in production
- [ ] `SUPABASE_DB_URL` set with real PostgreSQL connection string
- [ ] `SECRET_KEY` and `JWT_SECRET_KEY` are 32+ bytes, generated securely
- [ ] `CORS_ORIGINS` set to exact Vercel URL (not `*`)
- [ ] `PAYMENT_MODE=sandbox` for testing, switch to real gateway later
- [ ] `COMMISSION_RATE`, `WELFARE_RATE`, `TAX_RATE` configured correctly
- [ ] Health check at `GET /api/health` returns 200
- [ ] Gunicorn config (`gunicorn.conf.py`) is correct

#### Frontend (Vercel)
- [ ] `VITE_API_URL` points to Render backend URL
- [ ] `vercel.json` has SPA rewrite rules
- [ ] Build completes with zero errors
- [ ] Deep links work after page refresh

#### Database (Supabase)
- [ ] `backend/supabase/schema.sql` executed in SQL Editor
- [ ] `backend/migrations/001_duplicate_prevention.sql` executed
- [ ] All tables, indexes, RLS policies, triggers created
- [ ] Demo users created with `DEMO_PASSWORD` set

### Post-Deployment Tests

1. **Health Check**: `curl https://<api-url>/api/health` → 200 OK
2. **Login Test**: Login with demo credentials → token received
3. **Full Flow**: Customer creates request → admin allocates → worker completes → payment → invoice → rating
4. **Invoice Math Verification**: 
   - `total_amount = service_charges + material_charges + tax_amount`
   - `worker_payout + commission_amount + welfare_amount + tax_amount = total_amount`
   - No cents/paise leakage (all values are 2-decimal rounded)
5. **Cross-Role Access**: Verify each role can only access their data
6. **Error Handling**: Verify proper 400/403/404/409 responses for invalid requests
7. **Security Scan**: Run `gitleaks` to check for leaked secrets

---

## 6. Google-Specific Testing Standards

### Testing Pyramid (Google Engineering Practices)
- **70% Unit Tests**: Fast, isolated, test individual functions (pricing.py, auth safety)
- **20% Integration Tests**: Test API endpoints with test database (test_core_flow.py)
- **10% E2E Tests**: Full workflow from UI to database

### Code Quality Standards
- All money calculations use `Decimal` with `ROUND_HALF_UP` (never `float`)
- Single source of truth: `backend/app/services/pricing.py`
- No client-side tax/money math
- All API responses use consistent `{success, data, message}` format
- JWT authentication on all protected routes
- Proper HTTP status codes (200, 201, 400, 403, 404, 409, 500)

### CI/CD Pipeline (Google-style)
1. **On every push**: Run `gitleaks` security scan + `pip-audit` dependency audit
2. **On every PR**: Run all pytest tests (must pass 100%)
3. **On merge to main**: Build frontend (`npm run build`), deploy to Render + Vercel
4. **Post-deploy**: Run smoke tests against staging URL

---

## 7. Quick Test Commands

```bash
# Run all backend tests
cd backend && python -m pytest tests/ -v

# Run pricing tests only
cd backend && python -m pytest tests/test_pricing.py -v

# Run full core flow test
cd backend && python -m pytest tests/test_core_flow.py -v

# Build frontend
cd frontend && npm run build

# Start backend dev server
cd backend && python run.py

# Start frontend dev server
cd frontend && npm run dev

# Health check
curl http://localhost:5000/api/health

# Check database
cd backend && python -c "from app import create_app; app = create_app('testing'); print('DB OK')"
```

---

## 8. Known Issues and Limitations

- **JWT key length warning**: Current test key is 16 bytes (should be 32+ in production)
- **SQLAlchemy legacy API**: `Query.get()` is deprecated in SQLAlchemy 2.0 (works but warns)
- **Supabase health test skipped**: Requires live database connection
- **Payment sandbox**: No real money moves; sandbox simulates UPI completion
- **Windows line endings**: Some files have CRLF warnings (harmless)

---

## 9. Security Testing

### What Gets Tested
- OTP brute force protection (max 5 attempts, 30s cooldown)
- JWT token expiration (24 hours)
- Role-based access control (customer can't access admin endpoints)
- SQL injection prevention (SQLAlchemy parameterized queries)
- No secrets in code or frontend
- `.env` files git-ignored

### Security Scan
```bash
# Install and run gitleaks
brew install gitleaks
gitleaks detect --source . --report-format sarif --report-path gitleaks-report.sarif

# Install and run pip-audit
pip install pip-audit
pip-audit -r backend/requirements.txt
```

---

## 10. Deployment Verification (After Deploying)

After deploying to Render/Vercel/Supabase, verify:

```bash
# 1. Backend is alive
curl https://<your-api>.onrender.com/api/health
# Expected: {"success": true, "message": "CO-LAB CONNECT API is running"}

# 2. Login works
curl -X POST https://<your-api>.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"customer@demo.com","password":"CoLab!Demo2026"}'
# Expected: {"success": true, "token": "..."}

# 3. Frontend loads
open https://<your-app>.vercel.app
# Expected: Landing page with marketplace

# 4. Full flow works
# Login as customer → create request → admin allocates → worker completes → pay → invoice
```

---

*Last updated: September 2026 — CO-LAB CONNECT v1.0*
