import React from "react";
import { IoClose } from "react-icons/io5";
import { FaEdit } from "react-icons/fa";
import { HiOutlineBanknotes } from "react-icons/hi2";

const PayrollStaffDetails = ({ staff, onClose }) => {
  if (!staff) return null;

  // Calculate detailed stats from the passed shifts
  const shifts = staff.shifts || [];

  // Helper to parse date
  const parseDate = (d) => d?.toDate ? d.toDate() : new Date(d);

  // Group shifts by type and calculate
  let regularCount = 0;
  let overtimeCount = 0; // Assuming specific logic or type for overtime
  let dayOffCount = 0; // Assuming specific logic

  // Calculate Shift History for Table
  const shiftHistory = shifts.map(shift => {
    // Helper to construct Date from Date + Time fields
    const getFullDate = (dateField, timeField) => {
      if (!dateField) return null;
      let d = dateField?.toDate ? dateField.toDate() : new Date(dateField);

      if (timeField) {
        // "09:00" or "9:00 AM" or "14:30"
        // Reset to midnight first
        d.setHours(0, 0, 0, 0);

        const lowerTime = timeField.toLowerCase().trim();
        const isPm = lowerTime.includes("pm");
        const isAm = lowerTime.includes("am");

        // Remove am/pm
        const cleanTime = lowerTime.replace("am", "").replace("pm", "").trim();
        let [h, m] = cleanTime.split(":").map(Number);

        if (isPm && h !== 12) h += 12;
        if (isAm && h === 12) h = 0;

        d.setHours(h, m || 0);
      }
      return d;
    };

    const dateObj = parseDate(shift.startDate);
    const dateStr = dateObj.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });

    // Use START TIME and END TIME if available
    const start = getFullDate(shift.startDate, shift.startTime) || parseDate(shift.startDate);
    const end = getFullDate(shift.endDate, shift.endTime) || parseDate(shift.endDate);

    // Scheduled Duration

    // Scheduled Duration
    const scheduledDiffMs = end - start;
    const scheduledHrs = (scheduledDiffMs / (1000 * 60 * 60));

    // Actual Duration (Clock In/Out)
    let actualHrs = 0;
    if (shift.clockIn && shift.clockOut) {
      const cIn = parseDate(shift.clockIn);
      const cOut = parseDate(shift.clockOut);
      actualHrs = (cOut - cIn) / (1000 * 60 * 60);
    } else {
      // Fallback if not clocked out yet or missing: use scheduled ??
      // Or show 0? User said "calculate by checking clock in and clock out".
      // If missing, let's assuming 0 for actual, or just use scheduled for display if "pending"?
      // Let's assume if incomplete, we show 0/0 calculated, but maybe user wants scheduled as regular?
      // Let's stick to: If NO clock data, Regular = Scheduled, Overtime = 0.
      // If ONE is missing, can't calculate.
      actualHrs = scheduledHrs;
    }

    // Logic: Regular = up to Scheduled. Overtime = Anything above Scheduled.

    let regularHrs = 0;
    let overtimeHrs = 0;

    // Ensure we have numbers
    const safeActual = isNaN(actualHrs) ? 0 : actualHrs;
    const safeScheduled = isNaN(scheduledHrs) ? 0 : scheduledHrs;

    if (safeActual > safeScheduled) {
      regularHrs = safeScheduled;
      overtimeHrs = safeActual - safeScheduled;
    } else {
      regularHrs = safeActual;
      overtimeHrs = 0;
    }

    // Determine type color based on shift type
    // Ensure we are getting the shift type from the DB field 'shiftType'
    // Priority: shiftCategory > categoryName > shiftType > typeName > category > "Standard"
    const rawType = shift.shiftCategory || shift.categoryName || shift.shiftType || shift.typeName || shift.category || "Standard";

    let typeColor = "bg-gray-100 text-gray-600 border-gray-200";
    const typeLower = rawType.toLowerCase();

    if (typeLower.includes("emergent")) {
      typeColor = "bg-pink-100 text-pink-600 border-pink-200";
    } else if (typeLower.includes("respite")) {
      typeColor = "bg-cyan-100 text-cyan-700 border-cyan-200";
    } else if (typeLower.includes("supervised")) {
      typeColor = "bg-yellow-100 text-yellow-700 border-yellow-200";
    } else if (typeLower.includes("transportation")) {
      typeColor = "bg-purple-100 text-purple-700 border-purple-200";
    }

    // Timeline Format: 9:00 AM 10:00 PM (12.00 Hr)
    // Fix: If startTime/endTime exist, use them directly for display to avoid timezone shifting issues
    let startStr, endStr;

    const formatRawTime = (t) => {
      if (!t) return "";
      // t is "09:00" or "15:00" or "9:00 AM"
      const lower = t.toLowerCase().trim();
      // If already has AM/PM, return normalized
      if (lower.includes("am") || lower.includes("pm")) return t.toUpperCase();

      // precise parsing for HH:MM
      const [hStr, mStr] = lower.split(":");
      let h = parseInt(hStr);
      const m = mStr || "00";
      const ampm = h >= 12 ? "PM" : "AM";
      if (h > 12) h -= 12;
      if (h === 0) h = 12;
      return `${h}:${m} ${ampm}`;
    };

    if (shift.startTime && shift.endTime) {
      startStr = formatRawTime(shift.startTime);
      endStr = formatRawTime(shift.endTime);
    } else {
      // Fallback to Date object conversion
      const opts = { timeZone: "America/Edmonton", hour: 'numeric', minute: '2-digit' };
      startStr = start.toLocaleTimeString([], opts);
      endStr = end.toLocaleTimeString([], opts);
    }

    const totalDisplayHrs = (regularHrs + overtimeHrs).toFixed(2);

    return {
      date: dateStr,
      client: shift.clientDetails?.name || shift.clientName || "Unknown",

      // Timeline: "9:00 AM 10:00 PM (12.00 Hr)"
      timeline: `${startStr} ${endStr} (${totalDisplayHrs} Hr)`,

      regular: regularHrs.toFixed(2) + " hr",
      overtime: overtimeHrs > 0 ? overtimeHrs.toFixed(2) + " hr" : "0.00 hr",

      type: rawType, // Use the raw value from DB
      typeColor: typeColor,
      amount: "",
      isCancelled: !!shift.isCancelled,
    };
  }).sort((a, b) => new Date(b.date) - new Date(a.date)); // Sort new to old

  const detailedStats = [
    { label: "Regular Shifts", value: shifts.length, sub: "Total Shifts", icon: "👥", color: "text-green-600", bg: "bg-green-50" },
    { label: "Overtime", value: "-", sub: "Coming Soon", icon: "📈", color: "text-orange-600", bg: "bg-orange-50" },
    { label: "Dayoff", value: "-", sub: "Coming Soon", icon: "💲", color: "text-purple-600", bg: "bg-purple-50" },
    { label: "Total Payoff", value: "-", sub: "Coming Soon", icon: "💲", color: "text-purple-600", bg: "bg-purple-50" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white w-full max-w-6xl max-h-[90vh] overflow-y-auto rounded-xl shadow-2xl" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex justify-between items-start">
          <div className="flex gap-4">
            <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-2xl font-bold border-2 border-blue-200">
              <HiOutlineBanknotes />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-800">{staff.name || "Unknown Staff"}</h2>
              <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded">Regular</span>
              <p className="text-gray-500 text-sm mt-2 max-w-lg">
                View Detailed information about Government category including clients, agencies and revenue.
              </p>
            </div>
          </div>
          {/* <button className="flex items-center gap-2 bg-green-800 text-white px-4 py-2 rounded-lg hover:bg-green-900 transition-colors">
            <FaEdit /> Edit Pricing
          </button> */}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-6 bg-gray-50">
          {detailedStats.map((stat, idx) => (
            <div key={idx} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-lg ${stat.color}`}>{stat.icon}</span>
                <span className="text-gray-600 font-medium">{stat.label}</span>
              </div>
              <div className="text-3xl font-bold text-gray-900">{stat.value}</div>
              <div className="text-xs text-gray-400 mt-1">{stat.sub}</div>
            </div>
          ))}
        </div>

        {/* Timeline Section */}
        <div className="p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-2">Daily Shift Timeline & Breakdown</h3>
          <p className="text-gray-500 text-sm mb-6">Track staff payments across all clients and shift types</p>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="text-left text-gray-500 text-sm border-b border-gray-200">
                  <th className="pb-3 font-semibold">Date</th>
                  <th className="pb-3 font-semibold">Client Name</th>
                  <th className="pb-3 font-semibold">Shift Category</th>
                  <th className="pb-3 font-semibold">Timeline</th>
                  <th className="pb-3 font-semibold text-right">Regular</th>
                  <th className="pb-3 font-semibold text-right">Overtime</th>
                  <th className="pb-3 font-semibold text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {shiftHistory.length > 0 ? shiftHistory.map((row, index) => (
                  <tr key={index} className={`border-b border-gray-50 last:border-0 transition-colors ${row.isCancelled
                      ? "bg-red-50 hover:bg-red-100"
                      : "hover:bg-gray-50"
                    }`}>
                    <td className={`py-4 ${row.isCancelled ? "text-red-400 line-through" : "text-gray-700"}`}>{row.date}</td>
                    <td className={`py-4 ${row.isCancelled ? "text-red-400 line-through" : "text-gray-700"}`}>{row.client}</td>

                    {/* Shift Category Column */}
                    <td className="py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${row.isCancelled
                          ? "bg-red-100 text-red-600 border-red-200"
                          : row.typeColor
                        }`}>
                        {row.isCancelled ? "Cancelled" : row.type}
                      </span>
                    </td>

                    <td className={`py-4 ${row.isCancelled ? "text-red-400 line-through" : "text-gray-500"}`}>{row.timeline}</td>

                    <td className="py-4 text-right">
                      <span className={row.isCancelled ? "text-red-400 line-through" : "text-green-600 font-medium"}>{row.regular}</span>
                    </td>

                    <td className="py-4 text-right">
                      <span className={row.isCancelled ? "text-red-400 line-through" : "text-orange-600 font-medium"}>{row.overtime}</span>
                    </td>

                    <td className="py-4 text-right font-bold text-gray-700">
                      {row.amount || "--"}
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="7" className="text-center py-4 text-gray-500">No shifts found for this staff member.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
};

export default PayrollStaffDetails;
