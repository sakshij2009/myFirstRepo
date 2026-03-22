import { useEffect, useRef, useState } from "react";
import { collection, deleteDoc, doc, getDocs, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useNavigate } from "react-router-dom";
import {
  Search, Plus, Eye, Edit2, Trash2, DollarSign, ChevronLeft, ChevronRight,
} from "lucide-react";

const GENDER_TABS = ["All", "Male", "Female"];

function GenderBadge({ gender }) {
  if (!gender) return <span style={{ color: "#9ca3af", fontSize: 12 }}>—</span>;
  const isMale = gender.toLowerCase() === "male";
  return (
    <span
      className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-semibold"
      style={{
        backgroundColor: isMale ? "#dbeafe" : "#fce7f3",
        color: isMale ? "#3b82f6" : "#ec4899",
      }}
    >
      {gender}
    </span>
  );
}

function SuspendToggle({ checked, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className="relative inline-flex shrink-0 cursor-pointer rounded-full transition-colors duration-200"
      style={{
        width: 36, height: 20,
        backgroundColor: checked ? "#1f7a3c" : "#d1d5db",
      }}
    >
      <span
        className="inline-block rounded-full bg-white shadow transition-transform duration-200"
        style={{
          width: 14, height: 14,
          margin: 3,
          transform: checked ? "translateX(16px)" : "translateX(0)",
        }}
      />
    </button>
  );
}

const ManageUser = () => {
  const [search, setSearch] = useState("");
  const [genderTab, setGenderTab] = useState("All");
  const [shiftHours, setShiftHours] = useState("");
  const [shiftType, setShiftType] = useState("");
  const [users, setUsers] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [goToPage, setGoToPage] = useState("");
  const [shiftHoursOpen, setShiftHoursOpen] = useState(false);
  const [shiftTypeOpen, setShiftTypeOpen] = useState(false);
  const [shiftTypeOptions, setShiftTypeOptions] = useState([]);
  const shiftHoursRef = useRef(null);
  const shiftTypeRef = useRef(null);

  const navigate = useNavigate();

  useEffect(() => {
    const h = (e) => {
      if (shiftHoursRef.current && !shiftHoursRef.current.contains(e.target)) setShiftHoursOpen(false);
      if (shiftTypeRef.current && !shiftTypeRef.current.contains(e.target)) setShiftTypeOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const shiftHoursOption = ["All", "12:00 Hours", "9:00 Hours", "6:00 Hours"];

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "users"));
        const userList = querySnapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
          suspended: d.data().isSuspended ?? false,
        }));
        userList.sort((a, b) => {
          const da = a.createdAt ? new Date(a.createdAt.seconds ? a.createdAt.seconds * 1000 : a.createdAt) : 0;
          const db2 = b.createdAt ? new Date(b.createdAt.seconds ? b.createdAt.seconds * 1000 : b.createdAt) : 0;
          return db2 - da;
        });
        setUsers(userList);
      } catch (e) {
        console.error("Error fetching users:", e);
      }
    };
    fetchUsers();
  }, []);

  useEffect(() => {
    const fetchShiftTypes = async () => {
      try {
        const qs = await getDocs(collection(db, "shiftTypes"));
        setShiftTypeOptions(qs.docs.map((d) => d.data().name));
      } catch (e) {
        console.error("Error fetching shift types:", e);
      }
    };
    fetchShiftTypes();
  }, []);

  const handleDeleteUser = async (userId) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;
    try {
      await deleteDoc(doc(db, "users", userId));
      setUsers((prev) => prev.filter((u) => u.id !== userId));
    } catch (e) {
      console.error("Error deleting user:", e);
    }
  };

  const handleSuspendToggle = async (userId, currentStatus) => {
    try {
      const newStatus = !currentStatus;
      await updateDoc(doc(db, "users", userId), { isSuspended: newStatus });
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, isSuspended: newStatus } : u));
    } catch (e) {
      console.error("Error updating suspension:", e);
    }
  };

  const filteredUsers = users.filter((user) => {
    const genderMatch = genderTab === "All" || user.gender === genderTab;
    const hoursMatch = !shiftHours || shiftHours === "All" || user.shiftHours === shiftHours;
    const typeMatch = !shiftType || shiftType === "All" || user.shiftType === shiftType;
    const searchMatch = !search
      || user.name?.toLowerCase().includes(search.toLowerCase())
      || user.userId?.toString().toLowerCase().includes(search.toLowerCase());
    return genderMatch && hoursMatch && typeMatch && searchMatch;
  });

  const ITEMS_PER_PAGE = 10;
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / ITEMS_PER_PAGE));
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const currentUsers = filteredUsers.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const changePage = (page) => {
    const p = Math.min(Math.max(1, page), totalPages);
    setCurrentPage(p);
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
          <h1 className="font-bold" style={{ fontSize: 18, color: "#111827" }}>Staff</h1>
          <p style={{ fontSize: 13, color: "#6b7280", marginTop: 2 }}>
            {filteredUsers.length} of {users.length} staff members
          </p>
        </div>
        <button
          onClick={() => navigate("/admin-dashboard/add/add-user")}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-white font-semibold transition-opacity hover:opacity-90"
          style={{ backgroundColor: "#1f7a3c", fontSize: 13 }}
        >
          <Plus size={15} strokeWidth={2.5} />
          Add Staff
        </button>
      </div>

      {/* Filters */}
      <div
        className="flex items-center justify-between gap-4 px-6 py-3 bg-white border-b shrink-0"
        style={{ borderColor: "#e5e7eb" }}
      >
        {/* Search */}
        <div className="relative" style={{ width: 280 }}>
          <Search
            size={15}
            style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }}
          />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            placeholder="Search by name or ID…"
            className="w-full rounded-lg border focus:outline-none"
            style={{
              paddingLeft: 32, paddingRight: 12, paddingTop: 7, paddingBottom: 7,
              fontSize: 13, borderColor: "#e5e7eb", color: "#111827",
            }}
          />
        </div>

        {/* Gender tabs */}
        <div className="flex items-center gap-1 rounded-lg p-1" style={{ backgroundColor: "#f3f4f6" }}>
          {GENDER_TABS.map((t) => (
            <button
              key={t}
              onClick={() => { setGenderTab(t); setCurrentPage(1); }}
              className="px-3 py-1.5 rounded-md text-xs font-semibold transition-all"
              style={{
                backgroundColor: genderTab === t ? "#fff" : "transparent",
                color: genderTab === t ? "#111827" : "#6b7280",
                boxShadow: genderTab === t ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
              }}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Shift Hours filter */}
        <div className="relative" ref={shiftHoursRef}>
          <button
            onClick={() => { setShiftHoursOpen((o) => !o); setShiftTypeOpen(false); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium"
            style={{ borderColor: "#e5e7eb", color: "#374151", backgroundColor: "#fff" }}
          >
            Shift Hours: <span style={{ color: "#1f7a3c" }}>{shiftHours || "All"}</span>
            <ChevronLeft size={13} style={{ transform: "rotate(-90deg)", color: "#9ca3af" }} />
          </button>
          {shiftHoursOpen && (
            <div className="absolute top-9 left-0 bg-white rounded-lg shadow-lg border z-50 min-w-[140px]"
              style={{ borderColor: "#e5e7eb" }}>
              {shiftHoursOption.map((o) => (
                <button key={o} onClick={() => { setShiftHours(o === "All" ? "" : o); setShiftHoursOpen(false); setCurrentPage(1); }}
                  className="w-full text-left px-4 py-2 text-xs hover:bg-gray-50"
                  style={{ color: "#374151" }}>
                  {o}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Shift Type filter */}
        <div className="relative" ref={shiftTypeRef}>
          <button
            onClick={() => { setShiftTypeOpen((o) => !o); setShiftHoursOpen(false); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium"
            style={{ borderColor: "#e5e7eb", color: "#374151", backgroundColor: "#fff" }}
          >
            Shift Type: <span style={{ color: "#1f7a3c" }}>{shiftType || "All"}</span>
            <ChevronLeft size={13} style={{ transform: "rotate(-90deg)", color: "#9ca3af" }} />
          </button>
          {shiftTypeOpen && (
            <div className="absolute top-9 right-0 bg-white rounded-lg shadow-lg border z-50 min-w-[160px]"
              style={{ borderColor: "#e5e7eb" }}>
              {["All", ...shiftTypeOptions].map((o) => (
                <button key={o} onClick={() => { setShiftType(o === "All" ? "" : o); setShiftTypeOpen(false); setCurrentPage(1); }}
                  className="w-full text-left px-4 py-2 text-xs hover:bg-gray-50"
                  style={{ color: "#374151" }}>
                  {o}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto px-6 py-4">
        <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: "#e5e7eb" }}>
          <table className="w-full border-collapse">
            <thead>
              <tr style={{ backgroundColor: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                {["Employee Name", "Staff ID", "Username", "Gender", "Phone No", "Salary/Hour", "Suspension", "Actions"].map((h) => (
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
              {currentUsers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-16" style={{ color: "#9ca3af", fontSize: 14 }}>
                    No staff members found
                  </td>
                </tr>
              ) : (
                currentUsers.map((user) => (
                  <tr
                    key={user.id}
                    className="transition-colors hover:bg-gray-50"
                    style={{ borderBottom: "1px solid #f3f4f6" }}
                  >
                    {/* Name */}
                    <td className="px-4 py-3">
                      <button
                        onClick={() => navigate(`/admin-dashboard/add/update-user/${user.userId}`)}
                        className="font-semibold text-left transition-colors hover:underline"
                        style={{ fontSize: 13, color: "#1f7a3c" }}
                      >
                        {user.name || "—"}
                      </button>
                    </td>

                    {/* Staff ID */}
                    <td className="px-4 py-3">
                      <span style={{ fontSize: 12, color: "#6b7280", fontFamily: "monospace" }}>
                        {user.userId || "—"}
                      </span>
                    </td>

                    {/* Username */}
                    <td className="px-4 py-3" style={{ fontSize: 13, color: "#374151" }}>
                      {user.username || "—"}
                    </td>

                    {/* Gender */}
                    <td className="px-4 py-3">
                      <GenderBadge gender={user.gender} />
                    </td>

                    {/* Phone */}
                    <td className="px-4 py-3" style={{ fontSize: 13, color: "#374151" }}>
                      {user.phone || "—"}
                    </td>

                    {/* Salary/Hour */}
                    <td className="px-4 py-3">
                      {user.salaryPerHour != null ? (
                        <span className="flex items-center gap-0.5" style={{ fontSize: 13, color: "#111827", fontWeight: 600 }}>
                          <DollarSign size={13} style={{ color: "#6b7280" }} />
                          {user.salaryPerHour}
                        </span>
                      ) : (
                        <span style={{ color: "#9ca3af", fontSize: 13 }}>—</span>
                      )}
                    </td>

                    {/* Suspension */}
                    <td className="px-4 py-3">
                      <SuspendToggle
                        checked={!!user.isSuspended}
                        onChange={() => handleSuspendToggle(user.id, user.isSuspended || false)}
                      />
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => navigate(`/admin-dashboard/add/update-user/${user.userId}`)}
                          className="flex items-center justify-center rounded-lg border transition-colors hover:bg-gray-100"
                          style={{ width: 30, height: 30, borderColor: "#e5e7eb" }}
                          title="View"
                        >
                          <Eye size={14} style={{ color: "#6b7280" }} />
                        </button>
                        <button
                          onClick={() => navigate(`/admin-dashboard/add/update-user/${user.userId}`)}
                          className="flex items-center justify-center rounded-lg border transition-colors hover:bg-gray-100"
                          style={{ width: 30, height: 30, borderColor: "#e5e7eb" }}
                          title="Edit"
                        >
                          <Edit2 size={14} style={{ color: "#6b7280" }} />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.id)}
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
          Showing {startIndex + 1}–{Math.min(startIndex + ITEMS_PER_PAGE, filteredUsers.length)} of {filteredUsers.length}
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
                <span key={`dots-${i}`} style={{ fontSize: 13, color: "#9ca3af", padding: "0 4px" }}>…</span>
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

          {/* Go to page */}
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

export default ManageUser;
