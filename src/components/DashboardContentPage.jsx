import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import ShiftsData from "../components/ShiftsData";
import IntakeFormChoiceModel from "../components/IntakeFormChoiceModel";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import CustomCalendar from "./CustomerCalender";
import { startOfWeek, endOfWeek, isWithinInterval } from "date-fns";
import TransportationShiftsData from "./TransportationShiftsData";
import AdminShiftCalendar from "./AdminShiftCalender";
import { Plus, Search, ChevronDown, Calendar } from "lucide-react";

const DashboardContentPage = ({ activeTab, handleViewReport,openTransportDetails,initialShiftCategory }) => {
  const navigate = useNavigate();

  const [categories, setCategories] = useState([]);
  const [shiftStatus, setShiftStatus] = useState("");
  const [shiftCategory, setShiftCategory] = useState(
  initialShiftCategory || ""
);

  const [statusOpen, setStatusOpen] = useState(false);
  const [selectedDates, setSelectedDates] = useState([new Date()]);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [shifts, setShifts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);

  const statusOptions = ["All", "InProgress", "Completed", "Incomplete"];


//  useEffect(() => {
//   if (
//     initialShiftCategory &&
//     categories.some(c => c.name === initialShiftCategory)
//   ) {
//     setShiftCategory(initialShiftCategory);
//   }
// }, [initialShiftCategory, categories]);



  // Fetch shifts
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "shifts"));
        const employeeList = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setShifts(employeeList);
        console.log("Fetched Shifts:", employeeList);

      } catch (error) {
        console.error("Error fetching employees:", error);
      }
    };
    fetchEmployees();
  }, []);
  

  // Helper functions
  const getShiftStatus = (clockIn, clockOut) => {
    if (clockIn && clockOut) return "Completed";
    if (clockIn && !clockOut) return "InProgress";
    return "Incomplete";
  };

  const formatDateToDDMMYYYY = (date) => {
    if (!date) return "—";
    try {
      let d;
      if (date.toDate) {
        d = date.toDate();
      } else if (date instanceof Date) {
        d = date;
      } else if (typeof date === "string") {
        d = new Date(date);
        if (isNaN(d)) {
          const parsed = Date.parse(date);
          d = !isNaN(parsed) ? new Date(parsed) : null;
        }
      }
      if (!d || isNaN(d)) return "—";
      const day = String(d.getDate()).padStart(2, "0");
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const year = d.getFullYear();
      return `${day}-${month}-${year}`;
    } catch (err) {
      console.error("Error formatting date:", err);
      return "—";
    }
  };

  const normalizeCategory = (category) => {
  const c = (category || "").toLowerCase().trim();

  // ✅ Any supervised visitation variant goes into Supervised Visitation tab
  if (c.includes("supervised visitation")) return "Supervised Visitation";

  if (c.includes("emergent care")) return "Emergent Care";
  if (c.includes("respite")) return "Respite Care";
  if (c.includes("transportation")) return "Transportation";

  return category || "";
};


const filteredShifts = shifts.filter((shift) => {
  const status = getShiftStatus(shift.clockIn, shift.clockOut);
  const rawCategory =
  shift.categoryName || shift.shiftCategory || "";

const normalizedShiftCategory = normalizeCategory(rawCategory);
  const clientName =
    shift.clientName ||
    shift.clientDetails?.name ||
    shift.clientDetails?.clientName ||
    "";
  const clientId =
    shift.clientId ||
    shift.clientDetails?.id ||
    shift.clientDetails?.clientId ||
    "";

  // ---------------- STATUS ----------------
  const statusMatches =
    !shiftStatus || status === shiftStatus;

  // ---------------- CATEGORY ----------------
  const categoryMatches =
  !shiftCategory ||
  shiftCategory === "All" ||
  normalizedShiftCategory.toLowerCase() === shiftCategory.toLowerCase();

  // ---------------- DATE ----------------
  // ---------------- DATE ----------------
let dateMatches = true;
try {
  if (selectedDates.length > 0) {
    let shiftStart = null;

    // ✅ 1. Handle Firestore Timestamp
    if (shift.startDate?.toDate) {
      shiftStart = shift.startDate.toDate();

    // ✅ 2. Handle already a Date object
    } else if (shift.startDate instanceof Date) {
      shiftStart = shift.startDate;

    // ✅ 3. Handle string formats like "05 DEC 2024", "05 December 2024", "DEC 05 2024"
    } else if (typeof shift.startDate === "string") {
      // Normalize common formats before parsing
      const cleaned = shift.startDate
        .replace(/,/g, "") // remove commas
        .replace(/\s+/g, " ") // normalize spaces
        .trim();

      // Try different possible date formats
      const parsed = Date.parse(cleaned);

      if (!isNaN(parsed)) {
        shiftStart = new Date(parsed);
      } else {
        // Try manual parsing like "05 DEC 2024"
        const parts = cleaned.split(" ");
        if (parts.length >= 3) {
          const [day, month, year] = parts;
          const monthIndex = new Date(`${month} 1, ${year}`).getMonth();
          if (!isNaN(monthIndex)) {
            shiftStart = new Date(Number(year), monthIndex, Number(day));
          }
        }
      }
    }

    // ✅ Compare normalized day, month, and year
    if (shiftStart && !isNaN(shiftStart)) {
      const shiftDay = shiftStart.getDate();
      const shiftMonth = shiftStart.getMonth();
      const shiftYear = shiftStart.getFullYear();

      dateMatches = selectedDates.some((selectedDate) => {
        return (
          selectedDate.getDate() === shiftDay &&
          selectedDate.getMonth() === shiftMonth &&
          selectedDate.getFullYear() === shiftYear
        );
      });
    } else {
      console.warn("⚠️ Invalid startDate for shift:", shift.id, shift.startDate);
      dateMatches = false;
    }
  }
} catch (err) {
  console.error("❌ Date filter error:", err);
  dateMatches = false;
}


  // ---------------- SEARCH ----------------
  const searchMatches =
    !searchTerm ||
    clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    clientId.toString().toLowerCase().includes(searchTerm.toLowerCase()) ||
    (shift.primaryUserName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (shift.secondaryUserName || "").toLowerCase().includes(searchTerm.toLowerCase());

  const passes =
    statusMatches && categoryMatches && dateMatches && searchMatches;

  if (!passes) {
    console.log("❌ Filtered OUT:", {
      id: shift.id,
      clientName,
      status,
      statusMatches,
      categoryMatches,
      dateMatches,
      searchMatches,
      startDate: shift.startDate,
      selectedDates,
    });
  } else {
    console.log("✅ Shift PASSES:", shift.id);
  }

  return passes;
});



  // Fetch shift categories
useEffect(() => {
  const fetchCategories = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "shiftCategories"));

      let categoryList = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      categoryList = categoryList.filter(
        (cat) =>
          cat.name !== "Supervised Visitation + Transportation" &&
          cat.name !== "Shadow Shift" &&
          cat.name !== "Administration"
      );

      setCategories(categoryList);

      // ✅ set default ONLY if navigation did not provide category
     if (!initialShiftCategory && !shiftCategory && categoryList.length > 0) {
  setShiftCategory(categoryList[0].name);
}

    } catch (error) {
      console.error("Error fetching shift categories:", error);
    }
  };

  fetchCategories();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);
 

  // Calendar formatting
  const formatDDMMYYYY = (date) => {
    return `${String(date.getDate()).padStart(2, "0")}/${String(
      date.getMonth() + 1
    ).padStart(2, "0")}/${date.getFullYear()}`;
  };

  const { calendarBadge, isThisWeek } = useMemo(() => {
    if (!selectedDates.length) {
      const today = new Date();
      return { calendarBadge: formatDDMMYYYY(today), isThisWeek: true };
    }

    const sortedDates = [...selectedDates].sort((a, b) => a - b);
    let badgeText = "";

    if (sortedDates.length === 1) {
      badgeText = formatDDMMYYYY(sortedDates[0]);
    } else {
      const first = formatDDMMYYYY(sortedDates[0]);
      const last = formatDDMMYYYY(sortedDates[sortedDates.length - 1]);
      badgeText = `${first} - ${last}`;
    }

    const today = new Date();
    const weekStart = startOfWeek(today, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(today, { weekStartsOn: 1 });

    const inThisWeek = sortedDates.every((date) =>
      isWithinInterval(date, { start: weekStart, end: weekEnd })
    );

    return { calendarBadge: badgeText, isThisWeek: inThisWeek };
  }, [selectedDates]);

  // ✅ MAIN RETURN
  return (
    <div
      className="flex flex-col w-full gap-0"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      {/* Page Header */}
      <div
        className="flex items-center justify-between px-0 pb-4"
      >
        <div>
          <h1 className="font-bold" style={{ fontSize: 18, color: "#111827" }}>Shifts</h1>
          <p style={{ fontSize: 13, color: "#6b7280", marginTop: 2 }}>
            {filteredShifts.length} shift{filteredShifts.length !== 1 ? "s" : ""} shown
          </p>
        </div>
        <div className="flex items-center gap-2">
          {[
            { label: "Add User", path: "/admin-dashboard/add/add-user" },
            { label: "Add Shift", path: "/admin-dashboard/add/add-user-shift" },
            { label: "Add Intake Form", path: "" },
          ].map((btn, idx) => (
            <button
              key={idx}
              onClick={() => {
                if (btn.label === "Add Intake Form") setShowModal(true);
                else navigate(btn.path);
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-white font-semibold text-xs transition-opacity hover:opacity-90"
              style={{ backgroundColor: "#1f7a3c" }}
            >
              <Plus size={13} strokeWidth={2.5} />
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* Intake Modal */}
      {showModal && <IntakeFormChoiceModel setShowModal={setShowModal} />}

      {/* Tabs */}
      <div
        className="flex items-center gap-1 border-b mb-4"
        style={{ borderColor: "#e5e7eb" }}
      >
        <button
          onClick={() => setShiftCategory("CALENDAR")}
          className="pb-2.5 px-3 text-sm font-semibold transition-colors relative"
          style={{ color: shiftCategory === "CALENDAR" ? "#111827" : "#9ca3af" }}
        >
          Shift Calendar
          {shiftCategory === "CALENDAR" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5" style={{ backgroundColor: "#1f7a3c" }} />
          )}
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setShiftCategory(cat.name)}
            className="pb-2.5 px-3 text-sm font-semibold transition-colors relative"
            style={{ color: shiftCategory === cat.name ? "#111827" : "#9ca3af" }}
          >
            {cat.name}
            {shiftCategory === cat.name && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5" style={{ backgroundColor: "#1f7a3c" }} />
            )}
          </button>
        ))}
      </div>

      {/* Filters */}
      {shiftCategory !== "CALENDAR" && (
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative" style={{ width: 260 }}>
              <Search
                size={14}
                style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }}
              />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name or client ID…"
                className="w-full rounded-lg border focus:outline-none bg-white"
                style={{
                  paddingLeft: 30, paddingRight: 10, paddingTop: 7, paddingBottom: 7,
                  fontSize: 13, borderColor: "#e5e7eb", color: "#111827",
                }}
              />
            </div>

            {/* Calendar picker */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setCalendarOpen((v) => !v)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium bg-white"
                style={{ borderColor: "#e5e7eb", color: "#374151" }}
              >
                <Calendar size={13} style={{ color: "#6b7280" }} />
                <span>{calendarBadge}</span>
                {isThisWeek && (
                  <span className="ml-1 px-1.5 py-0.5 rounded text-xs font-bold"
                    style={{ backgroundColor: "#f0fdf4", color: "#1f7a3c" }}>
                    This Week
                  </span>
                )}
                <ChevronDown size={13} style={{ color: "#9ca3af" }} />
              </button>
              {calendarOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setCalendarOpen(false)} />
                  <div className="absolute z-50 top-10 left-0 shadow-lg rounded-lg bg-white border" style={{ borderColor: "#e5e7eb" }}>
                    <CustomCalendar
                      selectedDates={selectedDates}
                      onDatesChange={(dates) => setSelectedDates(dates)}
                      onClose={() => setCalendarOpen(false)}
                    />
                  </div>
                </>
              )}
            </div>

            <span style={{ fontSize: 13, color: "#6b7280" }}>
              {filteredShifts.length} result{filteredShifts.length !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Status Filter */}
          <div className="relative">
            <button
              onClick={() => setStatusOpen(!statusOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium bg-white"
              style={{ borderColor: "#e5e7eb", color: "#374151" }}
            >
              Status: <span style={{ color: "#1f7a3c" }}>{shiftStatus || "All"}</span>
              <ChevronDown size={13} style={{ color: "#9ca3af" }} />
            </button>
            {statusOpen && (
              <>
                <div onClick={() => setStatusOpen(false)} className="fixed inset-0 z-40" />
                <div className="absolute right-0 top-9 bg-white border rounded-lg shadow-lg z-50 min-w-[140px]"
                  style={{ borderColor: "#e5e7eb" }}>
                  {statusOptions.map((status) => (
                    <button
                      key={status}
                      className="w-full text-left px-4 py-2 text-xs hover:bg-gray-50"
                      style={{ color: "#374151" }}
                      onClick={() => {
                        setShiftStatus(status === "All" ? "" : status);
                        setStatusOpen(false);
                      }}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Data Section */}
      <div className="w-full">
        {shiftCategory === "CALENDAR" && <AdminShiftCalendar shifts={shifts} />}
        {shiftCategory === "Transportation" && (
          <TransportationShiftsData
            filteredShifts={filteredShifts}
            handleViewReport={handleViewReport}
            openTransportDetails={openTransportDetails}
          />
        )}
        {shiftCategory !== "CALENDAR" && shiftCategory !== "Transportation" && (
          <ShiftsData filteredShifts={filteredShifts} handleViewReport={handleViewReport} />
        )}
      </div>
    </div>
  );
};

export default DashboardContentPage;
