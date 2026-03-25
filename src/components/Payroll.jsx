import { useState, useEffect, useMemo, useRef } from "react";
import {
  DollarSign, Users, Clock, ChevronDown, ChevronLeft, ChevronRight,
  Search, CheckCircle2, ChevronsUpDown, Play, Lock, Unlock,
} from "lucide-react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";

// ── Helpers ──────────────────────────────────────────────────────────────────
const fmtC = (v) =>
  "$" + Number(v || 0).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

const AVATAR_COLORS = [
  { bg: "#dbeafe", text: "#1d4ed8" },
  { bg: "#ede9fe", text: "#7c3aed" },
  { bg: "#fce7f3", text: "#be185d" },
  { bg: "#d1fae5", text: "#065f46" },
  { bg: "#fef3c7", text: "#92400e" },
  { bg: "#fee2e2", text: "#991b1b" },
  { bg: "#e0f2fe", text: "#0369a1" },
];

function getAvatarColor(name = "") {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(name = "") {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const SHORT_MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function fmtShiftDate(val) {
  if (!val) return "—";
  // Firestore Timestamp
  if (val && typeof val.toDate === "function") {
    const d = val.toDate();
    return `${SHORT_MONTHS[d.getMonth()]} ${String(d.getDate()).padStart(2, "0")}`;
  }
  // ISO string or date string
  const d = new Date(val);
  if (isNaN(d)) return val;
  return `${SHORT_MONTHS[d.getMonth()]} ${String(d.getDate()).padStart(2, "0")}`;
}

function serviceTypeBadge(type = "") {
  const t = type.toLowerCase();
  if (t.includes("supervised") || t.includes("visitation")) {
    return { bg: "#fef3c7", color: "#92400e", border: "#fde68a" };
  }
  if (t.includes("emergency")) {
    return { bg: "#fee2e2", color: "#dc2626", border: "#fecaca" };
  }
  if (t.includes("respite")) {
    return { bg: "#dbeafe", color: "#1d4ed8", border: "#bfdbfe" };
  }
  if (t.includes("transport")) {
    return { bg: "#d1fae5", color: "#065f46", border: "#a7f3d0" };
  }
  return { bg: "#f3f4f6", color: "#374151", border: "#e5e7eb" };
}

// ── Status dot ───────────────────────────────────────────────────────────────
function StatusDot({ status }) {
  const colors = { Paid: "#16a34a", Pending: "#f59e0b", Overdue: "#dc2626", Approved: "#3b82f6" };
  return (
    <span className="flex items-center gap-1.5">
      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: colors[status] || "#9ca3af" }} />
      <span className="font-semibold" style={{ fontSize: 12, color: colors[status] || "#9ca3af" }}>{status}</span>
    </span>
  );
}

// ── KPI strip item ────────────────────────────────────────────────────────────
function KPIItem({ icon, label, value, valueColor }) {
  return (
    <div className="flex items-center gap-3 px-6 py-4 flex-1">
      <span style={{ color: "#9ca3af" }}>{icon}</span>
      <div>
        <span className="font-semibold mr-2" style={{ fontSize: 11, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</span>
        <span className="font-bold" style={{ fontSize: 16, color: valueColor || "#111827" }}>{value}</span>
      </div>
    </div>
  );
}

// ── Staff row ─────────────────────────────────────────────────────────────────
function StaffRow({ rec, monthLabel, expanded, onToggle, userShifts = [] }) {
  const { bg, text } = getAvatarColor(rec.name);
  const isPending  = rec.status === "Pending";
  const isPaid     = rec.status === "Paid";
  const isOverdue  = rec.status === "Overdue";
  const hasCancelled = rec.cancelledShifts > 0;
  const allCancelled = rec.allCancelled;

  return (
    <>
      <div
        className="flex items-center px-5 py-3.5 cursor-pointer transition-colors border-b"
        style={{
          borderColor: "#f3f4f6",
          backgroundColor: allCancelled ? "#fff5f5" : hasCancelled ? "#fffbf0" : undefined,
        }}
        onMouseEnter={(e) => { if (!allCancelled && !hasCancelled) e.currentTarget.style.backgroundColor = "#f9fafb"; }}
        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = allCancelled ? "#fff5f5" : hasCancelled ? "#fffbf0" : ""; }}
        onClick={onToggle}
      >
        {/* Expand chevron */}
        <ChevronRight
          size={14}
          strokeWidth={2.5}
          className="mr-3 flex-shrink-0 transition-transform"
          style={{ color: "#9ca3af", transform: expanded ? "rotate(90deg)" : "rotate(0deg)" }}
        />

        {/* Avatar */}
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center font-bold flex-shrink-0 mr-3"
          style={{ backgroundColor: bg, color: text, fontSize: 13 }}
        >
          {getInitials(rec.name)}
        </div>

        {/* Name + ID */}
        <div className="min-w-[160px] mr-6">
          <div className="flex items-center gap-2">
            <p className="font-semibold" style={{ fontSize: 14, color: allCancelled ? "#dc2626" : "#111827" }}>{rec.name}</p>
            {allCancelled && (
              <span className="px-1.5 py-0.5 rounded text-xs font-bold flex-shrink-0" style={{ background: "#fee2e2", color: "#dc2626" }}>All Cancelled</span>
            )}
            {!allCancelled && hasCancelled && (
              <span className="px-1.5 py-0.5 rounded text-xs font-bold flex-shrink-0" style={{ background: "#fef3c7", color: "#b45309" }}>{rec.cancelledShifts} Cancelled</span>
            )}
          </div>
          <p style={{ fontSize: 11, color: "#9ca3af", fontWeight: 500 }}>{rec.staffCode}</p>
        </div>

        {/* Shift info */}
        <p style={{ fontSize: 13, color: "#6b7280", flex: 1 }}>
          <span>{rec.shifts} shifts</span>
          {hasCancelled && (
            <span style={{ color: "#dc2626" }}> ({rec.cancelledShifts} cancelled)</span>
          )}
          <span className="mx-1.5" style={{ color: "#d1d5db" }}>·</span>
          <span>{monthLabel}</span>
          <span className="mx-1.5" style={{ color: "#d1d5db" }}>·</span>
          <span>{Math.round(rec.hoursWorked)}h</span>
          <span className="mx-1.5" style={{ color: "#d1d5db" }}>·</span>
          <span>${rec.rate}/hr</span>
        </p>

        {/* Amount */}
        <p className="font-bold mr-6" style={{ fontSize: 15, color: "#111827", minWidth: 80, textAlign: "right" }}>
          {fmtC(rec.gross)}
        </p>

        {/* Status */}
        <div className="mr-4 min-w-[80px] flex justify-end">
          <StatusDot status={rec.status} />
        </div>

        {/* Action */}
        <div className="min-w-[120px] flex justify-end">
          {isPending && (
            <button
              className="px-3 py-1.5 rounded-lg text-white font-semibold transition-opacity hover:opacity-90"
              style={{ fontSize: 12, backgroundColor: "#145228" }}
              onClick={(e) => e.stopPropagation()}
            >
              Approve & Pay
            </button>
          )}
          {isPaid && (
            <CheckCircle2 size={20} style={{ color: "#16a34a" }} strokeWidth={2} />
          )}
          {isOverdue && (
            <span className="font-semibold" style={{ fontSize: 12, color: "#dc2626" }}>Overdue</span>
          )}
        </div>
      </div>

      {/* Expanded detail row — per-shift table */}
      {expanded && (
        <div className="border-b" style={{ borderColor: "#f3f4f6", backgroundColor: allCancelled ? "#fff5f5" : "#f9fafb" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                  {["DATE","CLIENT","SERVICE TYPE","HRS","TYPE","RATE","AMOUNT","SHIFT LOCK"].map((col) => (
                    <th key={col} style={{
                      padding: "10px 14px",
                      textAlign: "left",
                      fontSize: 11,
                      fontWeight: 600,
                      color: "#9ca3af",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      whiteSpace: "nowrap",
                      backgroundColor: allCancelled ? "#fff5f5" : "#f9fafb",
                    }}>
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {userShifts.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: "20px 14px", textAlign: "center", fontSize: 13, color: "#9ca3af" }}>
                      No shifts found
                    </td>
                  </tr>
                ) : userShifts.map((shift, idx) => {
                  const isShiftCancelled = (() => {
                    const st = (shift.status || shift.shiftStatus || "").toLowerCase();
                    return st === "cancelled" || st === "canceled" || !!shift.shiftCancelled;
                  })();
                  const hrs = parseFloat(shift.hoursWorked || shift.duration || shift.totalHours || shift.hours || 0);
                  const shiftHrs = isNaN(hrs) || hrs === 0 ? 8 : hrs;
                  const rate = rec.rate;
                  const amount = shiftHrs * rate;
                  const serviceType = shift.categoryName || shift.serviceType || shift.category || shift.shiftType || "";
                  const badge = serviceTypeBadge(serviceType);
                  const isLocked = !!(shift.locked || shift.shiftLocked || shift.isLocked);
                  const rowBg = isShiftCancelled ? (idx % 2 === 0 ? "#fff1f1" : "#fff5f5") : (idx % 2 === 0 ? "#ffffff" : "#fafafa");

                  return (
                    <tr key={shift.id || idx} style={{ backgroundColor: rowBg, borderBottom: "1px solid #f3f4f6" }}>
                      {/* DATE */}
                      <td style={{ padding: "10px 14px", fontSize: 13, color: "#374151", fontWeight: 500, whiteSpace: "nowrap" }}>
                        {fmtShiftDate(shift.date || shift.shiftDate || shift.createdAt)}
                      </td>
                      {/* CLIENT */}
                      <td style={{ padding: "10px 14px", fontSize: 13, color: "#374151", maxWidth: 140 }}>
                        <span style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {shift.clientName || shift.client || shift.customerName || "—"}
                        </span>
                      </td>
                      {/* SERVICE TYPE badge */}
                      <td style={{ padding: "10px 14px" }}>
                        {serviceType ? (
                          <span style={{
                            display: "inline-block",
                            padding: "3px 9px",
                            borderRadius: 20,
                            fontSize: 11,
                            fontWeight: 600,
                            backgroundColor: badge.bg,
                            color: badge.color,
                            border: `1px solid ${badge.border}`,
                            whiteSpace: "nowrap",
                          }}>
                            {serviceType}
                          </span>
                        ) : (
                          <span style={{ color: "#d1d5db", fontSize: 13 }}>—</span>
                        )}
                      </td>
                      {/* HRS */}
                      <td style={{ padding: "10px 14px", fontSize: 13, color: "#374151", fontWeight: 500 }}>
                        {shiftHrs}h
                      </td>
                      {/* TYPE */}
                      <td style={{ padding: "10px 14px", fontSize: 13, color: "#374151" }}>
                        {shift.type || shift.shiftCategory || "Regular"}
                      </td>
                      {/* RATE */}
                      <td style={{ padding: "10px 14px", fontSize: 13, color: "#374151" }}>
                        ${rate}/hr
                      </td>
                      {/* AMOUNT */}
                      <td style={{ padding: "10px 14px", fontSize: 13, fontWeight: 600, color: isShiftCancelled ? "#dc2626" : "#111827" }}>
                        {isShiftCancelled ? (
                          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <span style={{ textDecoration: "line-through", color: "#dc2626" }}>{fmtC(amount)}</span>
                            <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 5px", borderRadius: 4, background: "#fee2e2", color: "#dc2626" }}>Cancelled</span>
                          </span>
                        ) : fmtC(amount)}
                      </td>
                      {/* SHIFT LOCK */}
                      <td style={{ padding: "10px 14px" }}>
                        <span style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 5,
                          padding: "3px 9px",
                          borderRadius: 20,
                          fontSize: 11,
                          fontWeight: 600,
                          backgroundColor: isLocked ? "#f3f4f6" : "#d1fae5",
                          color: isLocked ? "#374151" : "#065f46",
                        }}>
                          {isLocked
                            ? <><Lock size={10} strokeWidth={2.5} /> Locked</>
                            : <><Unlock size={10} strokeWidth={2.5} /> Open</>
                          }
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {/* Footer summary row */}
              {userShifts.length > 0 && (
                <tfoot>
                  <tr style={{ borderTop: "2px solid #e5e7eb", backgroundColor: allCancelled ? "#fff5f5" : "#f9fafb" }}>
                    <td colSpan={3} style={{ padding: "10px 14px", fontSize: 12, color: "#6b7280", fontWeight: 600 }}>
                      {rec.shifts} shifts · {rec.completedShifts} completed
                      {hasCancelled && <span style={{ color: "#dc2626" }}> · {rec.cancelledShifts} cancelled</span>}
                    </td>
                    <td style={{ padding: "10px 14px", fontSize: 13, fontWeight: 700, color: "#111827" }}>
                      {Math.round(rec.hoursWorked)}h
                    </td>
                    <td />
                    <td style={{ padding: "10px 14px", fontSize: 12, color: "#6b7280" }}>${rec.rate}/hr</td>
                    <td style={{ padding: "10px 14px", fontSize: 13, fontWeight: 700, color: "#111827" }}>{fmtC(rec.gross)}</td>
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}
    </>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function Payroll() {
  const today = new Date();
  const [monthOffset, setMonthOffset] = useState(0);
  const [users, setUsers] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [activeTab, setActiveTab] = useState("staff");
  const [expandedRows, setExpandedRows] = useState({});
  const [shiftTypeFilter, setShiftTypeFilter] = useState("All Shift Types");
  const [clientFilter, setClientFilter] = useState("All Clients");
  const [shiftTypeOpen, setShiftTypeOpen] = useState(false);
  const [clientOpen, setClientOpen] = useState(false);

  const shiftTypeRef = useRef(null);
  const clientRef = useRef(null);

  // Current month/year
  const viewDate = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
  const viewMonth = viewDate.getMonth();
  const viewYear = viewDate.getFullYear();
  const monthLabel = `${MONTH_NAMES[viewMonth]} ${viewYear}`;

  useEffect(() => {
    const h = (e) => {
      if (shiftTypeRef.current && !shiftTypeRef.current.contains(e.target)) setShiftTypeOpen(false);
      if (clientRef.current && !clientRef.current.contains(e.target)) setClientOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [usersSnap, shiftsSnap] = await Promise.all([
          getDocs(collection(db, "users")),
          getDocs(collection(db, "shifts")),
        ]);
        setUsers(usersSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setShifts(shiftsSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (e) {
        console.error("Error fetching payroll data:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Build payroll records
  const payrollRecords = useMemo(() => {
    return users.map((user, idx) => {
      const userShifts = shifts.filter(
        (s) => s.userId === user.id || s.assignedUser === user.name || s.name === user.name || s.staffName === user.name
      );
      const isCancelled = (s) => {
        const st = (s.status || s.shiftStatus || "").toLowerCase();
        return st === "cancelled" || st === "canceled" || !!s.shiftCancelled;
      };
      const cancelledShifts = userShifts.filter(isCancelled);
      const completedShifts = userShifts.filter((s) => s.clockIn && s.clockOut);
      const activeShifts    = userShifts.filter((s) => !isCancelled(s));
      const hoursWorked = activeShifts.reduce((sum, s) => {
        const h = parseFloat(s.hoursWorked || s.duration || s.totalHours || s.hours || 0);
        return sum + (isNaN(h) || h === 0 ? 8 : h);
      }, 0);
      const rate  = parseFloat(user.salaryPerHour || 0);
      const gross = hoursWorked * rate;
      const staffNum = String(idx + 1).padStart(3, "0");
      const allCancelled = userShifts.length > 0 && cancelledShifts.length === userShifts.length;

      return {
        id: user.id,
        name: user.name || "Unknown",
        role: user.role || "Staff",
        staffCode: user.staffId || user.staffCode || `STF-${staffNum}`,
        shifts: userShifts.length,
        completedShifts: completedShifts.length,
        cancelledShifts: cancelledShifts.length,
        allCancelled,
        hoursWorked: Math.round(hoursWorked * 10) / 10,
        rate,
        gross,
        status: user.payrollStatus || "Pending",
        userShifts,
      };
    }).filter((r) => r.shifts > 0);
  }, [users, shifts]);

  // KPI totals
  const totalPayroll = payrollRecords.reduce((s, r) => s + r.gross, 0);
  const paidOut = payrollRecords.filter((r) => r.status === "Paid").reduce((s, r) => s + r.gross, 0);
  const pending = payrollRecords.filter((r) => r.status === "Pending" || r.status === "Overdue").reduce((s, r) => s + r.gross, 0);
  const totalShifts = shifts.length;
  const totalStaff = payrollRecords.length;
  const totalHours = payrollRecords.reduce((s, r) => s + r.hoursWorked, 0);

  // Filter
  const filtered = payrollRecords.filter((r) => {
    const sm = !search || r.name.toLowerCase().includes(search.toLowerCase());
    const stm = statusFilter === "All" || r.status === statusFilter;
    return sm && stm;
  });

  const toggleRow = (id) => setExpandedRows((prev) => ({ ...prev, [id]: !prev[id] }));
  const expandAll = () => {
    const allExpanded = filtered.every((r) => expandedRows[r.id]);
    const next = {};
    filtered.forEach((r) => { next[r.id] = !allExpanded; });
    setExpandedRows(next);
  };

  const STATUS_PILLS = ["All", "Pending", "Approved", "Paid"];

  return (
    <div className="flex flex-col h-full" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", backgroundColor: "#f9fafb" }}>

      {/* ── Header ── */}
      <div className="px-6 pt-5 pb-4 flex-shrink-0">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-bold" style={{ fontSize: 26, color: "#111827", letterSpacing: "-0.02em" }}>Payroll</h1>
            <p style={{ fontSize: 13, color: "#6b7280", marginTop: 3 }}>
              Manage staff compensation, hours and expense reimbursements
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Month nav */}
            <div className="flex items-center gap-1 bg-white border rounded-xl px-2 py-1.5" style={{ borderColor: "#e5e7eb" }}>
              <button
                onClick={() => setMonthOffset((o) => o - 1)}
                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
              >
                <ChevronLeft size={15} style={{ color: "#374151" }} strokeWidth={2.5} />
              </button>
              <span className="font-semibold px-2" style={{ fontSize: 13, color: "#111827", minWidth: 110, textAlign: "center" }}>
                {monthLabel}
              </span>
              <button
                onClick={() => setMonthOffset((o) => o + 1)}
                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
              >
                <ChevronRight size={15} style={{ color: "#374151" }} strokeWidth={2.5} />
              </button>
            </div>
            {/* Run Payroll */}
            <button
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-white font-semibold transition-opacity hover:opacity-90"
              style={{ backgroundColor: "#145228", fontSize: 13 }}
            >
              <Play size={13} fill="white" strokeWidth={0} />
              Run Payroll
            </button>
          </div>
        </div>
      </div>

      {/* ── KPI Strip ── */}
      <div className="px-6 mb-4 flex-shrink-0">
        <div className="bg-white rounded-xl border flex divide-x overflow-hidden" style={{ borderColor: "#e5e7eb", divideColor: "#e5e7eb" }}>
          <KPIItem icon={<DollarSign size={15} />} label="Total Payroll" value={fmtC(totalPayroll)} />
          <KPIItem icon={<CheckCircle2 size={15} style={{ color: "#16a34a" }} />} label="Paid Out" value={fmtC(paidOut)} valueColor="#16a34a" />
          <KPIItem icon={<Clock size={15} style={{ color: "#f59e0b" }} />} label="Pending" value={fmtC(pending)} valueColor="#f59e0b" />
          <KPIItem icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>} label="Shifts" value={totalShifts} />
          <KPIItem icon={<Users size={15} />} label="Staff" value={totalStaff} />
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="px-6 flex-shrink-0">
        <div className="flex gap-0 border-b" style={{ borderColor: "#e5e7eb" }}>
          {[
            { key: "staff", label: "Staff Payroll" },
            { key: "expense", label: "Expense Reimbursements", badge: 1 },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="flex items-center gap-2 px-1 pb-3 mr-6 relative font-semibold transition-colors"
              style={{ fontSize: 13, color: activeTab === tab.key ? "#111827" : "#9ca3af" }}
            >
              {tab.label}
              {tab.badge && (
                <span className="w-5 h-5 rounded-full flex items-center justify-center font-bold"
                  style={{ fontSize: 10, backgroundColor: "#fed7aa", color: "#92400e" }}>
                  {tab.badge}
                </span>
              )}
              {activeTab === tab.key && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full" style={{ backgroundColor: "#145228" }} />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-auto px-6 py-4">

        {activeTab === "staff" && (
          <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: "#e5e7eb", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>

            {/* Toolbar */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b" style={{ borderColor: "#f3f4f6" }}>
              <div className="flex items-center gap-2">
                {/* Search */}
                <div className="relative">
                  <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: "#9ca3af" }} />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search staff..."
                    className="pl-8 pr-3 py-1.5 rounded-lg border focus:outline-none"
                    style={{ fontSize: 12, borderColor: "#e5e7eb", width: 200, color: "#374151" }}
                  />
                </div>

                {/* Shift Type dropdown */}
                <div className="relative" ref={shiftTypeRef}>
                  <button
                    onClick={() => setShiftTypeOpen((o) => !o)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border bg-white hover:bg-gray-50 transition-colors"
                    style={{ fontSize: 12, borderColor: "#e5e7eb", color: "#374151" }}
                  >
                    {shiftTypeFilter}
                    <ChevronDown size={12} style={{ color: "#9ca3af" }} />
                  </button>
                  {shiftTypeOpen && (
                    <div className="absolute left-0 top-9 bg-white border rounded-xl shadow-lg z-50 min-w-[160px]" style={{ borderColor: "#e5e7eb" }}>
                      {["All Shift Types", "Respite Care", "Transportation", "Supervised Visitation"].map((o) => (
                        <button key={o} onClick={() => { setShiftTypeFilter(o); setShiftTypeOpen(false); }}
                          className="w-full text-left px-4 py-2 text-xs hover:bg-gray-50" style={{ color: "#374151" }}>
                          {o}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Client dropdown */}
                <div className="relative" ref={clientRef}>
                  <button
                    onClick={() => setClientOpen((o) => !o)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border bg-white hover:bg-gray-50 transition-colors"
                    style={{ fontSize: 12, borderColor: "#e5e7eb", color: "#374151" }}
                  >
                    {clientFilter}
                    <ChevronDown size={12} style={{ color: "#9ca3af" }} />
                  </button>
                  {clientOpen && (
                    <div className="absolute left-0 top-9 bg-white border rounded-xl shadow-lg z-50 min-w-[140px]" style={{ borderColor: "#e5e7eb" }}>
                      {["All Clients"].map((o) => (
                        <button key={o} onClick={() => { setClientFilter(o); setClientOpen(false); }}
                          className="w-full text-left px-4 py-2 text-xs hover:bg-gray-50" style={{ color: "#374151" }}>
                          {o}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Expand All */}
                <button
                  onClick={expandAll}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border bg-white hover:bg-gray-50 transition-colors"
                  style={{ fontSize: 12, borderColor: "#e5e7eb", color: "#374151" }}
                >
                  <ChevronsUpDown size={12} style={{ color: "#9ca3af" }} />
                  Expand All
                </button>
              </div>

              {/* Status pills */}
              <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
                {STATUS_PILLS.map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className="px-3 py-1 rounded-lg font-semibold transition-all"
                    style={{
                      fontSize: 12,
                      backgroundColor: statusFilter === s ? "#145228" : "transparent",
                      color: statusFilter === s ? "#ffffff" : "#6b7280",
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Staff rows */}
            <div>
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "#145228", borderTopColor: "transparent" }} />
                </div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-16" style={{ color: "#9ca3af", fontSize: 14 }}>
                  No payroll records found
                </div>
              ) : (
                filtered.map((rec) => (
                  <StaffRow
                    key={rec.id}
                    rec={rec}
                    monthLabel={monthLabel}
                    expanded={!!expandedRows[rec.id]}
                    onToggle={() => toggleRow(rec.id)}
                    userShifts={rec.userShifts}
                  />
                ))
              )}
            </div>

            {/* Footer */}
            {!loading && filtered.length > 0 && (
              <div className="flex items-center justify-between px-5 py-3.5 border-t bg-gray-50" style={{ borderColor: "#f3f4f6" }}>
                <p style={{ fontSize: 13, color: "#6b7280" }}>{filtered.length} staff member{filtered.length !== 1 ? "s" : ""}</p>
                <p style={{ fontSize: 13, color: "#6b7280" }}>
                  Total Hours:{" "}
                  <span className="font-semibold" style={{ color: "#111827" }}>{Math.round(totalHours)}h</span>
                  <span className="mx-3" style={{ color: "#d1d5db" }}>·</span>
                  Total Payroll:{" "}
                  <span className="font-semibold" style={{ color: "#111827" }}>{fmtC(totalPayroll)}</span>
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === "expense" && (
          <div className="bg-white rounded-xl border flex items-center justify-center py-20" style={{ borderColor: "#e5e7eb" }}>
            <p style={{ fontSize: 14, color: "#9ca3af" }}>No expense reimbursements to display.</p>
          </div>
        )}
      </div>
    </div>
  );
}
