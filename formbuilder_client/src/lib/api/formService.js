import { API } from "./axios";

API.interceptors.response.use((response) => response.data);

export const api = {
  // Forms
  getAllForms: () => API.get("/forms"),
  getSubmissions: (formId) => API.get(`/forms/${formId}/submissions`),
  deleteSubmission: (formId, submissionId) => API.delete(`/forms/${formId}/submissions/${submissionId}`),
  getForm: (formId) => API.get(`/forms/${formId}`),
  createForm: (name, description) => API.post("/forms", { name, description }),

  // Versions
  createDraftVersion: (formId) => API.post(`/forms/${formId}/versions`),

  saveDraft: (versionId, fields) =>
    API.post(`/versions/${versionId}/draft`, fields),

  publishVersion: (versionId) => API.post(`/versions/${versionId}/publish`),

  // Optional (if still needed)
  reorderFields: (versionId, fieldIds) =>
    API.post(`/versions/${versionId}/fields/reorder`, { fieldIds }),

  showForm: () => API.get(`/forms/${versionId}`),
};
