import { useState, useEffect, useMemo, useRef } from "react";
import {
  DollarSign, Users, TrendingUp, Download, Search, ChevronDown,
  ChevronLeft, ChevronRight, Calendar, Clock, CheckCircle2, AlertCircle,
} from "lucide-react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";

const fmtC = (v) =>
  new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v || 0);

const fmtC2 = (v) =>
  new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v || 0);

const STATUS_CONFIG = {
  Paid:    { bg: "#dcfce7", color: "#16a34a", border: "#bbf7d0" },
  Pending: { bg: "#fef3c7", color: "#d97706", border: "#fde68a" },
  Overdue: { bg: "#fee2e2", color: "#dc2626", border: "#fecaca" },
};

function StatusBadge({ status }) {
  const s = STATUS_CONFIG[status] || STATUS_CONFIG.Pending;
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border"
      style={{ backgroundColor: s.bg, color: s.color, borderColor: s.border }}
    >
      {status}
    </span>
  );
}

function KPICard({ icon, label, value, sub, bg, iconColor }) {
  return (
    <div className="bg-white rounded-xl p-4 border" style={{ borderColor: "#e5e7eb" }}>
      <div className="flex items-start justify-between mb-3">
        <div
          className="flex items-center justify-center rounded-xl"
          style={{ width: 40, height: 40, backgroundColor: bg }}
        >
          <span style={{ color: iconColor }}>{icon}</span>
        </div>
      </div>
      <p className="font-bold" style={{ fontSize: 22, color: "#111827", lineHeight: 1 }}>{value}</p>
      <p className="mt-1" style={{ fontSize: 12, color: "#6b7280", fontWeight: 500 }}>{label}</p>
      {sub && <p className="mt-0.5" style={{ fontSize: 11, color: "#9ca3af" }}>{sub}</p>}
    </div>
  );
}

export default function Payroll() {
  const [users, setUsers] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [statusOpen, setStatusOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [period, setPeriod] = useState("this-month");
  const statusDropdownRef = useRef(null);

  useEffect(() => {
    const h = (e) => { if (statusDropdownRef.current && !statusDropdownRef.current.contains(e.target)) setStatusOpen(false); };
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

  // Build payroll records per staff member
  const payrollRecords = useMemo(() => {
    return users.map((user) => {
      const userShifts = shifts.filter(
        (s) =>
          s.userId === user.id ||
          s.assignedUser === user.name ||
          s.name === user.name ||
          s.staffName === user.name
      );
      const completedShifts = userShifts.filter((s) => s.clockIn && s.clockOut);
      const hoursWorked = completedShifts.reduce((sum, s) => {
        const h = parseFloat(s.hoursWorked || s.duration || 0);
        return sum + (isNaN(h) ? 8 : h);
      }, 0);
      const rate = parseFloat(user.salaryPerHour || 0);
      const gross = hoursWorked * rate;
      const tax = gross * 0.19;
      const net = gross - tax;
      const status = user.payrollStatus || (gross > 0 ? "Pending" : "Pending");

      return {
        id: user.id,
        name: user.name || "Unknown",
        role: user.role || "Staff",
        gender: user.gender,
        shifts: userShifts.length,
        completedShifts: completedShifts.length,
        hoursWorked: Math.round(hoursWorked * 10) / 10,
        rate,
        gross,
        tax,
        net,
        status,
        phone: user.phone,
      };
    }).filter((r) => r.gross > 0 || r.shifts > 0);
  }, [users, shifts]);

  const totalGross = payrollRecords.reduce((s, r) => s + r.gross, 0);
  const totalNet = payrollRecords.reduce((s, r) => s + r.net, 0);
  const totalHours = payrollRecords.reduce((s, r) => s + r.hoursWorked, 0);
  const pendingCount = payrollRecords.filter((r) => r.status === "Pending").length;

  const filtered = payrollRecords.filter((r) => {
    const searchMatch = !search
      || r.name.toLowerCase().includes(search.toLowerCase())
      || r.phone?.toLowerCase().includes(search.toLowerCase());
    const statusMatch = statusFilter === "All" || r.status === statusFilter;
    return searchMatch && statusMatch;
  });

  const ITEMS_PER_PAGE = 10;
  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const startIdx = (currentPage - 1) * ITEMS_PER_PAGE;
  const current = filtered.slice(startIdx, startIdx + ITEMS_PER_PAGE);

  const changePage = (p) => setCurrentPage(Math.min(Math.max(1, p), totalPages));

  return (
    <div
      className="flex flex-col h-full"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", backgroundColor: "#f9fafb" }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-6 py-4 bg-white border-b shrink-0"
        style={{ borderColor: "#e5e7eb" }}
      >
        <div>
          <h1 className="font-bold" style={{ fontSize: 18, color: "#111827" }}>Payroll</h1>
          <p style={{ fontSize: 13, color: "#6b7280", marginTop: 2 }}>
            Manage staff compensation and payroll records
          </p>
        </div>
        <button
          className="flex items-center gap-2 px-4 py-2 rounded-lg border font-semibold text-xs transition-colors hover:bg-gray-50"
          style={{ borderColor: "#e5e7eb", color: "#374151" }}
        >
          <Download size={14} />
          Export Payroll
        </button>
      </div>

      <div className="flex-1 overflow-auto px-6 py-5 space-y-5">
        {/* KPI Strip */}
        <div className="grid grid-cols-4 gap-4">
          <KPICard
            icon={<DollarSign size={18} />}
            label="Total Gross Pay"
            value={fmtC(totalGross)}
            bg="#f0fdf4" iconColor="#1f7a3c"
          />
          <KPICard
            icon={<TrendingUp size={18} />}
            label="Total Net Pay"
            value={fmtC(totalNet)}
            sub="After 19% estimated tax"
            bg="#eff6ff" iconColor="#3b82f6"
          />
          <KPICard
            icon={<Clock size={18} />}
            label="Total Hours"
            value={`${Math.round(totalHours)}h`}
            bg="#faf5ff" iconColor="#9333ea"
          />
          <KPICard
            icon={<AlertCircle size={18} />}
            label="Pending Payroll"
            value={pendingCount}
            sub="Records awaiting payment"
            bg="#fff7ed" iconColor="#ea580c"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center justify-between gap-4">
          <div className="relative" style={{ width: 280 }}>
            <Search
              size={14}
              style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }}
            />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
              placeholder="Search by name or phone…"
              className="w-full rounded-lg border focus:outline-none bg-white"
              style={{
                paddingLeft: 30, paddingRight: 10, paddingTop: 7, paddingBottom: 7,
                fontSize: 13, borderColor: "#e5e7eb", color: "#111827",
              }}
            />
          </div>

          <div className="relative" ref={statusDropdownRef}>
            <button
              onClick={() => setStatusOpen((o) => !o)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium bg-white"
              style={{ borderColor: "#e5e7eb", color: "#374151" }}
            >
              Status: <span style={{ color: "#1f7a3c" }}>{statusFilter}</span>
              <ChevronDown size={13} style={{ color: "#9ca3af" }} />
            </button>
            {statusOpen && (
              <div className="absolute right-0 top-9 bg-white border rounded-lg shadow-lg z-50 min-w-[130px]"
                style={{ borderColor: "#e5e7eb" }}>
                {["All", "Paid", "Pending", "Overdue"].map((o) => (
                  <button key={o} onClick={() => { setStatusFilter(o); setStatusOpen(false); setCurrentPage(1); }}
                    className="w-full text-left px-4 py-2 text-xs hover:bg-gray-50"
                    style={{ color: "#374151" }}>
                    {o}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: "#e5e7eb" }}>
          <table className="w-full border-collapse">
            <thead>
              <tr style={{ backgroundColor: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                {["Staff Member", "Role", "Shifts", "Hours Worked", "Rate/hr", "Gross Pay", "Tax (19%)", "Net Pay", "Status"].map((h) => (
                  <th
                    key={h}
                    className="text-left px-4 py-3 font-semibold whitespace-nowrap"
                    style={{ fontSize: 12, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em" }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="text-center py-16" style={{ color: "#9ca3af", fontSize: 14 }}>
                    Loading payroll data…
                  </td>
                </tr>
              ) : current.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-16" style={{ color: "#9ca3af", fontSize: 14 }}>
                    No payroll records found
                  </td>
                </tr>
              ) : (
                current.map((rec) => (
                  <tr
                    key={rec.id}
                    className="transition-colors hover:bg-gray-50"
                    style={{ borderBottom: "1px solid #f3f4f6" }}
                  >
                    <td className="px-4 py-3">
                      <span className="font-semibold" style={{ fontSize: 13, color: "#111827" }}>
                        {rec.name}
                      </span>
                    </td>
                    <td className="px-4 py-3" style={{ fontSize: 13, color: "#6b7280" }}>
                      {rec.role}
                    </td>
                    <td className="px-4 py-3">
                      <span style={{ fontSize: 13, color: "#374151", fontWeight: 600 }}>
                        {rec.completedShifts}
                        <span style={{ color: "#9ca3af", fontWeight: 400 }}>/{rec.shifts}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3" style={{ fontSize: 13, color: "#374151", fontWeight: 600 }}>
                      {rec.hoursWorked}h
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-0.5" style={{ fontSize: 13, color: "#374151", fontWeight: 600 }}>
                        <DollarSign size={12} style={{ color: "#9ca3af" }} />
                        {rec.rate || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3" style={{ fontSize: 13, color: "#111827", fontWeight: 700 }}>
                      {fmtC2(rec.gross)}
                    </td>
                    <td className="px-4 py-3" style={{ fontSize: 13, color: "#dc2626" }}>
                      −{fmtC2(rec.tax)}
                    </td>
                    <td className="px-4 py-3" style={{ fontSize: 13, color: "#16a34a", fontWeight: 700 }}>
                      {fmtC2(rec.net)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={rec.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>

            {/* Totals row */}
            {!loading && current.length > 0 && (
              <tfoot>
                <tr style={{ backgroundColor: "#f9fafb", borderTop: "2px solid #e5e7eb" }}>
                  <td className="px-4 py-3 font-bold" style={{ fontSize: 13, color: "#111827" }} colSpan={5}>
                    Totals
                  </td>
                  <td className="px-4 py-3 font-bold" style={{ fontSize: 13, color: "#111827" }}>
                    {fmtC2(current.reduce((s, r) => s + r.gross, 0))}
                  </td>
                  <td className="px-4 py-3 font-bold" style={{ fontSize: 13, color: "#dc2626" }}>
                    −{fmtC2(current.reduce((s, r) => s + r.tax, 0))}
                  </td>
                  <td className="px-4 py-3 font-bold" style={{ fontSize: 13, color: "#16a34a" }}>
                    {fmtC2(current.reduce((s, r) => s + r.net, 0))}
                  </td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div
        className="flex items-center justify-between px-6 py-3 bg-white border-t shrink-0"
        style={{ borderColor: "#e5e7eb" }}
      >
        <p style={{ fontSize: 13, color: "#6b7280" }}>
          Showing {startIdx + 1}–{Math.min(startIdx + ITEMS_PER_PAGE, filtered.length)} of {filtered.length}
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => changePage(currentPage - 1)}
            disabled={currentPage === 1}
            className="flex items-center justify-center w-8 h-8 rounded-lg border transition-colors hover:bg-gray-50 disabled:opacity-40"
            style={{ borderColor: "#e5e7eb" }}
          >
            <ChevronLeft size={15} style={{ color: "#374151" }} />
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
            .reduce((acc, p, idx, arr) => {
              if (idx > 0 && p - arr[idx - 1] > 1) acc.push("…");
              acc.push(p);
              return acc;
            }, [])
            .map((p, i) =>
              p === "…" ? (
                <span key={`d-${i}`} style={{ fontSize: 13, color: "#9ca3af", padding: "0 4px" }}>…</span>
              ) : (
                <button
                  key={p}
                  onClick={() => changePage(p)}
                  className="w-8 h-8 rounded-lg font-semibold text-xs transition-colors"
                  style={{
                    backgroundColor: currentPage === p ? "#1f7a3c" : "transparent",
                    color: currentPage === p ? "#fff" : "#374151",
                    border: currentPage === p ? "none" : "1px solid #e5e7eb",
                  }}
                >
                  {p}
                </button>
              )
            )}
          <button
            onClick={() => changePage(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="flex items-center justify-center w-8 h-8 rounded-lg border transition-colors hover:bg-gray-50 disabled:opacity-40"
            style={{ borderColor: "#e5e7eb" }}
          >
            <ChevronRight size={15} style={{ color: "#374151" }} />
          </button>
        </div>
      </div>
    </div>
  );
}
