"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, Plus, Pencil, Trash2, Loader2, ChevronRight, X, Check
} from "lucide-react";
import { api } from "@/lib/api/formService";
import { AuthGuard } from "@/components/auth/AuthGuard";

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
    if (!form.moduleName) return;
    setSaving(true);
    try {
      if (initialData?.id) await api.updateModule(initialData.id, form);
      else await api.createModule(form);
      onSave();
    } catch (e) {
      alert("Failed to save module");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl p-8 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black text-slate-900">{initialData?.id ? "EDIT MODULE" : "CREATE MODULE"}</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl"><X size={18} /></button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">Module Name</label>
            <input value={form.moduleName} onChange={e => setForm(f => ({...f, moduleName: e.target.value}))}
              placeholder="e.g. Dashboard" className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-500" />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">Route Prefix</label>
            <input value={form.prefix || ""} onChange={e => setForm(f => ({...f, prefix: e.target.value}))}
              placeholder="e.g. /admin/dashboard" className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-500" />
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">Description</label>
          <textarea value={form.description || ""} onChange={e => setForm(f => ({...f, description: e.target.value}))}
            rows={3} placeholder="Describe the module purpose..." className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none resize-none focus:border-indigo-500" />
        </div>

        <div className="flex items-center justify-between bg-slate-50 rounded-2xl p-4 border border-slate-100">
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer">
            <input type="checkbox" checked={form.isParent} onChange={e => setForm(f => ({...f, isParent: e.target.checked}))} className="w-4 h-4 rounded" />
            IS PARENT
          </label>
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer">
            <input type="checkbox" checked={form.isSubParent} onChange={e => setForm(f => ({...f, isSubParent: e.target.checked}))} className="w-4 h-4 rounded" />
            IS SUB-PARENT
          </label>
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer">
            <span>ACTIVE STATUS</span>
            <button onClick={() => setForm(f => ({...f, active: !f.active}))}
              className={`relative w-12 h-6 rounded-full transition-colors ${form.active ? 'bg-emerald-500' : 'bg-slate-300'}`}>
              <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${form.active ? 'left-7' : 'left-1'}`} />
            </button>
          </label>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">Parent Module</label>
            <select value={form.parentId || ""} onChange={e => setForm(f => ({...f, parentId: e.target.value ? Number(e.target.value) : null}))}
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-500">
              <option value="">None (Top Level)</option>
              {modules.filter(m => m.isParent || m.isSubParent).map(m => (
                <option key={m.id} value={m.id}>{m.moduleName}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">Icon Library Class</label>
            <input value={form.iconCss || ""} onChange={e => setForm(f => ({...f, iconCss: e.target.value}))}
              placeholder="e.g. file-text, shield" className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-500" />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button onClick={handleSave} disabled={saving}
            className="flex-1 bg-slate-900 text-white py-3 rounded-2xl text-sm font-bold hover:bg-slate-800 flex items-center justify-center gap-2">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
            {initialData?.id ? "Update Module" : "Create Module"}
          </button>
          <button onClick={onClose} className="flex-1 border border-slate-200 text-slate-600 py-3 rounded-2xl text-sm font-bold hover:bg-slate-50">
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

  const reload = async () => {
    setLoading(true);
    try { const res = await api.getModules(); setModules(res.data || []); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { reload(); }, []);

  const handleDelete = async (id) => {
    if (!confirm("Delete this module?")) return;
    try { await api.deleteModule(id); reload(); }
    catch { alert("Failed to delete"); }
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
                      <div>
                        <p className="text-sm font-bold text-slate-900">{m.moduleName}</p>
                        {m.description && <p className="text-xs text-slate-400 truncate max-w-xs">{m.description}</p>}
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
