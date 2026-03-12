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
    // We handle auth redirection in AuthContext and individual pages
    return Promise.reject(error);
  }
);
