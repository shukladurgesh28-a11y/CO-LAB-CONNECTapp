from flask import Blueprint, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models.user import User
from app.services.analytics_service import AnalyticsService
from app.utils.helpers import success_response, error_response

analytics_bp = Blueprint("analytics", __name__, url_prefix="/api/analytics")


@analytics_bp.route("/demand", methods=["GET"])
@jwt_required()
def demand():
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        if not user:
            return error_response("User not found", 404)

        cooperative_id = request.args.get("cooperative_id", type=int)
        service_id = request.args.get("service_id", type=int)
        period_days = request.args.get("period_days", type=int, default=30)

        if user.role == "cooperative_admin":
            if user.administered_cooperatives:
                cooperative_id = cooperative_id or user.administered_cooperatives[0].id

        analytics = AnalyticsService()
        data = analytics.get_demand_analytics(
            cooperative_id=cooperative_id,
            service_id=service_id,
            period_days=period_days,
        )

        return success_response(data, "Demand analytics retrieved")
    except Exception as e:
        return error_response(f"Failed to retrieve analytics: {str(e)}", 500)


@analytics_bp.route("/heatmap", methods=["GET"])
@jwt_required()
def heatmap():
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        if not user:
            return error_response("User not found", 404)
        cooperative_id = request.args.get("cooperative_id", type=int)
        service_id = request.args.get("service_id", type=int)
        period_days = max(1, min(request.args.get("period_days", type=int, default=90), 365))
        if user.role == "cooperative_admin":
            cooperative_ids = {coop.id for coop in user.administered_cooperatives}
            cooperative_id = cooperative_id or next(iter(cooperative_ids), None)
            if cooperative_id not in cooperative_ids:
                return error_response("Unauthorized", 403)
        elif user.role == "federation_admin":
            allowed = {coop.id for federation in user.administered_federations for coop in federation.cooperatives}
            if cooperative_id and cooperative_id not in allowed:
                return error_response("Unauthorized", 403)
        elif user.role not in ("customer", "platform_admin"):
            return error_response("Unauthorized", 403)
        return success_response(
            AnalyticsService().get_heatmap(cooperative_id, service_id, period_days),
            "Demand heatmap retrieved",
        )
    except Exception as e:
        return error_response(f"Failed to retrieve heatmap: {str(e)}", 500)


@analytics_bp.route("/workforce", methods=["GET"])
@jwt_required()
def workforce():
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        if not user:
            return error_response("User not found", 404)

        cooperative_id = request.args.get("cooperative_id", type=int)

        if user.role == "cooperative_admin":
            if user.administered_cooperatives:
                cooperative_id = cooperative_id or user.administered_cooperatives[0].id

        analytics = AnalyticsService()
        data = analytics.get_workforce_analytics(cooperative_id=cooperative_id)

        return success_response(data, "Workforce analytics retrieved")
    except Exception as e:
        return error_response(f"Failed to retrieve analytics: {str(e)}", 500)


@analytics_bp.route("/demand/forecast", methods=["GET"])
@jwt_required()
def demand_forecast():
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        if not user:
            return error_response("User not found", 404)

        cooperative_id = request.args.get("cooperative_id", type=int)
        lookback_days = request.args.get("lookback_days", type=int, default=90)
        forecast_days = request.args.get("forecast_days", type=int, default=7)

        if user.role == "cooperative_admin" and user.administered_cooperatives:
            cooperative_id = cooperative_id or user.administered_cooperatives[0].id

        data = AnalyticsService().train_demand_model(
            cooperative_id=cooperative_id,
            lookback_days=max(7, min(365, lookback_days)),
            forecast_days=max(1, min(30, forecast_days)),
        )
        return success_response(data, "Demand model trained from database records")
    except Exception as e:
        return error_response(f"Failed to train demand model: {str(e)}", 500)


@analytics_bp.route("/cooperative/<int:cooperative_id>/performance", methods=["GET"])
@jwt_required()
def cooperative_performance(cooperative_id):
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        if not user:
            return error_response("User not found", 404)

        analytics = AnalyticsService()
        data = analytics.get_cooperative_performance(cooperative_id)

        return success_response(data, "Cooperative performance retrieved")
    except Exception as e:
        return error_response(f"Failed to retrieve performance: {str(e)}", 500)
