"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api/formService";
import { ArrowLeft, Loader2, GitBranch, Calendar, User, ShieldAlert, BadgeInfo, CheckCircle2, History, Type, Hash, AlignLeft } from "lucide-react";

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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
        <Loader2 className="animate-spin text-indigo-600 mb-4" size={40} />
        <p className="text-slate-500 font-medium tracking-wide">Loading snapshot...</p>
      </div>
    );
  }

  if (error || !version) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 px-6 text-center">
        <div className="w-20 h-20 bg-red-100 rounded-full flex justify-center items-center mb-6 border border-red-200">
          <ShieldAlert size={36} className="text-red-500" />
        </div>
        <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-2">Unavailable</h2>
        <p className="text-slate-500 mb-8 leading-relaxed max-w-sm">{error || "Version not found."}</p>
        <Link href={`/forms/${formId}/versions`} className="px-6 py-3 bg-white text-slate-700 border border-slate-200 font-bold rounded-xl shadow-sm hover:bg-slate-50 transition-colors">
          Go Back
        </Link>
      </div>
    );
  }

  // Parse JSON definitions (with safety fallback)
  let fields = [];
  try {
    fields = version.definitionJson ? JSON.parse(version.definitionJson) : [];
  } catch {
    fields = [];
  }

  // Formatting date safely
  let dateStr = "Unknown Date";
  if (version.createdAt) {
    if (Array.isArray(version.createdAt)) {
      const [y, m, d, h, min] = version.createdAt;
      dateStr = new Date(y, m - 1, d, h || 0, min || 0).toLocaleString();
    } else {
      dateStr = new Date(version.createdAt).toLocaleString();
    }
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans p-6 lg:p-12">
      <div className="max-w-4xl mx-auto">
        <div className="mb-0">
          <Link href={`/forms/${formId}/versions`} className="inline-flex items-center text-sm font-semibold text-slate-500 hover:text-slate-900 mb-6 transition-colors">
            <ArrowLeft size={16} className="mr-1.5" /> Back to Versions
          </Link>
        </div>

        {/* Warning Toast for Active Version directly inserted over the header */}
        {version.isActive && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl mb-6 shadow-sm flex items-start gap-4 animate-in fade-in slide-in-from-top-4">
             <div className="p-2 bg-amber-100/50 rounded-full text-amber-600"><AlertCircle size={20} /></div>
             <div>
               <h3 className="font-bold text-amber-900 tracking-tight mb-0.5">Active versions cannot be edited</h3>
               <p className="text-sm font-medium text-amber-700/80">
                 This is the active live snapshot. It is completely read-only to preserve 100% data integrity for submissions. To make changes, use the Form Builder draft and publish a new version.
               </p>
             </div>
          </div>
        )}

        {/* Header Block */}
        <div className="bg-white border text-center border-slate-200 rounded-[32px] p-8 sm:p-10 shadow-sm mb-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-50/50 rounded-bl-[100px] blur-3xl rounded-full z-0 -mt-10 -mr-10"></div>
          
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
             <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className={`p-2 rounded-xl border ${version.isActive ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
                    {version.isActive ? <CheckCircle2 size={24} /> : <History size={24} />}
                  </div>
                  <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                    Version Snapshot <span className="text-indigo-600">v{version.versionNumber}</span>
                  </h1>
                </div>
                
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-4 text-sm font-semibold text-slate-500">
                  <span className="flex items-center gap-2"><Calendar size={16} className="text-slate-400" /> {dateStr}</span>
                  <span className="flex items-center gap-2"><User size={16} className="text-slate-400" /> Created by {version.createdBy || "System"}</span>
                </div>
             </div>
             <div>
               <div className={`px-5 py-2 rounded-xl text-sm font-black tracking-widest uppercase border inline-flex items-center gap-2 shadow-sm ${
                 version.isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-500 border-slate-200'
               }`}>
                 {version.isActive ? "ACTIVE LIVE" : "INACTIVE"}
               </div>
             </div>
          </div>
        </div>

        {/* Field List View */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold flex items-center gap-2 tracking-tight text-slate-900 ml-2">
             <BadgeInfo size={20} className="text-indigo-500" /> Form Defintion Preview
          </h2>

          {fields.length === 0 ? (
             <div className="bg-white border text-center border-slate-200 rounded-3xl p-12 shadow-sm">
               <p className="text-slate-500 font-medium">No fields were found in this version snapshot.</p>
             </div>
          ) : (
             <div className="space-y-4">
               {fields.map((field, idx) => {
                 const isRequired = field.validation?.required;
                 
                 // Get friendly name
                 let icon = <Type size={16} />;
                 let typeName = field.fieldType;
                 if (typeName === "INTEGER") { icon = <Hash size={16} />; typeName = "Number"; }
                 if (typeName === "TEXTAREA") { icon = <AlignLeft size={16} />; typeName = "Long Text"; }
                 
                 return (
                   <div key={idx} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow relative group overflow-hidden">
                     {/* Disabled overlay simulation */}
                     <div className="absolute inset-0 bg-slate-50/30 w-full h-full z-10 cursor-not-allowed"></div>
                     
                     <div className="relative z-0">
                       <div className="flex items-center justify-between mb-2">
                         <div className="flex items-center gap-3">
                           <span className="text-xs font-bold bg-indigo-50 text-indigo-600 px-2 py-1 rounded border border-indigo-100 uppercase tracking-widest flex items-center gap-1.5">
                              {icon} {typeName}
                           </span>
                           <span className="text-xs font-semibold text-slate-400 font-mono tracking-tight">#{field.fieldKey}</span>
                         </div>
                         {isRequired && (
                           <span className="text-xs font-bold bg-red-50 text-red-600 px-2.5 py-1 rounded lowercase">required</span>
                         )}
                       </div>
                       
                       <h3 className="text-lg font-bold text-slate-900 mt-3">{field.fieldLabel}</h3>
                       {field.uiConfig?.description && (
                         <p className="text-slate-500 text-sm mt-1">{field.uiConfig.description}</p>
                       )}
                       {field.options && field.options.length > 0 && (
                          <div className="mt-4 flex flex-wrap gap-2">
                             {field.options.map((opt, i) => (
                               <span key={i} className="text-[11px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200">{opt}</span>
                             ))}
                          </div>
                       )}
                     </div>
                   </div>
                 );
               })}
             </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Inline alert icon overlay missing component
function AlertCircle(props) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={props.size||24} height={props.size||24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={props.className}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
  );
}
