from flask import Blueprint, request
from flask_jwt_extended import jwt_required
from app.services.matching_engine import MatchingEngine
from app.utils.helpers import success_response, error_response

matching_bp = Blueprint("matching", __name__, url_prefix="/api/matching")


@matching_bp.route("/recommend", methods=["POST"])
@jwt_required()
def recommend_from_body():
    data = request.get_json() or {}
    request_id = data.get("request_id")
    if not request_id:
        return error_response("Request ID is required", 400)
    return get_recommendations(request_id)


@matching_bp.route("/<int:request_id>", methods=["GET"])
@jwt_required()
def get_recommendations(request_id):
    try:
        engine = MatchingEngine()
        recommendations = engine.find_recommendations(request_id)

        return success_response(
            [r.to_dict() for r in recommendations],
            f"Found {len(recommendations)} recommendations",
        )
    except Exception as e:
        return error_response(f"Failed to generate recommendations: {str(e)}", 500)


@matching_bp.route("/<int:request_id>/explain", methods=["POST"])
@jwt_required()
def explain_recommendation(request_id):
    try:
        data = request.get_json()
        if not data or "worker_id" not in data:
            return error_response("Worker ID is required", 400)

        engine = MatchingEngine()
        result, error_msg = engine.get_detailed_explanation(request_id, data["worker_id"])

        if error_msg:
            return error_response(error_msg, 404)

        return success_response(result, "Explanation generated")
    except Exception as e:
        return error_response(f"Failed to generate explanation: {str(e)}", 500)
