import axios from "axios";

const BASE_URL = "http://localhost:9090/api";

export const API = axios.create({
  baseURL: BASE_URL,
  withCredentials: true, // Send session cookie on every request
});

// ── Global 401 interceptor ───────────────────────────────────────────────────
// If the backend returns 401 and we're not already on /login, redirect there.
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      error.response?.status === 401 &&
      typeof window !== "undefined" &&
      !window.location.pathname.startsWith("/login")
    ) {
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);
