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
  AlertCircle, RotateCcw, Search, PanelLeft, PanelRight, Phone, CalendarClock
} from "lucide-react";

import { api } from "@/lib/api/formService";
import { useForms } from "@/context/FormsContext";
import { useAuth } from "@/context/AuthContext";
import { useConfirm } from "@/context/ConfirmationContext";
import { toast } from "react-hot-toast";
import CustomValidationsPanel from "@/components/builder/CustomValidationsPanel";
import ConfirmationModal from "@/components/common/ConfirmationModal";
import { evaluateFormula } from "@/lib/formulaEvaluator";

const FIELD_CATEGORIES = [
  {
    name: "Essential Fields",
    fields: [
      { value: "TEXT", label: "Short Answer", icon: <Type size={18} /> },
      { value: "TEXTAREA", label: "Paragraph", icon: <AlignLeft size={18} /> },
      { value: "EMAIL", label: "Email", icon: <Mail size={18} /> },
      { value: "INTEGER", label: "Number", icon: <Hash size={18} /> },
      { value: "DATE", label: "Date", icon: <Calendar size={18} /> },
      { value: "TIME", label: "Time", icon: <Clock size={18} /> },
      { value: "DATETIME", label: "Date & Time", icon: <CalendarClock size={18} /> },
      { value: "PHONE", label: "Phone", icon: <Phone size={18} /> },
      { value: "BOOLEAN", label: "Yes/No (Toggle)", icon: <ToggleRight size={18} /> },
    ]
  },
  {
    name: "Selection & Rating",
    fields: [
      { value: "RADIO", label: "Multiple Choice", icon: <CircleDot size={18} /> },
      { value: "CHECKBOX_GROUP", label: "Checkboxes", icon: <ListTodo size={18} /> },
      { value: "DROPDOWN", label: "Dropdown", icon: <ChevronDown size={18} /> },
      { value: "STAR_RATING", label: "Star Rating", icon: <Star size={18} /> },
      { value: "LINEAR_SCALE", label: "Linear Scale", icon: <SlidersHorizontal size={18} /> },
    ]
  },
  {
    name: "Advanced / Interactive",
    fields: [
      { value: "FILE_UPLOAD", label: "File Upload", icon: <Upload size={18} /> },
      { value: "MC_GRID", label: "Multiple Choice Grid", icon: <LayoutGrid size={18} /> },
      { value: "TICK_BOX_GRID", label: "Tick Box Grid", icon: <Grid3x3 size={18} /> },
      { value: "LOOKUP_DROPDOWN", label: "Linked Dropdown", icon: <Link2 size={18} /> },
    ]
  },
  {
    name: "Layout & Logic",
    fields: [
      { value: "SECTION", label: "Section Break", icon: <Heading1 size={18} /> },
      { value: "PAGE_BREAK", label: "Page Break", icon: <BookOpen size={18} /> },
      { value: "GROUP", label: "Group", icon: <LayoutTemplate size={18} /> },
      { value: "LABEL", label: "Label / Info", icon: <AlignLeftIcon size={18} /> },
    ]
  }
];

const OPTIONS_BASED_TYPES = ["RADIO", "CHECKBOX_GROUP", "DROPDOWN"];
const TEXT_BASED_TYPES = ["TEXT", "TEXTAREA", "EMAIL", "PHONE"];
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

const RESERVED_KEYWORDS = [
  "SELECT", "INSERT", "UPDATE", "DELETE", "FROM", "WHERE", "JOIN", "INNER", "LEFT", "RIGHT", "FULL",
  "GROUP", "ORDER", "BY", "HAVING", "LIMIT", "OFFSET", "UNION", "DISTINCT",
  "TABLE", "COLUMN", "INDEX", "PRIMARY", "FOREIGN", "KEY", "CONSTRAINT", "REFERENCES",
  "VIEW", "SEQUENCE", "TRIGGER", "USER", "ROLE", "GRANT", "REVOKE"
];

export default function BuilderPage() {
  const router = useRouter();
  const params = useParams();
  const formId = Array.isArray(params.formId) ? params.formId[0] : params.formId;

  const { user } = useAuth();
  const { getForm, setFormFromServer } = useForms();
  const confirm = useConfirm();
  const form = getForm(formId);

  const isOwnerOrAdmin = user?.customRole === 'SYSTEM_ADMIN' || (form && form.ownerId === user?.id);

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
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true);
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
  const [isOverBottomArea, setIsOverBottomArea] = useState(false);
  const [dragOverFieldId, setDragOverFieldId] = useState(null);
  const [dragTarget, setDragTarget] = useState({ id: null, position: null }); // { id, position: 'top' | 'bottom' | 'inside' }
  const [lastSavedFields, setLastSavedFields] = useState([]);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [showLogicModal, setShowLogicModal] = useState(false);
  const [nextUrl, setNextUrl] = useState(null);

  const isDirty = JSON.stringify(localFields) !== JSON.stringify(lastSavedFields);

  useEffect(() => {
    if (formId) {
      api.getAllPublishedForms(formId)
        .then((res) => setPublishedForms(res?.data || []))
        .catch((err) => {
          console.warn("Could not load published forms for conditions:", err);
        });
    }
  }, [formId]);

  useEffect(() => {
    const fetchForm = async () => {
      try {
        const formRes = await api.getForm(formId, { mode: 'builder' });

        if (formRes.data.canEdit === false) {
          setErrorState({ status: 403, message: "You do not have permission to edit this form." });
          setLoading(false);
          return;
        }

        setFormFromServer(formRes.data);
        const fields = formRes.data.fields || [];
        setLocalFields(fields);
        setLastSavedFields(fields);
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
        } else if (status === 409) {
          message = err.response.data?.message || "Form has been changed: a schema drift was detected.";
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
      fetchForm().catch(() => { });
    }
  }, [formId, setFormFromServer]);

  // Counts total validation actions across all fields for SRS §10 limit check
  const countTotalValidations = (fields) => {
    return fields.reduce((total, field) => {
      if (!field.conditions) return total
      try {
        const parsed = JSON.parse(field.conditions)
        return total + (parsed.actions?.length || 0)
      } catch {
        return total
      }
    }, 0)
  }

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

  const generateFieldKey = (label, suffix) => {
    let key = (label || "field").toLowerCase().trim()
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9_]/g, "");
    if (/^[0-9]/.test(key)) {
      key = "f_" + key;
    }
    return key + "_" + suffix;
  };

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
                : type === "PHONE" ? { placeholder: "+1 234-567-8900", helpText: "Include country code (+)" }
                  : {},
      fieldLabel: type === "SECTION" ? "New Section" : type === "GROUP" ? "New Group" : type === "LABEL" ? "Label Heading" : `New ${type.toLowerCase().replace(/_/g, " ")}`,
      conditions: null,
      parentId: null,
    };
  };

  const handleSidebarDragStart = (e, type) => {
    e.dataTransfer.setData("newFieldType", type);
    e.dataTransfer.setData("text/plain", type); // Standard fallback
    e.dataTransfer.effectAllowed = "copy";
  };

  const handleFieldDragStart = (e, id) => {
    e.dataTransfer.setData("existingFieldId", id);
    e.dataTransfer.setData("text/plain", id); // Standard fallback
    e.dataTransfer.effectAllowed = "move";
    
    // Create a custom ghost-like state without hiding the original immediately
    // This makes the transition feel more solid
    const el = e.currentTarget;
    el.style.opacity = '0.4';
    el.style.transform = 'scale(0.95)';
    
    setTimeout(() => {
      // Revert styles on the source element so the user doesn't see a broken UI
      if (el) {
        el.style.opacity = '1';
        el.style.transform = '';
      }
      setActiveFieldId(id);
    }, 0);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    // Determine the source to set the correct dropEffect
    const isNew = e.dataTransfer.types.includes("newfieldtype") || e.dataTransfer.types.includes("newFieldType");
    e.dataTransfer.dropEffect = isNew ? "copy" : "move";
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

  const handleDropOnCanvas = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOverCanvas(false);
    setIsOverBottomArea(false);
    setDragTarget({ id: null, position: null });

    const newFieldType = e.dataTransfer.getData("newFieldType") || e.dataTransfer.getData("text/plain");
    const existingFieldId = e.dataTransfer.getData("existingFieldId");

    if (newFieldType) {
      const newField = createNewField(newFieldType, localFields.length + 1);
      setLocalFields((prev) => [...prev, newField]);
      setActiveFieldId(newField.id);
      toast.success(`Successfully added ${newFieldType.toLowerCase().replace('_', ' ')}`);
    } else if (existingFieldId) {
      setLocalFields((prev) => {
        const fieldIdx = prev.findIndex(f => f.id === existingFieldId);
        if (fieldIdx === -1) return prev;
        
        const list = [...prev];
        const [moved] = list.splice(fieldIdx, 1);
        // Moving to canvas background always makes it a root field
        return [...list, { ...moved, parentId: null }];
      });
    }
  };

  const handleDragOverField = (e, fieldId, position) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Determine the source to set the correct dropEffect
    const isNew = e.dataTransfer.types.includes("newfieldtype") || e.dataTransfer.types.includes("newFieldType");
    e.dataTransfer.dropEffect = isNew ? "copy" : "move";
    
    // Throttle the state update to prevent flickering
    if (dragTarget.id !== fieldId || dragTarget.position !== position) {
      setDragTarget({ id: fieldId, position });
    }
  };

  const handleDropOnFieldInternal = (e, targetId, position) => {
    e.preventDefault();
    e.stopPropagation();
    const targetIdCopy = targetId; // stabilize
    setDragTarget({ id: null, position: null });
    setIsDraggingOverCanvas(false);

    const newFieldType = e.dataTransfer.getData("newFieldType") || e.dataTransfer.getData("text/plain");
    const existingFieldId = e.dataTransfer.getData("existingFieldId");

    setLocalFields(prev => {
      let list = [...prev];
      let movedField;

      // 1. Identify what we are moving
      if (newFieldType) {
        movedField = createNewField(newFieldType, 0);
      } else if (existingFieldId) {
        if (existingFieldId === targetIdCopy && position !== 'inside') return prev;
        const idx = list.findIndex(f => f.id === existingFieldId);
        if (idx === -1) return prev;
        [movedField] = list.splice(idx, 1);
      } else {
        return prev;
      }

      // 2. Identify the target
      const targetIdx = list.findIndex(f => f.id === targetIdCopy);
      if (targetIdx === -1) {
        // Fallback: append
        movedField.parentId = null; // Groups/PageBreaks always null at root append
        list.push(movedField);
      } else {
        const targetField = list[targetIdx];
        
        // 3. Apply context (parentId and position)
        if (position === 'inside' && targetField.fieldType === 'GROUP') {
          // Restriction: No nested groups or page breaks inside groups
          if (movedField.fieldType === "GROUP" || movedField.fieldType === "PAGE_BREAK") {
            toast.error(`${movedField.fieldType.replace('_', ' ')} must stay at the root level.`, { id: 'nesting-error' });
            return prev;
          }
          movedField.parentId = targetField.fieldKey;
          list.splice(targetIdx + 1, 0, movedField);
        } else {
          // Top or Bottom drop
          const newParentId = targetField.parentId;
          
          // Restriction: Groups and Page Breaks can NEVER have a parent
          if ((movedField.fieldType === "GROUP" || movedField.fieldType === "PAGE_BREAK") && newParentId !== null) {
            toast.error(`${movedField.fieldType.replace('_', ' ')} can only be placed at the root level.`, { id: 'nesting-error' });
            return prev; // Cancel the move entirely
          }
          
          movedField.parentId = newParentId;
          const insertIdx = position === 'top' ? targetIdx : targetIdx + 1;
          list.splice(insertIdx, 0, movedField);
        }
      }

      if (newFieldType) setActiveFieldId(movedField.id);
      return list;
    });
  };

  const updateLocalField = (id, key, value) =>
    setLocalFields((prev) => {
      const field = prev.find(f => f.id === id);
      if (!field) return prev;

      let nextFields = prev.map((f) => {
        if (f.id !== id) return f;

        let updatedField = { ...f, [key]: value };

        // If label changes, also update the fieldKey IF we are in DRAFT phase to avoid breaking schema.
        // Once published, we should lock the key unless explicitly changed.
        if (key === "fieldLabel" && form && form.status === "DRAFT") {
          const currentKey = f.fieldKey || "";
          const suffix = currentKey.includes("_") ? currentKey.split("_").pop() : Math.random().toString(36).substr(2, 6);
          updatedField.fieldKey = generateFieldKey(value, suffix);
        }

        return updatedField;
      });

      if (key === "fieldLabel" && field.fieldType === "GROUP") {
        const oldKey = field.fieldKey;
        const newKey = nextFields.find(f => f.id === id)?.fieldKey;
        if (newKey) {
          nextFields = nextFields.map(f => f.parentId === oldKey ? { ...f, parentId: newKey } : f);
        }
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

  const getFieldsPayload = () => {
    return localFields.map((field, index) => {
      const sanitize = (val) => (val === "" ? null : val);

      return {
        id: field.id,
        fieldKey: field.fieldKey || generateFieldKey(field.fieldLabel, index + 1),
        parentId: field.parentId,
        fieldLabel: (field.fieldLabel || "").trim(),
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
          numberFormat: field.validation?.numberFormat || "INTEGER",
          rows: field.validation?.rows || [],
          columns: field.validation?.columns || [],
        },
        uiConfig: {
          ...(field.uiConfig || {}),
          maxStars: sanitize(field.uiConfig?.maxStars),
          scaleMin: sanitize(field.uiConfig?.scaleMin),
          scaleMax: sanitize(field.uiConfig?.scaleMax),
          maxFileSizeMb: sanitize(field.uiConfig?.maxFileSizeMb),
          placeholder: field.uiConfig?.placeholder,
          helpText: field.uiConfig?.helpText,
          defaultValue: field.uiConfig?.defaultValue,
          readOnly: field.uiConfig?.readOnly,
          hidden: field.uiConfig?.hidden,
          sourceTable: field.uiConfig?.sourceTable,
          sourceColumn: field.uiConfig?.sourceColumn,
          sourceDisplayColumn: field.uiConfig?.sourceDisplayColumn,
          acceptedFileTypes: field.uiConfig?.acceptedFileTypes
        },
        conditions: field.conditions || null,
      };
    });
  };

  const handleSave = async () => {
    // Client-side validation
    const emptyFields = localFields.filter(f => !f.fieldLabel?.trim());
    if (emptyFields.length > 0) {
      const fieldNames = emptyFields.map(f => f.fieldType).join(", ");
      toast.error(`Validation Error: One or more fields (${fieldNames}) are missing a Field Name.`);
      return;
    }
    const invalidLookups = localFields.filter(f =>
      f.fieldType === "LOOKUP_DROPDOWN" &&
      (!f.uiConfig?.sourceTable || !f.uiConfig?.sourceDisplayColumn)
    );
    if (invalidLookups.length > 0) {
      const names = invalidLookups.map(f => f.fieldLabel || f.fieldType).join(", ");
      toast.error(`Lookup Error: Field(s) [${names}] must have a Source Form and Display Column selected.`);
      return;
    }

    const invalidReadOnlyHidden = localFields.filter(f =>
      (f.uiConfig?.readOnly || f.uiConfig?.hidden) &&
      (!f.uiConfig?.defaultValue || String(f.uiConfig.defaultValue).trim() === "")
    );
    if (invalidReadOnlyHidden.length > 0) {
      const names = invalidReadOnlyHidden.map(f => f.fieldLabel || f.fieldType).join(", ");
      toast.error(`Validation Error: Field(s) [${names}] are set to Read-Only or Hidden and MUST have a Default Value.`);
      setActiveFieldId(invalidReadOnlyHidden[0].id);
      return;
    }

    // SRS §2.3 Formula Validation
    for (const field of localFields) {
      const cond = parseConditions(field);
      if (cond?.action === "calculate" && cond.formula) {
        const result = evaluateFormula(cond.formula, {}, `field: ${field.fieldLabel}`);
        if (result.error) {
          toast.error(`Formula Error in '${field.fieldLabel}': ${result.error.reason}`);
          // Expand the field to show where the error is
          setActiveFieldId(field.id);
          return;
        }
      }
    }

    const keywordViolations = localFields.filter(f => {
      if (!f.fieldKey) return false;
      // Get the part before the last underscore (the label-derived base)
      const baseKey = f.fieldKey.includes('_') ? f.fieldKey.split('_').slice(0, -1).join('_') : f.fieldKey;
      return RESERVED_KEYWORDS.includes(baseKey.toUpperCase().trim());
    });
    if (keywordViolations.length > 0) {
      const baseName = keywordViolations[0].fieldKey.includes('_') ? keywordViolations[0].fieldKey.split('_').slice(0, -1).join('_') : keywordViolations[0].fieldKey;
      toast.error(`Validation Error: The base name '${baseName}' derived from your label is a reserved SQL keyword. Please use a different name.`);
      return;
    }

    // SRS §10 — Max 50 fields per form
    if (localFields.length > 50) {
      toast.error(
        `Too many fields: ${localFields.length}/50. ` +
        `Remove ${localFields.length - 50} field(s) before saving.`
      )
      return
    }

    // SRS §10 — Max 10 pages/sections per form
    const pageAndSectionCount = localFields.filter(
      f => f.fieldType === 'PAGE_BREAK' || f.fieldType === 'SECTION'
    ).length
    if (pageAndSectionCount > 10) {
      toast.error(
        `Too many pages/sections: ${pageAndSectionCount}/10. ` +
        `Remove ${pageAndSectionCount - 10} page break(s) or section(s).`
      )
      return
    }

    // SRS §10 — Max 100 validations per form
    const totalValidations = countTotalValidations(localFields)
    if (totalValidations > 100) {
      toast.error(
        `Too many validation rules: ${totalValidations}/100. ` +
        `Remove ${totalValidations - 100} validation rule(s) before proceeding.`
      )
      return
    }

    // SRS §10 — Max 10 lookup fields
    const lookupCount = localFields.filter(f => f.fieldType === "LOOKUP_DROPDOWN").length;
    if (lookupCount > 10) {
      toast.error(`Too many many lookup fields: ${lookupCount}/10. Remove some lookups before saving.`);
      return;
    }

    // SRS §10 — Max 100 options per select field
    const overflowField = localFields.find(f => (f.options || []).length > 100);
    if (overflowField) {
      toast.error(`Field '${overflowField.fieldLabel}' has too many options (${overflowField.options.length}/100).`);
      return;
    }

    setSaving(true);
    const payload = getFieldsPayload();

    try {
      const res = await api.saveDraft(formId, payload);
      if (res.data) {
        setLocalFields(res.data);
        setLastSavedFields(res.data);
      }
      toast.success("Form saved successfully!");
    } catch (e) {
      console.error(e);
      if (e.response?.data?.errors) {
        const errorMsgs = e.response.data.errors.map(err => `${err.field}: ${err.message}`).join("\n");
        toast.error(`Server Validation Error:\n${errorMsgs}`);
      } else {
        toast.error("Failed to save form. " + (e.response?.data?.message || ""));
      }
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (localFields.length === 0) return toast.error("Add at least one field before publishing");

    // Client-side validation
    const emptyFields = localFields.filter(f => !f.fieldLabel?.trim());
    if (emptyFields.length > 0) {
      toast.error(`Cannot publish: One or more fields are missing a name.`);
      return;
    }
    const invalidLookups = localFields.filter(f =>
      f.fieldType === "LOOKUP_DROPDOWN" &&
      (!f.uiConfig?.sourceTable || !f.uiConfig?.sourceDisplayColumn)
    );
    if (invalidLookups.length > 0) {
      const names = invalidLookups.map(f => f.fieldLabel || f.fieldType).join(", ");
      toast.error(`Publish Blocked: Lookup field(s) [${names}] are missing configuration (Source Form or Display Column).`);
      return;
    }

    const keywordViolations = localFields.filter(f => {
      if (!f.fieldKey) return false;
      // Get the part before the last underscore (the label-derived base)
      const baseKey = f.fieldKey.includes('_') ? f.fieldKey.split('_').slice(0, -1).join('_') : f.fieldKey;
      return RESERVED_KEYWORDS.includes(baseKey.toUpperCase().trim());
    });
    if (keywordViolations.length > 0) {
      const baseName = keywordViolations[0].fieldKey.includes('_') ? keywordViolations[0].fieldKey.split('_').slice(0, -1).join('_') : keywordViolations[0].fieldKey;
      toast.error(`Publish Blocked: The base name '${baseName}' derived from a field label is a reserved SQL keyword.`);
      return;
    }

    // SRS §10 — Max 50 fields per form
    if (localFields.length > 50) {
      toast.error(
        `Too many fields: ${localFields.length}/50. ` +
        `Remove ${localFields.length - 50} field(s) before publishing.`
      )
      return
    }

    // SRS §10 — Max 10 pages/sections per form
    const pageAndSectionCount = localFields.filter(
      f => f.fieldType === 'PAGE_BREAK' || f.fieldType === 'SECTION'
    ).length
    if (pageAndSectionCount > 10) {
      toast.error(
        `Too many pages/sections: ${pageAndSectionCount}/10. ` +
        `Remove ${pageAndSectionCount - 10} page break(s) or section(s).`
      )
      return
    }

    // SRS §10 — Max 100 validations per form
    const totalValidations = countTotalValidations(localFields)
    if (totalValidations > 100) {
      toast.error(
        `Too many validation rules: ${totalValidations}/100. ` +
        `Remove ${totalValidations - 100} validation rule(s) before publishing.`
      )
      return
    }

    // SRS §10 — Max 10 lookup fields
    const lookupCount = localFields.filter(f => f.fieldType === "LOOKUP_DROPDOWN").length;
    if (lookupCount > 10) {
      toast.error(`Too many many lookup fields: ${lookupCount}/10. Remove some lookups before publishing.`);
      return;
    }

    // SRS §10 — Max 100 options per select field
    const overflowField = localFields.find(f => (f.options || []).length > 100);
    if (overflowField) {
      toast.error(`Field '${overflowField.fieldLabel}' has too many options (${overflowField.options.length}/100).`);
      return;
    }

    setPublishing(true);
    try {
      const payload = getFieldsPayload();
      const res = await api.publishForm(formId, payload);

      // Mark as not dirty before navigation
      if (res.data?.fields) {
        setLastSavedFields(res.data.fields);
      } else {
        setLastSavedFields([...localFields]);
      }

      toast.success("Form published!");
      router.push("/");
    } catch (e) {
      const status = e.response?.status;
      if (status === 409) {
        toast.error(e.response.data?.message || "Structure Lock: This form has live submissions and cannot be modified.");
      } else {
        toast.error("Publish failed. " + (e.response?.data?.message || ""));
      }
      setPublishing(false);
    }
  };

  // Browser level protection (Tab close / Refresh)
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = ""; // Standard way to show browser confirmation
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  // Internal Navigation Protection
  useEffect(() => {
    // Intercept clicks on links
    const handleAnchorClick = (e) => {
      if (!isDirty) return;

      let target = e.target;
      while (target && target.tagName !== "A") target = target.parentElement;

      if (target && target.href && target.origin === window.location.origin) {
        const url = new URL(target.href);
        // Don't block if it's just a hash change or the same page
        if (url.pathname === window.location.pathname && url.search === window.location.search) return;

        e.preventDefault();
        setNextUrl(target.href);
        setShowUnsavedModal(true);
      }
    };

    // Intercept browser back/forward
    const handlePopState = (e) => {
      if (!isDirty) return;

      // Push state back to prevent immediate navigation
      window.history.pushState(null, "", window.location.href);
      setNextUrl("/"); // Default to dashboard for back button if target unknown
      setShowUnsavedModal(true);
    };

    document.addEventListener("click", handleAnchorClick, true);
    window.addEventListener("popstate", handlePopState);

    return () => {
      document.removeEventListener("click", handleAnchorClick, true);
      window.removeEventListener("popstate", handlePopState);
    };
  }, [isDirty]);

  const handleConfirmLeave = () => {
    setShowUnsavedModal(false);
    // Temporarily bypass guard by syncing fields
    setLastSavedFields([...localFields]);
    if (nextUrl) {
      router.push(nextUrl);
    } else {
      router.back();
    }
  };

  const handleReactivate = async () => {
    const confirmed = await confirm({
      title: "Reactivate Form?",
      message: "This form is currently archived. Reactivating it will return it to DRAFT status so you can edit it again. Existing submissions and versions will be preserved.",
      confirmText: "Reactivate",
      type: "info"
    });

    if (!confirmed) return;

    try {
      await api.reactivateForm(formId);
      toast.success("Form reactivated!");
      // Status is now DRAFT, so we can reload the builder state
      setIsArchived(false);
      // Optional: reload form data from server to be safe
      const formRes = await api.getForm(formId, { mode: 'builder' });
      setFormFromServer(formRes.data);
      setLocalFields(formRes.data.fields || []);
    } catch (e) {
      console.error(e);
      toast.error("Failed to reactivate. " + (e.response?.data?.message || ""));
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
    const isConflict = errorState?.status === 409;

    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-50 px-6 text-center">
        <div className="w-24 h-24 bg-red-100/50 rounded-full flex items-center justify-center mb-6 shadow-sm border border-red-100">
          {isForbidden || isUnauthorized || isConflict ? (
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
              isConflict ? "Schema Sync Error" :
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
            <Link href={`/forms/${form?.code || formId}/view`} className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-md hover:shadow-lg active:scale-95">
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
          return <div className="w-full h-16 bg-slate-50/80 border border-slate-200 rounded-xl px-4 py-2 text-xs text-slate-400 shadow-inner italic flex items-center">{placeholder}</div>;

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
              <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">{field.fieldLabel || "New Section"}</h3>
              {field.uiConfig?.helpText && <p className="text-sm text-slate-500 mt-2 leading-relaxed">{field.uiConfig.helpText}</p>}
            </div>
          );

        case "LABEL":
          return (
            <div className="bg-indigo-50/80 border border-indigo-100 rounded-xl px-5 py-4 shadow-sm">
              <h4 className="text-sm font-bold text-indigo-900">{field.fieldLabel || "Label Title"}</h4>
              {field.uiConfig?.helpText && <p className="text-sm text-indigo-700/80 mt-1.5 leading-relaxed">{field.uiConfig.helpText}</p>}
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

        case "PHONE":
          return (
            <div className="relative">
              <input type="text" readOnly className="w-full bg-slate-50/80 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-400 shadow-inner italic flex items-center pr-10" placeholder={placeholder} />
              <Phone size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300" />
            </div>
          );

        case "DATETIME":
          return (
            <div className="grid grid-cols-2 gap-3">
              <div className="w-full bg-slate-50/80 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-400 shadow-inner flex justify-between items-center">
                <span>YYYY-MM-DD</span>
                <Calendar size={16} className="text-slate-300" />
              </div>
              <div className="w-full bg-slate-50/80 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-400 shadow-inner flex justify-between items-center">
                <span>HH:MM</span>
                <Clock size={16} className="text-slate-300" />
              </div>
            </div>
          );

        case "DATE":
        case "TIME":
          return (
            <div className="w-full bg-slate-50/80 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-400 shadow-inner flex justify-between items-center font-medium">
              <span>{field.fieldType === "DATE" ? "YYYY-MM-DD" : "HH:MM"}</span>
              {field.fieldType === "DATE" ? <Calendar size={18} className="text-slate-300" /> : <Clock size={18} className="text-slate-300" />}
            </div>
          );

        case "GROUP": {
          const children = localFields.filter(f => f.parentId === field.fieldKey);
          const isDragOver = dragOverGroupKey === field.fieldKey;

          return (
            <div
              className={`border-2 border-dashed rounded-xl p-4 min-h-[120px] transition-all duration-300 ease-in-out ${isDragOver
                ? "border-indigo-400 bg-indigo-50/50 shadow-[inset_0_4px_20px_rgba(99,102,241,0.05)]"
                : "border-slate-200 bg-slate-50/50 hover:border-slate-300"
                }`}
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDragOverGroupKey(field.fieldKey); }}
              onDragLeave={(e) => { e.stopPropagation(); setDragOverGroupKey(null); }}
              onDrop={(e) => {
                setDragOverGroupKey(null);
                e.preventDefault();
                e.stopPropagation();
                const newType = e.dataTransfer.getData("newFieldType") || e.dataTransfer.getData("text/plain");
                const existingId = e.dataTransfer.getData("existingFieldId");

                if (newType) {
                  if (newType === "GROUP") return;
                  const newF = createNewField(newType, localFields.length + 1);
                  newF.parentId = field.fieldKey;
                  setLocalFields(prev => [...prev, newF]);
                  setActiveFieldId(newF.id);
                } else if (existingId) {
                  if (existingId === field.id) return;
                  setLocalFields(prev => {
                    const list = [...prev];
                    const movedIdx = list.findIndex(f => f.id === existingId);
                    if (movedIdx === -1) return list;
                    const [moved] = list.splice(movedIdx, 1);
                    if (moved.fieldType === "GROUP") {
                      toast.error("Groups cannot be nested.");
                      return prev;
                    }
                    list.push({ ...moved, parentId: field.fieldKey });
                    return list;
                  });
                }
              }}
            >
              <div className="flex items-center gap-2 mb-4">
                <div className="p-1 bg-white border border-slate-200 rounded-lg shadow-sm">
                  <LayoutTemplate size={14} className="text-indigo-600" />
                </div>
                <span className="text-[10px] font-bold text-slate-700 uppercase tracking-widest">{field.fieldLabel || "Group Collection"}</span>
              </div>
              {field.uiConfig?.helpText && <p className="text-[9px] text-slate-500 mb-4 pl-1">{field.uiConfig.helpText}</p>}

              {children.length === 0 ? (
                <div className={`flex flex-col items-center justify-center py-6 rounded-xl border-2 border-dashed transition-all duration-200 ${isDragOver
                  ? "border-indigo-300 bg-white text-indigo-600"
                  : "border-slate-200 bg-white text-slate-400 hover:border-indigo-200"
                  }`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 transition-all ${isDragOver ? "bg-indigo-50" : "bg-slate-50"
                    }`}>
                    <Plus size={20} className={isDragOver ? "text-indigo-600" : "text-slate-400"} />
                  </div>
                  <p className="text-xs font-bold text-slate-600">{isDragOver ? "Drop to append" : "Drag elements here"}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {isDragOver && (
                    <div className="h-12 rounded-xl border-2 border-dashed border-indigo-400 bg-indigo-50 flex items-center justify-center shadow-sm">
                      <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">Drop to insert</p>
                    </div>
                  )}
                  {children.map(child => {
                    const childIndex = localFields.indexOf(child);
                    return (
                      <div
                        key={child.id}
                        draggable
                        onDragStart={(e) => handleFieldDragStart(e, child.id)}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setDragOverFieldId(child.id);
                          // Set move effect for existing fields
                          e.dataTransfer.dropEffect = "move";
                        }}
                        onDragLeave={(e) => {
                          e.stopPropagation();
                          if (e.currentTarget && !e.currentTarget.contains(e.relatedTarget)) {
                            setDragOverFieldId(null);
                          }
                        }}
                        onDrop={(e) => {
                          setDragOverFieldId(null);
                          handleDropOnFieldInternal(e, child.id, 'bottom'); // Default to bottom for child drops
                        }}
                        onClick={(e) => { e.stopPropagation(); setActiveFieldId(child.id); e.currentTarget.blur(); }}
                        className={`p-4 rounded-xl border-2 transition-all duration-200 cursor-pointer bg-white relative ${dragOverFieldId === child.id
                          ? "border-t-4 border-t-indigo-500 border-indigo-200 shadow-md scale-[1.01] z-30"
                          : activeFieldId === child.id
                            ? "border-indigo-500 shadow-md ring-4 ring-indigo-50"
                            : "border-slate-200 hover:border-indigo-300 shadow-sm hover:shadow"
                          }`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <label className="text-xs font-bold text-slate-800 tracking-tight">
                            {child.fieldLabel} {child.required && <span className="text-red-500 ml-0.5">*</span>}
                          </label>
                          <button onClick={(e) => deleteLocalField(child.id, e)} className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                            <Trash2 size={14} />
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

        case "INTEGER": {
          const fmt = field.validation?.numberFormat || "INTEGER";
          return (
            <div className="relative">
              <input
                type="number"
                readOnly
                step={fmt === "DECIMAL" ? "0.01" : "1"}
                placeholder={placeholder}
                className="w-full bg-slate-50/80 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-400 shadow-inner pointer-events-none"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300 uppercase tracking-widest">
                {fmt}
              </span>
            </div>
          );
        }

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

    // Recursive Sortable Field Item
    const SortableFieldItem = ({ field, level = 0 }) => {
      const isGroup = field.fieldType === "GROUP";
      const children = localFields.filter(f => f.parentId === field.fieldKey);
      const isActive = activeFieldId === field.id;
      const isTarget = dragTarget.id === field.id;

      // Drop Line Indicator component for cleaner code
      const DropLine = ({ position }) => {
        const active = dragTarget.id === field.id && dragTarget.position === position;
        return (
          <div
            onDragOver={(e) => handleDragOverField(e, field.id, position)}
            onDragLeave={() => setDragTarget({ id: null, position: null })}
            onDrop={(e) => handleDropOnFieldInternal(e, field.id, position)}
            className={`relative w-full transition-all duration-300 z-50 overflow-visible ${active ? 'h-8' : 'h-2 hover:h-4'}`}
          >
            <div className={`absolute inset-x-0 top-1/2 -translate-y-1/2 flex items-center transition-all duration-300 ${active ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
              <div className="w-3 h-3 rounded-full bg-indigo-600 border-2 border-white shadow-sm -ml-1.5" />
              <div className="flex-1 h-[3px] bg-gradient-to-r from-indigo-600 to-indigo-400 rounded-full shadow-sm" />
              <div className="ml-2 px-2 py-0.5 bg-indigo-600 text-white text-[8px] font-black uppercase tracking-widest rounded-full shadow-sm">
                Insert {position}
              </div>
            </div>
          </div>
        );
      };

      return (
        <div 
          className="relative group/sortable" 
          style={{ 
            transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
            zIndex: isTarget ? 40 : 10 
          }}
        >
          {/* Drop Zone: Top */}
          <DropLine position="top" />

          <div
            draggable
            onDragStart={(e) => {
              e.stopPropagation();
              handleFieldDragStart(e, field.id);
              // Make specific element semi-transparent during drag
              e.currentTarget.classList.add('opacity-30');
              e.currentTarget.classList.add('grayscale-[0.5]');
            }}
            onDragEnd={(e) => { 
              e.currentTarget.classList.remove('opacity-30'); 
              e.currentTarget.classList.remove('grayscale-[0.5]');
              setDragTarget({ id: null, position: null }); 
            }}
            onClick={(e) => { e.stopPropagation(); setActiveFieldId(field.id); }}
            className={`group relative bg-white rounded-2xl transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] cursor-pointer border-2 outline-none overflow-hidden ${isActive
              ? "border-indigo-600 shadow-2xl ring-4 ring-indigo-100 scale-[1.015] z-40 bg-white"
              : isTarget
                ? "border-indigo-400 bg-indigo-50/20 shadow-lg translate-x-1"
                : "border-slate-200 hover:border-indigo-300 shadow-sm hover:shadow-md hover:translate-y-[-1px]"
              }`}
          >
            {/* Grip handle and color strip */}
            <div className={`absolute left-0 top-0 bottom-0 w-1 transition-colors ${isActive ? 'bg-indigo-600' : 'bg-slate-100 group-hover:bg-indigo-300'}`} />
            
            <div className="absolute left-1 top-0 bottom-0 w-7 flex flex-col items-center justify-center text-slate-300 hover:text-indigo-600 group-hover:bg-slate-50/50 transition-all border-r border-slate-50 opacity-0 group-hover:opacity-100 z-10 cursor-grab active:cursor-grabbing">
              <GripVertical size={18} />
            </div>

            <button
              onClick={(e) => { e.stopPropagation(); deleteLocalField(field.id, e); }}
              className="absolute right-3 top-3 bg-white/80 backdrop-blur-sm border border-slate-200 text-slate-400 hover:text-red-600 hover:border-red-200 shadow-sm p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-all z-20 hover:scale-110 active:scale-95"
            >
              <Trash2 size={14} />
            </button>

            <div className="p-4 pl-10">
              <div className="flex items-center gap-2 mb-3">
                <div className={`p-1.5 rounded-lg transition-all duration-300 ${isActive ? 'bg-indigo-600 text-white shadow-indigo-200 shadow-lg scale-110' : 'bg-slate-100 text-slate-500'}`}>
                  {field.fieldType === 'TEXT' && <Type size={14} />}
                  {field.fieldType === 'GROUP' && <LayoutTemplate size={14} />}
                  {field.fieldType === 'PAGE_BREAK' && <BookOpen size={14} />}
                  {!['TEXT', 'GROUP', 'PAGE_BREAK'].includes(field.fieldType) && <SlidersHorizontal size={14} />}
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 tracking-[0.15em] uppercase block mb-0.5">
                    {field.fieldType.replace('_', ' ')}
                  </label>
                  <label className="text-sm font-black text-slate-800 tracking-tight leading-none capitalize">
                    {field.fieldLabel} {field.required && <span className="text-red-500 ml-0.5">*</span>}
                  </label>
                </div>
                {field.conditions && (
                  <div className="ml-auto flex items-center gap-1 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100 animate-pulse">
                    <span className="text-[8px] font-black text-indigo-600 uppercase">Logic Active</span>
                    <GitBranch size={10} className="text-indigo-500" />
                  </div>
                )}
              </div>

              {isGroup ? (
                <div
                  onDragOver={(e) => {
                    if (children.length === 0) handleDragOverField(e, field.id, 'inside');
                  }}
                  onDrop={(e) => {
                    if (children.length === 0) handleDropOnFieldInternal(e, field.id, 'inside');
                  }}
                  className={`min-h-[120px] rounded-2xl border-2 transition-all duration-500 relative overflow-hidden ${dragTarget.id === field.id && dragTarget.position === 'inside'
                    ? "border-indigo-500 bg-indigo-50 shadow-[inset_0_4px_20px_rgba(99,102,241,0.1)] scale-[1.01]"
                    : "border-slate-100 bg-slate-50/40 border-dashed"
                    }`}
                >
                  {children.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 py-8">
                      <div className={`p-3 rounded-full mb-3 mb-2 transition-all ${dragTarget.id === field.id && dragTarget.position === 'inside' ? 'bg-indigo-600 text-white rotate-90 scale-125' : 'bg-white text-slate-300 shadow-sm opacity-20'}`}>
                        <Plus size={24} />
                      </div>
                      <p className="text-[9px] font-black uppercase tracking-[0.3em] opacity-40">Group Container</p>
                    </div>
                  ) : (
                    <div className="p-3 space-y-0.5">
                      {children.map(child => (
                        <SortableFieldItem key={child.id} field={child} level={level + 1} />
                      ))}
                      
                      {/* Inside Bottom Target */}
                      <div
                        onDragOver={(e) => handleDragOverField(e, field.id, 'inside')}
                        onDrop={(e) => handleDropOnFieldInternal(e, field.id, 'inside')}
                        className={`mt-2 transition-all duration-500 rounded-xl flex items-center justify-center border-2 border-dashed ${dragTarget.id === field.id && dragTarget.position === 'inside' 
                          ? 'h-16 bg-white border-indigo-500 shadow-md opacity-100' 
                          : 'h-10 border-slate-200 bg-white/50 opacity-40 hover:opacity-100 hover:border-indigo-200'}`}
                      >
                        <div className={`flex items-center gap-2 transition-all ${dragTarget.id === field.id && dragTarget.position === 'inside' ? 'scale-110' : 'scale-100'}`}>
                           <Plus size={14} className={dragTarget.id === field.id && dragTarget.position === 'inside' ? 'text-indigo-600 animate-bounce' : 'text-slate-400'} />
                           <span className={`text-[9px] font-black uppercase tracking-widest ${dragTarget.id === field.id && dragTarget.position === 'inside' ? 'text-indigo-600' : 'text-slate-500'}`}>
                             {dragTarget.id === field.id && dragTarget.position === 'inside' ? 'Drop to add to group' : 'Add to group'}
                           </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="pointer-events-none opacity-90 group-hover:opacity-100 transition-all duration-300">
                  {renderFieldPreview(field)}
                </div>
              )}
            </div>
          </div>

          {/* Drop Zone: Bottom */}
          <DropLine position="bottom" />
        </div>
      );
    };

    return (
      <div className="flex h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden selection:bg-indigo-100 selection:text-indigo-900">

      {/* ── LEFT SIDEBAR ── */}
      <aside className={`bg-white border-r border-slate-200 flex flex-col shrink-0 z-[60] shadow-[1px_0_10px_rgba(0,0,0,0.02)] h-screen overflow-hidden transition-all duration-300 ease-in-out fixed lg:relative lg:translate-x-0 ${leftSidebarOpen ? "w-[260px] translate-x-0" : "w-0 -translate-x-full lg:w-0"}`}>
        <div className="p-4 border-b border-slate-100 bg-white flex items-center justify-between">
          <div className="flex flex-col">
            <Link href="/" className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 hover:text-slate-900 mb-2 transition-colors bg-slate-50 hover:bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-100 w-fit">
              <ArrowLeft size={14} /> Dashboard
            </Link>
            <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Plus size={14} className="text-indigo-500" /> Form Elements
            </h2>
          </div>
          <button
            onClick={() => setLeftSidebarOpen(false)}
            className="lg:hidden p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
          >
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-6 no-scrollbar">
          {FIELD_CATEGORIES.map((cat, ci) => (
            <div key={ci} className="space-y-3">
              <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1 flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-indigo-500/40"></span>
                {cat.name}
              </h3>
              <div className="grid grid-cols-2 gap-2.5">
                {cat.fields.map((type) => (
                  <div
                    key={type.value}
                    draggable
                    onDragStart={(e) => handleSidebarDragStart(e, type.value)}
                    className="flex flex-col items-center justify-center gap-2 p-3 bg-slate-50 border border-slate-100 rounded-xl cursor-grab hover:bg-white hover:border-indigo-200 hover:shadow-md hover:shadow-indigo-500/5 transition-all group"
                  >
                    <div className="text-slate-400 group-hover:text-indigo-600 transition-colors">
                      {type.icon && { ...type.icon, props: { ...type.icon.props, size: 16 } }}
                    </div>
                    <span className="text-[9px] font-bold text-slate-600 text-center leading-tight">
                      {type.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </aside>

      {/* ── MAIN CANVAS ── */}
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden relative bg-[#F8FAFC]">
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
              <div className="flex flex-col gap-3">
                <button
                  onClick={handleReactivate}
                  className="inline-flex items-center justify-center gap-2 bg-indigo-600 text-white px-8 py-3.5 rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg hover:shadow-xl active:scale-95"
                >
                  <RotateCcw size={18} />
                  Reactivate to Edit
                </button>
                <Link
                  href="/"
                  className="inline-flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-700 px-8 py-3.5 rounded-xl text-sm font-bold hover:bg-slate-50 transition-all shadow-sm hover:shadow active:scale-95"
                >
                  Back to Dashboard
                </Link>
              </div>
            </div>
          </div>
        )}

        {form?.status === 'PUBLISHED' && (
          <div className="bg-indigo-600 text-white px-4 py-1.5 flex items-center justify-center gap-3 text-xs font-bold shadow-lg shrink-0 z-30">
            <ShieldCheck size={16} />
            <span>You are editing a WORKING COPY for the next version. The live version (v{form.activeVersionNumber}) will remain active until you click Publish again.</span>
          </div>
        )}

        <header className="h-[64px] bg-white/80 backdrop-blur-md border-b border-slate-200/80 flex items-center justify-between px-4 lg:px-6 shrink-0 z-10 sticky top-0 shadow-sm">
          <div className="flex items-center gap-3 lg:gap-4">
            <button
              onClick={() => setLeftSidebarOpen(!leftSidebarOpen)}
              className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
              title="Toggle Elements"
            >
              <PanelLeft size={20} strokeWidth={2.5} />
            </button>
            <div className="hidden sm:flex bg-indigo-600 shadow-md shadow-indigo-200 p-2 rounded-xl text-white">
              <LayoutTemplate size={18} strokeWidth={2.5} />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0">
                <h1 className="text-xs lg:text-base font-extrabold text-slate-900 leading-tight tracking-tight line-clamp-1">{form.name}</h1>
                <span className="text-[8px] lg:text-[9px] font-black px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 uppercase tracking-widest border border-slate-200/60">
                  {form.status || "DRAFT"}
                </span>
              </div>
              <p className="text-[9px] lg:text-[10px] font-semibold text-slate-400 flex items-center gap-1.5">
                Builder Mode <span className="w-0.5 h-0.5 rounded-full bg-slate-300"></span> by {form.ownerName === user?.username ? "you" : (form.ownerName || "unknown")}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 lg:gap-3">
            <Link href={`/forms/${formId}/versions`} className="hidden md:flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-indigo-700 hover:bg-indigo-50 px-3 py-2 rounded-xl transition-all border border-transparent hover:border-indigo-100">
              <GitBranch size={16} /> <span className="hidden lg:inline">Versions</span>
            </Link>
            <button
              onClick={() => setShowLogicModal(true)}
              className="hidden md:flex items-center gap-2 text-xs font-bold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 px-3 py-2 rounded-xl transition-all border border-indigo-100 hover:border-indigo-200"
            >
              <ShieldCheck size={16} /> <span className="hidden lg:inline">Logic Engine</span>
            </button>
            <Link href={`/forms/${formId}/view?preview=true`} className="hidden md:flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 px-3 py-2 rounded-xl transition-all border border-transparent hover:border-slate-200">
              <ClipboardList size={16} /> <span className="hidden lg:inline">Preview</span>
            </Link>
            <div className="hidden sm:block w-px h-6 bg-slate-200 mx-1"></div>
            <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 px-3 lg:px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95">
              <Save size={14} className={saving ? "animate-pulse" : ""} /> <span className="hidden sm:inline">{saving ? "Saving..." : "Save"}</span>
            </button>
            <button onClick={handlePublish} disabled={publishing} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white px-3 lg:px-5 py-2 rounded-xl text-xs font-bold shadow-md shadow-indigo-200 hover:shadow-lg hover:shadow-indigo-300 transition-all active:scale-95">
              <Rocket size={14} /> <span className="hidden sm:inline">{publishing ? "Publishing..." : "Go live"}</span>
            </button>
            <button
              onClick={() => setRightSidebarOpen(!rightSidebarOpen)}
              className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
              title="Toggle Properties"
            >
              <PanelRight size={20} strokeWidth={2.5} />
            </button>
          </div>
        </header>

        {/* Backdrop for mobile */}
        {(leftSidebarOpen || rightSidebarOpen) && (
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] z-[55] lg:hidden animate-in fade-in duration-300"
            onClick={() => {
              setLeftSidebarOpen(false);
              setRightSidebarOpen(false);
            }}
          />
        )}

        <div
          onDrop={handleDropOnCanvas}
          onDragOver={handleDragOver}
          onDragEnter={handleCanvasDragEnter}
          onDragLeave={handleCanvasDragLeave}
          className={`flex-1 overflow-y-auto p-6 lg:p-8 pb-[600px] custom-scrollbar transition-all duration-300 ${isDraggingOverCanvas && !dragOverFieldId ? "bg-indigo-50/40 shadow-[inset_0_0_40px_rgba(99,102,241,0.1)]" : ""
            }`}
          onClick={() => setActiveFieldId(null)}
        >
          <div className="w-full max-w-3xl space-y-2 mx-auto pb-64">

            {localFields.length === 0 ? (
              <div
                onDrop={handleDropOnCanvas}
                onDragOver={handleDragOver}
                className={`h-72 border-[3px] border-dashed rounded-3xl flex flex-col items-center justify-center transition-all duration-500 ${isDraggingOverCanvas
                  ? "border-indigo-400 bg-indigo-50 shadow-2xl scale-[1.02]"
                  : "border-slate-200 hover:border-indigo-300 bg-white/50 text-slate-400"
                  }`}>
                <div className={`p-5 rounded-2xl shadow-sm border mb-4 transition-all duration-300 ${isDraggingOverCanvas ? "bg-indigo-600 border-indigo-700 animate-bounce" : "bg-white border-slate-100"
                  }`}>
                  <Plus size={32} className={isDraggingOverCanvas ? "text-white" : "text-indigo-400"} />
                </div>
                <p className={`font-black text-xl tracking-tight ${isDraggingOverCanvas ? "text-indigo-700" : "text-slate-700"}`}>
                  {isDraggingOverCanvas ? "Drop to add field" : "Your form is empty"}
                </p>
                <p className="text-sm mt-2 font-semibold opacity-60">
                  {isDraggingOverCanvas ? "Release now to create this element." : "Drag and drop elements from the left panel."}
                </p>
              </div>
            ) : (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                {localFields.filter(f => !f.parentId).map((field) => (
                  <SortableFieldItem key={field.id} field={field} />
                ))}

                {/* Drop here to append at root */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsOverBottomArea(true);
                  }}
                  onDragEnter={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsOverBottomArea(true);
                  }}
                  onDragLeave={() => setIsOverBottomArea(false)}
                  onDrop={(e) => {
                    e.stopPropagation();
                    handleDropOnCanvas(e);
                  }}
                  className={`mt-12 h-32 border-[3px] border-dashed rounded-[32px] flex flex-col items-center justify-center transition-all duration-500 group/bottom ${isOverBottomArea
                    ? "border-indigo-500 bg-indigo-50 shadow-2xl scale-[1.02]"
                    : "border-slate-100 bg-slate-50/20 text-slate-300 opacity-60 hover:opacity-100 hover:border-slate-300"
                    }`}
                >
                  <div className={`p-4 rounded-full mb-3 transition-all duration-300 ${isOverBottomArea ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-slate-300 shadow-sm'}`}>
                    <Plus size={24} />
                  </div>
                  <p className={`font-black text-xs tracking-[0.2em] uppercase transition-colors ${isOverBottomArea ? 'text-indigo-600' : 'text-slate-400'}`}>
                    {isOverBottomArea ? "Drop to append at bottom" : "Drag here to add to root"}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ── RIGHT SIDEBAR ── */}
      <aside className={`bg-white border-l border-slate-200 flex flex-col shrink-0 z-[60] shadow-[-1px_0_10px_rgba(0,0,0,0.02)] h-screen overflow-hidden transition-all duration-300 ease-in-out fixed right-0 lg:relative lg:translate-x-0 ${rightSidebarOpen ? "w-[320px] translate-x-0" : "w-0 translate-x-full lg:w-0"}`}>
        <div className="lg:hidden p-3 border-b border-slate-100 bg-white flex justify-end">
          <button
            onClick={() => setRightSidebarOpen(false)}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
          >
            <X size={20} />
          </button>
        </div>
        <div className="p-3 border-b border-slate-100 bg-slate-50/80">
          <div className="flex bg-slate-200/60 p-1 rounded-lg">
            <button
              onClick={() => setSidebarTab('fields')}
              className={`flex-1 py-1.5 text-[9px] font-black uppercase tracking-widest rounded flex items-center justify-center gap-2 transition-all duration-200 ${sidebarTab === 'fields' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
            >
              <Settings2 size={14} /> Properties
            </button>
            <button
              onClick={() => setSidebarTab('form')}
              className={`flex-1 py-1.5 text-[9px] font-black uppercase tracking-widest rounded flex items-center justify-center gap-2 transition-all duration-200 ${sidebarTab === 'form' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
            >
              <Lock size={14} /> Access
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0 flex flex-col">
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

              <div className="p-4 overflow-y-auto flex-1 custom-scrollbar">
                {!activeField ? (
                  <div className="text-center mt-12 bg-slate-50/50 p-6 rounded-2xl border border-dashed border-slate-200">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-white shadow-sm border border-slate-100 mb-4">
                      <SlidersHorizontal size={20} className="text-indigo-400" />
                    </div>
                    <p className="text-xs font-bold text-slate-700">No field selected</p>
                    <p className="text-[10px] text-slate-500 mt-1 font-medium leading-relaxed">Click on any field in the canvas to edit its properties.</p>
                  </div>
                ) : (
                  <div className="space-y-5">

                    {activeTab === 'settings' ? (
                      <>
                        <div className="flex items-center gap-2 text-[10px] font-black tracking-widest uppercase text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-md border border-indigo-100/50 w-fit">
                          {activeField.fieldType.replace(/_/g, " ")}
                        </div>

                        <div className="space-y-1.5">
                          <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1">
                            {activeField.fieldType === "SECTION" ? "Section Title" :
                              activeField.fieldType === "LABEL" ? "Heading / Text" :
                                activeField.fieldType === "GROUP" ? "Group Title" :
                                  activeField.fieldType === "PAGE_BREAK" ? "Page Name" : "Question / Label"} <span className="text-red-500 font-black">*</span>
                          </label>
                          <textarea
                            rows={2}
                            value={activeField.fieldLabel}
                            onChange={(e) => updateLocalField(activeField.id, "fieldLabel", e.target.value)}
                            className={`w-full bg-slate-50 border rounded-lg px-3 py-2 text-xs text-slate-900 font-medium hover:border-indigo-300 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white transition-all resize-none shadow-sm ${(!activeField.fieldLabel?.trim() || RESERVED_KEYWORDS.includes((activeField.fieldLabel || "").toUpperCase().trim())) ? 'border-red-300' : 'border-slate-200'}`}
                            placeholder="Enter your question name..."
                          />
                          {!activeField.fieldLabel?.trim() && <p className="text-[9px] font-bold text-red-500">Name is required.</p>}
                          {activeField.fieldLabel?.trim() && RESERVED_KEYWORDS.includes(activeField.fieldLabel.toUpperCase().trim()) && (
                            <p className="text-[9px] font-bold text-red-500 flex items-center gap-1">
                              <ShieldAlert size={10} /> '{activeField.fieldLabel}' is a reserved SQL keyword.
                            </p>
                          )}
                        </div>

                        {(activeField.fieldType === "SECTION" || activeField.fieldType === "LABEL" || activeField.fieldType === "GROUP") && (
                          <div className="pt-2 animate-in fade-in slide-in-from-top-1 duration-300">
                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5 flex items-center justify-between">
                              <span>Description</span>
                              <span className="text-[9px] font-bold text-slate-400 normal-case bg-slate-100 px-1.5 py-0.5 rounded">Optional</span>
                            </label>
                            <textarea
                              rows={3}
                              value={activeField.uiConfig?.helpText || ""}
                              onChange={(e) => updateNestedObject(activeField.id, "uiConfig", "helpText", e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium hover:border-indigo-300 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white transition-all resize-none shadow-sm"
                              placeholder="Add a detailed description or sub-text..."
                            />
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
                          <div className="space-y-2 pt-4 border-t border-slate-100">
                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500">Max Stars</label>
                            <input type="number" onWheel={(e) => e.target.blur()} min={1} max={10}
                              value={activeField.uiConfig?.maxStars || 5}
                              onChange={(e) => updateNestedObject(activeField.id, "uiConfig", "maxStars", Number(e.target.value))}
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium hover:border-indigo-300 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white transition-all shadow-sm"
                            />
                          </div>
                        )}

                        {activeField.fieldType === "LINEAR_SCALE" && (
                          <div className="space-y-3 pt-4 border-t border-slate-100">
                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500">Scale Range</label>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Min</label>
                                <input type="number" onWheel={(e) => e.target.blur()} value={activeField.uiConfig?.scaleMin ?? 1} onChange={(e) => updateNestedObject(activeField.id, "uiConfig", "scaleMin", Number(e.target.value))} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium hover:border-indigo-300 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white transition-all shadow-sm" />
                              </div>
                              <div>
                                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Max</label>
                                <input type="number" onWheel={(e) => e.target.blur()} value={activeField.uiConfig?.scaleMax ?? 5} onChange={(e) => updateNestedObject(activeField.id, "uiConfig", "scaleMax", Number(e.target.value))} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium hover:border-indigo-300 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white transition-all shadow-sm" />
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

                        {(activeField.fieldType === "DROPDOWN" || activeField.fieldType === "LOOKUP_DROPDOWN") && (
                          <div className="space-y-4 pt-5 border-t border-slate-100">
                            <label className="block text-sm font-bold text-slate-800 mb-2 flex items-center gap-2">
                              <Users size={16} className="text-indigo-500" />
                              Selection Mode
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                              {['single', 'multiple'].map(mode => (
                                <button
                                  key={mode}
                                  onClick={() => updateNestedObject(activeField.id, "uiConfig", "selectionMode", mode)}
                                  className={`px-4 py-3 text-xs font-bold rounded-xl border-2 transition-all ${(activeField.uiConfig?.selectionMode || 'single') === mode
                                    ? "border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm"
                                    : "border-slate-200 bg-white text-slate-500 hover:border-indigo-200"
                                    }`}
                                >
                                  {mode === 'single' ? 'Single Select' : 'Multi Select'}
                                </button>
                              ))}
                            </div>
                            {(activeField.uiConfig?.selectionMode === 'multiple') && (
                              <div className="pt-2 animate-in fade-in slide-in-from-top-2 duration-300">
                                <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-1.5 flex items-center justify-between">
                                  <span>Max Selections</span>
                                  <span className="text-[9px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-400">Optional</span>
                                </label>
                                <input
                                  type="number"
                                  onWheel={(e) => e.target.blur()}
                                  min={1}
                                  value={activeField.uiConfig?.maxSelections || ""}
                                  onChange={(e) => updateNestedObject(activeField.id, "uiConfig", "maxSelections", e.target.value ? Number(e.target.value) : null)}
                                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium hover:border-indigo-300 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white transition-all shadow-sm"
                                  placeholder="No limit"
                                />
                              </div>
                            )}
                          </div>
                        )}

                        {activeField.fieldType === "FILE_UPLOAD" && (
                          <div className="space-y-4 pt-5 border-t border-slate-100">
                            <div>
                              <label className="block text-sm font-bold text-slate-800 mb-1.5">Max File Size (MB)</label>
                              <input type="number" onWheel={(e) => e.target.blur()} min={1} max={100}
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

                        {activeField.fieldType !== "SECTION" && activeField.fieldType !== "LABEL" && activeField.fieldType !== "GROUP" && activeField.fieldType !== "PAGE_BREAK" && (
                          <div className="pt-5 border-t border-slate-100">
                            <label className={`flex items-center justify-between p-4 border-2 rounded-xl transition-colors ${(activeField.uiConfig?.readOnly || activeField.uiConfig?.hidden)
                              ? 'bg-slate-50 border-slate-100 cursor-not-allowed opacity-60'
                              : 'cursor-pointer hover:bg-slate-50 hover:border-slate-200 border-slate-100'
                              }`}>
                              <div className="flex flex-col">
                                <span className="text-sm font-extrabold text-slate-800 tracking-tight">Required Field</span>
                                <span className="text-xs font-medium text-slate-500 mt-0.5">
                                  {(activeField.uiConfig?.readOnly || activeField.uiConfig?.hidden)
                                    ? 'Not available for Read-Only or Hidden fields'
                                    : 'Force users to answer this'}
                                </span>
                              </div>
                              <input type="checkbox"
                                checked={activeField.required && !activeField.uiConfig?.readOnly && !activeField.uiConfig?.hidden}
                                disabled={activeField.uiConfig?.readOnly || activeField.uiConfig?.hidden}
                                onChange={(e) => updateLocalField(activeField.id, "required", e.target.checked)}
                                className="w-5 h-5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer transition-all disabled:cursor-not-allowed"
                              />
                            </label>
                          </div>
                        )}

                        {activeField.fieldType !== "SECTION" && activeField.fieldType !== "LABEL" && activeField.fieldType !== "GROUP" && activeField.fieldType !== "PAGE_BREAK" && (
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
                              {activeField.fieldType !== "SECTION" &&
                                activeField.fieldType !== "LABEL" &&
                                activeField.fieldType !== "GROUP" && (
                                  <div>
                                    <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">Help / Subtext</label>
                                    <textarea rows={2} value={activeField.uiConfig?.helpText || ""}
                                      onChange={(e) => updateNestedObject(activeField.id, "uiConfig", "helpText", e.target.value)}
                                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium hover:border-indigo-300 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white transition-all resize-none shadow-sm"
                                      placeholder="Add hints or instructions for users..."
                                    />
                                  </div>
                                )}

                              {!OPTIONS_BASED_TYPES.includes(activeField.fieldType) &&
                                !GRID_TYPES.includes(activeField.fieldType) &&
                                activeField.fieldType !== "BOOLEAN" &&
                                activeField.fieldType !== "LINEAR_SCALE" &&
                                activeField.fieldType !== "FILE_UPLOAD" &&
                                activeField.fieldType !== "LOOKUP_DROPDOWN" && (
                                  <div>
                                    <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">Default Value</label>
                                    <input
                                      type={activeField.fieldType === "INTEGER" ? "number" : activeField.fieldType === "DATE" ? "date" : activeField.fieldType === "TIME" ? "time" : activeField.fieldType === "DATETIME" ? "datetime-local" : activeField.fieldType === "PHONE" ? "tel" : "text"}
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
                                  onChange={(e) => {
                                    const val = e.target.checked;
                                    updateNestedObject(activeField.id, "uiConfig", "readOnly", val);
                                    if (val) {
                                      updateLocalField(activeField.id, "required", false);
                                      updateNestedObject(activeField.id, "uiConfig", "hidden", false);
                                    }
                                  }}
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
                                  onChange={(e) => {
                                    const val = e.target.checked;
                                    updateNestedObject(activeField.id, "uiConfig", "hidden", val);
                                    if (val) {
                                      updateLocalField(activeField.id, "required", false);
                                      updateNestedObject(activeField.id, "uiConfig", "readOnly", false);
                                    }
                                  }}
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
                              {activeField.fieldType === "EMAIL" && (
                                <div className="pt-2 animate-in fade-in slide-in-from-top-2 duration-300">
                                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 flex items-center justify-between">
                                    <span>Allowed Domains</span>
                                    <span className="text-[9px] bg-indigo-50 px-1.5 py-0.5 rounded text-indigo-500 font-bold">Restrict Submission</span>
                                  </label>
                                  <div className="space-y-2">
                                    {(activeField.validation?.allowedDomains || []).map((domain, idx) => (
                                      <div key={idx} className="flex gap-2">
                                        <input
                                          type="text"
                                          value={domain}
                                          onChange={(e) => {
                                            const updated = [...(activeField.validation?.allowedDomains || [])];
                                            updated[idx] = e.target.value.toLowerCase().trim();
                                            updateNestedObject(activeField.id, "validation", "allowedDomains", updated);
                                          }}
                                          className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold text-indigo-600 hover:border-indigo-300 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white transition-all shadow-sm"
                                          placeholder="e.g. gmail.com"
                                        />
                                        <button
                                          onClick={() => {
                                            const updated = (activeField.validation?.allowedDomains || []).filter((_, i) => i !== idx);
                                            updateNestedObject(activeField.id, "validation", "allowedDomains", updated);
                                          }}
                                          className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                                        >
                                          <X size={14} />
                                        </button>
                                      </div>
                                    ))}
                                    <button
                                      onClick={() => {
                                        const current = activeField.validation?.allowedDomains || [];
                                        updateNestedObject(activeField.id, "validation", "allowedDomains", [...current, ""]);
                                      }}
                                      className="flex items-center gap-2 text-[10px] font-bold text-indigo-600 hover:text-indigo-700 mt-2 px-2 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors border border-dashed border-indigo-200"
                                    >
                                      <Plus size={12} strokeWidth={3} /> Add Domain
                                    </button>
                                  </div>
                                  <p className="text-[10px] font-medium text-slate-400 mt-2 italic px-1">If set, only emails from these domains will be accepted.</p>
                                </div>
                              )}

                              {TEXT_BASED_TYPES.includes(activeField.fieldType) && activeField.fieldType !== "PHONE" && (
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Min Length</label>
                                    <input type="number" onWheel={(e) => e.target.blur()} min="0" value={activeField.validation?.minLength || ""}
                                      onChange={(e) => updateNestedObject(activeField.id, "validation", "minLength", e.target.value)}
                                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium hover:border-indigo-300 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white transition-all shadow-sm" placeholder="e.g. 10" />
                                  </div>
                                  <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Max Length</label>
                                    <input type="number" onWheel={(e) => e.target.blur()} min="0" value={activeField.validation?.maxLength || ""}
                                      onChange={(e) => updateNestedObject(activeField.id, "validation", "maxLength", e.target.value)}
                                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium hover:border-indigo-300 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white transition-all shadow-sm" placeholder="e.g. 500" />
                                  </div>
                                </div>
                              )}
                              {NUMBER_BASED_TYPES.includes(activeField.fieldType) && (
                                <div className="space-y-6">
                                  {/* Number Format Selector - Sleek Segmented UI */}
                                  <div>
                                    <label className="block text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 mb-2.5 pl-1">Number Precision</label>
                                    <div className="flex p-1 bg-slate-100 rounded-xl border border-slate-200/60">
                                      {[
                                        { value: "INTEGER", label: "Integer" },
                                        { value: "DECIMAL", label: "Decimal" },
                                      ].map((opt) => {
                                        const isSelected = (activeField.validation?.numberFormat || "INTEGER") === opt.value;
                                        return (
                                          <button
                                            key={opt.value}
                                            type="button"
                                            onClick={() => updateNestedObject(activeField.id, "validation", "numberFormat", opt.value)}
                                            className={`flex-1 py-1.5 px-3 rounded-lg text-[11px] font-black transition-all duration-200 ${isSelected
                                              ? "bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200/50"
                                              : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                                              }`}
                                          >
                                            {opt.label}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>

                                  {/* Min / Max Grid */}
                                  <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 pl-1">Min Value</label>
                                      <input
                                        type="number"
                                        onWheel={(e) => e.target.blur()}
                                        step={(activeField.validation?.numberFormat || "INTEGER") === "DECIMAL" ? "0.01" : "1"}
                                        value={activeField.validation?.min || ""}
                                        onChange={(e) => updateNestedObject(activeField.id, "validation", "min", e.target.value)}
                                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold hover:border-indigo-300 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all shadow-sm"
                                        placeholder="No min"
                                      />
                                    </div>
                                    <div className="space-y-1.5">
                                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 pl-1">Max Value</label>
                                      <input
                                        type="number"
                                        onWheel={(e) => e.target.blur()}
                                        step={(activeField.validation?.numberFormat || "INTEGER") === "DECIMAL" ? "0.01" : "1"}
                                        value={activeField.validation?.max || ""}
                                        onChange={(e) => updateNestedObject(activeField.id, "validation", "max", e.target.value)}
                                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold hover:border-indigo-300 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all shadow-sm"
                                        placeholder="No max"
                                      />
                                    </div>
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
                                                <input type="number" onWheel={(e) => e.target.blur()} min="1" value={act.value || ""} onChange={(e) => {
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

                        setUpdateStatus({ type: 'error', message: 'Failed to save settings.' });
                        setTimeout(() => setUpdateStatus(null), 3000);
                      } finally {
                        setIsUpdatingForm(false);
                      }
                    }}
                    disabled={isUpdatingForm || !isOwnerOrAdmin}
                    className={`w-full mt-4 py-3.5 text-white rounded-xl text-sm font-bold transition-all shadow-lg flex items-center justify-center gap-2 active:scale-95 ${isOwnerOrAdmin
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
                  {/* 1. Add Permission Input — ONLY for Owner/Admin */}
                  {isOwnerOrAdmin && (
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Username / Email</label>
                        <div className="relative group">
                          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-emerald-500 transition-colors">
                            <UserPlus size={18} />
                          </div>
                          <input
                            type="text"
                            className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none font-medium placeholder:text-slate-400"
                            placeholder="Type username..."
                            value={newPermissionUser}
                            onChange={(e) => setNewPermissionUser(e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <div className="flex-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 mb-1.5 block">Select Role</label>
                          <select
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
                            value={newPermissionRole}
                            onChange={(e) => setNewPermissionRole(e.target.value)}
                          >
                            <option value="VIEWER">Viewer</option>
                            <option value="BUILDER">Builder</option>
                          </select>
                        </div>
                        <div className="flex items-end">
                          <button
                            onClick={async () => {
                              if (!newPermissionUser) return;
                              setIsAddingPermission(true);
                              try {
                                await api.addPermission(formId, newPermissionUser, newPermissionRole);

                                // Success path
                                setNewPermissionUser("");
                                toast.success(`Permission granted to ${newPermissionUser} successfully!`);

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

                                toast.error(errorMsg);
                              } finally {
                                setIsAddingPermission(false);
                              }
                            }}
                            disabled={isAddingPermission || !newPermissionUser}
                            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all shadow-md flex items-center justify-center gap-2 active:scale-95 h-[42px] min-w-[100px] ${isAddingPermission || !newPermissionUser
                              ? "bg-slate-100 text-slate-400 cursor-not-allowed shadow-none"
                              : "bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-200"
                              }`}
                          >
                            {isAddingPermission ? (
                              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                              <>
                                <Plus size={16} />
                                <span>Add</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Active Permissions</label>
                    <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">

                      <div className="flex items-center justify-between p-3.5 bg-slate-100/80 border border-slate-200/80 rounded-xl">
                        <div className="flex items-center gap-3.5">
                          <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center text-xs font-black text-slate-600 uppercase shadow-inner">
                            {user?.id === form?.ownerId ? "YOU" : (form?.ownerName?.charAt(0) || "?")}
                          </div>
                          <div>
                            <p className="text-sm font-extrabold text-slate-900 leading-tight">
                              {user?.id === form?.ownerId ? "You (Owner)" : `${form?.ownerName} (Owner)`}
                            </p>
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
                          {isOwnerOrAdmin && (
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
                          )}
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
        </div>
      </aside>

      <CustomValidationsPanel
        formId={formId}
        fields={localFields}
        isOpen={showLogicModal}
        onClose={() => setShowLogicModal(false)}
      />

      <ConfirmationModal
        isOpen={showUnsavedModal}
        onClose={() => setShowUnsavedModal(false)}
        onConfirm={handleConfirmLeave}
        title="Unsaved Changes"
        message="You have unsaved changes. Are you sure you want to leave without saving?"
        confirmText="Leave"
        cancelText="Stay"
        type="warning"
      />
    </div>
  );
}