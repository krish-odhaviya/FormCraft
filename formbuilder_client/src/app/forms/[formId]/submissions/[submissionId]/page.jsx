"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import {
  ArrowLeft,
  Loader2,
  Calendar,
  User,
  Hash,
  ShieldCheck,
  FileText,
  Clock,
  ExternalLink,
  ChevronRight,
} from "lucide-react";
import { api } from "@/lib/api/formService";
import { useAuth } from "@/context/AuthContext";
import { toast } from "react-hot-toast";

export default function SubmissionDetail() {
  const { formId, submissionId } = useParams();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  useEffect(() => {
    async function fetchDetail() {
      if (!formId || !submissionId) return;
      try {
        setLoading(true);
        const res = await api.getSubmissionDetail(formId, submissionId);
        setData(res.data);
      } catch (err) {
        toast.error("Failed to load submission detail");
        setError(err.response?.data?.message || err.message || "Something went wrong");
      } finally {
        setLoading(false);
      }
    }
    fetchDetail();
  }, [formId, submissionId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 gap-4">
        <Loader2 className="animate-spin text-indigo-600" size={40} />
        <p className="text-slate-500 font-medium font-sans">Fetching submission details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-6 text-center">
        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mb-4">
          <ShieldCheck size={32} />
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2 font-sans">Unable to View Submission</h2>
        <p className="text-slate-500 max-w-sm mb-6 leading-relaxed font-sans">{error}</p>
        <Link href={`/forms/${formId}/submissions`} className="px-6 py-2.5 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-all font-sans">
          Return to List
        </Link>
      </div>
    );
  }

  const { metadata, fields, values } = data;

  // Group fields into sections/pages as in the original form layout
  const groupedContent = [];
  let currentSection = { type: 'SECTION', label: 'Form Content', children: [] };
  
  fields.forEach(field => {
    if (field.fieldType === 'SECTION' || field.fieldType === 'PAGE_BREAK') {
      if (currentSection.children.length > 0) {
        groupedContent.push(currentSection);
      }
      currentSection = { 
        type: field.fieldType, 
        label: field.fieldLabel || 'Untitled Section', 
        children: [] 
      };
    } else {
      currentSection.children.push(field);
    }
  });
  if (currentSection.children.length > 0 || groupedContent.length === 0) {
    groupedContent.push(currentSection);
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-6 lg:px-12 font-sans">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Link href={`/forms/${formId}/submissions`} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-indigo-600 transition-colors group">
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Back to Submissions
          </Link>
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
            <span className="bg-white px-3 py-1.5 rounded-lg border border-slate-200">ID: {metadata.dataRowId?.substring(0,8)}...</span>
          </div>
        </div>

        {/* Header Ribbon - SRS #10 METADATA STRIP */}
        <div className="bg-white rounded-[24px] shadow-sm border border-slate-200 p-1">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-0.5 overflow-hidden rounded-[20px]">
            <MetaItem label="Submitted By" value={metadata.submittedBy} icon={User} color="text-blue-500" />
            <MetaItem label="Submitted At" value={metadata.submittedAt ? format(new Date(metadata.submittedAt), "MMM d, yyyy HH:mm") : "N/A"} icon={Calendar} color="text-amber-500" />
            <MetaItem label="Form Version" value={`v${metadata.versionNumber || '1'}`} icon={Hash} color="text-green-500" />
            <MetaItem label="Status" value={metadata.status} icon={ShieldCheck} badge={true} color={metadata.status === 'SUBMITTED' ? "text-emerald-500" : "text-amber-500"} />
            <MetaItem label="Action" value="Export to PDF" icon={FileText} action={() => window.print()} color="text-indigo-500" isLast={true} />
          </div>
        </div>

        {/* Main Content Area */}
        <div className="space-y-6 print:space-y-4">
          {groupedContent.map((section, sIdx) => (
            <div key={sIdx} className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
              {/* Section Header */}
              <div className="bg-slate-50/50 border-b border-slate-100 px-8 py-5 flex items-center gap-3">
                <div className="w-1.5 h-6 bg-indigo-600 rounded-full" />
                <h3 className="text-lg font-bold text-slate-800 tracking-tight">{section.label}</h3>
              </div>
              
              <div className="p-8 space-y-8">
                {section.children.map((field, fIdx) => (
                  <div key={field.fieldKey || fIdx} className="group">
                    {field.fieldType === 'LABEL' ? (
                      <p className="text-sm font-medium text-slate-400 bg-slate-50 p-4 rounded-2xl border border-dashed border-slate-200">{field.fieldLabel}</p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                        <div className="md:col-span-1">
                          <label className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors uppercase tracking-wider mb-1 block">
                            {field.fieldLabel}
                          </label>
                          <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">TYPE: {field.fieldType?.replace('_', ' ')}</span>
                        </div>
                        <div className="md:col-span-2">
                          <ValueRenderer field={field} value={values[field.fieldKey]} />
                        </div>
                      </div>
                    )}
                    {fIdx < section.children.length - 1 && (
                      <div className="h-px bg-slate-50 w-full mt-8" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-center pt-8 pb-12 print:hidden">
            <button 
                onClick={() => window.print()}
                className="flex items-center gap-3 bg-white border-2 border-slate-900 text-slate-900 px-8 py-3.5 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-slate-900 hover:text-white transition-all shadow-xl hover:shadow-indigo-200 active:scale-95"
            >
                <FileText size={18} /> Print Record
            </button>
        </div>
      </div>
    </div>
  );
}

function MetaItem({ label, value, icon: Icon, color, badge, action, isLast }) {
  const content = (
    <div className={`p-4 hover:bg-slate-50 transition-colors h-full ${!isLast ? 'border-r border-slate-100' : ''}`}>
      <div className="flex flex-col gap-1.5 h-full">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg bg-white shadow-sm border border-slate-100 ${color}`}>
            <Icon size={14} />
          </div>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
        </div>
        <div className="mt-auto pl-8">
          {badge ? (
            <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-black border uppercase tracking-widest shadow-sm ${
              value === 'SUBMITTED' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'
            }`}>
              {value}
            </span>
          ) : (
            <p className="text-sm font-bold text-slate-900 truncate">{value || 'None'}</p>
          )}
        </div>
      </div>
    </div>
  );

  if (action) {
    return (
      <button onClick={action} className="text-left w-full h-full p-0 bg-transparent border-0">
        {content}
      </button>
    );
  }

  return <div>{content}</div>;
}

function ValueRenderer({ field, value }) {
  if (value === null || value === undefined || value === "") {
    return (
      <div className="flex items-center gap-2 p-4 bg-slate-50 rounded-2xl border border-slate-100 border-dashed">
        <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
        <span className="text-sm font-medium text-slate-400 italic">No response provided</span>
      </div>
    );
  }

  switch (field.fieldType?.toUpperCase()) {
    case "BOOLEAN":
      return (
        <div className={`inline-flex items-center gap-3 px-6 py-3 rounded-2xl border-2 ${
          value ? "bg-emerald-50 text-emerald-700 border-emerald-100 shadow-sm" : "bg-slate-100 text-slate-500 border-slate-200"
        } transition-all`}>
          <div className={`w-3 h-3 rounded-full ${value ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-slate-400"}`} />
          <span className="text-sm font-black uppercase tracking-widest">{value ? "Selected Yes" : "Selected No"}</span>
        </div>
      );

    case "STAR_RATING": {
      const rating = Number(value);
      return (
        <div className="flex flex-col gap-3">
            <div className="flex gap-1.5">
            {[1, 2, 3, 4, 5].map((s) => (
                <div key={s} className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                s <= rating ? "bg-amber-50 text-amber-500 border-2 border-amber-100 shadow-md shadow-amber-50" : "bg-white border-2 border-slate-100 text-slate-200"
                }`}>
                <Star size={20} fill={s <= rating ? "currentColor" : "none"} />
                </div>
            ))}
            </div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Score: {rating}/5</p>
        </div>
      );
    }

    case "LINEAR_SCALE": {
        const val = Number(value);
        return (
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center text-xl font-black shadow-lg shadow-indigo-100">
                {val}
            </div>
            <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200 p-0.5">
                <div 
                    className="h-full bg-indigo-500 rounded-full shadow-[0_0_10px_rgba(79,70,229,0.3)] transition-all duration-1000"
                    style={{ width: `${(val / 5) * 100}%` }}
                />
            </div>
          </div>
        );
    }

    case "CHECKBOX_GROUP": {
      try {
        const items = typeof value === "string" ? JSON.parse(value) : value;
        if (!Array.isArray(items)) return <SimpleValue text={String(value)} />;
        return (
          <div className="flex flex-wrap gap-2">
            {items.map((item, i) => (
              <span key={i} className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-xl text-xs font-black uppercase tracking-widest shadow-sm">
                <ShieldCheck size={12} /> {item}
              </span>
            ))}
          </div>
        );
      } catch { return <SimpleValue text={String(value)} />; }
    }

    case "FILE_UPLOAD":
      return (
        <a 
          href={String(value)} 
          target="_blank" 
          rel="noopener noreferrer"
          className="group flex items-center gap-4 p-4 bg-white border-2 border-slate-100 hover:border-indigo-600 rounded-2xl transition-all hover:shadow-xl hover:shadow-indigo-50"
        >
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
            <FileText size={24} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-800 truncate">{String(value).split('/').pop()}</p>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                View Document <ExternalLink size={10} />
            </p>
          </div>
        </a>
      );

    case "MC_GRID":
    case "TICK_BOX_GRID": {
        try {
            const gridData = typeof value === "string" ? JSON.parse(value) : value;
            return (
                <div className="border-2 border-slate-100 rounded-2xl overflow-hidden bg-white shadow-sm">
                    {Object.entries(gridData).map(([row, colValue], idx) => (
                        <div key={idx} className={`flex items-center justify-between px-6 py-4 ${idx % 2 === 0 ? "bg-slate-50/50" : "bg-white"} border-b border-slate-100 last:border-0`}>
                            <span className="text-sm font-bold text-slate-700">{row}</span>
                            <div className="flex flex-wrap gap-1 justify-end">
                                {Array.isArray(colValue) ? (
                                    colValue.map((c, i) => (
                                        <span key={i} className="px-3 py-1 bg-indigo-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest shadow-sm shadow-indigo-200">{c}</span>
                                    ))
                                ) : (
                                    <span className="px-3 py-1 bg-indigo-600 text-white rounded-lg text-xs font-black uppercase tracking-widest shadow-md shadow-indigo-100">{String(colValue)}</span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )
        } catch { return <SimpleValue text={String(value)} /> }
    }

    case "DROPDOWN":
    case "LOOKUP_DROPDOWN": {
        const isMultiple = field.selectionMode === "multiple";
        if (isMultiple && value) {
            try {
                let items = typeof value === "string" ? JSON.parse(value) : value;
                if (!Array.isArray(items)) items = [items];
                return (
                    <div className="flex flex-wrap gap-2">
                        {items.filter(Boolean).map((item, i) => {
                            const label = typeof item === 'object' ? (item.label || item.value) : String(item);
                            return (
                                <span key={i} className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-100">
                                    {label}
                                </span>
                            );
                        })}
                    </div>
                );
            } catch { /* fallback */ }
        }
        return (
            <div className="inline-flex items-center gap-3 px-6 py-3 bg-white border-2 border-indigo-600 text-indigo-600 rounded-2xl shadow-sm">
                <div className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
                <span className="text-sm font-black uppercase tracking-widest">{String(value)}</span>
            </div>
        );
    }

    default:
      return <SimpleValue text={String(value)} />;
  }
}

function SimpleValue({ text }) {
  return (
    <div className="p-5 bg-white border-2 border-slate-100 rounded-2xl shadow-sm hover:border-slate-200 transition-colors group">
      <div className="flex items-start gap-4">
        <div className="mt-1 w-2 h-2 rounded-full bg-indigo-500 group-hover:scale-125 transition-transform" />
        <p className="text-sm font-bold text-slate-800 leading-relaxed font-sans">{text}</p>
      </div>
    </div>
  );
}
