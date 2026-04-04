import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { ArrowRight, Heart, Shield, Eye, Car, Star, Activity } from "lucide-react";

// Assign icon + colours per category name keyword
const styleForCat = (name) => {
  const l = (name || "").toLowerCase();
  if (l.includes("emergent"))   return { icon: <Heart size={17} strokeWidth={1.7} />,    iconBg: "#fef2f2", iconColor: "#f87171" };
  if (l.includes("respite"))    return { icon: <Shield size={17} strokeWidth={1.7} />,   iconBg: "#f0fdf4", iconColor: "#4ade80" };
  if (l.includes("supervised")) return { icon: <Eye size={17} strokeWidth={1.7} />,      iconBg: "#faf5ff", iconColor: "#c084fc" };
  if (l.includes("transport"))  return { icon: <Car size={17} strokeWidth={1.7} />,      iconBg: "#fffbeb", iconColor: "#fbbf24" };
  if (l.includes("shadow"))     return { icon: <Star size={17} strokeWidth={1.7} />,     iconBg: "#f0f9ff", iconColor: "#60a5fa" };
  return                               { icon: <Activity size={17} strokeWidth={1.7} />, iconBg: "#f3f4f6", iconColor: "#9ca3af" };
};

// Get date range for filter
const getRange = (filter) => {
  const now = new Date();
  if (filter === "Weekly") {
    const day = now.getDay();
    const diffToMon = (day === 0 ? -6 : 1 - day);
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMon, 0, 0, 0);
    const end   = new Date(start); end.setDate(start.getDate() + 6); end.setHours(23, 59, 59);
    return { start, end };
  }
  if (filter === "Monthly") {
    return {
      start: new Date(now.getFullYear(), now.getMonth(), 1),
      end:   new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59),
    };
  }
  return {
    start: new Date(now.getFullYear(), 0, 1),
    end:   new Date(now.getFullYear(), 11, 31, 23, 59, 59),
  };
};

const parseShiftDate = (s) => {
  if (s.startDate?.toDate) return s.startDate.toDate();
  if (s.startDate instanceof Date) return s.startDate;
  if (typeof s.startDate === "string") {
    const d = new Date(s.startDate.replace(/,/g, "").trim());
    return isNaN(d) ? null : d;
  }
  return null;
};

export default function ServiceOverview({ filter = "Weekly" }) {
  const navigate = useNavigate();
  const [tiles, setTiles] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const { start, end } = getRange(filter);

        const [catSnap, shiftSnap] = await Promise.all([
          getDocs(collection(db, "shiftCategories")),
          getDocs(collection(db, "shifts")),
        ]);

        // Filter out combined/admin categories
        const categories = catSnap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(cat => {
            const l = (cat.name || "").toLowerCase();
            return (
              !l.includes("shadow") &&
              !l.includes("admin") &&
              !l.includes("office") &&
              !l.includes("+")
            );
          });

        const allShifts = shiftSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        // Shifts within the selected period
        const periodShifts = allShifts.filter(s => {
          const d = parseShiftDate(s);
          return d && d >= start && d <= end;
        });

        const updated = categories.map(cat => {
          const catName = (cat.name || "").toLowerCase();
          const matched = periodShifts.filter(s => {
            const scat = (s.categoryName || s.shiftCategory || "").toLowerCase();
            return scat.includes(catName) || catName.includes(scat.split(" ")[0]);
          });
          return {
            id: cat.id,
            label: cat.name,
            cases: matched.length,
            ...styleForCat(cat.name),
          };
        });

        setTiles(updated);
      } catch (err) {
        console.error("ServiceOverview fetch error:", err);
      }
    };
    load();
  }, [filter]);

  if (!tiles.length) return null;

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <h2 className="mb-3 uppercase tracking-wider" style={{ fontSize: 12, fontWeight: 700, color: "#6b7280" }}>
        Service Overview
      </h2>
      <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.min(tiles.length, 4)}, 1fr)` }}>
        {tiles.map((svc, i) => (
          <div key={svc.id} className="bg-white rounded-xl p-4 border hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
            style={{ borderColor: "#e5e7eb", boxShadow: "0 1px 2px rgba(0,0,0,0.04)", animationDelay: `${i * 80}ms` }}>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="flex items-center justify-center rounded-lg shrink-0"
                style={{ width: 32, height: 32, backgroundColor: svc.iconBg, color: svc.iconColor }}>
                {svc.icon}
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#111827", lineHeight: 1.3 }}>{svc.label}</div>
            </div>
            <div className="pb-3 mb-3 border-b" style={{ borderColor: "#f3f4f6" }}>
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-medium" style={{ color: "#9ca3af" }}>Cases</span>
                <span className="text-sm font-bold" style={{ color: "#111827" }}>{svc.cases}</span>
              </div>
            </div>
            <button 
              onClick={() => navigate(`/admin-dashboard/shifts?service=${svc.label}`)}
              className="w-full flex items-center justify-center gap-1 font-semibold transition-colors"
              style={{ fontSize: 12, color: "#6b7280" }}
              onMouseEnter={e => (e.currentTarget.style.color = "#1f7a3c")}
              onMouseLeave={e => (e.currentTarget.style.color = "#6b7280")}
            >
              <span>View</span>
              <ArrowRight size={12} strokeWidth={2.5} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
