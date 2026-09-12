from datetime import date, datetime, timezone, timedelta
from collections import defaultdict
import numpy as np
from sklearn.linear_model import LinearRegression
from sqlalchemy import func
from app import db
from app.models.worker import Worker, WorkerSkill
from app.models.cooperative import Cooperative, Federation
from app.models.booking import ServiceRequest, Booking, Rating
from app.models.demand import DemandRecord
from app.models.service import ServiceCategory, Service


class AnalyticsService:
    def get_heatmap(self, cooperative_id=None, service_id=None, period_days=90):
        cutoff = datetime.now(timezone.utc) - timedelta(days=period_days)
        query = db.session.query(
            ServiceRequest.location_lat,
            ServiceRequest.location_lng,
            ServiceRequest.service_id,
            ServiceRequest.cooperative_id,
            func.min(ServiceRequest.location_address),
            func.count(ServiceRequest.id),
        ).filter(
            ServiceRequest.created_at >= cutoff,
            ServiceRequest.location_lat.isnot(None),
            ServiceRequest.location_lng.isnot(None),
        )
        if cooperative_id:
            query = query.filter(ServiceRequest.cooperative_id == cooperative_id)
        if service_id:
            query = query.filter(ServiceRequest.service_id == service_id)
        rows = query.group_by(
            ServiceRequest.location_lat,
            ServiceRequest.location_lng,
            ServiceRequest.service_id,
            ServiceRequest.cooperative_id,
        ).all()

        points = []
        service_names = {
            service.id: service.name
            for service in Service.query.filter(Service.id.in_({row[2] for row in rows})).all()
        } if rows else {}
        for latitude, longitude, row_service_id, row_cooperative_id, area, count in rows:
            points.append({
                "latitude": float(latitude),
                "longitude": float(longitude),
                "demand": int(count),
                "service_id": row_service_id,
                "service_type": service_names.get(row_service_id, f"Service {row_service_id}"),
                "area": area,
                "cooperative_id": row_cooperative_id,
                "source": "service_requests",
            })

        if not points:
            demand_query = DemandRecord.query.filter(
                DemandRecord.latitude.isnot(None),
                DemandRecord.longitude.isnot(None),
            )
            if cooperative_id:
                demand_query = demand_query.filter_by(cooperative_id=cooperative_id)
            if service_id:
                demand_query = demand_query.filter_by(service_id=service_id)
            for record in demand_query.all():
                service = Service.query.get(record.service_id)
                points.append({
                    "latitude": float(record.latitude),
                    "longitude": float(record.longitude),
                    "demand": int(record.request_count or 0),
                    "service_id": record.service_id,
                    "service_type": service.name if service else f"Service {record.service_id}",
                    "area": record.region,
                    "cooperative_id": record.cooperative_id,
                    "source": "demand_records",
                })
        return {"period_days": period_days, "points": points}

    def train_demand_model(self, cooperative_id=None, lookback_days=90, forecast_days=7):
        """Train an explainable demand model from requests stored in the active DB.

        The model uses daily request counts per service. With sparse data it falls back
        to a historical average instead of pretending that a complex model is accurate.
        """
        cutoff = datetime.now(timezone.utc) - timedelta(days=lookback_days)
        query = ServiceRequest.query.filter(ServiceRequest.created_at >= cutoff)
        if cooperative_id:
            query = query.filter(ServiceRequest.cooperative_id == cooperative_id)

        requests = query.order_by(ServiceRequest.created_at.asc()).all()
        today = date.today()
        service_days = defaultdict(lambda: defaultdict(int))
        field_coverage = {
            "service_id": 0,
            "cooperative_id": 0,
            "urgency": 0,
            "status": 0,
            "location_lat": 0,
            "location_lng": 0,
            "preferred_date": 0,
            "preferred_time_start": 0,
            "created_at": 0,
        }
        urgency_distribution = defaultdict(int)
        status_distribution = defaultdict(int)
        cooperative_distribution = defaultdict(int)
        service_names = {}
        for request in requests:
            request_day = request.created_at.date() if request.created_at else today
            service_days[request.service_id][request_day] += 1
            for field in field_coverage:
                if getattr(request, field, None) is not None:
                    field_coverage[field] += 1
            urgency_distribution[request.urgency or "unknown"] += 1
            status_distribution[request.status or "unknown"] += 1
            cooperative_distribution[str(request.cooperative_id or "unassigned")] += 1
            if request.service:
                service_names[request.service_id] = request.service.name

        forecasts = []
        for service_id, counts in service_days.items():
            observed_days = sorted(counts)
            if not observed_days:
                continue

            start_day = min(observed_days)
            x = np.array([(day - start_day).days for day in observed_days], dtype=float).reshape(-1, 1)
            y = np.array([counts[day] for day in observed_days], dtype=float)

            if len(observed_days) >= 3 and len(set(y)) > 1:
                model = LinearRegression().fit(x, y)
                predicted = max(0.0, float(model.predict([[((today - start_day).days) + forecast_days]])[0]))
                method = "linear trend"
            else:
                predicted = max(0.0, float(y.mean() * forecast_days))
                method = "historical average"

            forecasts.append({
                "service_id": service_id,
                "service_name": service_names.get(service_id, f"Service {service_id}"),
                "observations": int(y.sum()),
                "active_days": len(observed_days),
                "forecast_requests": round(predicted, 2),
                "method": method,
            })

        forecasts.sort(key=lambda item: item["forecast_requests"], reverse=True)
        return {
            "trained_at": datetime.now(timezone.utc).isoformat(),
            "lookback_days": lookback_days,
            "forecast_days": forecast_days,
            "training_rows": len(requests),
            "model": "Multi-field demand profile with LinearRegression trend and sparse-data fallback",
            "features_used": [
                "service_id", "cooperative_id", "urgency", "status",
                "location_lat", "location_lng", "preferred_date",
                "preferred_time_start", "created_at",
            ],
            "field_coverage": field_coverage,
            "urgency_distribution": dict(urgency_distribution),
            "status_distribution": dict(status_distribution),
            "cooperative_distribution": dict(cooperative_distribution),
            "forecasts": forecasts,
            "data_source": "SQLAlchemy database configured by DATABASE_URL",
        }

    def get_demand_analytics(self, cooperative_id=None, service_id=None, period_days=30):
        cutoff = datetime.now(timezone.utc) - timedelta(days=period_days)

        query = ServiceRequest.query.filter(ServiceRequest.created_at >= cutoff)
        if cooperative_id:
            query = query.filter(ServiceRequest.cooperative_id == cooperative_id)
        if service_id:
            query = query.filter(ServiceRequest.service_id == service_id)

        total_requests = query.count()

        by_status = db.session.query(
            ServiceRequest.status,
            func.count(ServiceRequest.id),
        ).filter(ServiceRequest.created_at >= cutoff)
        if cooperative_id:
            by_status = by_status.filter(ServiceRequest.cooperative_id == cooperative_id)
        if service_id:
            by_status = by_status.filter(ServiceRequest.service_id == service_id)
        by_status = by_status.group_by(ServiceRequest.status).all()

        by_urgency = db.session.query(
            ServiceRequest.urgency,
            func.count(ServiceRequest.id),
        ).filter(ServiceRequest.created_at >= cutoff)
        if cooperative_id:
            by_urgency = by_urgency.filter(ServiceRequest.cooperative_id == cooperative_id)
        by_urgency = by_urgency.group_by(ServiceRequest.urgency).all()

        by_service = db.session.query(
            ServiceRequest.service_id,
            Service.name,
            func.count(ServiceRequest.id),
        ).join(Service, Service.id == ServiceRequest.service_id).filter(ServiceRequest.created_at >= cutoff)
        if cooperative_id:
            by_service = by_service.filter(ServiceRequest.cooperative_id == cooperative_id)
        if service_id:
            by_service = by_service.filter(ServiceRequest.service_id == service_id)
        by_service = by_service.group_by(ServiceRequest.service_id, Service.name).all()

        by_day = db.session.query(
            func.date(ServiceRequest.created_at).label("day"),
            func.count(ServiceRequest.id),
        ).filter(ServiceRequest.created_at >= cutoff)
        if cooperative_id:
            by_day = by_day.filter(ServiceRequest.cooperative_id == cooperative_id)
        by_day = by_day.group_by(func.date(ServiceRequest.created_at)).all()

        fulfilled = query.filter(ServiceRequest.status.in_(["completed", "confirmed"])).count()
        unmet = query.filter(ServiceRequest.status.in_(["cancelled"])).count()

        return {
            "period_days": period_days,
            "total_requests": total_requests,
            "fulfilled": fulfilled,
            "unmet": unmet,
            "fulfillment_rate": round((fulfilled / total_requests * 100) if total_requests > 0 else 0, 2),
            "by_status": [{"status": r[0], "count": r[1]} for r in by_status],
            "by_urgency": [{"urgency": r[0], "count": r[1]} for r in by_urgency],
            "by_service": [{"service_id": r[0], "service_name": r[1], "count": r[2]} for r in by_service],
            "by_day": [{"date": str(r[0]), "count": r[1]} for r in by_day],
        }

    def get_workforce_analytics(self, cooperative_id=None):
        query = Worker.query
        if cooperative_id:
            query = query.filter_by(cooperative_id=cooperative_id)

        total = query.count()
        verified = query.filter_by(verification_status="verified").count()
        available = query.filter_by(is_available=True).count()

        avg_experience = db.session.query(
            func.avg(Worker.experience_years)
        )
        if cooperative_id:
            avg_experience = avg_experience.filter_by(cooperative_id=cooperative_id)
        avg_experience = avg_experience.scalar() or 0

        avg_rating = db.session.query(
            func.avg(Worker.average_rating)
        ).filter(Worker.average_rating > 0)
        if cooperative_id:
            avg_rating = avg_rating.filter_by(cooperative_id=cooperative_id)
        avg_rating = avg_rating.scalar() or 0

        total_services = db.session.query(
            func.sum(Worker.total_completed_services)
        )
        if cooperative_id:
            total_services = total_services.filter_by(cooperative_id=cooperative_id)
        total_services = total_services.scalar() or 0

        skill_distribution = db.session.query(
            WorkerSkill.proficiency,
            func.count(WorkerSkill.id),
        )
        if cooperative_id:
            skill_distribution = skill_distribution.join(Worker).filter(Worker.cooperative_id == cooperative_id)
        skill_distribution = skill_distribution.group_by(WorkerSkill.proficiency).all()

        workload = db.session.query(
            func.avg(Worker.current_workload),
            func.avg(Worker.max_workload),
        )
        if cooperative_id:
            workload = workload.filter_by(cooperative_id=cooperative_id)
        workload = workload.first()

        return {
            "total_workers": total,
            "verified_workers": verified,
            "available_workers": available,
            "average_experience_years": round(float(avg_experience), 2),
            "average_rating": round(float(avg_rating), 2),
            "total_completed_services": int(total_services),
            "skill_distribution": [{"proficiency": r[0], "count": r[1]} for r in skill_distribution],
            "average_workload": {
                "current": round(float(workload[0]), 2) if workload[0] else 0,
                "max": round(float(workload[1]), 2) if workload[1] else 0,
            },
        }

    def get_cooperative_performance(self, cooperative_id):
        coop = Cooperative.query.get(cooperative_id)
        if not coop:
            return None

        thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)

        worker_count = Worker.query.filter_by(cooperative_id=cooperative_id).count()
        verified_count = Worker.query.filter_by(
            cooperative_id=cooperative_id, verification_status="verified"
        ).count()

        total_bookings = Booking.query.filter(
            Booking.cooperative_id == cooperative_id,
            Booking.created_at >= thirty_days_ago,
        ).count()

        completed = Booking.query.filter(
            Booking.cooperative_id == cooperative_id,
            Booking.status == "completed",
            Booking.created_at >= thirty_days_ago,
        ).count()

        cancelled = Booking.query.filter(
            Booking.cooperative_id == cooperative_id,
            Booking.status == "cancelled",
            Booking.created_at >= thirty_days_ago,
        ).count()

        total_revenue = db.session.query(
            func.coalesce(func.sum(Booking.final_amount), 0)
        ).filter(
            Booking.cooperative_id == cooperative_id,
            Booking.status == "completed",
            Booking.created_at >= thirty_days_ago,
        ).scalar()

        avg_rating = db.session.query(
            func.coalesce(func.avg(Rating.rating), 0)
        ).join(Booking).filter(
            Booking.cooperative_id == cooperative_id,
            Rating.created_at >= thirty_days_ago,
        ).scalar()

        response_requests = ServiceRequest.query.filter(
            ServiceRequest.cooperative_id == cooperative_id,
            ServiceRequest.status.in_(["completed", "confirmed"]),
            ServiceRequest.created_at >= thirty_days_ago,
        ).all()
        response_minutes = [
            (request.updated_at - request.created_at).total_seconds() / 60
            for request in response_requests
            if request.created_at and request.updated_at
        ]
        avg_response_time = sum(response_minutes) / len(response_minutes) if response_minutes else 0

        return {
            "cooperative": coop.to_dict(),
            "period": "last_30_days",
            "workers": {
                "total": worker_count,
                "verified": verified_count,
            },
            "bookings": {
                "total": total_bookings,
                "completed": completed,
                "cancelled": cancelled,
                "fulfillment_rate": round((completed / total_bookings * 100) if total_bookings > 0 else 0, 2),
            },
            "revenue": float(total_revenue),
            "average_rating": round(float(avg_rating), 2),
            "average_response_time_minutes": round(float(avg_response_time), 2),
        }

    def get_federation_overview(self, federation_id):
        federation = Federation.query.get(federation_id)
        if not federation:
            return None

        cooperatives = Cooperative.query.filter_by(federation_id=federation_id, is_active=True).all()
        coop_ids = [c.id for c in cooperatives]

        if not coop_ids:
            return {
                "federation": federation.to_dict(),
                "cooperatives": 0,
                "total_workers": 0,
                "total_bookings": 0,
            }

        total_workers = Worker.query.filter(Worker.cooperative_id.in_(coop_ids)).count()
        total_bookings = Booking.query.filter(Booking.cooperative_id.in_(coop_ids)).count()
        completed = Booking.query.filter(
            Booking.cooperative_id.in_(coop_ids), Booking.status == "completed"
        ).count()
        total_revenue = db.session.query(
            func.coalesce(func.sum(Booking.final_amount), 0)
        ).filter(
            Booking.cooperative_id.in_(coop_ids), Booking.status == "completed"
        ).scalar()

        return {
            "federation": federation.to_dict(),
            "cooperatives": len(cooperatives),
            "total_workers": total_workers,
            "total_bookings": total_bookings,
            "completed_bookings": completed,
            "total_revenue": float(total_revenue),
        }
