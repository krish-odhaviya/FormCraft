"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api/formService";
import { useForms } from "@/context/FormsContext";
import { 
  ArrowLeft, 
  FilePlus, 
  Loader2, 
  AlertCircle 
} from "lucide-react";

export default function NewFormPage() {
  const router = useRouter();
  const { addForm, addVersionToForm } = useForms();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!name.trim()) {
      setError("Please provide a name for your form.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const formResponse = await api.createForm(name.trim(), description.trim() || null);

      const form = formResponse.data;
      addForm(form);

      const versionResponse = await api.createDraftVersion(form.id);
      const version = versionResponse.data;
      addVersionToForm(form.id, { ...version, fields: [] });

      router.push(`/forms/${form.id}/builder`);
    } catch (err) {
      setError(err.message || "Failed to create form. Please try again.");
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
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Form Name Input */}
          <div className="space-y-2">
            <label htmlFor="form-name" className="block text-sm font-semibold text-slate-700">
              Form Name <span className="text-red-500">*</span>
            </label>
            <input
              id="form-name"
              type="text"
              placeholder="e.g., Customer Feedback Survey"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError(""); // Clear error when user types
              }}
              maxLength={150}
              autoFocus
              disabled={loading}
            />
          </div>

          {/* Form Description Input */}
          <div className="space-y-2">
            <label htmlFor="form-desc" className="block text-sm font-semibold text-slate-700">
              Description <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <textarea
              id="form-desc"
              placeholder="Briefly describe what this form is for..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400 resize-none"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
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