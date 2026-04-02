import React, { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  collection, query, where, onSnapshot, getDocs, orderBy,
} from "firebase/firestore";
import { db, auth } from "../firebase";
import { toast } from "sonner";
import {
  LayoutGrid, FileText, Plus, Search, Bell, ChevronDown, ChevronRight,
  ChevronLeft, Clock, CheckCircle, AlertCircle, Users, Calendar,
  Activity, Download, Eye, Loader2, ArrowUpRight, LogOut,
  ClipboardList, Briefcase, UserPlus, Inbox, Pencil, Trash2, MoreHorizontal,
} from "lucide-react";
import FileClosureSlider from "./FileClosureSlider";

const FONT = { fontFamily: "'Plus Jakarta Sans', sans-serif" };
const ITEMS_PER_PAGE = 7;
const STATUS_FILTERS = ["All Intakes", "Submitted", "Drafts", "Approved", "Rejected"];

/*
  ═══════════════════════════════════════════════════════════════════════════════
  INTAKE FORM WORKFLOW
  ═══════════════════════════════════════════════════════════════════════════════
  
  1. WORKER SUBMITS FORM
     - Click "New Intake Form" button → opens /intake-form/
     - Fill out form with client info (name, DOB, agency, service type, etc.)
     - Save form → Saves to "InTakeForms" collection with status: "pending"
  
  2. FORM APPEARS IN DASHBOARD
     - Real-time sync from Firestore "InTakeForms" collection
     - Shows: CYIM ID, Client Name, DOB, Agency, Service Type, Submitted Date, Status
     - Filtered by status tabs: All, Submitted, Drafts, Approved, Rejected
  
  3. ADMIN REVIEW & APPROVAL
     - Click "View" button on form → opens admin view page
     - Admin can: Approve (status → "approved") or Reject (status → "rejected")
     - Status updates reflected instantly in dashboard via real-time listener
  
  4. STATUS BADGE COLORS
     - Draft (gray) → "in progress"
     - Submitted/Pending (orange) → "awaiting admin review"
     - In Review (blue) → "admin is reviewing"
     - Approved (green) → "admin approved"
     - Rejected (red) → "admin rejected"
  
  REQUIRED FIRESTORE FIELDS FOR NEW FORM:
  {
    id, status, clientName, clientCode, dateOfBirth, agency,
    serviceRequired [], createdAt, updatedAt, workerId, intakeworkerName, ...
  }
  ═══════════════════════════════════════════════════════════════════════════════
*/

// ─── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const s = (status || "").toLowerCase();
  const map = {
    approved: { bg: "#f0fdf4", text: "#15803d", dot: "#16a34a", label: "Approved" },
    pending:  { bg: "#fef3c7", text: "#b45309", dot: "#f59e0b", label: "Pending"  },
    rejected: { bg: "#fef2f2", text: "#dc2626", dot: "#ef4444", label: "Rejected" },
    submitted: { bg: "#fef3c7", text: "#b45309", dot: "#f59e0b", label: "Pending" },
    draft: { bg: "#f3f4f6", text: "#6b7280", dot: "#9ca3af", label: "Draft" },
    "in review": { bg: "#eff6ff", text: "#2563eb", dot: "#3b82f6", label: "In Review" },
  };
  const style = map[s] || { bg: "#f3f4f6", text: "#6b7280", dot: "#9ca3af", label: status || "Unknown" };
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-semibold"
      style={{ fontSize: 11, background: style.bg, color: style.text }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: style.dot, display: "inline-block" }} />
      {style.label}
    </span>
  );
}

// ─── Service Type Badge ──────────────────────────────────────────────────────
function ServiceTypeBadge({ type }) {
  const t = (type || "").toLowerCase();
  let bg = "#f3f4f6", color = "#6b7280";
  if (t.includes("emergency")) { bg = "#FEE2E2"; color = "#DC2626"; }
  else if (t.includes("respite")) { bg = "#FFEDD5"; color = "#EA580C"; }
  else if (t.includes("supervised") || t.includes("visitation")) { bg = "#DBEAFE"; color = "#2563EB"; }
  else if (t.includes("transport")) { bg = "#FEF3C7"; color = "#D97706"; }
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-md font-semibold"
      style={{ fontSize: 11, background: bg, color, whiteSpace: "nowrap" }}>
      {type || "—"}
    </span>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────
function Sidebar({ activePage, onNavigate, onLogout }) {
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = useState(true); // Default to collapsed

  const navItems = [
    { icon: <LayoutGrid className="size-4" strokeWidth={1.7} />, label: "Dashboard", key: "dashboard" },
    { icon: <Plus className="size-4" strokeWidth={1.7} />, label: "New Intake Form", key: "new" },
    { icon: <FileText className="size-4" strokeWidth={1.7} />, label: "Submitted Intakes", key: "submitted" },
    { icon: <FileText className="size-4" strokeWidth={1.7} />, label: "Draft Forms", key: "drafts" },
  ];

  const width = isCollapsed ? 64 : 240;

  return (
    <div
      className="h-screen flex flex-col transition-all duration-300 overflow-hidden z-50 cursor-pointer"
      onMouseEnter={() => setIsCollapsed(false)}
      onMouseLeave={() => setIsCollapsed(true)}
      style={{
        width,
        backgroundColor: "#145228",
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        flexShrink: 0,
      }}
    >
      {/* Logo area */}
      <div className="flex items-center gap-3 px-4 py-5 border-b" style={{ borderColor: "rgba(255,255,255,0.1)" }}>
        <div
          className="flex items-center justify-center overflow-hidden rounded-full flex-shrink-0"
          style={{ width: 36, height: 36, background: "rgba(255,255,255,0.15)" }}
        >
          <img src="/images/logo.png" alt="Logo" style={{ width: 36, height: 36, objectFit: "contain" }} />
        </div>
        {!isCollapsed && (
          <div>
            <p className="font-bold" style={{ fontSize: 14, color: "#fff" }}>Family Forever</p>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.6)" }}>Intake Portal</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <div className="flex-1 overflow-y-auto py-4 px-3">
        {navItems.map((item) => {
          const isActive = activePage === item.key;
          return (
            <button
              key={item.key}
              onClick={() => {
                if (item.key === "new") navigate("/intake-form/add");
                else onNavigate(item.key);
              }}
              className="w-full flex items-center gap-3 rounded-lg mb-1 transition-all"
              style={{
                padding: "10px 12px",
                background: isActive ? "rgba(255,255,255,0.15)" : "transparent",
                color: isActive ? "#fff" : "rgba(255,255,255,0.65)",
                border: "none",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: isActive ? 600 : 500,
                textAlign: "left",
              }}
              onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = "rgba(255,255,255,0.08)"; }}
              onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
            >
              <span className="flex-shrink-0">{item.icon}</span>
              {!isCollapsed && <span>{item.label}</span>}
            </button>
          );
        })}
      </div>

      {/* Bottom: logout */}
      <div className="px-3 pb-4 border-t" style={{ borderColor: "rgba(255,255,255,0.1)" }}>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 rounded-lg mt-2 transition-all"
          style={{
            padding: "10px 12px",
            background: "transparent",
            color: "rgba(255,255,255,0.5)",
            border: "none",
            cursor: "pointer",
            fontSize: 12,
          }}
        >
          <LogOut className="size-4 flex-shrink-0" />
          {!isCollapsed && <span>Logout</span>}
        </button>
      </div>
    </div>
  );
}

// ─── Header ───────────────────────────────────────────────────────────────────
function Header({ workerName, workerProfile, notifCount, navigate }) {
  return (
    <header
      className="h-[58px] border-b flex items-center justify-between px-6 bg-white flex-shrink-0"
      style={{ borderColor: "#e5e7eb", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      <h1 className="font-bold tracking-tight" style={{ fontSize: 17, color: "#111827" }}>
        Intake Management
      </h1>

      <div className="flex items-center gap-3">
        {/* Bell */}
        <button className="relative p-2 rounded-lg hover:bg-gray-50 transition-colors">
          <Bell className="size-5" strokeWidth={1.7} style={{ color: "#6b7280" }} />
          {notifCount > 0 && (
            <span className="absolute top-1.5 right-1.5 size-2 rounded-full" style={{ backgroundColor: "#ef4444" }} />
          )}
        </button>

        {/* User info */}
        <div className="flex items-center gap-2 pl-3 border-l" style={{ borderColor: "#e5e7eb" }}>
          <div className="text-right">
            <div className="text-sm font-semibold" style={{ color: "#111827" }}>{workerName || "Intake Worker"}</div>
            <div className="text-xs" style={{ color: "#9ca3af" }}>{workerProfile?.role || "Worker"}</div>
          </div>
          <div className="size-9 rounded-full flex items-center justify-center text-white font-semibold text-sm" style={{ background: "#145228" }}>
            {workerName ? workerName.charAt(0).toUpperCase() : "W"}
          </div>
        </div>

        {/* Add New */}
        <button
          onClick={() => navigate("/intake-form/add")}
          className="px-4 py-2 rounded-lg font-semibold transition-all hover:opacity-90 text-white"
          style={{ background: "#145228", fontSize: 13, boxShadow: "0 1px 2px rgba(20,82,40,0.2)" }}
        >
          + New Intake
        </button>
      </div>
    </header>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KPICard({ label, value, sub, icon: Icon, color, bg, loading }) {
  if (loading) {
    return (
      <div className="bg-white rounded-2xl border p-5 animate-pulse" style={{ borderColor: "#e5e7eb" }}>
        <div className="h-3 bg-gray-100 rounded w-24 mb-3" />
        <div className="h-8 bg-gray-100 rounded w-16 mb-2" />
        <div className="h-3 bg-gray-100 rounded w-20" />
      </div>
    );
  }
  return (
    <div className="bg-white rounded-2xl border p-5 flex flex-col gap-3 transition-all hover:shadow-md"
      style={{ borderColor: "#e5e7eb", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
      <div className="flex items-center justify-between">
        <div className="rounded-xl flex items-center justify-center" style={{ width: 40, height: 40, background: bg }}>
          <Icon size={18} style={{ color }} />
        </div>
      </div>
      <div>
        <p className="font-bold" style={{ fontSize: 28, color: "#111827", lineHeight: 1 }}>{value}</p>
        <p className="font-semibold mt-1" style={{ fontSize: 13, color: "#374151" }}>{label}</p>
        <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>{sub}</p>
      </div>
    </div>
  );
}

// ─── Forms Table ───────────────────────────────────────────────────────────────
function FormsTable({ forms, loading, searchTerm, setSearchTerm, activeFilter, setActiveFilter, currentPage, setCurrentPage, totalPages, filtered, onViewForm, navigate, allForms, draftCount, approvedMonth, serviceFilter, setServiceFilter, periodFilter, setPeriodFilter, categories, setSelectedClosureClient, setIsClosureOpen, workerProfile, setSelectedShiftFormId, setIsShiftModalOpen }) {
  const pageStart = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginated = filtered.slice(pageStart, pageStart + ITEMS_PER_PAGE);

  // Helpers to extract display values from raw form data
  const extractClientName = (form) => {
    const clients = form.clients ? Object.values(form.clients) : (Array.isArray(form.inTakeClients) ? form.inTakeClients : []);
    const names = clients.map(c => c?.fullName || c?.name || c?.clientName || c?.firstName || c?.displayName || null).filter(Boolean);
    if (names.length) return names.join(", ");
    return form.clientName || form.nameInClientTable || form.name || form.fullName || form.client?.name || form.otherInfo?.clientName || "Unnamed";
  };

  const extractFamilyName = (form) => {
    const clients = form.clients ? Object.values(form.clients) : (Array.isArray(form.inTakeClients) ? form.inTakeClients : []);
    const names = clients.map(c => c?.familyName || c?.lastName || c?.surname || c?.family || c?.family_name || null).filter(Boolean);
    if (names.length) return names.join(", ");
    return form.familyName || form.lastName || form.surname || form.family || form.family_name || "—";
  };

  const resolveCategory = (form) => {
    const arr = form.serviceRequired || form.services?.serviceRequired || form.services?.serviceType || [];
    if (Array.isArray(arr)) return arr.map(id => categories[id] || id).join(", ") || "—";
    if (typeof arr === "string") return categories[arr] || arr;
    return "—";
  };

  const formatDate = (form) => {
    const ts = form.updatedAt || form.createdAt;
    if (ts?.toDate) return ts.toDate().toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
    if (ts) return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
    return "—";
  };

  const SERVICE_OPTIONS = ["All", "Emergency Care", "Respite Care", "Supervised Visitation", "Transportation"];
  const PERIOD_OPTIONS = ["This Month", "Last Month", "Last 3 Months", "All Time"];

  return (
    <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: "#e5e7eb", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
      {/* Tab filters at top */}
      <div className="px-5 pt-4">
        <div className="flex gap-6 border-b" style={{ borderColor: "#e5e7eb" }}>
          {STATUS_FILTERS.map(f => {
            let count = "";
            if (f === "All Intakes") count = ` [${allForms.length}]`;
            else if (f === "Drafts") count = ` [${draftCount}]`;
            else if (f === "Approved") count = ` [${approvedMonth}]`;
            else if (f === "Rejected") count = ` [0]`;
            const isActive = activeFilter === f;
            return (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                className="pb-3 font-semibold transition-all whitespace-nowrap"
                style={{
                  color: isActive ? "#111827" : "#6b7280",
                  borderBottom: isActive ? "2px solid #145228" : "2px solid transparent",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "13px",
                  paddingBottom: "12px",
                }}>
                {f}{count}
              </button>
            );
          })}
        </div>
      </div>

      {/* Search + Service/Period filters */}
      <div className="px-5 py-3 flex items-center gap-3">
        <div className="relative" style={{ width: 280 }}>
          <Search size={14} style={{ color: "#9ca3af", position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
          <input
            type="text"
            placeholder="Search intakes..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-emerald-600 transition-colors"
            style={{ borderColor: "#e5e7eb", fontSize: 13, color: "#374151", background: "#fafafa" }}
          />
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg border" style={{ borderColor: "#e5e7eb", background: "#fafafa" }}>
          <span style={{ fontSize: 13, color: "#6b7280", fontWeight: 500 }}>Service:</span>
          <select value={serviceFilter} onChange={e => setServiceFilter(e.target.value)}
            style={{ fontSize: 13, color: "#111827", fontWeight: 600, border: "none", background: "transparent", outline: "none", cursor: "pointer" }}>
            {SERVICE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg border" style={{ borderColor: "#e5e7eb", background: "#fafafa" }}>
          <span style={{ fontSize: 13, color: "#6b7280", fontWeight: 500 }}>Period:</span>
          <select value={periodFilter} onChange={e => setPeriodFilter(e.target.value)}
            style={{ fontSize: 13, color: "#111827", fontWeight: 600, border: "none", background: "transparent", outline: "none", cursor: "pointer" }}>
            {PERIOD_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr style={{ background: "#fafafa" }}>
              {["CLIENT NAME", "FAMILY NAME", "AGENCY", "SERVICE TYPE", "LAST EDITED", "STATUS", "FILE CLOSURE", "SHIFT REPORT", "ACTION"].map(h => (
                <th key={h} className="text-left px-4 py-2.5 font-semibold border-b"
                  style={{ fontSize: 10, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em", borderColor: "#f3f4f6" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i}>
                  {[...Array(9)].map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 bg-gray-100 rounded animate-pulse" style={{ width: `${40 + j * 5}%` }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : paginated.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: "#f3f4f6" }}>
                      <FileText size={20} style={{ color: "#9ca3af" }} />
                    </div>
                    <p style={{ fontSize: 14, color: "#374151", fontWeight: 600 }}>No forms found</p>
                    <p style={{ fontSize: 12, color: "#9ca3af" }}>
                      {searchTerm || activeFilter !== "All Intakes" ? "Try adjusting your search or filter" : "Submit your first intake form"}
                    </p>
                  </div>
                </td>
              </tr>
            ) : paginated.map((row, i) => {
              const clientName = extractClientName(row);
              const familyName = extractFamilyName(row);
              const category = resolveCategory(row);
              const submitted = formatDate(row);
              const status = (row.status || "pending").toLowerCase();
              const agency = row.agency || row.agencyName || "—";

              return (
                <tr key={`${row.id}-${i}`}
                  className="border-b last:border-0 hover:bg-gray-50/70 transition-colors group"
                  style={{ borderColor: "#f9fafb" }}>
                  <td className="px-4 py-3.5">
                    <span className="font-semibold" style={{ fontSize: 13, color: "#111827" }}>{clientName}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span style={{ fontSize: 13, color: "#6b7280" }}>{familyName}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span style={{ fontSize: 13, color: "#6b7280" }}>{agency}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <ServiceTypeBadge type={category} />
                  </td>
                  <td className="px-4 py-3.5">
                    <span style={{ fontSize: 13, color: "#6b7280" }}>{submitted}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <StatusBadge status={row.status} />
                  </td>
                  <td className="px-4 py-3.5">
                    <button
                      onClick={() => { setSelectedClosureClient({ id: row.id, familyName: familyName, careCategory: category, submittedOn: submitted }); setIsClosureOpen(true); }}
                      className="px-3 py-1.5 rounded-lg border font-semibold hover:bg-gray-50 transition-colors"
                      style={{ fontSize: 11, borderColor: "#e5e7eb", color: "#374151", whiteSpace: "nowrap" }}>
                      Closure
                    </button>
                  </td>
                  <td className="px-4 py-3.5">
                    <button
                      onClick={() => { const canAccess = workerProfile && (workerProfile.accessToShiftReport || workerProfile.accessToShiftReports || workerProfile.canAccessShiftReport || workerProfile.canAccessShiftReports); if (canAccess) { setSelectedShiftFormId(row.id); setIsShiftModalOpen(true); } else { toast.error('No access to shift reports'); } }}
                      className="px-3 py-1.5 rounded-lg border font-semibold hover:bg-gray-50 transition-colors"
                      style={{ fontSize: 11, borderColor: "#e5e7eb", color: "#374151", whiteSpace: "nowrap" }}>
                      Shift Report
                    </button>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => navigate(`/intake-form/view/${row.id}`)}
                        className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                        title="View">
                        <Eye size={15} style={{ color: "#6b7280" }} />
                      </button>
                      {status !== "approved" && (
                        <button
                          onClick={() => navigate(`/intake-form/edit/${row.id}`)}
                          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                          title="Edit">
                          <Pencil size={15} style={{ color: "#6b7280" }} />
                        </button>
                      )}
                      {status === "draft" && (
                        <button
                          className="p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                          title="Delete">
                          <Trash2 size={15} style={{ color: "#ef4444" }} />
                        </button>
                      )}
                      <button
                        className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                        title="More">
                        <MoreHorizontal size={15} style={{ color: "#6b7280" }} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {!loading && filtered.length > ITEMS_PER_PAGE && (
        <div className="flex items-center justify-between px-5 py-3 border-t" style={{ borderColor: "#f3f4f6" }}>
          <p style={{ fontSize: 12, color: "#6b7280" }}>
            Showing {pageStart + 1}–{Math.min(pageStart + ITEMS_PER_PAGE, filtered.length)} of {filtered.length}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border transition-all hover:bg-gray-50 disabled:opacity-40"
              style={{ borderColor: "#e5e7eb" }}>
              <ChevronLeft size={14} style={{ color: "#374151" }} />
            </button>
            {[...Array(Math.min(totalPages, 5))].map((_, i) => {
              const page = i + 1;
              return (
                <button key={page} onClick={() => setCurrentPage(page)}
                  className="px-2.5 py-1 rounded-lg font-semibold text-xs transition-all"
                  style={{ background: currentPage === page ? "#145228" : "transparent", color: currentPage === page ? "#fff" : "#6b7280" }}>
                  {page}
                </button>
              );
            })}
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg border transition-all hover:bg-gray-50 disabled:opacity-40"
              style={{ borderColor: "#e5e7eb" }}>
              <ChevronRight size={14} style={{ color: "#374151" }} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Activity Timeline ─────────────────────────────────────────────────────────
function ActivityTimeline({ activityTimeline, loading }) {
  const iconMap = {
    submitted: { bg: "#eff6ff", color: "#2563eb", Icon: FileText },
    approved:  { bg: "#f0fdf4", color: "#16a34a", Icon: CheckCircle },
    rejected:  { bg: "#fef2f2", color: "#dc2626", Icon: AlertCircle },
  };

  return (
    <div className="bg-white rounded-2xl border overflow-hidden"
      style={{ borderColor: "#e5e7eb", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
      <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "#f3f4f6" }}>
        <div className="flex items-center gap-2">
          <Activity size={15} style={{ color: "#145228" }} />
          <h2 className="font-bold" style={{ fontSize: 15, color: "#111827" }}>Activity Timeline</h2>
        </div>
        <span style={{ fontSize: 12, color: "#9ca3af" }}>Recent actions</span>
      </div>

      {loading ? (
        <div className="px-5 py-8 flex items-center justify-center">
          <Loader2 size={20} style={{ color: "#9ca3af" }} className="animate-spin" />
        </div>
      ) : activityTimeline.length === 0 ? (
        <div className="px-5 py-10 text-center">
          <Activity size={24} style={{ color: "#d1d5db", margin: "0 auto 8px" }} />
          <p style={{ fontSize: 13, color: "#9ca3af" }}>No activity recorded yet</p>
        </div>
      ) : (
        <div className="px-5 py-4">
          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-px" style={{ background: "#f3f4f6" }} />
            <div className="space-y-4">
              {activityTimeline.map((item, i) => {
                const cfg = iconMap[item.type] || iconMap.submitted;
                const { Icon } = cfg;
                return (
                  <div key={item.id + i} className="flex items-start gap-4 pl-10 relative">
                    <div className="absolute left-0 top-1 flex items-center justify-center rounded-lg"
                      style={{ width: 32, height: 32, background: cfg.bg, zIndex: 1 }}>
                      <Icon size={14} style={{ color: cfg.color }} />
                    </div>
                    <div className="flex-1 min-w-0 pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold" style={{ fontSize: 13, color: "#111827", lineHeight: 1.3 }}>
                            {item.action}
                          </p>
                          <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>
                            {item.timeAgo} · {item.date}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
const IntakeWorkerDashboard = ({ user, onLogout }) => {
  const navigate = useNavigate();

  // ── State ──
  const [forms, setForms] = useState([]);
  const [allForms, setAllForms] = useState([]);
  const [upcomingShifts, setUpcomingShifts] = useState([]);
  const [workerProfile, setWorkerProfile] = useState(null);
  const [categories, setCategories] = useState({});
  const [loading, setLoading] = useState(true);
  const [shiftsLoading, setShiftsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState("All Intakes");
  const [currentPage, setCurrentPage] = useState(1);
  const [serviceFilter, setServiceFilter] = useState("All");
  const [periodFilter, setPeriodFilter] = useState("All Time");
  const [activePage, setActivePage] = useState("dashboard");

  // File Closure slider state
  const [isClosureOpen, setIsClosureOpen] = useState(false);
  const [selectedClosureClient, setSelectedClosureClient] = useState(null);

  // Shift Report modal state
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [selectedShiftFormId, setSelectedShiftFormId] = useState(null);
  const [shiftReports, setShiftReports] = useState([]);
  const [shiftLoading, setShiftLoading] = useState(false);

  // ── Resolve current user from localStorage (intake workers don't use Firebase Auth) ──
  const storedUser = JSON.parse(localStorage.getItem("intakeUser") || "null");
  const currentUser = storedUser;
  const workerName = currentUser?.name || currentUser?.workerName || "";
  const workerId = currentUser?.id || currentUser?.uid || "";

  // ── Fetch category map ──
  useEffect(() => {
    (async () => {
      try {
        const snap = await getDocs(collection(db, "shiftCategories"));
        const map = {};
        snap.forEach(d => { map[d.id] = d.data().name || d.data().categoryName || d.id; });
        setCategories(map);
      } catch (e) { console.error("categories:", e); }
    })();
  }, []);

  // ── Real-time intake forms listener ──
  useEffect(() => {
    if (!workerId && !workerName) { setLoading(false); return; }
    setLoading(true);

    const unsub = onSnapshot(
      collection(db, "InTakeForms"),
      (snap) => {
        const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        const mine = all.filter(f => {
          const fWorkerId = f.workerId || f.workerInfo?.workerId || "";
          const fWorkerName = f.workerInfo?.workerName || f.intakeworkerName || f.nameOfPerson || "";
          return (
            (workerId && fWorkerId === workerId) ||
            (workerName && fWorkerName.trim().toLowerCase() === workerName.trim().toLowerCase())
          );
        });
        setAllForms(mine);
        setLoading(false);
      },
      (err) => {
        console.error("Forms listener:", err);
        toast.error("Failed to load intake forms");
        setLoading(false);
      }
    );
    return () => unsub();
  }, [workerId, workerName]);

  // ── Worker profile ──
  useEffect(() => {
    if (!workerId && !workerName) return;
    (async () => {
      try {
        const snap = await getDocs(collection(db, "intakeUsers"));
        snap.forEach(d => {
          const data = d.data();
          if (
            (workerId && (d.id === workerId || data.uid === workerId)) ||
            (workerName && (data.name || data.workerName || "").trim().toLowerCase() === workerName.trim().toLowerCase())
          ) {
            setWorkerProfile({ id: d.id, ...data });
          }
        });
      } catch (e) { console.error("workerProfile:", e); }
    })();
  }, [workerId, workerName]);

  // ── KPIs ──
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const totalForms = allForms.length;
  const submittedCount = allForms.filter(f => (f.status || "").toLowerCase() === "submitted").length;
  const draftCount = allForms.filter(f => (f.status || "").toLowerCase() === "draft").length;
  const pendingCount = allForms.filter(f => (f.status || "").toLowerCase() === "pending").length;
  const approvedMonth = allForms.filter(f => {
    if ((f.status || "").toLowerCase() !== "approved") return false;
    const ts = f.updatedAt?.toDate?.() || (f.updatedAt ? new Date(f.updatedAt) : null) ||
               f.createdAt?.toDate?.() || (f.createdAt ? new Date(f.createdAt) : null);
    return ts && ts >= thisMonthStart;
  }).length;
  const extractClientNames = (f) => {
    if (!f) return [];
    // named clients object
    if (f.clients && Object.values(f.clients).length) {
      return Object.values(f.clients).map(c => c.fullName || c.name || c.clientName || c.displayName).filter(Boolean);
    }
    // array-style clients
    if (Array.isArray(f.inTakeClients) && f.inTakeClients.length) {
      return f.inTakeClients.map(c => c.name || c.fullName || c.clientName || c.displayName).filter(Boolean);
    }
    // common single-field fallbacks
    const fallback = f.clientName || f.nameInClientTable || f.name || f.fullName || f.client?.name || f.client?.fullName || f.otherInfo?.clientName || f.otherInfo?.name || f.other_client_name;
    return fallback ? [fallback] : [];
  };

  const uniqueClients = new Set(
    allForms.flatMap(f => extractClientNames(f).map(n => n.toLowerCase().trim()))
  ).size;

  // ── Filtered + paginated ──
  const filtered = allForms.filter(f => {
    let statusMatch = true;
    if (activeFilter === "All Intakes") statusMatch = true;
    else if (activeFilter === "Submitted") statusMatch = ["submitted","pending"].includes((f.status || "").toLowerCase());
    else if (activeFilter === "Drafts") statusMatch = (f.status || "").toLowerCase() === "draft";
    else if (activeFilter === "Approved") statusMatch = (f.status || "").toLowerCase() === "approved";
    else if (activeFilter === "Rejected") statusMatch = (f.status || "").toLowerCase() === "rejected";

    // Service type filter
    let serviceMatch = true;
    if (serviceFilter !== "All") {
      const arr = f.serviceRequired || f.services?.serviceRequired || f.services?.serviceType || [];
      const resolved = Array.isArray(arr) ? arr.map(id => (categories[id] || id).toLowerCase()) : [String(arr).toLowerCase()];
      serviceMatch = resolved.some(s => s.includes(serviceFilter.toLowerCase()));
    }

    // Period filter
    let periodMatch = true;
    if (periodFilter !== "All Time") {
      const ts = f.createdAt?.toDate?.() || (f.createdAt ? new Date(f.createdAt) : null);
      if (ts) {
        const n = new Date();
        if (periodFilter === "This Month") periodMatch = ts.getMonth() === n.getMonth() && ts.getFullYear() === n.getFullYear();
        else if (periodFilter === "Last Month") { const lm = new Date(n.getFullYear(), n.getMonth()-1,1); const tm = new Date(n.getFullYear(), n.getMonth(),1); periodMatch = ts >= lm && ts < tm; }
        else if (periodFilter === "Last 3 Months") periodMatch = ts >= new Date(n.getFullYear(), n.getMonth()-3,1);
      } else periodMatch = false;
    }

    if (!searchTerm) return statusMatch && serviceMatch && periodMatch;
    const clients = extractClientNames(f);
    const searchLower = searchTerm.toLowerCase();
    const nameMatch = clients.some(n => n.toLowerCase().includes(searchLower));
    const codeMatch = (f.clientCode || "").toLowerCase().includes(searchLower);
    return statusMatch && serviceMatch && periodMatch && (nameMatch || codeMatch);
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  useEffect(() => { setCurrentPage(1); }, [activeFilter, searchTerm, serviceFilter, periodFilter]);

  // ── Display rows ──
  const getFormRows = (form) => {
    const resolveCategory = (f) => {
      const arr = f.serviceRequired || f.services?.serviceRequired || f.services?.serviceType || [];
      if (Array.isArray(arr)) return arr.map(id => categories[id] || id).join(", ") || "—";
      if (typeof arr === "string") return categories[arr] || arr;
      return "—";
    };

    // clients array (object or array) with safe fallbacks
    const clients = form.clients ? Object.values(form.clients) : (Array.isArray(form.inTakeClients) ? form.inTakeClients : []);

    // helper to pick best name fields for a client
    const pickClientName = (c) => c?.fullName || c?.name || c?.clientName || c?.firstName || c?.displayName || c?.full_name || null;
    const pickFamilyName = (c) => c?.familyName || c?.lastName || c?.surname || c?.family || c?.family_name || null;
    const pickDOB = (c) => c?.dateOfBirth || c?.dob || c?.DOB || c?.birthDate || c?.date_of_birth || null;

    // fallback to any common single-value fields on the form
    const fallbackClient = form.clientName || form.nameInClientTable || form.name || form.fullName || form.client?.name || form.client?.fullName || form.otherInfo?.clientName || form.otherInfo?.name || null;
    const fallbackFamily = form.familyName || form.lastName || form.surname || form.family || form.family_name || null;

    // Combine multiple clients into a single, comma-separated display — ensure at least one client name exists
    const clientNames = (clients.length ? clients.map(pickClientName).filter(Boolean) : []).length ? (clients.map(pickClientName).filter(Boolean).join(", ")) : (fallbackClient || "Unnamed");
    const familyNames = (clients.length ? clients.map(pickFamilyName).filter(Boolean) : []).length ? clients.map(pickFamilyName).filter(Boolean).join(", ") : (fallbackFamily || "—");

    // Attempt to find any DOB available (kept for debugging/fallback; DOB column removed from table)
    const dobs = (clients.length ? clients.map(pickDOB).filter(Boolean) : []).length ? clients.map(pickDOB).filter(Boolean) : (pickDOB(form) ? [pickDOB(form)] : []);
    const dobDisplay = dobs.length ? dobs.join(", ") : "—";

    if (!clientNames || clientNames.trim() === "") {
      console.warn("IntakeWorkerDashboard: form has no client names:", form.id, Object.keys(form));
    }

    return [{
      formId: form.id,
      cyimId: form.clientCode || form.cyimId || "—",
      clientName: clientNames,
      familyName: familyNames,
      dateOfBirth: dobDisplay,
      agency: form.agency || form.agencyName || "—",
      category: resolveCategory(form),
      submittedDate: form.createdAt?.toDate ? form.createdAt.toDate().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—",
      status: form.status || "pending",
      clientCode: form.clientCode || form.cyimId || "",
    }];
  };

  // ── Activity timeline ──
  const activityTimeline = [...allForms]
    .filter(f => f.createdAt || f.updatedAt)
    .sort((a, b) => {
      const tA = (a.updatedAt?.toDate?.() || new Date(a.updatedAt || a.createdAt || 0)).getTime();
      const tB = (b.updatedAt?.toDate?.() || new Date(b.updatedAt || b.createdAt || 0)).getTime();
      return tB - tA;
    })
    .slice(0, 8)
    .map(f => {
      const clientName = (extractClientNames(f)[0]) || "a client";
      const status = (f.status || "submitted").toLowerCase();
      const ts = f.updatedAt || f.createdAt;
      const tsDate = ts?.toDate ? ts.toDate() : (ts ? new Date(ts) : new Date());
      const diff = Date.now() - tsDate.getTime();
      const mins = Math.floor(diff / 60000);
      const timeAgo = mins < 1 ? "Just now" : mins < 60 ? `${mins}m ago` : Math.floor(mins / 60) < 24 ? `${Math.floor(mins / 60)}h ago` : `${Math.floor(mins / 1440)}d ago`;
      const date = tsDate.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
      const typeMap = { approved: "approved", rejected: "rejected", pending: "submitted" };
      return {
        id: f.id,
        type: typeMap[status] || "submitted",
        action: status === "approved" ? `Form approved for ${clientName}`
               : status === "rejected" ? `Form rejected for ${clientName}`
               : `Form submitted for ${clientName}`,
        clientName,
        timeAgo,
        date,
        formId: f.id,
      };
    });

  // ── Notifications ──
  const notifications = [...allForms]
    .filter(f => f.updatedAt || f.createdAt)
    .sort((a, b) => {
      const tA = (a.updatedAt?.toDate?.() || new Date(a.updatedAt || 0)).getTime();
      const tB = (b.updatedAt?.toDate?.() || new Date(b.updatedAt || 0)).getTime();
      return tB - tA;
    })
    .slice(0, 3);

  // ── KPI cards ──
  const kpiCards = [
    { label: "Total Submitted", value: totalForms, sub: "All time", icon: FileText, color: "#145228", bg: "#f0fdf4" },
    { label: "Pending Review", value: pendingCount, sub: "Awaiting decision", icon: Clock, color: "#D97706", bg: "#FFFBEB" },
    { label: "Approved", value: approvedMonth, sub: now.toLocaleDateString("en-GB", { month: "long", year: "numeric" }), icon: CheckCircle, color: "#059669", bg: "#ECFDF5" },
    { label: "Rejected", value: 0, sub: "No rejections", icon: AlertCircle, color: "#DC2626", bg: "#FEF2F2" },
    { label: "Drafts", value: draftCount, sub: "Work in progress", icon: FileText, color: "#8B5CF6", bg: "#F5F3FF" },
  ];

  const handleDownloadReport = () => {
    const rows = allForms.flatMap(getFormRows);
    const header = "CYIM ID,Client Name,Family Name,Client Code,Care Category,Submitted Date,Status\n";
    const body = rows.map(r => `"${r.cyimId}","${r.clientName}","${r.familyName}","${r.clientCode}","${r.category}","${r.submittedDate}","${r.status}"`).join("\n");
    const blob = new Blob([header + body], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "intake_forms_report.csv"; a.click();
    URL.revokeObjectURL(url);
    toast.success("Report downloaded");
  };

  const displayRows = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE).flatMap(getFormRows);

  // Fetch shift reports when modal is opened for a specific form
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!isShiftModalOpen || !selectedShiftFormId) return;
      setShiftLoading(true);
      try {
        const qSnap = await getDocs(query(collection(db, "ShiftReports"), where("formId", "==", selectedShiftFormId), orderBy("createdAt", "desc")));
        const rows = qSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        if (!cancelled) setShiftReports(rows);
      } catch (e) {
        console.error("Failed to load shift reports", e);
        toast.error("Failed to load shift reports");
      } finally {
        if (!cancelled) setShiftLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [isShiftModalOpen, selectedShiftFormId]);

  return (
    <div className="flex h-screen overflow-hidden" style={{ ...FONT, background: "#f9fafb" }}>
      {/* Sidebar */}
      <Sidebar activePage={activePage} onNavigate={setActivePage} onLogout={onLogout} />

      {/* Main area */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Header */}
        <Header workerName={workerName} workerProfile={workerProfile} notifCount={notifications.length} navigate={navigate} />

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 flex flex-col gap-6">

            {/* KPI Strip */}
            <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(5,1fr)" }}>
              {kpiCards.map((card, i) => (
                <KPICard key={i} {...card} loading={loading} />
              ))}
            </div>

            {/* Main grid: forms table */}
            <div className="flex gap-5" style={{ alignItems: "flex-start" }}>
              {/* Forms Table - Full Width */}
              <div className="flex flex-col gap-4" style={{ flex: "1" }}>
                <FormsTable
                  forms={allForms}
                  loading={loading}
                  searchTerm={searchTerm}
                  setSearchTerm={setSearchTerm}
                  activeFilter={activeFilter}
                  setActiveFilter={setActiveFilter}
                  currentPage={currentPage}
                  setCurrentPage={setCurrentPage}
                  totalPages={totalPages}
                  filtered={filtered}
                  onViewForm={(id) => navigate(`/intake-form/view/${id}`)}
                  navigate={navigate}
                  allForms={allForms}
                  draftCount={draftCount}
                  approvedMonth={approvedMonth}
                  serviceFilter={serviceFilter}
                  setServiceFilter={setServiceFilter}
                  periodFilter={periodFilter}
                  setPeriodFilter={setPeriodFilter}
                  categories={categories}
                  setSelectedClosureClient={setSelectedClosureClient}
                  setIsClosureOpen={setIsClosureOpen}
                  workerProfile={workerProfile}
                  setSelectedShiftFormId={setSelectedShiftFormId}
                  setIsShiftModalOpen={setIsShiftModalOpen}
                />

                {/* Shift Reports modal */}
                {isShiftModalOpen && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/40" onClick={() => setIsShiftModalOpen(false)} />
                    <div className="bg-white rounded-lg shadow-lg w-[900px] max-w-full z-10 p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-bold">Shift Reports</h3>
                        <div className="flex items-center gap-2">
                          <button onClick={() => setIsShiftModalOpen(false)} className="px-3 py-1 rounded bg-gray-100">Close</button>
                        </div>
                      </div>
                      <div style={{ maxHeight: "60vh", overflowY: "auto" }}>
                        {shiftLoading ? (
                          <div className="py-8 text-center">Loading shift reports…</div>
                        ) : !shiftReports.length ? (
                          <div className="py-8 text-center">No shift reports found for this form.</div>
                        ) : (
                          <table className="w-full text-left">
                            <thead>
                              <tr>
                                <th className="py-2 text-sm text-gray-500">Created</th>
                                <th className="py-2 text-sm text-gray-500">Worker</th>
                                <th className="py-2 text-sm text-gray-500">Summary</th>
                                <th className="py-2 text-sm text-gray-500">Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {shiftReports.map(s => (
                                <tr key={s.id} className="border-t">
                                  <td className="py-2 text-sm text-gray-700">{s.createdAt?.toDate ? s.createdAt.toDate().toLocaleString() : (s.createdAt ? new Date(s.createdAt).toLocaleString() : "—")}</td>
                                  <td className="py-2 text-sm text-gray-700">{s.workerName || s.author || "—"}</td>
                                  <td className="py-2 text-sm text-gray-700">{s.summary || s.notes || "—"}</td>
                                  <td className="py-2 text-sm text-gray-700">{s.viewUrl ? (<a href={s.viewUrl} target="_blank" rel="noreferrer" className="text-emerald-600">Open</a>) : "—"}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* File Closure slider */}
                <FileClosureSlider
                  isOpen={isClosureOpen}
                  onClose={() => { setIsClosureOpen(false); setSelectedClosureClient(null); }}
                  selectedClient={selectedClosureClient}
                />
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default IntakeWorkerDashboard;
