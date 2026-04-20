import React, { useState } from "react";
import { 
  ChevronLeft, Upload, DollarSign, Building2, Calendar, Lock, 
  Users, CheckCircle2, Search, Filter, Eye, Edit2, Trash2,
  ChevronDown, ChevronRight, Download, Receipt, Send, Loader2, Save, X
} from "lucide-react";
import { collection, getDocs, query, where, doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import InvoiceGenerator from "./InvoiceGenerator";

const fmtC = (v) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v || 0);
const fmtC2 = (v) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v || 0);

export default function BillingAgencyDetails({ agency, onBack }) {
  const [activeTab, setActiveTab] = useState("billable");
  const [filter, setFilter] = useState("All");
  const [expandedClients, setExpandedClients] = useState({});
  const [showInvoiceBuilder, setShowInvoiceBuilder] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Pricing Tab State
  const [editingService, setEditingService] = useState(null);
  const [editForm, setEditForm] = useState({ billingRate: "", kmRate: "" });
  const [liveAgency, setLiveAgency] = useState(agency);
  const [isSaving, setIsSaving] = useState(false);

  const [dateRange, setDateRange] = useState({ 
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0], 
    to: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0] 
  });

  const [liveClientGroups, setLiveClientGroups] = useState([]);
  const [liveInvoiceGroups, setLiveInvoiceGroups] = useState([]);

  React.useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // 1. Fetch real clients linked to this agency
        let clientsList = [];
        const clientsSnap = await getDocs(collection(db, "clients"));
        clientsSnap.docs.forEach(d => {
          const c = d.data();
          const aName = c.agencyName || c.agency || "";
          if (aName.trim().toLowerCase() === (agency.name || "").trim().toLowerCase()) {
            clientsList.push({ id: d.id, ...c });
          }
        });

        // 2. Fetch all shifts (so we don't hit 10-item limit with 'in' queries)
        const shiftsSnap = await getDocs(collection(db, "shifts"));
        const allShifts = [];
        shiftsSnap.docs.forEach(d => {
          const s = d.data();
          allShifts.push({ id: d.id, ...s });
        });

        // 3. Group and aggregate
        const mappedGroups = clientsList.map((client, idx) => {
          // Filter shifts for this client and within the date range
          const clientShifts = allShifts.filter(s => {
            const matchClient = s.clientId === client.id || s.clientName === client.name;
            
            // Aggressively extract date and parse to YYYY-MM-DD
            let sDateStr = "";
            let rawDate = s.date || s.shiftDate || s.startDate || s.createdAt || "";
            
            if (rawDate) {
              if (typeof rawDate === 'object' && rawDate.toDate) {
                sDateStr = rawDate.toDate().toISOString().split("T")[0];
              } else if (typeof rawDate === 'object' && rawDate.seconds) {
                sDateStr = new Date(rawDate.seconds * 1000).toISOString().split("T")[0];
              } else {
                // Clean strings like "01 Jan 2025" and extract safely
                const pd = new Date(rawDate);
                if (!isNaN(pd)) {
                  // Standardize offset to grab local date component 
                  sDateStr = new Date(pd.getTime() - pd.getTimezoneOffset() * 60000).toISOString().split("T")[0];
                } else {
                  sDateStr = String(rawDate).split("T")[0];
                }
              }
            }
            
            let matchDate = true;
            if (dateRange.from && sDateStr && sDateStr < dateRange.from) matchDate = false;
            if (dateRange.to && sDateStr && sDateStr > dateRange.to) matchDate = false;
            // If the shift completely lacks a date, we exclude it from date-bound billing
            if (!sDateStr || sDateStr === "undefined") matchDate = false;

            return matchClient && matchDate;
          });

          let hours = 0;
          let shiftTotal = 0;
          let transportTotal = 0;

          const processedShifts = clientShifts.map((s, sIdx) => {
            
            // 1) Extract Safe Display Date
            let displayDate = "Unknown";
            if (s.startDate) {
              const d = typeof s.startDate?.toDate === "function" ? s.startDate.toDate() : new Date(s.startDate);
              if (!isNaN(d)) displayDate = d.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
            }

            // 2) Extract Staff Member securely
            const staffMember = s.name || s.user || s.staffName || s.assignedUser || "Unknown";

            // 3) Parse precise diff hours using clockIn / clockOut
            const parseClockTime = (val) => {
              if (!val) return null;
              if (String(val).includes("T") || String(val).includes("Z")) return new Date(val);
              const [h, min] = String(val).split(":").map(Number);
              if (isNaN(h)) return null;
              const d = new Date(); d.setHours(h, min || 0, 0, 0);
              return d;
            };

            let h = parseFloat(s.hoursWorked || s.duration || 0);
            if (!h && s.clockIn && s.clockOut) {
              const ci = parseClockTime(s.clockIn);
              const co = parseClockTime(s.clockOut);
              if (ci && co) {
                const diffMs = co - ci;
                if (diffMs > 0) h = diffMs / 3600000;
              }
            }
            if (!h) h = 0;
            h = Math.round(h * 100) / 100; // round to 2 decimals

            // 4) Inherit Exact Database Rates from Agency Settings
            const rawCatKey = (s.categoryName || s.shiftCategory || s.typeName || s.shiftType || "Emergency Care");
            let matchedRate = liveAgency?.globalBillingRate || 55;
            let matchedTransportRate = liveAgency?.globalKmRate || 0.60;
            
            if (Array.isArray(liveAgency?.rates)) {
              const found = liveAgency.rates.find(rt => (rt.name || "").toLowerCase() === rawCatKey.toLowerCase());
              if (found) {
                if (found.billingRate) matchedRate = parseFloat(found.billingRate);
                if (found.kmRate) matchedTransportRate = parseFloat(found.kmRate);
              }
            }

            const r = parseFloat(s.rate || s.hourlyRate) || matchedRate;
            const amt = h * r;
            
            // 5) Transport KM check from `extraShiftPoints` if standard km missing
            let tkms = parseFloat(s.approvedKms || s.approvedKM || s.kilometers || 0);
            if (!tkms && Array.isArray(s.extraShiftPoints) && s.extraShiftPoints.length > 0) {
              const last = s.extraShiftPoints[s.extraShiftPoints.length - 1];
              tkms = parseFloat(last.approvedKM || last.approvedKm || last.totalKilometer || last.totalKM || 0);
            }

            const trate = parseFloat(s.kmRate || s.mileageRate) || matchedTransportRate;
            const tamt = tkms * trate;

            hours += h;
            shiftTotal += amt;
            transportTotal += tamt;

            return {
              id: s.id,
              date: displayDate,
              type: rawCatKey,
              staff: staffMember,
              hours: h,
              rate: r,
              total: amt,
              transportRate: trate,
              transportKm: tkms,
              transportAmount: tamt,
              status: s.billingStatus || (s.clockIn && s.clockOut ? "Billable" : "Locked")
            };
          });

          return {
            id: client.id,
            name: client.name || "Unknown Client",
            code: client.clientId || client.id.slice(0, 8).toUpperCase(),
            shiftsCount: processedShifts.length,
            hours,
            transportTotal,
            grandTotal: shiftTotal + transportTotal,
            shifts: processedShifts
          };
        });

        // Create standard expand state map
        const exp = {};
        mappedGroups.forEach((g, i) => exp[g.id] = (i === 0));
        setExpandedClients(exp);

        setLiveClientGroups(mappedGroups.filter(g => g.shiftsCount > 0)); // Only show clients with shifts in range

        // Mock invoices matching the group for now since standard invoice storage differs
        const mInvs = mappedGroups.filter(g => g.shiftsCount > 0).map(g => ({
          ...g,
          invoicesCount: 1,
          invoices: [{
            id: `INV-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000)+1000}`,
            period: `${dateRange.from} to ${dateRange.to}`,
            shiftsCount: g.shiftsCount,
            hours: g.hours,
            amount: g.grandTotal,
            status: ["Pending", "Paid", "Draft"][Math.floor(Math.random()*3)],
            dueDate: dateRange.to
          }]
        }));
        setLiveInvoiceGroups(mInvs);

      } catch (err) {
        console.error("Error fetching live billing data for agency:", err);
      } finally {
        setIsLoading(false);
      }
    };
    
    if (agency?.name) fetchData();
  }, [agency.name, dateRange.from, dateRange.to]);

  const toggleClient = (id) => {
    setExpandedClients(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Live KPIs based on current fetched data
  const kpis = [
    { label: "TOTAL BILLED", value: fmtC(liveClientGroups.reduce((a, b) => a + b.grandTotal, 0)), color: "#111827", iconColor: "#10b981", iconBg: "#ecfdf5" },
    { label: "PENDING AMOUNT", value: fmtC(agency.pending || 0), color: "#111827", iconColor: "#d97706", iconBg: "#fef3c7" },
    { label: "AMOUNT PAID", value: fmtC(agency.paid || 0), color: "#111827", iconColor: "#16a34a", iconBg: "#dcfce7" },
    { label: "LOCKED SHIFTS", value: liveClientGroups.reduce((a, b) => a + b.shifts.filter(s => s.status === "Locked").length, 0), color: "#111827", iconColor: "#ef4444", iconBg: "#fee2e2" },
    { label: "ACTIVE CLIENTS", value: liveClientGroups.length, color: "#111827", iconColor: "#3b82f6", iconBg: "#dbeafe" }
  ];

  const getStatusColor = (s) => {
    if (s === "Locked") return { text: "#dc2626", dot: "#ef4444" };
    if (s === "Invoiced") return { text: "#374151", dot: "#6b7280" };
    if (s === "Pending") return { text: "#d97706", dot: "#f59e0b", bg: "#fef3c7" };
    return { text: "#16a34a", dot: "#22c55e" };
  };

  const startEditing = (rateItem, index) => {
    setEditingService(index);
    setEditForm({
      billingRate: rateItem.billingRate ?? 0,
      kmRate: rateItem.kmRate ?? liveAgency.globalKmRate ?? "0.60"
    });
  };

  const cancelEditing = () => {
    setEditingService(null);
    setEditForm({ billingRate: "", kmRate: "" });
  };

  const savePricing = async (index) => {
    setIsSaving(true);
    try {
      const newList = [...(liveAgency.rateList || [])];
      newList[index] = {
        ...newList[index],
        billingRate: parseFloat(editForm.billingRate) || 0,
        kmRate: String(editForm.kmRate)
      };

      const agencyRef = doc(db, "agencies", liveAgency.id);
      await updateDoc(agencyRef, { rateList: newList });
      
      setLiveAgency(prev => ({ ...prev, rateList: newList }));
      setEditingService(null);
    } catch (err) {
      console.error("Failed to update pricing", err);
      alert("Failed to update pricing.");
    } finally {
      setIsSaving(false);
    }
  };

  if (showInvoiceBuilder) {
    return <InvoiceGenerator agency={agency} groups={liveClientGroups} preselectedClientId={typeof showInvoiceBuilder === 'string' ? showInvoiceBuilder : null} dateRange={dateRange} onBack={() => setShowInvoiceBuilder(false)} />;
  }

  return (
    <div className="flex flex-col h-full bg-[#f8f9fa] relative" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      
      <div className="flex-1 overflow-auto pb-20">
        <div className="px-8 pt-8 pb-4">
          
          {/* Header Row */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <button onClick={onBack} className="w-10 h-10 flex items-center justify-center rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition-all text-gray-500 shadow-sm">
                <ChevronLeft size={20} />
              </button>
              <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-xl shadow-md">
                {(agency.name || "C")[0].toUpperCase()}
              </div>
              <div>
                <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight leading-tight mb-1">{agency.name || "Agency Name"}</h1>
                <div className="flex items-center gap-2 text-xs font-bold text-gray-400">
                  <span className="text-blue-600">{agency.agencyType || "Non-Profit"}</span>
                  <span className="w-1 h-1 rounded-full bg-gray-300" />
                  <span className="flex items-center gap-1 text-emerald-600"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Active</span>
                  <span className="w-1 h-1 rounded-full bg-gray-300" />
                  <span>{agency.contactPerson || "Contact Person"}</span>
                  <span className="w-1 h-1 rounded-full bg-gray-300" />
                  <span>{agency.email || "email@example.com"}</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition-all font-bold text-sm text-gray-700 shadow-sm">
                <Upload size={16} strokeWidth={2.5} /> Export
              </button>
              <button onClick={() => setShowInvoiceBuilder(true)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-700 text-white hover:bg-emerald-800 transition-all font-bold text-sm shadow-md shadow-emerald-700/20">
                <DollarSign size={16} strokeWidth={2.5} /> Generate Invoice
              </button>
            </div>
          </div>

          {/* KPI Row */}
          <div className="grid grid-cols-5 gap-4 mb-6">
            {kpis.map((kpi, i) => (
              <div key={i} className="bg-white p-4 rounded-2xl border" style={{ borderColor: "#f3f4f6" }}>
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ backgroundColor: kpi.iconBg, color: kpi.iconColor }}>
                    {i === 0 ? <DollarSign size={12} strokeWidth={3} /> : 
                     i === 1 ? <Calendar size={12} strokeWidth={3} /> :
                     i === 2 ? <CheckCircle2 size={12} strokeWidth={3} /> :
                     i === 3 ? <Lock size={12} strokeWidth={3} /> :
                     <Users size={12} strokeWidth={3} />}
                  </div>
                  {kpi.label}
                </div>
                <div className="text-xl font-black text-gray-900">{kpi.value}</div>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-6 border-b border-gray-200 mb-6">
            {["Billable Shifts", "Invoices", "Pricing"].map(tab => {
              const isActive = activeTab === tab.toLowerCase().split(" ")[0];
              return (
                <button key={tab} onClick={() => setActiveTab(tab.toLowerCase().split(" ")[0])}
                  className={`flex items-center gap-2 pb-3 font-bold text-sm transition-colors border-b-2 ${isActive ? "border-emerald-600 text-gray-900" : "border-transparent text-gray-400 hover:text-gray-600"}`}>
                  {tab === "Billable Shifts" && <Building2 size={16} />}
                  {tab === "Invoices" && <Receipt size={16} />}
                  {tab === "Pricing" && <DollarSign size={16} />}
                  {tab}
                  {tab === "Billable Shifts" && <span className={`px-1.5 py-0.5 rounded text-[10px] ${isActive ? "bg-emerald-50 text-emerald-600" : "bg-gray-100 text-gray-500"}`}>14</span>}
                  {tab === "Invoices" && <span className={`px-1.5 py-0.5 rounded text-[10px] ${isActive ? "bg-gray-100 text-gray-900" : "bg-gray-100 text-gray-500"}`}>2</span>}
                </button>
              );
            })}
          </div>

          {/* Toolbar */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 py-1 px-1 bg-white rounded-xl border border-gray-200 shadow-sm relative">
              <Filter size={14} className="absolute left-3 text-gray-400" />
              <div className="pl-8 flex items-center gap-1">
                {activeTab === "invoices" 
                  ? ["All", "Paid (3)", "Pending (2)", "Overdue (1)", "Draft (1)"].map(f => (
                    <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all ${filter === f ? "bg-emerald-700 text-white" : "text-gray-500 hover:bg-gray-50"}`}>
                      {f}
                    </button>
                  ))
                  : ["All", "Locked (5)", "Billable (5)", "Invoiced (4)"].map(f => (
                    <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all ${filter === f ? "bg-emerald-700 text-white" : "text-gray-500 hover:bg-gray-50"}`}>
                      {f}
                    </button>
                  ))}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                {activeTab === "invoices" ? (
                  <div className="flex items-center px-3 h-9 bg-white border border-gray-200 rounded-xl shadow-sm min-w-[140px]">
                    <span className="text-[12px] font-bold text-gray-500 mr-2">Year:</span>
                    <span className="text-[12px] font-bold text-gray-900 flex items-center gap-2">2026 <ChevronDown size={14} /></span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl shadow-sm px-2 overflow-hidden h-9">
                    <span className="text-[11px] font-bold text-gray-400">Date Range:</span>
                    <input 
                      type="date" 
                      value={dateRange.from}
                      onChange={(e) => setDateRange(p => ({ ...p, from: e.target.value }))}
                      className="text-[12px] font-bold text-gray-700 bg-transparent border-none outline-none cursor-pointer"
                    />
                    <span className="text-[11px] font-bold text-gray-400">to</span>
                    <input 
                      type="date" 
                      value={dateRange.to}
                      onChange={(e) => setDateRange(p => ({ ...p, to: e.target.value }))}
                      className="text-[12px] font-bold text-gray-700 bg-transparent border-none outline-none cursor-pointer"
                    />
                  </div>
                )}
              </div>
              <div className="relative w-64">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="text" placeholder={activeTab === "invoices" ? "Search invoices..." : "Search shifts..."} className="w-full h-9 pl-9 pr-3 bg-white border border-gray-200 rounded-xl text-[12px] font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
              </div>
            </div>
          </div>

          {/* Pricing Grid */}
          {activeTab === "pricing" && (
            <div className="mb-4">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="text-[16px] font-extrabold text-gray-900">Service Pricing Configuration</h2>
                  <p className="text-[13px] font-medium text-gray-500 mt-1">Configure hourly rates and transportation KM rates for each service type. Changes take effect on the next billing cycle globally for this agency.</p>
                </div>
                <button className="flex items-center gap-2 px-4 py-2 bg-emerald-700 text-white rounded-xl text-[13px] font-bold hover:bg-emerald-800 shadow-sm transition-colors">
                  <Upload size={14} /> Import Rates
                </button>
              </div>

              <div className="grid grid-cols-2 gap-6">
                {(liveAgency.rateList || []).map((rate, idx) => {
                  const isEditing = editingService === idx;

                  return (
                    <div key={idx} className={`bg-white border rounded-2xl p-6 transition-all ${isEditing ? "border-emerald-500 shadow-lg shadow-emerald-500/10 ring-4 ring-emerald-50" : "border-gray-200 shadow-sm hover:border-emerald-200"}`}>
                      
                      {/* Card Header */}
                      <div className="flex items-start justify-between mb-6">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold shadow-sm ${isEditing ? "bg-emerald-100 text-emerald-600" : "bg-gray-50 border border-gray-100 text-gray-500"}`}>
                            {rate.name?.substring(0,2).toUpperCase()}
                          </div>
                          <div>
                            <h3 className="text-[15px] font-extrabold text-gray-900 leading-tight">{rate.name || "Service"}</h3>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded mt-1 inline-block">Effective Now</span>
                          </div>
                        </div>

                        {isEditing ? (
                          <div className="flex items-center gap-2">
                            <button onClick={cancelEditing} className="px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500 text-[11px] font-bold hover:bg-gray-50 transition-colors flex items-center gap-1">
                              <X size={12} /> Cancel
                            </button>
                            <button onClick={() => savePricing(idx)} disabled={isSaving} className="px-3 py-1.5 rounded-lg bg-emerald-700 text-white text-[11px] font-bold hover:bg-emerald-800 transition-colors flex items-center gap-1 shadow-sm disabled:opacity-50">
                              {isSaving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Save
                            </button>
                          </div>
                        ) : (
                          <button onClick={() => startEditing(rate, idx)} className="flex items-center gap-1.5 text-[12px] font-bold text-gray-400 hover:text-emerald-700 transition-colors border border-gray-200 rounded-lg px-3 py-1.5 hover:border-emerald-200 hover:bg-emerald-50">
                            <Edit2 size={12} /> Edit Rates
                          </button>
                        )}
                      </div>

                      {/* Pricing Fields */}
                      <div className="flex items-center gap-4">
                        <div className={`flex-1 p-4 rounded-xl border transition-colors ${isEditing ? "bg-white border-emerald-200" : "bg-gray-50 border-gray-100"}`}>
                          <p className={`text-[10px] font-extrabold uppercase tracking-widest mb-1 ${isEditing ? "text-emerald-600" : "text-gray-400"}`}>Base Rate (Per Hour)</p>
                          {isEditing ? (
                            <div className="relative">
                              <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                              <input 
                                type="number" 
                                value={editForm.billingRate} 
                                onChange={e => setEditForm({...editForm, billingRate: e.target.value})}
                                className="w-full pl-8 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-[14px] font-black text-gray-900 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                              />
                            </div>
                          ) : (
                            <div className="text-[20px] font-black text-gray-900 tracking-tight">
                              ${parseFloat(rate.billingRate || 0).toFixed(2)}<span className="text-[13px] font-bold text-gray-400 ml-1">/hr</span>
                            </div>
                          )}
                        </div>

                        <div className={`flex-1 p-4 rounded-xl border transition-colors ${isEditing ? "bg-white border-purple-200" : "bg-purple-50/50 border-purple-100"}`}>
                          <p className={`text-[10px] font-extrabold uppercase tracking-widest mb-1 ${isEditing ? "text-purple-600" : "text-purple-400"}`}>Transportation Rate</p>
                          {isEditing ? (
                            <div className="relative">
                              <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                              <input 
                                type="number" 
                                value={editForm.kmRate} 
                                onChange={e => setEditForm({...editForm, kmRate: e.target.value})}
                                className="w-full pl-8 pr-3 py-2 bg-white border border-purple-200 rounded-lg text-[14px] font-black text-gray-900 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
                                step="0.01"
                              />
                            </div>
                          ) : (
                            <div className="text-[20px] font-black text-gray-900 tracking-tight">
                              ${parseFloat(rate.kmRate || liveAgency.globalKmRate || 0.60).toFixed(2)}<span className="text-[13px] font-bold text-gray-400 ml-1">/km</span>
                            </div>
                          )}
                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Collapsible List Grid */}
          {activeTab !== "pricing" && (
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm min-h-[400px]">
            
            {isLoading ? (
              <div className="flex flex-col items-center justify-center p-20 text-gray-400">
                <Loader2 size={32} className="animate-spin text-emerald-600 mb-4" />
                <p className="text-sm font-bold text-gray-500">Loading live clients and shifts...</p>
              </div>
            ) : liveClientGroups.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-20 text-gray-400">
                <Users size={40} className="mb-4 opacity-20" />
                <p className="text-sm font-bold text-gray-500">No shifts found for these dates.</p>
                <p className="text-[11px] font-medium text-gray-400 mt-1">Try expanding the date range filter.</p>
              </div>
            ) : (
              <>
                {activeTab === "billable" && liveClientGroups.map((group, idx) => {
              const isExpanded = expandedClients[group.id];
              return (
                <div key={group.id} className={`${idx !== 0 ? "border-t border-gray-200" : ""}`}>
                  
                  {/* Client Row */}
                  <div 
                    onClick={() => toggleClient(group.id)} 
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <button className="text-gray-400 hover:text-gray-600 transition-colors">
                        {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                      </button>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${idx % 2 === 0 ? "bg-blue-100 text-blue-600" : "bg-emerald-100 text-emerald-600"}`}>
                        {group.name[0]}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-[14px] text-gray-900">{group.name}</span>
                        <span className="text-[11px] font-bold text-gray-400">{group.code}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-500">{group.shiftsCount} shifts</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <span className="text-[12px] font-bold text-gray-400">{group.hours}h</span>
                      <span className="text-[12px] font-bold text-purple-600">+{fmtC2(group.transportTotal)}</span>
                      <span className="text-[15px] font-black text-gray-900">{fmtC(group.grandTotal)}</span>
                      <button 
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          setShowInvoiceBuilder(group.id); 
                        }} 
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-[11px] font-bold rounded-lg transition-colors border border-emerald-200"
                      >
                        <Receipt size={12} />
                        Invoice Client
                      </button>
                    </div>
                  </div>

                  {/* Expanded Detail Rows */}
                  {isExpanded && group.shifts.length > 0 && (
                    <div className="bg-[#fafafa] border-t border-gray-200">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-200">
                            {["DATE", "SERVICE TYPE", "STAFF MEMBER", "HOURS", "RATE", "TOTAL", "TRANSPORT", "STATUS"].map(h => (
                              <th key={h} className="text-left px-5 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {group.shifts.map(shift => {
                            const sc = getStatusColor(shift.status);
                            return (
                              <tr key={shift.id} className="border-b border-gray-100 hover:bg-white transition-colors">
                                <td className="px-5 py-3 text-[12px] font-bold text-gray-900">{shift.date}</td>
                                <td className="px-5 py-3 text-[12px] font-bold text-red-500">{shift.type}</td>
                                <td className="px-5 py-3 text-[12px] font-medium text-gray-600">{shift.staff}</td>
                                <td className="px-5 py-3 text-[12px] font-bold text-gray-900">{shift.hours}h</td>
                                <td className="px-5 py-3 text-[12px] font-bold text-gray-500">{fmtC2(shift.rate)}/hr</td>
                                <td className="px-5 py-3 text-[13px] font-black text-gray-900">{fmtC(shift.total)}</td>
                                <td className="px-5 py-3">
                                  <p className="text-[12px] font-bold text-purple-600">{fmtC2(shift.transportAmount)}</p>
                                  <p className="text-[10px] font-bold text-gray-400">{shift.transportKm}km x {fmtC2(shift.transportRate)}</p>
                                </td>
                                <td className="px-5 py-3 text-[11px] font-bold flex items-center gap-1.5" style={{ color: sc.text }}>
                                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: sc.dot }} /> {shift.status}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                      
                      {/* Footer Totals inside Expanded area */}
                      <div className="bg-white flex items-center justify-end gap-4 p-4 text-[12px] font-bold text-gray-500">
                        <span>{group.shiftsCount} shifts · {group.hours}h</span>
                        <span>·</span>
                        <span className="text-gray-400">Shift: {fmtC(group.grandTotal - group.transportTotal)}</span>
                        <span>·</span>
                        <span className="text-purple-600">Transport: {fmtC2(group.transportTotal)}</span>
                        <span>·</span>
                        <span className="text-[14px] font-black text-gray-900">{fmtC(group.grandTotal)} total</span>
                      </div>
                    </div>
                  )}

                </div>
              );
            })}

            {activeTab === "invoices" && liveInvoiceGroups.map((group, idx) => {
              const isExpanded = expandedClients[group.id];
              return (
                <div key={`inv-${group.id}`} className={`${idx !== 0 ? "border-t border-gray-200" : ""}`}>
                  
                  {/* Invoice Client Row */}
                  <div 
                    onClick={() => toggleClient(group.id)} 
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors bg-[#f4fbf7]/30"
                  >
                    <div className="flex items-center gap-3">
                      <button className="text-gray-400 hover:text-gray-600 transition-colors">
                        {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                      </button>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm bg-indigo-50 text-indigo-600`}>
                        {group.name[0]}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-[14px] text-gray-900">{group.name}</span>
                        <span className="text-[11px] font-bold text-gray-400">{group.code}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-500">{group.invoicesCount} invoice{group.invoicesCount !== 1 ? 's' : ''}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <span className="text-[14px] font-black text-gray-900">{fmtC(group.grandTotal)} total</span>
                    </div>
                  </div>

                  {/* Expanded Invoices List */}
                  {isExpanded && group.invoices.length > 0 && (
                    <div className="bg-white border-t border-gray-200">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-100">
                            {["INVOICE #", "BILLING PERIOD", "SHIFTS", "HOURS", "AMOUNT", "STATUS", "DUE DATE", "ACTIONS"].map(h => (
                              <th key={h} className={`text-left px-5 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest ${h==='ACTIONS'?'text-right pr-6':''}`}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {group.invoices.map(inv => {
                            const sc = getStatusColor(inv.status);
                            return (
                              <tr key={inv.id} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                                <td className="px-5 py-4 text-[12px] font-bold text-emerald-700">{inv.id}</td>
                                <td className="px-5 py-4 text-[12px] font-bold text-gray-600">{inv.period}</td>
                                <td className="px-5 py-4">
                                  <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-50 text-blue-600"># {inv.shiftsCount}</span>
                                </td>
                                <td className="px-5 py-4 text-[12px] font-bold text-gray-900">{inv.hours}h</td>
                                <td className="px-5 py-4 text-[13px] font-black text-gray-900">{fmtC(inv.amount)}</td>
                                <td className="px-5 py-4">
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold" style={{ backgroundColor: sc.bg || "#f3f4f6", color: sc.text }}>
                                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: sc.dot }} /> {inv.status}
                                  </span>
                                </td>
                                <td className="px-5 py-4 text-[12px] font-bold text-gray-600">{inv.dueDate}</td>
                                <td className="px-5 py-4 text-right pr-6">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <button onClick={() => setShowInvoiceBuilder(true)} className="w-8 h-8 rounded border border-blue-100 text-blue-500 flex items-center justify-center hover:bg-blue-50"><Eye size={14} /></button>
                                    <button className="w-8 h-8 rounded border border-emerald-100 text-emerald-500 flex items-center justify-center hover:bg-emerald-50"><Download size={14} /></button>
                                    <button className="w-8 h-8 rounded border border-purple-100 text-purple-500 flex items-center justify-center hover:bg-purple-50"><Send size={14} /></button>
                                    <button className="w-8 h-8 rounded border border-gray-200 text-gray-400 flex items-center justify-center hover:bg-gray-100">...</button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}

                </div>
              );
            })}
              </>
            )}
          </div>
          )}

        </div>

      </div>

      {/* Floating Bottom Footer Toolbar */}
      {activeTab !== "pricing" && (
      <div className="absolute bottom-0 left-0 right-0 h-[60px] bg-white border-t border-gray-200 px-8 flex items-center justify-between shadow-[0_-4px_10px_rgba(0,0,0,0.02)]">
        <div className="text-[12px] font-bold text-gray-400">
          Showing {liveClientGroups.reduce((a,b)=>a+b.shiftsCount,0)} shifts across {liveClientGroups.length} clients
        </div>
        <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-gray-400">
          <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-red-500" /> Locked: 6</span>
          <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Billable: 5</span>
          <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-gray-500" /> Invoiced: 4</span>
        </div>
        <div className="flex items-center gap-4 text-[12px] font-bold text-gray-500">
          <span className="text-gray-400">Total Hours: <span className="text-gray-900 ml-1">{liveClientGroups.reduce((a,b)=>a+b.hours,0)}h</span></span>
          <span className="text-gray-400">Shifts: <span className="text-gray-900 ml-1">{fmtC(liveClientGroups.reduce((a,b)=>a+(b.grandTotal-b.transportTotal),0))}</span></span>
          <span className="text-gray-400">Transport: <span className="text-purple-600 ml-1">{fmtC2(liveClientGroups.reduce((a,b)=>a+b.transportTotal, 0))}</span></span>
          <span className="text-[15px] font-black text-gray-900 ml-2">Grand Total {fmtC(liveClientGroups.reduce((a,b)=>a+b.grandTotal,0))}</span>
        </div>
      </div>
      )}

    </div>
  );
}
