from flask import Blueprint
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.models.user import User
from app.utils.helpers import error_response, success_response

users_bp = Blueprint("users", __name__, url_prefix="/api/users")


@users_bp.route("/me", methods=["GET"])
@jwt_required()
def get_current_user():
    user = User.query.get(int(get_jwt_identity()))
    if not user:
        return error_response("User not found", 404)
    data = user.to_dict()
    if user.worker_profile:
        data["worker_profile"] = user.worker_profile.to_dict(include_details=True)
    return success_response(data, "Profile retrieved")
