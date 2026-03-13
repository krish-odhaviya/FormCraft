import { API } from "./axios";

API.interceptors.response.use((response) => response.data);

export const api = {
  // ── Auth ─────────────────────────────────────────────────────────────────
  login: (username, password) =>
    API.post("/auth/login", { username, password }),

  logout: () => API.post("/auth/logout"),

  getMe: () => API.get("/auth/me"),

  register: (username, password) =>
    API.post("/auth/register", { username, password }),

  // ── User Management (admin only) ──────────────────────────────────────────
  getAdminUsers: () => API.get("/admin/users"),
  updateUserRole: (userId, role) => API.post(`/admin/users/${userId}/role?role=${role}`),
  toggleUserStatus: (userId, enabled) => API.post(`/admin/users/${userId}/enable?enabled=${enabled}`),

  // ── Access Requests ───────────────────────────────────────────────────────
  createAccessRequest: (formId, type, reason) =>
    API.post("/requests", { formId, type, reason }),
  getMyRequests: () => API.get("/requests/my"),
  getPendingRequests: () => API.get("/requests/pending"),
  processRequest: (requestId, status, role) =>
    API.post(`/requests/${requestId}/process?status=${status}${role ? `&role=${role}` : ""}`),


  // ── Forms ─────────────────────────────────────────────────────────────────
  getAllForms: () => API.get("/forms"),
  getAllPublishedForms: (excludeFormId) => API.get(`/forms/published-list${excludeFormId ? `?excludeFormId=${excludeFormId}` : ''}`),

  getSubmissions: (formId) => API.get(`/forms/${formId}/submissions`),
  deleteSubmission: (formId, submissionId) =>
    API.delete(`/forms/${formId}/submissions/${submissionId}`),
  deleteSubmissionsBulk: (formId, submissionIds) =>
    API.post(`/forms/${formId}/submissions/bulk-delete`, submissionIds),
  getForm: (formId) => API.get(`/forms/${formId}`),
  createForm: (name, description) =>
    API.post("/forms", { name, description }),

  submitForm: (formId, values) =>
    API.post("/forms/submit", { formId, values }),

  saveDraft: (formId, fields) =>
    API.post(`/forms/${formId}/draft`, fields),

  publishForm: (formId) => API.post(`/forms/${formId}/publish`),

  archiveForm: (formId) => API.post(`/forms/${formId}/archive`),

  // ── Form Visibility & Permissions ──────────────────────────────────────────
  updateVisibility: (formId, visibility) =>
    API.post(`/forms/${formId}/visibility?visibility=${visibility}`),
  
  getPermissions: (formId) => API.get(`/forms/${formId}/permissions`),
  
  addPermission: (formId, username, role) =>
    API.post(`/forms/${formId}/permissions?username=${username}&role=${role}`),
  
  removePermission: (formId, permissionId) =>
    API.delete(`/forms/${formId}/permissions/${permissionId}`),

  // Optional (if still needed)
  reorderFields: (formId, fieldIds) =>
    API.post(`/forms/${formId}/fields/reorder`, { fieldIds }),

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
  assignModulesToRole: (roleId, moduleIds) => API.post(`/roles/${roleId}/modules`, { moduleIds }),
  assignRoleToUser: (roleId, userId) => API.post(`/roles/${roleId}/users/${userId}`),
};

