import React, { useState, useEffect } from "react";
import { Plus, Trash2, ShieldCheck, AlertCircle, Save, Info, ChevronDown, ChevronUp, GripVertical, CheckCircle2 } from "lucide-react";
import { api } from "@/lib/api/formService";
import { toast } from "react-hot-toast";

export default function CustomValidationsPanel({ formId, fields }) {
  const [validations, setValidations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

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
      // Re-assign execution order based on current list order
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
      fieldKey: fields[0]?.fieldKey || "",
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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12">
        <div className="animate-spin h-8 w-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full mb-4"></div>
        <p className="text-slate-500 text-xs font-medium uppercase tracking-widest">Loading rules...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50/50">
      <div className="p-6 flex-1 overflow-y-auto custom-scrollbar space-y-6">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <ShieldCheck size={18} className="text-indigo-600" /> Custom Logic Engine
            </h3>
            <p className="text-[11px] font-medium text-slate-500 mt-1">Define complex cross-field validation rules.</p>
          </div>
          <button
            onClick={addValidation}
            className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-sm transition-all active:scale-95"
            title="Add new validation rule"
          >
            <Plus size={18} />
          </button>
        </div>

        {validations.length === 0 ? (
          <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-10 text-center space-y-3">
             <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300">
               <Info size={24} />
             </div>
             <p className="text-sm font-bold text-slate-600">No custom rules defined</p>
             <p className="text-xs text-slate-400 max-w-[200px] mx-auto leading-relaxed">
               Click the plus icon to create your first server-side validation logic.
             </p>
          </div>
        ) : (
          <div className="space-y-3">
            {validations.map((rule, index) => (
              <div 
                key={rule.id} 
                className={`bg-white border rounded-xl transition-all overflow-hidden ${
                  expandedId === rule.id ? "border-indigo-400 shadow-md ring-2 ring-indigo-50" : "border-slate-200 hover:border-slate-300 shadow-sm"
                }`}
              >
                {/* Header */}
                <div 
                  className="px-4 py-3 flex items-center justify-between cursor-pointer group"
                  onClick={() => setExpandedId(expandedId === rule.id ? null : rule.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-1 px-2 bg-slate-100 rounded text-[10px] font-black text-slate-500 uppercase tracking-widest">
                      #{index + 1}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-slate-800 line-clamp-1">
                        {rule.scope === 'FIELD' ? `Field: ${rule.fieldKey}` : 'Global Form Rule'}
                      </span>
                      <span className="text-[10px] font-medium text-slate-400 font-mono line-clamp-1">{rule.expression || "Empty expression..."}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={(e) => { e.stopPropagation(); removeValidation(rule.id); }}
                      className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={14} />
                    </button>
                    {expandedId === rule.id ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                  </div>
                </div>

                {/* Body */}
                {expandedId === rule.id && (
                  <div className="px-4 pb-4 pt-1 space-y-4 bg-slate-50/30 border-t border-slate-50">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5 block">Scope</label>
                        <select 
                          value={rule.scope}
                          onChange={(e) => updateValidation(rule.id, "scope", e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 shadow-sm focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                        >
                          <option value="FIELD">TARGET FIELD</option>
                          <option value="FORM">CROSS FIELD (FORM)</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5 block">Attach Error to</label>
                        <select 
                          value={rule.fieldKey}
                          onChange={(e) => updateValidation(rule.id, "fieldKey", e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 shadow-sm focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                        >
                          <option value="">Generic (Form Level)</option>
                          {fields.filter(f => f.fieldType !== 'SECTION' && f.fieldType !== 'LABEL').map(f => (
                            <option key={f.id} value={f.fieldKey}>{f.fieldLabel} ({f.fieldKey})</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Logic Expression</label>
                        <span className="text-[9px] font-medium text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded italic">Evaluates if VALID</span>
                      </div>
                      <textarea 
                        rows={2}
                        value={rule.expression}
                        onChange={(e) => updateValidation(rule.id, "expression", e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono font-bold text-indigo-700 shadow-sm focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all resize-none"
                        placeholder={rule.scope === 'FIELD' ? "e.g. value > 18" : "e.g. field_a > field_b"}
                      />
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-[9px] font-medium text-slate-400 italic">
                          Ops: ==, !=, {">"}, {"<"}, {">="}, {"<="}, &&, ||, !
                        </p>
                        {rule.scope === 'FIELD' && (
                          <p className="text-[9px] font-bold text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded">
                            Tip: Use 'value' to refer to this field
                          </p>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5 block">Error Message</label>
                      <input 
                        type="text"
                        value={rule.errorMessage}
                        onChange={(e) => updateValidation(rule.id, "errorMessage", e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 shadow-sm focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                        placeholder="Show this message on failure..."
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p-4 border-t border-slate-200 bg-white space-y-3">
        {/* Variables Reference */}
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
           <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
             <Info size={12} className="text-indigo-500" /> Variable Guide
           </h4>
           <div className="max-h-[120px] overflow-y-auto space-y-1.5 text-[10px]">
             {fields.filter(f => !['SECTION', 'LABEL'].includes(f.fieldType)).map(f => {
               const slug = (f.fieldLabel || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "_");
               const finalSlug = /^\d/.test(slug) ? `f_${slug}` : slug || `id_${f.fieldKey.replace(/[^a-z0-9]/g, '')}`;
               return (
                  <div key={f.id} className="flex items-center justify-between group">
                    <span className="text-slate-500 font-medium truncate max-w-[120px]">{f.fieldLabel}</span>
                    <code 
                      className="bg-white border border-slate-200 text-indigo-600 px-1.5 py-0.5 rounded font-bold cursor-copy hover:border-indigo-400 transition-colors" 
                      title="Click to copy variable name" 
                      onClick={() => {
                        navigator.clipboard.writeText(finalSlug);
                        toast.success(`Copied "${finalSlug}"`);
                      }}
                    >
                      {finalSlug}
                    </code>
                  </div>
               );
             })}
           </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 group active:scale-95 disabled:opacity-50"
        >
          {saving ? (
            <div className="w-5 h-5 border-[3px] border-white/20 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <Save size={18} className="group-hover:rotate-12 transition-transform" />
              <span>Save Validation Rules</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
