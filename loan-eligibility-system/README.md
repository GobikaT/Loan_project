# AI-Assisted Loan Eligibility Prediction and Management System

A three-role platform (Applicant / Branch Manager / Admin) that uses AI to give
applicants an initial, explainable loan-eligibility assessment, which is then
verified and finalized by a human branch manager. **The AI supports the
decision — it never automatically approves or rejects a loan.**

This repository is at **Phase 2: loan application forms + financial
calculation engine**, per the build order in the master spec. It includes:

**Phase 1 (project setup + database)**
- Full MySQL schema (`database/schema.sql`) covering every entity in the spec
- FastAPI backend: JWT auth, role-based access control, SQLAlchemy models
  for all 21 tables
- React frontend: routing for all 31 pages, role-protected routes, a shared
  login form, working registration, an axios API client

**Phase 2 (this phase) — functional and tested end-to-end**
- Real Personal / Home / Education loan application forms (Sections 11-13),
  with client- and server-side input validation (Section 14)
- The financial feature engine (Section 19): DTI, LTV, disposable income,
  estimated EMI, loan-to-income ratio, and affordability flags, calculated
  server-side and persisted to each loan-type's detail table
- Non-blocking "financial information requires verification" warnings for
  inconsistent-but-not-invalid inputs, exactly as Section 14 specifies
  (never auto-labelled as fraud/rejected)
- Application ID + verification code generation (Section 27), e.g.
  `LN-EDU-2026-000001` / `8F4K29`, both guaranteed unique
- A working, interactive EMI Calculator (Section 26)
- A functional Applicant Dashboard and Application Tracking page, reading
  real data from the API

Everything past this (document upload, OCR pipeline, ML model, PDF reports,
manager workflow, admin analytics, etc.) is intentionally left as scaffolded
placeholder pages / TODOs — build order follows Section 42 of the spec.

---

## 1. Prerequisites

- Python 3.11+
- Node.js 18+ and npm
- MySQL 8.0+

---

## 2. Database setup

```bash
mysql -u root -p < database/schema.sql
mysql -u root -p < database/sample_data.sql   # optional: seeds 3 sample branches
```

This creates the `loan_eligibility_system` database and all tables. No user
accounts or credentials are ever stored in this repo or in `sample_data.sql`.

Create a dedicated DB user for the app instead of using `root`:

```sql
CREATE USER 'loan_app_user'@'localhost' IDENTIFIED BY 'a_strong_password';
GRANT ALL PRIVILEGES ON loan_eligibility_system.* TO 'loan_app_user'@'localhost';
FLUSH PRIVILEGES;
```

---

## 3. Backend setup

```bash
cd backend
python3 -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
# edit .env: set DB_PASSWORD, JWT_SECRET_KEY, INITIAL_ADMIN_EMAIL/PASSWORD, etc.

# Create the initial Admin account (the ONLY way an Admin account is created):
python -m app.db.seed

# Run the API
uvicorn app.main:app --reload --port 8000
```

- API docs: http://localhost:8000/docs
- Health check: http://localhost:8000/api/health

**Account creation rules (enforced in the API, not just the UI):**
- Applicants self-register via `POST /api/auth/register`.
- Branch Managers can only be created by an authenticated Admin via
  `POST /api/admin/managers` (returns a one-time temporary password).
- Admins can only be created via the `db/seed.py` script, using credentials
  from environment variables — there is no public Admin registration route.

---

## 4. Frontend setup

```bash
cd frontend
npm install
cp .env.example .env   # points REACT_APP_API_BASE_URL at the backend
npm start
```

Runs at http://localhost:3000.

---

## 5. Project structure

```
backend/
  app/
    api/routes/       # auth.py, applicant.py, manager.py, admin.py
    core/              # config, security (JWT/bcrypt), role-based deps
    db/                # SQLAlchemy session, base, seed script
    models/            # SQLAlchemy models (1:1 with database/schema.sql)
    schemas/           # Pydantic request/response models
    services/          # ai/, reports/ — filled in during later phases
  uploads/             # document storage (dev only; use object storage in prod)

frontend/
  src/
    pages/
      auth/            # ApplicantLogin, ManagerLogin, AdminLogin, ApplicantRegister
      applicant/        # dashboard, loan forms, documents, tracking, EMI calc, etc.
      manager/           # dashboard, verification, application details, decisions
      admin/              # dashboard, branches, managers, monitoring, analytics, audit
    components/           # shared UI (LoginForm, etc.)
    context/               # AuthContext
    routes/                 # ProtectedRoute (role-based route guarding)
    services/                # apiClient (axios + JWT), authService

database/
  schema.sql          # full DDL — source of truth for the data model
  sample_data.sql     # sample branches only, no credentials
```

---

## 6. Security notes carried into this scaffold

- Passwords are hashed with bcrypt (`passlib`), never stored/logged in plain text.
- JWTs carry the user's role; every protected backend route re-checks the
  role server-side via `require_role(...)` — the frontend's route guarding
  is a UX convenience only, not the real security boundary.
- Applicant/Manager data-access routes are scoped to the caller's own
  `applicant_id` / `branch_id` — never trust an ID from the request alone.
- No secrets are committed: `.env` is git-ignored; only `.env.example`
  templates are checked in.

---

## 7. Next phases (not yet built)

Following Section 42's recommended order: document upload → OCR/semantic
field mapping → document verification → ML eligibility model →
explainability → risk assessment → loan recommendation → PDF report →
branch submission workflow → manager decision workflow (approve / reject /
request correction) → status tracking/correction loop → admin analytics →
audit logging → deployment.

## 8. What was verified in this phase

Ran an end-to-end smoke test (register → create each of the 3 loan types →
list → fetch detail → cross-applicant access denial → invalid-input
rejection) against the real API and financial engine. The full React
frontend (`npm run build`) also compiles cleanly with no errors.
