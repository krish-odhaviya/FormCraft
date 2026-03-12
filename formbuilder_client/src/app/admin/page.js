"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  Bell,
  ShieldCheck,
  Check,
  X,
  Clock,
  Search,
  ChevronRight,
  UserPlus,
  ArrowLeft,
  Loader2,
  ShieldAlert,
  Shield,
  User
} from "lucide-react";
import { api } from "@/lib/api/formService";
import { useAuth } from "@/context/AuthContext";
import { AuthGuard } from "@/components/auth/AuthGuard";
import Link from "next/link";

function AdminDashboardContent() {
  const { user } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("requests");
  const [users, setUsers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  useEffect(() => {
    if (user && !user.roles?.includes("ROLE_ADMIN")) {
      router.replace("/");
      return;
    }

    const fetchData = async () => {
      try {
        const [usersRes, reqRes] = await Promise.all([
          api.getAdminUsers(),
          api.getPendingRequests(),
        ]);
        setUsers(usersRes.data || []);
        setRequests(reqRes.data || []);
      } catch (err) {
        console.error("Failed to fetch admin data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user, router]);

  const handleProcessRequest = async (requestId, status) => {
    setProcessingId(requestId);
    try {
      await api.processRequest(requestId, status);
      setRequests((prev) => prev.filter((r) => r.id !== requestId));
    } catch (err) {
      console.error("Failed to process request:", err);
      alert("Error processing request.");
    } finally {
      setProcessingId(null);
    }
  };

  const handleUpdateRole = async (userId, role) => {
    try {
      await api.updateUserRole(userId, role);
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role } : u))
      );
    } catch (err) {
      console.error("Failed to update user role:", err);
      alert("Error updating role.");
    }
  };

  const handleToggleStatus = async (userId, enabled) => {
    try {
      await api.toggleUserStatus(userId, enabled);
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, enabled } : u))
      );
    } catch (err) {
      console.error("Failed to toggle status:", err);
      alert("Error updating status.");
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-all">
              <ArrowLeft size={20} />
            </Link>
            <div className="flex items-center gap-2">
              <ShieldCheck className="text-indigo-600" size={24} />
              <h1 className="text-xl font-bold text-slate-900">Admin Control Panel</h1>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm text-slate-500 font-medium italic">
            Super Admin Portal
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-2">
            <button
              onClick={() => setActiveTab("requests")}
              className={`w-full flex items-center gap-3 px-6 py-4 rounded-2xl text-sm font-bold transition-all ${
                activeTab === "requests"
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200"
                  : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
              }`}
            >
              <Bell size={18} />
              Pending Requests
              {requests.length > 0 && (
                <span className={`ml-auto px-2 py-0.5 rounded-lg text-[10px] ${activeTab === 'requests' ? 'bg-white/20 text-white' : 'bg-red-100 text-red-600'}`}>
                  {requests.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("users")}
              className={`w-full flex items-center gap-3 px-6 py-4 rounded-2xl text-sm font-bold transition-all ${
                activeTab === "users"
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200"
                  : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
              }`}
            >
              <Users size={18} />
              Manage Users
            </button>
          </div>

          {/* Content */}
          <div className="lg:col-span-3">
            {loading ? (
              <div className="bg-white rounded-3xl p-20 flex flex-col items-center justify-center border border-slate-200 shadow-sm">
                <Loader2 className="animate-spin text-indigo-600 mb-4" size={40} />
                <p className="text-slate-500 font-medium">Fetching system data...</p>
              </div>
            ) : activeTab === "requests" ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">Access Requests</h2>
                  <p className="text-sm text-slate-500">{requests.length} items pending</p>
                </div>

                {requests.length === 0 ? (
                  <div className="bg-white rounded-3xl p-16 text-center border-2 border-dashed border-slate-200">
                    <Check className="mx-auto text-slate-300 mb-4" size={48} />
                    <h3 className="text-xl font-bold text-slate-900 mb-1">Queue Clear</h3>
                    <p className="text-slate-500">No pending access requests at the moment.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {requests.map((req) => (
                      <div key={req.id} className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col sm:flex-row gap-6">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400">
                              <User size={20} />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-900">@{req.user?.username}</p>
                              <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">{req.type?.replace('_', ' ')}</p>
                            </div>
                          </div>
                          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                            <p className="text-sm font-semibold text-slate-700 mb-1">Reason for request:</p>
                            <p className="text-sm text-slate-500 italic">"{req.reason || 'No reason provided'}"</p>
                          </div>
                          {req.form && (
                            <p className="text-xs text-indigo-600 font-bold mt-4 flex items-center gap-1">
                              Target form: {req.form.name} <ChevronRight size={12} />
                            </p>
                          )}
                        </div>
                        <div className="flex flex-row sm:flex-col gap-2 justify-center shrink-0">
                          <button
                            onClick={() => handleProcessRequest(req.id, "APPROVED")}
                            disabled={processingId === req.id}
                            className="bg-indigo-600 text-white hover:bg-indigo-700 px-6 py-3 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 shadow-lg shadow-indigo-100"
                          >
                            {processingId === req.id ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                            Approve
                          </button>
                          <button
                            onClick={() => handleProcessRequest(req.id, "REJECTED")}
                            disabled={processingId === req.id}
                            className="bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 px-6 py-3 rounded-2xl text-xs font-bold transition-all flex items-center gap-2"
                          >
                            <X size={16} />
                            Reject
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">System Users</h2>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input type="text" placeholder="Filter users..." className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 transition-all w-48" />
                  </div>
                </div>

                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-400">User Identity</th>
                        <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-400">System Role</th>
                        <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-400">Account Status</th>
                        <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-wider text-slate-400 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {users.map((u) => (
                        <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-8 py-5">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 text-xs font-black">
                                {u.username?.charAt(0).toUpperCase()}
                              </div>
                              <span className="text-sm font-bold text-slate-900">{u.username}</span>
                            </div>
                          </td>
                          <td className="px-8 py-5">
                            <select
                              value={u.role}
                              onChange={(e) => handleUpdateRole(u.id, e.target.value)}
                              className={`text-xs font-bold px-3 py-1.5 rounded-lg border outline-none transition-all ${
                                u.role === 'ADMIN' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-slate-50 text-slate-600 border-slate-200'
                              }`}
                            >
                              <option value="ADMIN">ADMIN</option>
                              <option value="EMPLOYEE">EMPLOYEE</option>
                            </select>
                          </td>
                          <td className="px-8 py-5">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                              u.enabled ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'
                            }`}>
                              <span className={`w-1 h-1 rounded-full ${u.enabled ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                              {u.enabled ? 'Active' : 'Disabled'}
                            </span>
                          </td>
                          <td className="px-8 py-5 text-right">
                            <button
                              onClick={() => handleToggleStatus(u.id, !u.enabled)}
                              className={`text-[10px] font-black uppercase px-3 py-1.5 rounded-lg transition-all ${
                                u.enabled ? 'text-red-500 hover:bg-red-50' : 'text-emerald-600 hover:bg-emerald-50'
                              }`}
                            >
                              {u.enabled ? 'Disable' : 'Enable'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default function AdminDashboardPage() {
  return (
    <AuthGuard>
      <AdminDashboardContent />
    </AuthGuard>
  );
}
