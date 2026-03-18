"use client";

import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import { AuthProvider } from "@/context/AuthContext";
import { FormsProvider } from "@/context/FormsContext";
import { Toaster } from "react-hot-toast";

export default function ClientLayout({ children }) {
  const pathname = usePathname();
  const isAuthPage = pathname === "/login" || pathname === "/register";

  if (isAuthPage) {
    return (
      <AuthProvider>
        <FormsProvider>
          {children}
          <Toaster position="top-right" />
        </FormsProvider>
      </AuthProvider>
    );
  }

  return (
    <AuthProvider>
      <FormsProvider>
        <div className="flex min-h-screen bg-[#F8FAFC]">
          <Sidebar />
          <div className="flex-1 flex flex-col overflow-hidden">
            <main className="flex-1 overflow-auto">
              {children}
            </main>
          </div>
        </div>
        <Toaster position="top-right" />
      </FormsProvider>
    </AuthProvider>
  );
}
