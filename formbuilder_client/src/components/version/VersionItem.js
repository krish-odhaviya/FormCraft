import { CheckCircle2, Clock, Calendar, User, Eye, History } from "lucide-react";
import Link from "next/link";

export function VersionItem({ version, formId, isActivateLoading, onActivateClick }) {
  // Gracefully handle date display (Spring might send ISO strings or arrays)
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
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-5 border border-slate-200 bg-white hover:bg-slate-50 transition-colors rounded-2xl group shadow-sm mb-4">
      <div className="flex gap-4 items-start pb-4 sm:pb-0">
        <div className={`mt-1 flex items-center justify-center w-12 h-12 rounded-[16px] border ${
          version.isActive
            ? "bg-emerald-50 border-emerald-200 text-emerald-600 shadow-sm"
            : "bg-slate-50 border-slate-200 text-slate-400"
        }`}>
          {version.isActive ? <CheckCircle2 size={24} /> : <History size={22} />}
        </div>
        
        <div>
          <div className="flex items-center gap-3">
            <h3 className="text-xl font-black text-slate-900 tracking-tight">Version {version.versionNumber}</h3>
            {version.isActive && (
              <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-700 border border-emerald-200/50 rounded-md">
                Active Live
              </span>
            )}
            {version.isDraftWorkingCopy && (
              <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-indigo-100 text-indigo-700 border border-indigo-200/50 rounded-md animate-pulse">
                DRAFT WORKING COPY
              </span>
            )}
            {!version.isActive && !version.isDraftWorkingCopy && (
              <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-500 border border-slate-200/50 rounded-md">
                Inactive
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-500 mt-2 font-medium">
            <span className="flex items-center gap-1.5"><Calendar size={14} className="text-slate-400" /> {dateStr}</span>
            <span className="flex items-center gap-1.5"><User size={14} className="text-slate-400" /> {version.createdBy || "System"}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 w-full sm:w-auto">
        {!version.isActive && (
          <button
            onClick={() => onActivateClick(version)}
            disabled={isActivateLoading}
            className="flex-1 sm:flex-none border border-slate-200 bg-white text-slate-700 hover:text-blue-700 hover:border-blue-200 hover:bg-blue-50 px-4 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm active:scale-95 disabled:opacity-50"
          >
            Activate
          </button>
        )}
        <Link 
          href={`/forms/${formId}/versions/${version.id}`} 
          className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-indigo-50 text-indigo-700 border border-indigo-100/50 hover:bg-indigo-100 px-4 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm active:scale-95"
        >
          <Eye size={16} /> <span className="hidden sm:inline">Details</span>
        </Link>
      </div>
    </div>
  );
}
