from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.api.routes import auth, applicant, manager, admin

app = FastAPI(
    title="AI-Assisted Loan Eligibility Prediction and Management System",
    description=(
        "AI screens and assists -> Documents are verified -> Branch Manager reviews -> "
        "Human makes the final decision. The AI never automatically approves or rejects a loan."
    ),
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(applicant.router)
app.include_router(manager.router)
app.include_router(admin.router)


@app.get("/api/health", tags=["health"])
def health_check():
    return {"status": "ok", "service": "loan-eligibility-backend"}
