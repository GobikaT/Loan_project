"""
Financial Feature Engine (Section 19 of the spec).

Formulas used, exactly as specified:
    DTI                 = Existing Monthly EMI / Monthly Income
    LTV                 = Requested Loan Amount / Property Value
    Disposable Income   = Monthly Income - Existing Obligations
    EMI (amortized)     = P * r * (1+r)^n / ((1+r)^n - 1)
        where P = principal, r = monthly interest rate, n = tenure in months

The spec's loan forms (Sections 11-13) do not collect an interest rate from
the applicant -- that's only an input on the standalone EMI Calculator
(Section 26). For estimating a loan's own EMI here, we use illustrative
indicative annual rates per loan type. These are placeholders meant to be
replaced by a real, admin-configurable rate table in a later phase -- they
are NOT a quoted offer to the applicant.
"""
from decimal import Decimal, ROUND_HALF_UP

INDICATIVE_ANNUAL_RATE = {
    "PERSONAL": Decimal("12.0"),
    "HOME": Decimal("8.5"),
    "EDUCATION": Decimal("9.0"),
}

# Affordability thresholds on DTI-style ratios (dimensionless, e.g. 0.40 = 40%)
AFFORDABLE_MAX = Decimal("0.40")
TIGHT_MAX = Decimal("0.55")


def _round2(value: Decimal) -> Decimal:
    return value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def _round4(value: Decimal) -> Decimal:
    return value.quantize(Decimal("0.0001"), rounding=ROUND_HALF_UP)


def calculate_emi(principal: Decimal, annual_rate_percent: Decimal, tenure_months: int) -> Decimal:
    if principal <= 0 or tenure_months <= 0:
        return Decimal("0.00")
    monthly_rate = annual_rate_percent / Decimal("100") / Decimal("12")
    if monthly_rate == 0:
        return _round2(principal / tenure_months)
    factor = (1 + monthly_rate) ** tenure_months
    emi = principal * monthly_rate * factor / (factor - 1)
    return _round2(Decimal(emi))


def _affordability_flag(ratio: Decimal) -> str:
    if ratio <= AFFORDABLE_MAX:
        return "AFFORDABLE"
    if ratio <= TIGHT_MAX:
        return "TIGHT"
    return "NOT_AFFORDABLE"


def evaluate_personal_loan(
    monthly_income: Decimal,
    existing_emi: Decimal,
    requested_amount: Decimal,
    tenure_months: int,
) -> dict:
    warnings: list[str] = []

    dti_ratio = _round4(existing_emi / monthly_income) if monthly_income > 0 else Decimal("0")
    annual_income = _round2(monthly_income * 12)
    disposable_income = _round2(monthly_income - existing_emi)

    estimated_emi = calculate_emi(requested_amount, INDICATIVE_ANNUAL_RATE["PERSONAL"], tenure_months)
    projected_ratio = _round4((existing_emi + estimated_emi) / monthly_income) if monthly_income > 0 else Decimal("0")
    flag = _affordability_flag(projected_ratio)

    if monthly_income > 0 and existing_emi > monthly_income:
        warnings.append("Financial information requires verification: existing EMI exceeds reported monthly income.")
    if disposable_income < 0:
        warnings.append("Financial information requires verification: disposable income is negative.")

    return {
        "annual_income": annual_income,
        "dti_ratio": dti_ratio,
        "disposable_income": disposable_income,
        "emi_affordability_flag": flag,
        "estimated_emi": estimated_emi,
        "warnings": warnings,
    }


def evaluate_home_loan(
    monthly_income: Decimal,
    co_applicant_income: Decimal,
    existing_emi: Decimal,
    existing_liabilities: Decimal,
    requested_amount: Decimal,
    property_value: Decimal,
    down_payment: Decimal,
    tenure_months: int,
) -> dict:
    warnings: list[str] = []
    total_income = monthly_income + co_applicant_income

    dti_ratio = _round4((existing_emi + existing_liabilities) / total_income) if total_income > 0 else Decimal("0")
    ltv_ratio = _round4(requested_amount / property_value) if property_value > 0 else Decimal("0")

    estimated_emi = calculate_emi(requested_amount, INDICATIVE_ANNUAL_RATE["HOME"], tenure_months)
    projected_ratio = (
        _round4((existing_emi + existing_liabilities + estimated_emi) / total_income) if total_income > 0 else Decimal("0")
    )
    flag = _affordability_flag(projected_ratio)

    loan_to_income_ratio = _round4(requested_amount / (total_income * 12)) if total_income > 0 else Decimal("0")

    if property_value > 0 and (requested_amount + down_payment) < property_value * Decimal("0.5"):
        warnings.append("Financial information requires verification: combined loan and down payment seem low relative to property value.")
    if ltv_ratio > 1:
        warnings.append("Financial information requires verification: requested loan amount exceeds declared property value.")
    if total_income > 0 and (existing_emi + existing_liabilities) > total_income:
        warnings.append("Financial information requires verification: existing obligations exceed reported household income.")

    return {
        "dti_ratio": dti_ratio,
        "ltv_ratio": ltv_ratio,
        "estimated_emi": estimated_emi,
        "emi_affordability_flag": flag,
        "loan_to_income_ratio": loan_to_income_ratio,
        "warnings": warnings,
    }


def evaluate_education_loan(
    tuition_fee: Decimal,
    other_expenses: Decimal,
    applicant_income: Decimal,
    co_applicant_income: Decimal,
    existing_obligations: Decimal,
    requested_amount: Decimal,
    tenure_months: int,
) -> dict:
    warnings: list[str] = []
    total_income = applicant_income + co_applicant_income
    total_education_cost = _round2(tuition_fee + other_expenses)

    requested_loan_percentage = (
        _round4(requested_amount / total_education_cost) if total_education_cost > 0 else Decimal("0")
    )

    estimated_emi = calculate_emi(requested_amount, INDICATIVE_ANNUAL_RATE["EDUCATION"], tenure_months)
    repayment_burden_ratio = (
        _round4((existing_obligations + estimated_emi) / total_income) if total_income > 0 else Decimal("0")
    )
    flag = _affordability_flag(repayment_burden_ratio)

    if total_education_cost > 0 and requested_amount > total_education_cost:
        warnings.append("Financial information requires verification: requested loan amount exceeds total education cost.")
    if total_income == 0:
        warnings.append("Financial information requires verification: no applicant or co-applicant income was declared.")

    return {
        "total_education_cost": total_education_cost,
        "requested_loan_percentage": requested_loan_percentage,
        "repayment_burden_ratio": repayment_burden_ratio,
        "affordability_flag": flag,
        "estimated_emi": estimated_emi,
        "warnings": warnings,
    }
