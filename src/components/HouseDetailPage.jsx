import { useState, useEffect } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import {
  Users, UserCheck, ShieldCheck, AlertTriangle, AlertCircle,
  Home, Eye, Edit2, Trash2, MoreHorizontal, CheckCircle2, Clock, MapPin,
  Activity, ClipboardList, Wrench, Bell, Package, Syringe, Utensils,
  ShieldAlert, FileText, Calendar, X, ChevronDown, ChevronUp,
  User, Plus, HardHat, Stethoscope, Backpack, Flame,
  Pill, Heart, Search, Download, ChevronRight,
  Image as ImageIcon
} from "lucide-react";
import HouseDetailPanel from "./HouseDetailPanel";
import SharpsInvestigationPanel from "./SharpsInvestigationPanel";

// ─── Compliance inspection data ───────────────────────────────────────────────
const INSPECTIONS = [
  { id: 1, name: "OHS", abbrev: "OHS", frequency: "Every 15 days", icon: "HardHat", circleBg: "#FFF3E0", iconColor: "#F57C00", lastCompleted: "2026-04-17", lastCompletedTime: "9:20 AM", completedBy: "Robert Sato", nextDue: "2026-05-02", daysUntilDue: -2, status: "Overdue", assignedTo: "Robert Sato" },
  { id: 2, name: "HIC", abbrev: "HIC", frequency: "Every 7 days", icon: "Stethoscope", circleBg: "#E8F5E9", iconColor: "#2E7D32", lastCompleted: "2026-04-14", lastCompletedTime: "11:00 AM", completedBy: "Jane Smith", nextDue: "2026-04-21", daysUntilDue: 2, status: "Due Soon", assignedTo: "Jane Smith" },
  { id: 3, name: "72-Hour Emergency Kit Audit", abbrev: "72HR", frequency: "Every 30 days", icon: "Backpack", circleBg: "#FFEBEE", iconColor: "#C62828", lastCompleted: "2026-03-28", lastCompletedTime: "4:15 PM", completedBy: "Mike Johnson", nextDue: "2026-04-27", daysUntilDue: 8, status: "Compliant", assignedTo: "Mike Johnson" },
  { id: 4, name: "Fire Drill", abbrev: "FIRE", frequency: "Every 15 days", icon: "Flame", circleBg: "#FFEBEE", iconColor: "#C62828", lastCompleted: "2026-04-06", lastCompletedTime: "10:00 AM", completedBy: "John Doe", nextDue: "2026-04-21", daysUntilDue: 2, status: "Due Soon", assignedTo: "John Doe" },
  { id: 5, name: "Inventory Checklist", abbrev: "INV", frequency: "Daily", icon: "Package", circleBg: "#E3F2FD", iconColor: "#1565C0", lastCompleted: "2026-04-19", lastCompletedTime: "7:45 AM", completedBy: "Sarah Chen", nextDue: "2026-04-20", daysUntilDue: 0, status: "Compliant", assignedTo: "Sarah Chen" },
  { id: 6, name: "Sharps Checklist", abbrev: "SHRP", frequency: "Daily", icon: "Syringe", circleBg: "#FFEBEE", iconColor: "#C62828", lastCompleted: "2026-04-19", lastCompletedTime: "8:00 AM", completedBy: "Sarah Chen", nextDue: "2026-04-20", daysUntilDue: 0, status: "Compliant", assignedTo: "Sarah Chen" },
  { id: 7, name: "Medication Inventory", abbrev: "MED", frequency: "Every 7 days", icon: "Pill", circleBg: "#F3E5F5", iconColor: "#7B1FA2", lastCompleted: "2026-04-14", lastCompletedTime: "9:00 AM", completedBy: "Jane Smith", nextDue: "2026-04-21", daysUntilDue: 2, status: "Compliant", assignedTo: "Jane Smith" },
  { id: 8, name: "First Aid Kit Audit", abbrev: "AID", frequency: "Every 30 days", icon: "Heart", circleBg: "#FFEBEE", iconColor: "#C62828", lastCompleted: "2026-04-02", lastCompletedTime: "3:30 PM", completedBy: "Mike Johnson", nextDue: "2026-05-02", daysUntilDue: 13, status: "Compliant", assignedTo: "Mike Johnson" },
];

const ICON_MAP = { HardHat, Stethoscope, Backpack, Flame, Package, Syringe, Pill, Heart };

const getStatusColor = (status) => {
  if (status === "Compliant") return { bg: "#E8F5E9", text: "#2E7D32" };
  if (status === "Due Soon") return { bg: "#FFF3E0", text: "#F57C00" };
  if (status === "Overdue") return { bg: "#FFEBEE", text: "#C62828" };
  return { bg: "#F5F5F5", text: "#757575" };
};

const getInitials = (name) => name.split(" ").map((n) => n[0]).join("");
const getAvatarColor = (name) => {
  const colors = ["#FFCDD2", "#F8BBD0", "#E1BEE7", "#C5CAE9", "#BBDEFB", "#B2DFDB", "#DCEDC8", "#FFF9C4"];
  const hash = name.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return colors[hash % colors.length];
};

// ─── TABS CONFIG ──────────────────────────────────────────────────────────────
const TABS = [
  { id: "overview",      label: "Overview",      icon: <Activity size={14} strokeWidth={2} /> },
  { id: "clients",       label: "Clients",       icon: <Users size={14} strokeWidth={2} /> },
  { id: "staff",         label: "Staff",         icon: <UserCheck size={14} strokeWidth={2} /> },
  { id: "shift",         label: "Shift",         icon: <ClipboardList size={14} strokeWidth={2} /> },
  { id: "compliance",    label: "Compliance",    icon: <ShieldCheck size={14} strokeWidth={2} /> },
  { id: "maintenance",   label: "Maintenance",   icon: <Wrench size={14} strokeWidth={2} /> },
  { id: "alerts",        label: "Alerts",        icon: <Bell size={14} strokeWidth={2} /> },
  { id: "inventory",     label: "Inventory",     icon: <Package size={14} strokeWidth={2} /> },
  { id: "sharps",        label: "Sharps",        icon: <Syringe size={14} strokeWidth={2} /> },
  { id: "food-safety",   label: "Food Safety",   icon: <Utensils size={14} strokeWidth={2} /> },
  { id: "emergency-kit", label: "Emergency Kit", icon: <ShieldAlert size={14} strokeWidth={2} /> },
  { id: "reports",       label: "Reports",       icon: <FileText size={14} strokeWidth={2} /> },
];

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
const HouseDetailPage = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const stateHouse = location.state?.house || null;
  const programLabel = location.state?.programLabel || "Programs";
  const programPath = location.state?.programPath || "/admin-dashboard/services";

  const [house, setHouse] = useState(stateHouse);
  const [loading, setLoading] = useState(!stateHouse);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    if (stateHouse || id?.startsWith("__demo_")) { setLoading(false); return; }
    (async () => {
      try {
        const snap = await getDoc(doc(db, "houses", id));
        if (snap.exists()) setHouse({ id: snap.id, ...snap.data() });
      } catch (e) {
        console.error("Error fetching house:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-7 h-7 border-2 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
      </div>
    );
  }
  if (!house) {
    return <div className="py-20 text-center" style={{ fontSize: 14, color: "#6b7280" }}>House not found.</div>;
  }

  const pct = house.compliancePct ?? 96;
  const compColor = pct >= 95 ? "#16a34a" : pct >= 90 ? "#f59e0b" : "#dc2626";
  const alerts = house.alertsCount ?? 0;

  return (
    <div style={{ fontFamily: "Roboto, sans-serif" }}>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-3" style={{ fontSize: 13, color: "#6b7280" }}>
        <button onClick={() => navigate("/admin-dashboard/services")} className="font-medium hover:underline transition-colors" style={{ color: "#1f7a3c" }}>Programs</button>
        <span>/</span>
        <button onClick={() => navigate(programPath, { state: location.state })} className="font-medium hover:underline transition-colors" style={{ color: "#1f7a3c" }}>{programLabel}</button>
        <span>/</span>
        <span className="font-semibold" style={{ color: "#111827" }}>{house.houseName}</span>
      </div>

      {/* Title */}
      <h1 className="font-bold mb-1" style={{ fontSize: 28, letterSpacing: "-0.02em", color: "#111827" }}>{house.houseName}</h1>
      <p className="mb-5" style={{ fontSize: 14, color: "#6b7280" }}>Comprehensive management dashboard for {house.houseName}</p>

      {/* Summary Cards */}
      <div className="grid grid-cols-6 gap-3 mb-5">
        {[
          { label: "Capacity / Occupancy", value: `${house.activeClients ?? house.assignedClients?.length ?? 0}/${house.maxCapacity ?? 0}`, color: "#111827" },
          { label: "Total Clients",         value: house.activeClients ?? house.assignedClients?.length ?? 0,   color: "#111827" },
          { label: "Total Staff",           value: house.staffCount ?? house.assignedStaff?.length ?? 0,      color: "#111827" },
          { label: "Active Shifts",         value: 12,                          color: "#111827" },
          { label: "Compliance",            value: `${pct}%`,                   color: compColor },
          { label: "Open Issues",           value: alerts,                      color: alerts > 0 ? "#dc2626" : "#16a34a" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-xl p-4 border" style={{ borderColor: "#e5e7eb" }}>
            <div style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>{label}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Tab bar */}
      <div className="flex items-center border-b mb-4 overflow-x-auto" style={{ borderColor: "#e5e7eb" }}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="flex items-center gap-1.5 px-4 py-2.5 font-medium transition-all relative shrink-0"
            style={{ fontSize: 13, color: activeTab === tab.id ? "#1f7a3c" : "#6b7280", fontWeight: activeTab === tab.id ? 600 : 500 }}
          >
            <span style={{ color: activeTab === tab.id ? "#1f7a3c" : "#9ca3af" }}>{tab.icon}</span>
            <span>{tab.label}</span>
            {activeTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-0.5" style={{ backgroundColor: "#1f7a3c" }} />}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div>
        {activeTab === "overview"      && <OverviewTab house={house} />}
        {activeTab === "clients"       && <ClientsTab house={house} />}
        {activeTab === "staff"         && <StaffTab house={house} />}
        {activeTab === "shift"         && <ShiftTab />}
        {activeTab === "compliance"    && <ComplianceTabContent />}
        {activeTab === "maintenance"   && <MaintenanceTab />}
        {activeTab === "alerts"        && <AlertsTab house={house} />}
        {activeTab === "inventory"     && <InventoryTab house={house} />}
        {activeTab === "sharps"        && <SharpsTab house={house} />}
        {activeTab === "food-safety"   && <FoodSafetyTab />}
        {activeTab === "emergency-kit" && <EmergencyKitTab />}
        {activeTab === "reports"       && <ReportsTab />}
      </div>
    </div>
  );
};

// ─── OVERVIEW TAB ─────────────────────────────────────────────────────────────
function OverviewTab({ house }) {
  const [selectedInspection, setSelectedInspection] = useState(null);

  const past = [
    { id: 1, type: "House Inspection", dateCompleted: "2026-04-15", completedBy: "Sarah Chen",   result: "Passed",             issuesFound: 0, riskLevel: "Low" },
    { id: 2, type: "Fire Drill",        dateCompleted: "2026-04-10", completedBy: "John Doe",     result: "Passed",             issuesFound: 0, riskLevel: "Low" },
    { id: 3, type: "OHS",               dateCompleted: "2026-04-08", completedBy: "Jane Smith",   result: "Passed with Issues", issuesFound: 2, riskLevel: "Medium" },
    { id: 4, type: "Sharps Check",      dateCompleted: "2026-04-05", completedBy: "Tony Miles",   result: "Passed",             issuesFound: 0, riskLevel: "Low" },
    { id: 5, type: "Food Safety",       dateCompleted: "2026-03-28", completedBy: "Robert Sato",  result: "Failed",             issuesFound: 5, riskLevel: "High" },
  ];
  const upcoming = INSPECTIONS.filter((i) => i.status === "Overdue" || i.status === "Due Soon");
  const overdue = INSPECTIONS.filter((i) => i.status === "Overdue");
  const pct = house.compliancePct ?? 96;
  const compPct = Math.round(((8 - overdue.length) / 8) * 100);

  const resultStyle = (r) =>
    r === "Passed" ? { bg: "#f0fdf4", color: "#16a34a", emoji: "✅" }
    : r === "Passed with Issues" ? { bg: "#fffbeb", color: "#f59e0b", emoji: "⚠️" }
    : { bg: "#fef2f2", color: "#dc2626", emoji: "❌" };

  const riskStyle = (r) =>
    r === "Low" ? { bg: "#f0fdf4", color: "#16a34a" }
    : r === "Medium" ? { bg: "#fffbeb", color: "#f59e0b" }
    : { bg: "#fef2f2", color: "#dc2626" };

  return (
    <div className="space-y-4">
      {/* Quick Stats + Recent Activity */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl p-5 border" style={{ borderColor: "#e5e7eb" }}>
          <h3 className="font-semibold mb-3" style={{ fontSize: 14, color: "#111827" }}>Quick Stats</h3>
          <div className="space-y-3">
            {[["Total Residents", house.activeClients ?? 0], ["Available Beds", (house.maxCapacity ?? 0) - (house.activeClients ?? 0)], ["Active Staff Today", 3], ["Ongoing Shifts", 2]].map(([k, v]) => (
              <div key={k} className="flex justify-between items-center">
                <span style={{ fontSize: 13, color: "#6b7280" }}>{k}</span>
                <span className="font-semibold" style={{ fontSize: 13, color: "#111827" }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 border" style={{ borderColor: "#e5e7eb" }}>
          <h3 className="font-semibold mb-3" style={{ fontSize: 14, color: "#111827" }}>Recent Activity</h3>
          <div className="space-y-2">
            {["Medication administered – 10:30 AM", "Shift change logged – 9:00 AM", "Compliance check passed – Yesterday"].map((a) => (
              <div key={a} style={{ fontSize: 13, color: "#6b7280" }}>{a}</div>
            ))}
          </div>
        </div>
      </div>

      {/* Compliance Summary */}
      <div className="bg-white rounded-xl p-5 border" style={{ borderColor: "#e5e7eb" }}>
        <h3 className="font-semibold mb-4" style={{ fontSize: 14, color: "#111827" }}>Compliance Summary</h3>
        <div className="grid grid-cols-5 gap-6">
          {[
            { label: "Overall Compliance", value: `${compPct}%`, color: compPct >= 90 ? "#16a34a" : "#f59e0b", big: true },
            { label: "Inspections Up to Date", value: `${8 - overdue.length} of 8`, color: "#111827" },
            { label: "Last Inspection", value: "2026-04-15", color: "#111827" },
            { label: "Next Due", value: upcoming.length ? upcoming[0].nextDue : "—", color: "#111827" },
            { label: "Overdue Count", value: overdue.length, color: overdue.length > 0 ? "#dc2626" : "#16a34a", big: true },
          ].map(({ label, value, color, big }) => (
            <div key={label}>
              <div style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600, textTransform: "uppercase", marginBottom: 6 }}>{label}</div>
              <div style={{ fontSize: big ? 24 : 13, fontWeight: 700, color }}>{value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Past Inspections */}
      <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: "#e5e7eb" }}>
        <div className="px-5 py-4 border-b" style={{ borderColor: "#e5e7eb" }}>
          <h3 className="font-semibold" style={{ fontSize: 14, color: "#111827" }}>Past Inspections</h3>
        </div>
        <table className="w-full">
          <thead style={{ backgroundColor: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
            <tr>
              {["Inspection Type", "Date Completed", "Completed By", "Result", "Issues Found", "Risk Level", "Actions"].map((h) => (
                <th key={h} className="px-4 py-3.5 text-left" style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {past.map((row) => {
              const rs = resultStyle(row.result);
              const rl = riskStyle(row.riskLevel);
              return (
                <tr key={row.id} className="border-t hover:bg-gray-50 transition-colors" style={{ borderColor: "#f3f4f6" }}>
                  <td className="px-4 py-3.5" style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{row.type}</td>
                  <td className="px-4 py-3.5" style={{ fontSize: 13, color: "#6b7280" }}>{row.dateCompleted}</td>
                  <td className="px-4 py-3.5" style={{ fontSize: 13, color: "#4b5563" }}>{row.completedBy}</td>
                  <td className="px-4 py-3.5">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-md font-medium" style={{ fontSize: 12, backgroundColor: rs.bg, color: rs.color }}>
                      {rs.emoji} {row.result}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span style={{ fontSize: 13, fontWeight: 600, color: row.issuesFound === 0 ? "#16a34a" : row.issuesFound <= 2 ? "#f59e0b" : "#dc2626" }}>{row.issuesFound}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-md font-medium" style={{ fontSize: 12, backgroundColor: rl.bg, color: rl.color }}>{row.riskLevel}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <button onClick={() => setSelectedInspection(row)}
                      className="px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 hover:opacity-90 transition-all"
                      style={{ fontSize: 12, backgroundColor: "#2563eb", color: "#ffffff" }}>
                      <Eye size={13} strokeWidth={2} /> View Report
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Upcoming Inspections */}
      <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: "#e5e7eb" }}>
        <div className="px-5 py-4 border-b" style={{ borderColor: "#e5e7eb" }}>
          <h3 className="font-semibold" style={{ fontSize: 14, color: "#111827" }}>Upcoming Inspections</h3>
        </div>
        <table className="w-full">
          <thead style={{ backgroundColor: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
            <tr>
              {["Inspection Type", "Frequency", "Next Due Date", "Assigned To", "Status", "Actions"].map((h) => (
                <th key={h} className="px-4 py-3.5 text-left" style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {upcoming.map((row) => {
              const sc = getStatusColor(row.status);
              const emoji = row.status === "Overdue" ? "🔴" : "🟡";
              return (
                <tr key={row.id} className="border-t hover:bg-gray-50 transition-colors" style={{ borderColor: "#f3f4f6" }}>
                  <td className="px-4 py-3.5" style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{row.name}</td>
                  <td className="px-4 py-3.5" style={{ fontSize: 13, color: "#6b7280" }}>{row.frequency}</td>
                  <td className="px-4 py-3.5" style={{ fontSize: 13, color: "#4b5563" }}>{row.nextDue}</td>
                  <td className="px-4 py-3.5" style={{ fontSize: 13, color: "#4b5563" }}>{row.assignedTo}</td>
                  <td className="px-4 py-3.5">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-md font-medium" style={{ fontSize: 12, backgroundColor: sc.bg, color: sc.text }}>
                      {emoji} {row.status}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <button className="px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 hover:opacity-90 transition-all"
                      style={{ fontSize: 12, backgroundColor: "#1f7a3c", color: "#ffffff" }}>
                      <Activity size={13} strokeWidth={2} /> Start
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Inspection Report Panel */}
      {selectedInspection && (
        <>
          <div className="fixed inset-0 z-40" style={{ backgroundColor: "rgba(0,0,0,0.3)" }} onClick={() => setSelectedInspection(null)} />
          <div className="fixed right-0 top-0 bottom-0 z-50 bg-white shadow-2xl flex flex-col overflow-hidden" style={{ width: 600, borderLeft: "1px solid #e5e7eb" }}>
            <div className="h-1" style={{ backgroundColor: resultStyle(selectedInspection.result).color }} />
            <div className="px-6 py-4 border-b flex items-center justify-between sticky top-0 bg-white z-10" style={{ borderColor: "#e5e7eb" }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: resultStyle(selectedInspection.result).bg }}>
                  <FileText size={20} style={{ color: resultStyle(selectedInspection.result).color }} strokeWidth={2} />
                </div>
                <div>
                  <h2 className="font-semibold" style={{ fontSize: 16, color: "#111827" }}>{selectedInspection.type} Report</h2>
                  <div style={{ fontSize: 11, color: "#9ca3af" }}>{selectedInspection.dateCompleted}</div>
                </div>
              </div>
              <button onClick={() => setSelectedInspection(null)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors" style={{ color: "#6b7280" }}>
                <X size={18} strokeWidth={2} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div>
                <h3 className="font-semibold mb-3" style={{ fontSize: 14, color: "#111827" }}>Summary</h3>
                <div className="grid grid-cols-2 gap-4">
                  {[["Completed By", selectedInspection.completedBy], ["Date/Time", `${selectedInspection.dateCompleted} 2:30 PM`]].map(([k, v]) => (
                    <div key={k}>
                      <div style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600, textTransform: "uppercase", marginBottom: 4 }}>{k}</div>
                      <div style={{ fontSize: 13, color: "#111827", fontWeight: 500 }}>{v}</div>
                    </div>
                  ))}
                  <div>
                    <div style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600, textTransform: "uppercase", marginBottom: 4 }}>Result</div>
                    <span className="inline-flex items-center px-2.5 py-1 rounded-md font-medium"
                      style={{ fontSize: 12, backgroundColor: resultStyle(selectedInspection.result).bg, color: resultStyle(selectedInspection.result).color }}>
                      {selectedInspection.result}
                    </span>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600, textTransform: "uppercase", marginBottom: 4 }}>Issues Found</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: selectedInspection.issuesFound > 0 ? "#dc2626" : "#16a34a" }}>{selectedInspection.issuesFound}</div>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="font-semibold mb-3" style={{ fontSize: 14, color: "#111827" }}>Checklist Results</h3>
                <div className="space-y-2">
                  {["Fire extinguishers present and accessible", "Exit signs illuminated", "Smoke detectors functional", "Emergency exits clear", "First aid kit stocked"].map((item, i) => {
                    const fail = (i === 2 && selectedInspection.result === "Failed") || (i === 4 && selectedInspection.result === "Passed with Issues");
                    return (
                      <div key={i} className="p-3 rounded-lg border" style={{ borderColor: "#e5e7eb" }}>
                        <div className="flex items-center justify-between">
                          <span style={{ fontSize: 13, fontWeight: 500, color: "#111827" }}>{item}</span>
                          <span className="px-2 py-0.5 rounded-md font-semibold" style={{ fontSize: 11, backgroundColor: fail ? "#fef2f2" : "#f0fdf4", color: fail ? "#dc2626" : "#16a34a" }}>
                            {fail ? "FAIL" : "PASS"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t bg-gray-50" style={{ borderColor: "#e5e7eb" }}>
              <div className="flex gap-2">
                <button className="flex-1 px-4 py-2.5 rounded-lg font-semibold hover:opacity-90" style={{ fontSize: 13, backgroundColor: "#2563eb", color: "#ffffff" }}>Download PDF</button>
                <button className="flex-1 px-4 py-2.5 rounded-lg font-semibold hover:bg-gray-100" style={{ fontSize: 13, backgroundColor: "#ffffff", color: "#6b7280", border: "1px solid #e5e7eb" }}>Print Report</button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── CLIENTS TAB ──────────────────────────────────────────────────────────────
function ClientsTab({ house }) {
  const clients = Array.isArray(house?.assignedClients) && house.assignedClients.length > 0
    ? house.assignedClients.map((c, i) => ({
        id: c.id || i,
        name: c.name || "—",
        clientId: c.caseId || c.clientId || "—",
        age: c.age || "—",
        service: c.serviceType || "—",
        status: "Active",
        staff: c.supervisor?.name || "Unassigned",
        admission: c.admissionDate || "—",
        room: c.room || "N/A",
      }))
    : [];

  const svcStyle = (s) =>
    s === "Emergency Care" ? { color: "#dc2626", bg: "#fef2f2" }
    : s === "Respite Care" ? { color: "#1f7a3c", bg: "#f0fdf4" }
    : { color: "#7c3aed", bg: "#f5f3ff" };

  return (
    <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: "#e5e7eb" }}>
      <table className="w-full">
        <thead className="bg-gray-50/80" style={{ borderBottom: "1px solid #e5e7eb" }}>
          <tr>
            {["Client Name", "Client ID", "Age", "Service Type", "Status", "Assigned Supervisor", "Admission Date", "Room", "Actions"].map((h, i) => (
              <th key={h} className={`px-4 py-3.5 ${i === 8 ? "text-right" : "text-left"}`}
                style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {clients.length === 0 ? (
            <tr><td colSpan={9} className="px-4 py-12 text-center" style={{ fontSize: 13, color: "#9ca3af" }}>No clients assigned to this house.</td></tr>
          ) : clients.map((c) => {
            const ss = svcStyle(c.service);
            const active = c.status === "Active";
            return (
              <tr key={c.id} className="border-t hover:bg-gray-50/80 transition-colors" style={{ borderColor: "#f3f4f6" }}>
                <td className="px-4 py-3.5"><span className="font-semibold cursor-pointer hover:text-emerald-700 transition-colors" style={{ fontSize: 13, color: "#1f7a3c" }}>{c.name}</span></td>
                <td className="px-4 py-3.5"><span className="font-mono" style={{ fontSize: 13, color: "#6b7280" }}>{c.clientId}</span></td>
                <td className="px-4 py-3.5"><span style={{ fontSize: 13, color: "#4b5563", fontWeight: 500 }}>{c.age}</span></td>
                <td className="px-4 py-3.5"><span className="inline-flex items-center px-2.5 py-1 rounded-md font-medium" style={{ fontSize: 12, color: ss.color, backgroundColor: ss.bg }}>{c.service}</span></td>
                <td className="px-4 py-3.5"><span className="inline-flex items-center px-2.5 py-1 rounded-md font-medium" style={{ fontSize: 12, color: active ? "#16a34a" : "#f59e0b", backgroundColor: active ? "#f0fdf4" : "#fffbeb" }}>{c.status}</span></td>
                <td className="px-4 py-3.5"><span style={{ fontSize: 13, color: "#4b5563" }}>{c.staff}</span></td>
                <td className="px-4 py-3.5"><span style={{ fontSize: 13, color: "#6b7280" }}>{c.admission}</span></td>
                <td className="px-4 py-3.5"><span className="inline-flex items-center px-2 py-0.5 rounded font-medium" style={{ fontSize: 12, color: "#374151", backgroundColor: "#f3f4f6" }}>{c.room}</span></td>
                <td className="px-4 py-3.5"><div className="flex items-center justify-end gap-1.5"><ActionButtons /></div></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── STAFF TAB ────────────────────────────────────────────────────────────────
function StaffTab({ house }) {
  const staff = Array.isArray(house?.assignedStaff) && house.assignedStaff.length > 0
    ? house.assignedStaff.map((s, i) => ({
        id: s.id || i,
        name: s.name || "—",
        cyimId: s.userId || s.staffId || s.id || "—",
        role: s.role || s.userType || "Staff",
        status: "Active",
        phone: s.phone || s.contactPhone || "—",
        clients: 0,
        start: s.startDate || "—",
        agencyName: s.agencyName || "",
      }))
    : [];
  const stStyle = (s) =>
    s === "On Duty" ? { color: "#16a34a", bg: "#f0fdf4" }
    : s === "On Break" ? { color: "#f59e0b", bg: "#fffbeb" }
    : { color: "#6b7280", bg: "#f3f4f6" };

  return (
    <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: "#e5e7eb" }}>
      <table className="w-full">
        <thead className="bg-gray-50/80" style={{ borderBottom: "1px solid #e5e7eb" }}>
          <tr>
            {["Staff Name", "CYIM ID", "Role", "Shift Status", "Phone No", "Assigned Clients", "Start Date", "Actions"].map((h, i) => (
              <th key={h} className={`px-4 py-3.5 ${i === 7 ? "text-right" : "text-left"}`}
                style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {staff.length === 0 ? (
            <tr><td colSpan={8} className="px-4 py-12 text-center" style={{ fontSize: 13, color: "#9ca3af" }}>No staff assigned to this house.</td></tr>
          ) : staff.map((s) => {
            const ss = stStyle(s.status);
            return (
              <tr key={s.id} className="border-t hover:bg-gray-50/80 transition-colors" style={{ borderColor: "#f3f4f6" }}>
                <td className="px-4 py-3.5"><span className="font-semibold cursor-pointer hover:text-emerald-700" style={{ fontSize: 13, color: "#1f7a3c" }}>{s.name}</span></td>
                <td className="px-4 py-3.5"><span className="font-mono" style={{ fontSize: 13, color: "#6b7280" }}>{s.cyimId}</span></td>
                <td className="px-4 py-3.5"><span style={{ fontSize: 13, color: "#4b5563", fontWeight: 500 }}>{s.role}</span></td>
                <td className="px-4 py-3.5"><span className="inline-flex items-center px-2.5 py-1 rounded-md font-medium" style={{ fontSize: 12, color: ss.color, backgroundColor: ss.bg }}>{s.status}</span></td>
                <td className="px-4 py-3.5"><span className="font-mono" style={{ fontSize: 13, color: "#4b5563" }}>{s.phone}</span></td>
                <td className="px-4 py-3.5"><span className="inline-flex items-center justify-center px-2 py-0.5 rounded font-semibold" style={{ fontSize: 12, color: "#1f7a3c", backgroundColor: "#f0fdf4", minWidth: 24 }}>{s.clients}</span></td>
                <td className="px-4 py-3.5"><span style={{ fontSize: 13, color: "#6b7280" }}>{s.start}</span></td>
                <td className="px-4 py-3.5"><div className="flex items-center justify-end gap-1.5"><ActionButtons /></div></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── SHIFT TAB ────────────────────────────────────────────────────────────────
function ShiftTab() {
  const [selected, setSelected] = useState(null);
  const shifts = [
    { id: 1, client: "Joseph Tate",     clientId: "CVIM-087604", staff: "Kimberly Fox", service: "Respite Care",      type: "Regular",     date: "2026-04-15", duration: "8 Hours", status: "Completed" },
    { id: 2, client: "Andrew Anderson", clientId: "CVIM-098889", staff: "Tony Miles",   service: "Emergency Care",    type: "Emergency",   date: "2026-04-16", duration: "8 Hours", status: "Completed" },
    { id: 3, client: "Shakira Gadot",   clientId: "CVIM-324455", staff: "Robert Sato",  service: "Respite Care",      type: "Admin",       date: "2026-04-17", duration: "4 Hours", status: "Completed" },
    { id: 4, client: "Tanya Pearl",     clientId: "CVIM-657689", staff: "Vanilla Fox",  service: "Supervised Visits", type: "Shadow Shift",date: "2026-04-18", duration: "10 Hours",status: "In Progress" },
    { id: 5, client: "Marcus Johnson",  clientId: "CVIM-223344", staff: "Sarah Chen",   service: "Emergency Care",    type: "Critical",    date: "2026-04-19", duration: "12 Hours",status: "Scheduled" },
  ];
  const svcStyle = (s) =>
    s === "Emergency Care" ? { color: "#dc2626", bg: "#fef2f2" }
    : s === "Respite Care" ? { color: "#1f7a3c", bg: "#f0fdf4" }
    : { color: "#7c3aed", bg: "#f5f3ff" };
  const stStyle = (s) =>
    s === "Completed" ? { color: "#16a34a", bg: "#f0fdf4" }
    : s === "In Progress" ? { color: "#f59e0b", bg: "#fffbeb" }
    : { color: "#6b7280", bg: "#f3f4f6" };

  return (
    <>
      <div className="space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-3">
          {[{ label: "Total Shifts", value: "12", color: "#3b82f6" }, { label: "Completed", value: "8", color: "#16a34a" }, { label: "In Progress", value: "3", color: "#f59e0b" }, { label: "Scheduled", value: "1", color: "#6b7280" }].map((c) => (
            <div key={c.label} className="bg-white rounded-xl p-4 border" style={{ borderColor: "#e5e7eb" }}>
              <div style={{ fontSize: 11, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>{c.label}</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: c.color }}>{c.value}</div>
            </div>
          ))}
        </div>
        {/* Table */}
        <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: "#e5e7eb" }}>
          <div className="p-4 border-b" style={{ borderColor: "#e5e7eb" }}>
            <h3 className="font-semibold" style={{ fontSize: 14, color: "#111827" }}>Recent Shift Reports</h3>
          </div>
          <table className="w-full">
            <thead className="bg-gray-50/80" style={{ borderBottom: "1px solid #e5e7eb" }}>
              <tr>
                {["Client Name", "Staff", "Service", "Shift Type", "Date", "Duration", "Status", "Actions"].map((h, i) => (
                  <th key={h} className={`px-4 py-3.5 ${i === 7 ? "text-right" : "text-left"}`}
                    style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {shifts.map((s) => {
                const sv = svcStyle(s.service);
                const st = stStyle(s.status);
                return (
                  <tr key={s.id} className="border-t hover:bg-gray-50/80 transition-colors" style={{ borderColor: "#f3f4f6" }}>
                    <td className="px-4 py-3.5">
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{s.client}</div>
                      <div className="font-mono" style={{ fontSize: 11, color: "#9ca3af" }}>{s.clientId}</div>
                    </td>
                    <td className="px-4 py-3.5"><span style={{ fontSize: 13, color: "#4b5563" }}>{s.staff}</span></td>
                    <td className="px-4 py-3.5"><span className="inline-flex items-center px-2.5 py-1 rounded-md font-medium" style={{ fontSize: 12, color: sv.color, backgroundColor: sv.bg }}>{s.service}</span></td>
                    <td className="px-4 py-3.5"><span style={{ fontSize: 13, color: "#6b7280" }}>{s.type}</span></td>
                    <td className="px-4 py-3.5"><span style={{ fontSize: 13, color: "#4b5563" }}>{s.date}</span></td>
                    <td className="px-4 py-3.5"><span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{s.duration}</span></td>
                    <td className="px-4 py-3.5"><span className="inline-flex items-center px-2.5 py-1 rounded-md font-medium" style={{ fontSize: 12, color: st.color, backgroundColor: st.bg }}>{s.status}</span></td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center justify-end gap-1.5">
                        <button onClick={() => setSelected(s)} className="flex items-center justify-center rounded-lg hover:brightness-95 transition-all"
                          style={{ width: 28, height: 28, background: "#eff6ff", color: "#2563eb", border: "1px solid #bfdbfe" }}>
                          <Eye size={14} strokeWidth={2} />
                        </button>
                        <button className="flex items-center justify-center rounded-lg hover:brightness-95 transition-all"
                          style={{ width: 28, height: 28, background: "#f0fdf4", color: "#16a34a", border: "1px solid #bbf7d0" }}>
                          <Edit2 size={14} strokeWidth={2} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Shift detail modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: "rgba(0,0,0,0.5)" }} onClick={() => setSelected(null)}>
          <div className="bg-white rounded-xl shadow-lg w-full max-w-2xl max-h-[80vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between" style={{ borderColor: "#e5e7eb" }}>
              <h3 className="font-semibold" style={{ fontSize: 16, color: "#111827" }}>Shift Report Details</h3>
              <button onClick={() => setSelected(null)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors" style={{ color: "#6b7280" }}>
                <X size={18} strokeWidth={2} />
              </button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4 mb-6">
                {[["Client", selected.client], ["Client ID", selected.clientId], ["Staff", selected.staff], ["Service", selected.service], ["Date", selected.date], ["Duration", selected.duration]].map(([k, v]) => (
                  <div key={k}>
                    <div style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600, textTransform: "uppercase", marginBottom: 4 }}>{k}</div>
                    <div style={{ fontSize: 14, color: "#111827", fontWeight: 600 }}>{v}</div>
                  </div>
                ))}
              </div>
              <div className="border-t pt-4" style={{ borderColor: "#e5e7eb" }}>
                <div style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600, textTransform: "uppercase", marginBottom: 8 }}>Shift Report</div>
                <div style={{ fontSize: 14, color: "#4b5563", lineHeight: 1.6 }}>
                  Today was a productive day with the client. We started the morning with breakfast preparation where the client showed good engagement and participated in setting up the table. Throughout the day, we worked on various activities including educational exercises and recreational time.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── COMPLIANCE TAB ───────────────────────────────────────────────────────────
function ComplianceTabContent() {
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState(false);

  const displayed = INSPECTIONS.filter((i) => {
    if (filter !== "All" && i.status !== filter) return false;
    if (search && !i.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const overdue = INSPECTIONS.filter((i) => i.status === "Overdue").length;
  const dueSoon = INSPECTIONS.filter((i) => i.status === "Due Soon").length;
  const compliant = INSPECTIONS.filter((i) => i.status === "Compliant").length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: "#212121" }}>Inspection Schedule</h2>
          <p style={{ fontSize: 13, color: "#757575" }}>8 standard checklists required for licensed group homes in Alberta</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 border rounded-lg p-1" style={{ borderColor: "#E0E0E0" }}>
            {["All", "Overdue", "Due Soon", "Compliant"].map((f) => (
              <button key={f} onClick={() => setFilter(f)} className="px-3 py-1 rounded transition-colors"
                style={{ fontSize: 12.5, fontWeight: 500, color: filter === f ? "#1D6033" : "#616161", backgroundColor: filter === f ? "#E8F5E9" : "transparent" }}>
                {f}
              </button>
            ))}
          </div>
          <div className="relative" style={{ width: 200 }}>
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: "#9E9E9E" }} />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search inspection..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg border" style={{ borderColor: "#E0E0E0", fontSize: 13 }} />
          </div>
          <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-colors"
            style={{ fontSize: 13, fontWeight: 500, color: "#1D6033", borderColor: "#1D6033" }}>
            <Download size={14} /> Export Report
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[{ label: "Total", value: 8, color: "#111827" }, { label: "Compliant", value: compliant, color: "#16a34a" }, { label: "Due Soon", value: dueSoon, color: "#f59e0b" }, { label: "Overdue", value: overdue, color: "#dc2626" }].map((s) => (
          <div key={s.label} className="bg-white rounded-xl p-4 border" style={{ borderColor: "#e5e7eb" }}>
            <div style={{ fontSize: 11, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Inspection Table */}
      <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: "#E0E0E0" }}>
        <div className="flex items-center gap-4 px-4 py-3" style={{ backgroundColor: "#FAFAFA", borderBottom: "1px solid #EEEEEE" }}>
          {[["Checklist", "flex-1"], ["Frequency", "110px"], ["Last Completed", "140px"], ["Completed By", "140px"], ["Next Due", "130px"], ["Status", "120px"], ["Assigned To", "140px"], ["Actions", "100px"]].map(([h, w]) => (
            <div key={h} style={{ width: w === "flex-1" ? undefined : w, flex: w === "flex-1" ? 1 : undefined, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.4px", color: "#757575" }}>{h}</div>
          ))}
        </div>
        {displayed.map((insp) => {
          const Icon = ICON_MAP[insp.icon] || Package;
          const sc = getStatusColor(insp.status);
          const leftBorder = insp.status === "Overdue" ? "#C62828" : insp.status === "Due Soon" ? "#F57C00" : "transparent";
          const daysText = insp.daysUntilDue < 0 ? `Overdue by ${Math.abs(insp.daysUntilDue)} days` : insp.daysUntilDue === 0 ? "Today" : `in ${insp.daysUntilDue} days`;
          return (
            <div key={insp.id} className="flex items-center gap-4 px-4 transition-colors"
              style={{ height: 64, borderBottom: "1px solid #F5F5F5", borderLeft: `3px solid ${leftBorder}` }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#FAFAFA")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}>
              <div className="flex items-center gap-3" style={{ flex: 1 }}>
                <div className="rounded-full flex items-center justify-center shrink-0" style={{ width: 32, height: 32, backgroundColor: insp.circleBg }}>
                  <Icon size={16} style={{ color: insp.iconColor }} />
                </div>
                <div className="flex items-center gap-2">
                  <span style={{ fontSize: 14, fontWeight: 500, color: "#212121" }}>{insp.name}</span>
                  <span className="px-1.5 py-0.5 rounded" style={{ fontSize: 10.5, fontWeight: 600, textTransform: "uppercase", color: "#424242", backgroundColor: "#F5F5F5" }}>{insp.abbrev}</span>
                </div>
              </div>
              <div style={{ width: 110, fontSize: 13, color: "#424242" }}>{insp.frequency}</div>
              <div style={{ width: 140 }}>
                <div style={{ fontSize: 13, color: "#212121", fontWeight: 500 }}>{insp.lastCompleted}</div>
                <div style={{ fontSize: 11.5, color: "#757575" }}>{insp.lastCompletedTime}</div>
              </div>
              <div className="flex items-center gap-2" style={{ width: 140 }}>
                <div className="rounded-full flex items-center justify-center shrink-0" style={{ width: 24, height: 24, backgroundColor: getAvatarColor(insp.completedBy) }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: "#ffffff" }}>{getInitials(insp.completedBy)}</span>
                </div>
                <span style={{ fontSize: 12.5, fontWeight: 500, color: "#212121" }}>{insp.completedBy}</span>
              </div>
              <div style={{ width: 130 }}>
                <div style={{ fontSize: 13, color: "#212121", fontWeight: 500 }}>{insp.nextDue}</div>
                <div style={{ fontSize: 11.5, color: sc.text }}>{daysText}</div>
              </div>
              <div style={{ width: 120 }}>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded" style={{ fontSize: 11.5, fontWeight: 500, color: sc.text, backgroundColor: sc.bg }}>
                  <div className="rounded-full" style={{ width: 6, height: 6, backgroundColor: sc.text }} />{insp.status}
                </span>
              </div>
              <div className="flex items-center gap-2" style={{ width: 140 }}>
                <div className="rounded-full flex items-center justify-center shrink-0" style={{ width: 24, height: 24, backgroundColor: getAvatarColor(insp.assignedTo) }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: "#ffffff" }}>{getInitials(insp.assignedTo)}</span>
                </div>
                <span style={{ fontSize: 12.5, fontWeight: 500, color: "#212121" }}>{insp.assignedTo}</span>
              </div>
              <div className="flex items-center gap-2" style={{ width: 100 }}>
                <button className="flex items-center justify-center rounded-lg transition-colors" style={{ width: 32, height: 32, backgroundColor: "#E3F2FD" }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#BBDEFB")} onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#E3F2FD")}>
                  <Eye size={16} style={{ color: "#1565C0" }} />
                </button>
                <button className="flex items-center justify-center rounded-lg transition-colors" style={{ width: 32, height: 32, backgroundColor: "#F5F5F5" }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#EEEEEE")} onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#F5F5F5")}>
                  <MoreHorizontal size={16} style={{ color: "#424242" }} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Completions */}
      <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: "#E0E0E0" }}>
        <button onClick={() => setExpanded(!expanded)} className="w-full flex items-center justify-between px-5 py-4 transition-colors hover:bg-gray-50">
          <div className="flex items-center gap-2">
            <ChevronRight size={16} style={{ color: "#757575", transform: expanded ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.2s" }} />
            <span style={{ fontSize: 15, fontWeight: 600, color: "#212121" }}>Recent Completions</span>
            <span style={{ fontSize: 12, color: "#757575" }}>(last 30 days)</span>
          </div>
        </button>
        {expanded && <div className="px-5 py-4 border-t" style={{ borderColor: "#F5F5F5", fontSize: 13, color: "#757575" }}>Completion history table would appear here.</div>}
      </div>
    </div>
  );
}

// ─── MAINTENANCE TAB ──────────────────────────────────────────────────────────
function MaintenanceTab() {
  const [selected, setSelected] = useState(null);
  const items = [
    { id: 1, issue: "Leaking faucet in bathroom",    type: "Plumbing",  priority: "Medium", status: "In Progress", reportedBy: "Staff Member",    assignedTo: "John Doe",   dueDate: "2026-04-18", notes: "Leak noticed in main bathroom. Requires plumber.", timeline: [{ action: "Issue reported", by: "Staff Member", date: "2026-04-10" }, { action: "Assigned to John Doe", by: "Admin", date: "2026-04-11" }] },
    { id: 2, issue: "Broken window lock",             type: "Security",  priority: "High",   status: "Pending",    reportedBy: "Security Check",  assignedTo: "Jane Smith", dueDate: "2026-04-16", notes: "Window lock in bedroom #3 is broken. Security concern.", timeline: [{ action: "Security issue reported", by: "Security Check", date: "2026-04-09" }] },
    { id: 3, issue: "HVAC filter replacement",        type: "HVAC",      priority: "Low",    status: "Scheduled",  reportedBy: "Maintenance",     assignedTo: "Mike Johnson",dueDate: "2026-04-25", notes: "Routine HVAC filter replacement. Last replaced 3 months ago.", timeline: [{ action: "Scheduled maintenance", by: "System", date: "2026-04-08" }] },
    { id: 4, issue: "Fire alarm battery replacement", type: "Safety",    priority: "Critical",status: "Urgent",    reportedBy: "Fire Safety",     assignedTo: "Sarah Lee",  dueDate: "2026-04-15", notes: "Fire alarm showing low battery warning. Must be replaced immediately.", timeline: [{ action: "Critical issue identified", by: "Fire Safety", date: "2026-04-14" }, { action: "Urgent priority assigned", by: "Admin", date: "2026-04-14" }] },
  ];
  const pStyle = (p) =>
    p === "Critical" ? { color: "#dc2626", bg: "#fef2f2" }
    : p === "High" ? { color: "#f59e0b", bg: "#fff7ed" }
    : p === "Medium" ? { color: "#eab308", bg: "#fefce8" }
    : { color: "#6b7280", bg: "#f3f4f6" };

  return (
    <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: "#e5e7eb" }}>
      <table className="w-full">
        <thead className="bg-gray-50/80" style={{ borderBottom: "1px solid #e5e7eb" }}>
          <tr>
            {["Issue", "Type", "Priority", "Status", "Requested By", "Assigned To", "Due Date", "Actions"].map((h, i) => (
              <th key={h} className={`px-4 py-3.5 ${i === 7 ? "text-right" : "text-left"}`}
                style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const ps = pStyle(item.priority);
            return (
              <tr key={item.id} className="border-t hover:bg-gray-50/80 transition-colors" style={{ borderColor: "#f3f4f6" }}>
                <td className="px-4 py-3.5"><span style={{ fontSize: 13, fontWeight: 500, color: "#111827" }}>{item.issue}</span></td>
                <td className="px-4 py-3.5"><span style={{ fontSize: 13, color: "#6b7280" }}>{item.type}</span></td>
                <td className="px-4 py-3.5"><span className="inline-flex items-center px-2.5 py-1 rounded-md font-medium" style={{ fontSize: 12, color: ps.color, backgroundColor: ps.bg }}>{item.priority}</span></td>
                <td className="px-4 py-3.5"><span style={{ fontSize: 13, color: "#4b5563" }}>{item.status}</span></td>
                <td className="px-4 py-3.5"><span style={{ fontSize: 13, color: "#4b5563" }}>{item.reportedBy}</span></td>
                <td className="px-4 py-3.5"><span style={{ fontSize: 13, color: "#4b5563" }}>{item.assignedTo}</span></td>
                <td className="px-4 py-3.5"><span style={{ fontSize: 13, color: "#6b7280" }}>{item.dueDate}</span></td>
                <td className="px-4 py-3.5">
                  <div className="flex items-center justify-end gap-1.5">
                    <button onClick={() => setSelected(item)} className="flex items-center justify-center rounded-lg hover:brightness-95 transition-all"
                      style={{ width: 28, height: 28, background: "#eff6ff", color: "#2563eb", border: "1px solid #bfdbfe" }}>
                      <Eye size={14} strokeWidth={2} />
                    </button>
                    <button className="flex items-center justify-center rounded-lg hover:brightness-95 transition-all"
                      style={{ width: 28, height: 28, background: "#f0fdf4", color: "#16a34a", border: "1px solid #bbf7d0" }}>
                      <Edit2 size={14} strokeWidth={2} />
                    </button>
                    <button className="flex items-center justify-center rounded-lg hover:brightness-95 transition-all"
                      style={{ width: 28, height: 28, background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca" }}>
                      <Trash2 size={14} strokeWidth={2} />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <HouseDetailPanel isOpen={!!selected} onClose={() => setSelected(null)} record={selected} type="maintenance" />
    </div>
  );
}

// ─── ALERTS TAB ───────────────────────────────────────────────────────────────
function AlertsTab({ house }) {
  const alerts = [
    { icon: <Syringe size={16} strokeWidth={2} />, color: "#dc2626", bg: "#fef2f2", text: "Missing sharps items detected", time: "2 hours ago" },
    { icon: <Wrench size={16} strokeWidth={2} />, color: "#f59e0b", bg: "#fffbeb", text: "Furnace filter replacement overdue", time: "1 day ago" },
    { icon: <ShieldAlert size={16} strokeWidth={2} />, color: "#dc2626", bg: "#fef2f2", text: "Fire drill failed – requires immediate action", time: "3 days ago" },
    { icon: <Utensils size={16} strokeWidth={2} />, color: "#f59e0b", bg: "#fffbeb", text: "Food contamination risk – expired items found", time: "5 hours ago" },
    { icon: <Package size={16} strokeWidth={2} />, color: "#eab308", bg: "#fefce8", text: "Emergency kit incomplete – missing water bottles", time: "1 day ago" },
  ];
  const shown = (house.alertsCount ?? 1) > 0 ? alerts : [];
  if (!shown.length) return <div className="bg-white rounded-xl p-10 text-center border" style={{ borderColor: "#e5e7eb", fontSize: 14, color: "#16a34a" }}>✅ No active alerts for this house.</div>;

  return (
    <div className="space-y-3">
      {shown.map((a, idx) => (
        <div key={idx} className="bg-white rounded-xl p-4 flex items-center gap-4 hover:shadow-md transition-all"
          style={{ border: "1px solid #e5e7eb", borderLeft: `4px solid ${a.color}` }}>
          <div className="flex items-center justify-center rounded-lg shrink-0" style={{ width: 36, height: 36, backgroundColor: a.bg, color: a.color }}>{a.icon}</div>
          <div className="flex-1">
            <div className="font-semibold mb-0.5" style={{ fontSize: 13, color: "#111827" }}>{a.text}</div>
            <div style={{ fontSize: 12, color: "#9ca3af" }}>{a.time}</div>
          </div>
          <button className="px-4 py-2 rounded-lg font-semibold hover:opacity-90 transition-all" style={{ fontSize: 12, backgroundColor: "#1f7a3c", color: "#ffffff" }}>Resolve</button>
        </div>
      ))}
    </div>
  );
}

// ─── INVENTORY TAB ────────────────────────────────────────────────────────────
function InventoryTab({ house }) {
  const categories = Array.isArray(house?.houseInventory) ? house.houseInventory : [];
  const [expanded, setExpanded] = useState(() => {
    const init = {};
    if (categories[0]) init[categories[0].name] = true;
    return init;
  });

  return (
    <div className="space-y-3">
      <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: "#e5e7eb" }}>
        <div className="px-4 py-3 border-b" style={{ borderColor: "#e5e7eb", backgroundColor: "#fafafa" }}>
          <h3 className="font-semibold" style={{ fontSize: 14, color: "#111827" }}>Household Inventory</h3>
        </div>
        {categories.length === 0 ? (
          <div className="px-4 py-12 text-center" style={{ fontSize: 13, color: "#9ca3af" }}>No inventory data saved for this house.</div>
        ) : categories.map((cat) => {
          const isOpen = expanded[cat.name];
          return (
            <div key={cat.id || cat.name} className="border-b last:border-b-0" style={{ borderColor: "#e5e7eb" }}>
              <button onClick={() => setExpanded((p) => ({ ...p, [cat.name]: !p[cat.name] }))} className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-2">
                  <ChevronDown size={16} style={{ color: "#6b7280", transform: isOpen ? "rotate(0deg)" : "rotate(-90deg)", transition: "transform 0.2s" }} strokeWidth={2} />
                  <span className="font-semibold" style={{ fontSize: 13, color: "#111827" }}>{cat.name}</span>
                  <span className="px-2 py-0.5 rounded-md font-medium" style={{ fontSize: 11, backgroundColor: "#f3f4f6", color: "#6b7280" }}>{cat.items?.length ?? 0} items</span>
                </div>
              </button>
              {isOpen && (
                <table className="w-full">
                  <thead className="bg-gray-50/80" style={{ borderBottom: "1px solid #e5e7eb" }}>
                    <tr>
                      {["Item", "Location", "Qty", "Notes"].map((h) => (
                        <th key={h} className="px-4 py-2.5 text-left" style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(cat.items || []).map((item, i) => (
                      <tr key={i} className="border-t hover:bg-gray-50/80" style={{ borderColor: "#f3f4f6" }}>
                        <td className="px-4 py-3"><span style={{ fontSize: 13, fontWeight: 500, color: "#111827" }}>{item.name}</span></td>
                        <td className="px-4 py-3"><span style={{ fontSize: 13, color: "#6b7280" }}>{item.location || "—"}</span></td>
                        <td className="px-4 py-3"><span style={{ fontSize: 13, fontWeight: 600, color: item.qty > 0 ? "#16a34a" : "#dc2626" }}>{item.qty ?? 0}</span></td>
                        <td className="px-4 py-3"><span style={{ fontSize: 13, color: "#6b7280" }}>{item.notes || "—"}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── SHARPS TAB ───────────────────────────────────────────────────────────────
function SharpsTab() {
  const [selected, setSelected] = useState(null);
  const items = Array.isArray(house?.sharpsInventory) && house.sharpsInventory.length > 0
    ? house.sharpsInventory.map((it, idx) => ({
        id: idx + 1,
        itemName: it.name,
        type: it.type || "Other",
        location: it.location || "—",
        quantityExpected: it.qty || 0,
        quantityPresent: it.qty || 0,
        lastChecked: "—",
        checkedBy: "—",
        notes: it.notes || "",
      }))
    : [];
  const missing = items.reduce((sum, i) => sum + Math.max(0, i.quantityExpected - i.quantityPresent), 0);

  return (
    <>
      <div className="space-y-4">
        <div className="bg-white rounded-xl p-5 border" style={{ borderColor: "#e5e7eb" }}>
          <h3 className="font-semibold mb-4" style={{ fontSize: 14, color: "#111827" }}>Sharps Management Summary</h3>
          <div className="grid grid-cols-3 gap-4">
            {[{ label: "Total Items", value: items.reduce((s, i) => s + i.quantityExpected, 0), color: "#111827" }, { label: "Missing Items", value: missing, color: missing > 0 ? "#dc2626" : "#16a34a" }, { label: "Lock Compliance", value: "100%", color: "#16a34a" }].map((s) => (
              <div key={s.label}>
                <div style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>{s.label}</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: "#e5e7eb" }}>
          <div className="px-4 py-3 border-b" style={{ borderColor: "#e5e7eb", backgroundColor: "#fafafa" }}>
            <h3 className="font-semibold" style={{ fontSize: 14, color: "#111827" }}>Sharps Inventory</h3>
          </div>
          <table className="w-full">
            <thead className="bg-gray-50/80" style={{ borderBottom: "1px solid #e5e7eb" }}>
              <tr>
                {["Item Name", "Type", "Storage Location", "Expected", "Present", "Status", "Last Checked", "Checked By", "Actions"].map((h, i) => (
                  <th key={h} className={`px-4 py-3.5 ${i === 8 ? "text-right" : "text-left"}`}
                    style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const isMissing = item.quantityPresent < item.quantityExpected;
                return (
                  <tr key={item.id} className="border-t hover:bg-gray-50/80 transition-colors"
                    style={{ borderColor: "#f3f4f6", backgroundColor: isMissing ? "#fef2f2" : "transparent" }}>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        {isMissing && <AlertTriangle size={14} style={{ color: "#dc2626" }} strokeWidth={2} />}
                        <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{item.itemName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5"><span style={{ fontSize: 13, color: "#6b7280" }}>{item.type}</span></td>
                    <td className="px-4 py-3.5"><span style={{ fontSize: 13, color: "#4b5563", fontWeight: 500 }}>{item.location}</span></td>
                    <td className="px-4 py-3.5"><span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{item.quantityExpected}</span></td>
                    <td className="px-4 py-3.5"><span style={{ fontSize: 13, fontWeight: 600, color: isMissing ? "#dc2626" : "#16a34a" }}>{item.quantityPresent}</span></td>
                    <td className="px-4 py-3.5">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md font-medium"
                        style={{ fontSize: 12, color: isMissing ? "#dc2626" : "#16a34a", backgroundColor: isMissing ? "#fef2f2" : "#f0fdf4" }}>
                        {isMissing ? "Missing" : "Safe"}
                      </span>
                    </td>
                    <td className="px-4 py-3.5"><span style={{ fontSize: 13, color: "#6b7280" }}>{item.lastChecked}</span></td>
                    <td className="px-4 py-3.5"><span style={{ fontSize: 13, color: "#4b5563" }}>{item.checkedBy}</span></td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center justify-end">
                        {isMissing ? (
                          <button onClick={() => setSelected(item)} className="px-3 py-1.5 rounded-lg font-semibold hover:opacity-90 transition-all"
                            style={{ fontSize: 12, backgroundColor: "#dc2626", color: "#ffffff" }}>Investigate</button>
                        ) : (
                          <button className="flex items-center justify-center rounded-lg hover:brightness-95 transition-all"
                            style={{ width: 28, height: 28, background: "#eff6ff", color: "#2563eb", border: "1px solid #bfdbfe" }}>
                            <Eye size={14} strokeWidth={2} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <SharpsInvestigationPanel isOpen={!!selected} onClose={() => setSelected(null)} sharpItem={selected} />
    </>
  );
}

// ─── FOOD SAFETY TAB ──────────────────────────────────────────────────────────
function FoodSafetyTab() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        {[{ label: "Fridge Temperature", value: "3.2°C", sub: "Safe", color: "#16a34a" }, { label: "Expired Items", value: "4", sub: "Needs attention", color: "#dc2626" }, { label: "Label Compliance", value: "87%", sub: "Medium risk", color: "#f59e0b" }].map((c) => (
          <div key={c.label} className="bg-white rounded-xl p-4 border" style={{ borderColor: "#e5e7eb" }}>
            <div style={{ fontSize: 11, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>{c.label}</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: c.color }}>{c.value}</div>
            <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>{c.sub}</div>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-xl p-5 border" style={{ borderColor: "#e5e7eb" }}>
        <h3 className="font-semibold mb-3" style={{ fontSize: 14, color: "#111827" }}>Risk Assessment</h3>
        <div className="flex items-center gap-3">
          <span className="px-4 py-2 rounded-lg font-semibold" style={{ fontSize: 13, color: "#f59e0b", backgroundColor: "#fffbeb" }}>Medium Risk</span>
          <span style={{ fontSize: 13, color: "#6b7280" }}>4 items require immediate attention</span>
        </div>
      </div>
    </div>
  );
}

// ─── EMERGENCY KIT TAB ────────────────────────────────────────────────────────
function EmergencyKitTab() {
  const items = [
    { name: "Bottled Water (1L)",      req: 48, avail: 48, expiry: "2027-01-15", status: "Sufficient" },
    { name: "Ready-to-Eat Meals",      req: 36, avail: 36, expiry: "2027-06-30", status: "Sufficient" },
    { name: "Emergency Blankets",      req: 6,  avail: 3,  expiry: null,         status: "Low" },
    { name: "Battery Pack (D-cell)",   req: 2,  avail: 0,  expiry: "2028-01-01", status: "Missing" },
    { name: "First Aid Kit",           req: 2,  avail: 2,  expiry: "2026-09-30", status: "Sufficient" },
    { name: "N95 Masks",               req: 20, avail: 20, expiry: "2028-02-01", status: "Sufficient" },
  ];
  const sufficient = items.filter((i) => i.status === "Sufficient").length;
  const low = items.filter((i) => i.status === "Low").length;
  const missing = items.filter((i) => i.status === "Missing").length;
  const stStyle = (s) => s === "Sufficient" ? { color: "#16a34a", bg: "#f0fdf4" } : s === "Low" ? { color: "#f59e0b", bg: "#fffbeb" } : { color: "#dc2626", bg: "#fef2f2" };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl p-5 border" style={{ borderColor: "#e5e7eb" }}>
        <h3 className="font-semibold mb-4" style={{ fontSize: 14, color: "#111827" }}>72-Hour Emergency Kit Summary</h3>
        <div className="grid grid-cols-4 gap-4">
          {[{ label: "Total Items", value: items.length, color: "#111827" }, { label: "Sufficient", value: sufficient, color: "#16a34a" }, { label: "Low Stock", value: low, color: "#f59e0b" }, { label: "Missing", value: missing, color: "#dc2626" }].map((s) => (
            <div key={s.label}>
              <div style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>{s.label}</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: "#e5e7eb" }}>
        <div className="px-4 py-3 border-b" style={{ borderColor: "#e5e7eb", backgroundColor: "#fafafa" }}>
          <h3 className="font-semibold" style={{ fontSize: 14, color: "#111827" }}>Emergency Inventory</h3>
        </div>
        <table className="w-full">
          <thead className="bg-gray-50/80" style={{ borderBottom: "1px solid #e5e7eb" }}>
            <tr>
              {["Item Name", "Required", "Available", "Expiry Date", "Status"].map((h) => (
                <th key={h} className="px-4 py-3.5 text-left" style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const ss = stStyle(item.status);
              return (
                <tr key={item.name} className="border-t hover:bg-gray-50/80 transition-colors" style={{ borderColor: "#f3f4f6" }}>
                  <td className="px-4 py-3.5"><span style={{ fontSize: 13, fontWeight: 500, color: "#111827" }}>{item.name}</span></td>
                  <td className="px-4 py-3.5"><span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{item.req}</span></td>
                  <td className="px-4 py-3.5"><span style={{ fontSize: 13, fontWeight: 700, color: item.avail === 0 ? "#dc2626" : item.avail < item.req ? "#f59e0b" : "#16a34a" }}>{item.avail}</span></td>
                  <td className="px-4 py-3.5"><span style={{ fontSize: 13, color: item.expiry ? "#4b5563" : "#9ca3af" }}>{item.expiry ?? "N/A"}</span></td>
                  <td className="px-4 py-3.5"><span className="inline-flex items-center px-2.5 py-1 rounded-md font-medium" style={{ fontSize: 12, color: ss.color, backgroundColor: ss.bg }}>{item.status}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {missing > 0 && (
        <div className="bg-white rounded-xl p-5 border" style={{ borderColor: "#fecaca", backgroundColor: "#fef2f2" }}>
          <div className="flex items-start gap-3">
            <AlertTriangle size={18} className="shrink-0 mt-0.5" style={{ color: "#dc2626" }} strokeWidth={2} />
            <div>
              <h3 className="font-semibold mb-1" style={{ fontSize: 14, color: "#dc2626" }}>Critical: Emergency Kit Incomplete</h3>
              <p style={{ fontSize: 13, color: "#6b7280" }}>{missing} missing item(s) require immediate attention.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── REPORTS TAB ──────────────────────────────────────────────────────────────
function ReportsTab() {
  const reports = ["Compliance Summary", "Maintenance Log", "Incident Reports", "Staff Attendance", "Client Activity", "Safety Inspections"];
  return (
    <div className="bg-white rounded-xl p-5 border" style={{ borderColor: "#e5e7eb" }}>
      <h3 className="font-semibold mb-4" style={{ fontSize: 14, color: "#111827" }}>Generate Reports</h3>
      <div className="grid grid-cols-2 gap-3">
        {reports.map((r) => (
          <button key={r} className="flex items-center justify-between px-4 py-3 rounded-lg border transition-all hover:border-emerald-500 hover:bg-gray-50"
            style={{ borderColor: "#e5e7eb", backgroundColor: "#ffffff" }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: "#111827" }}>{r}</span>
            <FileText size={16} style={{ color: "#6b7280" }} strokeWidth={2} />
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── SHARED ACTION BUTTONS ────────────────────────────────────────────────────
function ActionButtons() {
  return (
    <>
      <button className="flex items-center justify-center rounded-lg hover:brightness-95 transition-all"
        style={{ width: 28, height: 28, background: "#eff6ff", color: "#2563eb", border: "1px solid #bfdbfe" }}>
        <Eye size={14} strokeWidth={2} />
      </button>
      <button className="flex items-center justify-center rounded-lg hover:brightness-95 transition-all"
        style={{ width: 28, height: 28, background: "#f0fdf4", color: "#16a34a", border: "1px solid #bbf7d0" }}>
        <Edit2 size={14} strokeWidth={2} />
      </button>
      <button className="flex items-center justify-center rounded-lg hover:brightness-95 transition-all"
        style={{ width: 28, height: 28, background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca" }}>
        <Trash2 size={14} strokeWidth={2} />
      </button>
      <button className="flex items-center justify-center rounded-lg hover:brightness-95 transition-all"
        style={{ width: 28, height: 28, background: "#f3f4f6", color: "#374151", border: "1px solid #e5e7eb" }}>
        <MoreHorizontal size={14} strokeWidth={2} />
      </button>
    </>
  );
}

export default HouseDetailPage;
