import os
import sys
from pathlib import Path

from sqlalchemy import create_engine, inspect, text

sys.path.insert(0, str(Path(__file__).resolve().parent))

from config import Config  # noqa: E402


EXPECTED_TABLES = {
    "users",
    "workers",
    "cooperatives",
    "federations",
    "services",
    "skills",
    "worker_skills",
    "availability",
    "service_requests",
    "bookings",
    "allocations",
    "payments",
    "invoices",
    "ratings",
    "notifications",
    "service_history",
    "welfare_records",
    "disputes",
    "incentives",
    "demand_records",
}


def main():
    uri = os.getenv("SUPABASE_DB_URL", "").strip()
    if not uri.startswith("postgresql") or "[YOUR-PASSWORD]" in uri:
        print("SUPABASE NOT CONFIGURED")
        return 2

    engine = create_engine(uri, pool_pre_ping=True)
    try:
        with engine.connect() as connection:
            connection.execute(text("select 1"))
            tables = set(inspect(connection).get_table_names(schema="public"))
    except Exception:
        print("SUPABASE NOT CONFIGURED")
        return 1
    finally:
        engine.dispose()

    missing = sorted(EXPECTED_TABLES - tables)
    if missing:
        print("SUPABASE NOT CONFIGURED")
        return 1
    print("SUPABASE CONNECTED")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())