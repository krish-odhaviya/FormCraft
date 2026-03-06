"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { 
  Plus, 
  FileText, 
  PenLine, 
  ExternalLink, 
  Inbox,
  BarChart2,
  Settings2
} from "lucide-react";
import { api } from "@/lib/api/formService";

export default function DashboardPage() {
  const [forms, setForms] = useState([]); 
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchForms = async () => {
      try {
        const response = await api.getAllForms();
        setForms(response?.data || []); 

        console.log(response?.data)
      } catch (err) {
        console.error("Failed to fetch forms:", err);
        setForms([]); 
      } finally {
        setLoading(false);
      }
    };
    fetchForms();
  }, []);

  return (
    <div className="min-h-screen bg-[#FDFDFD]">
      {/* Utility Navigation Bar */}
      <div className="bg-white border-b border-slate-100 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <h1 className="text-lg font-bold tracking-tight text-slate-900">FormCraft</h1>
            <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-500">
              <span className="text-indigo-600 border-b-2 border-indigo-600 py-5">Forms</span>
              <span className="hover:text-slate-900 cursor-not-allowed">Analytics</span>
              <span className="hover:text-slate-900 cursor-not-allowed">Settings</span>
            </nav>
          </div>
          <Link 
            href="/forms/new"
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all shadow-sm shadow-indigo-200"
          >
            <Plus size={16} strokeWidth={3} />
            New Form
          </Link>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-10">
        {/* Header Section */}
        <div className="mb-10">
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Your Forms</h2>
          <p className="text-slate-500 mt-2">Manage your data collection and view live results.</p>
        </div>

        {loading ? (
          /* Sleek Skeleton */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div key={n} className="bg-white border border-slate-200 rounded-xl p-6 h-56 animate-pulse">
                <div className="h-4 bg-slate-100 rounded w-1/2 mb-4"></div>
                <div className="h-3 bg-slate-50 rounded w-full mb-2"></div>
                <div className="h-3 bg-slate-50 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        ) : forms.length === 0 ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center py-20 bg-slate-50/50 border-2 border-dashed border-slate-200 rounded-3xl">
            <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-4 border border-slate-100">
              <Inbox size={28} className="text-slate-300" />
            </div>
            <p className="text-slate-900 font-semibold text-lg">No forms found</p>
            <p className="text-slate-500 text-sm mb-6">Get started by building your first questionnaire.</p>
            <Link href="/forms/new" className="text-indigo-600 font-bold hover:underline">Create a form &rarr;</Link>
          </div>
        ) : (
          /* Form Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {forms.map((form) => (
              <div 
                key={form.id} 
                className="group bg-white border border-slate-200 rounded-2xl p-6 hover:border-indigo-500 transition-all duration-300 flex flex-col hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
              >
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-4">
                    <Settings2 size={16} className="text-slate-300 hover:text-slate-600 cursor-pointer" />
                  </div>
                  
                  <h3 className="font-bold text-slate-900 text-lg mb-2 truncate">
                    {form.name}
                  </h3>
                  <p className="text-slate-500 text-sm leading-relaxed line-clamp-2">
                    {form.description || "No description provided."}
                  </p>
                </div>
                
                {/* Actions Panel */}
                <div className="mt-8 flex items-center gap-2">
                  <Link 
                    href={`/forms/${form.id}/builder`}
                    className="flex-[2] flex items-center justify-center gap-2 text-slate-900 bg-white py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-600 hover:text-white transition-colors"
                  >
                    <PenLine size={14} />
                    Edit
                  </Link>

                  <Link 
                    href={`/forms/${form.id}/submissions`}
                    className="flex-1 flex items-center justify-center bg-slate-50 text-slate-600 py-2.5 rounded-xl hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                    title="View Submissions"
                  >
                    <BarChart2 size={18} />
                  </Link>

                  <Link 
                    href={`/forms/${form.id}/view`}
                    className="flex-1 flex items-center justify-center bg-slate-50 text-slate-600 py-2.5 rounded-xl hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                    title="Live Link"
                  >
                    <ExternalLink size={18} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}