"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  Type, AlignLeft, Hash, Calendar, Clock, CircleDot,
  ListTodo, ChevronDown, ToggleRight, Mail, GripVertical,
  Trash2, Rocket, Save, Plus, Settings2, ClipboardList,
  ArrowLeft, LayoutTemplate, X, ShieldCheck, MonitorPlay,
  Lock, Star, SlidersHorizontal, LayoutGrid, Grid3x3, Upload,
  Link2, Heading1, AlignLeft as AlignLeftIcon, GitBranch,
  History, CheckCircle2, Archive, FilePen, ChevronDown as ChevronDownIcon,
  Loader2, ExternalLink, BookOpen
} from "lucide-react";

import { api } from "@/lib/api/formService";
import { useForms } from "@/context/FormsContext";

const FIELD_TYPES = [
  { value: "TEXT",           label: "Short Answer",          icon: <Type size={18} /> },
  { value: "TEXTAREA",       label: "Paragraph",             icon: <AlignLeft size={18} /> },
  { value: "RADIO",          label: "Multiple Choice",       icon: <CircleDot size={18} /> },
  { value: "CHECKBOX_GROUP", label: "Checkboxes",            icon: <ListTodo size={18} /> },
  { value: "DROPDOWN",       label: "Dropdown",              icon: <ChevronDown size={18} /> },
  { value: "INTEGER",        label: "Number",                icon: <Hash size={18} /> },
  { value: "EMAIL",          label: "Email",                 icon: <Mail size={18} /> },
  { value: "DATE",           label: "Date",                  icon: <Calendar size={18} /> },
  { value: "TIME",           label: "Time",                  icon: <Clock size={18} /> },
  { value: "BOOLEAN",        label: "Yes/No (Toggle)",       icon: <ToggleRight size={18} /> },
  { value: "FILE_UPLOAD",    label: "File Upload",           icon: <Upload size={18} /> },
  { value: "STAR_RATING",    label: "Star Rating",           icon: <Star size={18} /> },
  { value: "LINEAR_SCALE",   label: "Linear Scale",          icon: <SlidersHorizontal size={18} /> },
  { value: "MC_GRID",        label: "Multiple Choice Grid",  icon: <LayoutGrid size={18} /> },
  { value: "TICK_BOX_GRID",  label: "Tick Box Grid",         icon: <Grid3x3 size={18} /> },
  { value: "LOOKUP_DROPDOWN",label: "Linked Dropdown",       icon: <Link2 size={18} /> },
  { value: "SECTION",        label: "Section Break",         icon: <Heading1 size={18} /> },
  { value: "LABEL",          label: "Label / Info",          icon: <AlignLeftIcon size={18} /> },
  { value: "PAGE_BREAK",     label: "Page Break",            icon: <BookOpen size={18} /> },
];

const OPTIONS_BASED_TYPES = ["RADIO", "CHECKBOX_GROUP", "DROPDOWN"];
const TEXT_BASED_TYPES    = ["TEXT", "TEXTAREA", "EMAIL"];
const NUMBER_BASED_TYPES  = ["INTEGER"];
const GRID_TYPES          = ["MC_GRID", "TICK_BOX_GRID"];

const OPERATORS = [
  { value: "equals",      label: "equals" },
  { value: "notEquals",   label: "not equals" },
  { value: "contains",    label: "contains" },
  { value: "greaterThan", label: "greater than" },
  { value: "lessThan",    label: "less than" },
  { value: "isEmpty",     label: "is empty" },
  { value: "isNotEmpty",  label: "is not empty" },
];

const CONDITION_ACTIONS = [
  { value: "show",      label: "Show" },
  { value: "hide",      label: "Hide" },
  { value: "enable",    label: "Enable" },
  { value: "disable",   label: "Disable" },
  { value: "calculate", label: "Calculate (auto-fill)" },
  { value: "noop",      label: "Always Show (Evaluate Business Rules Only)" },
];

export default function BuilderPage() {
  const router = useRouter();
  const params = useParams();
  const formId = Array.isArray(params.formId) ? params.formId[0] : params.formId;

  const { getForm, setFormFromServer, updateVersion } = useForms();
  const form = getForm(formId);

  const [loading, setLoading]               = useState(true);
  const [publishing, setPublishing]         = useState(false);
  const [saving, setSaving]                 = useState(false);
  const [localFields, setLocalFields]       = useState([]);
  const [activeFieldId, setActiveFieldId]   = useState(null);
  const [publishedForms, setPublishedForms] = useState([]);
  const [activeTab, setActiveTab]           = useState('settings');
  const [versions, setVersions]             = useState([]);
  const [creatingVersion, setCreatingVersion] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);

  // ── Fetch published forms for LOOKUP_DROPDOWN ─────────────────────────────
  useEffect(() => {
    api.getAllPublishedForms()
      .then((res) => setPublishedForms(res?.data || []))
      .catch(console.error);
  }, []);

  // ── Fetch form + version history ──────────────────────────────────────────
  useEffect(() => {
    const fetchForm = async () => {
      try {
        const [formRes, versionsRes] = await Promise.all([
          api.getForm(formId),
          api.getFormVersions(formId),
        ]);
        setFormFromServer(formRes.data);
        const draft = formRes.data.versions?.find((v) => v.status === "DRAFT");
        setLocalFields(draft?.fields || []);
        setVersions(versionsRes?.data || []);
      } catch (err) {
        console.error("Failed to fetch form:", err);
      } finally {
        setLoading(false);
      }
    };
    if (formId) fetchForm();
  }, [formId]);

  // ── Conditions helpers ────────────────────────────────────────────────────
  const parseConditions = (field) => {
    if (!field?.conditions) return { action: "show", logic: "AND", rules: [], actions: [] };
    try { 
      const parsed = JSON.parse(field.conditions); 
      return { ...parsed, actions: parsed.actions || [] };
    }
    catch { return { action: "show", logic: "AND", rules: [], actions: [] }; }
  };

  const saveConditions = (fieldId, condObj) => {
    updateLocalField(fieldId, "conditions", JSON.stringify(condObj));
  };

  // ── Derived state ─────────────────────────────────────────────────────────
  const draft           = form?.versions?.find((v) => v.status === "DRAFT");
  const publishedVersion = form?.versions?.find((v) => v.status === "PUBLISHED");

  // ── Helpers ───────────────────────────────────────────────────────────────
  const generateFieldKey = (label, order) =>
    (label || "field").toLowerCase().trim()
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9_]/g, "") + "_" + order;

  const createNewField = (type, order) => {
    const isOptionsBased = OPTIONS_BASED_TYPES.includes(type);
    const isGrid = GRID_TYPES.includes(type);
    return {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
      fieldLabel: `New ${type.toLowerCase().replace(/_/g, " ")}`,
      fieldType: type,
      required: false,
      fieldOrder: order,
      options: isOptionsBased ? ["Option 1"] : null,
      validation: isGrid ? { rows: ["Row 1", "Row 2"], columns: ["Column 1", "Column 2"] } : {},
      uiConfig:
        type === "STAR_RATING"      ? { maxStars: 5 }
        : type === "LINEAR_SCALE"   ? { scaleMin: 1, scaleMax: 5, lowLabel: "Not likely", highLabel: "Very likely" }
        : type === "FILE_UPLOAD"    ? { acceptedFileTypes: [".pdf", ".png", ".jpg"], maxFileSizeMb: 5 }
        : type === "LOOKUP_DROPDOWN"? { sourceTable: "", sourceColumn: "id", sourceDisplayColumn: "" }
        : type === "SECTION"        ? { title: "New Section", description: "" }
        : type === "LABEL"          ? { title: "Label Title", description: "" }
        : {},
      conditions: null,
    };
  };

  // ── Drag handlers ─────────────────────────────────────────────────────────
  const handleSidebarDragStart = (e, type) => e.dataTransfer.setData("newFieldType", type);
  const handleFieldDragStart   = (e, index) => e.dataTransfer.setData("existingFieldIndex", index);
  const handleDragOver         = (e) => e.preventDefault();

  const handleDropOnCanvas = (e) => {
    e.preventDefault();
    const newFieldType = e.dataTransfer.getData("newFieldType");
    if (newFieldType) {
      const newField = createNewField(newFieldType, localFields.length + 1);
      setLocalFields((prev) => [...prev, newField]);
      setActiveFieldId(newField.id);
    }
  };

  const handleDropOnField = (e, targetIndex) => {
    e.preventDefault();
    e.stopPropagation();
    const newFieldType        = e.dataTransfer.getData("newFieldType");
    const existingFieldIndex  = e.dataTransfer.getData("existingFieldIndex");
    const newFields = [...localFields];

    if (newFieldType) {
      const newField = createNewField(newFieldType, targetIndex + 1);
      newFields.splice(targetIndex, 0, newField);
      setLocalFields(newFields);
      setActiveFieldId(newField.id);
    } else if (existingFieldIndex !== "") {
      const fromIndex = Number(existingFieldIndex);
      if (fromIndex === targetIndex) return;
      const [movedField] = newFields.splice(fromIndex, 1);
      newFields.splice(targetIndex, 0, movedField);
      setLocalFields(newFields);
    }
  };

  // ── Field updaters ────────────────────────────────────────────────────────
  const updateLocalField = (id, key, value) =>
    setLocalFields((prev) => prev.map((f) => (f.id === id ? { ...f, [key]: value } : f)));

  const updateNestedObject = (id, parentKey, childKey, value) =>
    setLocalFields((prev) =>
      prev.map((f) => {
        if (f.id !== id) return f;
        const newObj = { ...(f[parentKey] || {}) };
        if (value === "" && typeof value !== "boolean") delete newObj[childKey];
        else newObj[childKey] = value;
        return { ...f, [parentKey]: newObj };
      })
    );

  const deleteLocalField = (id, e) => {
    e.stopPropagation();
    setLocalFields((prev) => prev.filter((f) => f.id !== id));
    if (activeFieldId === id) setActiveFieldId(null);
  };

  // ── Option helpers ────────────────────────────────────────────────────────
  const addOption = (fieldId) =>
    setLocalFields((prev) =>
      prev.map((f) =>
        f.id === fieldId
          ? { ...f, options: [...(f.options || []), `Option ${(f.options?.length || 0) + 1}`] }
          : f
      )
    );

  const updateOption = (fieldId, index, newValue) =>
    setLocalFields((prev) =>
      prev.map((f) => {
        if (f.id !== fieldId) return f;
        const newOptions = [...f.options];
        newOptions[index] = newValue;
        return { ...f, options: newOptions };
      })
    );

  const deleteOption = (fieldId, index) =>
    setLocalFields((prev) =>
      prev.map((f) =>
        f.id === fieldId ? { ...f, options: f.options.filter((_, i) => i !== index) } : f
      )
    );

  // ── Save / Publish ────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    const payload = localFields.map((field, index) => ({
      fieldKey:   generateFieldKey(field.fieldLabel, index + 1),
      fieldLabel: field.fieldLabel,
      fieldType:  field.fieldType,
      required:   field.required || false,
      fieldOrder: index + 1,
      options:    field.options || [],
      validation: {
        ...(field.validation || {}),
        rows:    field.validation?.rows    || [],
        columns: field.validation?.columns || [],
      },
      uiConfig:   { ...(field.uiConfig || {}) },
      conditions: field.conditions || null,   // ✅ persist conditions
    }));
    try {
      await api.saveDraft(draft.id, payload);
      alert("Draft saved successfully!");
    } catch (e) {
      console.error(e);
      alert("Failed to save draft.");
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (localFields.length === 0) return alert("Add at least one field before publishing");
    setPublishing(true);
    try {
      await api.publishVersion(draft.id);
      updateVersion(form.id, draft.id, { status: "PUBLISHED" });
      router.push("/");
    } catch {
      alert("Publish failed");
      setPublishing(false);
    }
  };

  // ── Early returns ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-50">
        <div className="animate-spin h-10 w-10 border-4 border-indigo-600 border-t-transparent rounded-full mb-4"></div>
        <p className="text-slate-500 font-medium text-sm">Loading Builder...</p>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-50">
        <h2 className="text-xl font-bold text-slate-800">Form not found</h2>
        <Link href="/" className="text-indigo-600 hover:underline mt-2">Return to Dashboard</Link>
      </div>
    );
  }

  // ── "Form is Published" screen — create new version or view history ────────
  if (!draft && publishedVersion) {
    const statusColor = (s) =>
      s === 'PUBLISHED' ? '#16a34a' :
      s === 'DRAFT'     ? '#d97706' : '#64748b';
    const statusBg = (s) =>
      s === 'PUBLISHED' ? '#f0fdf4' :
      s === 'DRAFT'     ? '#fffbeb' : '#f8fafc';
    const StatusIcon = ({ s }) =>
      s === 'PUBLISHED' ? <CheckCircle2 size={12} /> :
      s === 'DRAFT'     ? <FilePen size={12} /> :
                          <Archive size={12} />;

    const handleCreateNewVersion = async () => {
      setCreatingVersion(true);
      try {
        await api.createNewVersion(formId);
        // Version created — reload opens the builder with the new draft
        window.location.reload();
      } catch (err) {
        alert(err?.response?.data?.message || "Failed to create new version");
        setCreatingVersion(false);
      }
    };

    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 max-w-lg w-full overflow-hidden">

          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-8 py-8 text-white">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <CheckCircle2 size={20} />
              </div>
              <div>
                <h1 className="text-xl font-bold">Form is Live</h1>
                <p className="text-indigo-200 text-sm">{form?.name}</p>
              </div>
            </div>
            <p className="text-indigo-100 text-sm leading-relaxed">
              This form is collecting responses. Create a new version to make edits
              without interrupting existing submissions.
            </p>
          </div>

          {/* Actions */}
          <div className="p-6 space-y-3">
            <button
              onClick={handleCreateNewVersion}
              disabled={creatingVersion}
              className="flex items-center justify-center w-full gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white px-5 py-3.5 rounded-xl font-semibold transition-colors"
            >
              {creatingVersion
                ? <><Loader2 size={18} className="animate-spin" /> Creating new version...</>
                : <><GitBranch size={18} /> Create New Version (v{versions.length + 1})</>
              }
            </button>

            <Link
              href={`/forms/${formId}/submissions`}
              className="flex items-center justify-center w-full gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-5 py-3 rounded-xl font-medium transition-colors"
            >
              <ClipboardList size={18} /> View Submissions
            </Link>

            <Link
              href={`/forms/${formId}/view`}
              target="_blank"
              className="flex items-center justify-center w-full gap-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-5 py-3 rounded-xl font-medium transition-colors"
            >
              <ExternalLink size={18} /> View Live Form
            </Link>

            <Link
              href="/"
              className="flex items-center justify-center w-full gap-2 text-slate-400 hover:text-slate-600 px-5 py-2 rounded-xl text-sm transition-colors"
            >
              <ArrowLeft size={16} /> Return to Dashboard
            </Link>
          </div>

          {/* Version History */}
          <div className="border-t border-slate-100">
            <button
              onClick={() => setShowVersionHistory(v => !v)}
              className="w-full flex items-center justify-between px-6 py-4 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <span className="flex items-center gap-2">
                <History size={16} /> Version History ({versions.length})
              </span>
              <ChevronDownIcon
                size={16}
                className={`transition-transform ${showVersionHistory ? 'rotate-180' : ''}`}
              />
            </button>

            {showVersionHistory && (
              <div className="px-6 pb-6 space-y-2">
                {versions.slice().reverse().map((v) => (
                  <div
                    key={v.id}
                    className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold"
                        style={{ background: statusBg(v.status), color: statusColor(v.status) }}
                      >
                        v{v.versionNumber}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span
                            className="text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1"
                            style={{ background: statusBg(v.status), color: statusColor(v.status) }}
                          >
                            <StatusIcon s={v.status} />
                            {v.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {v.fieldCount} field{v.fieldCount !== 1 ? 's' : ''}
                          {v.publishedAt && ` · Published ${new Date(v.publishedAt).toLocaleDateString()}`}
                        </p>
                      </div>
                    </div>
                    {v.status === 'PUBLISHED' && (
                      <Link
                        href={`/forms/${formId}/submissions`}
                        className="text-xs text-indigo-600 hover:underline font-medium"
                      >
                        Submissions
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  const activeField = localFields.find((f) => f.id === activeFieldId);

  // ── Field preview renderer ────────────────────────────────────────────────
  const renderFieldPreview = (field) => {
    const opts        = field.options || ["Option 1"];
    const placeholder = field.uiConfig?.placeholder || "Users will answer here...";
    const helpText    = field.uiConfig?.helpText || null;

    const preview = (() => {
      switch (field.fieldType) {
        case "TEXTAREA":
          return <div className="w-full h-20 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-400">{placeholder}</div>;

        case "RADIO":
          return (
            <div className="space-y-3">
              {opts.map((opt, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full border-2 border-slate-300 shrink-0"></div>
                  <span className="text-sm text-slate-600">{opt}</span>
                </div>
              ))}
            </div>
          );

        case "CHECKBOX_GROUP":
          return (
            <div className="space-y-3">
              {opts.map((opt, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded border-2 border-slate-300 shrink-0"></div>
                  <span className="text-sm text-slate-600">{opt}</span>
                </div>
              ))}
            </div>
          );

        case "DROPDOWN":
          return (
            <div className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-600 flex justify-between items-center">
              {opts[0] || "Select an option..."}
              <ChevronDown size={16} className="text-slate-400" />
            </div>
          );

        case "BOOLEAN":
          return (
            <div className="w-10 h-5 bg-slate-200 rounded-full flex items-center px-1">
              <div className="w-3.5 h-3.5 bg-white rounded-full shadow-sm"></div>
            </div>
          );

        case "SECTION":
          return (
            <div className="border-t-2 border-indigo-400 pt-4">
              <h3 className="text-base font-bold text-slate-800">{field.uiConfig?.title || "New Section"}</h3>
              {field.uiConfig?.description && <p className="text-sm text-slate-500 mt-1">{field.uiConfig.description}</p>}
            </div>
          );

        case "LABEL":
          return (
            <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3">
              <h4 className="text-sm font-bold text-indigo-900">{field.uiConfig?.title || "Label Title"}</h4>
              {field.uiConfig?.description && <p className="text-sm text-indigo-700 mt-1">{field.uiConfig.description}</p>}
            </div>
          );

        case "FILE_UPLOAD":
          return (
            <div className="w-full border-2 border-dashed border-slate-300 rounded-xl px-6 py-8 flex flex-col items-center gap-2 text-slate-400 bg-slate-50">
              <Upload size={24} />
              <p className="text-sm font-medium">Click to upload or drag &amp; drop</p>
              <p className="text-xs">{field.uiConfig?.acceptedFileTypes?.join(", ") || "Any file"} · max {field.uiConfig?.maxFileSizeMb || 5}MB</p>
            </div>
          );

        case "STAR_RATING":
          return (
            <div className="flex gap-1.5">
              {Array.from({ length: field.uiConfig?.maxStars || 5 }).map((_, i) => (
                <Star key={i} size={28} className="text-amber-400 fill-amber-400" />
              ))}
            </div>
          );

        case "LINEAR_SCALE": {
          const min   = field.uiConfig?.scaleMin ?? 1;
          const max   = field.uiConfig?.scaleMax ?? 5;
          const steps = Array.from({ length: max - min + 1 }, (_, i) => min + i);
          return (
            <div className="space-y-2">
              <div className="flex gap-3 items-center flex-wrap">
                {steps.map((val) => (
                  <div key={val} className="w-8 h-8 rounded-full border-2 border-slate-300 flex items-center justify-center text-xs text-slate-500 font-medium bg-slate-50">{val}</div>
                ))}
              </div>
              <div className="flex justify-between text-xs text-slate-500">
                <span>{field.uiConfig?.lowLabel || "Not likely"}</span>
                <span>{field.uiConfig?.highLabel || "Very likely"}</span>
              </div>
            </div>
          );
        }

        case "LOOKUP_DROPDOWN":
          return (
            <div className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-600 flex justify-between items-center">
              <span className="flex items-center gap-2">
                <Link2 size={14} className="text-indigo-400" />
                {field.uiConfig?.sourceTable && field.uiConfig?.sourceDisplayColumn
                  ? `${field.uiConfig.sourceTable} → ${field.uiConfig.sourceDisplayColumn}`
                  : "No source linked yet"}
              </span>
              <ChevronDown size={16} className="text-slate-400" />
            </div>
          );

        case "MC_GRID":
        case "TICK_BOX_GRID": {
          const rows      = field.validation?.rows    || ["Row 1"];
          const cols      = field.validation?.columns || ["Col 1"];
          const isTickBox = field.fieldType === "TICK_BOX_GRID";
          return (
            <div className="overflow-x-auto">
              <table className="text-sm w-full">
                <thead>
                  <tr>
                    <th className="p-2"></th>
                    {cols.map((col, i) => <th key={i} className="p-2 text-center text-slate-600 font-medium text-xs">{col}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, ri) => (
                    <tr key={ri} className={ri % 2 === 0 ? "bg-slate-50" : ""}>
                      <td className="p-2 text-slate-700 font-medium pr-4 text-sm whitespace-nowrap">{row}</td>
                      {cols.map((_, ci) => (
                        <td key={ci} className="p-2 text-center">
                          {isTickBox
                            ? <div className="w-4 h-4 rounded border-2 border-slate-300 mx-auto"></div>
                            : <div className="w-4 h-4 rounded-full border-2 border-slate-300 mx-auto"></div>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }

        case "PAGE_BREAK":
          return (
            <div className="w-full relative flex items-center justify-center py-6">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t-[3px] border-dashed border-indigo-200"></div></div>
              <div className="relative bg-white px-4 text-xs font-bold uppercase tracking-widest text-indigo-400 flex items-center gap-2 rounded-full border border-indigo-100 shadow-sm py-1.5 object-center">
                <BookOpen size={14} /> Page Break
              </div>
            </div>
          );

        default:
          return <div className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-400">{placeholder}</div>;
      }
    })();

    return (
      <div className="space-y-2">
        {preview}
        {helpText && <p className="text-xs text-slate-500 mt-1">{helpText}</p>}
      </div>
    );
  };

  // ── Main JSX ──────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen bg-slate-50/50 overflow-hidden font-sans">

      {/* ── LEFT SIDEBAR ── */}
      <aside className="w-72 bg-white border-r border-slate-200 flex flex-col shrink-0 z-20">
        <div className="p-5 border-b border-slate-100 bg-slate-50/50">
          <Link href="/" className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-900 mb-6 transition-colors">
            <ArrowLeft size={16} className="mr-1" /> Dashboard
          </Link>
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Plus size={16} /> Elements
          </h2>
        </div>
        <div className="p-4 space-y-2 overflow-y-auto">
          {FIELD_TYPES.map((type) => (
            <div
              key={type.value}
              draggable
              onDragStart={(e) => handleSidebarDragStart(e, type.value)}
              className="group flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl cursor-grab active:cursor-grabbing hover:border-indigo-400 hover:shadow-sm transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg group-hover:bg-indigo-100 transition-colors">{type.icon}</div>
                <span className="text-sm font-medium text-slate-700">{type.label}</span>
              </div>
              <GripVertical size={16} className="text-slate-300 group-hover:text-slate-500" />
            </div>
          ))}
        </div>
      </aside>

      {/* ── MAIN CANVAS ── */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        <header className="h-[72px] bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 z-10">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-50 p-2 rounded-lg text-indigo-600"><LayoutTemplate size={20} /></div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-slate-900 leading-tight line-clamp-1">{form.name}</h1>
                {draft && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
                    v{draft.versionNumber} DRAFT
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 font-medium">Builder Mode</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href={`/forms/${formId}/view?preview=true`} target="_blank" className="hidden sm:flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 px-4 py-2 rounded-lg transition-colors">
              <ClipboardList size={18} /> Preview Form
            </Link>
            <div className="w-px h-6 bg-slate-200 mx-1"></div>
            <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
              <Save size={16} /> {saving ? "Saving..." : "Save Draft"}
            </button>
            <button onClick={handlePublish} disabled={publishing} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white px-5 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors">
              <Rocket size={16} /> {publishing ? "Publishing..." : "Publish Form"}
            </button>
          </div>
        </header>

        <div
          onDrop={handleDropOnCanvas}
          onDragOver={handleDragOver}
          className="flex-1 overflow-y-auto p-6 lg:p-10 flex justify-center pb-32"
          onClick={() => setActiveFieldId(null)}
        >
          <div className="w-full max-w-3xl space-y-4">
            {localFields.length === 0 ? (
              <div className="h-64 border-2 border-dashed border-slate-300 bg-slate-50/50 rounded-2xl flex flex-col items-center justify-center text-slate-400">
                <div className="bg-white p-3 rounded-full shadow-sm border border-slate-100 mb-3">
                  <Plus size={24} className="text-slate-400" />
                </div>
                <p className="font-medium text-slate-600">Your form is empty</p>
                <p className="text-sm mt-1">Drag and drop elements from the left panel.</p>
              </div>
            ) : (
              localFields.map((field, index) => (
                <div
                  key={field.id}
                  draggable
                  onDragStart={(e) => handleFieldDragStart(e, index)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDropOnField(e, index)}
                  onClick={(e) => { e.stopPropagation(); setActiveFieldId(field.id); }}
                  className={`group relative bg-white rounded-2xl transition-all cursor-pointer border-2 ${
                    activeFieldId === field.id
                      ? "border-indigo-600 shadow-md ring-4 ring-indigo-50"
                      : "border-slate-200 hover:border-indigo-300 shadow-sm"
                  }`}
                >
                  {/* Drag handle */}
                  <div className="absolute left-0 top-0 bottom-0 w-8 flex flex-col items-center justify-center text-slate-300 hover:text-slate-600 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity bg-slate-50 rounded-l-xl border-r border-slate-100">
                    <GripVertical size={18} />
                  </div>
                  {/* Delete button */}
                  <button
                    onClick={(e) => deleteLocalField(field.id, e)}
                    className="absolute -right-3 -top-3 bg-white border border-slate-200 text-slate-400 hover:text-red-600 hover:border-red-200 shadow-sm p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-all z-10"
                  >
                    <Trash2 size={16} />
                  </button>
                  {/* Condition indicator badge */}
                  {field.conditions && (() => {
                    try {
                      const c = JSON.parse(field.conditions);
                      if (c.rules?.length > 0) return (
                        <div className="absolute -left-3 -top-3 bg-indigo-600 text-white p-1 rounded-full shadow-sm z-10" title="Has conditions">
                          <GitBranch size={12} />
                        </div>
                      );
                    } catch {}
                    return null;
                  })()}
                  <div className="p-8 pl-14 pointer-events-none">
                    <label className="block text-base font-semibold text-slate-800 mb-4">
                      {field.fieldLabel} {field.required && <span className="text-red-500">*</span>}
                    </label>
                    {renderFieldPreview(field)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      {/* ── RIGHT SIDEBAR ── */}
      <aside className="w-[340px] bg-white border-l border-slate-200 flex flex-col shrink-0 z-20 shadow-xl shadow-slate-200/50">
        <div className="border-b border-slate-100 bg-slate-50/50">
          <div className="p-5 pb-3">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Settings2 size={16} /> Field Settings
            </h2>
          </div>
          {activeField && (
            <div className="flex border-b border-slate-200 px-4">
              <button 
                onClick={() => setActiveTab('settings')}
                className={`pb-2 px-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'settings' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
              >
                Settings
              </button>
              {(activeField.fieldType !== "SECTION" && activeField.fieldType !== "LABEL") && (
                <button 
                  onClick={() => setActiveTab('rules')}
                  className={`pb-2 px-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'rules' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                  Rules
                </button>
              )}
            </div>
          )}
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {!activeField ? (
            <div className="text-center mt-10">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-50 border border-slate-100 mb-3">
                <Settings2 size={20} className="text-slate-400" />
              </div>
              <p className="text-sm text-slate-500">Click on any field in the canvas to edit its properties.</p>
            </div>
          ) : (
            <div className="space-y-6">

              {activeTab === 'settings' ? (
                <>
                  {/* Field type badge */}
                  <div className="flex items-center gap-2 text-xs font-bold tracking-wider text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-md border border-indigo-100 w-fit">
                    {activeField.fieldType.replace(/_/g, " ")}
                  </div>

              {/* Question title */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700">Question Title</label>
                <textarea
                  rows={2}
                  value={activeField.fieldLabel}
                  onChange={(e) => updateLocalField(activeField.id, "fieldLabel", e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none"
                  placeholder="Enter your question..."
                />
              </div>

              {/* ── SECTION / LABEL settings ── */}
              {(activeField.fieldType === "SECTION" || activeField.fieldType === "LABEL") && (
                <div className="space-y-3 pt-4 border-t border-slate-100">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Title</label>
                    <input
                      type="text"
                      value={activeField.uiConfig?.title || ""}
                      onChange={(e) => updateNestedObject(activeField.id, "uiConfig", "title", e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm"
                      placeholder="Section title..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Description</label>
                    <textarea
                      rows={2}
                      value={activeField.uiConfig?.description || ""}
                      onChange={(e) => updateNestedObject(activeField.id, "uiConfig", "description", e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none"
                      placeholder="Optional description..."
                    />
                  </div>
                </div>
              )}

              {/* ── Options ── */}
              {OPTIONS_BASED_TYPES.includes(activeField.fieldType) && (
                <div className="space-y-3 pt-4 border-t border-slate-100">
                  <label className="block text-sm font-semibold text-slate-700">Options</label>
                  <div className="space-y-2">
                    {activeField.options?.map((opt, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        {activeField.fieldType === "RADIO" && <CircleDot size={16} className="text-slate-400 shrink-0" />}
                        {activeField.fieldType === "CHECKBOX_GROUP" && <div className="w-4 h-4 rounded border-2 border-slate-300 shrink-0"></div>}
                        {activeField.fieldType === "DROPDOWN" && <span className="text-xs font-mono text-slate-400 shrink-0">{idx + 1}.</span>}
                        <input
                          type="text" value={opt}
                          onChange={(e) => updateOption(activeField.id, idx, e.target.value)}
                          className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                        />
                        <button onClick={() => deleteOption(activeField.id, idx)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => addOption(activeField.id)} className="flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-700 mt-2 px-2 py-1 rounded hover:bg-indigo-50 transition-colors">
                    <Plus size={16} /> Add option
                  </button>
                </div>
              )}

              {/* ── Star Rating ── */}
              {activeField.fieldType === "STAR_RATING" && (
                <div className="space-y-3 pt-4 border-t border-slate-100">
                  <label className="block text-sm font-semibold text-slate-700">Max Stars</label>
                  <input type="number" min={1} max={10}
                    value={activeField.uiConfig?.maxStars || 5}
                    onChange={(e) => updateNestedObject(activeField.id, "uiConfig", "maxStars", Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              )}

              {/* ── Linear Scale ── */}
              {activeField.fieldType === "LINEAR_SCALE" && (
                <div className="space-y-3 pt-4 border-t border-slate-100">
                  <label className="block text-sm font-semibold text-slate-700">Scale Range</label>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Min</label>
                      <input type="number" value={activeField.uiConfig?.scaleMin ?? 1} onChange={(e) => updateNestedObject(activeField.id, "uiConfig", "scaleMin", Number(e.target.value))} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Max</label>
                      <input type="number" value={activeField.uiConfig?.scaleMax ?? 5} onChange={(e) => updateNestedObject(activeField.id, "uiConfig", "scaleMax", Number(e.target.value))} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Low Label</label>
                    <input type="text" value={activeField.uiConfig?.lowLabel || ""} onChange={(e) => updateNestedObject(activeField.id, "uiConfig", "lowLabel", e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm" placeholder="e.g. Not likely" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">High Label</label>
                    <input type="text" value={activeField.uiConfig?.highLabel || ""} onChange={(e) => updateNestedObject(activeField.id, "uiConfig", "highLabel", e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm" placeholder="e.g. Very likely" />
                  </div>
                </div>
              )}

              {/* ── Lookup Dropdown ── */}
              {activeField.fieldType === "LOOKUP_DROPDOWN" && (
                <div className="space-y-3 pt-4 border-t border-slate-100">
                  <label className="block text-sm font-semibold text-slate-700">Source Form</label>
                  <select
                    value={activeField.uiConfig?.sourceTable || ""}
                    onChange={(e) => {
                      updateNestedObject(activeField.id, "uiConfig", "sourceTable", e.target.value);
                      updateNestedObject(activeField.id, "uiConfig", "sourceColumn", "id");
                      updateNestedObject(activeField.id, "uiConfig", "sourceDisplayColumn", "");
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="">Select a form...</option>
                    {publishedForms.map((f) => (
                      <option key={f.formId} value={f.tableName}>{f.formName}</option>
                    ))}
                  </select>
                  {activeField.uiConfig?.sourceTable && (
                    <>
                      <label className="block text-sm font-semibold text-slate-700 mt-3">Display Column</label>
                      <select
                        value={activeField.uiConfig?.sourceDisplayColumn || ""}
                        onChange={(e) => updateNestedObject(activeField.id, "uiConfig", "sourceDisplayColumn", e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm"
                      >
                        <option value="">Select column to display...</option>
                        {(publishedForms.find((f) => f.tableName === activeField.uiConfig.sourceTable)?.fields || []).map((f) => (
                          <option key={f.key} value={f.key}>{f.label}</option>
                        ))}
                      </select>
                      <p className="text-xs text-slate-400">This column will show in the dropdown. The record ID is always stored.</p>
                    </>
                  )}
                </div>
              )}

              {/* ── File Upload ── */}
              {activeField.fieldType === "FILE_UPLOAD" && (
                <div className="space-y-3 pt-4 border-t border-slate-100">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Max File Size (MB)</label>
                    <input type="number" min={1} max={100}
                      value={activeField.uiConfig?.maxFileSizeMb || 5}
                      onChange={(e) => updateNestedObject(activeField.id, "uiConfig", "maxFileSizeMb", Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Accepted File Types</label>
                    <div className="space-y-2">
                      {(activeField.uiConfig?.acceptedFileTypes || []).map((ft, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <input type="text" value={ft}
                            onChange={(e) => {
                              const updated = [...(activeField.uiConfig?.acceptedFileTypes || [])];
                              updated[idx] = e.target.value;
                              updateNestedObject(activeField.id, "uiConfig", "acceptedFileTypes", updated);
                            }}
                            className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono"
                            placeholder=".pdf"
                          />
                          <button onClick={() => {
                            const updated = (activeField.uiConfig?.acceptedFileTypes || []).filter((_, i) => i !== idx);
                            updateNestedObject(activeField.id, "uiConfig", "acceptedFileTypes", updated);
                          }} className="p-2 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors">
                            <X size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                    <button onClick={() => {
                      const updated = [...(activeField.uiConfig?.acceptedFileTypes || []), ""];
                      updateNestedObject(activeField.id, "uiConfig", "acceptedFileTypes", updated);
                    }} className="flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-700 px-2 py-1 rounded hover:bg-indigo-50 transition-colors mt-2">
                      <Plus size={16} /> Add file type
                    </button>
                  </div>
                </div>
              )}

              {/* ── Grid settings ── */}
              {GRID_TYPES.includes(activeField.fieldType) && (
                <div className="space-y-4 pt-4 border-t border-slate-100">
                  {["rows", "columns"].map((key) => (
                    <div key={key}>
                      <label className="block text-sm font-semibold text-slate-700 capitalize mb-2">{key}</label>
                      <div className="space-y-2">
                        {(activeField.validation?.[key] || []).map((val, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <input type="text" value={val}
                              onChange={(e) => {
                                const updated = [...(activeField.validation?.[key] || [])];
                                updated[idx] = e.target.value;
                                updateNestedObject(activeField.id, "validation", key, updated);
                              }}
                              className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm"
                            />
                            <button onClick={() => {
                              const updated = (activeField.validation?.[key] || []).filter((_, i) => i !== idx);
                              updateNestedObject(activeField.id, "validation", key, updated);
                            }} className="p-2 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors">
                              <X size={16} />
                            </button>
                          </div>
                        ))}
                      </div>
                      <button onClick={() => {
                        const current = activeField.validation?.[key] || [];
                        const lbl = key === "rows" ? "Row" : "Column";
                        updateNestedObject(activeField.id, "validation", key, [...current, `${lbl} ${current.length + 1}`]);
                      }} className="flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-700 px-2 py-1 rounded hover:bg-indigo-50 transition-colors mt-2">
                        <Plus size={16} /> Add {key === "rows" ? "row" : "column"}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* ── Required toggle ── */}
              {activeField.fieldType !== "SECTION" && activeField.fieldType !== "LABEL" && (
                <div className="pt-4 border-t border-slate-100">
                  <label className="flex items-center justify-between p-4 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-slate-800">Required Field</span>
                      <span className="text-xs text-slate-500 mt-0.5">Force users to answer this</span>
                    </div>
                    <input type="checkbox" checked={activeField.required}
                      onChange={(e) => updateLocalField(activeField.id, "required", e.target.checked)}
                      className="w-5 h-5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                    />
                  </label>
                </div>
              )}

              {/* ── Display settings ── */}
              {activeField.fieldType !== "SECTION" && activeField.fieldType !== "LABEL" && (
                <div className="pt-4 border-t border-slate-100">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-4">
                    <MonitorPlay size={16} className="text-indigo-600" /> Display Settings
                  </h3>
                  <div className="space-y-4">
                    {!OPTIONS_BASED_TYPES.includes(activeField.fieldType) &&
                      activeField.fieldType !== "BOOLEAN" &&
                      activeField.fieldType !== "LINEAR_SCALE" &&
                      activeField.fieldType !== "STAR_RATING" &&
                      !GRID_TYPES.includes(activeField.fieldType) &&
                      activeField.fieldType !== "FILE_UPLOAD" &&
                      activeField.fieldType !== "LOOKUP_DROPDOWN" && (
                        <div>
                          <label className="block text-xs font-medium text-slate-500 mb-1">Placeholder Text</label>
                          <input type="text" value={activeField.uiConfig?.placeholder || ""}
                            onChange={(e) => updateNestedObject(activeField.id, "uiConfig", "placeholder", e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm"
                            placeholder="e.g. Type your answer here..."
                          />
                        </div>
                      )}
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Help / Subtext</label>
                      <textarea rows={2} value={activeField.uiConfig?.helpText || ""}
                        onChange={(e) => updateNestedObject(activeField.id, "uiConfig", "helpText", e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none"
                        placeholder="Add hints or instructions for users..."
                      />
                    </div>

                    {/* Default Value */}
                    {!OPTIONS_BASED_TYPES.includes(activeField.fieldType) &&
                      !GRID_TYPES.includes(activeField.fieldType) &&
                      activeField.fieldType !== "BOOLEAN" &&
                      activeField.fieldType !== "LINEAR_SCALE" &&
                      activeField.fieldType !== "FILE_UPLOAD" &&
                      activeField.fieldType !== "LOOKUP_DROPDOWN" && (
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Default Value</label>
                        <input
                          type={activeField.fieldType === "INTEGER" ? "number" : activeField.fieldType === "DATE" ? "date" : activeField.fieldType === "TIME" ? "time" : "text"}
                          value={activeField.uiConfig?.defaultValue || ""}
                          onChange={(e) => updateNestedObject(activeField.id, "uiConfig", "defaultValue", e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm"
                          placeholder="Pre-fill this field with a value..."
                        />
                        <p className="text-xs text-slate-400 mt-1">This value will be pre-filled when the form loads. Users can change it unless Read-Only is enabled.</p>
                      </div>
                    )}

                    {/* Read-Only Toggle */}
                    <label className="flex items-center justify-between p-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-slate-800">Read-Only</span>
                        <span className="text-xs text-slate-500 mt-0.5">User can see but not edit this field</span>
                      </div>
                      <input type="checkbox"
                        checked={activeField.uiConfig?.readOnly || false}
                        onChange={(e) => updateNestedObject(activeField.id, "uiConfig", "readOnly", e.target.checked)}
                        className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                      />
                    </label>

                    {/* Hidden Toggle */}
                    <label className="flex items-center justify-between p-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-slate-800">Hidden Field</span>
                        <span className="text-xs text-slate-500 mt-0.5">Field is hidden from the user but its default value is saved</span>
                      </div>
                      <input type="checkbox"
                        checked={activeField.uiConfig?.hidden || false}
                        onChange={(e) => updateNestedObject(activeField.id, "uiConfig", "hidden", e.target.checked)}
                        className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                      />
                    </label>
                  </div>
                </div>
              )}

              {/* ── Validation rules ── */}
              {activeField.fieldType !== "SECTION" && activeField.fieldType !== "LABEL" && (
                <div className="pt-4 border-t border-slate-100">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-4">
                    <ShieldCheck size={16} className="text-indigo-600" /> Validation Rules
                  </h3>
                  <div className="space-y-4">
                    {TEXT_BASED_TYPES.includes(activeField.fieldType) && (
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-slate-500 mb-1">Min Length</label>
                          <input type="number" min="0" value={activeField.validation?.minLength || ""}
                            onChange={(e) => updateNestedObject(activeField.id, "validation", "minLength", e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm" placeholder="e.g. 10" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-500 mb-1">Max Length</label>
                          <input type="number" min="0" value={activeField.validation?.maxLength || ""}
                            onChange={(e) => updateNestedObject(activeField.id, "validation", "maxLength", e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm" placeholder="e.g. 500" />
                        </div>
                      </div>
                    )}
                    {NUMBER_BASED_TYPES.includes(activeField.fieldType) && (
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-slate-500 mb-1">Min Value</label>
                          <input type="number" value={activeField.validation?.min || ""}
                            onChange={(e) => updateNestedObject(activeField.id, "validation", "min", e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm" placeholder="e.g. 0" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-500 mb-1">Max Value</label>
                          <input type="number" value={activeField.validation?.max || ""}
                            onChange={(e) => updateNestedObject(activeField.id, "validation", "max", e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm" placeholder="e.g. 100" />
                        </div>
                      </div>
                    )}
                    {activeField.fieldType === "TEXT" && (
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Custom Regex Pattern</label>
                        <input type="text" value={activeField.validation?.pattern || ""}
                          onChange={(e) => updateNestedObject(activeField.id, "validation", "pattern", e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono text-xs"
                          placeholder="^([A-Z])+$"
                        />
                        {activeField.validation?.pattern && (
                          <div className="mt-2">
                            <label className="block text-xs font-medium text-slate-500 mb-1">Validation Message</label>
                            <input type="text" value={activeField.validation?.validationMessage || ""}
                              onChange={(e) => updateNestedObject(activeField.id, "validation", "validationMessage", e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm"
                              placeholder="e.g. Please enter a valid phone number"
                            />
                          </div>
                        )}
                      </div>
                    )}
                    {!TEXT_BASED_TYPES.includes(activeField.fieldType) &&
                      !NUMBER_BASED_TYPES.includes(activeField.fieldType) &&
                      activeField.fieldType !== "TEXT" &&
                      !GRID_TYPES.includes(activeField.fieldType) && (
                        <p className="text-xs text-slate-400 italic">No additional validation rules available for this field type.</p>
                      )}

                    {/* Unique Toggle */}
                    {["TEXT", "EMAIL", "INTEGER", "DATE", "TIME"].includes(activeField.fieldType) && (
                      <label className="flex items-center justify-between p-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors mt-4">
                        <div className="flex flex-col">
                          <span className="text-xs font-semibold text-slate-800">Unique Field</span>
                          <span className="text-xs text-slate-500 mt-0.5">Disallow duplicate answers across all submissions</span>
                        </div>
                        <input type="checkbox"
                          checked={activeField.validation?.unique || false}
                          onChange={(e) => updateNestedObject(activeField.id, "validation", "unique", e.target.checked)}
                          className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                        />
                      </label>
                    )}
                  </div>
                </div>
              )}
                </>
              ) : (
                // ── RULES TAB ──
              <div className="space-y-6">
                
                {/* ── Conditional Logic ── */}
                {activeField.fieldType !== "SECTION" && activeField.fieldType !== "LABEL" && (
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-4">
                      <GitBranch size={16} className="text-indigo-600" /> Conditional Logic
                    </h3>

                  {(() => {
                    const cond = parseConditions(activeField);

                    const updateCond = (updates) =>
                      saveConditions(activeField.id, { ...cond, ...updates });

                    const addRule = () => updateCond({
                      rules: [...cond.rules, { fieldKey: "", operator: "equals", value: "" }],
                    });

                    const removeRule = (idx) => updateCond({
                      rules: cond.rules.filter((_, i) => i !== idx),
                    });

                    const updateRule = (idx, key, val) => {
                      const newRules = [...cond.rules];
                      newRules[idx] = { ...newRules[idx], [key]: val };
                      updateCond({ rules: newRules });
                    };

                    // Fields available as condition sources (exclude self, SECTION, LABEL, FILE_UPLOAD)
                    const otherFields = localFields.filter(
                      (f) => f.id !== activeField.id &&
                             f.fieldType !== "SECTION" &&
                             f.fieldType !== "LABEL" &&
                             f.fieldType !== "FILE_UPLOAD"
                    );

                    return (
                      <div className="space-y-3">

                        {/* Action */}
                        <div>
                          <label className="block text-xs font-medium text-slate-500 mb-1">Action</label>
                          <select
                            value={cond.action}
                            onChange={(e) => updateCond({ action: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm"
                          >
                            {CONDITION_ACTIONS.map((a) => (
                              <option key={a.value} value={a.value}>{a.label} this field when:</option>
                            ))}
                          </select>
                        </div>

                        {/* Formula input for calculate action */}
                        {cond.action === "calculate" && (
                          <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">Formula</label>
                            <input
                              type="text"
                              value={cond.formula || ""}
                              onChange={(e) => updateCond({ formula: e.target.value })}
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono"
                              placeholder="e.g. {price_1} * {quantity_2}"
                            />
                            <p className="text-xs text-slate-400 mt-1">
                              Use {"{fieldKey}"} to reference other fields. Supports + - * / ( )
                            </p>
                            <div className="mt-2 space-y-1">
                              {otherFields.map((f, i) => (
                                <button
                                  key={f.id}
                                  type="button"
                                  onClick={() => updateCond({ formula: (cond.formula || "") + `{${generateFieldKey(f.fieldLabel, localFields.indexOf(f) + 1)}}` })}
                                  className="inline-flex items-center gap-1 mr-1 mb-1 px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded text-xs hover:bg-indigo-100 transition-colors"
                                >
                                  + {f.fieldLabel}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Rules */}
                        {cond.action !== "calculate" && (
                          <>
                            {cond.rules.length > 1 && (
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-slate-500">Match:</span>
                                {["AND", "OR"].map((l) => (
                                  <button key={l} type="button"
                                    onClick={() => updateCond({ logic: l })}
                                    className={`px-3 py-1 rounded-md text-xs font-semibold border transition-colors ${
                                      cond.logic === l
                                        ? "bg-indigo-600 text-white border-indigo-600"
                                        : "bg-white text-slate-600 border-slate-200 hover:border-indigo-400"
                                    }`}
                                  >
                                    {l}
                                  </button>
                                ))}
                                <span className="text-xs text-slate-500">conditions</span>
                              </div>
                            )}

                            <div className="space-y-2">
                              {cond.rules.map((rule, idx) => (
                                <div key={idx} className="flex items-center gap-1.5 bg-slate-50 rounded-lg p-2 border border-slate-100">
                                  {/* Field selector */}
                                  <select
                                    value={rule.fieldKey}
                                    onChange={(e) => updateRule(idx, "fieldKey", e.target.value)}
                                    className="flex-1 bg-white border border-slate-200 rounded-md px-2 py-1.5 text-xs min-w-0"
                                  >
                                    <option value="">Select field...</option>
                                    <option value={activeField.fieldKey || generateFieldKey(activeField.fieldLabel, localFields.indexOf(activeField)+1)}>This Field</option>
                                    {otherFields.map((f, fi) => (
                                      <option key={f.id} value={generateFieldKey(f.fieldLabel, localFields.indexOf(f) + 1)}>
                                        {f.fieldLabel}
                                      </option>
                                    ))}
                                  </select>

                                  {/* Operator */}
                                  <select
                                    value={rule.operator}
                                    onChange={(e) => updateRule(idx, "operator", e.target.value)}
                                    className="bg-white border border-slate-200 rounded-md px-2 py-1.5 text-xs"
                                  >
                                    {OPERATORS.map((op) => (
                                      <option key={op.value} value={op.value}>{op.label}</option>
                                    ))}
                                  </select>

                                  {/* Value — hidden for isEmpty / isNotEmpty */}
                                  {!["isEmpty", "isNotEmpty"].includes(rule.operator) && (
                                    <input
                                      type="text"
                                      value={rule.value}
                                      onChange={(e) => updateRule(idx, "value", e.target.value)}
                                      className="w-16 bg-white border border-slate-200 rounded-md px-2 py-1.5 text-xs"
                                      placeholder="value"
                                    />
                                  )}

                                  <button onClick={() => removeRule(idx)}
                                    className="p-1 text-slate-400 hover:text-red-500 rounded transition-colors shrink-0">
                                    <X size={14} />
                                  </button>
                                </div>
                              ))}
                            </div>

                            <button onClick={addRule}
                              className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-700 px-2 py-1 rounded hover:bg-indigo-50 transition-colors">
                              <Plus size={14} /> Add condition
                            </button>

                            {cond.rules.length === 0 && (
                              <p className="text-xs text-slate-400 italic">
                                No conditions — field always visible and enabled.
                              </p>
                            )}
                          </>
                        )}
                        
                        {/* ── Custom Business Rule Actions ── */}
                        <div className="pt-4 mt-4 border-t border-slate-100">
                          <label className="block text-xs font-semibold text-slate-700 mb-2">If conditions match, execute:</label>
                          <div className="space-y-3">
                            {cond.actions.map((act, actIdx) => (
                              <div key={actIdx} className="bg-slate-50 border border-slate-200 rounded-lg p-3 relative">
                                <button onClick={() => {
                                  updateCond({ actions: cond.actions.filter((_, i) => i !== actIdx) });
                                }} className="absolute right-2 top-2 p-1 text-slate-400 hover:text-red-500 rounded transition-colors">
                                  <X size={14} />
                                </button>
                                
                                <select value={act.type || ""} onChange={(e) => {
                                  const newActions = [...cond.actions];
                                  newActions[actIdx] = { ...act, type: e.target.value };
                                  updateCond({ actions: newActions });
                                }} className="w-full bg-white border border-slate-200 rounded-md px-2 py-1.5 text-xs mb-2 pr-8">
                                  <option value="">Select Action Type...</option>
                                  <option value="VALIDATION_ERROR">Block Submission w/ Error</option>
                                  <option value="REQUIRE">Require a Field</option>
                                  <option value="MIN_LENGTH">Enforce Minimum Length</option>
                                  <option value="MAX_LENGTH">Enforce Maximum Length</option>
                                  <option value="MIN_VALUE">Enforce Minimum Value</option>
                                  <option value="MAX_VALUE">Enforce Maximum Value</option>
                                  <option value="REGEX_MATCH">Match Regex Pattern</option>
                                  <option value="MATCH_FIELD">Must Match Another Field</option>
                                </select>
                                
                                {act.type === "VALIDATION_ERROR" && (
                                  <input type="text" value={act.message || ""} onChange={(e) => {
                                      const newActions = [...cond.actions];
                                      newActions[actIdx] = { ...act, message: e.target.value };
                                      updateCond({ actions: newActions });
                                  }} className="w-full bg-white border border-slate-200 rounded-md px-2 py-1.5 text-xs" placeholder="Custom error message..." />
                                )}

                                {act.type === "REQUIRE" && (
                                  <div className="space-y-2">
                                    <select value={act.targetField || ""} onChange={(e) => {
                                        const newActions = [...cond.actions];
                                        newActions[actIdx] = { ...act, targetField: e.target.value };
                                        updateCond({ actions: newActions });
                                    }} className="w-full bg-white border border-slate-200 rounded-md px-2 py-1.5 text-xs">
                                      <option value="">Select field to require...</option>
                                      <option value={activeField.fieldKey || generateFieldKey(activeField.fieldLabel, localFields.indexOf(activeField)+1)}>This Field</option>
                                      {otherFields.map(f => (
                                        <option key={f.id} value={generateFieldKey(f.fieldLabel, localFields.indexOf(f)+1)}>
                                          {f.fieldLabel}
                                        </option>
                                      ))}
                                    </select>
                                    
                                    <input type="text" value={act.message || ""} onChange={(e) => {
                                        const newActions = [...cond.actions];
                                        newActions[actIdx] = { ...act, message: e.target.value };
                                        updateCond({ actions: newActions });
                                    }} className="w-full bg-white border border-slate-200 rounded-md px-2 py-1.5 text-xs" placeholder="Optional custom required message..." />
                                  </div>
                                )}

                                {["MIN_LENGTH", "MAX_LENGTH", "MIN_VALUE", "MAX_VALUE"].includes(act.type) && (
                                  <div className="space-y-2">
                                    <div className="flex gap-2">
                                      <select value={act.targetField || ""} onChange={(e) => {
                                          const newActions = [...cond.actions];
                                          newActions[actIdx] = { ...act, targetField: e.target.value };
                                          updateCond({ actions: newActions });
                                      }} className="flex-1 bg-white border border-slate-200 rounded-md px-2 py-1.5 text-xs">
                                        <option value="">Select field...</option>
                                        <option value={activeField.fieldKey || generateFieldKey(activeField.fieldLabel, localFields.indexOf(activeField)+1)}>This Field</option>
                                        {otherFields.map(f => (
                                          <option key={f.id} value={generateFieldKey(f.fieldLabel, localFields.indexOf(f)+1)}>
                                            {f.fieldLabel}
                                          </option>
                                        ))}
                                      </select>
                                      <input type="number" min="1" value={act.value || ""} onChange={(e) => {
                                          const newActions = [...cond.actions];
                                          newActions[actIdx] = { ...act, value: e.target.value };
                                          updateCond({ actions: newActions });
                                      }} className="w-20 bg-white border border-slate-200 rounded-md px-2 py-1.5 text-xs" placeholder="Length" />
                                    </div>
                                    <input type="text" value={act.message || ""} onChange={(e) => {
                                        const newActions = [...cond.actions];
                                        newActions[actIdx] = { ...act, message: e.target.value };
                                        updateCond({ actions: newActions });
                                    }} className="w-full bg-white border border-slate-200 rounded-md px-2 py-1.5 text-xs" placeholder="Optional custom length message..." />
                                  </div>
                                )}

                                {act.type === "REGEX_MATCH" && (
                                  <div className="space-y-2">
                                    <div className="flex gap-2">
                                      <select value={act.targetField || ""} onChange={(e) => {
                                          const newActions = [...cond.actions];
                                          newActions[actIdx] = { ...act, targetField: e.target.value };
                                          updateCond({ actions: newActions });
                                      }} className="flex-1 bg-white border border-slate-200 rounded-md px-2 py-1.5 text-xs">
                                        <option value="">Select field...</option>
                                        <option value={activeField.fieldKey || generateFieldKey(activeField.fieldLabel, localFields.indexOf(activeField)+1)}>This Field</option>
                                        {otherFields.map(f => (
                                          <option key={f.id} value={generateFieldKey(f.fieldLabel, localFields.indexOf(f)+1)}>
                                            {f.fieldLabel}
                                          </option>
                                        ))}
                                      </select>
                                      <input type="text" value={act.value || ""} onChange={(e) => {
                                          const newActions = [...cond.actions];
                                          newActions[actIdx] = { ...act, value: e.target.value };
                                          updateCond({ actions: newActions });
                                      }} className="flex-1 bg-white border border-slate-200 rounded-md px-2 py-1.5 text-xs font-mono" placeholder="Regex (e.g. ^[0-9]{5}$)" />
                                    </div>
                                    <input type="text" value={act.message || ""} onChange={(e) => {
                                        const newActions = [...cond.actions];
                                        newActions[actIdx] = { ...act, message: e.target.value };
                                        updateCond({ actions: newActions });
                                    }} className="w-full bg-white border border-slate-200 rounded-md px-2 py-1.5 text-xs" placeholder="Optional custom regex message..." />
                                  </div>
                                )}

                                {act.type === "MATCH_FIELD" && (
                                  <div className="space-y-2">
                                    <div className="flex gap-2 items-center">
                                      <select value={act.targetField || ""} onChange={(e) => {
                                          const newActions = [...cond.actions];
                                          newActions[actIdx] = { ...act, targetField: e.target.value };
                                          updateCond({ actions: newActions });
                                      }} className="flex-1 bg-white border border-slate-200 rounded-md px-2 py-1.5 text-xs">
                                        <option value="">Select field...</option>
                                        <option value={activeField.fieldKey || generateFieldKey(activeField.fieldLabel, localFields.indexOf(activeField)+1)}>This Field</option>
                                        {otherFields.map(f => (
                                          <option key={f.id} value={generateFieldKey(f.fieldLabel, localFields.indexOf(f)+1)}>
                                            {f.fieldLabel}
                                          </option>
                                        ))}
                                      </select>
                                      <span className="text-xs text-slate-500 font-medium whitespace-nowrap">must match</span>
                                      <select value={act.value || ""} onChange={(e) => {
                                          const newActions = [...cond.actions];
                                          newActions[actIdx] = { ...act, value: e.target.value };
                                          updateCond({ actions: newActions });
                                      }} className="flex-1 bg-white border border-slate-200 rounded-md px-2 py-1.5 text-xs">
                                        <option value="">Select field...</option>
                                        <option value={activeField.fieldKey || generateFieldKey(activeField.fieldLabel, localFields.indexOf(activeField)+1)}>This Field</option>
                                        {otherFields.map(f => (
                                          <option key={f.id} value={generateFieldKey(f.fieldLabel, localFields.indexOf(f)+1)}>
                                            {f.fieldLabel}
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                    <input type="text" value={act.message || ""} onChange={(e) => {
                                        const newActions = [...cond.actions];
                                        newActions[actIdx] = { ...act, message: e.target.value };
                                        updateCond({ actions: newActions });
                                    }} className="w-full bg-white border border-slate-200 rounded-md px-2 py-1.5 text-xs" placeholder="Optional custom match message..." />
                                  </div>
                                )}
                              </div>
                            ))}
                            <button onClick={() => updateCond({ actions: [...cond.actions, { type: "", message: "", targetField: "" }] })}
                              className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 hover:text-emerald-700 px-2 py-1 rounded hover:bg-emerald-50 transition-colors border border-emerald-100 bg-white">
                              <Plus size={14} /> Add Business Action
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
              </div>
            )}
            </div>
          )}
        </div>
      </aside>

    </div>
  );
}