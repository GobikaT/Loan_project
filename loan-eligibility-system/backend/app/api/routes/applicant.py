"""
Applicant routes with integrated OCR Document Analysis, Field Cross-Verification,
AI Eligibility Screening, and PDF Report Generation.
"""
import os
import json
import shutil
from decimal import Decimal
from datetime import datetime
from typing import Optional, List, Dict, Any

from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile, Form
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.deps import require_role
from app.db.session import get_db
from app.models.party import Applicant, Branch, BranchManager
from app.models.loan_application import LoanApplication
from app.models.loan_details import PersonalLoanDetail, HomeLoanDetail, EducationLoanDetail
from app.models.workflow import ApplicationStatusHistory, Report
from app.models.document import Document, OcrResult, ExtractedField
from app.models.assessment import VerificationResult, AIPrediction, RiskAssessment, Recommendation
from app.models.enums import (
    LoanType,
    ApplicationStatus,
    DocumentType,
    OcrStatus,
    MatchStatus,
    Eligibility,
    RiskLevel,
)
from app.models.user import User
from app.schemas.loan_application import (
    PersonalLoanCreate,
    HomeLoanCreate,
    EducationLoanCreate,
    LoanApplicationCreatedResponse,
)
from app.services import financial_engine
from app.services.ocr_engine import ocr_engine
from app.services.ml_engine import ml_engine
from app.services.report_generator import report_generator
from app.utils.code_generator import generate_application_code, generate_verification_code

router = APIRouter(prefix="/api/applicant", tags=["applicant"])


def _get_own_applicant(current_user: User, db: Session) -> Applicant:
    applicant = db.query(Applicant).filter(Applicant.user_id == current_user.id).first()
    if not applicant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Applicant profile not found.")
    return applicant


def _resolve_branch_and_manager(branch_id: Optional[int], db: Session) -> tuple[Branch, BranchManager]:
    if not branch_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Branch selection is required. Please select a valid branch."
        )
    branch = db.query(Branch).filter(Branch.id == branch_id, Branch.is_active.is_(True)).first()
    if not branch:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Selected branch (ID: {branch_id}) does not exist or is inactive."
        )
    manager = db.query(BranchManager).filter(
        BranchManager.branch_id == branch.id,
        BranchManager.is_active.is_(True)
    ).first()
    if not manager:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Branch '{branch.branch_name}' currently has no assigned Branch Manager. Please select another active branch or contact bank administration."
        )
    return branch, manager


def _record_status_history(db: Session, application: LoanApplication, user: User, remarks: str) -> None:
    db.add(
        ApplicationStatusHistory(
            application_id=application.id,
            status=application.status,
            changed_by_user_id=user.id,
            remarks=remarks,
        )
    )


def _process_application_pipeline(
    application: LoanApplication,
    applicant: Applicant,
    current_user: User,
    user_entered_dict: Dict[str, Any],
    uploaded_files: List[UploadFile],
    financial_result: Dict[str, Any],
    db: Session,
) -> Dict[str, Any]:
    """
    Executes the end-to-end OCR processing, field comparison, AI prediction,
    and report generation pipeline.
    """
    upload_dir = os.path.join("uploads", str(application.id))
    os.makedirs(upload_dir, exist_ok=True)

    extracted_docs = []

    # 1. Process each uploaded document with OCR
    for upload in uploaded_files:
        if not upload.filename:
            continue
        try:
            safe_filename = os.path.basename(upload.filename)
            saved_path = os.path.join(upload_dir, f"{int(datetime.now().timestamp())}_{safe_filename}")
            
            with open(saved_path, "wb") as f:
                content = upload.file.read()
                f.write(content)

            file_size = len(content)
            mime = upload.content_type or "application/octet-stream"

            # Run OCR extraction
            raw_text, ocr_conf = ocr_engine.extract_text_from_file(saved_path, mime)
            doc_type_str = ocr_engine.detect_document_type(raw_text, safe_filename)
            
            # Map doc_type_str to DocumentType enum safely
            try:
                doc_enum = DocumentType[doc_type_str]
            except Exception:
                doc_enum = DocumentType.OTHER

            # Create Document record
            doc_record = Document(
                application_id=application.id,
                document_type=doc_enum,
                original_filename=safe_filename,
                stored_file_path=saved_path,
                file_size_bytes=file_size,
                mime_type=mime,
                uploaded_by_user_id=current_user.id,
            )
            db.add(doc_record)
            db.flush()

            # Extract structured fields
            fields = ocr_engine.extract_fields(raw_text, doc_type_str, application.loan_type.value)

            # Create OcrResult record
            ocr_res = OcrResult(
                document_id=doc_record.id,
                raw_extracted_text=raw_text[:4000] if raw_text else "",
                detected_document_type=doc_type_str,
                ocr_confidence=Decimal(str(round(ocr_conf, 4))),
                ocr_engine="EasyOCR+PDFParser",
                status=OcrStatus.COMPLETED if raw_text else OcrStatus.FAILED,
                processed_at=datetime.now(),
            )
            db.add(ocr_res)
            db.flush()

            # Save individual extracted fields
            for k, v in fields.items():
                if v is not None and k not in ("confidence", "raw_text_snippet", "detected_document_type"):
                    field_record = ExtractedField(
                        ocr_result_id=ocr_res.id,
                        raw_label=k,
                        normalized_field=k,
                        extracted_value=str(v)[:250],
                        mapping_confidence=Decimal(str(round(ocr_conf, 4))),
                        mapping_method="Regex+PatternMatcher",
                        needs_verification=False,
                    )
                    db.add(field_record)

            extracted_docs.append({
                "document_id": doc_record.id,
                "filename": safe_filename,
                "document_type": doc_type_str,
                "status": "success",
                "extracted_fields": fields,
                "confidence": ocr_conf * 100 if ocr_conf <= 1.0 else ocr_conf,
                "raw_snippet": raw_text[:200] if raw_text else "",
            })

        except Exception as e:
            print(f"[Pipeline Error] Failed processing document {upload.filename}: {e}")
            extracted_docs.append({
                "filename": upload.filename,
                "status": "error",
                "error": str(e),
                "extracted_fields": {},
                "confidence": 0,
            })

    # If documents were uploaded, update status
    if extracted_docs:
        application.status = ApplicationStatus.DOCUMENTS_UPLOADED

    # 2. Compare user-entered details against OCR extracted data
    comparison = ocr_engine.compare_fields_comprehensive(
        user_entered=user_entered_dict,
        extracted_documents=extracted_docs,
        loan_type=application.loan_type.value,
    )

    # Save verification results to DB
    for item in comparison.get("comparison_table", []):
        try:
            m_status_enum = MatchStatus[item.get("match_status", "NEEDS_VERIFICATION")]
        except Exception:
            m_status_enum = MatchStatus.NEEDS_VERIFICATION

        vr = VerificationResult(
            application_id=application.id,
            field_name=item.get("field_name", item.get("key", "unknown")),
            applicant_value=str(item.get("entered_value", ""))[:250],
            document_value=str(item.get("extracted_value", ""))[:250],
            match_status=m_status_enum,
        )
        db.add(vr)

    # 3. AI Eligibility & Risk Assessment
    monthly_inc = float(
        user_entered_dict.get("monthly_income")
        or user_entered_dict.get("applicant_income")
        or 50000
    )
    existing_emi_val = float(
        user_entered_dict.get("existing_emi")
        or user_entered_dict.get("existing_obligations")
        or 0
    )
    applicant_age = int(
        user_entered_dict.get("age")
        or user_entered_dict.get("student_age")
        or 25
    )
    credit_score_val = int(user_entered_dict.get("credit_score") or 720)

    applicant_data = {
        "age": applicant_age,
        "employment_duration_months": int(user_entered_dict.get("employment_duration_months", 24)),
        "monthly_income": monthly_inc,
        "credit_score": credit_score_val,
        "existing_emi": existing_emi_val,
        "number_of_dependents": int(user_entered_dict.get("number_of_dependents", 1)),
        "requested_amount": float(application.requested_amount),
        "loan_tenure_months": application.loan_tenure_months,
    }

    is_eligible, prob, ai_details = ml_engine.predict_eligibility(applicant_data)

    # STRICT OCR / IDENTITY MISMATCH OVERRIDE:
    # If applicant entered name does not match uploaded documents, or cross-document conflict exists:
    is_mismatch = (comparison.get("overall_status") == "MISMATCH_DETECTED")
    if is_mismatch:
        is_eligible = False
        prob = min(float(prob), 0.20)
        ai_details["eligible"] = False
        ai_details["risk_level"] = "HIGH"
        ai_details["decision"] = "FLAGGED_DOCUMENT_MISMATCH"
        ai_details["score"] = min(ai_details.get("score", 70), 30)
        mismatch_note = f"CRITICAL IDENTITY/DOCUMENT MISMATCH: User-entered applicant details do not match uploaded verification documents ({comparison.get('notes', 'Mismatch detected')}). Document integrity verification failed."
        ai_details["reasoning"] = mismatch_note
        if isinstance(ai_details.get("factors"), list):
            ai_details["factors"].insert(0, "Strict Document Verification: Mismatch detected between application details and uploaded documents.")
        elif isinstance(ai_details.get("factors"), dict):
            ai_details["factors"]["negative_factors"] = ai_details["factors"].get("negative_factors", []) + ["Document Name/Field Mismatch Detected"]

    # Save AI Prediction to DB
    ai_pred = AIPrediction(
        application_id=application.id,
        model_name="LoanEligibilityLogisticModel",
        model_version="1.0.0",
        eligibility=Eligibility.ELIGIBLE if is_eligible else Eligibility.NEEDS_REVIEW,
        eligibility_probability=Decimal(str(round(prob, 5))),
        positive_factors=["Income within acceptable threshold", "Credit profile active"] if is_eligible else [],
        negative_factors=(
            ["CRITICAL: Name or identity mismatch between entered details and uploaded documents"]
            if is_mismatch
            else ([] if is_eligible else ["High obligation or tight repayment ratio"])
        ),
    )
    db.add(ai_pred)

    # Save Risk Assessment to DB
    risk_level_str = ai_details.get("risk_level", "LOW")
    try:
        r_level_enum = RiskLevel[risk_level_str]
    except Exception:
        r_level_enum = RiskLevel.MEDIUM

    risk_assess = RiskAssessment(
        application_id=application.id,
        risk_level=r_level_enum,
        risk_score=Decimal(str(round(1.0 - prob, 4))),
        contributing_factors=[ai_details.get("reasoning", "")],
    )
    db.add(risk_assess)

    # Save Recommendation
    rec = Recommendation(
        application_id=application.id,
        recommended_min_amount=Decimal(str(float(application.requested_amount) * 0.8)),
        recommended_max_amount=Decimal(str(float(application.requested_amount))),
        notes=f"AI Recommendation: {'Eligible' if is_eligible else 'Review Needed'}. Risk Level: {risk_level_str}.",
    )
    db.add(rec)

    # 4. Generate Application PDF Report and Submit to Branch
    application.status = ApplicationStatus.SUBMITTED_TO_BRANCH
    application.submitted_to_branch_at = datetime.now()

    branch_name_str = application.branch.branch_name if application.branch else "Main Branch"
    manager_name_str = application.assigned_manager.full_name if application.assigned_manager else "Branch Manager"
    _record_status_history(
        db,
        application,
        current_user,
        f"AI verification completed. Application submitted to {branch_name_str} (Assigned Manager: {manager_name_str}).",
    )

    app_report_data = {
        "application_code": application.application_code,
        "verification_code": application.verification_code,
        "loan_type": application.loan_type.value,
        "status": application.status.value,
        "applicant_name": applicant.full_name,
        "applicant_email": current_user.email,
        "applicant_phone": current_user.phone,
        "branch_name": branch_name_str,
        "assigned_manager_name": manager_name_str,
        "requested_amount": application.requested_amount,
        "loan_tenure_months": application.loan_tenure_months,
        "monthly_income": monthly_inc,
        "existing_emi": existing_emi_val,
        "calculated": financial_result,
        "detail": user_entered_dict,
        "ocr_comparison": comparison,
        "ai_prediction": ai_details,
    }

    try:
        pdf_bytes = report_generator.generate_application_report(app_report_data)
        report_file_path = os.path.join(upload_dir, f"report_{application.application_code}.pdf")
        with open(report_file_path, "wb") as rf:
            rf.write(pdf_bytes)

        report_record = Report(
            application_id=application.id,
            file_path=report_file_path,
        )
        db.add(report_record)
    except Exception as e:
        print(f"[Report Error] Failed saving report PDF: {e}")

    db.commit()
    db.refresh(application)

    return {
        "id": application.id,
        "application_code": application.application_code,
        "verification_code": application.verification_code,
        "loan_type": application.loan_type.value,
        "status": application.status.value,
        "branch_id": application.branch_id,
        "branch_name": branch_name_str,
        "assigned_manager_name": manager_name_str,
        "calculated": {k: str(v) for k, v in financial_result.items() if k != "warnings"},
        "warnings": financial_result.get("warnings", []),
        "documents": extracted_docs,
        "ocr_comparison": comparison,
        "ai_prediction": ai_details,
        "report_url": f"/api/applicant/applications/{application.id}/report",
    }


# ==================== PROFILE & DASHBOARD ====================

@router.get("/me")
def get_my_profile(current_user: User = Depends(require_role("APPLICANT")), db: Session = Depends(get_db)):
    applicant = _get_own_applicant(current_user, db)
    return {
        "id": applicant.id,
        "full_name": applicant.full_name,
        "email": current_user.email,
        "phone": current_user.phone,
        "date_of_birth": str(applicant.date_of_birth) if applicant.date_of_birth else None,
        "address": applicant.address,
    }


@router.get("/dashboard-summary")
def get_dashboard_summary(current_user: User = Depends(require_role("APPLICANT")), db: Session = Depends(get_db)):
    applicant = _get_own_applicant(current_user, db)
    applications = (
        db.query(LoanApplication)
        .filter(LoanApplication.applicant_id == applicant.id)
        .order_by(LoanApplication.created_at.desc())
        .all()
    )

    applied_loans = len(applications)
    total_loans = sum(
        1 for a in applications
        if a.status in (ApplicationStatus.APPROVED, ApplicationStatus.FINAL_BANK_PROCESSING)
    )
    existing_loan_amount = sum(
        (a.requested_amount for a in applications
         if a.status in (ApplicationStatus.APPROVED, ApplicationStatus.FINAL_BANK_PROCESSING)),
        Decimal("0"),
    )

    credit_score = None
    for a in applications:
        if a.loan_type == LoanType.PERSONAL and a.personal_loan_detail and a.personal_loan_detail.credit_score:
            credit_score = a.personal_loan_detail.credit_score
            break
        if a.loan_type == LoanType.HOME and a.home_loan_detail and a.home_loan_detail.credit_score:
            credit_score = a.home_loan_detail.credit_score
            break
        if a.loan_type == LoanType.EDUCATION and a.education_loan_detail and a.education_loan_detail.credit_score:
            credit_score = a.education_loan_detail.credit_score
            break

    return {
        "existing_loan_amount": str(existing_loan_amount) if total_loans > 0 else None,
        "applied_loans": applied_loans,
        "total_loans": total_loans,
        "credit_score": credit_score,
    }


@router.get("/branches")
def get_applicant_branches(
    current_user: User = Depends(require_role("APPLICANT")),
    db: Session = Depends(get_db),
):
    """
    Returns list of active branches available for loan application selection,
    displaying name, city, state, code, and assigned manager status.
    """
    branches = db.query(Branch).filter(Branch.is_active.is_(True)).order_by(Branch.branch_name).all()
    result = []
    for b in branches:
        mgr = db.query(BranchManager).filter(
            BranchManager.branch_id == b.id,
            BranchManager.is_active.is_(True)
        ).first()
        result.append({
            "id": b.id,
            "branch_code": b.branch_code,
            "branch_name": b.branch_name,
            "address": b.address,
            "city": b.city,
            "state": b.state,
            "ifsc_code": b.ifsc_code,
            "contact_phone": b.contact_phone,
            "has_manager": mgr is not None,
            "manager_name": mgr.full_name if mgr else None,
        })
    return result


@router.get("/applications")
def list_my_applications(current_user: User = Depends(require_role("APPLICANT")), db: Session = Depends(get_db)):
    applicant = _get_own_applicant(current_user, db)
    applications = (
        db.query(LoanApplication)
        .filter(LoanApplication.applicant_id == applicant.id)
        .order_by(LoanApplication.created_at.desc())
        .all()
    )
    result = []
    for a in applications:
        ai_pred = (
            db.query(AIPrediction)
            .filter(AIPrediction.application_id == a.id)
            .order_by(AIPrediction.id.desc())
            .first()
        )
        result.append({
            "id": a.id,
            "application_code": a.application_code,
            "verification_code": a.verification_code,
            "loan_type": a.loan_type.value,
            "status": a.status.value,
            "requested_amount": str(a.requested_amount),
            "loan_tenure_months": a.loan_tenure_months,
            "created_at": str(a.created_at),
            "branch_id": a.branch_id,
            "branch_name": a.branch.branch_name if a.branch else "Not Assigned",
            "branch_city": a.branch.city if a.branch else None,
            "assigned_manager_id": a.assigned_manager_id,
            "assigned_manager_name": a.assigned_manager.full_name if a.assigned_manager else "Pending Assignment",
            "ai_eligibility": ai_pred.eligibility.value if ai_pred else None,
            "ai_probability": float(ai_pred.eligibility_probability) if ai_pred else None,
        })
    return result


# ==================== LOAN SUBMISSION WITH OCR ====================

@router.post("/applications/education-with-docs")
async def create_education_loan_with_docs(
    data: str = Form(...),
    files: List[UploadFile] = File([]),
    current_user: User = Depends(require_role("APPLICANT")),
    db: Session = Depends(get_db),
):
    """
    Submit Education Loan with document attachments.
    Automatically executes OCR extraction, field cross-comparison with student details,
    AI eligibility assessment, and report generation.
    """
    applicant = _get_own_applicant(current_user, db)
    try:
        payload_dict = json.loads(data)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid form payload JSON format.")

    try:
        payload = EducationLoanCreate(**payload_dict)
    except Exception as e:
        raise HTTPException(status_code=422, detail=str(e))

    branch, manager = _resolve_branch_and_manager(payload.branch_id, db)

    fin_result = financial_engine.evaluate_education_loan(
        tuition_fee=payload.tuition_fee,
        other_expenses=payload.other_expenses,
        applicant_income=payload.applicant_income,
        co_applicant_income=payload.co_applicant_income,
        existing_obligations=payload.existing_obligations,
        requested_amount=payload.requested_amount,
        tenure_months=payload.loan_tenure_months,
    )

    application = LoanApplication(
        application_code=generate_application_code(db, LoanType.EDUCATION.value),
        verification_code=generate_verification_code(db),
        applicant_id=applicant.id,
        branch_id=branch.id,
        assigned_manager_id=manager.id,
        loan_type=LoanType.EDUCATION,
        requested_amount=payload.requested_amount,
        loan_tenure_months=payload.loan_tenure_months,
        status=ApplicationStatus.APPLICATION_CREATED,
        submitted_to_branch_at=datetime.now(),
    )
    db.add(application)
    db.flush()

    detail = EducationLoanDetail(
        application_id=application.id,
        student_name=payload.student_name,
        student_age=payload.student_age,
        qualification=payload.qualification,
        institution=payload.institution,
        course=payload.course,
        course_duration_months=payload.course_duration_months,
        tuition_fee=payload.tuition_fee,
        other_expenses=payload.other_expenses,
        applicant_income=payload.applicant_income,
        co_applicant_income=payload.co_applicant_income,
        existing_obligations=payload.existing_obligations,
        credit_score=payload.credit_score,
        total_education_cost=fin_result["total_education_cost"],
        requested_loan_percentage=fin_result["requested_loan_percentage"],
        repayment_burden_ratio=fin_result["repayment_burden_ratio"],
        affordability_flag=fin_result["affordability_flag"],
    )
    db.add(detail)
    db.flush()

    _record_status_history(db, application, current_user, "Education loan application created.")

    # Execute OCR, Field Comparison, AI Assessment & Report Pipeline
    result = _process_application_pipeline(
        application=application,
        applicant=applicant,
        current_user=current_user,
        user_entered_dict=payload_dict,
        uploaded_files=files,
        financial_result=fin_result,
        db=db,
    )
    return result


@router.post("/applications/personal-with-docs")
async def create_personal_loan_with_docs(
    data: str = Form(...),
    files: List[UploadFile] = File([]),
    current_user: User = Depends(require_role("APPLICANT")),
    db: Session = Depends(get_db),
):
    """
    Submit Personal Loan with document attachments.
    Executes OCR extraction, field cross-comparison, AI assessment, and report generation.
    """
    applicant = _get_own_applicant(current_user, db)
    try:
        payload_dict = json.loads(data)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid form payload JSON format.")

    try:
        payload = PersonalLoanCreate(**payload_dict)
    except Exception as e:
        raise HTTPException(status_code=422, detail=str(e))

    branch, manager = _resolve_branch_and_manager(payload.branch_id, db)

    fin_result = financial_engine.evaluate_personal_loan(
        monthly_income=payload.monthly_income,
        existing_emi=payload.existing_emi,
        requested_amount=payload.requested_amount,
        tenure_months=payload.loan_tenure_months,
    )

    application = LoanApplication(
        application_code=generate_application_code(db, LoanType.PERSONAL.value),
        verification_code=generate_verification_code(db),
        applicant_id=applicant.id,
        branch_id=branch.id,
        assigned_manager_id=manager.id,
        loan_type=LoanType.PERSONAL,
        requested_amount=payload.requested_amount,
        loan_tenure_months=payload.loan_tenure_months,
        status=ApplicationStatus.APPLICATION_CREATED,
        submitted_to_branch_at=datetime.now(),
    )
    db.add(application)
    db.flush()

    detail = PersonalLoanDetail(
        application_id=application.id,
        age=payload.age,
        gender=payload.gender,
        employment_type=payload.employment_type,
        employment_duration_months=payload.employment_duration_months,
        monthly_income=payload.monthly_income,
        credit_score=payload.credit_score,
        existing_loans_count=payload.existing_loans_count,
        existing_emi=payload.existing_emi,
        number_of_dependents=payload.number_of_dependents,
        annual_income=fin_result["annual_income"],
        dti_ratio=fin_result["dti_ratio"],
        disposable_income=fin_result["disposable_income"],
        emi_affordability_flag=fin_result["emi_affordability_flag"],
    )
    db.add(detail)
    db.flush()

    _record_status_history(db, application, current_user, "Personal loan application created.")

    # Execute Pipeline
    result = _process_application_pipeline(
        application=application,
        applicant=applicant,
        current_user=current_user,
        user_entered_dict=payload_dict,
        uploaded_files=files,
        financial_result=fin_result,
        db=db,
    )
    return result


@router.post("/applications/home-with-docs")
async def create_home_loan_with_docs(
    data: str = Form(...),
    files: List[UploadFile] = File([]),
    current_user: User = Depends(require_role("APPLICANT")),
    db: Session = Depends(get_db),
):
    """
    Submit Home Loan with document attachments.
    Executes OCR extraction, field cross-comparison, AI assessment, and report generation.
    """
    applicant = _get_own_applicant(current_user, db)
    try:
        payload_dict = json.loads(data)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid form payload JSON format.")

    try:
        payload = HomeLoanCreate(**payload_dict)
    except Exception as e:
        raise HTTPException(status_code=422, detail=str(e))

    fin_result = financial_engine.evaluate_home_loan(
        monthly_income=payload.monthly_income,
        co_applicant_income=payload.co_applicant_income,
        existing_emi=payload.existing_emi,
        existing_liabilities=payload.existing_liabilities,
        requested_amount=payload.requested_amount,
        property_value=payload.property_value,
        down_payment=payload.down_payment,
        tenure_months=payload.loan_tenure_months,
    )

    branch, manager = _resolve_branch_and_manager(payload.branch_id, db)

    application = LoanApplication(
        application_code=generate_application_code(db, LoanType.HOME.value),
        verification_code=generate_verification_code(db),
        applicant_id=applicant.id,
        branch_id=branch.id,
        assigned_manager_id=manager.id,
        loan_type=LoanType.HOME,
        requested_amount=payload.requested_amount,
        loan_tenure_months=payload.loan_tenure_months,
        status=ApplicationStatus.APPLICATION_CREATED,
        submitted_to_branch_at=datetime.now(),
    )
    db.add(application)
    db.flush()

    detail = HomeLoanDetail(
        application_id=application.id,
        employment_type=payload.employment_type,
        monthly_income=payload.monthly_income,
        co_applicant_income=payload.co_applicant_income,
        credit_score=payload.credit_score,
        existing_loans_count=payload.existing_loans_count,
        existing_emi=payload.existing_emi,
        property_value=payload.property_value,
        down_payment=payload.down_payment,
        existing_liabilities=payload.existing_liabilities,
        dti_ratio=fin_result["dti_ratio"],
        ltv_ratio=fin_result["ltv_ratio"],
        estimated_emi=fin_result["estimated_emi"],
        emi_affordability_flag=fin_result["emi_affordability_flag"],
        loan_to_income_ratio=fin_result["loan_to_income_ratio"],
    )
    db.add(detail)
    db.flush()

    _record_status_history(db, application, current_user, "Home loan application created.")

    # Execute Pipeline
    result = _process_application_pipeline(
        application=application,
        applicant=applicant,
        current_user=current_user,
        user_entered_dict=payload_dict,
        uploaded_files=files,
        financial_result=fin_result,
        db=db,
    )
    return result


# Standard JSON endpoints backward compatibility
@router.post("/applications/personal", response_model=LoanApplicationCreatedResponse, status_code=status.HTTP_201_CREATED)
def create_personal_loan_application(
    payload: PersonalLoanCreate,
    current_user: User = Depends(require_role("APPLICANT")),
    db: Session = Depends(get_db),
):
    applicant = _get_own_applicant(current_user, db)
    branch, manager = _resolve_branch_and_manager(payload.branch_id, db)
    result = financial_engine.evaluate_personal_loan(
        monthly_income=payload.monthly_income,
        existing_emi=payload.existing_emi,
        requested_amount=payload.requested_amount,
        tenure_months=payload.loan_tenure_months,
    )

    application = LoanApplication(
        application_code=generate_application_code(db, LoanType.PERSONAL.value),
        verification_code=generate_verification_code(db),
        applicant_id=applicant.id,
        branch_id=branch.id,
        assigned_manager_id=manager.id,
        loan_type=LoanType.PERSONAL,
        requested_amount=payload.requested_amount,
        loan_tenure_months=payload.loan_tenure_months,
        status=ApplicationStatus.APPLICATION_CREATED,
        submitted_to_branch_at=datetime.now(),
    )
    db.add(application)
    db.flush()

    detail = PersonalLoanDetail(
        application_id=application.id,
        age=payload.age,
        gender=payload.gender,
        employment_type=payload.employment_type,
        employment_duration_months=payload.employment_duration_months,
        monthly_income=payload.monthly_income,
        credit_score=payload.credit_score,
        existing_loans_count=payload.existing_loans_count,
        existing_emi=payload.existing_emi,
        number_of_dependents=payload.number_of_dependents,
        annual_income=result["annual_income"],
        dti_ratio=result["dti_ratio"],
        disposable_income=result["disposable_income"],
        emi_affordability_flag=result["emi_affordability_flag"],
    )
    db.add(detail)
    _record_status_history(db, application, current_user, "Personal loan application created.")
    db.commit()
    db.refresh(application)

    return LoanApplicationCreatedResponse(
        id=application.id,
        application_code=application.application_code,
        verification_code=application.verification_code,
        loan_type=application.loan_type.value,
        status=application.status.value,
        calculated={k: str(v) for k, v in result.items() if k != "warnings"},
        warnings=result["warnings"],
    )


@router.post("/applications/home", response_model=LoanApplicationCreatedResponse, status_code=status.HTTP_201_CREATED)
def create_home_loan_application(
    payload: HomeLoanCreate,
    current_user: User = Depends(require_role("APPLICANT")),
    db: Session = Depends(get_db),
):
    applicant = _get_own_applicant(current_user, db)
    branch, manager = _resolve_branch_and_manager(payload.branch_id, db)
    result = financial_engine.evaluate_home_loan(
        monthly_income=payload.monthly_income,
        co_applicant_income=payload.co_applicant_income,
        existing_emi=payload.existing_emi,
        existing_liabilities=payload.existing_liabilities,
        requested_amount=payload.requested_amount,
        property_value=payload.property_value,
        down_payment=payload.down_payment,
        tenure_months=payload.loan_tenure_months,
    )

    application = LoanApplication(
        application_code=generate_application_code(db, LoanType.HOME.value),
        verification_code=generate_verification_code(db),
        applicant_id=applicant.id,
        branch_id=branch.id,
        assigned_manager_id=manager.id,
        loan_type=LoanType.HOME,
        requested_amount=payload.requested_amount,
        loan_tenure_months=payload.loan_tenure_months,
        status=ApplicationStatus.APPLICATION_CREATED,
        submitted_to_branch_at=datetime.now(),
    )
    db.add(application)
    db.flush()

    detail = HomeLoanDetail(
        application_id=application.id,
        employment_type=payload.employment_type,
        monthly_income=payload.monthly_income,
        co_applicant_income=payload.co_applicant_income,
        credit_score=payload.credit_score,
        existing_loans_count=payload.existing_loans_count,
        existing_emi=payload.existing_emi,
        property_value=payload.property_value,
        down_payment=payload.down_payment,
        existing_liabilities=payload.existing_liabilities,
        dti_ratio=result["dti_ratio"],
        ltv_ratio=result["ltv_ratio"],
        estimated_emi=result["estimated_emi"],
        emi_affordability_flag=result["emi_affordability_flag"],
        loan_to_income_ratio=result["loan_to_income_ratio"],
    )
    db.add(detail)
    _record_status_history(db, application, current_user, "Home loan application created.")
    db.commit()
    db.refresh(application)

    return LoanApplicationCreatedResponse(
        id=application.id,
        application_code=application.application_code,
        verification_code=application.verification_code,
        loan_type=application.loan_type.value,
        status=application.status.value,
        calculated={k: str(v) for k, v in result.items() if k != "warnings"},
        warnings=result["warnings"],
    )


@router.post("/applications/education", response_model=LoanApplicationCreatedResponse, status_code=status.HTTP_201_CREATED)
def create_education_loan_application(
    payload: EducationLoanCreate,
    current_user: User = Depends(require_role("APPLICANT")),
    db: Session = Depends(get_db),
):
    applicant = _get_own_applicant(current_user, db)
    branch, manager = _resolve_branch_and_manager(payload.branch_id, db)
    result = financial_engine.evaluate_education_loan(
        tuition_fee=payload.tuition_fee,
        other_expenses=payload.other_expenses,
        applicant_income=payload.applicant_income,
        co_applicant_income=payload.co_applicant_income,
        existing_obligations=payload.existing_obligations,
        requested_amount=payload.requested_amount,
        tenure_months=payload.loan_tenure_months,
    )

    application = LoanApplication(
        application_code=generate_application_code(db, LoanType.EDUCATION.value),
        verification_code=generate_verification_code(db),
        applicant_id=applicant.id,
        branch_id=branch.id,
        assigned_manager_id=manager.id,
        loan_type=LoanType.EDUCATION,
        requested_amount=payload.requested_amount,
        loan_tenure_months=payload.loan_tenure_months,
        status=ApplicationStatus.APPLICATION_CREATED,
        submitted_to_branch_at=datetime.now(),
    )
    db.add(application)
    db.flush()

    detail = EducationLoanDetail(
        application_id=application.id,
        student_name=payload.student_name,
        student_age=payload.student_age,
        qualification=payload.qualification,
        institution=payload.institution,
        course=payload.course,
        course_duration_months=payload.course_duration_months,
        tuition_fee=payload.tuition_fee,
        other_expenses=payload.other_expenses,
        applicant_income=payload.applicant_income,
        co_applicant_income=payload.co_applicant_income,
        existing_obligations=payload.existing_obligations,
        credit_score=payload.credit_score,
        total_education_cost=result["total_education_cost"],
        requested_loan_percentage=result["requested_loan_percentage"],
        repayment_burden_ratio=result["repayment_burden_ratio"],
        affordability_flag=result["affordability_flag"],
    )
    db.add(detail)
    _record_status_history(db, application, current_user, "Education loan application created.")
    db.commit()
    db.refresh(application)

    return LoanApplicationCreatedResponse(
        id=application.id,
        application_code=application.application_code,
        verification_code=application.verification_code,
        loan_type=application.loan_type.value,
        status=application.status.value,
        calculated={k: str(v) for k, v in result.items() if k != "warnings"},
        warnings=result["warnings"],
    )


# ==================== APPLICATION DETAILS & VERIFICATION ====================

@router.get("/applications/{application_id}")
def get_my_application(
    application_id: int,
    current_user: User = Depends(require_role("APPLICANT")),
    db: Session = Depends(get_db),
):
    applicant = _get_own_applicant(current_user, db)
    application = (
        db.query(LoanApplication)
        .filter(LoanApplication.id == application_id, LoanApplication.applicant_id == applicant.id)
        .first()
    )
    if not application:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found.")

    detail: dict = {}
    if application.loan_type == LoanType.PERSONAL and application.personal_loan_detail:
        d = application.personal_loan_detail
        detail = {
            "age": d.age,
            "employment_type": d.employment_type.value,
            "monthly_income": str(d.monthly_income),
            "annual_income": str(d.annual_income) if d.annual_income is not None else None,
            "dti_ratio": str(d.dti_ratio) if d.dti_ratio is not None else None,
            "disposable_income": str(d.disposable_income) if d.disposable_income is not None else None,
            "emi_affordability_flag": d.emi_affordability_flag.value if d.emi_affordability_flag else None,
        }
    elif application.loan_type == LoanType.HOME and application.home_loan_detail:
        d = application.home_loan_detail
        detail = {
            "monthly_income": str(d.monthly_income),
            "property_value": str(d.property_value),
            "dti_ratio": str(d.dti_ratio) if d.dti_ratio is not None else None,
            "ltv_ratio": str(d.ltv_ratio) if d.ltv_ratio is not None else None,
            "estimated_emi": str(d.estimated_emi) if d.estimated_emi is not None else None,
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
            "total_education_cost": str(d.total_education_cost) if d.total_education_cost is not None else None,
            "requested_loan_percentage": str(d.requested_loan_percentage) if d.requested_loan_percentage is not None else None,
            "repayment_burden_ratio": str(d.repayment_burden_ratio) if d.repayment_burden_ratio is not None else None,
            "affordability_flag": d.affordability_flag.value if d.affordability_flag else None,
        }

    # Fetch verification results
    verifications = (
        db.query(VerificationResult)
        .filter(VerificationResult.application_id == application.id)
        .all()
    )
    verification_list = [
        {
            "field_name": v.field_name,
            "entered_value": v.applicant_value,
            "extracted_value": v.document_value,
            "match_status": v.match_status.value,
        }
        for v in verifications
    ]

    # Fetch documents
    docs = db.query(Document).filter(Document.application_id == application.id).all()
    doc_list = [
        {
            "id": doc.id,
            "filename": doc.original_filename,
            "document_type": doc.document_type.value,
            "uploaded_at": str(doc.uploaded_at),
            "ocr_status": doc.ocr_result.status.value if doc.ocr_result else "PENDING",
            "confidence": float(doc.ocr_result.ocr_confidence * 100) if doc.ocr_result and doc.ocr_result.ocr_confidence else 0.0,
        }
        for doc in docs
    ]

    return {
        "id": application.id,
        "application_code": application.application_code,
        "verification_code": application.verification_code,
        "loan_type": application.loan_type.value,
        "status": application.status.value,
        "requested_amount": str(application.requested_amount),
        "loan_tenure_months": application.loan_tenure_months,
        "created_at": str(application.created_at),
        "branch_id": application.branch_id,
        "branch_name": application.branch.branch_name if application.branch else "Not Assigned",
        "branch_city": application.branch.city if application.branch else None,
        "assigned_manager_id": application.assigned_manager_id,
        "assigned_manager_name": application.assigned_manager.full_name if application.assigned_manager else "Pending Assignment",
        "assigned_manager_phone": application.assigned_manager.phone if application.assigned_manager else None,
        "detail": detail,
        "verifications": verification_list,
        "documents": doc_list,
    }


# ==================== POST-CREATION DOCUMENT UPLOAD & OCR ====================

@router.post("/applications/{application_id}/upload-documents")
async def upload_documents(
    application_id: int,
    files: List[UploadFile] = File(...),
    current_user: User = Depends(require_role("APPLICANT")),
    db: Session = Depends(get_db),
):
    """Upload documents for an existing application and run OCR + Verification"""
    applicant = _get_own_applicant(current_user, db)
    application = (
        db.query(LoanApplication)
        .filter(
            LoanApplication.id == application_id,
            LoanApplication.applicant_id == applicant.id,
        )
        .first()
    )
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")

    user_entered_dict: Dict[str, Any] = {
        "requested_amount": float(application.requested_amount),
        "loan_tenure_months": application.loan_tenure_months,
    }
    fin_result: Dict[str, Any] = {}

    if application.loan_type == LoanType.EDUCATION and application.education_loan_detail:
        d = application.education_loan_detail
        user_entered_dict.update({
            "student_name": d.student_name,
            "student_age": d.student_age,
            "qualification": d.qualification,
            "institution": d.institution,
            "course": d.course,
            "course_duration_months": d.course_duration_months,
            "tuition_fee": float(d.tuition_fee),
            "applicant_income": float(d.applicant_income or 0),
            "monthly_income": float(d.applicant_income or 0),
        })
        fin_result = {
            "total_education_cost": str(d.total_education_cost),
            "repayment_burden_ratio": str(d.repayment_burden_ratio),
        }
    elif application.loan_type == LoanType.PERSONAL and application.personal_loan_detail:
        d = application.personal_loan_detail
        user_entered_dict.update({
            "full_name": applicant.full_name,
            "age": d.age,
            "monthly_income": float(d.monthly_income),
            "employment_type": d.employment_type.value,
        })
        fin_result = {
            "annual_income": str(d.annual_income),
            "dti_ratio": str(d.dti_ratio),
        }
    elif application.loan_type == LoanType.HOME and application.home_loan_detail:
        d = application.home_loan_detail
        user_entered_dict.update({
            "full_name": applicant.full_name,
            "monthly_income": float(d.monthly_income),
            "property_value": float(d.property_value),
            "employment_type": d.employment_type.value,
        })
        fin_result = {
            "dti_ratio": str(d.dti_ratio),
            "ltv_ratio": str(d.ltv_ratio),
        }

    return _process_application_pipeline(
        application=application,
        applicant=applicant,
        current_user=current_user,
        user_entered_dict=user_entered_dict,
        uploaded_files=files,
        financial_result=fin_result,
        db=db,
    )


@router.get("/applications/{application_id}/extracted-fields")
def get_extracted_fields(
    application_id: int,
    current_user: User = Depends(require_role("APPLICANT")),
    db: Session = Depends(get_db),
):
    """Get OCR extracted fields and document verifications for an application"""
    applicant = _get_own_applicant(current_user, db)
    application = (
        db.query(LoanApplication)
        .filter(
            LoanApplication.id == application_id,
            LoanApplication.applicant_id == applicant.id,
        )
        .first()
    )
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")

    docs = db.query(Document).filter(Document.application_id == application.id).all()
    results = []
    for doc in docs:
        fields = {}
        if doc.ocr_result:
            for ef in doc.ocr_result.extracted_fields:
                fields[ef.normalized_field] = ef.extracted_value
        results.append({
            "document_id": doc.id,
            "filename": doc.original_filename,
            "document_type": doc.document_type.value,
            "ocr_confidence": float(doc.ocr_result.ocr_confidence * 100) if doc.ocr_result and doc.ocr_result.ocr_confidence else 0,
            "extracted_fields": fields,
        })

    verifications = db.query(VerificationResult).filter(VerificationResult.application_id == application.id).all()
    comp_list = [
        {
            "field_name": v.field_name,
            "entered_value": v.applicant_value,
            "extracted_value": v.document_value,
            "match_status": v.match_status.value,
        }
        for v in verifications
    ]

    return {
        "application_id": application_id,
        "documents": results,
        "verifications": comp_list,
    }


# ==================== AI PREDICTIONS & RISK ====================

@router.get("/applications/{application_id}/ai-prediction")
def get_ai_prediction(
    application_id: int,
    current_user: User = Depends(require_role("APPLICANT")),
    db: Session = Depends(get_db),
):
    """Get AI prediction and eligibility assessment for an application"""
    applicant = _get_own_applicant(current_user, db)
    application = (
        db.query(LoanApplication)
        .filter(
            LoanApplication.id == application_id,
            LoanApplication.applicant_id == applicant.id,
        )
        .first()
    )
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")

    # Safe monthly income extraction based on loan type
    monthly_inc = 50000.0
    existing_emi_val = 0.0
    age_val = 25
    credit_val = 720

    if application.loan_type == LoanType.PERSONAL and application.personal_loan_detail:
        monthly_inc = float(application.personal_loan_detail.monthly_income or 50000)
        existing_emi_val = float(application.personal_loan_detail.existing_emi or 0)
        age_val = application.personal_loan_detail.age
        credit_val = application.personal_loan_detail.credit_score or 720
    elif application.loan_type == LoanType.HOME and application.home_loan_detail:
        monthly_inc = float(application.home_loan_detail.monthly_income or 50000)
        existing_emi_val = float(application.home_loan_detail.existing_emi or 0)
        credit_val = application.home_loan_detail.credit_score or 720
    elif application.loan_type == LoanType.EDUCATION and application.education_loan_detail:
        monthly_inc = float(application.education_loan_detail.applicant_income or application.education_loan_detail.co_applicant_income or 50000)
        existing_emi_val = float(application.education_loan_detail.existing_obligations or 0)
        age_val = application.education_loan_detail.student_age
        credit_val = application.education_loan_detail.credit_score or 720

    applicant_data = {
        "age": age_val,
        "employment_duration_months": 24,
        "monthly_income": monthly_inc,
        "credit_score": credit_val,
        "existing_emi": existing_emi_val,
        "number_of_dependents": 2,
        "requested_amount": float(application.requested_amount),
        "loan_tenure_months": application.loan_tenure_months or 60,
    }

    eligible, confidence, details = ml_engine.predict_eligibility(applicant_data)

    return {
        "application_id": application_id,
        "eligible": eligible,
        "confidence": details.get("confidence", 0),
        "risk_level": details.get("risk_level", "LOW"),
        "reasoning": details.get("reasoning", ""),
        "feature_importance": details.get("feature_importance", {}),
    }


@router.get("/applications/{application_id}/risk-assessment")
def get_risk_assessment(
    application_id: int,
    current_user: User = Depends(require_role("APPLICANT")),
    db: Session = Depends(get_db),
):
    """Get risk assessment for an application"""
    applicant = _get_own_applicant(current_user, db)
    application = (
        db.query(LoanApplication)
        .filter(
            LoanApplication.id == application_id,
            LoanApplication.applicant_id == applicant.id,
        )
        .first()
    )
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")

    monthly_inc = 50000.0
    existing_emi_val = 0.0
    if application.loan_type == LoanType.PERSONAL and application.personal_loan_detail:
        monthly_inc = float(application.personal_loan_detail.monthly_income or 50000)
        existing_emi_val = float(application.personal_loan_detail.existing_emi or 0)
    elif application.loan_type == LoanType.HOME and application.home_loan_detail:
        monthly_inc = float(application.home_loan_detail.monthly_income or 50000)
        existing_emi_val = float(application.home_loan_detail.existing_emi or 0)
    elif application.loan_type == LoanType.EDUCATION and application.education_loan_detail:
        monthly_inc = float(application.education_loan_detail.applicant_income or application.education_loan_detail.co_applicant_income or 50000)
        existing_emi_val = float(application.education_loan_detail.existing_obligations or 0)

    dti = (existing_emi_val + monthly_inc * 0.3) / max(monthly_inc, 1)
    if dti < 0.4:
        risk_level = "LOW"
    elif dti < 0.6:
        risk_level = "MEDIUM"
    else:
        risk_level = "HIGH"

    return {
        "application_id": application_id,
        "risk_level": risk_level,
        "dti_ratio": round(dti, 2),
        "factors": ["Income analyzed", "OCR Document Verification consistency evaluated"],
    }


# ==================== PDF REPORT GENERATION ====================

@router.get("/applications/{application_id}/report")
def get_application_report(
    application_id: int,
    inline: bool = False,
    current_user: User = Depends(require_role("APPLICANT")),
    db: Session = Depends(get_db),
):
    """Generate or retrieve comprehensive PDF report for an application"""
    applicant = _get_own_applicant(current_user, db)
    application = (
        db.query(LoanApplication)
        .filter(
            LoanApplication.id == application_id,
            LoanApplication.applicant_id == applicant.id,
        )
        .first()
    )
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")

    detail_dict: Dict[str, Any] = {}
    monthly_inc = 50000.0
    existing_emi_val = 0.0

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

    # Fetch verification comparison results
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

    # Calculate AI prediction
    applicant_data = {
        "age": detail_dict.get("age", detail_dict.get("student_age", 25)),
        "employment_duration_months": 24,
        "monthly_income": monthly_inc,
        "credit_score": 720,
        "existing_emi": existing_emi_val,
        "number_of_dependents": 2,
        "requested_amount": float(application.requested_amount),
        "loan_tenure_months": application.loan_tenure_months or 60,
    }
    is_elig, prob, ai_details = ml_engine.predict_eligibility(applicant_data)

    app_data = {
        "application_code": application.application_code,
        "verification_code": application.verification_code,
        "loan_type": application.loan_type.value,
        "status": application.status.value,
        "applicant_name": applicant.full_name,
        "applicant_email": current_user.email,
        "applicant_phone": current_user.phone or "N/A",
        "branch_name": application.branch.branch_name if application.branch else "Main Branch",
        "assigned_manager_name": application.assigned_manager.full_name if application.assigned_manager else "Branch Manager",
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
