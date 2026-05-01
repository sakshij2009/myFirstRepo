import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import ShiftLockToggle from "./ShiftLockToggle";
import { generateShiftReportPDF } from "../components/GenerateShiftReportPDF";
import {
  ChevronLeft, ChevronRight, Calendar, User, Tag, Clock,
  FileText, Edit2, Download, Lock, Building2, Car,
} from "lucide-react";

function statusBadge(status) {
  const map = {
    Completed:  { bg: "#dcfce7", color: "#16a34a", border: "#bbf7d0" },
    Ongoing:    { bg: "#fef3c7", color: "#d97706", border: "#fde68a" },
    InProgress: { bg: "#fef3c7", color: "#d97706", border: "#fde68a" },
    Incomplete: { bg: "#f3f4f6", color: "#6b7280", border: "#e5e7eb" },
  };
  const s = map[status] || map.Incomplete;
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border"
      style={{ backgroundColor: s.bg, color: s.color, borderColor: s.border }}
    >
      {status}
    </span>
  );
}

function confirmedBadge(confirmed) {
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border"
      style={
        confirmed
          ? { backgroundColor: "#dcfce7", color: "#16a34a", borderColor: "#bbf7d0" }
          : { backgroundColor: "#fee2e2", color: "#dc2626", borderColor: "#fecaca" }
      }
    >
      {confirmed ? "Confirmed" : "Unconfirmed"}
    </span>
  );
}

function categoryBadge(cat) {
  const map = {
    "Emergent Care":         { bg: "#fff1f2", color: "#c70036", border: "#ffccd3" },
    "Supervised Visitation": { bg: "#fffbeb", color: "#bf4d00", border: "#fee685" },
    "Respite Care":          { bg: "#ecfeff", color: "#007595", border: "#a2f4fd" },
  };
  const s = map[cat] || { bg: "#f3f4f6", color: "#374151", border: "#e5e7eb" };
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border whitespace-nowrap"
      style={{ backgroundColor: s.bg, color: s.color, borderColor: s.border }}
    >
      {cat || "—"}
    </span>
  );
}

const formatDate = (ts) => {
  if (!ts) return "—";
  const d = typeof ts?.toDate === "function" ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

const formatTime = (ts) => {
  if (!ts) return "—";

  // If it's a string in "YYYY-MM-DD, HH:mm:ss" format, just extract the time
  // to avoid browser timezone shifts.
  if (typeof ts === "string" && ts.includes(",")) {
    try {
      const timePart = ts.split(",")[1].trim();
      const [h, m] = timePart.split(":");
      const hours = parseInt(h, 10);
      const ampm = hours >= 12 ? "PM" : "AM";
      const displayHours = hours % 12 || 12;
      return `${String(displayHours).padStart(2, "0")}:${m} ${ampm}`;
    } catch (e) {
      console.error("Error parsing time string:", e);
    }
  }

  const d = typeof ts?.toDate === "function" ? ts.toDate() : new Date(ts);
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "America/Edmonton" });
};

const normalizeCategory = (cat) => {
  const c = (cat || "").toLowerCase().trim();
  if (c.includes("supervised visitation")) return "Supervised Visitation";
  if (c.includes("emergent care")) return "Emergent Care";
  if (c.includes("respite")) return "Respite Care";
  return cat || "—";
};

const getShiftStatus = (clockIn, clockOut) => {
  if (clockIn && clockOut) return "Completed";
  if (clockIn && !clockOut) return "Ongoing";
  return "Incomplete";
};

const ShiftsData = ({ filteredShifts = [] }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const navigate = useNavigate();

  const ITEMS_PER_PAGE = 8;
  const totalPages = Math.max(1, Math.ceil(filteredShifts.length / ITEMS_PER_PAGE));
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const currentShifts = filteredShifts.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const changePage = (page) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  const handleViewIntakeForm = (intakeId, shift) => {
    if (!intakeId) return;
    const formType = (shift?.agencyName?.trim() || "").toLowerCase() === "private" ? "Private" : "Intake Worker";
    navigate(`/admin-dashboard/add/update-intake-form/${intakeId}?type=${formType}`);
  };

  const handleViewReport = (shiftId) => {
    if (!shiftId) return;
    navigate(`/admin-dashboard/shift-report/${shiftId}`);
  };

  const handleEditShift = (shiftId) => {
    if (!shiftId) return;
    navigate(`/admin-dashboard/add/update-user-shift/${shiftId}`);
  };

  if (currentShifts.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center w-full py-20 bg-white rounded-xl border"
        style={{ borderColor: "#e5e7eb" }}
      >
        <Calendar size={40} style={{ color: "#d1d5db", marginBottom: 12 }} strokeWidth={1.5} />
        <p className="font-semibold" style={{ fontSize: 15, color: "#6b7280" }}>No Shifts Found</p>
        <p style={{ fontSize: 13, color: "#9ca3af", marginTop: 4 }}>No shifts match your current filters.</p>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-3" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      {/* Shift Cards */}
      {currentShifts.map((shift) => {
        const status = getShiftStatus(shift.clockIn, shift.clockOut);
        const isCompleted = status === "Completed";
        const rawCategory = shift.categoryName || shift.shiftCategory || "";
        const normCat = normalizeCategory(rawCategory);

        return (
          <div
            key={shift.id}
            className="bg-white rounded-xl border overflow-hidden transition-shadow hover:shadow-md"
            style={{ borderColor: "#e5e7eb" }}
          >
            {/* Card Header */}
            <div
              className="flex items-center justify-between px-5 py-3 border-b"
              style={{ borderColor: "#f3f4f6", backgroundColor: "#fafafa" }}
            >
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <User size={13} style={{ color: "#9ca3af" }} />
                  <span className="font-semibold" style={{ fontSize: 13, color: "#111827" }}>
                    {shift.clientName || shift.clientDetails?.name || "—"}
                  </span>
                  {shift.clientId && (
                    <span style={{ fontSize: 12, color: "#9ca3af", fontFamily: "monospace" }}>
                      · {shift.clientId}
                    </span>
                  )}
                </div>
                {categoryBadge(normCat)}
                {statusBadge(status)}
                {confirmedBadge(shift.shiftConfirmed)}
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1" style={{ fontSize: 12, color: "#6b7280" }}>
                  <Calendar size={13} />
                  <span>{formatDate(shift.startDate)}</span>
                </div>
                <div
                  className="w-px h-4"
                  style={{ backgroundColor: "#e5e7eb" }}
                />
                <div className="flex items-center gap-1" style={{ fontSize: 12, color: "#6b7280" }}>
                  <Clock size={13} />
                  <span>{shift.startTime}–{shift.endTime}</span>
                </div>
              </div>
            </div>

            {/* Card Body */}
            <div className="grid grid-cols-4 gap-4 px-5 py-3">
              <div>
                <p className="uppercase font-semibold mb-1" style={{ fontSize: 10, color: "#9ca3af", letterSpacing: "0.05em" }}>
                  Staff
                </p>
                <div style={{ fontSize: 13, color: "#374151", fontWeight: 500 }}>
                  <p>{shift.primaryUserName || shift.userName || shift.name || "—"} (P)</p>
                  {shift.secondaryUserName && (
                    <p className="mt-0.5" style={{ fontSize: 11, color: "#6b7280", fontWeight: 400 }}>{shift.secondaryUserName} (S)</p>
                  )}
                </div>
              </div>
              <div>
                <p className="uppercase font-semibold mb-1" style={{ fontSize: 10, color: "#9ca3af", letterSpacing: "0.05em" }}>
                  Shift Type
                </p>
                <p style={{ fontSize: 13, color: "#374151", fontWeight: 500 }}>
                  {shift.typeName || shift.shiftType || "—"}
                </p>
                {shift.vehicleType && (
                  <div className="flex items-center gap-1 mt-1 text-gray-500" style={{ fontSize: 11 }}>
                    <Car size={12} />
                    <span>{shift.vehicleType}</span>
                  </div>
                )}
              </div>
              <div>
                <p className="uppercase font-semibold mb-1" style={{ fontSize: 10, color: "#9ca3af", letterSpacing: "0.05em" }}>
                  Agency
                </p>
                <div className="flex items-center gap-1">
                  <Building2 size={13} style={{ color: "#9ca3af" }} />
                  <p className="truncate" style={{ fontSize: 13, color: "#374151", fontWeight: 500 }}>
                    {shift.agencyName || shift.clientDetails?.agencyName || "—"}
                  </p>
                </div>
              </div>
              <div>
                <p className="uppercase font-semibold mb-1" style={{ fontSize: 10, color: "#9ca3af", letterSpacing: "0.05em" }}>
                  Clock In / Out
                </p>
                <p style={{ fontSize: 13, color: "#374151", fontWeight: 500 }}>
                  {shift.clockIn ? formatTime(shift.clockIn) : "—"} / {shift.clockOut ? formatTime(shift.clockOut) : "—"}
                </p>
              </div>
            </div>

            {/* Card Footer */}
            <div
              className="flex items-center justify-between px-5 py-2.5 border-t"
              style={{ borderColor: "#f3f4f6" }}
            >
              <button
                onClick={() => handleViewIntakeForm(shift.clientId, shift)}
                className="flex items-center gap-1.5 text-xs font-semibold transition-colors"
                style={{ color: "#1f7a3c" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#145228")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#1f7a3c")}
              >
                <FileText size={13} />
                View Intake Form
              </button>

              <div className="flex items-center gap-3">
                <ShiftLockToggle shiftId={shift.id} initialValue={shift.isRatify ?? false} className="" />

                <button
                  onClick={() => handleViewReport(shift.id)}
                  className="flex items-center gap-1 text-xs font-semibold transition-colors"
                  style={{ color: "#6b7280" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#1f7a3c")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "#6b7280")}
                >
                  <FileText size={13} />
                  View Report
                </button>

                <button
                  onClick={() => isCompleted && generateShiftReportPDF(shift)}
                  className="flex items-center gap-1 text-xs font-semibold transition-colors"
                  style={{ color: isCompleted ? "#6b7280" : "#d1d5db", cursor: isCompleted ? "pointer" : "not-allowed" }}
                  onMouseEnter={(e) => { if (isCompleted) e.currentTarget.style.color = "#1f7a3c"; }}
                  onMouseLeave={(e) => { if (isCompleted) e.currentTarget.style.color = "#6b7280"; }}
                >
                  <Download size={13} />
                  Download Report
                </button>

                <button
                  onClick={() => handleEditShift(shift.id)}
                  className="flex items-center gap-1 text-xs font-semibold transition-colors"
                  style={{ color: "#6b7280" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#1f7a3c")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "#6b7280")}
                >
                  <Edit2 size={13} />
                  Edit Shift
                </button>
              </div>
            </div>
          </div>
        );
      })}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-end items-center gap-2 pt-2">
          <button
            onClick={() => changePage(currentPage - 1)}
            disabled={currentPage === 1}
            className="flex items-center justify-center w-8 h-8 rounded-lg border transition-colors hover:bg-gray-50 disabled:opacity-40 bg-white"
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
                    backgroundColor: currentPage === p ? "#1f7a3c" : "#fff",
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
            className="flex items-center justify-center w-8 h-8 rounded-lg border transition-colors hover:bg-gray-50 disabled:opacity-40 bg-white"
            style={{ borderColor: "#e5e7eb" }}
          >
            <ChevronRight size={15} style={{ color: "#374151" }} />
          </button>
        </div>
      )}
    </div>
  );
};

export default ShiftsData;
