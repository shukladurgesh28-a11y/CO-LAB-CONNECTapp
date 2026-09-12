from datetime import datetime, timezone
from app import db
from app.models.notification import Notification
from app.models.worker import Worker
from flask import current_app
from app.services.notification_provider import FirebaseNotificationProvider


class NotificationService:
    def __init__(self):
        self.provider = FirebaseNotificationProvider(
            current_app.config.get("FIREBASE_CREDENTIALS_PATH", "")
        )

    def send_notification(self, user_id, title, message, ntype, ref_type=None, ref_id=None):
        try:
            notification = Notification(
                user_id=user_id,
                title=title,
                message=message,
                type=ntype,
                reference_type=ref_type,
                reference_id=ref_id,
                is_read=False,
            )
            db.session.add(notification)
            db.session.commit()
            self.provider.send(user_id, title, message, {
                "type": ntype,
                "reference_type": ref_type,
                "reference_id": ref_id,
            })
            return notification
        except Exception as e:
            db.session.rollback()
            return None

    def send_booking_update(self, booking, event_type):
        event_messages = {
            "confirmed": "Your booking has been confirmed. Service will be delivered as scheduled.",
            "accepted": "The assigned worker accepted your booking.",
            "en_route": "The worker is on their way to your location.",
            "service_started": "The worker has started the service.",
            "in_progress": "Service is now in progress.",
            "completed": "Service has been completed. Please rate your experience.",
            "cancelled": "Your booking has been cancelled.",
        }

        message = event_messages.get(event_type, f"Booking status updated to {event_type}")

        self.send_notification(
            booking.customer_id,
            f"Booking {event_type.title()}",
            message,
            "booking_update",
            "booking",
            booking.id,
        )

        if booking.worker_id:
            worker = Worker.query.get(booking.worker_id)
            if worker:
                worker_messages = {
                    "confirmed": "You have been assigned a new booking.",
                    "accepted": "Your acceptance was recorded for this booking.",
                    "en_route": "You are en route to the customer.",
                    "service_started": "Service has started.",
                    "in_progress": "Service is now in progress.",
                    "completed": "Service completed successfully.",
                    "cancelled": "The booking has been cancelled.",
                }
                self.send_notification(
                    worker.user_id,
                    f"Booking {event_type.title()}",
                    worker_messages.get(event_type, f"Booking status: {event_type}"),
                    "booking_update",
                    "booking",
                    booking.id,
                )

    def send_allocation_update(self, allocation, event_type):
        event_messages = {
            "recommended": "You have been recommended for a service request.",
            "accepted": "Your allocation has been accepted. Booking will be created.",
            "rejected": "Your allocation has been rejected.",
            "completed": "Allocation has been completed.",
        }

        message = event_messages.get(event_type, f"Allocation status: {event_type}")

        worker = Worker.query.get(allocation.worker_id)
        if worker:
            self.send_notification(
                worker.user_id,
                f"Allocation {event_type.title()}",
                message,
                "allocation_update",
                "allocation",
                allocation.id,
            )

        self.send_notification(
            allocation.admin_user_id,
            f"Allocation {event_type.title()}",
            f"Worker allocation for request #{allocation.request_id} has been {event_type}.",
            "allocation_update",
            "allocation",
            allocation.id,
        )
