"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  Type, AlignLeft, Hash, Calendar, Clock, CircleDot,
  ListTodo, ChevronDown, ToggleRight, Mail, GripVertical,
  Trash2, Rocket, Save, Plus, Settings2, ClipboardList,
  ArrowLeft, LayoutTemplate, X, ShieldCheck, MonitorPlay,
  Lock // Added lock icon for published state
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
];

const OPTIONS_BASED_TYPES = ["RADIO", "CHECKBOX_GROUP", "DROPDOWN"];
const TEXT_BASED_TYPES = ["TEXT", "TEXTAREA", "EMAIL"];
const NUMBER_BASED_TYPES = ["INTEGER"];

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

  const draft = form.versions?.find((v) => v.status === "DRAFT");
  const publishedVersion = form.versions?.find((v) => v.status === "PUBLISHED");

  // --- NEW BLOCK: Show lock screen if published and no draft exists ---
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

  const generateFieldKey = (label, order) => {
    return (label || "field").toLowerCase().trim().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "") + "_" + order;
  };

  // --- Initialize Field with Nested Objects ---
  const createNewField = (type, order) => {
    const isOptionsBased = OPTIONS_BASED_TYPES.includes(type);
    return {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
      fieldLabel: `New ${type.toLowerCase().replace("_", " ")}`,
      fieldType: type,
      required: false,
      fieldOrder: order,
      options: isOptionsBased ? ["Option 1"] : null,
      validation: {}, // Maps to Map<String, Object> in Java
      uiConfig: {},   // Maps to Map<String, Object> in Java
    };
  };

  const handleSidebarDragStart = (e, type) => e.dataTransfer.setData("newFieldType", type);
  const handleFieldDragStart = (e, index) => e.dataTransfer.setData("existingFieldIndex", index);

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

  const handleDragOver = (e) => e.preventDefault();

  // --- Updaters ---
  const updateLocalField = (id, key, value) => {
    setLocalFields((prev) => prev.map((f) => (f.id === id ? { ...f, [key]: value } : f)));
  };

  const updateNestedObject = (id, parentKey, childKey, value) => {
    setLocalFields((prev) => prev.map((f) => {
      if (f.id === id) {
        const newObj = { ...(f[parentKey] || {}) };
        if (value === "" && typeof value !== "boolean") delete newObj[childKey]; // Clean up empty strings
        else newObj[childKey] = value;
        return { ...f, [parentKey]: newObj };
      }
      return f;
    }));
  };

  const deleteLocalField = (id, e) => {
    e.stopPropagation();
    setLocalFields((prev) => prev.filter((f) => f.id !== id));
    if (activeFieldId === id) setActiveFieldId(null);
  };

  // --- Options Updaters ---
  const addOption = (fieldId) => {
    setLocalFields((prev) => prev.map((f) => f.id === fieldId ? { ...f, options: [...(f.options || []), `Option ${(f.options?.length || 0) + 1}`] } : f));
  };

  const updateOption = (fieldId, index, newValue) => {
    setLocalFields((prev) => prev.map((f) => {
      if (f.id === fieldId) {
        const newOptions = [...f.options];
        newOptions[index] = newValue;
        return { ...f, options: newOptions };
      }
      return f;
    }));
  };

  const deleteOption = (fieldId, index) => {
    setLocalFields((prev) => prev.map((f) => f.id === fieldId ? { ...f, options: f.options.filter((_, i) => i !== index) } : f));
  };

  // --- API Sync ---
  const handleSave = async () => {
    setSaving(true);
    
   const payload = localFields.map((field, index) => ({
    fieldKey: generateFieldKey(field.fieldLabel, index + 1),
    fieldLabel: field.fieldLabel,
    fieldType: field.fieldType,
    required: field.required || false,
    fieldOrder: index + 1,
    options: field.options || [], 
    validation: field.validation || {},
    uiConfig: field.uiConfig || {},
  }));

    try {
      await api.saveDraft(draft.id, payload);
      console.log(payload)
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

  const activeField = localFields.find((f) => f.id === activeFieldId);

  const renderFieldPreview = (field) => {
    const isOptions = OPTIONS_BASED_TYPES.includes(field.fieldType);
    const opts = field.options || ["Option 1"];
    const placeholder = field.uiConfig?.placeholder || "Users will answer here...";
    const helpText = field.uiConfig?.helpText || null;

    return (
      <div className="space-y-2">
        {(() => {
          switch (field.fieldType) {
            case "TEXTAREA": return <div className="w-full h-20 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-400">{placeholder}</div>;
            case "RADIO": return <div className="space-y-3">{opts.map((opt, i) => (<div key={i} className="flex items-center gap-3"><div className="w-4 h-4 rounded-full border-2 border-slate-300"></div><span className="text-sm text-slate-600">{opt}</span></div>))}</div>;
            case "CHECKBOX_GROUP": return <div className="space-y-3">{opts.map((opt, i) => (<div key={i} className="flex items-center gap-3"><div className="w-4 h-4 rounded border-2 border-slate-300"></div><span className="text-sm text-slate-600">{opt}</span></div>))}</div>;
            case "DROPDOWN": return <div className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-600 flex justify-between items-center">{opts[0] || "Select an option..."} <ChevronDown size={16} className="text-slate-400" /></div>;
            case "BOOLEAN": return <div className="w-10 h-5 bg-slate-200 rounded-full flex items-center px-1"><div className="w-3.5 h-3.5 bg-white rounded-full"></div></div>;
            default: return <div className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-400">{placeholder}</div>;
          }
        })()}
        {helpText && <p className="text-xs text-slate-500 mt-1">{helpText}</p>}
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-slate-50/50 overflow-hidden font-sans">
      {/* LEFT SIDEBAR: ELEMENTS */}
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
            <div key={type.value} draggable onDragStart={(e) => handleSidebarDragStart(e, type.value)} className="group flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl cursor-grab active:cursor-grabbing hover:border-indigo-400 hover:shadow-sm transition-all">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg group-hover:bg-indigo-100 transition-colors">{type.icon}</div>
                <span className="text-sm font-medium text-slate-700">{type.label}</span>
              </div>
              <GripVertical size={16} className="text-slate-300 group-hover:text-slate-500" />
            </div>
          ))}
        </div>
      </aside>

      {/* MAIN CANVAS */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        <header className="h-[72px] bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 z-10">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-50 p-2 rounded-lg text-indigo-600"><LayoutTemplate size={20} /></div>
            <div>
              <h1 className="text-base font-bold text-slate-900 leading-tight line-clamp-1">{form.name}</h1>
              <p className="text-xs text-slate-500 font-medium">Builder Mode</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href={`/forms/${formId}/view`} className="hidden sm:flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 px-4 py-2 rounded-lg transition-colors"><ClipboardList size={18} /> View form</Link>
            <div className="w-px h-6 bg-slate-200 mx-1"></div>
            <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 px-4 py-2 rounded-lg text-sm font-medium transition-colors"><Save size={16} /> {saving ? "Saving..." : "Save Draft"}</button>
            <button onClick={handlePublish} disabled={publishing} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white px-5 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors"><Rocket size={16} /> {publishing ? "Publishing..." : "Publish Form"}</button>
          </div>
        </header>

        <div onDrop={handleDropOnCanvas} onDragOver={handleDragOver} className="flex-1 overflow-y-auto p-6 lg:p-10 flex justify-center pb-32" onClick={() => setActiveFieldId(null)}>
          <div className="w-full max-w-3xl space-y-4">
            {localFields.length === 0 ? (
              <div className="h-64 border-2 border-dashed border-slate-300 bg-slate-50/50 rounded-2xl flex flex-col items-center justify-center text-slate-400">
                <div className="bg-white p-3 rounded-full shadow-sm border border-slate-100 mb-3"><Plus size={24} className="text-slate-400" /></div>
                <p className="font-medium text-slate-600">Your form is empty</p>
                <p className="text-sm mt-1">Drag and drop elements from the left panel.</p>
              </div>
            ) : (
              localFields.map((field, index) => (
                <div key={field.id} draggable onDragStart={(e) => handleFieldDragStart(e, index)} onDragOver={handleDragOver} onDrop={(e) => handleDropOnField(e, index)} onClick={(e) => { e.stopPropagation(); setActiveFieldId(field.id); }} className={`group relative bg-white rounded-2xl transition-all cursor-pointer border-2 ${activeFieldId === field.id ? "border-indigo-600 shadow-md ring-4 ring-indigo-50" : "border-slate-200 hover:border-indigo-300 shadow-sm"}`}>
                  <div className="absolute left-0 top-0 bottom-0 w-8 flex flex-col items-center justify-center text-slate-300 hover:text-slate-600 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity bg-slate-50 rounded-l-xl border-r border-slate-100"><GripVertical size={18} /></div>
                  <button onClick={(e) => deleteLocalField(field.id, e)} className="absolute -right-3 -top-3 bg-white border border-slate-200 text-slate-400 hover:text-red-600 hover:border-red-200 shadow-sm p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-all z-10"><Trash2 size={16} /></button>
                  <div className="p-8 pl-14 pointer-events-none">
                    <label className="block text-base font-semibold text-slate-800 mb-4">{field.fieldLabel} {field.required && <span className="text-red-500">*</span>}</label>
                    {renderFieldPreview(field)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      {/* RIGHT SIDEBAR: PROPERTIES */}
      <aside className="w-[340px] bg-white border-l border-slate-200 flex flex-col shrink-0 z-20 shadow-xl shadow-slate-200/50">
        <div className="p-5 border-b border-slate-100 bg-slate-50/50">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2"><Settings2 size={16} /> Field Settings</h2>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {!activeField ? (
            <div className="text-center mt-10">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-50 border border-slate-100 mb-3"><Settings2 size={20} className="text-slate-400" /></div>
              <p className="text-sm text-slate-500">Click on any field in the canvas to edit its properties.</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center gap-2 text-xs font-bold tracking-wider text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-md border border-indigo-100 w-fit">
                {activeField.fieldType.replace("_", " ")}
              </div>

              {/* Basic Properties */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700">Question Title</label>
                <textarea rows={2} value={activeField.fieldLabel} onChange={(e) => updateLocalField(activeField.id, "fieldLabel", e.target.value)} className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none" placeholder="Enter your question..." />
              </div>

              {/* Options Builder (If Applicable) */}
              {OPTIONS_BASED_TYPES.includes(activeField.fieldType) && (
                <div className="space-y-3 pt-4 border-t border-slate-100">
                  <label className="block text-sm font-semibold text-slate-700">Options</label>
                  <div className="space-y-2">
                    {activeField.options?.map((opt, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        {activeField.fieldType === "RADIO" && <CircleDot size={16} className="text-slate-400 shrink-0" />}
                        {activeField.fieldType === "CHECKBOX_GROUP" && <div className="w-4 h-4 rounded border-2 border-slate-300 shrink-0"></div>}
                        {activeField.fieldType === "DROPDOWN" && <span className="text-xs font-mono text-slate-400 shrink-0">{idx + 1}.</span>}
                        <input type="text" value={opt} onChange={(e) => updateOption(activeField.id, idx, e.target.value)} className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all" />
                        <button onClick={() => deleteOption(activeField.id, idx)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><X size={16} /></button>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => addOption(activeField.id)} className="flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-700 mt-2 px-2 py-1 rounded hover:bg-indigo-50 transition-colors"><Plus size={16} /> Add option</button>
                </div>
              )}

              {/* Required Toggle */}
              <div className="pt-4 border-t border-slate-100">
                <label className="flex items-center justify-between p-4 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                  <div className="flex flex-col"><span className="text-sm font-semibold text-slate-800">Required Field</span><span className="text-xs text-slate-500 mt-0.5">Force users to answer this</span></div>
                  <input type="checkbox" checked={activeField.required} onChange={(e) => updateLocalField(activeField.id, "required", e.target.checked)} className="w-5 h-5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer" />
                </label>
              </div>

              {/* UI Config (Display Settings) */}
              <div className="pt-4 border-t border-slate-100">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-4">
                  <MonitorPlay size={16} className="text-indigo-600" /> Display Settings
                </h3>
                <div className="space-y-4">
                  {!OPTIONS_BASED_TYPES.includes(activeField.fieldType) && activeField.fieldType !== "BOOLEAN" && (
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

              {/* Advanced Validations */}
              <div className="pt-4 border-t border-slate-100">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-4">
                  <ShieldCheck size={16} className="text-indigo-600" /> Validation Rules
                </h3>
                <div className="space-y-4">
                  {TEXT_BASED_TYPES.includes(activeField.fieldType) && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Min Length</label>
                        <input type="number" min="0" value={activeField.validation?.minLength || ""} onChange={(e) => updateNestedObject(activeField.id, "validation", "minLength", e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm" placeholder="e.g. 10" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Max Length</label>
                        <input type="number" min="0" value={activeField.validation?.maxLength || ""} onChange={(e) => updateNestedObject(activeField.id, "validation", "maxLength", e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm" placeholder="e.g. 500" />
                      </div>
                    </div>
                  )}
                  {NUMBER_BASED_TYPES.includes(activeField.fieldType) && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Min Value</label>
                        <input type="number" value={activeField.validation?.min || ""} onChange={(e) => updateNestedObject(activeField.id, "validation", "min", e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm" placeholder="e.g. 0" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Max Value</label>
                        <input type="number" value={activeField.validation?.max || ""} onChange={(e) => updateNestedObject(activeField.id, "validation", "max", e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm" placeholder="e.g. 100" />
                      </div>
                    </div>
                  )}
                  {activeField.fieldType === "TEXT" && (
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Custom Regex Pattern</label>
                      <input type="text" value={activeField.validation?.pattern || ""} onChange={(e) => updateNestedObject(activeField.id, "validation", "pattern", e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono text-xs" placeholder="^([A-Z])+$" />
                    </div>
                  )}
                  {!TEXT_BASED_TYPES.includes(activeField.fieldType) && !NUMBER_BASED_TYPES.includes(activeField.fieldType) && (
                    <p className="text-xs text-slate-400 italic">No additional validation rules available for this field type.</p>
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