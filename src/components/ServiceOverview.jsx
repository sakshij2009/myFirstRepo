import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { Heart, Shield, Eye, Car, ArrowRight } from "lucide-react";

const SERVICES = [
  { key: "emergent",     label: "Emergency Care",     icon: <Heart size={17} strokeWidth={1.7} />, iconBg: "#fef2f2", iconColor: "#f87171", match: (c) => c.includes("emergent") },
  { key: "respite",      label: "Respite Care",       icon: <Shield size={17} strokeWidth={1.7} />, iconBg: "#f0fdf4", iconColor: "#4ade80", match: (c) => c.includes("respite") },
  { key: "supervised",   label: "Supervised Visits",  icon: <Eye size={17} strokeWidth={1.7} />,   iconBg: "#faf5ff", iconColor: "#c084fc", match: (c) => c.includes("supervised") },
  { key: "transportation",label: "Transportations",   icon: <Car size={17} strokeWidth={1.7} />,   iconBg: "#fffbeb", iconColor: "#fbbf24", match: (c) => c.includes("transport") },
];

export default function ServiceOverview() {
  const [tiles, setTiles] = useState(SERVICES.map(s => ({ ...s, cases: 0, staff: 0 })));

  useEffect(() => {
    const fetch = async () => {
      try {
        const snap   = await getDocs(collection(db, "shifts"));
        const shifts = snap.docs.map(d => ({ ...d.data(), id: d.id }));

        const updated = SERVICES.map(svc => {
          const matched = shifts.filter(s => {
            const cat = (s.categoryName || s.shiftCategory || "").toLowerCase();
            return svc.match(cat);
          });
          const uniqueStaff = new Set(matched.map(s => s.userId || s.staffId || s.assignedUser || s.name).filter(Boolean));
          return { ...svc, cases: matched.length, staff: uniqueStaff.size };
        });

        setTiles(updated);
      } catch (err) {
        console.error("ServiceOverview fetch error:", err);
      }
    };
    fetch();
  }, []);

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <h2 className="mb-3 uppercase tracking-wider" style={{ fontSize: 12, fontWeight: 700, color: "#6b7280" }}>
        Service Overview
      </h2>
      <div className="grid grid-cols-4 gap-3">
        {tiles.map((svc, i) => (
          <div key={svc.key} className="bg-white rounded-xl p-4 border hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
            style={{ borderColor: "#e5e7eb", boxShadow: "0 1px 2px rgba(0,0,0,0.04)", animationDelay: `${i * 80}ms` }}>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="flex items-center justify-center rounded-lg shrink-0" style={{ width: 32, height: 32, backgroundColor: svc.iconBg, color: svc.iconColor }}>
                {svc.icon}
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#111827", lineHeight: 1.3 }}>{svc.label}</div>
            </div>
            <div className="space-y-1.5 mb-3 pb-3 border-b" style={{ borderColor: "#f3f4f6" }}>
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-medium" style={{ color: "#9ca3af" }}>Cases</span>
                <span className="text-sm font-semibold" style={{ color: "#111827" }}>{svc.cases}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-medium" style={{ color: "#9ca3af" }}>Staff</span>
                <span className="text-sm font-semibold" style={{ color: "#111827" }}>{svc.staff}</span>
              </div>
            </div>
            <button className="w-full flex items-center justify-center gap-1 font-semibold transition-colors"
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
