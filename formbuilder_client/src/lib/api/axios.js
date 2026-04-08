import axios from "axios";
import { API_ROOT } from "../constants";

export const API = axios.create({
  baseURL: API_ROOT,
  withCredentials: true,
});

// Helper to get cookie by name
function getCookie(name) {
  if (typeof document === "undefined") return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(";").shift();
  return null;
}

// CSRF Injection Interceptor
API.interceptors.request.use((config) => {
  const token = getCookie("XSRF-TOKEN");
  if (token) {
    config.headers["X-XSRF-TOKEN"] = token;
  }
  return config;
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

// Export API_ROOT as BASE_URL for backward compatibility
export { API_ROOT as BASE_URL };