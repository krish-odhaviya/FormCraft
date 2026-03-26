"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import DataTable from "react-data-table-component";
import {
  ArrowLeft, Loader2, Database, FileSpreadsheet,
  Trash2, Star, SlidersHorizontal, LayoutGrid,
  Grid3x3, Upload, CheckSquare, Link2, Search, X,
  FileText, FileDown, ChevronDown, ShieldAlert,
} from "lucide-react";
import { api } from "@/lib/api/formService";
import { useAuth } from "@/context/AuthContext";
import { toast } from "react-hot-toast";
import { useConfirm } from "@/context/ConfirmationContext";

// ── Table styles ──────────────────────────────────────────────────────────────
const tableCustomStyles = {
  headRow:   { style: { backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0", minHeight: "48px" } },
  headCells: { style: { fontSize: "11px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", paddingLeft: "24px", paddingRight: "24px" } },
  rows:      { style: { minHeight: "56px", borderBottom: "1px solid #f1f5f9", "&:hover": { backgroundColor: "#f8fafc" } } },
  cells:     { style: { paddingLeft: "24px", paddingRight: "24px", fontSize: "13px", color: "#334155" } },
  pagination: {
    style:          { borderTop: "1px solid #e2e8f0", backgroundColor: "#ffffff", color: "#64748b", fontSize: "13px" },
    pageButtonsStyle: { borderRadius: "8px", color: "#6366f1", fill: "#6366f1" },
  },
};

export default function SubmissionsPage() {
  const { formId } = useParams();
  const { user } = useAuth();
  const confirm = useConfirm();

  const [loading,               setLoading]               = useState(true);
  const [error,                 setError]                 = useState("");
  const [columns,               setColumns]               = useState([]);
  const [rows,                  setRows]                   = useState([]);
  const [totalRows,             setTotalRows]             = useState(0);
  const [page,                  setPage]                  = useState(1);
  const [perPage,               setPerPage]               = useState(10);
  const [sortBy,                setSortBy]                = useState("created_at");
  const [sortDir,               setSortDir]               = useState("desc");
  const [search,                setSearch]                = useState("");
  const [searchInput,           setSearchInput]           = useState("");
  const [exporting,             setExporting]             = useState(null);
  const [showExportMenu,        setShowExportMenu]        = useState(false);
  const [expanded,              setExpanded]              = useState({});
  const [resetPaginationToggle, setResetPaginationToggle] = useState(false);
  const [selectedRows,          setSelectedRows]          = useState([]);
  const [clearSelectionToggle,  setClearSelectionToggle]  = useState(false);
  const [canDelete,             setCanDelete]             = useState(false);
  const [versions,              setVersions]              = useState([]);
  const [selectedVersionId,     setSelectedVersionId]     = useState("");

  const debounceRef = useRef(null);

  // Lightweight permission check — real auth is enforced server-side
  const isAdmin = user?.customRole === "SYSTEM_ADMIN" || user?.roles?.includes("ROLE_SYSTEM_ADMIN");
  const canViewSubs = isAdmin || user?.canViewSubmissions;

  if (!canViewSubs) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-50 px-6 text-center">
        <div className="w-24 h-24 bg-red-100/50 rounded-full flex items-center justify-center mb-6 shadow-sm border border-red-100">
          <ShieldAlert size={48} className="text-red-500" />
        </div>
        <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-3">Access Denied</h2>
        <p className="text-slate-500 max-w-md mb-10 text-lg leading-relaxed">
          You do not have permission to view submissions for this form.
        </p>
        <Link href="/" className="px-6 py-3 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 hover:shadow-sm transition-all">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  // ── Fetch one page of submissions ─────────────────────────────────────────
  // Previously used raw fetch() with a hardcoded localhost URL.
  // Now goes through api.getSubmissionsPaged() defined in formService.js.
  const fetchSubmissions = useCallback(async (pg, size, srch, sb, sd, vid) => {
    setLoading(true);
    try {
      // Permission check via form metadata
      let formRes;
      try {
        formRes = await api.getForm(formId);
      } catch (fErr) {
        if (fErr.response?.status === 403) { setError("FORBIDDEN"); return; }
        throw fErr;
      }

      const status = formRes.data?.status;
      setCanDelete(formRes.data?.canDeleteSubmissions || false);

      if (status !== "PUBLISHED" && status !== "ARCHIVED") {
        setError("This form is not in a state that allows viewing submissions.");
        return;
      }

      // All fetch logic now goes through the centralized api
      const res = await api.getSubmissionsPaged(formId, {
        page: pg, size, search: srch, sortBy: sb, sortDir: sd, versionId: vid || undefined
      });

      const payload = res.data || {};
      setColumns(payload.columns || []);
      setRows(payload.rows || []);
      setTotalRows(payload.totalElements || 0);
    } catch (err) {
      if (err.response?.status === 403) { setError("FORBIDDEN"); return; }
      setError(err.message || "Failed to load submissions.");
    } finally {
      setLoading(false);
    }
  }, [formId]);

  const fetchVersions = useCallback(async () => {
    try {
      const res = await api.getFormVersions(formId);
      const allVersions = res.data || [];
      setVersions(allVersions);
      // Auto-select the active version by default
      const active = allVersions.find(v => v.isActive);
      if (active) setSelectedVersionId(active.id);
    } catch {
      toast.error("Failed to load form versions.");
    }
  }, [formId]);

  useEffect(() => {
    if (formId) {
       fetchVersions();
    }
  }, [formId, fetchVersions]);

  useEffect(() => {
    if (formId) fetchSubmissions(page, perPage, search, sortBy, sortDir, selectedVersionId);
  }, [formId, selectedVersionId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── react-data-table callbacks ────────────────────────────────────────────
  const handlePageChange = (newPage) => {
    setPage(newPage);
    fetchSubmissions(newPage, perPage, search, sortBy, sortDir, selectedVersionId);
  };

  const handlePerRowsChange = (newPerPage, newPage) => {
    setPerPage(newPerPage);
    setPage(newPage);
    fetchSubmissions(newPage, newPerPage, search, sortBy, sortDir, selectedVersionId);
  };

  const handleSort = (column, direction) => {
    const key = column.sortField || "id";
    const dir = direction || "desc";
    setSortBy(key);
    setSortDir(dir);
    setPage(1);
    setResetPaginationToggle((t) => !t);
    fetchSubmissions(1, perPage, search, key, dir, selectedVersionId);
  };

  // ── Debounced search ──────────────────────────────────────────────────────
  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchInput(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearch(val);
      setPage(1);
      setResetPaginationToggle((t) => !t);
      fetchSubmissions(1, perPage, val, sortBy, sortDir, selectedVersionId);
    }, 400);
  };

  const clearSearch = () => {
    setSearchInput("");
    setSearch("");
    setPage(1);
    setResetPaginationToggle((t) => !t);
    fetchSubmissions(1, perPage, "", sortBy, sortDir, selectedVersionId);
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async (submissionId) => {
    const confirmed = await confirm({
      title: "Delete Submission",
      message: "Are you sure you want to delete this submission? This action cannot be undone.",
      confirmText: "Delete",
      type: "danger"
    });
    
    if (!confirmed) return;
    try {
      await api.deleteSubmission(formId, submissionId);
      setSelectedRows((prev) => prev.filter((r) => r.id !== submissionId));
      fetchSubmissions(page, perPage, search, sortBy, sortDir, selectedVersionId);
      toast.success("Submission deleted.");
    } catch {
      toast.error("Failed to delete submission.");
    }
  };

  const handleBulkDelete = async () => {
    if (selectedRows.length === 0) return;
    const confirmed = await confirm({
      title: "Bulk Delete",
      message: `Are you sure you want to delete ${selectedRows.length} selected submission(s)? This action cannot be undone.`,
      confirmText: `Delete ${selectedRows.length}`,
      type: "danger"
    });
    
    if (!confirmed) return;
    try {
      await api.deleteSubmissionsBulk(formId, selectedRows.map((r) => r.id));
      setClearSelectionToggle((t) => !t);
      setSelectedRows([]);
      fetchSubmissions(page, perPage, search, sortBy, sortDir, selectedVersionId);
      toast.success(`${selectedRows.length} submissions deleted.`);
    } catch {
      toast.error("Failed to bulk delete submissions.");
    }
  };

  const handleRowSelected = useCallback((state) => {
    setSelectedRows(state.selectedRows);
  }, []);

  // ── Export — now uses api.exportSubmissions() instead of raw fetch() ──────
  const handleExport = async (format = "csv") => {
    setExporting(format);
    setShowExportMenu(false);
    try {
      const res = await api.exportSubmissions(formId, { search, format, versionId: selectedVersionId || undefined });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      let ext = format;
      if (format === "word") ext = "docx";
      if (format === "xlsx") ext = "xlsx";
      a.download = `submissions_form_${formId}.${ext}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error(`Failed to export ${format.toUpperCase()}.`);
    } finally {
      setExporting(null);
    }
  };

  // ── Expand toggles ────────────────────────────────────────────────────────
  const toggleExpand = (rowId, fieldKey) => {
    const key = `${rowId}_${fieldKey}`;
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // ── Cell renderer (unchanged) ─────────────────────────────────────────────
  const formatCellValue = (value, fieldType, rowId, fieldKey) => {
    if (value === null || value === undefined)
      return <span className="text-slate-300 select-none">—</span>;

    switch (fieldType?.toUpperCase()) {
      case "BOOLEAN":
        return value ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-100 text-green-700 rounded-md text-xs font-semibold">
            <CheckSquare size={12} /> Yes
          </span>
        ) : (
          <span className="px-2.5 py-1 bg-slate-100 text-slate-500 rounded-md text-xs font-semibold">No</span>
        );

      case "CHECKBOX_GROUP": {
        try {
          const parsed = typeof value === "string" ? JSON.parse(value) : value;
          if (!Array.isArray(parsed) || parsed.length === 0)
            return <span className="text-slate-300">—</span>;
          return (
            <div className="flex flex-wrap gap-1">
              {parsed.map((item, i) => (
                <span key={i} className="px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded text-xs font-medium">{item}</span>
              ))}
            </div>
          );
        } catch { return <span className="text-sm text-slate-700">{String(value)}</span>; }
      }

      case "STAR_RATING": {
        const rating = Number(value);
        if (isNaN(rating)) return <span className="text-slate-300">—</span>;
        return (
          <div className="flex items-center gap-1.5">
            <div className="flex gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} size={14} className={i < rating ? "text-amber-400 fill-amber-400" : "text-slate-200 fill-slate-100"} />
              ))}
            </div>
            <span className="text-xs text-slate-500 font-medium">{rating}/5</span>
          </div>
        );
      }

      case "LINEAR_SCALE": {
        const scale = Number(value);
        if (isNaN(scale)) return <span className="text-slate-300">—</span>;
        return (
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-600 text-white text-sm font-bold shadow-sm">{scale}</div>
            <SlidersHorizontal size={14} className="text-slate-400" />
          </div>
        );
      }

      case "FILE_UPLOAD": {
        if (!value) return <span className="text-slate-300">—</span>;
        const filename = String(value).split("/").pop();
        return (
          <a href={String(value)} download target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-medium transition-colors">
            <Upload size={13} className="shrink-0" />
            <span className="truncate max-w-[140px]">{filename}</span>
          </a>
        );
      }

      case "MC_GRID": {
        try {
          const parsed = parseJsonbValue(value);
          if (typeof parsed !== "object" || parsed === null) return <span className="text-slate-300">—</span>;
          const expandKey = `${rowId}_${fieldKey}`;
          const isExpanded = expanded[expandKey];
          const entries = Object.entries(parsed);
          return (
            <div>
              <button onClick={() => toggleExpand(rowId, fieldKey)} className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-800">
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
        } catch { return <span className="text-sm text-slate-700">{String(value)}</span>; }
      }

      case "TICK_BOX_GRID": {
        try {
          const parsed = parseJsonbValue(value);
          if (typeof parsed !== "object" || parsed === null) return <span className="text-slate-300">—</span>;
          const expandKey = `${rowId}_${fieldKey}`;
          const isExpanded = expanded[expandKey];
          const entries = Object.entries(parsed);
          const totalChecked = entries.reduce((acc, [, cols]) => acc + (Array.isArray(cols) ? cols.length : 0), 0);
          return (
            <div>
              <button onClick={() => toggleExpand(rowId, fieldKey)} className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-800">
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
                              <span key={j} className="px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded text-xs">{col}</span>
                            ))
                          : <span className="text-slate-400 italic">None selected</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        } catch { return <span className="text-sm text-slate-700">{String(value)}</span>; }
      }

      case "LOOKUP_DROPDOWN":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-md text-xs font-medium">
            <Link2 size={11} />{String(value)}
          </span>
        );

      default:
        return (
          <span className="text-sm text-slate-700 truncate block max-w-xs" title={String(value)}>
            {String(value)}
          </span>
        );
    }
  };

  // ── Table columns ─────────────────────────────────────────────────────────
  const tableColumns = [
    {
      name: "#",
      width: "80px",
      sortable: true,
      sortField: "created_at",
      cell: (row, index) => (
        <span className="text-sm font-medium text-slate-400">
          {(page - 1) * perPage + index + 1}
        </span>
      ),
    },
    ...columns.map((col) => ({
      name: (
        <div className="flex items-center gap-1.5">
          {getColumnIcon(col.fieldType)}
          {col.fieldLabel}
        </div>
      ),
      selector: (row) => row[col.fieldKey],
      sortable: true,
      sortField: col.fieldKey,
      cell: (row) => formatCellValue(row[col.fieldKey], col.fieldType, row.id, col.fieldKey),
      style: { minWidth: "160px" },
    })),
    ...(canDelete
      ? [{
          name: "Actions",
          right: "true",
          width: "80px",
          cell: (row) => (
            <button
              onClick={() => handleDelete(row.id)}
              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Delete Submission"
            >
              <Trash2 size={16} />
            </button>
          ),
        }]
      : []),
  ];

  // ── Error state ───────────────────────────────────────────────────────────
  if (error) {
    const isForbidden = error === "FORBIDDEN";
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-red-50 rounded-[32px] flex items-center justify-center mb-6">
          <ShieldAlert size={40} className="text-red-500" />
        </div>
        <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-2">
          {isForbidden ? "Access Denied" : "No Data Available"}
        </h2>
        <p className="text-slate-500 max-w-sm mb-8 leading-relaxed">
          {isForbidden ? "You don't have permission to view submissions for this form." : error}
        </p>
        <Link href="/" className="px-6 py-3 bg-white border border-slate-200 text-slate-700 font-bold rounded-2xl hover:bg-slate-50 transition-all shadow-sm">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  // ── Main render ───────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50/50 p-6 lg:p-10 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <Link href="/" className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-900 mb-2 transition-colors">
              <ArrowLeft size={16} className="mr-1" /> Back to Dashboard
            </Link>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Database size={24} className="text-indigo-600" /> Form Responses
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              {totalRows} total submission{totalRows !== 1 && "s"}
              {search && ` matching "${search}"`}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {selectedRows.length > 0 && (
              <button
                onClick={handleBulkDelete}
                className="flex items-center gap-2 bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 px-4 py-2 rounded-xl text-sm font-medium transition-colors shadow-sm"
              >
                <Trash2 size={16} /> Delete Selected ({selectedRows.length})
              </button>
            )}

            <Link
              href={`/forms/${formId}/view`}
              className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-4 py-2 rounded-xl text-sm font-medium transition-colors shadow-sm"
            >
              <Database size={16} className="text-indigo-600" /> Fill Form
            </Link>

            <div className="relative">
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                disabled={exporting !== null}
                className="flex items-center gap-2 bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-70 px-4 py-2 rounded-xl text-sm font-medium transition-all shadow-sm"
              >
                {exporting ? (
                  <><Loader2 size={16} className="animate-spin" /> Exporting {exporting.toUpperCase()}...</>
                ) : (
                  <><FileDown size={16} /> Export Data <ChevronDown size={14} className={`transition-transform duration-200 ${showExportMenu ? "rotate-180" : ""}`} /></>
                )}
              </button>

              {showExportMenu && !exporting && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowExportMenu(false)} />
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-100 py-2 z-20">
                    {[
                      { format: "csv",  label: "Export as CSV",  Icon: FileSpreadsheet, color: "text-green-600" },
                      { format: "xlsx", label: "Export as Excel",Icon: FileSpreadsheet, color: "text-emerald-600" },
                      { format: "pdf",  label: "Export as PDF",  Icon: FileText,         color: "text-red-500" },
                      { format: "word", label: "Export as Word", Icon: FileText,         color: "text-blue-600" },
                    ].map(({ format, label, Icon, color }) => (
                      <button
                        key={format}
                        onClick={() => handleExport(format)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        <Icon size={16} className={color} />
                        <span className="font-medium">{label}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Table card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative max-w-sm w-full">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchInput}
                onChange={handleSearchChange}
                placeholder="Search submissions..."
                className="w-full pl-9 pr-8 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
              {searchInput && (
                <button onClick={clearSearch} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X size={14} />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Version Filter:</label>
              <div className="relative">
                <select
                  value={selectedVersionId}
                  onChange={(e) => {
                    setSelectedVersionId(e.target.value);
                    setPage(1);
                    setResetPaginationToggle(t => !t);
                  }}
                  className="appearance-none pl-4 pr-10 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium text-slate-700 min-w-[140px]"
                >
                  <option value="">All Versions</option>
                  {versions.filter(v => !v.isDraftWorkingCopy).map(v => (
                    <option key={v.id} value={v.id}>
                      Version {v.versionNumber} {v.isActive ? "(Current)" : ""}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>

          <DataTable
            columns={tableColumns}
            data={rows}
            progressPending={loading}
            progressComponent={
              <div className="py-16 flex flex-col items-center gap-3">
                <Loader2 className="animate-spin text-indigo-600" size={32} />
                <p className="text-sm text-slate-500">Loading submissions...</p>
              </div>
            }
            noDataComponent={
              <div className="py-16 flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-100">
                  <Database className="text-slate-300" size={24} />
                </div>
                <h3 className="text-base font-semibold text-slate-800">No submissions found</h3>
                <p className="text-sm text-slate-500 mt-1">
                  {search ? `No results for "${search}"` : "Share your form link to start collecting data."}
                </p>
              </div>
            }
            pagination
            paginationServer
            paginationTotalRows={totalRows}
            paginationDefaultPage={1}
            paginationResetDefaultPage={resetPaginationToggle}
            paginationPerPage={perPage}
            paginationRowsPerPageOptions={[10, 25, 50, 100]}
            onChangePage={handlePageChange}
            onChangeRowsPerPage={handlePerRowsChange}
            sortServer
            onSort={handleSort}
            defaultSortFieldId={1}
            defaultSortAsc={false}
            customStyles={tableCustomStyles}
            selectableRows={canDelete}
            onSelectedRowsChange={handleRowSelected}
            clearSelectedRows={clearSelectionToggle}
            highlightOnHover
            responsive
          />
        </div>
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function parseJsonbValue(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === "object" && value.value !== undefined) {
    try { return JSON.parse(value.value); } catch { return null; }
  }
  if (typeof value === "string") {
    try { return JSON.parse(value); } catch { return null; }
  }
  if (typeof value === "object") return value;
  return null;
}

function getColumnIcon(fieldType) {
  switch (fieldType?.toUpperCase()) {
    case "STAR_RATING":     return <Star size={12} className="text-amber-400" />;
    case "LINEAR_SCALE":   return <SlidersHorizontal size={12} className="text-indigo-400" />;
    case "FILE_UPLOAD":    return <Upload size={12} className="text-slate-400" />;
    case "MC_GRID":        return <LayoutGrid size={12} className="text-indigo-400" />;
    case "TICK_BOX_GRID":  return <Grid3x3 size={12} className="text-indigo-400" />;
    case "CHECKBOX_GROUP": return <CheckSquare size={12} className="text-indigo-400" />;
    case "LOOKUP_DROPDOWN":return <Link2 size={12} className="text-indigo-400" />;
    default: return null;
  }
}
