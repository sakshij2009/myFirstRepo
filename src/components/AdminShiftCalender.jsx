import React, { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getFirestore, collection, query, getDocs } from "firebase/firestore";

export default function AdminShiftCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [shifts, setShifts] = useState([]);
  const [expandedUsers, setExpandedUsers] = useState({});

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

  // 🔥 FETCH ALL SHIFTS (ADMIN)
  const fetchShifts = async () => {
    const db = getFirestore();
    const q = query(collection(db, "shifts"));
    const snap = await getDocs(q);
    const data = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    setShifts(data);
  };

  useEffect(() => {
    fetchShifts();
  }, []);

  // 🧩 GROUP BY DATE → USER
  const groupedShifts = () => {
    const map = {};

    shifts.forEach((shift) => {
      const d = shift.startDate?.toDate
        ? shift.startDate.toDate()
        : new Date(shift.startDate);

      const dateKey = d.toISOString().split("T")[0];
      const userKey = shift.name  ;

      if (!map[dateKey]) map[dateKey] = {};
      if (!map[dateKey][userKey]) map[dateKey][userKey] = [];

      map[dateKey][userKey].push(shift);
    });

    return map;
  };

  const shiftMap = groupedShifts();

  // 📅 Month grid
  const getMonthDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const days = [];
    const startIndex = (firstDay.getDay() + 6) % 7;

    for (let i = 0; i < startIndex; i++) days.push(null);
    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push(new Date(year, month, d));
    }
    return days;
  };

  const monthDays = getMonthDays();

  const toggleUser = (dateKey, userKey) => {
    const key = `${dateKey}_${userKey}`;
    setExpandedUsers((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
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
        <button onClick={prevMonth}><ChevronLeft /></button>
        <h2 className="text-2xl font-bold">
          {currentDate.toLocaleString("default", { month: "long" })} {currentDate.getFullYear()}
        </h2>
        <button onClick={nextMonth}><ChevronRight /></button>
      </div>

      {/* WEEK HEADERS */}
      <div className="grid grid-cols-7 text-center font-semibold border-b pb-2">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
          <div key={day}>{day}</div>
        ))}
      </div>

      {/* CALENDAR */}
      <div className="grid grid-cols-7 border border-gray-200">
        {monthDays.map((day, idx) => {
          const dateKey = day ? day.toISOString().split("T")[0] : null;
          const usersForDay = dateKey ? shiftMap[dateKey] || {} : {};

          return (
            <div key={idx} className="min-h-[150px] border-r border-b border-gray-200 p-1 flex flex-col">
              {day && <div className="text-sm font-bold">{day.getDate()}</div>}

              {/* USERS */}
              <div className="mt-1 flex flex-col gap-1">
                {Object.entries(usersForDay).map(([userKey, userShifts]) => {
                  const expandKey = `${dateKey}_${userKey}`;
                  const isOpen = expandedUsers[expandKey];

                  return (
                    <div key={userKey} className="border border-gray-500 rounded bg-gray-50">
                      {/* USER HEADER */}
                      <div
                        onClick={() => toggleUser(dateKey, userKey)}
                        className="cursor-pointer px-2 py-1 text-sm font-semibold bg-gray-100 hover:bg-gray-300 flex justify-between"
                      >
                        <span>{userKey}</span>
                        <span>{isOpen ? "▲" : "▼"}</span>
                      </div>

                      {/* SHIFTS */}
                      {isOpen && (
                        <div className="p-1 flex flex-col gap-1">
                          {userShifts.map((shift) => (
                            <div
                              key={shift.id}
                              className={`rounded px-2 py-1 text-xs font-semibold ${detectCategory(shift)}`}
                            >
                              <div>{shift.clientName || shift.name}</div>
                              <div>{shift.startTime} → {shift.endTime}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      {/* COLOR LEGEND */}
<div className="mt-4 flex gap-4 items-center text-m">
  <div className="flex items-center gap-2">
    <span className="w-3 h-3 rounded-sm bg-red-100 border border-red-300"></span>
    <span className="text-red-700">Emergent</span>
  </div>

  <div className="flex items-center gap-2">
    <span className="w-3 h-3 rounded-sm bg-green-100 border border-green-300"></span>
    <span className="text-green-700">Respite</span>
  </div>

  <div className="flex items-center gap-2">
    <span className="w-3 h-3 rounded-sm bg-blue-100 border border-blue-300"></span>
    <span className="text-blue-700">Transportation</span>
  </div>

  <div className="flex items-center gap-2">
    <span className="w-3 h-3 rounded-sm bg-yellow-100 border border-yellow-300"></span>
    <span className="text-yellow-700">Supervised</span>
  </div>
</div>

    </div>
    
  );
}
