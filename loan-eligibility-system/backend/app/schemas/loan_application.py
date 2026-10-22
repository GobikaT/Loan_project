"""
Request/response schemas for loan application creation.

Input validation (Section 14) enforced here:
  - No missing required values (Pydantic's normal required-field behavior)
  - No negative values (`ge=0` / `gt=0` constraints)
  - No unrealistic values (sane upper bounds on amounts, ages, tenure, credit score)
  - Correct formats (types enforced by Pydantic)

Financial *inconsistencies* (e.g. EMI exceeding income) are deliberately NOT
hard-rejected here -- per Section 14's explicit instruction, those produce a
"Financial information requires verification" warning instead of an outright
error. That logic lives in `app/services/financial_engine.py` and is
returned to the client as a `warnings` list rather than an HTTP error.
"""
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, Field


class PersonalLoanCreate(BaseModel):
    branch_id: int = Field(gt=0, description="Selected Branch ID")
    age: int = Field(ge=18, le=100)
    gender: Literal["MALE", "FEMALE", "OTHER", "PREFER_NOT_TO_SAY"] | None = None
    employment_type: Literal["SALARIED", "SELF_EMPLOYED", "BUSINESS_OWNER", "UNEMPLOYED", "OTHER"]
    employment_duration_months: int = Field(ge=0, le=720)
    monthly_income: Decimal = Field(gt=0, le=Decimal("100000000"))
    credit_score: int | None = Field(default=None, ge=300, le=900)
    existing_loans_count: int = Field(ge=0, le=50)
    existing_emi: Decimal = Field(ge=0, le=Decimal("100000000"))
    number_of_dependents: int = Field(ge=0, le=20)
    requested_amount: Decimal = Field(gt=0, le=Decimal("100000000"))
    loan_tenure_months: int = Field(ge=3, le=360)


class HomeLoanCreate(BaseModel):
    branch_id: int = Field(gt=0, description="Selected Branch ID")
    employment_type: Literal["SALARIED", "SELF_EMPLOYED", "BUSINESS_OWNER", "UNEMPLOYED", "OTHER"]
    monthly_income: Decimal = Field(gt=0, le=Decimal("100000000"))
    co_applicant_income: Decimal = Field(ge=0, le=Decimal("100000000"))
    credit_score: int | None = Field(default=None, ge=300, le=900)
    existing_loans_count: int = Field(ge=0, le=50)
    existing_emi: Decimal = Field(ge=0, le=Decimal("100000000"))
    property_value: Decimal = Field(gt=0, le=Decimal("1000000000"))
    down_payment: Decimal = Field(ge=0, le=Decimal("1000000000"))
    existing_liabilities: Decimal = Field(ge=0, le=Decimal("100000000"))
    requested_amount: Decimal = Field(gt=0, le=Decimal("1000000000"))
    loan_tenure_months: int = Field(ge=12, le=360)


class EducationLoanCreate(BaseModel):
    branch_id: int = Field(gt=0, description="Selected Branch ID")
    student_name: str = Field(min_length=2, max_length=150)
    student_age: int = Field(ge=15, le=65)
    qualification: str | None = Field(default=None, max_length=150)
    institution: str = Field(min_length=2, max_length=200)
    course: str = Field(min_length=2, max_length=150)
    course_duration_months: int = Field(ge=1, le=120)
    tuition_fee: Decimal = Field(gt=0, le=Decimal("100000000"))
    other_expenses: Decimal = Field(ge=0, le=Decimal("100000000"))
    applicant_income: Decimal = Field(ge=0, le=Decimal("100000000"))
    co_applicant_income: Decimal = Field(ge=0, le=Decimal("100000000"))
    existing_obligations: Decimal = Field(ge=0, le=Decimal("100000000"))
    credit_score: int | None = Field(default=None, ge=300, le=900)
    requested_amount: Decimal = Field(gt=0, le=Decimal("100000000"))
    loan_tenure_months: int = Field(ge=3, le=240)


class LoanApplicationSummary(BaseModel):
    id: int
    application_code: str
    loan_type: str
    status: str
    requested_amount: str
    created_at: str


class LoanApplicationCreatedResponse(BaseModel):
    id: int
    application_code: str
    verification_code: str
    loan_type: str
    status: str
    calculated: dict
    warnings: list[str]
