import axios from "axios";

const BASE_URL = "http://localhost:9090/api";

export const API = axios.create({
  baseURL: BASE_URL,
  withCredentials: true, // Send session cookie on every request
});

// ── Global response interceptor ──────────────────────────────────────────────
// 401 = session expired or not logged in → redirect to login
// All other errors are passed through for individual pages to handle.
API.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const isLoginPage = typeof window !== "undefined" &&
      window.location.pathname === "/login";

    if (status === 401 && !isLoginPage) {
      // Session expired — redirect to login preserving the current path
      const redirect = window.location.pathname;
      window.location.href = `/login?redirect=${encodeURIComponent(redirect)}`;
    }

    return Promise.reject(error);
  }
);