import { useState, useEffect, useMemo } from "react";
import {
  Search, ChevronDown, Building2, DollarSign, FileText, Eye,
  Download, Send, Receipt, CreditCard, TrendingUp, Calendar,
  CheckCircle2, AlertCircle, Lock, Unlock, Filter, ChevronRight,
  Users, Clock, Plus, X, ArrowUpRight,
} from "lucide-react";
import { collection, getDocs, updateDoc, doc, query, where, orderBy } from "firebase/firestore";
import { db } from "../firebase";
import { toast } from "sonner";

const fmtC = (v) =>
  new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v || 0);
const fmtC2 = (v) =>
  new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v || 0);

const SERVICE_RATES = {
  "Emergency Care": 85,
  "Respite Care": 65,
  "Supervised Visitations": 75,
  "Transportations": 55,
  default: 70,
};

const STATUS_CONFIG = {
  Locked: { bg: "#fef3c7", text: "#d97706", border: "#fde68a" },
  Billable: { bg: "#dcfce7", text: "#16a34a", border: "#bbf7d0" },
  Invoiced: { bg: "#eff6ff", text: "#3b82f6", border: "#bfdbfe" },
};

export default function BillingPage() {
  const [activeTab, setActiveTab] = useState("billable-shifts");
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedShifts, setSelectedShifts] = useState(new Set());
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  useEffect(() => {
    const fetchShifts = async () => {
      setLoading(true);
      try {
        const snap = await getDocs(collection(db, "shifts"));
        const data = snap.docs.map((d) => {
          const s = d.data();
          const serviceType = s.categoryName || s.shiftCategory || "Emergency Care";
          const rate = SERVICE_RATES[serviceType] || SERVICE_RATES.default;
          const hours = s.hoursWorked || s.duration || 8;
          const numHours = typeof hours === "string" ? parseFloat(hours) || 8 : hours;
          return {
            id: d.id,
            date: s.date || s.shiftDate || new Date().toISOString().split("T")[0],
            clientName: s.clientName || s.clientDetails?.name || "Unknown Client",
            clientId: s.clientId || s.clientDetails?.id || "",
            serviceType,
            staffMember: s.staffName || s.assignedUser || s.userName || "Unknown",
            hoursWorked: numHours,
            rate,
            totalAmount: numHours * rate,
            billingStatus: s.locked ? "Locked" : s.billingStatus || "Billable",
            locked: s.locked || false,
          };
        });
        setShifts(data);
      } catch (err) {
        console.error("Error fetching billing shifts:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchShifts();
  }, []);

  const filteredShifts = useMemo(() => {
    return shifts.filter((s) => {
      const matchSearch =
        !searchQuery ||
        s.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.staffMember.toLowerCase().includes(searchQuery.toLowerCase());
      const matchStatus = statusFilter === "All" || s.billingStatus === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [shifts, searchQuery, statusFilter]);

  const totals = useMemo(() => ({
    totalBillable: shifts.filter((s) => s.billingStatus === "Billable").reduce((a, s) => a + s.totalAmount, 0),
    totalLocked: shifts.filter((s) => s.billingStatus === "Locked").reduce((a, s) => a + s.totalAmount, 0),
    totalInvoiced: shifts.filter((s) => s.billingStatus === "Invoiced").reduce((a, s) => a + s.totalAmount, 0),
    totalHours: shifts.reduce((a, s) => a + s.hoursWorked, 0),
  }), [shifts]);

  const invoices = useMemo(() => {
    const byClient = {};
    shifts.filter((s) => s.billingStatus !== "Billable").forEach((s) => {
      if (!byClient[s.clientId || s.clientName]) {
        byClient[s.clientId || s.clientName] = {
          clientName: s.clientName,
          clientId: s.clientId,
          shifts: [],
        };
      }
      byClient[s.clientId || s.clientName].shifts.push(s);
    });
    return Object.values(byClient).map((group, i) => ({
      id: `INV-${String(i + 1).padStart(4, "0")}`,
      clientName: group.clientName,
      clientId: group.clientId,
      shiftCount: group.shifts.length,
      totalHours: group.shifts.reduce((a, s) => a + s.hoursWorked, 0),
      totalAmount: group.shifts.reduce((a, s) => a + s.totalAmount, 0),
      status: group.shifts.some((s) => s.billingStatus === "Locked") ? "Pending" : "Draft",
      createdDate: new Date().toLocaleDateString("en-AU"),
    }));
  }, [shifts]);

  const handleLockToggle = async (shiftId) => {
    const shift = shifts.find((s) => s.id === shiftId);
    if (!shift) return;
    const newLocked = !shift.locked;
    const newStatus = newLocked ? "Locked" : "Billable";
    try {
      await updateDoc(doc(db, "shifts", shiftId), { locked: newLocked, billingStatus: newStatus });
      setShifts((prev) => prev.map((s) => s.id === shiftId ? { ...s, locked: newLocked, billingStatus: newStatus } : s));
      toast.success(newLocked ? "Shift locked for billing" : "Shift unlocked");
    } catch (err) {
      toast.error("Failed to update billing status");
    }
  };

  const handleBulkLock = async () => {
    if (selectedShifts.size === 0) return;
    try {
      await Promise.all([...selectedShifts].map((id) => updateDoc(doc(db, "shifts", id), { locked: true, billingStatus: "Locked" })));
      setShifts((prev) => prev.map((s) => selectedShifts.has(s.id) ? { ...s, locked: true, billingStatus: "Locked" } : s));
      setSelectedShifts(new Set());
      toast.success(`${selectedShifts.size} shifts locked for billing`);
    } catch (err) {
      toast.error("Failed to lock shifts");
    }
  };

  const TABS = [
    { key: "billable-shifts", label: "Billable Shifts", count: shifts.filter((s) => s.billingStatus === "Billable").length },
    { key: "invoices", label: "Invoices", count: invoices.length },
    { key: "pricing", label: "Pricing", count: null },
  ];

  return (
    <div className="h-full flex flex-col" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      {/* Page Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="font-bold mb-1" style={{ fontSize: "28px", fontWeight: 700, color: "#111827", letterSpacing: "-0.02em" }}>Billing</h1>
          <p style={{ fontSize: "14px", color: "#6b7280" }}>Manage billable shifts, invoices, and pricing</p>
        </div>
        <div className="flex items-center gap-2">
          {selectedShifts.size > 0 && (
            <button onClick={handleBulkLock} className="flex items-center gap-2 px-4 py-2 rounded-lg text-white transition-all hover:brightness-95"
              style={{ background: "#1f7a3c", fontSize: "13px", fontWeight: 600 }}>
              <Lock className="size-4" strokeWidth={2} /> Lock {selectedShifts.size} Shifts
            </button>
          )}
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg border transition-all hover:bg-gray-50"
            style={{ borderColor: "#e5e7eb", fontSize: "13px", color: "#374151", fontWeight: 500 }}>
            <Download className="size-4" strokeWidth={2} /> Export
          </button>
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg text-white transition-all hover:brightness-95"
            style={{ background: "#1f7a3c", fontSize: "13px", fontWeight: 600 }}>
            <Plus className="size-4" strokeWidth={2} /> New Invoice
          </button>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-4 gap-4 mb-5">
        {[
          { label: "Billable Amount", value: fmtC(totals.totalBillable), icon: <DollarSign size={16} strokeWidth={2} />, iconBg: "#f0fdf4", iconColor: "#16a34a", color: "#16a34a" },
          { label: "Locked Amount", value: fmtC(totals.totalLocked), icon: <Lock size={16} strokeWidth={2} />, iconBg: "#fef3c7", iconColor: "#d97706", color: "#d97706" },
          { label: "Invoiced Amount", value: fmtC(totals.totalInvoiced), icon: <Receipt size={16} strokeWidth={2} />, iconBg: "#eff6ff", iconColor: "#3b82f6", color: "#3b82f6" },
          { label: "Total Hours", value: `${Math.round(totals.totalHours)}h`, icon: <Clock size={16} strokeWidth={2} />, iconBg: "#faf5ff", iconColor: "#7c3aed", color: "#7c3aed" },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-xl border px-5 py-4 transition-all hover:shadow-md" style={{ borderColor: "#e5e7eb", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
            <div className="flex items-start justify-between mb-3">
              <div className="size-8 rounded-lg flex items-center justify-center" style={{ background: kpi.iconBg, color: kpi.iconColor }}>{kpi.icon}</div>
              <ArrowUpRight size={14} style={{ color: "#9ca3af" }} />
            </div>
            <p style={{ fontSize: "22px", fontWeight: 800, color: "#111827", letterSpacing: "-0.02em" }}>{kpi.value}</p>
            <p style={{ fontSize: "12px", fontWeight: 600, color: "#6b7280", marginTop: 2 }}>{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border flex flex-col flex-1 overflow-hidden" style={{ borderColor: "#e5e7eb", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
        {/* Tab Bar */}
        <div className="flex items-center border-b px-4" style={{ borderColor: "#e5e7eb" }}>
          {TABS.map((tab) => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className="flex items-center gap-2 py-3.5 px-3 mr-2 relative transition-colors"
              style={{ color: activeTab === tab.key ? "#111827" : "#9ca3af" }}>
              <span className="font-semibold" style={{ fontSize: "13px" }}>{tab.label}</span>
              {tab.count !== null && (
                <span className="px-1.5 py-0.5 rounded font-bold min-w-[20px] text-center"
                  style={{ fontSize: "10px", backgroundColor: activeTab === tab.key ? "#f0fdf4" : "#f3f4f6", color: activeTab === tab.key ? "#1f7a3c" : "#9ca3af" }}>
                  {tab.count}
                </span>
              )}
              {activeTab === tab.key && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5" style={{ backgroundColor: "#1f7a3c" }} />
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Filters Bar */}
          {activeTab !== "pricing" && (
            <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: "#f3f4f6" }}>
              <div className="relative" style={{ width: "320px" }}>
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-gray-400" strokeWidth={2} />
                <input type="text" placeholder={activeTab === "invoices" ? "Search invoices..." : "Search client or staff..."} value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  style={{ borderColor: "#e5e7eb", backgroundColor: "white", fontSize: "13px" }} />
              </div>
              {activeTab === "billable-shifts" && (
                <div className="flex items-center gap-2">
                  {["All", "Billable", "Locked", "Invoiced"].map((s) => (
                    <button key={s} onClick={() => setStatusFilter(s)}
                      className={`px-3 py-1.5 rounded-lg border font-medium transition-all text-sm ${statusFilter === s ? "border-emerald-600 text-emerald-700 bg-emerald-50" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}
                      style={{ fontSize: "12px" }}>
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Billable Shifts Tab */}
          {activeTab === "billable-shifts" && (
            <div className="flex-1 overflow-auto">
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="animate-spin w-6 h-6 rounded-full border-2 border-emerald-600 border-t-transparent" />
                </div>
              ) : (
                <table className="w-full">
                  <thead className="sticky top-0 z-10 bg-white">
                    <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                      <th className="w-10 px-4 py-3.5">
                        <input type="checkbox" className="rounded" onChange={(e) => {
                          if (e.target.checked) setSelectedShifts(new Set(filteredShifts.map((s) => s.id)));
                          else setSelectedShifts(new Set());
                        }} />
                      </th>
                      {["Date", "Client", "Service Type", "Staff", "Hours", "Rate", "Amount", "Status", ""].map((h) => (
                        <th key={h} className="text-left px-4 py-3.5" style={{ fontSize: "11px", fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredShifts.map((shift) => {
                      const sc = STATUS_CONFIG[shift.billingStatus] || STATUS_CONFIG.Billable;
                      return (
                        <tr key={shift.id} className="border-t transition-colors hover:bg-gray-50/80 group" style={{ borderColor: "#f3f4f6" }}>
                          <td className="px-4 py-3.5">
                            <input type="checkbox" className="rounded" checked={selectedShifts.has(shift.id)}
                              onChange={(e) => {
                                const next = new Set(selectedShifts);
                                if (e.target.checked) next.add(shift.id);
                                else next.delete(shift.id);
                                setSelectedShifts(next);
                              }} />
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="size-3.5 text-gray-400" strokeWidth={2} />
                              <span style={{ fontSize: "12px", color: "#374151", fontWeight: 500 }}>{shift.date}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="font-semibold" style={{ fontSize: "13px", color: "#111827" }}>{shift.clientName}</span>
                            {shift.clientId && <div style={{ fontSize: "10px", color: "#9ca3af", marginTop: 1 }}>{shift.clientId.slice(0, 8)}</div>}
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="px-2.5 py-1 rounded-md font-medium" style={{ fontSize: "11px", color: "#374151", background: "#f3f4f6" }}>{shift.serviceType}</span>
                          </td>
                          <td className="px-4 py-3.5">
                            <span style={{ fontSize: "13px", color: "#4b5563" }}>{shift.staffMember}</span>
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-1">
                              <Clock className="size-3.5 text-gray-400" strokeWidth={2} />
                              <span style={{ fontSize: "13px", color: "#374151", fontWeight: 500 }}>{shift.hoursWorked.toFixed(1)}h</span>
                            </div>
                          </td>
                          <td className="px-4 py-3.5">
                            <span style={{ fontSize: "12px", color: "#6b7280" }}>{fmtC2(shift.rate)}/h</span>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="font-bold" style={{ fontSize: "13px", color: "#111827" }}>{fmtC2(shift.totalAmount)}</span>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-semibold"
                              style={{ fontSize: "11px", color: sc.text, background: sc.bg, border: `1px solid ${sc.border}` }}>
                              {shift.locked ? <Lock size={9} strokeWidth={2.5} /> : null}
                              {shift.billingStatus}
                            </span>
                          </td>
                          <td className="px-4 py-3.5">
                            <button
                              onClick={() => handleLockToggle(shift.id)}
                              className="opacity-0 group-hover:opacity-100 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-all hover:bg-gray-50"
                              style={{ borderColor: "#e5e7eb", fontSize: "11px", color: shift.locked ? "#d97706" : "#374151", fontWeight: 500 }}>
                              {shift.locked ? <Unlock size={12} strokeWidth={2} /> : <Lock size={12} strokeWidth={2} />}
                              {shift.locked ? "Unlock" : "Lock"}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
              {!loading && filteredShifts.length === 0 && (
                <div className="flex items-center justify-center py-16 text-gray-400">
                  <div className="text-center">
                    <Receipt className="size-10 mx-auto mb-3 opacity-40" />
                    <p className="font-medium" style={{ fontSize: "14px" }}>No shifts found</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Invoices Tab */}
          {activeTab === "invoices" && (
            <div className="flex-1 overflow-auto p-4">
              {invoices.length === 0 ? (
                <div className="flex items-center justify-center py-16 text-gray-400">
                  <div className="text-center">
                    <FileText className="size-10 mx-auto mb-3 opacity-40" />
                    <p className="font-medium" style={{ fontSize: "14px" }}>No invoices generated yet</p>
                    <p style={{ fontSize: "12px", color: "#9ca3af", marginTop: 4 }}>Lock shifts to start generating invoices</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {invoices
                    .filter((inv) => !searchQuery || inv.clientName.toLowerCase().includes(searchQuery.toLowerCase()))
                    .map((inv) => (
                      <div key={inv.id} className="bg-gray-50 rounded-xl border p-4 flex items-center justify-between transition-all hover:shadow-md"
                        style={{ borderColor: "#e5e7eb" }}>
                        <div className="flex items-center gap-4">
                          <div className="size-10 rounded-xl flex items-center justify-center" style={{ background: "#eff6ff" }}>
                            <FileText size={16} style={{ color: "#3b82f6" }} strokeWidth={2} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold" style={{ fontSize: "14px", color: "#111827" }}>{inv.id}</span>
                              <span className="px-2 py-0.5 rounded-full font-semibold" style={{ fontSize: "10px", color: inv.status === "Pending" ? "#d97706" : "#6b7280", background: inv.status === "Pending" ? "#fef3c7" : "#f3f4f6" }}>
                                {inv.status}
                              </span>
                            </div>
                            <p style={{ fontSize: "13px", color: "#374151", marginTop: 2 }}>{inv.clientName}</p>
                            <p style={{ fontSize: "11px", color: "#9ca3af", marginTop: 1 }}>
                              {inv.shiftCount} shifts · {inv.totalHours.toFixed(1)}h · {inv.createdDate}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="font-bold" style={{ fontSize: "18px", color: "#111827" }}>{fmtC2(inv.totalAmount)}</span>
                          <div className="flex items-center gap-2">
                            <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg border transition-all hover:bg-gray-100"
                              style={{ borderColor: "#e5e7eb", fontSize: "12px", color: "#374151", fontWeight: 500 }}>
                              <Eye className="size-3.5" strokeWidth={2} /> View
                            </button>
                            <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg border transition-all hover:bg-gray-100"
                              style={{ borderColor: "#e5e7eb", fontSize: "12px", color: "#374151", fontWeight: 500 }}>
                              <Send className="size-3.5" strokeWidth={2} /> Send
                            </button>
                            <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg border transition-all hover:bg-gray-100"
                              style={{ borderColor: "#e5e7eb", fontSize: "12px", color: "#374151", fontWeight: 500 }}>
                              <Download className="size-3.5" strokeWidth={2} /> PDF
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}

          {/* Pricing Tab */}
          {activeTab === "pricing" && (
            <div className="flex-1 overflow-auto p-4">
              <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: "#e5e7eb" }}>
                <table className="w-full">
                  <thead>
                    <tr style={{ background: "#fafafa", borderBottom: "1px solid #e5e7eb" }}>
                      {["Service Type", "Base Rate (per hour)", "Overtime Rate", "Weekend Rate", "Status"].map((h) => (
                        <th key={h} className="text-left px-5 py-3.5" style={{ fontSize: "11px", fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { name: "Emergency Care", base: 85, overtime: 127.5, weekend: 102, color: "#dc2626", bg: "#fef2f2" },
                      { name: "Respite Care", base: 65, overtime: 97.5, weekend: 78, color: "#16a34a", bg: "#f0fdf4" },
                      { name: "Supervised Visitations", base: 75, overtime: 112.5, weekend: 90, color: "#7c3aed", bg: "#faf5ff" },
                      { name: "Transportations", base: 55, overtime: 82.5, weekend: 66, color: "#d97706", bg: "#fef3c7" },
                    ].map((svc) => (
                      <tr key={svc.name} className="border-t transition-colors hover:bg-gray-50/80" style={{ borderColor: "#f3f4f6" }}>
                        <td className="px-5 py-3.5">
                          <span className="inline-block px-2.5 py-1 rounded-lg font-medium" style={{ fontSize: "12px", color: svc.color, background: svc.bg }}>{svc.name}</span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="font-bold" style={{ fontSize: "14px", color: "#111827" }}>{fmtC2(svc.base)}</span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span style={{ fontSize: "13px", color: "#374151" }}>{fmtC2(svc.overtime)}</span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span style={{ fontSize: "13px", color: "#374151" }}>{fmtC2(svc.weekend)}</span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full" style={{ fontSize: "10px", fontWeight: 700, color: "#16a34a", background: "#dcfce7" }}>
                            <CheckCircle2 size={10} strokeWidth={2.5} /> Active
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
