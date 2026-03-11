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
  getUsers: () => API.get("/users"),
  registerAdmin: (username, password) =>
    API.post("/users/register", { username, password }),
  deleteUser: (id) => API.delete(`/users/${id}`),


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

  saveDraft: (formId, fields) =>
    API.post(`/forms/${formId}/draft`, fields),

  publishForm: (formId) => API.post(`/forms/${formId}/publish`),

  archiveForm: (formId) => API.post(`/forms/${formId}/archive`),

  // Optional (if still needed)
  reorderFields: (formId, fieldIds) =>
    API.post(`/forms/${formId}/fields/reorder`, { fieldIds }),
};

