import React, { useState, useEffect, useMemo } from "react";
import { IoIosSearch } from "react-icons/io";
import { IoChevronDown } from "react-icons/io5";
import { FaPlus, FaFilter } from "react-icons/fa6";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import PayrollStaffDetails from "./PayrollStaffDetails";
import CustomCalendar from "./CustomerCalender";
import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
} from "date-fns";

// ✅ Robust date extractor
const extractDate = (val) => {
  if (!val) return null;
  if (typeof val.toDate === "function") return val.toDate();
  if (val instanceof Date && !isNaN(val)) return val;
  if (typeof val === "object" && val.seconds) return new Date(val.seconds * 1000);
  if (typeof val === "string") {
    const cleaned = val.replace(/,/g, "").replace(/\s+/g, " ").trim();
    const parsed = Date.parse(cleaned);
    if (!isNaN(parsed)) return new Date(parsed);
    const parts = cleaned.split(" ");
    if (parts.length >= 3) {
      const [day, month, year] = parts;
      const monthIndex = new Date(`${month} 1, ${year}`).getMonth();
      if (!isNaN(monthIndex)) return new Date(Number(year), monthIndex, Number(day));
    }
  }
  return null;
};

// ✅ Get Alberta "today"
const getAlbertaToday = () => {
  const now = new Date();
  const albertaStr = now.toLocaleDateString("en-CA", { timeZone: "America/Edmonton" });
  const [y, m, d] = albertaStr.split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
};

const Payroll = () => {
  const [genderFilter, setGenderFilter] = useState("All");
  const [suspendedFilter, setSuspendedFilter] = useState("All");
  const [periodFilter, setPeriodFilter] = useState("Monthly");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [search, setSearch] = useState("");
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [rawUsers, setRawUsers] = useState([]);
  const [rawShifts, setRawShifts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Dropdown open states
  const [genderOpen, setGenderOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [periodOpen, setPeriodOpen] = useState(false);
  const [fromCalendarOpen, setFromCalendarOpen] = useState(false);
  const [toCalendarOpen, setToCalendarOpen] = useState(false);

  const genderOptions = ["All", "Male", "Female", "Other"];
  const statusOptions = ["All", "Active", "Suspended"];
  const periodOptions = ["Weekly", "Monthly", "Custom"];

  // Format date for badge display
  const formatBadgeDate = (dateStr) => {
    if (!dateStr) return "Select";
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-CA", { day: "2-digit", month: "short", year: "numeric" });
  };

  // Fetch Data from Firestore
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [usersSnap, shiftsSnap] = await Promise.all([
          getDocs(collection(db, "users")),
          getDocs(collection(db, "shifts"))
        ]);

        setRawShifts(shiftsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setRawUsers(usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (error) {
        console.error("Error fetching payroll data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // ✅ Get date range based on period filter
  const getDateRange = () => {
    const albertaNow = getAlbertaToday();
    if (periodFilter === "Weekly") {
      return { start: startOfWeek(albertaNow), end: endOfWeek(albertaNow) };
    }
    if (periodFilter === "Monthly") {
      return { start: startOfMonth(albertaNow), end: endOfMonth(albertaNow) };
    }
    if (periodFilter === "Custom" && customFrom && customTo) {
      return {
        start: new Date(customFrom + "T00:00:00"),
        end: new Date(customTo + "T23:59:59"),
      };
    }
    // Default: no date filter (show all)
    return { start: null, end: null };
  };

  // ✅ Recalculate staff data whenever filters or raw data change
  const staffData = useMemo(() => {
    const { start, end } = getDateRange();
    const now = getAlbertaToday();

    return rawUsers.map(user => {
      // Filter shifts for this user
      const userShifts = rawShifts.filter(shift => {
        if (shift.userId !== user.userId && shift.userId !== user.id) return false;

        const shiftDate = extractDate(shift.startDate) || extractDate(shift.createdAt);
        if (!shiftDate) return false;

        // Must be in the past
        if (shiftDate > now) return false;

        // Must be within period filter range
        if (start && end) {
          if (shiftDate < start || shiftDate > end) return false;
        }

        return true;
      });

      // Calculate Total Hours
      let totalMinutes = 0;
      userShifts.forEach(shift => {
        const getFullDate = (dField, tField) => {
          if (!dField) return null;
          const d = dField.toDate ? dField.toDate() : new Date(dField);
          if (tField) {
            d.setHours(0, 0, 0, 0);
            const lower = tField.toLowerCase().trim();
            const clean = lower.replace("am", "").replace("pm", "").trim();
            let [h, m] = clean.split(":").map(Number);
            if (lower.includes("pm") && h !== 12) h += 12;
            if (lower.includes("am") && h === 12) h = 0;
            d.setHours(h, m || 0);
          }
          return d;
        };

        const shiftStart = getFullDate(shift.startDate, shift.startTime);
        const shiftEnd = getFullDate(shift.endDate, shift.endTime);

        let scheduledMins = 0;
        if (shiftStart && shiftEnd) {
          scheduledMins = (shiftEnd - shiftStart) / (1000 * 60);
        }

        let actualMins = 0;
        let hasClockData = false;
        if (shift.clockIn && shift.clockOut) {
          const cIn = shift.clockIn.toDate ? shift.clockIn.toDate() : new Date(shift.clockIn);
          const cOut = shift.clockOut.toDate ? shift.clockOut.toDate() : new Date(shift.clockOut);
          const diff = (cOut - cIn) / (1000 * 60);
          if (!isNaN(diff) && diff > 0) {
            actualMins = diff;
            hasClockData = true;
          }
        }

        const shiftMins = hasClockData ? actualMins : scheduledMins;
        if (!isNaN(shiftMins) && shiftMins > 0) {
          totalMinutes += shiftMins;
        }
      });

      const totalHours = (totalMinutes / 60).toFixed(2);

      // Get Shift Type
      const sortedShifts = [...userShifts].sort((a, b) => {
        const dateA = a.startDate?.toDate ? a.startDate.toDate() : new Date(a.startDate);
        const dateB = b.startDate?.toDate ? b.startDate.toDate() : new Date(b.startDate);
        return dateB - dateA;
      });
      const latestShift = sortedShifts[0];
      const shiftTypeStatus = latestShift ? (latestShift.shiftType || "Standard") : "Inactive";

      // Calculate Total Mileage ($)
      const km = Number(user.totalKm) || 0;
      const rateBefore = Number(user.rateBefore5000km) || 0;
      const rateAfter = Number(user.rateAfter5000km) || 0;
      const mileageRate = km > 5000 ? rateAfter : rateBefore;
      const totalMileage = (km * mileageRate).toFixed(2);

      return {
        id: user.id,
        name: user.name || "Unknown",
        staffId: user.userId || "N/A",
        totalShifts: userShifts.length,
        gender: user.gender || "N/A",
        isSuspended: user.isSuspended || false,
        shiftType: shiftTypeStatus,
        totalHours: `${totalHours}h`,
        totalKm: user.totalKm,
        totalMileage: `$${totalMileage}`,
        salary: user.salaryPerHour ? `$${user.salaryPerHour}` : "$0",
        totalPay: "",
        shifts: userShifts,
        rawUser: user
      };
    });
  }, [rawUsers, rawShifts, periodFilter, customFrom, customTo]);

  // Filter data
  const filteredData = staffData.filter(staff => {
    const matchesSearch = staff.name.toLowerCase().includes(search.toLowerCase()) ||
      String(staff.staffId).includes(search);
    const matchesGender = genderFilter === "All" || (staff.gender && staff.gender.toLowerCase() === genderFilter.toLowerCase());
    const matchesSuspended =
      suspendedFilter === "All" ||
      (suspendedFilter === "Active" && !staff.isSuspended) ||
      (suspendedFilter === "Suspended" && staff.isSuspended);
    return matchesSearch && matchesGender && matchesSuspended;
  });
  const currentData = filteredData;

  return (
    <div className="flex flex-col gap-6 p-6 h-full overflow-y-auto">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Payroll Management</h1>

      </div>



      {/* Services Section */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-lg font-bold text-gray-800">Services</h3>
            <p className="text-sm text-gray-500">Include details about: activities, medications, meals, mood, interactions, health observations, and any concerns.</p>
          </div>
          {/* <button className="flex items-center gap-2 bg-green-800 text-white px-4 py-2 rounded-md hover:bg-green-900 transition-colors">
            <FaPlus /> Add Pricing
          </button> */}
        </div>

        <div className="bg-gray-50 p-4 rounded-md text-sm text-gray-700 space-y-3 border border-gray-200">
          <div>
            <p className="font-bold">Cancellation more than 24 Hours</p>
            <p className="text-gray-600">• If a service is cancelled more than 24 hours from the start time of the said service no billing will occur.</p>
          </div>
          <div>
            <p className="font-bold">Cancellation less than 24 Hours</p>
            <p className="text-gray-600">• If the service is cancelled within 24 hours time frame prior to the start time of the service said service will still be billed.</p>
          </div>
          <div>
            <p className="font-bold">On Shift Cancellation</p>
            <p className="text-gray-600">• If the service is cancelled after the start of the service billing will occur for the full hours of the service. (the entire shift).</p>
          </div>
        </div>
      </div>

      {/* Payroll Overview */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
        <h3 className="text-xl font-bold text-gray-800 mb-4">Payroll Overview</h3>

        <div className="flex flex-wrap gap-4 items-center justify-between mb-6">
          {/* Search */}
          <div className="relative w-full max-w-xs">
            <input
              type="text"
              placeholder="Search with Staff name.."
              className="w-full pl-3 pr-10 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-green-600"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {/* <IoIosSearch className="absolute right-3 top-2.5 text-gray-400" /> */}
          </div>


          {/* Filter Dropdowns */}
          <div className="relative flex gap-3 items-center flex-wrap">
            <div>
              Showed Results <span className="font-bold text-gray-800">{filteredData.length}</span>
            </div>

            {/* Gender */}
            <div className="flex gap-[14px] items-center">
              <p className="font-bold text-base leading-6 text-light-black">Gender</p>
              <button
                onClick={() => { setGenderOpen(!genderOpen); setStatusOpen(false); setPeriodOpen(false); }}
                className="flex items-center gap-1 text-light-green cursor-pointer"
              >
                {genderFilter} <IoChevronDown />
              </button>
            </div>

            {/* Status */}
            <div className="flex gap-[14px] items-center">
              <p className="font-bold text-base leading-6 text-light-black">Status</p>
              <button
                onClick={() => { setStatusOpen(!statusOpen); setGenderOpen(false); setPeriodOpen(false); }}
                className="flex items-center gap-1 text-light-green cursor-pointer"
              >
                {suspendedFilter} <IoChevronDown />
              </button>
            </div>

            {/* Period */}
            <div className="flex gap-[14px] items-center">
              <p className="font-bold text-base leading-6 text-light-black">Period</p>
              <button
                onClick={() => { setPeriodOpen(!periodOpen); setGenderOpen(false); setStatusOpen(false); }}
                className="flex items-center gap-1 text-light-green cursor-pointer"
              >
                {periodFilter} <IoChevronDown />
              </button>
            </div>

            {/* Custom Date Range Badges */}
            {periodFilter === "Custom" && (
              <>
                <div className="flex gap-[14px] items-center">
                  <p className="font-bold text-base leading-6 text-light-black">From</p>
                  <button
                    onClick={() => { setFromCalendarOpen(!fromCalendarOpen); setToCalendarOpen(false); setGenderOpen(false); setStatusOpen(false); setPeriodOpen(false); }}
                    className="flex items-center gap-1 text-light-green cursor-pointer border border-light-gray rounded-[6px] px-2 py-1 text-sm"
                  >
                    {formatBadgeDate(customFrom)} <IoChevronDown />
                  </button>
                </div>
                <div className="flex gap-[14px] items-center">
                  <p className="font-bold text-base leading-6 text-light-black">To</p>
                  <button
                    onClick={() => { setToCalendarOpen(!toCalendarOpen); setFromCalendarOpen(false); setGenderOpen(false); setStatusOpen(false); setPeriodOpen(false); }}
                    className="flex items-center gap-1 text-light-green cursor-pointer border border-light-gray rounded-[6px] px-2 py-1 text-sm"
                  >
                    {formatBadgeDate(customTo)} <IoChevronDown />
                  </button>
                </div>
              </>
            )}

            {/* ─── Dropdown Popups ─── */}
            {genderOpen && (
              <div className="absolute right-60 top-[40px] w-30 bg-white shadow-lg rounded-md z-50">
                <ul className="py-2">
                  {genderOptions.map((g) => (
                    <li
                      key={g}
                      className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-light-black"
                      onClick={() => { setGenderFilter(g); setGenderOpen(false); }}
                    >
                      {g}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {statusOpen && (
              <div className="absolute right-30 top-[40px] w-30 bg-white shadow-lg rounded-md z-50">
                <ul className="py-2">
                  {statusOptions.map((s) => (
                    <li
                      key={s}
                      className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-light-black"
                      onClick={() => { setSuspendedFilter(s); setStatusOpen(false); }}
                    >
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {periodOpen && (
              <div className="absolute right-0 top-[40px] w-30 bg-white shadow-lg rounded-md z-50">
                <ul className="py-2">
                  {periodOptions.map((p) => (
                    <li
                      key={p}
                      className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-light-black"
                      onClick={() => { setPeriodFilter(p); setPeriodOpen(false); }}
                    >
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* From Calendar */}
            {fromCalendarOpen && (
              <div className="absolute right-0 top-[40px] z-50">
                <CustomCalendar
                  selectedDates={customFrom ? [new Date(customFrom + "T00:00:00")] : []}
                  selectionMode="single"
                  onDatesChange={(dates) => {
                    if (dates.length) {
                      const d = dates[0];
                      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
                      setCustomFrom(iso);
                    }
                    setFromCalendarOpen(false);
                  }}
                  onClose={() => setFromCalendarOpen(false)}
                />
              </div>
            )}

            {/* To Calendar */}
            {toCalendarOpen && (
              <div className="absolute right-0 top-[40px] z-50">
                <CustomCalendar
                  selectedDates={customTo ? [new Date(customTo + "T00:00:00")] : []}
                  selectionMode="single"
                  onDatesChange={(dates) => {
                    if (dates.length) {
                      const d = dates[0];
                      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
                      setCustomTo(iso);
                    }
                    setToCalendarOpen(false);
                  }}
                  onClose={() => setToCalendarOpen(false)}
                />
              </div>
            )}
          </div>
        </div>

        {/* Table */}
        <h4 className="font-bold text-lg text-gray-700 mb-2">Payroll Records</h4>
        <p className="text-xs text-gray-500 mb-4">All Staff Payroll records in this category.</p>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="p-3 font-semibold text-gray-600 text-sm">Staff Name</th>
                <th className="p-3 font-semibold text-gray-600 text-sm">Staff ID</th>
                <th className="p-3 font-semibold text-gray-600 text-sm">Total Shifts</th>
                <th className="p-3 font-semibold text-gray-600 text-sm text-center">Gender</th>
                {/* <th className="p-3 font-semibold text-gray-600 text-sm text-center">Shift Type</th> */}
                <th className="p-3 font-semibold text-gray-600 text-sm text-center">
                  Total Hours{periodFilter === "Weekly" ? "/Week" : periodFilter === "Monthly" ? "/Month" : ""}
                </th>
                <th className="p-3 font-semibold text-gray-600 text-sm text-center">Total KM</th>
                <th className="p-3 font-semibold text-gray-600 text-sm text-center">Total Mileage ($)</th>
                <th className="p-3 font-semibold text-gray-600 text-sm text-right">Salary per hour</th>
                <th className="p-3 font-semibold text-gray-600 text-sm text-right">Total Pay Rate</th>
              </tr>
            </thead>
            <tbody>
              {currentData.map((staff, idx) => (
                <tr
                  key={idx}
                  className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => setSelectedStaff(staff)}
                >
                  <td className="p-3 text-sm text-green-700 font-medium">{staff.name}</td>
                  <td className="p-3 text-sm text-gray-600">{staff.staffId}</td>
                  <td className="p-3 text-sm text-gray-600">{staff.totalShifts}</td>
                  <td className="p-3 text-center">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${staff.gender === 'Female' ? 'bg-pink-100 text-pink-600' : 'bg-blue-100 text-blue-600'}`}>
                      {staff.gender === 'Female' ? '♀ Female' : '♂ Male'}
                    </span>
                  </td>
                  {/* <td className="p-3 text-center">
                    <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-medium">{staff.shiftType}</span>
                  </td> */}
                  <td className="p-3 text-center text-sm text-gray-600">{staff.totalHours}</td>
                  <td className="p-3 text-center text-sm text-gray-600">{staff.totalKm || "0"} km</td>
                  <td className="p-3 text-center text-sm text-green-600 font-bold">{staff.totalMileage}</td>
                  <td className="p-3 text-right text-sm text-green-600 font-bold">{staff.salary}</td>
                  <td className="p-3 text-right text-sm text-green-800 font-bold">{staff.totalPay}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Removed */}
        {/* <div className="flex justify-end items-center mt-4 gap-1">...</div> */}

      </div>

      {/* Staff Details Modal */}
      {selectedStaff && (
        <PayrollStaffDetails staff={selectedStaff} onClose={() => setSelectedStaff(null)} />
      )}

    </div>
  );
};

export default Payroll;
