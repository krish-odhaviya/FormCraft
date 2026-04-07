import React, { useState, useEffect, useRef } from "react";
import { 
  Plus, Trash2, ShieldCheck, AlertCircle, Save, Info, 
  ChevronDown, ChevronUp, GripVertical, CheckCircle2,
  Search, Copy, MousePointerClick, Database, Tag,
  Variable, HelpCircle, X
} from "lucide-react";
import { api } from "@/lib/api/formService";
import { toast } from "react-hot-toast";

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

export default function CustomValidationsPanel({ formId, fields }) {
  const [validations, setValidations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [searchVar, setSearchVar] = useState("");
  const textareaRefs = useRef({});

  useEffect(() => {
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
  }, [formId]);

  const handleSave = async () => {
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
    setValidations([...validations, newRule]);
    setExpandedId(newId);
  };

  const updateValidation = (id, key, value) => {
    setValidations(prev => prev.map(v => v.id === id ? { ...v, [key]: value } : v));
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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12">
        <div className="animate-spin h-8 w-8 border-3 border-indigo-200 border-t-indigo-600 rounded-full mb-4"></div>
        <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">Loading Engine...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#fbfcfd]">
      {/* Header Stat Area */}
      <div className="px-4 py-3 bg-white border-b border-slate-100 flex items-center justify-between">
         <div className="flex items-center gap-3">
           <div className="w-9 h-9 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600 shadow-sm border border-indigo-100/50">
             <ShieldCheck size={20} />
           </div>
           <div>
             <h3 className="text-xs font-black text-slate-900 tracking-tight">Logic Engine</h3>
             <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{validations.length} Active Rules</p>
           </div>
         </div>
         <button
            onClick={addValidation}
            className="flex items-center gap-2 px-2.5 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-md transition-all active:scale-95 text-[10px] font-bold"
          >
            <Plus size={14} /> Add Rule
          </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-4 space-y-4">
        {validations.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-8 text-center space-y-3 shadow-sm border-dashed">
             <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300">
               <ShieldCheck size={24} />
             </div>
             <div className="space-y-1">
               <p className="text-xs font-black text-slate-800 tracking-tight">No Custom Rules Found</p>
               <p className="text-[10px] text-slate-500 max-w-[200px] mx-auto leading-relaxed font-medium">
                 Define complex cross-field dependencies and mathematical constraints.
               </p>
             </div>
          </div>
        ) : (
          <div className="space-y-3">
            {validations.map((rule, index) => (
              <div 
                key={rule.id} 
                className={`bg-white border rounded-xl transition-all duration-300 overflow-hidden ${
                  expandedId === rule.id 
                  ? "border-indigo-500 shadow-lg shadow-indigo-500/5 ring-4 ring-indigo-500/5" 
                  : "border-slate-200 hover:border-slate-300 shadow-sm"
                }`}
              >
                {/* Header */}
                <div 
                  className={`px-4 py-3 flex items-center justify-between cursor-pointer group transition-colors ${expandedId === rule.id ? "bg-indigo-50/30" : ""}`}
                  onClick={() => setExpandedId(expandedId === rule.id ? null : rule.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-6 h-6 flex items-center justify-center rounded-md text-[10px] font-black shadow-sm flex-shrink-0 transition-colors ${
                      expandedId === rule.id ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500 group-hover:bg-slate-200"
                    }`}>
                      {index + 1}
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5">
                         <span className={`text-[11px] font-black tracking-tight ${expandedId === rule.id ? "text-indigo-900" : "text-slate-700"}`}>
                           {rule.scope === 'FIELD' ? 'Field Constraint' : 'Global Logic'}
                         </span>
                         {rule.errorMessage && (
                           <div className="flex items-center gap-1 px-1.5 py-0.5 bg-amber-50 text-amber-600 rounded-full text-[8px] font-black uppercase ring-1 ring-amber-100">
                             <AlertCircle size={7} /> Feedback Set
                           </div>
                         )}
                      </div>
                      <span className="text-[9px] font-bold text-slate-400 font-mono line-clamp-1 mt-0.5 opacity-80 italic">
                        {rule.expression || "No logic defined..."}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button 
                      onClick={(e) => { e.stopPropagation(); removeValidation(rule.id); }}
                      className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={14} />
                    </button>
                    <div className={`p-1 rounded-md transition-colors ${expandedId === rule.id ? "bg-indigo-100 text-indigo-600" : "bg-slate-50 text-slate-400"}`}>
                      {expandedId === rule.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </div>
                  </div>
                </div>

                {/* Body */}
                {expandedId === rule.id && (
                  <div className="px-4 pb-4 pt-1 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block pl-1">Target Scope</label>
                        <div className="relative">
                          <select 
                            value={rule.scope}
                            onChange={(e) => updateValidation(rule.id, "scope", e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-[11px] font-bold text-slate-700 shadow-inner focus:ring-2 focus:ring-indigo-500/10 outline-none transition-all appearance-none cursor-pointer"
                          >
                            <option value="FIELD">Specific Field</option>
                            <option value="FORM">Cross-Field</option>
                          </select>
                          <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block pl-1">Feedback Target</label>
                        <div className="relative">
                          <select 
                            value={rule.fieldKey}
                            onChange={(e) => updateValidation(rule.id, "fieldKey", e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-[11px] font-bold text-slate-700 shadow-inner focus:ring-2 focus:ring-indigo-500/10 outline-none transition-all appearance-none cursor-pointer"
                          >
                            <option value="">Form Level</option>
                            {fields.filter(f => !['SECTION', 'LABEL'].includes(f.fieldType)).map(f => (
                              <option key={f.id} value={f.fieldKey}>{f.fieldLabel}</option>
                            ))}
                          </select>
                          <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between pl-1">
                        <div className="flex items-center gap-2">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Logic Expression</label>
                          <div className="group relative">
                             <HelpCircle size={10} className="text-slate-300 hover:text-indigo-400 transition-colors cursor-help" />
                             <div className="absolute left-0 bottom-full mb-2 w-48 bg-slate-900 text-white text-[8px] p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-xl">
                               Evaluates to <b>TRUE</b> for valid forms.
                             </div>
                          </div>
                        </div>
                        <span className="text-[8px] font-black text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100/50">
                          {rule.scope === 'FIELD' ? "Value is 'value'" : "Use Field Slugs"}
                        </span>
                      </div>
                      
                      <div className="relative">
                        <textarea 
                          ref={el => textareaRefs.current[rule.id] = el}
                          rows={2}
                          value={rule.expression}
                          onChange={(e) => updateValidation(rule.id, "expression", e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono font-bold text-emerald-400 shadow-xl focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all resize-none placeholder-slate-700 leading-relaxed"
                          placeholder={rule.scope === 'FIELD' ? "e.g. value.length > 5" : "e.g. price > 100"}
                        />
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 bg-slate-50 border border-slate-200/60 p-2 rounded-lg border-dashed">
                        {['==', '!=', '>', '<', '>=', '<=', '&&', '||', '!'].map(op => (
                          <button 
                            key={op}
                            onClick={() => insertVariableAtCursor(rule.id, op + " ")}
                            className="px-1.5 py-0.5 bg-white border border-slate-200 text-slate-600 rounded-md text-[9px] font-black hover:border-indigo-400 hover:text-indigo-600 transition-all shadow-sm active:scale-95"
                          >
                            {op}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block pl-1">Error Feedback</label>
                      <input 
                        type="text"
                        value={rule.errorMessage}
                        onChange={(e) => updateValidation(rule.id, "errorMessage", e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-[11px] font-bold text-slate-700 shadow-sm focus:ring-2 focus:ring-indigo-500/10 outline-none transition-all"
                        placeholder="Ex: Field is required"
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Floating Variable Assistant */}
      <div className="px-4 py-4 border-t border-slate-200 bg-white shadow-[0_-10px_30px_rgba(0,0,0,0.02)] z-10">
        <div className="mb-3">
          <div className="flex items-center justify-between mb-2">
             <div className="flex items-center gap-1.5">
               <div className="p-1 px-2 bg-indigo-600 text-white rounded text-[8px] font-black uppercase tracking-widest shadow-sm">
                 Logic Assistant
               </div>
               <h4 className="text-[10px] font-black text-slate-800 tracking-tight">Variables Library</h4>
             </div>
             {searchVar && (
               <button onClick={() => setSearchVar("")} className="text-slate-400 hover:text-red-500">
                 <X size={12} />
               </button>
             )}
          </div>
          <div className="relative">
            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text"
              placeholder="Search slug..."
              value={searchVar}
              onChange={(e) => setSearchVar(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-[10px] font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all shadow-inner"
            />
          </div>
        </div>

        <div className="max-h-[140px] overflow-y-auto pr-1 space-y-1.5 custom-scrollbar-thin">
           {filteredVars.length === 0 ? (
             <div className="py-4 text-center bg-slate-50/50 rounded-lg border border-dashed border-slate-200">
                <p className="text-[9px] font-bold text-slate-400">No variables found</p>
             </div>
           ) : (
             filteredVars.map(f => (
               <div 
                 key={f.id} 
                 className={`flex items-center justify-between p-2 rounded-lg border transition-all group ${
                    expandedId ? "cursor-pointer hover:bg-indigo-50/50 hover:border-indigo-200" : "bg-white border-slate-100"
                 }`}
                 onClick={() => {
                   if (expandedId) {
                     insertVariableAtCursor(expandedId, f.slug);
                     toast.success(`Inserted!`, { duration: 800 });
                   } else {
                     navigator.clipboard.writeText(f.slug);
                     toast.success(`Copied!`, { duration: 800 });
                   }
                 }}
               >
                 <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded bg-white border border-slate-100 flex items-center justify-center text-slate-400 group-hover:text-indigo-600 group-hover:border-indigo-100 transition-colors shadow-sm">
                      <Database size={12} />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[9px] font-black text-slate-700 leading-none group-hover:text-indigo-900 transition-colors">{f.fieldLabel}</span>
                      <span className="text-[8px] font-bold text-slate-400 flex items-center gap-1 mt-0.5">
                        {f.slug}
                      </span>
                    </div>
                 </div>
                 <div className="flex items-center gap-1.5">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400">
                       {expandedId ? <MousePointerClick size={12} /> : <Copy size={12} />}
                    </div>
                 </div>
               </div>
             ))
           )}
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full mt-4 py-3 bg-indigo-600 text-white rounded-xl text-xs font-black shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 group active:scale-95 active:translate-y-0 disabled:opacity-50"
        >
          {saving ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-[2px] border-white/20 border-t-white rounded-full animate-spin" />
              <span className="uppercase tracking-widest">Saving...</span>
            </div>
          ) : (
            <>
              <Save size={16} className="transition-transform group-hover:rotate-6" />
              <span className="uppercase tracking-[0.1em]">Save Logic Schema</span>
            </>
          )}
        </button>
      </div>
      
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
        .custom-scrollbar-thin::-webkit-scrollbar {
          width: 3px;
        }
        .custom-scrollbar-thin::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
}
