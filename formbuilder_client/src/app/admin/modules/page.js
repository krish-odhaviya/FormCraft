"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Plus, Pencil, Trash2, Loader2, ChevronRight, X, Check,
  LayoutDashboard, FileText, Users, Shield, Settings, Bell, Mail, Inbox,
  PlusCircle, History, Search, Lock, Layers, Briefcase, ClipboardList,
  BarChart3, Globe, Database
} from "lucide-react";
import { api } from "@/lib/api/formService";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { useAuth } from "@/context/AuthContext";
import { toast } from "react-hot-toast";

const AVAILABLE_ICONS = [
  { id: "layout", component: LayoutDashboard, label: "Dashboard" },
  { id: "file-text", component: FileText, label: "Forms" },
  { id: "users", component: Users, label: "Users" },
  { id: "shield", component: Shield, label: "Security" },
  { id: "settings", component: Settings, label: "Settings" },
  { id: "bell", component: Bell, label: "Alerts" },
  { id: "mail", component: Mail, label: "Email" },
  { id: "inbox", component: Inbox, label: "Inbox" },
  { id: "plus-circle", component: PlusCircle, label: "Create" },
  { id: "history", component: History, label: "History" },
  { id: "search", component: Search, label: "Search" },
  { id: "lock", component: Lock, label: "Admin" },
  { id: "layers", component: Layers, label: "Modules" },
  { id: "briefcase", component: Briefcase, label: "Work" },
  { id: "clipboard-list", component: ClipboardList, label: "Logs" },
  { id: "bar-chart", component: BarChart3, label: "Reports" },
  { id: "globe", component: Globe, label: "Global" },
  { id: "database", component: Database, label: "Data" },
];

function Toggle({ label, sublabel, checked, onChange, disabled }) {
  return (
    <div className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${checked ? 'bg-indigo-50/50 border-indigo-100' : 'bg-white border-slate-100 hover:border-slate-200'} ${disabled ? 'opacity-50 grayscale pointer-events-none' : ''}`}>
      <div className="flex flex-col">
        <span className="text-[11px] font-black text-slate-900 uppercase tracking-wider">{label}</span>
        {sublabel && <span className="text-[10px] font-medium text-slate-500 mt-0.5">{sublabel}</span>}
      </div>
      <button
        onClick={() => !disabled && onChange(!checked)}
        className={`relative w-11 h-6 rounded-full transition-all duration-300 ${checked ? 'bg-indigo-600 shadow-md shadow-indigo-100' : 'bg-slate-200'}`}
      >
        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-300 transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
      </button>
    </div>
  );
}

function SectionHeader({ icon: Icon, title, subtitle }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100/50">
        <Icon size={16} />
      </div>
      <div>
        <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.15em]">{title}</h3>
        {subtitle && <p className="text-[10px] font-bold text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

function ModuleModal({ initialData, modules, onSave, onClose }) {
  const [form, setForm] = useState({
    moduleName: initialData?.moduleName || "",
    description: initialData?.description || "",
    prefix: initialData?.prefix || "",
    iconCss: initialData?.iconCss || "",
    isParent: !!initialData?.isParent,
    isSubParent: !!initialData?.isSubParent,
    parentId: initialData?.parentId || null,
    active: initialData?.active ?? true,
    sortOrder: initialData?.sortOrder || 0
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const name = form.moduleName?.trim();
    if (!name) {
      toast.error("Module name is required.");
      return;
    }
    if (name.length < 2) {
      toast.error("Module name must be at least 2 characters.");
      return;
    }
    if (name.length > 120) {
      toast.error("Module name cannot exceed 120 characters.");
      return;
    }
    if (form.description?.length > 500) {
      toast.error("Description cannot exceed 500 characters.");
      return;
    }
    if (form.prefix && !form.prefix.startsWith("/")) {
      toast.error("Prefix must start with / (e.g. /admin/users).");
      return;
    }
    if (form.prefix?.length > 255) {
      toast.error("Prefix cannot exceed 255 characters.");
      return;
    }
    setSaving(true);
    try {
      if (initialData?.id) await api.updateModule(initialData.id, form);
      else await api.createModule(form);
      onSave();
    } catch (e) {
      console.error(e);
      if (e.response?.data?.errors) {
        const msgs = e.response.data.errors.map(err => `${err.field}: ${err.message}`).join("\n");
        toast.error(`Validation Error:\n${msgs}`);
      } else {
        toast.error("Failed to save module: " + (e.response?.data?.message || "Internal error"));
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto no-scrollbar">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl my-auto flex flex-col overflow-hidden border border-white/20">

        {/* Modal Header */}
        <div className="px-8 py-6 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-[1.25rem] bg-indigo-600 shadow-lg shadow-indigo-100 flex items-center justify-center text-white">
              {initialData?.id ? <Pencil size={20} /> : <Plus size={24} />}
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">{initialData?.id ? "Edit Module" : "Create Module"}</h2>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">Configuration Portal</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2.5 text-slate-400 hover:text-slate-900 hover:bg-white rounded-2xl transition-all border border-transparent hover:border-slate-100 hover:shadow-sm">
            <X size={20} />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-8 space-y-10 overflow-y-auto custom-scrollbar max-h-[70vh]">

          {/* Section: General */}
          <section>
            <SectionHeader icon={Layers} title="General Information" subtitle="Module Identity & Context" />
            <div className="grid grid-cols-1 gap-6 bg-slate-50/50 p-6 rounded-[2rem] border border-slate-100">
              <div className="space-y-2">
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">
                  Module Name <span className="text-red-500">*</span>
                </label>
                <input
                  value={form.moduleName}
                  onChange={e => setForm(f => ({ ...f, moduleName: e.target.value }))}
                  placeholder="e.g. System Dashboard"
                  className={`w-full bg-white border rounded-2xl px-5 py-3.5 text-sm font-bold outline-none shadow-sm transition-all focus:ring-4 focus:ring-indigo-100 ${!form.moduleName?.trim() ? 'border-red-200' : 'border-slate-200 focus:border-indigo-500'}`}
                />
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Description</label>
                <textarea
                  value={form.description || ""}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={2}
                  placeholder="What is this module for?"
                  className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-medium outline-none resize-none shadow-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all"
                />
              </div>
            </div>
          </section>

          {/* Section: Logic */}
          <section>
            <SectionHeader icon={ChevronRight} title="Navigation & Logic" subtitle="Structural Positioning" />
            <div className="grid grid-cols-2 gap-6 bg-slate-50/50 p-6 rounded-[2rem] border border-slate-100">
              <div className="space-y-2">
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Parent Module</label>
                <select
                  value={form.parentId || ""}
                  onChange={e => setForm(f => ({ ...f, parentId: e.target.value ? Number(e.target.value) : null }))}
                  className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-bold outline-none shadow-sm hover:border-indigo-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all appearance-none"
                >
                  <option value="">None (Top Level)</option>
                  {modules.filter(m => (m.isParent || m.isSubParent) && m.id !== initialData?.id).map(m => (
                    <option key={m.id} value={m.id}>{m.moduleName}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Route Prefix</label>
                <input
                  value={form.prefix || ""}
                  onChange={e => setForm(f => ({ ...f, prefix: e.target.value }))}
                  disabled={form.isParent || form.isSubParent}
                  placeholder={form.isParent || form.isSubParent ? "N/A" : "/admin/reports"}
                  maxLength={255}
                  className={`w-full border rounded-2xl px-5 py-3.5 text-sm font-bold outline-none shadow-sm transition-all ${form.isParent || form.isSubParent
                    ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed italic'
                    : form.prefix && !form.prefix.startsWith("/")
                      ? 'bg-white border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-100 text-indigo-600'
                      : 'bg-white border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 text-indigo-600'
                    }`}
                />
                {form.prefix && !form.prefix.startsWith("/") && !form.isParent && !form.isSubParent && (
                  <p className="text-[10px] text-red-500 font-semibold ml-1">Prefix must start with /</p>
                )}
              </div>
            </div>
          </section>

          {/* Section: Config */}
          <section>
            <SectionHeader icon={Settings} title="Functional Configuration" subtitle="Access & Type Settings" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Toggle
                label="Is Parent"
                sublabel="Container for sub-menus"
                checked={form.isParent}
                onChange={val => setForm(f => ({ ...f, isParent: val, isSubParent: val ? false : f.isSubParent, prefix: val ? "" : f.prefix }))}
              />
              <Toggle
                label="Is Sub-Parent"
                sublabel="Nested container"
                checked={form.isSubParent}
                onChange={val => setForm(f => ({ ...f, isSubParent: val, isParent: val ? false : f.isParent, prefix: val ? "" : f.prefix }))}
              />
              <Toggle
                label="Active Status"
                sublabel="Visible in sidebar"
                checked={form.active}
                onChange={val => setForm(f => ({ ...f, active: val }))}
              />
            </div>
          </section>

          {/* Section: Icons */}
          <section>
            <SectionHeader icon={LayoutDashboard} title="Visual Appearance" subtitle="Select Menu Icon" />
            <div className="bg-slate-50/50 p-7 rounded-[2.5rem] border border-slate-100">
              <div className="flex items-center justify-between mb-5 px-1">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Icon Collection</span>
                {form.iconCss && (
                  <div className="flex items-center gap-2 bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full border border-indigo-100 shadow-sm">
                    <span className="text-[9px] font-black uppercase tracking-widest">{form.iconCss.replace('-', ' ')}</span>
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse" />
                  </div>
                )}
              </div>
              <div className="grid grid-cols-6 gap-3 max-h-[280px] overflow-y-auto no-scrollbar pr-1">
                {AVAILABLE_ICONS.map((ico) => {
                  const IconComp = ico.component;
                  const isSelected = form.iconCss === ico.id;
                  return (
                    <button
                      key={ico.id}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, iconCss: ico.id }))}
                      className={`flex flex-col items-center justify-center gap-2 p-3.5 rounded-[1.25rem] transition-all border group relative ${isSelected
                        ? "bg-white text-indigo-600 border-indigo-500 shadow-xl shadow-indigo-100 scale-105 z-10"
                        : "bg-white text-slate-400 border-slate-200 hover:border-indigo-300 hover:text-indigo-600 hover:shadow-md"
                        }`}
                    >
                      <IconComp size={22} strokeWidth={isSelected ? 2.5 : 2} />
                      <span className={`text-[8px] font-black uppercase tracking-tight transition-colors ${isSelected ? 'text-indigo-600' : 'text-slate-400 group-hover:text-indigo-500'}`}>
                        {ico.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>
        </div>

        {/* Modal Footer */}
        <div className="px-8 py-6 bg-slate-50/80 border-t border-slate-200/50 flex gap-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 bg-slate-900 text-white py-4 rounded-2xl text-sm font-black uppercase tracking-[0.15em] hover:bg-indigo-600 hover:shadow-2xl hover:shadow-indigo-200 transition-all active:scale-[0.98] disabled:bg-slate-300 disabled:pointer-events-none group"
          >
            <div className="flex items-center justify-center gap-2">
              {saving ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} className="group-hover:scale-110 transition-transform" />}
              {initialData?.id ? "Update Module" : "Create Module"}
            </div>
          </button>
          <button
            onClick={onClose}
            className="px-8 border border-slate-200 text-slate-600 py-4 rounded-2xl text-sm font-black uppercase tracking-[0.15em] hover:bg-white hover:text-slate-900 hover:border-slate-300 transition-all active:scale-[0.98]"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function ModulesContent() {
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const { user: authUser } = useAuth();
  const router = useRouter();

  const isSystemAdmin = authUser?.roles?.some(r => r === "ROLE_SYSTEM_ADMIN" || r === "ROLE_ADMIN");

  useEffect(() => {
    if (authUser && !isSystemAdmin) {
      router.replace("/");
    }
  }, [authUser, isSystemAdmin, router]);

  const reload = async () => {
    setLoading(true);
    try {
      const res = await api.getModules();
      setModules(res.data || []);
    } catch (e) {
      if (e?.response?.status === 403) {
        toast.error("Access denied. You don't have permission to view modules.");
        router.replace("/");
      } else if (e?.response?.status === 401) {
        toast.error("Session expired. Please log in again.");
        router.replace("/login");
      } else if (e?.response?.status >= 500) {
        toast.error("Server error. Please try again later.");
      } else if (e?.code === "ERR_NETWORK") {
        toast.error("Network error. Check your connection.");
      } else {
        toast.error(e?.response?.data?.message || "Failed to load modules.");
      }
      console.error("[reload]", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authUser) return;          // still loading auth
    if (!isSystemAdmin) {
      router.replace("/");
      return;                       // don't call reload at all
    }
    reload();                       // only runs if authorized
  }, [authUser, isSystemAdmin]);

  const handleDelete = async (id) => {
    if (!confirm("Delete this module?")) return;
    try {
      await api.deleteModule(id);
      toast.success("Module deleted");
      reload();
    }
    catch { toast.error("Failed to delete"); }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {modal && <ModuleModal {...modal} modules={modules} onSave={() => { setModal(null); reload(); }} onClose={() => setModal(null)} />}

      <div className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center gap-6">
          <Link href="/" className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-all"><ArrowLeft size={20} /></Link>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Module Management</h1>
            <p className="text-xs text-slate-500">Manage sidebar navigation modules</p>
          </div>
          <button onClick={() => setModal({})} className="ml-auto flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-2xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200">
            <Plus size={16} /> New Module
          </button>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="animate-spin text-indigo-600" size={40} /></div>
        ) : (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {["Module Name", "Prefix", "Parent", "Status", "Actions"].map(h => (
                    <th key={h} className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {modules.map(m => (
                  <tr key={m.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-400 shrink-0 border border-slate-200/60 shadow-sm">
                          {(() => {
                            const ico = AVAILABLE_ICONS.find(i => i.id === m.iconCss);
                            if (!ico) return <LayoutDashboard size={18} />;
                            const IconComp = ico.component;
                            return <IconComp size={18} />;
                          })()}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900">{m.moduleName}</p>
                          {m.description && <p className="text-xs text-slate-400 truncate max-w-xs">{m.description}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4"><code className="text-xs text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">{m.prefix || "—"}</code></td>
                    <td className="px-6 py-4 text-sm text-slate-500">{m.parentName || "Top Level"}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${m.active ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                        <span className={`w-1 h-1 rounded-full ${m.active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                        {m.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button onClick={() => setModal({ initialData: m })} className="p-2 hover:bg-indigo-50 text-indigo-600 rounded-xl"><Pencil size={14} /></button>
                        <button onClick={() => handleDelete(m.id)} className="p-2 hover:bg-red-50 text-red-500 rounded-xl"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}

export default function ModulesPage() {
  return <AuthGuard><ModulesContent /></AuthGuard>;
}