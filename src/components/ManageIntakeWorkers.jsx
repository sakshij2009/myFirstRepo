import { useEffect, useState } from "react";
import { collection, deleteDoc, doc, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { useNavigate } from "react-router-dom";
import {
  Search, Plus, Eye, Edit2, Trash2, ChevronLeft, ChevronRight, Mail,
} from "lucide-react";

const ROLE_TABS = ["All", "Parent", "Intake Worker"];

function roleBadge(role) {
  const isWorker = role?.toLowerCase().includes("intake");
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border"
      style={{
        backgroundColor: isWorker ? "#f0fdf4" : "#eff6ff",
        color: isWorker ? "#16a34a" : "#3b82f6",
        borderColor: isWorker ? "#bbf7d0" : "#bfdbfe",
      }}
    >
      {role || "—"}
    </span>
  );
}

const ManageIntakeWorkers = () => {
  const [search, setSearch] = useState("");
  const [intakeWorkers, setIntakeWorkers] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [roleTab, setRoleTab] = useState("All");
  const [goToPage, setGoToPage] = useState("");

  const navigate = useNavigate();

  useEffect(() => {
    const fetchIntakeWorkers = async () => {
      try {
        const snap = await getDocs(collection(db, "intakeUsers"));
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setIntakeWorkers(list);
      } catch (e) {
        console.error("Error fetching intake workers:", e);
      }
    };
    fetchIntakeWorkers();
  }, []);

  const handleDeleteIntakeWorker = async (worker) => {
    if (!window.confirm(`Are you sure you want to delete "${worker.name}"?`)) return;
    try {
      await deleteDoc(doc(db, "intakeUsers", worker.id));
      setIntakeWorkers((prev) => prev.filter((w) => w.id !== worker.id));
    } catch (e) {
      console.error("Error deleting intake worker:", e);
    }
  };

  const filtered = intakeWorkers.filter((w) => {
    const searchMatch = !search
      || w.name?.toLowerCase().includes(search.toLowerCase())
      || w.email?.toLowerCase().includes(search.toLowerCase());
    const roleMatch = roleTab === "All" || w.role?.toLowerCase() === roleTab.toLowerCase();
    return searchMatch && roleMatch;
  });

  const ITEMS_PER_PAGE = 10;
  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const currentWorkers = filtered.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const changePage = (page) => {
    setCurrentPage(Math.min(Math.max(1, page), totalPages));
    setGoToPage("");
  };

  return (
    <div
      className="flex flex-col h-full"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", backgroundColor: "#f9fafb" }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-6 py-4 bg-white border-b shrink-0"
        style={{ borderColor: "#e5e7eb" }}
      >
        <div>
          <h1 className="font-bold" style={{ fontSize: 18, color: "#111827" }}>Intake Workers</h1>
          <p style={{ fontSize: 13, color: "#6b7280", marginTop: 2 }}>
            {filtered.length} of {intakeWorkers.length} workers
          </p>
        </div>
        <button
          onClick={() => navigate("/admin-dashboard/add/add-intake-worker")}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-white font-semibold transition-opacity hover:opacity-90"
          style={{ backgroundColor: "#1f7a3c", fontSize: 13 }}
        >
          <Plus size={15} strokeWidth={2.5} />
          Add Intake Worker
        </button>
      </div>

      {/* Filters */}
      <div
        className="flex items-center justify-between gap-4 px-6 py-3 bg-white border-b shrink-0"
        style={{ borderColor: "#e5e7eb" }}
      >
        <div className="relative" style={{ width: 280 }}>
          <Search
            size={15}
            style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }}
          />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            placeholder="Search by name or email…"
            className="w-full rounded-lg border focus:outline-none"
            style={{
              paddingLeft: 32, paddingRight: 12, paddingTop: 7, paddingBottom: 7,
              fontSize: 13, borderColor: "#e5e7eb", color: "#111827",
            }}
          />
        </div>

        <div className="flex items-center gap-1 rounded-lg p-1" style={{ backgroundColor: "#f3f4f6" }}>
          {ROLE_TABS.map((t) => (
            <button
              key={t}
              onClick={() => { setRoleTab(t); setCurrentPage(1); }}
              className="px-3 py-1.5 rounded-md text-xs font-semibold transition-all whitespace-nowrap"
              style={{
                backgroundColor: roleTab === t ? "#fff" : "transparent",
                color: roleTab === t ? "#111827" : "#6b7280",
                boxShadow: roleTab === t ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto px-6 py-4">
        <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: "#e5e7eb" }}>
          <table className="w-full border-collapse">
            <thead>
              <tr style={{ backgroundColor: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                {["Name", "Email", "Phone", "Role", "Invoice Email", "Agency", "Actions"].map((h) => (
                  <th
                    key={h}
                    className="text-left px-4 py-3 font-semibold whitespace-nowrap"
                    style={{ fontSize: 12, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em" }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {currentWorkers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-16" style={{ color: "#9ca3af", fontSize: 14 }}>
                    No intake workers found
                  </td>
                </tr>
              ) : (
                currentWorkers.map((worker) => (
                  <tr
                    key={worker.id}
                    className="transition-colors hover:bg-gray-50"
                    style={{ borderBottom: "1px solid #f3f4f6" }}
                  >
                    <td className="px-4 py-3">
                      <span className="font-semibold" style={{ fontSize: 13, color: "#111827" }}>
                        {worker.name || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1.5" style={{ fontSize: 13, color: "#6b7280" }}>
                        <Mail size={13} />
                        {worker.email || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3" style={{ fontSize: 13, color: "#374151" }}>
                      {worker.phone || "—"}
                    </td>
                    <td className="px-4 py-3">
                      {roleBadge(worker.role)}
                    </td>
                    <td className="px-4 py-3" style={{ fontSize: 13, color: "#6b7280" }}>
                      {worker.invoiceEmail || "—"}
                    </td>
                    <td className="px-4 py-3" style={{ fontSize: 13, color: "#374151" }}>
                      {worker.agency || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => navigate(`/admin-dashboard/add/update-intakeworker/${worker.email}`)}
                          className="flex items-center justify-center rounded-lg border transition-colors hover:bg-gray-100"
                          style={{ width: 30, height: 30, borderColor: "#e5e7eb" }}
                          title="View"
                        >
                          <Eye size={14} style={{ color: "#6b7280" }} />
                        </button>
                        <button
                          onClick={() => navigate(`/admin-dashboard/add/update-intakeworker/${worker.email}`)}
                          className="flex items-center justify-center rounded-lg border transition-colors hover:bg-gray-100"
                          style={{ width: 30, height: 30, borderColor: "#e5e7eb" }}
                          title="Edit"
                        >
                          <Edit2 size={14} style={{ color: "#6b7280" }} />
                        </button>
                        <button
                          onClick={() => handleDeleteIntakeWorker(worker)}
                          className="flex items-center justify-center rounded-lg border transition-colors hover:bg-red-50"
                          style={{ width: 30, height: 30, borderColor: "#e5e7eb" }}
                          title="Delete"
                        >
                          <Trash2 size={14} style={{ color: "#ef4444" }} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
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
              type="number" min={1} max={totalPages} value={goToPage}
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

export default ManageIntakeWorkers;
