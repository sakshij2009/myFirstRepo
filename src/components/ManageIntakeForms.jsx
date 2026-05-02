import { useEffect, useRef, useState, useMemo } from "react";
import { collection, deleteDoc, doc, getDocs, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useNavigate } from "react-router-dom";
import {
  Users, Briefcase, FileText, Eye, Edit2, Trash2, Search,
  Baby, User, Heart, AlertCircle, Building2, CheckCircle2,
  X, Plus, ChevronRight, Clock, MoreHorizontal,
} from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getServiceColor(type) {
  switch (type) {
    case "Emergency Care":         return { text: "#dc2626", bg: "#fef2f2" };
    case "Respite Care":           return { text: "#1f7a3c", bg: "#f0fdf4" };
    case "Supervised Visitations": return { text: "#ea580c", bg: "#fff7ed" };
    case "Transportations":        return { text: "#7c3aed", bg: "#faf5ff" };
    default:                       return { text: "#6b7280", bg: "#f3f4f6" };
  }
}

function getClientStatusColor(status) {
  switch (status) {
    case "Active":   return { text: "#1f7a3c", bg: "#f0fdf4" };
    case "Inactive": return { text: "#dc2626", bg: "#fef2f2" };
    default:         return { text: "#d97706", bg: "#fef3c7" };
  }
}

function normalizeFormType(raw) {
  const s = (raw || "").toLowerCase();
  if (s.includes("private") || s.includes("family")) return "private-family";
  return "intake-worker";
}

function normalizeClientStatus(status) {
  if (status === "Accepted") return "Active";
  if (status === "Rejected") return "Inactive";
  return "Pending";
}

function normalizeServiceType(raw) {
  const s = (raw || "").toLowerCase();
  if (s.includes("emergency")) return "Emergency Care";
  if (s.includes("respite"))   return "Respite Care";
  if (s.includes("supervised") || s.includes("visitation")) return "Supervised Visitations";
  if (s.includes("transport")) return "Transportations";
  return raw || "—";
}

function formatDate(val) {
  if (!val || val === "—") return "—";
  if (val.toDate) {
    const d = val.toDate();
    const day = String(d.getDate()).padStart(2, "0");
    const month = d.toLocaleString("en-US", { month: "short" });
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
  }
  if (typeof val === "string") return val;
  try {
    const d = new Date(val);
    if (!isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, "0");
      const month = d.toLocaleString("en-US", { month: "short" });
      const year = d.getFullYear();
      return `${day} ${month} ${year}`;
    }
  } catch (e) {}
  return String(val);
}

// ─── FilterChip ───────────────────────────────────────────────────────────────
function FilterChip({ label, value, options, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const active = value !== "All";

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all whitespace-nowrap"
        style={{
          borderColor: active ? "#145228" : "#e5e7eb",
          background: active ? "#f0fdf4" : "#fff",
          color: active ? "#145228" : "#374151",
        }}
      >
        {label}: {value}
        <ChevronRight size={11} style={{ transform: open ? "rotate(90deg)" : "rotate(0)", transition: "transform .15s" }} />
      </button>
      {open && (
        <div
          className="absolute top-full left-0 mt-1 rounded-lg border bg-white z-20 py-1 min-w-[150px]"
          style={{ borderColor: "#e5e7eb", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
        >
          {options.map((opt) => (
            <button
              key={opt}
              onClick={() => { onChange(opt); setOpen(false); }}
              className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 transition-colors"
              style={{ color: opt === value ? "#145228" : "#374151", fontWeight: opt === value ? 700 : 500 }}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Form Type Badge ──────────────────────────────────────────────────────────
function FormTypeBadge({ type }) {
  const isPrivate = type === "private-family";
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full whitespace-nowrap"
      style={{
        fontSize: 11, fontWeight: 600,
        background: isPrivate ? "#f0fdf4" : "#eff6ff",
        color:      isPrivate ? "#1f7a3c" : "#2563eb",
        border:     `1px solid ${isPrivate ? "#bbf7d0" : "#bfdbfe"}`,
      }}
    >
      {isPrivate ? <Users size={10} strokeWidth={2.5} /> : <Briefcase size={10} strokeWidth={2.5} />}
      {isPrivate ? "Private Family" : "Intake Worker"}
    </span>
  );
}

// ─── View Detail Modal ────────────────────────────────────────────────────────
function ViewFormModal({ record, onClose }) {
  const svc = getServiceColor(record.serviceType);
  const sts = getClientStatusColor(record.clientStatus);
  const isPrivate = record.formType === "private-family";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.42)" }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "#f3f4f6" }}>
          <div className="flex items-center gap-3">
            <div className="rounded-xl flex items-center justify-center" style={{ width: 36, height: 36, background: isPrivate ? "#f0fdf4" : "#eff6ff" }}>
              {isPrivate ? <Users size={16} style={{ color: "#1f7a3c" }} /> : <Briefcase size={16} style={{ color: "#2563eb" }} />}
            </div>
            <div>
              <p className="font-bold" style={{ fontSize: 14, color: "#111827" }}>Intake Form Details</p>
              <p style={{ fontSize: 11, color: "#9ca3af" }}>Submitted {formatDate(record.submittedAt)}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <X size={16} style={{ color: "#6b7280" }} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: "Client Name",  value: record.clientName },
              { label: "Client Code",  value: record.clientCode },
              { label: "Parent Email", value: record.parentEmail },
              { label: "Agency",       value: record.agency },
            ].map((row) => (
              <div key={row.label}>
                <p style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600, marginBottom: 3 }}>{row.label}</p>
                <p style={{ fontSize: 13, color: "#111827", fontWeight: 500 }}>{row.value || "—"}</p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-4 pt-1">
            <div>
              <p style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600, marginBottom: 5 }}>Service Type</p>
              <span className="px-2.5 py-1 rounded-full" style={{ fontSize: 11, fontWeight: 600, background: svc.bg, color: svc.text }}>{record.serviceType || "—"}</span>
            </div>
            <div>
              <p style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600, marginBottom: 5 }}>Client Status</p>
              <span className="px-2.5 py-1 rounded-full" style={{ fontSize: 11, fontWeight: 600, background: sts.bg, color: sts.text }}>{record.clientStatus}</span>
            </div>
            <div>
              <p style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600, marginBottom: 5 }}>Form Type</p>
              <FormTypeBadge type={record.formType} />
            </div>
          </div>
        </div>

        <div className="px-6 pb-5 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-lg font-semibold transition-all hover:opacity-90 text-white" style={{ background: "#145228", fontSize: 13 }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Constants ────────────────────────────────────────────────────────────────
const SERVICE_TYPES    = ["All", "Emergency Care", "Respite Care", "Supervised Visitations", "Transportations"];
const AGENCIES         = ["All", "Government", "Private", "Non Profit"];
const CLIENT_STATUSES  = ["All", "Active", "Inactive", "Pending"];
const TABS = [
  { key: "all",            label: "All Forms" },
  { key: "private-family", label: "Private Family" },
  { key: "intake-worker",  label: "Intake Worker" },
];

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ManageIntakeForms() {
  const navigate = useNavigate();
  const [forms, setForms]                   = useState([]);
  const [loading, setLoading]               = useState(true);
  const [activeTab, setActiveTab]           = useState("all");
  const [search, setSearch]                 = useState("");
  const [serviceFilter, setServiceFilter]   = useState("All");
  const [agencyFilter, setAgencyFilter]     = useState("All");
  const [statusFilter, setStatusFilter]     = useState("All");
const [viewRecord, setViewRecord]         = useState(null);
  const [successBanner, setSuccessBanner]   = useState(null);

  useEffect(() => {
    const fetchForms = async () => {
      setLoading(true);
      try {
        // Fetch from potential collections in parallel
        const collectionsToTry = [
          "InTakeForms", "intakeForms"
        ];
        
        const snaps = await Promise.all(
          collectionsToTry.map(c => getDocs(collection(db, c)).catch(() => ({ docs: [] })))
        );

        const [oldSnap, newSnap] = snaps;

        const processDoc = (d, sourceLabel) => {
          const data = d.data();
          const rawFormType = data.formType || (data.intakeworkerName ? "Intake Worker" : "Private Family");
          const formType = normalizeFormType(rawFormType);

          // Extract first client name
          let clientName = "—";
          let clientCode = d.id.slice(0, 7);
          let parentEmail = data.parentEmail || data.email || data.applicantEmail || "—";
          let agency = data.agencyName || data.agency || "—";
          let serviceType = normalizeServiceType(data.serviceType || data.shiftCategory || data.visitDetails || "");

          // 1. Try Shared/Top-level Children Arrays
          if (data.shared?.children?.[0]?.fullName) {
            clientName = data.shared.children.map(c => c.fullName).join(", ");
          } else if (data.children?.[0]?.fullName || data.children?.[0]?.name) {
            clientName = data.children.map(c => c.fullName || c.name || "").filter(Boolean).join(", ");
          } 
          
          // 2. Try inTakeClients Array (often has more details)
          if ((!clientName || clientName === "—") && Array.isArray(data.inTakeClients) && data.inTakeClients.length > 0) {
            const first = data.inTakeClients[0];
            if (first.name || first.fullName) {
              clientName  = first.name || first.fullName;
              clientCode  = first.clientId || first.id || clientCode;
              parentEmail = first.parentEmail || first.email || parentEmail;
              agency      = first.agencyName  || first.agency || agency;
              serviceType = normalizeServiceType(first.serviceType || first.shiftCategory || serviceType);
            }
          } 
          
          // 3. Try Clients Object
          if ((!clientName || clientName === "—") && data.clients && typeof data.clients === "object") {
            const vals = Object.values(data.clients);
            if (vals.length > 0 && (vals[0].fullName || vals[0].name)) {
              clientName  = vals[0].fullName || vals[0].name;
              parentEmail = vals[0].parentEmail || parentEmail;
            }
          } 
          
          // 4. Try Top-level fields (including mobile app structure)
          if (!clientName || clientName === "—") {
            clientName = data.clientName || data.childName || data.childFullName || data.name 
              || data.nameInClientTable || data.applicantName || data.submitterName 
              || data.familyLastName || (data.firstName && data.lastName ? `${data.firstName} ${data.lastName}` : "")
              || data.filledBy || data.parentName || data.inTakeWorkerName || data.nameOfPerson || "—";
            
            if (clientName === "—" && (data.childFirstName || data.childLastName)) {
              clientName = `${data.childFirstName || ""} ${data.childLastName || ""}`.trim() || "—";
            }
            
            if (sourceLabel === "new" && data.clientName) agency = "—";
          }

          const rawStatus = data.status || "Pending";
          return {
            id: d.id,
            formId: d.id,
            clientName,
            clientCode,
            serviceType,
            clientStatus: normalizeClientStatus(rawStatus),
            rawStatus,
            parentEmail,
            agency,
            formType,
            submittedAt: data.submittedOn || data.createDate || data.createdAt || data.dateOfInTake || data.submittedAt || "—",
            isEditable: data.isEditable || false,
            filledBy: data.filledBy || data.inTakeWorkerName || data.parentName || data.staffName || "—",
            _source: sourceLabel,
          };
        };

        const oldList    = oldSnap.docs.map(d => processDoc(d, "old"));
        const newList    = newSnap.docs.map(d => processDoc(d, "new"));

        // Smart merge: Deduplicate by id, but prefer records that actually have a client name
        const mergedMap = new Map();
        [...newList, ...oldList].forEach(f => {
          const existing = mergedMap.get(f.id);
          const isNewerBetter = !existing || 
            (existing.clientName === "—" && f.clientName !== "—") ||
            (existing.clientName.toLowerCase().includes("unnamed") && !f.clientName.toLowerCase().includes("unnamed"));

          if (isNewerBetter) {
            mergedMap.set(f.id, f);
          }
        });
        const merged = Array.from(mergedMap.values());

        merged.sort((a, b) => {
          const parseDate = (s) => {
            if (!s || s === "—") return 0;
            if (s?.toDate) return s.toDate().getTime();
            if (s.includes("PM") || s.includes("AM"))
              return new Date(s.replace(/(\d{2}) (\w{3}) (\d{4})/, "$2 $1, $3")).getTime() || 0;
            if (s.includes("-")) {
              const parts = s.split("-");
              if (parts[2]?.length === 4) return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`).getTime() || 0;
            }
            return new Date(s).getTime() || 0;
          };
          return parseDate(b.submittedAt) - parseDate(a.submittedAt);
        });

        setForms(merged);
      } catch (e) {
        console.error("Error fetching intake forms:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchForms();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this form?")) return;
    try {
      const form = forms.find(f => f.id === id);
      const col = form?._source === "new" ? "intakeForms" : "InTakeForms";
      await deleteDoc(doc(db, col, id));
      setForms((prev) => prev.filter((f) => f.id !== id));
    } catch (e) {
      console.error("Error deleting form:", e);
    }
  };

  const handleToggleEdit = async (form) => {
    const newState = !form.isEditable;
    try {
      const col = form._source === "new" ? "intakeForms" : "InTakeForms";
      await updateDoc(doc(db, col, form.id), { isEditable: newState });
      setForms((prev) => prev.map((f) => (f.id === form.id ? { ...f, isEditable: newState } : f)));
    } catch (e) {
      console.error("Error updating edit access:", e);
    }
  };

  const totalForms   = forms.length;
  const privateForms = forms.filter((f) => f.formType === "private-family").length;
  const workerForms  = forms.filter((f) => f.formType === "intake-worker").length;

  const tabCounts = { all: totalForms, "private-family": privateForms, "intake-worker": workerForms };

  const filtered = useMemo(() => {
    return forms.filter((f) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        f.clientName.toLowerCase().includes(q) ||
        f.clientCode.toLowerCase().includes(q) ||
        f.parentEmail.toLowerCase().includes(q) ||
        f.agency.toLowerCase().includes(q) ||
        f.filledBy.toLowerCase().includes(q);
      const matchTab     = activeTab === "all" || f.formType === activeTab;
      const matchService = serviceFilter === "All" || f.serviceType === serviceFilter;
      const matchAgency  = agencyFilter  === "All" || f.agency     === agencyFilter;
      const matchStatus  = statusFilter  === "All" || f.clientStatus === statusFilter;
      return matchSearch && matchTab && matchService && matchAgency && matchStatus;
    });
  }, [forms, search, activeTab, serviceFilter, agencyFilter, statusFilter]);

  return (
    <div className="h-full flex flex-col overflow-hidden" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

      {/* ── Success Banner ─────────────────────────────────────────────────── */}
      {successBanner && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl mb-4 flex-shrink-0"
          style={{ background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
          <CheckCircle2 size={16} style={{ color: "#1f7a3c", flexShrink: 0 }} />
          <span style={{ fontSize: 13, color: "#1f7a3c", fontWeight: 500 }}>{successBanner}</span>
          <button onClick={() => setSuccessBanner(null)} className="ml-auto p-0.5 rounded hover:bg-green-100 transition-colors">
            <X size={13} style={{ color: "#1f7a3c" }} />
          </button>
        </div>
      )}

      {/* ── Page Header ────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-5 flex-shrink-0">
        <div>
          <h1 className="font-bold" style={{ fontSize: 22, color: "#111827", letterSpacing: "-0.3px" }}>
            Intake Forms
          </h1>
          <p style={{ fontSize: 13, color: "#6b7280", marginTop: 2 }}>
            Manage and review all intake form submissions
          </p>
        </div>
      </div>

      {/* ── Scrollable content ─────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto space-y-5 pb-4">

        {/* ── KPI Cards ──────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-4 flex-shrink-0">
          <div className="bg-white rounded-xl border px-5 py-4 flex items-center gap-4"
            style={{ borderColor: "#e5e7eb", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
            <div className="rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ width: 44, height: 44, background: "#f8fafc" }}>
              <FileText size={20} style={{ color: "#475569" }} strokeWidth={1.8} />
            </div>
            <div>
              <p style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Total Intake Forms</p>
              <p style={{ fontSize: 26, fontWeight: 700, color: "#111827", lineHeight: 1.2 }}>{totalForms}</p>
              <p style={{ fontSize: 11, color: "#6b7280", marginTop: 1 }}>All submissions</p>
            </div>
          </div>

          <div className="bg-white rounded-xl border px-5 py-4 flex items-center gap-4"
            style={{ borderColor: "#e5e7eb", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
            <div className="rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ width: 44, height: 44, background: "#f0fdf4" }}>
              <Users size={20} style={{ color: "#1f7a3c" }} strokeWidth={1.8} />
            </div>
            <div className="flex-1">
              <p style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Private Family</p>
              <p style={{ fontSize: 26, fontWeight: 700, color: "#111827", lineHeight: 1.2 }}>{privateForms}</p>
              <p style={{ fontSize: 11, color: "#6b7280", marginTop: 1 }}>Family submissions</p>
            </div>
            <div className="rounded-full flex-shrink-0" style={{ width: 4, height: 48, background: "#1f7a3c" }} />
          </div>

          <div className="bg-white rounded-xl border px-5 py-4 flex items-center gap-4"
            style={{ borderColor: "#e5e7eb", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
            <div className="rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ width: 44, height: 44, background: "#eff6ff" }}>
              <Briefcase size={20} style={{ color: "#2563eb" }} strokeWidth={1.8} />
            </div>
            <div className="flex-1">
              <p style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Intake Worker</p>
              <p style={{ fontSize: 26, fontWeight: 700, color: "#111827", lineHeight: 1.2 }}>{workerForms}</p>
              <p style={{ fontSize: 11, color: "#6b7280", marginTop: 1 }}>Worker submissions</p>
            </div>
            <div className="rounded-full flex-shrink-0" style={{ width: 4, height: 48, background: "#2563eb" }} />
          </div>
        </div>

        {/* ── Create New Intake Form ─────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border overflow-hidden flex-shrink-0"
          style={{ borderColor: "#e5e7eb", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
          <div className="px-5 py-3.5 border-b flex items-center justify-between" style={{ borderColor: "#f3f4f6" }}>
            <div className="flex items-center gap-2">
              <Plus size={14} style={{ color: "#145228" }} strokeWidth={2.5} />
              <p style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>Create New Intake Form</p>
            </div>
            <p style={{ fontSize: 12, color: "#9ca3af" }}>Select the submission type to begin</p>
          </div>

          <div className="grid grid-cols-2" style={{ borderTop: "none" }}>
            {/* Private Family */}
            <button
              onClick={() => navigate("/admin-dashboard/add/private-family-form")}
              className="flex items-center gap-4 px-6 py-5 text-left transition-all group hover:bg-green-50/40 border-r"
              style={{ borderColor: "#f3f4f6" }}
            >
              <div className="rounded-xl flex items-center justify-center flex-shrink-0 transition-colors group-hover:bg-green-100"
                style={{ width: 48, height: 48, background: "#f0fdf4" }}>
                <Users size={22} style={{ color: "#1f7a3c" }} strokeWidth={1.8} />
              </div>
              <div className="flex-1 min-w-0">
                <p style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>Private Family</p>
                <p style={{ fontSize: 12, color: "#6b7280", marginTop: 2, lineHeight: 1.5 }}>
                  Parent or guardian submitting on behalf of their child
                </p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0" style={{ fontSize: 12, fontWeight: 600, color: "#1f7a3c" }}>
                <span>Start</span>
                <ChevronRight size={14} strokeWidth={2.5} />
              </div>
            </button>

            {/* Intake Worker */}
            <button
              onClick={() => navigate("/admin-dashboard/add/add-intake-form?type=Intake Worker")}
              className="flex items-center gap-4 px-6 py-5 text-left transition-all group hover:bg-blue-50/40"
            >
              <div className="rounded-xl flex items-center justify-center flex-shrink-0 transition-colors group-hover:bg-blue-100"
                style={{ width: 48, height: 48, background: "#eff6ff" }}>
                <Briefcase size={22} style={{ color: "#2563eb" }} strokeWidth={1.8} />
              </div>
              <div className="flex-1 min-w-0">
                <p style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>Intake Worker</p>
                <p style={{ fontSize: 12, color: "#6b7280", marginTop: 2, lineHeight: 1.5 }}>
                  Agency professional submitting on behalf of a client
                </p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0" style={{ fontSize: 12, fontWeight: 600, color: "#2563eb" }}>
                <span>Start</span>
                <ChevronRight size={14} strokeWidth={2.5} />
              </div>
            </button>
          </div>
        </div>

        {/* ── Submitted Forms Table ──────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border flex flex-col overflow-hidden"
          style={{ borderColor: "#e5e7eb", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>

          {/* Toolbar */}
          <div className="px-5 py-3.5 border-b flex items-center justify-between gap-4 flex-shrink-0"
            style={{ borderColor: "#f3f4f6" }}>

            {/* Tabs */}
            <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-lg">
              {TABS.map((tab) => {
                const isActive = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className="flex items-center gap-2 px-3.5 py-1.5 rounded-md transition-all"
                    style={{
                      fontSize: 12.5, fontWeight: isActive ? 700 : 500,
                      color: isActive ? "#111827" : "#6b7280",
                      background: isActive ? "#ffffff" : "transparent",
                      boxShadow: isActive ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                    }}
                  >
                    {tab.label}
                    <span className="px-1.5 py-0.5 rounded-full" style={{
                      fontSize: 10, fontWeight: 700,
                      background: isActive
                        ? (tab.key === "private-family" ? "#f0fdf4" : tab.key === "intake-worker" ? "#eff6ff" : "#e5e7eb")
                        : "#f3f4f6",
                      color: isActive
                        ? (tab.key === "private-family" ? "#1f7a3c" : tab.key === "intake-worker" ? "#2563eb" : "#374151")
                        : "#9ca3af",
                    }}>
                      {tabCounts[tab.key]}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Search + Filters */}
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <Search size={12} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }} />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search forms..."
                  className="rounded-lg border bg-white focus:outline-none transition-all"
                  style={{ paddingLeft: 30, paddingRight: 12, paddingTop: 7, paddingBottom: 7, borderColor: "#e5e7eb", fontSize: 12, width: 180 }}
                />
              </div>
              <FilterChip label="Service" value={serviceFilter} options={SERVICE_TYPES} onChange={setServiceFilter} />
              <FilterChip label="Agency"  value={agencyFilter}  options={AGENCIES}       onChange={setAgencyFilter} />
              <FilterChip label="Status"  value={statusFilter}  options={CLIENT_STATUSES} onChange={setStatusFilter} />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: "1px solid #f3f4f6", background: "#fafafa" }}>
                  {[
                    { label: "Client Name",      w: "140px" },
                    { label: "Client Code",      w: "110px" },
                    { label: "Service Type",     w: "160px" },
                    { label: "Client Status",    w: "115px" },
                    { label: "Parent Email",     w: undefined },
                    { label: "Agency",           w: "110px" },
                    { label: "Form Type",        w: "145px" },
                    { label: "Submitted",        w: "115px" },
                    { label: "View Intake Form", w: "130px", center: true },
                    { label: "Actions",          w: "150px", center: true },
                  ].map((col) => (
                    <th
                      key={col.label}
                      className="px-4 py-3 text-left"
                      style={{
                        fontSize: 11.5, fontWeight: 700, color: "#6b7280",
                        width: col.w, textAlign: col.center ? "center" : "left",
                        whiteSpace: "nowrap", textTransform: "uppercase", letterSpacing: "0.04em",
                      }}
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={10} className="py-14 text-center">
                      <div className="flex items-center justify-center gap-2" style={{ color: "#9ca3af" }}>
                        <div className="animate-spin w-5 h-5 rounded-full border-2 border-emerald-600 border-t-transparent" />
                        <span style={{ fontSize: 13 }}>Loading forms…</span>
                      </div>
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-14 text-center">
                      <FileText size={32} className="mx-auto mb-3" style={{ color: "#d1d5db" }} strokeWidth={1.5} />
                      <p style={{ fontSize: 13, color: "#9ca3af", fontWeight: 500 }}>No forms match your filters.</p>
                    </td>
                  </tr>
                ) : (
                  filtered.map((record, idx) => {
                    const svc = getServiceColor(record.serviceType);
                    const sts = getClientStatusColor(record.clientStatus);
                    return (
                      <tr
                        key={record.id}
                        className="transition-colors hover:bg-gray-50/60"
                        style={{ borderTop: idx === 0 ? "none" : "1px solid #f3f4f6" }}
                      >
                        {/* Client Name */}
                        <td className="px-4 py-3.5">
                          <span className="font-semibold" style={{ fontSize: 13, color: "#111827" }}>{record.clientName}</span>
                        </td>

                        {/* Client Code */}
                        <td className="px-4 py-3.5">
                          <span style={{ fontSize: 12, color: "#6b7280", fontFamily: "monospace" }}>#{record.clientCode}</span>
                        </td>

                        {/* Service Type */}
                        <td className="px-4 py-3.5">
                          <span className="px-2.5 py-1 rounded-full whitespace-nowrap"
                            style={{ fontSize: 11, fontWeight: 600, background: svc.bg, color: svc.text }}>
                            {record.serviceType || "—"}
                          </span>
                        </td>

                        {/* Client Status */}
                        <td className="px-4 py-3.5">
                          <span className="px-2.5 py-1 rounded-full"
                            style={{ fontSize: 11, fontWeight: 600, background: sts.bg, color: sts.text }}>
                            {record.clientStatus}
                          </span>
                        </td>

                        {/* Parent Email */}
                        <td className="px-4 py-3.5">
                          <span className="truncate block max-w-[200px]" style={{ fontSize: 12, color: "#374151" }} title={record.parentEmail}>
                            {record.parentEmail}
                          </span>
                        </td>

                        {/* Agency */}
                        <td className="px-4 py-3.5">
                          <span style={{ fontSize: 12, color: "#374151" }}>{record.agency}</span>
                        </td>

                        {/* Form Type */}
                        <td className="px-4 py-3.5">
                          <FormTypeBadge type={record.formType} />
                        </td>

                        {/* Submitted */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1.5">
                            <Clock size={11} style={{ color: "#9ca3af", flexShrink: 0 }} />
                            <span style={{ fontSize: 12, color: "#6b7280" }}>{formatDate(record.submittedAt)}</span>
                          </div>
                        </td>

                        {/* View Intake Form */}
                        <td className="px-4 py-3.5 text-center">
                          <button
                            onClick={() => setViewRecord(record)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all hover:bg-gray-50 hover:border-gray-300"
                            style={{ fontSize: 11.5, fontWeight: 600, color: "#374151", borderColor: "#e5e7eb" }}
                          >
                            <Eye size={12} strokeWidth={2} />
                            View
                          </button>
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3.5 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => setViewRecord(record)}
                              className="flex items-center justify-center rounded-lg transition-all hover:brightness-95"
                              style={{ width: 28, height: 28, background: "#eff6ff", color: "#2563eb", border: "1px solid #bfdbfe" }}
                              title="View"
                            >
                              <Eye size={13} strokeWidth={2} />
                            </button>
                            <button
                              onClick={() => navigate(`/admin-dashboard/add/update-intake-form/${record.formId}?type=${record.formType}`)}
                              className="flex items-center justify-center rounded-lg transition-all hover:brightness-95"
                              style={{ width: 28, height: 28, background: "#f0fdf4", color: "#16a34a", border: "1px solid #bbf7d0" }}
                              title="Edit"
                            >
                              <Edit2 size={13} strokeWidth={2} />
                            </button>
                            <button
                              onClick={() => handleDelete(record.id)}
                              className="flex items-center justify-center rounded-lg transition-all hover:brightness-95"
                              style={{ width: 28, height: 28, background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca" }}
                              title="Delete"
                            >
                              <Trash2 size={13} strokeWidth={2} />
                            </button>
                            <button
                              onClick={() => handleToggleEdit(record)}
                              className="flex items-center justify-center rounded-lg transition-all hover:brightness-95"
                              style={{ width: 28, height: 28, background: record.isEditable ? "#f0fdf4" : "#f3f4f6", color: record.isEditable ? "#1f7a3c" : "#374151", border: `1px solid ${record.isEditable ? "#bbf7d0" : "#e5e7eb"}` }}
                              title={record.isEditable ? "Lock editing" : "Allow editing"}
                            >
                              <MoreHorizontal size={13} strokeWidth={2} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Table footer */}
          <div className="px-5 py-3 border-t flex items-center justify-between flex-shrink-0"
            style={{ borderColor: "#f3f4f6", background: "#fafafa" }}>
            <p style={{ fontSize: 12, color: "#9ca3af" }}>
              Showing <strong style={{ color: "#374151" }}>{filtered.length}</strong> of{" "}
              <strong style={{ color: "#374151" }}>{forms.length}</strong> forms
            </p>
            <div className="flex items-center gap-1.5">
              <span className="rounded-full" style={{ width: 8, height: 8, background: "#1f7a3c", display: "inline-block" }} />
              <span style={{ fontSize: 11, color: "#6b7280" }}>Private Family</span>
              <span className="rounded-full ml-3" style={{ width: 8, height: 8, background: "#2563eb", display: "inline-block" }} />
              <span style={{ fontSize: 11, color: "#6b7280" }}>Intake Worker</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Modals ─────────────────────────────────────────────────────────── */}
      {viewRecord && <ViewFormModal record={viewRecord} onClose={() => setViewRecord(null)} />}
    </div>
  );
}
