"""
Authentication routes.

IMPORTANT (Section 5 of the spec):
  * There is ONLY a public registration endpoint for APPLICANTS.
  * Branch Managers and Admins can never self-register -- their accounts are
    created exclusively through the Admin module (see routes/admin.py).
  * A single /login endpoint serves all three roles; the frontend simply
    points its three distinct login pages (Applicant/Manager/Admin) at the
    same endpoint. The JWT's `role` claim -- not the page the user logged
    in from -- is what backend authorization relies on.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import create_access_token, hash_password, verify_password
from app.db.session import get_db
from app.models.party import Applicant
from app.models.user import User
from app.models.enums import UserRole
from app.schemas.auth import ApplicantRegisterRequest, LoginRequest, TokenResponse

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register_applicant(payload: ApplicantRegisterRequest, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="An account with this email already exists.")

    user = User(
        email=payload.email,
        phone=payload.phone,
        password_hash=hash_password(payload.password),
        role=UserRole.APPLICANT,
        is_active=True,
    )
    db.add(user)
    db.flush()

    applicant = Applicant(
        user_id=user.id,
        full_name=payload.full_name,
        date_of_birth=payload.date_of_birth,
        address=payload.address,
    )
    db.add(applicant)
    db.commit()

    token = create_access_token(subject=str(user.id), role=user.role.value)
    return TokenResponse(access_token=token, role=user.role.value)


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password.")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This account has been deactivated.")

    token = create_access_token(subject=str(user.id), role=user.role.value)
    return TokenResponse(access_token=token, role=user.role.value)
