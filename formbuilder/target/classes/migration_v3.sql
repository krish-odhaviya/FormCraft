-- =============================================================================
-- FormCraft Platform — Multi-Select Support Migration
-- Run this against your PostgreSQL database to support Dropdown/Lookup multi-select.
-- Safe to run on existing databases.
-- =============================================================================

-- Add configuration columns to form_fields table
ALTER TABLE form_fields ADD COLUMN IF NOT EXISTS selection_mode VARCHAR(20) DEFAULT 'single';
ALTER TABLE form_fields ADD COLUMN IF NOT EXISTS max_selections INTEGER;

-- Note: Existing dynamic data tables (form_data_*) will have their columns
-- updated/extended when the form is published next time, as SqlTypeMapper
-- has been updated to use TEXT for DROPDOWN and LOOKUP_DROPDOWN.
-- However, existing columns in those tables might still be VARCHAR(255) or UUID.
-- PostgreSQL allows casting from VARCHAR and UUID to TEXT easily.
-- If a form is republish, the builder will attempt to use 'TEXT' definition.
