import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getFirestore, collection, query, getDocs } from "firebase/firestore";

export default function AdminShiftCalendar({ onShiftClick }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [shifts, setShifts] = useState([]);
  const [expandedClients, setExpandedClients] = useState({});

  const CATEGORY_COLORS = {
    emergent:      { bg: "bg-red-100",    text: "text-red-800",    hover: "hover:bg-red-200"    },
    respite:       { bg: "bg-green-100",  text: "text-green-800",  hover: "hover:bg-green-200"  },
    transportation:{ bg: "bg-blue-100",   text: "text-blue-800",   hover: "hover:bg-blue-200"   },
    supervised:    { bg: "bg-yellow-100", text: "text-yellow-800", hover: "hover:bg-yellow-200" },
    default:       { bg: "bg-gray-100",   text: "text-gray-700",   hover: "hover:bg-gray-200"   },
  };

  const detectCategory = (shift) => {
    const c = (shift.categoryName || "").toLowerCase();
    if (c.includes("emergent"))  return CATEGORY_COLORS.emergent;
    if (c.includes("respite"))   return CATEGORY_COLORS.respite;
    if (c.includes("transport")) return CATEGORY_COLORS.transportation;
    if (c.includes("supervised"))return CATEGORY_COLORS.supervised;
    return CATEGORY_COLORS.default;
  };

  const getClientColor = (clientShifts) => detectCategory(clientShifts[0]);

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

  // 🧩 GROUP BY DATE → CLIENT
  const groupedShifts = () => {
    const map = {};

    shifts.forEach((shift) => {
      const d = shift.startDate?.toDate
        ? shift.startDate.toDate()
        : new Date(shift.startDate);

      if (isNaN(d)) return;

      const dateKey = d.toISOString().split("T")[0];
      const clientKey =
        shift.clientName ||
        shift.clientDetails?.name ||
        shift.clientDetails?.clientName ||
        "Unknown Client";

      if (!map[dateKey]) map[dateKey] = {};
      if (!map[dateKey][clientKey]) map[dateKey][clientKey] = [];

      map[dateKey][clientKey].push(shift);
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

  const toggleClient = (dateKey, clientKey) => {
    const key = `${dateKey}_${clientKey}`;
    setExpandedClients((prev) => ({
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

      {/* COLOR LEGEND — top */}
      <div className="mb-3 flex gap-4 items-center text-sm flex-wrap">
        {[
          { colors: CATEGORY_COLORS.emergent,       label: "Emergent" },
          { colors: CATEGORY_COLORS.respite,        label: "Respite" },
          { colors: CATEGORY_COLORS.transportation, label: "Transportation" },
          { colors: CATEGORY_COLORS.supervised,     label: "Supervised" },
        ].map(({ colors, label }) => (
          <div key={label} className="flex items-center gap-2">
            <span className={`w-4 h-4 rounded-sm ${colors.bg}`}></span>
            <span className={colors.text}>{label}</span>
          </div>
        ))}
      </div>

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
          const clientsForDay = dateKey ? shiftMap[dateKey] || {} : {};

          return (
            <div key={idx} className="min-h-[150px] border-r border-b border-gray-200 p-1 flex flex-col">
              {day && <div className="text-sm font-bold">{day.getDate()}</div>}

              {/* CLIENTS */}
              <div className="mt-1 flex flex-col gap-1">
                {Object.entries(clientsForDay).map(([clientKey, clientShifts]) => {
                  const expandKey = `${dateKey}_${clientKey}`;
                  const isOpen = expandedClients[expandKey];

                  const clientColor = getClientColor(clientShifts);

                  return (
                    <div key={clientKey} className="rounded overflow-hidden border border-gray-200">
                      {/* CLIENT HEADER — full bg color visible at top always */}
                      <div
                        onClick={() => toggleClient(dateKey, clientKey)}
                        className={`cursor-pointer px-2 py-1 text-xs font-semibold flex justify-between items-center ${clientColor.bg} ${clientColor.text} ${clientColor.hover}`}
                      >
                        <span className="truncate">{clientKey}</span>
                        <span className="ml-1 shrink-0">{isOpen ? "▲" : "▼"}</span>
                      </div>

                      {/* SHIFTS */}
                      {isOpen && (
                        <div className="p-1 flex flex-col gap-1">
                          {clientShifts.map((shift) => {
                            const shiftColor = detectCategory(shift);
                            return (
                              <div
                                key={shift.id}
                                onClick={() => onShiftClick && onShiftClick(shift)}
                                className={`rounded px-2 py-1 text-xs cursor-pointer ${shiftColor.bg} ${shiftColor.text} ${shiftColor.hover}`}
                              >
                                <div className="font-semibold">{shift.name || "—"}</div>
                                <div className="opacity-75">{shift.startTime} → {shift.endTime}</div>
                              </div>
                            );
                          })}
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

    </div>
    
  );
}
