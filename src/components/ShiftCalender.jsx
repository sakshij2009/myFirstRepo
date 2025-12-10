import React, { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getFirestore, collection, query, where, getDocs } from "firebase/firestore";

export default function ShiftCalendar({ user }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [shifts, setShifts] = useState([]);

  // CATEGORY COLORS
  const CATEGORY_COLORS = {
    emergent: "bg-red-100 text-red-700",
    respite: "bg-green-100 text-green-700",
    transportation: "bg-blue-100 text-blue-700",
    supervised: "bg-yellow-100 text-yellow-700",
    default: "bg-gray-100 text-gray-700",
  };

   const detectCategory = (shift) => {
    const c = (shift.categoryName || "").toLowerCase();

    if (c.includes("emergent")) return CATEGORY_COLORS.emergent;
    if (c.includes("respite")) return CATEGORY_COLORS.respite;
    if (c.includes("transport")) return CATEGORY_COLORS.transportation;
    if (c.includes("supervised")) return CATEGORY_COLORS.supervised;

    return CATEGORY_COLORS.default;
  };

  

  const fetchShifts = async () => {
    try {
      const db = getFirestore();
      const q = query(collection(db, "shifts"), where("userId", "==", user.userId));
      const snap = await getDocs(q);

      const data = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setShifts(data);
    } catch (err) {
      console.error("Error fetching shifts", err);
    }
  };

  useEffect(() => {
    fetchShifts();
  }, [currentDate]);

  const getMonthDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const days = [];
    // Pad empty cells (Monday = 1)
    const startIndex = (firstDay.getDay() + 6) % 7;

    for (let i = 0; i < startIndex; i++) {
      days.push(null);
    }

    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push(new Date(year, month, d));
    }
    return days;
  };

  const monthDays = getMonthDays();

  const getShiftsForDay = (date) => {
    if (!date) return [];
    return shifts.filter((s) => {
      const sd = s.startDate?.toDate ? s.startDate.toDate() : new Date(s.startDate);
      return (
        sd.getFullYear() === date.getFullYear() &&
        sd.getMonth() === date.getMonth() &&
        sd.getDate() === date.getDate()
      );
    });
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  return (
    <div className="w-full bg-white rounded-lg p-4 shadow-sm">
      
      {/* HEADER */}
      <div className="flex justify-between items-center mb-4">
        <button onClick={prevMonth}>
          <ChevronLeft />
        </button>

        <h2 className="text-2xl font-bold">
          {currentDate.toLocaleString("default", { month: "long" })} {currentDate.getFullYear()}
        </h2>

        <button onClick={nextMonth}>
          <ChevronRight />
        </button>
      </div>

      {/* WEEK HEADERS */}
      <div className="grid grid-cols-7 text-center font-semibold border-b pb-2">
        {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map(
          (day) => (
            <div key={day}>{day}</div>
          )
        )}
      </div>

      {/* CALENDAR GRID */}
      <div className="grid grid-cols-7 gap-0 border border-gray-200">
        {monthDays.map((day, idx) => (
          <div
            key={idx}
            className="min-h-[130px] border-r border-b border-gray-200 p-1 flex flex-col"
          >
            {/* DATE NUMBER */}
            {day && (
              <div className="text-sm font-bold text-gray-700">
                {day.getDate()}
              </div>
            )}

            {/* SHIFTS */}
            <div className="mt-1 flex flex-col gap-1">
              {getShiftsForDay(day).map((shift) => (
                <div
                  key={shift.id}
                  className={`rounded px-2 py-1 text-xs font-semibold ${detectCategory(
                    shift
                  )}`}
                >
                  <div>{shift.clientName || shift.name}</div>
                  <div>
                    {shift.startTime} → {shift.endTime}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* LEGEND */}
      <div className="mt-4 flex gap-4 flex-wrap">
        {Object.entries(CATEGORY_COLORS).map(([key, color]) =>
          key === "default" ? null : (
            <div key={key} className="flex items-center gap-2">
              <div className={`w-4 h-4 rounded ${color}`}></div>
              <span className="text-sm capitalize">{key}</span>
            </div>
          )
        )}
      </div>
    </div>
  );
}
