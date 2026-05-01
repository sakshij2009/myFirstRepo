import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import {
  ChevronLeft, ChevronRight, Plus, Clock, User,
  AlertTriangle, Calendar,
  LayoutList, Columns3, CalendarDays, Filter,
  CheckCircle2, XCircle, AlertCircle, History,
  Eye, Edit2, MoreHorizontal,
} from "lucide-react";

// ─── Service Config ────────────────────────────────────────────────────────────
const SERVICE_CFG = {
  emergency:      { label: "Emergent Care",      color: "#dc2626", bg: "#fee2e2", light: "#fef2f2", border: "#fecaca" },
  respite:        { label: "Respite Care",       color: "#2563eb", bg: "#dbeafe", light: "#eff6ff", border: "#bfdbfe" },
  supervised:     { label: "Supervised Visitation", color: "#7c3aed", bg: "#ede9fe", light: "#f5f3ff", border: "#ddd6fe" },
  transportation: { label: "Transportation",     color: "#ea580c", bg: "#fed7aa", light: "#fff7ed", border: "#fdba74" },
  other:          { label: "Other",              color: "#6b7280", bg: "#f3f4f6", light: "#f9fafb", border: "#e5e7eb" },
};

const STATUS_CFG = {
  active:    { label: "Active",    bg: "#dcfce7", text: "#16a34a" },
  pending:   { label: "Pending",   bg: "#fef9c3", text: "#a16207" },
  completed: { label: "Completed", bg: "#f3f4f6", text: "#6b7280" },
  cancelled: { label: "Cancelled", bg: "#fee2e2", text: "#dc2626" },
  missed:    { label: "Missed",    bg: "#fff1f2", text: "#e11d48" },
};

// ─── Normalise Firebase shift ──────────────────────────────────────────────────
function normaliseDate(val) {
  if (!val) return null;
  if (typeof val?.toDate === "function") return val.toDate();
  if (val instanceof Date) return val;
  if (typeof val === "string") {
    // Try ISO or common formats
    const d = new Date(val);
    if (!isNaN(d)) return d;
    // "05 DEC 2024" style
    const parts = val.trim().split(/\s+/);
    if (parts.length >= 3) {
      const d2 = new Date(`${parts[1]} ${parts[0]}, ${parts[2]}`);
      if (!isNaN(d2)) return d2;
    }
  }
  return null;
}

function toDateStr(val) {
  const d = normaliseDate(val);
  return d ? d.toISOString().slice(0, 10) : null;
}

function normaliseCategoryKey(cat) {
  const c = (cat || "").toLowerCase();
  if (c.includes("emergent") || c.includes("emergency")) return "emergency";
  if (c.includes("respite")) return "respite";
  if (c.includes("supervised")) return "supervised";
  if (c.includes("transport")) return "transportation";
  return "other";
}

function serviceNameToKey(serviceName) {
  if (!serviceName) return "all";
  const s = serviceName.toLowerCase();
  if (s.includes("emergent") || s.includes("emergency")) return "emergency";
  if (s.includes("respite")) return "respite";
  if (s.includes("supervised")) return "supervised";
  if (s.includes("transport")) return "transportation";
  return "all";
}

function normaliseStatus(shift) {
  if (shift.status) {
    const s = shift.status.toLowerCase();
    if (s.includes("complet")) return "completed";
    if (s.includes("cancel")) return "cancelled";
    if (s.includes("miss")) return "missed";
    if (s.includes("active") || s.includes("ongoing") || s.includes("progress")) return "active";
    if (s.includes("pending")) return "pending";
  }
  if (shift.clockIn && shift.clockOut) return "completed";
  if (shift.clockIn && !shift.clockOut) return "active";
  return "pending";
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function addDays(dateStr, n) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function calcDuration(start, end) {
  if (!start || !end) return "";
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const mins = (eh * 60 + em) - (sh * 60 + sm);
  if (mins <= 0) return "";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? (m ? `${h}h ${m}m` : `${h}h`) : `${m}m`;
}

function monthName(year, month) {
  return new Date(year, month, 1).toLocaleString("default", { month: "long" });
}

function getWeekDates(anchor) {
  const d = new Date(anchor);
  const day = d.getDay();
  const sun = new Date(d);
  sun.setDate(d.getDate() - day);
  return Array.from({ length: 7 }, (_, i) => {
    const dd = new Date(sun);
    dd.setDate(sun.getDate() + i);
    return dd.toISOString().slice(0, 10);
  });
}

function getMonthGrid(year, month) {
  const firstDay = new Date(year, month, 1);
  const startDow = firstDay.getDay();
  const weeks = [];
  const cur = new Date(firstDay);
  cur.setDate(cur.getDate() - startDow);
  for (let w = 0; w < 6; w++) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      week.push(cur.toISOString().slice(0, 10));
      cur.setDate(cur.getDate() + 1);
    }
    weeks.push(week);
    if (cur.getMonth() !== month && w >= 3) break;
  }
  return weeks;
}

// ─── Atoms ────────────────────────────────────────────────────────────────────
const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const GRID_COLS = "2fr 1.3fr 1.5fr 1.6fr 1fr 80px";

function StatusBadge({ status }) {
  const c = STATUS_CFG[status] || STATUS_CFG.pending;
  return (
    <span
      className="inline-flex items-center px-1.5 py-0.5 rounded font-semibold"
      style={{ background: c.bg, color: c.text, fontSize: 10 }}
    >
      {c.label}
    </span>
  );
}

function ShiftChip({ shift, navigate }) {
  const s = SERVICE_CFG[shift.serviceKey] || SERVICE_CFG.other;
  return (
    <div
      onClick={() => navigate && navigate(`/admin-dashboard/add/update-user-shift/${shift.id}`)}
      className="flex items-center gap-1 px-1.5 py-0.5 rounded cursor-pointer select-none hover:opacity-75 transition-opacity"
      style={{ background: s.bg, border: `1px solid ${s.border}` }}
      title={`${shift.timeStart}–${shift.timeEnd} · ${shift.client} · P: ${shift.staff || "Unassigned"}${shift.secondaryStaff ? ` · S: ${shift.secondaryStaff}` : ""}`}
    >
      <span className="rounded-full flex-shrink-0" style={{ width: 5, height: 5, background: s.color }} />
      <span className="truncate" style={{ fontSize: 10, color: s.color, fontWeight: 600, lineHeight: 1 }}>
        {shift.timeStart} {shift.client}
      </span>
    </div>
  );
}

function ShiftGridHeader({ showDate }) {
  const cols = [
    showDate ? "CLIENT & DATE" : "CLIENT & STAFF",
    "SCHEDULE",
    "ASSIGNMENT",
    "SERVICE TYPE",
    "STATUS",
    "ACTIONS",
  ];
  return (
    <div
      className="grid items-center px-4 py-2 rounded-lg mb-1"
      style={{ gridTemplateColumns: GRID_COLS, background: "#f9fafb", border: "1px solid #f3f4f6" }}
    >
      {cols.map((c) => (
        <span key={c} className="font-semibold tracking-wide"
          style={{ fontSize: 10, color: "#9ca3af", letterSpacing: "0.06em" }}>
          {c}
        </span>
      ))}
    </div>
  );
}

function ShiftGridRow({ shift, showDate, navigate }) {
  const svc = SERVICE_CFG[shift.serviceKey] || SERVICE_CFG.other;
  const dur = calcDuration(shift.timeStart, shift.timeEnd);
  return (
    <div
      className="grid items-center px-4 py-3 rounded-lg mb-1.5 cursor-pointer transition-all hover:shadow-sm"
      style={{
        gridTemplateColumns: GRID_COLS,
        background: "#fafafa",
        border: "1px solid #f0f0f0",
        borderLeftWidth: 3,
        borderLeftColor: svc.color,
        borderLeftStyle: "solid",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "#fff")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "#fafafa")}
    >
      {/* Col 1 */}
      <div className="min-w-0 pr-2">
        {showDate && (
          <p style={{ fontSize: 10, color: "#9ca3af", fontWeight: 600, marginBottom: 1 }}>
            {new Date(shift.date + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
          </p>
        )}
        <p className="font-bold truncate" style={{ fontSize: 13, color: "#111827" }}>{shift.client}</p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <StatusBadge status={shift.status} />
        </div>
      </div>

      {/* Col 2 */}
      <div className="min-w-0 pr-2">
        <div className="flex items-center gap-1.5">
          <Clock size={12} style={{ color: svc.color, flexShrink: 0 }} />
          <span className="font-semibold" style={{ fontSize: 12, color: "#374151" }}>
            {shift.timeStart}–{shift.timeEnd}
          </span>
        </div>
        {dur && <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>{dur} duration</p>}
      </div>

      {/* Col 3 */}
      <div className="min-w-0 pr-2">
        {shift.staff || shift.secondaryStaff ? (
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <User size={12} style={{ color: "#6b7280", flexShrink: 0 }} />
              <span className="font-semibold truncate" style={{ fontSize: 12, color: "#374151" }}>{shift.staff || "—"} (P)</span>
            </div>
            {shift.secondaryStaff && (
              <div className="flex items-center gap-1.5 mt-0.5 ml-3.5">
                <span className="truncate" style={{ fontSize: 10, color: "#6b7280" }}>{shift.secondaryStaff} (S)</span>
              </div>
            )}
          </div>
        ) : (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md font-semibold"
            style={{ background: "#fff7ed", color: "#ea580c", fontSize: 11 }}>
            <AlertCircle size={10} /> Unassigned
          </span>
        )}
      </div>

      {/* Col 4 */}
      <div className="min-w-0 pr-2">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-semibold"
          style={{ background: svc.bg, color: svc.color, fontSize: 11, border: `1px solid ${svc.border}` }}>
          <span className="rounded-full flex-shrink-0" style={{ width: 6, height: 6, background: svc.color, display: "inline-block" }} />
          {svc.label}
        </span>
      </div>

      {/* Col 5 */}
      <div><StatusBadge status={shift.status} /></div>

      {/* Col 6 */}
      <div className="flex items-center gap-1.5 justify-end">
        <button
          className="flex items-center justify-center rounded-lg transition-all hover:brightness-95"
          style={{ width: 26, height: 26, background: "#eff6ff", color: "#2563eb", border: "1px solid #bfdbfe" }}
          onClick={() => navigate && navigate(`/admin-dashboard/shift-report/${shift.id}`)}
          title="View report">
          <Eye size={12} strokeWidth={2} />
        </button>
        <button
          className="flex items-center justify-center rounded-lg transition-all hover:brightness-95"
          style={{ width: 26, height: 26, background: "#f0fdf4", color: "#16a34a", border: "1px solid #bbf7d0" }}
          onClick={() => navigate && navigate(`/admin-dashboard/add/update-user-shift/${shift.id}`)}
          title="Edit shift">
          <Edit2 size={12} strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}

function ShiftCompactRow({ shift, navigate }) {
  const svc = SERVICE_CFG[shift.serviceKey] || SERVICE_CFG.other;
  return (
    <div
      onClick={() => navigate && navigate(`/admin-dashboard/add/update-user-shift/${shift.id}`)}
      className="rounded-lg p-3 cursor-pointer hover:bg-white transition-colors mb-1.5"
      style={{ background: "#fafafa", border: `1px solid #f0f0f0`, borderLeftWidth: 3, borderLeftColor: svc.color, borderLeftStyle: "solid" }}
    >
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="font-bold truncate" style={{ fontSize: 12, color: "#111827" }}>{shift.client}</span>
        <StatusBadge status={shift.status} />
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="flex items-center gap-1" style={{ fontSize: 11, color: "#6b7280" }}>
          <Clock size={10} /> {shift.timeStart}–{shift.timeEnd}
        </span>
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-semibold"
          style={{ background: svc.bg, color: svc.color, fontSize: 10 }}>
          {svc.label}
        </span>
      </div>
      <div className="flex flex-col gap-0.5 mt-1" style={{ fontSize: 11, color: shift.staff ? "#6b7280" : "#ea580c" }}>
        <div className="flex items-center gap-1">
          <User size={10} />
          <span className="truncate">{shift.staff || "Unassigned"} (P)</span>
        </div>
        {shift.secondaryStaff && (
          <div className="flex items-center gap-1 ml-3">
            <span className="truncate" style={{ fontSize: 9, color: "#9ca3af" }}>{shift.secondaryStaff} (S)</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── KPI Strip ────────────────────────────────────────────────────────────────
function ShiftKPIStrip({ shifts }) {
  const TODAY = todayStr();
  const next7 = addDays(TODAY, 7);
  const week7ago = addDays(TODAY, -7);

  const todayCount  = shifts.filter((s) => s.date === TODAY).length;
  const upcoming7   = shifts.filter((s) => s.date > TODAY && s.date <= next7).length;
  const completed   = shifts.filter((s) => s.status === "completed" && s.date >= week7ago).length;
  const unassigned  = shifts.filter((s) => !s.staff && s.date >= TODAY).length;
  const overdue     = shifts.filter((s) => ["cancelled", "missed"].includes(s.status) && s.date >= week7ago).length;

  const kpis = [
    { label: "Today's Shifts",     value: todayCount, color: "#2563eb", bg: "#eff6ff",  icon: <CalendarDays size={15} style={{ color: "#2563eb" }} /> },
    { label: "Upcoming (7 days)",  value: upcoming7,  color: "#7c3aed", bg: "#f5f3ff",  icon: <Clock size={15} style={{ color: "#7c3aed" }} /> },
    { label: "Completed (recent)", value: completed,  color: "#16a34a", bg: "#dcfce7",  icon: <CheckCircle2 size={15} style={{ color: "#16a34a" }} /> },
    { label: "Unassigned Shifts",  value: unassigned, color: "#ea580c", bg: "#fff7ed",  icon: <User size={15} style={{ color: "#ea580c" }} /> },
    { label: "Missed / Cancelled", value: overdue,    color: "#dc2626", bg: "#fef2f2",  icon: <XCircle size={15} style={{ color: "#dc2626" }} /> },
  ];

  return (
    <div className="grid grid-cols-5 gap-3">
      {kpis.map((k) => (
        <div key={k.label}
          className="bg-white rounded-xl border px-4 py-3 flex items-center gap-3"
          style={{ borderColor: "#e5e7eb", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <div className="rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ width: 34, height: 34, background: k.bg }}>
            {k.icon}
          </div>
          <div>
            <p className="font-bold" style={{ fontSize: 20, color: "#111827", lineHeight: 1.1 }}>{k.value}</p>
            <p style={{ fontSize: 11, color: "#6b7280", marginTop: 1 }}>{k.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Month Calendar ───────────────────────────────────────────────────────────
const ROW_H = 115;

function MonthCalendar({ year, month, shifts, navigate }) {
  const TODAY = todayStr();
  const weeks = getMonthGrid(year, month);
  const [expandedDate, setExpandedDate] = useState(null);

  const shiftMap = useMemo(() => {
    const m = {};
    shifts.forEach((s) => { (m[s.date] = m[s.date] || []).push(s); });
    return m;
  }, [shifts]);

  return (
    <div>
      <div className="grid grid-cols-7 border-b sticky top-0 bg-white z-10"
        style={{ borderColor: "#f3f4f6" }}>
        {DAY_LABELS.map((d) => (
          <div key={d} className="py-2.5 text-center font-semibold"
            style={{ fontSize: 11, color: "#9ca3af" }}>{d}</div>
        ))}
      </div>
      {weeks.map((week, wi) => (
        <div key={wi} className="grid grid-cols-7" style={{ height: ROW_H }}>
          {week.map((dateStr, di) => {
            const isToday = dateStr === TODAY;
            const isCurrentMonth = parseInt(dateStr.slice(5, 7)) - 1 === month;
            const dayShifts = shiftMap[dateStr] || [];
            const visible = dayShifts.slice(0, 3);
            const overflow = dayShifts.length - visible.length;
            const isExpanded = expandedDate === dateStr;

            return (
              <div key={di}
                className="border-r border-b p-1.5 flex flex-col gap-0.5 relative"
                style={{
                  borderColor: "#f3f4f6",
                  background: isToday ? "#f0fdf4" : "transparent",
                  opacity: isCurrentMonth ? 1 : 0.35,
                }}>
                <div className="flex items-center justify-between mb-0.5">
                  <span
                    className="flex items-center justify-center rounded-full font-bold flex-shrink-0"
                    style={{
                      width: 22, height: 22, fontSize: 12,
                      background: isToday ? "#16a34a" : "transparent",
                      color: isToday ? "#fff" : isCurrentMonth ? "#374151" : "#d1d5db",
                    }}>
                    {parseInt(dateStr.slice(8))}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5 flex-1 overflow-hidden">
                  {visible.map((s) => <ShiftChip key={s.id} shift={s} navigate={navigate} />)}
                  {overflow > 0 && (
                    <span 
                      onClick={() => setExpandedDate(dateStr)}
                      className="px-1 rounded cursor-pointer hover:bg-gray-100 transition-colors max-w-max"
                      style={{ fontSize: 10, color: "#6b7280", fontWeight: 600 }}>
                      +{overflow} more
                    </span>
                  )}
                </div>

                {isExpanded && (
                  <div 
                    className="absolute z-50 bg-white rounded-xl shadow-2xl border p-2 flex flex-col gap-1.5"
                    style={{ 
                      top: -4, 
                      left: -4, 
                      width: "calc(100% + 8px)",
                      minWidth: 160,
                      borderColor: "#e5e7eb" 
                    }}
                  >
                    <div className="flex justify-between items-center pb-1 border-b" style={{ borderColor: "#f3f4f6" }}>
                        <span className="font-bold ml-1" style={{ fontSize: 12, color: "#111827" }}>
                          {parseInt(dateStr.slice(8))} {new Date(dateStr + "T00:00:00").toLocaleString('default', { month: 'short' })}
                        </span>
                        <button onClick={() => setExpandedDate(null)} className="text-gray-400 hover:text-red-500 rounded p-0.5 transition-colors">
                          <XCircle size={14} />
                        </button>
                    </div>
                    <div className="flex flex-col gap-1 max-h-64 overflow-y-auto">
                      {dayShifts.map((s) => <ShiftChip key={s.id} shift={s} navigate={navigate} />)}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ─── Week View ────────────────────────────────────────────────────────────────
function WeekView({ anchorDate, shifts, navigate }) {
  const TODAY = todayStr();
  const weekDates = getWeekDates(anchorDate);

  const shiftMap = useMemo(() => {
    const m = {};
    shifts.forEach((s) => { (m[s.date] = m[s.date] || []).push(s); });
    return m;
  }, [shifts]);

  return (
    <div>
      <div className="grid grid-cols-7 border-b sticky top-0 bg-white z-10" style={{ borderColor: "#f3f4f6" }}>
        {weekDates.map((d) => {
          const isToday = d === TODAY;
          const dayNum = parseInt(d.slice(8));
          const dayName = new Date(d + "T00:00:00").toLocaleString("default", { weekday: "short" });
          return (
            <div key={d} className="py-3 text-center border-r" style={{ borderColor: "#f3f4f6" }}>
              <p className="font-semibold" style={{ fontSize: 11, color: "#9ca3af" }}>{dayName}</p>
              <div className="mx-auto mt-1 rounded-full flex items-center justify-center font-bold"
                style={{ width: 28, height: 28, background: isToday ? "#16a34a" : "transparent", color: isToday ? "#fff" : "#374151", fontSize: 14 }}>
                {dayNum}
              </div>
            </div>
          );
        })}
      </div>
      <div className="grid grid-cols-7" style={{ minHeight: 480 }}>
        {weekDates.map((d) => {
          const dayShifts = (shiftMap[d] || []).sort((a, b) => (a.timeStart || "").localeCompare(b.timeStart || ""));
          const isToday = d === TODAY;
          return (
            <div key={d} className="border-r p-2 flex flex-col gap-1.5"
              style={{ borderColor: "#f3f4f6", background: isToday ? "#f0fdf4" : "transparent" }}>
              {dayShifts.length === 0 ? (
                <div className="flex-1 flex items-center justify-center pt-8">
                  <p style={{ fontSize: 11, color: "#e5e7eb" }}>—</p>
                </div>
              ) : dayShifts.map((s) => {
                const svc = SERVICE_CFG[s.serviceKey] || SERVICE_CFG.other;
                return (
                  <div key={s.id}
                    onClick={() => navigate && navigate(`/admin-dashboard/add/update-user-shift/${s.id}`)}
                    className="rounded-lg p-2 cursor-pointer hover:opacity-80 transition-opacity"
                    style={{ background: svc.light, border: `1px solid ${svc.border}`, borderLeftWidth: 3, borderLeftColor: svc.color, borderLeftStyle: "solid" }}>
                    <p className="font-bold" style={{ fontSize: 11, color: svc.color }}>{s.timeStart}–{s.timeEnd}</p>
                    <p className="font-semibold truncate mt-0.5" style={{ fontSize: 11, color: "#111827" }}>{s.client}</p>
                    <p className="truncate" style={{ fontSize: 10, color: "#6b7280" }}>{s.staff || "⚠ Unassigned"}</p>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Today View ───────────────────────────────────────────────────────────────
function TodayView({ shifts, navigate }) {
  const TODAY = todayStr();
  const today = shifts.filter((s) => s.date === TODAY).sort((a, b) => (a.timeStart || "").localeCompare(b.timeStart || ""));
  return (
    <div className="flex flex-col gap-3 p-4">
      {today.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <p style={{ fontSize: 14, color: "#9ca3af" }}>No shifts scheduled for today.</p>
        </div>
      ) : today.map((s) => {
        const svc = SERVICE_CFG[s.serviceKey] || SERVICE_CFG.other;
        return (
          <div key={s.id}
            onClick={() => navigate && navigate(`/admin-dashboard/add/update-user-shift/${s.id}`)}
            className="bg-white rounded-xl border flex items-start gap-4 p-4 cursor-pointer hover:shadow-md transition-shadow"
            style={{ borderColor: "#e5e7eb", borderLeft: `4px solid ${svc.color}`, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
            <div className="rounded-xl flex items-center justify-center flex-shrink-0 text-center"
              style={{ width: 50, height: 50, background: svc.bg }}>
              <span className="font-bold" style={{ fontSize: 11, color: svc.color, lineHeight: 1.3 }}>
                {s.timeStart}<br />–<br />{s.timeEnd}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <p className="font-bold" style={{ fontSize: 14, color: "#111827" }}>{s.client}</p>
                <StatusBadge status={s.status} />
                {!s.staff && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold"
                    style={{ background: "#fff7ed", color: "#ea580c", fontSize: 10 }}>
                    <AlertCircle size={9} /> Unassigned
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4 flex-wrap">
                <span className="flex items-center gap-1.5" style={{ fontSize: 12, color: "#6b7280" }}>
                  <Clock size={12} /> {s.timeStart} – {s.timeEnd}
                </span>
                <div className="flex flex-col gap-0.5">
                  <span className="flex items-center gap-1.5" style={{ fontSize: 12, color: "#6b7280" }}>
                    <User size={12} /> {s.staff || "Unassigned"} (P)
                  </span>
                  {s.secondaryStaff && (
                    <span className="flex items-center gap-1.5 ml-4.5" style={{ fontSize: 11, color: "#9ca3af" }}>
                      {s.secondaryStaff} (S)
                    </span>
                  )}
                </div>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold"
                  style={{ background: svc.bg, color: svc.color, fontSize: 11 }}>
                  {svc.label}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Timeline View ────────────────────────────────────────────────────────────
function TimelineView({ shifts, navigate }) {
  const TODAY = todayStr();
  const tomorrow = addDays(TODAY, 1);
  const weekEnd = addDays(TODAY, 7);

  const upcoming = shifts
    .filter((s) => s.date >= TODAY && !["completed", "cancelled", "missed"].includes(s.status))
    .sort((a, b) => a.date.localeCompare(b.date) || (a.timeStart || "").localeCompare(b.timeStart || ""));

  const groups = [
    { label: "Today",     items: upcoming.filter((s) => s.date === TODAY) },
    { label: "Tomorrow",  items: upcoming.filter((s) => s.date === tomorrow) },
    { label: "This Week", items: upcoming.filter((s) => s.date > tomorrow && s.date <= weekEnd) },
    { label: "Later",     items: upcoming.filter((s) => s.date > weekEnd) },
  ].filter((g) => g.items.length > 0);

  return (
    <div className="flex flex-col gap-6 p-5">
      <ShiftGridHeader showDate={false} />
      {groups.map((group) => {
        const needsDate = group.label === "This Week" || group.label === "Later";
        return (
          <div key={group.label}>
            <div className="flex items-center gap-3 mb-2">
              <p className="font-bold" style={{ fontSize: 13, color: "#374151" }}>{group.label}</p>
              <span className="px-2 py-0.5 rounded-full font-semibold"
                style={{ background: "#f3f4f6", color: "#6b7280", fontSize: 11 }}>
                {group.items.length}
              </span>
              <div className="flex-1 h-px" style={{ background: "#f3f4f6" }} />
            </div>
            {group.items.map((s) => (
              <ShiftGridRow key={s.id} shift={s} showDate={needsDate} navigate={navigate} />
            ))}
          </div>
        );
      })}
    </div>
  );
}

// ─── Upcoming Panel ───────────────────────────────────────────────────────────
function UpcomingPanel({ shifts, navigate }) {
  const TODAY = todayStr();
  const tomorrow = addDays(TODAY, 1);
  const weekEnd = addDays(TODAY, 7);

  const groups = useMemo(() => {
    const upcoming = shifts
      .filter((s) => s.date >= TODAY && !["completed", "cancelled", "missed"].includes(s.status))
      .sort((a, b) => a.date.localeCompare(b.date) || (a.timeStart || "").localeCompare(b.timeStart || ""));
    return [
      { label: "Today",     color: "#16a34a", items: upcoming.filter((s) => s.date === TODAY) },
      { label: "Tomorrow",  color: "#2563eb", items: upcoming.filter((s) => s.date === tomorrow) },
      { label: "This Week", color: "#7c3aed", items: upcoming.filter((s) => s.date > tomorrow && s.date <= weekEnd) },
      { label: "Later",     color: "#6b7280", items: upcoming.filter((s) => s.date > weekEnd) },
    ].filter((g) => g.items.length > 0);
  }, [shifts]);

  const total = groups.reduce((n, g) => n + g.items.length, 0);

  return (
    <div className="flex flex-col bg-white rounded-xl border overflow-hidden"
      style={{ borderColor: "#e5e7eb", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", height: "100%" }}>
      <div className="px-4 py-3.5 border-b flex items-center justify-between flex-shrink-0"
        style={{ borderColor: "#f3f4f6" }}>
        <div>
          <p className="font-bold" style={{ fontSize: 14, color: "#111827" }}>Upcoming Shifts</p>
          <p style={{ fontSize: 11, color: "#6b7280", marginTop: 1 }}>Sorted chronologically</p>
        </div>
        <span className="px-2 py-0.5 rounded-full font-semibold"
          style={{ background: "#f3f4f6", color: "#374151", fontSize: 11 }}>
          {total}
        </span>
      </div>
      <div className="overflow-y-auto px-3 py-3 flex flex-col gap-4" style={{ flex: 1 }}>
        {groups.map((group) => (
          <div key={group.label}>
            <div className="flex items-center gap-2 mb-2 px-1">
              <span className="rounded-full flex-shrink-0"
                style={{ width: 7, height: 7, background: group.color, display: "inline-block" }} />
              <p className="font-bold" style={{ fontSize: 11, color: "#374151" }}>{group.label}</p>
              <span style={{ fontSize: 10, color: "#9ca3af", fontWeight: 600 }}>({group.items.length})</span>
            </div>
            {group.items.map((s) => <ShiftCompactRow key={s.id} shift={s} navigate={navigate} />)}
          </div>
        ))}
        {total === 0 && (
          <p className="text-center py-8" style={{ fontSize: 13, color: "#9ca3af" }}>No upcoming shifts</p>
        )}
      </div>
    </div>
  );
}

// ─── Past Shifts View ─────────────────────────────────────────────────────────
function PastShiftsFullView({ shifts, navigate }) {
  const TODAY = todayStr();
  const past = shifts
    .filter((s) => s.date < TODAY || ["completed", "cancelled", "missed"].includes(s.status))
    .sort((a, b) => b.date.localeCompare(a.date));

  const completed = past.filter((s) => s.status === "completed").length;
  const cancelled = past.filter((s) => s.status === "cancelled").length;
  const missed    = past.filter((s) => s.status === "missed").length;

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
  const totalPages = Math.ceil(past.length / itemsPerPage);
  const paginatedShifts = past.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const renderPagination = () => {
    if (totalPages <= 1) return null;
    return (
      <div className="flex items-center justify-between border-t space-x-2 px-6 py-3" style={{ borderColor: "#f3f4f6" }}>
        <button
          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
          disabled={currentPage === 1}
          className="px-3 py-1.5 text-sm border rounded-md disabled:opacity-50 font-semibold transition-colors hover:bg-gray-50 bg-white"
          style={{ borderColor: "#e5e7eb", color: "#374151" }}
        >
          Previous
        </button>
        <div className="flex gap-1" style={{ fontSize: 13, color: "#6b7280" }}>
           Page <span className="font-bold" style={{ color: "#111827" }}>{currentPage}</span> of <span className="font-bold" style={{ color: "#111827" }}>{totalPages}</span>
        </div>
        <button
          onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
          disabled={currentPage === totalPages}
          className="px-3 py-1.5 text-sm border rounded-md disabled:opacity-50 font-semibold transition-colors hover:bg-gray-50 bg-white"
          style={{ borderColor: "#e5e7eb", color: "#374151" }}
        >
          Next
        </button>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-xl border overflow-hidden"
      style={{ borderColor: "#e5e7eb", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
      <div className="flex items-center gap-4 px-6 py-4 border-b" style={{ borderColor: "#f3f4f6" }}>
        <p className="font-bold" style={{ fontSize: 15, color: "#111827" }}>Past Shifts Snapshot</p>
        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full font-semibold"
          style={{ background: "#f3f4f6", color: "#6b7280", fontSize: 11 }}>
          <CheckCircle2 size={10} /> {completed} Completed
        </span>
        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full font-semibold"
          style={{ background: "#fef2f2", color: "#dc2626", fontSize: 11 }}>
          <XCircle size={10} /> {cancelled} Cancelled
        </span>
        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full font-semibold"
          style={{ background: "#fff1f2", color: "#e11d48", fontSize: 11 }}>
          <AlertTriangle size={10} /> {missed} Missed
        </span>
      </div>
      <div className="px-4 py-4 min-h-[400px]">
        <ShiftGridHeader showDate />
        {past.length === 0 ? (
          <p className="text-center py-10" style={{ fontSize: 13, color: "#9ca3af" }}>No past shifts found</p>
        ) : (
          paginatedShifts.map((s) => <ShiftGridRow key={s.id} shift={s} showDate navigate={navigate} />)
        )}
      </div>
      {renderPagination()}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ShiftCommandPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const serviceParam = searchParams.get("service");
  const initialFilter = serviceParam ? serviceNameToKey(serviceParam) : "all";

  const [view, setView]     = useState("month");
  const [calYear, setCalYear]   = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [anchorDate, setAnchorDate] = useState(todayStr());
  const [filterService, setFilterService] = useState(initialFilter);
  const [rawShifts, setRawShifts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchShifts = async () => {
      setLoading(true);
      try {
        const snap = await getDocs(collection(db, "shifts"));
        const list = snap.docs.map((d) => {
          const data = d.data();
          const dateStr = toDateStr(data.startDate) || toDateStr(data.date);
          const serviceKey = normaliseCategoryKey(data.categoryName || data.shiftCategory || "");
          const status = normaliseStatus(data);
          return {
            id: d.id,
            date: dateStr || todayStr(),
            timeStart: data.startTime || "",
            timeEnd: data.endTime || "",
            staff: data.primaryUserName || data.name || data.assignedUser || data.staffName || "",
            secondaryStaff: data.secondaryUserName || "",
            client: data.clientName || data.clientDetails?.name || "",
            serviceKey,
            status,
          };
        });
        setRawShifts(list);
      } catch (e) {
        console.error("Error fetching shifts:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchShifts();
  }, []);

  const filteredShifts = useMemo(
    () => filterService === "all" ? rawShifts : rawShifts.filter((s) => s.serviceKey === filterService),
    [rawShifts, filterService]
  );

  const TODAY = todayStr();
  const isPastView = view === "past";
  const isTimeline = view === "timeline";

  const prevPeriod = () => {
    if (view === "month") {
      if (calMonth === 0) { setCalMonth(11); setCalYear((y) => y - 1); }
      else setCalMonth((m) => m - 1);
    } else if (view === "week") {
      setAnchorDate((d) => addDays(d, -7));
    } else {
      setAnchorDate((d) => addDays(d, -1));
    }
  };

  const nextPeriod = () => {
    if (view === "month") {
      if (calMonth === 11) { setCalMonth(0); setCalYear((y) => y + 1); }
      else setCalMonth((m) => m + 1);
    } else if (view === "week") {
      setAnchorDate((d) => addDays(d, 7));
    } else {
      setAnchorDate((d) => addDays(d, 1));
    }
  };

  const periodLabel = () => {
    if (view === "month") return `${monthName(calYear, calMonth)} ${calYear}`;
    if (view === "week") {
      const w = getWeekDates(anchorDate);
      const s = new Date(w[0] + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
      const e = new Date(w[6] + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
      return `${s} – ${e}`;
    }
    if (view === "today") {
      return new Date(TODAY + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
    }
    return "All Upcoming Shifts";
  };

  const viewBtns = [
    { key: "today",    label: "Today",       icon: <CalendarDays size={13} /> },
    { key: "week",     label: "Week",        icon: <Columns3 size={13} /> },
    { key: "month",    label: "Month",       icon: <Calendar size={13} /> },
    { key: "timeline", label: "Timeline",    icon: <LayoutList size={13} /> },
    { key: "past",     label: "Past Shifts", icon: <History size={13} />, isPast: true },
  ];

  return (
    <div
      className="flex flex-col gap-4 pb-4"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      {/* Page Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-bold" style={{ fontSize: 22, color: "#111827", letterSpacing: "-0.02em" }}>
            Shift Schedule
          </h1>
          <p style={{ fontSize: 13, color: "#6b7280", marginTop: 2 }}>
            Manage, monitor, and plan all staff shifts across services
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate("/admin-dashboard/add/add-user")}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border font-semibold text-xs transition-colors hover:bg-gray-50"
            style={{ borderColor: "#e5e7eb", color: "#374151" }}>
            <Plus size={13} /> Add Staff
          </button>
          <button
            onClick={() => navigate("/admin-dashboard/add/add-user-shift")}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg font-semibold text-xs text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: "#1f7a3c" }}>
            <Plus size={13} /> Add Shift
          </button>
        </div>
      </div>

      {/* KPI Strip */}
      {loading ? (
        <div className="grid grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border px-4 py-3 h-[72px] animate-pulse"
              style={{ borderColor: "#e5e7eb" }} />
          ))}
        </div>
      ) : (
        <ShiftKPIStrip shifts={rawShifts} />
      )}

      {/* View Controls Bar */}
      <div
        className="flex items-center justify-between gap-3 bg-white rounded-xl border px-4 py-2.5"
        style={{ borderColor: "#e5e7eb", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
      >
        {/* Left — navigation */}
        <div className="flex items-center gap-2">
          {!isPastView ? (
            <>
              <button onClick={prevPeriod}
                className="p-1.5 rounded-lg border hover:bg-gray-50 transition-colors"
                style={{ borderColor: "#e5e7eb" }}>
                <ChevronLeft size={15} style={{ color: "#374151" }} />
              </button>
              <span className="font-bold px-1" style={{ fontSize: 13, color: "#111827", minWidth: 180 }}>
                {periodLabel()}
              </span>
              <button onClick={nextPeriod}
                className="p-1.5 rounded-lg border hover:bg-gray-50 transition-colors"
                style={{ borderColor: "#e5e7eb" }}>
                <ChevronRight size={15} style={{ color: "#374151" }} />
              </button>
              <button
                onClick={() => { setCalYear(new Date().getFullYear()); setCalMonth(new Date().getMonth()); setAnchorDate(todayStr()); }}
                className="ml-1 px-3 py-1.5 rounded-lg border font-semibold hover:bg-gray-50 transition-colors"
                style={{ borderColor: "#e5e7eb", fontSize: 12, color: "#374151" }}>
                Today
              </button>
            </>
          ) : (
            <span className="flex items-center gap-2 font-bold" style={{ fontSize: 13, color: "#111827" }}>
              <History size={15} style={{ color: "#6b7280" }} /> Recent History
            </span>
          )}
        </div>

        {/* Centre — view toggle */}
        <div className="flex items-center gap-0.5 p-1 rounded-lg"
          style={{ background: "#f9fafb", border: "1px solid #f3f4f6" }}>
          {viewBtns.filter((v) => !v.isPast).map((v) => (
            <button key={v.key} onClick={() => setView(v.key)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition-all"
              style={{
                fontSize: 12,
                background: view === v.key ? "#fff" : "transparent",
                color: view === v.key ? "#111827" : "#9ca3af",
                boxShadow: view === v.key ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
              }}>
              {v.icon} {v.label}
            </button>
          ))}
          <div className="mx-1 self-stretch" style={{ width: 1, background: "#e5e7eb" }} />
          {viewBtns.filter((v) => v.isPast).map((v) => (
            <button key={v.key} onClick={() => setView(v.key)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition-all"
              style={{
                fontSize: 12,
                background: view === v.key ? "#fef3c7" : "transparent",
                color: view === v.key ? "#92400e" : "#6b7280",
                boxShadow: view === v.key ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
              }}>
              {v.icon} {v.label}
            </button>
          ))}
        </div>

        {/* Right — service filter */}
        <div className="flex items-center gap-2">
          <Filter size={13} style={{ color: "#9ca3af" }} />
          <select
            value={filterService}
            onChange={(e) => setFilterService(e.target.value)}
            className="px-3 py-1.5 rounded-lg border focus:outline-none"
            style={{ borderColor: "#e5e7eb", fontSize: 12, color: "#374151", fontFamily: "inherit", fontWeight: 600 }}>
            <option value="all">All Services</option>
            <option value="emergency">Emergent Care</option>
            <option value="respite">Respite Care</option>
            <option value="supervised">Supervised Visitation</option>
            <option value="transportation">Transportation</option>
          </select>
        </div>
      </div>

      {/* Legend */}
      {!isPastView && (
        <div className="flex items-center gap-5 flex-wrap">
          {Object.entries(SERVICE_CFG).filter(([k]) => k !== "other").map(([key, cfg]) => (
            <div key={key} className="flex items-center gap-1.5">
              <span className="rounded-full" style={{ width: 8, height: 8, background: cfg.color, display: "inline-block", flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: "#6b7280", fontWeight: 600 }}>{cfg.label}</span>
            </div>
          ))}
          <div style={{ width: 1, height: 12, background: "#e5e7eb", flexShrink: 0 }} />
          {Object.entries(STATUS_CFG).map(([key, cfg]) => (
            <span key={key} className="inline-flex items-center px-2 py-0.5 rounded font-semibold"
              style={{ background: cfg.bg, color: cfg.text, fontSize: 10 }}>
              {cfg.label}
            </span>
          ))}
        </div>
      )}

      {/* Past Shifts full view */}
      {isPastView && (
        <PastShiftsFullView shifts={filteredShifts} navigate={navigate} />
      )}

      {/* Main 2-pane area */}
      {!isPastView && (
        <div className="flex gap-4 items-start">
          {/* Calendar / Content pane */}
          <div
            className="flex-1 bg-white rounded-xl border overflow-hidden"
            style={{ borderColor: "#e5e7eb", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", minWidth: 0 }}
          >
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin w-6 h-6 rounded-full border-2 border-emerald-600 border-t-transparent" />
              </div>
            ) : (
              <>
                {view === "month"    && <MonthCalendar year={calYear} month={calMonth} shifts={filteredShifts} navigate={navigate} />}
                {view === "week"     && <WeekView anchorDate={anchorDate} shifts={filteredShifts} navigate={navigate} />}
                {view === "today"    && <TodayView shifts={filteredShifts} navigate={navigate} />}
                {view === "timeline" && <TimelineView shifts={filteredShifts} navigate={navigate} />}
              </>
            )}
          </div>

          {/* Right upcoming panel — hidden in timeline */}
          {!isTimeline && (
            <div style={{ width: 296, flexShrink: 0 }}>
              <UpcomingPanel shifts={filteredShifts} navigate={navigate} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
