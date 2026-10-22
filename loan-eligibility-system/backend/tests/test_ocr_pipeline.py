"""
Test script for the OCR Engine and Report Pipeline.
"""
import os
import sys

# Add backend to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.services.ocr_engine import ocr_engine
from app.services.ml_engine import ml_engine
from app.services.report_generator import report_generator

def test_ocr_extraction_and_comparison():
    print("[1] Testing OCR text parsing on simulated Education Loan documents...")
    sample_admission_text = """
    ANNA UNIVERSITY CHENNAI
    OFFICE OF ADMISSIONS
    
    PROVISIONAL ADMISSION LETTER
    Date: 15-July-2024
    
    This is to certify that Gobika T (DOB: 12/05/2003)
    has been provisionally admitted to the degree program:
    Course: B.Tech Computer Science and Engineering
    Duration: 4 years (48 months)
    
    Fee Payable for First Year / Tuition Fee: Rs. 2,50,000
    Total Estimated Cost: Rs. 10,00,000
    
    Contact: admissions@annauniv.edu | Phone: 9876543210
    """

    fields = ocr_engine.extract_fields(sample_admission_text, "ADMISSION_LETTER", "EDUCATION")
    print(f"Extracted fields: {fields}")

    assert fields["student_name"] is not None, "Student name should be extracted"
    assert "anna university" in (fields["institution"] or "").lower(), "Institution should be extracted"
    assert "b.tech" in (fields["course"] or "").lower(), "Course should be extracted"
    assert fields["tuition_fee"] is not None, "Tuition fee should be extracted"

    print("[2] Testing field cross-comparison...")
    user_entered = {
        "student_name": "Gobika T",
        "student_age": 21,
        "qualification": "HSC / 12th Standard",
        "institution": "Anna University",
        "course": "B.Tech Computer Science",
        "course_duration_months": 48,
        "tuition_fee": 250000,
        "applicant_income": 0,
        "co_applicant_income": 60000,
        "requested_amount": 250000,
        "loan_tenure_months": 48,
    }

    mock_docs = [
        {
            "filename": "admission_letter.pdf",
            "document_type": "ADMISSION_LETTER",
            "extracted_fields": fields,
            "confidence": 95.0,
        }
    ]

    comp_result = ocr_engine.compare_fields_comprehensive(user_entered, mock_docs, "EDUCATION")
    print(f"Comparison Result: Score={comp_result['consistency_score']}%, Status={comp_result['overall_status']}")
    for row in comp_result["comparison_table"]:
        field_n = row['field_name'].encode('ascii', 'ignore').decode()
        print(f"  * {field_n}: Entered='{row['entered_value']}', Extracted='{row['extracted_value']}', Status={row['match_status']}")

    assert comp_result["consistency_score"] >= 70, "Consistency score should be high"

    print("[3] Testing AI Eligibility prediction...")
    applicant_data = {
        "age": 21,
        "employment_duration_months": 24,
        "monthly_income": 60000,
        "credit_score": 750,
        "existing_emi": 5000,
        "number_of_dependents": 2,
        "requested_amount": 250000,
        "loan_tenure_months": 48,
    }
    is_elig, conf, details = ml_engine.predict_eligibility(applicant_data)
    print(f"AI Prediction: Eligible={is_elig}, Confidence={details.get('confidence')}%, Risk={details.get('risk_level')}")

    print("[4] Testing PDF Report generation...")
    report_data = {
        "application_code": "EDU-2024-TEST01",
        "verification_code": "V-998811",
        "loan_type": "EDUCATION",
        "status": "DOCUMENTS_UPLOADED",
        "applicant_name": "Gobika T",
        "applicant_email": "gobika@example.com",
        "applicant_phone": "9876543210",
        "requested_amount": 250000,
        "loan_tenure_months": 48,
        "monthly_income": 60000,
        "existing_emi": 5000,
        "detail": user_entered,
        "calculated": {"total_education_cost": "1000000", "repayment_burden_ratio": "0.15", "affordability_flag": "AFFORDABLE"},
        "ocr_comparison": comp_result,
        "ai_prediction": details,
    }
    pdf_bytes = report_generator.generate_application_report(report_data)
    print(f"Generated PDF bytes length: {len(pdf_bytes)} bytes")
    assert len(pdf_bytes) > 1000, "PDF should be generated with non-empty bytes"

    print("ALL TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    test_ocr_extraction_and_comparison()
