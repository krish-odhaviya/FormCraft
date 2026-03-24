import { X, AlertCircle } from "lucide-react";
import { useState } from "react";

export function ActivateDialog({ isOpen, onClose, onConfirm, versionNumber, isActivating, isDraftWorkingCopy }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-white rounded-[24px] shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-6 sm:p-8 flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mb-6 border border-blue-100 shadow-sm">
            <AlertCircle size={32} />
          </div>
          
          <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-3">
            Activate Version v{versionNumber}?
          </h2>
          
          {isDraftWorkingCopy && (
            <div className="mb-6 bg-red-50 border border-red-100 p-4 rounded-2xl flex items-start gap-3 text-left">
              <AlertCircle size={20} className="text-red-500 shrink-0 mt-0.5" />
              <p className="text-xs text-red-800 font-bold leading-relaxed">
                WARNING: This is the DRAFT working copy. Activating it will permanently delete all temporary DRAFT submissions to prevent data corruption.
              </p>
            </div>
          )}

          <p className="text-slate-500 text-[15px] leading-relaxed mb-8">
            This will immediately make Version {versionNumber} the live active form for all new respondents. The current live version will safely be marked inactive.
          </p>
          
          <div className="flex w-full gap-3">
            <button
              onClick={onClose}
              disabled={isActivating}
              className="flex-1 px-5 py-3.5 bg-slate-50 text-slate-700 font-bold rounded-xl hover:bg-slate-100 hover:text-slate-900 transition-colors border border-slate-200 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={isActivating}
              className="flex-1 px-5 py-3.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 hover:shadow-lg shadow-md shadow-blue-200 transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
            >
              {isActivating ? "Activating..." : "Yes, Activate"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
