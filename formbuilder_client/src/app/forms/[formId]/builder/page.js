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
  Loader2, ExternalLink, BookOpen, Eye, Users, ShieldAlert, UserPlus, Shield,
  AlertCircle
} from "lucide-react";

import { api } from "@/lib/api/formService";
import { useForms } from "@/context/FormsContext";
import { useAuth } from "@/context/AuthContext";

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
  { value: "SECTION", label: "Section Break", icon: <Heading1 size={18} /> },
  { value: "LABEL", label: "Label / Info", icon: <AlignLeftIcon size={18} /> },
  { value: "PAGE_BREAK", label: "Page Break", icon: <BookOpen size={18} /> },
  { value: "GROUP", label: "Group", icon: <LayoutTemplate size={18} /> },
];

const OPTIONS_BASED_TYPES = ["RADIO", "CHECKBOX_GROUP", "DROPDOWN"];
const TEXT_BASED_TYPES = ["TEXT", "TEXTAREA", "EMAIL"];
const NUMBER_BASED_TYPES = ["INTEGER"];
const GRID_TYPES = ["MC_GRID", "TICK_BOX_GRID"];

const OPERATORS = [
  { value: "equals", label: "equals" },
  { value: "notEquals", label: "not equals" },
  { value: "contains", label: "contains" },
  { value: "greaterThan", label: "greater than" },
  { value: "lessThan", label: "less than" },
  { value: "isEmpty", label: "is empty" },
  { value: "isNotEmpty", label: "is not empty" },
];

const CONDITION_ACTIONS = [
  { value: "show", label: "Show" },
  { value: "hide", label: "Hide" },
  { value: "enable", label: "Enable" },
  { value: "disable", label: "Disable" },
  { value: "calculate", label: "Calculate (auto-fill)" },
  { value: "noop", label: "Always Show (Evaluate Business Rules Only)" },
];

export default function BuilderPage() {
  const router = useRouter();
  const params = useParams();
  const formId = Array.isArray(params.formId) ? params.formId[0] : params.formId;

  const { user } = useAuth();
  const { getForm, setFormFromServer, showToast } = useForms();
  const form = getForm(formId);

  const isOwnerOrAdmin = user?.role === 'ADMIN' || (form && form.ownerId === user?.id);

  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isArchived, setIsArchived] = useState(false);
  const [showLookupModal, setShowLookupModal] = useState(false);
  const [localFields, setLocalFields] = useState([]);
  const [activeFieldId, setActiveFieldId] = useState(null);
  const [publishedForms, setPublishedForms] = useState([]);
  const [activeTab, setActiveTab] = useState('settings');
  const [sidebarTab, setSidebarTab] = useState('fields'); 
  const [permissions, setPermissions] = useState([]); 
  const [visibility, setVisibility] = useState('PUBLIC');
  const [newPermissionUser, setNewPermissionUser] = useState("");
  const [newPermissionRole, setNewPermissionRole] = useState("VIEWER");
  const [isUpdatingForm, setIsUpdatingForm] = useState(false);
  const [updateStatus, setUpdateStatus] = useState(null); 
  const [errorState, setErrorState] = useState(null); 
  const [isAddingPermission, setIsAddingPermission] = useState(false);
  const [dragOverGroupKey, setDragOverGroupKey] = useState(null);
  const [isDraggingOverCanvas, setIsDraggingOverCanvas] = useState(false);
  const [dragOverFieldId, setDragOverFieldId] = useState(null);

  useEffect(() => {
    if (formId) {
      api.getAllPublishedForms(formId)
        .then((res) => setPublishedForms(res?.data || []))
        .catch(console.error);
    }
  }, [formId]);

  useEffect(() => {
    const fetchForm = async () => {
      try {
        const formRes = await api.getForm(formId);
        
        if (formRes.data.canEdit === false) {
           setErrorState({ status: 403, message: "You do not have permission to edit this form." });
           setLoading(false);
           return;
        }

        setFormFromServer(formRes.data);
        setLocalFields(formRes.data.fields || []);
        if (formRes.data.status === "ARCHIVED") {
          setIsArchived(true);
        }
        
        setVisibility(formRes.data.visibility || 'PUBLIC');
        
        try {
           const permsRes = await api.getPermissions(formId);
           setPermissions(permsRes.data || []);
        } catch (pErr) {
           console.warn("Could not fetch permissions (might be a non-owner)", pErr);
        }

      } catch (err) {
        const status = err.response?.status;
        let message = "An unexpected error occurred while loading the form.";
        
        if (status === 401) {
          message = "Unauthorized. Please login to access the form builder.";
        } else if (status === 403) {
          message = "You do not have permission to edit this form.";
        } else if (status === 404) {
          message = "The form you are looking for could not be found.";
        } else {
          console.error("Failed to fetch form:", err);
          message = "Server Error. Something went wrong on our end. Please try again later.";
        }

        setErrorState({ status, message });
      } finally {
        setLoading(false);
      }
    };
    if (formId) {
      fetchForm().catch(() => {});
    }
  }, [formId, setFormFromServer]);

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

  const generateFieldKey = (label, suffix) =>
    (label || "field").toLowerCase().trim()
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9_]/g, "") + "_" + suffix;

  const createNewField = (type, order) => {
    const isOptionsBased = OPTIONS_BASED_TYPES.includes(type);
    const isGrid = GRID_TYPES.includes(type);
    const uniqueSuffix = Date.now().toString(36) + Math.random().toString(36).substr(2, 4);
    return {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
      fieldKey: generateFieldKey(`New ${type.toLowerCase().replace(/_/g, " ")}`, uniqueSuffix),
      fieldLabel: `New ${type.toLowerCase().replace(/_/g, " ")}`,
      fieldType: type,
      required: false,
      fieldOrder: order,
      options: isOptionsBased ? ["Option 1"] : null,
      validation: isGrid ? { rows: ["Row 1", "Row 2"], columns: ["Column 1", "Column 2"] } : {},
      uiConfig:
        type === "STAR_RATING" ? { maxStars: 5 }
          : type === "LINEAR_SCALE" ? { scaleMin: 1, scaleMax: 5, lowLabel: "Not likely", highLabel: "Very likely" }
            : type === "FILE_UPLOAD" ? { acceptedFileTypes: [".pdf", ".png", ".jpg"], maxFileSizeMb: 5 }
              : type === "LOOKUP_DROPDOWN" ? { sourceTable: "", sourceColumn: "id", sourceDisplayColumn: "" }
                : type === "SECTION" ? { title: "New Section", description: "" }
                  : type === "GROUP" ? { title: "New Group", description: "" }
                    : type === "LABEL" ? { title: "Label Title", description: "" }
                      : {},
      conditions: null,
      parentId: null,
    };
  };

  const handleSidebarDragStart = (e, type) => e.dataTransfer.setData("newFieldType", type);
  const handleFieldDragStart = (e, index) => e.dataTransfer.setData("existingFieldIndex", index);
  const handleDragOver = (e) => e.preventDefault();

  const handleDropOnCanvas = (e) => {
    e.preventDefault();
    setIsDraggingOverCanvas(false);
    setDragOverFieldId(null);
    
    const newFieldType = e.dataTransfer.getData("newFieldType");
    const existingIdx = e.dataTransfer.getData("existingFieldIndex");

    if (newFieldType) {
      const newField = createNewField(newFieldType, localFields.length + 1);
      setLocalFields((prev) => [...prev, newField]);
      setActiveFieldId(newField.id);
    } else if (existingIdx !== "") {
      const fromIdx = Number(existingIdx);
      setLocalFields((prev) => {
        const list = [...prev];
        list[fromIdx] = { ...list[fromIdx], parentId: null };
        return list;
      });
    }
  };

  const handleCanvasDragEnter = (e) => {
    e.preventDefault();
    setIsDraggingOverCanvas(true);
  };

  const handleCanvasDragLeave = (e) => {
    e.preventDefault();
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setIsDraggingOverCanvas(false);
    }
  };

  const handleDropOnField = (e, targetIndex) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOverCanvas(false);
    setDragOverFieldId(null);
    
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
      const targetField = localFields[targetIndex];
      newFields.splice(targetIndex, 0, { ...movedField, parentId: targetField?.parentId || null });
      setLocalFields(newFields);
    }
  };

  const handleDropOnGroupChild = (e, targetIndex, groupFieldKey) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverFieldId(null);
    
    const newFieldType = e.dataTransfer.getData("newFieldType");
    const existingFieldIndex = e.dataTransfer.getData("existingFieldIndex");

    if (newFieldType) {
      if (newFieldType === "GROUP") return;
      const newF = createNewField(newFieldType, localFields.length + 1);
      newF.parentId = groupFieldKey;
      const newFields = [...localFields];
      newFields.splice(targetIndex, 0, newF);
      setLocalFields(newFields);
      setActiveFieldId(newF.id);
    } else if (existingFieldIndex !== "") {
      const fromIndex = Number(existingFieldIndex);
      if (fromIndex === targetIndex) return;

      const draggedField = localFields[fromIndex];
      if (!draggedField) return;
      if (draggedField.fieldType === "GROUP") return;

      setLocalFields(prev => {
        const list = [...prev];
        const [moved] = list.splice(fromIndex, 1);
        const insertIndex = fromIndex < targetIndex ? targetIndex : targetIndex;
        list.splice(insertIndex, 0, { ...moved, parentId: groupFieldKey });
        return list;
      });
    }
  };

  const updateLocalField = (id, key, value) =>
    setLocalFields((prev) => {
      const field = prev.find(f => f.id === id);
      if (!field) return prev;

      let nextFields = prev.map((f) => (f.id === id ? { ...f, [key]: value } : f));

      if (key === "fieldKey" && field.fieldType === "GROUP") {
        const oldKey = field.fieldKey;
        nextFields = nextFields.map(f => f.parentId === oldKey ? { ...f, parentId: value } : f);
      }
      return nextFields;
    });

  const updateNestedObject = (id, parentKey, childKey, value) => {
    setLocalFields((prev) =>
      prev.map((f) => {
        if (f.id !== id) return f;
        const newObj = { ...(f[parentKey] || {}) };
        if (value === "" && typeof value !== "boolean") delete newObj[childKey];
        else newObj[childKey] = value;
        return { ...f, [parentKey]: newObj };
      })
    );
  };

  const deleteLocalField = (id, e) => {
    e.stopPropagation();
    setLocalFields((prev) => {
      const fieldToDelete = prev.find(f => f.id === id);
      const filtered = prev.filter((f) => f.id !== id);
      if (fieldToDelete?.fieldType === "GROUP") {
        return filtered.map(f => f.parentId === fieldToDelete.fieldKey ? { ...f, parentId: null } : f);
      }
      return filtered;
    });
    if (activeFieldId === id) setActiveFieldId(null);
  };

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

  const handleSave = async () => {
    setSaving(true);
    const payload = localFields.map((field, index) => {
      const sanitize = (val) => (val === "" ? null : val);

      return {
        fieldKey: field.fieldKey || generateFieldKey(field.fieldLabel, index + 1),
        parentId: field.parentId,
        fieldLabel: field.fieldLabel,
        fieldType: field.fieldType,
        required: field.required || false,
        fieldOrder: index + 1,
        options: field.options || [],
        validation: {
          ...(field.validation || {}),
          minLength: sanitize(field.validation?.minLength),
          maxLength: sanitize(field.validation?.maxLength),
          min: sanitize(field.validation?.min),
          max: sanitize(field.validation?.max),
          rows: field.validation?.rows || [],
          columns: field.validation?.columns || [],
        },
        uiConfig: {
          ...(field.uiConfig || {}),
          maxStars: sanitize(field.uiConfig?.maxStars),
          scaleMin: sanitize(field.uiConfig?.scaleMin),
          scaleMax: sanitize(field.uiConfig?.scaleMax),
          maxFileSizeMb: sanitize(field.uiConfig?.maxFileSizeMb),
        },
        conditions: field.conditions || null,
      };
    });

    try {
      await api.saveDraft(formId, payload);
      alert("Form saved successfully!");
    } catch (e) {
      console.error(e);
      alert("Failed to save form.");
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (localFields.length === 0) return alert("Add at least one field before publishing");
    setPublishing(true);
    try {
      await api.publishForm(formId);
      router.push("/");
    } catch {
      alert("Publish failed");
      setPublishing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-50">
        <div className="animate-spin h-10 w-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full mb-4"></div>
        <p className="text-slate-600 font-medium text-sm tracking-wide">Loading Workspace...</p>
      </div>
    );
  }

  if (errorState || !form) {
    const isForbidden = errorState?.status === 403;
    const isUnauthorized = errorState?.status === 401;
    const isServerError = errorState?.status === 500;
    const isNotFound = errorState?.status === 404;

    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-50 px-6 text-center">
        <div className="w-24 h-24 bg-red-100/50 rounded-full flex items-center justify-center mb-6 shadow-sm border border-red-100">
          {isForbidden || isUnauthorized ? (
            <ShieldAlert size={48} className="text-red-500" />
          ) : isServerError ? (
            <AlertCircle size={48} className="text-red-500" />
          ) : (
            <Search size={48} className="text-slate-400" />
          )}
        </div>
        <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-3">
          {isUnauthorized ? "Login Required" : 
           isForbidden ? "Access Denied" : 
           isServerError ? "Server Error" : 
           isNotFound ? "Form Not Found" : "Error Loading Form"}
        </h2>
        <p className="text-slate-500 max-w-md mb-10 text-lg leading-relaxed">
          {errorState?.message || "There was a problem loading the form builder. Please check your connection and try again."}
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Link href="/" className="px-6 py-3 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 hover:shadow-sm transition-all">
            Back to Dashboard
          </Link>
          {isUnauthorized && (
            <Link href={`/login?redirect=/forms/${formId}/builder`} className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-md hover:shadow-lg active:scale-95">
              Go to Login
            </Link>
          )}
          {isForbidden && (
            <Link href={`/forms/${formId}/view`} className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-md hover:shadow-lg active:scale-95">
              View Live Form
            </Link>
          )}
        </div>
      </div>
    );
  }

  const activeField = localFields.find((f) => f.id === activeFieldId);

  const renderFieldPreview = (field) => {
    const opts = field.options || ["Option 1"];
    const placeholder = field.uiConfig?.placeholder || "Users will answer here...";
    const helpText = field.uiConfig?.helpText || null;

    const preview = (() => {
      switch (field.fieldType) {
        case "TEXTAREA":
          return <div className="w-full h-24 bg-slate-50/80 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-400 shadow-inner">{placeholder}</div>;

        case "RADIO":
          return (
            <div className="space-y-3.5">
              {opts.map((opt, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full border-2 border-slate-300 shrink-0 bg-white"></div>
                  <span className="text-sm text-slate-700 font-medium">{opt}</span>
                </div>
              ))}
            </div>
          );

        case "CHECKBOX_GROUP":
          return (
            <div className="space-y-3.5">
              {opts.map((opt, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded border-2 border-slate-300 shrink-0 bg-white"></div>
                  <span className="text-sm text-slate-700 font-medium">{opt}</span>
                </div>
              ))}
            </div>
          );

        case "DROPDOWN":
          return (
            <div className="w-full bg-slate-50/80 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-500 flex justify-between items-center font-medium shadow-inner">
              {opts[0] || "Select an option..."}
              <ChevronDown size={18} className="text-slate-400" />
            </div>
          );

        case "BOOLEAN":
          return (
            <div className="w-11 h-6 bg-slate-200 rounded-full flex items-center px-1 shadow-inner">
              <div className="w-4 h-4 bg-white rounded-full shadow-sm"></div>
            </div>
          );

        case "SECTION":
          return (
            <div className="border-t-[3px] border-indigo-500 pt-5 mt-2">
              <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">{field.uiConfig?.title || "New Section"}</h3>
              {field.uiConfig?.description && <p className="text-sm text-slate-500 mt-2 leading-relaxed">{field.uiConfig.description}</p>}
            </div>
          );

        case "LABEL":
          return (
            <div className="bg-indigo-50/80 border border-indigo-100 rounded-xl px-5 py-4 shadow-sm">
              <h4 className="text-sm font-bold text-indigo-900">{field.uiConfig?.title || "Label Title"}</h4>
              {field.uiConfig?.description && <p className="text-sm text-indigo-700/80 mt-1.5 leading-relaxed">{field.uiConfig.description}</p>}
            </div>
          );

        case "FILE_UPLOAD":
          return (
            <div className="w-full border-2 border-dashed border-slate-300 hover:border-indigo-400 rounded-xl px-6 py-10 flex flex-col items-center gap-3 text-slate-500 bg-slate-50/50 transition-colors">
              <div className="p-3 bg-white rounded-full shadow-sm border border-slate-100">
                <Upload size={24} className="text-indigo-500" />
              </div>
              <p className="text-sm font-semibold">Click to upload or drag & drop</p>
              <p className="text-xs text-slate-400 font-medium">{field.uiConfig?.acceptedFileTypes?.join(", ") || "Any file"} · max {field.uiConfig?.maxFileSizeMb || 5}MB</p>
            </div>
          );

        case "STAR_RATING":
          return (
            <div className="flex gap-2">
              {Array.from({ length: field.uiConfig?.maxStars || 5 }).map((_, i) => (
                <Star key={i} size={32} className="text-amber-400 fill-amber-400 drop-shadow-sm" />
              ))}
            </div>
          );

        case "LINEAR_SCALE": {
          const min = field.uiConfig?.scaleMin ?? 1;
          const max = field.uiConfig?.scaleMax ?? 5;
          const steps = Array.from({ length: max - min + 1 }, (_, i) => min + i);
          return (
            <div className="space-y-4 pt-2">
              <div className="flex gap-4 items-center flex-wrap">
                {steps.map((val) => (
                  <div key={val} className="w-10 h-10 rounded-full border-2 border-slate-200 flex items-center justify-center text-sm text-slate-600 font-bold bg-white shadow-sm hover:border-indigo-400 hover:text-indigo-600 transition-colors cursor-pointer">{val}</div>
                ))}
              </div>
              <div className="flex justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider px-1">
                <span>{field.uiConfig?.lowLabel || "Not likely"}</span>
                <span>{field.uiConfig?.highLabel || "Very likely"}</span>
              </div>
            </div>
          );
        }

        case "LOOKUP_DROPDOWN":
          return (
            <div className="w-full bg-slate-50/80 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-600 flex justify-between items-center shadow-inner font-medium">
              <span className="flex items-center gap-2">
                <Link2 size={16} className="text-indigo-500" />
                {field.uiConfig?.sourceTable && field.uiConfig?.sourceDisplayColumn
                  ? `${field.uiConfig.sourceTable} → ${field.uiConfig.sourceDisplayColumn}`
                  : "No source linked yet"}
              </span>
              <ChevronDown size={18} className="text-slate-400" />
            </div>
          );

        case "MC_GRID":
        case "TICK_BOX_GRID": {
          const rows = field.validation?.rows || ["Row 1"];
          const cols = field.validation?.columns || ["Col 1"];
          const isTickBox = field.fieldType === "TICK_BOX_GRID";
          return (
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
              <table className="text-sm w-full">
                <thead className="bg-slate-50/80 border-b border-slate-200">
                  <tr>
                    <th className="p-3"></th>
                    {cols.map((col, i) => <th key={i} className="p-3 text-center text-slate-600 font-bold text-xs uppercase tracking-wider">{col}</th>)}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((row, ri) => (
                    <tr key={ri} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4 text-slate-700 font-semibold pr-4 text-sm whitespace-nowrap">{row}</td>
                      {cols.map((_, ci) => (
                        <td key={ci} className="p-4 text-center">
                          {isTickBox
                            ? <div className="w-4 h-4 rounded border-2 border-slate-300 mx-auto bg-white"></div>
                            : <div className="w-4 h-4 rounded-full border-2 border-slate-300 mx-auto bg-white"></div>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }

        case "GROUP": {
          const children = localFields.filter(f => f.parentId === field.fieldKey);
          const isDragOver = dragOverGroupKey === field.fieldKey;

          return (
            <div
              className={`border-2 border-dashed rounded-2xl p-6 min-h-[140px] transition-all duration-300 ease-in-out ${isDragOver
                ? "border-indigo-400 bg-indigo-50/50 shadow-[inset_0_4px_20px_rgba(99,102,241,0.05)]"
                : "border-slate-200 bg-slate-50/50 hover:border-slate-300"
                }`}
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDragOverGroupKey(field.fieldKey); }}
              onDragLeave={(e) => { e.stopPropagation(); setDragOverGroupKey(null); }}
              onDrop={(e) => {
                setDragOverGroupKey(null);
                e.preventDefault();
                e.stopPropagation();
                const newType = e.dataTransfer.getData("newFieldType");
                const existingIdx = e.dataTransfer.getData("existingFieldIndex");

                if (newType) {
                  if (newType === "GROUP") return;
                  const newF = createNewField(newType, localFields.length + 1);
                  newF.parentId = field.fieldKey;
                  setLocalFields(prev => [...prev, newF]);
                  setActiveFieldId(newF.id);
                } else if (existingIdx !== "") {
                  const fromIdx = Number(existingIdx);
                  const moved = { ...localFields[fromIdx] };
                  if (moved.id === field.id) return;
                  if (moved.fieldType === "GROUP") return;
                  setLocalFields(prev => {
                    const list = [...prev];
                    list[fromIdx] = { ...moved, parentId: field.fieldKey };
                    return list;
                  });
                }
              }}
            >
              <div className="flex items-center gap-2.5 mb-5">
                <div className="p-1.5 bg-white border border-slate-200 rounded-lg shadow-sm">
                  <LayoutTemplate size={16} className="text-indigo-600" />
                </div>
                <span className="text-xs font-bold text-slate-700 uppercase tracking-widest">{field.uiConfig?.title || "Group Collection"}</span>
              </div>

              {children.length === 0 ? (
                <div className={`flex flex-col items-center justify-center py-10 rounded-xl border-2 border-dashed transition-all duration-200 ${isDragOver
                  ? "border-indigo-300 bg-white text-indigo-600"
                  : "border-slate-200 bg-white text-slate-400 hover:border-indigo-200"
                  }`}>
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 transition-all ${isDragOver ? "bg-indigo-50" : "bg-slate-50"
                    }`}>
                    <Plus size={24} className={isDragOver ? "text-indigo-600" : "text-slate-400"} />
                  </div>
                  <p className="text-sm font-bold text-slate-600">{isDragOver ? "Drop to append" : "Drag elements here"}</p>
                  <p className="text-xs mt-1 text-slate-400 font-medium">Build nested layouts</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {isDragOver && (
                    <div className="h-14 rounded-xl border-2 border-dashed border-indigo-400 bg-indigo-50 flex items-center justify-center shadow-sm">
                      <p className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Drop to insert</p>
                    </div>
                  )}
                  {children.map(child => {
                    const childIndex = localFields.indexOf(child);
                    return (
                      <div
                        key={child.id}
                        draggable
                        onDragStart={(e) => handleFieldDragStart(e, childIndex)}
                        onDragOver={(e) => { 
                          e.preventDefault(); 
                          e.stopPropagation(); 
                          setDragOverFieldId(child.id); 
                        }}
                        onDragLeave={(e) => { 
                          e.stopPropagation(); 
                          if (e.currentTarget && !e.currentTarget.contains(e.relatedTarget)) {
                            setDragOverFieldId(null);
                          }
                        }}
                        onDrop={(e) => {
                          setDragOverFieldId(null);
                          handleDropOnGroupChild(e, childIndex, field.fieldKey);
                        }}
                        onClick={(e) => { e.stopPropagation(); setActiveFieldId(child.id); }}
                        className={`p-5 rounded-2xl border-2 transition-all duration-200 cursor-pointer bg-white relative ${
                          dragOverFieldId === child.id 
                            ? "border-t-[6px] border-t-indigo-500 border-indigo-200 shadow-lg scale-[1.02] z-30" 
                            : activeFieldId === child.id 
                            ? "border-indigo-500 shadow-md ring-4 ring-indigo-50" 
                            : "border-slate-200 hover:border-indigo-300 shadow-sm hover:shadow"
                        }`}
                      >
                        <div className="flex justify-between items-start mb-3">
                          <label className="text-sm font-bold text-slate-800 tracking-tight">
                            {child.fieldLabel} {child.required && <span className="text-red-500 ml-1">*</span>}
                          </label>
                          <button onClick={(e) => deleteLocalField(child.id, e)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                            <Trash2 size={16} />
                          </button>
                        </div>
                        <div className="pointer-events-none">
                          {renderFieldPreview(child)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        }

        case "PAGE_BREAK":
          return (
            <div className="w-full relative flex items-center justify-center py-8">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t-[3px] border-dashed border-indigo-200/60"></div></div>
              <div className="relative bg-white px-5 text-xs font-black uppercase tracking-widest text-indigo-500 flex items-center gap-2.5 rounded-full border border-indigo-100 shadow-sm py-2">
                <BookOpen size={16} /> Page Break
              </div>
            </div>
          );

        default:
          return <div className="w-full bg-slate-50/80 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-400 shadow-inner">{placeholder}</div>;
      }
    })();

    return (
      <div className="space-y-2.5">
        {preview}
        {helpText && <p className="text-xs font-medium text-slate-500 mt-1.5">{helpText}</p>}
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden selection:bg-indigo-100 selection:text-indigo-900">

      {/* ── LEFT SIDEBAR ── */}
      <aside className="w-[300px] bg-white border-r border-slate-200 flex flex-col shrink-0 z-20 shadow-[1px_0_10px_rgba(0,0,0,0.02)]">
        <div className="p-5 border-b border-slate-100 bg-white">
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-900 mb-6 transition-colors bg-slate-50 hover:bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-100">
            <ArrowLeft size={16} /> Dashboard
          </Link>
          <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <Plus size={16} className="text-indigo-500" /> Form Elements
          </h2>
        </div>
        <div className="p-4 space-y-2.5 overflow-y-auto custom-scrollbar">
          {FIELD_TYPES.map((type) => (
            <div
              key={type.value}
              draggable
              onDragStart={(e) => handleSidebarDragStart(e, type.value)}
              className="group flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl cursor-grab active:cursor-grabbing hover:border-indigo-400 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 ease-in-out"
            >
              <div className="flex items-center gap-3.5">
                <div className="p-2 bg-slate-50 text-slate-500 border border-slate-100 rounded-lg group-hover:bg-indigo-50 group-hover:text-indigo-600 group-hover:border-indigo-100 transition-colors">{type.icon}</div>
                <span className="text-sm font-bold text-slate-700 group-hover:text-slate-900 transition-colors">{type.label}</span>
              </div>
              <GripVertical size={16} className="text-slate-300 group-hover:text-slate-400 transition-colors" />
            </div>
          ))}
        </div>
      </aside>

      {/* ── MAIN CANVAS ── */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative bg-[#F8FAFC]">
        {isArchived && (
          <div className="absolute inset-0 bg-white/70 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
            <div className="bg-white border border-red-100 rounded-3xl p-10 max-w-md w-full text-center shadow-2xl shadow-red-100/40">
              <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6 border-8 border-red-50/50">
                <Archive size={40} className="text-red-500" />
              </div>
              <h2 className="text-2xl font-black text-slate-900 mb-3 tracking-tight">Form Archived</h2>
              <p className="text-slate-500 mb-8 leading-relaxed font-medium">
                This form has been archived and is now in read-only mode. No further changes can be made.
              </p>
              <Link
                href="/"
                className="inline-flex items-center justify-center gap-2 bg-slate-900 text-white px-8 py-3.5 rounded-xl text-sm font-bold hover:bg-slate-800 transition-all shadow-lg hover:shadow-xl active:scale-95"
              >
                Back to Dashboard
              </Link>
            </div>
          </div>
        )}
        
        <header className="h-[76px] bg-white/80 backdrop-blur-md border-b border-slate-200/80 flex items-center justify-between px-8 shrink-0 z-10 sticky top-0 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="bg-indigo-600 shadow-md shadow-indigo-200 p-2.5 rounded-xl text-white">
              <LayoutTemplate size={20} strokeWidth={2.5} />
            </div>
            <div>
              <div className="flex items-center gap-2.5 mb-0.5">
                <h1 className="text-lg font-extrabold text-slate-900 leading-tight tracking-tight line-clamp-1">{form.name}</h1>
                <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-500 uppercase tracking-widest border border-slate-200/60">
                  {form.status || "DRAFT"}
                </span>
              </div>
              <p className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                Builder Mode <span className="w-1 h-1 rounded-full bg-slate-300"></span> by {form.ownerName === user?.username ? "you" : (form.ownerName || "unknown")}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3.5">
            <Link href={`/forms/${formId}/view?preview=true`} className="hidden sm:flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 px-4 py-2.5 rounded-xl transition-all border border-transparent hover:border-slate-200">
              <ClipboardList size={18} /> Preview
            </Link>
            <div className="w-px h-8 bg-slate-200 mx-1"></div>
            <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm active:scale-95">
              <Save size={16} className={saving ? "animate-pulse" : ""} /> {saving ? "Saving..." : "Save Draft"}
            </button>
            <button onClick={handlePublish} disabled={publishing} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-md shadow-indigo-200 hover:shadow-lg hover:shadow-indigo-300 transition-all active:scale-95">
              <Rocket size={16} /> {publishing ? "Publishing..." : "Publish Form"}
            </button>
          </div>
        </header>

        <div
          onDrop={handleDropOnCanvas}
          onDragOver={handleDragOver}
          onDragEnter={handleCanvasDragEnter}
          onDragLeave={handleCanvasDragLeave}
          className={`flex-1 overflow-y-auto p-8 lg:p-12 flex justify-center pb-40 custom-scrollbar transition-all duration-300 ${
            isDraggingOverCanvas && !dragOverFieldId ? "bg-indigo-50/40 shadow-[inset_0_0_40px_rgba(99,102,241,0.1)]" : ""
          }`}
          onClick={() => setActiveFieldId(null)}
        >
          <div className="w-full max-w-3xl space-y-5">
            {localFields.length === 0 ? (
              <div className={`h-72 border-[3px] border-dashed rounded-3xl flex flex-col items-center justify-center transition-colors duration-300 ${
                isDraggingOverCanvas 
                  ? "border-indigo-400 bg-indigo-50/50 text-indigo-500" 
                  : "border-slate-200 hover:border-indigo-300 bg-white/50 text-slate-400"
              }`}>
                <div className={`p-4 rounded-2xl shadow-sm border mb-4 transition-colors ${
                  isDraggingOverCanvas ? "bg-indigo-100 border-indigo-200" : "bg-white border-slate-100"
                }`}>
                  <Plus size={32} className={isDraggingOverCanvas ? "text-indigo-600" : "text-indigo-400"} />
                </div>
                <p className={`font-extrabold text-lg tracking-tight ${isDraggingOverCanvas ? "text-indigo-700" : "text-slate-700"}`}>
                  {isDraggingOverCanvas ? "Drop to add field" : "Your form is empty"}
                </p>
                <p className="text-sm mt-1.5 font-medium">
                  {isDraggingOverCanvas ? "Release the mouse button here." : "Drag and drop elements from the left panel."}
                </p>
              </div>
            ) : (
              <>
                {localFields.filter(f => !f.parentId).map((field) => {
                  const realIndex = localFields.indexOf(field);
                  return (
                    <div
                      key={field.id}
                      draggable
                      onDragStart={(e) => handleFieldDragStart(e, realIndex)}
                      onDragOver={(e) => { 
                        e.preventDefault(); 
                        e.stopPropagation(); 
                        setDragOverFieldId(field.id); 
                      }}
                      onDragLeave={(e) => { 
                        e.stopPropagation(); 
                        if (e.currentTarget && !e.currentTarget.contains(e.relatedTarget)) {
                          setDragOverFieldId(null);
                        }
                      }}
                      onDrop={(e) => handleDropOnField(e, realIndex)}
                      onClick={(e) => { e.stopPropagation(); setActiveFieldId(field.id); }}
                      className={`group relative bg-white rounded-[24px] transition-all duration-200 ease-in-out cursor-pointer border-2 ${
                        dragOverFieldId === field.id
                          ? "border-t-[6px] border-t-indigo-500 border-indigo-200 shadow-xl scale-[1.02] z-30"
                          : activeFieldId === field.id
                          ? "border-indigo-500 shadow-lg ring-4 ring-indigo-50"
                          : "border-slate-200 hover:border-indigo-300 shadow-sm hover:shadow-md"
                        }`}
                    >
                      <div className="absolute left-0 top-0 bottom-0 w-10 flex flex-col items-center justify-center text-slate-300 hover:text-slate-600 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity bg-slate-50 rounded-l-[22px] border-r border-slate-100 z-10">
                        <GripVertical size={20} />
                      </div>
                      <button
                        onClick={(e) => deleteLocalField(field.id, e)}
                        className="absolute -right-3 -top-3 bg-white border border-slate-200 text-slate-400 hover:text-red-600 hover:border-red-200 shadow-md p-2 rounded-full opacity-0 group-hover:opacity-100 transition-all z-20 hover:scale-110"
                      >
                        <Trash2 size={16} />
                      </button>
                      {field.conditions && (() => {
                        try {
                          const c = JSON.parse(field.conditions);
                          if (c.rules?.length > 0) return (
                            <div className="absolute -left-3 -top-3 bg-indigo-600 text-white p-1.5 rounded-full shadow-md z-20 border-2 border-white" title="Has conditions">
                              <GitBranch size={14} />
                            </div>
                          );
                        } catch { }
                        return null;
                      })()}
                      <div className={`p-8 pl-16 ${field.fieldType === "GROUP" ? "" : "pointer-events-none"}`}>
                        <label className="block text-lg font-bold text-slate-900 mb-5 tracking-tight">
                          {field.fieldLabel} {field.required && <span className="text-red-500 ml-1">*</span>}
                        </label>
                        {renderFieldPreview(field)}
                      </div>
                    </div>
                  );
                })}

                {/* Dynamic Drop Area Indicator for existing lists */}
                {isDraggingOverCanvas && !dragOverFieldId && localFields.length > 0 && (
                  <div className="h-24 border-[3px] border-dashed border-indigo-400 bg-indigo-50/60 rounded-[24px] flex items-center justify-center shadow-inner animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <p className="font-extrabold text-indigo-600 tracking-widest uppercase text-sm">
                      Drop here to append
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>

      {/* ── RIGHT SIDEBAR ── */}
      <aside className="w-[360px] bg-white border-l border-slate-200 flex flex-col shrink-0 z-20 shadow-[-1px_0_10px_rgba(0,0,0,0.02)]">
        <div className="p-3 border-b border-slate-100 bg-slate-50/80">
          <div className="flex bg-slate-200/60 p-1.5 rounded-xl">
            <button
              onClick={() => setSidebarTab('fields')}
              className={`flex-1 py-2 text-xs font-black uppercase tracking-widest rounded-lg flex items-center justify-center gap-2 transition-all duration-200 ${sidebarTab === 'fields' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
            >
              <Settings2 size={16} /> Properties
            </button>
            <button
              onClick={() => setSidebarTab('form')}
              className={`flex-1 py-2 text-xs font-black uppercase tracking-widest rounded-lg flex items-center justify-center gap-2 transition-all duration-200 ${sidebarTab === 'form' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
            >
              <Lock size={16} /> Access
            </button>
          </div>
        </div>

        {sidebarTab === 'fields' ? (
          <>
            <div className="border-b border-slate-100 bg-white">
              {activeField ? (
                <div className="flex px-4 pt-2">
                  <button
                    onClick={() => setActiveTab('settings')}
                    className={`pb-3 px-4 text-sm font-bold border-b-[3px] transition-colors ${activeTab === 'settings' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                  >
                    Settings
                  </button>
                  {(activeField.fieldType !== "SECTION" && activeField.fieldType !== "LABEL") && (
                    <button
                      onClick={() => setActiveTab('rules')}
                      className={`pb-3 px-4 text-sm font-bold border-b-[3px] transition-colors ${activeTab === 'rules' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                    >
                      Rules
                    </button>
                  )}
                </div>
              ) : (
                <div className="h-[46px]"></div>
              )}
            </div>

            <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
              {!activeField ? (
                <div className="text-center mt-12 bg-slate-50/50 p-6 rounded-2xl border border-dashed border-slate-200">
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-white shadow-sm border border-slate-100 mb-4">
                    <SlidersHorizontal size={24} className="text-indigo-400" />
                  </div>
                  <p className="text-sm font-bold text-slate-700">No field selected</p>
                  <p className="text-xs text-slate-500 mt-1 font-medium leading-relaxed">Click on any field in the canvas to edit its properties.</p>
                </div>
              ) : (
                <div className="space-y-6">

                  {activeTab === 'settings' ? (
                    <>
                      <div className="flex items-center gap-2 text-[10px] font-black tracking-widest uppercase text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-md border border-indigo-100/50 w-fit">
                        {activeField.fieldType.replace(/_/g, " ")}
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-bold text-slate-800">Question Title</label>
                        <textarea
                          rows={2}
                          value={activeField.fieldLabel}
                          onChange={(e) => updateLocalField(activeField.id, "fieldLabel", e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 font-medium hover:border-indigo-300 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white transition-all resize-none shadow-sm"
                          placeholder="Enter your question..."
                        />
                      </div>

                      {(activeField.fieldType === "SECTION" || activeField.fieldType === "LABEL") && (
                        <div className="space-y-4 pt-5 border-t border-slate-100">
                          <div>
                            <label className="block text-sm font-bold text-slate-800 mb-1.5">Title</label>
                            <input
                              type="text"
                              value={activeField.uiConfig?.title || ""}
                              onChange={(e) => updateNestedObject(activeField.id, "uiConfig", "title", e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium hover:border-indigo-300 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white transition-all shadow-sm"
                              placeholder="Section title..."
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-bold text-slate-800 mb-1.5">Description</label>
                            <textarea
                              rows={3}
                              value={activeField.uiConfig?.description || ""}
                              onChange={(e) => updateNestedObject(activeField.id, "uiConfig", "description", e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium hover:border-indigo-300 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white transition-all resize-none shadow-sm"
                              placeholder="Optional description..."
                            />
                          </div>
                        </div>
                      )}

                      {OPTIONS_BASED_TYPES.includes(activeField.fieldType) && (
                        <div className="space-y-4 pt-5 border-t border-slate-100">
                          <label className="block text-sm font-bold text-slate-800">Options</label>
                          <div className="space-y-2.5">
                            {activeField.options?.map((opt, idx) => (
                              <div key={idx} className="flex items-center gap-3">
                                {activeField.fieldType === "RADIO" && <CircleDot size={18} className="text-slate-400 shrink-0" />}
                                {activeField.fieldType === "CHECKBOX_GROUP" && <div className="w-4 h-4 rounded border-2 border-slate-300 shrink-0"></div>}
                                {activeField.fieldType === "DROPDOWN" && <span className="text-xs font-black text-slate-400 shrink-0 w-4 text-right">{idx + 1}.</span>}
                                <input
                                  type="text" value={opt}
                                  onChange={(e) => updateOption(activeField.id, idx, e.target.value)}
                                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-medium hover:border-indigo-300 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white transition-all shadow-sm"
                                />
                                <button onClick={() => deleteOption(activeField.id, idx)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100">
                                  <X size={18} />
                                </button>
                              </div>
                            ))}
                          </div>
                          <button onClick={() => addOption(activeField.id)} className="flex items-center gap-2 text-sm font-bold text-indigo-600 hover:text-indigo-700 mt-3 px-3 py-2 rounded-lg hover:bg-indigo-50 transition-colors border border-transparent hover:border-indigo-100">
                            <Plus size={16} strokeWidth={2.5} /> Add option
                          </button>
                        </div>
                      )}

                      {activeField.fieldType === "STAR_RATING" && (
                        <div className="space-y-3 pt-5 border-t border-slate-100">
                          <label className="block text-sm font-bold text-slate-800">Max Stars</label>
                          <input type="number" min={1} max={10}
                            value={activeField.uiConfig?.maxStars || 5}
                            onChange={(e) => updateNestedObject(activeField.id, "uiConfig", "maxStars", Number(e.target.value))}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium hover:border-indigo-300 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white transition-all shadow-sm"
                          />
                        </div>
                      )}

                      {activeField.fieldType === "LINEAR_SCALE" && (
                        <div className="space-y-4 pt-5 border-t border-slate-100">
                          <label className="block text-sm font-bold text-slate-800">Scale Range</label>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Min</label>
                              <input type="number" value={activeField.uiConfig?.scaleMin ?? 1} onChange={(e) => updateNestedObject(activeField.id, "uiConfig", "scaleMin", Number(e.target.value))} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium hover:border-indigo-300 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white transition-all shadow-sm" />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Max</label>
                              <input type="number" value={activeField.uiConfig?.scaleMax ?? 5} onChange={(e) => updateNestedObject(activeField.id, "uiConfig", "scaleMax", Number(e.target.value))} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium hover:border-indigo-300 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white transition-all shadow-sm" />
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Low Label</label>
                            <input type="text" value={activeField.uiConfig?.lowLabel || ""} onChange={(e) => updateNestedObject(activeField.id, "uiConfig", "lowLabel", e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium hover:border-indigo-300 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white transition-all shadow-sm" placeholder="e.g. Not likely" />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">High Label</label>
                            <input type="text" value={activeField.uiConfig?.highLabel || ""} onChange={(e) => updateNestedObject(activeField.id, "uiConfig", "highLabel", e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium hover:border-indigo-300 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white transition-all shadow-sm" placeholder="e.g. Very likely" />
                          </div>
                        </div>
                      )}

                      {activeField.fieldType === "LOOKUP_DROPDOWN" && (
                        <div className="space-y-4 pt-5 border-t border-slate-100">
                          <label className="block text-sm font-bold text-slate-800">Source Form</label>
                          <select
                            value={activeField.uiConfig?.sourceTable || ""}
                            onChange={(e) => {
                              updateNestedObject(activeField.id, "uiConfig", "sourceTable", e.target.value);
                              updateNestedObject(activeField.id, "uiConfig", "sourceColumn", "id");
                              updateNestedObject(activeField.id, "uiConfig", "sourceDisplayColumn", "");
                            }}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium hover:border-indigo-300 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white transition-all shadow-sm"
                          >
                            <option value="">Select a form...</option>
                            {publishedForms.map((f) => (
                              <option key={f.formId} value={f.tableName}>{f.formName}</option>
                            ))}
                          </select>
                          {activeField.uiConfig?.sourceTable && (
                            <div className="pt-2">
                              <label className="block text-sm font-bold text-slate-800 mb-1.5">Display Column</label>
                              <select
                                value={activeField.uiConfig?.sourceDisplayColumn || ""}
                                onChange={(e) => updateNestedObject(activeField.id, "uiConfig", "sourceDisplayColumn", e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium hover:border-indigo-300 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white transition-all shadow-sm"
                              >
                                <option value="">Select column to display...</option>
                                {(publishedForms.find((f) => f.tableName === activeField.uiConfig.sourceTable)?.fields || []).map((f) => (
                                  <option key={f.key} value={f.key}>{f.label}</option>
                                ))}
                              </select>
                              <p className="text-xs font-medium text-slate-400 mt-2 bg-slate-50 p-2 rounded-lg border border-slate-100">This column will show in the dropdown. The record ID is always stored.</p>
                            </div>
                          )}
                        </div>
                      )}

                      {activeField.fieldType === "FILE_UPLOAD" && (
                        <div className="space-y-4 pt-5 border-t border-slate-100">
                          <div>
                            <label className="block text-sm font-bold text-slate-800 mb-1.5">Max File Size (MB)</label>
                            <input type="number" min={1} max={100}
                              value={activeField.uiConfig?.maxFileSizeMb || 5}
                              onChange={(e) => updateNestedObject(activeField.id, "uiConfig", "maxFileSizeMb", Number(e.target.value))}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium hover:border-indigo-300 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white transition-all shadow-sm"
                            />
                          </div>
                          <div className="pt-2">
                            <label className="block text-sm font-bold text-slate-800 mb-2">Accepted File Types</label>
                            <div className="space-y-2.5">
                              {(activeField.uiConfig?.acceptedFileTypes || []).map((ft, idx) => (
                                <div key={idx} className="flex items-center gap-3">
                                  <input type="text" value={ft}
                                    onChange={(e) => {
                                      const updated = [...(activeField.uiConfig?.acceptedFileTypes || [])];
                                      updated[idx] = e.target.value;
                                      updateNestedObject(activeField.id, "uiConfig", "acceptedFileTypes", updated);
                                    }}
                                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-mono font-bold text-indigo-700 hover:border-indigo-300 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white transition-all shadow-sm"
                                    placeholder=".pdf"
                                  />
                                  <button onClick={() => {
                                    const updated = (activeField.uiConfig?.acceptedFileTypes || []).filter((_, i) => i !== idx);
                                    updateNestedObject(activeField.id, "uiConfig", "acceptedFileTypes", updated);
                                  }} className="p-2 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors border border-transparent hover:border-red-100">
                                    <X size={18} />
                                  </button>
                                </div>
                              ))}
                            </div>
                            <button onClick={() => {
                              const updated = [...(activeField.uiConfig?.acceptedFileTypes || []), ""];
                              updateNestedObject(activeField.id, "uiConfig", "acceptedFileTypes", updated);
                            }} className="flex items-center gap-2 text-sm font-bold text-indigo-600 hover:text-indigo-700 mt-3 px-3 py-2 rounded-lg hover:bg-indigo-50 transition-colors border border-transparent hover:border-indigo-100">
                              <Plus size={16} strokeWidth={2.5} /> Add file type
                            </button>
                          </div>
                        </div>
                      )}

                      {GRID_TYPES.includes(activeField.fieldType) && (
                        <div className="space-y-5 pt-5 border-t border-slate-100">
                          {["rows", "columns"].map((key) => (
                            <div key={key}>
                              <label className="block text-sm font-bold text-slate-800 capitalize mb-2.5">{key}</label>
                              <div className="space-y-2.5">
                                {(activeField.validation?.[key] || []).map((val, idx) => (
                                  <div key={idx} className="flex items-center gap-3">
                                    <input type="text" value={val}
                                      onChange={(e) => {
                                        const updated = [...(activeField.validation?.[key] || [])];
                                        updated[idx] = e.target.value;
                                        updateNestedObject(activeField.id, "validation", key, updated);
                                      }}
                                      className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-medium hover:border-indigo-300 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white transition-all shadow-sm"
                                    />
                                    <button onClick={() => {
                                      const updated = (activeField.validation?.[key] || []).filter((_, i) => i !== idx);
                                      updateNestedObject(activeField.id, "validation", key, updated);
                                    }} className="p-2 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors border border-transparent hover:border-red-100">
                                      <X size={18} />
                                    </button>
                                  </div>
                                ))}
                              </div>
                              <button onClick={() => {
                                const current = activeField.validation?.[key] || [];
                                const lbl = key === "rows" ? "Row" : "Column";
                                updateNestedObject(activeField.id, "validation", key, [...current, `${lbl} ${current.length + 1}`]);
                              }} className="flex items-center gap-2 text-sm font-bold text-indigo-600 hover:text-indigo-700 mt-3 px-3 py-2 rounded-lg hover:bg-indigo-50 transition-colors border border-transparent hover:border-indigo-100">
                                <Plus size={16} strokeWidth={2.5} /> Add {key === "rows" ? "row" : "column"}
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {activeField.fieldType !== "SECTION" && activeField.fieldType !== "LABEL" && (
                        <div className="pt-5 border-t border-slate-100">
                          <label className="flex items-center justify-between p-4 border-2 border-slate-100 rounded-xl cursor-pointer hover:bg-slate-50 hover:border-slate-200 transition-colors">
                            <div className="flex flex-col">
                              <span className="text-sm font-extrabold text-slate-800 tracking-tight">Required Field</span>
                              <span className="text-xs font-medium text-slate-500 mt-0.5">Force users to answer this</span>
                            </div>
                            <input type="checkbox" checked={activeField.required}
                              onChange={(e) => updateLocalField(activeField.id, "required", e.target.checked)}
                              className="w-5 h-5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer transition-all"
                            />
                          </label>
                        </div>
                      )}

                      {activeField.fieldType !== "SECTION" && activeField.fieldType !== "LABEL" && (
                        <div className="pt-5 border-t border-slate-100">
                          <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2.5 mb-5 uppercase tracking-wider">
                            <MonitorPlay size={18} className="text-indigo-500" /> Display Settings
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
                                  <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">Placeholder Text</label>
                                  <input type="text" value={activeField.uiConfig?.placeholder || ""}
                                    onChange={(e) => updateNestedObject(activeField.id, "uiConfig", "placeholder", e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium hover:border-indigo-300 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white transition-all shadow-sm"
                                    placeholder="e.g. Type your answer here..."
                                  />
                                </div>
                              )}
                            <div>
                              <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">Help / Subtext</label>
                              <textarea rows={2} value={activeField.uiConfig?.helpText || ""}
                                onChange={(e) => updateNestedObject(activeField.id, "uiConfig", "helpText", e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium hover:border-indigo-300 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white transition-all resize-none shadow-sm"
                                placeholder="Add hints or instructions for users..."
                              />
                            </div>

                            {!OPTIONS_BASED_TYPES.includes(activeField.fieldType) &&
                              !GRID_TYPES.includes(activeField.fieldType) &&
                              activeField.fieldType !== "BOOLEAN" &&
                              activeField.fieldType !== "LINEAR_SCALE" &&
                              activeField.fieldType !== "FILE_UPLOAD" &&
                              activeField.fieldType !== "LOOKUP_DROPDOWN" && (
                                <div>
                                  <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">Default Value</label>
                                  <input
                                    type={activeField.fieldType === "INTEGER" ? "number" : activeField.fieldType === "DATE" ? "date" : activeField.fieldType === "TIME" ? "time" : "text"}
                                    value={activeField.uiConfig?.defaultValue || ""}
                                    onChange={(e) => updateNestedObject(activeField.id, "uiConfig", "defaultValue", e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium hover:border-indigo-300 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white transition-all shadow-sm"
                                    placeholder="Pre-fill this field with a value..."
                                  />
                                  <p className="text-[11px] font-medium text-slate-400 mt-1.5">This value will be pre-filled when the form loads. Users can change it unless Read-Only is enabled.</p>
                                </div>
                              )}

                            <label className="flex items-center justify-between p-3.5 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 hover:border-slate-300 transition-colors shadow-sm bg-white">
                              <div className="flex flex-col">
                                <span className="text-xs font-extrabold text-slate-800">Read-Only</span>
                                <span className="text-[11px] font-medium text-slate-500 mt-0.5">User can see but not edit this field</span>
                              </div>
                              <input type="checkbox"
                                checked={activeField.uiConfig?.readOnly || false}
                                onChange={(e) => updateNestedObject(activeField.id, "uiConfig", "readOnly", e.target.checked)}
                                className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer transition-all"
                              />
                            </label>

                            <label className="flex items-center justify-between p-3.5 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 hover:border-slate-300 transition-colors shadow-sm bg-white">
                              <div className="flex flex-col pr-2">
                                <span className="text-xs font-extrabold text-slate-800">Hidden Field</span>
                                <span className="text-[11px] font-medium text-slate-500 mt-0.5 leading-tight">Field is hidden from the user but its default value is saved</span>
                              </div>
                              <input type="checkbox"
                                checked={activeField.uiConfig?.hidden || false}
                                onChange={(e) => updateNestedObject(activeField.id, "uiConfig", "hidden", e.target.checked)}
                                className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer transition-all"
                              />
                            </label>
                          </div>
                        </div>
                      )}

                      {activeField.fieldType !== "SECTION" && activeField.fieldType !== "LABEL" && (
                        <div className="pt-5 border-t border-slate-100">
                          <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2.5 mb-5 uppercase tracking-wider">
                            <ShieldCheck size={18} className="text-emerald-500" /> Validation Rules
                          </h3>
                          <div className="space-y-4">
                            {TEXT_BASED_TYPES.includes(activeField.fieldType) && (
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">Min Length</label>
                                  <input type="number" min="0" value={activeField.validation?.minLength || ""}
                                    onChange={(e) => updateNestedObject(activeField.id, "validation", "minLength", e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium hover:border-indigo-300 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white transition-all shadow-sm" placeholder="e.g. 10" />
                                </div>
                                <div>
                                  <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">Max Length</label>
                                  <input type="number" min="0" value={activeField.validation?.maxLength || ""}
                                    onChange={(e) => updateNestedObject(activeField.id, "validation", "maxLength", e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium hover:border-indigo-300 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white transition-all shadow-sm" placeholder="e.g. 500" />
                                </div>
                              </div>
                            )}
                            {NUMBER_BASED_TYPES.includes(activeField.fieldType) && (
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">Min Value</label>
                                  <input type="number" value={activeField.validation?.min || ""}
                                    onChange={(e) => updateNestedObject(activeField.id, "validation", "min", e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium hover:border-indigo-300 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white transition-all shadow-sm" placeholder="e.g. 0" />
                                </div>
                                <div>
                                  <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">Max Value</label>
                                  <input type="number" value={activeField.validation?.max || ""}
                                    onChange={(e) => updateNestedObject(activeField.id, "validation", "max", e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium hover:border-indigo-300 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white transition-all shadow-sm" placeholder="e.g. 100" />
                                </div>
                              </div>
                            )}
                            {activeField.fieldType === "TEXT" && (
                              <div>
                                <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">Custom Regex Pattern</label>
                                <input type="text" value={activeField.validation?.pattern || ""}
                                  onChange={(e) => updateNestedObject(activeField.id, "validation", "pattern", e.target.value)}
                                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-mono font-bold text-indigo-700 hover:border-indigo-300 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white transition-all shadow-sm"
                                  placeholder="^([A-Z])+$"
                                />
                                {activeField.validation?.pattern && (
                                  <div className="mt-3">
                                    <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">Validation Message</label>
                                    <input type="text" value={activeField.validation?.validationMessage || ""}
                                      onChange={(e) => updateNestedObject(activeField.id, "validation", "validationMessage", e.target.value)}
                                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium hover:border-indigo-300 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white transition-all shadow-sm"
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
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                  <p className="text-[11px] font-medium text-slate-500">No additional validation rules available for this field type.</p>
                                </div>
                              )}

                            {["TEXT", "EMAIL", "INTEGER", "DATE", "TIME"].includes(activeField.fieldType) && (
                              <label className="flex items-center justify-between p-4 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 hover:border-slate-300 transition-colors mt-5 shadow-sm bg-white">
                                <div className="flex flex-col pr-2">
                                  <span className="text-xs font-extrabold text-slate-800">Unique Field</span>
                                  <span className="text-[11px] font-medium text-slate-500 mt-0.5 leading-tight">Disallow duplicate answers across all submissions</span>
                                </div>
                                <input type="checkbox"
                                  checked={activeField.validation?.unique || false}
                                  onChange={(e) => updateNestedObject(activeField.id, "validation", "unique", e.target.checked)}
                                  className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer transition-all"
                                />
                              </label>
                            )}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="space-y-6">
                      {activeField.fieldType !== "SECTION" && activeField.fieldType !== "LABEL" && (
                        <div className="space-y-5">
                          <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2.5 mb-5 uppercase tracking-wider">
                            <GitBranch size={18} className="text-indigo-600" /> Conditional Logic
                          </h3>

                          {(() => {
                            const cond = parseConditions(activeField);
                            const updateCond = (updates) => saveConditions(activeField.id, { ...cond, ...updates });
                            const addRule = () => updateCond({ rules: [...cond.rules, { fieldKey: "", operator: "equals", value: "" }] });
                            const removeRule = (idx) => updateCond({ rules: cond.rules.filter((_, i) => i !== idx) });
                            const updateRule = (idx, key, val) => {
                              const newRules = [...cond.rules];
                              newRules[idx] = { ...newRules[idx], [key]: val };
                              updateCond({ rules: newRules });
                            };

                            const otherFields = localFields.filter(
                              (f) => f.id !== activeField.id &&
                                f.fieldType !== "SECTION" &&
                                f.fieldType !== "LABEL" &&
                                f.fieldType !== "FILE_UPLOAD"
                            );

                            return (
                              <div className="space-y-4">
                                <div>
                                  <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">Action</label>
                                  <select
                                    value={cond.action}
                                    onChange={(e) => updateCond({ action: e.target.value })}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium hover:border-indigo-300 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white transition-all shadow-sm"
                                  >
                                    {CONDITION_ACTIONS.map((a) => (
                                      <option key={a.value} value={a.value}>{a.label} this field when:</option>
                                    ))}
                                  </select>
                                </div>

                                {cond.action === "calculate" && (
                                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 shadow-inner">
                                    <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">Formula</label>
                                    <input
                                      type="text"
                                      value={cond.formula || ""}
                                      onChange={(e) => updateCond({ formula: e.target.value })}
                                      className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-sm font-mono font-bold text-indigo-700 hover:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm"
                                      placeholder="e.g. {price_1} * {quantity_2}"
                                    />
                                    <p className="text-[10px] font-medium text-slate-400 mt-2">
                                      Use <span className="font-mono bg-slate-200 px-1 rounded text-slate-600">{"{fieldKey}"}</span> to reference other fields. Supports + - * / ( )
                                    </p>
                                    <div className="mt-3 flex flex-wrap gap-1.5">
                                      {otherFields.map((f) => (
                                        <button
                                          key={f.id}
                                          type="button"
                                          onClick={() => updateCond({ formula: (cond.formula || "") + `{${f.fieldKey}}` })}
                                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-md text-[11px] font-bold hover:bg-indigo-100 hover:border-indigo-200 transition-all"
                                        >
                                          <Plus size={12} strokeWidth={3} /> {f.fieldLabel}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {cond.action !== "calculate" && (
                                  <>
                                    {cond.rules.length > 1 && (
                                      <div className="flex items-center gap-2.5 bg-slate-50 p-2 rounded-lg border border-slate-100 w-fit">
                                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest pl-1">Match:</span>
                                        <div className="flex gap-1">
                                          {["AND", "OR"].map((l) => (
                                            <button key={l} type="button"
                                              onClick={() => updateCond({ logic: l })}
                                              className={`px-3 py-1 rounded-md text-xs font-black transition-all ${cond.logic === l
                                                ? "bg-indigo-600 text-white shadow-sm"
                                                : "bg-transparent text-slate-500 hover:bg-slate-200"
                                                }`}
                                            >
                                              {l}
                                            </button>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    <div className="space-y-3">
                                      {cond.rules.map((rule, idx) => (
                                        <div key={idx} className="flex flex-col gap-2 bg-slate-50 rounded-xl p-3 border border-slate-200 shadow-sm relative pt-6 group">
                                          <button onClick={() => removeRule(idx)}
                                            className="absolute right-2 top-2 p-1.5 text-slate-400 hover:text-red-500 bg-white hover:bg-red-50 rounded-lg transition-colors border border-slate-100 hover:border-red-100 shadow-sm">
                                            <X size={14} />
                                          </button>
                                          <div className="flex flex-col gap-2 mt-1">
                                            <select
                                              value={rule.fieldKey}
                                              onChange={(e) => updateRule(idx, "fieldKey", e.target.value)}
                                              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm"
                                            >
                                              <option value="">Select field...</option>
                                              <option value={activeField.fieldKey}>This Field</option>
                                              {otherFields.map((f) => (
                                                <option key={f.id} value={f.fieldKey}>
                                                  {f.fieldLabel}
                                                </option>
                                              ))}
                                            </select>

                                            <div className="flex gap-2">
                                              <select
                                                value={rule.operator}
                                                onChange={(e) => updateRule(idx, "operator", e.target.value)}
                                                className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm"
                                              >
                                                {OPERATORS.map((op) => (
                                                  <option key={op.value} value={op.value}>{op.label}</option>
                                                ))}
                                              </select>

                                              {!["isEmpty", "isNotEmpty"].includes(rule.operator) && (
                                                <input
                                                  type="text"
                                                  value={rule.value}
                                                  onChange={(e) => updateRule(idx, "value", e.target.value)}
                                                  className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm"
                                                  placeholder="Value"
                                                />
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                    </div>

                                    <button onClick={addRule}
                                      className="flex items-center justify-center w-full gap-2 text-sm font-bold text-indigo-600 hover:text-indigo-700 bg-white border-2 border-dashed border-indigo-200 hover:border-indigo-400 hover:bg-indigo-50 py-2.5 rounded-xl transition-all">
                                      <Plus size={16} strokeWidth={2.5} /> Add Condition
                                    </button>

                                    {cond.rules.length === 0 && (
                                      <p className="text-[11px] font-medium text-slate-400 bg-slate-50 p-3 rounded-lg border border-slate-100 text-center">
                                        No conditions attached. Field is always visible and enabled.
                                      </p>
                                    )}
                                  </>
                                )}

                                <div className="pt-6 mt-6 border-t border-slate-100">
                                  <label className="block text-xs font-black uppercase tracking-widest text-slate-700 mb-3">If conditions match, execute:</label>
                                  <div className="space-y-4">
                                    {cond.actions.map((act, actIdx) => (
                                      <div key={actIdx} className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-4 relative shadow-sm">
                                        <button onClick={() => {
                                          updateCond({ actions: cond.actions.filter((_, i) => i !== actIdx) });
                                        }} className="absolute right-2 top-2 p-1.5 text-slate-400 hover:text-red-500 bg-white hover:bg-red-50 rounded-lg transition-colors shadow-sm border border-slate-100">
                                          <X size={14} />
                                        </button>

                                        <select value={act.type || ""} onChange={(e) => {
                                          const newActions = [...cond.actions];
                                          newActions[actIdx] = { ...act, type: e.target.value };
                                          updateCond({ actions: newActions });
                                        }} className="w-[calc(100%-2rem)] bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 mb-3 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-sm transition-all">
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
                                          }} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-sm" placeholder="Custom error message..." />
                                        )}

                                        {act.type === "REQUIRE" && (
                                          <div className="space-y-2.5">
                                            <select value={act.targetField || ""} onChange={(e) => {
                                              const newActions = [...cond.actions];
                                              newActions[actIdx] = { ...act, targetField: e.target.value };
                                              updateCond({ actions: newActions });
                                            }} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-sm">
                                              <option value="">Select field to require...</option>
                                              <option value={activeField.fieldKey}>This Field</option>
                                              {otherFields.map(f => (
                                                <option key={f.id} value={f.fieldKey}>{f.fieldLabel}</option>
                                              ))}
                                            </select>
                                            <input type="text" value={act.message || ""} onChange={(e) => {
                                              const newActions = [...cond.actions];
                                              newActions[actIdx] = { ...act, message: e.target.value };
                                              updateCond({ actions: newActions });
                                            }} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-sm" placeholder="Optional custom required message..." />
                                          </div>
                                        )}

                                        {["MIN_LENGTH", "MAX_LENGTH", "MIN_VALUE", "MAX_VALUE"].includes(act.type) && (
                                          <div className="space-y-2.5">
                                            <div className="flex gap-2">
                                              <select value={act.targetField || ""} onChange={(e) => {
                                                const newActions = [...cond.actions];
                                                newActions[actIdx] = { ...act, targetField: e.target.value };
                                                updateCond({ actions: newActions });
                                              }} className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-sm">
                                                <option value="">Select field...</option>
                                                <option value={activeField.fieldKey}>This Field</option>
                                                {otherFields.map(f => (
                                                  <option key={f.id} value={f.fieldKey}>{f.fieldLabel}</option>
                                                ))}
                                              </select>
                                              <input type="number" min="1" value={act.value || ""} onChange={(e) => {
                                                const newActions = [...cond.actions];
                                                newActions[actIdx] = { ...act, value: e.target.value };
                                                updateCond({ actions: newActions });
                                              }} className="w-24 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-sm" placeholder="Length" />
                                            </div>
                                            <input type="text" value={act.message || ""} onChange={(e) => {
                                              const newActions = [...cond.actions];
                                              newActions[actIdx] = { ...act, message: e.target.value };
                                              updateCond({ actions: newActions });
                                            }} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-sm" placeholder="Optional custom message..." />
                                          </div>
                                        )}

                                        {act.type === "REGEX_MATCH" && (
                                          <div className="space-y-2.5">
                                            <div className="flex gap-2">
                                              <select value={act.targetField || ""} onChange={(e) => {
                                                const newActions = [...cond.actions];
                                                newActions[actIdx] = { ...act, targetField: e.target.value };
                                                updateCond({ actions: newActions });
                                              }} className="flex-[0.8] bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-sm">
                                                <option value="">Select field...</option>
                                                <option value={activeField.fieldKey}>This Field</option>
                                                {otherFields.map(f => (
                                                  <option key={f.id} value={f.fieldKey}>{f.fieldLabel}</option>
                                                ))}
                                              </select>
                                              <input type="text" value={act.value || ""} onChange={(e) => {
                                                const newActions = [...cond.actions];
                                                newActions[actIdx] = { ...act, value: e.target.value };
                                                updateCond({ actions: newActions });
                                              }} className="flex-[1.2] bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono font-bold focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-sm" placeholder="Regex (^...$)" />
                                            </div>
                                            <input type="text" value={act.message || ""} onChange={(e) => {
                                              const newActions = [...cond.actions];
                                              newActions[actIdx] = { ...act, message: e.target.value };
                                              updateCond({ actions: newActions });
                                            }} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-sm" placeholder="Optional custom regex message..." />
                                          </div>
                                        )}

                                        {act.type === "MATCH_FIELD" && (
                                          <div className="space-y-2.5">
                                            <div className="flex flex-col gap-2">
                                              <select value={act.targetField || ""} onChange={(e) => {
                                                const newActions = [...cond.actions];
                                                newActions[actIdx] = { ...act, targetField: e.target.value };
                                                updateCond({ actions: newActions });
                                              }} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-sm">
                                                <option value="">Select first field...</option>
                                                <option value={activeField.fieldKey}>This Field</option>
                                                {otherFields.map(f => (
                                                  <option key={f.id} value={f.fieldKey}>{f.fieldLabel}</option>
                                                ))}
                                              </select>
                                              <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-white px-2 py-1 rounded border border-slate-100 shadow-sm">must match</span>
                                                <select value={act.value || ""} onChange={(e) => {
                                                  const newActions = [...cond.actions];
                                                  newActions[actIdx] = { ...act, value: e.target.value };
                                                  updateCond({ actions: newActions });
                                                }} className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-sm">
                                                  <option value="">Select field to match...</option>
                                                  <option value={activeField.fieldKey}>This Field</option>
                                                  {otherFields.map(f => (
                                                    <option key={f.id} value={f.fieldKey}>{f.fieldLabel}</option>
                                                  ))}
                                                </select>
                                              </div>
                                            </div>
                                            <input type="text" value={act.message || ""} onChange={(e) => {
                                              const newActions = [...cond.actions];
                                              newActions[actIdx] = { ...act, message: e.target.value };
                                              updateCond({ actions: newActions });
                                            }} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-sm" placeholder="Optional custom match message..." />
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                    
                                    <button onClick={() => updateCond({ actions: [...cond.actions, { type: "", message: "", targetField: "" }] })}
                                      className="flex items-center justify-center w-full gap-2 text-sm font-bold text-emerald-600 hover:text-emerald-700 bg-white border-2 border-dashed border-emerald-200 hover:border-emerald-400 hover:bg-emerald-50 py-2.5 rounded-xl transition-all">
                                      <Plus size={16} strokeWidth={2.5} /> Add Business Action
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
          </>
        ) : (
          /* ── FORM ACCESS TAB ── */
          <div className="flex-1 flex flex-col min-h-0 bg-slate-50/50">
            <div className="p-8 space-y-10 overflow-y-auto flex-1 custom-scrollbar">
              
              {/* Visibility Section */}
              <section className="space-y-5">
                <div className="flex items-center gap-3.5">
                  <div className="p-2.5 bg-white shadow-sm border border-slate-100 rounded-xl">
                    <Eye className="text-indigo-600" size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                      Form Visibility
                      {!isOwnerOrAdmin && <Shield size={14} className="text-slate-400" title="Only owner or admin can change" />}
                    </h3>
                    <p className="text-xs font-medium text-slate-500 mt-0.5">
                      {isOwnerOrAdmin ? "Control who can see and submit this form" : "Only form owner or admin can change these settings"}
                    </p>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  {[
                    { id: 'PUBLIC', label: 'Public', desc: 'Anyone with the link can view and submit.', icon: <Users size={18} /> },
                    { id: 'LINK', label: 'Authenticated Only', desc: 'Only logged-in users can access.', icon: <Lock size={18} /> },
                    { id: 'RESTRICTED', label: 'Restricted', desc: 'Only specified users can access.', icon: <ShieldAlert size={18} /> }
                  ].map((v) => (
                    <label key={v.id} className={`flex items-start gap-4 p-4 rounded-xl border-2 transition-all duration-200 cursor-pointer group ${visibility === v.id ? 'border-indigo-600 bg-indigo-50/50 shadow-md ring-4 ring-indigo-50' : 'border-slate-200 bg-white hover:border-indigo-300 hover:shadow-sm'}`}>
                      <div className="pt-0.5">
                        <input
                          type="radio"
                          name="visibility"
                          value={v.id}
                          checked={visibility === v.id}
                          onChange={(e) => setVisibility(e.target.value)}
                          disabled={!isOwnerOrAdmin}
                          className={`w-4 h-4 text-indigo-600 border-slate-300 focus:ring-indigo-500 transition-all ${!isOwnerOrAdmin ? 'cursor-not-allowed opacity-50' : ''}`}
                        />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`${visibility === v.id ? 'text-indigo-600' : 'text-slate-400 group-hover:text-indigo-400 transition-colors'}`}>{v.icon}</span>
                          <span className="text-sm font-extrabold text-slate-900">{v.label}</span>
                        </div>
                        <p className="text-xs font-medium text-slate-500 leading-relaxed">{v.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>

                <button 
                  onClick={async () => {
                    setIsUpdatingForm(true);
                    try {
                      await api.updateVisibility(formId, visibility);
                      setFormFromServer(prev => ({ ...prev, visibility: visibility }));
                      setUpdateStatus({ type: 'success', message: 'Settings saved!' });
                      setTimeout(() => setUpdateStatus(null), 3000);
                    } catch (err) {
                      console.error("Failed to update visibility", err);
                      setUpdateStatus({ type: 'error', message: 'Failed to save settings.' });
                      setTimeout(() => setUpdateStatus(null), 3000);
                    } finally {
                      setIsUpdatingForm(false);
                    }
                  }}
                  disabled={isUpdatingForm || !isOwnerOrAdmin}
                  className={`w-full mt-4 py-3.5 text-white rounded-xl text-sm font-bold transition-all shadow-lg flex items-center justify-center gap-2 active:scale-95 ${
                    isOwnerOrAdmin 
                      ? "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200" 
                      : "bg-slate-400 cursor-not-allowed shadow-none"
                  } disabled:opacity-50`}
                >
                  {isUpdatingForm ? <div className="w-5 h-5 border-[3px] border-white/20 border-t-white rounded-full animate-spin" /> : (!isOwnerOrAdmin ? <Lock size={18} /> : <Save size={18} />)}
                  {isOwnerOrAdmin ? "Update Visibility Settings" : "Visibility Settings Locked"}
                </button>

                {updateStatus && (
                  <div className={`mt-3 p-3.5 rounded-xl text-xs font-bold flex items-center gap-2.5 animate-in fade-in slide-in-from-top-2 shadow-sm ${updateStatus.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                    {updateStatus.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                    {updateStatus.message}
                  </div>
                )}
              </section>

              <hr className="border-slate-200/60" />

              {/* Permissions Section */}
              <section className="space-y-6 pb-12">
                <div className="flex items-center gap-3.5">
                  <div className="p-2.5 bg-white shadow-sm border border-slate-100 rounded-xl">
                    <ShieldCheck className="text-emerald-500" size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 tracking-tight">User Permissions</h3>
                    <p className="text-xs font-medium text-slate-500 mt-0.5">Manage specific user access roles</p>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Username / Email</label>
                    <div className="relative">
                      <UserPlus size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Type username..."
                        value={newPermissionUser}
                        onChange={(e) => setNewPermissionUser(e.target.value)}
                        className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all shadow-inner"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-[1fr_auto] gap-3">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Select Role</label>
                      <select
                        value={newPermissionRole}
                        onChange={(e) => setNewPermissionRole(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all shadow-inner"
                      >
                        <option value="VIEWER">Viewer</option>
                        <option value="BUILDER">Builder</option>
                      </select>
                    </div>
                    <div className="flex items-end">
                      <button 
                        disabled={isAddingPermission || !newPermissionUser}
                        onClick={async (e) => {
                          e.preventDefault();
                          if (!newPermissionUser || isAddingPermission) return;
                          
                          setIsAddingPermission(true);
                          try {
                            const response = await api.addPermission(formId, newPermissionUser, newPermissionRole);
                            
                            // Success path
                            setNewPermissionUser("");
                            showToast(`Permission granted to ${newPermissionUser} successfully!`, "success");
                            
                            // Refresh permissions list
                            const resp = await api.getPermissions(formId);
                            setPermissions(resp.data || []);
                          } catch (err) {
                            console.error("Failed to add permission", err);
                            
                            // Robust error message extraction
                            const errorMsg = err.response?.data?.message 
                              || err.response?.data?.error 
                              || err.message 
                              || "Failed to add permission. Please try again.";
                            
                            showToast(errorMsg, "error");
                          } finally {
                            setIsAddingPermission(false);
                          }
                        }}
                        className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all shadow-md flex items-center justify-center gap-2 active:scale-95 h-[42px] min-w-[100px] ${
                          isAddingPermission || !newPermissionUser 
                            ? "bg-slate-100 text-slate-400 cursor-not-allowed shadow-none" 
                            : "bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-200"
                        }`}
                      >
                        {isAddingPermission ? (
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <Plus size={18} strokeWidth={2.5} />
                        )} 
                        {isAddingPermission ? "Adding..." : "Add"}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Active Permissions</label>
                  <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                    
                    <div className="flex items-center justify-between p-3.5 bg-slate-100/80 border border-slate-200/80 rounded-xl">
                      <div className="flex items-center gap-3.5">
                        <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center text-xs font-black text-slate-600 uppercase shadow-inner">
                          YOU
                        </div>
                        <div>
                          <p className="text-sm font-extrabold text-slate-900 leading-tight">You (Owner)</p>
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Full Access</p>
                        </div>
                      </div>
                      <Shield size={18} className="text-slate-400" />
                    </div>

                    {permissions.map((p) => (
                      <div key={p.id} className="flex items-center justify-between p-3.5 bg-white border border-slate-200 rounded-xl group hover:border-slate-300 hover:shadow-sm transition-all">
                        <div className="flex items-center gap-3.5">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-black uppercase shadow-inner border ${p.role === 'BUILDER' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                            {p.username.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-extrabold text-slate-900 leading-tight">{p.username}</p>
                            <div className="mt-1">
                              <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-widest ${p.role === 'BUILDER' ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                {p.role}
                              </span>
                            </div>
                          </div>
                        </div>
                        <button 
                          onClick={async () => {
                            try {
                              await api.removePermission(formId, p.id);
                              setPermissions(prev => prev.filter(x => x.id !== p.id));
                            } catch (err) {
                              console.error("Failed to remove permission", err);
                            }
                          }}
                          className="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-100 rounded-xl transition-all opacity-0 group-hover:opacity-100 hover:scale-110 shadow-sm"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}

                    {permissions.length === 0 && (
                      <div className="py-8 text-center border-[3px] border-dashed border-slate-200 rounded-2xl bg-white/50">
                        <Users size={24} className="mx-auto text-slate-300 mb-3" />
                        <p className="text-xs font-bold text-slate-500">No specific user permissions yet.</p>
                      </div>
                    )}
                  </div>
                </div>
              </section>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}