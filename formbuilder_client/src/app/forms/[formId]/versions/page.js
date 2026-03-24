"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api/formService";
import { useAuth } from "@/context/AuthContext";
import { toast } from "react-hot-toast";
import { AlertCircle, ArrowLeft, Loader2, GitBranch, Plus } from "lucide-react";
import { VersionItem } from "@/components/version/VersionItem";
import { ActivateDialog } from "@/components/version/ActivateDialog";

export default function VersionsPage() {
  const { formId } = useParams();
  const { user } = useAuth();
  
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [isCreating, setIsCreating] = useState(false);
  const [activatingVersion, setActivatingVersion] = useState(null);
  const [isActivatingLoading, setIsActivatingLoading] = useState(false);

  useEffect(() => {
    fetchVersions();
  }, [formId]);

  const fetchVersions = async () => {
    try {
      setLoading(true);
      const res = await api.getFormVersions(formId);
      setVersions(res.data || []);
      setError(null);
    } catch (err) {
      if (err.response?.status === 403) {
        setError("You don't have permission to manage versions for this form.");
      } else {
        setError("Failed to load versions. Please try again later.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreateVersion = async () => {
    setIsCreating(true);
    try {
      await api.createFormVersion(formId);
      toast.success("New version snapshot created!");
      fetchVersions();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create version.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleActivateConfirm = async () => {
    if (!activatingVersion) return;
    setIsActivatingLoading(true);
    try {
      const res = await api.activateFormVersion(formId, activatingVersion.id);
      const { draftsDropped, draftsCount } = res.data || {};
      
      if (draftsDropped) {
        toast.success(`Version ${activatingVersion.versionNumber} is now active. ${draftsCount} temporary drafts were dropped.`, { duration: 5000 });
      } else {
        toast.success(`Version ${activatingVersion.versionNumber} is now active.`);
      }
      
      setActivatingVersion(null);
      fetchVersions();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to activate version.");
    } finally {
      setIsActivatingLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
        <Loader2 className="animate-spin text-indigo-600 mb-4" size={40} />
        <p className="text-slate-500 font-medium tracking-wide">Loading versions...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 px-6 text-center">
        <div className="w-20 h-20 bg-red-100 rounded-full flex justify-center items-center mb-6">
          <AlertCircle size={36} className="text-red-500" />
        </div>
        <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-2">Access Denied</h2>
        <p className="text-slate-500 mb-8 leading-relaxed max-w-sm">{error}</p>
        <Link href="/" className="px-6 py-3 bg-white text-slate-700 border border-slate-200 font-bold rounded-xl shadow-sm hover:bg-slate-50 transition-colors">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  // Ensure descending sort so newest is top
  const sortedVersions = [...versions].sort((a, b) => b.versionNumber - a.versionNumber);

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans p-6 lg:p-12">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <Link href={`/forms/${formId}/builder`} className="inline-flex items-center text-sm font-semibold text-slate-500 hover:text-slate-900 mb-6 transition-colors">
            <ArrowLeft size={16} className="mr-1.5" /> Back to Builder
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3 tracking-tight">
                <GitBranch size={28} className="text-indigo-600" /> Version History
              </h1>
              <p className="text-slate-500 text-sm font-medium mt-1">
                Manage immutable snapshots of your form definitions over time.
              </p>
            </div>
            
            <button
              onClick={handleCreateVersion}
              disabled={isCreating}
              className="px-5 py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-sm hover:shadow-md hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50 flex justify-center items-center gap-2"
            >
              {isCreating ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} strokeWidth={3} />}
              Create Snapshot
            </button>
          </div>
        </div>

        {sortedVersions.length === 0 ? (
          <div className="bg-white border text-center border-slate-200 rounded-3xl p-16 shadow-sm">
             <div className="w-16 h-16 bg-slate-50 mx-auto rounded-full flex justify-center items-center mb-6">
               <GitBranch size={24} className="text-slate-300" />
             </div>
             <h3 className="text-xl font-bold text-slate-900 mb-2">No versions found</h3>
             <p className="text-slate-500 max-w-sm mx-auto">Publish your form to automatically create your first version snapshot, or create one manually.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedVersions.map((v) => (
              <VersionItem 
                key={v.id} 
                version={v} 
                formId={formId} 
                isActivateLoading={isActivatingLoading}
                onActivateClick={(ver) => setActivatingVersion(ver)} 
              />
            ))}
          </div>
        )}
      </div>

      <ActivateDialog 
        isOpen={!!activatingVersion}
        versionNumber={activatingVersion?.versionNumber}
        isActivating={isActivatingLoading}
        isDraftWorkingCopy={activatingVersion?.isDraftWorkingCopy}
        onClose={() => setActivatingVersion(null)}
        onConfirm={handleActivateConfirm}
      />
    </div>
  );
}
