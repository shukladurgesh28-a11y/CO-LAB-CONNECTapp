import math
from datetime import datetime, timezone, date, timedelta
from sqlalchemy import or_
from app import db
from app.models.worker import (
    Worker, WorkerSkill, WorkerAvailability, WorkerCertification,
    WorkerComplianceRecord, WorkerViolation,
)
from app.models.service import Skill
from app.models.booking import ServiceRequest, Rating, ServiceHistory


class WorkerRecommendation:
    def __init__(self, worker, score, breakdown, explanation):
        self.worker = worker
        self.score = score
        self.breakdown = breakdown
        self.explanation = explanation

    def to_dict(self):
        return {
            "worker": self.worker.to_dict(include_details=True),
            "score": round(self.score, 4),
            "breakdown": self.breakdown,
            "explanation": self.explanation,
        }


class MatchingEngine:
    # Deterministic weighted scoring (Phase 7). Weights sum to 1.0.
    # "fairness" uses a 30-day rolling window with a neutral 0.75 baseline
    # and an explicit cold-start grace bonus for workers with < 5 jobs.
    DEFAULT_WEIGHTS = {
        "skill": 0.25,
        "qualification": 0.15,
        "location": 0.15,
        "availability": 0.15,
        "experience": 0.10,
        "workload": 0.05,
        "fairness": 0.05,
        "history": 0.05,
        "rating": 0.05,
    }

    EMERGENCY_WEIGHTS = {
        "skill": 0.20,
        "qualification": 0.10,
        "location": 0.25,
        "availability": 0.20,
        "experience": 0.08,
        "workload": 0.05,
        "fairness": 0.05,
        "history": 0.03,
        "rating": 0.04,
    }

    COLD_START_THRESHOLD = 5
    COLD_START_BASELINE = 0.75
    COLD_START_GRACE_BONUS = 0.10

    def find_recommendations(self, request_id):
        sr = ServiceRequest.query.get(request_id)
        if not sr:
            return []

        is_emergency = sr.urgency == "urgent"
        weights = self.EMERGENCY_WEIGHTS if is_emergency else self.DEFAULT_WEIGHTS

        query = Worker.query.filter(
            Worker.verification_status == "verified",
            Worker.is_available == True,
        )

        if sr.cooperative_id:
            query = query.filter(
                or_(
                    Worker.cooperative_id == sr.cooperative_id,
                    Worker.cooperative_id.is_(None),
                )
            )

        workers = query.all()
        recommendations = []

        for worker in workers:
            if worker.current_workload >= worker.max_workload:
                continue
            if not self._is_eligible(worker, reference_date=sr.preferred_date or date.today()):
                continue
            if not self.is_available_for_request(worker, sr):
                continue

            breakdown = self.get_score_breakdown(worker, sr, weights)
            # "_cold_start" is an internal flag, not a score contributor.
            cold_start = bool(breakdown.pop("_cold_start", 0.0))
            total_score = sum(breakdown.values())

            if total_score < 0.1:
                continue

            explanation = self._build_explanation(breakdown, worker, sr, cold_start=cold_start)

            recommendations.append(
                WorkerRecommendation(worker, total_score, breakdown, explanation)
            )

        # Deterministic tie-breaking (Phase 7):
        # 1. highest score, 2. greatest days since last completed service
        #    (oldest first; never-served workers first), 3. worker ID ascending.
        recommendations.sort(
            key=lambda recommendation: (
                -recommendation.score,
                self._last_service_ordinal(recommendation.worker),
                recommendation.worker.id,
            )
        )
        return recommendations

    def _is_eligible(self, worker, reference_date):
        """Eligibility gate before scoring (Phase 7).

        Suspended workers never appear; expired required credentials remove
        the worker from matching; active serious violations block matching.
        """
        if worker.verification_status != "verified":
            return False
        if not worker.is_available:
            return False
        expired = WorkerComplianceRecord.query.filter(
            WorkerComplianceRecord.worker_id == worker.id,
            WorkerComplianceRecord.status == "expired",
            WorkerComplianceRecord.expiry_date.isnot(None),
            WorkerComplianceRecord.expiry_date < reference_date,
        ).first()
        if expired:
            return False
        blocking_violation = WorkerViolation.query.filter(
            WorkerViolation.worker_id == worker.id,
            WorkerViolation.status.in_(["reported", "under_review"]),
            WorkerViolation.severity.in_(["high", "critical"]),
        ).first()
        if blocking_violation:
            return False
        return True

    def is_available_for_request(self, worker, request):
        if not request.preferred_date:
            return True
        req_date = request.preferred_date
        if isinstance(req_date, str):
            req_date = datetime.strptime(req_date, "%Y-%m-%d").date()
        rows = WorkerAvailability.query.filter_by(
            worker_id=worker.id,
            day_of_week=req_date.weekday(),
        ).all()
        if not rows:
            return True
        requested_end = request.preferred_time_end or request.preferred_time_start
        return any(
            row.is_available
            and (row.effective_from is None or row.effective_from <= req_date)
            and (row.effective_until is None or row.effective_until >= req_date)
            and (request.preferred_time_start is None or row.start_time <= request.preferred_time_start)
            and (requested_end is None or row.end_time >= requested_end)
            for row in rows
        )

    def get_score_breakdown(self, worker, request, weights=None):
        if weights is None:
            weights = self.DEFAULT_WEIGHTS

        breakdown = {}

        reference_date = request.preferred_date or date.today()
        service = request.service
        if service and service.required_skills:
            skill_names = [s if isinstance(s, str) else s.get("name", "") for s in service.required_skills]
            worker_skill_names = {self._normalize_skill(ws.skill.name) for ws in worker.skills if ws.skill}
            matching = sum(1 for sn in skill_names if self._normalize_skill(sn) in worker_skill_names)
            breakdown["skill"] = (matching / len(skill_names) * weights["skill"]) if skill_names else weights["skill"]
        else:
            breakdown["skill"] = weights["skill"] * 0.5

        certifications = WorkerCertification.query.filter(
            WorkerCertification.worker_id == worker.id,
            WorkerCertification.verification_status == "verified",
            or_(WorkerCertification.expiry_date.is_(None), WorkerCertification.expiry_date >= reference_date),
        ).count()
        cert_score = min(1.0, certifications / 3.0)
        breakdown["qualification"] = cert_score * weights["qualification"]

        if request.location_lat and request.location_lng and worker.latitude and worker.longitude:
            distance = self.calculate_distance(
                request.location_lat, request.location_lng,
                worker.latitude, worker.longitude,
            )
            if distance <= worker.service_area_km:
                location_score = max(0, 1.0 - (distance / worker.service_area_km))
            else:
                location_score = 0.0
        else:
            location_score = 0.5
        breakdown["location"] = location_score * weights["location"]

        if request.preferred_date:
            req_date = request.preferred_date
            if isinstance(req_date, str):
                req_date = datetime.strptime(req_date, "%Y-%m-%d").date()
            day_of_week = req_date.weekday()
            availability_query = WorkerAvailability.query.filter_by(
                worker_id=worker.id, day_of_week=day_of_week, is_available=True
            ).filter(
                or_(WorkerAvailability.effective_from.is_(None), WorkerAvailability.effective_from <= req_date),
                or_(WorkerAvailability.effective_until.is_(None), WorkerAvailability.effective_until >= req_date),
            )
            if request.preferred_time_start:
                requested_end = request.preferred_time_end or request.preferred_time_start
                availability_query = availability_query.filter(
                    WorkerAvailability.start_time <= request.preferred_time_start,
                    WorkerAvailability.end_time >= requested_end,
                )
            avail = availability_query.first()
            availability_score = 1.0 if avail else 0.0
        else:
            availability_score = 0.7
        breakdown["availability"] = availability_score * weights["availability"]

        exp_score = min(1.0, worker.experience_years / 10.0)
        breakdown["experience"] = exp_score * weights["experience"]

        workload_score = 1.0 - (worker.current_workload / worker.max_workload) if worker.max_workload > 0 else 0.0
        breakdown["workload"] = workload_score * weights["workload"]

        recent_history = ServiceHistory.query.filter(
            ServiceHistory.worker_id == worker.id,
            ServiceHistory.service_date >= reference_date - timedelta(days=30),
            ServiceHistory.service_date <= reference_date,
        ).count()
        history_score = 0.75 if recent_history < 5 else min(1.0, recent_history / 20.0)
        breakdown["history"] = history_score * weights["history"]

        # Fairness: 30-day rolling window. Prefer workers with fewer recent
        # jobs; cold-start workers (< 5 jobs) get the neutral 0.75 baseline
        # plus an explicit grace bonus so they are not starved.
        fairness_raw = 1.0 - min(1.0, recent_history / 10.0)
        if recent_history < self.COLD_START_THRESHOLD:
            fairness_score = min(1.0, max(fairness_raw, self.COLD_START_BASELINE) + self.COLD_START_GRACE_BONUS)
            breakdown["_cold_start"] = 1.0
        else:
            fairness_score = fairness_raw
            breakdown["_cold_start"] = 0.0
        breakdown["fairness"] = fairness_score * weights["fairness"]

        recent_ratings = Rating.query.filter(
            Rating.worker_id == worker.id,
            Rating.created_at >= datetime.combine(reference_date - timedelta(days=30), datetime.min.time()),
        ).count()
        rating_score = 0.75 if recent_history < 5 or recent_ratings == 0 else min(1.0, worker.average_rating / 5.0)
        breakdown["rating"] = rating_score * weights["rating"]

        return breakdown

    def calculate_distance(self, lat1, lng1, lat2, lng2):
        R = 6371.0
        lat1_rad = math.radians(lat1)
        lat2_rad = math.radians(lat2)
        dlat = math.radians(lat2 - lat1)
        dlng = math.radians(lng2 - lng1)
        a = math.sin(dlat / 2) ** 2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlng / 2) ** 2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        return R * c

    @staticmethod
    def _normalize_skill(value):
        return "".join(character for character in value.lower() if character.isalnum())

    @staticmethod
    def _last_service_date(worker):
        return db.session.query(db.func.max(ServiceHistory.service_date)).filter(
            ServiceHistory.worker_id == worker.id
        ).scalar()

    @staticmethod
    def _last_service_ordinal(worker):
        """Ordinal of last completed service; -1 when never served (first)."""
        last = MatchingEngine._last_service_date(worker)
        if last is None:
            return -1
        if isinstance(last, datetime):
            last = last.date()
        return last.toordinal()

    def _build_explanation(self, breakdown, worker, request, cold_start=False):
        explanations = []

        if cold_start:
            explanations.append(
                "Cold-start fairness boost applied (fewer than 5 completed jobs in the last 30 days)."
            )

        if breakdown["skill"] > 0.15:
            explanations.append("Strong skill match for the required service")
        elif breakdown["skill"] > 0.05:
            explanations.append("Partial skill match available")
        else:
            explanations.append("Limited skill match")

        if breakdown["qualification"] > 0.12:
            explanations.append("Well-certified with verified qualifications")
        elif breakdown["qualification"] > 0.05:
            explanations.append("Has some relevant certifications")

        if breakdown["location"] > 0.1:
            distance = self.calculate_distance(
                request.location_lat or 0, request.location_lng or 0,
                worker.latitude or 0, worker.longitude or 0,
            ) if request.location_lat and worker.latitude else 0
            explanations.append(f"Located {distance:.1f}km away, within service area")
        elif breakdown["location"] < 0.03:
            explanations.append("Outside preferred service area")

        if breakdown["availability"] > 0.1:
            explanations.append("Available at the requested time")
        else:
            explanations.append("Availability does not match requested time")

        if worker.average_rating >= 4.0:
            explanations.append(f"Highly rated ({worker.average_rating}/5)")
        elif worker.average_rating >= 3.0:
            explanations.append(f"Good rating ({worker.average_rating}/5)")

        if worker.total_completed_services > 20:
            explanations.append(f"Experienced with {worker.total_completed_services} completed services")

        workload_pct = (worker.current_workload / worker.max_workload * 100) if worker.max_workload > 0 else 0
        if workload_pct < 50:
            explanations.append("Low current workload, can take on new jobs")
        elif workload_pct >= 80:
            explanations.append("High current workload")

        return explanations

    def get_detailed_explanation(self, request_id, worker_id):
        sr = ServiceRequest.query.get(request_id)
        if not sr:
            return None, "Service request not found"

        worker = Worker.query.get(worker_id)
        if not worker:
            return None, "Worker not found"

        is_emergency = sr.urgency == "urgent"
        weights = self.EMERGENCY_WEIGHTS if is_emergency else self.DEFAULT_WEIGHTS

        breakdown = self.get_score_breakdown(worker, sr, weights)
        cold_start = bool(breakdown.pop("_cold_start", 0.0))
        total_score = sum(breakdown.values())
        explanation = self._build_explanation(breakdown, worker, sr, cold_start=cold_start)

        reasons_not_recommended = []
        if worker.verification_status != "verified":
            reasons_not_recommended.append("Worker is not verified")
        if not worker.is_available:
            reasons_not_recommended.append("Worker is currently unavailable")
        if worker.current_workload >= worker.max_workload:
            reasons_not_recommended.append("Worker has reached maximum workload")

        service = sr.service
        if service and service.required_skills:
            skill_names = [s if isinstance(s, str) else s.get("name", "") for s in service.required_skills]
            worker_skill_names = [ws.skill.name.lower() for ws in worker.skills if ws.skill]
            missing = [sn for sn in skill_names if sn.lower() not in worker_skill_names]
            if missing:
                reasons_not_recommended.append(f"Missing required skills: {', '.join(missing)}")

        if sr.location_lat and sr.location_lng and worker.latitude and worker.longitude:
            distance = self.calculate_distance(
                sr.location_lat, sr.location_lng, worker.latitude, worker.longitude
            )
            if distance > worker.service_area_km:
                reasons_not_recommended.append(f"Location {distance:.1f}km is outside service area ({worker.service_area_km}km)")

        return {
            "worker": worker.to_dict(include_details=True),
            "score": round(total_score, 4),
            "breakdown": breakdown,
            "explanation": explanation,
            "reasons_not_recommended": reasons_not_recommended,
            "is_recommended": total_score >= 0.1,
        }, None
