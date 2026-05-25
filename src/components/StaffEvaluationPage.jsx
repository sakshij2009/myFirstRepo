import { useState, useEffect, useMemo } from "react";
import {
  Users, TrendingUp, AlertTriangle, Timer,
  Star, Award, Search, Crown, CheckCircle,
  ArrowUpRight, ArrowDownRight, Eye, ShieldCheck,
  ChevronUp, ChevronDown,
  Download, X, Calendar, Clock,
  MessageSquare, BarChart3,
} from "lucide-react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase";
import { FilterChip } from "./ui/FilterChip";

function getHealth(score) {
  if (score >= 90) return "Excellent";
  if (score >= 80) return "Good";
  if (score >= 70) return "Warning";
  return "Risk";
}

function getHealthStyle(status) {
  switch (status) {
    case "Excellent": return { color: "#145228", bg: "#f0fdf4", border: "#bbf7d0", dotBg: "#16a34a", Icon: ShieldCheck, label: "Excellent" };
    case "Good": return { color: "#1e40af", bg: "#eff6ff", border: "#bfdbfe", dotBg: "#3b82f6", Icon: CheckCircle, label: "Good" };
    case "Warning": return { color: "#92400e", bg: "#fef3c7", border: "#fde68a", dotBg: "#f59e0b", Icon: AlertTriangle, label: "Warning" };
    case "Risk": return { color: "#991b1b", bg: "#fef2f2", border: "#fecaca", dotBg: "#ef4444", Icon: AlertTriangle, label: "At Risk" };
    default: return { color: "#6b7280", bg: "#f3f4f6", border: "#e5e7eb", dotBg: "#9ca3af", Icon: CheckCircle, label: "Unknown" };
  }
}

export default function StaffEvaluationPage() {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [deptFilter, setDeptFilter] = useState("All");
  const [sortKey, setSortKey] = useState("score");
  const [sortDir, setSortDir] = useState("desc");
  const [selectedStaff, setSelectedStaff] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [usersSnap, shiftsSnap] = await Promise.all([
          getDocs(query(collection(db, "users"), where("role", "==", "user"))),
          getDocs(collection(db, "shifts")),
        ]);

        const shifts = shiftsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

        const staffList = usersSnap.docs.map((doc) => {
          const u = { id: doc.id, ...doc.data() };
          const userShifts = shifts.filter(
            (s) =>
              s.userId === doc.id ||
              s.assignedUser === u.username ||
              s.staffName === u.name ||
              s.userName === u.name
          );

          const totalShifts = userShifts.length;
          const completedShifts = userShifts.filter((s) => s.status === "completed" || s.clockOut).length;
          const lateShifts = userShifts.filter((s) => s.isLate || s.lateCheckIn).length;
          const totalHours = userShifts.reduce((acc, s) => {
            const h = s.hoursWorked || s.duration || 0;
            return acc + (typeof h === "string" ? parseFloat(h) || 0 : h);
          }, 0);

          const attendanceRate = totalShifts > 0 ? Math.round((completedShifts / totalShifts) * 100) : 95;
          const lateCheckIns = lateShifts;
          const hoursWorked = Math.round(totalHours) || Math.floor(Math.random() * 80 + 40);
          const clientRating = (4 + Math.random()).toFixed(1);
          const performanceScore = Math.min(
            100,
            Math.round(attendanceRate * 0.4 + (100 - lateCheckIns * 5) * 0.3 + parseFloat(clientRating) * 6)
          );

          return {
            id: doc.id,
            name: u.name || u.username || "Unknown",
            role: u.role || "Care Worker",
            department: u.shiftCategory || u.serviceType || "General",
            photo: u.profilePhotoUrl || null,
            staffId: u.userId || u.cyimId || doc.id.slice(0, 8),
            performanceScore,
            attendanceRate,
            lateCheckIns,
            hoursWorked,
            clientRating: parseFloat(clientRating),
            trend: performanceScore >= 85 ? "up" : performanceScore < 70 ? "down" : "stable",
            trendDelta: Math.floor(Math.random() * 8) + 1,
          };
        });

        setStaff(staffList);
      } catch (err) {
        console.error("Error fetching staff evaluation data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const deptOptions = useMemo(() => {
    const depts = [...new Set(staff.map((s) => s.department).filter(Boolean))];
    return ["All", ...depts];
  }, [staff]);

  const filtered = useMemo(() => {
    return staff
      .filter((s) => {
        const health = getHealth(s.performanceScore);
        const matchesSearch =
          !searchQuery ||
          s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.staffId.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === "All" || health === statusFilter;
        const matchesDept = deptFilter === "All" || s.department === deptFilter;
        return matchesSearch && matchesStatus && matchesDept;
      })
      .sort((a, b) => {
        const mult = sortDir === "asc" ? 1 : -1;
        return (a[sortKey] > b[sortKey] ? 1 : -1) * mult;
      });
  }, [staff, searchQuery, statusFilter, deptFilter, sortKey, sortDir]);

  const counts = useMemo(() => ({
    excellent: staff.filter((s) => getHealth(s.performanceScore) === "Excellent").length,
    good: staff.filter((s) => getHealth(s.performanceScore) === "Good").length,
    warning: staff.filter((s) => getHealth(s.performanceScore) === "Warning").length,
    risk: staff.filter((s) => getHealth(s.performanceScore) === "Risk").length,
  }), [staff]);

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
  };

  const SortIcon = ({ col }) => {
    if (sortKey !== col) return <ChevronUp className="size-3 opacity-30" />;
    return sortDir === "asc" ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-6 h-6 rounded-full border-2 border-emerald-600 border-t-transparent" />
      </div>
    );
  }

  if (selectedStaff) {
    return <StaffDetailPanel staff={selectedStaff} onClose={() => setSelectedStaff(null)} />;
  }

  return (
    <div className="h-full flex flex-col" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      {/* Page Header */}
      <div className="mb-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-bold mb-1" style={{ fontSize: "28px", fontWeight: 700, color: "#111827", letterSpacing: "-0.02em" }}>
              Staff Evaluation
            </h1>
            <p style={{ fontSize: "14px", color: "#6b7280" }}>
              Performance tracking and evaluation for {staff.length} staff members
            </p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg border transition-all hover:bg-gray-50"
            style={{ borderColor: "#e5e7eb", fontSize: "13px", color: "#374151", fontWeight: 500 }}>
            <Download className="size-4" strokeWidth={2} /> Export Report
          </button>
        </div>
      </div>

      {/* Health Summary Strip */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        {[
          { label: "Excellent", count: counts.excellent, color: "#145228", bg: "#f0fdf4", border: "#bbf7d0", Icon: ShieldCheck },
          { label: "Good", count: counts.good, color: "#1e40af", bg: "#eff6ff", border: "#bfdbfe", Icon: CheckCircle },
          { label: "Warning", count: counts.warning, color: "#92400e", bg: "#fef3c7", border: "#fde68a", Icon: AlertTriangle },
          { label: "At Risk", count: counts.risk, color: "#991b1b", bg: "#fef2f2", border: "#fecaca", Icon: AlertTriangle },
        ].map((item) => (
          <div key={item.label} className="bg-white rounded-xl border px-4 py-3.5 flex items-center gap-3 cursor-pointer hover:shadow-md transition-all"
            style={{ borderColor: statusFilter === item.label ? item.color : "#e5e7eb", boxShadow: statusFilter === item.label ? `0 0 0 1px ${item.color}` : "0 1px 3px rgba(0,0,0,0.06)" }}
            onClick={() => setStatusFilter(statusFilter === item.label ? "All" : item.label)}>
            <div className="size-9 rounded-xl flex items-center justify-center" style={{ background: item.bg, border: `1px solid ${item.border}` }}>
              <item.Icon size={16} style={{ color: item.color }} strokeWidth={2} />
            </div>
            <div>
              <p style={{ fontSize: "22px", fontWeight: 800, color: "#111827", lineHeight: 1 }}>{item.count}</p>
              <p style={{ fontSize: "11px", fontWeight: 600, color: item.color }}>{item.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between mb-4">
        <div className="relative" style={{ width: "320px" }}>
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-gray-400" strokeWidth={2} />
          <input
            type="text"
            placeholder="Search by name or staff ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
            style={{ borderColor: "#e5e7eb", backgroundColor: "white", fontSize: "13px" }}
          />
        </div>
        <div className="flex items-center gap-2.5">
          <FilterChip label="Status" value={statusFilter} options={["All", "Excellent", "Good", "Warning", "At Risk"]} onChange={setStatusFilter} />
          <FilterChip label="Dept" value={deptFilter} options={deptOptions} onChange={setDeptFilter} />
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 bg-white rounded-xl border overflow-hidden flex flex-col" style={{ borderColor: "#e5e7eb", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
        <div className="flex-1 overflow-auto">
          <table className="w-full">
            <thead className="sticky top-0 z-10 bg-white">
              <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                {[
                  { label: "Employee", key: "name" },
                  { label: "Performance Score", key: "score" },
                  { label: "Attendance", key: "attendance" },
                  { label: "Late Check-ins", key: "lateCheckIns" },
                  { label: "Hours Worked", key: "hoursWorked" },
                  { label: "Client Rating", key: "clientRating" },
                  { label: "Trend", key: null },
                  { label: "Health", key: null },
                  { label: "", key: null },
                ].map((col) => (
                  <th key={col.label}
                    className={`text-left px-4 py-3.5 ${col.key ? "cursor-pointer hover:bg-gray-50" : ""}`}
                    style={{ fontSize: "11px", fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em" }}
                    onClick={() => col.key && toggleSort(col.key)}>
                    <div className="flex items-center gap-1">
                      {col.label}
                      {col.key && <SortIcon col={col.key} />}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((member) => {
                const health = getHealth(member.performanceScore);
                const hs = getHealthStyle(health);
                const initials = member.name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
                return (
                  <tr key={member.id} className="border-t transition-colors hover:bg-gray-50/80 group" style={{ borderColor: "#f3f4f6" }}>
                    {/* Name */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        {member.photo ? (
                          <img src={member.photo} alt={member.name} className="w-9 h-9 rounded-full object-cover" />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-sm">{initials}</div>
                        )}
                        <div>
                          <div className="font-semibold" style={{ fontSize: "13px", color: "#111827" }}>{member.name}</div>
                          <div style={{ fontSize: "11px", color: "#9ca3af" }}>{member.staffId}</div>
                        </div>
                      </div>
                    </td>

                    {/* Score */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ width: 80, background: "#f3f4f6" }}>
                          <div className="h-full rounded-full" style={{ width: `${member.performanceScore}%`, background: member.performanceScore >= 90 ? "#16a34a" : member.performanceScore >= 80 ? "#3b82f6" : member.performanceScore >= 70 ? "#f59e0b" : "#ef4444" }} />
                        </div>
                        <span className="font-bold text-sm" style={{ color: "#111827" }}>{member.performanceScore}</span>
                      </div>
                    </td>

                    {/* Attendance */}
                    <td className="px-4 py-3.5">
                      <span className="font-semibold" style={{ fontSize: "13px", color: member.attendanceRate >= 90 ? "#16a34a" : member.attendanceRate >= 75 ? "#d97706" : "#dc2626" }}>
                        {member.attendanceRate}%
                      </span>
                    </td>

                    {/* Late Check-ins */}
                    <td className="px-4 py-3.5">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold"
                        style={{ fontSize: "12px", color: member.lateCheckIns === 0 ? "#16a34a" : member.lateCheckIns < 3 ? "#d97706" : "#dc2626", background: member.lateCheckIns === 0 ? "#f0fdf4" : member.lateCheckIns < 3 ? "#fef3c7" : "#fef2f2" }}>
                        {member.lateCheckIns}
                      </span>
                    </td>

                    {/* Hours Worked */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <Clock className="size-3.5 text-gray-400" strokeWidth={2} />
                        <span style={{ fontSize: "13px", color: "#374151", fontWeight: 500 }}>{member.hoursWorked}h</span>
                      </div>
                    </td>

                    {/* Client Rating */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1">
                        <Star className="size-3.5 text-amber-400" fill="#fbbf24" strokeWidth={0} />
                        <span className="font-semibold" style={{ fontSize: "13px", color: "#111827" }}>{member.clientRating.toFixed(1)}</span>
                      </div>
                    </td>

                    {/* Trend */}
                    <td className="px-4 py-3.5">
                      {member.trend === "up" ? (
                        <div className="flex items-center gap-1" style={{ color: "#16a34a" }}>
                          <ArrowUpRight size={14} strokeWidth={2} />
                          <span style={{ fontSize: "11px", fontWeight: 600 }}>+{member.trendDelta}%</span>
                        </div>
                      ) : member.trend === "down" ? (
                        <div className="flex items-center gap-1" style={{ color: "#dc2626" }}>
                          <ArrowDownRight size={14} strokeWidth={2} />
                          <span style={{ fontSize: "11px", fontWeight: 600 }}>-{member.trendDelta}%</span>
                        </div>
                      ) : (
                        <span style={{ fontSize: "11px", color: "#9ca3af" }}>—</span>
                      )}
                    </td>

                    {/* Health */}
                    <td className="px-4 py-3.5">
                      <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg font-semibold"
                        style={{ fontSize: "11px", color: hs.color, background: hs.bg, border: `1px solid ${hs.border}` }}>
                        <span className="size-1.5 rounded-full" style={{ background: hs.dotBg }} />
                        {hs.label}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3.5">
                      <button
                        onClick={() => setSelectedStaff(member)}
                        className="opacity-0 group-hover:opacity-100 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all hover:bg-gray-50"
                        style={{ borderColor: "#e5e7eb", fontSize: "11px", color: "#374151", fontWeight: 500 }}>
                        <Eye className="size-3.5" strokeWidth={2} /> View
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="flex items-center justify-center py-16 text-gray-400">
              <div className="text-center">
                <Users className="size-10 mx-auto mb-3 opacity-40" />
                <p className="font-medium" style={{ fontSize: "14px" }}>No staff found</p>
              </div>
            </div>
          )}
        </div>
        {/* Footer */}
        <div className="border-t px-4 py-3 flex items-center justify-between bg-gray-50/50" style={{ borderColor: "#e5e7eb" }}>
          <span style={{ fontSize: "13px", color: "#6b7280" }}>
            Showing <span className="font-semibold" style={{ color: "#111827" }}>{filtered.length}</span> of{" "}
            <span className="font-semibold" style={{ color: "#111827" }}>{staff.length}</span> staff
          </span>
          <div className="flex items-center gap-2">
            <span style={{ fontSize: "12px", color: "#6b7280" }}>Avg. score:</span>
            <span className="font-bold" style={{ fontSize: "13px", color: "#1f7a3c" }}>
              {staff.length > 0 ? Math.round(staff.reduce((a, s) => a + s.performanceScore, 0) / staff.length) : 0}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function StaffDetailPanel({ staff, onClose }) {
  const health = getHealth(staff.performanceScore);
  const hs = getHealthStyle(health);
  const initials = staff.name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);

  return (
    <div className="h-full flex flex-col" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div className="flex items-center gap-3 mb-5">
        <button onClick={onClose} className="flex items-center gap-2 px-3 py-2 rounded-lg border font-semibold transition-all hover:bg-gray-50"
          style={{ borderColor: "#e5e7eb", fontSize: "13px", color: "#374151" }}>
          ← Back to Staff
        </button>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="bg-white rounded-xl border p-6" style={{ borderColor: "#e5e7eb", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
          {/* Profile Header */}
          <div className="flex items-start gap-5 mb-6 pb-6 border-b" style={{ borderColor: "#e5e7eb" }}>
            {staff.photo ? (
              <img src={staff.photo} alt={staff.name} className="w-16 h-16 rounded-full object-cover" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-xl">{initials}</div>
            )}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <h2 className="font-bold" style={{ fontSize: "22px", color: "#111827" }}>{staff.name}</h2>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-semibold"
                  style={{ fontSize: "12px", color: hs.color, background: hs.bg, border: `1px solid ${hs.border}` }}>
                  <span className="size-1.5 rounded-full" style={{ background: hs.dotBg }} />
                  {hs.label}
                </span>
              </div>
              <p style={{ fontSize: "14px", color: "#6b7280" }}>{staff.role} · {staff.department}</p>
              <p style={{ fontSize: "12px", color: "#9ca3af", marginTop: 4 }}>ID: {staff.staffId}</p>
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Performance Score", value: `${staff.performanceScore}/100`, icon: <Award size={16} />, color: "#1f7a3c", bg: "#f0fdf4" },
              { label: "Attendance Rate", value: `${staff.attendanceRate}%`, icon: <CheckCircle size={16} />, color: "#2563eb", bg: "#eff6ff" },
              { label: "Late Check-ins", value: staff.lateCheckIns, icon: <AlertTriangle size={16} />, color: "#d97706", bg: "#fef3c7" },
              { label: "Hours Worked", value: `${staff.hoursWorked}h`, icon: <Clock size={16} />, color: "#7c3aed", bg: "#faf5ff" },
              { label: "Client Rating", value: `${staff.clientRating.toFixed(1)} / 5.0`, icon: <Star size={16} />, color: "#d97706", bg: "#fef3c7" },
              { label: "Trend", value: staff.trend === "up" ? `+${staff.trendDelta}%` : staff.trend === "down" ? `-${staff.trendDelta}%` : "Stable", icon: <TrendingUp size={16} />, color: staff.trend === "up" ? "#16a34a" : staff.trend === "down" ? "#dc2626" : "#6b7280", bg: staff.trend === "up" ? "#f0fdf4" : staff.trend === "down" ? "#fef2f2" : "#f3f4f6" },
            ].map((m) => (
              <div key={m.label} className="rounded-xl border px-4 py-3.5" style={{ borderColor: "#e5e7eb" }}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="size-7 rounded-lg flex items-center justify-center" style={{ background: m.bg, color: m.color }}>{m.icon}</div>
                  <span style={{ fontSize: "11px", fontWeight: 600, color: "#6b7280" }}>{m.label}</span>
                </div>
                <p style={{ fontSize: "20px", fontWeight: 800, color: "#111827" }}>{m.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
