# CO-LAB CONNECT

**Cooperative-Owned Digital Workforce Operating System**

CO-LAB CONNECT is a cooperative-owned digital service marketplace connecting households and institutions with registered, verified workers through Labour Cooperative Federations and Societies. The platform keeps the **cooperative as the operational control layer** — AI assists with matching, but cooperative administrators make the final allocation.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React.js + Tailwind CSS (Vite) |
| Backend | Python + Flask (REST API) |
| Database | Supabase PostgreSQL via SQLAlchemy (SQLite remains available for tests) |
| AI/ML | Scikit-learn, NumPy |
| Maps | OpenStreetMap (Leaflet) |
| Auth | OTP + JWT |
| Payments | UPI-compatible sandbox |
| Notifications | DB + FCM-ready |

## Project Structure

```
collabconnectapp/
├── backend/            # Flask REST API
│   ├── app/
│   │   ├── auth/       # Registration, login, OTP, JWT
│   │   ├── models/     # SQLAlchemy entities (User, Worker, Booking, etc.)
│   │   ├── routes/     # API blueprints (services, workers, bookings, payments...)
│   │   ├── services/   # Matching engine, payments, notifications, analytics
│   │   └── utils/      # Helpers, pagination
│   ├── config.py
│   ├── run.py
│   └── seed_data.py    # Demo database seed
└── frontend/           # React.js SPA
    └── src/
        ├── components/ # Shared UI components
        ├── pages/      # Customer/Worker/Cooperative/Federation interfaces
        ├── contexts/   # Auth + Language providers
        ├── i18n/       # English, Hindi, Marathi translations
        └── api/        # Axios instance with JWT interceptor
```

## Getting Started

### 1. Database

For Supabase setup, run [backend/supabase/schema.sql](backend/supabase/schema.sql) in the Supabase SQL Editor, then follow [backend/supabase/README.md](backend/supabase/README.md) to configure the PostgreSQL pooler connection. SQLite remains available for isolated local tests.

### 2. Backend (Flask API)

```bash
cd backend
pip install -r requirements.txt
copy .env.example .env    # Windows; then set unique local secrets
python seed_data.py        # populate demo data
python train_demo_data.py  # add deterministic history for demand training
python add_mini_demo_data.py  # add 20 fresh visible requests for UI testing
python create_judge_showcase.py  # add named workers, customers, requests, and bookings
python run.py              # starts on http://localhost:5000
```

### 3. Frontend (React app)

```bash
cd frontend
npm install
npm run dev                # starts on http://localhost:3000
```

Visit http://localhost:3000 — the landing page shows the full marketplace.

## Demo Accounts (created by seed_data.py)

Demo accounts are created only when `DEMO_PASSWORD` is set in the local backend `.env` file. Never use the demo password in production, and never commit `.env`.

| Role | Email | Password |
|---|---|---|
| Customer | customer@demo.com | Value of local `DEMO_PASSWORD` |
| Worker | worker@demo.com | Value of local `DEMO_PASSWORD` |
| Cooperative Admin | coop@demo.com | Value of local `DEMO_PASSWORD` |
| Federation Admin | federation@demo.com | Value of local `DEMO_PASSWORD` |

See [SECURITY.md](SECURITY.md) for secret-management and reporting guidance.

## Core Workflow

```
Customer Request → Matching Engine (AI) → Ranked Recommendations
    → Cooperative Review → Worker Allocation → Service Execution
    → Digital Payment → Invoice → Rating → History → Analytics
```

## Features

- **Service catalog**: Electrician, Plumber, Carpenter, Cleaner, Nanny/Childcare, Pet Caretaker (+ extensible categories)
- **AI matching engine**: 8-factor weighted scoring (skill, verification, location, availability, experience, workload, history, rating) — fully explainable to cooperative admins
- **Database-trained demand forecast**: Authenticated `/api/analytics/demand/forecast` learns from stored service requests using a transparent trend model with a sparse-data fallback
- **Role-based interfaces**: Customer, Worker, Cooperative Admin, Federation Admin
- **Cooperative governance**: Cooperative retains final allocation authority — AI never overrides
- **Care-service profiles**: Specialized qualification/verification fields for childcare, elder care, pet care
- **Multilingual**: English, Hindi (हिन्दी), Marathi (मराठी)
- **Demo-ready**: Seeded data for all roles and services
- **OTP registration**: Customer and worker registration requires phone verification before login

### AI Data Source

The backend trains against the active SQLAlchemy database selected by `NEON_DATABASE_URL` or `DATABASE_URL`. For Neon, provide the pooled PostgreSQL connection string in `backend/.env`; the Neon API key alone is not a database connection string. A Supabase publishable key is not sufficient for private training data, so Supabase server-side training requires a separate service-role key kept only in the backend environment. The forecast endpoint returns zero predictions until historical service-request records exist.

## Requirement Status

Implemented in the current MVP: role-based dashboards, service discovery, customer requests, scheduling fields, JWT authentication, OTP verification, worker profiles and skills, cooperative verification/allocation, federation summaries, explainable matching, payments/invoices, ratings, history, notifications, multilingual UI, and basic demand analytics.

Planned extensions: live worker tracking, recurring/group bookings, favorites, loyalty/referrals, voice booking, production payment gateway, insurance-provider integration, advanced welfare workflows, automated payment splitting, dispute management, offline synchronization, subscriptions, B2B contracts, and machine-learning forecasting after sufficient historical data exists.