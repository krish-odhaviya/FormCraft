"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  Check,
  X,
  Clock,
  ChevronRight,
  ArrowLeft,
  Loader2,
  Shield,
  User,
  Inbox
} from "lucide-react";
import { api } from "@/lib/api/formService";
import { useAuth } from "@/context/AuthContext";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { toast } from "react-hot-toast";
import Link from "next/link";

function RequestsManagementContent() {
  const { user } = useAuth();
  const router = useRouter();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const res = await api.getPendingRequests();
        setRequests(res.data || []);
      } catch (err) {
        if (err.response?.status === 403) {
          toast.error("Access denied: your role does not have permission to view this page.");
          router.replace("/");
        } else {
          console.error("Failed to fetch pending requests:", err);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchRequests();
  }, []);

  const handleProcessRequest = async (requestId, status, role) => {
    setProcessingId({ id: requestId, role });
    try {
      await api.processRequest(requestId, status, role);
      setRequests((prev) => prev.filter((r) => r.id !== requestId));
      toast.success(`Request ${status.toLowerCase()}`);
    } catch (err) {
      console.error("Failed to process request:", err);
      toast.error("Error processing request.");
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">

      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Pending Approvals</h2>
            <p className="text-sm text-slate-500">{requests.length} items waiting</p>
          </div>

          {loading ? (
            <div className="bg-white rounded-3xl p-20 flex flex-col items-center justify-center border border-slate-200 shadow-sm">
              <Loader2 className="animate-spin text-indigo-600 mb-4" size={40} />
              <p className="text-slate-500 font-medium">Loading requests...</p>
            </div>
          ) : requests.length === 0 ? (
            <div className="bg-white rounded-3xl p-16 text-center border-2 border-dashed border-slate-200">
              <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Check className="text-emerald-500" size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-1">All Caught Up!</h3>
              <p className="text-slate-500">No pending access requests for your forms.</p>
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
                      <p className="text-sm font-semibold text-slate-700 mb-1">Reason:</p>
                      <p className="text-sm text-slate-500 italic">"{req.reason || 'No reason provided'}"</p>
                    </div>
                    {req.form && (
                      <p className="text-xs text-indigo-600 font-bold mt-4 flex items-center gap-1">
                        Form: {req.form.name} <ChevronRight size={12} />
                      </p>
                    )}
                  </div>
                  
                  <div className="flex flex-row sm:flex-col gap-2 justify-center shrink-0">
                    {req.type === 'CREATE_FORM' ? (
                      <button
                         onClick={() => handleProcessRequest(req.id, "APPROVED")}
                         disabled={processingId?.id === req.id}
                         className="bg-indigo-600 text-white hover:bg-indigo-700 px-6 py-3 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 shadow-lg shadow-indigo-100"
                      >
                         {processingId?.id === req.id ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                         Approve
                       </button>
                    ) : (
                      <>
                        <button
                          onClick={() => handleProcessRequest(req.id, "APPROVED", "VIEWER")}
                          disabled={processingId?.id === req.id}
                          className="bg-emerald-600 text-white hover:bg-emerald-700 px-6 py-3 rounded-2xl text-[10px] font-bold transition-all flex items-center gap-2 shadow-lg shadow-emerald-100"
                        >
                          {processingId?.id === req.id && processingId?.role === 'VIEWER' ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                          Approve as Viewer
                        </button>
                        <button
                          onClick={() => handleProcessRequest(req.id, "APPROVED", "BUILDER")}
                          disabled={processingId?.id === req.id}
                          className="bg-indigo-600 text-white hover:bg-indigo-700 px-6 py-3 rounded-2xl text-[10px] font-bold transition-all flex items-center gap-2 shadow-lg shadow-indigo-100"
                        >
                          {processingId?.id === req.id && processingId?.role === 'BUILDER' ? <Loader2 size={14} className="animate-spin" /> : <Shield size={14} />}
                          Approve as Builder
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => handleProcessRequest(req.id, "REJECTED")}
                      disabled={processingId?.id === req.id}
                      className="bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 px-6 py-3 rounded-2xl text-[10px] font-bold transition-all flex items-center gap-2"
                    >
                      <X size={14} />
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function RequestsPage() {
  return (
    <AuthGuard>
      <RequestsManagementContent />
    </AuthGuard>
  );
}