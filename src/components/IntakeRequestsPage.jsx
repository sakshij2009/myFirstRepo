import { useState, useEffect } from "react";
import {
  Users, Briefcase, Clock, CheckCircle2, AlertCircle, UserCheck,
  FileText, Phone, Mail, MapPin, Calendar, Building2, Paperclip,
  Eye, MessageSquare, X, Search, Filter, User,
} from "lucide-react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "../firebase";

export default function IntakeRequestsPage() {
  const [sourceFilter, setSourceFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        // ── Fetch from both collections ──
        const [oldSnap, newSnap] = await Promise.all([
          getDocs(collection(db, "InTakeForms")),
          getDocs(collection(db, "intakeForms")),
        ]);

        const normalizeDoc = (doc, source) => {
          const d = doc.data();

          // ── For new mobile app forms: flat structure ──
          if (source === "new") {
            return {
              id: doc.id,
              firestoreId: doc.id,
              _source: "new",
              source: "intake-worker", // mobile app staff submissions
              status: (d.status || "submitted").toLowerCase(),
              childName: d.clientName || "Unknown",
              submitterName: d.staffName || "Unknown",
              submitterRole: "Staff",
              agencyName: null,
              serviceType: d.formType || "N/A",
              urgency: "standard",
              priority: null,
              preferredStartDate: d.submittedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
              phone: "N/A",
              email: "N/A",
              location: null,
              descriptionPreview: d.staffNotes || d.conditionNotes || "No description provided.",
              dataQuality: "complete",
              clientId: null,
              caseReference: null,
              hasDocuments: false,
              approvalStatus: null,
              submittedDate: d.submittedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
              ...d,
            };
          }

          // ── Old web app forms: complex structure ──
          const isIntakeWorker = (() => {
            if (d.formType === "intake-worker") return true;
            if (d.formType === "private") return false;
            if (d.isCaseWorker === true) return true;
            if (d.intakeworkerName?.trim()) return true;
            return false;
          })();

          const filerName = isIntakeWorker
            ? (d.intakeworkerName?.trim() || d.caseworkerName?.trim() || d.workerInfo?.workerName?.trim() || "Unknown")
            : (d.parentInfoList?.[0]?.parentName?.trim() || d.workerInfo?.workerName?.trim() || d.parentName?.trim() || d.submitterName?.trim() || "Unknown");

          const filerRole = isIntakeWorker
            ? (d.caseworkerName ? "Case Worker" : "Intake Worker")
            : (d.parentInfoList?.[0]?.relationShip?.trim() || null);

          const filerAgency = isIntakeWorker
            ? (d.agencyName?.trim() || d.caseworkerAgencyName?.trim() || null)
            : null;

          const filerPhone = isIntakeWorker
            ? (d.intakeworkerPhone || d.caseworkerPhone || d.phone || "N/A")
            : (d.parentInfoList?.[0]?.parentPhone || d.phone || "N/A");

          const filerEmail = isIntakeWorker
            ? (d.intakeworkerEmail || d.caseworkerEmail || d.email || "N/A")
            : (d.parentInfoList?.[0]?.parentEmail || d.email || "N/A");

          const clientName = (() => {
            if (d.clients && typeof d.clients === "object" && !Array.isArray(d.clients)) {
              const names = Object.values(d.clients).map(c => c.fullName || c.name || "").filter(Boolean);
              if (names.length) return names.join(", ");
            }
            if (Array.isArray(d.inTakeClients)) {
              const names = d.inTakeClients.map(c => c.name || "").filter(Boolean);
              if (names.length) return names.join(", ");
            }
            return d.childName || d.clientName || "Unknown";
          })();

          return {
            id: doc.id,
            firestoreId: doc.id,
            _source: "old",
            source: isIntakeWorker ? "intake-worker" : "private-family",
            status: (d.status || "new").toLowerCase(),
            childName: clientName,
            submitterName: filerName,
            submitterRole: filerRole,
            agencyName: filerAgency,
            serviceType: d.serviceType || d.services?.serviceType?.[0] || d.service || "N/A",
            urgency: d.urgency || "standard",
            priority: d.priority || null,
            preferredStartDate: d.preferredStartDate || d.startDate || d.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
            phone: filerPhone,
            email: filerEmail,
            location: d.location || d.address || null,
            descriptionPreview: d.description || d.notes || d.jobDescription || "No description provided.",
            dataQuality: d.dataQuality || "complete",
            clientId: d.clientId || null,
            caseReference: d.caseReference || null,
            hasDocuments: !!(d.hasDocuments || (d.uploadedDocs?.length > 0)),
            approvalStatus: d.approvalStatus || null,
            submittedDate: d.submittedDate || d.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
            ...d,
          };
        };

        const oldData = oldSnap.docs.map(d => normalizeDoc(d, "old"));
        const newData = newSnap.docs.map(d => normalizeDoc(d, "new"));

        // Merge: old first, then mobile — deduplicate by id
        const seenIds = new Set();
        const data = [...oldData, ...newData].filter(f => {
          if (seenIds.has(f.id)) return false;
          seenIds.add(f.id);
          return true;
        });
        setRequests(data);
      } catch (err) {
        console.error("Error fetching intake requests:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchRequests();
  }, []);

  const filteredRequests = requests.filter((req) => {
    const matchesSource = sourceFilter === "all" || req.source === sourceFilter;
    const matchesStatus = statusFilter === "all" || req.status === statusFilter;
    const matchesSearch =
      searchQuery === "" ||
      (req.childName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (req.submitterName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (req.id || "").toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSource && matchesStatus && matchesSearch;
  });

  const counts = {
    all: requests.length,
    privateFamilies: requests.filter((r) => r.source === "private-family").length,
    intakeWorkers: requests.filter((r) => r.source === "intake-worker").length,
    new: requests.filter((r) => r.status === "new").length,
    assigned: requests.filter((r) => r.status === "assigned").length,
    completed: requests.filter((r) => r.status === "completed").length,
  };

  if (selectedRequest) {
    return <RequestDetailView request={selectedRequest} onBack={() => setSelectedRequest(null)} />;
  }

  return (
    <div className="h-full flex flex-col" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      {/* Header */}
      <div className="mb-4">
        <h1 className="font-bold mb-0.5" style={{ fontSize: "24px", fontWeight: 700, color: "#111827", letterSpacing: "-0.02em" }}>
          Intake Requests
        </h1>
        <p style={{ fontSize: "13px", color: "#6b7280" }}>
          Manage and triage service intake submissions
        </p>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <KPICard label="New Requests" value={counts.new} icon={<FileText className="size-4" strokeWidth={2} />} iconBg="#eff6ff" iconColor="#3b82f6" />
        <KPICard label="Assigned" value={counts.assigned} icon={<UserCheck className="size-4" strokeWidth={2} />} iconBg="#e0e7ff" iconColor="#6366f1" />
        <KPICard label="Completed" value={counts.completed} icon={<CheckCircle2 className="size-4" strokeWidth={2} />} iconBg="#d1fae5" iconColor="#10b981" />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border mb-3" style={{ borderColor: "#e5e7eb", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
        {/* Source Tabs */}
        <div className="border-b" style={{ borderColor: "#e5e7eb" }}>
          <div className="flex items-center gap-6 px-4">
            {[
              { key: "all", label: "All Requests", count: counts.all },
              { key: "private-family", label: "Private Families", count: counts.privateFamilies },
              { key: "intake-worker", label: "Intake Workers", count: counts.intakeWorkers },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setSourceFilter(tab.key)}
                className="flex items-center gap-2 py-3 relative transition-colors"
                style={{ color: sourceFilter === tab.key ? "#111827" : "#9ca3af" }}
              >
                <span className="font-semibold" style={{ fontSize: "13px" }}>{tab.label}</span>
                <span className="px-1.5 py-0.5 rounded font-bold min-w-[24px] text-center"
                  style={{ fontSize: "11px", backgroundColor: sourceFilter === tab.key ? "#f0fdf4" : "#f3f4f6", color: sourceFilter === tab.key ? "#1f7a3c" : "#9ca3af" }}>
                  {tab.count}
                </span>
                {sourceFilter === tab.key && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5" style={{ backgroundColor: "#1f7a3c" }} />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Status Filters & Search */}
        <div className="flex items-center justify-between px-4 py-2.5">
          <div className="flex items-center gap-2">
            <Filter className="size-3.5" style={{ color: "#9ca3af" }} strokeWidth={2} />
            <span className="font-semibold mr-1" style={{ fontSize: "11px", color: "#6b7280" }}>Status:</span>
            {["all", "new", "assigned", "completed", "rejected"].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all ${statusFilter === status ? "bg-gray-900 text-white" : "bg-gray-100 hover:bg-gray-200"}`}
                style={{ fontSize: "11px", color: statusFilter === status ? "white" : "#374151" }}
              >
                {status === "all" ? "All" : status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5" style={{ color: "#9ca3af" }} strokeWidth={2} />
            <input
              type="text"
              placeholder="Search requests..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 rounded-lg border transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              style={{ borderColor: "#e5e7eb", fontSize: "12px", width: "200px" }}
            />
          </div>
        </div>
      </div>

      {/* Request Cards */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin w-6 h-6 rounded-full border-2 border-emerald-600 border-t-transparent" />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 pb-6">
            {filteredRequests.map((req) => (
              <RequestCard key={req.firestoreId} request={req} onClick={() => setSelectedRequest(req)} />
            ))}
            {filteredRequests.length === 0 && (
              <div className="text-center py-12">
                <FileText className="size-12 mx-auto mb-3" style={{ color: "#d1d5db" }} strokeWidth={1.5} />
                <p className="font-semibold mb-1" style={{ fontSize: "15px", color: "#6b7280" }}>No requests found</p>
                <p style={{ fontSize: "13px", color: "#9ca3af" }}>Try adjusting your filters or search query</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function KPICard({ label, value, icon, iconBg, iconColor }) {
  return (
    <div className="bg-white rounded-xl border p-3.5" style={{ borderColor: "#e5e7eb", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
      <div className="flex items-center gap-2.5">
        <div className="p-2 rounded-lg" style={{ backgroundColor: iconBg, color: iconColor }}>{icon}</div>
        <div>
          <p className="font-bold mb-0.5" style={{ fontSize: "22px", color: "#111827", lineHeight: "1" }}>{value}</p>
          <p style={{ fontSize: "12px", color: "#6b7280", fontWeight: 500 }}>{label}</p>
        </div>
      </div>
    </div>
  );
}

function getUrgencyColor(urgency, priority) {
  if (urgency === "emergency" || priority === "critical") return { bg: "#fee2e2", text: "#dc2626", label: urgency === "emergency" ? "Emergency" : "Critical" };
  if (urgency === "urgent" || priority === "high") return { bg: "#fed7aa", text: "#ea580c", label: urgency === "urgent" ? "Urgent" : "High" };
  if (priority === "medium") return { bg: "#fef3c7", text: "#d97706", label: "Medium" };
  return { bg: "#e5e7eb", text: "#6b7280", label: "Standard" };
}

function getStatusColor(status) {
  switch (status) {
    case "new": return { bg: "#eff6ff", text: "#3b82f6" };
    case "assigned": return { bg: "#e0e7ff", text: "#6366f1" };
    case "completed": return { bg: "#d1fae5", text: "#10b981" };
    case "rejected": return { bg: "#fee2e2", text: "#ef4444" };
    default: return { bg: "#f3f4f6", text: "#6b7280" };
  }
}

function RequestCard({ request, onClick }) {
  const isPrivateFamily = request.source === "private-family";
  const urgency = getUrgencyColor(request.urgency, request.priority);
  const status = getStatusColor(request.status);

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-xl border p-3.5 transition-all hover:shadow-md cursor-pointer"
      style={{ borderColor: "#e5e7eb", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
    >
      <div className="flex items-start justify-between mb-2.5">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1.5">
            <h3 className="font-bold" style={{ fontSize: "15px", color: "#111827" }}>{request.childName}</h3>
            <span className="px-1.5 py-0.5 rounded font-semibold"
              style={{ fontSize: "10px", backgroundColor: isPrivateFamily ? "#f0fdf4" : "#eff6ff", color: isPrivateFamily ? "#1f7a3c" : "#2563eb", border: `1px solid ${isPrivateFamily ? "#bbf7d0" : "#bfdbfe"}` }}>
              {isPrivateFamily ? "Private Family" : "Intake Worker"}
            </span>
            <span className="px-1.5 py-0.5 rounded font-semibold" style={{ fontSize: "10px", backgroundColor: status.bg, color: status.text }}>
              {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
            </span>
            <span className="px-1.5 py-0.5 rounded font-semibold" style={{ fontSize: "10px", backgroundColor: urgency.bg, color: urgency.text }}>
              {urgency.label}
            </span>
          </div>
          <div className="flex items-center gap-3 mb-1.5">
            <div className="flex items-center gap-1">
              <User className="size-3" style={{ color: "#9ca3af" }} strokeWidth={2} />
              <span style={{ fontSize: "12px", color: "#6b7280" }}>
                {request.submitterName}{request.submitterRole && ` · ${request.submitterRole}`}
              </span>
            </div>
            {request.agencyName && (
              <div className="flex items-center gap-1">
                <Building2 className="size-3" style={{ color: "#9ca3af" }} strokeWidth={2} />
                <span style={{ fontSize: "12px", color: "#6b7280" }}>{request.agencyName}</span>
              </div>
            )}
            {request.location && (
              <div className="flex items-center gap-1">
                <MapPin className="size-3" style={{ color: "#9ca3af" }} strokeWidth={2} />
                <span style={{ fontSize: "12px", color: "#6b7280" }}>{request.location}</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2" style={{ fontSize: "11px" }}>
            <span className="font-mono font-semibold" style={{ color: "#9ca3af" }}>{request.id?.slice(0, 12)}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-2.5 pb-2.5 border-b" style={{ borderColor: "#f3f4f6" }}>
        <div>
          <p className="font-semibold mb-0.5" style={{ fontSize: "10px", color: "#9ca3af", textTransform: "uppercase" }}>Service Type</p>
          <p className="font-semibold" style={{ fontSize: "12px", color: "#374151" }}>{request.serviceType}</p>
        </div>
        <div>
          <p className="font-semibold mb-0.5" style={{ fontSize: "10px", color: "#9ca3af", textTransform: "uppercase" }}>Start Date</p>
          <div className="flex items-center gap-1">
            <Calendar className="size-3" style={{ color: "#6b7280" }} strokeWidth={2} />
            <p className="font-semibold" style={{ fontSize: "12px", color: "#374151" }}>
              {request.preferredStartDate ? new Date(request.preferredStartDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "TBD"}
            </p>
          </div>
        </div>
        <div>
          <p className="font-semibold mb-0.5" style={{ fontSize: "10px", color: "#9ca3af", textTransform: "uppercase" }}>Data Quality</p>
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-semibold"
            style={{ fontSize: "10px", backgroundColor: "#d1fae5", color: "#10b981" }}>
            <div className="size-1.5 rounded-full bg-emerald-500" />
            Complete
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4 mb-2.5">
        <div className="flex items-center gap-1.5">
          <Phone className="size-3" style={{ color: "#9ca3af" }} strokeWidth={2} />
          <span style={{ fontSize: "12px", color: "#374151" }}>{request.phone}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Mail className="size-3" style={{ color: "#9ca3af" }} strokeWidth={2} />
          <span style={{ fontSize: "12px", color: "#374151" }}>{request.email}</span>
        </div>
        {request.hasDocuments && (
          <div className="flex items-center gap-1">
            <Paperclip className="size-3" style={{ color: "#10b981" }} strokeWidth={2} />
            <span className="font-semibold" style={{ fontSize: "11px", color: "#10b981" }}>Documents</span>
          </div>
        )}
      </div>

      <p style={{ fontSize: "12px", color: "#6b7280", lineHeight: "1.5", marginBottom: 10 }}>
        {request.descriptionPreview?.slice(0, 150)}{(request.descriptionPreview?.length || 0) > 150 ? "…" : ""}
      </p>

      <div className="flex items-center gap-2">
        <button
          className="px-2.5 py-1.5 rounded-lg font-semibold transition-all text-white"
          style={{ backgroundColor: "#1f7a3c", fontSize: "11px" }}
          onClick={(e) => { e.stopPropagation(); onClick(); }}
        >
          <Eye className="size-3 inline-block mr-1" strokeWidth={2} />
          Review Request
        </button>
        <button
          className="px-2.5 py-1.5 rounded-lg border font-semibold transition-all hover:bg-gray-50"
          style={{ borderColor: "#e5e7eb", fontSize: "11px", color: "#374151" }}
          onClick={(e) => e.stopPropagation()}
        >
          <UserCheck className="size-3 inline-block mr-1" strokeWidth={2} />
          Assign
        </button>
      </div>
    </div>
  );
}

function RequestDetailView({ request, onBack }) {
  const isPrivateFamily = request.source === "private-family";

  return (
    <div className="h-full flex flex-col" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div className="mb-4">
        <div className="flex items-center gap-3 mb-2">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border font-semibold transition-all hover:bg-gray-50"
            style={{ borderColor: "#e5e7eb", fontSize: "13px", color: "#374151" }}
          >
            ← Back to Requests
          </button>
          <span className="px-2.5 py-1 rounded-md font-semibold"
            style={{ fontSize: "12px", backgroundColor: isPrivateFamily ? "#f0fdf4" : "#eff6ff", color: isPrivateFamily ? "#1f7a3c" : "#2563eb", border: `1px solid ${isPrivateFamily ? "#bbf7d0" : "#bfdbfe"}` }}>
            {isPrivateFamily ? "Private Family Submission" : "Intake Worker Submission"}
          </span>
        </div>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-bold mb-1" style={{ fontSize: "24px", fontWeight: 700, color: "#111827", letterSpacing: "-0.02em" }}>
              {request.childName}
            </h1>
            <p style={{ fontSize: "13px", color: "#6b7280" }}>
              Submitted by {request.submitterName}{request.submitterRole ? ` · ${request.submitterRole}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button className="px-4 py-2.5 rounded-lg font-semibold transition-all text-white flex items-center gap-2"
              style={{ backgroundColor: "#1f7a3c", fontSize: "14px" }}>
              <UserCheck className="size-4" strokeWidth={2} /> Assign
            </button>
            <button className="px-4 py-2.5 rounded-lg border font-semibold transition-all hover:bg-gray-50 flex items-center gap-2"
              style={{ borderColor: "#e5e7eb", fontSize: "14px", color: "#374151" }}>
              <MessageSquare className="size-4" strokeWidth={2} /> Contact
            </button>
            <button className="px-4 py-2.5 rounded-lg border font-semibold transition-all hover:bg-red-50 hover:border-red-300 flex items-center gap-2"
              style={{ borderColor: "#e5e7eb", fontSize: "14px", color: "#dc2626" }}>
              <X className="size-4" strokeWidth={2} /> Reject
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="bg-white rounded-xl border p-6" style={{ borderColor: "#e5e7eb", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <div className="grid grid-cols-2 gap-5">
            <FormFieldView label="Service Type" value={request.serviceType} />
            <FormFieldView label="Urgency" value={request.urgency?.charAt(0).toUpperCase() + request.urgency?.slice(1) || "Standard"} />
            <FormFieldView label="Phone" value={request.phone} />
            <FormFieldView label="Email" value={request.email} />
            {request.location && <FormFieldView label="Location" value={request.location} span={2} />}
            {request.agencyName && <FormFieldView label="Agency" value={request.agencyName} />}
            {request.caseReference && <FormFieldView label="Case Reference" value={request.caseReference} />}
            {request.clientId && <FormFieldView label="Client ID" value={request.clientId} />}
            <FormFieldView label="Description" value={request.descriptionPreview || "No description provided."} span={2} multiline />
          </div>
        </div>
      </div>
    </div>
  );
}

function FormFieldView({ label, value, span, multiline }) {
  return (
    <div style={{ gridColumn: span ? `span ${span}` : undefined }}>
      <label className="block font-semibold mb-1.5" style={{ fontSize: "12px", color: "#6b7280" }}>{label}</label>
      {multiline ? (
        <div className="bg-gray-50 rounded-lg p-3 border" style={{ borderColor: "#e5e7eb", fontSize: "13px", color: "#111827", lineHeight: "1.6", minHeight: "80px" }}>
          {value}
        </div>
      ) : (
        <div className="bg-gray-50 rounded-lg px-3 py-2.5 border" style={{ borderColor: "#e5e7eb", fontSize: "13px", color: "#111827" }}>
          {value}
        </div>
      )}
    </div>
  );
}
