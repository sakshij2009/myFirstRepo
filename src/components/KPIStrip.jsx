import { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase";
import { Users, Calendar, CheckCircle, Clock, DollarSign, TrendingUp, TrendingDown } from "lucide-react";
import { startOfMonth, endOfMonth, startOfLastMonth, endOfLastMonth } from "../utils/dateHelpers";

const CARDS = [
  { key: "clients",   label: "Total Clients",  icon: <Users size={17} strokeWidth={1.7} />,        iconBg: "#f0f9ff", iconColor: "#60a5fa" },
  { key: "staff",     label: "Active Staff",   icon: <Users size={17} strokeWidth={1.7} />,        iconBg: "#f0fdf4", iconColor: "#4ade80" },
  { key: "shifts",    label: "Total Shifts",   icon: <Calendar size={17} strokeWidth={1.7} />,     iconBg: "#fefce8", iconColor: "#facc15" },
  { key: "services",  label: "Services",       icon: <CheckCircle size={17} strokeWidth={1.7} />,  iconBg: "#f5f3ff", iconColor: "#a78bfa" },
  { key: "revenue",   label: "Revenue",        icon: <DollarSign size={17} strokeWidth={1.7} />,   iconBg: "#f0fdf4", iconColor: "#34d399", prefix: "$" },
  { key: "pending",   label: "Pending",        icon: <Clock size={17} strokeWidth={1.7} />,        iconBg: "#fff7ed", iconColor: "#fb923c" },
];

export default function KPIStrip() {
  const [data, setData]     = useState({ clients: 0, staff: 0, shifts: 0, services: 0, revenue: 0, pending: 0 });
  const [trends, setTrends] = useState({ clients: 0, staff: 0, shifts: 0, services: 0, revenue: 0, pending: 0 });

  useEffect(() => {
    const fetch = async () => {
      try {
        const now   = new Date();
        const mS    = startOfMonth(now);
        const mE    = endOfMonth(now);
        const lmS   = startOfLastMonth(now);
        const lmE   = endOfLastMonth(now);

        const [clients, staff, shifts, revenue, lmClients, lmShifts, lmRevenue] = await Promise.all([
          getDocs(collection(db, "clients")),
          getDocs(query(collection(db, "users"), where("role", "==", "user"))),
          getDocs(collection(db, "shifts")),
          getDocs(query(collection(db, "revenue"), where("createdAt", ">=", mS), where("createdAt", "<=", mE))),
          getDocs(query(collection(db, "clients"), where("createdAt", ">=", lmS), where("createdAt", "<=", lmE))),
          getDocs(query(collection(db, "shifts"),  where("createdAt", ">=", lmS), where("createdAt", "<=", lmE))),
          getDocs(query(collection(db, "revenue"), where("createdAt", ">=", lmS), where("createdAt", "<=", lmE))),
        ]);

        const allShifts    = shifts.docs.map(d => d.data());
        const pending      = allShifts.filter(s => !s.clockIn).length;
        const totalRevenue = revenue.docs.reduce((s, d) => s + (d.data().amount || 0), 0);
        const lmRev        = lmRevenue.docs.reduce((s, d) => s + (d.data().amount || 0), 0);

        const pct = (cur, prev) => prev === 0 ? (cur > 0 ? 100 : 0) : +((cur - prev) / prev * 100).toFixed(1);

        setData({ clients: clients.size, staff: staff.size, shifts: shifts.size, services: allShifts.length, revenue: totalRevenue, pending });
        setTrends({
          clients:  pct(clients.size, lmClients.size),
          staff:    2.5,
          shifts:   pct(shifts.size,  lmShifts.size),
          services: pct(allShifts.length, lmShifts.size),
          revenue:  pct(totalRevenue, lmRev),
          pending:  -1.2,
        });
      } catch (err) {
        console.error("KPI fetch error:", err);
      }
    };
    fetch();
  }, []);

  const fmt = (key, val) => {
    const card = CARDS.find(c => c.key === key);
    if (card?.prefix === "$") {
      return val >= 1000 ? `$${(val / 1000).toFixed(1)}K` : `$${val}`;
    }
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
              <div className="flex items-center justify-center rounded-lg" style={{ width: 34, height: 34, backgroundColor: card.iconBg, color: card.iconColor }}>
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
