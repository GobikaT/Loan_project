from datetime import datetime
from decimal import Decimal

from sqlalchemy import String, ForeignKey, DateTime, Numeric, Integer, func, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base
from app.models.enums import LoanType, ApplicationStatus


class LoanApplication(Base):
    __tablename__ = "loan_applications"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    application_code: Mapped[str] = mapped_column(String(40), unique=True, nullable=False, index=True)
    verification_code: Mapped[str] = mapped_column(String(20), nullable=False)
    applicant_id: Mapped[int] = mapped_column(ForeignKey("applicants.id", ondelete="CASCADE"), nullable=False)
    branch_id: Mapped[int | None] = mapped_column(ForeignKey("branches.id", ondelete="SET NULL"), nullable=True)
    assigned_manager_id: Mapped[int | None] = mapped_column(ForeignKey("branch_managers.id", ondelete="SET NULL"), nullable=True)
    loan_type: Mapped[LoanType] = mapped_column(SAEnum(LoanType), nullable=False)
    requested_amount: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False)
    loan_tenure_months: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[ApplicationStatus] = mapped_column(
        SAEnum(ApplicationStatus), nullable=False, default=ApplicationStatus.APPLICATION_CREATED, index=True
    )
    submitted_to_branch_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    applicant = relationship("Applicant", back_populates="applications")
    branch = relationship("Branch", back_populates="applications")
    assigned_manager = relationship("BranchManager", foreign_keys=[assigned_manager_id])

    personal_loan_detail = relationship("PersonalLoanDetail", back_populates="application", uselist=False, cascade="all, delete-orphan")
    home_loan_detail = relationship("HomeLoanDetail", back_populates="application", uselist=False, cascade="all, delete-orphan")
    education_loan_detail = relationship("EducationLoanDetail", back_populates="application", uselist=False, cascade="all, delete-orphan")

    documents = relationship("Document", back_populates="application", cascade="all, delete-orphan")
    verification_results = relationship("VerificationResult", back_populates="application", cascade="all, delete-orphan")
    ai_predictions = relationship("AIPrediction", back_populates="application", cascade="all, delete-orphan")
    risk_assessments = relationship("RiskAssessment", back_populates="application", cascade="all, delete-orphan")
    recommendation = relationship("Recommendation", back_populates="application", uselist=False, cascade="all, delete-orphan")
    status_history = relationship("ApplicationStatusHistory", back_populates="application", cascade="all, delete-orphan")
    manager_actions = relationship("ManagerAction", back_populates="application", cascade="all, delete-orphan")
    reports = relationship("Report", back_populates="application", cascade="all, delete-orphan")
