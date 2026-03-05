"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  Type, AlignLeft, Hash, Calendar, Clock, CircleDot,
  ListTodo, ChevronDown, ToggleRight, Mail, GripVertical,
  Trash2, Rocket, Save, Plus, Settings2, ClipboardList,
  ArrowLeft, LayoutTemplate, X, ShieldCheck, MonitorPlay,
  Lock, Star, SlidersHorizontal, LayoutGrid, Grid3x3, Upload,
  Link2
} from "lucide-react";

import { api } from "@/lib/api/formService";
import { useForms } from "@/context/FormsContext";

const FIELD_TYPES = [
  { value: "TEXT", label: "Short Answer", icon: <Type size={18} /> },
  { value: "TEXTAREA", label: "Paragraph", icon: <AlignLeft size={18} /> },
  { value: "RADIO", label: "Multiple Choice", icon: <CircleDot size={18} /> },
  { value: "CHECKBOX_GROUP", label: "Checkboxes", icon: <ListTodo size={18} /> },
  { value: "DROPDOWN", label: "Dropdown", icon: <ChevronDown size={18} /> },
  { value: "INTEGER", label: "Number", icon: <Hash size={18} /> },
  { value: "EMAIL", label: "Email", icon: <Mail size={18} /> },
  { value: "DATE", label: "Date", icon: <Calendar size={18} /> },
  { value: "TIME", label: "Time", icon: <Clock size={18} /> },
  { value: "BOOLEAN", label: "Yes/No (Toggle)", icon: <ToggleRight size={18} /> },
  { value: "FILE_UPLOAD", label: "File Upload", icon: <Upload size={18} /> },
  { value: "STAR_RATING", label: "Star Rating", icon: <Star size={18} /> },
  { value: "LINEAR_SCALE", label: "Linear Scale", icon: <SlidersHorizontal size={18} /> },
  { value: "MC_GRID", label: "Multiple Choice Grid", icon: <LayoutGrid size={18} /> },
  { value: "TICK_BOX_GRID", label: "Tick Box Grid", icon: <Grid3x3 size={18} /> },
  { value: "LOOKUP_DROPDOWN", label: "Linked Dropdown", icon: <Link2 size={18} /> },
];

const OPTIONS_BASED_TYPES = ["RADIO", "CHECKBOX_GROUP", "DROPDOWN"];
const TEXT_BASED_TYPES = ["TEXT", "TEXTAREA", "EMAIL"];
const NUMBER_BASED_TYPES = ["INTEGER"];
const GRID_TYPES = ["MC_GRID", "TICK_BOX_GRID"];

export default function BuilderPage() {
  const router = useRouter();
  const params = useParams();
  const formId = Array.isArray(params.formId) ? params.formId[0] : params.formId;

  const { getForm, setFormFromServer, updateVersion } = useForms();
  const form = getForm(formId);

  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [localFields, setLocalFields] = useState([]);
  const [activeFieldId, setActiveFieldId] = useState(null);

  useEffect(() => {
    const fetchForm = async () => {
      try {
        const response = await api.getForm(formId);
        setFormFromServer(response.data);
        const draft = response.data.versions?.find((v) => v.status === "DRAFT");
        setLocalFields(draft?.fields || []);
      } catch (err) {
        console.error("Failed to fetch form:", err);
      } finally {
        setLoading(false);
      }
    };
    if (formId) fetchForm();
  }, [formId]);

  // ── Derived state (BEFORE any early returns so all functions can reference them) ──
  const draft = form?.versions?.find((v) => v.status === "DRAFT");
  const publishedVersion = form?.versions?.find((v) => v.status === "PUBLISHED");

  // ── Helpers ──────────────────────────────────────────────────────────────────────
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
      validation: isGrid
        ? { rows: ["Row 1", "Row 2"], columns: ["Column 1", "Column 2"] }
        : {},
      uiConfig:
        type === "STAR_RATING" ? { maxStars: 5 }
          : type === "LINEAR_SCALE" ? { scaleMin: 1, scaleMax: 5, lowLabel: "Not likely", highLabel: "Very likely" }
            : type === "FILE_UPLOAD" ? { acceptedFileTypes: [".pdf", ".png", ".jpg"], maxFileSizeMb: 5 }
              : type === "LOOKUP_DROPDOWN" ? { sourceTable: "", sourceColumn: "" }  // ✅ ADD THIS
                : {},
    };
  };

  // ── Drag handlers ─────────────────────────────────────────────────────────────────
  const handleSidebarDragStart = (e, type) => e.dataTransfer.setData("newFieldType", type);
  const handleFieldDragStart = (e, index) => e.dataTransfer.setData("existingFieldIndex", index);
  const handleDragOver = (e) => e.preventDefault();

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
    const newFieldType = e.dataTransfer.getData("newFieldType");
    const existingFieldIndex = e.dataTransfer.getData("existingFieldIndex");
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

  // ── Field updaters ────────────────────────────────────────────────────────────────
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

  // ── Option helpers ────────────────────────────────────────────────────────────────
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

  // ── API handlers ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    const payload = localFields.map((field, index) => ({
      fieldKey: generateFieldKey(field.fieldLabel, index + 1),
      fieldLabel: field.fieldLabel,
      fieldType: field.fieldType,
      required: field.required || false,
      fieldOrder: index + 1,
      options: field.options || [],
      validation: {
        ...(field.validation || {}),
        rows: field.validation?.rows || [],
        columns: field.validation?.columns || [],
      },
      uiConfig: { ...(field.uiConfig || {}) },
    }));
    try {
      await api.saveDraft(draft.id, payload);
      console.log("=== FORM VALUES ===", JSON.stringify(localFields, null, 2))
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
      await api.publishVersion(formId);
      updateVersion(form.id, draft.id, { status: "PUBLISHED" });
      router.push("/");
    } catch {
      alert("Publish failed");
      setPublishing(false);
    }
  };

  // ── Early returns (AFTER all hooks & function defs) ───────────────────────────────
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

  if (!draft && publishedVersion) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
        <div className="bg-white p-10 rounded-3xl shadow-sm border border-slate-200 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <Lock className="text-indigo-600" size={32} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-3">Form is Published</h1>
          <p className="text-slate-500 mb-8 leading-relaxed">
            This form is currently live and collecting responses. Its structure cannot be modified to protect data integrity.
          </p>
          <div className="space-y-3">
            <Link
              href={`/forms/${formId}/submissions`}
              className="flex items-center justify-center w-full gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-xl font-medium transition-colors"
            >
              <ClipboardList size={18} /> View Submissions
            </Link>
            <Link
              href="/"
              className="flex items-center justify-center w-full gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-5 py-3 rounded-xl font-medium transition-colors"
            >
              <ArrowLeft size={18} /> Return to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── Derived for render ────────────────────────────────────────────────────────────
  const activeField = localFields.find((f) => f.id === activeFieldId);

  // ── Field preview renderer ────────────────────────────────────────────────────────
  const renderFieldPreview = (field) => {
    const opts = field.options || ["Option 1"];
    const placeholder = field.uiConfig?.placeholder || "Users will answer here...";
    const helpText = field.uiConfig?.helpText || null;

    const preview = (() => {
      switch (field.fieldType) {
        case "TEXTAREA":
          return (
            <div className="w-full h-20 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-400">
              {placeholder}
            </div>
          );

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

        case "FILE_UPLOAD":
          return (
            <div className="w-full border-2 border-dashed border-slate-300 rounded-xl px-6 py-8 flex flex-col items-center gap-2 text-slate-400 bg-slate-50">
              <Upload size={24} />
              <p className="text-sm font-medium">Click to upload or drag &amp; drop</p>
              <p className="text-xs">
                {field.uiConfig?.acceptedFileTypes?.join(", ") || "Any file"} · max {field.uiConfig?.maxFileSizeMb || 5}MB
              </p>
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
          const min = field.uiConfig?.scaleMin ?? 1;
          const max = field.uiConfig?.scaleMax ?? 5;
          const steps = Array.from({ length: max - min + 1 }, (_, i) => min + i);
          return (
            <div className="space-y-2">
              <div className="flex gap-3 items-center flex-wrap">
                {steps.map((val) => (
                  <div key={val} className="flex flex-col items-center gap-1">
                    <div className="w-8 h-8 rounded-full border-2 border-slate-300 flex items-center justify-center text-xs text-slate-500 font-medium bg-slate-50">
                      {val}
                    </div>
                  </div>
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
              {field.uiConfig?.sourceTable
                ? `Linked to: ${field.uiConfig.sourceTable}.${field.uiConfig.sourceColumn}`
                : "No table linked yet"}
              <ChevronDown size={16} className="text-slate-400" />
            </div>
          );

        case "MC_GRID":
        case "TICK_BOX_GRID": {
          const rows = field.validation?.rows || ["Row 1"];
          const cols = field.validation?.columns || ["Col 1"];
          const isTickBox = field.fieldType === "TICK_BOX_GRID";
          return (
            <div className="overflow-x-auto">
              <table className="text-sm w-full">
                <thead>
                  <tr>
                    <th className="p-2"></th>
                    {cols.map((col, i) => (
                      <th key={i} className="p-2 text-center text-slate-600 font-medium text-xs">{col}</th>
                    ))}
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

        default:
          return (
            <div className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-400">
              {placeholder}
            </div>
          );
      }
    })();

    return (
      <div className="space-y-2">
        {preview}
        {helpText && <p className="text-xs text-slate-500 mt-1">{helpText}</p>}
      </div>
    );
  };

  // ── JSX ───────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen bg-slate-50/50 overflow-hidden font-sans">

      {/* ── LEFT SIDEBAR: ELEMENTS ── */}
      <aside className="w-72 bg-white border-r border-slate-200 flex flex-col shrink-0 z-20">
        <div className="p-5 border-b border-slate-100 bg-slate-50/50">
          <Link
            href="/"
            className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-900 mb-6 transition-colors"
          >
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
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg group-hover:bg-indigo-100 transition-colors">
                  {type.icon}
                </div>
                <span className="text-sm font-medium text-slate-700">{type.label}</span>
              </div>
              <GripVertical size={16} className="text-slate-300 group-hover:text-slate-500" />
            </div>
          ))}
        </div>
      </aside>

      {/* ── MAIN CANVAS ── */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Header */}
        <header className="h-[72px] bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 z-10">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-50 p-2 rounded-lg text-indigo-600">
              <LayoutTemplate size={20} />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900 leading-tight line-clamp-1">{form.name}</h1>
              <p className="text-xs text-slate-500 font-medium">Builder Mode</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href={`/forms/${formId}/view`}
              className="hidden sm:flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 px-4 py-2 rounded-lg transition-colors"
            >
              <ClipboardList size={18} /> View form
            </Link>
            <div className="w-px h-6 bg-slate-200 mx-1"></div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <Save size={16} /> {saving ? "Saving..." : "Save Draft"}
            </button>
            <button
              onClick={handlePublish}
              disabled={publishing}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white px-5 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors"
            >
              <Rocket size={16} /> {publishing ? "Publishing..." : "Publish Form"}
            </button>
          </div>
        </header>

        {/* Canvas drop area */}
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
                  className={`group relative bg-white rounded-2xl transition-all cursor-pointer border-2 ${activeFieldId === field.id
                    ? "border-indigo-600 shadow-md ring-4 ring-indigo-50"
                    : "border-slate-200 hover:border-indigo-300 shadow-sm"
                    }`}
                >
                  <div className="absolute left-0 top-0 bottom-0 w-8 flex flex-col items-center justify-center text-slate-300 hover:text-slate-600 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity bg-slate-50 rounded-l-xl border-r border-slate-100">
                    <GripVertical size={18} />
                  </div>
                  <button
                    onClick={(e) => deleteLocalField(field.id, e)}
                    className="absolute -right-3 -top-3 bg-white border border-slate-200 text-slate-400 hover:text-red-600 hover:border-red-200 shadow-sm p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-all z-10"
                  >
                    <Trash2 size={16} />
                  </button>
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

      {/* ── RIGHT SIDEBAR: PROPERTIES ── */}
      <aside className="w-[340px] bg-white border-l border-slate-200 flex flex-col shrink-0 z-20 shadow-xl shadow-slate-200/50">
        <div className="p-5 border-b border-slate-100 bg-slate-50/50">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Settings2 size={16} /> Field Settings
          </h2>
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

              {/* ── Options (RADIO / CHECKBOX_GROUP / DROPDOWN) ── */}
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
                          type="text"
                          value={opt}
                          onChange={(e) => updateOption(activeField.id, idx, e.target.value)}
                          className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                        />
                        <button
                          onClick={() => deleteOption(activeField.id, idx)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => addOption(activeField.id)}
                    className="flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-700 mt-2 px-2 py-1 rounded hover:bg-indigo-50 transition-colors"
                  >
                    <Plus size={16} /> Add option
                  </button>
                </div>
              )}

              {/* ── Star Rating settings ── */}
              {activeField.fieldType === "STAR_RATING" && (
                <div className="space-y-3 pt-4 border-t border-slate-100">
                  <label className="block text-sm font-semibold text-slate-700">Max Stars</label>
                  <input
                    type="number" min={1} max={10}
                    value={activeField.uiConfig?.maxStars || 5}
                    onChange={(e) => updateNestedObject(activeField.id, "uiConfig", "maxStars", Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  />
                </div>
              )}

              {/* ── Linear Scale settings ── */}
              {activeField.fieldType === "LINEAR_SCALE" && (
                <div className="space-y-3 pt-4 border-t border-slate-100">
                  <label className="block text-sm font-semibold text-slate-700">Scale Range</label>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Min</label>
                      <input
                        type="number"
                        value={activeField.uiConfig?.scaleMin ?? 1}
                        onChange={(e) => updateNestedObject(activeField.id, "uiConfig", "scaleMin", Number(e.target.value))}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Max</label>
                      <input
                        type="number"
                        value={activeField.uiConfig?.scaleMax ?? 5}
                        onChange={(e) => updateNestedObject(activeField.id, "uiConfig", "scaleMax", Number(e.target.value))}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Low Label</label>
                    <input
                      type="text"
                      value={activeField.uiConfig?.lowLabel || ""}
                      onChange={(e) => updateNestedObject(activeField.id, "uiConfig", "lowLabel", e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm"
                      placeholder="e.g. Not likely"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">High Label</label>
                    <input
                      type="text"
                      value={activeField.uiConfig?.highLabel || ""}
                      onChange={(e) => updateNestedObject(activeField.id, "uiConfig", "highLabel", e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm"
                      placeholder="e.g. Very likely"
                    />
                  </div>
                </div>
              )}

              {activeField.fieldType === "LOOKUP_DROPDOWN" && (
                <div className="space-y-3 pt-4 border-t border-slate-100">
                  <label className="block text-sm font-semibold text-slate-700">Linked Table</label>
                  <select
                    value={activeField.uiConfig?.sourceTable || ""}
                    onChange={(e) => {
                      updateNestedObject(activeField.id, "uiConfig", "sourceTable", e.target.value);
                      updateNestedObject(activeField.id, "uiConfig", "sourceColumn", ""); // reset column
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="">Select a table...</option>
                    <option value="categories">Categories</option>
                    <option value="users">Users</option>
                    <option value="products">Products</option>
                  </select>

                    {/* {Foreign key} */}
                  {activeField.uiConfig?.sourceTable && (
                    <>
                      <label className="block text-sm font-semibold text-slate-700">Display Column</label>
                      <input
                        type="text"
                        value={activeField.uiConfig?.sourceColumn || ""}
                        onChange={(e) => updateNestedObject(activeField.id, "uiConfig", "sourceColumn", e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm"
                        placeholder="e.g. name, title, email"
                      />
                      <p className="text-xs text-slate-400">
                        Type the exact column name from the <strong>{activeField.uiConfig.sourceTable}</strong> table.
                      </p>
                    </>
                  )}
                </div>
              )}

              {/* ── File Upload settings ── */}
              {activeField.fieldType === "FILE_UPLOAD" && (
                <div className="space-y-3 pt-4 border-t border-slate-100">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Max File Size (MB)</label>
                    <input
                      type="number" min={1} max={100}
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
                          <input
                            type="text"
                            value={ft}
                            onChange={(e) => {
                              const updated = [...(activeField.uiConfig?.acceptedFileTypes || [])];
                              updated[idx] = e.target.value;
                              updateNestedObject(activeField.id, "uiConfig", "acceptedFileTypes", updated);
                            }}
                            className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono"
                            placeholder=".pdf"
                          />
                          <button
                            onClick={() => {
                              const updated = (activeField.uiConfig?.acceptedFileTypes || []).filter((_, i) => i !== idx);
                              updateNestedObject(activeField.id, "uiConfig", "acceptedFileTypes", updated);
                            }}
                            className="p-2 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={() => {
                        const updated = [...(activeField.uiConfig?.acceptedFileTypes || []), ""];
                        updateNestedObject(activeField.id, "uiConfig", "acceptedFileTypes", updated);
                      }}
                      className="flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-700 px-2 py-1 rounded hover:bg-indigo-50 transition-colors mt-2"
                    >
                      <Plus size={16} /> Add file type
                    </button>
                  </div>
                </div>
              )}

              {/* ── Grid settings (MC_GRID + TICK_BOX_GRID) ── */}
              {GRID_TYPES.includes(activeField.fieldType) && (
                <div className="space-y-4 pt-4 border-t border-slate-100">
                  {["rows", "columns"].map((key) => (
                    <div key={key}>
                      <label className="block text-sm font-semibold text-slate-700 capitalize mb-2">{key}</label>
                      <div className="space-y-2">
                        {(activeField.validation?.[key] || []).map((val, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <input
                              type="text"
                              value={val}
                              onChange={(e) => {
                                const updated = [...(activeField.validation?.[key] || [])];
                                updated[idx] = e.target.value;
                                updateNestedObject(activeField.id, "validation", key, updated);
                              }}
                              className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm"
                            />
                            <button
                              onClick={() => {
                                const updated = (activeField.validation?.[key] || []).filter((_, i) => i !== idx);
                                updateNestedObject(activeField.id, "validation", key, updated);
                              }}
                              className="p-2 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        ))}
                      </div>
                      <button
                        onClick={() => {
                          const current = activeField.validation?.[key] || [];
                          const label = key === "rows" ? "Row" : "Column";
                          updateNestedObject(activeField.id, "validation", key, [...current, `${label} ${current.length + 1}`]);
                        }}
                        className="flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-700 px-2 py-1 rounded hover:bg-indigo-50 transition-colors mt-2"
                      >
                        <Plus size={16} /> Add {key === "rows" ? "row" : "column"}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* ── Required toggle ── */}
              <div className="pt-4 border-t border-slate-100">
                <label className="flex items-center justify-between p-4 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-slate-800">Required Field</span>
                    <span className="text-xs text-slate-500 mt-0.5">Force users to answer this</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={activeField.required}
                    onChange={(e) => updateLocalField(activeField.id, "required", e.target.checked)}
                    className="w-5 h-5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                  />
                </label>
              </div>

              {/* ── Display settings ── */}
              {!GRID_TYPES.includes(activeField.fieldType) &&
                activeField.fieldType !== "STAR_RATING" &&
                activeField.fieldType !== "FILE_UPLOAD" && (
                  <div className="pt-4 border-t border-slate-100">
                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-4">
                      <MonitorPlay size={16} className="text-indigo-600" /> Display Settings
                    </h3>
                    <div className="space-y-4">
                      {!OPTIONS_BASED_TYPES.includes(activeField.fieldType) &&
                        activeField.fieldType !== "BOOLEAN" &&
                        activeField.fieldType !== "LINEAR_SCALE" && (
                          <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">Placeholder Text</label>
                            <input
                              type="text"
                              value={activeField.uiConfig?.placeholder || ""}
                              onChange={(e) => updateNestedObject(activeField.id, "uiConfig", "placeholder", e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm"
                              placeholder="e.g. Type your answer here..."
                            />
                          </div>
                        )}
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Help / Subtext</label>
                        <textarea
                          rows={2}
                          value={activeField.uiConfig?.helpText || ""}
                          onChange={(e) => updateNestedObject(activeField.id, "uiConfig", "helpText", e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none"
                          placeholder="Add hints or instructions for users..."
                        />
                      </div>
                    </div>
                  </div>
                )}

              {/* ── Help text for grid/star/file types ── */}
              {(GRID_TYPES.includes(activeField.fieldType) ||
                activeField.fieldType === "STAR_RATING" ||
                activeField.fieldType === "FILE_UPLOAD") && (
                  <div className="pt-4 border-t border-slate-100">
                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-4">
                      <MonitorPlay size={16} className="text-indigo-600" /> Display Settings
                    </h3>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Help / Subtext</label>
                      <textarea
                        rows={2}
                        value={activeField.uiConfig?.helpText || ""}
                        onChange={(e) => updateNestedObject(activeField.id, "uiConfig", "helpText", e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none"
                        placeholder="Add hints or instructions for users..."
                      />
                    </div>
                  </div>
                )}

              {/* ── Validation rules ── */}
              <div className="pt-4 border-t border-slate-100">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-4">
                  <ShieldCheck size={16} className="text-indigo-600" /> Validation Rules
                </h3>
                <div className="space-y-4">
                  {TEXT_BASED_TYPES.includes(activeField.fieldType) && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Min Length</label>
                        <input
                          type="number" min="0"
                          value={activeField.validation?.minLength || ""}
                          onChange={(e) => updateNestedObject(activeField.id, "validation", "minLength", e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm"
                          placeholder="e.g. 10"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Max Length</label>
                        <input
                          type="number" min="0"
                          value={activeField.validation?.maxLength || ""}
                          onChange={(e) => updateNestedObject(activeField.id, "validation", "maxLength", e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm"
                          placeholder="e.g. 500"
                        />
                      </div>
                    </div>
                  )}
                  {NUMBER_BASED_TYPES.includes(activeField.fieldType) && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Min Value</label>
                        <input
                          type="number"
                          value={activeField.validation?.min || ""}
                          onChange={(e) => updateNestedObject(activeField.id, "validation", "min", e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm"
                          placeholder="e.g. 0"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Max Value</label>
                        <input
                          type="number"
                          value={activeField.validation?.max || ""}
                          onChange={(e) => updateNestedObject(activeField.id, "validation", "max", e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm"
                          placeholder="e.g. 100"
                        />
                      </div>
                    </div>
                  )}
                  {activeField.fieldType === "TEXT" && (
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Custom Regex Pattern</label>
                      <input
                        type="text"
                        value={activeField.validation?.pattern || ""}
                        onChange={(e) => updateNestedObject(activeField.id, "validation", "pattern", e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono text-xs"
                        placeholder="^([A-Z])+$"
                      />
                    </div>
                  )}
                  {!TEXT_BASED_TYPES.includes(activeField.fieldType) &&
                    !NUMBER_BASED_TYPES.includes(activeField.fieldType) &&
                    activeField.fieldType !== "TEXT" &&
                    !GRID_TYPES.includes(activeField.fieldType) && (
                      <p className="text-xs text-slate-400 italic">
                        No additional validation rules available for this field type.
                      </p>
                    )}
                </div>
              </div>

            </div>
          )}
        </div>
      </aside>
    </div>
  );
}