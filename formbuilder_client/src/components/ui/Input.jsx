"use client";

import { forwardRef } from "react";

export const Input = forwardRef(function Input(
  { label, error, hint, required, className = "", ...props },
  ref
) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-sm font-medium text-slate-700">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      <input
        ref={ref}
        className={`
          w-full rounded-lg border px-3 py-2 text-sm text-slate-900
          placeholder:text-slate-400 bg-white
          transition-colors duration-150
          focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
          disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed
          ${error ? "border-red-400 focus:ring-red-400" : "border-slate-300 hover:border-slate-400"}
          ${className}
        `}
        {...props}
      />
      {hint && !error && (
        <p className="text-xs text-slate-500">{hint}</p>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
});

export const Textarea = forwardRef(function Textarea(
  { label, error, hint, required, className = "", ...props },
  ref
) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-sm font-medium text-slate-700">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      <textarea
        ref={ref}
        className={`
          w-full rounded-lg border px-3 py-2 text-sm text-slate-900
          placeholder:text-slate-400 bg-white resize-y min-h-20
          transition-colors duration-150
          focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
          disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed
          ${error ? "border-red-400 focus:ring-red-400" : "border-slate-300 hover:border-slate-400"}
          ${className}
        `}
        {...props}
      />
      {hint && !error && <p className="text-xs text-slate-500">{hint}</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
});

export const Select = forwardRef(function Select(
  { label, error, hint, required, className = "", children, ...props },
  ref
) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-sm font-medium text-slate-700">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      <select
        ref={ref}
        className={`
          w-full rounded-lg border px-3 py-2 text-sm text-slate-900 bg-white
          transition-colors duration-150 cursor-pointer
          focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
          disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed
          ${error ? "border-red-400 focus:ring-red-400" : "border-slate-300 hover:border-slate-400"}
          ${className}
        `}
        {...props}
      >
        {children}
      </select>
      {hint && !error && <p className="text-xs text-slate-500">{hint}</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
});

export const Toggle = forwardRef(function Toggle(
  { label, checked, onChange, disabled = false, ...props },
  ref
) {
  return (
    <label className="inline-flex items-center gap-3 cursor-pointer">
      <div className="relative">
        <input
          ref={ref}
          type="checkbox"
          className="sr-only"
          checked={checked}
          onChange={onChange}
          disabled={disabled}
          {...props}
        />
        <div
          className={`w-10 h-5 rounded-full transition-colors duration-200 ${
            checked ? "bg-indigo-600" : "bg-slate-300"
          } ${disabled ? "opacity-50" : ""}`}
        />
        <div
          className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </div>
      {label && (
        <span className="text-sm font-medium text-slate-700">{label}</span>
      )}
    </label>
  );
});
