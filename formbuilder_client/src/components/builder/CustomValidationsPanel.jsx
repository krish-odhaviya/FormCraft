import React, { useState, useEffect, useRef } from "react";
import { 
  Plus, Trash2, ShieldCheck, AlertCircle, Save, Info, 
  ChevronDown, ChevronUp, GripVertical, CheckCircle2,
  Search, Copy, MousePointerClick, Database, Tag,
  Variable, HelpCircle, X, Zap, History, Loader2
} from "lucide-react";
import { api } from "@/lib/api/formService";
import { toast } from "react-hot-toast";
import { validateExpression } from "@/lib/expressionValidator";

/** 
 * Centralized Slug Generation logic — must match backend FormSubmissionService.java 
 */
export const getFieldSlug = (f) => {
  let slug = (f.fieldLabel || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "_");
  if (!slug) {
    slug = "field_" + f.fieldKey.replace(/[^a-z0-9]+/g, "");
  }
  if (/^\d/.test(slug)) {
    slug = "f_" + slug;
  }
  return slug;
};

export default function CustomValidationsPanel({ formId, fields, isOpen, onClose }) {
  const [validations, setValidations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [searchVar, setSearchVar] = useState("");
  const [expressionErrors, setExpressionErrors] = useState({});
  const textareaRefs = useRef({});

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      const fetchValidations = async () => {
        try {
          const res = await api.getValidations(formId);
          setValidations(res.data || []);
        } catch (err) {
          console.error("Failed to load validations", err);
          toast.error("Could not load custom validations");
        } finally {
          setLoading(false);
        }
      };
      if (formId) fetchValidations();
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [formId, isOpen]);

  const handleSave = async () => {
    // Validate all expressions before saving
    const fieldKeys = fields.map(f => f.fieldKey);
    const slugs = fields.map(f => getFieldSlug(f));
    const allKnownKeys = [...new Set([...fieldKeys, ...slugs])];

    for (const rule of validations) {
      const err = validateExpression(rule.expression, allKnownKeys);
      if (err) {
        setExpressionErrors(prev => ({ ...prev, [rule.id]: err }));
        setExpandedId(rule.id);
        toast.error(`Validation rule "${rule.errorMessage}": ${err}`);
        return;
      }
    }

    setSaving(true);
    try {
      const payload = validations.map((v, index) => ({
        ...v,
        executionOrder: index
      }));
      await api.saveValidations(formId, payload);
      toast.success("Validation rules saved successfully!");
    } catch (err) {
      console.error("Failed to save validations", err);
      toast.error("Failed to save validation rules");
    } finally {
      setSaving(false);
    }
  };

  const addValidation = () => {
    const newId = `new-${Date.now()}`;
    const newRule = {
      id: newId,
      scope: "FIELD",
      fieldKey: fields.find(f => !['SECTION', 'LABEL'].includes(f.fieldType))?.fieldKey || "",
      expression: "",
      errorMessage: "Validation failed",
      executionOrder: validations.length
    };
    setValidations([newRule, ...validations]);
    setExpandedId(newId);
  };

  const updateValidation = (id, key, value) => {
    setValidations(prev => prev.map(v => v.id === id ? { ...v, [key]: value } : v));
    if (key === "expression" && expressionErrors[id]) {
      setExpressionErrors(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  };

  const removeValidation = (id) => {
    setValidations(prev => prev.filter(v => v.id !== id));
  };

  const insertVariableAtCursor = (ruleId, variable) => {
    const textarea = textareaRefs.current[ruleId];
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const rule = validations.find(v => v.id === ruleId);
    if (!rule) return;

    const currentExpression = rule.expression || "";
    const newExpression = 
      currentExpression.substring(0, start) + 
      variable + 
      currentExpression.substring(end);

    updateValidation(ruleId, "expression", newExpression);

    // Reset focus and move cursor
    setTimeout(() => {
      textarea.focus();
      const newPos = start + variable.length;
      textarea.setSelectionRange(newPos, newPos);
    }, 10);
  };

  const filteredVars = fields
    .filter(f => !['SECTION', 'LABEL'].includes(f.fieldType))
    .map(f => ({ ...f, slug: getFieldSlug(f) }))
    .filter(f => 
       f.fieldLabel?.toLowerCase().includes(searchVar.toLowerCase()) || 
       f.slug?.toLowerCase().includes(searchVar.toLowerCase())
    );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6 md:p-10">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-300" 
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-5xl h-[85vh] bg-white border border-slate-200 rounded-[32px] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 fade-in duration-300">
        
        {/* Header */}
        <div className="px-8 py-5 border-b border-slate-100 bg-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-100">
              <ShieldCheck size={24} strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                Logic Engine
                <span className="text-[10px] bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full border border-indigo-100">FORM LEVEL PRO</span>
              </h2>
              <p className="text-xs font-bold text-slate-400 mt-0.5 uppercase tracking-widest">Cross-field validations & mathematical constraints</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-lg shadow-indigo-100 transition-all active:scale-95 flex items-center gap-2"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {saving ? "Saving Changes..." : "Save Configuration"}
            </button>
            <button 
              onClick={onClose}
              className="p-3 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-2xl transition-all"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden flex">
          {/* Left: Sidebar (Vars) */}
          <div className="w-72 border-r border-slate-100 bg-slate-50/30 flex flex-col">
            <div className="p-4 border-b border-slate-100">
              <div className="relative group">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                <input 
                  type="text" 
                  placeholder="Filter variables..." 
                  className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all outline-none"
                  value={searchVar}
                  onChange={(e) => setSearchVar(e.target.value)}
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
              <div className="space-y-1">
                {filteredVars.map(v => (
                  <button 
                    key={v.id}
                    onClick={() => {
                      if (expandedId) {
                        insertVariableAtCursor(expandedId, v.slug);
                        toast.success(`Inserted ${v.slug}`, { duration: 800 });
                      } else {
                        navigator.clipboard.writeText(v.slug);
                        toast.success(`Copied slug!`, { duration: 800 });
                      }
                    }}
                    className="w-full flex items-center gap-3 p-3 bg-white hover:bg-indigo-50 border border-slate-100 rounded-xl transition-all group text-left shadow-sm hover:border-indigo-200"
                  >
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-white group-hover:text-indigo-600 transition-all shadow-sm">
                      <Zap size={14} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-black text-slate-800 leading-tight truncate">{v.fieldLabel}</p>
                      <p className="text-[9px] font-mono text-indigo-500 mt-0.5 truncate">{v.slug}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Rules Editor */}
          <div className="flex-1 overflow-y-auto p-8 bg-slate-50/20 custom-scrollbar">
            <div className="max-w-3xl mx-auto space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] px-1 flex items-center gap-2">
                   Business Rules
                   <span className="bg-slate-200 text-slate-600 text-[10px] px-2 py-0.5 rounded-full font-bold">{validations.length}</span>
                </h3>
                <button 
                  onClick={addValidation}
                  className="flex items-center gap-2 text-[10px] font-black text-indigo-600 hover:text-indigo-700 bg-white px-4 py-2 border-2 border-dashed border-indigo-200 hover:border-indigo-400 rounded-xl transition-all shadow-sm"
                >
                  <Plus size={14} strokeWidth={3} /> ADD NEW RULE
                </button>
              </div>

              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 bg-white border border-slate-100 rounded-[32px] shadow-inner">
                  <Loader2 className="animate-spin text-indigo-500 mb-2" size={32} />
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading logic...</p>
                </div>
              ) : validations.length === 0 ? (
                <div className="py-20 bg-white border border-dashed border-slate-200 rounded-[40px] text-center flex flex-col items-center shadow-inner">
                  <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                    <History size={40} className="text-slate-200" />
                  </div>
                  <h4 className="text-lg font-black text-slate-800 tracking-tight">No Business Logic Defined</h4>
                  <p className="text-sm font-medium text-slate-400 max-w-sm mt-2">
                    Click "Add New Rule" to start building your form's intelligence.
                  </p>
                </div>
              ) : (
                <div className="space-y-4 pb-20">
                  {validations.map((rule, index) => (
                    <div 
                      key={rule.id}
                      className={`group border-2 transition-all duration-300 rounded-[30px] overflow-hidden ${
                        expandedId === rule.id 
                          ? "border-indigo-500 bg-white shadow-2xl shadow-indigo-500/10 scale-[1.01]" 
                          : "border-slate-100 bg-white hover:border-indigo-200"
                      }`}
                    >
                       {/* Rule Header */}
                       <div 
                        className={`px-6 py-4 flex items-center justify-between cursor-pointer ${expandedId === rule.id ? "bg-indigo-50/50" : ""}`}
                        onClick={() => setExpandedId(expandedId === rule.id ? null : rule.id)}
                       >
                         <div className="flex items-center gap-4">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black shadow-sm transition-colors ${
                              expandedId === rule.id ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500"
                            }`}>
                              {validations.length - index}
                            </div>
                            <div>
                               <p className="text-sm font-black text-slate-900 tracking-tight">
                                 {rule.errorMessage || "Untitled Logic Rule"}
                               </p>
                               <p className="text-[10px] font-mono font-bold text-slate-400 mt-0.5 max-w-[400px] truncate italic">
                                 {rule.expression || "No expression defined"}
                               </p>
                            </div>
                         </div>
                         <div className="flex items-center gap-2">
                            <button 
                              onClick={(e) => { e.stopPropagation(); removeValidation(rule.id); }}
                              className="p-2 text-slate-300 hover:text-red-500 hover:bg-white rounded-xl transition-all opacity-0 group-hover:opacity-100"
                            >
                              <Trash2 size={16} />
                            </button>
                            <div className={`p-1.5 rounded-xl transition-colors ${expandedId === rule.id ? "bg-indigo-100 text-indigo-600" : "bg-slate-50 text-slate-400"}`}>
                               {expandedId === rule.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </div>
                         </div>
                       </div>

                       {/* Rule Body */}
                       {expandedId === rule.id && (
                         <div className="p-8 space-y-8 animate-in slide-in-from-top-4 duration-300">
                            <div className="grid grid-cols-2 gap-6">
                               <div className="space-y-2">
                                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Execution Scope</label>
                                  <select 
                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 outline-none transition-all shadow-inner appearance-none bg-no-repeat bg-[right_1rem_center]"
                                    value={rule.scope}
                                    onChange={(e) => updateValidation(rule.id, "scope", e.target.value)}
                                  >
                                    <option value="FIELD">Field Constraint (Context: value)</option>
                                    <option value="FORM">Global Cross-Field Business Rule</option>
                                  </select>
                               </div>
                               <div className="space-y-2">
                                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Anchor Point (Error Placement)</label>
                                  <select 
                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 outline-none transition-all shadow-inner"
                                    value={rule.fieldKey}
                                    onChange={(e) => updateValidation(rule.id, "fieldKey", e.target.value)}
                                  >
                                    <option value="">Form Header (Global)</option>
                                    {fields.filter(f => !['SECTION', 'LABEL'].includes(f.fieldType)).map(f => (
                                      <option key={f.id} value={f.fieldKey}>{f.fieldLabel}</option>
                                    ))}
                                  </select>
                               </div>
                            </div>

                            <div className="space-y-3">
                               <div className="flex items-center justify-between px-1">
                                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Logic Expression (Boolean)</label>
                                  <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
                                    {rule.scope === 'FIELD' ? "Evaluates 'value'" : "Evaluating Slugs"}
                                  </span>
                               </div>
                               <div className="relative group/te">
                                  <textarea 
                                    ref={el => textareaRefs.current[rule.id] = el}
                                    rows={3}
                                    value={rule.expression || ""}
                                    onChange={(e) => updateValidation(rule.id, "expression", e.target.value)}
                                    placeholder={rule.scope === 'FIELD' ? "e.g. value > 18" : "e.g. start_date < end_date"}
                                    onBlur={(e) => {
                                      const fieldKeys = fields.map(f => f.fieldKey);
                                      const slugs = fields.map(f => getFieldSlug(f));
                                      const allKnownKeys = [...new Set([...fieldKeys, ...slugs])];
                                      const err = validateExpression(e.target.value, allKnownKeys);
                                      if (err) setExpressionErrors(prev => ({ ...prev, [rule.id]: err }));
                                    }}
                                    className={`w-full bg-slate-950 border rounded-2xl px-5 py-4 text-sm font-mono font-bold shadow-2xl outline-none transition-all resize-none placeholder-slate-800 leading-relaxed ${
                                      expressionErrors[rule.id] 
                                        ? "border-red-500 text-red-400 focus:ring-4 focus:ring-red-500/20 shadow-red-500/10" 
                                        : "border-slate-800 text-emerald-400 focus:ring-4 focus:ring-indigo-500/20"
                                    }`}
                                  />
                                  {expressionErrors[rule.id] && (
                                    <div className="mt-2 flex items-center gap-2 p-3 bg-red-50 rounded-xl border border-red-100 text-[10px] font-black text-red-600 uppercase tracking-tight">
                                      <AlertCircle size={14} /> {expressionErrors[rule.id]}
                                    </div>
                                  )}
                                  <div className="mt-3 flex flex-wrap gap-2">
                                    {['==', '!=', '>', '<', '>=', '<=', '&&', '||', '!'].map(op => (
                                      <button 
                                        key={op}
                                        onClick={() => insertVariableAtCursor(rule.id, op + " ")}
                                        className="px-3 py-1.5 bg-slate-900 border border-slate-800 text-slate-300 rounded-lg text-xs font-black hover:bg-slate-800 hover:text-white transition-all active:scale-95"
                                      >
                                        {op}
                                      </button>
                                    ))}
                                  </div>
                               </div>
                            </div>

                            <div className="space-y-2">
                               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Error Message to Display</label>
                               <input 
                                 type="text"
                                 value={rule.errorMessage}
                                 onChange={(e) => updateValidation(rule.id, "errorMessage", e.target.value)}
                                 className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold text-slate-700 shadow-inner focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 outline-none transition-all"
                                 placeholder="e.g. Minimum age must be 21"
                               />
                            </div>
                         </div>
                       )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 20px;
        }
        .animate-in {
          animation: 0.3s ease-out both;
        }
        @keyframes zoom-in-95 {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
