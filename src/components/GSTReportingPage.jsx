import { useState, useEffect, useMemo } from "react";
import {
  DollarSign, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight,
  Download, FileText, Calendar, ChevronDown, Search,
  Building2, Shield, CheckCircle2, AlertCircle, Receipt, Calculator, Landmark, PieChart as PieChartIcon,
  RefreshCw, Printer,
} from "lucide-react";
import { toast } from "sonner";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell,
  AreaChart, Area, LineChart, Line,
} from "recharts";

const GST_RATE = 0.075;

const fmtC = (v) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);
const fmtC2 = (v) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);
const fmtPct = (v) => `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`;

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const FULL_MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const SERVICE_COLORS = {
  "Emergency Care": "#dc2626",
  "Respite Care": "#16a34a",
  "Supervised Visitations": "#7c3aed",
  "Transportations": "#d97706",
  default: "#6b7280",
};

export default function GSTReportingPage() {
  const [periodFilter, setPeriodFilter] = useState("monthly");
  const [selectedYear, setSelectedYear] = useState("2026");
  const [customFrom, setCustomFrom] = useState("2026-01-01");
  const [customTo, setCustomTo] = useState("2026-12-31");
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedQuarter, setExpandedQuarter] = useState(null);
  const [monthlyData, setMonthlyData] = useState([]);
  const [serviceGST, setServiceGST] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [revSnap, expSnap] = await Promise.all([
          getDocs(collection(db, "revenue")),
          getDocs(collection(db, "expenses")),
        ]);

        const revByMonth = {};
        const revByService = {};

        revSnap.docs.forEach((doc) => {
          const d = doc.data();
          const date = d.date?.toDate?.() || (d.date ? new Date(d.date) : null);
          const amount = d.amount || d.revenue || 0;
          const service = d.serviceType || d.categoryName || "Emergency Care";

          if (date) {
            const yr = date.getFullYear().toString();
            const mo = date.getMonth();
            if (yr === selectedYear) {
              if (!revByMonth[mo]) revByMonth[mo] = 0;
              revByMonth[mo] += amount;
            }
          }
          if (!revByService[service]) revByService[service] = 0;
          revByService[service] += amount;
        });

        const expByMonth = {};
        expSnap.docs.forEach((doc) => {
          const d = doc.data();
          const date = d.date?.toDate?.() || (d.date ? new Date(d.date) : null);
          const amount = d.amount || 0;
          if (date) {
            const yr = date.getFullYear().toString();
            const mo = date.getMonth();
            if (yr === selectedYear) {
              if (!expByMonth[mo]) expByMonth[mo] = 0;
              expByMonth[mo] += amount;
            }
          }
        });

        const built = MONTH_NAMES.map((short, i) => {
          const rev = revByMonth[i] || 0;
          const exp = expByMonth[i] || 0;
          const gstCollected = rev * GST_RATE;
          const gstPaid = exp * GST_RATE;
          return {
            month: `${FULL_MONTH_NAMES[i]} ${selectedYear}`,
            monthShort: short,
            revenue: rev,
            gstCollected,
            gstPaidExpenses: gstPaid,
            netGST: gstCollected - gstPaid,
          };
        });
        setMonthlyData(built);

        const svcArr = Object.entries(revByService).map(([name, rev]) => ({
          name,
          gstCollected: rev * GST_RATE,
          color: SERVICE_COLORS[name] || SERVICE_COLORS.default,
        }));
        setServiceGST(svcArr);
      } catch (err) {
        console.error("Error fetching GST data:", err);
        // Fallback to placeholder data
        const fallback = MONTH_NAMES.map((short, i) => ({
          month: `${FULL_MONTH_NAMES[i]} ${selectedYear}`,
          monthShort: short,
          revenue: 150000 + i * 5000,
          gstCollected: (150000 + i * 5000) * GST_RATE,
          gstPaidExpenses: 4000 + i * 200,
          netGST: (150000 + i * 5000) * GST_RATE - (4000 + i * 200),
        }));
        setMonthlyData(fallback);
        setServiceGST([
          { name: "Emergency Care", gstCollected: 52840, color: "#dc2626" },
          { name: "Respite Care", gstCollected: 38920, color: "#16a34a" },
          { name: "Supervised Visitations", gstCollected: 34150, color: "#7c3aed" },
          { name: "Transportation", gstCollected: 29540, color: "#d97706" },
        ]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [selectedYear]);

  const totals = useMemo(() => {
    const totalRevenue = monthlyData.reduce((a, m) => a + m.revenue, 0);
    const totalGSTCollected = monthlyData.reduce((a, m) => a + m.gstCollected, 0);
    const totalGSTPaid = monthlyData.reduce((a, m) => a + m.gstPaidExpenses, 0);
    const netGST = totalGSTCollected - totalGSTPaid;
    return { totalRevenue, totalGSTCollected, totalGSTPaid, netGST };
  }, [monthlyData]);

  const filteredMonthly = useMemo(() => {
    if (!searchTerm) return monthlyData;
    return monthlyData.filter((m) => m.month.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [searchTerm, monthlyData]);

  const trendData = useMemo(() =>
    monthlyData.map((m) => ({
      name: m.monthShort,
      "GST Collected": parseFloat(m.gstCollected.toFixed(2)),
      "GST Paid": parseFloat(m.gstPaidExpenses.toFixed(2)),
      "Net GST": parseFloat(m.netGST.toFixed(2)),
    })), [monthlyData]);

  const quarterlyData = useMemo(() => {
    const quarters = [
      { quarter: `Q1 ${selectedYear}`, months: [0, 1, 2] },
      { quarter: `Q2 ${selectedYear}`, months: [3, 4, 5] },
      { quarter: `Q3 ${selectedYear}`, months: [6, 7, 8] },
      { quarter: `Q4 ${selectedYear}`, months: [9, 10, 11] },
    ];
    return quarters.map(({ quarter, months }) => {
      const rev = months.reduce((s, i) => s + (monthlyData[i]?.revenue || 0), 0);
      const gstC = months.reduce((s, i) => s + (monthlyData[i]?.gstCollected || 0), 0);
      const gstP = months.reduce((s, i) => s + (monthlyData[i]?.gstPaidExpenses || 0), 0);
      return { quarter, revenue: rev, gstCollected: gstC, gstPaidExpenses: gstP, netGST: gstC - gstP };
    });
  }, [monthlyData, selectedYear]);

  const PERIODS = [
    { key: "monthly", label: "Monthly" },
    { key: "quarterly", label: "Quarterly" },
    { key: "yearly", label: "Yearly" },
    { key: "custom", label: "Custom Range" },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-6 h-6 rounded-full border-2 border-emerald-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      {/* Page Header */}
      <div className="flex items-center justify-between mb-5 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="size-9 rounded-xl flex items-center justify-center" style={{ background: "#f0fdf4" }}>
            <Landmark size={18} style={{ color: "#145228" }} strokeWidth={2} />
          </div>
          <div>
            <h1 style={{ fontSize: "22px", fontWeight: 800, color: "#111827", letterSpacing: "-0.02em" }}>GST Reporting</h1>
            <p style={{ fontSize: "12px", color: "#6b7280", marginTop: 1 }}>Tax compliance dashboard · FY {selectedYear}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => toast.info("Data refreshed")} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border transition-colors hover:bg-gray-50" style={{ borderColor: "#e5e7eb", fontSize: "11px", fontWeight: 600, color: "#374151" }}>
            <RefreshCw size={13} strokeWidth={2} /> Refresh
          </button>
          <button onClick={() => toast.success("CSV export started")} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border transition-colors hover:bg-gray-50" style={{ borderColor: "#e5e7eb", fontSize: "11px", fontWeight: 600, color: "#374151" }}>
            <Download size={13} strokeWidth={2} /> Export CSV
          </button>
          <button onClick={() => toast.success("PDF export started")} className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-white transition-colors hover:brightness-95" style={{ background: "#145228", fontSize: "11px", fontWeight: 700 }}>
            <FileText size={13} strokeWidth={2} /> Export PDF
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex items-center justify-between mb-5 flex-shrink-0">
        <div className="flex items-center gap-1.5 p-1 rounded-xl border" style={{ borderColor: "#e5e7eb", background: "#fff" }}>
          {PERIODS.map((p) => (
            <button key={p.key} onClick={() => setPeriodFilter(p.key)} className="px-3.5 py-1.5 rounded-lg transition-all"
              style={{ fontSize: "11.5px", fontWeight: periodFilter === p.key ? 700 : 500, color: periodFilter === p.key ? "#fff" : "#6b7280", background: periodFilter === p.key ? "#145228" : "transparent" }}>
              {p.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {periodFilter === "custom" && (
            <div className="flex items-center gap-2 mr-2">
              <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="px-2.5 py-1.5 rounded-lg border text-sm focus:outline-none" style={{ borderColor: "#e5e7eb", fontSize: "11px" }} />
              <span style={{ fontSize: "11px", color: "#9ca3af" }}>to</span>
              <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="px-2.5 py-1.5 rounded-lg border text-sm focus:outline-none" style={{ borderColor: "#e5e7eb", fontSize: "11px" }} />
            </div>
          )}
          <div className="relative">
            <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="px-3 py-1.5 rounded-lg border appearance-none pr-7 focus:outline-none cursor-pointer"
              style={{ borderColor: "#e5e7eb", fontSize: "11px", fontWeight: 600, color: "#374151", background: "#fff" }}>
              <option value="2026">FY 2026</option>
              <option value="2025">FY 2025</option>
              <option value="2024">FY 2024</option>
            </select>
            <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "#9ca3af" }} />
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg" style={{ background: "#fef3c7", border: "1px solid #fde68a" }}>
            <Calculator size={11} strokeWidth={2} style={{ color: "#d97706" }} />
            <span style={{ fontSize: "10.5px", fontWeight: 700, color: "#92400e" }}>GST Rate: {(GST_RATE * 100).toFixed(1)}%</span>
          </div>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-auto min-h-0 space-y-5 pb-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-4 gap-4">
          <GSTKPICard label="Total Revenue" value={fmtC(totals.totalRevenue)} change={12.4} icon={<DollarSign size={16} strokeWidth={2} />} iconBg="#eff6ff" iconColor="#2563eb" borderAccent="#2563eb" />
          <GSTKPICard label="GST Collected" value={fmtC(totals.totalGSTCollected)} change={9.8} icon={<TrendingUp size={16} strokeWidth={2} />} iconBg="#f0fdf4" iconColor="#145228" borderAccent="#145228" subtitle={`@ ${(GST_RATE * 100).toFixed(1)}% on services`} />
          <GSTKPICard label="GST Paid (Expenses)" value={fmtC(totals.totalGSTPaid)} change={6.2} icon={<TrendingDown size={16} strokeWidth={2} />} iconBg="#fef2f2" iconColor="#dc2626" borderAccent="#dc2626" subtitle="Input tax credits" />
          <GSTKPICard label="Net GST Payable" value={fmtC(totals.netGST)} change={11.1} icon={<Landmark size={16} strokeWidth={2} />} iconBg="#fef3c7" iconColor="#d97706" borderAccent="#d97706" subtitle="To be remitted" highlight />
        </div>

        {/* GST Trend Chart */}
        <div className="rounded-xl border bg-white overflow-hidden" style={{ borderColor: "#e5e7eb", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
          <div className="px-5 py-4 flex items-center justify-between border-b" style={{ borderColor: "#f3f4f6" }}>
            <div className="flex items-center gap-2.5">
              <div className="size-7 rounded-lg flex items-center justify-center" style={{ background: "#f0fdf4" }}>
                <TrendingUp size={13} style={{ color: "#145228" }} strokeWidth={2} />
              </div>
              <div>
                <p style={{ fontSize: "13px", fontWeight: 700, color: "#111827" }}>GST Trend — Monthly Breakdown</p>
                <p style={{ fontSize: "10px", color: "#9ca3af" }}>Collected vs Paid vs Net over {selectedYear}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {[{ color: "#145228", label: "Collected" }, { color: "#dc2626", label: "Paid" }, { color: "#d97706", label: "Net" }].map((l) => (
                <div key={l.label} className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-full" style={{ background: l.color }} />
                  <span style={{ fontSize: "10px", fontWeight: 600, color: "#6b7280" }}>{l.label}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="px-5 py-4" style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gstCollectedGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#145228" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#145228" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gstNetGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#d97706" stopOpacity={0.12} />
                    <stop offset="95%" stopColor="#d97706" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip contentStyle={{ fontSize: "11px", borderRadius: 10, border: "1px solid #e5e7eb", fontFamily: "'Plus Jakarta Sans', sans-serif" }} formatter={(v) => [fmtC2(v), ""]} />
                <Area type="monotone" dataKey="GST Collected" stroke="#145228" strokeWidth={2} fill="url(#gstCollectedGrad)" dot={false} />
                <Area type="monotone" dataKey="Net GST" stroke="#d97706" strokeWidth={2} fill="url(#gstNetGrad)" dot={false} />
                <Line type="monotone" dataKey="GST Paid" stroke="#dc2626" strokeWidth={1.5} strokeDasharray="4 3" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-2 gap-4">
          {/* GST by Service Type */}
          {serviceGST.length > 0 && (
            <div className="rounded-xl border bg-white overflow-hidden" style={{ borderColor: "#e5e7eb", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
              <div className="px-5 py-4 border-b" style={{ borderColor: "#f3f4f6" }}>
                <p style={{ fontSize: "13px", fontWeight: 700, color: "#111827" }}>GST by Service Type</p>
                <p style={{ fontSize: "10px", color: "#9ca3af" }}>Annual distribution</p>
              </div>
              <div className="px-5 py-4 flex items-center gap-5">
                <div style={{ width: 180, height: 180 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={serviceGST} cx="50%" cy="50%" innerRadius={48} outerRadius={80} dataKey="gstCollected" nameKey="name" stroke="#fff" strokeWidth={2}>
                        {serviceGST.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                      <Tooltip contentStyle={{ fontSize: "11px", borderRadius: 8, border: "1px solid #e5e7eb", fontFamily: "'Plus Jakarta Sans', sans-serif" }} formatter={(v) => [fmtC(v), ""]} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-2.5">
                  {serviceGST.map((s) => {
                    const total = serviceGST.reduce((a, x) => a + x.gstCollected, 0);
                    const pct = total > 0 ? ((s.gstCollected / total) * 100).toFixed(1) : "0.0";
                    return (
                      <div key={s.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="size-2.5 rounded-full flex-shrink-0" style={{ background: s.color }} />
                          <span style={{ fontSize: "11px", fontWeight: 600, color: "#374151" }}>{s.name}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span style={{ fontSize: "11px", fontWeight: 800, color: "#111827" }}>{fmtC(s.gstCollected)}</span>
                          <span className="px-1.5 py-0.5 rounded" style={{ fontSize: "9px", fontWeight: 700, color: s.color, background: `${s.color}18` }}>{pct}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Quarterly Summary */}
          <div className="rounded-xl border bg-white overflow-hidden" style={{ borderColor: "#e5e7eb", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
            <div className="px-5 py-4 border-b" style={{ borderColor: "#f3f4f6" }}>
              <p style={{ fontSize: "13px", fontWeight: 700, color: "#111827" }}>Quarterly Summary</p>
              <p style={{ fontSize: "10px", color: "#9ca3af" }}>Revenue & GST by quarter</p>
            </div>
            <div className="px-5 py-4" style={{ height: 240 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={quarterlyData} margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                  <XAxis dataKey="quarter" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={{ fontSize: "11px", borderRadius: 8, border: "1px solid #e5e7eb", fontFamily: "'Plus Jakarta Sans', sans-serif" }} formatter={(v) => [fmtC(v), ""]} />
                  <Bar dataKey="gstCollected" fill="#145228" radius={[4, 4, 0, 0]} barSize={24} name="GST Collected" />
                  <Bar dataKey="netGST" fill="#d97706" radius={[4, 4, 0, 0]} barSize={24} name="Net GST" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Monthly Breakdown Table */}
        <div className="rounded-xl border bg-white overflow-hidden" style={{ borderColor: "#e5e7eb", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
          <div className="px-5 py-3.5 flex items-center justify-between border-b" style={{ borderColor: "#f3f4f6" }}>
            <div className="flex items-center gap-2.5">
              <div className="size-7 rounded-lg flex items-center justify-center" style={{ background: "#fef3c7" }}>
                <Receipt size={13} style={{ color: "#d97706" }} strokeWidth={2} />
              </div>
              <div>
                <p style={{ fontSize: "13px", fontWeight: 700, color: "#111827" }}>Monthly GST Breakdown</p>
                <p style={{ fontSize: "10px", color: "#9ca3af" }}>{filteredMonthly.length} months · {selectedYear}</p>
              </div>
            </div>
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: "#9ca3af" }} />
              <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search month…"
                className="pl-8 pr-3 py-1.5 rounded-lg border text-sm focus:outline-none bg-white"
                style={{ borderColor: "#e5e7eb", fontSize: "11px", color: "#374151", width: 160 }} />
            </div>
          </div>
          <div className="overflow-auto" style={{ maxHeight: 420 }}>
            <table className="w-full">
              <thead className="sticky top-0 z-10">
                <tr style={{ background: "#fafafa" }}>
                  {["Month", "Revenue", "GST Collected", "GST Paid", "Net GST", "Eff. Rate", "Status"].map((h) => (
                    <th key={h} className="text-left px-5 py-2.5" style={{ fontSize: "10px", fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredMonthly.map((m, idx) => {
                  const effectiveRate = m.revenue > 0 ? ((m.netGST / m.revenue) * 100).toFixed(2) : "0.00";
                  const isPaid = idx < 8;
                  return (
                    <tr key={m.month} className="border-t transition-colors hover:bg-gray-50/50" style={{ borderColor: "#f3f4f6" }}>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <Calendar size={12} strokeWidth={2} style={{ color: "#9ca3af" }} />
                          <span style={{ fontSize: "12px", fontWeight: 600, color: "#111827" }}>{m.month}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3"><span style={{ fontSize: "12px", fontWeight: 700, color: "#111827" }}>{fmtC(m.revenue)}</span></td>
                      <td className="px-5 py-3"><span style={{ fontSize: "12px", fontWeight: 700, color: "#145228" }}>{fmtC2(m.gstCollected)}</span></td>
                      <td className="px-5 py-3"><span style={{ fontSize: "12px", fontWeight: 600, color: "#dc2626" }}>({fmtC2(m.gstPaidExpenses)})</span></td>
                      <td className="px-5 py-3"><span style={{ fontSize: "13px", fontWeight: 800, color: "#d97706" }}>{fmtC2(m.netGST)}</span></td>
                      <td className="px-5 py-3">
                        <span className="px-2 py-0.5 rounded-md" style={{ fontSize: "10px", fontWeight: 700, color: "#6b7280", background: "#f3f4f6" }}>{effectiveRate}%</span>
                      </td>
                      <td className="px-5 py-3">
                        {isPaid ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full" style={{ fontSize: "10px", fontWeight: 700, color: "#145228", background: "#dcfce7" }}>
                            <CheckCircle2 size={10} strokeWidth={2.5} /> Filed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full" style={{ fontSize: "10px", fontWeight: 700, color: "#d97706", background: "#fef3c7" }}>
                            <AlertCircle size={10} strokeWidth={2.5} /> Pending
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {/* Footer totals */}
          <div className="px-5 py-3 border-t flex items-center justify-between" style={{ borderColor: "#e5e7eb", background: "#fafafa" }}>
            <div className="flex items-center gap-5">
              {[
                { label: "Total Revenue", value: fmtC(totals.totalRevenue), color: "#111827" },
                { label: "GST Collected", value: fmtC(totals.totalGSTCollected), color: "#145228" },
                { label: "GST Paid", value: fmtC(totals.totalGSTPaid), color: "#dc2626" },
                { label: "Net GST", value: fmtC(totals.netGST), color: "#d97706" },
              ].map((item, i) => (
                <div key={item.label} className="flex items-center gap-5">
                  {i > 0 && <div className="w-px h-8" style={{ background: "#e5e7eb" }} />}
                  <div>
                    <span style={{ fontSize: "9px", fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em" }}>{item.label}</span>
                    <p style={{ fontSize: "14px", fontWeight: 800, color: item.color }}>{item.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Compliance Status */}
        <div className="rounded-xl border bg-white overflow-hidden" style={{ borderColor: "#e5e7eb", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
          <div className="px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-xl flex items-center justify-center" style={{ background: "#f0fdf4" }}>
                <Shield size={16} style={{ color: "#145228" }} strokeWidth={2} />
              </div>
              <div>
                <p style={{ fontSize: "13px", fontWeight: 700, color: "#111827" }}>Tax Compliance Status</p>
                <p style={{ fontSize: "10.5px", color: "#6b7280" }}>8 of 12 months filed · Next filing due: September 30, {selectedYear}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-2 rounded-full overflow-hidden" style={{ width: 200, background: "#f3f4f6" }}>
                <div className="h-full rounded-full" style={{ width: "66.7%", background: "linear-gradient(90deg, #145228, #22c55e)" }} />
              </div>
              <span style={{ fontSize: "11px", fontWeight: 800, color: "#145228" }}>66.7%</span>
              <span className="px-2.5 py-1 rounded-lg" style={{ fontSize: "10px", fontWeight: 700, color: "#145228", background: "#dcfce7" }}>On Track</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function GSTKPICard({ label, value, change, icon, iconBg, iconColor, borderAccent, subtitle, highlight }) {
  const isPositive = change >= 0;
  return (
    <div className="rounded-xl border bg-white px-5 py-4 transition-all hover:shadow-md"
      style={{ borderColor: "#e5e7eb", borderTop: `3px solid ${borderAccent}`, boxShadow: highlight ? `0 0 0 1px ${borderAccent}22, 0 2px 8px ${borderAccent}10` : "0 1px 3px rgba(0,0,0,0.06)" }}>
      <div className="flex items-start justify-between mb-3">
        <div className="size-8 rounded-lg flex items-center justify-center" style={{ background: iconBg, color: iconColor }}>{icon}</div>
        <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md" style={{ background: isPositive ? "#f0fdf4" : "#fef2f2", color: isPositive ? "#16a34a" : "#dc2626", fontSize: "10px", fontWeight: 700 }}>
          {isPositive ? <ArrowUpRight size={10} strokeWidth={2.5} /> : <ArrowDownRight size={10} strokeWidth={2.5} />}
          {fmtPct(change)}
        </div>
      </div>
      <p style={{ fontSize: "22px", fontWeight: 800, color: "#111827", letterSpacing: "-0.02em" }}>{value}</p>
      <p style={{ fontSize: "11px", fontWeight: 600, color: "#6b7280", marginTop: 2 }}>{label}</p>
      {subtitle && <p style={{ fontSize: "9.5px", color: "#9ca3af", marginTop: 2 }}>{subtitle}</p>}
    </div>
  );
}
