"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus,
  PenLine,
  ExternalLink,
  Inbox,
  BarChart2,
  Settings2,
  LogOut,
  LayoutDashboard,
  Search,
  Archive,
  ShieldCheck,
  Users,
  Bell,
  Lock
} from "lucide-react";
import { api } from "@/lib/api/formService";
import { useAuth } from "@/context/AuthContext";
import { AuthGuard } from "@/components/auth/AuthGuard";

function DashboardContent() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("ALL"); // ALL, LIVE, SHARED, DRAFTS, ARCHIVED

  const isAdmin = user?.role === "ADMIN";
  const canCreate = isAdmin || user?.canCreateForm;
  const canEditAny = isAdmin || user?.canEditForm;
  const canArchiveAny = isAdmin || user?.canArchiveForm;
  const canViewSubsAny = isAdmin || user?.canViewSubmissions;

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

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  const handleArchive = async (formId) => {
    if (!window.confirm("Are you sure you want to archive this form? This will stop all new submissions.")) return;
    try {
      await api.archiveForm(formId);
      setForms((prev) =>
        prev.map((f) => (f.id === formId ? { ...f, status: "ARCHIVED" } : f))
      );
    } catch (err) {
      console.error("Failed to archive form:", err);
      alert("Failed to archive form.");
    }
  };

  const filteredForms = forms.filter((f) => {
    const matchesSearch = f.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    switch (activeTab) {
      case "LIVE":     return f.status === "PUBLISHED";
      case "DRAFTS":   return f.status === "DRAFT";
      case "ARCHIVED": return f.status === "ARCHIVED";
      case "SHARED":   return f.ownerUsername !== user?.username;
      case "ALL":      return true;
      default:         return true;
    }
  });

  const getEmptyMessage = () => {
    if (searchQuery) return "No matches found for your search.";
    switch (activeTab) {
      case "LIVE":     return "No live forms yet. Publish a draft to see it here.";
      case "DRAFTS":   return "No draft forms. Create a new form to get started.";
      case "ARCHIVED": return "No archived forms.";
      case "SHARED":   return "No forms have been shared with you yet.";
      default:         return "Get started by building your first questionnaire.";
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans text-slate-900">
      {/* Navigation Bar */}
      <div className="bg-white/80 backdrop-blur-md border-b border-slate-200/60 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-10">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
                <LayoutDashboard size={20} className="text-white" />
              </div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">FormCraft</h1>
            </div>

            <nav className="hidden md:flex items-center gap-1">
              <span className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg text-sm font-semibold">
                Dashboard
              </span>
              <button className="px-4 py-2 text-slate-500 hover:bg-slate-50 rounded-lg text-sm font-medium transition-colors">
                Templates
              </button>
              {/* <Link
                href="/requests"
                className="px-4 py-2 text-slate-500 hover:bg-slate-50 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              >
                <Bell size={16} />
                Requests
              </Link> */}
              {user?.roles?.includes("ROLE_ADMIN") && (
                <Link
                  href="/admin"
                  className="px-4 py-2 text-slate-500 hover:bg-slate-50 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                >
                  <ShieldCheck size={16} />
                  Admin Panel
                </Link>
              )}
            </nav>
          </div>

          <div className="flex items-center gap-4">
            {user && (
              <div className="hidden lg:flex items-center gap-3 px-3 py-1.5 bg-white border border-slate-200 rounded-full shadow-sm">
                <div className="w-7 h-7 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 text-[10px] font-bold">
                  {user.username?.charAt(0).toUpperCase() || "U"}
                </div>
                <span className="text-sm font-semibold text-slate-700 pr-1">
                  {user.username}
                </span>
              </div>
            )}

            <button
              onClick={handleLogout}
              className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
              title="Sign Out"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-6 py-12">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div>
            <h2 className="text-4xl font-black text-slate-900 tracking-tight mb-2">
              Workspace
            </h2>
            <p className="text-slate-500 text-lg">
              Forms you own or have been shared with you.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative group">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                size={18}
              />
              <input
                type="text"
                placeholder="Search forms..."
                className="pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all w-64"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            {canCreate && (
              <Link
                href="/forms/new"
                className="flex items-center justify-center gap-2 bg-[#0F172A] text-white hover:bg-slate-800  px-6 py-3 rounded-2xl text-sm font-bold transition-all shadow-xl shadow-slate-200 active:scale-95 whitespace-nowrap"
              >
                <Plus size={18} strokeWidth={3} className="text-white" />
                <span className="text-white">Create New</span>
              </Link>
            )}
          </div>
        </div>
        {/* Tabs Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 border-b border-slate-200">
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-[1px]">
            {[
              { id: "ALL",      label: "All Forms", icon: <Inbox size={16} /> },
              { id: "LIVE",     label: "Live",      icon: <ExternalLink size={16} /> },
              { id: "SHARED",   label: "Shared",    icon: <Users size={16} /> },
              { id: "DRAFTS",   label: "Drafts",    icon: <PenLine size={16} /> },
              { id: "ARCHIVED", label: "Archived",  icon: <Archive size={16} /> },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-3.5 text-sm font-bold transition-all relative whitespace-nowrap ${
                  activeTab === tab.id
                    ? "text-indigo-600"
                    : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                }`}
              >
                {tab.icon}
                {tab.label}
                {activeTab === tab.id && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-full animate-in fade-in" />
                )}
                <span className="ml-1.5 px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded-md text-[10px] font-black group-hover:bg-slate-200 transition-colors">
                  {forms.filter(f => {
                    if (tab.id === "ALL") return true;
                    if (tab.id === "LIVE") return f.status === "PUBLISHED";
                    if (tab.id === "DRAFTS") return f.status === "DRAFT";
                    if (tab.id === "ARCHIVED") return f.status === "ARCHIVED";
                    if (tab.id === "SHARED") return f.ownerUsername !== user?.username;
                    return false;
                  }).length}
                </span>
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          /* Loading State */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="bg-white border border-slate-100 rounded-[32px] p-8 h-64 animate-pulse shadow-sm"
              >
                <div className="h-6 bg-slate-100 rounded-full w-1/2 mb-6"></div>
                <div className="space-y-3">
                  <div className="h-3 bg-slate-50 rounded-full w-full"></div>
                  <div className="h-3 bg-slate-50 rounded-full w-5/6"></div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredForms.length === 0 ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center py-24 bg-white border border-slate-200/60 rounded-[40px] shadow-sm">
            <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center mb-6">
              <Inbox size={32} className="text-indigo-300" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-2">
              No forms found
            </h3>
            <p className="text-slate-500 mb-8 text-center max-w-xs">
              {getEmptyMessage()}
            </p>
          </div>
        ) : (
          /* Form Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredForms.map((form) => (
              <div
                key={form.id}
                className="group bg-white border border-slate-200/70 rounded-[32px] p-8 hover:border-indigo-500/50 transition-all duration-300 flex flex-col hover:shadow-2xl relative overflow-hidden"
              >
                <div className="relative z-10 flex-1">
                  <div className="flex justify-between items-start mb-6">
                    <div className="p-2.5 bg-slate-50 rounded-xl text-slate-400 inline-block group-hover:bg-indigo-50 group-hover:text-indigo-500 transition-colors">
                      <Settings2 size={18} />
                    </div>
                    
                    <div className="flex gap-1.5 flex-wrap justify-end max-w-[60%]">
                      {form.ownerUsername && user && form.ownerUsername !== user.username && (
                        <span className="px-2.5 py-1 text-[10px] font-bold tracking-wider uppercase bg-indigo-50 text-indigo-600 rounded-md border border-indigo-100/50 flex items-center gap-1">
                          <Users size={10} /> Shared
                        </span>
                      )}
                      {form.status === "PUBLISHED" && (
                        <span className="px-2.5 py-1 text-[10px] font-bold tracking-wider uppercase bg-emerald-50 text-emerald-600 rounded-md border border-emerald-100/50">
                          Live
                        </span>
                      )}
                      {form.status === "DRAFT" && (
                        <span className="px-2.5 py-1 text-[10px] font-bold tracking-wider uppercase bg-amber-50 text-amber-600 rounded-md border border-amber-100/50">
                          Draft
                        </span>
                      )}
                      {form.status === "ARCHIVED" && (
                        <span className="px-2.5 py-1 text-[10px] font-bold tracking-wider uppercase bg-red-50 text-red-600 rounded-md border border-red-100/50">
                          Archived
                        </span>
                      )}
                      {!form.status && (
                        <span className="px-2.5 py-1 text-[10px] font-bold tracking-wider uppercase bg-slate-50 text-slate-500 rounded-md border border-slate-200/50">
                          New
                        </span>
                      )}
                    </div>
                  </div>

                  <h3 className="font-bold text-slate-900 text-xl mb-1 truncate group-hover:text-indigo-600 transition-colors">
                    {form.name}
                  </h3>
                  <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400 mb-3 uppercase tracking-wider">
                    <Users size={12} className="shrink-0" />
                    <span>Created by {form.ownerUsername === user.username ? "You" : (form.ownerUsername || "Unknown")}</span>
                  </div>
                  <p className="text-slate-500 text-sm leading-relaxed line-clamp-2 mb-6">
                    {form.description || "No description provided for this form."}
                  </p>
                </div>

                <div className="relative z-10 mt-4 flex items-center gap-3">
                  {/* FIX: Explicit text-white and padding */}
                  {form.status === "ARCHIVED" ? (
                    <div className="flex-[2] flex items-center justify-center gap-2 bg-slate-100 text-slate-400 py-3.5 rounded-2xl text-sm font-bold cursor-not-allowed">
                      <Archive size={16} />
                      <span>Archived</span>
                    </div>
                  ) : form.canEdit && canEditAny ? (
                    <Link
                      href={`/forms/${form.id}/builder`}
                      className="flex-[2] flex items-center justify-center gap-2 bg-[#0F172A] text-white py-3.5 rounded-2xl text-sm font-bold hover:bg-indigo-600 transition-all shadow-md active:scale-95"
                    >
                      <PenLine size={16} className="text-white" />
                      <span className="text-white">Edit</span>
                    </Link>
                  ) : (
                    <div className="flex-[2] flex items-center justify-center gap-2 bg-slate-50 text-slate-400 py-3.5 rounded-2xl text-sm font-bold border border-slate-100">
                      <Lock size={16} />
                      <span className="hidden sm:inline">No Edit Access</span>
                      <span className="sm:hidden">Locked</span>
                    </div>
                  )}
 
                  {form.canViewSubmissions && canViewSubsAny && (
                    <Link
                      href={`/forms/${form.id}/submissions`}
                      className="p-3.5 bg-slate-50 text-slate-600 rounded-2xl hover:bg-indigo-50 hover:text-indigo-600 transition-all border border-slate-100"
                      title="Analytics"
                    >
                      <BarChart2 size={20} />
                    </Link>
                  )}
                  <Link
                    href={`/forms/${form.id}/view`}
                    className="p-3.5 bg-slate-50 text-slate-600 rounded-2xl hover:bg-indigo-50 hover:text-indigo-600 transition-all border border-slate-100"
                    title="Live View"
                  >
                    <ExternalLink size={20} />
                  </Link>

                  {form.status !== "ARCHIVED" && canArchiveAny && (
                    <button
                      onClick={() => handleArchive(form.id)}
                      className="p-3.5 bg-slate-50 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all border border-slate-100"
                      title="Archive Form"
                    >
                      <Archive size={20} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
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