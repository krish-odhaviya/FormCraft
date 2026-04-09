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
import { ENDPOINTS } from "../constants";

export const api = {
  // ── Auth ──────────────────────────────────────────────────────────────────
  login: (username, password) =>
    API.post(ENDPOINTS.AUTH_LOGIN, { username, password }),

  logout: () => API.post(ENDPOINTS.AUTH_LOGOUT),

  getMe: () => API.get(ENDPOINTS.AUTH_ME),

  register: (username, password) =>
    API.post(ENDPOINTS.AUTH_REGISTER, { username, password }),

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
  getDashboardStats: () => API.get(ENDPOINTS.DASHBOARD_STATS),

  // ── Forms ─────────────────────────────────────────────────────────────────
  getAllForms: ({ page = 1, size = 10, sortBy = "createdAt", sortDir = "desc" } = {}) =>
    API.get(ENDPOINTS.FORMS, {
      params: {
        page: page > 0 ? page - 1 : 0,
        size,
        sortBy,
        sortDir
      }
    }),

  getAllPublishedForms: (excludeFormId) =>
    API.get(
      `${ENDPOINTS.PUBLISHED_LIST}${excludeFormId ? `?excludeFormId=${excludeFormId}` : ""}`
    ),

  getForm: (formId, params = {}) =>
    API.get(ENDPOINTS.formDetail(formId), { params }),

  getFormByCode: (code, params = {}) =>
    API.get(`${ENDPOINTS.FORMS}/code/${code}`, { params }),

  /**
   * SRS §3.2 — Create a new form.
   */
  createForm: (name, code, description) => API.post(ENDPOINTS.FORMS, { name, code, description }),

  // TODO: Superseded by submitByCode. Referenced by legacy src/app/forms/[formId]/view/page.js
  submitForm: (formId, values, formVersionId) =>
    API.post(ENDPOINTS.FORMS_SUBMIT, { formId, values, formVersionId }),

  getFormVersions: (formId) => API.get(ENDPOINTS.formVersions(formId)),

  getFormVersion: (formId, versionId) => API.get(ENDPOINTS.formVersion(formId, versionId)),

  createFormVersion: (formId) => API.post(ENDPOINTS.formVersions(formId)),

  activateFormVersion: (formId, versionId) => API.post(ENDPOINTS.activateVersion(formId, versionId)),

  saveDraft: (formId, fields) => API.post(ENDPOINTS.formDraft(formId), fields),

  // ── Runtime Form APIs (SRS §4.1) ─────────────────────────────────────────
  getRuntimeForm: (formCode) => API.get(ENDPOINTS.runtimeForm(formCode)),

  saveDraftByCode: (formCode, formVersionId, data) =>
    API.post(ENDPOINTS.runtimeDraft(formCode), { formVersionId, data }),

  getDraftByCode: (formCode) =>
    API.get(ENDPOINTS.runtimeDraft(formCode)),

  submitByCode: (formCode, values, formVersionId) =>
    API.post(ENDPOINTS.runtimeSubmit(formCode), { values, formVersionId }),

  // ── Public Draft Save & Resume (legacy, keyed by formId) ─────────────────
  // TODO: Superseded by saveDraftByCode. Referenced by legacy src/app/forms/[formId]/view/page.js
  saveDraftSubmission: (formId, formVersionId, data) =>
    API.post(ENDPOINTS.SUBMISSIONS_DRAFT, { formId, formVersionId, data }),

  // TODO: Superseded by getDraftByCode. Referenced by legacy src/app/forms/[formId]/view/page.js
  getDraftSubmission: (formId) =>
    API.get(ENDPOINTS.SUBMISSIONS_DRAFT, { params: { formId } }),

  publishForm: (formId, fields = null) =>
    API.post(ENDPOINTS.formPublish(formId), fields ? { fields } : null),

  archiveForm: (formId) => API.post(ENDPOINTS.formArchive(formId)),
  restoreForm: (formId) => API.post(ENDPOINTS.formReactivate(formId)),
  restoreSubmission: (formId, submissionId) => API.post(ENDPOINTS.restoreResponse(formId, submissionId)),
  restoreSubmissionsBulk: (formId, submissionIds) => API.post(ENDPOINTS.bulkRestoreResponses(formId), submissionIds),

  // ── Submissions ───────────────────────────────────────────────────────────
  getSubmissionsPaged: (formId, { page = 1, size = 10, search = "", sortBy = "id", sortDir = "desc", versionId = null, showDeleted = false } = {}) =>
    API.get(ENDPOINTS.formSubmissions(formId), {
      params: {
        page: page > 0 ? page - 1 : 0,
        size,
        search,
        sort: `${sortBy},${sortDir}`,
        versionId: versionId || undefined,
        showDeleted
      },
    }),

  getSubmissionDetail: (formId, submissionId) =>
    API.get(`${ENDPOINTS.formSubmissions(formId)}/${submissionId}`),

  deleteSubmission: (formId, submissionId) =>
    API.delete(`${ENDPOINTS.formSubmissions(formId)}/${submissionId}`),

  deleteSubmissionsBulk: (formId, submissionIds) =>
    API.post(`${ENDPOINTS.formSubmissions(formId)}/bulk-delete`, submissionIds),

  exportSubmissions: (formId, { search = "", format = "csv", versionId = null } = {}) => {
    return API.get(ENDPOINTS.formSubmissionsExport(formId), {
      params: { search, format, versionId: versionId || undefined },
      responseType: 'blob',
    });
  },

  getLookupData: (table, valueColumn, labelColumn) =>
    API.get(ENDPOINTS.LOOKUP, {
      params: { table, valueColumn, labelColumn },
    }),

  // ── Form Visibility & Permissions ─────────────────────────────────────────
  updateVisibility: (formId, visibility) =>
    API.post(`${ENDPOINTS.formDetail(formId)}/visibility?visibility=${visibility}`),

  getPermissions: (formId) => API.get(ENDPOINTS.formPermissions(formId)),

  addPermission: (formId, username, role) =>
    API.post(`${ENDPOINTS.formPermissions(formId)}?username=${username}&role=${role}`),

  removePermission: (formId, permissionId) =>
    API.delete(`${ENDPOINTS.formPermissions(formId)}/${permissionId}`),

  reorderFields: (formId, fieldIds) =>
    API.post(`${ENDPOINTS.formFields(formId)}/reorder`, { fieldIds }),

  getValidations: (formId) => API.get(ENDPOINTS.formValidations(formId)),
  saveValidations: (formId, validations) => API.post(ENDPOINTS.formValidations(formId), validations),

  // ── File Upload ───────────────────────────────────────────────────────────
  uploadFile: (file) => {
    const fd = new FormData();
    fd.append("file", file);
    return API.post(ENDPOINTS.UPLOAD, fd, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },

  // ── Dynamic Menu (sidebar) ────────────────────────────────────────────────
  getUserMenu: () => API.get("/menu"),

  // ── Module Management (admin) ─────────────────────────────────────────────
  getModules: () => API.get(ENDPOINTS.MODULES),
  createModule: (data) => API.post(ENDPOINTS.MODULES, data),
  updateModule: (id, data) => API.put(`${ENDPOINTS.MODULES}/${id}`, data),
  deleteModule: (id) => API.delete(`${ENDPOINTS.MODULES}/${id}`),

  // ── Role Management (admin) ───────────────────────────────────────────────
  getRoles: () => API.get(ENDPOINTS.ROLES),
  createRole: (data) => API.post(ENDPOINTS.ROLES, data),
  updateRole: (id, data) => API.put(`${ENDPOINTS.ROLES}/${id}`, data),
  deleteRole: (id) => API.delete(`${ENDPOINTS.ROLES}/${id}`),
  getRoleModules: (roleId) => API.get(`${ENDPOINTS.ROLES}/${roleId}/modules`),
  assignModulesToRole: (roleId, moduleIds) =>
    API.post(`${ENDPOINTS.ROLES}/${roleId}/modules`, { moduleIds }),
};