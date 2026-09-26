"""Society Workforce Requirement APIs (cooperative-first bulk hiring).

Flow: Society (cooperative_admin) creates a requirement with multiple worker
items -> submits to the Labour Cooperative Federation -> federation reviews ->
AI-assisted matching (advisory only) -> coop/federation allocates ->
workers accept/decline -> partial fulfillment stays open -> work completes.

All money figures are estimates computed with pricing.compute_invoice();
final invoicing remains in the booking flow.
"""

from datetime import datetime, timezone, date
from types import SimpleNamespace

from flask import Blueprint, request, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity

from app import db
from app.models.user import User
from app.models.worker import Worker
from app.models.cooperative import Cooperative, Federation
from app.models.service import Service
from app.models.workforce import (
    WorkforceRequirement, WorkforceItem, WorkforceAllocation,
    REQUIREMENT_STATUSES, ITEM_STATUSES, WORK_TYPES,
)
from app.services.matching_engine import MatchingEngine
from app.services.notification_service import NotificationService
from app.services.pricing import compute_invoice
from app.utils.authorization import audit
from app.utils.helpers import success_response, error_response

society_workforce_bp = Blueprint(
    "society_workforce", __name__, url_prefix="/api/society/workforce"
)
federation_workforce_bp = Blueprint(
    "federation_workforce", __name__, url_prefix="/api/federation/workforce"
)
worker_workforce_bp = Blueprint(
    "worker_workforce", __name__, url_prefix="/api/workforce"
)


# ---------------------------------------------------------------- helpers
def _requester():
    try:
        return User.query.get(int(get_jwt_identity()))
    except (ValueError, TypeError):
        return None


def _society_of(user):
    if not user or user.role != "cooperative_admin":
        return None
    coops = user.administered_cooperatives
    return coops[0] if coops else None


def _federation_ids(user):
    if not user:
        return []
    if user.role == "platform_admin":
        return [f.id for f in Federation.query.all()]
    if user.role == "federation_admin":
        return [f.id for f in user.administered_federations]
    return []


def _parse_date(value, field):
    if not value:
        return None, None
    try:
        return datetime.strptime(str(value)[:10], "%Y-%m-%d").date(), None
    except ValueError:
        return None, f"{field} must be YYYY-MM-DD"


def _parse_time(value, field):
    if not value:
        return None, None
    try:
        return datetime.strptime(str(value)[:5], "%H:%M").time(), None
    except ValueError:
        return None, f"{field} must be HH:MM"


def _validate_item_payload(data):
    service = Service.query.get(data.get("service_id"))
    if not service or not service.is_active:
        return None, "Valid worker category (service) is required"
    try:
        quantity = int(data.get("quantity_required", 0))
    except (TypeError, ValueError):
        return None, "Quantity must be a positive integer"
    if quantity <= 0:
        return None, "Quantity must be a positive integer"
    start, err = _parse_date(data.get("start_date"), "start_date")
    if err:
        return None, err
    end, err = _parse_date(data.get("end_date"), "end_date")
    if err:
        return None, err
    if start and end and end < start:
        return None, "Item end date is before start date"
    try:
        hours = float(data.get("working_hours_per_day", 8) or 8)
    except (TypeError, ValueError):
        return None, "Working hours per day must be a number"
    if hours <= 0 or hours > 24:
        return None, "Working hours per day must be between 0 and 24"
    try:
        experience = int(data.get("minimum_experience", 0) or 0)
    except (TypeError, ValueError):
        return None, "Minimum experience must be a number of years"
    if experience < 0:
        return None, "Minimum experience cannot be negative"
    priority = str(data.get("priority", "normal")).lower()
    if priority not in ("low", "normal", "high", "urgent"):
        return None, "Priority must be low, normal, high or urgent"
    return {
        "service": service,
        "quantity_required": quantity,
        "skill_requirement": (data.get("skill_requirement") or "").strip() or None,
        "minimum_experience": experience,
        "start_date": start,
        "end_date": end,
        "working_hours_per_day": hours,
        "priority": priority,
        "special_requirements": data.get("special_requirements"),
        "gender_preference": data.get("gender_preference"),
        "accommodation_required": bool(data.get("accommodation_required", False)),
        "equipment_provided": bool(data.get("equipment_provided", False)),
        "notes": data.get("notes"),
    }, None


def _scope_check(user, requirement):
    """Society sees own coop; federation sees own federations; platform all."""
    if user.role == "platform_admin":
        return True
    if user.role == "cooperative_admin":
        coop = _society_of(user)
        return bool(coop and requirement.cooperative_id == coop.id)
    if user.role == "federation_admin":
        return requirement.federation_id in _federation_ids(user)
    return False


def _notify(user_id, title, message, ref_type, ref_id):
    if not user_id:
        return
    try:
        NotificationService().send_notification(
            user_id, title, message, ref_type, ref_type, ref_id
        )
    except Exception:
        pass


# ------------------------------------------------- society: requirements
@society_workforce_bp.route("/requirements", methods=["POST"])
@jwt_required()
def create_requirement():
    try:
        user = _requester()
        coop = _society_of(user)
        if not coop:
            return error_response("Only an active society (cooperative admin) can create requirements", 403)
        if not coop.is_active:
            return error_response("Society is inactive", 403)

        data = request.get_json() or {}
        title = (data.get("title") or "").strip()
        if not title:
            return error_response("Requirement title is required", 400)
        work_type = data.get("work_type", "Other")
        if work_type not in WORK_TYPES:
            return error_response(f"Work type must be one of: {', '.join(WORK_TYPES)}", 400)

        start, err = _parse_date(data.get("start_date"), "start_date")
        if err:
            return error_response(err, 400)
        end, err = _parse_date(data.get("end_date"), "end_date")
        if err:
            return error_response(err, 400)
        if start and end and end < start:
            return error_response("End date is before start date", 400)
        t_start, err = _parse_time(data.get("daily_start_time"), "daily_start_time")
        if err:
            return error_response(err, 400)
        t_end, err = _parse_time(data.get("daily_end_time"), "daily_end_time")
        if err:
            return error_response(err, 400)

        req = WorkforceRequirement(
            cooperative_id=coop.id,
            federation_id=coop.federation_id,
            created_by=user.id,
            title=title,
            description=data.get("description"),
            work_type=work_type,
            location_address=data.get("location_address"),
            latitude=data.get("latitude"),
            longitude=data.get("longitude"),
            start_date=start,
            end_date=end,
            daily_start_time=t_start,
            daily_end_time=t_end,
            break_minutes=int(data.get("break_minutes", 60) or 60),
            flexible_timing=bool(data.get("flexible_timing", False)),
            working_days=data.get("working_days"),
            status="DRAFT",
        )
        db.session.add(req)
        db.session.commit()
        return success_response(req.to_dict(), "Workforce requirement created as draft", 201)
    except Exception as e:
        db.session.rollback()
        return error_response(f"Failed to create requirement: {str(e)}", 500)


@society_workforce_bp.route("/requirements", methods=["GET"])
@jwt_required()
def list_requirements():
    try:
        user = _requester()
        coop = _society_of(user)
        if not coop:
            return error_response("Only a society can list its requirements", 403)
        status = (request.args.get("status") or "all").strip().upper()
        query = WorkforceRequirement.query.filter_by(cooperative_id=coop.id)
        if status != "ALL":
            if status not in REQUIREMENT_STATUSES:
                return error_response("Unknown status filter", 400)
            query = query.filter_by(status=status)
        rows = query.order_by(WorkforceRequirement.created_at.desc()).all()
        return success_response([r.to_dict() for r in rows], "Requirements retrieved")
    except Exception as e:
        return error_response(f"Failed to list requirements: {str(e)}", 500)


@society_workforce_bp.route("/requirements/<int:requirement_id>", methods=["GET"])
@jwt_required()
def get_requirement(requirement_id):
    try:
        user = _requester()
        req = WorkforceRequirement.query.get(requirement_id)
        if not req:
            return error_response("Requirement not found", 404)
        if not _scope_check(user, req):
            return error_response("Unauthorized", 403)
        return success_response(req.to_dict(include_items=True), "Requirement retrieved")
    except Exception as e:
        return error_response(f"Failed to retrieve requirement: {str(e)}", 500)


@society_workforce_bp.route("/requirements/<int:requirement_id>", methods=["PUT"])
@jwt_required()
def update_requirement(requirement_id):
    try:
        user = _requester()
        coop = _society_of(user)
        req = WorkforceRequirement.query.get(requirement_id)
        if not req:
            return error_response("Requirement not found", 404)
        if not coop or req.cooperative_id != coop.id:
            return error_response("Unauthorized", 403)
        if req.status != "DRAFT":
            return error_response("Only draft requirements can be edited", 409)
        data = request.get_json() or {}
        for field in ("title", "description", "location_address", "latitude",
                      "longitude", "break_minutes", "flexible_timing", "working_days"):
            if field in data:
                setattr(req, field, data[field])
        if "work_type" in data:
            if data["work_type"] not in WORK_TYPES:
                return error_response("Invalid work type", 400)
            req.work_type = data["work_type"]
        for field, parser in (("start_date", _parse_date), ("end_date", _parse_date)):
            if field in data:
                value, err = parser(data[field], field)
                if err:
                    return error_response(err, 400)
                setattr(req, field, value)
        for field in ("daily_start_time", "daily_end_time"):
            if field in data:
                value, err = _parse_time(data[field], field)
                if err:
                    return error_response(err, 400)
                setattr(req, field, value)
        if req.start_date and req.end_date and req.end_date < req.start_date:
            return error_response("End date is before start date", 400)
        db.session.commit()
        return success_response(req.to_dict(), "Requirement updated")
    except Exception as e:
        db.session.rollback()
        return error_response(f"Failed to update requirement: {str(e)}", 500)


@society_workforce_bp.route("/requirements/<int:requirement_id>", methods=["DELETE"])
@jwt_required()
def cancel_requirement(requirement_id):
    try:
        user = _requester()
        coop = _society_of(user)
        req = WorkforceRequirement.query.get(requirement_id)
        if not req:
            return error_response("Requirement not found", 404)
        if not coop or req.cooperative_id != coop.id:
            return error_response("Unauthorized", 403)
        if req.status in ("COMPLETED", "CANCELLED"):
            return error_response(f"Cannot cancel a {req.status} requirement", 400)
        req.status = "CANCELLED"
        for item in req.items:
            if item.status != "CANCELLED":
                item.status = "CANCELLED"
        db.session.commit()
        _notify(req.cooperative.admin_user_id if req.cooperative else None,
                "Requirement cancelled", f"'{req.title}' was cancelled.",
                "workforce_requirement", req.id)
        return success_response(req.to_dict(), "Requirement cancelled")
    except Exception as e:
        db.session.rollback()
        return error_response(f"Failed to cancel requirement: {str(e)}", 500)


# ------------------------------------------------- society: items
@society_workforce_bp.route("/requirements/<int:requirement_id>/items", methods=["POST"])
@jwt_required()
def add_item(requirement_id):
    try:
        user = _requester()
        coop = _society_of(user)
        req = WorkforceRequirement.query.get(requirement_id)
        if not req:
            return error_response("Requirement not found", 404)
        if not coop or req.cooperative_id != coop.id:
            return error_response("Unauthorized", 403)
        if req.status != "DRAFT":
            return error_response("Items can only be added to draft requirements", 409)
        payload, err = _validate_item_payload(request.get_json() or {})
        if err:
            return error_response(err, 400)
        service = payload.pop("service")
        item = WorkforceItem(requirement_id=req.id, service_id=service.id, **payload)
        db.session.add(item)
        db.session.commit()
        return success_response(item.to_dict(), "Worker requirement added", 201)
    except Exception as e:
        db.session.rollback()
        return error_response(f"Failed to add item: {str(e)}", 500)


@society_workforce_bp.route("/items/<int:item_id>", methods=["PUT"])
@jwt_required()
def update_item(item_id):
    try:
        user = _requester()
        coop = _society_of(user)
        item = WorkforceItem.query.get(item_id)
        if not item:
            return error_response("Item not found", 404)
        req = item.requirement
        if not coop or req.cooperative_id != coop.id:
            return error_response("Unauthorized", 403)
        if req.status != "DRAFT":
            return error_response("Items can only be edited in draft requirements", 409)
        data = request.get_json() or {}
        merged = {
            "service_id": data.get("service_id", item.service_id),
            "quantity_required": data.get("quantity_required", item.quantity_required),
            "skill_requirement": data.get("skill_requirement", item.skill_requirement),
            "minimum_experience": data.get("minimum_experience", item.minimum_experience),
            "start_date": data.get("start_date", item.start_date.isoformat() if item.start_date else None),
            "end_date": data.get("end_date", item.end_date.isoformat() if item.end_date else None),
            "working_hours_per_day": data.get("working_hours_per_day", item.working_hours_per_day),
            "priority": data.get("priority", item.priority),
            "special_requirements": data.get("special_requirements", item.special_requirements),
            "gender_preference": data.get("gender_preference", item.gender_preference),
            "accommodation_required": data.get("accommodation_required", item.accommodation_required),
            "equipment_provided": data.get("equipment_provided", item.equipment_provided),
            "notes": data.get("notes", item.notes),
        }
        payload, err = _validate_item_payload(merged)
        if err:
            return error_response(err, 400)
        service = payload.pop("service")
        item.service_id = service.id
        for key, value in payload.items():
            setattr(item, key, value)
        db.session.commit()
        return success_response(item.to_dict(), "Item updated")
    except Exception as e:
        db.session.rollback()
        return error_response(f"Failed to update item: {str(e)}", 500)


@society_workforce_bp.route("/items/<int:item_id>", methods=["DELETE"])
@jwt_required()
def delete_item(item_id):
    try:
        user = _requester()
        coop = _society_of(user)
        item = WorkforceItem.query.get(item_id)
        if not item:
            return error_response("Item not found", 404)
        req = item.requirement
        if not coop or req.cooperative_id != coop.id:
            return error_response("Unauthorized", 403)
        if req.status != "DRAFT":
            return error_response("Items can only be removed from draft requirements", 409)
        db.session.delete(item)
        db.session.commit()
        return success_response({"id": item_id}, "Item removed")
    except Exception as e:
        db.session.rollback()
        return error_response(f"Failed to remove item: {str(e)}", 500)


# ------------------------------------------------- submit / review
@society_workforce_bp.route("/requirements/<int:requirement_id>/submit", methods=["POST"])
@jwt_required()
def submit_requirement(requirement_id):
    try:
        user = _requester()
        coop = _society_of(user)
        req = WorkforceRequirement.query.get(requirement_id)
        if not req:
            return error_response("Requirement not found", 404)
        if not coop or req.cooperative_id != coop.id:
            return error_response("Unauthorized", 403)
        if req.status != "DRAFT":
            return error_response("Only draft requirements can be submitted", 409)
        if not req.items:
            return error_response("Add at least one worker requirement before submitting", 400)
        for item in req.items:
            if not item.quantity_required or item.quantity_required <= 0:
                return error_response(f"Item #{item.id} has an invalid quantity", 400)
            if item.start_date and item.end_date and item.end_date < item.start_date:
                return error_response(f"Item #{item.id} has an invalid date range", 400)
        req.status = "SUBMITTED"
        db.session.commit()
        federation = Federation.query.get(req.federation_id) if req.federation_id else None
        _notify(federation.admin_user_id if federation else None,
                "New workforce requirement",
                f"Society '{coop.name}' submitted '{req.title}' for review.",
                "workforce_requirement", req.id)
        return success_response(req.to_dict(include_items=True), "Submitted to the federation")
    except Exception as e:
        db.session.rollback()
        return error_response(f"Failed to submit requirement: {str(e)}", 500)


@federation_workforce_bp.route("/requirements", methods=["GET"])
@jwt_required()
def federation_list():
    try:
        user = _requester()
        if not user or user.role not in ("federation_admin", "platform_admin"):
            return error_response("Only federation admins can list federation requirements", 403)
        status = (request.args.get("status") or "all").strip().upper()
        query = WorkforceRequirement.query
        if user.role == "federation_admin":
            query = query.filter(WorkforceRequirement.federation_id.in_(_federation_ids(user)))
        if status != "ALL":
            if status not in REQUIREMENT_STATUSES:
                return error_response("Unknown status filter", 400)
            query = query.filter_by(status=status)
        rows = query.order_by(WorkforceRequirement.created_at.desc()).all()
        return success_response([r.to_dict() for r in rows], "Federation requirements retrieved")
    except Exception as e:
        return error_response(f"Failed to list requirements: {str(e)}", 500)


@federation_workforce_bp.route("/requirements/<int:requirement_id>/review", methods=["POST"])
@jwt_required()
def review_requirement(requirement_id):
    try:
        user = _requester()
        if not user or user.role not in ("federation_admin", "platform_admin"):
            return error_response("Only federation admins can review requirements", 403)
        req = WorkforceRequirement.query.get(requirement_id)
        if not req:
            return error_response("Requirement not found", 404)
        if user.role == "federation_admin" and req.federation_id not in _federation_ids(user):
            return error_response("Requirement is outside your federation", 403)
        data = request.get_json() or {}
        decision = str(data.get("decision", "approve")).lower()
        if req.status not in ("SUBMITTED", "UNDER_REVIEW"):
            return error_response(f"Cannot review a {req.status} requirement", 409)
        if decision == "approve":
            req.status = "MATCHING"
            message = "Requirement approved; AI matching is now available"
        elif decision == "reject":
            req.status = "SUBMITTED"
            message = "Requirement sent back to the society"
        else:
            return error_response("Decision must be 'approve' or 'reject'", 400)
        audit(user, f"workforce.{decision}", "workforce_requirement", req.id,
              f"coop={req.cooperative_id}")
        db.session.commit()
        coop = req.cooperative
        _notify(coop.admin_user_id if coop else None,
                f"Requirement {decision}d", f"'{req.title}': {message}.",
                "workforce_requirement", req.id)
        return success_response(req.to_dict(include_items=True), message)
    except Exception as e:
        db.session.rollback()
        return error_response(f"Failed to review requirement: {str(e)}", 500)


# ------------------------------------------------- matching (advisory)
def _score_item_workers(item, federation_ids):
    """Rank eligible workers for one item using the shared matching engine."""
    engine = MatchingEngine()
    weights = engine.DEFAULT_WEIGHTS
    service = item.service
    request_like = SimpleNamespace(
        urgency="normal",
        cooperative_id=None,
        preferred_date=item.start_date,
        preferred_time_start=None,
        preferred_time_end=None,
        location_lat=(item.requirement.latitude if item.requirement else None),
        location_lng=(item.requirement.longitude if item.requirement else None),
        service=service,
    )
    query = Worker.query.filter(
        Worker.verification_status == "verified",
        Worker.is_available == True,  # noqa: E712
    )
    if federation_ids:
        query = query.join(Cooperative, Worker.cooperative_id == Cooperative.id).filter(
            Cooperative.federation_id.in_(federation_ids)
        )
    today = item.start_date or date.today()
    scored = []
    for worker in query.all():
        if worker.current_workload >= worker.max_workload:
            continue
        if not engine._is_eligible(worker, reference_date=today):
            continue
        if item.minimum_experience and (worker.experience_years or 0) < item.minimum_experience:
            continue
        breakdown = engine.get_score_breakdown(worker, request_like, weights)
        cold_start = bool(breakdown.pop("_cold_start", 0.0))
        total = sum(breakdown.values())
        if total < 0.1:
            continue
        explanation = engine._build_explanation(breakdown, worker, request_like, cold_start=cold_start)
        scored.append((worker, round(total, 4), breakdown, explanation))
    scored.sort(key=lambda t: (
        -t[1],
        engine._last_service_ordinal(t[0]),
        t[0].id,
    ))
    return scored


@society_workforce_bp.route("/requirements/<int:requirement_id>/matches", methods=["GET"])
@jwt_required()
def requirement_matches(requirement_id):
    try:
        user = _requester()
        req = WorkforceRequirement.query.get(requirement_id)
        if not req:
            return error_response("Requirement not found", 404)
        if not _scope_check(user, req):
            return error_response("Unauthorized", 403)
        if req.status in ("DRAFT", "SUBMITTED"):
            return error_response("Submit and approve the requirement before matching", 409)
        federation_ids = [req.federation_id] if req.federation_id else []
        payload = []
        for item in req.items:
            ranked = _score_item_workers(item, federation_ids)[:10]
            payload.append({
                "item": item.to_dict(),
                "matches": [
                    {
                        "worker": w.to_dict(),
                        "score": round(score * 100, 1),
                        "breakdown": {k: round(v, 4) for k, v in breakdown.items()},
                        "explanation": explanation,
                    }
                    for w, score, breakdown, explanation in ranked
                ],
            })
        return success_response(payload, "Advisory matches computed (federation decides allocation)")
    except Exception as e:
        return error_response(f"Failed to compute matches: {str(e)}", 500)


# ------------------------------------------------- allocation
@society_workforce_bp.route("/items/<int:item_id>/allocate", methods=["POST"])
@jwt_required()
def allocate_item_worker(item_id):
    try:
        user = _requester()
        item = WorkforceItem.query.get(item_id)
        if not item:
            return error_response("Item not found", 404)
        req = item.requirement
        if user.role == "cooperative_admin":
            coop = _society_of(user)
            if not coop or req.cooperative_id != coop.id:
                return error_response("Unauthorized", 403)
        elif user.role == "federation_admin":
            if req.federation_id not in _federation_ids(user):
                return error_response("Requirement is outside your federation", 403)
        elif user.role != "platform_admin":
            return error_response("Only cooperative/federation admins can allocate", 403)

        data = request.get_json() or {}
        worker = Worker.query.get(data.get("worker_id"))
        if not worker:
            return error_response("Worker not found", 404)
        if worker.verification_status != "verified":
            return error_response("Worker is not verified", 409)
        if WorkforceAllocation.query.filter_by(workforce_item_id=item.id, worker_id=worker.id).first():
            return error_response("Worker is already allocated to this item", 409)

        allocation = WorkforceAllocation(
            workforce_item_id=item.id,
            worker_id=worker.id,
            allocated_by=user.id,
            status="offered",
            start_date=item.start_date,
            end_date=item.end_date,
        )
        db.session.add(allocation)
        db.session.flush()
        if req.status in ("MATCHING", "PARTIALLY_FULFILLED", "FULLY_FULFILLED"):
            req.status = "MATCHING"
        db.session.commit()
        _notify(worker.user_id,
                "New work assignment",
                f"You were assigned '{item.service.name if item.service else 'work'}' for '{req.title}'.",
                "workforce_allocation", allocation.id)
        return success_response(allocation.to_dict(), "Worker allocated (offered)", 201)
    except Exception as e:
        db.session.rollback()
        return error_response(f"Failed to allocate worker: {str(e)}", 500)


def _refresh_item_and_requirement(item):
    item.refresh_status()
    req = item.requirement
    if req and req.status not in ("DRAFT", "SUBMITTED", "UNDER_REVIEW", "MATCHING",
                                  "CANCELLED", "EXPIRED", "COMPLETED"):
        req.refresh_status()
    elif req and req.status == "MATCHING":
        accepted_total = sum(i.accepted_count for i in req.items)
        if accepted_total > 0:
            req.refresh_status()


@worker_workforce_bp.route("/my-assignments", methods=["GET"])
@jwt_required()
def my_assignments():
    try:
        user = _requester()
        if not user or user.role != "worker":
            return error_response("Only workers can view assignments", 403)
        worker = Worker.query.filter_by(user_id=user.id).first()
        if not worker:
            return error_response("Worker profile not found", 404)
        rows = WorkforceAllocation.query.filter_by(worker_id=worker.id).order_by(
            WorkforceAllocation.offered_at.desc()).all()
        return success_response([a.to_dict() for a in rows], "Assignments retrieved")
    except Exception as e:
        return error_response(f"Failed to retrieve assignments: {str(e)}", 500)


@worker_workforce_bp.route("/allocations/<int:allocation_id>/accept", methods=["POST"])
@jwt_required()
def accept_allocation(allocation_id):
    return _respond_allocation(allocation_id, "accepted")


@worker_workforce_bp.route("/allocations/<int:allocation_id>/decline", methods=["POST"])
@jwt_required()
def decline_allocation(allocation_id):
    return _respond_allocation(allocation_id, "declined")


def _respond_allocation(allocation_id, decision):
    try:
        user = _requester()
        if not user or user.role != "worker":
            return error_response("Only workers can respond to assignments", 403)
        worker = Worker.query.filter_by(user_id=user.id).first()
        allocation = WorkforceAllocation.query.get(allocation_id)
        if not allocation:
            return error_response("Assignment not found", 404)
        if not worker or allocation.worker_id != worker.id:
            return error_response("Assignment is not yours", 403)
        if allocation.status != "offered":
            return error_response(f"Assignment is already {allocation.status}", 409)
        data = request.get_json() or {}
        allocation.status = decision
        allocation.worker_response = data.get("response") or data.get("reason")
        allocation.responded_at = datetime.now(timezone.utc).replace(tzinfo=None)
        item = allocation.item
        _refresh_item_and_requirement(item)
        if item.requirement and item.requirement.status in ("PARTIALLY_FULFILLED", "FULLY_FULFILLED"):
            item.requirement.status = "WORK_IN_PROGRESS"
        db.session.commit()
        req = item.requirement
        coop = req.cooperative if req else None
        _notify(coop.admin_user_id if coop else None,
                f"Worker {decision} assignment",
                f"{worker.name} {decision} '{item.service.name if item.service else 'work'}' for '{req.title if req else ''}'.",
                "workforce_allocation", allocation.id)
        return success_response(allocation.to_dict(), f"Assignment {decision}")
    except Exception as e:
        db.session.rollback()
        return error_response(f"Failed to respond: {str(e)}", 500)


@worker_workforce_bp.route("/allocations/<int:allocation_id>/complete", methods=["POST"])
@jwt_required()
def complete_allocation(allocation_id):
    try:
        user = _requester()
        if not user or user.role != "worker":
            return error_response("Only workers can complete assignments", 403)
        worker = Worker.query.filter_by(user_id=user.id).first()
        allocation = WorkforceAllocation.query.get(allocation_id)
        if not allocation:
            return error_response("Assignment not found", 404)
        if not worker or allocation.worker_id != worker.id:
            return error_response("Assignment is not yours", 403)
        if allocation.status != "accepted":
            return error_response("Only accepted assignments can be completed", 409)
        allocation.status = "completed"
        allocation.responded_at = datetime.now(timezone.utc).replace(tzinfo=None)
        db.session.commit()
        return success_response(allocation.to_dict(), "Assignment completed")
    except Exception as e:
        db.session.rollback()
        return error_response(f"Failed to complete assignment: {str(e)}", 500)


# ------------------------------------------------- progress + estimates
@society_workforce_bp.route("/requirements/<int:requirement_id>/progress", methods=["GET"])
@jwt_required()
def requirement_progress(requirement_id):
    try:
        user = _requester()
        req = WorkforceRequirement.query.get(requirement_id)
        if not req:
            return error_response("Requirement not found", 404)
        if not _scope_check(user, req):
            return error_response("Unauthorized", 403)

        c_rate = current_app.config.get("COMMISSION_RATE", 0.10)
        t_rate = current_app.config.get("TAX_RATE", 0.0)
        items_payload = []
        est_worker_payout = 0.0
        for item in req.items:
            base = float(item.service.base_price) if item.service and item.service.base_price else 0.0
            per_worker = compute_invoice(
                service_amount=base * max(item.duration_days, 1),
                commission_rate=c_rate, tax_rate=t_rate,
            )
            item_estimate = float(per_worker["worker_payout"]) * (item.quantity_required or 0)
            est_worker_payout += item_estimate
            entry = item.to_dict(include_allocations=True)
            entry["estimate_per_worker"] = float(per_worker["worker_payout"])
            entry["estimate_item_payout"] = round(item_estimate, 2)
            items_payload.append(entry)

        timeline = [
            {"event": "Requirement created", "at": req.created_at.isoformat() if req.created_at else None},
            {"event": f"Status: {req.status}", "at": req.updated_at.isoformat() if req.updated_at else None},
        ]
        return success_response({
            "requirement": req.to_dict(),
            "items": items_payload,
            "summary": {
                "total_worker_types": len(req.items),
                "total_workers_required": req.total_workers_required,
                "total_worker_days": req.total_worker_days,
                "workers_accepted": req.workers_accepted,
                "workers_remaining": req.workers_remaining,
                "estimated_worker_payout": round(est_worker_payout, 2),
                "status": req.status,
            },
            "timeline": timeline,
        }, "Progress retrieved")
    except Exception as e:
        return error_response(f"Failed to retrieve progress: {str(e)}", 500)


@society_workforce_bp.route("/requirements/<int:requirement_id>/complete", methods=["POST"])
@jwt_required()
def complete_requirement(requirement_id):
    """Society marks the requirement complete once work is done."""
    try:
        user = _requester()
        coop = _society_of(user)
        req = WorkforceRequirement.query.get(requirement_id)
        if not req:
            return error_response("Requirement not found", 404)
        if not coop or req.cooperative_id != coop.id:
            return error_response("Unauthorized", 403)
        if req.status not in ("WORK_IN_PROGRESS", "FULLY_FULFILLED", "PARTIALLY_FULFILLED"):
            return error_response(f"Cannot complete from status {req.status}", 409)
        req.status = "COMPLETED"
        db.session.commit()
        return success_response(req.to_dict(), "Requirement completed")
    except Exception as e:
        db.session.rollback()
        return error_response(f"Failed to complete requirement: {str(e)}", 500)
