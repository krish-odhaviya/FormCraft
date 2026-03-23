-- =============================================================================
-- FormCraft Platform — Compliance Migration Script
-- Run once against your PostgreSQL database.
-- Safe to run on existing databases; uses IF NOT EXISTS / IF EXISTS guards.
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Add `code` column to existing `forms` table
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE forms
    ADD COLUMN IF NOT EXISTS code VARCHAR(100);

-- Back-fill existing rows with a unique code derived from their id
UPDATE forms SET code = 'form-' || id || '-' || LEFT(MD5(RANDOM()::TEXT), 6)
WHERE code IS NULL;

-- Now enforce uniqueness and NOT NULL
ALTER TABLE forms
    ALTER COLUMN code SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uidx_forms_code ON forms (code);


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Create `form_versions` table
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS form_versions (
    id               BIGSERIAL PRIMARY KEY,
    form_id          BIGINT        NOT NULL REFERENCES forms (id) ON DELETE CASCADE,
    version_number   INTEGER       NOT NULL,
    definition_json  TEXT          NOT NULL,
    is_active        BOOLEAN       NOT NULL DEFAULT false,
    created_at       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    activated_at     TIMESTAMP,
    created_by       VARCHAR(100),

    CONSTRAINT uq_form_version UNIQUE (form_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_fv_form_id ON form_versions (form_id);
CREATE INDEX IF NOT EXISTS idx_fv_active  ON form_versions (form_id, is_active);


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Create `form_submission_meta` table
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS form_submission_meta (
    id                BIGSERIAL PRIMARY KEY,
    form_id           BIGINT       NOT NULL REFERENCES forms (id) ON DELETE CASCADE,
    form_version_id   BIGINT       REFERENCES form_versions (id),
    status            VARCHAR(20)  NOT NULL DEFAULT 'SUBMITTED',
    data_row_id       BIGINT,
    submitted_by      VARCHAR(100),
    created_at        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    submitted_at      TIMESTAMP,
    is_deleted        BOOLEAN      NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_fsm_form_id     ON form_submission_meta (form_id);
CREATE INDEX IF NOT EXISTS idx_fsm_version_id  ON form_submission_meta (form_version_id);
CREATE INDEX IF NOT EXISTS idx_fsm_submitter   ON form_submission_meta (submitted_by);
CREATE INDEX IF NOT EXISTS idx_fsm_status      ON form_submission_meta (status);


-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Upgrade existing per-form data tables
--    NB: This block upgrades ALL tables matching the pattern `form_%_data`.
--    Adjust the WHERE filter if you have custom table naming.
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
    tbl TEXT;
BEGIN
    FOR tbl IN
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name LIKE 'form_%_data'
          AND table_type = 'BASE TABLE'
    LOOP
        -- Add updated_at
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = tbl AND column_name = 'updated_at'
        ) THEN
            EXECUTE 'ALTER TABLE ' || tbl || ' ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP';
        END IF;

        -- Add is_draft
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = tbl AND column_name = 'is_draft'
        ) THEN
            EXECUTE 'ALTER TABLE ' || tbl || ' ADD COLUMN is_draft BOOLEAN NOT NULL DEFAULT false';
        END IF;

        -- Add form_version_id
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = tbl AND column_name = 'form_version_id'
        ) THEN
            EXECUTE 'ALTER TABLE ' || tbl || ' ADD COLUMN form_version_id BIGINT';
        END IF;
    END LOOP;
END $$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Fix session timeout reference (informational — set in application.properties)
-- ─────────────────────────────────────────────────────────────────────────────
-- Session timeout is controlled by server.servlet.session.timeout=900s (15 minutes).
-- No database change required.

-- =============================================================================
-- End of migration
-- =============================================================================
