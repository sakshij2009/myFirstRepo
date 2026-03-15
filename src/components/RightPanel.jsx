import { useEffect, useRef, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase";

// ── Service Usage Line Chart ───────────────────────────────────────────────

function ServiceUsageChart({ data }) {
  const containerRef = useRef(null);
  const [tooltip, setTooltip] = useState(null);

  const lines = [
    { key: "Emergency",    color: "#f87171" },
    { key: "Respite",      color: "#4ade80" },
    { key: "Supervised",   color: "#c084fc" },
    { key: "Transport",    color: "#fbbf24" },
  ];

  const pad = { top: 8, right: 8, bottom: 22, left: 30 };
  const svgW = 300, svgH = 130;
  const chartW = svgW - pad.left - pad.right;
  const chartH = svgH - pad.top - pad.bottom;
  const maxVal = Math.max(10, ...data.flatMap(d => lines.map(l => d[l.key] || 0)));
  const xStep  = data.length > 1 ? chartW / (data.length - 1) : chartW;
  const yScale = (v) => pad.top + chartH - (v / maxVal) * chartH;
  const xScale = (i) => pad.left + i * xStep;
  const buildPath = (key) => data.map((d, i) => `${i === 0 ? "M" : "L"}${xScale(i)},${yScale(d[key] || 0)}`).join(" ");

  if (!data.length) return <div className="h-[130px] flex items-center justify-center text-xs text-gray-400">No data yet</div>;

  return (
    <div ref={containerRef} className="relative">
      <svg viewBox={`0 0 ${svgW} ${svgH}`} width="100%" height={130} style={{ overflow: "visible" }}>
        {[0, Math.round(maxVal * 0.25), Math.round(maxVal * 0.5), Math.round(maxVal * 0.75), maxVal].map(v => (
          <g key={v}>
            <text x={pad.left - 6} y={yScale(v) + 3} textAnchor="end" style={{ fontSize: 9, fill: "#9ca3af" }}>{v}</text>
            <line x1={pad.left} y1={yScale(v)} x2={svgW - pad.right} y2={yScale(v)} stroke="#f3f4f6" strokeWidth={0.5} />
          </g>
        ))}
        <line x1={pad.left} y1={svgH - pad.bottom} x2={svgW - pad.right} y2={svgH - pad.bottom} stroke="#e5e7eb" strokeWidth={1} />
        {data.map((d, i) => (
          <text key={d.month} x={xScale(i)} y={svgH - 4} textAnchor="middle" style={{ fontSize: 9, fill: "#9ca3af" }}>{d.month}</text>
        ))}
        {lines.map(line => (
          <g key={line.key}>
            <path d={buildPath(line.key)} fill="none" stroke={line.color} strokeWidth={2} />
            {data.map((d, i) => <circle key={i} cx={xScale(i)} cy={yScale(d[line.key] || 0)} r={2.5} fill={line.color} />)}
          </g>
        ))}
        {data.map((d, i) => (
          <rect key={i} x={xScale(i) - xStep / 2} y={pad.top} width={xStep} height={chartH} fill="transparent"
            onMouseEnter={(e) => {
              const rect = containerRef.current?.getBoundingClientRect();
              if (rect) setTooltip({ x: e.clientX - rect.left, y: e.clientY - rect.top, data: d });
            }}
            onMouseLeave={() => setTooltip(null)}
          />
        ))}
      </svg>
      {tooltip && (
        <div className="absolute z-10 pointer-events-none bg-white rounded-lg border px-2.5 py-2 shadow-sm"
          style={{ left: tooltip.x + 10, top: tooltip.y - 10, borderColor: "#e5e7eb", fontSize: 11, minWidth: 120 }}>
          <div style={{ fontWeight: 600, color: "#374151", marginBottom: 3 }}>{tooltip.data.month}</div>
          {lines.map(l => (
            <div key={l.key} className="flex items-center justify-between gap-3" style={{ color: "#6b7280" }}>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: l.color }} />{l.key}
              </div>
              <span style={{ fontWeight: 600, color: "#374151" }}>{tooltip.data[l.key] || 0}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Revenue Bar Chart ──────────────────────────────────────────────────────

function RevenueTrendChart({ data }) {
  const containerRef = useRef(null);
  const [hoveredIdx, setHoveredIdx] = useState(null);
  const [tooltipPos, setTooltipPos] = useState(null);

  const pad = { top: 8, right: 8, bottom: 22, left: 40 };
  const svgW = 300, svgH = 110;
  const chartW = svgW - pad.left - pad.right;
  const chartH = svgH - pad.top - pad.bottom;
  const maxVal = Math.max(1000, ...data.map(d => d.value));
  const barGap = 6;
  const barWidth = data.length ? (chartW - barGap * (data.length - 1)) / data.length : 30;
  const radius = 4;
  const yScale = (v) => chartH - (v / maxVal) * chartH;

  if (!data.length) return <div className="h-[110px] flex items-center justify-center text-xs text-gray-400">No data yet</div>;

  return (
    <div ref={containerRef} className="relative">
      <svg viewBox={`0 0 ${svgW} ${svgH}`} width="100%" height={110} style={{ overflow: "visible" }}>
        {[0, maxVal * 0.25, maxVal * 0.5, maxVal * 0.75, maxVal].map((v, vi) => (
          <g key={vi}>
            <text x={pad.left - 6} y={pad.top + yScale(v) + 3} textAnchor="end" style={{ fontSize: 9, fill: "#9ca3af" }}>
              {v === 0 ? "0" : `${(v / 1000).toFixed(1)}k`}
            </text>
            <line x1={pad.left} y1={pad.top + yScale(v)} x2={svgW - pad.right} y2={pad.top + yScale(v)} stroke="#f3f4f6" strokeWidth={0.5} />
          </g>
        ))}
        <line x1={pad.left} y1={svgH - pad.bottom} x2={svgW - pad.right} y2={svgH - pad.bottom} stroke="#e5e7eb" strokeWidth={1} />
        {data.map((d, i) => {
          const x = pad.left + i * (barWidth + barGap);
          const h = (d.value / maxVal) * chartH;
          const y = pad.top + chartH - h;
          const isLast = i === data.length - 1;
          return (
            <g key={d.month}>
              <path d={`M${x},${y + radius} Q${x},${y} ${x + radius},${y} L${x + barWidth - radius},${y} Q${x + barWidth},${y} ${x + barWidth},${y + radius} L${x + barWidth},${y + h} L${x},${y + h} Z`}
                fill={isLast ? "#27964a" : "#a8e6bc"}
                style={{ opacity: hoveredIdx !== null && hoveredIdx !== i ? 0.5 : 1, transition: "opacity 0.15s" }}
                onMouseEnter={(e) => {
                  const rect = containerRef.current?.getBoundingClientRect();
                  if (rect) { setHoveredIdx(i); setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top }); }
                }}
                onMouseLeave={() => { setHoveredIdx(null); setTooltipPos(null); }}
              />
              <text x={x + barWidth / 2} y={svgH - 4} textAnchor="middle" style={{ fontSize: 9, fill: "#9ca3af" }}>{d.month}</text>
            </g>
          );
        })}
      </svg>
      {hoveredIdx !== null && tooltipPos && (
        <div className="absolute z-10 pointer-events-none bg-white rounded-lg border px-2.5 py-1.5 shadow-sm"
          style={{ left: tooltipPos.x + 10, top: tooltipPos.y - 10, borderColor: "#e5e7eb", fontSize: 11 }}>
          <span style={{ fontWeight: 600, color: "#374151" }}>${data[hoveredIdx].value.toLocaleString()}</span>
        </div>
      )}
    </div>
  );
}

// ── Main RightPanel ────────────────────────────────────────────────────────

export default function RightPanel() {
  const [serviceUsage, setServiceUsage] = useState([]);
  const [revenueTrend, setRevenueTrend] = useState([]);
  const [topPerformers, setTopPerformers] = useState([]);

  useEffect(() => {
    const fetch = async () => {
      try {
        const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
        const now = new Date();

        // Last 6 months
        const months = Array.from({ length: 6 }, (_, i) => {
          const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
          return { month: MONTHS[d.getMonth()], year: d.getFullYear(), monthIdx: d.getMonth() };
        });

        // Fetch all shifts
        const shiftSnap = await getDocs(collection(db, "shifts"));
        const shifts = shiftSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        // Service usage per month
        const usageData = months.map(({ month, year, monthIdx }) => {
          const inMonth = shifts.filter(s => {
            const d = s.startDate?.toDate ? s.startDate.toDate() : s.createdAt?.toDate ? s.createdAt.toDate() : null;
            return d && d.getMonth() === monthIdx && d.getFullYear() === year;
          });
          const cat = (s) => (s.categoryName || s.shiftCategory || "").toLowerCase();
          return {
            month,
            Emergency:  inMonth.filter(s => cat(s).includes("emergent")).length,
            Respite:    inMonth.filter(s => cat(s).includes("respite")).length,
            Supervised: inMonth.filter(s => cat(s).includes("supervised")).length,
            Transport:  inMonth.filter(s => cat(s).includes("transport")).length,
          };
        });
        setServiceUsage(usageData);

        // Revenue per month
        const revSnap = await getDocs(collection(db, "revenue"));
        const revDocs = revSnap.docs.map(d => ({ ...d.data() }));
        const revenueData = months.map(({ month, year, monthIdx }) => {
          const total = revDocs.filter(r => {
            const d = r.createdAt?.toDate ? r.createdAt.toDate() : null;
            return d && d.getMonth() === monthIdx && d.getFullYear() === year;
          }).reduce((s, r) => s + (r.amount || 0), 0);
          return { month, value: total };
        });
        setRevenueTrend(revenueData);

        // Top performers from users
        const userSnap = await getDocs(query(collection(db, "users"), where("role", "==", "user")));
        const users = userSnap.docs.map(d => ({ id: d.id, ...d.data() })).slice(0, 3);
        const performers = users.map((u, i) => ({
          name: u.name || "Staff Member",
          service: u.serviceType || ["Emergency Care","Respite Care","Supervised Visits"][i % 3],
          rating: [5, 4.9, 4.8][i],
          score: [98, 96, 92][i],
          initials: (u.name || "SM").split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2),
          photo: u.profilePhotoUrl || null,
        }));
        setTopPerformers(performers);

      } catch (err) {
        console.error("RightPanel fetch error:", err);
      }
    };
    fetch();
  }, []);

  const now = new Date();
  const monthLabel = now.toLocaleString("default", { month: "long" }) + " " + now.getFullYear();

  return (
    <div className="flex flex-col gap-[18px]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

      {/* Service Usage Chart */}
      <div className="bg-white rounded-xl p-5 border" style={{ borderColor: "#e5e7eb", boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}>
        <h2 className="mb-4 uppercase tracking-wider" style={{ fontSize: 12, fontWeight: 700, color: "#6b7280" }}>Service Usage</h2>
        <ServiceUsageChart data={serviceUsage} />
        <div className="flex items-center justify-center gap-4 mt-3">
          {[{ label: "Emergency", color: "#f87171" }, { label: "Respite", color: "#4ade80" }, { label: "Supervised", color: "#c084fc" }, { label: "Transport", color: "#fbbf24" }].map(item => (
            <div key={item.label} className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
              <span style={{ fontSize: 11, color: "#6b7280" }}>{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Revenue Trend */}
      <div className="bg-white rounded-xl p-5 border" style={{ borderColor: "#e5e7eb", boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}>
        <h2 className="mb-4 uppercase tracking-wider" style={{ fontSize: 12, fontWeight: 700, color: "#6b7280" }}>Revenue Trend</h2>
        <RevenueTrendChart data={revenueTrend} />
      </div>

      {/* Top Performers */}
      <div className="bg-white rounded-xl p-5 border" style={{ borderColor: "#e5e7eb", boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center rounded-lg" style={{ width: 32, height: 32, background: "#FEF3C7" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5z" fill="#F59E0B"/><rect x="5" y="18" width="14" height="2" rx="1" fill="#F59E0B"/></svg>
            </div>
            <span style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>Top Performers</span>
          </div>
          <span className="px-2.5 py-1 rounded-full" style={{ fontSize: 11, fontWeight: 600, color: "#16A34A", background: "#F0FDF4", border: "1px solid #DCFCE7" }}>{monthLabel}</span>
        </div>
        <div style={{ height: 1, background: "#F3F4F6", marginBottom: 12 }} />
        {topPerformers.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-4">No staff data found</p>
        ) : (
          <div className="space-y-3">
            {topPerformers.map((p, idx) => (
              <div key={p.name} className="flex items-center gap-3 py-1">
                <div className="flex items-center justify-center shrink-0" style={{ width: 20 }}>
                  <svg width="16" height="14" viewBox="0 0 24 20" fill="none"><path d="M5 14L3 3l5.5 5L12 2l3.5 6L21 3l-2 11H5z" fill={idx === 0 ? "#F59E0B" : idx === 1 ? "#D1D5DB" : "#D97706"}/><rect x="5" y="16" width="14" height="2" rx="1" fill={idx === 0 ? "#F59E0B" : idx === 1 ? "#D1D5DB" : "#D97706"}/></svg>
                </div>
                {p.photo ? (
                  <img src={p.photo} alt={p.name} className="w-9 h-9 rounded-full object-cover shrink-0 border-2" style={{ borderColor: idx === 0 ? "#F59E0B" : "#E5E7EB" }} />
                ) : (
                  <div className="w-9 h-9 rounded-full shrink-0 border-2 flex items-center justify-center text-white text-sm font-bold" style={{ borderColor: idx === 0 ? "#F59E0B" : "#E5E7EB", background: "#1B5E37" }}>{p.initials}</div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="truncate" style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{p.name}</p>
                  <p className="truncate" style={{ fontSize: 11, color: "#9CA3AF" }}>{p.service}</p>
                </div>
                <div className="flex items-center gap-0.5 shrink-0">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="#F59E0B"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>{p.rating}</span>
                </div>
                <div className="flex items-center justify-center rounded-md shrink-0" style={{ width: 34, height: 26, background: "#F0FDF4", border: "1px solid #DCFCE7", fontSize: 13, fontWeight: 700, color: "#16A34A" }}>{p.score}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
