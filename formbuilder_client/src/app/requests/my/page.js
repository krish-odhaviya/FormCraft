"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { 
  History, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  ArrowLeft,
  ChevronRight,
  ShieldQuestion,
  PlusCircle,
  FileText
} from "lucide-react";
import { api } from "@/lib/api/formService";
import { useAuth } from "@/context/AuthContext";
import { AuthGuard } from "@/components/auth/AuthGuard";
import Link from "next/link";

function MyRequestsContent() {
  const { user } = useAuth();
  const router = useRouter();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMyRequests = async () => {
      try {
        const res = await api.getMyRequests();
        setRequests(res.data || []);
      } catch (err) {
        const status = err?.response?.status;
        if (status === 403) {
          toast.error("Access denied: your role does not have permission to view this page.");
          router.replace("/");
        } else {
          console.error("Failed to fetch my requests:", err);
          toast.error("Failed to load your requests. Please refresh the page.");
        }
      } finally {
        setLoading(false);
      }
    };
    fetchMyRequests();
  }, []);

  const getStatusStyle = (status) => {
    switch (status) {
      case 'PENDING':
        return "bg-amber-50 text-amber-700 border-amber-200";
      case 'APPROVED':
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case 'REJECTED':
        return "bg-rose-50 text-rose-700 border-rose-200";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'PENDING': return <Clock size={14} />;
      case 'APPROVED': return <CheckCircle2 size={14} />;
      case 'REJECTED': return <XCircle size={14} />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">

      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="mb-10 text-center sm:text-left">
          <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Request History</h2>
          <p className="text-slate-500">Track the status of your permission and form access requests.</p>
        </div>

        {loading ? (
          <div className="bg-white rounded-[40px] p-24 flex flex-col items-center justify-center border border-slate-200 shadow-sm transition-all duration-500">
            <div className="relative">
               <div className="absolute inset-0 bg-indigo-100 blur-2xl rounded-full scale-150 opacity-50" />
               <Loader2 className="animate-spin text-indigo-600 relative z-10" size={48} />
            </div>
            <p className="mt-6 text-slate-500 font-bold tracking-tight">Syncing your requests...</p>
          </div>
        ) : requests.length === 0 ? (
          <div className="bg-white rounded-[40px] p-16 text-center border-2 border-dashed border-slate-200 flex flex-col items-center">
            <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mb-6 shadow-sm">
              <ShieldQuestion className="text-slate-300" size={40} />
            </div>
            <h3 className="text-2xl font-black text-slate-900 mb-2">No Requests Found</h3>
            <p className="text-slate-500 max-w-sm mx-auto mb-8 leading-relaxed">
              You haven't submitted any access or permission requests yet. All your future requests will appear here.
            </p>
            <Link 
              href="/"
              className="px-8 py-4 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 flex items-center gap-2"
            >
              <PlusCircle size={20} />
              Browse Forms
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5">
            {requests.map((req) => (
              <div 
                key={req.id} 
                className="group bg-white rounded-[32px] p-8 border border-slate-200 shadow-sm hover:shadow-xl hover:border-indigo-100 hover:-translate-y-1 transition-all duration-300 flex flex-col md:flex-row gap-6 items-start md:items-center"
              >
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-inner ${
                  req.type === 'CREATE_FORM' ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-50 text-slate-600'
                }`}>
                  {req.type === 'CREATE_FORM' ? <PlusCircle size={24} /> : <FileText size={24} />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-black text-indigo-500 uppercase tracking-widest">
                      {req.type?.replace('_', ' ')}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 truncate tracking-tight">
                    {req.type === 'CREATE_FORM' ? "Permission to Create Forms" : req.form?.name || "Access to Form"}
                  </h3>
                  <div className="flex items-center gap-4 mt-2">
                    <p className="text-sm font-medium text-slate-500 italic flex items-center gap-1.5">
                      "{req.reason || 'No reason specified'}"
                    </p>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-3 w-full md:w-auto mt-4 md:mt-0 pt-4 md:pt-0 border-t md:border-t-0 border-slate-100">
                  <div className={`flex items-center gap-2 px-4 py-2 rounded-2xl border text-xs font-black uppercase tracking-wider shadow-sm ${getStatusStyle(req.status)}`}>
                    {getStatusIcon(req.status)}
                    {req.status}
                  </div>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
                    {new Date(req.requestedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-12 p-8 bg-indigo-900 rounded-[40px] text-white overflow-hidden relative group">
          <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 w-64 h-64 bg-white/10 rounded-full blur-3xl group-hover:scale-110 transition-transform duration-700" />
          <div className="relative z-10">
            <h3 className="text-xl font-bold mb-2">Need help?</h3>
            <p className="text-indigo-100 text-sm max-w-md opacity-80 leading-relaxed mb-6">
              If your request is pending for too long, please contact your administrator or the form owner directly for faster approval.
            </p>
            <button className="px-6 py-3 bg-white text-indigo-900 text-xs font-black rounded-xl hover:bg-slate-100 transition-colors uppercase tracking-widest shadow-lg">
              Contact Support
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function MyRequestsPage() {
  return (
    <AuthGuard>
      <MyRequestsContent />
    </AuthGuard>
  );
}