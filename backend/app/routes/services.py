from flask import Blueprint, request
from app.models.service import ServiceCategory, Service, Skill
from app.utils.helpers import success_response, error_response, paginate

services_bp = Blueprint("services", __name__, url_prefix="/api/services")


@services_bp.route("/", methods=["GET"])
def list_services():
    try:
        categories = ServiceCategory.query.filter_by(is_active=True).order_by(ServiceCategory.display_order).all()
        data = [cat.to_dict(include_services=True) for cat in categories]
        return success_response(data, "Service categories retrieved")
    except Exception as e:
        return error_response(f"Failed to retrieve services: {str(e)}", 500)


@services_bp.route("/<int:service_id>", methods=["GET"])
def get_service(service_id):
    try:
        service = Service.query.get(service_id)
        if not service or not service.is_active:
            return error_response("Service not found", 404)
        data = service.to_dict(include_skills=True)
        return success_response(data, "Service retrieved")
    except Exception as e:
        return error_response(f"Failed to retrieve service: {str(e)}", 500)


@services_bp.route("/categories", methods=["GET"])
def list_categories():
    try:
        categories = ServiceCategory.query.filter_by(is_active=True).order_by(ServiceCategory.display_order).all()
        data = [cat.to_dict() for cat in categories]
        return success_response(data, "Categories retrieved")
    except Exception as e:
        return error_response(f"Failed to retrieve categories: {str(e)}", 500)
