"""
Admin-only routes: branch management and manager account creation
(Section 6, 9). This is where the ONLY manager-account-creation flow
lives -- there must be no other path that creates a MANAGER user.
"""
import secrets
import string

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session

from app.core.deps import require_role
from app.core.security import hash_password
from app.db.session import get_db
from app.models.district import District
from app.models.party import Branch, BranchManager, Admin
from app.models.user import User
from app.models.enums import UserRole

router = APIRouter(prefix="/api/admin", tags=["admin"])


class DistrictCreateRequest(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    state: str | None = None


class BranchCreateRequest(BaseModel):
    district_id: int | None = None
    branch_code: str = Field(min_length=2, max_length=20)
    branch_name: str = Field(min_length=2, max_length=150)
    address: str | None = None
    city: str | None = None
    state: str | None = None
    ifsc_code: str | None = None
    contact_phone: str | None = None


@router.post("/districts", status_code=status.HTTP_201_CREATED)
def create_district(
    payload: DistrictCreateRequest,
    current_user: User = Depends(require_role("ADMIN")),
    db: Session = Depends(get_db),
):
    if db.query(District).filter(District.name == payload.name).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="District already exists.")
    district = District(**payload.model_dump())
    db.add(district)
    db.commit()
    db.refresh(district)
    return {"id": district.id, "name": district.name, "state": district.state}


@router.get("/districts")
def list_districts(current_user: User = Depends(require_role("ADMIN")), db: Session = Depends(get_db)):
    districts = db.query(District).order_by(District.name).all()
    result = []
    for d in districts:
        branch_count = db.query(Branch).filter(Branch.district_id == d.id).count()
        result.append({"id": d.id, "name": d.name, "state": d.state, "branch_count": branch_count, "is_active": d.is_active})
    return result


@router.get("/districts/{district_id}/branches")
def list_branches_in_district(
    district_id: int,
    current_user: User = Depends(require_role("ADMIN")),
    db: Session = Depends(get_db),
):
    district = db.query(District).filter(District.id == district_id).first()
    if not district:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="District not found.")
    branches = db.query(Branch).filter(Branch.district_id == district_id).order_by(Branch.branch_name).all()
    result = []
    for b in branches:
        manager_count = db.query(BranchManager).filter(BranchManager.branch_id == b.id, BranchManager.is_active.is_(True)).count()
        result.append({
            "id": b.id, "branch_code": b.branch_code, "branch_name": b.branch_name,
            "manager_count": manager_count, "is_active": b.is_active,
        })
    return result


class ManagerCreateRequest(BaseModel):
    full_name: str = Field(min_length=2, max_length=150)
    email: EmailStr
    phone: str | None = None
    employee_code: str = Field(min_length=2, max_length=50)
    branch_id: int


def _generate_temp_password(length: int = 12) -> str:
    alphabet = string.ascii_letters + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(length))


@router.post("/branches", status_code=status.HTTP_201_CREATED)
def create_branch(
    payload: BranchCreateRequest,
    current_user: User = Depends(require_role("ADMIN")),
    db: Session = Depends(get_db),
):
    if db.query(Branch).filter(Branch.branch_code == payload.branch_code).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Branch code already exists.")
    branch = Branch(**payload.model_dump())
    db.add(branch)
    db.commit()
    db.refresh(branch)
    return {"id": branch.id, "branch_code": branch.branch_code, "branch_name": branch.branch_name}


@router.get("/branches")
def list_branches(current_user: User = Depends(require_role("ADMIN")), db: Session = Depends(get_db)):
    branches = db.query(Branch).order_by(Branch.branch_name).all()
    result = []
    for b in branches:
        mgr = db.query(BranchManager).filter(BranchManager.branch_id == b.id, BranchManager.is_active.is_(True)).first()
        result.append({
            "id": b.id,
            "branch_code": b.branch_code,
            "branch_name": b.branch_name,
            "address": b.address,
            "city": b.city,
            "state": b.state,
            "ifsc_code": b.ifsc_code,
            "contact_phone": b.contact_phone,
            "district_id": b.district_id,
            "district_name": b.district.name if b.district else None,
            "is_active": b.is_active,
            "manager_id": mgr.id if mgr else None,
            "manager_name": mgr.full_name if mgr else None,
            "manager_employee_code": mgr.employee_code if mgr else None,
            "manager_phone": mgr.phone if mgr else None,
            "manager_email": mgr.user.email if (mgr and mgr.user) else None,
        })
    return result


class BranchUpdateRequest(BaseModel):
    branch_name: str | None = None
    branch_code: str | None = None
    district_id: int | None = None
    address: str | None = None
    city: str | None = None
    state: str | None = None
    ifsc_code: str | None = None
    contact_phone: str | None = None
    is_active: bool | None = None


@router.put("/branches/{branch_id}")
def update_branch(
    branch_id: int,
    payload: BranchUpdateRequest,
    current_user: User = Depends(require_role("ADMIN")),
    db: Session = Depends(get_db),
):
    branch = db.query(Branch).filter(Branch.id == branch_id).first()
    if not branch:
        raise HTTPException(status_code=404, detail="Branch not found.")

    data = payload.model_dump(exclude_unset=True)
    if "branch_code" in data and data["branch_code"] != branch.branch_code:
        if db.query(Branch).filter(Branch.branch_code == data["branch_code"]).first():
            raise HTTPException(status_code=409, detail="Branch code already in use.")

    for k, v in data.items():
        setattr(branch, k, v)
    db.commit()
    db.refresh(branch)
    return {"id": branch.id, "branch_code": branch.branch_code, "branch_name": branch.branch_name, "is_active": branch.is_active}


class AssignManagerRequest(BaseModel):
    manager_id: int


@router.post("/branches/{branch_id}/assign-manager")
def assign_manager_to_branch(
    branch_id: int,
    payload: AssignManagerRequest,
    current_user: User = Depends(require_role("ADMIN")),
    db: Session = Depends(get_db),
):
    """
    Assign or reassign an existing branch manager to a branch.
    Guarantees manager is assigned to a valid, active branch.
    """
    branch = db.query(Branch).filter(Branch.id == branch_id, Branch.is_active.is_(True)).first()
    if not branch:
        raise HTTPException(status_code=404, detail="Active branch not found.")

    manager = db.query(BranchManager).filter(BranchManager.id == payload.manager_id, BranchManager.is_active.is_(True)).first()
    if not manager:
        raise HTTPException(status_code=404, detail="Active manager not found.")

    # Reassign manager to branch
    manager.branch_id = branch.id
    db.commit()
    db.refresh(manager)

    return {
        "message": f"Manager '{manager.full_name}' assigned to branch '{branch.branch_name}' successfully.",
        "branch_id": branch.id,
        "branch_name": branch.branch_name,
        "manager_id": manager.id,
        "manager_name": manager.full_name,
    }


@router.post("/managers", status_code=status.HTTP_201_CREATED)
def create_manager(
    payload: ManagerCreateRequest,
    current_user: User = Depends(require_role("ADMIN")),
    db: Session = Depends(get_db),
):
    """
    The ONLY way a MANAGER account is created. A random temporary password
    is generated server-side and returned once.
    """
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="A user with this email already exists.")

    if db.query(BranchManager).filter(BranchManager.employee_code == payload.employee_code).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="A manager with this employee code already exists.")

    branch = db.query(Branch).filter(Branch.id == payload.branch_id, Branch.is_active.is_(True)).first()
    if not branch:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Active branch not found.")

    admin = db.query(Admin).filter(Admin.user_id == current_user.id).first()

    temp_password = _generate_temp_password()
    user = User(
        email=payload.email,
        phone=payload.phone,
        password_hash=hash_password(temp_password),
        role=UserRole.MANAGER,
        is_active=True,
    )
    db.add(user)
    db.flush()

    manager = BranchManager(
        user_id=user.id,
        branch_id=branch.id,
        full_name=payload.full_name,
        employee_code=payload.employee_code,
        phone=payload.phone,
        created_by_admin_id=admin.id if admin else None,
    )
    db.add(manager)
    db.commit()
    db.refresh(manager)

    return {
        "id": manager.id,
        "full_name": manager.full_name,
        "email": user.email,
        "branch_id": manager.branch_id,
        "branch_name": branch.branch_name,
        "employee_code": manager.employee_code,
        "temporary_password": temp_password,
        "note": "Share this temporary password with the manager through a secure channel. It cannot be retrieved again.",
    }


@router.get("/managers")
def list_managers(current_user: User = Depends(require_role("ADMIN")), db: Session = Depends(get_db)):
    managers = db.query(BranchManager).all()
    return [
        {
            "id": m.id,
            "full_name": m.full_name,
            "employee_code": m.employee_code,
            "phone": m.phone or (m.user.phone if m.user else None),
            "email": m.user.email if m.user else None,
            "branch_id": m.branch_id,
            "branch_name": m.branch.branch_name if m.branch else "Unassigned",
            "branch_code": m.branch.branch_code if m.branch else None,
            "is_active": m.is_active,
        }
        for m in managers
    ]


@router.get("/dashboard-stats")
def get_dashboard_stats(current_user: User = Depends(require_role("ADMIN")), db: Session = Depends(get_db)):
    from app.models.loan_application import LoanApplication
    districts_count = db.query(District).count()
    branches_count = db.query(Branch).count()
    managers_count = db.query(BranchManager).count()
    applications_count = db.query(LoanApplication).count()
    return {
        "districts": districts_count,
        "branches": branches_count,
        "managers": managers_count,
        "applications": applications_count,
    }
