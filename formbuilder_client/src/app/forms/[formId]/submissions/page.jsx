"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Loader2, Database, Download,
  FileSpreadsheet, Trash2, Star, SlidersHorizontal,
  LayoutGrid, Grid3x3, Upload, CheckSquare
} from "lucide-react";
import { api } from "@/lib/api/formService";

export default function SubmissionsPage() {
  const { formId } = useParams();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState({ columns: [], rows: [] });
  const [expanded, setExpanded] = useState({}); // tracks expanded grid cells

  useEffect(() => {
    if (formId) fetchSubmissions();
  }, [formId]);

  const fetchSubmissions = async () => {
    try {
      const res = await api.getSubmissions(formId);
      setData(res.data);
    } catch (err) {
      console.error(err);
      setError(err.response || "Failed to load submissions. Is the form published?");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (submissionId) => {
    if (!window.confirm("Are you sure you want to delete this submission?")) return;
    try {
      await api.deleteSubmission(formId, submissionId);
      fetchSubmissions();
    } catch (err) {
      console.error(err);
      alert("Failed to delete submission.");
    }
  };

  const toggleExpand = (rowIndex, fieldKey) => {
    const key = `${rowIndex}_${fieldKey}`;
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  };

    function parseJsonbValue(value) {
    if (value === null || value === undefined) return null;
    // PostgreSQL JSONB comes back as { type: "jsonb", value: "{...}" }
    if (typeof value === "object" && value.value !== undefined) {
      try { return JSON.parse(value.value); } catch { return null; }
    }
    if (typeof value === "string") {
      try { return JSON.parse(value); } catch { return null; }
    }
    if (typeof value === "object") return value;
    return null;
  }

  // ── Cell Renderer ───────────────────────────────────────────────────────────
  const formatCellValue = (value, fieldType, rowIndex, fieldKey) => {
    if (value === null || value === undefined)
      return <span className="text-slate-300 select-none">—</span>;

    switch (fieldType?.toUpperCase()) {

      // ── Boolean ─────────────────────────────────────────────────────────────
      case "BOOLEAN":
        return value ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-100 text-green-700 rounded-md text-xs font-semibold">
            <CheckSquare size={12} /> Yes
          </span>
        ) : (
          <span className="px-2.5 py-1 bg-slate-100 text-slate-500 rounded-md text-xs font-semibold">No</span>
        );

      // ── Checkbox Group ───────────────────────────────────────────────────────
      case "CHECKBOX_GROUP": {
        try {
          const parsed = typeof value === "string" ? JSON.parse(value) : value;
          if (!Array.isArray(parsed) || parsed.length === 0)
            return <span className="text-slate-300">—</span>;
          return (
            <div className="flex flex-wrap gap-1">
              {parsed.map((item, i) => (
                <span key={i} className="px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded text-xs font-medium">
                  {item}
                </span>
              ))}
            </div>
          );
        } catch {
          return <span className="text-sm text-slate-700">{String(value)}</span>;
        }
      }

      // ── Star Rating ──────────────────────────────────────────────────────────
      case "STAR_RATING": {
        const rating = Number(value);
        if (isNaN(rating)) return <span className="text-slate-300">—</span>;
        return (
          <div className="flex items-center gap-1.5">
            <div className="flex gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  size={14}
                  className={i < rating ? "text-amber-400 fill-amber-400" : "text-slate-200 fill-slate-100"}
                />
              ))}
            </div>
            <span className="text-xs text-slate-500 font-medium">{rating}/5</span>
          </div>
        );
      }

      // ── Linear Scale ─────────────────────────────────────────────────────────
      case "LINEAR_SCALE": {
        const scale = Number(value);
        if (isNaN(scale)) return <span className="text-slate-300">—</span>;
        return (
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-600 text-white text-sm font-bold shadow-sm">
              {scale}
            </div>
            <SlidersHorizontal size={14} className="text-slate-400" />
          </div>
        );
      }

      // ── File Upload ──────────────────────────────────────────────────────────
      case "FILE_UPLOAD": {
        if (!value || value === "") return <span className="text-slate-300">—</span>;
        const filename = String(value).split("/").pop();
        return (
          <a
            href={String(value)}
            download
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-medium transition-colors group"
            title={filename}
          >
            <Download size={13} className="shrink-0" />
            <span className="truncate max-w-[140px]">{filename}</span>
          </a>
        );
      }

      // ── Multiple Choice Grid ─────────────────────────────────────────────────
      case "MC_GRID": {
        try {
          const parsed = typeof value === "string" ? JSON.parse(value) : value;
          if (typeof parsed !== "object" || parsed === null)
            return <span className="text-slate-300">—</span>;

          const expandKey = `${rowIndex}_${fieldKey}`;
          const isExpanded = expanded[expandKey];
          const entries = Object.entries(parsed);

          return (
            <div>
              <button
                onClick={() => toggleExpand(rowIndex, fieldKey)}
                className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
              >
                <LayoutGrid size={13} />
                {isExpanded ? "Hide" : `View ${entries.length} row${entries.length !== 1 ? "s" : ""}`}
              </button>
              {isExpanded && (
                <div className="mt-2 space-y-1 border border-slate-100 rounded-lg overflow-hidden">
                  {entries.map(([row, col], i) => (
                    <div key={i} className={`flex justify-between px-3 py-1.5 text-xs ${i % 2 === 0 ? "bg-slate-50" : "bg-white"}`}>
                      <span className="text-slate-600 font-medium">{row}</span>
                      <span className="text-indigo-700 font-semibold">{String(col)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        } catch {
          return <span className="text-sm text-slate-700">{String(value)}</span>;
        }
      }

      // ── Tick Box Grid ────────────────────────────────────────────────────────
      case "TICK_BOX_GRID": {
        try {
          const parsed = typeof value === "string" ? JSON.parse(value) : value;
          if (typeof parsed !== "object" || parsed === null)
            return <span className="text-slate-300">—</span>;

          const expandKey = `${rowIndex}_${fieldKey}`;
          const isExpanded = expanded[expandKey];
          const entries = Object.entries(parsed);
          const totalChecked = entries.reduce((acc, [, cols]) => acc + (Array.isArray(cols) ? cols.length : 0), 0);

          return (
            <div>
              <button
                onClick={() => toggleExpand(rowIndex, fieldKey)}
                className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
              >
                <Grid3x3 size={13} />
                {isExpanded ? "Hide" : `${totalChecked} selection${totalChecked !== 1 ? "s" : ""}`}
              </button>
              {isExpanded && (
                <div className="mt-2 space-y-1 border border-slate-100 rounded-lg overflow-hidden">
                  {entries.map(([row, cols], i) => (
                    <div key={i} className={`px-3 py-1.5 text-xs ${i % 2 === 0 ? "bg-slate-50" : "bg-white"}`}>
                      <span className="text-slate-600 font-medium block mb-1">{row}</span>
                      <div className="flex flex-wrap gap-1">
                        {Array.isArray(cols) && cols.length > 0
                          ? cols.map((col, j) => (
                            <span key={j} className="px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded text-xs">
                              {col}
                            </span>
                          ))
                          : <span className="text-slate-400 italic">None selected</span>
                        }
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        } catch {
          return <span className="text-sm text-slate-700">{String(value)}</span>;
        }
      }

      // ── Default (text, email, number, date, time, radio, dropdown) ───────────
      default:
        return (
          <span className="text-sm text-slate-700 truncate block max-w-xs" title={String(value)}>
            {String(value)}
          </span>
        );
    }
  };

  // ── Loading / Error states ──────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
        <Loader2 className="animate-spin text-indigo-600 mb-4" size={40} />
        <p className="text-sm font-medium text-slate-500">Loading submissions...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
        <Database className="text-slate-300 mb-4" size={48} />
        <h2 className="text-lg font-bold text-slate-800 mb-2">No Data Available</h2>
        <p className="text-sm text-slate-500 mb-6">{error}</p>
        <Link href={`/forms/${formId}/builder`} className="text-indigo-600 font-medium hover:underline">
          Return to Builder
        </Link>
      </div>
    );
  }

  // ── Main render ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50/50 p-6 lg:p-10 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <Link
              href={`/forms/${formId}/builder`}
              className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-900 mb-2 transition-colors"
            >
              <ArrowLeft size={16} className="mr-1" /> Back to Builder
            </Link>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Database size={24} className="text-indigo-600" /> Form Responses
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Showing {data.rows.length} total submission{data.rows.length !== 1 && "s"}.
            </p>
          </div>

          <button className="flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-4 py-2 rounded-xl text-sm font-medium transition-colors shadow-sm">
            <FileSpreadsheet size={16} className="text-green-600" /> Export CSV
          </button>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          {data.rows.length === 0 ? (
            <div className="p-16 flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-100">
                <Download className="text-slate-400" size={24} />
              </div>
              <h3 className="text-base font-semibold text-slate-800">No submissions yet</h3>
              <p className="text-sm text-slate-500 mt-1 max-w-sm">
                Share your form link with users to start collecting data.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200">
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                      # ID
                    </th>
                    {data.columns.map((col) => (
                      <th
                        key={col.fieldKey}
                        className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap"
                      >
                        <div className="flex items-center gap-1.5">
                          {getColumnIcon(col.fieldType)}
                          {col.fieldLabel}
                        </div>
                      </th>
                    ))}
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.rows.map((row, rowIndex) => (
                    <tr key={rowIndex} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-slate-400 whitespace-nowrap">
                        {row.id || rowIndex + 1}
                      </td>
                      {data.columns.map((col) => (
                        <td key={col.fieldKey} className="px-6 py-4 text-sm text-slate-700">
                          {formatCellValue(row[col.fieldKey], col.fieldType, rowIndex, col.fieldKey)}
                        </td>
                      ))}
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleDelete(row.id)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete Submission"
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Column header icon by field type ───────────────────────────────────────────
function getColumnIcon(fieldType) {
  switch (fieldType?.toUpperCase()) {
    case "STAR_RATING": return <Star size={12} className="text-amber-400" />;
    case "LINEAR_SCALE": return <SlidersHorizontal size={12} className="text-indigo-400" />;
    case "FILE_UPLOAD": return <Upload size={12} className="text-slate-400" />;
    case "MC_GRID": return <LayoutGrid size={12} className="text-indigo-400" />;
    case "TICK_BOX_GRID": return <Grid3x3 size={12} className="text-indigo-400" />;
    case "CHECKBOX_GROUP": return <CheckSquare size={12} className="text-indigo-400" />;
    default: return null;
  }
}