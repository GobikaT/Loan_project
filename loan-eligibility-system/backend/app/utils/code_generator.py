"""
Generates unique Application IDs and Verification Codes (Section 27).

Application ID format:  LN-<TYPE>-<YEAR>-<sequence>   e.g. LN-EDU-2026-001245
Verification Code:      6-character alphanumeric, e.g. 8F4K29

Both are checked against the database for uniqueness before being accepted,
so a collision (astronomically unlikely with these lengths) is retried
rather than silently accepted.
"""
import secrets
import string
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models.loan_application import LoanApplication

LOAN_TYPE_PREFIX = {
    "PERSONAL": "PER",
    "HOME": "HOM",
    "EDUCATION": "EDU",
}

_CODE_ALPHABET = string.ascii_uppercase + string.digits


def _random_verification_code(length: int = 6) -> str:
    return "".join(secrets.choice(_CODE_ALPHABET) for _ in range(length))


def generate_verification_code(db: Session) -> str:
    for _ in range(10):
        code = _random_verification_code()
        exists = db.query(LoanApplication).filter(LoanApplication.verification_code == code).first()
        if not exists:
            return code
    raise RuntimeError("Could not generate a unique verification code after 10 attempts.")


def generate_application_code(db: Session, loan_type: str) -> str:
    prefix = LOAN_TYPE_PREFIX.get(loan_type, "GEN")
    year = datetime.now(timezone.utc).year

    count_this_year = (
        db.query(LoanApplication)
        .filter(LoanApplication.application_code.like(f"LN-{prefix}-{year}-%"))
        .count()
    )
    for attempt in range(count_this_year + 1, count_this_year + 11):
        candidate = f"LN-{prefix}-{year}-{attempt:06d}"
        exists = db.query(LoanApplication).filter(LoanApplication.application_code == candidate).first()
        if not exists:
            return candidate
    raise RuntimeError("Could not generate a unique application code after 10 attempts.")
