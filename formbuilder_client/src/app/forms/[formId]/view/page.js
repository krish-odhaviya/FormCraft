"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api/formService";
import {
  Loader2, Send, CheckCircle2, AlertCircle,
  ChevronDown, Star, Upload, LayoutTemplate, Lock,
  KeyRound, ShieldQuestion, HelpCircle
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useForms } from "@/context/FormsContext";
import { toast } from "react-hot-toast";

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
      case "equals": return fieldValue === String(rule.value);
      case "notEquals": return fieldValue !== String(rule.value);
      case "contains": return fieldValue.toLowerCase().includes(String(rule.value).toLowerCase());
      case "greaterThan": return Number(fieldValue) > Number(rule.value);
      case "lessThan": return Number(fieldValue) < Number(rule.value);
      case "isEmpty": return fieldValue.trim() === "";
      case "isNotEmpty": return fieldValue.trim() !== "";
      default: return false;
    }
  });

  const passed = cond.logic === "OR" ? results.some(Boolean) : results.every(Boolean);
  switch (cond.action) {
    case "show": return { visible: passed, disabled: false };
    case "hide": return { visible: !passed, disabled: false };
    case "enable": return { visible: true, disabled: !passed };
    case "disable": return { visible: true, disabled: passed };
    default: return { visible: true, disabled: false };
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

function FormPageContent() {
  const { formId } = useParams();
  const searchParams = useSearchParams();
  const isPreview = searchParams.get("preview") === "true";
  const router = useRouter();

  const [fields, setFields] = useState([]);
  const [formDetails, setFormDetails] = useState({});
  const [formValues, setFormValues] = useState({});
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [lookupData, setLookupData] = useState({});
  const [currentPage, setCurrentPage] = useState(0);

  // ── Permission & Request state ──
  const { user, isAuthenticated } = useAuth();
  const [accessRequested, setAccessRequested] = useState(false);
  const [requestReason, setRequestReason] = useState("");
  const [requestStatus, setRequestStatus] = useState(null); // 'pending', 'success', 'error'
  const [errorMessage, setErrorMessage] = useState("");
  const { showToast } = useForms();

  const formPages = useMemo(() => {
    const pages = [];
    let currentFields = [];
    fields.forEach((field) => {
      if (field.fieldType === "PAGE_BREAK") {
        pages.push(currentFields);
        currentFields = [];
      } else {
        currentFields.push(field);
      }
    });
    pages.push(currentFields);
    return pages;
  }, [fields]);

  // ── Evaluate conditions reactively ────────────────────────────────────────
  const { fieldStates, conditionallyRequiredFields } = useMemo(() => {
    const states = {};
    const requiredSet = new Set();

    fields.forEach((field) => {
      const parentId = field.parentId;
      let ownState;
      let cond;
      try { cond = field.conditions ? JSON.parse(field.conditions) : null; } catch { cond = null; }

      // SECTION and LABEL are always visible
      // GROUP must go through condition evaluation like any other field
      if (field.fieldType === "SECTION" || field.fieldType === "LABEL") {
        ownState = { visible: true, disabled: false };
      } else {
        if (cond?.action === "calculate" && cond.formula) {
          const calcValue = evaluateFormula(cond.formula, formValues);
          ownState = { visible: true, disabled: true, calculatedValue: calcValue };
        } else {
          ownState = evaluateConditions(field, formValues);
        }
      }

      states[field.fieldKey] = ownState;

      // ── Detect active REQUIRE actions ──
      if (cond?.actions?.length > 0 && cond?.rules?.length > 0) {
        const ruleResults = (cond.rules || []).map((rule) => {
          if (!rule.fieldKey) return false;
          const rawVal = formValues[rule.fieldKey];
          const fv = rawVal !== null && rawVal !== undefined ? String(rawVal) : "";
          switch (rule.operator) {
            case "equals": return fv === String(rule.value);
            case "notEquals": return fv !== String(rule.value);
            case "contains": return fv.toLowerCase().includes(String(rule.value).toLowerCase());
            case "greaterThan": return Number(fv) > Number(rule.value);
            case "lessThan": return Number(fv) < Number(rule.value);
            case "isEmpty": return fv.trim() === "";
            case "isNotEmpty": return fv.trim() !== "";
            default: return false;
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

    // ── Cascade visibility from parents to children ──
    const finalStates = { ...states };
    fields.forEach(field => {
      if (field.parentId) {
        const parentField = fields.find(f => f.fieldKey === field.parentId);
        if (parentField) {
          const parentState = states[parentField.fieldKey];
          if (parentState && parentState.visible === false) {
            finalStates[field.fieldKey] = { ...finalStates[field.fieldKey], visible: false };
          }
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
          .then((res) => {
            console.log(res)
            setLookupData((prev) => ({ ...prev, [field.fieldKey]: res.data || [] }))
          })
          .catch(console.error);
      }
    });
  }, [fields]);

  // ── Fetch form ────────────────────────────────────────────────────────────
  useEffect(() => {
    async function fetchFields() {
      try {
        const res = await api.getForm(formId);
        console.log(res)
        setFormDetails(res.data);

        if (!isPreview && res.data.status === "ARCHIVED") {
          setMessage("archived"); setLoading(false); return;
        }

        if (!isPreview && res.data.status !== "PUBLISHED") {
          setMessage("not_published"); setLoading(false); return;
        }

        const fieldsData = res.data.fields?.filter(f => !f.isDeleted) || [];
        setFields(fieldsData);

        const initialValues = {};
        fieldsData.forEach((field) => {
          if (field.fieldType === "SECTION" || field.fieldType === "LABEL") return;
          const defaultVal = field.uiConfig?.defaultValue;
          if (field.fieldType === "BOOLEAN") initialValues[field.fieldKey] = defaultVal === "true" ? true : false;
          else if (field.fieldType === "CHECKBOX_GROUP") initialValues[field.fieldKey] = [];
          else if (field.fieldType === "MC_GRID") {
            const rows = field.validation?.rows || [];
            const init = {}; rows.forEach((r) => (init[r] = ""));
            initialValues[field.fieldKey] = init;
          } else if (field.fieldType === "TICK_BOX_GRID") {
            const rows = field.validation?.rows || [];
            const init = {}; rows.forEach((r) => (init[r] = []));
            initialValues[field.fieldKey] = init;
          } else if (field.fieldType === "STAR_RATING") initialValues[field.fieldKey] = defaultVal ? parseInt(defaultVal) : 0;
          else if (field.fieldType === "LINEAR_SCALE") initialValues[field.fieldKey] = defaultVal || "";
          else initialValues[field.fieldKey] = defaultVal || "";
        });
        setFormValues(initialValues);
      } catch (err) {
        if (err.response?.status === 403) {
          setMessage("forbidden");
        } else if (err.response?.status === 401) {
          setMessage("unauthorized");
        } else {
          console.error("Failed to fetch form structure:", err);
          setMessage("error");
        }
      } finally {
        setLoading(false);
      }
    }
    if (formId) fetchFields().catch(() => { });
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

  // ── Submit & Navigation Logic ─────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage("");
    setFieldErrors({});

    // Filter out hidden fields

    const EXCLUDED_FIELD_TYPES = new Set(["SECTION", "LABEL", "PAGE_BREAK", "GROUP"]);
    const visibleValues = {};
    Object.keys(formValues).forEach((key) => {
      const state = fieldStates[key];
      const fieldDef = fields.find(f => f.fieldKey === key);
      if (state?.visible !== false && !EXCLUDED_FIELD_TYPES.has(fieldDef?.fieldType)) {
        visibleValues[key] = formValues[key];
      }
    });

    // ── Evaluate FormRuleDTO actions on client side (current page only) ───
    let customErrors = {};
    const fieldsToValidate = formPages[currentPage] || [];

    fieldsToValidate.forEach((field) => {
      if (!field.conditions) return;
      let cond;
      try { cond = typeof field.conditions === "string" ? JSON.parse(field.conditions) : field.conditions; }
      catch { return; }

      if (!cond.actions || cond.actions.length === 0) return;

      // ── Format validators — ALWAYS run regardless of outer conditions ──────
      // REGEX_MATCH and MATCH_FIELD are format validators that fire unconditionally.
      cond.actions.forEach(action => {
        if (action.type === "REGEX_MATCH") {
          const target = action.targetField;
          const pattern = action.value;
          if (target && pattern) {
            const targetVal = visibleValues[target] ? String(visibleValues[target]).trim() : "";
            if (targetVal.length > 0) {
              try {
                const regex = new RegExp(pattern);
                if (!regex.test(targetVal)) {
                  customErrors[target] = action.message && action.message.trim() !== ""
                    ? action.message
                    : `'${target}' is not in a valid format.`;
                }
              } catch (e) { /* Ignore invalid regex pattern */ }
            }
          }
        } else if (action.type === "MATCH_FIELD") {
          const target = action.targetField;
          const matchTarget = action.value;
          if (target && matchTarget) {
            const targetVal = visibleValues[target] ? String(visibleValues[target]) : "";
            const matchVal = visibleValues[matchTarget] ? String(visibleValues[matchTarget]) : "";
            if (targetVal.length > 0 || matchVal.length > 0) {
              if (targetVal !== matchVal) {
                customErrors[target] = action.message && action.message.trim() !== ""
                  ? action.message
                  : `Fields do not match.`;
              }
            }
          }
        }
      });

      // ── Conditional validators — only run when rule conditions pass ────────
      if (!cond.rules || cond.rules.length === 0) return;

      const results = cond.rules.map((rule) => {
        if (!rule.fieldKey) return false;
        const rawVal = visibleValues[rule.fieldKey]; // evaluate against visible only? Or all? Let's use visible for accuracy with server
        const fieldValue = rawVal !== null && rawVal !== undefined ? String(rawVal) : "";
        switch (rule.operator) {
          case "equals": return fieldValue === String(rule.value);
          case "notEquals": return fieldValue !== String(rule.value);
          case "contains": return fieldValue.toLowerCase().includes(String(rule.value).toLowerCase());
          case "greaterThan": return Number(fieldValue) > Number(rule.value);
          case "lessThan": return Number(fieldValue) < Number(rule.value);
          case "isEmpty": return fieldValue.trim() === "";
          case "isNotEmpty": return fieldValue.trim() !== "";
          default: return false;
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
          } else if (action.type === "MIN_VALUE") {
            const target = action.targetField;
            const minVal = parseFloat(action.value);
            if (target && !isNaN(minVal)) {
              const targetVal = visibleValues[target];
              if (targetVal !== undefined && targetVal !== null && String(targetVal).trim() !== "") {
                const numVal = parseFloat(targetVal);
                if (!isNaN(numVal) && numVal < minVal) {
                  customErrors[target] = action.message && action.message.trim() !== ""
                    ? action.message
                    : `'${target}' must be at least ${minVal}.`;
                }
              }
            }
          } else if (action.type === "MAX_VALUE") {
            const target = action.targetField;
            const maxVal = parseFloat(action.value);
            if (target && !isNaN(maxVal)) {
              const targetVal = visibleValues[target];
              if (targetVal !== undefined && targetVal !== null && String(targetVal).trim() !== "") {
                const numVal = parseFloat(targetVal);
                if (!isNaN(numVal) && numVal > maxVal) {
                  customErrors[target] = action.message && action.message.trim() !== ""
                    ? action.message
                    : `'${target}' cannot exceed ${maxVal}.`;
                }
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

    if (currentPage < formPages.length - 1) {
      setCurrentPage((prev) => prev + 1);
      setSubmitting(false);
      if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    // FINAL SUBMISSION ACTION
    if (isPreview) {
      toast.error("This is a preview mode. Submissions are disabled.");
      setSubmitting(false);
      return;
    }

    // ────────────────────────────────────────────────────────────────────────

    try {
      const resp = await api.submitForm(formId, visibleValues);

      if (formDetails.canViewSubmissions) {
        showToast("Form submitted successfully!");
        router.push(`/forms/${formId}/submissions`);
      } else {
        showToast("Success! Your response has been recorded.");
        setMessage("success");
        if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } catch (err) {
      console.error(err);
      if (err.response?.status === 400 && Array.isArray(err.response.data?.errors)) {
        const errorsMap = {};
        err.response.data.errors.forEach((e) => { errorsMap[e.field] = e.message; });
        setFieldErrors(errorsMap);
        const firstKey = Object.keys(errorsMap)[0];
        const el = document.getElementById(`field_${firstKey}`);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      } else {
        const msg = err.response?.data?.message || "Submission Failed. Please try again.";
        setErrorMessage(msg);
        setMessage("error");
      }
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

  const handleRequestAccess = async () => {
    setRequestStatus('pending');
    try {
      await api.createAccessRequest(formId, 'VIEW_FORM', requestReason);
      setRequestStatus('success');
      setAccessRequested(true);
    } catch (err) {
      console.error(err);
      if (err.response?.data?.message) {
        setErrorMessage(err.response.data.message);
      } else {
        setErrorMessage("Failed to submit request. Please try again.");
      }
      setRequestStatus('error');
    }
  };

  if (message === "unauthorized") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-xl p-10 max-w-md w-full text-center border border-slate-200">
          <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <Lock size={32} className="text-indigo-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-3">Login Required</h2>
          <p className="text-slate-500 mb-8">
            This form is restricted to authenticated users. Please log in to view and submit this form.
          </p>
          <button
            onClick={() => router.push(`/login?redirect=/forms/${formId}/view`)}
            className="w-full bg-indigo-600 text-white px-8 py-4 rounded-2xl text-base font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-600/20 transition-all active:scale-[0.98]"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  if (message === "forbidden") {
    return (
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
                You do not have permission to access <strong>{formId}</strong>. This form is restricted to specific users or groups.
              </p>

              {!accessRequested ? (
                <div className="space-y-4 text-left">
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Request access to this form
                  </label>
                  <textarea
                    placeholder="Briefly explain why you need access..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all min-h-[120px]"
                    value={requestReason}
                    onChange={(e) => setRequestReason(e.target.value)}
                  />
                  <button
                    onClick={handleRequestAccess}
                    disabled={requestStatus === 'pending' || !requestReason.trim()}
                    className="w-full bg-indigo-600 text-white px-8 py-4 rounded-2xl text-base font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-600/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {requestStatus === 'pending' ? <Loader2 className="animate-spin" size={20} /> : <KeyRound size={20} />}
                    Submit Access Request
                  </button>
                  {requestStatus === 'error' && (
                    <p className="text-red-500 text-sm text-center font-medium">Failed to submit request. Please try again.</p>
                  )}
                </div>
              ) : (
                <div className="bg-green-50 border border-green-100 rounded-2xl p-6 text-center">
                  <CheckCircle2 size={32} className="text-green-500 mx-auto mb-3" />
                  <p className="text-green-800 font-bold mb-1">Request Submitted</p>
                  <p className="text-green-700 text-sm">
                    Your request has been sent to the form administrator. You'll be notified once it's processed.
                  </p>
                  <button
                    onClick={() => router.push("/")}
                    className="mt-6 text-sm font-bold text-indigo-600 hover:text-indigo-700 underline"
                  >
                    Back to Home
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const hasErrors = Object.keys(fieldErrors).length > 0;

  return (
    <div className="min-h-screen bg-slate-50/50 py-12 px-4 sm:px-6 flex justify-center">
      <div className="w-full max-w-3xl space-y-6">

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 border-t-4 border-t-indigo-600 p-8 sm:p-10">
          {isPreview && (
            <div className="mb-6 bg-amber-50 text-amber-800 border border-amber-200 px-4 py-3 rounded-xl text-sm font-medium flex items-center justify-center">
              Preview Mode - This is a preview of the latest form version. Submissions cannot be saved.
            </div>
          )}
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">{formDetails.name || "Untitled Form"}</h1>
          {formDetails.description && <p className="text-slate-600 mt-3 leading-relaxed">{formDetails.description}</p>}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 sm:p-10">

          {message === "archived" && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center mb-6">
                <AlertCircle size={32} className="text-red-500" />
              </div>
              <h1 className="text-2xl font-black text-slate-900 mb-3">Form Archived</h1>
              <p className="text-slate-500 mb-8 max-w-xs">
                This form has been archived by the administrator and is no longer accepting submissions.
              </p>
              <button
                onClick={() => router.push("/")}
                className="bg-slate-900 text-white px-8 py-3 rounded-2xl text-sm font-bold hover:bg-slate-800 transition-all transition-all"
              >
                Return Home
              </button>
            </div>
          )}

          {message === "success" && (
            <div className="flex flex-col items-center justify-center py-10 text-center animate-in fade-in zoom-in duration-500">
              <div className="w-24 h-24 bg-green-50 rounded-[40px] flex items-center justify-center mb-8 shadow-inner shadow-green-100/50">
                <CheckCircle2 size={48} className="text-green-500" />
              </div>
              <h2 className="text-3xl font-black text-slate-900 mb-4 tracking-tight">Thank You!</h2>
              <p className="text-slate-500 text-lg mb-10 max-w-sm leading-relaxed">
                Your response has been successfully recorded. We appreciate your feedback.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 w-full max-w-sm">
                <button
                  onClick={() => window.location.reload()}
                  className="flex-1 bg-white border-2 border-slate-100 text-slate-700 px-8 py-4 rounded-2xl text-sm font-bold hover:bg-slate-50 transition-all active:scale-[0.98]"
                >
                  Submit Another Response
                </button>
                <button
                  onClick={() => router.push("/")}
                  className="flex-1 bg-indigo-600 text-white px-8 py-4 rounded-2xl text-sm font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all active:scale-[0.98]"
                >
                  Return Home
                </button>
              </div>
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
                  Please fix {Object.keys(fieldErrors).length} error{Object.keys(fieldErrors).length > 1 ? "s" : ""} before submitting:
                </strong>
                <ul className="list-disc list-inside space-y-1 text-red-800">
                  {Object.values(fieldErrors).map((err, i) => <li key={i}>{err}</li>)}
                </ul>
              </div>
            </div>
          )}

          {(fields.length === 0 && message !== "success") ? (
            <div className="text-center py-10"><p className="text-slate-500">This form is currently empty.</p></div>
          ) : message !== "success" ? (
            <form onSubmit={handleSubmit} className="space-y-8">
              {formPages.length > 1 && (
                <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
                  {formPages.map((_, idx) => (
                    <div key={idx} className={`h-1.5 flex-1 rounded-full bg-indigo-600 transition-all ${idx <= currentPage ? 'opacity-100' : 'opacity-10'}`} />
                  ))}
                </div>
              )}

              <div className="space-y-8">
                {(formPages[currentPage] || []).filter(f => !f.parentId).map((field) => {
                  const state = fieldStates[field.fieldKey] || { visible: true, disabled: false };
                  if (state.visible === false) return null;
                  if (field.uiConfig?.hidden) return null;

                  const isCondRequired = conditionallyRequiredFields.has(field.fieldKey);
                  const isReadOnly = field.uiConfig?.readOnly === true;
                  return (
                    <div key={field.fieldKey} id={`field_${field.fieldKey}`} className="transition-all duration-300">
                      {renderInput(field, formValues, handleChange, fieldErrors[field.fieldKey], lookupData, state.disabled, isCondRequired, isReadOnly, fields, fieldStates, conditionallyRequiredFields, fieldErrors)}
                    </div>
                  );
                })}
              </div>

              {fields.length > 0 && (
                <div className="pt-6 mt-8 border-t border-slate-100 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    {currentPage > 0 ? (
                      <button type="button" onClick={() => { setCurrentPage((p) => p - 1); if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" }); }}
                        className="px-6 py-3 rounded-xl border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 transition-colors text-sm"
                      >
                        Previous
                      </button>
                    ) : (
                      isPreview && (
                        <button type="button" onClick={() => router.push(`/forms/${formId}/builder`)} className="px-6 py-3 rounded-xl border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 transition-colors text-sm">
                          Close Preview
                        </button>
                      )
                    )}
                  </div>

                  <button type="submit" disabled={submitting || message === "success" || (isPreview && currentPage === formPages.length - 1)}
                    className={`flex items-center gap-2 px-8 py-3 rounded-xl text-sm font-medium shadow-sm transition-all ${(isPreview && currentPage === formPages.length - 1)
                      ? "bg-slate-200 text-slate-500 cursor-not-allowed"
                      : "bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed text-white"
                      }`}>
                    {submitting ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                    {currentPage < formPages.length - 1 ? "Next Step" : (isPreview ? "Submit Disabled" : submitting ? "Submitting..." : "Submit Form")}
                  </button>
                </div>
              )}
            </form>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// renderInput — isDisabled added for conditional enable/disable
// ─────────────────────────────────────────────────────────────────────────────
function renderInput(field, values, handleChange, error = null, lookupData = {}, isDisabled = false, isConditionallyRequired = false, isReadOnly = false, allFields = [], fieldStates = {}, conditionallyRequiredFields = new Set(), fieldErrors = {}) {
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
    error ? "border-red-400 focus:ring-red-500/20 focus:border-red-500"
      : isReadOnly ? "focus:ring-amber-300/20"
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

    // ── GROUP ───────────────────────────────────────────────────────
    case "GROUP": {
      // Filter children using stable fieldKey linkage
      const children = allFields.filter(f => f.parentId === field.fieldKey && !f.isDeleted);
      return (
        <div className={`p-6 rounded-2xl border-2 border-slate-200 bg-white shadow-sm transition-all duration-300 ${isDisabled ? "opacity-60 grayscale" : ""}`}>
          <div className="mb-6 pb-4 border-b border-slate-100">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <LayoutTemplate size={20} className="text-indigo-600" />
              {uiConfig.title || field.fieldLabel}
            </h3>
            {uiConfig.description && <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">{uiConfig.description}</p>}
          </div>

          <div className="space-y-8">
            {children.map(child => {
              const childState = fieldStates[child.fieldKey] || { visible: true, disabled: false };
              if (childState.visible === false) return null;
              if (child.uiConfig?.hidden) return null;

              const isCondReq = conditionallyRequiredFields.has(child.fieldKey);
              const isReadOnly = child.uiConfig?.readOnly === true;
              return (
                <div key={child.fieldKey} id={`field_${child.fieldKey}`}>
                  {renderInput(child, values, handleChange, fieldErrors[child.fieldKey], lookupData, childState.disabled || isDisabled, isCondReq, isReadOnly || child.uiConfig?.readOnly === true, allFields, fieldStates, conditionallyRequiredFields, fieldErrors)}
                </div>
              );
            })}
            {children.length === 0 && <p className="text-xs text-slate-400 italic">No fields in this section.</p>}
          </div>
        </div>
      );
    }

    // ── Text / Email ──────────────────────────────────────────────────────────
    case "TEXT":
    case "EMAIL":
      return (
        <div>
          <FieldLabel />
          <input type={type === "EMAIL" ? "email" : "text"} className={inputClass}
            placeholder={placeholder} value={value || ""} disabled={isDisabled}
            readOnly={isReadOnly}
            onChange={(e) => !isReadOnly && handleChange(field.fieldKey, e.target.value)}
            title={validation.validationMessage || ""}
            minLength={validation.minLength}
            maxLength={validation.maxLength}
            pattern={validation.pattern} />
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
            readOnly={isReadOnly}
            minLength={validation.minLength}
            maxLength={validation.maxLength}
            onChange={(e) => !isReadOnly && handleChange(field.fieldKey, e.target.value)} />
          <FieldError />
        </div>
      );

    // ── Integer / Decimal ─────────────────────────────────────────────────────
    case "INTEGER": {
      const fmt = field.validation?.numberFormat || "INTEGER";
      return (
        <div>
          <FieldLabel />
          <input
            type="number"
            className={inputClass}
            placeholder={placeholder}
            value={value || ""}
            disabled={isDisabled}
            readOnly={isReadOnly}
            min={validation.min}
            max={validation.max}
            step={fmt === "DECIMAL" ? "any" : "1"}
            onChange={(e) => !isReadOnly && handleChange(field.fieldKey, e.target.value)}
          />
          <FieldError />
        </div>
      );
    }

    // ── Date / Time ───────────────────────────────────────────────────────────
    case "DATE":
    case "TIME":
      return (
        <div>
          <FieldLabel />
          <input type={type.toLowerCase()} className={`${inputClass} ${isReadOnly ? "" : "cursor-pointer"}`}
            value={value || ""} disabled={isDisabled}
            readOnly={isReadOnly}
            onChange={(e) => !isReadOnly && handleChange(field.fieldKey, e.target.value)} />
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
      const maxStars = uiConfig.maxStars || 5;
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
      const scaleMin = uiConfig.scaleMin ?? 1;
      const scaleMax = uiConfig.scaleMax ?? 5;
      const lowLabel = uiConfig.lowLabel || "";
      const highLabel = uiConfig.highLabel || "";
      const steps = Array.from({ length: scaleMax - scaleMin + 1 }, (_, i) => scaleMin + i);
      return (
        <div className={isDisabled ? "opacity-50 pointer-events-none" : ""}>
          <FieldLabel />
          <div className="space-y-3">
            <div className="flex gap-3 flex-wrap">
              {steps.map((val) => (
                <button key={val} type="button" onClick={() => !isDisabled && handleChange(field.fieldKey, val)}
                  className={`w-10 h-10 rounded-full border-2 text-sm font-semibold transition-all focus:outline-none ${value === val ? "bg-indigo-600 border-indigo-600 text-white shadow-md"
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
      const maxSizeMb = uiConfig.maxFileSizeMb || 5;
      const isUploading = value === "__uploading__";
      const isUploaded = value && value !== "__uploading__";

      const handleFileChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > maxSizeMb * 1024 * 1024) { toast.error(`File too large. Max size is ${maxSizeMb}MB.`); e.target.value = ""; return; }
        handleChange(field.fieldKey, "__uploading__");
        try {
          const fd = new FormData();
          fd.append("file", file);
          const res = await fetch("http://localhost:9090/api/forms/upload", { method: "POST", body: fd });
          if (!res.ok) throw new Error("Upload failed");
          const data = await res.json();
          handleChange(field.fieldKey, data.url);
        } catch (err) {
          console.error(err); toast.error("File upload failed.");
          handleChange(field.fieldKey, ""); e.target.value = "";
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
      const rows = field.validation?.rows || [];
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
      const rows = field.validation?.rows || [];
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

export default function DynamicFormPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-indigo-600" size={40} /></div>}>
      <FormPageContent />
    </Suspense>
  );
}