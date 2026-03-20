"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

/**
 * useAdminGuard
 *
 * Replaces the copy-pasted admin check in every admin page:
 *
 *   const isSystemAdmin = user?.roles?.some(r => r === "ROLE_SYSTEM_ADMIN" || r === "ROLE_ADMIN");
 *   useEffect(() => { if (user && !isSystemAdmin) router.replace("/"); }, [user, isSystemAdmin]);
 *
 * Usage:
 *   const { isSystemAdmin, isReady } = useAdminGuard();
 *   if (!isReady) return null; // still checking
 *
 * Returns:
 *   isSystemAdmin — boolean, true once confirmed
 *   isReady       — false while auth is loading or redirect is pending
 */
export function useAdminGuard() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const isSystemAdmin = Boolean(
    user?.roles?.some(
      (r) => r === "ROLE_SYSTEM_ADMIN" || r === "ROLE_ADMIN"
    )
  );

  useEffect(() => {
    if (loading) return;
    if (!user || !isSystemAdmin) {
      router.replace("/");
    }
  }, [loading, user, isSystemAdmin, router]);

  // isReady = auth has resolved AND user is confirmed as admin
  const isReady = !loading && isSystemAdmin;

  return { isSystemAdmin, isReady };
}