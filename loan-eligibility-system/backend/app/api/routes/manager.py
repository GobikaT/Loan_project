"""
Branch Manager routes.
Every query and action is strictly scoped to the authenticated manager's own `branch_id`.
A manager cannot access, view, or modify applications from other branches.
"""
from datetime import datetime
from typing import Optional, List, Dict, Any
from decimal import Decimal
import os

from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.deps import require_role
from app.db.session import get_db
from app.models.party import BranchManager, Branch, Applicant
from app.models.loan_application import LoanApplication
from app.models.loan_details import PersonalLoanDetail, HomeLoanDetail, EducationLoanDetail
from app.models.user import User
from app.models.document import Document, OcrResult
from app.models.assessment import VerificationResult, AIPrediction, RiskAssessment, Recommendation
from app.models.workflow import ApplicationStatusHistory, ManagerAction, Report
from app.models.enums import (
    ApplicationStatus,
    ManagerActionType,
    LoanType,
    MatchStatus,
)
from app.services.report_generator import report_generator

router = APIRouter(prefix="/api/manager", tags=["manager"])


def _get_own_manager(current_user: User, db: Session) -> BranchManager:
    manager = db.query(BranchManager).filter(BranchManager.user_id == current_user.id).first()
    if not manager or not manager.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Manager profile not found or inactive. Contact bank administration."
        )
    return manager


class ManagerDecisionRequest(BaseModel):
    decision: str  # "APPROVE", "REJECT", "REQUEST_CORRECTION"
    remarks: Optional[str] = None


@router.get("/me")
def get_my_profile(current_user: User = Depends(require_role("MANAGER")), db: Session = Depends(get_db)):
    manager = _get_own_manager(current_user, db)
    branch = db.query(Branch).filter(Branch.id == manager.branch_id).first()
    return {
        "id": manager.id,
        "full_name": manager.full_name,
        "employee_code": manager.employee_code,
        "phone": manager.phone,
        "branch_id": manager.branch_id,
        "branch_name": branch.branch_name if branch else "Assigned Branch",
        "branch_code": branch.branch_code if branch else "",
        "branch_city": branch.city if branch else "",
        "email": current_user.email,
    }


@router.get("/applications")
def list_branch_applications(current_user: User = Depends(require_role("MANAGER")), db: Session = Depends(get_db)):
    """
    Scoped strictly to the authenticated manager's branch applications.
    Displays applicant name, ID, loan type, amount, date, AI prediction result, and status.
    """
    manager = _get_own_manager(current_user, db)
    applications = (
        db.query(LoanApplication)
        .filter(LoanApplication.branch_id == manager.branch_id)
        .order_by(LoanApplication.created_at.desc())
        .all()
    )

    result = []
    for a in applications:
        # Fetch AI Prediction
        ai_pred = (
            db.query(AIPrediction)
            .filter(AIPrediction.application_id == a.id)
            .order_by(AIPrediction.id.desc())
            .first()
        )
        risk = (
            db.query(RiskAssessment)
            .filter(RiskAssessment.application_id == a.id)
            .order_by(RiskAssessment.id.desc())
            .first()
        )

        applicant_name = a.applicant.full_name if a.applicant else "N/A"
        applicant_email = a.applicant.user.email if (a.applicant and a.applicant.user) else None
        applicant_phone = a.applicant.user.phone if (a.applicant and a.applicant.user) else None

        result.append({
            "id": a.id,
            "application_code": a.application_code,
            "verification_code": a.verification_code,
            "applicant_name": applicant_name,
            "applicant_email": applicant_email,
            "applicant_phone": applicant_phone,
            "loan_type": a.loan_type.value,
            "status": a.status.value,
            "requested_amount": str(a.requested_amount),
            "loan_tenure_months": a.loan_tenure_months,
            "created_at": a.created_at.isoformat() if a.created_at else None,
            "submitted_to_branch_at": a.submitted_to_branch_at.isoformat() if a.submitted_to_branch_at else None,
            "ai_prediction": {
                "eligibility": ai_pred.eligibility.value if ai_pred else "PENDING",
                "probability": float(ai_pred.eligibility_probability) if ai_pred else None,
                "score": int(float(ai_pred.eligibility_probability) * 100) if ai_pred else None,
                "risk_level": risk.risk_level.value if risk else "UNKNOWN",
                "reasoning": risk.contributing_factors[0] if (risk and risk.contributing_factors) else None,
            },
        })
    return result


@router.get("/applications/{application_id}")
def get_application_details(
    application_id: int,
    current_user: User = Depends(require_role("MANAGER")),
    db: Session = Depends(get_db),
):
    """
    Get full details of a specific application for manager review.
    Enforces branch-level authorization: strictly checks application.branch_id == manager.branch_id.
    """
    manager = _get_own_manager(current_user, db)

    application = (
        db.query(LoanApplication)
        .filter(LoanApplication.id == application_id)
        .first()
    )
    if not application:
        raise HTTPException(status_code=404, detail="Application not found.")

    if application.branch_id != manager.branch_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: This application is assigned to a different branch."
        )

    applicant = application.applicant
    applicant_data = {
        "id": applicant.id if applicant else None,
        "full_name": applicant.full_name if applicant else "Unknown",
        "email": applicant.user.email if (applicant and applicant.user) else None,
        "phone": applicant.user.phone if (applicant and applicant.user) else None,
        "date_of_birth": str(applicant.date_of_birth) if (applicant and applicant.date_of_birth) else None,
        "address": applicant.address if applicant else None,
    }

    # Extract loan detail
    detail: Dict[str, Any] = {}
    if application.loan_type == LoanType.PERSONAL and application.personal_loan_detail:
        d = application.personal_loan_detail
        detail = {
            "age": d.age,
            "gender": d.gender.value if d.gender else None,
            "employment_type": d.employment_type.value if d.employment_type else None,
            "employment_duration_months": d.employment_duration_months,
            "monthly_income": str(d.monthly_income),
            "annual_income": str(d.annual_income) if d.annual_income else None,
            "credit_score": d.credit_score,
            "existing_loans_count": d.existing_loans_count,
            "existing_emi": str(d.existing_emi),
            "number_of_dependents": d.number_of_dependents,
            "dti_ratio": str(d.dti_ratio) if d.dti_ratio else None,
            "disposable_income": str(d.disposable_income) if d.disposable_income else None,
            "emi_affordability_flag": d.emi_affordability_flag.value if d.emi_affordability_flag else None,
        }
    elif application.loan_type == LoanType.HOME and application.home_loan_detail:
        d = application.home_loan_detail
        detail = {
            "employment_type": d.employment_type.value if d.employment_type else None,
            "monthly_income": str(d.monthly_income),
            "co_applicant_income": str(d.co_applicant_income) if d.co_applicant_income else "0",
            "credit_score": d.credit_score,
            "property_value": str(d.property_value),
            "down_payment": str(d.down_payment),
            "existing_emi": str(d.existing_emi),
            "dti_ratio": str(d.dti_ratio) if d.dti_ratio else None,
            "ltv_ratio": str(d.ltv_ratio) if d.ltv_ratio else None,
            "estimated_emi": str(d.estimated_emi) if d.estimated_emi else None,
            "emi_affordability_flag": d.emi_affordability_flag.value if d.emi_affordability_flag else None,
        }
    elif application.loan_type == LoanType.EDUCATION and application.education_loan_detail:
        d = application.education_loan_detail
        detail = {
            "student_name": d.student_name,
            "student_age": d.student_age,
            "qualification": d.qualification,
            "institution": d.institution,
            "course": d.course,
            "course_duration_months": d.course_duration_months,
            "tuition_fee": str(d.tuition_fee),
            "other_expenses": str(d.other_expenses) if d.other_expenses else "0",
            "applicant_income": str(d.applicant_income) if d.applicant_income else "0",
            "co_applicant_income": str(d.co_applicant_income) if d.co_applicant_income else "0",
            "existing_obligations": str(d.existing_obligations) if d.existing_obligations else "0",
            "credit_score": d.credit_score,
            "total_education_cost": str(d.total_education_cost) if d.total_education_cost else None,
            "repayment_burden_ratio": str(d.repayment_burden_ratio) if d.repayment_burden_ratio else None,
            "affordability_flag": d.affordability_flag.value if d.affordability_flag else None,
        }

    # Fetch OCR comparison results
    verifications = (
        db.query(VerificationResult)
        .filter(VerificationResult.application_id == application.id)
        .all()
    )
    verification_list = [
        {
            "id": v.id,
            "field_name": v.field_name,
            "entered_value": v.applicant_value,
            "extracted_value": v.document_value,
            "match_status": v.match_status.value,
        }
        for v in verifications
    ]

    # Fetch uploaded documents
    docs = db.query(Document).filter(Document.application_id == application.id).all()
    doc_list = [
        {
            "id": doc.id,
            "filename": doc.original_filename,
            "document_type": doc.document_type.value,
            "file_size_bytes": doc.file_size_bytes,
            "uploaded_at": doc.uploaded_at.isoformat() if doc.uploaded_at else None,
            "ocr_status": doc.ocr_result.status.value if doc.ocr_result else "PENDING",
            "ocr_confidence": float(doc.ocr_result.ocr_confidence * 100) if (doc.ocr_result and doc.ocr_result.ocr_confidence) else 0.0,
        }
        for doc in docs
    ]

    # Fetch AI Prediction
    ai_pred = (
        db.query(AIPrediction)
        .filter(AIPrediction.application_id == application.id)
        .order_by(AIPrediction.id.desc())
        .first()
    )
    risk = (
        db.query(RiskAssessment)
        .filter(RiskAssessment.application_id == application.id)
        .order_by(RiskAssessment.id.desc())
        .first()
    )
    rec = (
        db.query(Recommendation)
        .filter(Recommendation.application_id == application.id)
        .order_by(Recommendation.id.desc())
        .first()
    )

    ai_data = {
        "eligibility": ai_pred.eligibility.value if ai_pred else "NEEDS_REVIEW",
        "probability": float(ai_pred.eligibility_probability) if ai_pred else 0.0,
        "score": int(float(ai_pred.eligibility_probability) * 100) if ai_pred else 50,
        "risk_level": risk.risk_level.value if risk else "MEDIUM",
        "reasoning": risk.contributing_factors[0] if (risk and risk.contributing_factors) else "AI assessment completed",
        "positive_factors": ai_pred.positive_factors if (ai_pred and ai_pred.positive_factors) else [],
        "negative_factors": ai_pred.negative_factors if (ai_pred and ai_pred.negative_factors) else [],
        "recommendation": rec.notes if rec else "Pending manager verification",
    }

    # Fetch status history
    history = (
        db.query(ApplicationStatusHistory)
        .filter(ApplicationStatusHistory.application_id == application.id)
        .order_by(ApplicationStatusHistory.created_at.asc())
        .all()
    )
    history_list = [
        {
            "status": h.status.value,
            "remarks": h.remarks,
            "created_at": h.created_at.isoformat() if h.created_at else None,
        }
        for h in history
    ]

    return {
        "id": application.id,
        "application_code": application.application_code,
        "verification_code": application.verification_code,
        "loan_type": application.loan_type.value,
        "status": application.status.value,
        "requested_amount": str(application.requested_amount),
        "loan_tenure_months": application.loan_tenure_months,
        "created_at": application.created_at.isoformat() if application.created_at else None,
        "submitted_to_branch_at": application.submitted_to_branch_at.isoformat() if application.submitted_to_branch_at else None,
        "branch_id": application.branch_id,
        "applicant": applicant_data,
        "detail": detail,
        "verifications": verification_list,
        "documents": doc_list,
        "ai_prediction": ai_data,
        "status_history": history_list,
    }


@router.post("/applications/{application_id}/decision")
def submit_manager_decision(
    application_id: int,
    payload: ManagerDecisionRequest,
    current_user: User = Depends(require_role("MANAGER")),
    db: Session = Depends(get_db),
):
    """
    Submit final decision (APPROVE, REJECT, REQUEST_CORRECTION) for an application.
    Strictly checks that the application belongs to this manager's branch.
    """
    manager = _get_own_manager(current_user, db)

    application = (
        db.query(LoanApplication)
        .filter(LoanApplication.id == application_id)
        .first()
    )
    if not application:
        raise HTTPException(status_code=404, detail="Application not found.")

    if application.branch_id != manager.branch_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: You can only act on applications assigned to your branch."
        )

    decision_upper = payload.decision.upper()
    remarks = payload.remarks or f"Manager decision: {decision_upper}"

    if decision_upper == "APPROVE":
        application.status = ApplicationStatus.APPROVED
        action_type = ManagerActionType.APPROVE
    elif decision_upper == "REJECT":
        application.status = ApplicationStatus.REJECTED
        action_type = ManagerActionType.REJECT
    elif decision_upper in ("REQUEST_CORRECTION", "CORRECTION_REQUIRED", "CORRECTION"):
        application.status = ApplicationStatus.CORRECTION_REQUIRED
        action_type = ManagerActionType.REQUEST_CORRECTION
    else:
        raise HTTPException(
            status_code=400,
            detail="Invalid decision. Must be 'APPROVE', 'REJECT', or 'REQUEST_CORRECTION'."
        )

    application.updated_at = datetime.now()

    # Record Manager Action
    action_rec = ManagerAction(
        application_id=application.id,
        manager_id=manager.id,
        action=action_type,
        reason=remarks,
    )
    db.add(action_rec)

    # Record status history
    db.add(
        ApplicationStatusHistory(
            application_id=application.id,
            status=application.status,
            changed_by_user_id=current_user.id,
            remarks=remarks,
        )
    )

    db.commit()
    db.refresh(application)

    return {
        "message": f"Application {application.application_code} updated to {application.status.value}",
        "application_id": application.id,
        "application_code": application.application_code,
        "status": application.status.value,
        "decision": decision_upper,
        "remarks": remarks,
    }


# Backwards compatibility alias for /applications/{application_id}/verify
@router.post("/applications/{application_id}/verify")
def verify_application_alias(
    application_id: int,
    verification_data: dict,
    current_user: User = Depends(require_role("MANAGER")),
    db: Session = Depends(get_db),
):
    decision_val = verification_data.get("decision", "APPROVE")
    comments_val = verification_data.get("comments", "")
    req = ManagerDecisionRequest(decision=decision_val, remarks=comments_val)
    return submit_manager_decision(application_id, req, current_user, db)


@router.get("/applications/{application_id}/report")
def get_manager_application_report(
    application_id: int,
    inline: bool = True,
    current_user: User = Depends(require_role("MANAGER")),
    db: Session = Depends(get_db),
):
    """View/download the generated application PDF report for branch review."""
    manager = _get_own_manager(current_user, db)
    application = (
        db.query(LoanApplication)
        .filter(LoanApplication.id == application_id)
        .first()
    )
    if not application:
        raise HTTPException(status_code=404, detail="Application not found.")

    if application.branch_id != manager.branch_id:
        raise HTTPException(status_code=403, detail="Not authorized to access reports for another branch.")

    applicant = application.applicant
    monthly_inc = 50000.0
    existing_emi_val = 0.0
    detail_dict: Dict[str, Any] = {}

    if application.loan_type == LoanType.EDUCATION and application.education_loan_detail:
        d = application.education_loan_detail
        detail_dict = {
            "student_name": d.student_name,
            "student_age": d.student_age,
            "institution": d.institution,
            "course": d.course,
            "course_duration_months": d.course_duration_months,
            "tuition_fee": float(d.tuition_fee),
            "total_education_cost": float(d.total_education_cost or d.tuition_fee),
            "repayment_burden_ratio": str(d.repayment_burden_ratio),
            "affordability_flag": d.affordability_flag.value if d.affordability_flag else "AFFORDABLE",
        }
        monthly_inc = float(d.applicant_income or d.co_applicant_income or 50000)
        existing_emi_val = float(d.existing_obligations or 0)
    elif application.loan_type == LoanType.PERSONAL and application.personal_loan_detail:
        d = application.personal_loan_detail
        detail_dict = {
            "age": d.age,
            "employment_type": d.employment_type.value,
            "monthly_income": float(d.monthly_income),
            "annual_income": float(d.annual_income or 0),
            "dti_ratio": str(d.dti_ratio),
            "emi_affordability_flag": d.emi_affordability_flag.value if d.emi_affordability_flag else "AFFORDABLE",
        }
        monthly_inc = float(d.monthly_income)
        existing_emi_val = float(d.existing_emi or 0)
    elif application.loan_type == LoanType.HOME and application.home_loan_detail:
        d = application.home_loan_detail
        detail_dict = {
            "monthly_income": float(d.monthly_income),
            "property_value": float(d.property_value),
            "dti_ratio": str(d.dti_ratio),
            "ltv_ratio": str(d.ltv_ratio),
            "estimated_emi": str(d.estimated_emi),
            "emi_affordability_flag": d.emi_affordability_flag.value if d.emi_affordability_flag else "AFFORDABLE",
        }
        monthly_inc = float(d.monthly_income)
        existing_emi_val = float(d.existing_emi or 0)

    verifications = db.query(VerificationResult).filter(VerificationResult.application_id == application.id).all()
    comp_rows = [
        {
            "field_name": v.field_name,
            "entered_value": v.applicant_value,
            "extracted_value": v.document_value,
            "match_status": v.match_status.value,
            "remarks": "Validated against OCR extraction" if v.match_status == MatchStatus.CONSISTENT else "Discrepancy noted",
        }
        for v in verifications
    ]

    ai_pred = db.query(AIPrediction).filter(AIPrediction.application_id == application.id).order_by(AIPrediction.id.desc()).first()
    risk = db.query(RiskAssessment).filter(RiskAssessment.application_id == application.id).order_by(RiskAssessment.id.desc()).first()

    ai_details = {
        "eligible": ai_pred.eligibility == "ELIGIBLE" if ai_pred else True,
        "probability": float(ai_pred.eligibility_probability) if ai_pred else 0.75,
        "score": int(float(ai_pred.eligibility_probability) * 100) if ai_pred else 75,
        "risk_level": risk.risk_level.value if risk else "LOW",
        "reasoning": risk.contributing_factors[0] if (risk and risk.contributing_factors) else "Standard evaluation",
    }

    app_data = {
        "application_code": application.application_code,
        "verification_code": application.verification_code,
        "loan_type": application.loan_type.value,
        "status": application.status.value,
        "applicant_name": applicant.full_name if applicant else "N/A",
        "applicant_email": applicant.user.email if (applicant and applicant.user) else "N/A",
        "applicant_phone": applicant.user.phone if (applicant and applicant.user) else "N/A",
        "branch_name": application.branch.branch_name if application.branch else "Main Branch",
        "assigned_manager_name": manager.full_name,
        "monthly_income": monthly_inc,
        "existing_emi": existing_emi_val,
        "requested_amount": float(application.requested_amount),
        "loan_tenure_months": application.loan_tenure_months,
        "detail": detail_dict,
        "ocr_comparison": {"comparison_table": comp_rows},
        "ai_prediction": ai_details,
    }

    pdf_bytes = report_generator.generate_application_report(app_data)
    disposition = "inline" if inline else "attachment"

    return StreamingResponse(
        iter([pdf_bytes]),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"{disposition}; filename=loan_report_{application.application_code}.pdf",
            "Content-Type": "application/pdf",
        },
    )
