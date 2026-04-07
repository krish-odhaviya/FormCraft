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
  Check,
  Code,
  X,
  Copy,
  TrendingUp,
  Activity,
  FileText,
  History,
  Workflow
} from "lucide-react";
import { api } from "@/lib/api/formService";
import { BASE_URL } from "@/lib/api/axios";
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
  const [apiInfoForm, setApiInfoForm] = useState(null);
  const [fetchingApiInfo, setFetchingApiInfo] = useState(false);
  const [apiInfoModalOpen, setApiInfoModalOpen] = useState(false);
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
    const confirmed = await confirm({
      title: "Logout Confirmation",
      message: "Are you sure you want to log out of your account? Any unsaved builder changes may be lost.",
      confirmText: "Logout",
      type: "danger"
    });

    if (!confirmed) return;

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

  const handleOpenApiInfo = async (form) => {
    setFetchingApiInfo(true);
    try {
      const res = await api.getForm(form.id);
      setApiInfoForm(res.data);
      setApiInfoModalOpen(true);
    } catch (err) {
      toast.error("Failed to load form API details.");
    } finally {
      setFetchingApiInfo(false);
    }
  };

  const filteredForms = forms.filter((f) => {
    const matchesSearch = f.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    switch (activeTab) {
      case "LIVE": return f.status === "PUBLISHED";
      case "DRAFTS": return f.status === "DRAFT";
      case "ARCHIVED": return f.status === "ARCHIVED";
      case "SHARED": return f.ownerUsername !== user?.username;
      case "ALL": return true;
      default: return true;
    }
  });

  const getEmptyMessage = () => {
    if (searchQuery) return "No matches found for your search.";
    switch (activeTab) {
      case "LIVE": return "No live forms yet. Publish a draft to see it here.";
      case "DRAFTS": return "No draft forms. Create a new form to get started.";
      case "ARCHIVED": return "No archived forms.";
      case "SHARED": return "No forms have been shared with you yet.";
      default: return "Get started by building your first questionnaire.";
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans text-slate-900">

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 mb-10">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-0.5 bg-indigo-600 rounded-full"></div>
              <span className="text-[9px] font-black text-indigo-600 uppercase tracking-[0.3em]">Vault Overview</span>
            </div>
            <h2 className="text-3xl lg:text-4xl font-black text-slate-900 tracking-tight mb-2 truncate">
              Welcome back, <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-600 animate-gradient-x">{user?.username?.split(' ')[0] || 'Human'}</span>
            </h2>
            <p className="text-slate-400 text-sm lg:text-base font-medium leading-relaxed max-w-xl">
              Managing <span className="text-slate-900 font-bold">{totalElements} professional forms</span>. Everything looks great today.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="relative group">
              <Search
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors"
                size={18}
              />
              <input
                type="text"
                placeholder="Search..."
                className="pl-11 pr-5 py-3 bg-white border border-slate-200/80 rounded-[18px] text-xs font-semibold outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all w-48 lg:w-60 shadow-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            {canCreate && (
              <Link
                href="/forms/new"
                className="group relative flex items-center justify-center gap-2 bg-[#0F172A] text-white hover:bg-indigo-600 px-6 py-3 rounded-[18px] text-xs font-bold transition-all shadow-xl shadow-indigo-100 hover:shadow-indigo-300 active:scale-95 whitespace-nowrap overflow-hidden"
              >
                <Plus size={16} strokeWidth={3} />
                <span>New Form</span>
              </Link>
            )}
          </div>
        </div>

        {/* Tabs Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 border-b border-slate-200/60 transition-all">
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-[1px]">
            {[
              { id: "ALL", label: "All", icon: <Inbox size={14} /> },
              { id: "LIVE", label: "Live", icon: <ExternalLink size={14} /> },
              { id: "SHARED", label: "Shared", icon: <Users size={14} /> },
              { id: "DRAFTS", label: "Drafts", icon: <PenLine size={14} /> },
              { id: "ARCHIVED", label: "Archived", icon: <Archive size={14} /> },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-xs font-bold transition-all relative whitespace-nowrap ${activeTab === tab.id
                    ? "text-indigo-600"
                    : "text-slate-500 hover:text-slate-700 active:scale-95"
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
                  className="group bg-white border border-slate-200/80 rounded-[32px] p-6 hover:border-indigo-500/50 transition-all duration-500 flex flex-col hover:shadow-[0_20px_40px_-15px_rgba(79,70,229,0.12)] hover:-translate-y-1 relative overflow-hidden h-full"
                >
                  {/* Subtle Background Shimmer */}
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>

                  {/* Header Row: Metadata & Badge */}
                  <div className="relative z-10 flex justify-between items-start mb-6">
                    <div className="flex flex-col gap-1">
                      <span className="text-[8px] font-black text-slate-300 uppercase tracking-[0.2em] leading-none">Last Activity</span>
                      <span className="text-[10px] font-bold text-slate-500">{new Date(form.updatedAt).toLocaleDateString()}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {form.ownerUsername && user && form.ownerUsername !== user.username && (
                        <div className="w-7 h-7 flex items-center justify-center bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100/50 shadow-sm" title="Shared with you">
                          <Users size={12} />
                        </div>
                      )}
                      {form.status === "PUBLISHED" ? (
                        <span className="px-3 py-1.5 text-[8px] font-black uppercase tracking-widest bg-emerald-500 text-white rounded-xl shadow-lg shadow-emerald-200/50">
                          Live
                        </span>
                      ) : form.status === "DRAFT" ? (
                        <span className="px-3 py-1.5 text-[8px] font-black uppercase tracking-widest bg-amber-400 text-white rounded-xl shadow-lg shadow-amber-100/50">
                          Draft
                        </span>
                      ) : (
                        <span className="px-3 py-1.5 text-[8px] font-black uppercase tracking-widest bg-slate-400 text-white rounded-xl shadow-lg shadow-slate-100/50">
                          Archived
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Body: Title & Description */}
                  <div className="relative z-10 flex-1 flex flex-col mb-6">
                    <div className="flex items-center gap-4 mb-3">
                      <div className="w-11 h-11 shrink-0 flex items-center justify-center bg-slate-50 text-slate-400 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-all duration-700 shadow-sm border border-slate-100 group-hover:rotate-6">
                        <Settings2 size={20} />
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col justify-center">
                        <h3 className="font-black text-slate-900 text-lg truncate tracking-tight group-hover:text-indigo-600 transition-colors leading-tight">
                          {form.name}
                        </h3>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">
                          By {form.ownerUsername === user?.username ? "You" : (form.ownerUsername || "Unknown")}
                        </p>
                      </div>
                    </div>

                    <p className="text-slate-500 text-xs leading-relaxed line-clamp-2 mt-2 font-medium h-9 overflow-hidden">
                      {form.description || <span className="text-slate-300">No description provided for this questionnaire.</span>}
                    </p>
                  </div>

                  {/* Footer: Multi-layered Actions */}
                  <div className="relative z-10 pt-6 border-t border-slate-100 flex flex-col gap-5">
                    {/* Layer 1: Icons */}
                    <div className="flex items-center justify-end gap-1">
                      {form.canViewSubmissions && canViewSubsAny && (
                        <Link
                          href={`/forms/${form.id}/submissions`}
                          className="w-8 h-8 flex items-center justify-center bg-slate-50 text-slate-400 rounded-lg hover:bg-indigo-50 hover:text-indigo-600 transition-all border border-slate-100 hover:border-indigo-200"
                          title="Analytics"
                        >
                          <BarChart2 size={14} />
                        </Link>
                      )}
                      {form.status === "PUBLISHED" && (
                        <button
                          onClick={() => {
                            const formCode = form.code;
                            if (!formCode) return toast.error("Public link unavailable.");
                            navigator.clipboard.writeText(`${window.location.origin}/f/${formCode}`).then(() => {
                              setCopiedId(form.id);
                              toast.success("Link copied!");
                              setTimeout(() => setCopiedId(null), 2000);
                            });
                          }}
                          className="w-8 h-8 flex items-center justify-center bg-slate-50 text-slate-400 rounded-lg hover:bg-indigo-50 hover:text-indigo-600 transition-all border border-slate-100 hover:border-indigo-200"
                          title="Copy Link"
                        >
                          {copiedId === form.id ? <Check size={14} className="text-emerald-500" /> : <Link2 size={14} />}
                        </button>
                      )}
                      <Link
                        href={`/f/${form.code}`}
                        className="w-8 h-8 flex items-center justify-center bg-slate-50 text-slate-400 rounded-lg hover:bg-indigo-50 hover:text-indigo-600 transition-all border border-slate-100 hover:border-indigo-200"
                        title="Preview"
                      >
                        <ExternalLink size={14} />
                      </Link>
                      <Link
                        href={`/forms/${form.id}/versions`}
                        className="w-8 h-8 flex items-center justify-center bg-slate-50 text-slate-400 rounded-lg hover:bg-indigo-50 hover:text-indigo-600 transition-all border border-slate-100 hover:border-indigo-200"
                        title="Version History"
                      >
                        <History size={14} />
                      </Link>
                      <button
                        onClick={() => handleOpenApiInfo(form)}
                        className="w-8 h-8 flex items-center justify-center bg-slate-50 text-slate-400 rounded-lg hover:bg-indigo-50 hover:text-indigo-600 transition-all border border-slate-100 hover:border-indigo-200"
                        title="API Reference"
                      >
                        <Code size={14} />
                      </button>
                    </div>

                    {/* Layer 2: Main Call to Action */}
                    <div>
                      {form.status === "ARCHIVED" ? (
                        <div className="w-full flex items-center justify-center gap-2 bg-slate-100 text-slate-400 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest cursor-not-allowed border border-slate-200">
                          <Lock size={12} /> Locked
                        </div>
                      ) : form.canEdit && canEditAny ? (
                        <Link
                          href={`/forms/${form.id}/builder`}
                          className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white hover:bg-indigo-700 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all shadow-xl shadow-indigo-100 active:scale-95 group/btn"
                          style={{ color: 'white' }}
                        >
                          <PenLine size={16} strokeWidth={3} className="text-white group-hover/btn:rotate-12 transition-transform" />
                          <span className="text-white">Edit Form</span>
                        </Link>
                      ) : (
                        <div className="w-full flex items-center justify-center gap-2 bg-slate-50 text-slate-400 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest border border-slate-100">
                          <ShieldCheck size={12} /> Restricted
                        </div>
                      )}
                    </div>
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
                        className={`w-10 h-10 rounded-xl text-sm font-black transition-all ${currentPage === i + 1
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

      {/* 🚀 API INFO MODAL - PREMIUM DEVELOPER PREVIEW */}
      {apiInfoModalOpen && apiInfoForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-500" onClick={() => setApiInfoModalOpen(false)}>
          <div
            className="bg-white w-full max-w-2xl rounded-[32px] shadow-[0_50px_100px_-20px_rgba(15,23,42,0.3)] overflow-hidden border border-slate-200/50 animate-in zoom-in-95 duration-500 flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header: Documentation Styled */}
            <div className="relative group overflow-hidden bg-slate-900 p-8 shrink-0">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/40 via-transparent to-transparent opacity-50"></div>
              <div className="absolute -right-20 -top-20 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px]"></div>

              <div className="relative z-10 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl flex items-center justify-center text-indigo-400 shadow-2xl group-hover:rotate-6 transition-transform duration-700">
                    <Code size={24} strokeWidth={2.5} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white tracking-tight leading-none mb-1.5">Developer Blueprint</h3>
                    <p className="text-[8px] font-black text-indigo-300 uppercase tracking-[0.3em]">External API Integration v1.0</p>
                  </div>
                </div>
                <button
                  onClick={() => setApiInfoModalOpen(false)}
                  className="w-10 h-10 flex items-center justify-center bg-white/5 hover:bg-white/10 text-white/40 hover:text-white rounded-xl transition-all border border-white/10"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-8 custom-scrollbar bg-white">

              <div className="space-y-8">
                {/* HEADLESS GUIDE BANNER */}
                <div className="bg-indigo-50/50 border border-indigo-100 rounded-[24px] p-6 flex gap-4 items-start">
                  <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center shrink-0 text-indigo-600 border border-indigo-100/50">
                    <Workflow size={20} />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-black text-slate-900 mb-1 tracking-tight">External Frontend Architecture</h4>
                    <p className="text-slate-500 text-[11px] leading-relaxed font-medium">
                      To correctly implement <span className="text-indigo-600 font-bold underline decoration-indigo-200 underline-offset-4">Conditional Visibility Rules</span>,
                      fetch the schema first to follow the logic engine's instructions.
                    </p>
                  </div>
                </div>

                {/* STEP 1: SCHEMA & LOGIC */}
                <div className="group/step space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] font-black">1</div>
                      <h5 className="font-black text-slate-900 text-xs tracking-tight">Fetch Definition & Logic Rules</h5>
                    </div>
                    <span className="text-[8px] font-black text-amber-500 bg-amber-50 px-2 py-0.5 rounded-full uppercase tracking-widest border border-amber-200">Rule Engine Logic</span>
                  </div>

                  <div className="flex gap-2">
                    <div className="flex-1 bg-slate-50 border border-slate-100 p-4 rounded-[18px] font-mono text-xs overflow-x-auto whitespace-nowrap shadow-inner text-slate-600">
                      <span className="text-amber-600 font-black mr-3 uppercase">GET</span>
                      <span className="opacity-40">{BASE_URL}</span>/runtime/forms/<span className="text-indigo-600 font-bold">{apiInfoForm.code}</span>
                    </div>
                    <button
                      onClick={() => {
                        const text = `${BASE_URL}/runtime/forms/${apiInfoForm.code}`;
                        navigator.clipboard.writeText(text);
                        toast.success("Definition URL copied!");
                      }}
                      className="w-12 h-12 bg-white hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 border border-slate-100 hover:border-indigo-200 rounded-[18px] flex items-center justify-center transition-all shadow-sm active:scale-90 shrink-0"
                      title="Copy URL"
                    >
                      <Copy size={20} />
                    </button>
                  </div>
                </div>

                {/* STEP 2: THE SUBMISSION */}
                <div className="group/step space-y-3">
                  <div className="flex items-center gap-2 px-1">
                    <div className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] font-black">2</div>
                    <h5 className="font-black text-slate-900 text-xs tracking-tight">Final Submission</h5>
                  </div>

                  <div className="flex gap-2">
                    <div className="flex-1 bg-slate-50 border border-slate-100 p-4 rounded-[18px] font-mono text-xs overflow-x-auto whitespace-nowrap shadow-inner text-slate-600">
                      <span className="text-emerald-600 font-black mr-3 uppercase">POST</span>
                      <span className="opacity-40">{BASE_URL}</span>/runtime/forms/<span className="text-indigo-600 font-bold">{apiInfoForm.code}</span>/submissions/submit
                    </div>
                    <button
                      onClick={() => {
                        const text = `${BASE_URL}/runtime/forms/${apiInfoForm.code}/submissions/submit`;
                        navigator.clipboard.writeText(text);
                        toast.success("Submission URL copied!");
                      }}
                      className="w-12 h-12 bg-white hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 border border-slate-100 hover:border-indigo-200 rounded-[18px] flex items-center justify-center transition-all shadow-sm active:scale-90 shrink-0"
                      title="Copy URL"
                    >
                      <Copy size={20} />
                    </button>
                  </div>
                </div>

                {/* PAYLOAD PREVIEW */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <h5 className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Payload Architecture</h5>
                  </div>
                  <div className="relative group overflow-hidden rounded-[24px] border border-slate-200 bg-slate-900 shadow-xl">
                    <div className="h-8 bg-slate-800 flex items-center justify-between px-4 border-b border-white/5">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 rounded-full bg-slate-600 opacity-50"></div>
                        <div className="w-2 h-2 rounded-full bg-slate-600 opacity-50"></div>
                        <div className="w-2 h-2 rounded-full bg-slate-600 opacity-50"></div>
                      </div>
                      <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">request_payload.json</span>
                    </div>
                    <pre className="p-6 font-mono text-[10px] text-indigo-100/90 leading-relaxed overflow-x-auto whitespace-pre">
                      {JSON.stringify({
                        values: (apiInfoForm.fields || []).reduce((acc, f) => {
                          if (f.fieldType === 'SECTION' || f.fieldType === 'LABEL' || f.fieldType === 'PAGE_BREAK' || f.fieldType === 'GROUP') return acc;
                          acc[f.fieldKey] = "...";
                          return acc;
                        }, {}),
                        formVersionId: apiInfoForm.activeVersionNumber || 1
                      }, null, 2)}
                    </pre>
                    <button
                      onClick={() => {
                        const payload = {
                          values: (apiInfoForm.fields || []).reduce((acc, f) => {
                            if (f.fieldType === 'SECTION' || f.fieldType === 'LABEL' || f.fieldType === 'PAGE_BREAK' || f.fieldType === 'GROUP') return acc;
                            acc[f.fieldKey] = "...";
                            return acc;
                          }, {}),
                          formVersionId: apiInfoForm.activeVersionNumber || 1
                        };
                        navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
                        toast.success("JSON copied!");
                      }}
                      className="absolute bottom-4 right-4 p-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-lg transition-all active:scale-95 group/btn flex items-center gap-2"
                    >
                      <Copy size={14} />
                      <span className="text-[9px] font-bold uppercase tracking-widest">Copy JSON</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 bg-slate-50 border-t border-slate-100 shrink-0 flex justify-end">
              <button
                onClick={() => setApiInfoModalOpen(false)}
                className="px-8 py-2.5 bg-slate-900 border border-slate-800 text-white hover:bg-slate-800 text-[10px] font-black uppercase tracking-[0.2em] rounded-xl transition-all shadow-xl shadow-slate-200 active:scale-95"
              >
                Close Blueprint
              </button>
            </div>
          </div>
        </div>
      )}
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