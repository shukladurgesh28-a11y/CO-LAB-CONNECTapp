import math
from decimal import Decimal


def money_float(value):
    """Serialize a Numeric/Decimal money column for JSON responses.

    Money is stored as Numeric(12, 2) and computed with Decimal internally;
    the API boundary converts to float so jsonify output is unchanged.
    """
    if value is None:
        return None
    if isinstance(value, Decimal):
        return float(value)
    return value


def generate_otp(length=6):
    import secrets
    return "".join(str(secrets.randbelow(10)) for _ in range(length))


def validate_phone(phone):
    if not phone:
        return False
    cleaned = phone.replace(" ", "").replace("-", "").replace("+", "")
    return cleaned.isdigit() and 8 <= len(cleaned) <= 15


def format_currency(amount):
    if amount is None:
        return "₹0.00"
    return f"₹{amount:,.2f}"


def paginate(query, page=1, per_page=20):
    page = max(1, page)
    per_page = min(max(1, per_page), 100)
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)
    return {
        "items": pagination.items,
        "page": pagination.page,
        "per_page": pagination.per_page,
        "total": pagination.total,
        "pages": pagination.pages,
        "has_next": pagination.has_next,
        "has_prev": pagination.has_prev,
    }


def success_response(data=None, message="Success", status_code=200):
    response = {
        "success": True,
        "message": message,
    }
    if data is not None:
        response["data"] = data
    return response, status_code


def error_response(message="Error", status_code=400):
    return {
        "success": False,
        "message": message,
    }, status_code


def haversine_distance(lat1, lng1, lat2, lng2):
    R = 6371.0
    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = math.sin(dlat / 2) ** 2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlng / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c
