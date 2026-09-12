import math
from datetime import datetime, timezone, date
from flask import Blueprint, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models.user import User
from app.models.worker import Worker, WorkerSkill, WorkerAvailability, WorkerCertification
from app.models.cooperative import Cooperative
from app.models.service import Skill
from app.utils.helpers import success_response, error_response, paginate

workers_bp = Blueprint("workers", __name__, url_prefix="/api/workers")


def calculate_distance(lat1, lng1, lat2, lng2):
    R = 6371.0
    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = math.sin(dlat / 2) ** 2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlng / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


@workers_bp.route("", methods=["GET"])
@workers_bp.route("/", methods=["GET"])
@jwt_required()
def list_workers():
    try:
        user = User.query.get(int(get_jwt_identity()))
        if not user:
            return error_response("User not found", 404)
        query = Worker.query

        if user.role == "worker":
            query = query.filter_by(user_id=user.id)
        elif user.role == "cooperative_admin":
            query = query.filter(Worker.cooperative_id.in_([coop.id for coop in user.administered_cooperatives]))
        elif user.role == "federation_admin":
            federation_ids = [f.id for f in user.administered_federations]
            query = query.filter(Worker.cooperative.has(Cooperative.federation_id.in_(federation_ids)))
        elif user.role not in ("platform_admin",):
            return error_response("Unauthorized", 403)

        skill = request.args.get("skill")
        category = request.args.get("category")
        cooperative_id = request.args.get("cooperative_id", type=int)
        is_verified = request.args.get("is_verified")
        is_available = request.args.get("is_available")
        lat = request.args.get("lat", type=float)
        lng = request.args.get("lng", type=float)
        radius = request.args.get("radius", type=float, default=50.0)

        if cooperative_id:
            query = query.filter_by(cooperative_id=cooperative_id)

        if is_verified is not None:
            query = query.filter_by(verification_status="verified" if is_verified.lower() == "true" else "pending")

        if is_available is not None:
            query = query.filter_by(is_available=is_available.lower() == "true")

        if skill:
            skill_records = Skill.query.filter(Skill.name.ilike(f"%{skill}%")).all()
            skill_ids = [s.id for s in skill_records]
            if skill_ids:
                worker_ids = [ws.worker_id for ws in WorkerSkill.query.filter(WorkerSkill.skill_id.in_(skill_ids)).all()]
                query = query.filter(Worker.id.in_(worker_ids))
            else:
                return success_response([], "No workers found with that skill")

        if category:
            skills_in_cat = Skill.query.filter_by(category_id=None).all()
            query = query

        workers = query.all()

        if lat is not None and lng is not None:
            nearby = []
            for w in workers:
                if w.latitude and w.longitude:
                    dist = calculate_distance(lat, lng, w.latitude, w.longitude)
                    if dist <= radius:
                        w_data = w.to_dict()
                        w_data["distance_km"] = round(dist, 2)
                        nearby.append(w_data)
                else:
                    w_data = w.to_dict()
                    w_data["distance_km"] = None
                    nearby.append(w_data)
            data = nearby
        else:
            data = [w.to_dict() for w in workers]

        return success_response(data, "Workers retrieved")
    except Exception as e:
        return error_response(f"Failed to retrieve workers: {str(e)}", 500)


@workers_bp.route("/<int:worker_id>", methods=["GET"])
@jwt_required()
def get_worker(worker_id):
    try:
        user = User.query.get(int(get_jwt_identity()))
        if not user:
            return error_response("User not found", 404)
        worker = Worker.query.get(worker_id)
        if not worker:
            return error_response("Worker not found", 404)
        allowed_cooperatives = [coop.id for coop in user.administered_cooperatives]
        allowed_federations = [fed.id for fed in user.administered_federations]
        allowed = (
            user.role == "platform_admin"
            or (user.role == "worker" and worker.user_id == user.id)
            or (user.role == "cooperative_admin" and worker.cooperative_id in allowed_cooperatives)
            or (user.role == "federation_admin" and worker.cooperative and worker.cooperative.federation_id in allowed_federations)
        )
        if not allowed:
            return error_response("Unauthorized", 403)
        data = worker.to_dict(include_details=True)
        return success_response(data, "Worker retrieved")
    except Exception as e:
        return error_response(f"Failed to retrieve worker: {str(e)}", 500)


@workers_bp.route("/<int:worker_id>", methods=["PUT"])
@jwt_required()
def update_worker(worker_id):
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        if not user:
            return error_response("User not found", 404)

        worker = Worker.query.get(worker_id)
        if not worker:
            return error_response("Worker not found", 404)

        if user.role not in ("worker", "cooperative_admin", "platform_admin"):
            return error_response("Unauthorized", 403)

        if user.role == "worker" and worker.user_id != user_id:
            return error_response("You can only update your own profile", 403)

        data = request.get_json()
        if not data:
            return error_response("Request body is required", 400)

        updatable_fields = [
            "name", "phone", "email", "latitude", "longitude",
            "service_area_km", "bio", "experience_years", "max_workload",
            "is_available", "profile_photo",
        ]
        for field in updatable_fields:
            if field in data:
                setattr(worker, field, data[field])

        db.session.commit()
        return success_response(worker.to_dict(include_details=True), "Worker profile updated")
    except Exception as e:
        db.session.rollback()
        return error_response(f"Failed to update worker: {str(e)}", 500)


@workers_bp.route("/<int:worker_id>/availability", methods=["PATCH"])
@jwt_required()
def update_availability(worker_id):
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        if not user:
            return error_response("User not found", 404)

        worker = Worker.query.get(worker_id)
        if not worker:
            return error_response("Worker not found", 404)

        if user.role not in ("worker", "cooperative_admin") or (user.role == "worker" and worker.user_id != user_id):
            return error_response("Unauthorized", 403)

        data = request.get_json()
        if not data or "availabilities" not in data:
            return error_response("Availabilities data is required", 400)

        WorkerAvailability.query.filter_by(worker_id=worker_id).delete()

        for avail_data in data["availabilities"]:
            day_of_week = int(avail_data["day_of_week"])
            if day_of_week < 0 or day_of_week > 6:
                return error_response("day_of_week must be between 0 and 6", 400)
            start_time = datetime.strptime(avail_data["start_time"], "%H:%M").time()
            end_time = datetime.strptime(avail_data["end_time"], "%H:%M").time()
            if end_time <= start_time:
                return error_response("Availability end time must be after start time", 400)
            avail = WorkerAvailability(
                worker_id=worker_id,
                day_of_week=day_of_week,
                start_time=start_time,
                end_time=end_time,
                is_available=avail_data.get("is_available", True),
                effective_from=date.fromisoformat(avail_data["effective_from"]) if avail_data.get("effective_from") else None,
                effective_until=date.fromisoformat(avail_data["effective_until"]) if avail_data.get("effective_until") else None,
            )
            if avail.effective_from and avail.effective_until and avail.effective_until < avail.effective_from:
                return error_response("effective_until must be on or after effective_from", 400)
            db.session.add(avail)

        db.session.commit()
        worker.updated_at = datetime.now(timezone.utc)
        db.session.commit()

        availabilities = WorkerAvailability.query.filter_by(worker_id=worker_id).all()
        return success_response(
            [a.to_dict() for a in availabilities],
            "Availability updated",
        )
    except Exception as e:
        db.session.rollback()
        return error_response(f"Failed to update availability: {str(e)}", 500)


def get_owned_worker(user_id, worker_id):
    worker = Worker.query.get(worker_id)
    if not worker or worker.user_id != user_id:
        return None
    return worker


@workers_bp.route("/<int:worker_id>/skills", methods=["POST"])
@jwt_required()
def add_skill(worker_id):
    try:
        user_id = int(get_jwt_identity())
        worker = get_owned_worker(user_id, worker_id)
        if not worker:
            return error_response("Worker profile not found", 404)

        data = request.get_json() or {}
        skill_name = (data.get("name") or "").strip()
        if not skill_name:
            return error_response("Skill name is required", 400)

        skill = Skill.query.filter(Skill.name.ilike(skill_name)).first()
        if not skill:
            skill = Skill(name=skill_name, slug=skill_name.lower().replace(" ", "-"), is_active=True)
            db.session.add(skill)
            db.session.flush()

        worker_skill = WorkerSkill(
            worker_id=worker.id,
            skill_id=skill.id,
            proficiency=data.get("proficiency", "beginner"),
            years_experience=int(data.get("yearsOfExperience", 0) or 0),
        )
        db.session.add(worker_skill)
        db.session.commit()
        return success_response(worker_skill.to_dict(), "Skill added", 201)
    except Exception as e:
        db.session.rollback()
        return error_response(f"Failed to add skill: {str(e)}", 500)


@workers_bp.route("/<int:worker_id>/certifications", methods=["POST"])
@jwt_required()
def add_certification(worker_id):
    try:
        user_id = int(get_jwt_identity())
        worker = get_owned_worker(user_id, worker_id)
        if not worker:
            return error_response("Worker profile not found", 404)

        data = request.get_json() or {}
        name = (data.get("name") or "").strip()
        authority = (data.get("issuingAuthority") or "").strip()
        if not name or not authority:
            return error_response("Certification name and issuing authority are required", 400)

        certification = WorkerCertification(
            worker_id=worker.id,
            certification_name=name,
            issuing_authority=authority,
            issue_date=datetime.strptime(data["issueDate"], "%Y-%m-%d").date() if data.get("issueDate") else None,
            expiry_date=datetime.strptime(data["expiryDate"], "%Y-%m-%d").date() if data.get("expiryDate") else None,
            verification_status="pending",
        )
        db.session.add(certification)
        db.session.commit()
        return success_response(certification.to_dict(), "Certification added", 201)
    except Exception as e:
        db.session.rollback()
        return error_response(f"Failed to add certification: {str(e)}", 500)


@workers_bp.route("/me/profile", methods=["GET"])
@jwt_required()
def get_my_profile():
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        if not user:
            return error_response("User not found", 404)

        if user.role != "worker":
            return error_response("Only workers can access this endpoint", 403)

        worker = Worker.query.filter_by(user_id=user_id).first()
        if not worker:
            return error_response("Worker profile not found", 404)

        data = worker.to_dict(include_details=True)
        data["user"] = user.to_dict()
        return success_response(data, "Worker profile retrieved")
    except Exception as e:
        return error_response(f"Failed to retrieve profile: {str(e)}", 500)
