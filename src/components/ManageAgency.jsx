import { useEffect, useState } from "react";
import { collection, doc, getDocs, deleteDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useNavigate } from "react-router-dom";
import {
  Search, Plus, Edit2, Trash2, ChevronLeft, ChevronRight, Building2,
  Users, Activity, DollarSign, ChevronDown,
} from "lucide-react";

const TYPE_TABS = ["All", "Private", "Government", "Non Profit"];

function typeBadge(type) {
  const map = {
    Private:    { bg: "#fff7ed", color: "#ea580c", border: "#fed7aa" },
    Government: { bg: "#faf5ff", color: "#9333ea", border: "#e9d5ff" },
    "Non Profit": { bg: "#eff6ff", color: "#3b82f6", border: "#bfdbfe" },
  };
  const s = map[type] || { bg: "#f3f4f6", color: "#374151", border: "#e5e7eb" };
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border"
      style={{ backgroundColor: s.bg, color: s.color, borderColor: s.border }}
    >
      {type || "—"}
    </span>
  );
}

function getRate(rateList, name) {
  const item = rateList?.find((r) => r.name === name);
  return item ? item.rate ?? item.billingRate ?? "—" : "—";
}

const RATE_KEYS = [
  "Emergent Care",
  "Administration",
  "Supervised Visitation",
  "Respite Care",
  "Supervised Visitation + Transportation",
];

function KPICard({ icon, label, value, bg, iconColor }) {
  return (
    <div className="bg-white rounded-xl p-4 border flex items-center gap-3" style={{ borderColor: "#e5e7eb" }}>
      <div className="flex items-center justify-center rounded-xl shrink-0" style={{ width: 40, height: 40, backgroundColor: bg }}>
        <span style={{ color: iconColor }}>{icon}</span>
      </div>
      <div>
        <p style={{ fontSize: 11, color: "#9ca3af", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</p>
        <p style={{ fontSize: 20, fontWeight: 700, color: "#111827", lineHeight: 1.2 }}>{value}</p>
      </div>
    </div>
  );
}

function AgencyCard({ agency, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="bg-white rounded-xl border overflow-hidden transition-shadow hover:shadow-md" style={{ borderColor: "#e5e7eb" }}>
      {/* Header */}
      <div className="p-4 border-b flex items-start justify-between gap-3" style={{ borderColor: "#f3f4f6" }}>
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center justify-center rounded-xl shrink-0"
            style={{ width: 40, height: 40, backgroundColor: "#f0fdf4" }}>
            <Building2 size={18} style={{ color: "#1f7a3c" }} />
          </div>
          <div className="min-w-0">
            <p className="font-bold truncate" style={{ fontSize: 14, color: "#111827" }}>{agency.name || "—"}</p>
            <p className="truncate" style={{ fontSize: 12, color: "#6b7280", marginTop: 1 }}>{agency.email || "No email"}</p>
          </div>
        </div>
        {typeBadge(agency.agencyType)}
      </div>

      {/* Rate breakdown toggle */}
      <div className="px-4 py-3">
        <button
          onClick={() => setExpanded((e) => !e)}
          className="w-full flex items-center justify-between text-xs font-semibold transition-colors"
          style={{ color: "#6b7280" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#1f7a3c")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#6b7280")}
        >
          <span>Rate Breakdown</span>
          <ChevronDown size={14} style={{ transform: expanded ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s" }} />
        </button>

        {expanded && (
          <div className="mt-2 space-y-1.5">
            {RATE_KEYS.map((key) => (
              <div key={key} className="flex justify-between items-center" style={{ fontSize: 12 }}>
                <span style={{ color: "#9ca3af" }}>{key}</span>
                <span style={{ color: "#111827", fontWeight: 600 }}>
                  {getRate(agency.rateList, key) !== "—" ? `$${getRate(agency.rateList, key)}` : "—"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex gap-2 px-4 pb-4 border-t pt-3" style={{ borderColor: "#f3f4f6" }}>
        <button
          onClick={onEdit}
          className="flex items-center justify-center rounded-lg border transition-colors hover:bg-gray-50 flex-1"
          style={{ height: 32, borderColor: "#e5e7eb", fontSize: 12, color: "#374151", fontWeight: 500, gap: 4 }}
        >
          <Edit2 size={13} style={{ color: "#6b7280" }} />
          Edit
        </button>
        <button
          onClick={onDelete}
          className="flex items-center justify-center rounded-lg border transition-colors hover:bg-red-50 flex-1"
          style={{ height: 32, borderColor: "#e5e7eb", fontSize: 12, color: "#ef4444", fontWeight: 500, gap: 4 }}
        >
          <Trash2 size={13} />
          Delete
        </button>
      </div>
    </div>
  );
}

const ManageAgency = () => {
  const [search, setSearch] = useState("");
  const [typeTab, setTypeTab] = useState("All");
  const [agencies, setAgencies] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [goToPage, setGoToPage] = useState("");

  const navigate = useNavigate();

  useEffect(() => {
    const fetchAgencies = async () => {
      try {
        const qs = await getDocs(collection(db, "agencies"));
        const list = qs.docs.map((d) => ({ id: d.id, ...d.data() }));
        list.sort((a, b) => {
          const da = a.createdAt?.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt || 0).getTime();
          const db2 = b.createdAt?.toMillis ? b.createdAt.toMillis() : new Date(b.createdAt || 0).getTime();
          return db2 - da;
        });
        setAgencies(list);
      } catch (e) {
        console.error("Error fetching agencies:", e);
      }
    };
    fetchAgencies();
  }, []);

  const handleDelete = async (agencyId) => {
    if (!window.confirm("Are you sure you want to delete this agency?")) return;
    try {
      await deleteDoc(doc(db, "agencies", agencyId));
      setAgencies((prev) => prev.filter((a) => a.id !== agencyId));
    } catch (e) {
      console.error("Error deleting agency:", e);
    }
  };

  const filtered = agencies.filter((a) => {
    const searchMatch = !search
      || a.name?.toLowerCase().includes(search.toLowerCase())
      || a.id?.toString().toLowerCase().includes(search.toLowerCase());
    const typeMatch = typeTab === "All" || a.agencyType === typeTab;
    return searchMatch && typeMatch;
  });

  const activeCount = agencies.filter((a) => !a.inactive).length;
  const clientCount = agencies.reduce((s, a) => s + (a.clientCount || 0), 0);

  const ITEMS_PER_PAGE = 9;
  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const currentAgencies = filtered.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const changePage = (page) => {
    setCurrentPage(Math.min(Math.max(1, page), totalPages));
    setGoToPage("");
  };

  return (
    <div
      className="flex flex-col h-full"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", backgroundColor: "#f9fafb" }}
    >
      {/* Page Header */}
      <div
        className="flex items-center justify-between px-6 py-4 bg-white border-b shrink-0"
        style={{ borderColor: "#e5e7eb" }}
      >
        <div>
          <h1 className="font-bold" style={{ fontSize: 18, color: "#111827" }}>Agencies</h1>
          <p style={{ fontSize: 13, color: "#6b7280", marginTop: 2 }}>
            {filtered.length} of {agencies.length} agencies
          </p>
        </div>
        <button
          onClick={() => navigate("/admin-dashboard/add/add-agency")}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-white font-semibold transition-opacity hover:opacity-90"
          style={{ backgroundColor: "#1f7a3c", fontSize: 13 }}
        >
          <Plus size={15} strokeWidth={2.5} />
          Add Agency
        </button>
      </div>

      <div className="flex-1 overflow-auto px-6 py-5 space-y-5">
        {/* KPI Cards */}
        <div className="grid grid-cols-4 gap-4">
          <KPICard icon={<Building2 size={18} />} label="Total Agencies" value={agencies.length}
            bg="#f0fdf4" iconColor="#1f7a3c" />
          <KPICard icon={<Activity size={18} />} label="Active" value={activeCount}
            bg="#dbeafe" iconColor="#3b82f6" />
          <KPICard icon={<Users size={18} />} label="Total Clients" value={clientCount || "—"}
            bg="#faf5ff" iconColor="#9333ea" />
          <KPICard icon={<DollarSign size={18} />} label="Avg Revenue" value="—"
            bg="#fff7ed" iconColor="#ea580c" />
        </div>

        {/* Search + Type tabs */}
        <div className="flex items-center justify-between gap-4">
          <div className="relative" style={{ width: 280 }}>
            <Search
              size={15}
              style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }}
            />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
              placeholder="Search agencies…"
              className="w-full rounded-lg border focus:outline-none"
              style={{
                paddingLeft: 32, paddingRight: 12, paddingTop: 7, paddingBottom: 7,
                fontSize: 13, borderColor: "#e5e7eb", color: "#111827", backgroundColor: "#fff",
              }}
            />
          </div>

          <div className="flex items-center gap-1 rounded-lg p-1" style={{ backgroundColor: "#f3f4f6" }}>
            {TYPE_TABS.map((t) => (
              <button
                key={t}
                onClick={() => { setTypeTab(t); setCurrentPage(1); }}
                className="px-3 py-1.5 rounded-md text-xs font-semibold transition-all whitespace-nowrap"
                style={{
                  backgroundColor: typeTab === t ? "#fff" : "transparent",
                  color: typeTab === t ? "#111827" : "#6b7280",
                  boxShadow: typeTab === t ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                }}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Agency Cards Grid */}
        {currentAgencies.length === 0 ? (
          <div className="flex items-center justify-center h-48 bg-white rounded-xl border" style={{ borderColor: "#e5e7eb" }}>
            <p style={{ fontSize: 14, color: "#9ca3af" }}>No agencies found</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {currentAgencies.map((agency) => (
              <AgencyCard
                key={agency.id}
                agency={agency}
                onEdit={() => navigate(`/admin-dashboard/add/update-agency/${agency.id}`)}
                onDelete={() => handleDelete(agency.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      <div
        className="flex items-center justify-between px-6 py-3 bg-white border-t shrink-0"
        style={{ borderColor: "#e5e7eb" }}
      >
        <p style={{ fontSize: 13, color: "#6b7280" }}>
          Showing {startIndex + 1}–{Math.min(startIndex + ITEMS_PER_PAGE, filtered.length)} of {filtered.length}
        </p>

        <div className="flex items-center gap-2">
          <button
            onClick={() => changePage(currentPage - 1)}
            disabled={currentPage === 1}
            className="flex items-center justify-center w-8 h-8 rounded-lg border transition-colors hover:bg-gray-50 disabled:opacity-40"
            style={{ borderColor: "#e5e7eb" }}
          >
            <ChevronLeft size={15} style={{ color: "#374151" }} />
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
            .reduce((acc, p, idx, arr) => {
              if (idx > 0 && p - arr[idx - 1] > 1) acc.push("…");
              acc.push(p);
              return acc;
            }, [])
            .map((p, i) =>
              p === "…" ? (
                <span key={`d-${i}`} style={{ fontSize: 13, color: "#9ca3af", padding: "0 4px" }}>…</span>
              ) : (
                <button
                  key={p}
                  onClick={() => changePage(p)}
                  className="w-8 h-8 rounded-lg font-semibold text-xs transition-colors"
                  style={{
                    backgroundColor: currentPage === p ? "#1f7a3c" : "transparent",
                    color: currentPage === p ? "#fff" : "#374151",
                    border: currentPage === p ? "none" : "1px solid #e5e7eb",
                  }}
                >
                  {p}
                </button>
              )
            )}

          <button
            onClick={() => changePage(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="flex items-center justify-center w-8 h-8 rounded-lg border transition-colors hover:bg-gray-50 disabled:opacity-40"
            style={{ borderColor: "#e5e7eb" }}
          >
            <ChevronRight size={15} style={{ color: "#374151" }} />
          </button>

          <div className="flex items-center gap-1.5 ml-2">
            <span style={{ fontSize: 12, color: "#6b7280" }}>Go to</span>
            <input
              type="number"
              min={1}
              max={totalPages}
              value={goToPage}
              onChange={(e) => setGoToPage(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") changePage(Number(goToPage)); }}
              className="w-12 rounded-lg border text-center focus:outline-none"
              style={{ fontSize: 12, borderColor: "#e5e7eb", padding: "4px 6px" }}
              placeholder="…"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManageAgency;
