"use client";

import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import { AuthProvider } from "@/context/AuthContext";
import { FormsProvider } from "@/context/FormsContext";
import { Toaster } from "react-hot-toast";

import { ConfirmationProvider } from "@/context/ConfirmationContext";

export default function ClientLayout({ children }) {
  const pathname = usePathname();
  const isPublicPage = pathname === "/login" || pathname === "/register" || pathname.includes("/builder") || pathname.endsWith("/view");

  if (isPublicPage) {
    return (
      <AuthProvider>
        <FormsProvider>
          <ConfirmationProvider>
            {children}
            <Toaster position="top-right" />
          </ConfirmationProvider>
        </FormsProvider>
      </AuthProvider>
    );
  }

  return (
    <AuthProvider>
      <FormsProvider>
        <ConfirmationProvider>
          <div className="flex min-h-screen bg-[#F8FAFC]">
            <Sidebar />
            <div className="flex-1 flex flex-col overflow-hidden">
              <main className="flex-1 overflow-auto">
                {children}
              </main>
            </div>
          </div>
          <Toaster position="top-right" />
        </ConfirmationProvider>
      </FormsProvider>
    </AuthProvider>
  );
}
