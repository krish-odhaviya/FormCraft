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

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [menuTree, setMenuTree] = useState([]);   // original tree — for Sidebar rendering
  const [menuFlat, setMenuFlat] = useState([]);   // flattened — for hasModule() lookup

  // ── Flatten the menu tree into a flat array for lookup ─────────────────
  const flattenMenu = (items = []) => {
    const result = [];
    for (const item of items) {
      result.push(item);
      if (item.children?.length) result.push(...flattenMenu(item.children));
    }
    return result;
  };

  // ── Fetch and store the user's menu ────────────────────────────────────
  const loadMenu = useCallback(async (userData) => {
    if (!userData) { setMenuTree([]); setMenuFlat([]); return; }
    try {
      const res = await api.getUserMenu();
      const tree = res?.data || [];
      setMenuTree(tree);              // keep original tree for Sidebar
      setMenuFlat(flattenMenu(tree)); // flatten for hasModule()
    } catch {
      setMenuTree([]);
      setMenuFlat([]);
    }
  }, []);

  // ── Restore session on page load / refresh ─────────────────────────────
  useEffect(() => {
    api.getMe()
      .then(async (res) => {
        const userData = res?.data ?? null;
        setUser(userData);
        await loadMenu(userData);
      })
      .catch(() => {
        setUser(null);
        setMenuTree([]);
        setMenuFlat([]);
      })
      .finally(() => setLoading(false));
  }, []);

  // ── Login ──────────────────────────────────────────────────────────────
  const login = useCallback(async (username, password) => {
    const res = await api.login(username, password);
    const userData = res?.data ?? null;
    setUser(userData);
    await loadMenu(userData);
    return userData;
  }, [loadMenu]);

  // ── Logout ─────────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    try {
      await api.logout();
    } catch (_) { /* ignore */ }
    finally {
      setUser(null);
      setMenuTree([]);
      setMenuFlat([]);
    }
  }, []);

  /**
   * Returns true if the user has the named module assigned to their role.
   * SYSTEM_ADMIN always has all modules so their menu contains everything.
   *
   * Usage:  const { hasModule } = useAuth();
   *         hasModule("Create New Form")  →  true / false
   */
  const hasModule = useCallback((moduleName) => {
    return menuFlat.some(item => item.moduleName === moduleName);
  }, [menuFlat]);

  const isAuthenticated = Boolean(user);

  return (
    <AuthContext.Provider value={{
      user, loading, isAuthenticated,
      login, logout,
      menuItems: menuTree,  // Sidebar uses this — original tree structure
      hasModule,            // pages use this — checks the flat list
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}