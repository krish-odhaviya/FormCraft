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
  getAllPublishedForms: () => API.get("/forms/published-list"),
  getSubmissions: (formId) => API.get(`/forms/${formId}/submissions`),
  deleteSubmission: (formId, submissionId) =>
    API.delete(`/forms/${formId}/submissions/${submissionId}`),
  getForm: (formId) => API.get(`/forms/${formId}`),
  createForm: (name, description) =>
    API.post("/forms", { name, description }),

  // ── Versions ──────────────────────────────────────────────────────────────
  createDraftVersion: (formId) => API.post(`/forms/${formId}/versions`),

  saveDraft: (versionId, fields) =>
    API.post(`/versions/${versionId}/draft`, fields),

  publishVersion: (versionId) => API.post(`/versions/${versionId}/publish`),

  // Optional (if still needed)
  reorderFields: (versionId, fieldIds) =>
    API.post(`/versions/${versionId}/fields/reorder`, { fieldIds }),
};

