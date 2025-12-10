import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import ShiftsData from "../components/ShiftsData";
import IntakeFormChoiceModel from "../components/IntakeFormChoiceModel";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { IoChevronDown } from "react-icons/io5";
import CustomCalendar from "./CustomerCalender";
import { FaPlus } from "react-icons/fa6";
import { startOfWeek, endOfWeek, isWithinInterval } from "date-fns";
import TransportationShiftsData from "./TransportationShiftsData";

const DashboardContentPage = ({ activeTab, handleViewReport,openTransportDetails }) => {
  const navigate = useNavigate();

  const [categories, setCategories] = useState([]);
  const [shiftStatus, setShiftStatus] = useState("");
  const [shiftCategory, setShiftCategory] = useState("");
  const [statusOpen, setStatusOpen] = useState(false);
  const [selectedDates, setSelectedDates] = useState([new Date()]);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [shifts, setShifts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);

  const statusOptions = ["All", "InProgress", "Completed", "Incomplete"];

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

const filteredShifts = shifts.filter((shift) => {
  const status = getShiftStatus(shift.clockIn, shift.clockOut);
  const shiftCategoryName =
    shift.categoryName || shift.shiftCategory || "";
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
    shiftCategoryName.toLowerCase() === shiftCategory.toLowerCase();

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
    clientId.toString().toLowerCase().includes(searchTerm.toLowerCase());

  const passes =
    statusMatches && categoryMatches && dateMatches && searchMatches;

  if (!passes) {
    console.log("❌ Filtered OUT:", {
      id: shift.id,
      shiftCategoryName,
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
        if (categoryList.length > 0) setShiftCategory(categoryList[0].name);
      } catch (error) {
        console.error("Error fetching shift categories:", error);
      }
    };

    fetchCategories();
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
    <div className="flex flex-col w-full gap-[16px] relative ">
      {/* Header */}
      <div className="flex justify-between">
        <p className="font-bold text-2xl text-light-black leading-7">Shift Category</p>

        <div className="flex flex-row gap-[12px] flex-wrap">
          {[
            { label: "Add User", path: "/admin-dashboard/add/add-user" },
            { label: "Add Shift", path: "/admin-dashboard/add/add-user-shift" },
            { label: "Add Intake Forms", path: "" },
          ].map((btn, idx) => (
            <div
              key={idx}
              className="flex justify-center items-center text-white border gap-[10px] py-[6px] px-3 rounded-[6px] cursor-pointer bg-dark-green w-auto"
              onClick={() => {
                if (btn.label === "Add Intake Forms") {
                  setShowModal(true);
                } else {
                  navigate(btn.path);
                }
              }}
            >
              <FaPlus className="w-[10px]" />
              <p className="font-medium text-[14px] leading-[20px]">{btn.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Intake Modal */}
      {showModal && (
        <IntakeFormChoiceModel
          setShowModal={setShowModal}
          
        />
      )}

      {/* Tabs */}
      <div className="flex items-center gap-6 border-b border-gray">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setShiftCategory(cat.name)}
            className={`pb-2 text-sm font-medium cursor-pointer ${
              shiftCategory === cat.name
                ? "text-dark-green border-b-2 border-dark-green font-bold"
                : "text-light-black font-bold"
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex justify-between min-h-[32px] text-light-black relative">
        <div className="flex gap-[12px] items-center">
          {/* Search */}
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="border border-[#C5C5C5] rounded-[4px] w-[342px] focus:outline-none p-2 bg-white placeholder-[#C5C5C5] placeholder:text-[12px]"
            placeholder="Search with Name, Client ID"
          />

          {/* Calendar */}
          <div className="relative flex gap-3 items-center">
            <p className="font-bold text-[16px] leading-[24px]">Calendar</p>
            <button
              type="button"
              onClick={() => setCalendarOpen((v) => !v)}
              className="flex items-center gap-2 px-3 py-[6px] rounded border border-light-green text-light-green"
            >
              <span className="text-sm font-medium">{calendarBadge}</span>
              <IoChevronDown />
            </button>

            {calendarOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setCalendarOpen(false)} />
                <div className="absolute z-50 top-10 left-0 shadow-lg rounded bg-white">
                  <CustomCalendar
                    selectedDates={selectedDates}
                    onDatesChange={(dates) => setSelectedDates(dates)}
                    onClose={() => setCalendarOpen(false)}
                  />
                </div>
              </>
            )}
          </div>

          <div className="flex gap-[12px] items-center">
            {isThisWeek && <p className="font-bold text-[16px] leading-[24px]">This Week</p>}
            <div className="w-px h-6 bg-gray-400"></div>
            <p className="font-normal text-base">Showed Results ({filteredShifts.length})</p>
          </div>
        </div>

        {/* Status Filter */}
        <div className="flex gap-[12px] items-center relative">
          <p className="font-bold text-base leading-6">Status</p>
          <button
            onClick={() => setStatusOpen(!statusOpen)}
            className="flex items-center gap-1 text-light-green"
          >
            {shiftStatus || "All"} <IoChevronDown />
          </button>
          {statusOpen && (
            <>
              <div onClick={() => setStatusOpen(false)} className="fixed inset-0 z-40" />
              <div className="absolute right-[4px] top-[40px] w-40 bg-white border border-gray-200 shadow-lg rounded-md z-50">
                <ul className="py-1">
                  {statusOptions.map((status) => (
                    <li
                      key={status}
                      className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-light-black text-sm"
                      onClick={() => {
                        setShiftStatus(status === "All" ? "" : status);
                        setStatusOpen(false);
                      }}
                    >
                      {status}
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ✅ Data Section */}
      <div className="flex p-1 h-auto">
        {shiftCategory === "Transportation" ? (
          <TransportationShiftsData
            filteredShifts={filteredShifts}
            handleViewReport={handleViewReport}
             openTransportDetails={openTransportDetails}
          />
        ) : (
          <ShiftsData
            filteredShifts={filteredShifts}
            handleViewReport={handleViewReport}
          />
        )}
      </div>
    </div>
  );
};

export default DashboardContentPage;
