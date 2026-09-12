import time
from datetime import datetime, timezone
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
import bcrypt
import pyotp
from app import db
from app.models.user import User
from app.models.worker import Worker
from app.utils.helpers import generate_otp, success_response, error_response

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")

otp_store = {}
login_attempts = {}


def _login_key(identifier):
    return f"{request.remote_addr or 'unknown'}:{identifier.lower()}"


def _record_login_failure(key):
    now = time.time()
    state = login_attempts.get(key, {"count": 0, "locked_until": 0})
    state["count"] += 1
    if state["count"] >= 10:
        state["locked_until"] = now + 300
    login_attempts[key] = state


@auth_bp.route("/register", methods=["POST"])
def register():
    try:
        data = request.get_json()
        if not data:
            return error_response("Request body is required", 400)

        phone = (data.get("phone") or "").strip()
        password = data.get("password", "")
        name = (data.get("name") or "").strip()
        email = (data.get("email") or "").strip()
        role = (data.get("role") or "customer").strip()

        if role not in ("customer", "worker"):
            return error_response("Public registration is limited to customers and workers", 400)

        if not email or not phone or not password or not name:
            return error_response("Email, phone, password, and name are required", 400)

        if len(password) < 6:
            return error_response("Password must be at least 6 characters", 400)

        if User.query.filter_by(phone=phone).first():
            return error_response("Phone number already registered", 409)

        if User.query.filter_by(email=email).first():
            return error_response("Email already registered", 409)

        user = User(
            phone=phone,
            name=name,
            email=email,
            role=role,
            is_active=True,
            is_verified=False,
        )
        user.set_password(password)
        db.session.add(user)
        db.session.flush()

        if role == "worker":
            worker = Worker(
                user_id=user.id,
                name=name,
                phone=phone,
                email=email,
                cooperative_id=data.get("cooperative_id"),
                verification_status="pending",
                is_available=True,
            )
            db.session.add(worker)

        otp = generate_otp()
        otp_store[phone] = {
            "otp": otp,
            "expires_at": time.time() + 300,
            "user_id": user.id,
            "attempts": 0,
            "sent_at": time.time(),
        }

        db.session.commit()
        access_token = create_access_token(identity=str(user.id))

        response = {
            "success": True,
            "message": "Registration successful. OTP sent for verification.",
            "token": access_token,
            "user": user.to_dict(),
        }
        if current_app.config.get("OTP_EXPOSE_IN_RESPONSE"):
            response["otp"] = otp
        return response, 201
    except Exception as e:
        db.session.rollback()
        return error_response(f"Registration failed: {str(e)}", 500)


@auth_bp.route("/login", methods=["POST"])
def login():
    try:
        data = request.get_json()
        if not data:
            return error_response("Request body is required", 400)

        email = (data.get("email") or data.get("phone") or "").strip()
        password = data.get("password", "")

        if not email or not password:
            return error_response("Email/phone and password are required", 400)

        login_key = _login_key(email)
        login_state = login_attempts.get(login_key)
        if login_state and login_state.get("locked_until", 0) > time.time():
            return error_response("Too many login attempts. Try again later.", 429)

        user = User.query.filter((User.email == email) | (User.phone == email)).first()
        if not user:
            _record_login_failure(login_key)
            return error_response("Invalid credentials", 401)

        if not user.check_password(password):
            _record_login_failure(login_key)
            return error_response("Invalid credentials", 401)

        if not user.is_active:
            return error_response("Account is deactivated", 403)

        if not user.is_verified:
            return error_response("Please verify your phone number with the OTP before logging in", 403)

        login_attempts.pop(login_key, None)

        access_token = create_access_token(identity=str(user.id))

        user_data = user.to_dict()
        if user.worker_profile:
            user_data["worker_profile"] = user.worker_profile.to_dict(include_details=True)

        return {
            "success": True,
            "message": "Login successful",
            "token": access_token,
            "user": user_data,
        }, 200
    except Exception as e:
        return error_response(f"Login failed: {str(e)}", 500)


@auth_bp.route("/otp/verify", methods=["POST"])
@auth_bp.route("/verify-otp", methods=["POST"])
def verify_otp():
    try:
        data = request.get_json()
        if not data:
            return error_response("Request body is required", 400)

        phone = data.get("phone", "").strip()
        otp_code = data.get("otp", "").strip()

        if not phone or not otp_code:
            return error_response("Phone and OTP are required", 400)

        stored = otp_store.get(phone)
        if not stored:
            return error_response("No OTP found for this phone number", 404)

        if time.time() > stored["expires_at"]:
            del otp_store[phone]
            return error_response("OTP has expired. Please request a new one.", 410)

        stored["attempts"] += 1
        if stored["attempts"] > current_app.config["OTP_MAX_ATTEMPTS"]:
            del otp_store[phone]
            return error_response("Too many invalid OTP attempts. Request a new OTP.", 429)

        if stored["otp"] != otp_code:
            return error_response("Invalid OTP", 401)

        user = User.query.get(stored["user_id"])
        if user:
            user.is_verified = True
            db.session.commit()

        del otp_store[phone]

        return success_response(
            {"user": user.to_dict() if user else None},
            "OTP verified successfully",
        )
    except Exception as e:
        db.session.rollback()
        return error_response(f"OTP verification failed: {str(e)}", 500)


@auth_bp.route("/resend-otp", methods=["POST"])
def resend_otp():
    try:
        data = request.get_json()
        if not data:
            return error_response("Request body is required", 400)

        phone = data.get("phone", "").strip()
        if not phone:
            return error_response("Phone number is required", 400)

        user = User.query.filter_by(phone=phone).first()
        if not user:
            return error_response("User not found", 404)

        stored = otp_store.get(phone)
        now = time.time()
        if stored and now - stored.get("sent_at", 0) < current_app.config["OTP_RESEND_COOLDOWN_SECONDS"]:
            return error_response("Please wait before requesting another OTP", 429)

        otp = generate_otp()
        otp_store[phone] = {
            "otp": otp,
            "expires_at": time.time() + 300,
            "user_id": user.id,
            "attempts": 0,
            "sent_at": time.time(),
        }

        response = {"message": "OTP resent successfully"}
        if current_app.config.get("OTP_EXPOSE_IN_RESPONSE"):
            response["otp"] = otp
        return success_response(
            response,
            "OTP resent successfully",
        )
    except Exception as e:
        return error_response(f"Failed to resend OTP: {str(e)}", 500)


@auth_bp.route("/me", methods=["GET"])
@jwt_required()
def get_profile():
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        if not user:
            return error_response("User not found", 404)

        user_data = user.to_dict()
        if user.worker_profile:
            user_data["worker_profile"] = user.worker_profile.to_dict(include_details=True)

        return {"success": True, "message": "Profile retrieved", "user": user_data}, 200
    except Exception as e:
        return error_response(f"Failed to retrieve profile: {str(e)}", 500)


@auth_bp.route("/me", methods=["PUT"])
@jwt_required()
def update_profile():
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        if not user:
            return error_response("User not found", 404)

        data = request.get_json()
        if not data:
            return error_response("Request body is required", 400)

        if "name" in data:
            user.name = data["name"].strip()
        if "email" in data:
            email = data["email"].strip()
            if email:
                existing = User.query.filter(User.email == email, User.id != user_id).first()
                if existing:
                    return error_response("Email already in use", 409)
                user.email = email
        if "language_preference" in data:
            user.language_preference = data["language_preference"]
        if "password" in data and len(data["password"]) >= 6:
            user.set_password(data["password"])

        db.session.commit()
        return {"success": True, "message": "Profile updated successfully", "user": user.to_dict()}, 200
    except Exception as e:
        db.session.rollback()
        return error_response(f"Failed to update profile: {str(e)}", 500)
