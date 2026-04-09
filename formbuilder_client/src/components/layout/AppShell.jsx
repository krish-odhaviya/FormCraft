"use client";

import Sidebar from "@/components/layout/Sidebar";
import { ToastContainer } from "@/components/ui/Toast";

export function AppShell({ children }) {
  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {children}
      </div>
      <ToastContainer />
    </div>
  );
}
