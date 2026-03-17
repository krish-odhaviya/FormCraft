"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronRight, Loader2, Search, X, Check, Link as LinkIcon } from "lucide-react";
import { api } from "@/lib/api/formService";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { useAuth } from "@/context/AuthContext";

function UserManagementContent() {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [managingUser, setManagingUser] = useState(null);
  const [selectedRoleId, setSelectedRoleId] = useState("");
  const [saving, setSaving] = useState(false);
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
      const [uRes, rRes] = await Promise.all([api.getAdminUsers(), api.getRoles()]);
      setUsers(uRes.data || []);
      setRoles(rRes.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { reload(); }, []);

  const openManage = (user) => {
    setManagingUser(user);
    setSelectedRoleId(user.customRoleId || "");
  };

  const handleAssignRole = async () => {
    if (!selectedRoleId) return;
    setSaving(true);
    try {
      await api.assignRoleToUser(Number(selectedRoleId), managingUser.id);
      setManagingUser(null);
      reload();
    } catch { alert("Failed to assign role."); }
    finally { setSaving(false); }
  };

  const filtered = users.filter(u =>
    u.username?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {managingUser && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black text-slate-900">MANAGE ACCESS</h2>
              <button onClick={() => setManagingUser(null)} className="p-2 hover:bg-slate-100 rounded-xl"><X size={18} /></button>
            </div>
            <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <div className="w-8 h-8 bg-slate-900 text-white rounded-full flex items-center justify-center text-sm font-black">
                {managingUser.username?.charAt(0)?.toUpperCase()}
              </div>
              <div>
                <p className="font-bold text-slate-900 text-sm">{managingUser.username}</p>
                <p className="text-xs text-slate-500">Assign a custom role</p>
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">Select Role</label>
              <select value={selectedRoleId} onChange={e => setSelectedRoleId(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-500">
                <option value="">Choose a role...</option>
                {roles.map(r => <option key={r.id} value={r.id}>{r.roleName}</option>)}
              </select>
            </div>
            <div className="flex gap-3">
              <button onClick={handleAssignRole} disabled={saving || !selectedRoleId}
                className="flex-1 bg-slate-900 text-white py-3 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                Assign Role
              </button>
              <button onClick={() => setManagingUser(null)} className="flex-1 border border-slate-200 text-slate-600 py-3 rounded-2xl text-sm font-bold hover:bg-slate-50">Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center gap-6">
          <Link href="/" className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded-xl"><ArrowLeft size={20} /></Link>
          <div>
            <h1 className="text-xl font-bold text-slate-900">User Management</h1>
            <p className="text-xs text-slate-500">Assign roles to users to control workspace access.</p>
          </div>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div />
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search users..." className="pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-sm outline-none focus:border-indigo-500 w-56" />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="animate-spin text-indigo-600" size={40} /></div>
        ) : (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {["Identity", "Active Roles", "Access Level", "Actions"].map(h => (
                    <th key={h} className="px-8 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(u => {
                  const isUserAdmin = u.customRoleName?.toUpperCase().includes('ADMIN') || u.role === "ADMIN";
                  const isSelf = u.username === authUser?.username;
                  const canManage = !isUserAdmin && !isSelf;

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-slate-900 text-white rounded-full flex items-center justify-center text-sm font-black">
                            {u.username?.charAt(0)?.toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900">{u.username}</p>
                            <p className="text-xs text-slate-400">{u.username}@formcraft</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <span className="text-[10px] font-bold px-3 py-1.5 bg-slate-100 text-slate-700 rounded-full uppercase tracking-wide">
                          {u.customRoleName || (u.role === "ADMIN" ? "SYSTEM_ADMIN" : "BASIC_USER")}
                        </span>
                      </td>
                      <td className="px-8 py-5">
                        <span className={`flex items-center gap-1.5 text-xs font-bold ${canManage ? 'text-emerald-600' : 'text-slate-400'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${canManage ? 'bg-emerald-500' : 'bg-slate-400'}`} /> {canManage ? 'MANAGED' : 'PROTECTED'}
                        </span>
                      </td>
                      <td className="px-8 py-5">
                        {canManage ? (
                          <button onClick={() => openManage(u)}
                            className="flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-2xl text-[11px] font-bold hover:bg-slate-800 transition-all">
                            MANAGE ACCESS <ChevronRight size={14} />
                          </button>
                        ) : (
                          <span className="text-[10px] font-bold text-slate-400 italic px-2">
                            RESTRICTED
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}

export default function UserManagementPage() {
  return <AuthGuard><UserManagementContent /></AuthGuard>;
}
