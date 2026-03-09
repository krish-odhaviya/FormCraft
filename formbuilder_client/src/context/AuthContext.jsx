"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { api } from "@/lib/api/formService";

const AuthContext = createContext(null);

/**
 * AuthProvider wraps the entire app (in layout.js).
 * On mount it calls /api/auth/me to restore session state.
 * All pages can call useAuth() to read/update the session.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);   // null = not yet checked
  const [loading, setLoading] = useState(true);

  // ── Restore session on page load / refresh ─────────────────────────────
  useEffect(() => {
    api.getMe()
      .then((res) => {
        setUser(res?.data ?? null);
      })
      .catch(() => {
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  // ── Login ──────────────────────────────────────────────────────────────
  const login = useCallback(async (username, password) => {
    const res = await api.login(username, password);
    const userData = res?.data ?? null;
    setUser(userData);
    return userData;
  }, []);

  // ── Logout ─────────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    try {
      await api.logout();
    } catch (_) {
      // Ignore network error — still clear local state
    } finally {
      setUser(null);
    }
  }, []);

  const isAuthenticated = Boolean(user);

  return (
    <AuthContext.Provider value={{ user, loading, isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
