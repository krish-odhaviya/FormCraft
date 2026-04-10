"use client";

import { usePathname } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import { AuthProvider } from "@/context/AuthContext";
import { FormsProvider } from "@/context/FormsContext";
import { Toaster, ToastBar, toast } from "react-hot-toast";
import { X } from "lucide-react";

import { ConfirmationProvider } from "@/context/ConfirmationContext";

export default function ClientLayout({ children }) {
  const pathname = usePathname();
  const isPublicPage = pathname === "/login" || pathname === "/register" || pathname === "/api-reference" || pathname === "/architecture" || pathname.includes("/builder") || pathname.endsWith("/view");

  if (isPublicPage) {
    return (
      <AuthProvider>
        <FormsProvider>
          <ConfirmationProvider>
            {children}
            <Toaster position="top-center">
              {(t) => (
                <ToastBar toast={t}>
                  {({ icon, message }) => (
                    <div className="flex items-center gap-2">
                      {icon}
                      <div className="text-sm font-medium">{message}</div>
                      {t.type !== 'loading' && (
                        <button 
                          onClick={() => toast.dismiss(t.id)}
                          className="ml-2 p-1 hover:bg-slate-100/10 rounded-full transition-colors opacity-60 hover:opacity-100"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  )}
                </ToastBar>
              )}
            </Toaster>
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
          <Toaster position="top-center">
            {(t) => (
              <ToastBar toast={t}>
                {({ icon, message }) => (
                  <div className="flex items-center gap-2">
                    {icon}
                    <div className="text-sm font-medium">{message}</div>
                    {t.type !== 'loading' && (
                      <button 
                        onClick={() => toast.dismiss(t.id)}
                        className="ml-2 p-1 hover:bg-black/5 rounded-full transition-colors opacity-60 hover:opacity-100"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                )}
              </ToastBar>
            )}
          </Toaster>
        </ConfirmationProvider>
      </FormsProvider>
    </AuthProvider>
  );
}
