import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { Users, Calendar, CheckCircle, Clock, DollarSign, TrendingUp, TrendingDown } from "lucide-react";

const CARDS = [
  { key: "clients",  label: "Total Clients",  icon: <Users size={17} strokeWidth={1.7} />,       iconBg: "#f0f9ff", iconColor: "#60a5fa" },
  { key: "staff",    label: "Active Staff",   icon: <Users size={17} strokeWidth={1.7} />,       iconBg: "#f0fdf4", iconColor: "#4ade80" },
  { key: "shifts",   label: "Total Shifts",   icon: <Calendar size={17} strokeWidth={1.7} />,    iconBg: "#fefce8", iconColor: "#facc15" },
  { key: "services", label: "Services",       icon: <CheckCircle size={17} strokeWidth={1.7} />, iconBg: "#f5f3ff", iconColor: "#a78bfa" },
  { key: "revenue",  label: "Revenue",        icon: <DollarSign size={17} strokeWidth={1.7} />,  iconBg: "#f0fdf4", iconColor: "#34d399", prefix: "$" },
  { key: "pending",  label: "Pending",        icon: <Clock size={17} strokeWidth={1.7} />,       iconBg: "#fff7ed", iconColor: "#fb923c" },
];

// Returns { start, end, prevStart, prevEnd } for the given filter
const getRange = (filter) => {
  const now = new Date();
  if (filter === "Weekly") {
    const day = now.getDay();
    const diffToMon = (day === 0 ? -6 : 1 - day);
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMon, 0, 0, 0);
    const end   = new Date(start); end.setDate(start.getDate() + 6); end.setHours(23, 59, 59);
    const prevStart = new Date(start); prevStart.setDate(prevStart.getDate() - 7);
    const prevEnd   = new Date(end);   prevEnd.setDate(prevEnd.getDate() - 7);
    return { start, end, prevStart, prevEnd };
  }
  if (filter === "Monthly") {
    const start    = new Date(now.getFullYear(), now.getMonth(), 1);
    const end      = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    const prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevEnd   = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    return { start, end, prevStart, prevEnd };
  }
  // Yearly
  const start     = new Date(now.getFullYear(), 0, 1);
  const end       = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
  const prevStart = new Date(now.getFullYear() - 1, 0, 1);
  const prevEnd   = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59);
  return { start, end, prevStart, prevEnd };
};

// Extract JS Date from a shift's startDate field
const shiftDate = (s) => {
  if (s.startDate?.toDate) return s.startDate.toDate();
  if (s.startDate instanceof Date) return s.startDate;
  if (typeof s.startDate === "string") {
    const d = new Date(s.startDate.replace(/,/g, "").trim());
    return isNaN(d) ? null : d;
  }
  return null;
};

const inRange = (date, start, end) => date && date >= start && date <= end;

export default function KPIStrip({ filter = "Weekly" }) {
  const [data,   setData]   = useState({ clients: 0, staff: 0, shifts: 0, services: 0, revenue: 0, pending: 0 });
  const [trends, setTrends] = useState({ clients: 0, staff: 0, shifts: 0, services: 0, revenue: 0, pending: 0 });

  useEffect(() => {
    const load = async () => {
      try {
        const { start, end, prevStart, prevEnd } = getRange(filter);

        const [clientsSnap, usersSnap, shiftsSnap, revenueSnap] = await Promise.all([
          getDocs(collection(db, "clients")),
          getDocs(collection(db, "users")),
          getDocs(collection(db, "shifts")),
          getDocs(collection(db, "revenue")),
        ]);

        const allShifts  = shiftsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        const allRevenue = revenueSnap.docs.map(d => d.data());

        // Current period shifts
        const curShifts = allShifts.filter(s => inRange(shiftDate(s), start, end));
        const prevShifts = allShifts.filter(s => inRange(shiftDate(s), prevStart, prevEnd));

        // Active clients & staff: unique IDs seen in current-period shifts
        const curClientIds = new Set(curShifts.map(s => s.clientId || s.clientDetails?.id).filter(Boolean));
        const prevClientIds = new Set(prevShifts.map(s => s.clientId || s.clientDetails?.id).filter(Boolean));
        const curStaffIds  = new Set(curShifts.map(s => s.userId || s.staffId || s.assignedUser).filter(Boolean));
        const prevStaffIds = new Set(prevShifts.map(s => s.userId || s.staffId || s.assignedUser).filter(Boolean));

        // Distinct service categories this period
        const curServices  = new Set(curShifts.map(s => s.categoryName || s.shiftCategory).filter(Boolean));
        const prevServices = new Set(prevShifts.map(s => s.categoryName || s.shiftCategory).filter(Boolean));

        // Revenue (use createdAt for revenue docs)
        const revDate = (r) => { const d = r.createdAt?.toDate ? r.createdAt.toDate() : null; return d; };
        const curRev   = allRevenue.filter(r => inRange(revDate(r), start, end)).reduce((a, r) => a + (r.amount || 0), 0);
        const prevRev  = allRevenue.filter(r => inRange(revDate(r), prevStart, prevEnd)).reduce((a, r) => a + (r.amount || 0), 0);

        // Pending: shifts without clockIn in current period
        const curPending  = curShifts.filter(s => !s.clockIn).length;
        const prevPending = prevShifts.filter(s => !s.clockIn).length;

        // If no current-period shifts match clientId, fall back to all clients
        const curClients  = curClientIds.size || clientsSnap.size;
        const prevClients = prevClientIds.size || 0;
        const curStaff    = curStaffIds.size || usersSnap.docs.filter(d => d.data().role === "user").length;
        const prevStaff   = prevStaffIds.size;

        const pct = (cur, prev) =>
          prev === 0 ? (cur > 0 ? 100 : 0) : +((cur - prev) / prev * 100).toFixed(1);

        setData({
          clients:  curClients,
          staff:    curStaff,
          shifts:   curShifts.length,
          services: curServices.size,
          revenue:  curRev,
          pending:  curPending,
        });
        setTrends({
          clients:  pct(curClients,       prevClients),
          staff:    pct(curStaff,         prevStaff),
          shifts:   pct(curShifts.length, prevShifts.length),
          services: pct(curServices.size, prevServices.size),
          revenue:  pct(curRev,           prevRev),
          pending:  pct(curPending,       prevPending),
        });
      } catch (err) {
        console.error("KPI fetch error:", err);
      }
    };
    load();
  }, [filter]);

  const fmt = (key, val) => {
    const card = CARDS.find(c => c.key === key);
    if (card?.prefix === "$") return val >= 1000 ? `$${(val / 1000).toFixed(1)}K` : `$${val}`;
    return val;
  };

  return (
    <div className="grid grid-cols-6 gap-3" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      {CARDS.map((card, i) => {
        const trend      = trends[card.key];
        const isPositive = trend >= 0;
        return (
          <div key={card.key} className="bg-white rounded-xl p-4 border hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
            style={{ borderColor: "#e5e7eb", boxShadow: "0 1px 2px rgba(0,0,0,0.04)", animationDelay: `${i * 50}ms` }}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center justify-center rounded-lg"
                style={{ width: 34, height: 34, backgroundColor: card.iconBg, color: card.iconColor }}>
                {card.icon}
              </div>
              <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[11px] font-semibold"
                style={{ color: isPositive ? "#16a34a" : "#dc2626" }}>
                {isPositive ? <TrendingUp size={12} strokeWidth={2.5} /> : <TrendingDown size={12} strokeWidth={2.5} />}
                <span>{Math.abs(trend)}%</span>
              </div>
            </div>
            <div className="font-bold mb-1" style={{ fontSize: 20, fontWeight: 700, color: "#111827", lineHeight: 1.2 }}>
              {fmt(card.key, data[card.key])}
            </div>
            <div className="text-[11px]" style={{ color: "#9ca3af" }}>{card.label}</div>
          </div>
        );
      })}
    </div>
  );
}
