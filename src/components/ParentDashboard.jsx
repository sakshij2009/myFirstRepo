import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, query, where, onSnapshot, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { filterFieldsForParents } from "../utils/parentFieldFilter";
import {
  LayoutGrid, Bell, LogOut, Search, ChevronLeft, ChevronRight,
  Calendar, Clock, Eye, FileText,
} from "lucide-react";

const FONT = { fontFamily: "'Plus Jakarta Sans', sans-serif" };
const ITEMS_PER_PAGE = 10;

function StatusBadge({ status }) {
  const s = (status || "").toLowerCase();
  const map = {
    approved: { bg: "#f0fdf4", text: "#15803d", dot: "#16a34a", label: "Approved" },
    pending: { bg: "#fef3c7", text: "#b45309", dot: "#f59e0b", label: "Pending" },
    submitted: { bg: "#fef3c7", text: "#b45309", dot: "#f59e0b", label: "Submitted" },
    draft: { bg: "#f3f4f6", text: "#6b7280", dot: "#9ca3af", label: "Draft" },
  };
  const style = map[s] || { bg: "#f3f4f6", text: "#6b7280", dot: "#9ca3af", label: status || "—" };
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-semibold"
      style={{ fontSize: 11, background: style.bg, color: style.text }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: style.dot, display: "inline-block" }} />
      {style.label}
    </span>
  );
}

function Sidebar({ onLogout }) {
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = useState(true);

  const width = isCollapsed ? 64 : 240;

  return (
    <div
      className="h-screen flex flex-col transition-all duration-300 overflow-hidden z-50 cursor-pointer"
      onMouseEnter={() => setIsCollapsed(false)}
      onMouseLeave={() => setIsCollapsed(true)}
      style={{
        width,
        backgroundColor: "#145228",
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        flexShrink: 0,
      }}
    >
      <div className="flex items-center gap-3 px-4 py-5 border-b" style={{ borderColor: "rgba(255,255,255,0.1)" }}>
        <div
          className="flex items-center justify-center overflow-hidden rounded-full flex-shrink-0"
          style={{ width: 36, height: 36, background: "rgba(255,255,255,0.15)" }}
        >
          <img src="/images/logo.png" alt="Logo" style={{ width: 36, height: 36, objectFit: "contain" }} />
        </div>
        {!isCollapsed && (
          <div>
            <p className="font-bold" style={{ fontSize: 14, color: "#fff" }}>Family Forever</p>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.6)" }}>Parent Portal</p>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto py-4 px-3">
        <button
          onClick={() => {}}
          className="w-full flex items-center gap-3 rounded-lg mb-1 transition-all"
          style={{
            padding: "10px 12px",
            background: "rgba(255,255,255,0.15)",
            color: "#fff",
            border: "none",
            cursor: "pointer",
            fontSize: 13,
            fontWeight: 600,
            textAlign: "left",
          }}
        >
          <span className="flex-shrink-0"><LayoutGrid className="size-4" strokeWidth={1.7} /></span>
          {!isCollapsed && <span>Dashboard</span>}
        </button>
      </div>

      <div className="px-3 pb-4 border-t" style={{ borderColor: "rgba(255,255,255,0.1)" }}>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 rounded-lg mt-2 transition-all"
          style={{
            padding: "10px 12px",
            background: "transparent",
            color: "rgba(255,255,255,0.5)",
            border: "none",
            cursor: "pointer",
            fontSize: 12,
          }}
        >
          <LogOut className="size-4 flex-shrink-0" />
          {!isCollapsed && <span>Logout</span>}
        </button>
      </div>
    </div>
  );
}

function Header({ user, onLogout }) {
  return (
    <header
      className="h-[58px] border-b flex items-center justify-between px-6 bg-white flex-shrink-0"
      style={{ borderColor: "#e5e7eb", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      <h1 className="font-bold tracking-tight" style={{ fontSize: 17, color: "#111827" }}>
        My Family Dashboard
      </h1>

      <div className="flex items-center gap-3">
        <button className="relative p-2 rounded-lg hover:bg-gray-50 transition-colors">
          <Bell className="size-5" strokeWidth={1.7} style={{ color: "#6b7280" }} />
        </button>

        <div className="flex items-center gap-2 pl-3 border-l" style={{ borderColor: "#e5e7eb" }}>
          <div className="text-right">
            <div className="text-sm font-semibold" style={{ color: "#111827" }}>{user?.name || "Parent"}</div>
            <div className="text-xs" style={{ color: "#9ca3af" }}>{user?.role || "Parent"}</div>
          </div>
          <div className="size-9 rounded-full flex items-center justify-center text-white font-semibold text-sm" style={{ background: "#145228" }}>
            {(user?.name || "P").charAt(0).toUpperCase()}
          </div>
        </div>
      </div>
    </header>
  );
}

function KPICard({ label, value, icon: Icon, color, bg }) {
  return (
    <div className="bg-white rounded-2xl border p-5 flex flex-col gap-3 transition-all hover:shadow-md"
      style={{ borderColor: "#e5e7eb", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
      <div className="flex items-center justify-between">
        <div className="rounded-xl flex items-center justify-center" style={{ width: 40, height: 40, background: bg }}>
          <Icon size={18} style={{ color }} />
        </div>
      </div>
      <div>
        <p className="font-bold" style={{ fontSize: 28, color: "#111827", lineHeight: 1 }}>{value}</p>
        <p className="font-semibold mt-1" style={{ fontSize: 13, color: "#374151" }}>{label}</p>
      </div>
    </div>
  );
}

const ParentDashboard = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const [forms, setForms] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    // Track forms from old collection
    let oldAppForms = [];
    let oldLoaded   = false;

    const mergeAndFilter = () => {
      if (!oldLoaded) return;
      // Keep only forms belonging to this parent
      const myForms = oldAppForms.filter(f =>
        f.submittedBy === user.id ||
        f.secondaryParentId === user.id ||
        f.applicantEmail === user?.email ||
        f.partyA_email === user?.email?.toLowerCase() ||
        f.partyB_email === user?.email?.toLowerCase()
      );
      setForms(myForms);
      setLoading(false);
    };

    // ── Listen to old InTakeForms (private forms only) ──
    const unsubOld = onSnapshot(
      query(collection(db, "InTakeForms"), where("formType", "==", "private")),
      (snap) => {
        oldAppForms = snap.docs.map(d => ({ id: d.id, _source: "old", ...d.data() }));
        oldLoaded = true;
        mergeAndFilter();
      },
      () => { oldLoaded = true; mergeAndFilter(); }
    );

    );

    // ── Shifts listener (unchanged) ──
    const unsubShifts = onSnapshot(query(collection(db, "shifts")), (snap) => {
      const allShifts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const clientIds = [];
      forms.forEach(f => {
        if (f.clientsCreated && f.clients) {
          Object.keys(f.clients).forEach(cid => clientIds.push(cid));
        }
      });
      setShifts(allShifts.filter(s =>
        clientIds.includes(s.clientId) || clientIds.includes(s.client)
      ));
    });

    return () => { unsubOld(); unsubShifts(); };
  }, [user?.id]);

  // Filter forms by search
  const filtered = forms.filter((f) => {
    if (!search) return true;
    const term = search.toLowerCase();
    const childNames = (f.children || []).map((c) => c.fullName || "").join(" ").toLowerCase();
    return (
      (f.familyName || "").toLowerCase().includes(term) ||
      childNames.includes(term)
    );
  });

  // Filter shifts by search
  const filteredShifts = shifts.filter((s) => {
    if (!search) return true;
    return (s.clientName || "").toLowerCase().includes(search.toLowerCase());
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const pageStart = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedForms = filtered.slice(pageStart, pageStart + ITEMS_PER_PAGE);

  const formatDate = (ts) => {
    if (!ts) return "—";
    if (ts?.toDate) return ts.toDate().toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
    return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
  };

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "#f9fafb", ...FONT }}>
      <Sidebar onLogout={onLogout} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header user={user} onLogout={onLogout} />

        <div className="flex-1 overflow-auto p-6">
          {/* KPIs */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <KPICard
              label="My Children"
              value={forms.reduce((acc, f) => acc + (f.children?.length || 0), 0)}
              icon={Calendar}
              color="#145228"
              bg="#F0FFF4"
            />
            <KPICard
              label="Upcoming Shifts"
              value={shifts.filter((s) => {
                if (!s.clockIn?.toDate) return false;
                return s.clockIn.toDate() >= new Date();
              }).length}
              icon={Clock}
              color="#2563eb"
              bg="#EFF6FF"
            />
            <KPICard
              label="Active Intake Forms"
              value={forms.filter((f) => ["Submitted", "Approved"].includes(f.status)).length}
              icon={LayoutGrid}
              color="#b45309"
              bg="#FEF3C7"
            />
          </div>

          {/* Search */}
          <div className="mb-4">
            <div className="relative" style={{ width: 320 }}>
              <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }} />
              <input
                type="text"
                placeholder="Search children or family..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                className="w-full rounded-xl border focus:outline-none focus:border-green-700 focus:ring-4 focus:ring-green-700/5"
                style={{
                  paddingLeft: 36, paddingRight: 12, paddingTop: 8, paddingBottom: 8,
                  fontSize: 13, borderColor: "#e5e7eb",
                }}
              />
            </div>
          </div>

          {/* Children Section */}
          <div className="bg-white rounded-2xl border overflow-hidden mb-6" style={{ borderColor: "#e5e7eb" }}>
            <div className="px-5 py-4 border-b" style={{ borderColor: "#e5e7eb" }}>
              <h2 className="font-bold" style={{ fontSize: 15, color: "#111827" }}>My Children</h2>
            </div>
            <div className="divide-y" style={{ borderColor: "#e5e7eb" }}>
              {loading ? (
                <div className="text-center py-12 text-gray-400 text-sm">Loading...</div>
              ) : paginatedForms.length === 0 ? (
                <div className="text-center py-12 text-gray-400 text-sm">No children found</div>
              ) : (
                paginatedForms.flatMap((form) => {
                  const safeData = filterFieldsForParents(form);
                  return (safeData.children || []).map((child, i) => (
                    <div key={`${form.id}-${i}`} className="px-5 py-4 flex items-center gap-6">
                      <div>
                        <p className="font-semibold text-sm" style={{ color: "#111827" }}>{child.fullName || "—"}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {child.dob ? `DOB: ${child.dob}` : ""} {child.gender ? `• ${child.gender}` : ""}
                        </p>
                      </div>
                      <div className="ml-auto flex items-center gap-3">
                        <span className="text-xs px-2.5 py-1 rounded-full font-semibold" style={{ background: "#f3f4f6", color: "#6b7280" }}>
                          {child.custody || "—"}
                        </span>
                        <StatusBadge status={form.status} />
                      </div>
                    </div>
                  ));
                })
              )}
            </div>
          </div>

          {/* Assessment Form Section */}
          {user?.showAssessmentLink && (
            <div className="bg-white rounded-2xl border overflow-hidden mb-4" style={{ borderColor: "#e5e7eb" }}>
              <div className="px-5 py-4 border-b" style={{ borderColor: "#e5e7eb" }}>
                <h2 className="font-bold" style={{ fontSize: 15, color: "#111827" }}>Assessment Form</h2>
              </div>
              <div className="px-5 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "#FEF3C7" }}>
                      <FileText size={20} style={{ color: "#b45309" }} />
                    </div>
                    <div>
                      <p className="font-semibold text-sm" style={{ color: "#111827" }}>Family Intake Assessment</p>
                      <p className="text-xs text-gray-500 mt-0.5">Complete the intake assessment form for Family Forever Inc.</p>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate("/intake-form/family-assessment")}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition-all"
                    style={{ background: "#b45309", color: "#fff" }}
                  >
                    Open Form
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Intake Form Section */}
          {user?.showIntakeFormLink && (
            <div className="bg-white rounded-2xl border overflow-hidden mb-6" style={{ borderColor: "#e5e7eb" }}>
              <div className="px-5 py-4 border-b" style={{ borderColor: "#e5e7eb" }}>
                <h2 className="font-bold" style={{ fontSize: 15, color: "#111827" }}>Intake Form</h2>
              </div>
              <div className="px-5 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "#EFF6FF" }}>
                      <FileText size={20} style={{ color: "#1d4ed8" }} />
                    </div>
                    <div>
                      <p className="font-semibold text-sm" style={{ color: "#111827" }}>Family Service Request</p>
                      <p className="text-xs text-gray-500 mt-0.5">Fill out the family service intake form to get started</p>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate("/intake-form/private-form")}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition-all"
                    style={{ background: "#1d4ed8", color: "#fff" }}
                  >
                    Open Form
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Shift Reports Section */}
          <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: "#e5e7eb" }}>
            <div className="px-5 py-4 border-b" style={{ borderColor: "#e5e7eb" }}>
              <h2 className="font-bold" style={{ fontSize: 15, color: "#111827" }}>Shift Reports</h2>
            </div>
            <div className="divide-y" style={{ borderColor: "#e5e7eb" }}>
              {loading ? (
                <div className="text-center py-12 text-gray-400 text-sm">Loading...</div>
              ) : filteredShifts.length === 0 ? (
                <div className="text-center py-12 text-gray-400 text-sm">No shift reports available</div>
              ) : (
                filteredShifts.slice(0, 10).map((shift) => (
                  <div key={shift.id} className="px-5 py-4 flex items-center gap-6">
                    <div className="flex-1">
                      <p className="font-semibold text-sm" style={{ color: "#111827" }}>{shift.clientName || "—"}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {formatDate(shift.clockIn)} {shift.clockIn?.toDate ? shift.clockIn.toDate().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : ""}
                        {shift.clockOut?.toDate ? ` - ${shift.clockOut.toDate().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}` : ""}
                      </p>
                      <div className="text-[10px] text-gray-400 mt-0.5">
                        {shift.primaryUserName || shift.userName || shift.name || "—"} (P)
                        {shift.secondaryUserName && <span className="ml-1">& {shift.secondaryUserName} (S)</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs px-2.5 py-1 rounded-full font-semibold" style={{ background: "#DBEAFE", color: "#2563EB" }}>
                        {shift.categoryName || shift.shiftType || "Shift"}
                      </span>
                      <StatusBadge status={shift.status} />
                      <button
                        onClick={() => navigate(`/admin-dashboard/shift-report/${shift.id}`)}
                        className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all"
                        style={{ background: "#F0FFF4", color: "#145228" }}
                      >
                        <Eye size={12} />
                        View
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-40"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm text-gray-600">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-40"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ParentDashboard;