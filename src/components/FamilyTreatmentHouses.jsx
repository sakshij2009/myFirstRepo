import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Search,
  Plus,
  MapPin,
  Home,
  Eye,
  Edit2,
  Trash2,
  MoreHorizontal,
} from "lucide-react";
import { db } from "../firebase";
import { collection, query, where, getDocs, deleteDoc, doc } from "firebase/firestore";

const PROGRAM_TYPE  = "family-treatment";
const PROGRAM_LABEL = "Family Treatment Program";
const PROGRAM_TITLE = "Family Treatment Program – Houses";
const PROGRAM_SUB   = "Manage houses under Family Treatment Program";
const ADD_PARAM     = "family-treatment";

const getComplianceColor = (pct) => {
  if (pct >= 95) return "#16a34a";
  if (pct >= 90) return "#f59e0b";
  return "#dc2626";
};

const DEMO_HOUSES = [
  {
    id: "__demo_1",
    houseName: "Maple Grove House",
    address: "123 Maple St, Calgary AB",
    maxCapacity: 6,
    activeClients: 5,
    staffCount: 4,
    compliancePct: 96,
    lastInspectionDate: "2026-04-10",
    alertsCount: 1,
    programType: PROGRAM_TYPE,
  },
  {
    id: "__demo_2",
    houseName: "Sunrise Haven",
    address: "456 Oak Ave, Calgary AB",
    maxCapacity: 4,
    activeClients: 4,
    staffCount: 3,
    compliancePct: 98,
    lastInspectionDate: "2026-04-12",
    alertsCount: 0,
    programType: PROGRAM_TYPE,
  },
];

const FamilyTreatmentHouses = () => {
  const navigate = useNavigate();
  const [search, setSearch]   = useState("");
  const [houses, setHouses]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const q = query(collection(db, "houses"), where("programType", "==", PROGRAM_TYPE));
        const snap = await getDocs(q);
        const houseList = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setHouses(houseList.length > 0 ? houseList : DEMO_HOUSES);
      } catch (err) {
        console.error("Error fetching houses:", err);
        setHouses(DEMO_HOUSES);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleDelete = async (houseId, houseName) => {
    if (houseId.startsWith("__demo_")) {
      setHouses((prev) => prev.filter((h) => h.id !== houseId));
      toast.success("Demo house removed");
      return;
    }
    if (!window.confirm(`Are you sure you want to delete ${houseName}? This action cannot be undone.`)) return;
    try {
      await deleteDoc(doc(db, "houses", houseId));
      setHouses((prev) => prev.filter((h) => h.id !== houseId));
      toast.success("House deleted successfully", { description: `${houseName} has been removed.` });
    } catch (err) {
      console.error("Error deleting house:", err);
      toast.error("Failed to delete house", { description: "Please try again." });
    }
  };

  const filtered = houses.filter(
    (h) =>
      h.houseName?.toLowerCase().includes(search.toLowerCase()) ||
      h.address?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ fontFamily: "Roboto, sans-serif" }}>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-3" style={{ fontSize: 13, color: "#6b7280" }}>
        <button
          onClick={() => navigate("/admin-dashboard/services")}
          className="font-medium transition-colors hover:underline"
          style={{ color: "#1f7a3c" }}
        >
          Programs
        </button>
        <span>/</span>
        <span className="font-semibold" style={{ color: "#111827" }}>{PROGRAM_LABEL}</span>
      </div>

      {/* Title */}
      <h1 className="font-bold mb-1" style={{ fontSize: 28, letterSpacing: "-0.02em", color: "#111827" }}>
        {PROGRAM_TITLE}
      </h1>
      <p className="mb-5" style={{ fontSize: 14, color: "#6b7280" }}>{PROGRAM_SUB}</p>

      {/* Search + Add */}
      <div className="flex items-center justify-between mb-4">
        <div className="relative">
          <Search
            size={14}
            strokeWidth={2}
            className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: "#9ca3af" }}
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search houses..."
            className="pl-9 pr-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            style={{ width: 360, borderColor: "#e5e7eb", fontSize: 13 }}
          />
        </div>
        <button
          onClick={() => navigate(`/admin-dashboard/add/add-house?program=${ADD_PARAM}`)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all hover:opacity-90"
          style={{
            fontSize: 13,
            fontWeight: 600,
            backgroundColor: "#1f7a3c",
            color: "#ffffff",
            boxShadow: "0 1px 2px rgba(31,122,60,0.2)",
          }}
        >
          <Plus size={16} strokeWidth={2.5} />
          Add New House
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: "#e5e7eb" }}>
        <table className="w-full">
          <thead
            className="sticky top-0 bg-gray-50/80 backdrop-blur-sm"
            style={{ borderBottom: "1px solid #e5e7eb" }}
          >
            <tr>
              {["House Name", "Address", "Capacity", "Active Clients", "Staff Count", "Compliance", "Last Inspection", "Alerts"].map((h) => (
                <th
                  key={h}
                  className="text-left px-4 py-3.5"
                  style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em" }}
                >
                  {h}
                </th>
              ))}
              <th
                className="text-right px-4 py-3.5"
                style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", width: 120 }}
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} className="px-4 py-16 text-center">
                  <div className="flex justify-center">
                    <div className="w-7 h-7 border-2 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
                  </div>
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-16 text-center" style={{ fontSize: 13, color: "#9ca3af" }}>
                  {search ? "No houses match your search." : "No houses added yet."}
                </td>
              </tr>
            ) : (
              filtered.map((house) => {
                const pct   = house.compliancePct ?? 100;
                const color = getComplianceColor(pct);
                return (
                  <tr
                    key={house.id}
                    className="border-t transition-colors hover:bg-gray-50/80 group"
                    style={{ borderColor: "#f3f4f6" }}
                  >
                    {/* House Name */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <Home size={16} style={{ color: "#6b7280" }} strokeWidth={1.7} />
                        <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{house.houseName}</span>
                      </div>
                    </td>

                    {/* Address */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <MapPin size={13} style={{ color: "#9ca3af" }} strokeWidth={2} />
                        <span style={{ fontSize: 13, color: "#4b5563" }}>{house.address || "—"}</span>
                      </div>
                    </td>

                    {/* Capacity */}
                    <td className="px-4 py-3.5">
                      <span style={{ fontSize: 13, color: "#4b5563", fontWeight: 500 }}>{house.maxCapacity || 0}</span>
                    </td>

                    {/* Active Clients */}
                    <td className="px-4 py-3.5">
                      <span
                        className="inline-flex items-center px-2.5 py-1 rounded-md font-medium"
                        style={{ fontSize: 12, color: "#1f7a3c", backgroundColor: "#f0fdf4" }}
                      >
                        {house.activeClients || 0}
                      </span>
                    </td>

                    {/* Staff Count */}
                    <td className="px-4 py-3.5">
                      <span style={{ fontSize: 13, color: "#4b5563", fontWeight: 500 }}>{house.staffCount || 0}</span>
                    </td>

                    {/* Compliance */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-1.5" style={{ maxWidth: 60 }}>
                          <div
                            className="h-1.5 rounded-full transition-all"
                            style={{ width: `${pct}%`, backgroundColor: color }}
                          />
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 600, color: "#4b5563" }}>{pct}%</span>
                      </div>
                    </td>

                    {/* Last Inspection */}
                    <td className="px-4 py-3.5">
                      <span style={{ fontSize: 13, color: "#6b7280" }}>{house.lastInspectionDate || "—"}</span>
                    </td>

                    {/* Alerts */}
                    <td className="px-4 py-3.5">
                      {(house.alertsCount || 0) > 0 ? (
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded-md font-semibold"
                          style={{ fontSize: 11, color: "#dc2626", backgroundColor: "#fef2f2" }}
                        >
                          {house.alertsCount}
                        </span>
                      ) : (
                        <span style={{ fontSize: 12, color: "#9ca3af" }}>—</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => navigate(`/admin-dashboard/house/${house.id}`, {
                            state: { house, programLabel: PROGRAM_LABEL, programPath: `/admin-dashboard/family-treatment-houses` }
                          })}
                          className="flex items-center justify-center rounded-lg transition-all hover:brightness-95"
                          style={{ width: 28, height: 28, background: "#eff6ff", color: "#2563eb", border: "1px solid #bfdbfe" }}
                          title="View House"
                        >
                          <Eye size={14} strokeWidth={2} />
                        </button>
                        <button
                          onClick={() => navigate(`/admin-dashboard/add/update-house/${house.id}`)}
                          className="flex items-center justify-center rounded-lg transition-all hover:brightness-95"
                          style={{ width: 28, height: 28, background: "#f0fdf4", color: "#16a34a", border: "1px solid #bbf7d0" }}
                          title="Edit House"
                        >
                          <Edit2 size={14} strokeWidth={2} />
                        </button>
                        <button
                          onClick={() => handleDelete(house.id, house.houseName)}
                          className="flex items-center justify-center rounded-lg transition-all hover:brightness-95"
                          style={{ width: 28, height: 28, background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca" }}
                          title="Delete House"
                        >
                          <Trash2 size={14} strokeWidth={2} />
                        </button>
                        <button
                          className="flex items-center justify-center rounded-lg transition-all hover:brightness-95"
                          style={{ width: 28, height: 28, background: "#f3f4f6", color: "#374151", border: "1px solid #e5e7eb" }}
                          title="More Options"
                        >
                          <MoreHorizontal size={14} strokeWidth={2} />
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
    </div>
  );
};

export default FamilyTreatmentHouses;
