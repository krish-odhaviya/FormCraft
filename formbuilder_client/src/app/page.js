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
  Lock,
  RotateCcw,
  Link2,
  Check
} from "lucide-react";
import { api } from "@/lib/api/formService";
import { useAuth } from "@/context/AuthContext";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { toast } from "react-hot-toast";
import { useConfirm } from "@/context/ConfirmationContext";

function DashboardContent() {
  const { user, logout } = useAuth();
  const confirm = useConfirm();
  const router = useRouter();
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(9);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [copiedId, setCopiedId] = useState(null);

  const isAdmin = user?.customRole === "SYSTEM_ADMIN" || user?.roles?.includes("ROLE_SYSTEM_ADMIN");
  const canCreate = isAdmin || user?.canCreateForm;
  const canEditAny = isAdmin || user?.canEditForm;
  const canArchiveAny = isAdmin || user?.canArchiveForm;
  const canViewSubsAny = isAdmin || user?.canViewSubmissions;

  const fetchForms = async () => {
    setLoading(true);
    try {
      const response = await api.getAllForms({ 
        page: currentPage, 
        size: pageSize,
      });
      if (response && response.data) {
        setForms(response.data.content || []);
        setTotalPages(response.data.totalPages || 0);
        setTotalElements(response.data.totalElements || 0);
      }
    } catch (err) {
      const status = err?.response?.status;
      if (status === 403) {
        toast.error("Access denied: your role does not have permission to view forms.");
        router.replace("/login");
      } else {
        console.error("Failed to fetch forms:", err);
        toast.error("Failed to load your forms. Please refresh the page.");
        setForms([]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchForms();
  }, [currentPage, pageSize]);

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  const handleArchive = async (formId) => {
    const confirmed = await confirm({
      title: "Archive Form",
      message: "Are you sure you want to archive this form? This will stop all new submissions.",
      confirmText: "Archive",
      type: "danger"
    });
    
    if (!confirmed) return;
    try {
      await api.archiveForm(formId);
      setForms((prev) =>
        prev.map((f) => (f.id === formId ? { ...f, status: "ARCHIVED" } : f))
      );
      toast.success("Form archived successfully.");
    } catch (err) {
      console.error("Failed to archive form:", err);
      toast.error(err?.response?.data?.message || "Failed to archive form.");
    }
  };

  const handleReactivate = async (formId) => {
    const confirmed = await confirm({
      title: "Reactivate Form",
      message: "Reactivate this form? It will return to Draft status. You will need to publish it again to accept new submissions.",
      confirmText: "Reactivate",
      type: "info"
    });
    
    if (!confirmed) return;

    try {
      await api.reactivateForm(formId);
      setForms((prev) =>
        prev.map((f) => (f.id === formId ? { ...f, status: "DRAFT" } : f))
      );
      toast.success("Form reactivated. It is now in Draft status.");
    } catch (err) {
      console.error("Failed to reactivate form:", err);
      toast.error(err?.response?.data?.message || "Failed to reactivate form.");
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
          <div className="space-y-12">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredForms.map((form) => (
                <div
                  key={form.id}
                  className="group bg-white border border-slate-200/70 rounded-[32px] p-8 hover:border-indigo-500/50 transition-all duration-300 flex flex-col hover:shadow-2xl relative overflow-hidden"
                >
                  {/* ... same card content ... */}
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
                      </div>
                    </div>

                    <h3 className="font-bold text-slate-900 text-xl mb-1 truncate group-hover:text-indigo-600 transition-colors">
                      {form.name}
                    </h3>
                    <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400 mb-3 uppercase tracking-wider">
                      <Users size={12} className="shrink-0" />
                      <span>Created by {form.ownerUsername === user?.username ? "You" : (form.ownerUsername || "Unknown")}</span>
                    </div>
                    <p className="text-slate-500 text-sm leading-relaxed line-clamp-2 mb-6">
                      {form.description || "No description provided for this form."}
                    </p>
                  </div>

                  <div className="relative z-10 mt-4 flex items-center gap-3">
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

                    {/* External link — admin preview via formId */}
                    <Link
                      href={`/f/${form.code}`}
                      className="p-3.5 bg-slate-50 text-slate-600 rounded-2xl hover:bg-indigo-50 hover:text-indigo-600 transition-all border border-slate-100"
                      title="Preview Form"
                    >
                      <ExternalLink size={20} />
                    </Link>

                    {/* Copy public link — visible for all published forms */}
                    {form.status === "PUBLISHED" && (
                      <button
                        onClick={() => {
                          const formCode = form.code;
                          if (!formCode) {
                            toast.error("This form has no public link yet. Please restart the server to enable code-based links.");
                            return;
                          }
                          const url = `${window.location.origin}/f/${formCode}`;
                          navigator.clipboard.writeText(url).then(() => {
                            setCopiedId(form.id);
                            toast.success("Public link copied!");
                            setTimeout(() => setCopiedId(null), 2000);
                          });
                        }}
                        className="p-3.5 bg-slate-50 text-slate-600 rounded-2xl hover:bg-emerald-50 hover:text-emerald-600 transition-all border border-slate-100"
                        title={form.code ? `Copy public link: /f/${form.code}` : "Copy public link (restart server to enable)"}
                      >
                        {copiedId === form.id ? <Check size={20} className="text-emerald-500" /> : <Link2 size={20} />}
                      </button>
                    )}

                    {form.status !== "ARCHIVED" && canArchiveAny && (
                      <button
                        onClick={() => handleArchive(form.id)}
                        className="p-3.5 bg-slate-50 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all border border-slate-100"
                        title="Archive Form"
                      >
                        <Archive size={20} />
                      </button>
                    )}

                    {form.status === "ARCHIVED" && canArchiveAny && (
                      <button
                        onClick={() => handleReactivate(form.id)}
                        className="p-3.5 bg-slate-50 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-2xl transition-all border border-slate-100"
                        title="Reactivate Form"
                      >
                        <RotateCcw size={20} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-8 border-t border-slate-200">
                <p className="text-sm text-slate-500 font-mediumorder-2 sm:order-1">
                  Showing <span className="text-slate-900 font-bold">{(currentPage - 1) * pageSize + 1}</span> to <span className="text-slate-900 font-bold">{Math.min(currentPage * pageSize, totalElements)}</span> of <span className="text-slate-900 font-bold">{totalElements}</span> forms
                </p>
                
                <div className="flex items-center gap-2 order-1 sm:order-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
                  >
                    Previous
                  </button>
                  
                  <div className="flex items-center gap-1 mx-2">
                    {[...Array(totalPages)].map((_, i) => (
                      <button
                        key={i + 1}
                        onClick={() => setCurrentPage(i + 1)}
                        className={`w-10 h-10 rounded-xl text-sm font-black transition-all ${
                          currentPage === i + 1
                            ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200 scale-110"
                            : "bg-white text-slate-400 hover:text-slate-600 hover:bg-slate-50 border border-slate-100"
                        }`}
                      >
                        {i + 1}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
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