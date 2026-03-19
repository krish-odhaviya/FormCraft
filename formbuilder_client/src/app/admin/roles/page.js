"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Loader2, X, Check, Trash2, Pencil } from "lucide-react";
import { api } from "@/lib/api/formService";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { useAuth } from "@/context/AuthContext";
import { toast } from "react-hot-toast";

function RolesContent() {
  const [roles, setRoles] = useState([]);
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const RESTRICTED_MODULES = [
    "System Admin", "Module Management", "Role Management", "User Management", "All Access Requests"
  ];
  const [selectedRole, setSelectedRole] = useState(null);
  const [selectedModuleIds, setSelectedModuleIds] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newRole, setNewRole] = useState({ 
    roleName: "", description: "",
    canCreateForm: false, canEditForm: false, canDeleteForm: false,
    canArchiveForm: false, canViewSubmissions: false, canDeleteSubmissions: false
  });
  const [saving, setSaving] = useState(false);
  const { user: authUser } = useAuth();
  const router = useRouter();

  const isSystemAdmin = authUser?.roles?.some(r => r === "ROLE_SYSTEM_ADMIN" || r === "ROLE_ADMIN");

  const reload = async () => {
    setLoading(true);
    try {
      const [rRes, mRes] = await Promise.all([api.getRoles(), api.getModules()]);
      setRoles(rRes.data || []);
      setModules(mRes.data || []);
    } catch (e) {
      const status = e?.response?.status;
      if (status === 403 || status === 401) {
        router.replace("/");
      } else {
        console.error(e);
        toast.error("Failed to load roles. Please refresh the page.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authUser) return;
    if (!isSystemAdmin) {
      router.replace("/");
      return;
    }
    reload();
  }, [authUser, isSystemAdmin]);

  const selectRole = async (role) => {
    setSelectedRole(role);
    try {
      const res = await api.getRoleModules(role.id);
      setSelectedModuleIds(res.data || []);
    } catch {
      setSelectedModuleIds([]);
      toast.error("Failed to load modules for this role. Please try again.");
    }
  };

  const handleSaveRoleConfig = async () => {
    setSaving(true);
    try {
      await Promise.all([
        api.assignModulesToRole(selectedRole.id, selectedModuleIds),
        api.updateRole(selectedRole.id, selectedRole)
      ]);
      toast.success("Role configuration saved!");
      reload();
    } catch (e) {
      console.error(e);
      if (e.response?.data?.errors) {
        const msgs = e.response.data.errors.map(err => `${err.field}: ${err.message}`).join("\n");
        toast.error(`Validation Error:\n${msgs}`);
      } else {
        toast.error("Failed to save: " + (e.response?.data?.message || "Internal error"));
      }
    } finally {
      setSaving(false);
    }
  };

  const handleCreateRole = async () => {
    const name = newRole.roleName?.trim();
    if (!name) {
      toast.error("Role name is required.");
      return;
    }
    if (name.length < 2) {
      toast.error("Role name must be at least 2 characters.");
      return;
    }
    if (name.length > 80) {
      toast.error("Role name cannot exceed 80 characters.");
      return;
    }
    if (!/^[A-Z0-9_]+$/.test(name)) {
      toast.error("Role name must be uppercase letters, numbers, and underscores only (e.g. PROJECT_MANAGER).");
      return;
    }
    if (newRole.description?.length > 500) {
      toast.error("Description cannot exceed 500 characters.");
      return;
    }
    setSaving(true);
    try {
      await api.createRole(newRole);
      setShowCreate(false);
      setNewRole({ 
        roleName: "", description: "",
        canCreateForm: false, canEditForm: false, canDeleteForm: false,
        canArchiveForm: false, canViewSubmissions: false, canDeleteSubmissions: false
      });
      reload();
    } catch (e) {
      console.error(e);
      if (e.response?.data?.errors) {
        const msgs = e.response.data.errors.map(err => `${err.field}: ${err.message}`).join("\n");
        toast.error(`Validation Error:\n${msgs}`);
      } else {
        toast.error("Failed to create role: " + (e.response?.data?.message || "Internal error"));
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRole = async (id) => {
    try { 
      await api.deleteRole(id); 
      toast.success("Role deleted");
      reload(); 
    }
    catch (e) { toast.error(e?.response?.data?.message || "Cannot delete this role."); }
  };

  const toggleModule = (moduleId) => {
    setSelectedModuleIds(prev =>
      prev.includes(moduleId) ? prev.filter(id => id !== moduleId) : [...prev, moduleId]
    );
  };

  const togglePermission = (key) => {
    setSelectedRole(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const PERMISSIONS = [
    { key: "canCreateForm", label: "Create Forms" },
    { key: "canEditForm", label: "Edit Forms" },
    { key: "canDeleteForm", label: "Delete Forms" },
    { key: "canArchiveForm", label: "Archive Forms" },
    { key: "canViewSubmissions", label: "View Submissions" },
    { key: "canDeleteSubmissions", label: "Delete Submissions" }
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {showCreate && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black text-slate-900">NEW ROLE</h2>
              <button onClick={() => setShowCreate(false)} className="p-2 hover:bg-slate-100 rounded-xl"><X size={18} /></button>
            </div>
            <div className="space-y-1">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-1">Role Name <span className="text-red-500">*</span></label>
              <input
                value={newRole.roleName}
                onChange={e => setNewRole(r => ({...r, roleName: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, "")}))}
                placeholder="e.g. PROJECT_MANAGER"
                maxLength={80}
                className={`w-full border rounded-xl px-4 py-3 text-sm font-mono font-bold outline-none focus:border-indigo-500 ${!newRole.roleName?.trim() ? 'border-red-200 bg-red-50/30' : 'border-slate-200'}`}
              />
              {!newRole.roleName?.trim()
                ? <p className="text-[10px] text-red-500 font-semibold">Name is required</p>
                : <p className="text-[10px] text-slate-400 font-medium">Uppercase letters, numbers and underscores only</p>
              }
            </div>
            <textarea value={newRole.description} onChange={e => setNewRole(r => ({...r, description: e.target.value}))}
              placeholder="Description" rows={2} className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none resize-none focus:border-indigo-500" />
            
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Permissions</p>
              <div className="grid grid-cols-2 gap-2">
                {PERMISSIONS.map(p => (
                  <label key={p.key} className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                    <input type="checkbox" checked={newRole[p.key]} onChange={e => setNewRole(r => ({...r, [p.key]: e.target.checked}))} className="w-3.5 h-3.5 rounded" />
                    {p.label}
                  </label>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={handleCreateRole} disabled={saving}
                className="flex-1 bg-slate-900 text-white py-3 rounded-2xl text-sm font-bold flex items-center justify-center gap-2">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                Create Role
              </button>
              <button onClick={() => setShowCreate(false)} className="flex-1 border border-slate-200 text-slate-600 py-3 rounded-2xl text-sm font-bold hover:bg-slate-50">Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center gap-6">
          <Link href="/" className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded-xl"><ArrowLeft size={20} /></Link>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Role Management</h1>
            <p className="text-xs text-slate-500">Create roles and map modules</p>
          </div>
          <button onClick={() => setShowCreate(true)} className="ml-auto flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-2xl text-sm font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200">
            <Plus size={16} /> New Role
          </button>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Roles list */}
        <div className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 px-1">All Roles</h2>
          {loading ? <Loader2 className="animate-spin text-indigo-600" size={32} /> :
            roles.map(role => (
              <div key={role.id} onClick={() => selectRole(role)}
                className={`w-full text-left p-5 rounded-2xl border-2 transition-all cursor-pointer ${selectedRole?.id === role.id ? 'border-indigo-600 bg-indigo-50' : 'border-slate-100 bg-white hover:border-slate-200'}`}
                role="button"
                tabIndex={0}>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-slate-900">{role.roleName}</p>
                  {!role.default && (
                    <button onClick={e => { e.stopPropagation(); handleDeleteRole(role.id); }}
                      className="p-1.5 hover:bg-red-50 text-red-400 rounded-lg"><Trash2 size={12} /></button>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-1">{role.description || "No description"}</p>
                <div className="flex items-center gap-2 mt-2">
                  {role.isDefault && <span className="text-[9px] px-1.5 py-0.5 bg-emerald-50 text-emerald-600 rounded-full font-bold uppercase">Default</span>}
                  <span className="text-[10px] text-slate-400">{role.moduleIds?.length || 0} modules</span>
                </div>
              </div>
            ))
          }
        </div>

        {/* Module assignment */}
        <div className="lg:col-span-2">
          {selectedRole ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-black text-slate-900">Configure <span className="text-indigo-600">{selectedRole.roleName}</span></h2>
                <button onClick={handleSaveRoleConfig} disabled={saving}
                  className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-2xl text-sm font-bold hover:bg-indigo-700 shadow-md">
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                  Save Configuration
                </button>
              </div>
              <h3 className="text-sm font-bold text-slate-900 mb-4">Module Access</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {modules
                  .filter(m => !RESTRICTED_MODULES.includes(m.moduleName))
                  .map(m => (
                    <label key={m.id} className={`flex items-start gap-3 p-4 rounded-2xl border-2 cursor-pointer transition-all ${selectedModuleIds.includes(m.id) ? 'border-indigo-600 bg-indigo-50/60' : 'border-slate-100 hover:border-slate-200'}`}>
                      <input type="checkbox" checked={selectedModuleIds.includes(m.id)} onChange={() => toggleModule(m.id)} className="w-4 h-4 text-indigo-600 rounded mt-0.5" />
                      <div>
                        <p className="text-sm font-bold text-slate-900">{m.moduleName}</p>
                        {m.prefix && <code className="text-[10px] text-indigo-400">{m.prefix}</code>}
                        <p className="text-xs text-slate-400">{m.parentName ? `Under: ${m.parentName}` : "Top Level"}</p>
                      </div>
                    </label>
                  ))}
              </div>

              <div className="mt-8 border-t border-slate-100 pt-6">
                <h3 className="text-sm font-bold text-slate-900 mb-4">Detailed Permissions</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {PERMISSIONS.map(p => (
                    <label key={p.key} className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${selectedRole[p.key] ? 'border-emerald-500 bg-emerald-50/50' : 'border-slate-100 hover:border-slate-200'}`}>
                      <input type="checkbox" checked={selectedRole[p.key] || false} onChange={() => togglePermission(p.key)} className="w-4 h-4 text-emerald-500 rounded" />
                      <span className="text-xs font-bold text-slate-700">{p.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border-2 border-dashed border-slate-200 p-16 flex flex-col items-center justify-center text-center">
              <p className="text-slate-400 font-medium">Select a role to manage its modules</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function RolesPage() {
  return <AuthGuard><RolesContent /></AuthGuard>;
}