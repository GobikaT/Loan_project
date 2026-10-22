-- ============================================================================
-- Sample / reference data
-- NOTE: Deliberately contains NO user accounts, passwords, or credentials.
-- The initial Admin account is created securely via `backend/app/db/seed.py`
-- (reads credentials from environment variables, hashes the password, never
-- stores it in plain text or in this repository). See README.md "Seeding".
-- ============================================================================

USE loan_eligibility_system;

INSERT INTO districts (name, state, is_active) VALUES
    ('Chennai', 'Tamil Nadu', TRUE),
    ('Bengaluru Urban', 'Karnataka', TRUE),
    ('Erode', 'Tamil Nadu', TRUE);

INSERT INTO branches (district_id, branch_code, branch_name, address, city, state, ifsc_code, contact_phone, is_active)
VALUES
    ((SELECT id FROM districts WHERE name = 'Chennai'), 'BR-CHN-001', 'Chennai Central Branch', '12 Anna Salai', 'Chennai', 'Tamil Nadu', 'BANK0001234', '+91-44-1234-5678', TRUE),
    ((SELECT id FROM districts WHERE name = 'Bengaluru Urban'), 'BR-BLR-001', 'Bengaluru MG Road Branch', '45 MG Road', 'Bengaluru', 'Karnataka', 'BANK0005678', '+91-80-2345-6789', TRUE),
    ((SELECT id FROM districts WHERE name = 'Erode'), 'BR-ERD-001', 'Erode Main Branch', '7 Perundurai Road', 'Erode', 'Tamil Nadu', 'BANK0009876', '+91-424-345-6789', TRUE);
