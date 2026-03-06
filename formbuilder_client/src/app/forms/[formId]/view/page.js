"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api/formService";
import {
  Loader2, Send, CheckCircle2, AlertCircle,
  ChevronDown, Star, Upload
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Condition evaluator
// ─────────────────────────────────────────────────────────────────────────────
function evaluateConditions(field, formValues) {
  if (!field.conditions) return { visible: true, disabled: false };
  let cond;
  try { cond = typeof field.conditions === "string" ? JSON.parse(field.conditions) : field.conditions; }
  catch { return { visible: true, disabled: false }; }
  if (!cond.rules || cond.rules.length === 0) return { visible: true, disabled: false };

  const results = cond.rules.map((rule) => {
    if (!rule.fieldKey) return false;
    const rawVal = formValues[rule.fieldKey];
    const fieldValue = rawVal !== null && rawVal !== undefined ? String(rawVal) : "";
    switch (rule.operator) {
      case "equals":      return fieldValue === String(rule.value);
      case "notEquals":   return fieldValue !== String(rule.value);
      case "contains":    return fieldValue.toLowerCase().includes(String(rule.value).toLowerCase());
      case "greaterThan": return Number(fieldValue) > Number(rule.value);
      case "lessThan":    return Number(fieldValue) < Number(rule.value);
      case "isEmpty":     return fieldValue.trim() === "";
      case "isNotEmpty":  return fieldValue.trim() !== "";
      default:            return false;
    }
  });

  const passed = cond.logic === "OR" ? results.some(Boolean) : results.every(Boolean);
  switch (cond.action) {
    case "show":    return { visible: passed,  disabled: false };
    case "hide":    return { visible: !passed, disabled: false };
    case "enable":  return { visible: true,    disabled: !passed };
    case "disable": return { visible: true,    disabled: passed };
    default:        return { visible: true,    disabled: false };
  }
}

// Formula evaluator — formula: "{price_1} * {qty_2}"
function evaluateFormula(formula, formValues) {
  if (!formula) return "";
  try {
    const expression = formula.replace(/\{([^}]+)\}/g, (_, key) => {
      const val = Number(formValues[key]);
      return isNaN(val) ? 0 : val;
    });
    // eslint-disable-next-line no-new-func
    const result = Function(`"use strict"; return (${expression})`)();
    return isNaN(result) ? "" : String(Math.round(result * 100) / 100);
  } catch { return ""; }
}

export default function DynamicFormPage() {
  const { formId } = useParams();
  const router = useRouter();

  const [fields, setFields]                     = useState([]);
  const [formDetails, setFormDetails]           = useState({});
  const [formValues, setFormValues]             = useState({});
  const [publishedVersionId, setPublishedVersionId] = useState(null);
  const [loading, setLoading]                   = useState(true);
  const [message, setMessage]                   = useState("");
  const [submitting, setSubmitting]             = useState(false);
  const [fieldErrors, setFieldErrors]           = useState({});
  const [lookupData, setLookupData]             = useState({});

  // ── Evaluate conditions reactively ────────────────────────────────────────
  const { fieldStates, conditionallyRequiredFields } = useMemo(() => {
    const states = {};
    const requiredSet = new Set();

    fields.forEach((field) => {
      if (field.fieldType === "SECTION" || field.fieldType === "LABEL") {
        states[field.fieldKey] = { visible: true, disabled: false };
        return;
      }
      let cond;
      try { cond = field.conditions ? JSON.parse(field.conditions) : null; } catch { cond = null; }

      if (cond?.action === "calculate" && cond.formula) {
        const calcValue = evaluateFormula(cond.formula, formValues);
        states[field.fieldKey] = { visible: true, disabled: true, calculatedValue: calcValue };
      } else {
        states[field.fieldKey] = evaluateConditions(field, formValues);
      }

      // ── Detect active REQUIRE actions and mark target fields ──────────────
      if (cond?.actions?.length > 0 && cond?.rules?.length > 0) {
        // Evaluate whether this rule's conditions are currently passing
        const ruleResults = (cond.rules || []).map((rule) => {
          if (!rule.fieldKey) return false;
          const rawVal = formValues[rule.fieldKey];
          const fv = rawVal !== null && rawVal !== undefined ? String(rawVal) : "";
          switch (rule.operator) {
            case "equals":      return fv === String(rule.value);
            case "notEquals":   return fv !== String(rule.value);
            case "contains":    return fv.toLowerCase().includes(String(rule.value).toLowerCase());
            case "greaterThan": return Number(fv) > Number(rule.value);
            case "lessThan":    return Number(fv) < Number(rule.value);
            case "isEmpty":     return fv.trim() === "";
            case "isNotEmpty":  return fv.trim() !== "";
            default:            return false;
          }
        });
        const rulePassed = cond.logic === "OR" ? ruleResults.some(Boolean) : ruleResults.every(Boolean);

        if (rulePassed) {
          cond.actions.forEach((action) => {
            if (action?.type === "REQUIRE" && action.targetField) {
              requiredSet.add(action.targetField);
            }
          });
        }
      }
    });

    return { fieldStates: states, conditionallyRequiredFields: requiredSet };
  }, [fields, formValues]);

  // ── Auto-update calculated fields ─────────────────────────────────────────
  useEffect(() => {
    const updates = {};
    fields.forEach((field) => {
      const state = fieldStates[field.fieldKey];
      if (state?.calculatedValue !== undefined && state.calculatedValue !== formValues[field.fieldKey]) {
        updates[field.fieldKey] = state.calculatedValue;
      }
    });
    if (Object.keys(updates).length > 0) {
      setFormValues((prev) => ({ ...prev, ...updates }));
    }
  }, [fieldStates]);

  // ── Fetch lookup data ─────────────────────────────────────────────────────
  useEffect(() => {
    fields.forEach((field) => {
      if (field.fieldType === "LOOKUP_DROPDOWN") {
        const { sourceTable, sourceColumn, sourceDisplayColumn } = field.uiConfig || {};
        if (!sourceTable || !sourceColumn || !sourceDisplayColumn) return;
        fetch(`http://localhost:9090/api/forms/lookup?table=${sourceTable}&valueColumn=${sourceColumn}&labelColumn=${sourceDisplayColumn}`)
          .then((r) => r.json())
          .then((res) => setLookupData((prev) => ({ ...prev, [field.fieldKey]: res.data || [] })))
          .catch(console.error);
      }
    });
  }, [fields]);

  // ── Fetch form ────────────────────────────────────────────────────────────
  useEffect(() => {
    async function fetchFields() {
      try {
        const res = await api.getForm(formId);
        setFormDetails(res.data);

        const publishedVersion = res.data.versions[0];
        if (!publishedVersion) { setMessage("not_published"); setLoading(false); return; }

        setPublishedVersionId(publishedVersion.id);
        const fieldsData = publishedVersion.fields || [];
        setFields(fieldsData);

        const initialValues = {};
        fieldsData.forEach((field) => {
          if (field.fieldType === "SECTION" || field.fieldType === "LABEL") return;
          if      (field.fieldType === "BOOLEAN")        initialValues[field.fieldKey] = false;
          else if (field.fieldType === "CHECKBOX_GROUP") initialValues[field.fieldKey] = [];
          else if (field.fieldType === "MC_GRID") {
            const rows = field.validation?.rows || [];
            const init = {}; rows.forEach((r) => (init[r] = ""));
            initialValues[field.fieldKey] = init;
          } else if (field.fieldType === "TICK_BOX_GRID") {
            const rows = field.validation?.rows || [];
            const init = {}; rows.forEach((r) => (init[r] = []));
            initialValues[field.fieldKey] = init;
          } else if (field.fieldType === "STAR_RATING")  initialValues[field.fieldKey] = 0;
          else if  (field.fieldType === "LINEAR_SCALE")  initialValues[field.fieldKey] = "";
          else                                           initialValues[field.fieldKey] = "";
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
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const updated = { ...prev };
      delete updated[key];
      return updated;
    });
  };

  // ── Submit — only visible fields ──────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage("");
    setFieldErrors({});

    // Filter out hidden fields
    const visibleValues = {};
    Object.keys(formValues).forEach((key) => {
      const state = fieldStates[key];
      if (state?.visible !== false) visibleValues[key] = formValues[key];
    });

    // ── Evaluate FormRuleDTO actions on client side ────────────────────────
    let customErrors = {};
    fields.forEach((field) => {
      if (!field.conditions) return;
      let cond;
      try { cond = typeof field.conditions === "string" ? JSON.parse(field.conditions) : field.conditions; }
      catch { return; }
      
      if (!cond.actions || cond.actions.length === 0) return;
      if (!cond.rules || cond.rules.length === 0) return;

      const results = cond.rules.map((rule) => {
        if (!rule.fieldKey) return false;
        const rawVal = visibleValues[rule.fieldKey]; // evaluate against visible only? Or all? Let's use visible for accuracy with server
        const fieldValue = rawVal !== null && rawVal !== undefined ? String(rawVal) : "";
        switch (rule.operator) {
          case "equals":      return fieldValue === String(rule.value);
          case "notEquals":   return fieldValue !== String(rule.value);
          case "contains":    return fieldValue.toLowerCase().includes(String(rule.value).toLowerCase());
          case "greaterThan": return Number(fieldValue) > Number(rule.value);
          case "lessThan":    return Number(fieldValue) < Number(rule.value);
          case "isEmpty":     return fieldValue.trim() === "";
          case "isNotEmpty":  return fieldValue.trim() !== "";
          default:            return false;
        }
      });
      const passed = cond.logic === "OR" ? results.some(Boolean) : results.every(Boolean);

      if (passed) {
        cond.actions.forEach(action => {
          if (action.type === "VALIDATION_ERROR") {
            customErrors[field.fieldKey] = action.message || "Custom validation error.";
          } else if (action.type === "REQUIRE") {
            const target = action.targetField;
            if (target) {
              const targetVal = visibleValues[target];
              if (targetVal === null || targetVal === undefined || String(targetVal).trim() === "") {
                const reqMsg = action.message && action.message.trim() !== "" 
                                ? action.message 
                                : `Validation Error: '${target}' is a required field.`;
                customErrors[target] = reqMsg;
              }
            }
          } else if (action.type === "MIN_LENGTH") {
            const target = action.targetField;
            const minLen = parseInt(action.value, 10);
            if (target && !isNaN(minLen)) {
              const targetVal = visibleValues[target] ? String(visibleValues[target]) : "";
              if (targetVal.trim().length < minLen && targetVal.trim().length > 0) {
                 customErrors[target] = action.message && action.message.trim() !== "" 
                    ? action.message 
                    : `'${target}' must be at least ${minLen} characters.`;
              }
            }
          } else if (action.type === "MAX_LENGTH") {
            const target = action.targetField;
            const maxLen = parseInt(action.value, 10);
            if (target && !isNaN(maxLen)) {
              const targetVal = visibleValues[target] ? String(visibleValues[target]) : "";
              if (targetVal.trim().length > maxLen) {
                 customErrors[target] = action.message && action.message.trim() !== "" 
                    ? action.message 
                    : `'${target}' cannot exceed ${maxLen} characters.`;
              }
            }
          } else if (action.type === "REGEX_MATCH") {
            const target = action.targetField;
            const pattern = action.value;
            if (target && pattern) {
              const targetVal = visibleValues[target] ? String(visibleValues[target]) : "";
              if (targetVal.trim().length > 0) {
                try {
                  const regex = new RegExp(pattern);
                  if (!regex.test(targetVal)) {
                    customErrors[target] = action.message && action.message.trim() !== "" 
                      ? action.message 
                      : `'${target}' is not in a valid format.`;
                  }
                } catch (e) {
                  // Ignore invalid regex compilation
                }
              }
            }
          } else if (action.type === "MATCH_FIELD") {
            const target = action.targetField;
            const matchTarget = action.value;
            if (target && matchTarget) {
              const targetVal = visibleValues[target] ? String(visibleValues[target]) : "";
              const matchVal = visibleValues[matchTarget] ? String(visibleValues[matchTarget]) : "";
              if (targetVal !== matchVal) {
                customErrors[target] = action.message && action.message.trim() !== "" 
                  ? action.message 
                  : `Fields do not match.`;
              }
            }
          }
        });
      }
    });

    if (Object.keys(customErrors).length > 0) {
      setFieldErrors(customErrors);
      setSubmitting(false);
      const firstKey = Object.keys(customErrors)[0];
      const el = document.getElementById(`field_${firstKey}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    // ────────────────────────────────────────────────────────────────────────

    try {
      const res = await fetch("http://localhost:9090/api/forms/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ versionId: publishedVersionId, values: visibleValues }),
      });

      const data = await res.json();

      if (res.status === 400 && Array.isArray(data.errors)) {
        const errorsMap = {};
        data.errors.forEach((err) => { errorsMap[err.field] = err.message; });
        setFieldErrors(errorsMap);
        const firstKey = Object.keys(errorsMap)[0];
        const el = document.getElementById(`field_${firstKey}`);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }

      if (!res.ok) { setMessage("error"); return; }
      setMessage("success");
      router.push(`/forms/${formId}/submissions`);
    } catch (err) {
      console.error(err);
      setMessage("error");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="animate-spin text-indigo-600" size={40} />
        <p className="text-sm font-medium text-slate-500">Loading form...</p>
      </div>
    </div>
  );

  const hasErrors = Object.keys(fieldErrors).length > 0;

  return (
    <div className="min-h-screen bg-slate-50/50 py-12 px-4 sm:px-6 flex justify-center">
      <div className="w-full max-w-3xl space-y-6">

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 border-t-4 border-t-indigo-600 p-8 sm:p-10">
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">{formDetails.name || "Untitled Form"}</h1>
          {formDetails.description && <p className="text-slate-600 mt-3 leading-relaxed">{formDetails.description}</p>}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 sm:p-10">

          {message === "success" && (
            <div className="mb-8 flex items-start gap-3 bg-green-50 border border-green-200 px-5 py-4 rounded-xl text-sm">
              <CheckCircle2 size={20} className="text-green-600 shrink-0 mt-0.5" />
              <div><strong className="block font-semibold text-green-900 mb-1">Success!</strong><span className="text-green-800">Your response has been recorded. Thank you.</span></div>
            </div>
          )}

          {message === "error" && (
            <div className="mb-8 flex items-start gap-3 bg-red-50 border border-red-200 px-5 py-4 rounded-xl text-sm">
              <AlertCircle size={20} className="text-red-600 shrink-0 mt-0.5" />
              <div><strong className="block font-semibold text-red-900 mb-1">Submission Failed</strong><span className="text-red-800">Something went wrong. Please try again.</span></div>
            </div>
          )}

          {hasErrors && (
            <div className="mb-8 flex items-start gap-3 bg-red-50 border border-red-200 px-5 py-4 rounded-xl text-sm">
              <AlertCircle size={20} className="text-red-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-semibold text-red-900 mb-2">
                  Please fix {Object.keys(fieldErrors).length} error{Object.keys(fieldErrors).length > 1 ? "s" : ""} before submitting:
                </strong>
                <ul className="list-disc list-inside space-y-1 text-red-800">
                  {Object.values(fieldErrors).map((err, i) => <li key={i}>{err}</li>)}
                </ul>
              </div>
            </div>
          )}

          {fields.length === 0 && message !== "success" ? (
            <div className="text-center py-10"><p className="text-slate-500">This form is currently empty.</p></div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="space-y-8">
                {fields.map((field) => {
                  const state = fieldStates[field.fieldKey] || { visible: true, disabled: false };
                  // ✅ Hidden fields render nothing
                  if (state.visible === false) return null;

                  const isCondRequired = conditionallyRequiredFields.has(field.fieldKey);
                  return (
                    <div key={field.fieldKey} id={`field_${field.fieldKey}`} className="transition-all duration-300">
                      {renderInput(field, formValues, handleChange, fieldErrors[field.fieldKey], lookupData, state.disabled, isCondRequired)}
                    </div>
                  );
                })}
              </div>

              {formDetails.versions[0].status === "PUBLISHED" && (
                <div className="pt-6 mt-8 border-t border-slate-100 flex justify-end">
                  <button type="submit" disabled={submitting || message === "success"}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed text-white px-8 py-3 rounded-xl text-sm font-medium shadow-sm transition-all">
                    {submitting ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                    {submitting ? "Submitting..." : "Submit Form"}
                  </button>
                </div>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// renderInput — isDisabled added for conditional enable/disable
// ─────────────────────────────────────────────────────────────────────────────
function renderInput(field, values, handleChange, error = null, lookupData = {}, isDisabled = false, isConditionallyRequired = false) {
  const type      = field.fieldType?.toUpperCase();
  const value     = values[field.fieldKey];
  const uiConfig  = field.uiConfig || {};
  const validation = field.validation || {};
  const options   = field.options || [];
  const placeholder = uiConfig.placeholder || `Enter ${field.fieldLabel?.toLowerCase()}...`;
  const helpText  = uiConfig.helpText;

  const inputClass = [
    "w-full bg-slate-50 border rounded-xl px-4 py-3 text-sm text-slate-900",
    "focus:outline-none focus:ring-2 transition-all placeholder:text-slate-400",
    isDisabled ? "opacity-60 cursor-not-allowed bg-slate-100" : "",
    error ? "border-red-400 focus:ring-red-500/20 focus:border-red-500"
           : "border-slate-200 focus:ring-indigo-500/20 focus:border-indigo-500",
  ].join(" ");

  const FieldLabel = () => (
    <div className="mb-3">
      <label className="block text-sm font-semibold text-slate-800">
        {field.fieldLabel}
        {(field.required || isConditionallyRequired) && !isDisabled && <span className="text-red-500 ml-1">*</span>}
        {isConditionallyRequired && !field.required && !isDisabled && (
          <span className="ml-1.5 text-xs font-normal text-amber-600 italic">(conditionally required)</span>
        )}
        {isDisabled && <span className="ml-2 text-xs font-normal text-slate-400 italic">(auto-calculated)</span>}
      </label>
      {helpText && <p className="text-xs text-slate-500 mt-1 leading-relaxed">{helpText}</p>}
    </div>
  );

  const FieldError = () => error ? (
    <p className="mt-2 text-xs text-red-600 flex items-center gap-1">
      <AlertCircle size={12} className="shrink-0" />{error}
    </p>
  ) : null;

  switch (type) {

    // ── SECTION ───────────────────────────────────────────────────────────────
    case "SECTION":
      return (
        <div className="pt-2 pb-1">
          <div className="border-t-2 border-indigo-500 pt-5">
            <h3 className="text-lg font-bold text-slate-900">{uiConfig.title || field.fieldLabel}</h3>
            {uiConfig.description && <p className="text-sm text-slate-500 mt-1 leading-relaxed">{uiConfig.description}</p>}
          </div>
        </div>
      );

    // ── LABEL ─────────────────────────────────────────────────────────────────
    case "LABEL":
      return (
        <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-5 py-4">
          <h4 className="text-sm font-bold text-indigo-900">{uiConfig.title || field.fieldLabel}</h4>
          {uiConfig.description && <p className="text-sm text-indigo-700 mt-1 leading-relaxed">{uiConfig.description}</p>}
        </div>
      );

    // ── Text / Email ──────────────────────────────────────────────────────────
    case "TEXT":
    case "EMAIL":
      return (
        <div>
          <FieldLabel />
          <input type={type === "EMAIL" ? "email" : "text"} className={inputClass}
            placeholder={placeholder} value={value || ""} disabled={isDisabled}
            onChange={(e) => handleChange(field.fieldKey, e.target.value)}
            title={validation.validationMessage || ""} />
          <FieldError />
        </div>
      );

    // ── Textarea ──────────────────────────────────────────────────────────────
    case "TEXTAREA":
      return (
        <div>
          <FieldLabel />
          <textarea className={`${inputClass} resize-y min-h-[100px]`} rows={4}
            placeholder={placeholder} value={value || ""} disabled={isDisabled}
            onChange={(e) => handleChange(field.fieldKey, e.target.value)} />
          <FieldError />
        </div>
      );

    // ── Integer ───────────────────────────────────────────────────────────────
    case "INTEGER":
      return (
        <div>
          <FieldLabel />
          <input type="number" className={inputClass} placeholder={placeholder}
            value={value || ""} disabled={isDisabled}
            onChange={(e) => handleChange(field.fieldKey, e.target.value)} />
          <FieldError />
        </div>
      );

    // ── Date / Time ───────────────────────────────────────────────────────────
    case "DATE":
    case "TIME":
      return (
        <div>
          <FieldLabel />
          <input type={type.toLowerCase()} className={`${inputClass} cursor-pointer`}
            value={value || ""} disabled={isDisabled}
            onChange={(e) => handleChange(field.fieldKey, e.target.value)} />
          <FieldError />
        </div>
      );

    // ── Radio ─────────────────────────────────────────────────────────────────
    case "RADIO":
      return (
        <div className={isDisabled ? "opacity-50 pointer-events-none" : ""}>
          <FieldLabel />
          <div className="space-y-3">
            {options.map((opt, idx) => (
              <label key={idx} className="flex items-center gap-3 cursor-pointer group">
                <input type="radio" name={field.fieldKey} value={opt} checked={value === opt}
                  disabled={isDisabled}
                  onChange={(e) => handleChange(field.fieldKey, e.target.value)}
                  className="w-4 h-4 text-indigo-600 border-slate-300 focus:ring-indigo-500" />
                <span className="text-sm text-slate-700 group-hover:text-slate-900">{opt}</span>
              </label>
            ))}
          </div>
          <FieldError />
        </div>
      );

    // ── Checkbox Group ────────────────────────────────────────────────────────
    case "CHECKBOX_GROUP": {
      const sel = Array.isArray(value) ? value : [];
      return (
        <div className={isDisabled ? "opacity-50 pointer-events-none" : ""}>
          <FieldLabel />
          <div className="space-y-3">
            {options.map((opt, idx) => (
              <label key={idx} className="flex items-center gap-3 cursor-pointer group">
                <input type="checkbox" checked={sel.includes(opt)} disabled={isDisabled}
                  onChange={(e) => handleChange(field.fieldKey, e.target.checked ? [...sel, opt] : sel.filter((i) => i !== opt))}
                  className="w-4 h-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500" />
                <span className="text-sm text-slate-700 group-hover:text-slate-900">{opt}</span>
              </label>
            ))}
          </div>
          <FieldError />
        </div>
      );
    }

    // ── Dropdown ──────────────────────────────────────────────────────────────
    case "DROPDOWN":
      return (
        <div>
          <FieldLabel />
          <div className="relative">
            <select className={`${inputClass} appearance-none cursor-pointer`}
              value={value || ""} disabled={isDisabled}
              onChange={(e) => handleChange(field.fieldKey, e.target.value)}>
              <option value="" disabled>Select an option...</option>
              {options.map((opt, idx) => <option key={idx} value={opt}>{opt}</option>)}
            </select>
            <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
          <FieldError />
        </div>
      );

    // ── Boolean ───────────────────────────────────────────────────────────────
    case "BOOLEAN":
      return (
        <div>
          <div className={`flex items-start gap-3 p-4 border rounded-xl transition-colors bg-white ${isDisabled ? "opacity-50" : ""} ${error ? "border-red-400" : "border-slate-200 hover:bg-slate-50"}`}>
            <input type="checkbox" id={field.fieldKey} checked={value || false} disabled={isDisabled}
              onChange={(e) => handleChange(field.fieldKey, e.target.checked)}
              className="h-5 w-5 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer mt-0.5" />
            <label htmlFor={field.fieldKey} className="text-sm font-semibold text-slate-800 cursor-pointer">
              {field.fieldLabel}{field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
          </div>
          <FieldError />
        </div>
      );

    // ── Star Rating ───────────────────────────────────────────────────────────
    case "STAR_RATING": {
      const maxStars  = uiConfig.maxStars || 5;
      const starValue = value || 0;
      return (
        <div className={isDisabled ? "opacity-50 pointer-events-none" : ""}>
          <FieldLabel />
          <div className="flex gap-2">
            {Array.from({ length: maxStars }).map((_, i) => {
              const n = i + 1;
              return (
                <button key={i} type="button" onClick={() => !isDisabled && handleChange(field.fieldKey, n)}
                  className="focus:outline-none transition-transform hover:scale-110 active:scale-95">
                  <Star size={32} className={n <= starValue ? "text-amber-400 fill-amber-400" : "text-slate-300 fill-slate-100"} />
                </button>
              );
            })}
          </div>
          {starValue > 0 && <p className="text-xs text-slate-500 mt-2">{starValue} / {maxStars} star{starValue > 1 ? "s" : ""}</p>}
          <FieldError />
        </div>
      );
    }

    // ── Linear Scale ──────────────────────────────────────────────────────────
    case "LINEAR_SCALE": {
      const scaleMin  = uiConfig.scaleMin ?? 1;
      const scaleMax  = uiConfig.scaleMax ?? 5;
      const lowLabel  = uiConfig.lowLabel  || "";
      const highLabel = uiConfig.highLabel || "";
      const steps = Array.from({ length: scaleMax - scaleMin + 1 }, (_, i) => scaleMin + i);
      return (
        <div className={isDisabled ? "opacity-50 pointer-events-none" : ""}>
          <FieldLabel />
          <div className="space-y-3">
            <div className="flex gap-3 flex-wrap">
              {steps.map((val) => (
                <button key={val} type="button" onClick={() => !isDisabled && handleChange(field.fieldKey, val)}
                  className={`w-10 h-10 rounded-full border-2 text-sm font-semibold transition-all focus:outline-none ${
                    value === val ? "bg-indigo-600 border-indigo-600 text-white shadow-md"
                                  : "bg-white border-slate-300 text-slate-600 hover:border-indigo-400 hover:bg-indigo-50"}`}>
                  {val}
                </button>
              ))}
            </div>
            {(lowLabel || highLabel) && (
              <div className="flex justify-between text-xs text-slate-500 px-1">
                <span>{lowLabel}</span><span>{highLabel}</span>
              </div>
            )}
          </div>
          <FieldError />
        </div>
      );
    }

    // ── File Upload ───────────────────────────────────────────────────────────
    case "FILE_UPLOAD": {
      const acceptedTypes = uiConfig.acceptedFileTypes || [];
      const maxSizeMb     = uiConfig.maxFileSizeMb || 5;
      const isUploading   = value === "__uploading__";
      const isUploaded    = value && value !== "__uploading__";

      const handleFileChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > maxSizeMb * 1024 * 1024) { alert(`File too large. Max size is ${maxSizeMb}MB.`); e.target.value = ""; return; }
        handleChange(field.fieldKey, "__uploading__");
        try {
          const fd = new FormData();
          fd.append("file", file);
          const res = await fetch("http://localhost:9090/api/forms/upload", { method: "POST", body: fd });
          if (!res.ok) throw new Error("Upload failed");
          const data = await res.json();
          handleChange(field.fieldKey, data.url);
        } catch (err) {
          console.error(err); alert("File upload failed.");
          handleChange(field.fieldKey, ""); e.target.value = "";
        }
      };

      return (
        <div className={isDisabled ? "opacity-50 pointer-events-none" : ""}>
          <FieldLabel />
          <label className={`flex flex-col items-center justify-center w-full border-2 border-dashed rounded-xl p-8 transition-all group ${
            error ? "border-red-400 bg-red-50/20" : isUploaded ? "border-green-400 bg-green-50 cursor-default" : "border-slate-300 hover:border-indigo-400 hover:bg-indigo-50/30 cursor-pointer"}`}>
            {isUploading ? (
              <><Loader2 size={28} className="text-indigo-500 animate-spin mb-3" /><p className="text-sm font-medium text-indigo-600">Uploading...</p></>
            ) : isUploaded ? (
              <>
                <CheckCircle2 size={28} className="text-green-500 mb-3" />
                <p className="text-sm font-medium text-green-700">File uploaded successfully</p>
                <p className="text-xs text-green-600 mt-1 truncate max-w-xs">{value.split("/").pop()}</p>
                <button type="button" onClick={(e) => { e.preventDefault(); handleChange(field.fieldKey, ""); }} className="mt-3 text-xs text-red-500 hover:text-red-700 underline">Remove &amp; re-upload</button>
              </>
            ) : (
              <>
                <Upload size={28} className="text-slate-400 group-hover:text-indigo-500 mb-3 transition-colors" />
                <p className="text-sm font-medium text-slate-600 group-hover:text-indigo-600 transition-colors">Click to upload or drag &amp; drop</p>
                <p className="text-xs text-slate-400 mt-1">{acceptedTypes.length > 0 ? acceptedTypes.join(", ") : "Any file type"} · Max {maxSizeMb}MB</p>
              </>
            )}
            {!isUploaded && !isUploading && <input type="file" accept={acceptedTypes.join(",")} onChange={handleFileChange} className="hidden" />}
          </label>
          <FieldError />
        </div>
      );
    }

    // ── MC Grid ───────────────────────────────────────────────────────────────
    case "MC_GRID": {
      const rows    = field.validation?.rows    || [];
      const columns = field.validation?.columns || [];
      const gridVal = value || {};
      return (
        <div className={isDisabled ? "opacity-50 pointer-events-none" : ""}>
          <FieldLabel />
          <div className={`overflow-x-auto rounded-xl border ${error ? "border-red-400" : "border-slate-200"}`}>
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="p-3 w-32"></th>
                  {columns.map((col, i) => <th key={i} className="p-3 text-center text-xs font-semibold text-slate-600">{col}</th>)}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, ri) => (
                  <tr key={ri} className={`border-b border-slate-100 last:border-0 ${ri % 2 === 0 ? "" : "bg-slate-50/50"}`}>
                    <td className="p-3 text-sm font-medium text-slate-700">{row}</td>
                    {columns.map((col, ci) => (
                      <td key={ci} className="p-3 text-center">
                        <input type="radio" name={`${field.fieldKey}_${row}`} value={col}
                          checked={gridVal[row] === col} disabled={isDisabled}
                          onChange={() => handleChange(field.fieldKey, { ...gridVal, [row]: col })}
                          className="w-4 h-4 text-indigo-600 border-slate-300 focus:ring-indigo-500 cursor-pointer" />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <FieldError />
        </div>
      );
    }

    // ── Tick Box Grid ─────────────────────────────────────────────────────────
    case "TICK_BOX_GRID": {
      const rows    = field.validation?.rows    || [];
      const columns = field.validation?.columns || [];
      const gridVal = value || {};
      return (
        <div className={isDisabled ? "opacity-50 pointer-events-none" : ""}>
          <FieldLabel />
          <div className={`overflow-x-auto rounded-xl border ${error ? "border-red-400" : "border-slate-200"}`}>
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="p-3 w-32"></th>
                  {columns.map((col, i) => <th key={i} className="p-3 text-center text-xs font-semibold text-slate-600">{col}</th>)}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, ri) => {
                  const rowSel = Array.isArray(gridVal[row]) ? gridVal[row] : [];
                  return (
                    <tr key={ri} className={`border-b border-slate-100 last:border-0 ${ri % 2 === 0 ? "" : "bg-slate-50/50"}`}>
                      <td className="p-3 text-sm font-medium text-slate-700">{row}</td>
                      {columns.map((col, ci) => (
                        <td key={ci} className="p-3 text-center">
                          <input type="checkbox" checked={rowSel.includes(col)} disabled={isDisabled}
                            onChange={(e) => {
                              const updated = e.target.checked ? [...rowSel, col] : rowSel.filter((c) => c !== col);
                              handleChange(field.fieldKey, { ...gridVal, [row]: updated });
                            }}
                            className="w-4 h-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500 cursor-pointer" />
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <FieldError />
        </div>
      );
    }

    // ── Lookup Dropdown ───────────────────────────────────────────────────────
    case "LOOKUP_DROPDOWN": {
      const opts = lookupData[field.fieldKey] || [];
      return (
        <div className={isDisabled ? "opacity-50 pointer-events-none" : ""}>
          <FieldLabel />
          {opts.length === 0 ? (
            <div className={`${inputClass} text-slate-400`}>Loading options...</div>
          ) : (
            <div className="relative">
              <select className={`${inputClass} appearance-none cursor-pointer`}
                value={value?.value || ""} disabled={isDisabled}
                onChange={(e) => {
                  const selected = opts.find((o) => String(o.value) === e.target.value);
                  handleChange(field.fieldKey, selected || "");
                }}>
                <option value="">Select an option...</option>
                {opts.map((opt, idx) => <option key={idx} value={String(opt.value)}>{opt.label}</option>)}
              </select>
              <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          )}
          <FieldError />
        </div>
      );
    }

    // ── Default ───────────────────────────────────────────────────────────────
    default:
      return (
        <div>
          <FieldLabel />
          <input type="text" className={inputClass} placeholder="Enter value..."
            value={value || ""} disabled={isDisabled}
            onChange={(e) => handleChange(field.fieldKey, e.target.value)} />
          <FieldError />
        </div>
      );
  }
}