from flask import Blueprint
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models.user import User
from app.models.booking import ServiceHistory
from app.utils.helpers import success_response, error_response

history_bp = Blueprint("history", __name__, url_prefix="/api/history")


@history_bp.route("", methods=["GET"])
@history_bp.route("/", methods=["GET"])
@jwt_required()
def list_history():
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        if not user:
            return error_response("User not found", 404)

        if user.role == "customer":
            history = ServiceHistory.query.filter_by(customer_id=user_id).order_by(
                ServiceHistory.created_at.desc()
            ).all()
        elif user.role == "worker":
            from app.models.worker import Worker
            worker = Worker.query.filter_by(user_id=user_id).first()
            if worker:
                history = ServiceHistory.query.filter_by(worker_id=worker.id).order_by(
                    ServiceHistory.created_at.desc()
                ).all()
            else:
                history = []
        elif user.role == "cooperative_admin":
            coop_ids = [c.id for c in user.administered_cooperatives]
            history = ServiceHistory.query.filter(
                ServiceHistory.cooperative_id.in_(coop_ids)
            ).order_by(ServiceHistory.created_at.desc()).all()
        elif user.role in ("federation_admin", "platform_admin"):
            history = ServiceHistory.query.order_by(ServiceHistory.created_at.desc()).all()
        else:
            history = []

        return success_response(
            [h.to_dict() for h in history],
            "Service history retrieved",
        )
    except Exception as e:
        return error_response(f"Failed to retrieve history: {str(e)}", 500)
