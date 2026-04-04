import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "../firebase";
import { toast } from "sonner";
import {
  Heart, Shield, Eye, Car, Grid3x3, ArrowRight,
  Lock, Unlock, X, AlertTriangle, Clock, CheckCircle2,
  DollarSign, Receipt, User, Briefcase, Calendar, ChevronDown, Trash2,
} from "lucide-react";
import AppToggle from "./ui/AppToggle";
import { MiniCalendar } from "./ui/MiniCalendar";

// ── Config ─────────────────────────────────────────────────────────────────

const BILLING_CFG = {
  "Pending Review": { bg: "#fef3c7", color: "#92400e", border: "#fde68a", icon: <Clock size={10} strokeWidth={2.5} /> },
  Verified:        { bg: "#eff6ff", color: "#1d4ed8", border: "#bfdbfe", icon: <CheckCircle2 size={10} strokeWidth={2.5} /> },
  Locked:          { bg: "#fef2f2", color: "#991b1b", border: "#fecaca", icon: <Lock size={10} strokeWidth={2.5} /> },
  Billable:        { bg: "#f0fdf4", color: "#166534", border: "#bbf7d0", icon: <DollarSign size={10} strokeWidth={2.5} /> },
  Invoiced:        { bg: "#f3f4f6", color: "#374151", border: "#e5e7eb", icon: <Receipt size={10} strokeWidth={2.5} /> },
};

const svcColor = (s) => {
  const l = (s || "").toLowerCase();
  if (l.includes("emergent")) return "#dc2626";
  if (l.includes("respite"))  return "#1f7a3c";
  if (l.includes("supervised")) return "#7c3aed";
  if (l.includes("transport")) return "#d97706";
  return "#6b7280";
};

const svcBg = (s) => {
  const l = (s || "").toLowerCase();
  if (l.includes("emergent")) return "#fef2f2";
  if (l.includes("respite"))  return "#f0fdf4";
  if (l.includes("supervised")) return "#f5f3ff";
  if (l.includes("transport")) return "#fef3c7";
  return "#f3f4f6";
};

const normService = (raw) => {
  const l = (raw || "").toLowerCase();
  if (l.includes("emergent"))   return "Emergent Care";
  if (l.includes("respite"))    return "Respite Care";
  if (l.includes("supervised")) return "Supervised Visitation";
  if (l.includes("transport"))  return "Transportation";
  return raw || "—";
};

const money = (v) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v);

const BILLING_RATE = 45;

const truncateName = (name, length = 20) => {
  if (!name || name === "—") return name;
  if (name.length <= length) return name;
  return name.substring(0, length) + "...";
};

const TABS = [
  { id: "all",         label: "All Services",          svc: null,             icon: <Grid3x3 size={14} strokeWidth={1.7} /> },
  { id: "respite",     label: "Respite Care",           svc: "Respite Care",   icon: <Shield size={14} strokeWidth={1.7} /> },
  { id: "emergency",   label: "Emergent Care",         svc: "Emergent Care", icon: <Heart size={14} strokeWidth={1.7} /> },
  { id: "supervised",  label: "Supervised Visitations", svc: "Supervised Visitation", icon: <Eye size={14} strokeWidth={1.7} /> },
  { id: "transport",   label: "Transportation",        svc: "Transportation",icon: <Car size={14} strokeWidth={1.7} /> },
];

// ── Component ──────────────────────────────────────────────────────────────

// ── Date helpers ────────────────────────────────────────────────────────────
const formatDDMMYYYY = (d) =>
  `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;

function matchesSelectedDates(shift, selectedDates) {
  if (!selectedDates || selectedDates.length === 0) return true;
  let shiftStart = null;
  if (shift.startDate?.toDate) {
    shiftStart = shift.startDate.toDate();
  } else if (shift.startDate instanceof Date) {
    shiftStart = shift.startDate;
  } else if (typeof shift.startDate === "string") {
    const cleaned = shift.startDate.replace(/,/g, "").replace(/\s+/g, " ").trim();
    const parsed = Date.parse(cleaned);
    if (!isNaN(parsed)) {
      shiftStart = new Date(parsed);
    } else {
      const parts = cleaned.split(" ");
      if (parts.length >= 3) {
        const [day, month, year] = parts;
        const monthIndex = new Date(`${month} 1, ${year}`).getMonth();
        if (!isNaN(monthIndex)) shiftStart = new Date(Number(year), monthIndex, Number(day));
      }
    }
  }
  if (!shiftStart || isNaN(shiftStart)) return false;
  return selectedDates.some(
    (sel) =>
      sel.getDate() === shiftStart.getDate() &&
      sel.getMonth() === shiftStart.getMonth() &&
      sel.getFullYear() === shiftStart.getFullYear()
  );
}

export default function ClientActivityTable({ onNavigateToReport }) {
  const navigate = useNavigate();

  const handleTabClick = (tabId) => {
    setActiveTab(tabId);
  };
  const [rows, setRows]             = useState([]);
  const [activeTab, setActiveTab]   = useState("all");
  const [lockTarget, setLockTarget] = useState(null);
  const [unlockTarget, setUnlockTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [selectedDates, setSelectedDates] = useState([new Date()]);
  const [calendarOpen, setCalendarOpen]   = useState(false);
  const [rowsToShow, setRowsToShow] = useState(5);

  // Fetch shifts + enrich
  useEffect(() => {
    const fetch = async () => {
      try {
        const snap = await getDocs(collection(db, "shifts"));
        const enriched = snap.docs.map((d) => {
          const s = { id: d.id, ...d.data() };
          const clientName = s.clientName || s.clientDetails?.name || s.clientDetails?.clientName || "—";
          const clientId   = s.clientId   || s.clientDetails?.id   || s.clientDetails?.clientId   || "—";
          const staff      = s.staffName || s.assignedUser || s.userName || s.name || s.user || "—";
          const agency     = s.agencyName || s.agency              || "—";
          const service    = normService(s.categoryName || s.shiftCategory);
          const shiftType  = s.typeName || s.shiftType || "Regular";
          const status     = s.clockIn && s.clockOut ? "Completed" : s.clockIn ? "Ongoing" : "Incomplete";
          const hoursWorked= s.hoursWorked || 8;
          return {
            id: s.id, clientName, clientId, staff, agency,
            service, shiftType, status, hoursWorked,
            billingRate: s.billingRate || BILLING_RATE,
            locked: s.locked || false,
            billingStatus: s.billingStatus || "Pending Review",
            // keep raw startDate for date filtering
            startDate: s.startDate,
          };
        });
        setRows(enriched);
      } catch (err) {
        console.error("ClientActivityTable fetch error:", err);
      }
    };
    fetch();
  }, []);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      const tab = TABS.find((t) => t.id === activeTab);
      const tabMatch = !tab?.svc || r.service === tab.svc;
      const dateMatch = matchesSelectedDates(r, selectedDates);
      return tabMatch && dateMatch;
    });
  }, [rows, activeTab, selectedDates]);

  const calendarLabel = useMemo(() => {
    if (!selectedDates.length) return "All Dates";
    if (selectedDates.length === 1) {
      const today = new Date();
      const d = selectedDates[0];
      if (d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear())
        return "Today";
      return formatDDMMYYYY(d);
    }
    const sorted = [...selectedDates].sort((a, b) => a - b);
    return `${formatDDMMYYYY(sorted[0])} – ${formatDDMMYYYY(sorted[sorted.length - 1])}`;
  }, [selectedDates]);

  // Lock
  const confirmLock = async () => {
    if (!lockTarget) return;
    setProcessing(true);
    try {
      await updateDoc(doc(db, "shifts", lockTarget.id), { locked: true, billingStatus: "Locked" });
      setRows(prev => prev.map(r => r.id === lockTarget.id ? { ...r, locked: true, billingStatus: "Locked" } : r));
      toast.success("Shift locked for billing", {
        description: `${lockTarget.clientName} — ${lockTarget.service} (${lockTarget.hoursWorked}h × $${lockTarget.billingRate}/hr) added to billing queue.`,
        duration: 5000,
      });
    } catch (err) {
      toast.error("Failed to lock shift");
    } finally {
      setProcessing(false);
      setLockTarget(null);
    }
  };

  const confirmUnlock = async () => {
    if (!unlockTarget) return;
    setProcessing(true);
    try {
      await updateDoc(doc(db, "shifts", unlockTarget.id), { locked: false, billingStatus: "Verified" });
      setRows(prev => prev.map(r => r.id === unlockTarget.id ? { ...r, locked: false, billingStatus: "Verified" } : r));
      toast.info("Shift unlocked", {
        description: `${unlockTarget.clientName}'s shift returned to Verified status.`,
        duration: 4000,
      });
    } catch (err) {
      toast.error("Failed to unlock shift");
    } finally {
      setProcessing(false);
      setUnlockTarget(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setProcessing(true);
    try {
      await deleteDoc(doc(db, "shifts", deleteTarget.id));
      setRows(prev => prev.filter(r => r.id !== deleteTarget.id));
      toast.success("Shift deleted", { description: `${deleteTarget.clientName}'s shift has been removed.`, duration: 4000 });
    } catch (err) {
      toast.error("Failed to delete shift");
    } finally {
      setProcessing(false);
      setDeleteTarget(null);
    }
  };

  const handleToggle = (row) => {
    if (row.billingStatus === "Invoiced") return;
    row.locked ? setUnlockTarget(row) : setLockTarget(row);
  };

  const detailRows = (r) => [
    { icon: <User size={13} strokeWidth={2} style={{ color: "#2563eb" }} />, iconBg: "#eff6ff", label: "Client Name",    value: r.clientName, sub: r.clientId },
    { icon: <Briefcase size={13} strokeWidth={2} style={{ color: svcColor(r.service) }} />, iconBg: svcBg(r.service), label: "Service Type", value: r.service, sub: `${r.shiftType} shift` },
    { icon: <User size={13} strokeWidth={2} style={{ color: "#8b5cf6" }} />, iconBg: "#f5f3ff", label: "Assigned Staff", value: r.staff },
    { icon: <Clock size={13} strokeWidth={2} style={{ color: "#f59e0b" }} />, iconBg: "#fef3c7", label: "Hours Worked",  value: `${r.hoursWorked} hours` },
    { icon: <DollarSign size={13} strokeWidth={2} style={{ color: "#16a34a" }} />, iconBg: "#f0fdf4", label: "Billing Rate", value: `$${r.billingRate.toFixed(2)} / hr` },
  ];

  return (
    <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: "#e5e7eb", boxShadow: "0 1px 2px rgba(0,0,0,0.04)", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

      {/* Header */}
      <div className="px-5 py-4 flex items-center justify-between border-b" style={{ borderColor: "#e5e7eb" }}>
        <h2 className="uppercase tracking-wider" style={{ fontSize: 12, fontWeight: 700, color: "#6b7280" }}>Client Activity</h2>
        <div className="flex items-center gap-2">
          {/* Calendar filter */}
          <div className="relative">
            <button
              onClick={() => setCalendarOpen((v) => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all"
              style={{
                borderColor: selectedDates.length ? "#145228" : "#e5e7eb",
                background:  selectedDates.length ? "#f0fdf4"  : "#fff",
                color:       selectedDates.length ? "#145228"  : "#374151",
              }}
            >
              <Calendar size={12} strokeWidth={2} />
              <span>{calendarLabel}</span>
              <ChevronDown size={11} style={{ color: "#9ca3af" }} />
            </button>
            {calendarOpen && (
              <MiniCalendar
                selectedDates={selectedDates}
                onDatesChange={(dates) => setSelectedDates(dates)}
                onClose={() => setCalendarOpen(false)}
              />
            )}
          </div>

          {/* Clear filter */}
          {selectedDates.length > 0 && (
            <button
              onClick={() => setSelectedDates([])}
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold transition-all hover:bg-red-50"
              style={{ color: "#dc2626", border: "1px solid #fecaca" }}
            >
              <X size={11} strokeWidth={2.5} />
              Clear
            </button>
          )}

          <button className="flex items-center gap-1 font-semibold transition-colors" style={{ fontSize: 12, color: "#1f7a3c" }}>
            <span>View All</span><ArrowRight size={12} strokeWidth={2.5} />
          </button>


        </div>
      </div>

      {/* Tabs */}
      <div className="relative border-b flex px-5" style={{ borderColor: "#e5e7eb" }}>
        {TABS.map(tab => {
          const isActive = activeTab === tab.id;
          const dateFiltered = rows.filter(r => matchesSelectedDates(r, selectedDates));
          const count = tab.svc ? dateFiltered.filter(r => r.service === tab.svc).length : dateFiltered.length;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabClick(tab.id, tab.svc)}
              className="relative flex items-center gap-2 px-4 py-3 transition-all hover:bg-gray-50 cursor-pointer"
              style={{ fontSize: 12.5, fontWeight: isActive ? 600 : 500, color: isActive ? "#111827" : "#9ca3af" }}>
              <span style={{ opacity: isActive ? 0.85 : 0.45 }}>{tab.icon}</span>
              <span>{tab.label}</span>
              <span className="px-1.5 py-0.5 rounded-full text-[11px] font-semibold"
                style={{ backgroundColor: isActive ? "#e8f5ee" : "#f3f4f6", color: isActive ? "#1a6432" : "#9ca3af" }}>
                {count}
              </span>
              {isActive && <div className="absolute bottom-0 left-0 right-0" style={{ height: 2.5, backgroundColor: "#111827" }} />}
            </button>
          );
        })}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr style={{ backgroundColor: "#f9fafb" }}>
              {["Client", "Staff", "Service", "Shift", "Status", "Billing", "Agency", "Lock", "Actions"].map(h => (
                <th key={h} className="text-left px-4 py-2.5 uppercase tracking-wider" style={{ fontSize: 10.5, fontWeight: 700, color: "#9ca3af", whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-sm text-gray-400">No records found</td></tr>
            ) : filtered.slice(0, rowsToShow).map(row => {
              const bCfg       = BILLING_CFG[row.billingStatus] || BILLING_CFG["Pending Review"];
              const isInvoiced = row.billingStatus === "Invoiced";
              return (
                <tr key={row.id} className="border-t transition-colors" style={{ borderColor: "#f3f4f6", backgroundColor: row.locked ? "#fafbfc" : undefined }}>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div
                      style={{
                        fontSize: 12.5,
                        fontWeight: 600,
                        color: "#1f2937",
                        cursor: "help",
                        maxWidth: 180,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                      title={row.clientName}
                    >
                      {row.clientName}
                    </div>
                    <div style={{ fontSize: 10.5, color: "#9ca3af", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.clientId}</div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 500,
                        color: "#4b5563",
                        maxWidth: 120,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        cursor: "help",
                      }}
                      title={row.staff}
                    >
                      {row.staff}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 500,
                        color: svcColor(row.service),
                        maxWidth: 140,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        cursor: "help",
                      }}
                      title={row.service}
                    >
                      {row.service}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="px-2 py-1 rounded-full whitespace-nowrap" style={{ fontSize: 11, fontWeight: 500, backgroundColor: "#f3f4f6", color: "#6b7280" }}>{row.shiftType}</span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border whitespace-nowrap" style={
                      row.status === "Completed"
                        ? { backgroundColor: "#dcfce7", color: "#16a34a", borderColor: "#bbf7d0" }
                        : row.status === "Ongoing"
                        ? { backgroundColor: "#fef3c7", color: "#d97706", borderColor: "#fde68a" }
                        : { backgroundColor: "#f3f4f6", color: "#6b7280", borderColor: "#e5e7eb" }
                    }>
                      {row.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full whitespace-nowrap" style={{ fontSize: 10, fontWeight: 600, backgroundColor: bCfg.bg, color: bCfg.color, border: `1px solid ${bCfg.border}` }}>
                      {bCfg.icon}{row.billingStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div
                      style={{
                        fontSize: 12,
                        color: "#4b5563",
                        cursor: "help",
                        maxWidth: 120,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                      title={row.agency}
                    >
                      {row.agency}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center justify-center">
                      {row.locked ? (
                        <button onClick={() => handleToggle(row)} className="inline-flex items-center gap-1 px-2 py-1 rounded-md transition-all"
                          style={{ fontSize: 10, fontWeight: 700, background: isInvoiced ? "#f3f4f6" : row.billingStatus === "Billable" ? "#f0fdf4" : "#fef2f2", color: isInvoiced ? "#6b7280" : row.billingStatus === "Billable" ? "#166534" : "#991b1b", border: `1px solid ${isInvoiced ? "#e5e7eb" : row.billingStatus === "Billable" ? "#bbf7d0" : "#fecaca"}`, cursor: isInvoiced ? "not-allowed" : "pointer", opacity: isInvoiced ? 0.7 : 1 }}>
                          <Lock size={9} strokeWidth={2.5} />{row.billingStatus === "Billable" ? "Billable" : isInvoiced ? "Invoiced" : "Locked"}
                        </button>
                      ) : (
                        <AppToggle checked={false} onChange={() => handleToggle(row)} />
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      {/* View */}
                      <button
                        onClick={() => navigate(`/admin-dashboard/shift-report/${row.id}`)}
                        className="w-[26px] h-[26px] flex items-center justify-center rounded-lg transition-all hover:brightness-95"
                        style={{ background: "#eff6ff", color: "#2563eb", border: "1px solid #bfdbfe" }} title="View Report">
                        <Eye size={13} strokeWidth={2} />
                      </button>
                      {/* Edit */}
                      <button
                        onClick={() => !row.locked && navigate(`/admin-dashboard/add/update-user-shift/${row.id}`)}
                        className="w-[26px] h-[26px] flex items-center justify-center rounded-lg transition-all" disabled={row.locked}
                        style={{ background: row.locked ? "#f9fafb" : "#f0fdf4", color: row.locked ? "#d1d5db" : "#16a34a", border: `1px solid ${row.locked ? "#e5e7eb" : "#bbf7d0"}`, cursor: row.locked ? "not-allowed" : "pointer", opacity: row.locked ? 0.55 : 1 }} title={row.locked ? "Unlock to edit" : "Edit"}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                      {/* Delete */}
                      <button
                        onClick={() => !row.locked && setDeleteTarget(row)}
                        className="w-[26px] h-[26px] flex items-center justify-center rounded-lg transition-all" disabled={row.locked}
                        style={{ background: row.locked ? "#f9fafb" : "#fef2f2", color: row.locked ? "#d1d5db" : "#dc2626", border: `1px solid ${row.locked ? "#e5e7eb" : "#fecaca"}`, cursor: row.locked ? "not-allowed" : "pointer", opacity: row.locked ? 0.55 : 1 }} title={row.locked ? "Unlock to delete" : "Delete"}>
                        <Trash2 size={13} strokeWidth={2} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Load More Button */}
        {filtered.length > rowsToShow && (
          <div className="px-5 py-4 border-t flex items-center justify-center" style={{ borderColor: "#e5e7eb" }}>
            <button
              onClick={() => setRowsToShow(rowsToShow + 1)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border font-semibold transition-all hover:bg-green-50"
              style={{
                fontSize: 13,
                borderColor: "#1f7a3c",
                color: "#1f7a3c",
                background: "#f0fdf4",
              }}
            >
              <span>+{Math.min(1, filtered.length - rowsToShow)} more</span>
            </button>
          </div>
        )}
      </div>

      {/* Lock Modal */}
      {lockTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" }} onClick={() => { if (!processing) setLockTarget(null); }} />
          <div className="relative bg-white rounded-2xl shadow-2xl overflow-hidden" style={{ width: 480, maxWidth: "92vw" }}>
            <div className="px-6 py-5 flex items-start justify-between" style={{ background: "linear-gradient(135deg,#fef2f2 0%,#fff7ed 100%)" }}>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#fef2f2", border: "1px solid #fecaca" }}>
                  <Lock size={18} style={{ color: "#dc2626" }} strokeWidth={2} />
                </div>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 800, color: "#111827" }}>Lock Shift for Billing</h3>
                  <p style={{ fontSize: 12, color: "#6b7280", marginTop: 2, lineHeight: 1.5 }}>This shift will be locked and sent to billing. Locked shifts cannot be edited or deleted.</p>
                </div>
              </div>
              <button onClick={() => { if (!processing) setLockTarget(null); }} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/80" style={{ color: "#6b7280" }}><X size={16} strokeWidth={2} /></button>
            </div>
            <div className="px-6 py-5">
              <p style={{ fontSize: 10.5, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>Shift Details</p>
              <div className="rounded-xl border overflow-hidden" style={{ borderColor: "#e5e7eb" }}>
                {detailRows(lockTarget).map((d, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-3" style={{ borderTop: i ? "1px solid #f3f4f6" : undefined, background: i % 2 ? "#fafafa" : "#fff" }}>
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: d.iconBg }}>{d.icon}</div>
                    <div className="flex-1 min-w-0">
                      <p style={{ fontSize: 10, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.04em" }}>{d.label}</p>
                      <p style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>{d.value}</p>
                    </div>
                    {d.sub && <span className="px-2 py-0.5 rounded-md" style={{ fontSize: 10, fontWeight: 600, color: "#6b7280", background: "#f3f4f6" }}>{d.sub}</span>}
                  </div>
                ))}
              </div>
              <div className="mt-3 rounded-xl px-4 py-3 flex items-center justify-between" style={{ background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>Total Billable Amount</span>
                <span style={{ fontSize: 18, fontWeight: 800, color: "#145228" }}>{money(lockTarget.hoursWorked * lockTarget.billingRate)}</span>
              </div>
              <div className="mt-3 rounded-lg px-3 py-2.5 flex items-start gap-2" style={{ background: "#fef3c7", border: "1px solid #fde68a" }}>
                <AlertTriangle size={13} style={{ color: "#d97706", marginTop: 1, flexShrink: 0 }} strokeWidth={2} />
                <p style={{ fontSize: 11, color: "#92400e", lineHeight: 1.5 }}>Once locked, Edit and Delete actions will be disabled until an administrator manually unlocks the shift.</p>
              </div>
            </div>
            <div className="px-6 py-4 flex items-center justify-end gap-2 border-t" style={{ borderColor: "#f3f4f6", background: "#fafafa" }}>
              <button onClick={() => { if (!processing) setLockTarget(null); }} disabled={processing} className="px-4 py-2 rounded-lg border hover:bg-gray-50 transition-colors" style={{ borderColor: "#e5e7eb", fontSize: 12, fontWeight: 600, color: "#374151" }}>Cancel</button>
              <button onClick={confirmLock} disabled={processing} className="px-4 py-2 rounded-lg text-white flex items-center gap-2 hover:brightness-95 transition-all" style={{ background: processing ? "#9ca3af" : "#dc2626", fontSize: 12, fontWeight: 700 }}>
                {processing ? "Locking…" : <><Lock size={13} strokeWidth={2} />Lock & Send to Billing</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unlock Modal */}
      {unlockTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" }} onClick={() => { if (!processing) setUnlockTarget(null); }} />
          <div className="relative bg-white rounded-2xl shadow-2xl overflow-hidden" style={{ width: 420, maxWidth: "92vw" }}>
            <div className="px-6 py-5 flex items-start justify-between" style={{ background: "linear-gradient(135deg,#eff6ff 0%,#f0fdf4 100%)" }}>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#eff6ff", border: "1px solid #bfdbfe" }}>
                  <Unlock size={18} style={{ color: "#2563eb" }} strokeWidth={2} />
                </div>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 800, color: "#111827" }}>Unlock Shift</h3>
                  <p style={{ fontSize: 12, color: "#6b7280", marginTop: 2, lineHeight: 1.5 }}>This will remove the shift from the billing queue and allow editing.</p>
                </div>
              </div>
              <button onClick={() => { if (!processing) setUnlockTarget(null); }} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/80" style={{ color: "#6b7280" }}><X size={16} strokeWidth={2} /></button>
            </div>
            <div className="px-6 py-5">
              <div className="rounded-xl border px-4 py-3 flex items-center gap-3" style={{ borderColor: "#e5e7eb", background: "#fafafa" }}>
                <div className="flex-1 min-w-0">
                  <p style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>{unlockTarget.clientName}</p>
                  <p style={{ fontSize: 11, color: "#6b7280" }}>{unlockTarget.service} · {unlockTarget.hoursWorked}h × ${unlockTarget.billingRate}/hr</p>
                </div>
                <span className="px-2 py-0.5 rounded-md" style={{ fontSize: 11, fontWeight: 700, color: "#145228", background: "#f0fdf4" }}>{money(unlockTarget.hoursWorked * unlockTarget.billingRate)}</span>
              </div>
              <div className="mt-3 rounded-lg px-3 py-2.5 flex items-start gap-2" style={{ background: "#eff6ff", border: "1px solid #bfdbfe" }}>
                <AlertTriangle size={13} style={{ color: "#2563eb", marginTop: 1, flexShrink: 0 }} strokeWidth={2} />
                <p style={{ fontSize: 11, color: "#1e40af", lineHeight: 1.5 }}>Billing status will revert to <strong>Verified</strong>. The shift must be re-locked before billing.</p>
              </div>
            </div>
            <div className="px-6 py-4 flex items-center justify-end gap-2 border-t" style={{ borderColor: "#f3f4f6", background: "#fafafa" }}>
              <button onClick={() => { if (!processing) setUnlockTarget(null); }} disabled={processing} className="px-4 py-2 rounded-lg border hover:bg-gray-50 transition-colors" style={{ borderColor: "#e5e7eb", fontSize: 12, fontWeight: 600, color: "#374151" }}>Cancel</button>
              <button onClick={confirmUnlock} disabled={processing} className="px-4 py-2 rounded-lg text-white flex items-center gap-2 hover:brightness-95 transition-all" style={{ background: processing ? "#9ca3af" : "#2563eb", fontSize: 12, fontWeight: 700 }}>
                {processing ? "Unlocking…" : <><Unlock size={13} strokeWidth={2} />Unlock Shift</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" }} onClick={() => { if (!processing) setDeleteTarget(null); }} />
          <div className="relative bg-white rounded-2xl shadow-2xl overflow-hidden" style={{ width: 420, maxWidth: "92vw" }}>
            <div className="px-6 py-5 flex items-start justify-between" style={{ background: "linear-gradient(135deg,#fef2f2 0%,#fff5f5 100%)" }}>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#fef2f2", border: "1px solid #fecaca" }}>
                  <Trash2 size={18} style={{ color: "#dc2626" }} strokeWidth={2} />
                </div>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 800, color: "#111827" }}>Delete Shift</h3>
                  <p style={{ fontSize: 12, color: "#6b7280", marginTop: 2, lineHeight: 1.5 }}>This action is permanent and cannot be undone.</p>
                </div>
              </div>
              <button onClick={() => { if (!processing) setDeleteTarget(null); }} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/80" style={{ color: "#6b7280" }}><X size={16} strokeWidth={2} /></button>
            </div>
            <div className="px-6 py-5">
              <div className="rounded-xl border px-4 py-3 flex items-center gap-3" style={{ borderColor: "#e5e7eb", background: "#fafafa" }}>
                <div className="flex-1 min-w-0">
                  <p style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>{deleteTarget.clientName}</p>
                  <p style={{ fontSize: 11, color: "#6b7280" }}>{deleteTarget.service} · {deleteTarget.shiftType} · {deleteTarget.staff}</p>
                </div>
                <span className="px-2 py-0.5 rounded-md" style={{ fontSize: 11, fontWeight: 700, color: "#dc2626", background: "#fef2f2" }}>{deleteTarget.status}</span>
              </div>
              <div className="mt-3 rounded-lg px-3 py-2.5 flex items-start gap-2" style={{ background: "#fef2f2", border: "1px solid #fecaca" }}>
                <AlertTriangle size={13} style={{ color: "#dc2626", marginTop: 1, flexShrink: 0 }} strokeWidth={2} />
                <p style={{ fontSize: 11, color: "#991b1b", lineHeight: 1.5 }}>This will permanently delete the shift and all associated data. This cannot be recovered.</p>
              </div>
            </div>
            <div className="px-6 py-4 flex items-center justify-end gap-2 border-t" style={{ borderColor: "#f3f4f6", background: "#fafafa" }}>
              <button onClick={() => { if (!processing) setDeleteTarget(null); }} disabled={processing} className="px-4 py-2 rounded-lg border hover:bg-gray-50 transition-colors" style={{ borderColor: "#e5e7eb", fontSize: 12, fontWeight: 600, color: "#374151" }}>Cancel</button>
              <button onClick={confirmDelete} disabled={processing} className="px-4 py-2 rounded-lg text-white flex items-center gap-2 hover:brightness-95 transition-all" style={{ background: processing ? "#9ca3af" : "#dc2626", fontSize: 12, fontWeight: 700 }}>
                {processing ? "Deleting…" : <><Trash2 size={13} strokeWidth={2} />Delete Shift</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
