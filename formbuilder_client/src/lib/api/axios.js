import axios from "axios";

// ─── Single source of truth for the API base URL ────────────────────────────
// Change this one line for staging/production — never hardcode in page files.
const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:9090/api";

export const API = axios.create({
  baseURL: BASE_URL,
  withCredentials: true, // Send session cookie on every request
});

// ── Interceptor 1: unwrap response envelope ──────────────────────────────────
// Every backend response is { success, message, data, errors, meta }.
// We return response.data so call-sites receive the envelope directly,
// and individual .data accesses get the payload.
API.interceptors.response.use(
  (response) => response.data,
  (error) => Promise.reject(error)
);

// ── Interceptor 2: handle 401 — session expired ──────────────────────────────
// Must be registered AFTER the success interceptor so it runs on the
// rejected branch only. Redirects to /login preserving the current path.
API.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const isLoginPage =
      typeof window !== "undefined" &&
      window.location.pathname === "/login";

    const isAuthMe = error?.config?.url?.includes("/auth/me");

    if (status === 401 && !isLoginPage && !isAuthMe) {
      const redirect = encodeURIComponent(window.location.pathname);
      window.location.href = `/login?redirect=${redirect}`;
    }

    return Promise.reject(error);
  }
);

// Export BASE_URL so api/formService.js (or fetch() fallbacks) can reuse it
export { BASE_URL };