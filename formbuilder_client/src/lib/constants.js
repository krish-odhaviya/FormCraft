// ── API Configuration ──────────────────────────────────────────────────────────

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:9090";
export const API_PREFIX = "/api/v1";
export const API_ROOT = `${API_BASE_URL}${API_PREFIX}`;

/**
 * Centralized API Endpoints.
 * helper functions for building nested paths without double prefixes.
 */
export const ENDPOINTS = {
    // --- Auth ---
    AUTH_REGISTER: `${API_ROOT}/auth/register`,
    AUTH_LOGIN: `${API_ROOT}/auth/login`,
    AUTH_LOGOUT: `${API_ROOT}/auth/logout`,
    AUTH_ME: `${API_ROOT}/auth/me`,

    // --- Forms (General) ---
    FORMS: `${API_ROOT}/forms`,
    FORMS_SUBMIT: `${API_ROOT}/forms/submit`, // TODO: Legacy. Referenced by submitForm in formService.js
    PUBLISHED_LIST: `${API_ROOT}/forms/published-list`,
    LOOKUP: `${API_ROOT}/forms/lookup`,
    UPLOAD: `${API_ROOT}/forms/upload`,
    
    // Per-form (Builder/Admin)
    formDetail: (id) => `${API_ROOT}/forms/${id}`,
    formFields: (id) => `${API_ROOT}/forms/${id}/fields`,
    formDraft: (id) => `${API_ROOT}/forms/${id}/draft`,
    formPublish: (id) => `${API_ROOT}/forms/${id}/publish`,
    formValidations: (id) => `${API_ROOT}/forms/${id}/validations`,
    formArchive: (id) => `${API_ROOT}/forms/${id}/archive`,
    formReactivate: (id) => `${API_ROOT}/forms/${id}/reactivate`,
    formPermissions: (id) => `${API_ROOT}/forms/${id}/permissions`,
    formSubmissions: (id) => `${API_ROOT}/forms/${id}/submissions`,
    formSubmissionsExport: (id) => `${API_ROOT}/forms/${id}/submissions/export`,
    formSubmissionDetail: (formId, subId) => `${API_ROOT}/forms/${formId}/submissions/${subId}`,
    
    // Versioning
    formVersions: (formId) => `${API_ROOT}/forms/${formId}/versions`,
    formVersion: (formId, versionId) => `${API_ROOT}/forms/${formId}/versions/${versionId}`,
    activateVersion: (formId, versionId) => `${API_ROOT}/forms/${formId}/versions/${versionId}/activate`,

    // --- Submissions (Direct) ---
    SUBMISSIONS_DRAFT: `${API_ROOT}/submissions/draft`, // TODO: Legacy. Referenced by draft methods in formService.js
    restoreResponse: (formId, responseId) => `${API_ROOT}/forms/${formId}/submissions/${responseId}/restore`,
    bulkRestoreResponses: (formId) => `${API_ROOT}/forms/${formId}/submissions/bulk-restore`,

    // --- Runtime (Public/Slug based) ---
    runtimeForm: (code) => `${API_ROOT}/runtime/forms/${code}`,
    runtimeSubmit: (code) => `${API_ROOT}/runtime/forms/${code}/submissions/submit`,
    runtimeDraft: (code) => `${API_ROOT}/runtime/forms/${code}/submissions/draft`,

    // --- Stats ---
    DASHBOARD_STATS: `${API_ROOT}/dashboard/stats`,

    // --- Admin ---
    MODULES: `${API_ROOT}/modules`,
    ROLES: `${API_ROOT}/roles`,
};

// ── Application Constants ─────────────────────────────────────────────────────

export const REGEX = {
    EMAIL: /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/,
    USERNAME: /^[a-zA-Z0-9_]{3,50}$/,
    SLUG: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    ROLE_NAME: /^[A-Z0-9_]{2,80}$/,
    FORM_NAME: /^[\w\s\-()\.,!?&]{3,150}$/,
    PASSWORD: /(?=.*[A-Za-z])(?=.*\d)/,
};

export const FIELD_TYPES = {
    TEXT: "TEXT",
    TEXTAREA: "TEXTAREA",
    DROPDOWN: "DROPDOWN",
    LOOKUP_DROPDOWN: "LOOKUP_DROPDOWN",
    CHECKBOX_GROUP: "CHECKBOX_GROUP",
    RADIO_GROUP: "RADIO_GROUP",
    MC_GRID: "MC_GRID",
    TICK_BOX_GRID: "TICK_BOX_GRID",
    DATE: "DATE",
    TIME: "TIME",
    INTEGER: "INTEGER",
    STAR_RATING: "STAR_RATING",
    LINEAR_SCALE: "LINEAR_SCALE",
    FILE_UPLOAD: "FILE_UPLOAD",
};
