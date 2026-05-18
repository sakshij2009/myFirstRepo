import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { 
  Search, 
  Plus, 
  MapPin, 
  Users, 
  Shield, 
  ArrowRight, 
  Home, 
  Eye, 
  Edit2, 
  Trash2, 
  MoreHorizontal 
} from "lucide-react";
import { db } from "../firebase";
import { collection, query, where, getDocs, deleteDoc, doc } from "firebase/firestore";

const PDDHouses = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [houses, setHouses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHouses = async () => {
      try {
        const q = query(collection(db, "houses"), where("programType", "==", "pdd"));
        const querySnapshot = await getDocs(q);
        const houseList = [];
        querySnapshot.forEach((doc) => {
          houseList.push({ id: doc.id, ...doc.data() });
        });
        setHouses(houseList);
      } catch (error) {
        console.error("Error fetching houses:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchHouses();
  }, []);

  const handleDelete = async (houseId, houseName) => {
    if (window.confirm(`Are you sure you want to delete ${houseName}? This action cannot be undone.`)) {
      try {
        await deleteDoc(doc(db, "houses", houseId));
        setHouses(houses.filter(h => h.id !== houseId));
        toast.success("House deleted successfully", {
          description: `${houseName} has been removed from the system.`
        });
      } catch (error) {
        console.error("Error deleting house:", error);
        toast.error("Failed to delete house", {
          description: "An error occurred while trying to delete the house. Please try again."
        });
      }
    }
  };

  const filteredHouses = houses.filter(h => 
    h.houseName?.toLowerCase().includes(search.toLowerCase()) ||
    h.address?.toLowerCase().includes(search.toLowerCase())
  );

  const getComplianceColor = (pct) => {
    if (pct >= 95) return "bg-emerald-500";
    if (pct >= 90) return "bg-amber-500";
    return "bg-red-500";
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#f8fafc]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div className="px-8 py-10">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 mb-8 text-[14px] font-semibold">
          <span 
            className="text-[#145228] cursor-pointer hover:underline" 
            onClick={() => navigate("/admin-dashboard/services")}
          >
            Programs
          </span>
          <span className="text-[#94a3b8] font-normal">/</span>
          <span className="text-[#0f172a]">Person with Developmental Disability (PDD)</span>
        </div>

        {/* Title Section */}
        <div className="mb-10 flex items-end justify-between">
          <div>
            <h1 
              className="font-bold text-[#0f172a] mb-2" 
              style={{ fontSize: "32px", letterSpacing: "-0.02em" }}
            >
              PDD – Houses
            </h1>
            <p 
              className="text-[#64748b]" 
              style={{ fontSize: "17px", fontWeight: 500 }}
            >
              Manage and monitor houses under Person with Developmental Disability (PDD) Program
            </p>
          </div>

          <button
            onClick={() => navigate("/admin-dashboard/add/add-house?program=pdd")}
            className="flex items-center gap-2 px-5 py-3 rounded-xl text-white font-bold transition-all hover:opacity-90 shadow-sm shrink-0"
            style={{ 
              backgroundColor: "#1f7a3c", 
              fontSize: "14px",
              boxShadow: "0 1px 2px rgba(31,122,60,0.2)"
            }}
          >
            <Plus size={18} strokeWidth={2.5} />
            Add New House
          </button>
        </div>

        {/* Action Bar: Search */}
        <div className="flex items-center gap-4 mb-8">
          <div className="relative max-w-[400px] flex-1">
            <Search
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
              size={18}
              strokeWidth={2}
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by house name or address..."
              className="w-full pl-11 pr-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all shadow-sm"
              style={{ borderColor: "#e5e7eb", backgroundColor: "white", fontSize: "14px" }}
            />
          </div>
        </div>

        {/* Content area: Table View */}
        <div className="bg-white rounded-[24px] border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-50">
                  <th className="px-6 py-5 text-[11px] font-bold text-gray-400 uppercase tracking-widest">House Name</th>
                  <th className="px-6 py-5 text-[11px] font-bold text-gray-400 uppercase tracking-widest">Address</th>
                  <th className="px-6 py-5 text-[11px] font-bold text-gray-400 uppercase tracking-widest">Capacity</th>
                  <th className="px-6 py-5 text-[11px] font-bold text-gray-400 uppercase tracking-widest">Active Clients</th>
                  <th className="px-6 py-5 text-[11px] font-bold text-gray-400 uppercase tracking-widest">Staff Count</th>
                  <th className="px-6 py-5 text-[11px] font-bold text-gray-400 uppercase tracking-widest">Compliance</th>
                  <th className="px-6 py-5 text-[11px] font-bold text-gray-400 uppercase tracking-widest">Last Inspection</th>
                  <th className="px-6 py-5 text-[11px] font-bold text-gray-400 uppercase tracking-widest">Alerts</th>
                  <th className="px-6 py-5 text-[11px] font-bold text-gray-400 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr>
                    <td colSpan="9" className="px-6 py-20 text-center">
                      <div className="flex justify-center">
                        <div className="w-8 h-8 border-3 border-[#145228]/10 border-t-[#145228] rounded-full animate-spin" />
                      </div>
                    </td>
                  </tr>
                ) : filteredHouses.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="px-6 py-20 text-center text-gray-400 font-medium">
                      {search ? "No houses match your search criteria." : "No houses added yet."}
                    </td>
                  </tr>
                ) : (
                  filteredHouses.map((house) => (
                    <tr key={house.id} className="hover:bg-gray-50/50 transition-colors group">
                      {/* House Name */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-400 group-hover:bg-white group-hover:border-emerald-100 group-hover:text-emerald-500 transition-all">
                            <Home size={18} />
                          </div>
                          <span className="font-bold text-[#0f172a] text-[14px]">{house.houseName}</span>
                        </div>
                      </td>

                      {/* Address */}
                      <td className="px-6 py-4">
                        <div className="flex items-start gap-2 max-w-[200px]">
                          <MapPin size={14} className="text-gray-300 mt-1 shrink-0" />
                          <span className="text-[13px] text-gray-500 font-medium leading-relaxed">
                            {house.address || '—'}
                          </span>
                        </div>
                      </td>

                      {/* Capacity */}
                      <td className="px-6 py-4">
                        <span className="text-[14px] font-bold text-[#0f172a]">{house.maxCapacity || 0}</span>
                      </td>

                      {/* Active Clients */}
                      <td className="px-6 py-4">
                        <div className="inline-flex items-center justify-center min-w-[32px] h-8 px-2 rounded-lg bg-emerald-50 text-emerald-600 font-bold text-[13px]">
                          {house.activeClients || 0}
                        </div>
                      </td>

                      {/* Staff Count */}
                      <td className="px-6 py-4">
                        <span className="text-[14px] font-bold text-[#0f172a]">{house.staffCount || 0}</span>
                      </td>

                      {/* Compliance */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3 min-w-[120px]">
                          <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${getComplianceColor(house.compliancePct || 100)}`}
                              style={{ width: `${house.compliancePct || 100}%` }}
                            />
                          </div>
                          <span className="text-[13px] font-bold text-[#0f172a]">{house.compliancePct || 100}%</span>
                        </div>
                      </td>

                      {/* Last Inspection */}
                      <td className="px-6 py-4">
                        <span className="text-[13px] text-gray-400 font-medium">
                          {house.lastInspectionDate || '—'}
                        </span>
                      </td>

                      {/* Alerts */}
                      <td className="px-6 py-4">
                        {house.alertsCount > 0 ? (
                          <div className="w-6 h-6 rounded-full bg-red-50 text-red-500 flex items-center justify-center text-[11px] font-bold border border-red-100">
                            {house.alertsCount}
                          </div>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button className="p-2 rounded-lg hover:bg-blue-50 text-blue-500 transition-colors border border-transparent hover:border-blue-100 shadow-sm hover:shadow-none bg-white">
                            <Eye size={16} />
                          </button>
                          <button className="p-2 rounded-lg hover:bg-emerald-50 text-emerald-500 transition-colors border border-transparent hover:border-emerald-100 shadow-sm hover:shadow-none bg-white">
                            <Edit2 size={16} />
                          </button>
                          <button 
                            onClick={() => handleDelete(house.id, house.houseName)}
                            className="p-2 rounded-lg hover:bg-red-50 text-red-500 transition-colors border border-transparent hover:border-red-100 shadow-sm hover:shadow-none bg-white"
                          >
                            <Trash2 size={16} />
                          </button>
                          <button className="p-2 rounded-lg hover:bg-gray-50 text-gray-400 transition-colors border border-transparent hover:border-gray-100 shadow-sm hover:shadow-none bg-white">
                            <MoreHorizontal size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PDDHouses;
