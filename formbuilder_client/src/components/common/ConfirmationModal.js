"use client";

import React, { useEffect } from "react";
import { AlertTriangle, Info, AlertCircle, X, Loader2 } from "lucide-react";

/**
 * A beautiful, reusable custom confirmation modal to replace window.confirm()
 * Features: Responsive, Backdrop blur, Keyboard support (ESC), Loading state.
 */
export default function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirm Action",
  message = "Are you sure you want to proceed?",
  confirmText = "Confirm",
  cancelText = "Cancel",
  type = "warning", // danger, warning, info
  loading = false
}) {
  // Close on ESC key
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape" && isOpen) onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [isOpen, onClose]);

  // Prevent background scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const colorConfig = {
    danger: {
      icon: <AlertCircle className="text-red-500" size={24} />,
      bg: "bg-red-50",
      button: "bg-red-600 hover:bg-red-700 focus:ring-red-500/20",
      border: "border-red-100"
    },
    warning: {
      icon: <AlertTriangle className="text-amber-500" size={24} />,
      bg: "bg-amber-50",
      button: "bg-amber-600 hover:bg-amber-700 focus:ring-amber-500/20",
      border: "border-amber-100"
    },
    info: {
      icon: <Info className="text-indigo-500" size={24} />,
      bg: "bg-indigo-50",
      button: "bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500/20",
      border: "border-indigo-100"
    }
  };

  const config = colorConfig[type] || colorConfig.info;

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-[2px] transition-opacity duration-300"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden transform transition-all scale-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Icon */}
        <div className="p-6 pb-0 flex gap-5">
          <div className={`p-4 h-14 w-14 rounded-2xl flex items-center justify-center ${config.bg} ${config.border} border shadow-sm`}>
            {config.icon}
          </div>
          <div className="flex-1">
            <div className="flex justify-between items-start pt-1">
              <h3 className="text-xl font-extrabold text-slate-900 tracking-tight leading-none">{title}</h3>
              <button 
                onClick={onClose}
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-xl transition-all"
                title="Close"
              >
                <X size={20} />
              </button>
            </div>
            <p className="mt-3 text-slate-500 leading-relaxed font-medium">
              {message}
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-6 bg-slate-50/50 mt-8 border-t border-slate-100 flex items-center justify-end gap-3">
          <button 
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-6 py-3 text-sm font-bold text-slate-600 hover:text-slate-900 transition-all disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button 
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`min-w-32 flex items-center justify-center gap-2 px-8 py-3 text-sm font-bold text-white shadow-xl rounded-2xl transition-all focus:outline-none focus:ring-4 active:scale-95 disabled:opacity-50 ${config.button}`}
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : null}
            {loading ? "Please wait..." : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
