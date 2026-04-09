"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { 
  BookOpen, FileText, Code, Terminal, Send, ShieldCheck, Zap, 
  AlertCircle, ChevronRight, Copy, Check, Type, Hash, Mail, 
  Calendar, Phone, Clock, Link as LinkIcon, CircleDot, CheckSquare, 
  ListPlus, ToggleLeft, Heading, Pilcrow, Minus, Layout, 
  Star, Layers, MousePointer2, Image as ImageIcon,
  Lock, ArrowLeft
} from "lucide-react";

export default function ApiReferencePage() {
  const { isAuthenticated } = useAuth();
  const [activeSection, setActiveSection] = useState("overview");
  const [copiedId, setCopiedId] = useState(null);

  const handleCopy = (text, id) => {
    if (typeof text === 'object') {
      text = JSON.stringify(text, null, 2);
    }
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const sections = [
    { id: "overview", label: "Overview", icon: BookOpen },
    { id: "metadata", label: "Metadata API", icon: FileText },
    { id: "components", label: "Components", icon: ListPlus },
    { id: "submission", label: "Submission API", icon: Send },
    { id: "drafts", label: "Draft & Resume", icon: Clock },
    { id: "concepts", label: "Key Concepts", icon: Terminal },
    { id: "validation", label: "Validations", icon: AlertCircle },
    { id: "security", label: "Security", icon: ShieldCheck }
  ];

  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
      setActiveSection(id);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50/50 font-sans">
      {/* Left Sidebar - Table of Contents */}
      <aside className="w-80 hidden lg:block border-r border-slate-200 bg-white h-screen p-8 overflow-y-auto no-scrollbar shadow-sm shadow-slate-200/50 transition-all duration-300">
        <div className="space-y-12">
          {/* Back Button */}
          <Link 
            href={isAuthenticated ? "/" : "/login"}
            className="group inline-flex items-center gap-2.5 px-5 py-3 bg-white text-slate-900 hover:text-white hover:bg-indigo-600 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all shadow-md shadow-slate-200/50 border border-slate-100 hover:border-indigo-600 active:scale-95"
          >
            <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
            {isAuthenticated ? "Dashboard" : "Login"}
          </Link>


          <div className="space-y-8">
            <div>
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6 pl-2">Documentation</h3>
            <nav className="space-y-1">
              {sections.map(section => (
                <button 
                  key={section.id} 
                  onClick={() => scrollToSection(section.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all ${
                    activeSection === section.id 
                      ? "bg-primary-50 text-primary-600" 
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <section.icon size={18} />
                  {section.label}
                  {activeSection === section.id && <ChevronRight size={14} className="ml-auto" />}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6 bg-slate-900 rounded-[2rem] text-white">
            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center mb-4">
              <Code size={20} />
            </div>
            <h4 className="text-sm font-black tracking-tight mb-2">v1.2.0 API Reference</h4>
            <p className="text-[10px] text-slate-400 font-medium leading-relaxed mb-4">
              Access the core engine capabilities through our RESTful runtime endpoints.
            </p>
            <div className="text-[10px] font-mono text-primary-400 bg-primary-400/10 px-3 py-2 rounded-lg inline-block">
              Base: /api/v1
            </div>
          </div>
        </div>
      </div>
    </aside>

      {/* Main Content Area */}
      <main className="flex-1 h-screen overflow-y-auto p-6 lg:p-16 scroll-smooth custom-scrollbar">
        <div className="max-w-5xl mx-auto py-12 space-y-20">
        
        {/* 1. Overview */}
        <section id="overview" className="scroll-mt-32 space-y-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary-100 text-primary-700 text-[10px] font-black uppercase tracking-widest rounded-full mb-2">
            <BookOpen size={12} strokeWidth={3} /> Introduction
          </div>
          <h1 className="text-5xl font-black text-slate-900 tracking-tighter leading-tight">
            FormCraft <span className="text-primary-600 italic">Core API</span>
          </h1>
          <p className="text-xl text-slate-500 font-medium leading-relaxed max-w-3xl">
            A state-of-the-art dynamic engine that separates form architecture from data persistence. 
            Render complex, versioned forms using immutable slugs and reactive metadata.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12">
            <div className="p-8 bg-white border border-slate-100 rounded-[2.5rem] shadow-sm hover:shadow-md transition-all">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6">
                <Layers size={24} />
              </div>
              <h3 className="text-lg font-black text-slate-900 mb-4">Architecture Separation</h3>
              <p className="text-sm text-slate-500 font-medium leading-relaxed">
                The frontend is a dumb renderer. It fetches the "Architectural Blueprint" (metadata) 
                to determine field layouts, dependency logic, and validation rules.
              </p>
            </div>
            <div className="p-8 bg-white border border-slate-100 rounded-[2.5rem] shadow-sm hover:shadow-md transition-all">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-6">
                <Send size={24} />
              </div>
              <h3 className="text-lg font-black text-slate-900 mb-4">Slug-Based Resolution</h3>
              <p className="text-sm text-slate-500 font-medium leading-relaxed">
                Integration is keyed by human-readable <code>formCode</code>. URLs remain stable 
                even as internal database IDs and versions evolve.
              </p>
            </div>
          </div>
        </section>

        <div className="h-px bg-slate-200" />

        {/* 2. Metadata API */}
        <section id="metadata" className="scroll-mt-32 space-y-10">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-widest rounded-full">
              <FileText size={12} strokeWidth={3} /> Metadata API
            </div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Fetch Form Blueprint</h2>
            <p className="text-slate-500 font-medium leading-relaxed">
              Retrieve the active structural definition of a form. This including field keys, 
              types, validation rules, and conditional logic.
            </p>
          </div>

          <div className="bg-slate-900 rounded-[2.5rem] overflow-hidden">
            <div className="px-8 py-5 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 bg-primary-600 text-white text-[10px] font-black rounded-lg">GET</span>
                <code className="text-xs text-slate-400 font-mono">/api/v1/runtime/forms/&#123;formCode&#125;</code>
              </div>
              <button 
                onClick={() => handleCopy("GET /api/v1/runtime/forms/{formCode}", "get-meta")}
                className="text-slate-500 hover:text-white transition-colors"
              >
                {copiedId === "get-meta" ? <Check size={16} /> : <Copy size={16} />}
              </button>
            </div>
            <div className="p-10 space-y-8">
              <div>
                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Path Parameters</h4>
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-white/5 text-slate-500">
                      <th className="pb-4 font-black">Field</th>
                      <th className="pb-4 font-black">Type</th>
                      <th className="pb-4 font-black">Description</th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-300">
                    <tr>
                      <td className="py-4 font-mono text-primary-400">formCode</td>
                      <td className="py-4">String</td>
                      <td className="py-4 font-medium">The immutable slug of the form (e.g. <code>employee-onboarding</code>)</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="pt-8 border-t border-white/5">
                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Response Example (JSON)</h4>
                <div className="relative group">
                  <pre className="p-8 bg-slate-950/50 rounded-3xl text-sm text-primary-400 font-mono overflow-x-auto leading-relaxed overflow-y-auto max-h-[500px] custom-scrollbar">
{`{
  "success": true,
  "data": {
    "id": "e2ebe36d-5248-...",
    "name": "Employee Onboarding",
    "status": "PUBLISHED",
    "activeVersionId": "f47ac10b-58cc-...",
    "fields": [
      {
        "fieldKey": "full_name",
        "fieldLabel": "Full Name",
        "fieldType": "TEXT",
        "required": true,
        "uiConfig": { "placeholder": "Enter legal name" }
      },
      {
        "fieldKey": "department",
        "fieldLabel": "Department",
        "fieldType": "LOOKUP_DROPDOWN",
        "uiConfig": { 
          "sourceTable": "departments", 
          "sourceColumn": "id",
          "sourceDisplayColumn": "dept_name"
        }
      }
    ]
  }
}`}
                  </pre>
                  <button 
                    onClick={() => handleCopy({ "success": true, "data": { "id": "e2ebe36d" } }, "get-meta-json")}
                    className="absolute right-6 top-6 p-2 bg-white/5 text-slate-500 rounded-xl hover:text-white transition-all backdrop-blur-sm"
                  >
                    {copiedId === "get-meta-json" ? <Check size={16} /> : <Copy size={16} />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="h-px bg-slate-200" />

        {/* 3. Components */}
        <section id="components" className="scroll-mt-32 space-y-10">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-50 text-amber-600 text-[10px] font-black uppercase tracking-widest rounded-full">
              <ListPlus size={12} strokeWidth={3} /> Component Library
            </div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Supported Field Types</h2>
            <p className="text-slate-500 font-medium leading-relaxed">
              FormCraft supports 18 specialized field types, ranging from simple text inputs to complex database lookups.
            </p>
          </div>

          <div className="space-y-12">
            {[
              {
                category: "Standard Inputs",
                items: [
                  { type: "TEXT", icon: Type, desc: "Single-line string" },
                  { type: "TEXTAREA", icon: Pilcrow, desc: "Multi-line text area" },
                  { type: "INTEGER", icon: Hash, desc: "Numeric whole numbers" },
                  { type: "BOOLEAN", icon: ToggleLeft, desc: "True/False switch" }
                ]
              },
              {
                category: "Selection & Lists",
                items: [
                  { type: "DROPDOWN", icon: ListPlus, desc: "Single selection list" },
                  { type: "RADIO_GROUP", icon: CircleDot, desc: "Single option radial" },
                  { type: "CHECKBOX_GROUP", icon: CheckSquare, desc: "Multiple selection list" },
                  { type: "LOOKUP_DROPDOWN", icon: MousePointer2, desc: "Database-backed select" }
                ]
              },
              {
                category: "Date & Time",
                items: [
                  { type: "DATE", icon: Calendar, desc: "Date picker" },
                  { type: "TIME", icon: Clock, desc: "Time selector" }
                ]
              },
              {
                category: "Advanced & Grids",
                items: [
                  { type: "MC_GRID", icon: Layout, desc: "Multiple Choice Grid" },
                  { type: "TICK_BOX_GRID", icon: CheckSquare, desc: "Checkbox Matrix" },
                  { type: "STAR_RATING", icon: Star, desc: "Visual rating scale" },
                  { type: "FILE_UPLOAD", icon: ImageIcon, desc: "Document attachments" }
                ]
              },
              {
                category: "Layout & Grouping",
                items: [
                  { type: "SECTION", icon: Heading, desc: "Major step header" },
                  { type: "LABEL", icon: Type, desc: "Informational text block" },
                  { type: "PAGE_BREAK", icon: FileText, desc: "Pagination separator" },
                  { type: "GROUP", icon: Layers, desc: "Container for sub-fields" }
                ]
              }
            ].map(cat => (
              <div key={cat.category} className="space-y-6">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-4">{cat.category}</h4>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {cat.items.map(item => (
                    <div key={item.type} className="p-6 bg-white border border-slate-100 rounded-[2rem] hover:shadow-lg hover:shadow-primary-600/5 transition-all group">
                      <div className="w-10 h-10 bg-slate-50 text-slate-400 group-hover:bg-primary-50 group-hover:text-primary-600 rounded-xl flex items-center justify-center mb-4 transition-all">
                        <item.icon size={20} />
                      </div>
                      <code className="text-[11px] font-black text-slate-900 group-hover:text-primary-600 transition-colors">{item.type}</code>
                      <p className="text-[10px] text-slate-500 font-bold mt-1 leading-tight">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="h-px bg-slate-200" />

        {/* 4. Submission API */}
        <section id="submission" className="scroll-mt-32 space-y-12">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-widest rounded-full">
              <Send size={12} strokeWidth={3} /> Submission API
            </div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Post User Responses</h2>
            <p className="text-slate-500 font-medium leading-relaxed">
              Persist user data into the form's version-pinned storage architecture.
            </p>
          </div>

          <div className="bg-slate-900 rounded-[2.5rem] overflow-hidden">
            <div className="px-8 py-5 border-b border-white/5 flex items-center justify-between bg-slate-950/20">
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 bg-emerald-600 text-white text-[10px] font-black rounded-lg">POST</span>
                <code className="text-xs text-slate-400 font-mono">/api/v1/runtime/forms/&#123;formCode&#125;/submissions/submit</code>
              </div>
            </div>
            
            <div className="p-8">
              <pre className="p-8 bg-slate-950/50 rounded-3xl text-sm text-primary-400 font-mono overflow-x-auto leading-relaxed">
{`{
  "formVersionId": "f47ac10b-58cc-...",
  "values": {
    "full_name": "Antigravity AI",
    "department": 1,
    "experience_years": 5,
    "tech_stack": ["NEXTJS", "SPRING_BOOT"]
  }
}`}
              </pre>
            </div>
          </div>

          <div className="p-8 bg-amber-50 rounded-3xl border border-amber-100 flex items-start gap-4">
            <AlertCircle className="text-amber-500 mt-1 flex-shrink-0" size={20} />
            <div>
              <h4 className="text-sm font-black text-amber-900 tracking-tight">Key Mapping Rule</h4>
              <p className="text-xs text-amber-700 font-medium leading-relaxed mt-1">
                The <code>values</code> object keys MUST exactly match the <code>fieldKey</code> provided in the metadata response. 
                Values for <code>MC_GRID</code> or <code>TICK_BOX_GRID</code> should be objects/arrays respectively.
              </p>
            </div>
          </div>
        </section>

        <div className="h-px bg-slate-200" />

        {/* 5. Draft API */}
        <section id="drafts" className="scroll-mt-32 space-y-12">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase tracking-widest rounded-full">
              <Clock size={12} strokeWidth={3} /> Draft & Resume
            </div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Save & Resume Flow</h2>
            <p className="text-slate-500 font-medium leading-relaxed">
              Authenticated users can save partial progress and resume across different sessions.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Save Draft</h4>
              <div className="p-6 bg-white border border-slate-100 rounded-3xl space-y-4 shadow-sm">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-indigo-600 text-white text-[8px] font-black rounded">POST</span>
                  <code className="text-[10px] font-mono text-slate-500">/submissions/draft</code>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed font-medium">
                  Persists <code>values</code> without full validation checks. Requires a valid session token.
                </p>
              </div>
            </div>

            <div className="space-y-6">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Retrieve Draft</h4>
              <div className="p-6 bg-white border border-slate-100 rounded-3xl space-y-4 shadow-sm">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-blue-600 text-white text-[8px] font-black rounded">GET</span>
                  <code className="text-[10px] font-mono text-slate-500">/submissions/draft</code>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed font-medium">
                  Returns the latest draft for the signed-in user for the specific form code.
                </p>
              </div>
            </div>
          </div>
        </section>

        <div className="h-px bg-slate-200" />

        {/* 6. Key Concepts */}
        <section id="concepts" className="scroll-mt-32 space-y-12">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-widest rounded-full">
              <Terminal size={12} strokeWidth={3} /> Logic Engine
            </div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Technical Concepts</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <h3 className="text-lg font-black text-slate-800 flex items-center gap-2 font-mono">
                <Code size={20} className="text-primary-600" /> fieldKey Generation
              </h3>
              <p className="text-sm text-slate-500 font-medium leading-relaxed">
                The <code>fieldKey</code> is automatically derived from the label using a deterministic slugification algorithm. 
                It is immutable once the form version is published.
              </p>
              <div className="bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-sm">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Live Conversion Samples</h4>
                <div className="space-y-4">
                  {[
                    { f: "Total Budget ($)", t: "total_budget" },
                    { f: "Contact Person*", t: "contact_person" },
                    { f: "Select Country", t: "select_country" }
                  ].map(row => (
                    <div key={row.f} className="flex items-center justify-between p-4 bg-slate-50/50 rounded-2xl border border-slate-100 transition-all hover:bg-white hover:shadow-md group">
                      <span className="text-[10px] font-bold text-slate-400 group-hover:text-slate-600">{row.f}</span>
                      <ChevronRight size={12} className="text-slate-300" />
                      <code className="text-xs font-black text-primary-600 bg-primary-50 px-3 py-1 rounded-lg">{row.t}</code>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="text-lg font-black text-slate-800 flex items-center gap-2 font-mono">
                <Zap size={20} className="text-primary-600" /> Dynamic Lookups
              </h3>
              <p className="text-sm text-slate-500 font-medium leading-relaxed">
                <code>LOOKUP_DROPDOWN</code> fields fetch data in real-time from the backend's lookup registry. 
                They require <code>sourceTable</code> and <code>sourceColumn</code> configuration.
              </p>
              <div className="bg-slate-900 rounded-[2.5rem] p-8 overflow-hidden relative">
                <div className="absolute top-0 right-0 p-8 opacity-5">
                  <Terminal size={120} />
                </div>
                <div className="space-y-6 relative z-10">
                  <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Lookup Metadata Structure</h4>
                  <pre className="text-xs font-mono text-emerald-400 whitespace-pre-wrap">
{`"uiConfig": {
  "sourceTable": "MASTER_COUNTRY",
  "sourceColumn": "CODE",
  "sourceDisplayColumn": "NAME"
}`}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="h-px bg-slate-200" />

        {/* 7. Validations */}
        <section id="validation" className="scroll-mt-32 space-y-12">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-rose-50 text-rose-600 text-[10px] font-black uppercase tracking-widest rounded-full">
              <AlertCircle size={12} strokeWidth={3} /> Constraints
            </div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Validation Logic</h2>
          </div>

          <div className="overflow-hidden bg-white border border-slate-100 rounded-[2.5rem] shadow-sm">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <th className="px-8 py-6">Constraint Property</th>
                  <th className="px-8 py-6">Target Logic</th>
                  <th className="px-8 py-6">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {[
                  { p: "required", a: "Mandatory Input", l: "Blocks submission if field is empty/null." },
                  { p: "numberFormat", a: "INTEGER, NUMBER", l: "Ensures value is numeric or decimal respectively." },
                  { p: "minLength / Max", a: "TEXT, TEXTAREA", l: "Character count enforcement." },
                  { p: "min / Max", a: "INTEGER", l: "Numeric range bounds enforcement." },
                  { p: "before / AfterDate", a: "DATE", l: "Chronological bounds on selection." }
                ].map(row => (
                  <tr key={row.p} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-8 py-5 font-mono text-xs text-primary-600 font-bold">{row.p}</td>
                    <td className="px-8 py-5 text-[11px] font-bold text-slate-500">{row.a}</td>
                    <td className="px-8 py-5 text-[11px] font-medium text-slate-400">{row.l}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* 8. Security */}
        <section id="security" className="scroll-mt-32 space-y-10 pb-32">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase tracking-widest rounded-full">
              <ShieldCheck size={12} strokeWidth={3} /> Security Protocols
            </div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Data Integrity</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-8 bg-white border border-slate-100 rounded-3xl shadow-sm">
              <h4 className="font-black text-slate-900 mb-4 flex items-center gap-2 text-sm">
                <ShieldCheck className="text-primary-600" size={18} /> CSRF Protection
              </h4>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                All mutating requests (POST, PUT, DELETE) require a valid <code>X-XSRF-TOKEN</code> header, 
                synchronized with the session cookie.
              </p>
            </div>
            <div className="p-8 bg-white border border-slate-100 rounded-3xl shadow-sm">
              <h4 className="font-black text-slate-900 mb-4 flex items-center gap-2 text-sm">
                <Lock className="text-primary-600" size={18} /> Role-Based Access
              </h4>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                Access to form definitions and submissions is restricted via a granular permission system 
                (OWNER, EDITOR, VIEWER).
              </p>
            </div>
          </div>

          <div className="p-12 bg-slate-900 rounded-[3rem] text-center text-white space-y-6">
            <h3 className="text-2xl font-black tracking-tight uppercase">Ready to integrate?</h3>
            <p className="text-slate-400 font-medium max-w-lg mx-auto leading-relaxed text-sm">
              Build your own frontend renderer using our structured JSON blueprints or use our official React SDK.
            </p>
            <button className="px-10 py-5 bg-primary-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-primary-600/20 hover:scale-105 active:scale-95 transition-all">
              Request Enterprise SDK
            </button>
          </div>
        </section>
        </div>
      </main>
    </div>
  );
}
