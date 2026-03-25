"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { 
  LayoutDashboard, 
  FileText, 
  Send, 
  Plus, 
  ChevronRight, 
  BarChart3, 
  Clock,
  ArrowRight
} from "lucide-react";
import { api } from "@/lib/api/formService";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { toast } from "react-hot-toast";

function DashboardContent() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await api.getDashboardStats();
        setStats(response?.data || null);
      } catch (err) {
        console.error("Dashboard stats failed:", err);
        toast.error("Failed to load dashboard metrics.");
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(d);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 font-medium animate-pulse">Loading Workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans p-6 md:p-12">
      <div className="max-w-7xl mx-auto space-y-12">
        
        {/* Welcome Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-4xl font-black tracking-tight text-slate-900 mb-2">
              Welcome back
            </h1>
            <p className="text-lg text-slate-500 font-medium">
              Here's what's happening with your forms today.
            </p>
          </div>
          {/* <div className="flex items-center gap-3">
            <Link 
              href="/"
              className="px-6 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all flex items-center gap-2 shadow-sm"
            >
              <span>View All Forms</span>
              <ArrowRight size={16} />
            </Link>
            <Link 
              href="/forms/new"
              className="px-6 py-3 bg-slate-900 text-white rounded-2xl text-sm font-bold hover:bg-indigo-600 transition-all flex items-center gap-2 shadow-xl shadow-slate-200"
            >
              <Plus size={18} />
              <span>Create New Form</span>
            </Link>
          </div> */}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { 
              label: "Total Forms", 
              value: stats?.totalForms || 0, 
              icon: <FileText className="text-indigo-600" />, 
              bg: "bg-indigo-50",
              sub: `${stats?.publishedForms || 0} Published • ${stats?.draftForms || 0} Drafts`
            },
            { 
              label: "Total Submissions", 
              value: stats?.totalSubmissions || 0, 
              icon: <Send className="text-emerald-600" />, 
              bg: "bg-emerald-50",
              sub: "Across all active forms"
            },
            { 
              label: "Live Forms", 
              value: stats?.publishedForms || 0, 
              icon: <BarChart3 className="text-amber-600" />, 
              bg: "bg-amber-50",
              sub: "Currently accepting data"
            },
            { 
              label: "Drafts", 
              value: stats?.draftForms || 0, 
              icon: <Clock className="text-slate-600" />, 
              bg: "bg-slate-100",
              sub: "Ready for publication"
            }
          ].map((item, idx) => (
            <div key={idx} className="bg-white border border-slate-200/60 p-8 rounded-[32px] shadow-sm hover:shadow-md transition-shadow">
              <div className={`w-12 h-12 ${item.bg} rounded-2xl flex items-center justify-center mb-6`}>
                {item.icon}
              </div>
              <p className="text-slate-500 text-sm font-bold uppercase tracking-wider mb-1">{item.label}</p>
              <h3 className="text-3xl font-black text-slate-900 mb-2">{item.value}</h3>
              <p className="text-xs text-slate-400 font-medium">{item.sub}</p>
            </div>
          ))}
        </div>

        {/* Recent Activity & Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          
          {/* Recent Forms */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-2xl font-black text-slate-900 flex items-center gap-3">
                <Clock className="text-indigo-600" size={24} />
                Recent Forms
              </h3>
            </div>
            
            <div className="bg-white border border-slate-200/60 rounded-[40px] overflow-hidden shadow-sm">
              {stats?.recentForms && stats.recentForms.length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {stats.recentForms.map((form) => (
                    <Link 
                      key={form.id} 
                      href={`/forms/${form.id}/builder`}
                      className="group flex items-center justify-between p-6 hover:bg-slate-50 transition-all"
                    >
                      <div className="flex items-center gap-5">
                        <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center group-hover:bg-white border border-transparent group-hover:border-slate-100 transition-all">
                          <FileText size={20} className="text-slate-400 group-hover:text-indigo-600" />
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900 text-lg group-hover:text-indigo-600 transition-colors">
                            {form.formName}
                          </h4>
                          <div className="flex items-center gap-3 mt-1">
                            <span className={`px-2 py-0.5 text-[10px] font-black uppercase tracking-widest rounded-md ${
                              form.status === 'PUBLISHED' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                            }`}>
                              {form.status}
                            </span>
                            <span className="text-xs text-slate-400 font-medium">
                              Updated {formatDate(form.updatedAt)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <ChevronRight size={20} className="text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="p-12 text-center">
                  <p className="text-slate-400 font-medium">No recent activity found.</p>
                </div>
              )}
            </div>
          </div>

          {/* Quick Shortcuts */}
          <div className="space-y-6">
            <h3 className="text-2xl font-black text-slate-900 px-2">
              Quick Shortcuts
            </h3>
            <div className="grid grid-cols-1 gap-4">
              {[
                { label: "Design Workspace", href: "/", desc: "Manage all your questionnaires", icon: <LayoutDashboard size={20} /> },
                { label: "New Project", href: "/forms/new", desc: "Start a blank canvas", icon: <Plus size={20} /> },
              ].map((link, idx) => (
                <Link 
                  key={idx}
                  href={link.href}
                  className="p-6 bg-white border border-slate-200/60 rounded-3xl hover:border-indigo-500/50 hover:shadow-lg transition-all group"
                >
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-slate-50 rounded-xl text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-all">
                      {link.icon}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 mb-1 group-hover:text-indigo-600 transition-colors">{link.label}</h4>
                      <p className="text-sm text-slate-500 font-medium">{link.desc}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <AuthGuard>
      <DashboardContent />
    </AuthGuard>
  );
}
