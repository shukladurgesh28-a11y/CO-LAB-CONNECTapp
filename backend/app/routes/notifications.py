from flask import Blueprint, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models.user import User
from app.models.notification import Notification
from app.utils.helpers import success_response, error_response

notifications_bp = Blueprint("notifications", __name__, url_prefix="/api/notifications")


@notifications_bp.route("", methods=["GET"])
@notifications_bp.route("/", methods=["GET"])
@jwt_required()
def list_notifications():
    try:
        user_id = int(get_jwt_identity())
        notifications = Notification.query.filter_by(user_id=user_id).order_by(
            Notification.created_at.desc()
        ).limit(50).all()

        return success_response(
            [n.to_dict() for n in notifications],
            "Notifications retrieved",
        )
    except Exception as e:
        return error_response(f"Failed to retrieve notifications: {str(e)}", 500)


@notifications_bp.route("/<int:notification_id>/read", methods=["PATCH"])
@jwt_required()
def mark_read(notification_id):
    try:
        user_id = int(get_jwt_identity())
        notification = Notification.query.get(notification_id)
        if not notification:
            return error_response("Notification not found", 404)

        if notification.user_id != user_id:
            return error_response("Unauthorized", 403)

        notification.is_read = True
        db.session.commit()

        return success_response(notification.to_dict(), "Notification marked as read")
    except Exception as e:
        db.session.rollback()
        return error_response(f"Failed to mark notification: {str(e)}", 500)


@notifications_bp.route("/read-all", methods=["POST"])
@jwt_required()
def mark_all_read():
    try:
        user_id = int(get_jwt_identity())
        Notification.query.filter_by(user_id=user_id, is_read=False).update({"is_read": True})
        db.session.commit()

        return success_response(None, "All notifications marked as read")
    except Exception as e:
        db.session.rollback()
        return error_response(f"Failed to mark notifications: {str(e)}", 500)


@notifications_bp.route("/unread-count", methods=["GET"])
@jwt_required()
def unread_count():
    try:
        user_id = int(get_jwt_identity())
        count = Notification.query.filter_by(user_id=user_id, is_read=False).count()
        return success_response({"count": count}, "Unread count retrieved")
    except Exception as e:
        return error_response(f"Failed to get unread count: {str(e)}", 500)
