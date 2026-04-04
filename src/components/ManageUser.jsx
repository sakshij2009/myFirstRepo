import { useEffect, useRef, useState } from "react";
import { collection, deleteDoc, doc, getDocs, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useNavigate } from "react-router-dom";
import {
  Search, Plus, Edit2, Trash2, DollarSign, ChevronLeft, ChevronRight, CreditCard,
  Share2, X, Download, Printer,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

const GENDER_TABS = ["All", "Male", "Female"];

/* ── ID Card Modal ─────────────────────────────────────────── */
function IDCardModal({ user, onClose }) {
  const [side, setSide] = useState("front");

  const initials = user.name
    ? user.name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
    : "??";

  const qrValue = `Family Forever Inc.\nEmployee: ${user.name}\nID: ${user.userId}\nEmail: ${user.email || ""}`;

  const handleDownloadPDF = () => {
    const card = document.getElementById("id-card-printable");
    if (!card) return;
    import("html2pdf.js").then(({ default: html2pdf }) => {
      html2pdf().from(card).set({ filename: `${user.name}-ID.pdf`, margin: 0 }).save();
    });
  };

  const handleDownloadImage = () => {
    const card = document.getElementById("id-card-printable");
    if (!card) return;
    import("html2canvas").then(({ default: html2canvas }) => {
      html2canvas(card, { scale: 2, useCORS: true }).then((canvas) => {
        const link = document.createElement("a");
        link.download = `${user.name}-ID.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
      });
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.55)", backdropFilter: "blur(8px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden" style={{ width: 360, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        {/* Modal Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b" style={{ borderColor: "#f3f4f6" }}>
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
            style={{ backgroundColor: "#145228" }}
          >
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm" style={{ color: "#111827" }}>{user.name || "—"}</div>
            <div style={{ fontSize: 12, color: "#6b7280" }}>{user.jobTitle || user.position || "Child and Youth Care Worker"}</div>
            <div style={{ fontSize: 11, color: "#1f7a3c", fontWeight: 600 }}>ID: {user.userId || "—"}</div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <X size={16} style={{ color: "#6b7280" }} />
          </button>
        </div>

        {/* Side Label */}
        <div className="text-center pt-4 pb-2" style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", letterSpacing: "0.1em" }}>
          {side === "front" ? "FRONT" : "BACK"}
        </div>

        {/* Card */}
        <div className="px-5 pb-4" id="id-card-printable">
          {side === "front" ? (
            <div className="rounded-2xl overflow-hidden border" style={{ borderColor: "#e5e7eb" }}>
              {/* Green top */}
              <div className="flex flex-col items-center pt-5 pb-10 relative" style={{ backgroundColor: "#145228", minHeight: 150 }}>
                <div className="flex items-center gap-2 mb-1">
                  <img src="/images/logo.png" alt="" className="w-6 h-6 object-contain rounded-full opacity-90" />
                  <span className="text-white font-bold text-sm">Family Forever Inc.</span>
                </div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)" }}>Employee ID {user.userId || "—"}</div>

                {/* Avatar circle — positioned so it overlaps white section */}
                <div
                  className="absolute w-16 h-16 rounded-full border-4 border-white overflow-hidden flex items-center justify-center"
                  style={{ backgroundColor: "#e5e7eb", bottom: -32 }}
                >
                  <img
                    src={user.profilePhotoUrl || "/images/profile.jpeg"}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>

              {/* White bottom */}
              <div className="flex flex-col items-center pt-10 pb-6 px-4" style={{ backgroundColor: "#fff" }}>
                <div className="font-bold text-base" style={{ color: "#111827" }}>{user.name || "—"}</div>
                <div className="mb-3" style={{ fontSize: 12, color: "#6b7280" }}>{user.jobTitle || user.position || "Child and Youth Care Worker"}</div>
                <div style={{ fontSize: 12, color: "#374151" }}>{user.email || "—"}</div>
                <div style={{ fontSize: 12, color: "#374151" }}>{user.phone || "—"}</div>
                <div className="mt-4 font-semibold" style={{ fontSize: 12, color: "#374151" }}>From Humanity to Community</div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl overflow-hidden border flex flex-col items-center py-6 px-5" style={{ borderColor: "#e5e7eb" }}>
              <div className="font-bold text-base mb-4" style={{ color: "#111827" }}>Family Forever Inc.</div>
              <QRCodeSVG value={qrValue} size={96} fgColor="#145228" />
              <div className="font-bold mt-4 mb-2" style={{ fontSize: 13, color: "#111827" }}>Terms &amp; Conditions</div>
              <p className="text-center" style={{ fontSize: 11, color: "#6b7280", lineHeight: 1.6 }}>
                Use of this card indicates agreement with Family Forever Inc.'s Policies and procedures.
                This Card is the property of Family Forever Inc. of Edmonton, if found please call{" "}
                <span style={{ fontWeight: 600, color: "#111827" }}>825-982-3256 / 825-522-3256</span>
              </p>
              <div className="mt-3 font-medium" style={{ fontSize: 12, color: "#1f7a3c" }}>www.familyforever.ca</div>
            </div>
          )}
        </div>

        {/* Front / Back toggle */}
        <div className="flex justify-center gap-2 pb-4">
          {["front", "back"].map((s) => (
            <button
              key={s}
              onClick={() => setSide(s)}
              className="px-5 py-1.5 rounded-full font-semibold transition-all"
              style={{
                fontSize: 13,
                backgroundColor: side === s ? "#145228" : "transparent",
                color: side === s ? "#fff" : "#6b7280",
                border: side === s ? "none" : "1px solid #e5e7eb",
              }}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>

        {/* Bottom actions */}
        <div className="flex items-center justify-center gap-5 py-3 border-t" style={{ borderColor: "#f3f4f6" }}>
          <button onClick={handleDownloadPDF} className="flex items-center gap-1.5 text-xs font-medium hover:opacity-70 transition-opacity" style={{ color: "#374151" }}>
            <Download size={13} /> Download PDF
          </button>
          <button onClick={handleDownloadImage} className="flex items-center gap-1.5 text-xs font-medium hover:opacity-70 transition-opacity" style={{ color: "#374151" }}>
            <Download size={13} /> Download Image
          </button>
          <button onClick={() => window.print()} className="flex items-center gap-1.5 text-xs font-medium hover:opacity-70 transition-opacity" style={{ color: "#374151" }}>
            <Printer size={13} /> Print
          </button>
        </div>
      </div>
    </div>
  );
}

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
  const [statusFilter, setStatusFilter] = useState("Active");
  const [users, setUsers] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [goToPage, setGoToPage] = useState("");
  const [statusOpen, setStatusOpen] = useState(false);
  const [idCardUser, setIdCardUser] = useState(null);
  const statusRef = useRef(null);

  const navigate = useNavigate();

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const snap = await getDocs(collection(db, "users"));
        const list = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((u) => {
            const role = (u.role || "").toLowerCase();
            return role !== "admin" && role !== "superadmin";
          });
        setUsers(list);
      } catch (e) {
        console.error("Error fetching users:", e);
      }
    };
    fetchUsers();
  }, []);

  useEffect(() => {
    const h = (e) => {
      if (statusRef.current && !statusRef.current.contains(e.target)) setStatusOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
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
    const statusMatch =
      statusFilter === "All" ||
      (statusFilter === "Active" && !user.isSuspended) ||
      (statusFilter === "Suspended" && user.isSuspended);
    const searchMatch =
      !search ||
      user.name?.toLowerCase().includes(search.toLowerCase()) ||
      user.userId?.toString().toLowerCase().includes(search.toLowerCase());
    return genderMatch && statusMatch && searchMatch;
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
      {idCardUser && <IDCardModal user={idCardUser} onClose={() => setIdCardUser(null)} />}
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

        {/* Status filter */}
        <div className="relative" ref={statusRef}>
          <button
            onClick={() => setStatusOpen((o) => !o)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium"
            style={{ borderColor: "#e5e7eb", color: "#374151", backgroundColor: "#fff" }}
          >
            Status: <span style={{ color: "#1f7a3c" }}>{statusFilter}</span>
            <ChevronLeft size={13} style={{ transform: "rotate(-90deg)", color: "#9ca3af" }} />
          </button>
          {statusOpen && (
            <div className="absolute top-9 right-0 bg-white rounded-lg shadow-lg border z-50 min-w-[140px]"
              style={{ borderColor: "#e5e7eb" }}>
              {["All", "Active", "Suspended"].map((o) => (
                <button key={o} onClick={() => { setStatusFilter(o); setStatusOpen(false); setCurrentPage(1); }}
                  className="w-full text-left px-4 py-2 text-xs hover:bg-gray-50"
                  style={{ color: statusFilter === o ? "#1f7a3c" : "#374151", fontWeight: statusFilter === o ? 600 : 400 }}>
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
                {["Employee Name", "CYIM ID", "Username", "Gender", "Phone No", "Salary/Hour", "Mileage Rate", "ID Card", "Suspension", "Actions"].map((h) => (
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
                  <td colSpan={9} className="text-center py-16" style={{ color: "#9ca3af", fontSize: 14 }}>
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

                    {/* Mileage Rate */}
                    <td className="px-4 py-3">
                      {(() => {
                        const total = Number(user.totalKMs || 0);
                        const rate = total > 5000 ? user.rateAfter5000km : user.rateBefore5000km;
                        return rate != null && rate !== "" ? (
                          <span className="font-semibold" style={{ fontSize: 13, color: "#111827" }}>
                            ${rate} <span className="text-[10px] text-gray-400 font-normal">/km</span>
                          </span>
                        ) : (
                          <span style={{ color: "#9ca3af", fontSize: 13 }}>—</span>
                        );
                      })()}
                    </td>

                    {/* ID Card */}
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setIdCardUser(user)}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-colors hover:bg-gray-50"
                        style={{ fontSize: 12, color: "#1f7a3c", fontWeight: 600, borderColor: "#1f7a3c" }}
                      >
                        <CreditCard size={12} />
                        View
                      </button>
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
