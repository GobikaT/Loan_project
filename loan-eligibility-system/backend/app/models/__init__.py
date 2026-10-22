"""
Importing every model module here ensures that `Base.metadata` is aware of
all tables when `Base.metadata.create_all()` is called (used only in local
dev / testing -- the authoritative schema lives in database/schema.sql and
should be applied via that file or Alembic migrations in real deployments).
"""
from app.models.user import User  # noqa: F401
from app.models.district import District  # noqa: F401
from app.models.party import Applicant, Branch, BranchManager, Admin  # noqa: F401
from app.models.loan_application import LoanApplication  # noqa: F401
from app.models.loan_details import PersonalLoanDetail, HomeLoanDetail, EducationLoanDetail  # noqa: F401
from app.models.document import Document, OcrResult, ExtractedField  # noqa: F401
from app.models.assessment import VerificationResult, AIPrediction, RiskAssessment, Recommendation  # noqa: F401
from app.models.workflow import (  # noqa: F401
    ApplicationStatusHistory,
    ManagerAction,
    Notification,
    AuditLog,
    Report,
)
