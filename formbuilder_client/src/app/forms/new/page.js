"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api/formService";
import { useForms } from "@/context/FormsContext";
import { useAuth } from "@/context/AuthContext";
import { 
  ArrowLeft, 
  FilePlus, 
  Loader2, 
  AlertCircle,
  ShieldAlert,
  Info
} from "lucide-react";

/**
 * SRS §3.2 / §4.4 Form Metadata View (Create)
 * - name: display name (any text, shown in UI)
 * - code: stable, URL-safe slug (lowercase + underscores, immutable after save)
 * - description: optional free text
 */
export default function NewFormPage() {
  const router = useRouter();
  const { addForm } = useForms();
  const { user, hasModule } = useAuth();
  
  const [name, setName]               = useState("");
  const [code, setCode]               = useState("");
  const [codeManuallyEdited, setCodeManuallyEdited] = useState(false);
  const [description, setDescription] = useState("");
  const [error, setError]             = useState("");
  const [loading, setLoading]         = useState(false);

  // Permission Check — uses hasModule which reads from the DB-assigned menu
  const isAdmin = user?.customRole === "SYSTEM_ADMIN" || user?.roles?.includes("ROLE_SYSTEM_ADMIN");
  const canCreate = isAdmin || hasModule("Create New Form");

  if (!canCreate) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-50 px-6 text-center">
        <div className="w-24 h-24 bg-red-100/50 rounded-full flex items-center justify-center mb-6 shadow-sm border border-red-100">
          <ShieldAlert size={48} className="text-red-500" />
        </div>
        <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-3">Access Denied</h2>
        <p className="text-slate-500 max-w-md mb-10 text-lg leading-relaxed">
          You do not have permission to create new forms. Please contact your administrator if you believe this is an error.
        </p>
        <Link href="/" className="px-6 py-3 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 hover:shadow-sm transition-all">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  // Derive code from name if the user hasn't manually edited it
  const deriveCode = (nameVal) => {
    return nameVal
      .toLowerCase()
      .replace(/[\s\-]/g, "_")        // spaces and hyphens → underscore
      .replace(/[^a-z0-9_]/g, "")    // remove other chars
      .replace(/^[^a-z]+/, "")        // strip leading non-letter chars
      .substring(0, 100);
  };

  const handleNameChange = (e) => {
    const val = e.target.value;
    setName(val);
    if (!codeManuallyEdited) {
      setCode(deriveCode(val));
    }
    if (error) setError("");
  };

  const handleCodeChange = (e) => {
    const val = e.target.value
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, "");
    setCode(val);
    setCodeManuallyEdited(true);
    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate name
    if (!name.trim()) {
      setError("Form name is required.");
      return;
    }
    if (name.trim().length > 255) {
      setError("Form name cannot exceed 255 characters.");
      return;
    }

    // Validate code (SRS §4.1: code must be 3-100 chars, lowercase, alphanumeric+underscore)
    if (!code.trim()) {
      setError("Form code is required.");
      return;
    }
    if (!/^[a-z][a-z0-9_]{2,99}$/.test(code.trim())) {
      setError("Form code must be 3–100 characters, start with a letter, and use only lowercase letters, numbers, or underscores.");
      return;
    }
    if (description.length > 1000) {
      setError("Description cannot exceed 1000 characters.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const formResponse = await api.createForm(name.trim(), code.trim(), description.trim() || null);

      const form = formResponse.data;
      addForm(form);

      router.push(`/forms/${form.id}/builder`);
    } catch (err) {
      console.error(err);
      if (err.response?.status === 403) {
        setError("Access denied: your role does not have permission to create forms.");
      } else if (err.response?.data?.errors) {
        const msgs = err.response.data.errors.map(e => `${e.field}: ${e.message}`).join("\n");
        setError(`Validation Error:\n${msgs}`);
      } else {
        setError(err.response?.data?.message || err.message || "Failed to create form. Please try again.");
      }
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col items-center pt-12 px-4 sm:px-6 lg:px-8">
      {/* Back Navigation */}
      <div className="w-full max-w-xl mb-6">
        <Link 
          href="/" 
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft size={16} />
          Back to Dashboard
        </Link>
      </div>

      {/* Main Form Card */}
      <div className="w-full max-w-xl bg-white p-8 rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/40">
        
        {/* Header */}
        <div className="flex items-center gap-3 mb-8 pb-6 border-b border-slate-100">
          <div className="bg-indigo-50 p-2.5 rounded-lg text-indigo-600">
            <FilePlus size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Create New Form</h1>
            <p className="text-sm text-slate-500 mt-1">Start completely fresh with a blank canvas.</p>
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mb-6 flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            <AlertCircle size={18} className="text-red-600 mt-0.5 shrink-0" />
            <p style={{ whiteSpace: "pre-line" }}>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Form Name Input (display name, free text) */}
          <div className="space-y-2">
            <label htmlFor="form-name" className="block text-sm font-semibold text-slate-700">
              Form Name <span className="text-red-500">*</span>
            </label>
            <input
              id="form-name"
              type="text"
              placeholder="e.g., Employee Onboarding Survey"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400"
              value={name}
              onChange={handleNameChange}
              maxLength={255}
              autoFocus
              disabled={loading}
            />
            <p className="text-xs text-slate-400">The display name shown to users in the UI.</p>
          </div>

          {/* Form Code Input (slug, immutable once saved) */}
          <div className="space-y-2">
            <label htmlFor="form-code" className="block text-sm font-semibold text-slate-700">
              Form Code <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                id="form-code"
                type="text"
                placeholder="e.g., employee_onboarding"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400 font-mono"
                value={code}
                onChange={handleCodeChange}
                maxLength={100}
                disabled={loading}
              />
            </div>
            {/* Immutability notice */}
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              <Info size={14} className="text-amber-600 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-700">
                <strong>Immutable after creation.</strong> This code is used in form URLs (e.g.{" "}
                <code className="bg-amber-100 px-1 rounded">/f/{code || "employee_onboarding"}</code>
                ) and as the database table name. Choose carefully — it cannot be changed once saved.
              </p>
            </div>
          </div>

          {/* Form Description Input */}
          <div className="space-y-2">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <label htmlFor="form-desc" className="block text-sm font-semibold text-slate-700">
                Description <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <span style={{ fontSize: 11, color: description.length > 1000 ? "#ef4444" : "#94a3b8" }}>
                {description.length}/1000
              </span>
            </div>
            <textarea
              id="form-desc"
              placeholder="Briefly describe what this form is for..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400 resize-none"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={1000}
              disabled={loading}
            />
          </div>

          {/* Actions Footer */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 mt-8">
            <Link 
              href="/"
              className="px-5 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-lg text-sm font-medium shadow-sm hover:shadow transition-all"
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              {loading ? "Creating..." : "Create Form"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}