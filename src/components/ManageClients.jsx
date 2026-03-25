import React, { useEffect, useRef, useState } from "react";
import { collection, deleteDoc, doc, getDocs, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useNavigate } from "react-router-dom";
import { Search, Edit2, Trash2, MoreVertical, Mail, ChevronDown } from "lucide-react";

const ITEMS_PER_PAGE = 10;

const getServiceTypeColor = (service) => {
  const s = (service || "").toLowerCase();
  if (s.includes("emergent") || s.includes("emergency")) return { text: "#dc2626", bg: "#fef2f2" };
  if (s.includes("respite"))    return { text: "#1f7a3c", bg: "#f0fdf4" };
  if (s.includes("supervised")) return { text: "#ea580c", bg: "#fff7ed" };
  if (s.includes("transport"))  return { text: "#7c3aed", bg: "#faf5ff" };
  return { text: "#6b7280", bg: "#f3f4f6" };
};

const getAgencyColor = (agency) => {
  const a = (agency || "").toLowerCase();
  if (a.includes("govern") || a.includes("public")) return { text: "#7c3aed", bg: "#faf5ff" };
  if (a.includes("private")) return { text: "#dc2626", bg: "#fef2f2" };
  if (a.includes("non"))     return { text: "#2563eb", bg: "#eff6ff" };
  return { text: "#6b7280", bg: "#f3f4f6" };
};

function FilterDropdown({ label, value, options, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 border border-[#E5E7EB] bg-white rounded-lg px-3 py-2 text-sm text-[#374151] hover:border-[#9CA3AF] transition-colors min-w-[110px]"
      >
        <span className="text-[#6B7280]">{label}:</span>
        <span className="font-medium flex-1">{value || "All"}</span>
        <ChevronDown size={13} className="text-[#9CA3AF]" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 bg-white border border-[#E5E7EB] rounded-lg shadow-lg z-50 min-w-[130px]">
          {options.map((o) => (
            <button
              key={o}
              onClick={() => { onChange(o === "All" ? "" : o); setOpen(false); }}
              className={`w-full text-left px-4 py-2 text-sm hover:bg-[#F9FAFB] transition-colors first:rounded-t-lg last:rounded-b-lg ${
                (value || "") === (o === "All" ? "" : o) ? "text-[#145228] font-semibold" : "text-[#374151]"
              }`}
            >
              {o}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ClientCard({ client, service, parentContact, onEdit, onDelete, onToggle }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const svcColors = getServiceTypeColor(service);
  const agencyDisplay = client.agencyName || client.agency || "—";
  const agcColors = getAgencyColor(agencyDisplay);

  useEffect(() => {
    const h = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  return (
    <div
      className="bg-white rounded-xl border transition-all hover:shadow-md hover:border-gray-300 group"
      style={{ borderColor: "#e5e7eb", boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}
    >
      {/* Card Header */}
      <div className="flex items-start justify-between p-5 border-b" style={{ borderColor: "#f3f4f6" }}>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <h3 className="font-bold" style={{ fontSize: "16px", fontWeight: 700, color: "#111827" }}>
              {client.name}
            </h3>
            <span
              className="inline-block px-2.5 py-0.5 rounded-full font-medium"
              style={{
                fontSize: "11px",
                fontWeight: 600,
                color: client.clientStatus === "Active" ? "#1a6432" : "#6b7280",
                backgroundColor: client.clientStatus === "Active" ? "#d8f3e3" : "#f3f4f6",
              }}
            >
              {client.clientStatus || "—"}
            </span>
          </div>
          <p className="font-medium" style={{ fontSize: "12px", color: "#9ca3af" }}>
            Code: <span style={{ color: "#6b7280" }}>{client.clientCode || "—"}</span>
          </p>
        </div>
        <div ref={menuRef} className="relative shrink-0">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-gray-100 rounded-lg"
          >
            <MoreVertical size={16} style={{ color: "#6b7280" }} strokeWidth={2} />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 bg-white border border-[#E5E7EB] rounded-lg shadow-lg z-50 min-w-[110px]">
              <button
                onClick={() => { onEdit(); setMenuOpen(false); }}
                className="w-full text-left px-4 py-2 text-sm text-[#374151] hover:bg-[#F9FAFB] rounded-t-lg"
              >
                Edit
              </button>
              <button
                onClick={() => { onDelete(); setMenuOpen(false); }}
                className="w-full text-left px-4 py-2 text-sm text-[#DC2626] hover:bg-[#FFF1F2] rounded-b-lg"
              >
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Card Body */}
      <div className="p-5 space-y-4">
        {/* Service Type & Agency Row */}
        <div className="flex items-center justify-between">
          <div>
            <p className="uppercase tracking-wider mb-1.5" style={{ fontSize: "10px", fontWeight: 700, color: "#9ca3af" }}>
              Service Type
            </p>
            <span
              className="inline-block px-3 py-1 rounded-lg font-medium"
              style={{ fontSize: "12px", fontWeight: 500, color: svcColors.text, backgroundColor: svcColors.bg }}
            >
              {service || "—"}
            </span>
          </div>
          <div>
            <p className="uppercase tracking-wider mb-1.5 text-right" style={{ fontSize: "10px", fontWeight: 700, color: "#9ca3af" }}>
              Agency
            </p>
            <span
              className="inline-block px-3 py-1 rounded-lg font-medium"
              style={{ fontSize: "12px", fontWeight: 500, color: agcColors.text, backgroundColor: agcColors.bg }}
            >
              {agencyDisplay}
            </span>
          </div>
        </div>

        {/* Parent Contact */}
        <div>
          <p className="uppercase tracking-wider mb-1.5" style={{ fontSize: "10px", fontWeight: 700, color: "#9ca3af" }}>
            Parent Contact
          </p>
          <div className="flex items-center gap-2">
            <Mail size={13} strokeWidth={2} className="text-gray-400 shrink-0" />
            <span style={{ fontSize: "13px", color: "#4b5563" }}>{parentContact || "—"}</span>
          </div>
        </div>

        {/* File Closure */}
        <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: "#f3f4f6" }}>
          <span className="uppercase tracking-wider font-bold" style={{ fontSize: "10px", color: "#9ca3af" }}>
            File Closure
          </span>
          <div className="flex items-center gap-2.5">
            <span style={{ fontSize: "12px", color: "#6b7280", fontWeight: 500 }}>
              {client.fileClosed ? "Yes" : "No"}
            </span>
            <button
              onClick={() => onToggle(client.id, !client.fileClosed)}
              className={`w-10 h-5 flex items-center rounded-full p-0.5 cursor-pointer transition-colors ${
                client.fileClosed ? "bg-[#145228]" : "bg-[#D1D5DB]"
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow transform transition-transform ${
                  client.fileClosed ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Card Footer – Actions */}
      <div className="flex items-center gap-2 px-5 pb-5">
        <button
          onClick={onEdit}
          className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border transition-all hover:bg-gray-50 hover:border-gray-300 font-medium"
          style={{ borderColor: "#e5e7eb", fontSize: "13px", color: "#374151" }}
        >
          <Edit2 size={13} strokeWidth={2} />
          <span>Edit</span>
        </button>
        <button
          onClick={onDelete}
          className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border transition-all hover:bg-red-50 hover:border-red-300 font-medium"
          style={{ borderColor: "#e5e7eb", fontSize: "13px", color: "#ef4444" }}
        >
          <Trash2 size={13} strokeWidth={2} />
          <span>Delete</span>
        </button>
      </div>
    </div>
  );
}

function Pagination({ current, total, onChange }) {
  if (total <= 1) return null;

  const pages = [];
  const left = Math.max(2, current - 2);
  const right = Math.min(total - 1, current + 2);

  pages.push(1);
  if (left > 2) pages.push("...");
  for (let i = left; i <= right; i++) pages.push(i);
  if (right < total - 1) pages.push("...");
  if (total > 1) pages.push(total);

  return (
    <div className="flex items-center justify-center gap-1 pt-4 pb-4">
      <button
        onClick={() => onChange(current - 1)}
        disabled={current === 1}
        className="w-8 h-8 flex items-center justify-center rounded-lg border transition-colors hover:bg-gray-50 disabled:opacity-40"
        style={{ backgroundColor: "white", borderColor: "#e5e7eb" }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>

      {pages.map((p, i) =>
        p === "..." ? (
          <span key={`e${i}`} className="w-8 h-8 flex items-center justify-center text-[#9CA3AF] text-sm">…</span>
        ) : (
          <button
            key={p}
            onClick={() => onChange(p)}
            className="w-8 h-8 flex items-center justify-center rounded-lg border transition-colors font-semibold"
            style={{
              backgroundColor: current === p ? "#1f7a3c" : "white",
              borderColor:     current === p ? "#1f7a3c" : "#e5e7eb",
              color:           current === p ? "white"   : "#6b7280",
              fontSize: "13px",
            }}
          >
            {p}
          </button>
        )
      )}

      <button
        onClick={() => onChange(current + 1)}
        disabled={current === total}
        className="w-8 h-8 flex items-center justify-center rounded-lg border transition-colors hover:bg-gray-50 disabled:opacity-40"
        style={{ backgroundColor: "white", borderColor: "#e5e7eb" }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>
    </div>
  );
}

const ManageClients = () => {
  const navigate = useNavigate();
  const [search, setSearch]           = useState("");
  const [gender, setGender]           = useState("");
  const [clientStatus, setClientStatus] = useState("");
  const [agencyType, setAgencyType]   = useState("");
  const [clients, setClients]         = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [agencyTypeOptions, setAgencyTypeOptions] = useState([]);
  const [servicesMap, setServicesMap] = useState({});
  const [parentContactMap, setParentContactMap] = useState({});

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const snap = await getDocs(collection(db, "clients"));
        const list = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        setClients(list);
        enrichFromIntake(list);
      } catch (e) { console.error(e); }
    };
    fetchClients();
  }, []);

  useEffect(() => {
    const fetchAgencyTypes = async () => {
      try {
        const snap = await getDocs(collection(db, "AgencyTypes"));
        setAgencyTypeOptions(snap.docs.map((d) => d.data().name));
      } catch (e) { console.error(e); }
    };
    fetchAgencyTypes();
  }, []);

  // Enrich each client with service type + parent contact from intake forms
  const enrichFromIntake = async (clientList) => {
    try {
      const [formsSnap, catsSnap] = await Promise.all([
        getDocs(collection(db, "InTakeForms")),
        getDocs(collection(db, "shiftCategories")),
      ]);
      const forms = formsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const catsMap = {};
      catsSnap.docs.forEach((d) => { catsMap[d.id] = d.data().name; });

      const services = {};
      const parentContacts = {};

      for (const client of clientList) {
        const key = client.id; // use doc ID as map key

        // ── Find the linked intake form ──────────────────────────────────
        // 1. Direct intakeId link
        let form = client.intakeId ? forms.find((f) => f.id === client.intakeId) : null;

        // 2. Name match in new clients object format { client1: { fullName } }
        if (!form) {
          const nameLower = client.name?.trim()?.toLowerCase();
          form = forms.find((f) => {
            const obj = f.clients || {};
            return Object.values(obj).some(
              (c) => c.fullName?.trim()?.toLowerCase() === nameLower
            );
          });
        }

        // 3. Old inTakeClients array format
        if (!form) {
          const nameLower = client.name?.trim()?.toLowerCase();
          form = forms.find((f) =>
            f.inTakeClients?.some(
              (c) => c.name?.trim()?.toLowerCase() === nameLower
            )
          );
        }

        // ── Service Type ─────────────────────────────────────────────────
        if (!form) {
          services[key] = "—";
        } else {
          const ids = form.services?.serviceType;
          if (Array.isArray(ids) && ids.length > 0) {
            services[key] = ids.map((id) => catsMap[id] || id).join(", ");
          } else {
            // old format
            const nameLower = client.name?.trim()?.toLowerCase();
            const cd = form.inTakeClients?.find(
              (c) => c.name?.trim()?.toLowerCase() === nameLower
            );
            services[key] = Array.isArray(cd?.serviceRequired)
              ? cd.serviceRequired.join(", ")
              : cd?.serviceRequired || "—";
          }
        }

        // ── Parent Contact ────────────────────────────────────────────────
        // First try the client doc itself
        const directEmail = client.parentEmail || client.email || "";
        if (directEmail) {
          parentContacts[key] = directEmail;
        } else if (form) {
          // Look in parentInfoList for a parent linked to this client name
          const nameLower = client.name?.trim()?.toLowerCase();
          const parent = (form.parentInfoList || []).find(
            (p) => p.clientName?.trim()?.toLowerCase() === nameLower
          );
          parentContacts[key] = parent?.parentEmail || parent?.email || "—";
        } else {
          parentContacts[key] = "—";
        }
      }

      setServicesMap(services);
      setParentContactMap(parentContacts);
    } catch (e) {
      console.error("Intake enrichment error:", e);
    }
  };

  const handleToggle = async (clientId, value) => {
    setClients((prev) => prev.map((c) => c.id === clientId ? { ...c, fileClosed: value } : c));
    try {
      await updateDoc(doc(db, "clients", clientId), { fileClosed: value });
    } catch (e) {
      setClients((prev) => prev.map((c) => c.id === clientId ? { ...c, fileClosed: !value } : c));
    }
  };

  const handleDelete = async (clientId) => {
    if (!window.confirm("Are you sure you want to delete this client? This action cannot be undone.")) return;
    try {
      await deleteDoc(doc(db, "clients", clientId));
      setClients((prev) => prev.filter((c) => c.id !== clientId));
    } catch (e) { alert("Failed to delete client"); }
  };

  const filtered = clients.filter((c) => {
    const gMatch = !gender || c.gender === gender;
    const sMatch = !clientStatus ||
      (clientStatus === "Active"   && c.clientStatus === "Active") ||
      (clientStatus === "Inactive" && c.clientStatus === "Inactive") ||
      (clientStatus === "Closed"   && c.fileClosed === true);
    const aMatch = !agencyType || c.agencyName === agencyType;
    const srch = !search ||
      c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.clientCode?.toString().toLowerCase().includes(search.toLowerCase()) ||
      c.agencyName?.toLowerCase().includes(search.toLowerCase());
    return gMatch && sMatch && aMatch && srch;
  });

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated  = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return (
    <div className="h-full flex flex-col" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

      {/* Page Header */}
      <div className="mb-6">
        <h1 className="font-bold mb-1" style={{ fontSize: "28px", fontWeight: 700, color: "#111827", letterSpacing: "-0.02em" }}>
          Clients
        </h1>
        <p style={{ fontSize: "14px", color: "#6b7280" }}>
          Total Client: <span className="font-semibold">{clients.length}</span>
          {" · "}
          Showing Client: <span className="font-semibold">{filtered.length}</span>
        </p>
      </div>

      {/* Search + Filters */}
      <div className="flex items-center justify-between mb-5">
        <div className="relative" style={{ width: "360px" }}>
          <Search
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
            size={15}
            strokeWidth={2}
          />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            placeholder="Search clients by name, code, or agency..."
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
            style={{ borderColor: "#e5e7eb", backgroundColor: "white", fontSize: "13px" }}
          />
        </div>

        <div className="flex items-center gap-2.5">
          <FilterDropdown
            label="Gender" value={gender}
            options={["All", "Male", "Female"]}
            onChange={(v) => { setGender(v); setCurrentPage(1); }}
          />
          <FilterDropdown
            label="Agency" value={agencyType}
            options={["All", ...agencyTypeOptions]}
            onChange={(v) => { setAgencyType(v); setCurrentPage(1); }}
          />
          <FilterDropdown
            label="Status" value={clientStatus}
            options={["All", "Active", "Inactive", "Closed"]}
            onChange={(v) => { setClientStatus(v); setCurrentPage(1); }}
          />
        </div>
      </div>

      {/* Card Grid */}
      <div className="flex-1 overflow-auto">
        {paginated.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-[#9CA3AF]">
            <p className="text-base font-medium">No clients found</p>
            <p className="text-sm mt-1">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 pb-6">
            {paginated.map((client) => (
              <ClientCard
                key={client.id}
                client={client}
                service={servicesMap[client.id]}
                parentContact={parentContactMap[client.id]}
                onEdit={() => navigate(`/admin-dashboard/add/update-client/${client.id}`)}
                onDelete={() => handleDelete(client.id)}
                onToggle={handleToggle}
              />
            ))}
          </div>
        )}
      </div>

      <Pagination
        current={currentPage}
        total={totalPages}
        onChange={(p) => { setCurrentPage(p); window.scrollTo({ top: 0, behavior: "smooth" }); }}
      />
    </div>
  );
};

export default ManageClients;
