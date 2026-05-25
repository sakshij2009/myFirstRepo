import { useEffect, useState } from "react";
import { collection, doc, getDocs, deleteDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useNavigate } from "react-router-dom";
import {
  Search, Plus, Edit2, Trash2, ChevronLeft, ChevronRight, Building2,
  Users, Activity, DollarSign, MoreVertical, Eye, TrendingUp,
} from "lucide-react";

const TYPE_TABS = [
  { label: "All", key: "All" },
  { label: "Private", key: "Private" },
  { label: "Government", key: "Government" },
  { label: "Non Profit", key: "Non Profit" },
];

function typeBadge(type) {
  const map = {
    Private:    { bg: "#fff1f2", color: "#e11d48" },
    Government: { bg: "#f5f3ff", color: "#7c3aed" },
    "Non Profit": { bg: "#f0f9ff", color: "#0284c7" },
  };
  const s = map[type] || { bg: "#f3f4f6", color: "#374151" };
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider"
      style={{ backgroundColor: s.bg, color: s.color }}
    >
      {type || "—"}
    </span>
  );
}

function KPICard({ label, value, sub, icon: Icon, color, bg }) {
  return (
    <div className="bg-white rounded-xl p-5 border flex flex-col gap-3 transition-all" 
      style={{ borderColor: "#e5e7eb", minHeight: 120 }}>
      <div className="flex items-center justify-between">
        <div className="rounded-lg flex items-center justify-center" style={{ width: 32, height: 32, backgroundColor: bg }}>
          <Icon size={16} style={{ color }} />
        </div>
        {sub && <span style={{ fontSize: 10, fontWeight: 700, color: "#10b981", background: "#f0fdf4", px: 1.5, py: 0.5, rounded: 4 }}>{sub}</span>}
      </div>
      <div>
        <p style={{ fontSize: 24, fontWeight: 800, color: "#111827", lineHeight: 1 }}>{value}</p>
        <p style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 4 }}>{label}</p>
      </div>
    </div>
  );
}

function AgencyCard({ agency, onEdit, onDelete, onView }) {
  const clientLimit = 32; // Mock limit for progress bar
  const clientCount = agency.clientCount || 0;
  const progress = Math.min((clientCount / clientLimit) * 100, 100);

  return (
    <div className="bg-white rounded-2xl border overflow-hidden transition-all hover:shadow-lg group" style={{ borderColor: "#e5e7eb" }}>
      {/* Header */}
      <div className="p-5 flex items-start justify-between">
        <div className="min-w-0">
          <h3 className="font-extrabold truncate" style={{ fontSize: 16, color: "#111827" }}>{agency.name || "—"}</h3>
          <p className="truncate" style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}>{agency.email || "—"}</p>
          <div className="mt-3">
            {typeBadge(agency.agencyType)}
          </div>
        </div>
        <button className="text-gray-300 hover:text-gray-600 transition-colors">
          <MoreVertical size={18} />
        </button>
      </div>

      {/* Metrics */}
      <div className="px-5 space-y-5">
        {/* Clients */}
        <div>
           <div className="flex items-center justify-between mb-2">
             <div className="flex items-center gap-1.5">
               <Users size={12} className="text-gray-400" />
               <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Clients</span>
             </div>
             <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-900">{clientCount}</span>
                <span className="text-[10px] font-bold text-emerald-500 flex items-center gap-0.5">
                  <TrendingUp size={10} /> {clientCount}/{clientLimit}
                </span>
             </div>
           </div>
           <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden">
             <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${progress}%` }} />
           </div>
        </div>

        {/* Avg Service Rate */}
        <div className="flex items-center justify-between py-3 border-t" style={{ borderColor: "#f9fafb" }}>
           <div className="flex flex-col">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Avg Service Rate</span>
              <span className="text-lg font-extrabold text-gray-900 mt-0.5">${agency.avgRate || "50.99"}</span>
           </div>
           <ChevronRight size={16} className="text-gray-300" />
        </div>

        {/* Monthly Revenue */}
        <div className="rounded-xl p-3 flex items-center justify-between mb-5" style={{ backgroundColor: "#fffbeb" }}>
           <div className="flex flex-col">
              <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Monthly Revenue</span>
              <span className="text-lg font-extrabold text-amber-700 mt-0.5">${agency.revenue || "12,500"}</span>
           </div>
           <DollarSign size={20} className="text-amber-500 opacity-60" />
        </div>
      </div>

      {/* Actions */}
      <div className="p-4 bg-gray-50 flex items-center gap-2">
        <button onClick={onView} className="flex-1 h-9 rounded-lg bg-white border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-100 transition-all flex items-center justify-center gap-1.5">
          <Eye size={14} /> View
        </button>
        <button onClick={onEdit} className="grow-[2] h-9 rounded-lg bg-emerald-700 text-white text-xs font-bold hover:bg-emerald-800 transition-all shadow-sm flex items-center justify-center gap-1.5">
          <Edit2 size={14} /> Edit
        </button>
        <button onClick={onDelete} className="w-9 h-9 rounded-lg border border-red-100 bg-white text-red-500 hover:bg-red-50 transition-all flex items-center justify-center">
          <Trash2 size={14} />
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
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [agencySnap, clientSnap] = await Promise.all([
          getDocs(collection(db, "agencies")),
          getDocs(collection(db, "clients")),
        ]);

        const clientList = clientSnap.docs.map((d) => d.data());
        const agencyList = agencySnap.docs.map((d) => {
          const data = d.data();
          // Calculate client count dynamically from clients DB
          const count = clientList.filter(c => 
            c.agencyName?.trim().toLowerCase() === data.name?.trim().toLowerCase()
          ).length;
          
          return { id: d.id, ...data, clientCount: count };
        });

        agencyList.sort((a, b) => {
          const da = a.createdAt?.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt || 0).getTime();
          const db2 = b.createdAt?.toMillis ? b.createdAt.toMillis() : new Date(b.createdAt || 0).getTime();
          return db2 - da;
        });

        setAgencies(agencyList);
      } catch (e) {
        console.error("Error fetching data:", e);
      }
    };
    fetchData();
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
      || a.email?.toLowerCase().includes(search.toLowerCase());
    const typeMatch = typeTab === "All" || a.agencyType === typeTab;
    return searchMatch && typeMatch;
  });

  const activeCount = agencies.filter((a) => !a.inactive).length;
  const clientCount = agencies.reduce((s, a) => s + (Number(a.clientCount) || 0), 0);

  const ITEMS_PER_PAGE = 6;
  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const currentAgencies = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return (
    <div className="flex flex-col h-full bg-[#f8f9fa]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      {/* Header Section */}
      <div className="bg-white border-b px-8 py-5 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700">
            <Building2 size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 leading-tight">Manage Agencies</h1>
            <p className="text-sm text-gray-400 font-medium">Monitor agency relationships, client flow, and revenue impact</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-4 py-2 rounded-lg border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 transition-all">
            Make a copy
          </button>
          <button className="px-4 py-2 rounded-lg border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 transition-all">
            Share
          </button>
          <button 
            onClick={() => navigate("/admin-dashboard/add/add-agency")}
            className="flex items-center gap-2 px-6 py-2 rounded-lg bg-emerald-700 text-white text-sm font-bold shadow-lg shadow-emerald-700/20 hover:bg-emerald-800 transition-all"
          >
            <Plus size={18} strokeWidth={3} />
            Add New
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto px-8 py-6 space-y-8">
        {/* KPI Strip */}
        <div className="grid grid-cols-4 gap-4">
          <KPICard icon={Building2} label="Total Agencies" value={agencies.length} color="#10b981" bg="#ecfdf5" sub="Active" />
          <KPICard icon={Activity} label="Active Agencies" value={activeCount} color="#3b82f6" bg="#eff6ff" sub="Live" />
          <KPICard icon={Users} label="Total Clients" value={clientCount} color="#8b5cf6" bg="#f5f3ff" sub="Clients" />
          <KPICard icon={DollarSign} label="Monthly Revenue" value="$109.8k" color="#f59e0b" bg="#fffbeb" sub="Monthly" />
        </div>

        {/* Filters and Search */}
        <div className="flex items-center justify-between">
          <div className="relative w-96 group">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-emerald-600 transition-colors" />
            <input 
              type="text" 
              placeholder="Search agencies by name or email..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
              className="w-full h-11 pl-12 pr-4 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all"
            />
          </div>

          <div className="flex items-center gap-1.5 p-1.5 bg-gray-100 rounded-xl">
             {TYPE_TABS.map((tab) => (
               <button
                 key={tab.key}
                 onClick={() => { setTypeTab(tab.key); setCurrentPage(1); }}
                 className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                   typeTab === tab.key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                 }`}
               >
                 {tab.label}
                 <span className={`px-1.5 py-0.5 rounded-md text-[9px] ${
                   typeTab === tab.key ? "bg-gray-100 text-gray-600" : "bg-gray-200/50 text-gray-400"
                 }`}>
                   {tab.key === "All" ? agencies.length : agencies.filter(a => a.agencyType === tab.key).length}
                 </span>
               </button>
             ))}
          </div>
        </div>

        {/* Agencies Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {currentAgencies.map((agency) => (
            <AgencyCard 
              key={agency.id} 
              agency={agency}
              onEdit={() => navigate(`/admin-dashboard/add/update-agency/${agency.id}`)}
              onDelete={() => handleDelete(agency.id)}
              onView={() => console.log("View agency", agency.id)}
            />
          ))}
        </div>

        {/* Footer / Pagination */}
        <div className="flex items-center justify-between pt-8 pb-12 border-t border-gray-200">
           <div className="flex items-center gap-2">
             <button 
               disabled={currentPage === 1}
               onClick={() => setCurrentPage(p => p - 1)}
               className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-30 transition-all"
             >
               <ChevronLeft size={18} />
             </button>
             <div className="flex items-center gap-1">
               {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                 <button
                   key={page}
                   onClick={() => setCurrentPage(page)}
                   className={`w-10 h-10 rounded-lg text-sm font-bold transition-all ${
                     currentPage === page ? "bg-emerald-700 text-white shadow-md shadow-emerald-700/20" : "text-gray-500 hover:bg-gray-50"
                   }`}
                 >
                   {page}
                 </button>
               ))}
             </div>
             <button 
               disabled={currentPage === totalPages}
               onClick={() => setCurrentPage(p => p + 1)}
               className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-30 transition-all"
             >
               <ChevronRight size={18} />
             </button>
           </div>
           <p className="text-sm font-bold text-gray-400">
             Showing {currentAgencies.length} of {filtered.length} Results
           </p>
        </div>
      </div>
    </div>
  );
};

export default ManageAgency;
