from datetime import datetime
from decimal import Decimal

from sqlalchemy import String, ForeignKey, DateTime, Text, JSON, func, Enum as SAEnum, Numeric
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base
from app.models.enums import MatchStatus, Eligibility, RiskLevel


class VerificationResult(Base):
    __tablename__ = "verification_results"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    application_id: Mapped[int] = mapped_column(ForeignKey("loan_applications.id", ondelete="CASCADE"), nullable=False, index=True)
    field_name: Mapped[str] = mapped_column(String(100), nullable=False)
    applicant_value: Mapped[str | None] = mapped_column(String(255), nullable=True)
    document_value: Mapped[str | None] = mapped_column(String(255), nullable=True)
    match_status: Mapped[MatchStatus] = mapped_column(SAEnum(MatchStatus), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    application = relationship("LoanApplication", back_populates="verification_results")


class AIPrediction(Base):
    __tablename__ = "ai_predictions"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    application_id: Mapped[int] = mapped_column(ForeignKey("loan_applications.id", ondelete="CASCADE"), nullable=False, index=True)
    model_name: Mapped[str] = mapped_column(String(100), nullable=False)
    model_version: Mapped[str | None] = mapped_column(String(50), nullable=True)
    eligibility: Mapped[Eligibility] = mapped_column(SAEnum(Eligibility), nullable=False)
    eligibility_probability: Mapped[Decimal] = mapped_column(Numeric(6, 5), nullable=False)
    positive_factors: Mapped[list | None] = mapped_column(JSON, nullable=True)
    negative_factors: Mapped[list | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    application = relationship("LoanApplication", back_populates="ai_predictions")


class RiskAssessment(Base):
    __tablename__ = "risk_assessments"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    application_id: Mapped[int] = mapped_column(ForeignKey("loan_applications.id", ondelete="CASCADE"), nullable=False, index=True)
    risk_level: Mapped[RiskLevel] = mapped_column(SAEnum(RiskLevel), nullable=False)
    risk_score: Mapped[Decimal | None] = mapped_column(Numeric(6, 4), nullable=True)
    contributing_factors: Mapped[list | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    application = relationship("LoanApplication", back_populates="risk_assessments")


class Recommendation(Base):
    __tablename__ = "recommendations"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    application_id: Mapped[int] = mapped_column(ForeignKey("loan_applications.id", ondelete="CASCADE"), unique=True, nullable=False)
    recommended_min_amount: Mapped[Decimal | None] = mapped_column(Numeric(15, 2), nullable=True)
    recommended_max_amount: Mapped[Decimal | None] = mapped_column(Numeric(15, 2), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    disclaimer: Mapped[str] = mapped_column(
        String(500),
        default="This is an AI-based suggestion only and is not a guaranteed approval.",
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    application = relationship("LoanApplication", back_populates="recommendation")
