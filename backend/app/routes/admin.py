"""Central platform management APIs (single unified Admin Panel).

Org model: Federation > Society (Co-op, same `cooperatives` table) > Workers.
One panel serves all org roles: platform_admin (full platform), federation_admin
(scoped to their federation), cooperative_admin (scoped to their societies).
Society == Cooperative: the `cooperatives` table IS the society registry; the
`societies` SQL view is a read alias. Mutations append to the audit trail.
"""

from datetime import datetime, timezone

from flask import Blueprint, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import func

from app import db
from app.models.user import User
from app.models.worker import Worker
from app.models.cooperative import Cooperative, Federation
from app.models.service import ServiceCategory, Service, Skill
from app.models.booking import (
    Booking, Payment, Invoice, Rating, ServiceRequest, Allocation,
)
from app.models.welfare import WorkerWelfare
from app.models.dispute import Dispute
from app.models.notification import Notification, AuditLog
from app.models.workforce import WorkforceRequirement
from app.utils.authorization import audit
from app.utils.helpers import success_response, error_response, money_float
from app.services.opencode_assistant import ask_opencode, opencode_configured

admin_bp = Blueprint("admin", __name__, url_prefix="/api/admin")


ORG_ADMIN_ROLES = ("platform_admin", "federation_admin", "cooperative_admin")


def _platform():
    """Any org admin (platform / federation / society manager). Kept for compat."""
    try:
        user = User.query.get(int(get_jwt_identity()))
    except (ValueError, TypeError):
        return None
    if not user or user.role not in ORG_ADMIN_ROLES:
        return None
    return user


def _require_platform():
    user = _platform()
    if not user:
        return None, error_response("Admin access required (platform / federation / society manager)", 403)
    return user, None


# ------------------------------------------------------------ overview
@admin_bp.route("/overview", methods=["GET"])
@jwt_required()
def overview():
    user, err = _require_platform()
    if err:
        return err
    try:
        active_statuses = ["confirmed", "accepted", "en_route", "service_started", "in_progress"]
        inv = db.session.query(
            func.coalesce(func.sum(Invoice.commission_amount), 0),
            func.coalesce(func.sum(Invoice.welfare_amount), 0),
            func.coalesce(func.sum(Invoice.worker_payout), 0),
            func.coalesce(func.sum(Invoice.net_amount), 0),
        ).first()
        pay_rows = db.session.query(Payment.status, func.count(Payment.id)).group_by(
            Payment.status).all()
        wf_rows = db.session.query(
            WorkforceRequirement.status, func.count(WorkforceRequirement.id)).group_by(
            WorkforceRequirement.status).all()
        return success_response({
            "federations_total": Federation.query.count(),
            "federations_active": Federation.query.filter_by(is_active=True).count(),
            "societies_total": Cooperative.query.count(),
            "societies_active": Cooperative.query.filter_by(is_active=True).count(),
            "workers_total": Worker.query.count(),
            "workers_verified": Worker.query.filter_by(verification_status="verified").count(),
            "customers_total": User.query.filter_by(role="customer").count(),
            "users_total": User.query.count(),
            "active_jobs": Booking.query.filter(Booking.status.in_(active_statuses)).count(),
            "completed_jobs": Booking.query.filter_by(status="completed").count(),
            "workforce_requirements": sum(n for _, n in wf_rows),
            "workforce_by_status": {s: n for s, n in wf_rows},
            "payments_by_status": {s: n for s, n in pay_rows},
            "commission_total": float(inv[0] or 0),
            "welfare_fund": float(inv[1] or 0),
            "payouts_total": float(inv[2] or 0),
            "revenue_total": float(inv[3] or 0),
            "open_disputes": Dispute.query.filter(
                Dispute.status.in_(["open", "under_review", "awaiting_response"])).count(),
            "ratings_count": Rating.query.count(),
        }, "Platform overview retrieved")
    except Exception as e:
        return error_response(f"Failed to build overview: {str(e)}", 500)


# ------------------------------------------------------------ federations
@admin_bp.route("/federations", methods=["GET"])
@jwt_required()
def list_federations():
    user, err = _require_platform()
    if err:
        return err
    data = []
    for fed in Federation.query.order_by(Federation.id).all():
        coops = Cooperative.query.filter_by(federation_id=fed.id).all()
        coop_ids = [c.id for c in coops]
        item = fed.to_dict()
        item["society_count"] = len(coops)
        item["worker_count"] = Worker.query.filter(
            Worker.cooperative_id.in_(coop_ids)).count() if coop_ids else 0
        data.append(item)
    return success_response(data, "Federations retrieved")


@admin_bp.route("/federations/<int:federation_id>", methods=["PATCH"])
@jwt_required()
def update_federation(federation_id):
    user, err = _require_platform()
    if err:
        return err
    try:
        fed = Federation.query.get(federation_id)
        if not fed:
            return error_response("Federation not found", 404)
        data = request.get_json() or {}
        for field in ("name", "description", "contact_email", "contact_phone",
                      "admin_user_id", "is_active"):
            if field in data:
                setattr(fed, field, data[field])
        db.session.commit()
        audit(user, "federation.update", "federation", fed.id,
              f"name={fed.name} active={fed.is_active}")
        db.session.commit()
        return success_response(fed.to_dict(), "Federation updated")
    except Exception as e:
        db.session.rollback()
        return error_response(f"Failed to update federation: {str(e)}", 500)


# ------------------------------------------------------------ societies
@admin_bp.route("/societies", methods=["GET"])
@jwt_required()
def list_societies():
    user, err = _require_platform()
    if err:
        return err
    data = []
    for coop in Cooperative.query.order_by(Cooperative.id).all():
        item = coop.to_dict()
        item["worker_count"] = Worker.query.filter_by(cooperative_id=coop.id).count()
        item["pending_requests"] = ServiceRequest.query.filter_by(
            cooperative_id=coop.id, status="pending").count()
        item["active_bookings"] = Booking.query.filter(
            Booking.cooperative_id == coop.id,
            Booking.status.in_(["confirmed", "accepted", "en_route",
                                "service_started", "in_progress"])).count()
        item["workforce_requirements"] = WorkforceRequirement.query.filter_by(
            cooperative_id=coop.id).count()
        data.append(item)
    return success_response(data, "Societies retrieved")


@admin_bp.route("/societies/<int:coop_id>", methods=["PATCH"])
@jwt_required()
def update_society(coop_id):
    user, err = _require_platform()
    if err:
        return err
    try:
        coop = Cooperative.query.get(coop_id)
        if not coop:
            return error_response("Society not found", 404)
        data = request.get_json() or {}
        for field in ("name", "contact_email", "contact_phone", "address",
                      "federation_id", "admin_user_id", "is_active"):
            if field in data:
                setattr(coop, field, data[field])
        db.session.commit()
        audit(user, "society.update", "cooperative", coop.id,
              f"name={coop.name} active={coop.is_active}")
        db.session.commit()
        return success_response(coop.to_dict(), "Society updated")
    except Exception as e:
        db.session.rollback()
        return error_response(f"Failed to update society: {str(e)}", 500)


# ------------------------------------------------------------ users
@admin_bp.route("/users/stats", methods=["GET"])
@jwt_required()
def users_stats():
    user, err = _require_platform()
    if err:
        return err
    rows = db.session.query(User.role, func.count(User.id)).group_by(User.role).all()
    return success_response({
        "by_role": {role: count for role, count in rows},
        "total": sum(count for _, count in rows),
        "verified": User.query.filter_by(is_verified=True).count(),
    }, "User stats retrieved")


@admin_bp.route("/users", methods=["GET"])
@jwt_required()
def list_users():
    user, err = _require_platform()
    if err:
        return err
    role = request.args.get("role")
    limit = max(1, min(request.args.get("limit", type=int, default=100), 500))
    query = User.query
    if role:
        query = query.filter_by(role=role)
    rows = query.order_by(User.created_at.desc()).limit(limit).all()
    return success_response([{
        "id": u.id, "name": u.name, "email": u.email, "phone": u.phone,
        "role": u.role, "is_active": u.is_active, "is_verified": u.is_verified,
        "created_at": u.created_at.isoformat() if u.created_at else None,
    } for u in rows], "Users retrieved")


# ------------------------------------------------------------ allocations
@admin_bp.route("/allocations", methods=["GET"])
@jwt_required()
def list_all_allocations():
    user, err = _require_platform()
    if err:
        return err
    limit = max(1, min(request.args.get("limit", type=int, default=100), 500))
    rows = Allocation.query.order_by(Allocation.created_at.desc()).limit(limit).all()
    out = []
    for a in rows:
        item = a.to_dict()
        item["worker_name"] = a.worker.name if a.worker else None
        item["cooperative_name"] = a.cooperative.name if a.cooperative else None
        out.append(item)
    return success_response(out, "Allocations retrieved")


# ------------------------------------------------------------ payments
@admin_bp.route("/payments", methods=["GET"])
@jwt_required()
def list_all_payments():
    user, err = _require_platform()
    if err:
        return err
    limit = max(1, min(request.args.get("limit", type=int, default=200), 500))
    rows = Payment.query.order_by(Payment.created_at.desc()).limit(limit).all()
    out = []
    for p in rows:
        item = p.to_dict()
        booking = p.booking
        item["customer_name"] = booking.customer.name if booking and booking.customer else None
        item["service_name"] = (booking.request.service.name
                                if booking and booking.request and booking.request.service else None)
        out.append(item)
    invoices = Invoice.query.all()
    return success_response({
        "payments": out,
        "totals": {
            "commission": float(sum((i.commission_amount or 0) for i in invoices)),
            "welfare": float(sum((i.welfare_amount or 0) for i in invoices)),
            "payouts": float(sum((i.worker_payout or 0) for i in invoices)),
            "revenue": float(sum((i.net_amount or 0) for i in invoices)),
        },
    }, "Payments retrieved")


# ------------------------------------------------------------ welfare
@admin_bp.route("/welfare", methods=["GET"])
@jwt_required()
def welfare_overview():
    user, err = _require_platform()
    if err:
        return err
    records = WorkerWelfare.query.order_by(WorkerWelfare.updated_at.desc()).limit(200).all()
    fund = db.session.query(func.coalesce(func.sum(Invoice.welfare_amount), 0)).scalar()
    return success_response({
        "fund_total": float(fund or 0),
        "enrollments": [r.to_dict() for r in records],
    }, "Welfare overview retrieved")


# ------------------------------------------------------------ services
@admin_bp.route("/services/categories", methods=["POST"])
@jwt_required()
def create_category():
    user, err = _require_platform()
    if err:
        return err
    try:
        data = request.get_json() or {}
        name = (data.get("name") or "").strip()
        slug = (data.get("slug") or "").strip().lower().replace(" ", "-")
        if not name or not slug:
            return error_response("Category name and slug are required", 400)
        if ServiceCategory.query.filter_by(slug=slug).first():
            return error_response("Category slug already exists", 409)
        cat = ServiceCategory(
            name=name, slug=slug, description=data.get("description"),
            icon=data.get("icon"), is_active=True,
            display_order=data.get("display_order", 99),
        )
        db.session.add(cat)
        db.session.commit()
        audit(user, "service_category.create", "service_category", cat.id, name)
        db.session.commit()
        return success_response(cat.to_dict(), "Category created", 201)
    except Exception as e:
        db.session.rollback()
        return error_response(f"Failed to create category: {str(e)}", 500)


@admin_bp.route("/services/categories/<int:category_id>", methods=["PATCH"])
@jwt_required()
def update_category(category_id):
    user, err = _require_platform()
    if err:
        return err
    try:
        cat = ServiceCategory.query.get(category_id)
        if not cat:
            return error_response("Category not found", 404)
        data = request.get_json() or {}
        for field in ("name", "description", "icon", "is_active", "display_order"):
            if field in data:
                setattr(cat, field, data[field])
        db.session.commit()
        audit(user, "service_category.update", "service_category", cat.id,
              f"name={cat.name} active={cat.is_active}")
        db.session.commit()
        return success_response(cat.to_dict(), "Category updated")
    except Exception as e:
        db.session.rollback()
        return error_response(f"Failed to update category: {str(e)}", 500)


@admin_bp.route("/services", methods=["POST"])
@jwt_required()
def create_service():
    user, err = _require_platform()
    if err:
        return err
    try:
        data = request.get_json() or {}
        name = (data.get("name") or "").strip()
        slug = (data.get("slug") or "").strip().lower().replace(" ", "-")
        if not name or not slug or not data.get("category_id"):
            return error_response("Service name, slug and category are required", 400)
        if Service.query.filter_by(slug=slug).first():
            return error_response("Service slug already exists", 409)
        svc = Service(
            category_id=data["category_id"], name=name, slug=slug,
            description=data.get("description"),
            required_skills=data.get("required_skills"),
            base_price=data.get("base_price", 500),
            is_active=True,
        )
        db.session.add(svc)
        db.session.commit()
        audit(user, "service.create", "service", svc.id, name)
        db.session.commit()
        return success_response(svc.to_dict(), "Service created", 201)
    except Exception as e:
        db.session.rollback()
        return error_response(f"Failed to create service: {str(e)}", 500)


@admin_bp.route("/services/<int:service_id>", methods=["PATCH"])
@jwt_required()
def update_service(service_id):
    user, err = _require_platform()
    if err:
        return err
    try:
        svc = Service.query.get(service_id)
        if not svc:
            return error_response("Service not found", 404)
        data = request.get_json() or {}
        for field in ("name", "description", "required_skills", "base_price",
                      "is_active", "emergency_support", "verification_required"):
            if field in data:
                setattr(svc, field, data[field])
        db.session.commit()
        audit(user, "service.update", "service", svc.id,
              f"name={svc.name} active={svc.is_active}")
        db.session.commit()
        return success_response(svc.to_dict(), "Service updated")
    except Exception as e:
        db.session.rollback()
        return error_response(f"Failed to update service: {str(e)}", 500)


@admin_bp.route("/services/skills", methods=["POST"])
@jwt_required()
def create_skill():
    user, err = _require_platform()
    if err:
        return err
    try:
        data = request.get_json() or {}
        name = (data.get("name") or "").strip()
        slug = (data.get("slug") or "").strip().lower().replace(" ", "-")
        if not name or not slug:
            return error_response("Skill name and slug are required", 400)
        if Skill.query.filter_by(slug=slug).first():
            return error_response("Skill slug already exists", 409)
        skill = Skill(name=name, slug=slug, category_id=data.get("category_id"),
                      description=data.get("description"), is_active=True)
        db.session.add(skill)
        db.session.commit()
        audit(user, "skill.create", "skill", skill.id, name)
        db.session.commit()
        return success_response(skill.to_dict(), "Skill created", 201)
    except Exception as e:
        db.session.rollback()
        return error_response(f"Failed to create skill: {str(e)}", 500)


# ------------------------------------------------------------ notifications
@admin_bp.route("/notifications/broadcast", methods=["POST"])
@jwt_required()
def broadcast():
    user, err = _require_platform()
    if err:
        return err
    try:
        data = request.get_json() or {}
        title = (data.get("title") or "").strip()
        message = (data.get("message") or "").strip()
        role = (data.get("role") or "").strip() or None
        if not title or not message:
            return error_response("Title and message are required", 400)
        query = User.query.filter_by(is_active=True)
        if role:
            query = query.filter_by(role=role)
        recipients = query.all()
        for recipient in recipients:
            db.session.add(Notification(
                user_id=recipient.id, title=title, message=message,
                type="broadcast", reference_type="broadcast",
            ))
        db.session.commit()
        audit(user, "notification.broadcast", "broadcast", None,
              f"role={role or 'all'} recipients={len(recipients)}")
        db.session.commit()
        return success_response({"recipients": len(recipients)}, "Broadcast sent", 201)
    except Exception as e:
        db.session.rollback()
        return error_response(f"Failed to broadcast: {str(e)}", 500)


# ------------------------------------------------------------ AI assistant (opencode)
@admin_bp.route("/ai-assist", methods=["GET"])
@jwt_required()
def ai_assist_status():
    user, err = _require_platform()
    if err:
        return err
    return success_response(
        {"configured": opencode_configured()},
        "Assistant backend status",
    )


@admin_bp.route("/ai-assist", methods=["POST"])
@jwt_required()
def ai_assist():
    """Ask the opencode model about live platform data (platform admin only).

    The server injects a fresh data snapshot into the prompt; the model only
    advises. Without OPENCODE_ZEN_API_KEY configured, returns 503 and the
    frontend falls back to its built-in rule-based assistant.
    """
    user, err = _require_platform()
    if err:
        return err
    try:
        data = request.get_json() or {}
        question = (data.get("question") or "").strip()
        if not question:
            return error_response("Question is required", 400)
        if not opencode_configured():
            return error_response(
                "AI model is not configured. Set OPENCODE_ZEN_API_KEY on the backend.",
                503,
            )
        snapshot = _assistant_snapshot()
        reply = ask_opencode(question, snapshot)
        audit(user, "ai.assist", "assistant", None, question[:200])
        db.session.commit()
        return success_response({"reply": reply, "model": True}, "Assistant replied")
    except Exception as e:
        db.session.rollback()
        return error_response(f"Assistant failed: {str(e)}", 502)


def _assistant_snapshot():
    inv = db.session.query(
        func.coalesce(func.sum(Invoice.net_amount), 0),
        func.coalesce(func.sum(Invoice.commission_amount), 0),
        func.coalesce(func.sum(Invoice.welfare_amount), 0),
        func.coalesce(func.sum(Invoice.worker_payout), 0),
    ).first()
    heat = (
        ServiceRequest.query.filter_by(status="pending")
        .order_by(ServiceRequest.created_at.desc()).limit(50).all()
    )
    areas = {}
    for r in heat:
        key = (r.location_address or "Unknown area").split(",")[0].strip()
        areas[key] = areas.get(key, 0) + 1
    top_areas = sorted(areas.items(), key=lambda kv: kv[1], reverse=True)[:5]
    wf = WorkforceRequirement.query.all()
    return {
        "federations": Federation.query.count(),
        "societies": Cooperative.query.count(),
        "workers_total": Worker.query.count(),
        "workers_verified": Worker.query.filter_by(verification_status="verified").count(),
        "customers": User.query.filter_by(role="customer").count(),
        "active_jobs": Booking.query.filter(Booking.status.in_(
            ["confirmed", "accepted", "en_route", "service_started", "in_progress"])).count(),
        "completed_jobs": Booking.query.filter_by(status="completed").count(),
        "revenue": float(inv[0] or 0),
        "commission": float(inv[1] or 0),
        "welfare": float(inv[2] or 0),
        "payouts": float(inv[3] or 0),
        "open_disputes": Dispute.query.filter(
            Dispute.status.in_(["open", "under_review", "awaiting_response"])).count(),
        "top_demand_areas": [{"area": a, "open_requests": n} for a, n in top_areas],
        "workforce_open_slots": sum((r.workers_remaining or 0) for r in wf),
    }


# ------------------------------------------------------------ audit
@admin_bp.route("/audit-logs", methods=["GET"])
@jwt_required()
def list_audit_logs():
    user, err = _require_platform()
    if err:
        return err
    limit = max(1, min(request.args.get("limit", type=int, default=100), 500))
    rows = AuditLog.query.order_by(AuditLog.created_at.desc()).limit(limit).all()
    return success_response([r.to_dict() for r in rows], "Audit logs retrieved")
