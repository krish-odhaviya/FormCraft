"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api/formService";
import { Loader2, Send, CheckCircle2, AlertCircle, ChevronDown, Star, Upload, SlidersHorizontal } from "lucide-react";

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
            initialValues[field.fieldKey] = [];
          } else if (field.fieldType === "MC_GRID") {
            // MC Grid: { "Row 1": "", "Row 2": "" }
            const rows = field.validation?.rows || field.gridRows || [];
            const init = {};
            rows.forEach((r) => (init[r] = ""));
            initialValues[field.fieldKey] = init;
          } else if (field.fieldType === "TICK_BOX_GRID") {
            // Tick Box Grid: { "Row 1": [], "Row 2": [] }
            const rows = field.validation?.rows || field.gridRows || [];
            const init = {};
            rows.forEach((r) => (init[r] = []));
            initialValues[field.fieldKey] = init;
          } else if (field.fieldType === "STAR_RATING") {
            initialValues[field.fieldKey] = 0;
          } else if (field.fieldType === "LINEAR_SCALE") {
            initialValues[field.fieldKey] = "";
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
    setFormValues((prev) => ({ ...prev, [key]: value }));
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
          versionId: publishedVersionId,
          values: formValues,
        }),
      });

      console.log(formValues);

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
            <p className="text-slate-600 mt-3 leading-relaxed">{formDetails.description}</p>
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
              <div className="space-y-8">
                {fields.map((field) => (
                  <div key={field.fieldKey}>
                    {renderInput(field, formValues, handleChange)}
                  </div>
                ))}
              </div>

              <div className="pt-6 mt-8 border-t border-slate-100 flex justify-end">
                <button
                  type="submit"
                  disabled={submitting || message === "success"}
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed text-white px-8 py-3 rounded-xl text-sm font-medium shadow-sm hover:shadow transition-all"
                >
                  {submitting ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
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

// ─────────────────────────────────────────────────────────────────────────────
// Render Input Helper
// ─────────────────────────────────────────────────────────────────────────────
function renderInput(field, values, handleChange) {
  const type = field.fieldType?.toUpperCase();
  const value = values[field.fieldKey];
  const uiConfig = field.uiConfig || {};
  const validation = field.validation || {};
  const options = field.options || [];

  const placeholder = uiConfig.placeholder || `Enter ${field.fieldLabel?.toLowerCase()}...`;
  const helpText = uiConfig.helpText;

  const inputClass =
    "w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400";

  const FieldLabel = () => (
    <div className="mb-3">
      <label className="block text-sm font-semibold text-slate-800">
        {field.fieldLabel}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {helpText && <p className="text-xs text-slate-500 mt-1 leading-relaxed">{helpText}</p>}
    </div>
  );

  switch (type) {

    // ── Text / Email ──────────────────────────────────────────────────────────
    case "TEXT":
    case "EMAIL":
      return (
        <div>
          <FieldLabel />
          <input
            type={type === "EMAIL" ? "email" : "text"}
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

    // ── Textarea ──────────────────────────────────────────────────────────────
    case "TEXTAREA":
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

    // ── Integer ───────────────────────────────────────────────────────────────
    case "INTEGER":
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

    // ── Date / Time ───────────────────────────────────────────────────────────
    case "DATE":
    case "TIME":
      return (
        <div>
          <FieldLabel />
          <input
            type={type.toLowerCase()}
            required={field.required}
            className={`${inputClass} cursor-pointer`}
            value={value || ""}
            onChange={(e) => handleChange(field.fieldKey, e.target.value)}
          />
        </div>
      );

    // ── Radio ─────────────────────────────────────────────────────────────────
    case "RADIO":
      return (
        <div>
          <FieldLabel />
          <div className="space-y-3">
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

    // ── Checkbox Group ────────────────────────────────────────────────────────
    case "CHECKBOX_GROUP": {
      const currentSelections = Array.isArray(value) ? value : [];
      const handleCheckboxToggle = (opt, isChecked) => {
        handleChange(
          field.fieldKey,
          isChecked
            ? [...currentSelections, opt]
            : currentSelections.filter((item) => item !== opt)
        );
      };
      return (
        <div>
          <FieldLabel />
          <div className="space-y-3">
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
    }

    // ── Dropdown ──────────────────────────────────────────────────────────────
    case "DROPDOWN":
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

    // ── Boolean ───────────────────────────────────────────────────────────────
    case "BOOLEAN":
      return (
        <div className="flex items-start gap-3 p-4 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors bg-white">
          <div className="flex items-center h-6">
            <input
              type="checkbox"
              id={field.fieldKey}
              required={field.required}
              checked={value || false}
              onChange={(e) => handleChange(field.fieldKey, e.target.checked)}
              className="h-5 w-5 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer"
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

    // ── Star Rating ───────────────────────────────────────────────────────────
    case "STAR_RATING": {
      const maxStars = uiConfig.maxStars || 5;
      const starValue = value || 0;
      return (
        <div>
          <FieldLabel />
          <div className="flex gap-2">
            {Array.from({ length: maxStars }).map((_, i) => {
              const starNumber = i + 1;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleChange(field.fieldKey, starNumber)}
                  className="focus:outline-none transition-transform hover:scale-110 active:scale-95"
                  aria-label={`${starNumber} star${starNumber > 1 ? "s" : ""}`}
                >
                  <Star
                    size={32}
                    className={
                      starNumber <= starValue
                        ? "text-amber-400 fill-amber-400"
                        : "text-slate-300 fill-slate-100"
                    }
                  />
                </button>
              );
            })}
          </div>
          {field.required && starValue === 0 && (
            <input type="number" required min={1} value={starValue || ""} onChange={() => { }} className="opacity-0 absolute w-0 h-0" />
          )}
          {starValue > 0 && (
            <p className="text-xs text-slate-500 mt-2">{starValue} / {maxStars} star{starValue > 1 ? "s" : ""}</p>
          )}
        </div>
      );
    }

    // ── Linear Scale ──────────────────────────────────────────────────────────
    case "LINEAR_SCALE": {
      const scaleMin = uiConfig.scaleMin ?? 1;
      const scaleMax = uiConfig.scaleMax ?? 5;
      const lowLabel = uiConfig.lowLabel || "";
      const highLabel = uiConfig.highLabel || "";
      const steps = Array.from({ length: scaleMax - scaleMin + 1 }, (_, i) => scaleMin + i);
      return (
        <div>
          <FieldLabel />
          <div className="space-y-3">
            <div className="flex gap-3 flex-wrap">
              {steps.map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => handleChange(field.fieldKey, val)}
                  className={`w-10 h-10 rounded-full border-2 text-sm font-semibold transition-all focus:outline-none hover:border-indigo-400 ${value === val
                      ? "bg-indigo-600 border-indigo-600 text-white shadow-md"
                      : "bg-white border-slate-300 text-slate-600 hover:bg-indigo-50"
                    }`}
                >
                  {val}
                </button>
              ))}
            </div>
            {(lowLabel || highLabel) && (
              <div className="flex justify-between text-xs text-slate-500 px-1">
                <span>{lowLabel}</span>
                <span>{highLabel}</span>
              </div>
            )}
          </div>
          {field.required && value === "" && (
            <input type="number" required min={scaleMin} value={value || ""} onChange={() => { }} className="opacity-0 absolute w-0 h-0" />
          )}
        </div>
      );
    }

    // ── File Upload ───────────────────────────────────────────────────────────
    case "FILE_UPLOAD": {
      const acceptedTypes = uiConfig.acceptedFileTypes || [];
      const maxSizeMb = uiConfig.maxFileSizeMb || 5;
      const maxSizeBytes = maxSizeMb * 1024 * 1024;
      const uploadedUrl = value || null; // value now holds the full URL after upload

      const handleFileChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > maxSizeBytes) {
          alert(`File too large. Max size is ${maxSizeMb}MB.`);
          e.target.value = "";
          return;
        }

        // Show uploading state
        handleChange(field.fieldKey, "__uploading__");

        try {
          const formData = new FormData();
          formData.append("file", file);

          const res = await fetch("http://localhost:9090/api/forms/upload", {
            method: "POST",
            body: formData,
          });

          if (!res.ok) throw new Error("Upload failed");

          const data = await res.json();
          // Store the full URL in form values
          handleChange(field.fieldKey, data.url);
        } catch (err) {
          console.error(err);
          alert("File upload failed. Please try again.");
          handleChange(field.fieldKey, "");
          e.target.value = "";
        }
      };

      const isUploading = value === "__uploading__";
      const isUploaded = value && value !== "__uploading__";

      return (
        <div>
          <FieldLabel />
          <label className={`flex flex-col items-center justify-center w-full border-2 border-dashed rounded-xl p-8 transition-all group
        ${isUploaded
              ? "border-green-400 bg-green-50 cursor-default"
              : "border-slate-300 hover:border-indigo-400 hover:bg-indigo-50/30 cursor-pointer"
            }`}>
            {isUploading ? (
              <>
                <Loader2 size={28} className="text-indigo-500 animate-spin mb-3" />
                <p className="text-sm font-medium text-indigo-600">Uploading...</p>
              </>
            ) : isUploaded ? (
              <>
                <CheckCircle2 size={28} className="text-green-500 mb-3" />
                <p className="text-sm font-medium text-green-700">File uploaded successfully</p>
                <p className="text-xs text-green-600 mt-1 truncate max-w-xs">
                  {value.split("/").pop()}
                </p>
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); handleChange(field.fieldKey, ""); }}
                  className="mt-3 text-xs text-red-500 hover:text-red-700 underline"
                >
                  Remove & re-upload
                </button>
              </>
            ) : (
              <>
                <Upload size={28} className="text-slate-400 group-hover:text-indigo-500 mb-3 transition-colors" />
                <p className="text-sm font-medium text-slate-600 group-hover:text-indigo-600 transition-colors">
                  Click to upload or drag &amp; drop
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  {acceptedTypes.length > 0 ? acceptedTypes.join(", ") : "Any file type"} · Max {maxSizeMb}MB
                </p>
              </>
            )}
            {!isUploaded && !isUploading && (
              <input
                type="file"
                required={field.required}
                accept={acceptedTypes.join(",")}
                onChange={handleFileChange}
                className="hidden"
              />
            )}
          </label>
        </div>
      );
    }

    // ── Multiple Choice Grid ──────────────────────────────────────────────────
    case "MC_GRID": {
      const rows = field.validation?.rows || field.gridRows || ["Row 1"];
      const columns = field.validation?.columns || field.gridColumns || ["Col 1"];
      const gridVal = value || {};
      return (
        <div>
          <FieldLabel />
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="p-3 text-left text-xs font-semibold text-slate-500 w-32"></th>
                  {columns.map((col, i) => (
                    <th key={i} className="p-3 text-center text-xs font-semibold text-slate-600">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, ri) => (
                  <tr key={ri} className={`border-b border-slate-100 last:border-0 ${ri % 2 === 0 ? "" : "bg-slate-50/50"}`}>
                    <td className="p-3 text-sm font-medium text-slate-700">{row}</td>
                    {columns.map((col, ci) => (
                      <td key={ci} className="p-3 text-center">
                        <input
                          type="radio"
                          name={`${field.fieldKey}_${row}`}
                          value={col}
                          required={field.required}
                          checked={gridVal[row] === col}
                          onChange={() => {
                            handleChange(field.fieldKey, { ...gridVal, [row]: col });
                          }}
                          className="w-4 h-4 text-indigo-600 border-slate-300 focus:ring-indigo-500 cursor-pointer"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    // ── Tick Box Grid ─────────────────────────────────────────────────────────
    case "TICK_BOX_GRID": {
      const rows = field.validation?.rows || field.gridRows || ["Row 1"];
      const columns = field.validation?.columns || field.gridColumns || ["Col 1"];
      const gridVal = value || {};
      return (
        <div>
          <FieldLabel />
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="p-3 text-left text-xs font-semibold text-slate-500 w-32"></th>
                  {columns.map((col, i) => (
                    <th key={i} className="p-3 text-center text-xs font-semibold text-slate-600">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, ri) => {
                  const rowSelections = Array.isArray(gridVal[row]) ? gridVal[row] : [];
                  return (
                    <tr key={ri} className={`border-b border-slate-100 last:border-0 ${ri % 2 === 0 ? "" : "bg-slate-50/50"}`}>
                      <td className="p-3 text-sm font-medium text-slate-700">{row}</td>
                      {columns.map((col, ci) => (
                        <td key={ci} className="p-3 text-center">
                          <input
                            type="checkbox"
                            checked={rowSelections.includes(col)}
                            onChange={(e) => {
                              const updated = e.target.checked
                                ? [...rowSelections, col]
                                : rowSelections.filter((c) => c !== col);
                              handleChange(field.fieldKey, { ...gridVal, [row]: updated });
                            }}
                            className="w-4 h-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500 cursor-pointer"
                          />
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    // ── Default fallback ──────────────────────────────────────────────────────
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