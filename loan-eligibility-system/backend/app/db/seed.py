"""
Creates the initial Admin account securely from environment variables.

This is the ONLY sanctioned way to create the first Admin -- there is no
public Admin registration endpoint anywhere in the API (Section 5, 43).

Usage:
    cd backend
    python -m app.db.seed
"""
from app.core.config import settings
from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models.party import Admin
from app.models.user import User
from app.models.enums import UserRole


def seed_initial_admin() -> None:
    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.email == settings.INITIAL_ADMIN_EMAIL).first()
        if existing:
            print(f"Admin '{settings.INITIAL_ADMIN_EMAIL}' already exists. Skipping.")
            return

        user = User(
            email=settings.INITIAL_ADMIN_EMAIL,
            password_hash=hash_password(settings.INITIAL_ADMIN_PASSWORD),
            role=UserRole.ADMIN,
            is_active=True,
        )
        db.add(user)
        db.flush()  # obtain user.id

        admin = Admin(user_id=user.id, full_name=settings.INITIAL_ADMIN_NAME)
        db.add(admin)
        db.commit()
        print(f"Initial admin account created: {settings.INITIAL_ADMIN_EMAIL}")
        print("IMPORTANT: log in and change this password immediately.")
    finally:
        db.close()


if __name__ == "__main__":
    seed_initial_admin()
