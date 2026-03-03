"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { 
  Plus, 
  FileText, 
  PenLine, 
  ExternalLink, 
  Loader2,
  Inbox
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
    <div className="min-h-screen bg-slate-50/50 pb-12">
      {/* Top Header Section */}
      <div className="bg-white border-b border-slate-200 px-8 py-6 mb-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">FormCraft</h1>
            <p className="text-sm text-slate-500 mt-1">
              Manage and track all your data collection forms.
            </p>
          </div>
          <Link 
            href="/forms/new"
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 transition-colors text-white px-5 py-2.5 rounded-lg text-sm font-medium shadow-sm hover:shadow"
          >
            <Plus size={18} />
            Create Form
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8">
        {/* Statistics / Summary Bar */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-600 bg-white px-4 py-2 rounded-full border border-slate-200 shadow-sm">
            <FileText size={16} className="text-indigo-500" />
            Total Forms: <span className="text-slate-900">{loading ? "..." : forms.length}</span>
          </div>
        </div>

        {/* Loading State: Skeletons */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div key={n} className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm animate-pulse">
                <div className="h-6 bg-slate-200 rounded-md w-2/3 mb-3"></div>
                <div className="h-4 bg-slate-100 rounded-md w-full mb-2"></div>
                <div className="h-4 bg-slate-100 rounded-md w-4/5 mb-8"></div>
                <div className="flex gap-3">
                  <div className="h-9 bg-slate-100 rounded-lg w-24"></div>
                  <div className="h-9 bg-slate-100 rounded-lg w-24"></div>
                </div>
              </div>
            ))}
          </div>
        ) : forms.length === 0 ? (
          /* Empty State */
          <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-12 text-center flex flex-col items-center justify-center min-h-[400px]">
            <div className="bg-indigo-50 p-4 rounded-full mb-4">
              <Inbox size={32} className="text-indigo-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">No forms created yet</h3>
            <p className="text-slate-500 max-w-sm mb-6">
              Get started by creating your first form to start collecting responses from your users.
            </p>
            <Link 
              href="/forms/new"
              className="flex items-center gap-2 bg-white border border-slate-200 hover:border-indigo-600 hover:bg-indigo-50 transition-all text-indigo-600 px-5 py-2.5 rounded-lg text-sm font-medium shadow-sm"
            >
              <Plus size={18} />
              Create your first form
            </Link>
          </div>
        ) : (
          /* Forms Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {forms.map((form) => (
              <div 
                key={form.id} 
                className="group bg-white border border-slate-200 rounded-xl p-6 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all duration-200 flex flex-col h-full"
              >
                <div className="flex-1">
                  <h3 className="font-semibold text-lg text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1 mb-2">
                    {form.name}
                  </h3>
                  <p className="text-sm text-slate-500 line-clamp-2 leading-relaxed">
                    {form.description || "No description provided."}
                  </p>
                </div>
                
                {/* Card Footer Actions */}
                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-3">
                  <Link 
                    href={`/forms/${form.id}/builder`}
                    className="flex-1 flex items-center justify-center gap-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    <PenLine size={16} />
                    Builder
                  </Link>

                  <Link 
                    href={`/forms/${form.id}/view`}
                    className="flex-1 flex items-center justify-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    <ExternalLink size={16} />
                    View Live
                  </Link>

                   <Link 
                    href={`/forms/${form.id}/submissions`}
                    className="flex-1 flex items-center justify-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    <ExternalLink size={16} />
                    View Submissions
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