from decimal import Decimal

import pytest

from app.services.pricing import compute_invoice, _money


def test_zero_amounts_produce_all_zeros():
    parts = compute_invoice(0, 0)
    assert parts["service_amount"] == Decimal("0.00")
    assert parts["material_charges"] == Decimal("0.00")
    assert parts["gross_total"] == Decimal("0.00")
    assert parts["commission_amount"] == Decimal("0.00")
    assert parts["welfare_amount"] == Decimal("0.00")
    assert parts["tax_amount"] == Decimal("0.00")
    assert parts["net_amount"] == Decimal("0.00")
    assert parts["worker_payout"] == Decimal("0.00")


def test_plain_service_1000_with_18pct_tax():
    parts = compute_invoice(1000.00, 0, tax_rate=0.18)
    assert parts["commission_amount"] == Decimal("100.00")
    assert parts["welfare_amount"] == Decimal("50.00")
    assert parts["tax_amount"] == Decimal("180.00")
    assert parts["net_amount"] == Decimal("1180.00")
    assert parts["worker_payout"] == Decimal("1030.00")


def test_materials_are_default_exempt_from_commission_and_welfare():
    parts = compute_invoice(800, 200)
    assert parts["gross_total"] == Decimal("1000.00")
    assert parts["commission_amount"] == Decimal("80.00")
    assert parts["welfare_amount"] == Decimal("40.00")
    assert parts["worker_payout"] == Decimal("880.00")


def test_commission_on_materials_flag_includes_them():
    parts = compute_invoice(800, 200, commission_applies_to_material=True)
    assert parts["commission_amount"] == Decimal("100.00")
    assert parts["welfare_amount"] == Decimal("50.00")
    assert parts["worker_payout"] == Decimal("850.00")


def test_no_integer_rounding_bug_825_dot_75():
    parts = compute_invoice("825.75")
    assert parts["commission_amount"] == Decimal("82.58")
    assert parts["welfare_amount"] == Decimal("41.29")
    assert parts["worker_payout"] == Decimal("701.88")


def test_worker_payout_always_reconciles():
    for service, material in [
        ("1.00", "0.99"),
        ("99.99", "0.01"),
        ("1234.56", "789.44"),
        ("0.05", "0.05"),
        ("100000.00", "99999.99"),
    ]:
        parts = compute_invoice(service, material)
        assert parts["worker_payout"] == (
            parts["net_amount"]
            - parts["commission_amount"]
            - parts["welfare_amount"]
        )
        assert parts["net_amount"] == parts["gross_total"] + parts["tax_amount"]


def test_float_noise_is_cleaned_at_boundary():
    parts = compute_invoice(0.1 + 0.2, material_charges=0.1)
    assert parts["gross_total"] == Decimal("0.40")


def test_none_and_empty_values_default_to_zero():
    parts = compute_invoice(None, None)
    assert parts["gross_total"] == Decimal("0.00")


def test_rounding_is_half_up_not_bankers():
    from decimal import ROUND_HALF_UP

    assert Decimal("0.005").quantize(Decimal("0.01"), rounding=ROUND_HALF_UP) == Decimal("0.01")
    parts = compute_invoice("100.00", tax_rate=0.18)
    assert parts["tax_amount"] == Decimal("18.00")
    parts = compute_invoice("56.00", tax_rate=0.18)
    assert parts["tax_amount"] == Decimal("10.08")


def test_money_helper_accepts_common_types():
    assert _money(10) == Decimal("10.00")
    assert _money(10.5) == Decimal("10.50")
    assert _money("10.505") == Decimal("10.51")
    assert _money(None) == Decimal("0.00")