import os
import tempfile
import unittest

from flask import Flask
from sqlalchemy import text

from app import db, _ensure_bookings_worker_id_nullable

OLD_BOOKINGS_DDL = """
CREATE TABLE bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    request_id INTEGER NOT NULL,
    allocation_id INTEGER,
    worker_id INTEGER NOT NULL,
    customer_id INTEGER NOT NULL,
    cooperative_id INTEGER NOT NULL,
    service_date DATE,
    time_start TIME,
    time_end TIME,
    status VARCHAR(20) NOT NULL DEFAULT 'confirmed',
    actual_start DATETIME,
    actual_end DATETIME,
    total_amount FLOAT,
    material_charges FLOAT,
    final_amount FLOAT,
    created_at DATETIME,
    updated_at DATETIME,
    UNIQUE (request_id),
    UNIQUE (allocation_id)
)
"""

BOOKING_ROW = (
    "INSERT INTO bookings (request_id, allocation_id, worker_id, customer_id, "
    "cooperative_id, service_date, time_start, time_end, status, total_amount, "
    "material_charges, final_amount, created_at, updated_at) VALUES "
    "(1, NULL, 7, 1, 1, '2026-09-15', '11:00', '13:00', 'pending', 500.0, "
    "0.0, 500.0, '2026-09-14 09:00:00', '2026-09-14 09:00:00')"
)


class BookingWorkerIdMigrationTestCase(unittest.TestCase):
    def setUp(self):
        self.tmp_dir = tempfile.mkdtemp(prefix="collabconnect_migration_")
        self.db_path = os.path.join(self.tmp_dir, "old_schema.db")
        self.app = Flask("migration_test")
        self.app.config["SQLALCHEMY_DATABASE_URI"] = f"sqlite:///{self.db_path}"
        self.app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
        db.init_app(self.app)

        with self.app.app_context():
            engine = db.engine
            with engine.connect() as connection:
                connection.exec_driver_sql(OLD_BOOKINGS_DDL)
                connection.exec_driver_sql(BOOKING_ROW)
                connection.commit()

    def test_worker_id_becomes_nullable_and_data_preserved(self):
        with self.app.app_context():
            worker_info = db.session.execute(
                text(
                    "SELECT name, \"notnull\" FROM pragma_table_info('bookings') "
                    "WHERE name='worker_id'"
                )
            ).fetchall()
            self.assertEqual(worker_info[0][1], 1, "test fixture must start as NOT NULL")

            _ensure_bookings_worker_id_nullable(self.app)

            worker_info = db.session.execute(
                text(
                    "SELECT name, \"notnull\" FROM pragma_table_info('bookings') "
                    "WHERE name='worker_id'"
                )
            ).fetchall()
            self.assertEqual(worker_info[0][1], 0, "worker_id must be nullable after migration")

            row = db.session.execute(
                text(
                    "SELECT request_id, worker_id, customer_id, status, total_amount "
                    "FROM bookings WHERE id=1"
                )
            ).fetchone()
            self.assertEqual(row[0], 1)
            self.assertEqual(row[1], 7)
            self.assertEqual(row[2], 1)
            self.assertEqual(row[3], "pending")
            self.assertEqual(row[4], 500.0)

    def test_unique_constraints_preserved(self):
        with self.app.app_context():
            _ensure_bookings_worker_id_nullable(self.app)
            indexes = db.session.execute(
                text('PRAGMA index_list("bookings")')
            ).fetchall()
            unique = [i for i in indexes if i[2]]
            self.assertEqual(len(unique), 2, f"expected 2 unique indexes, got {indexes}")
            columns = set()
            for i in indexes:
                if i[2]:
                    for r in db.session.execute(text(f'PRAGMA index_info("{i[1]}")')).fetchall():
                        columns.add(r[2])
            self.assertEqual(columns, {"request_id", "allocation_id"})

    def test_migration_is_idempotent(self):
        with self.app.app_context():
            _ensure_bookings_worker_id_nullable(self.app)
            # Second run must be a no-op (worker_id already nullable)
            _ensure_bookings_worker_id_nullable(self.app)
            worker_info = db.session.execute(
                text(
                    "SELECT name, \"notnull\" FROM pragma_table_info('bookings') "
                    "WHERE name='worker_id'"
                )
            ).fetchall()
            self.assertEqual(worker_info[0][1], 0)
            row = db.session.execute(text("SELECT COUNT(*) FROM bookings")).fetchone()
            self.assertEqual(row[0], 1)


if __name__ == "__main__":
    unittest.main()