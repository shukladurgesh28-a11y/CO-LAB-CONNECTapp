import os
import unittest

from sqlalchemy import create_engine, inspect, text

from config import get_database_uri


EXPECTED_TABLES = {
    "users", "workers", "cooperatives", "federations", "services", "skills",
    "worker_skills", "availability", "service_requests", "bookings", "allocations",
    "payments", "invoices", "ratings", "notifications", "service_history",
    "welfare_records", "disputes", "incentives", "demand_records",
}


class SupabaseDatabaseHealthTestCase(unittest.TestCase):
    def test_supabase_connection_and_expected_tables(self):
        uri = get_database_uri()
        if not uri.startswith("postgresql"):
            self.skipTest("SUPABASE_DB_URL is not configured with a real password")

        engine = create_engine(uri, pool_pre_ping=True)
        try:
            with engine.connect() as connection:
                self.assertEqual(connection.execute(text("select 1")).scalar_one(), 1)
                tables = set(inspect(connection).get_table_names(schema="public"))
        finally:
            engine.dispose()

        self.assertEqual(EXPECTED_TABLES - tables, set())


if __name__ == "__main__":
    unittest.main()