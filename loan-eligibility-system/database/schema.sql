-- ============================================================================
-- AI-Assisted Loan Eligibility Prediction and Management System
-- MySQL Database Schema
-- ============================================================================
-- Design notes:
--   * `users` is the single authentication table (email + password_hash + role).
--     Role-specific profile data lives in applicants / branch_managers / admins.
--   * Applicants self-register. Branch Managers and Admins are NEVER created
--     through public registration -- only via the Admin module (see backend
--     app/api/routes/admin.py -> create_manager).
--   * All monetary columns use DECIMAL, never FLOAT, to avoid rounding errors.
--   * Every application-linked table cascades on application deletion, except
--     audit_logs, which is intentionally kept (ON DELETE SET NULL) for
--     compliance/history purposes.
-- ============================================================================

CREATE DATABASE IF NOT EXISTS loan_eligibility_system
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE loan_eligibility_system;

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------------------------------------------------------
-- 1. USERS  (shared authentication table for all 3 roles)
-- ----------------------------------------------------------------------------
CREATE TABLE users (
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    email           VARCHAR(190) NOT NULL UNIQUE,
    phone           VARCHAR(20)  NULL,
    password_hash   VARCHAR(255) NOT NULL,
    role            ENUM('APPLICANT', 'MANAGER', 'ADMIN') NOT NULL,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    last_login_at   DATETIME NULL,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_users_role (role)
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 2. APPLICANTS  (profile data, 1:1 with users where role = APPLICANT)
-- ----------------------------------------------------------------------------
CREATE TABLE applicants (
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id         BIGINT UNSIGNED NOT NULL UNIQUE,
    full_name       VARCHAR(150) NOT NULL,
    date_of_birth   DATE NULL,
    gender          ENUM('MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY') NULL,
    address         VARCHAR(255) NULL,
    city            VARCHAR(100) NULL,
    state           VARCHAR(100) NULL,
    pincode         VARCHAR(10)  NULL,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_applicants_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 3a. DISTRICTS  (Admin hierarchy: District -> Branches -> Managers)
-- ----------------------------------------------------------------------------
CREATE TABLE districts (
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name            VARCHAR(100) NOT NULL UNIQUE,
    state           VARCHAR(100) NULL,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 3b. BRANCHES  (each branch belongs to exactly one district)
-- ----------------------------------------------------------------------------
CREATE TABLE branches (
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    district_id     BIGINT UNSIGNED NULL,
    branch_code     VARCHAR(20) NOT NULL UNIQUE,
    branch_name     VARCHAR(150) NOT NULL,
    address         VARCHAR(255) NULL,
    city            VARCHAR(100) NULL,
    state           VARCHAR(100) NULL,
    ifsc_code       VARCHAR(20) NULL,
    contact_phone   VARCHAR(20) NULL,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_branches_district FOREIGN KEY (district_id) REFERENCES districts(id) ON DELETE SET NULL,
    INDEX idx_branches_district (district_id)
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 4. BRANCH MANAGERS  (created only by Admin, assigned to exactly one branch)
-- ----------------------------------------------------------------------------
CREATE TABLE branch_managers (
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id         BIGINT UNSIGNED NOT NULL UNIQUE,
    branch_id       BIGINT UNSIGNED NOT NULL,
    full_name       VARCHAR(150) NOT NULL,
    employee_code   VARCHAR(50) NOT NULL UNIQUE,
    phone           VARCHAR(20) NULL,
    created_by_admin_id BIGINT UNSIGNED NULL,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_managers_user   FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_managers_branch FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE RESTRICT,
    INDEX idx_managers_branch (branch_id)
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 5. ADMINS
-- ----------------------------------------------------------------------------
CREATE TABLE admins (
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id         BIGINT UNSIGNED NOT NULL UNIQUE,
    full_name       VARCHAR(150) NOT NULL,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_admins_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 6. LOAN APPLICATIONS  (parent record for every loan type)
-- ----------------------------------------------------------------------------
CREATE TABLE loan_applications (
    id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    application_code    VARCHAR(40) NOT NULL UNIQUE,   -- e.g. LN-EDU-2026-001245
    verification_code   VARCHAR(20) NOT NULL,           -- e.g. 8F4K29 (unique per active app)
    applicant_id        BIGINT UNSIGNED NOT NULL,
    branch_id           BIGINT UNSIGNED NULL,           -- assigned when submitted to branch
    loan_type           ENUM('PERSONAL', 'HOME', 'EDUCATION') NOT NULL,
    requested_amount    DECIMAL(15,2) NOT NULL,
    loan_tenure_months  INT UNSIGNED NOT NULL,
    status              ENUM(
                            'APPLICATION_CREATED',
                            'DOCUMENTS_UPLOADED',
                            'DOCUMENTS_UNDER_VERIFICATION',
                            'AI_ASSESSMENT_COMPLETED',
                            'REPORT_GENERATED',
                            'SUBMITTED_TO_BRANCH',
                            'MANAGER_VERIFICATION',
                            'APPROVED',
                            'REJECTED',
                            'CORRECTION_REQUIRED',
                            'FINAL_BANK_PROCESSING'
                         ) NOT NULL DEFAULT 'APPLICATION_CREATED',
    submitted_to_branch_at DATETIME NULL,
    created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_applications_applicant FOREIGN KEY (applicant_id) REFERENCES applicants(id) ON DELETE CASCADE,
    CONSTRAINT fk_applications_branch    FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL,
    INDEX idx_applications_status (status),
    INDEX idx_applications_branch (branch_id),
    INDEX idx_applications_applicant (applicant_id),
    INDEX idx_applications_verification (application_code, verification_code)
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 7. PERSONAL LOAN DETAILS
-- ----------------------------------------------------------------------------
CREATE TABLE personal_loan_details (
    id                      BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    application_id          BIGINT UNSIGNED NOT NULL UNIQUE,
    age                     INT UNSIGNED NOT NULL,
    gender                  ENUM('MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY') NULL,
    employment_type         ENUM('SALARIED', 'SELF_EMPLOYED', 'BUSINESS_OWNER', 'UNEMPLOYED', 'OTHER') NOT NULL,
    employment_duration_months INT UNSIGNED NOT NULL DEFAULT 0,
    monthly_income          DECIMAL(15,2) NOT NULL,
    credit_score            INT UNSIGNED NULL,
    existing_loans_count    INT UNSIGNED NOT NULL DEFAULT 0,
    existing_emi            DECIMAL(15,2) NOT NULL DEFAULT 0,
    number_of_dependents    INT UNSIGNED NOT NULL DEFAULT 0,
    -- derived / calculated fields (Section 11, 19)
    annual_income           DECIMAL(15,2) NULL,
    dti_ratio                DECIMAL(6,4) NULL,
    disposable_income       DECIMAL(15,2) NULL,
    emi_affordability_flag  ENUM('AFFORDABLE', 'TIGHT', 'NOT_AFFORDABLE') NULL,
    CONSTRAINT fk_personal_application FOREIGN KEY (application_id) REFERENCES loan_applications(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 8. HOME LOAN DETAILS
-- ----------------------------------------------------------------------------
CREATE TABLE home_loan_details (
    id                      BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    application_id          BIGINT UNSIGNED NOT NULL UNIQUE,
    employment_type         ENUM('SALARIED', 'SELF_EMPLOYED', 'BUSINESS_OWNER', 'UNEMPLOYED', 'OTHER') NOT NULL,
    monthly_income          DECIMAL(15,2) NOT NULL,
    co_applicant_income     DECIMAL(15,2) NOT NULL DEFAULT 0,
    credit_score            INT UNSIGNED NULL,
    existing_loans_count    INT UNSIGNED NOT NULL DEFAULT 0,
    existing_emi            DECIMAL(15,2) NOT NULL DEFAULT 0,
    property_value          DECIMAL(15,2) NOT NULL,
    down_payment            DECIMAL(15,2) NOT NULL DEFAULT 0,
    existing_liabilities    DECIMAL(15,2) NOT NULL DEFAULT 0,
    -- derived / calculated fields (Section 12, 19)
    dti_ratio                DECIMAL(6,4) NULL,
    ltv_ratio                DECIMAL(6,4) NULL,
    estimated_emi            DECIMAL(15,2) NULL,
    emi_affordability_flag   ENUM('AFFORDABLE', 'TIGHT', 'NOT_AFFORDABLE') NULL,
    loan_to_income_ratio     DECIMAL(6,4) NULL,
    CONSTRAINT fk_home_application FOREIGN KEY (application_id) REFERENCES loan_applications(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 9. EDUCATION LOAN DETAILS
-- ----------------------------------------------------------------------------
CREATE TABLE education_loan_details (
    id                          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    application_id              BIGINT UNSIGNED NOT NULL UNIQUE,
    student_name                VARCHAR(150) NOT NULL,
    student_age                 INT UNSIGNED NOT NULL,
    qualification                VARCHAR(150) NULL,
    institution                  VARCHAR(200) NOT NULL,
    course                       VARCHAR(150) NOT NULL,
    course_duration_months       INT UNSIGNED NOT NULL,
    tuition_fee                  DECIMAL(15,2) NOT NULL,
    other_expenses                DECIMAL(15,2) NOT NULL DEFAULT 0,
    applicant_income              DECIMAL(15,2) NOT NULL DEFAULT 0,
    co_applicant_income           DECIMAL(15,2) NOT NULL DEFAULT 0,
    existing_obligations          DECIMAL(15,2) NOT NULL DEFAULT 0,
    credit_score                  INT UNSIGNED NULL,
    -- derived / calculated fields (Section 13, 19)
    total_education_cost          DECIMAL(15,2) NULL,
    requested_loan_percentage     DECIMAL(6,4) NULL,
    repayment_burden_ratio        DECIMAL(6,4) NULL,
    affordability_flag            ENUM('AFFORDABLE', 'TIGHT', 'NOT_AFFORDABLE') NULL,
    CONSTRAINT fk_education_application FOREIGN KEY (application_id) REFERENCES loan_applications(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 10. DOCUMENTS
-- ----------------------------------------------------------------------------
CREATE TABLE documents (
    id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    application_id      BIGINT UNSIGNED NOT NULL,
    document_type       ENUM(
                            'ID_PROOF', 'ADDRESS_PROOF', 'SALARY_SLIP', 'BANK_STATEMENT',
                            'INCOME_PROOF', 'ACADEMIC_DOCUMENTS', 'ADMISSION_LETTER',
                            'FEE_STRUCTURE', 'PROPERTY_DOCUMENTS', 'OTHER'
                         ) NOT NULL,
    original_filename   VARCHAR(255) NOT NULL,
    stored_file_path    VARCHAR(500) NOT NULL,
    file_size_bytes      BIGINT UNSIGNED NULL,
    mime_type             VARCHAR(100) NULL,
    uploaded_by_user_id   BIGINT UNSIGNED NOT NULL,
    uploaded_at            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_documents_application FOREIGN KEY (application_id) REFERENCES loan_applications(id) ON DELETE CASCADE,
    CONSTRAINT fk_documents_uploader FOREIGN KEY (uploaded_by_user_id) REFERENCES users(id) ON DELETE RESTRICT,
    INDEX idx_documents_application (application_id)
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 11. OCR RESULTS  (one per document)
-- ----------------------------------------------------------------------------
CREATE TABLE ocr_results (
    id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    document_id         BIGINT UNSIGNED NOT NULL UNIQUE,
    raw_extracted_text   LONGTEXT NULL,
    detected_document_type VARCHAR(100) NULL,   -- classifier output, may differ from declared type
    ocr_confidence        DECIMAL(5,4) NULL,
    ocr_engine             VARCHAR(50) NULL,      -- e.g. 'tesseract', 'easyocr'
    status                  ENUM('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED') NOT NULL DEFAULT 'PENDING',
    processed_at             DATETIME NULL,
    created_at               DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_ocr_document FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 12. EXTRACTED FIELDS  (semantic field mapping output, Section 17)
-- ----------------------------------------------------------------------------
CREATE TABLE extracted_fields (
    id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    ocr_result_id        BIGINT UNSIGNED NOT NULL,
    raw_label             VARCHAR(150) NULL,       -- e.g. "Take Home Pay" as found in document
    normalized_field       VARCHAR(100) NOT NULL,    -- e.g. "NET_SALARY"
    extracted_value          VARCHAR(255) NULL,
    mapping_confidence        DECIMAL(5,4) NULL,
    mapping_method              VARCHAR(50) NULL,      -- e.g. 'semantic_similarity', 'exact_match'
    needs_verification            BOOLEAN NOT NULL DEFAULT FALSE,
    created_at                     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_extracted_ocr FOREIGN KEY (ocr_result_id) REFERENCES ocr_results(id) ON DELETE CASCADE,
    INDEX idx_extracted_field (normalized_field)
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 13. VERIFICATION RESULTS  (applicant-entered vs document-extracted, Section 18)
-- ----------------------------------------------------------------------------
CREATE TABLE verification_results (
    id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    application_id       BIGINT UNSIGNED NOT NULL,
    field_name             VARCHAR(100) NOT NULL,
    applicant_value          VARCHAR(255) NULL,
    document_value             VARCHAR(255) NULL,
    match_status                ENUM('CONSISTENT', 'MISMATCH', 'NEEDS_VERIFICATION') NOT NULL,
    created_at                    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_verification_application FOREIGN KEY (application_id) REFERENCES loan_applications(id) ON DELETE CASCADE,
    INDEX idx_verification_application (application_id)
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 14. AI PREDICTIONS  (Section 20-21)
-- ----------------------------------------------------------------------------
CREATE TABLE ai_predictions (
    id                     BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    application_id          BIGINT UNSIGNED NOT NULL,
    model_name                VARCHAR(100) NOT NULL,   -- e.g. 'xgboost_v1'
    model_version               VARCHAR(50) NULL,
    eligibility                   ENUM('ELIGIBLE', 'NOT_ELIGIBLE', 'NEEDS_REVIEW') NOT NULL,
    eligibility_probability         DECIMAL(6,5) NOT NULL,
    positive_factors                  JSON NULL,
    negative_factors                    JSON NULL,
    created_at                            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_predictions_application FOREIGN KEY (application_id) REFERENCES loan_applications(id) ON DELETE CASCADE,
    INDEX idx_predictions_application (application_id)
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 15. RISK ASSESSMENTS  (Section 22)
-- ----------------------------------------------------------------------------
CREATE TABLE risk_assessments (
    id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    application_id       BIGINT UNSIGNED NOT NULL,
    risk_level             ENUM('LOW', 'MEDIUM', 'HIGH') NOT NULL,
    risk_score               DECIMAL(6,4) NULL,
    contributing_factors       JSON NULL,
    created_at                    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_risk_application FOREIGN KEY (application_id) REFERENCES loan_applications(id) ON DELETE CASCADE,
    INDEX idx_risk_application (application_id)
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 16. RECOMMENDATIONS  (Section 25)
-- ----------------------------------------------------------------------------
CREATE TABLE recommendations (
    id                       BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    application_id            BIGINT UNSIGNED NOT NULL UNIQUE,
    recommended_min_amount     DECIMAL(15,2) NULL,
    recommended_max_amount       DECIMAL(15,2) NULL,
    notes                          TEXT NULL,
    disclaimer                       VARCHAR(500) NOT NULL DEFAULT
        'This is an AI-based suggestion only and is not a guaranteed approval.',
    created_at                         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_recommendation_application FOREIGN KEY (application_id) REFERENCES loan_applications(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 17. APPLICATION STATUS HISTORY  (Section 32 timeline)
-- ----------------------------------------------------------------------------
CREATE TABLE application_status_history (
    id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    application_id       BIGINT UNSIGNED NOT NULL,
    status                  ENUM(
                                'APPLICATION_CREATED',
                                'DOCUMENTS_UPLOADED',
                                'DOCUMENTS_UNDER_VERIFICATION',
                                'AI_ASSESSMENT_COMPLETED',
                                'REPORT_GENERATED',
                                'SUBMITTED_TO_BRANCH',
                                'MANAGER_VERIFICATION',
                                'APPROVED',
                                'REJECTED',
                                'CORRECTION_REQUIRED',
                                'FINAL_BANK_PROCESSING'
                             ) NOT NULL,
    changed_by_user_id       BIGINT UNSIGNED NULL,
    remarks                     VARCHAR(500) NULL,
    created_at                    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_history_application FOREIGN KEY (application_id) REFERENCES loan_applications(id) ON DELETE CASCADE,
    CONSTRAINT fk_history_user FOREIGN KEY (changed_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_history_application (application_id)
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 18. MANAGER ACTIONS  (Section 30)
-- ----------------------------------------------------------------------------
CREATE TABLE manager_actions (
    id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    application_id       BIGINT UNSIGNED NOT NULL,
    manager_id             BIGINT UNSIGNED NOT NULL,
    action                    ENUM('APPROVE', 'REJECT', 'REQUEST_CORRECTION') NOT NULL,
    reason                      TEXT NULL,   -- mandatory for REJECT / REQUEST_CORRECTION, enforced in app layer
    created_at                    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_manager_actions_application FOREIGN KEY (application_id) REFERENCES loan_applications(id) ON DELETE CASCADE,
    CONSTRAINT fk_manager_actions_manager FOREIGN KEY (manager_id) REFERENCES branch_managers(id) ON DELETE RESTRICT,
    INDEX idx_manager_actions_application (application_id)
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 19. NOTIFICATIONS
-- ----------------------------------------------------------------------------
CREATE TABLE notifications (
    id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id               BIGINT UNSIGNED NOT NULL,
    application_id          BIGINT UNSIGNED NULL,
    title                     VARCHAR(150) NOT NULL,
    message                    VARCHAR(500) NOT NULL,
    is_read                      BOOLEAN NOT NULL DEFAULT FALSE,
    created_at                     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_notifications_application FOREIGN KEY (application_id) REFERENCES loan_applications(id) ON DELETE CASCADE,
    INDEX idx_notifications_user (user_id, is_read)
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 20. AUDIT LOGS  (Section 34 -- kept even if user/application later deleted)
-- ----------------------------------------------------------------------------
CREATE TABLE audit_logs (
    id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id               BIGINT UNSIGNED NULL,
    role                    VARCHAR(20) NULL,
    action                    VARCHAR(100) NOT NULL,
    application_id              BIGINT UNSIGNED NULL,
    ip_address                    VARCHAR(64) NULL,
    metadata_json                    JSON NULL,
    created_at                         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_audit_application FOREIGN KEY (application_id) REFERENCES loan_applications(id) ON DELETE SET NULL,
    INDEX idx_audit_user (user_id),
    INDEX idx_audit_action (action),
    INDEX idx_audit_created (created_at)
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 21. REPORTS  (generated PDF assessment reports, Section 28)
-- ----------------------------------------------------------------------------
CREATE TABLE reports (
    id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    application_id       BIGINT UNSIGNED NOT NULL,
    file_path               VARCHAR(500) NOT NULL,
    generated_at              DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_reports_application FOREIGN KEY (application_id) REFERENCES loan_applications(id) ON DELETE CASCADE
) ENGINE=InnoDB;

SET FOREIGN_KEY_CHECKS = 1;
