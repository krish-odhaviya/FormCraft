/**
 * api — central service layer for all backend calls.
 *
 * Rules:
 *  - Every call goes through the shared `API` axios instance (never raw fetch).
 *  - The BASE_URL lives in axios.js — never hardcode localhost here.
 *  - The response.data unwrap interceptor is already registered in axios.js,
 *    so callers receive the envelope object: { success, message, data, ... }.
 *    Access the payload with .data on the result.
 */
import { API, BASE_URL } from "./axios";

export const api = {
  // ── Auth ──────────────────────────────────────────────────────────────────
  login: (username, password) =>
    API.post("/auth/login", { username, password }),

  logout: () => API.post("/auth/logout"),

  getMe: () => API.get("/auth/me"),

  register: (username, password) =>
    API.post("/auth/register", { username, password }),

  // ── User Management (admin only) ──────────────────────────────────────────
  getAdminUsers: () => API.get("/admin/users"),

  /** Assign a custom role to a user */
  assignRoleToUser: (roleId, userId) =>
    API.post(`/admin/users/${userId}/custom-role?roleId=${roleId}`),

  toggleUserStatus: (userId, enabled) =>
    API.post(`/admin/users/${userId}/enable?enabled=${enabled}`),

  // ── Access Requests ───────────────────────────────────────────────────────
  createAccessRequest: (formId, type, reason) =>
    API.post("/requests", { formId, type, reason }),

  getMyRequests: () => API.get("/requests/my"),

  getPendingRequests: () => API.get("/requests/pending"),

  processRequest: (requestId, status, role) =>
    API.post(
      `/requests/${requestId}/process?status=${status}${role ? `&role=${role}` : ""}`
    ),

  // ── Dashboard ─────────────────────────────────────────────────────────────
  getDashboardStats: () => API.get("/dashboard/stats"),

  // ── Forms ─────────────────────────────────────────────────────────────────
  getAllForms: ({ page = 1, size = 10, sortBy = "createdAt", sortDir = "desc" } = {}) => 
    API.get("/forms", {
      params: {
        page: page > 0 ? page - 1 : 0,
        size,
        sortBy,
        sortDir
      }
    }),

  getAllPublishedForms: (excludeFormId) =>
    API.get(
      `/forms/published-list${excludeFormId ? `?excludeFormId=${excludeFormId}` : ""}`
    ),

  getForm: (formId, params = {}) =>
    API.get(`/forms/${formId}`, { params }),

  getFormByCode: (code, params = {}) =>
    API.get(`/forms/code/${code}`, { params }),

  createForm: (name, description) => API.post("/forms", { name, description }),

  submitForm: (formId, values, formVersionId) =>
    API.post("/forms/submit", { formId, values, formVersionId }),

  getFormVersions: (formId) => API.get(`/forms/${formId}/versions`),

  getFormVersion: (formId, versionId) => API.get(`/forms/${formId}/versions/${versionId}`),

  createFormVersion: (formId) => API.post(`/forms/${formId}/versions`),

  activateFormVersion: (formId, versionId) => API.post(`/forms/${formId}/versions/${versionId}/activate`),

  saveDraft: (formId, fields) => API.post(`/forms/${formId}/draft`, fields),

  // ── Public Draft Save & Resume ──────────────────────────────────────────
  saveDraftSubmission: (formId, formVersionId, data) => 
    API.post("/submissions/draft", { formId, formVersionId, data }),

  getDraftSubmission: (formId) => 
    API.get(`/submissions/draft?formId=${formId}`),

  publishForm: (formId, fields = null) => 
    API.post(`/forms/${formId}/publish`, fields ? { fields } : null),

  archiveForm: (formId) => API.post(`/forms/${formId}/archive`),

  // ── Submissions ───────────────────────────────────────────────────────────
  /**
   * Paginated submissions — replaces the raw fetch() in submissions/page.jsx.
   * Spring expects 0-based page index; this method converts from 1-based.
   */
  getSubmissionsPaged: (formId, { page = 1, size = 10, search = "", sortBy = "id", sortDir = "desc", versionId = null } = {}) =>
    API.get(`/forms/${formId}/submissions`, {
      params: {
        page: page > 0 ? page - 1 : 0,
        size,
        search,
        sort: `${sortBy},${sortDir}`,
        versionId: versionId || undefined
      },
    }),

  deleteSubmission: (formId, submissionId) =>
    API.delete(`/forms/${formId}/submissions/${submissionId}`),

  deleteSubmissionsBulk: (formId, submissionIds) =>
    API.post(`/forms/${formId}/submissions/bulk-delete`, submissionIds),

  /**
   * Export submissions as a file (csv | pdf | word).
   * Returns a raw Response so the caller can blob() it.
   * Uses native fetch with credentials because we need access to the
   * raw binary stream — axios converts everything to JSON by default.
   */
  exportSubmissions: (formId, { search = "", format = "csv", versionId = null } = {}) => {
    let url = `${BASE_URL}/forms/${formId}/submissions/export?search=${encodeURIComponent(search)}&format=${format}`;
    if (versionId) url += `&versionId=${versionId}`;
    return fetch(url, { credentials: "include" });
  },

  /**
   * Lookup data for LOOKUP_DROPDOWN fields.
   * Replaces the raw fetch() in view/page.js.
   */
  getLookupData: (table, valueColumn, labelColumn) =>
    API.get("/forms/lookup", {
      params: { table, valueColumn, labelColumn },
    }),

  // ── Form Visibility & Permissions ─────────────────────────────────────────
  updateVisibility: (formId, visibility) =>
    API.post(`/forms/${formId}/visibility?visibility=${visibility}`),

  getPermissions: (formId) => API.get(`/forms/${formId}/permissions`),

  addPermission: (formId, username, role) =>
    API.post(`/forms/${formId}/permissions?username=${username}&role=${role}`),

  removePermission: (formId, permissionId) =>
    API.delete(`/forms/${formId}/permissions/${permissionId}`),

  // ── Form Builder ──────────────────────────────────────────────────────────
  reorderFields: (formId, fieldIds) =>
    API.post(`/forms/${formId}/fields/reorder`, { fieldIds }),

  // ── File Upload ───────────────────────────────────────────────────────────
  /**
   * Upload a file. Returns { status, url, filename }.
   * Uses native fetch (multipart/form-data) — axios can do this too but
   * native fetch is simpler for FormData.
   */
  uploadFile: (file) => {
    const fd = new FormData();
    fd.append("file", file);
    return fetch(`${BASE_URL}/forms/upload`, {
      method: "POST",
      credentials: "include",
      body: fd,
    }).then((res) => {
      if (!res.ok) throw new Error("Upload failed");
      return res.json();
    });
  },

  // ── Dynamic Menu (sidebar) ────────────────────────────────────────────────
  getUserMenu: () => API.get("/menu"),

  // ── Module Management (admin) ─────────────────────────────────────────────
  getModules: () => API.get("/modules"),
  createModule: (data) => API.post("/modules", data),
  updateModule: (id, data) => API.put(`/modules/${id}`, data),
  deleteModule: (id) => API.delete(`/modules/${id}`),

  // ── Role Management (admin) ───────────────────────────────────────────────
  getRoles: () => API.get("/roles"),
  createRole: (data) => API.post("/roles", data),
  updateRole: (id, data) => API.put(`/roles/${id}`, data),
  deleteRole: (id) => API.delete(`/roles/${id}`),
  getRoleModules: (roleId) => API.get(`/roles/${roleId}/modules`),
  assignModulesToRole: (roleId, moduleIds) =>
    API.post(`/roles/${roleId}/modules`, { moduleIds }),
};