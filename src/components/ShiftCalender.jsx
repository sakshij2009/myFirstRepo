import React, { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
 import { getFirestore, collection, query, where, getDocs } from "firebase/firestore";
import { getAuth } from "firebase/auth";


export default function ShiftCalendar({user}) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [shifts, setShifts] = useState([]);

  const fetchShifts = async () => {
    try {
     
     
      console.log("hellooo");
      console.log(user.userId);

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

    // Add empty cells for previous month's days
    for (let i = 0; i < firstDay.getDay(); i++) {
      days.push(null);
    }
    // Add actual month days
    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push(new Date(year, month, d));
    }
    return days;
  };

  const monthDays = getMonthDays();

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const getShiftsForDay = (date) => {
    if (!date) return [];
    return shifts.filter((s) => {
      const shiftDate = new Date(s.startDate);
      return (
        shiftDate.getDate() === date.getDate() &&
        shiftDate.getMonth() === date.getMonth() &&
        shiftDate.getFullYear() === date.getFullYear()
      );
    });
  };

  return (
    <div className="p-6 w-full">
      <div className="flex justify-between items-center mb-4">
        <button onClick={prevMonth}><ChevronLeft /></button>
        <h2 className="text-2xl font-bold">
          {currentDate.toLocaleString("default", { month: "long" })} {currentDate.getFullYear()}
        </h2>
        <button onClick={nextMonth}><ChevronRight /></button>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 text-center font-semibold mb-2">
        {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => (
          <div key={day} className="py-2">{day}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-2">
        {monthDays.map((day, index) => (
          <div key={index} className="min-h-[120px] border rounded p-2 text-sm">
            {day && <div className="font-bold mb-1">{day.getDate()}</div>}

            {/* Shift Items */}
            <div className="flex flex-col gap-1">
              {getShiftsForDay(day).map((shift, i) => (
                <div
                  key={i}
                  className={`p-1 text-xs rounded text-white ${
                    shift.type === "night"
                      ? "bg-blue-500"
                      : shift.type === "evening"
                      ? "bg-orange-400"
                      : "bg-yellow-400 text-black"
                  }`}
                >
                  <div className="flex justify-between items-center w-full">
                    <span className="font-semibold mr-2">{shift.clientName}</span>
                    <span>{shift.startTime} to {shift.endTime}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
