"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  Database,
  Download,
  FileSpreadsheet,
  Trash2,
} from "lucide-react";
import { api } from "@/lib/api/formService"; // Ensure you add getSubmissions to your api service

export default function SubmissionsPage() {
  const { formId } = useParams();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState({ columns: [], rows: [] });

  useEffect(() => {
    fetchSubmissions();

    if (formId) fetchSubmissions();
  }, [formId]);

  const fetchSubmissions = async () => {
    try {
      console.log(formId);
      const res = await api.getSubmissions(formId);
      console.log(res.data);
      setData(res.data);
    } catch (err) {
      console.error(err);
      setError(
        err.response || "Failed to load submissions. Is the form published?",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (submissionId) => {
    // Optional: Ask for confirmation before deleting
    if (!window.confirm("Are you sure you want to delete this submission?"))
      return;

    console.log(submissionId);

    try {
      await api.deleteSubmission(formId, submissionId);

      fetchSubmissions();
    } catch (err) {
      console.error(err);
      alert("Failed to delete submission.");
    }
  };

  // Utility to safely format cell data based on field type
  const formatCellValue = (value, fieldType) => {
    if (value === null || value === undefined)
      return <span className="text-slate-300">-</span>;

    if (fieldType === "BOOLEAN") {
      return value ? (
        <span className="px-2.5 py-1 bg-green-100 text-green-700 rounded-md text-xs font-semibold">
          Yes
        </span>
      ) : (
        <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-md text-xs font-semibold">
          No
        </span>
      );
    }

    if (fieldType === "CHECKBOX_GROUP") {
      try {
        // Checkboxes are saved as JSON strings like '["Apple", "Banana"]'
        const parsed = typeof value === "string" ? JSON.parse(value) : value;
        return Array.isArray(parsed) ? parsed.join(", ") : value;
      } catch {
        return value;
      }
    }

    return String(value);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
        <Loader2 className="animate-spin text-indigo-600 mb-4" size={40} />
        <p className="text-sm font-medium text-slate-500">
          Loading submissions...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
        <Database className="text-slate-300 mb-4" size={48} />
        <h2 className="text-lg font-bold text-slate-800 mb-2">
          No Data Available
        </h2>
        <p className="text-sm text-slate-500 mb-6">{error}</p>
        <Link
          href={`/forms/${formId}/builder`}
          className="text-indigo-600 font-medium hover:underline"
        >
          Return to Builder
        </Link>
      </div>
    );
  }

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
              Showing {data.rows.length} total submission
              {data.rows.length !== 1 && "s"}.
            </p>
          </div>

          <button className="flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-4 py-2 rounded-xl text-sm font-medium transition-colors shadow-sm">
            <FileSpreadsheet size={16} className="text-green-600" /> Export CSV
          </button>
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          {data.rows.length === 0 ? (
            <div className="p-16 flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-100">
                <Download className="text-slate-400" size={24} />
              </div>
              <h3 className="text-base font-semibold text-slate-800">
                No submissions yet
              </h3>
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
                        {col.fieldLabel}
                      </th>
                    ))}

                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.rows.map((row, rowIndex) => (
                    <tr
                      key={rowIndex}
                      className="hover:bg-slate-50/50 transition-colors"
                    >
                      <td className="px-6 py-4 text-sm font-medium text-slate-400 whitespace-nowrap">
                        {row.id || rowIndex + 1}
                      </td>
                      {data.columns.map((col) => (
                        <td
                          key={col.fieldKey}
                          className="px-6 py-4 text-sm text-slate-700 max-w-xs truncate"
                        >
                          {formatCellValue(row[col.fieldKey], col.fieldType)}
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
