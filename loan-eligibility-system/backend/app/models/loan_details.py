from decimal import Decimal

from sqlalchemy import String, ForeignKey, Numeric, Integer, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base
from app.models.enums import Gender, EmploymentType, AffordabilityFlag


class PersonalLoanDetail(Base):
    __tablename__ = "personal_loan_details"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    application_id: Mapped[int] = mapped_column(ForeignKey("loan_applications.id", ondelete="CASCADE"), unique=True, nullable=False)
    age: Mapped[int] = mapped_column(Integer, nullable=False)
    gender: Mapped[Gender | None] = mapped_column(SAEnum(Gender), nullable=True)
    employment_type: Mapped[EmploymentType] = mapped_column(SAEnum(EmploymentType), nullable=False)
    employment_duration_months: Mapped[int] = mapped_column(Integer, default=0)
    monthly_income: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False)
    credit_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    existing_loans_count: Mapped[int] = mapped_column(Integer, default=0)
    existing_emi: Mapped[Decimal] = mapped_column(Numeric(15, 2), default=0)
    number_of_dependents: Mapped[int] = mapped_column(Integer, default=0)

    annual_income: Mapped[Decimal | None] = mapped_column(Numeric(15, 2), nullable=True)
    dti_ratio: Mapped[Decimal | None] = mapped_column(Numeric(6, 4), nullable=True)
    disposable_income: Mapped[Decimal | None] = mapped_column(Numeric(15, 2), nullable=True)
    emi_affordability_flag: Mapped[AffordabilityFlag | None] = mapped_column(SAEnum(AffordabilityFlag), nullable=True)

    application = relationship("LoanApplication", back_populates="personal_loan_detail")


class HomeLoanDetail(Base):
    __tablename__ = "home_loan_details"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    application_id: Mapped[int] = mapped_column(ForeignKey("loan_applications.id", ondelete="CASCADE"), unique=True, nullable=False)
    employment_type: Mapped[EmploymentType] = mapped_column(SAEnum(EmploymentType), nullable=False)
    monthly_income: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False)
    co_applicant_income: Mapped[Decimal] = mapped_column(Numeric(15, 2), default=0)
    credit_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    existing_loans_count: Mapped[int] = mapped_column(Integer, default=0)
    existing_emi: Mapped[Decimal] = mapped_column(Numeric(15, 2), default=0)
    property_value: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False)
    down_payment: Mapped[Decimal] = mapped_column(Numeric(15, 2), default=0)
    existing_liabilities: Mapped[Decimal] = mapped_column(Numeric(15, 2), default=0)

    dti_ratio: Mapped[Decimal | None] = mapped_column(Numeric(6, 4), nullable=True)
    ltv_ratio: Mapped[Decimal | None] = mapped_column(Numeric(6, 4), nullable=True)
    estimated_emi: Mapped[Decimal | None] = mapped_column(Numeric(15, 2), nullable=True)
    emi_affordability_flag: Mapped[AffordabilityFlag | None] = mapped_column(SAEnum(AffordabilityFlag), nullable=True)
    loan_to_income_ratio: Mapped[Decimal | None] = mapped_column(Numeric(6, 4), nullable=True)

    application = relationship("LoanApplication", back_populates="home_loan_detail")


class EducationLoanDetail(Base):
    __tablename__ = "education_loan_details"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    application_id: Mapped[int] = mapped_column(ForeignKey("loan_applications.id", ondelete="CASCADE"), unique=True, nullable=False)
    student_name: Mapped[str] = mapped_column(String(150), nullable=False)
    student_age: Mapped[int] = mapped_column(Integer, nullable=False)
    qualification: Mapped[str | None] = mapped_column(String(150), nullable=True)
    institution: Mapped[str] = mapped_column(String(200), nullable=False)
    course: Mapped[str] = mapped_column(String(150), nullable=False)
    course_duration_months: Mapped[int] = mapped_column(Integer, nullable=False)
    tuition_fee: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False)
    other_expenses: Mapped[Decimal] = mapped_column(Numeric(15, 2), default=0)
    applicant_income: Mapped[Decimal] = mapped_column(Numeric(15, 2), default=0)
    co_applicant_income: Mapped[Decimal] = mapped_column(Numeric(15, 2), default=0)
    existing_obligations: Mapped[Decimal] = mapped_column(Numeric(15, 2), default=0)
    credit_score: Mapped[int | None] = mapped_column(Integer, nullable=True)

    total_education_cost: Mapped[Decimal | None] = mapped_column(Numeric(15, 2), nullable=True)
    requested_loan_percentage: Mapped[Decimal | None] = mapped_column(Numeric(6, 4), nullable=True)
    repayment_burden_ratio: Mapped[Decimal | None] = mapped_column(Numeric(6, 4), nullable=True)
    affordability_flag: Mapped[AffordabilityFlag | None] = mapped_column(SAEnum(AffordabilityFlag), nullable=True)

    application = relationship("LoanApplication", back_populates="education_loan_detail")
