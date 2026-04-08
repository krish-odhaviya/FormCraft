"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api/formService";
import { 
  ArrowLeft, Loader2, Calendar, User, 
  ShieldAlert, CheckCircle2, History, 
  Type, Hash, AlignLeft, AlertTriangle, 
  Blocks, Workflow, FileText, Settings,
} from "lucide-react";

export default function VersionDetailPage() {
  const { formId, versionId } = useParams();
  
  const [version, setVersion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchVersionDetails();
  }, [formId, versionId]);

  const fetchVersionDetails = async () => {
    try {
      setLoading(true);
      const res = await api.getFormVersion(formId, versionId);
      setVersion(res.data);
      setError(null);
    } catch (err) {
      if (err.response?.status === 403) {
        setError("You don't have permission to view this version.");
      } else {
        setError("Failed to load version details.");
      }
    } finally {
      setLoading(false);
    }
  };

  const fields = useMemo(() => {
    try {
      return version?.definitionJson ? JSON.parse(version.definitionJson) : [];
    } catch { return []; }
  }, [version]);

  const rules = useMemo(() => {
    try {
      return version?.rulesJson ? JSON.parse(version.rulesJson) : [];
    } catch { return []; }
  }, [version]);

  const formatDate = (dateInput) => {
    if (!dateInput) return "N/A";
    if (Array.isArray(dateInput)) {
      const [y, m, d, h, min] = dateInput;
      return new Date(y, m - 1, d, h || 0, min || 0).toLocaleString();
    }
    return new Date(dateInput).toLocaleString();
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-white">
        <Loader2 className="animate-spin text-indigo-600 mb-4" size={40} />
        <p className="text-slate-500 font-medium">Loading version snapshot...</p>
      </div>
    );
  }

  if (error || !version) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 px-6 text-center">
        <ShieldAlert size={48} className="text-red-500 mb-4" />
        <h2 className="text-xl font-bold text-slate-900 mb-2">Unavailable</h2>
        <p className="text-slate-500 mb-8 max-w-sm">{error || "Version not found."}</p>
        <Link href={`/forms/${formId}/versions`} className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg shadow-sm hover:bg-indigo-700 transition-colors">
          Go Back
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-20">
      {/* Clean Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-6 py-8">
           <Link href={`/forms/${formId}/versions`} className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-indigo-600 mb-6 transition-colors">
             <ArrowLeft size={16} className="mr-2" /> Back to Versions
           </Link>
           
           <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                 <div className="flex items-center gap-3 mb-2">
                   <h1 className="text-2xl font-bold text-slate-900">Version {version.versionNumber} Snapshot</h1>
                   <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                     version.isActive ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-50 text-slate-500 border-slate-200'
                   }`}>
                     {version.isActive ? 'Active' : 'Inactive'}
                   </span>
                 </div>
                 <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-500">
                    <span className="flex items-center gap-1.5"><Calendar size={14} /> {formatDate(version.createdAt)}</span>
                    <span className="flex items-center gap-1.5"><User size={14} /> By {version.createdBy || "System"}</span>
                 </div>
              </div>

              <div className="flex gap-3">
                 <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-center">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Fields</div>
                    <div className="text-lg font-bold text-slate-700">{fields.length}</div>
                 </div>
                 <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-center">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Rules</div>
                    <div className="text-lg font-bold text-slate-700">{rules.length}</div>
                 </div>
              </div>
           </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-12 space-y-12">
        
        {/* Section 1: Fields */}
        <section>
           <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
              <FileText size={18} className="text-indigo-500" /> Form Structure
           </h2>
           
           {fields.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-400 italic">
                 No fields in this version.
              </div>
           ) : (
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 shadow-sm">
                 {fields.map((field, idx) => (
                    <div key={idx} className="p-6 hover:bg-slate-50 transition-colors">
                       <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                             <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded border border-slate-200 uppercase tracking-wider">
                                {field.fieldType}
                             </span>
                             <span className="text-[10px] font-mono text-slate-400">#{field.fieldKey}</span>
                          </div>
                          {field.required && (
                             <span className="text-[10px] font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded border border-red-100 uppercase tracking-wider">Required</span>
                          )}
                       </div>
                       <h3 className="text-base font-bold text-slate-800">{field.fieldLabel}</h3>
                       {field.uiConfig?.description && (
                          <p className="mt-1 text-sm text-slate-500 leading-relaxed">{field.uiConfig.description}</p>
                       )}
                       
                       {field.options && field.options.length > 0 && (
                          <div className="mt-4 flex flex-wrap gap-2">
                             {field.options.map((opt, i) => (
                                <span key={i} className="text-[10px] font-medium bg-indigo-50/50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-100/50">{opt}</span>
                             ))}
                          </div>
                       )}
                    </div>
                 ))}
              </div>
           )}
        </section>

        {/* Section 2: Logic Rules */}
        <section>
           <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
              <Workflow size={18} className="text-indigo-500" /> Business Logic & Validation
           </h2>

           {rules.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-400 italic">
                 No custom logic defined in this version.
              </div>
           ) : (
              <div className="space-y-4">
                 {rules.map((rule, idx) => (
                    <div key={idx} className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                       <div className="flex items-center gap-3 mb-4">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${
                             rule.scope === 'FIELD' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-rose-50 text-rose-600 border-rose-100'
                          }`}>
                             {rule.scope} Rule
                          </span>
                          {rule.fieldKey && <span className="text-[10px] font-mono text-slate-400">Target: {rule.fieldKey}</span>}
                       </div>
                       
                       <div className="bg-slate-50 rounded-lg p-4 mb-4 border border-slate-100">
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Expression</div>
                          <code className="text-sm font-mono text-indigo-600 break-all">{rule.expression}</code>
                       </div>
                       
                       <div className="flex items-start gap-3">
                          <AlertTriangle size={16} className="text-rose-400 mt-0.5 flex-shrink-0" />
                          <div>
                             <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Error Message</div>
                             <p className="text-sm text-slate-700 font-medium italic">"{rule.errorMessage}"</p>
                          </div>
                       </div>
                    </div>
                 ))}
              </div>
           )}
        </section>

      </div>

      <footer className="max-w-4xl mx-auto px-6 py-8 border-t border-slate-200 text-center">
         <p className="text-[11px] font-medium text-slate-400 uppercase tracking-widest">
            Snapshotted by FormCraft Integrity Engine
         </p>
      </footer>
    </div>
  );
}
