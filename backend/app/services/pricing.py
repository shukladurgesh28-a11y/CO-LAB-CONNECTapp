"""Single source of truth for all CO-LAB CONNECT money math.

Every rupee figure (invoice lines, commission, welfare, worker payout,
tax, and totals) must flow through compute_invoice(). Nothing else in the
codebase should multiply or round money.

Rules enforced here:
- All money uses Decimal, rounded to 2 decimals (paise) with ROUND_HALF_UP,
  never float arithmetic.
- gross_total        = service_amount + material_charges
- commission/welfare = a percentage of the BASE (service charges only by
  default; set commission_applies_to_material=True to include materials).
- tax                = tax_rate applied to gross_total (0.0 unless enabled).
- net_amount         = gross_total + tax   -> what the customer pays.
- worker_payout      = net_amount - commission - welfare -> ALWAYS reconciles
                       exactly against the other line items.
"""

from decimal import Decimal, ROUND_HALF_UP
from typing import Optional, Union

PAISE = Decimal("0.01")
Money = Union[Decimal, float, int, str]

DEFAULT_COMMISSION_RATE = Decimal("0.10")
DEFAULT_WELFARE_RATE = Decimal("0.02")
DEFAULT_TAX_RATE = Decimal("0.00")


def _money(value: Money, default: Money = "0.00") -> Decimal:
    if value is None:
        value = default
    return Decimal(str(value)).quantize(PAISE, rounding=ROUND_HALF_UP)


def compute_invoice(
    service_amount: Money,
    material_charges: Optional[Money] = None,
    commission_rate: Money = DEFAULT_COMMISSION_RATE,
    welfare_rate: Money = DEFAULT_WELFARE_RATE,
    tax_rate: Money = DEFAULT_TAX_RATE,
    commission_applies_to_material: bool = False,
) -> dict:
    service_amount = _money(service_amount)
    material_charges = _money(material_charges, "0.00")
    commission_rate = Decimal(str(commission_rate))
    welfare_rate = Decimal(str(welfare_rate))
    tax_rate = Decimal(str(tax_rate))

    gross_total = (service_amount + material_charges).quantize(PAISE, rounding=ROUND_HALF_UP)

    commission_base = (
        gross_total if commission_applies_to_material else service_amount
    )
    commission_amount = (commission_base * commission_rate).quantize(
        PAISE, rounding=ROUND_HALF_UP
    )
    welfare_amount = (commission_base * welfare_rate).quantize(
        PAISE, rounding=ROUND_HALF_UP
    )
    tax_amount = (gross_total * tax_rate).quantize(PAISE, rounding=ROUND_HALF_UP)
    net_amount = (gross_total + tax_amount).quantize(PAISE, rounding=ROUND_HALF_UP)
    worker_payout = (net_amount - commission_amount - welfare_amount).quantize(
        PAISE, rounding=ROUND_HALF_UP
    )

    return {
        "service_amount": service_amount,
        "material_charges": material_charges,
        "gross_total": gross_total,
        "commission_amount": commission_amount,
        "welfare_amount": welfare_amount,
        "tax_amount": tax_amount,
        "net_amount": net_amount,
        "worker_payout": worker_payout,
    }