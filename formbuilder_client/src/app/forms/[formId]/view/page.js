"use client";

// Changes from original:
// 1. Replaced raw fetch("http://localhost:9090/api/forms/lookup?...") with api.getLookupData()
// 2. Replaced raw fetch("http://localhost:9090/api/forms/upload", ...) with api.uploadFile()
// All other logic is preserved exactly.

import { useEffect, useState, useMemo, Suspense, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api/formService";
import { evaluateFormula } from "@/lib/formulaEvaluator";
import {
  Loader2, Send, CheckCircle2, AlertCircle,
  ChevronDown, Star, Upload, LayoutTemplate, Lock,
  KeyRound, ShieldQuestion, X, ShieldAlert
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useForms } from "@/context/FormsContext";
import { toast } from "react-hot-toast";

// ── Condition evaluator ───────────────────────────────────────────────────────
function evaluateConditions(field, formValues) {
  if (!field.conditions) return { visible: true, disabled: false };
  let cond;
  try { cond = typeof field.conditions === "string" ? JSON.parse(field.conditions) : field.conditions; }
  catch { return { visible: true, disabled: false }; }
  if (!cond.rules || cond.rules.length === 0) return { visible: true, disabled: false };

  const results = cond.rules.map((rule) => {
    if (!rule.fieldKey) return false;
    let rv = formValues[rule.fieldKey];
    
    // Normalize value to an array of strings for consistent comparison
    let values = [];
    if (Array.isArray(rv)) {
      rv.forEach(v => {
        if (v && typeof v === "object") {
          if (v.value !== undefined) values.push(String(v.value));
          if (v.id !== undefined) values.push(String(v.id));
          if (v.label !== undefined) values.push(String(v.label));
        } else if (v != null) {
          values.push(String(v));
        }
      });
    } else if (rv != null && rv !== "") {
      if (typeof rv === "object") {
        if (rv.value !== undefined) values.push(String(rv.value));
        if (rv.id !== undefined) values.push(String(rv.id));
        if (rv.label !== undefined) values.push(String(rv.label));
      } else {
        values.push(String(rv));
      }
    }
    values = [...new Set(values)];

    const firstValue = values.length > 0 ? values[0] : "";
    const ruleValue = String(rule.value || "");
    
    switch (rule.operator) {
      case "equals":      return values.includes(ruleValue);
      case "notEquals":   return !values.includes(ruleValue);
      case "contains":    return values.some(v => v.toLowerCase().includes(ruleValue.toLowerCase()));
      case "greaterThan": return Number(firstValue) > Number(ruleValue);
      case "lessThan":    return Number(firstValue) < Number(ruleValue);
      case "isEmpty":     return values.length === 0 || (values.length === 1 && values[0].trim() === "");
      case "isNotEmpty":  return values.length > 0 && values[0].trim() !== "";
      default: return false;
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
// ── CustomSelect Component ──────────────────────────────────────────────────
const CustomSelect = ({ options, value, onChange, placeholder, isDisabled, maxSelections, mode = 'multiple' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const isMultiple = mode === 'multiple';

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedItems = isMultiple 
    ? (Array.isArray(value) ? value : []) 
    : (value != null && value !== "" ? [value] : []);

  const toggleOption = (opt) => {
    if (!isMultiple) {
      onChange(opt);
      setIsOpen(false);
      return;
    }

    let updated;
    const optValue = typeof opt === 'object' ? String(opt.value) : String(opt);
    const isSelected = selectedItems.some(v => (typeof v === 'object' ? String(v.value) : String(v)) === optValue);
    
    if (isSelected) {
      updated = selectedItems.filter(v => (typeof v === 'object' ? String(v.value) : String(v)) !== optValue);
    } else {
      if (maxSelections && selectedItems.length >= maxSelections) {
        toast.error(`Maximum ${maxSelections} selection(s) allowed`);
        return;
      }
      updated = [...selectedItems, opt];
    }
    onChange(updated);
  };

  const getLabel = (v) => {
    if (v == null) return "";
    return typeof v === 'object' ? (v.label || v.value || "") : v;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <div 
        onClick={() => !isDisabled && setIsOpen(!isOpen)}
        className={`min-h-[42px] p-2 border rounded-xl bg-white cursor-pointer flex flex-wrap gap-1.5 items-center transition-all ${
          isOpen ? 'ring-2 ring-indigo-500/20 border-indigo-500 shadow-sm' : 'border-slate-300 hover:border-slate-400'
        } ${isDisabled ? 'bg-slate-50 cursor-not-allowed opacity-60' : ''}`}
      >
        {selectedItems.length > 0 ? (
          selectedItems.map((v, i) => (
            <span key={i} className={`inline-flex items-center gap-1.5 px-2.5 py-1 ${isMultiple ? "bg-indigo-50 text-indigo-700 font-semibold" : "bg-slate-100 text-slate-800 font-medium"} text-sm rounded-lg border border-transparent animate-in fade-in zoom-in duration-200`}>
              {getLabel(v)}
              {isMultiple && (
                <button 
                  type="button" 
                  onClick={(e) => { e.stopPropagation(); toggleOption(v); }}
                  className="hover:bg-indigo-100 text-indigo-400 hover:text-indigo-700 rounded-md p-0.5 transition-colors"
                  disabled={isDisabled}
                >
                  <X size={14} />
                </button>
              )}
            </span>
          ))
        ) : (
          <span className="text-slate-400 text-sm ml-2">{placeholder || 'Select...'}</span>
        )}
        <div className="flex-1" />
        <ChevronDown size={16} className={`mr-2 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 ring-1 ring-black/5">
          <div className="max-h-64 overflow-y-auto custom-scrollbar p-1">
            {options.map((opt, i) => {
              const optValue = typeof opt === 'object' ? String(opt.value) : String(opt);
              const isSelected = selectedItems.some(v => (typeof v === 'object' ? String(v.value) : String(v)) === optValue);
              return (
                <div 
                  key={i}
                  onClick={() => toggleOption(opt)}
                  className={`p-2.5 rounded-lg text-sm cursor-pointer flex items-center justify-between transition-colors ${
                    isSelected ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {getLabel(opt)}
                  {isSelected && <CheckCircle2 size={16} className="text-indigo-600" />}
                </div>
              );
            })}
            {options.length === 0 && (
              <div className="p-4 text-center text-slate-400 text-sm italic">
                No options available
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};


// ── Main form component ───────────────────────────────────────────────────────
function FormPageContent() {
  const { formId } = useParams();
  const searchParams = useSearchParams();
  const isPreview = searchParams.get("preview") === "true";
  const router = useRouter();

  const [fields,      setFields]      = useState([]);
  const [formDetails, setFormDetails] = useState({});
  const [formValues,  setFormValues]  = useState({});
  const [loading,     setLoading]     = useState(true);
  const [message,     setMessage]     = useState("");
  const [submitting,  setSubmitting]  = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [lookupData,  setLookupData]  = useState({});
  const [currentPage, setCurrentPage] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");

  // ── Draft Save & Resume States ──────────────────────────────────────────
  const [isDraftSaving, setIsDraftSaving] = useState(false);
  const [draftSubmissionId, setDraftSubmissionId] = useState(null);
  const [draftBanner, setDraftBanner] = useState(null);
  const [draftSaveMessage, setDraftSaveMessage] = useState(null);

  const { user, isAuthenticated } = useAuth();
  const [accessRequested, setAccessRequested] = useState(false);
  const [requestReason,   setRequestReason]   = useState("");
  const [requestStatus,   setRequestStatus]   = useState(null);

  const scrollToFieldKey = useRef(null);
  const { setFormFromServer } = useForms();

  // ── Page splitting ────────────────────────────────────────────────────────
  const formPages = useMemo(() => {
    const pages = [];
    let current = [];
    fields.forEach((field) => {
      if (field.fieldType === "PAGE_BREAK") { pages.push(current); current = []; }
      else current.push(field);
    });
    pages.push(current);
    return pages;
  }, [fields]);

  // ── Condition evaluation ──────────────────────────────────────────────────
  const { fieldStates, conditionallyRequiredFields } = useMemo(() => {
    const states = {};
    const requiredSet = new Set();

    fields.forEach((field) => {
      let ownState;
      let cond;
      try { cond = field.conditions ? (typeof field.conditions === "string" ? JSON.parse(field.conditions) : field.conditions) : null; } catch { cond = null; }

      const getRuleResult = (rule, baseValues) => {
        if (!rule.fieldKey) return false;
        const rv = baseValues[rule.fieldKey];

        let values = [];
        if (Array.isArray(rv)) {
          rv.forEach(v => {
            if (v && typeof v === "object") {
              if (v.value !== undefined) values.push(String(v.value));
              if (v.id !== undefined) values.push(String(v.id));
              if (v.label !== undefined) values.push(String(v.label));
            } else if (v != null) {
              values.push(String(v));
            }
          });
        } else if (rv != null && rv !== "") {
          if (typeof rv === "object") {
            if (rv.value !== undefined) values.push(String(rv.value));
            if (rv.id !== undefined) values.push(String(rv.id));
            if (rv.label !== undefined) values.push(String(rv.label));
          } else {
            values.push(String(rv));
          }
        }
        values = [...new Set(values)];

        const firstValue = values.length > 0 ? values[0] : "";
        const ruleValue = String(rule.value || "");
        
        switch (rule.operator) {
          case "equals":      return values.includes(ruleValue);
          case "notEquals":   return !values.includes(ruleValue);
          case "contains":    return values.some(v => v.toLowerCase().includes(ruleValue.toLowerCase()));
          case "greaterThan": return Number(firstValue) > Number(ruleValue);
          case "lessThan":    return Number(firstValue) < Number(ruleValue);
          case "isEmpty":     return values.length === 0 || (values.length === 1 && values[0].trim() === "");
          case "isNotEmpty":  return values.length > 0 && values[0].trim() !== "";
          default: return false;
        }
      };

      if (field.fieldType === "SECTION" || field.fieldType === "LABEL") {
        ownState = { visible: true, disabled: false };
      } else if (cond?.action === "calculate" && cond.formula) {
        const result = evaluateFormula(cond.formula, formValues, `field: ${field.fieldKey}`);
        ownState = { 
          visible: true, 
          disabled: true, 
          calculatedValue: result.value, 
          calculationError: result.error 
        };
      } else {
        ownState = evaluateConditions(field, formValues);
      }
      states[field.fieldKey] = ownState;

      if (cond?.actions?.length > 0 && cond?.rules?.length > 0) {
        const ruleResults = (cond.rules || []).map((rule) => getRuleResult(rule, formValues));
        const rulePassed = cond.logic === "OR" ? ruleResults.some(Boolean) : ruleResults.every(Boolean);
        if (rulePassed) {
          cond.actions.forEach((action) => {
            if (action?.type === "REQUIRE" && action.targetField) requiredSet.add(action.targetField);
          });
        }
      }
    });

    const finalStates = { ...states };
    fields.forEach((field) => {
      if (field.parentId) {
        const parent = fields.find((f) => f.fieldKey === field.parentId);
        if (parent && states[parent.fieldKey]?.visible === false) {
          finalStates[field.fieldKey] = { ...finalStates[field.fieldKey], visible: false };
        }
      }
    });

    return { fieldStates: finalStates, conditionallyRequiredFields: requiredSet };
  }, [fields, formValues]);

  // ── Auto-update calculated fields ─────────────────────────────────────────
  useEffect(() => {
    const updates = {};
    fields.forEach((field) => {
      const state = fieldStates[field.fieldKey];
      if (state?.calculationError) {
        console.warn(`[FormulaEvaluator] Error in field ${field.fieldKey}:`, state.calculationError);
      }
      if (state?.calculatedValue !== undefined && state.calculatedValue !== formValues[field.fieldKey]) {
        updates[field.fieldKey] = state.calculatedValue;
      }
    });
    if (Object.keys(updates).length > 0) setFormValues((prev) => ({ ...prev, ...updates }));
  }, [fieldStates]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Fetch lookup data — now uses api.getLookupData() (no raw fetch) ───────
  useEffect(() => {
    fields.forEach((field) => {
      if (field.fieldType !== "LOOKUP_DROPDOWN") return;
      const { sourceTable, sourceColumn, sourceDisplayColumn } = field.uiConfig || {};
      if (!sourceTable || !sourceColumn || !sourceDisplayColumn) return;

      api.getLookupData(sourceTable, sourceColumn, sourceDisplayColumn)
        .then((res) => setLookupData((prev) => ({ ...prev, [field.fieldKey]: res.data || [] })))
        .catch(() => {}); // silently ignore — field will show "Loading..."
    });
  }, [fields]);

  // ── Fetch form ────────────────────────────────────────────────────────────
  useEffect(() => {
    async function fetchFields() {
      try {
        let res;
        // UUIDs are typically 36 characters. Short codes are 6. 
        // We check for the presence of dashes often found in UUIDs, or length > 10.
        if (formId.length > 10 || formId.includes("-")) {
          res = await api.getForm(formId, { mode: isPreview ? 'builder' : null });
        } else {
          res = await api.getFormByCode(formId, { mode: isPreview ? 'builder' : null });
        }
        // console.log removed — was leaking full API response to browser console
        setFormDetails(res.data);
        setFormFromServer(res.data);

        if (!isPreview && res.data.status === "ARCHIVED") { setMessage("archived"); setLoading(false); return; }
        if (!isPreview && res.data.status !== "PUBLISHED") { setMessage("not_published"); setLoading(false); return; }

        const fieldsData = res.data.fields?.filter((f) => !f.isDeleted) || [];
        setFields(fieldsData);

        const initialValues = {};
        fieldsData.forEach((field) => {
          if (field.fieldType === "SECTION" || field.fieldType === "LABEL") return;
          const def = field.uiConfig?.defaultValue;
          if (field.fieldType === "BOOLEAN")         initialValues[field.fieldKey] = def === "true";
          else if (field.fieldType === "CHECKBOX_GROUP") initialValues[field.fieldKey] = [];
          else if (field.fieldType === "MC_GRID") {
            const init = {}; (field.validation?.rows || []).forEach((r) => (init[r] = "")); initialValues[field.fieldKey] = init;
          } else if (field.fieldType === "TICK_BOX_GRID") {
            const init = {}; (field.validation?.rows || []).forEach((r) => (init[r] = [])); initialValues[field.fieldKey] = init;
          } else if (field.fieldType === "STAR_RATING") initialValues[field.fieldKey] = def ? parseInt(def) : 0;
          else initialValues[field.fieldKey] = def || "";
        });
        setFormValues(initialValues);
      } catch (err) {
        if (err.response?.status === 403)      setMessage("forbidden");
        else if (err.response?.status === 401) setMessage("unauthorized");
        else if (err.response?.status === 409) {
          setErrorMessage(err.response.data?.message || "This form is unavailable due to a database sync issue.");
          setMessage("error");
        } else if (err.response?.status === 404) {
          setMessage("not_published");
        } else {
          setMessage("error");
        }
      } finally {
        setLoading(false);
      }
    }
    if (formId) fetchFields().catch(() => {});
  }, [formId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Fetch draft on mount ──────────────────────────────────────────────────
  useEffect(() => {
    async function fetchDraft() {
      if (!isAuthenticated || !formDetails.activeVersionId) return;
      try {
        const res = await api.getDraftSubmission(formId);
        if (res.data) {
          const draft = res.data;
          if (draft.formVersionId === formDetails.activeVersionId) {
            setFormValues((prev) => ({ ...prev, ...draft.data }));
            setDraftBanner("You have a saved draft. Resuming where you left off.");
            setDraftSubmissionId(draft.submissionId);
          } else {
            setDraftBanner("warning: Your previous draft was for an older version of this form and cannot be restored.");
          }
        }
      } catch (err) {
        console.error("Failed to fetch draft", err);
      }
    }
    if (formDetails.activeVersionId) fetchDraft();
  }, [formDetails.activeVersionId, isAuthenticated]);

  // ── Scroll to error field after page nav ──────────────────────────────────
  useEffect(() => {
    if (!scrollToFieldKey.current) return;
    const key = scrollToFieldKey.current;
    scrollToFieldKey.current = null;
    const el = document.getElementById(`field_${key}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    else window.scrollTo({ top: 0, behavior: "smooth" });
  }, [currentPage]);

  const handleChange = (key, value) => {
    setFormValues((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => { if (!prev[key]) return prev; const u = { ...prev }; delete u[key]; return u; });
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage("");
    setFieldErrors({});

    const EXCLUDED = new Set(["SECTION", "LABEL", "PAGE_BREAK", "GROUP"]);
    const visibleValues = {};
    Object.keys(formValues).forEach((key) => {
      const state = fieldStates[key];
      const fieldDef = fields.find((f) => f.fieldKey === key);
      if (state?.visible !== false && !EXCLUDED.has(fieldDef?.fieldType)) visibleValues[key] = formValues[key];
    });

    // ── Client-side validation ────────────────────────────────────────────
    let customErrors = {};
    const fieldsToValidate = formPages[currentPage] || [];

    // Format checks
    fieldsToValidate.forEach((field) => {
      const val = visibleValues[field.fieldKey];
      if (val == null || String(val).trim() === "") return;

      if (field.fieldType === "INTEGER") {
        if ((field.validation?.numberFormat || "INTEGER") === "INTEGER") {
          const num = Number(val);
          if (!isNaN(num) && num !== Math.floor(num)) {
            customErrors[field.fieldKey] = `'${field.fieldLabel}' must be a whole number.`;
          }
        }
      } else if (field.fieldType === "EMAIL") {
        if (field.validation?.allowedDomains?.length > 0) {
          const email = String(val).trim().toLowerCase();
          const domain = email.split("@")[1];
          if (domain && !field.validation.allowedDomains.includes(domain)) {
            customErrors[field.fieldKey] = `This email is not accepted. Only emails from ${field.validation.allowedDomains.join(", ")} are allowed.`;
          }
        }
      } else if (field.fieldType === "PHONE") {
        const phoneRegex = /^\+\d{1,4}\d{10}$/;
        if (!phoneRegex.test(String(val).trim())) {
          customErrors[field.fieldKey] = `'${field.fieldLabel}' must have a 10-digit number and country code (e.g., +919876543210).`;
        }
      } else if (field.fieldType === "DATETIME") {
        if (isNaN(Date.parse(val))) {
          customErrors[field.fieldKey] = `'${field.fieldLabel}' must be a valid date and time.`;
        }
      }
    });

    // Business-rule actions
    fieldsToValidate.forEach((field) => {
      if (!field.conditions) return;
      let cond;
      try { cond = typeof field.conditions === "string" ? JSON.parse(field.conditions) : field.conditions; }
      catch { return; }
      if (!cond.actions || cond.actions.length === 0) return;

      // Format validators — always run
      cond.actions.forEach((action) => {
        if (action.type === "REGEX_MATCH") {
          const target = action.targetField; const pattern = action.value;
          if (target && pattern) {
            const v = visibleValues[target] ? String(visibleValues[target]).trim() : "";
            if (v.length > 0) {
              try { if (!new RegExp(pattern).test(v)) customErrors[target] = action.message || `'${target}' is not in a valid format.`; }
              catch { /* invalid regex */ }
            }
          }
        } else if (action.type === "MATCH_FIELD") {
          const target = action.targetField; const matchTarget = action.value;
          if (target && matchTarget) {
            const tv = visibleValues[target] ? String(visibleValues[target]) : "";
            const mv = visibleValues[matchTarget] ? String(visibleValues[matchTarget]) : "";
            if ((tv.length > 0 || mv.length > 0) && tv !== mv) {
              customErrors[target] = action.message || "Fields do not match.";
            }
          }
        }
      });

      if (!cond.rules || cond.rules.length === 0) return;
      const results = cond.rules.map((rule) => {
        if (!rule.fieldKey) return false;
        let rv = visibleValues[rule.fieldKey];

        let values = [];
        if (Array.isArray(rv)) {
          rv.forEach(v => {
            if (v && typeof v === "object") {
              if (v.value !== undefined) values.push(String(v.value));
              if (v.id !== undefined) values.push(String(v.id));
              if (v.label !== undefined) values.push(String(v.label));
            } else if (v != null) {
              values.push(String(v));
            }
          });
        } else if (rv != null && rv !== "") {
          if (typeof rv === "object") {
            if (rv.value !== undefined) values.push(String(rv.value));
            if (rv.id !== undefined) values.push(String(rv.id));
            if (rv.label !== undefined) values.push(String(rv.label));
          } else {
            values.push(String(rv));
          }
        }
        values = [...new Set(values)];

        const firstValue = values.length > 0 ? values[0] : "";
        const ruleValue = String(rule.value || "");

        switch (rule.operator) {
          case "equals":      return values.includes(ruleValue);
          case "notEquals":   return !values.includes(ruleValue);
          case "contains":    return values.some(v => v.toLowerCase().includes(ruleValue.toLowerCase()));
          case "greaterThan": return Number(firstValue) > Number(ruleValue);
          case "lessThan":    return Number(firstValue) < Number(ruleValue);
          case "isEmpty":     return values.length === 0 || (values.length === 1 && values[0].trim() === "");
          case "isNotEmpty":  return values.length > 0 && values[0].trim() !== "";
          default: return false;
        }
      });
      const passed = cond.logic === "OR" ? results.some(Boolean) : results.every(Boolean);

      if (passed) {
        cond.actions.forEach((action) => {
          if (action.type === "VALIDATION_ERROR") {
            customErrors[field.fieldKey] = action.message || "Custom validation error.";
          } else if (action.type === "REQUIRE") {
            const target = action.targetField;
            if (target) {
              const v = visibleValues[target];
              if (v == null || String(v).trim() === "") {
                customErrors[target] = action.message || `Validation Error: '${target}' is a required field.`;
              }
            }
          } else if (action.type === "MIN_LENGTH") {
            const target = action.targetField; const minLen = parseInt(action.value, 10);
            if (target && !isNaN(minLen)) {
              const v = visibleValues[target] ? String(visibleValues[target]) : "";
              if (v.trim().length < minLen && v.trim().length > 0) {
                customErrors[target] = action.message || `'${target}' must be at least ${minLen} characters.`;
              }
            }
          } else if (action.type === "MAX_LENGTH") {
            const target = action.targetField; const maxLen = parseInt(action.value, 10);
            if (target && !isNaN(maxLen)) {
              const v = visibleValues[target] ? String(visibleValues[target]) : "";
              if (v.trim().length > maxLen) {
                customErrors[target] = action.message || `'${target}' cannot exceed ${maxLen} characters.`;
              }
            }
          } else if (action.type === "MIN_VALUE") {
            const target = action.targetField; const minVal = parseFloat(action.value);
            if (target && !isNaN(minVal)) {
              const v = visibleValues[target];
              if (v != null && String(v).trim() !== "") {
                const num = parseFloat(v);
                if (!isNaN(num) && num < minVal) customErrors[target] = action.message || `'${target}' must be at least ${minVal}.`;
              }
            }
          } else if (action.type === "MAX_VALUE") {
            const target = action.targetField; const maxVal = parseFloat(action.value);
            if (target && !isNaN(maxVal)) {
              const v = visibleValues[target];
              if (v != null && String(v).trim() !== "") {
                const num = parseFloat(v);
                if (!isNaN(num) && num > maxVal) customErrors[target] = action.message || `'${target}' cannot exceed ${maxVal}.`;
              }
            }
          }
        });
      }
    });

    if (Object.keys(customErrors).length > 0) {
      setFieldErrors(customErrors);
      setSubmitting(false);
      const firstEl = document.getElementById(`field_${Object.keys(customErrors)[0]}`);
      if (firstEl) firstEl.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    // Next page
    if (currentPage < formPages.length - 1) {
      setCurrentPage((p) => p + 1);
      setSubmitting(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    if (isPreview) {
      toast.error("This is a preview mode. Submissions are disabled.");
      setSubmitting(false);
      return;
    }

    try {
      const vid = isPreview ? formDetails.draftVersionId : formDetails.activeVersionId;
      await api.submitForm(formId, visibleValues, vid);
      if (formDetails.canViewSubmissions) {
        toast.success("Form submitted successfully!");
        router.push(`/forms/${formId}/submissions`);
      } else {
        toast.success("Success! Your response has been recorded.");
        setMessage("success");
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } catch (err) {
      if (err.response?.status === 409) {
        const msg = err.response?.data?.message || "";
        // Distinguish between version mismatch and schema drift (both are 409)
        if (msg.toLowerCase().includes("out of sync") || msg.toLowerCase().includes("drift")) {
          setErrorMessage(msg);
          setMessage("error"); // Show as a standard error with the backend's drift message
        } else {
          setErrorMessage("This form has been updated by the owner. Please reload the page to get the latest version.");
          setMessage("version_conflict");
        }
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else if (err.response?.status === 400 && Array.isArray(err.response.data?.errors)) {
        const errorsMap = {};
        err.response.data.errors.forEach((e) => { errorsMap[e.field] = e.message; });
        setFieldErrors(errorsMap);

        const firstErrorKey = Object.keys(errorsMap)[0];
        let targetPage = currentPage;
        for (let p = 0; p < formPages.length; p++) {
          if (formPages[p].some((f) => f.fieldKey === firstErrorKey)) { targetPage = p; break; }
        }
        if (targetPage !== currentPage) {
          scrollToFieldKey.current = firstErrorKey;
          setCurrentPage(targetPage);
        } else {
          const el = document.getElementById(`field_${firstErrorKey}`);
          if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      } else {
        setErrorMessage(err.response?.data?.message || "Submission failed. Please try again.");
        setMessage("error");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveDraft = async () => {
    setIsDraftSaving(true);
    setDraftSaveMessage(null);
    try {
      const vid = formDetails.activeVersionId;
      const res = await api.saveDraftSubmission(formId, vid, formValues);
      setDraftSubmissionId(res.data.submissionId);
      setDraftSaveMessage({ type: "success", text: "Draft saved successfully" });
      setTimeout(() => setDraftSaveMessage(null), 3000);
    } catch (err) {
      setDraftSaveMessage({ type: "error", text: err.response?.data?.message || "Failed to save draft" });
    } finally {
      setIsDraftSaving(false);
    }
  };

  const handleRequestAccess = async () => {
    setRequestStatus("pending");
    try {
      await api.createAccessRequest(formId, "VIEW_FORM", requestReason);
      setRequestStatus("success");
      setAccessRequested(true);
    } catch (err) {
      setErrorMessage(err.response?.data?.message || "Failed to submit request.");
      setRequestStatus("error");
    }
  };

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="animate-spin text-indigo-600" size={40} />
        <p className="text-sm font-medium text-slate-500">Loading form...</p>
      </div>
    </div>
  );

  // ── Access screens ────────────────────────────────────────────────────────
  if (message === "unauthorized") return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl p-10 max-w-md w-full text-center border border-slate-200">
        <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <Lock size={32} className="text-indigo-600" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-3">Login Required</h2>
        <p className="text-slate-500 mb-8">This form requires authentication. Please log in to view and submit.</p>
        <button
          onClick={() => router.push(`/login?redirect=/forms/${formId}/view`)}
          className="w-full bg-indigo-600 text-white px-8 py-4 rounded-2xl text-base font-bold hover:bg-indigo-700 shadow-lg transition-all"
        >
          Go to Login
        </button>
      </div>
    </div>
  );

  if (message === "forbidden") return (
    <div className="min-h-screen bg-slate-50/50 py-20 px-4 flex justify-center">
      <div className="w-full max-w-xl">
        <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
          <div className="bg-red-600 h-2 w-full" />
          <div className="p-10 text-center">
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <ShieldQuestion size={32} className="text-red-500" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">Access Restricted</h2>
            <p className="text-slate-500 mb-10 leading-relaxed">
              You do not have permission to access this form.
            </p>
            {!accessRequested ? (
              <div className="space-y-4 text-left">
                <label className="block text-sm font-semibold text-slate-700 mb-1">Request access to this form</label>
                <textarea
                  placeholder="Briefly explain why you need access..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all min-h-[120px]"
                  value={requestReason}
                  onChange={(e) => setRequestReason(e.target.value)}
                />
                <button
                  onClick={handleRequestAccess}
                  disabled={requestStatus === "pending" || !requestReason.trim()}
                  className="w-full bg-indigo-600 text-white px-8 py-4 rounded-2xl text-base font-bold hover:bg-indigo-700 shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {requestStatus === "pending" ? <Loader2 className="animate-spin" size={20} /> : <KeyRound size={20} />}
                  Submit Access Request
                </button>
                {requestStatus === "error" && (
                  <p className="text-red-500 text-sm text-center font-medium">{errorMessage}</p>
                )}
              </div>
            ) : (
              <div className="bg-green-50 border border-green-100 rounded-2xl p-6 text-center">
                <CheckCircle2 size={32} className="text-green-500 mx-auto mb-3" />
                <p className="text-green-800 font-bold mb-1">Request Submitted</p>
                <p className="text-green-700 text-sm">You'll be notified once it's processed.</p>
                <button onClick={() => router.push("/")} className="mt-6 text-sm font-bold text-indigo-600 hover:text-indigo-700 underline">
                  Back to Home
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const hasErrors = Object.keys(fieldErrors).length > 0;

  return (
    <div className="min-h-screen bg-slate-50/50 py-12 px-4 sm:px-6 flex justify-center">
      <div className="w-full max-w-3xl space-y-6">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 border-t-4 border-t-indigo-600 p-8 sm:p-10">
          {isPreview && (
            <div className="mb-6 bg-amber-50 text-amber-800 border border-amber-200 px-4 py-3 rounded-xl text-sm font-medium flex items-center justify-center">
              Preview Mode — Submissions cannot be saved.
            </div>
          )}
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">{formDetails.name || "Untitled Form"}</h1>
          {formDetails.description && <p className="text-slate-600 mt-3 leading-relaxed">{formDetails.description}</p>}
        </div>

        {draftBanner && (
          <div className={`p-4 rounded-xl text-sm font-medium flex items-center gap-3 border shadow-sm ${
            draftBanner.startsWith("warning") 
              ? "bg-amber-50 text-amber-800 border-amber-200" 
              : "bg-indigo-50 text-indigo-800 border-indigo-200"
          }`}>
            <AlertCircle size={18} className={draftBanner.startsWith("warning") ? "text-amber-600" : "text-indigo-600"} />
            {draftBanner.replace("warning: ", "")}
            <button onClick={() => setDraftBanner(null)} className="ml-auto text-xs opacity-60 hover:opacity-100 font-bold uppercase tracking-wider">Dismiss</button>
          </div>
        )}

        {draftSaveMessage && (
          <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 px-6 py-3 rounded-2xl shadow-2xl z-50 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-4 duration-300 ${
            draftSaveMessage.type === "success" ? "bg-green-600 text-white" : "bg-red-600 text-white"
          }`}>
            {draftSaveMessage.type === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <span className="text-sm font-bold">{draftSaveMessage.text}</span>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 sm:p-10">
          {message === "not_published" && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center mb-6">
                <LayoutTemplate size={32} className="text-indigo-600" />
              </div>
              <h1 className="text-2xl font-black text-slate-900 mb-3">Form Not Published</h1>
              <p className="text-slate-500 mb-8 max-w-xs">The owner is still working on this form. Please check back later when it's live.</p>
              <button onClick={() => router.push("/")} className="bg-slate-900 text-white px-8 py-3 rounded-2xl text-sm font-bold hover:bg-slate-800 transition-all">
                Return Home
              </button>
            </div>
          )}

          {message === "archived" && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center mb-6">
                <AlertCircle size={32} className="text-red-500" />
              </div>
              <h1 className="text-2xl font-black text-slate-900 mb-3">Form Archived</h1>
              <p className="text-slate-500 mb-8 max-w-xs">This form is no longer accepting submissions.</p>
              <button onClick={() => router.push("/")} className="bg-slate-900 text-white px-8 py-3 rounded-2xl text-sm font-bold hover:bg-slate-800 transition-all">
                Return Home
              </button>
            </div>
          )}

          {message === "success" && (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="w-24 h-24 bg-green-50 rounded-[40px] flex items-center justify-center mb-8">
                <CheckCircle2 size={48} className="text-green-500" />
              </div>
              <h2 className="text-3xl font-black text-slate-900 mb-4 tracking-tight">Thank You!</h2>
              <p className="text-slate-500 text-lg mb-10 max-w-sm leading-relaxed">Your response has been recorded.</p>
              <div className="flex flex-col sm:flex-row gap-4 w-full max-w-sm">
                <button
                  onClick={() => window.location.reload()}
                  className="flex-1 bg-white border-2 border-slate-100 text-slate-700 px-8 py-4 rounded-2xl text-sm font-bold hover:bg-slate-50 transition-all"
                >
                  Submit Another
                </button>
                <button
                  onClick={() => router.push("/")}
                  className="flex-1 bg-indigo-600 text-white px-8 py-4 rounded-2xl text-sm font-bold hover:bg-indigo-700 shadow-lg transition-all"
                >
                  Return Home
                </button>
              </div>
            </div>
          )}

          {message === "version_conflict" && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mb-6">
                <AlertCircle size={32} className="text-amber-500" />
              </div>
              <h1 className="text-2xl font-black text-slate-900 mb-3">Form Updated</h1>
              <p className="text-slate-500 mb-8 max-w-sm">This form has been updated while you were filling it out. Please reload to use the latest version.</p>
              <button onClick={() => window.location.reload()} className="bg-indigo-600 text-white px-8 py-3 rounded-2xl text-sm font-bold hover:bg-indigo-700 transition-all">
                Reload Form
              </button>
            </div>
          )}

          {message === "error" && (
            <div className="mb-8 flex items-start gap-3 bg-red-50 border border-red-200 px-5 py-4 rounded-xl text-sm">
              <AlertCircle size={20} className="text-red-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-semibold text-red-900 mb-1">Submission Failed</strong>
                <span className="text-red-800">{errorMessage || "Something went wrong. Please try again."}</span>
              </div>
            </div>
          )}

          {hasErrors && (
            <div className="mb-8 flex items-start gap-3 bg-red-50 border border-red-200 px-5 py-4 rounded-xl text-sm">
              <AlertCircle size={20} className="text-red-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-semibold text-red-900 mb-2">
                  Please fix {Object.keys(fieldErrors).length} error{Object.keys(fieldErrors).length > 1 ? "s" : ""}:
                </strong>
                <ul className="list-disc list-inside space-y-1 text-red-800">
                  {Object.values(fieldErrors).map((err, i) => <li key={i}>{err}</li>)}
                </ul>
              </div>
            </div>
          )}

          {fields.length === 0 && message !== "success" ? (
            <div className="text-center py-10"><p className="text-slate-500">This form is currently empty.</p></div>
          ) : message !== "success" ? (
            <form onSubmit={handleSubmit} className="space-y-8">
              {formPages.length > 1 && (
                <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
                  {formPages.map((_, idx) => (
                    <div key={idx} className={`h-1.5 flex-1 rounded-full bg-indigo-600 transition-all ${idx <= currentPage ? "opacity-100" : "opacity-10"}`} />
                  ))}
                </div>
              )}

              <div className="space-y-8">
                {(formPages[currentPage] || []).filter((f) => !f.parentId).map((field) => {
                  const state = fieldStates[field.fieldKey] || { visible: true, disabled: false };
                  if (state.visible === false) return null;
                  if (field.uiConfig?.hidden) return null;
                  return (
                    <div key={field.fieldKey} id={`field_${field.fieldKey}`} className="transition-all duration-300">
                      {renderInput(field, formValues, handleChange, fieldErrors[field.fieldKey], lookupData, state.disabled, conditionallyRequiredFields.has(field.fieldKey), field.uiConfig?.readOnly === true, fields, fieldStates, conditionallyRequiredFields, fieldErrors, state.calculationError)}
                    </div>
                  );
                })}
              </div>

              <div className="pt-6 mt-8 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="flex gap-3">
                  {currentPage > 0 ? (
                    <button type="button" onClick={() => { setCurrentPage((p) => p - 1); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                      className="px-6 py-3 rounded-xl border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 transition-colors text-sm">
                      Previous
                    </button>
                  ) : (
                    isPreview && (
                      <button type="button" onClick={() => router.push(`/forms/${formId}/builder`)}
                        className="px-6 py-3 rounded-xl border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 transition-colors text-sm">
                        Close Preview
                      </button>
                    )
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                  {isAuthenticated && !isPreview && (
                    <button
                      type="button"
                      onClick={handleSaveDraft}
                      disabled={isDraftSaving || submitting}
                      className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl border-2 border-slate-200 text-slate-700 font-bold hover:bg-slate-50 transition-all text-sm disabled:opacity-50"
                    >
                      {isDraftSaving ? <Loader2 size={18} className="animate-spin text-indigo-600" /> : <LayoutTemplate size={18} className="text-slate-400" />}
                      {isDraftSaving ? "Saving..." : "Save Draft"}
                    </button>
                  )}

                  <button
                    type="submit"
                    disabled={submitting || message === "success" || (isPreview && currentPage === formPages.length - 1)}
                    className={`flex items-center justify-center gap-2 px-8 py-3 rounded-xl text-sm font-bold shadow-lg transition-all ${
                      isPreview && currentPage === formPages.length - 1
                        ? "bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300 shadow-none"
                        : "bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95"
                    }`}
                  >
                    {submitting ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                    {currentPage < formPages.length - 1
                      ? "Next Step"
                      : isPreview ? "Submit Disabled" : submitting ? "Submitting..." : "Submit Form"}
                  </button>
                </div>
              </div>
            </form>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// ── renderInput — file upload now uses api.uploadFile() (no raw fetch) ────────
function renderInput(field, values, handleChange, error = null, lookupData = {}, isDisabled = false, isConditionallyRequired = false, isReadOnly = false, allFields = [], fieldStates = {}, conditionallyRequiredFields = new Set(), fieldErrors = {}, calculationError = null) {
  const type = field.fieldType?.toUpperCase();
  const value = values[field.fieldKey];
  const uiConfig = field.uiConfig || {};
  const validation = field.validation || {};
  const options = field.options || [];
  const placeholder = uiConfig.placeholder || `Enter ${field.fieldLabel?.toLowerCase()}...`;
  const helpText = uiConfig.helpText;

  const inputClass = [
    "w-full bg-slate-50 border rounded-xl px-4 py-3 text-sm text-slate-900",
    "focus:outline-none focus:ring-2 transition-all placeholder:text-slate-400",
    isDisabled ? "opacity-60 cursor-not-allowed bg-slate-100" : "",
    isReadOnly ? "bg-amber-50/60 border-amber-200 cursor-default text-slate-700" : "",
    error
      ? "border-red-400 focus:ring-red-500/20 focus:border-red-500"
      : isReadOnly
      ? "focus:ring-amber-300/20"
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
        {isReadOnly && <span className="ml-2 text-xs font-normal text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">read-only</span>}
        {isDisabled && !calculationError && <span className="ml-2 text-xs font-normal text-slate-400 italic">(auto-calculated)</span>}
        {calculationError && (
          <span className="ml-2 text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded flex items-center gap-1 w-fit mt-1">
            <ShieldAlert size={10} /> Could not calculate value: {calculationError.reason}
          </span>
        )}
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
    case "SECTION":
      return (
        <div className="pt-2 pb-1">
          <div className="border-t-2 border-indigo-500 pt-5">
            <h3 className="text-lg font-bold text-slate-900">{field.fieldLabel}</h3>
            {uiConfig.helpText && <p className="text-sm text-slate-500 mt-1 leading-relaxed">{uiConfig.helpText}</p>}
          </div>
        </div>
      );

    case "LABEL":
      return (
        <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-5 py-4">
          <h4 className="text-sm font-bold text-indigo-900">{field.fieldLabel}</h4>
          {uiConfig.helpText && <p className="text-sm text-indigo-700 mt-1 leading-relaxed">{uiConfig.helpText}</p>}
        </div>
      );

    case "GROUP": {
      const children = allFields.filter((f) => f.parentId === field.fieldKey && !f.isDeleted);
      return (
        <div className={`p-6 rounded-2xl border-2 border-slate-200 bg-white shadow-sm transition-all duration-300 ${isDisabled ? "opacity-60 grayscale" : ""}`}>
          <div className="mb-6 pb-4 border-b border-slate-100">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <LayoutTemplate size={20} className="text-indigo-600" />
              {field.fieldLabel}
            </h3>
            {uiConfig.helpText && <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">{uiConfig.helpText}</p>}
          </div>
          <div className="space-y-8">
            {children.map((child) => {
              const childState = fieldStates[child.fieldKey] || { visible: true, disabled: false };
              if (childState.visible === false) return null;
              if (child.uiConfig?.hidden) return null;
              return (
                <div key={child.fieldKey} id={`field_${child.fieldKey}`}>
                  {renderInput(child, values, handleChange, fieldErrors[child.fieldKey], lookupData, childState.disabled || isDisabled, conditionallyRequiredFields.has(child.fieldKey), child.uiConfig?.readOnly === true, allFields, fieldStates, conditionallyRequiredFields, fieldErrors, childState.calculationError)}
                </div>
              );
            })}
            {children.length === 0 && <p className="text-xs text-slate-400 italic">No fields in this section.</p>}
          </div>
        </div>
      );
    }

    case "TEXT":
    case "EMAIL":
      return (
        <div>
          <FieldLabel />
          <input type={type === "EMAIL" ? "email" : "text"} className={inputClass}
            placeholder={placeholder} value={value || ""} disabled={isDisabled} readOnly={isReadOnly}
            onChange={(e) => !isReadOnly && handleChange(field.fieldKey, e.target.value)}
            title={validation.validationMessage || ""} minLength={validation.minLength} maxLength={validation.maxLength} pattern={validation.pattern} />
          <FieldError />
        </div>
      );

    case "TEXTAREA":
      return (
        <div>
          <FieldLabel />
          <textarea className={`${inputClass} resize-y min-h-[100px]`} rows={4}
            placeholder={placeholder} value={value || ""} disabled={isDisabled} readOnly={isReadOnly}
            minLength={validation.minLength} maxLength={validation.maxLength}
            onChange={(e) => !isReadOnly && handleChange(field.fieldKey, e.target.value)} />
          <FieldError />
        </div>
      );

    case "INTEGER":
      return (
        <div>
          <FieldLabel />
          <input type="number" onWheel={(e) => e.target.blur()} className={inputClass} placeholder={placeholder}
            value={value || ""} disabled={isDisabled} readOnly={isReadOnly}
            min={validation.min} max={validation.max} step="any"
            onChange={(e) => !isReadOnly && handleChange(field.fieldKey, e.target.value)} />
          <FieldError />
        </div>
      );

    case "DATE":
    case "TIME":
    case "DATETIME":
      return (
        <div>
          <FieldLabel />
          <input type={type === "DATETIME" ? "datetime-local" : type.toLowerCase()} className={`${inputClass} ${isReadOnly ? "" : "cursor-pointer"}`}
            value={value || ""} disabled={isDisabled} readOnly={isReadOnly}
            onChange={(e) => !isReadOnly && handleChange(field.fieldKey, e.target.value)} />
          <FieldError />
        </div>
      );

    case "PHONE":
      return (
        <div>
          <FieldLabel />
          <input type="tel" className={inputClass}
            placeholder={placeholder} value={value || ""} disabled={isDisabled} readOnly={isReadOnly}
            onChange={(e) => !isReadOnly && handleChange(field.fieldKey, e.target.value)} />
          <FieldError />
        </div>
      );

    case "RADIO":
      return (
        <div className={isDisabled ? "opacity-50 pointer-events-none" : ""}>
          <FieldLabel />
          <div className="space-y-3">
            {options.map((opt, idx) => (
              <label key={idx} className="flex items-center gap-3 cursor-pointer group">
                <input type="radio" name={field.fieldKey} value={opt} checked={value === opt} disabled={isDisabled}
                  onChange={(e) => handleChange(field.fieldKey, e.target.value)}
                  className="w-4 h-4 text-indigo-600 border-slate-300 focus:ring-indigo-500" />
                <span className="text-sm text-slate-700 group-hover:text-slate-900">{opt}</span>
              </label>
            ))}
          </div>
          <FieldError />
        </div>
      );

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

    case "DROPDOWN": {
      const mode = uiConfig.selectionMode || "single";
      return (
        <div className={isDisabled ? "opacity-50 pointer-events-none" : ""}>
          <FieldLabel />
          <CustomSelect 
            options={options}
            value={value}
            onChange={(updated) => handleChange(field.fieldKey, updated)}
            placeholder={uiConfig.placeholder}
            isDisabled={isDisabled}
            maxSelections={uiConfig.maxSelections}
            mode={mode}
          />
          <FieldError />
        </div>
      );
    }

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

    case "STAR_RATING": {
      const maxStars = uiConfig.maxStars || 5;
      return (
        <div className={isDisabled ? "opacity-50 pointer-events-none" : ""}>
          <FieldLabel />
          <div className="flex gap-2">
            {Array.from({ length: maxStars }).map((_, i) => {
              const n = i + 1;
              return (
                <button key={i} type="button" onClick={() => !isDisabled && handleChange(field.fieldKey, n)}
                  className="focus:outline-none transition-transform hover:scale-110 active:scale-95">
                  <Star size={32} className={n <= (value || 0) ? "text-amber-400 fill-amber-400" : "text-slate-300 fill-slate-100"} />
                </button>
              );
            })}
          </div>
          {(value || 0) > 0 && <p className="text-xs text-slate-500 mt-2">{value} / {maxStars} star{value > 1 ? "s" : ""}</p>}
          <FieldError />
        </div>
      );
    }

    case "LINEAR_SCALE": {
      const scaleMin = uiConfig.scaleMin ?? 1;
      const scaleMax = uiConfig.scaleMax ?? 5;
      const steps = Array.from({ length: scaleMax - scaleMin + 1 }, (_, i) => scaleMin + i);
      return (
        <div className={isDisabled ? "opacity-50 pointer-events-none" : ""}>
          <FieldLabel />
          <div className="space-y-3">
            <div className="flex gap-3 flex-wrap">
              {steps.map((val) => (
                <button key={val} type="button" onClick={() => !isDisabled && handleChange(field.fieldKey, val)}
                  className={`w-10 h-10 rounded-full border-2 text-sm font-semibold transition-all focus:outline-none ${value === val ? "bg-indigo-600 border-indigo-600 text-white shadow-md" : "bg-white border-slate-300 text-slate-600 hover:border-indigo-400"}`}>
                  {val}
                </button>
              ))}
            </div>
            {(uiConfig.lowLabel || uiConfig.highLabel) && (
              <div className="flex justify-between text-xs text-slate-500 px-1">
                <span>{uiConfig.lowLabel}</span><span>{uiConfig.highLabel}</span>
              </div>
            )}
          </div>
          <FieldError />
        </div>
      );
    }

    // ── File Upload — now uses api.uploadFile() instead of raw fetch() ────
    case "FILE_UPLOAD": {
      const acceptedTypes = uiConfig.acceptedFileTypes || [];
      const maxSizeMb = uiConfig.maxFileSizeMb || 5;
      const isUploading = value === "__uploading__";
      const isUploaded = value && value !== "__uploading__";

      const handleFileChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > maxSizeMb * 1024 * 1024) {
          toast.error(`File too large. Max size is ${maxSizeMb}MB.`);
          e.target.value = "";
          return;
        }
        handleChange(field.fieldKey, "__uploading__");
        try {
          const data = await api.uploadFile(file);
          handleChange(field.fieldKey, data.url);
        } catch {
          toast.error("File upload failed.");
          handleChange(field.fieldKey, "");
          e.target.value = "";
        }
      };

      return (
        <div className={isDisabled ? "opacity-50 pointer-events-none" : ""}>
          <FieldLabel />
          <label className={`flex flex-col items-center justify-center w-full border-2 border-dashed rounded-xl p-8 transition-all group ${error ? "border-red-400 bg-red-50/20" : isUploaded ? "border-green-400 bg-green-50 cursor-default" : "border-slate-300 hover:border-indigo-400 hover:bg-indigo-50/30 cursor-pointer"}`}>
            {isUploading ? (
              <><Loader2 size={28} className="text-indigo-500 animate-spin mb-3" /><p className="text-sm font-medium text-indigo-600">Uploading...</p></>
            ) : isUploaded ? (
              <>
                <CheckCircle2 size={28} className="text-green-500 mb-3" />
                <p className="text-sm font-medium text-green-700">File uploaded successfully</p>
                <p className="text-xs text-green-600 mt-1 truncate max-w-xs">{value.split("/").pop()}</p>
                <button type="button" onClick={(e) => { e.preventDefault(); handleChange(field.fieldKey, ""); }} className="mt-3 text-xs text-red-500 hover:text-red-700 underline">
                  Remove &amp; re-upload
                </button>
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

    case "MC_GRID": {
      const gridRows = validation?.rows || [];
      const gridCols = validation?.columns || [];
      const gridVal = value || {};
      return (
        <div className={isDisabled ? "opacity-50 pointer-events-none" : ""}>
          <FieldLabel />
          <div className={`overflow-x-auto rounded-xl border ${error ? "border-red-400" : "border-slate-200"}`}>
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="p-3 w-32"></th>
                  {gridCols.map((col, i) => <th key={i} className="p-3 text-center text-xs font-semibold text-slate-600">{col}</th>)}
                </tr>
              </thead>
              <tbody>
                {gridRows.map((row, ri) => (
                  <tr key={ri} className={`border-b border-slate-100 last:border-0 ${ri % 2 === 0 ? "" : "bg-slate-50/50"}`}>
                    <td className="p-3 text-sm font-medium text-slate-700">{row}</td>
                    {gridCols.map((col, ci) => (
                      <td key={ci} className="p-3 text-center">
                        <input type="radio" name={`${field.fieldKey}_${row}`} value={col}
                          checked={gridVal[row] === col} disabled={isDisabled}
                          onChange={() => handleChange(field.fieldKey, { ...gridVal, [row]: col })}
                          className="w-4 h-4 text-indigo-600 border-slate-300 cursor-pointer" />
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

    case "TICK_BOX_GRID": {
      const gridRows = validation?.rows || [];
      const gridCols = validation?.columns || [];
      const gridVal = value || {};
      return (
        <div className={isDisabled ? "opacity-50 pointer-events-none" : ""}>
          <FieldLabel />
          <div className={`overflow-x-auto rounded-xl border ${error ? "border-red-400" : "border-slate-200"}`}>
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="p-3 w-32"></th>
                  {gridCols.map((col, i) => <th key={i} className="p-3 text-center text-xs font-semibold text-slate-600">{col}</th>)}
                </tr>
              </thead>
              <tbody>
                {gridRows.map((row, ri) => {
                  const rowSel = Array.isArray(gridVal[row]) ? gridVal[row] : [];
                  return (
                    <tr key={ri} className={`border-b border-slate-100 last:border-0 ${ri % 2 === 0 ? "" : "bg-slate-50/50"}`}>
                      <td className="p-3 text-sm font-medium text-slate-700">{row}</td>
                      {gridCols.map((col, ci) => (
                        <td key={ci} className="p-3 text-center">
                          <input type="checkbox" checked={rowSel.includes(col)} disabled={isDisabled}
                            onChange={(e) => {
                              const updated = e.target.checked ? [...rowSel, col] : rowSel.filter((c) => c !== col);
                              handleChange(field.fieldKey, { ...gridVal, [row]: updated });
                            }}
                            className="w-4 h-4 rounded text-indigo-600 border-slate-300 cursor-pointer" />
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

    case "LOOKUP_DROPDOWN": {
      const opts = lookupData[field.fieldKey] || [];
      const mode = uiConfig.selectionMode || "single";

      return (
        <div className={isDisabled ? "opacity-50 pointer-events-none" : ""}>
          <FieldLabel />
          {lookupData[field.fieldKey] === undefined ? (
            <div className={`${inputClass} text-slate-400 flex items-center justify-center p-8 border-dashed`}>
              <Loader2 size={16} className="animate-spin mr-2" /> Loading options...
            </div>
          ) : (
            <CustomSelect 
              options={opts}
              value={value}
              onChange={(updated) => handleChange(field.fieldKey, updated)}
              placeholder={uiConfig.placeholder}
              isDisabled={isDisabled}
              maxSelections={uiConfig.maxSelections}
              mode={mode}
            />
          )}
          <FieldError />
        </div>
      );
    }

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

export default function DynamicFormPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-indigo-600" size={40} />
      </div>
    }>
      <FormPageContent />
    </Suspense>
  );
}