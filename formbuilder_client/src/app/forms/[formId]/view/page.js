"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api/formService";
import { Loader2, Send, CheckCircle2, AlertCircle, ChevronDown } from "lucide-react";

export default function DynamicFormPage() {
  const { formId } = useParams();

  const [fields, setFields] = useState([]);
  const [formDetails, setFormDetails] = useState({});
  const [formValues, setFormValues] = useState({});
  const [publishedVersionId, setPublishedVersionId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function fetchFields() {
      try {
        const res = await api.getForm(formId);
        setFormDetails(res.data);

        // 1. FIX: Find the PUBLISHED version specifically
        const publishedVersion = res.data.versions?.find((v) => v.status === "PUBLISHED");
        
        if (!publishedVersion) {
          setMessage("not_published");
          setLoading(false);
          return;
        }

        setPublishedVersionId(publishedVersion.id);
        const fieldsData = publishedVersion.fields || [];
        setFields(fieldsData);

        // Initialize values based on field type
        const initialValues = {};
        fieldsData.forEach((field) => {
          if (field.fieldType === "BOOLEAN") {
            initialValues[field.fieldKey] = false;
          } else if (field.fieldType === "CHECKBOX_GROUP") {
            initialValues[field.fieldKey] = []; // Checkbox groups need arrays
          } else {
            initialValues[field.fieldKey] = "";
          }
        });

        setFormValues(initialValues);
      } catch (err) {
        console.error(err);
        setMessage("error");
      } finally {
        setLoading(false);
      }
    }

    if (formId) fetchFields();
  }, [formId]);

  const handleChange = (key, value) => {
    setFormValues((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage("");

    try {
      const res = await fetch("http://localhost:9090/api/forms/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          versionId: publishedVersionId, // 2. FIX: Send the published version ID, not the form ID
          values: formValues,
        }),
      });

      console.log(formValues)

      if (!res.ok) throw new Error("Submission failed");

      setMessage("success");
    } catch (err) {
      setMessage("error");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-indigo-600">
          <Loader2 className="animate-spin" size={40} />
          <p className="text-sm font-medium text-slate-500">Loading form...</p>
        </div>
      </div>
    );
  }

  if (message === "not_published") {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <AlertCircle size={48} className="text-amber-500 mb-4" />
        <h2 className="text-xl font-bold text-slate-800 mb-2">Form Not Available</h2>
        <p className="text-slate-500">This form is currently a draft and is not yet published to receive submissions.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 py-12 px-4 sm:px-6 flex justify-center">
      <div className="w-full max-w-3xl space-y-6">
        
        {/* Form Header Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 border-t-4 border-t-indigo-600 p-8 sm:p-10">
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
            {formDetails.name || "Untitled Form"}
          </h1>
          {formDetails.description && (
            <p className="text-slate-600 mt-3 leading-relaxed">
              {formDetails.description}
            </p>
          )}
        </div>

        {/* Form Body Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 sm:p-10">
          
          {/* Status Messages */}
          {message === "success" && (
            <div className="mb-8 flex items-start gap-3 bg-green-50 border border-green-200 text-green-800 px-5 py-4 rounded-xl text-sm">
              <CheckCircle2 size={20} className="text-green-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-semibold text-green-900 mb-1">Success!</strong>
                Your response has been successfully recorded. Thank you.
              </div>
            </div>
          )}

          {message === "error" && (
            <div className="mb-8 flex items-start gap-3 bg-red-50 border border-red-200 text-red-800 px-5 py-4 rounded-xl text-sm">
              <AlertCircle size={20} className="text-red-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-semibold text-red-900 mb-1">Submission Failed</strong>
                Something went wrong while submitting your form. Please try again.
              </div>
            </div>
          )}

          {fields.length === 0 && message !== "success" ? (
             <div className="text-center py-10">
               <p className="text-slate-500">This form is currently empty.</p>
             </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-8">
              
              {/* Fields Rendering */}
              <div className="space-y-8">
                {fields.map((field) => (
                  <div key={field.fieldKey}>
                    {renderInput(field, formValues, handleChange)}
                  </div>
                ))}
              </div>

              {/* Submit Actions */}
              <div className="pt-6 mt-8 border-t border-slate-100 flex justify-end">
                <button
                  type="submit"
                  disabled={submitting || message === "success"}
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed text-white px-8 py-3 rounded-xl text-sm font-medium shadow-sm hover:shadow transition-all"
                >
                  {submitting ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <Send size={18} />
                  )}
                  {submitting ? "Submitting..." : "Submit Form"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------
// Render Input Helper Function
// ------------------------------------------------------------------
function renderInput(field, values, handleChange) {
  const type = field.fieldType?.toLowerCase();
  const value = values[field.fieldKey];

  const uiConfig = field.uiConfig || {};
  const validation = field.validation || {};
  const options = field.options || [];

  const placeholder = uiConfig.placeholder || `Enter ${field.fieldLabel?.toLowerCase()}...`;
  const helpText = uiConfig.helpText;

  const inputClass =
    "w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400";
  
  const FieldLabel = () => (
    <div className="mb-2">
      <label className="block text-sm font-semibold text-slate-800">
        {field.fieldLabel}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {helpText && <p className="text-xs text-slate-500 mt-1 leading-relaxed">{helpText}</p>}
    </div>
  );

  switch (type) {
    case "text":
    case "email":
      return (
        <div>
          <FieldLabel />
          <input
            type={type === "email" ? "email" : "text"}
            required={field.required}
            className={inputClass}
            placeholder={placeholder}
            value={value || ""}
            onChange={(e) => handleChange(field.fieldKey, e.target.value)}
            minLength={validation.minLength}
            maxLength={validation.maxLength}
            pattern={validation.pattern}
            title={validation.validationMessage || (validation.pattern ? "Format is invalid." : "")}
          />
        </div>
      );

    case "textarea":
      return (
        <div>
          <FieldLabel />
          <textarea
            required={field.required}
            className={`${inputClass} resize-y min-h-[100px]`}
            rows={4}
            placeholder={placeholder}
            value={value || ""}
            onChange={(e) => handleChange(field.fieldKey, e.target.value)}
            minLength={validation.minLength}
            maxLength={validation.maxLength}
          />
        </div>
      );

    case "integer":
      return (
        <div>
          <FieldLabel />
          <input
            type="number"
            required={field.required}
            className={inputClass}
            placeholder={placeholder}
            value={value || ""}
            onChange={(e) => handleChange(field.fieldKey, e.target.value)}
            min={validation.min}
            max={validation.max}
          />
        </div>
      );

    case "date":
    case "time":
      return (
        <div>
          <FieldLabel />
          <input
            type={type}
            required={field.required}
            className={`${inputClass} cursor-pointer`}
            value={value || ""}
            onChange={(e) => handleChange(field.fieldKey, e.target.value)}
          />
        </div>
      );

    case "radio":
      return (
        <div>
          <FieldLabel />
          <div className="space-y-3 mt-3">
            {options.map((opt, idx) => (
              <label key={idx} className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="radio"
                  name={field.fieldKey}
                  value={opt}
                  required={field.required}
                  checked={value === opt}
                  onChange={(e) => handleChange(field.fieldKey, e.target.value)}
                  className="w-4 h-4 text-indigo-600 border-slate-300 focus:ring-indigo-500"
                />
                <span className="text-sm text-slate-700 group-hover:text-slate-900 transition-colors">{opt}</span>
              </label>
            ))}
          </div>
        </div>
      );

    case "checkbox_group":
      const currentSelections = Array.isArray(value) ? value : [];
      
      const handleCheckboxToggle = (opt, isChecked) => {
        let newSelections;
        if (isChecked) {
          newSelections = [...currentSelections, opt];
        } else {
          newSelections = currentSelections.filter((item) => item !== opt);
        }
        handleChange(field.fieldKey, newSelections);
      };

      return (
        <div>
          <FieldLabel />
          <div className="space-y-3 mt-3">
            {options.map((opt, idx) => (
              <label key={idx} className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  value={opt}
                  checked={currentSelections.includes(opt)}
                  onChange={(e) => handleCheckboxToggle(opt, e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500"
                />
                <span className="text-sm text-slate-700 group-hover:text-slate-900 transition-colors">{opt}</span>
              </label>
            ))}
          </div>
          {field.required && currentSelections.length === 0 && (
            <input type="checkbox" required className="opacity-0 absolute w-0 h-0" />
          )}
        </div>
      );

    case "dropdown":
      return (
        <div>
          <FieldLabel />
          <div className="relative">
            <select
              required={field.required}
              className={`${inputClass} appearance-none cursor-pointer`}
              value={value || ""}
              onChange={(e) => handleChange(field.fieldKey, e.target.value)}
            >
              <option value="" disabled>Select an option...</option>
              {options.map((opt, idx) => (
                <option key={idx} value={opt}>{opt}</option>
              ))}
            </select>
            <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </div>
      );

    case "boolean":
      return (
        <div className="flex items-start gap-3 p-4 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors bg-white">
          <div className="flex items-center h-6">
            <input
              type="checkbox"
              id={field.fieldKey}
              required={field.required}
              checked={value || false}
              onChange={(e) => handleChange(field.fieldKey, e.target.checked)}
              className="h-5 w-5 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 transition-all cursor-pointer"
            />
          </div>
          <div className="flex flex-col">
            <label htmlFor={field.fieldKey} className="text-sm font-semibold text-slate-800 cursor-pointer select-none">
              {field.fieldLabel}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {helpText && <p className="text-xs text-slate-500 mt-1">{helpText}</p>}
          </div>
        </div>
      );

    default:
      return (
        <div>
          <FieldLabel />
          <input
            type="text"
            required={field.required}
            className={inputClass}
            placeholder="Enter value..."
            value={value || ""}
            onChange={(e) => handleChange(field.fieldKey, e.target.value)}
          />
        </div>
      );
  }
}