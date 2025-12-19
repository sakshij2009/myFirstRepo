import { useEffect, useMemo, useRef, useState } from "react";
import { FaPlus } from "react-icons/fa6";
import DashboardContentPage from "./DashboardContentPage";
import { MdAccessTime } from "react-icons/md";
import { CgEnter } from "react-icons/cg";
import { TbLogout2 } from "react-icons/tb";
import { IoChevronDown, IoNotificationsCircle } from "react-icons/io5";
import UserShiftsData from "./UserShiftsData";
import { db } from "../firebase";
import {
  addDoc,
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  Timestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { endOfWeek, isWithinInterval, startOfWeek } from "date-fns";
import CustomCalendar from "./CustomerCalender";
import { sendNotification } from "../utils/notificationHelper";
import NotificationSlider from "../components/NotificationSlider";
import ShiftCalendar from "./ShiftCalender";
import UserTransportationShifts from "./UserTransportationShifts";

// ================== UTIL HELPERS FOR SHIFT TIMES ==================

// Convert shift's date + time into a JS Date
// Handles: "01 Jan 2025" + "21:00" and also Timestamp / Date edge cases
const parseShiftDate = (dateVal, timeStr) => {
  if (!dateVal || !timeStr) return null;

  let baseDate;

  try {
    if (typeof dateVal === "string") {
      // Example: "01 Jan 2025"
      baseDate = new Date(dateVal);
    } else if (dateVal.toDate) {
      // Firestore Timestamp
      baseDate = dateVal.toDate();
    } else if (dateVal instanceof Date) {
      baseDate = dateVal;
    } else {
      return null;
    }

    if (Number.isNaN(baseDate.getTime())) return null;

    const [hoursStr, minsStr] = timeStr.split(":");
    const hours = parseInt(hoursStr, 10) || 0;
    const minutes = parseInt(minsStr, 10) || 0;

    return new Date(
      baseDate.getFullYear(),
      baseDate.getMonth(),
      baseDate.getDate(),
      hours,
      minutes,
      0,
      0
    );
  } catch (e) {
    console.error("Error parsing shift date/time:", e);
    return null;
  }
};

// Compare only hours/minutes of two Date objects
const matchTime = (now, target) => {
  if (!now || !target) return false;
  return (
    now.getHours() === target.getHours() &&
    now.getMinutes() === target.getMinutes()
  );
};

const UserDashboard = ({ user }) => {
  const [activeTab, setActiveTab] = useState("shifts");
  const scrollRef = useRef(null);
  const [isDown, setIsDown] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const [shiftCategory, setShiftCategory] = useState("Shifts");
  const [shiftStatus, setShiftStatus] = useState("");
  const [statusOpen, setStatusOpen] = useState(false);
  const [userShifts, setUserShifts] = useState([]);
  const[userTransportationShift,setUserTransportationShifts]=useState([]);
  const [selectedDates, setSelectedDates] = useState([new Date()]);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [callsModelOpen, setCallsModelOpen] = useState(false);
  const [dayOffOpen, setDayOffOpen] = useState(false);
  const statusOptions = ["All", "Confirmed", "UnConfirmed"];

  const [clockInTime, setClockInTime] = useState(null);
  const [clockOutTime, setClockOutTime] = useState(null);
  const [clockInLocation, setClockInLocation] = useState("____");
  const [clockOutLocation, setClockOutLocation] = useState("____");
  const [loginStatus, setLoginStatus] = useState("Clocked In ✅");
  const [clockInDone, setClockInDone] = useState(false);
  const [clockOutDone, setClockOutDone] = useState(false);

  // lock states controlled by timing engine
  const [lockClockIn, setLockClockIn] = useState(false);
  const [lockClockOut, setLockClockOut] = useState(false);

  const [hasUnread, setHasUnread] = useState(false);
  const [userDocId, setUserDocId] = useState(user.name);
  const [showNotifications, setShowNotifications] = useState(false);

  const [leaveType, setLeaveType] = useState("");
  const [reason, setReason] = useState("");
  const [leaveDates, setLeaveDates] = useState([]);

  // admin id for alerts
  const [adminId, setAdminId] = useState(null);

  // 🔴 Real-time listener for unread notifications
  useEffect(() => {
    const q = query(
      collection(db, "notifications", userDocId, "userNotifications"),
      where("read", "==", false)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      setHasUnread(snapshot.docs.length > 0);
    });

    return () => unsub();
  }, [userDocId]);

  // Fetch admin id
  useEffect(() => {
    const fetchAdmin = async () => {
      try {
        const q = query(collection(db, "users"), where("role", "==", "admin"));
        const snap = await getDocs(q);
        if (!snap.empty) setAdminId(snap.docs[0].id);
      } catch (err) {
        console.error("Error fetching admin:", err);
      }
    };
    fetchAdmin();
  }, []);

  // show current time dynamically (Edmonton timezone)
  const [currentTime, setCurrentTime] = useState("");
  useEffect(() => {
    const updateTime = () => {
      const formatter = new Intl.DateTimeFormat("en-CA", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
        timeZone: "America/Edmonton",
      });
      setCurrentTime(formatter.format(new Date()));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const getUserLocation = async () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) reject("Geolocation not supported");
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          resolve({ latitude, longitude });
        },
        (err) => reject(err.message)
      );
    });
  };

  const getAddressFromCoords = async (lat, lon) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`
      );
      const data = await res.json();
      return data.display_name || `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
    } catch {
      return `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
    }
  };

  const handleMouseDown = (e) => {
    setIsDown(true);
    setStartX(e.pageX - scrollRef.current.offsetLeft);
    setScrollLeft(scrollRef.current.scrollLeft);
  };

  const handleMouseLeave = () => setIsDown(false);
  const handleMouseUp = () => setIsDown(false);

  const handleMouseMove = (e) => {
    if (!isDown) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX) * 1;
    scrollRef.current.scrollLeft = scrollLeft - walk;
  };

  const formatDateToDDMMYYYY = (date) => {
    if (!date) return "—"; // Handle missing or invalid value

    try {
      // Handle Firestore Timestamp, Date, or string
      let d;
      if (date.toDate) {
        d = date.toDate();
      } else if (date instanceof Date) {
        d = date;
      } else if (typeof date === "string") {
        d = new Date(date);
        if (isNaN(d)) {
          // Try parsing formats like "09 Oct 2025"
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

  // ------------ SHIFT TYPE HELPERS ------------
const cleanText = (str) =>
  (str || "")
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^\w+]/g, "");

const isTransportationShift = (shift) => {
  const type = cleanText(shift.typeName);
  const cat = cleanText(shift.categoryName);

  return (
    type.includes("transportation") ||
    cat.includes("transportation")
  );
};

const isSupervisedVisitationShift = (shift) => {
  const type = cleanText(shift.typeName);
  const cat = cleanText(shift.categoryName);

  return (
    type.includes("supervisedvisitation") ||
    cat.includes("supervisedvisitation")
  );
};

// 🔹 Firestore fetch — Get shifts assigned to the logged-in user & filter by status
useEffect(() => {
  const fetchUserShifts = async () => {
    if (!user?.name && !user?.uid) return;
    try {
      const shiftsRef = collection(db, "shifts");
      const snapshot = await getDocs(shiftsRef);
      const allShifts = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));

      // 🔸 Shifts assigned to this user
      let regularShifts = allShifts.filter(
        (shift) =>
          shift.name?.toLowerCase() === user?.name?.toLowerCase() ||
          shift.userId === user?.userId
      );

      // 🔥 Remove transportation shifts from main list
      regularShifts = regularShifts.filter(
        (shift) => !isTransportationShift(shift)
      );

      // 🔥 Status filter applies only on non-transportation shifts
      if (shiftStatus && shiftStatus !== "all") {
        regularShifts = regularShifts.filter((shift) => {
          if (shiftStatus === "Confirmed")
            return shift.shiftConfirmed === true;
          if (shiftStatus === "UnConfirmed")
            return shift.shiftConfirmed === false;
          return true;
        });
      }

      // 🔥 Date filter (applies to main shifts)
      regularShifts = regularShifts.filter((shift) => {
        const dateMatches =
          selectedDates.length === 0 ||
          selectedDates.some((date) => {
            const formattedShiftDate = formatDateToDDMMYYYY(
              shift.startDate?.toDate
                ? shift.startDate.toDate()
                : shift.startDate
            );
            return formattedShiftDate === formatDateToDDMMYYYY(date);
          });
        return dateMatches;
      });

      setUserShifts(regularShifts);

    
      // ------------ TRANSPORTATION SHIFTS ------------
let transportShifts = allShifts.filter((shift) => {
  const assigned =
    shift.name?.toLowerCase() === user?.name?.toLowerCase() ||
    shift.userId === user?.userId;

  return assigned && isTransportationShift(shift);
});

// 🔥 Apply DATE FILTER same as normal shifts
transportShifts = transportShifts.filter((shift) => {
  const dateMatches =
    selectedDates.length === 0 ||
    selectedDates.some((date) => {
      const formattedShiftDate = formatDateToDDMMYYYY(
        shift.startDate?.toDate
          ? shift.startDate.toDate()
          : shift.startDate
      );
      return formattedShiftDate === formatDateToDDMMYYYY(date);
    });

  return dateMatches;
});

setUserTransportationShifts(transportShifts);

    } catch (error) {
      console.error("Error fetching user shifts:", error);
    }
  };

  fetchUserShifts();
}, [user, shiftStatus, selectedDates]);

// (Remove your old userTransportShifts variable completely)


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

  ///////////leave submit////////////////
  const handleSubmitLeave = async () => {
    if (!leaveType || selectedDates.length === 0 || !reason.trim()) {
      alert("Please fill in all fields before submitting.");
      return;
    }

    const startDate = selectedDates[0];
    const endDate = selectedDates[selectedDates.length - 1];

    try {
      // ✅ Save leave request to Firestore
      const leaveRef = await addDoc(collection(db, "leaveRequests"), {
        userId: user.userId,
        userName: user.name,
        leaveType,
        reason,
        startDate: Timestamp.fromDate(startDate),
        endDate: Timestamp.fromDate(endDate),
        status: "pending",
        createdAt: Timestamp.now(),
      });
      const leaveId = leaveRef.id;

      // ✅ Find admin (assuming only one admin)
      const q = query(collection(db, "users"), where("role", "==", "admin"));
      const adminSnap = await getDocs(q);

      if (!adminSnap.empty) {
        const adminIdLeave = adminSnap.docs[0].id;

        // ✅ Send notification to admin
        await sendNotification(adminIdLeave, {
          type: "request",
          title: "Leave Request",
          message: ` ${leaveType} leave from ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}.`,
          senderId: user.name,

          meta: {
            requestType: "leave",
            leaveId,
            leaveType,
            startDate,
            endDate,
          },
        });
      }

      alert("Leave request submitted successfully!");
      setDayOffOpen(false);
      setLeaveType("");
      setReason("");
      setSelectedDates([]);
    } catch (error) {
      console.error("Error submitting leave:", error);
      alert("Failed to submit leave. Try again.");
    }
  };

  // =============== SHIFT FLAGS UPDATE HELPER ===============
  const updateShiftFlags = async (shiftId, data) => {
    try {
      await updateDoc(doc(db, "shifts", shiftId), data);
    } catch (err) {
      console.error("Error updating shift flags:", err);
    }
  };

  // =============== SAVE CLOCK-IN / CLOCK-OUT TO SHIFT DOC ===============
  // This stores rounded (scheduled) times, not actual click time.
  const saveClockTimeToShift = async (shift, type) => {
    try {
      if (!shift?.id) return;

      const shiftRef = doc(db, "shifts", shift.id);

      const timeDate =
        type === "clockIn"
          ? parseShiftDate(shift.startDate, shift.startTime)
          : parseShiftDate(shift.endDate, shift.endTime);

      if (!timeDate || isNaN(timeDate)) return;

      // Store as ISO string to match your existing schema
      const iso = timeDate.toISOString();

      await updateDoc(shiftRef, {
        [type]: iso,
      });

      console.log(`Saved ${type} time for shift ${shift.id}:`, iso);
    } catch (err) {
      console.error("Error saving clock time on shift:", err);
    }
  };

  // =============== ACTIVE SHIFT (BASED ON userId + current time) ===============
  const activeShift = useMemo(() => {
    if (!userShifts.length || !user?.userId) return null;

    const now = new Date();

    return userShifts.find((shift) => {
      if (shift.userId !== user.userId) return false;

      const start = parseShiftDate(shift.startDate, shift.startTime);
      const end = parseShiftDate(shift.endDate, shift.endTime);

      if (!start || !end) return false;

      return now >= start && now <= end;
    });
  }, [userShifts, user?.userId, currentTime]);

  // =============== CLOCK IN / OUT HANDLERS ===============

  const handleClockIn = async () => {
    if (lockClockIn) return; // locked by timing engine

    try {
      const { latitude, longitude } = await getUserLocation();
      const address = await getAddressFromCoords(latitude, longitude);

      const nowStr = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });

      // UI display uses actual click time
      setClockInTime(nowStr);
      setClockInLocation(address);
      setClockInDone(true);
      setLoginStatus("Clocked In ✅");

      // Firestore saves SCHEDULED time (rounded), not exact click
      if (activeShift) {
        await saveClockTimeToShift(activeShift, "clockIn");
      }
    } catch (err) {
      console.error(err);
      alert("Location access required to Clock In.");
    }
  };

  const handleClockOut = async () => {
    if (lockClockOut) return; // locked by timing engine

    try {
      const { latitude, longitude } = await getUserLocation();
      const address = await getAddressFromCoords(latitude, longitude);

      const nowStr = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });

      // UI display uses actual click time
      setClockOutTime(nowStr);
      setClockOutLocation(address);
      setClockOutDone(true);
      setLoginStatus("Clocked Out 🚪");

      // Firestore saves SCHEDULED end time
      if (activeShift) {
        await saveClockTimeToShift(activeShift, "clockOut");
      }
    } catch (err) {
      console.error(err);
      alert("Location access required to Clock Out.");
    }

    setTimeout(() => {
      setClockInDone(false);
      setClockOutDone(false);
    }, 1000);
  };

  // =============== MAIN SHIFT REMINDER / LOCK / AUTO CLOCK-OUT ENGINE ===============
  useEffect(() => {
    if (!activeShift) return;

    const now = new Date();

    const start = parseShiftDate(activeShift.startDate, activeShift.startTime);
    const end = parseShiftDate(activeShift.endDate, activeShift.endTime);

    if (!start || !end) return;

    const beforeStart15 = new Date(start.getTime() - 15 * 60 * 1000);
    const afterStart15 = new Date(start.getTime() + 15 * 60 * 1000);
    const lockClockInAt = new Date(afterStart15.getTime() + 1 * 60 * 1000); // 1 min after final warning

    const beforeEnd15 = new Date(end.getTime() - 15 * 60 * 1000);
    const afterEnd15 = new Date(end.getTime() + 15 * 60 * 1000);

    // ------------- CLOCK-IN SIDE -------------

    // 1) 15 min BEFORE start
    if (matchTime(now, beforeStart15) && !activeShift.beforeStart15) {
      sendNotification(userDocId, {
        type: "shift",
        title: "Upcoming Shift",
        message: `Your shift starts at ${activeShift.startTime}.`,
      });

      updateShiftFlags(activeShift.id, { beforeStart15: true });
    }

    // 2) At START time
    if (matchTime(now, start) && !activeShift.startSent) {
      sendNotification(userDocId, {
        type: "shift",
        title: "Shift Started",
        message: "Your shift has started. Please clock in.",
      });

      updateShiftFlags(activeShift.id, { startSent: true });
    }

    // 3A) 15 min AFTER start → Final Warning (no lock)
    if (
      matchTime(now, afterStart15) &&
      !activeShift.afterStart15 &&
      !clockInDone
    ) {
      sendNotification(userDocId, {
        type: "shift",
        title: "Final Reminder",
        message: "You haven’t clocked in yet. Please clock in now.",
      });

      updateShiftFlags(activeShift.id, { afterStart15: true });
    }

    // 3B) 16 min AFTER start → Disable Clock-In & notify admin
    if (
      matchTime(now, lockClockInAt) &&
      !activeShift.clockInLocked &&
      !clockInDone
    ) {
      setLockClockIn(true);

      // Notify user
      sendNotification(userDocId, {
        type: "shift",
        title: "Clock-In Locked",
        message:
          "You did not clock in on time. Clock-In is now disabled for this shift.",
      });

      // Notify admin
      if (adminId) {
        sendNotification(adminId, {
          type: "alert",
          title: "Clock-In Missed",
          message: `${activeShift.name} did not clock in by ${activeShift.startTime}. Clock-In has been disabled.`,
        });
      }

      updateShiftFlags(activeShift.id, { clockInLocked: true });
    }

    // ------------- CLOCK-OUT SIDE -------------

    // 4) 15 min BEFORE end
    if (matchTime(now, beforeEnd15) && !activeShift.beforeEnd15) {
      sendNotification(userDocId, {
        type: "shift",
        title: "Shift Ending Soon",
        message:
          "Your shift ends in 15 minutes. Please prepare to clock out.",
      });

      updateShiftFlags(activeShift.id, { beforeEnd15: true });
    }

    // 5) At END time
    if (matchTime(now, end) && !activeShift.endSent) {
      sendNotification(userDocId, {
        type: "shift",
        title: "Shift Ended",
        message: "Your shift has ended. Please clock out.",
      });

      updateShiftFlags(activeShift.id, { endSent: true });
    }

    // 6) 15 min AFTER end → AUTO CLOCK-OUT + lock Clock-Out
    if (matchTime(now, afterEnd15) && !activeShift.afterEnd15) {
      if (!clockOutDone) {
        const autoTimeStr = now.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });

        setClockOutTime(autoTimeStr);
        setClockOutLocation("Auto clock-out by system");
        setClockOutDone(true);
        setLockClockOut(true); // now Clock-Out is locked

        // Save scheduled clock-out time to Firestore
        saveClockTimeToShift(activeShift, "clockOut").catch((e) =>
          console.error("Error saving auto clock-out time:", e)
        );

        sendNotification(userDocId, {
          type: "shift",
          title: "Auto Clock-Out",
          message:
            "You were auto clocked out because you did not clock out on time.",
        });

        if (adminId) {
          sendNotification(adminId, {
            type: "alert",
            title: "Auto Clock-Out",
            message: `${activeShift.name} did not clock out. System auto clocked-out the shift.`,
          });
        }
      }

      updateShiftFlags(activeShift.id, {
        afterEnd15: true,
        autoClockOutDone: true,
      });
    }
  }, [
    activeShift,
    currentTime,
    clockInDone,
    clockOutDone,
    userDocId,
    adminId,
  ]);

  return (
    <div className="flex flex-col gap-4 p-1 bg-[#EEEEEE] h-full w-full">
      <div className="flex justify-between text-light-black flex-wrap gap-3">
        <div className="flex items-center flex-wrap">
          <h3 className="font-bold text-[24px] leading-[28px] tracking-[-0.24px]">
            Welcome {user?.name}
          </h3>
        </div>
        <div className="flex gap-4 items-center">
          <div className="flex gap-[8px] items-center flex-wrap">
            <p className="font-bold text-[16px] leading-[24px]">Filter</p>
            <select className="border-[2px] rounded-[6px] font-medium text-[14px] leading-[20px] gap-[10px] focus:outline-none text-light-green p-1 w-full sm:w-auto">
              <option value="" className="text-light-black">
                Weekly
              </option>
              <option value="car" className="text-light-black">
                Monthly
              </option>
              <option value="bike" className="text-light-black">
                Yearly
              </option>
            </select>
          </div>

          <div
            onClick={() => setShowNotifications(true)}
            className="cursor-pointer relative"
          >
            <IoNotificationsCircle className="h-8 w-8 text-dark-green hover:scale-110 transition-transform duration-200" />
            {hasUnread && (
              <span className="absolute top-1 right-1 bg-red-500 rounded-full w-3 h-3 animate-pulse" />
            )}
          </div>
        </div>
      </div>

      {/* Analytics Cards */}
      <div
        ref={scrollRef}
        className="flex overflow-x-scroll gap-[29px] scrollbar-hide select-none h-[78px] shrink-0"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onMouseUp={handleMouseUp}
      >
        {[
          "Total Shifts Pending",
          "Total Shifts Completed",
          "OverTime Hours",
          "Average Working Hours",
        ].map((title, idx) => (
          <div
            key={idx}
            className="flex flex-col bg-white min-w-[180px] sm:min-w-[220px] md:min-w-[251px] h-[78px] gap-[7px] opacity-100 rounded-[8px] border border-gray p-[10px] flex-shrink-0"
          >
            <div className="flex gap-[8px]">
              <img
                src="/images/people.png"
                alt=""
                className="w-[16px] h-[16px]"
              />
              <h3 className="font-normal text-[12px] leading-[16px]">
                {title}
              </h3>
            </div>
            <div className="flex justify-between items-center w-full">
              <p className="font-bold text-[32px] leading-[36px] text-light-black">
                20
              </p>
            </div>
          </div>
        ))}
      </div>

      <hr className="border-t border-gray-300" />

      <div className="flex flex-col bg-[#E4E4E4] gap-4 pt-4 pr-6 pb-4 pl-6 rounded-[4px] h-full w-full text-light-black">
        <div>
          <p className="font-bold text-[24px] leading-7">Statistics</p>
        </div>
        <div className="flex flex-row gap-4 ">
          {/* Time schedule card */}
          <div className="flex flex-col bg-white rounded-[6px] p-4 gap-4 w-70 shadow-md">
            <div className="flex gap-1 items-center">
              <MdAccessTime />
              <p className="font-bold text-[16px] leading-[20px]">
                Time Schedule
              </p>
            </div>

            <div className="flex flex-col">
              <p className="font-bold text-[10px] leading-[20px] text-[#809191]">
                CURRENT TIME (Edmonton)
              </p>
              <div className="flex justify-between items-center">
                <p className="font-bold text-[24px] leading-[24px]">
                  {currentTime}
                </p>
                {/* Info Tooltip */}
                <div className="relative group">
                  {/* Info Icon */}
                  <img
                    src="/images/Info.png"
                    alt="info"
                    className="h-5 w-5 cursor-pointer"
                  />

                  {/* Tooltip */}
                  <div
                    className="
                  absolute right-0 bottom-7.5
                  bg-white text-[#4A4A4A] text-[12px]
                  p-3 rounded-xl shadow-xl w-[280px]
                  opacity-0 pointer-events-none
                  group-hover:opacity-100 group-hover:pointer-events-auto
                  transition-all duration-200
                  z-20
                "
                  >
                    Before 5,000 km, your transportation rate will be charged at
                    72¢ per kilometer. After 5,000 km, the rate will increase to
                    66¢ per kilometer.
                    {/* CURVED ARROW */}
                    <svg
                      className="absolute -bottom-2 right-1 text-white drop-shadow-xl"
                      width="24"
                      height="12"
                      viewBox="0 0 24 12"
                      fill="currentColor"
                    >
                      <path d="M12 12L0 0H24L12 12Z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            <hr className="border-t border-gray-300" />

            <div className="flex flex-col gap-[14px]">
              {/* Clock In Info */}
              <div className="flex flex-col">
                <div className="flex justify-between">
                  <p className="font-normal text-[14px] leading-[20px]">
                    Clock In
                  </p>
                  <p className="font-bold text-[14px] leading-[20px]">
                    {clockInTime || "--:--"}
                  </p>
                </div>
                <div className="flex justify-between">
                  <p className="font-normal text-[10px] leading-[20px]">
                    Location
                  </p>
                  <p
                    className="font-bold text-[10px] leading-[20px] text-right truncate w-[180px]"
                    title={clockInLocation}
                  >
                    {clockInLocation}
                  </p>
                </div>
              </div>

              {/* Clock Out Info */}
              <div className="flex flex-col">
                <div className="flex justify-between">
                  <p className="font-normal text-[14px] leading-[20px]">
                    Clock Out
                  </p>
                  <p className="font-bold text-[14px] leading-[20px]">
                    {clockOutTime || "--:--"}
                  </p>
                </div>
                <div className="flex justify-between">
                  <p className="font-normal text-[10px] leading-[20px]">
                    Location
                  </p>
                  <p
                    className="font-bold text-[10px] leading-[20px] text-right truncate w-[180px]"
                    title={clockOutLocation}
                  >
                    {clockOutLocation}
                  </p>
                </div>
              </div>

            <hr className="border-t border-gray-300" />

            {/* Buttons */}
            <div className="flex gap-[20px] justify-end">
              {/* Clock In Button */}
              <button
                onClick={handleClockIn}
                disabled={clockInDone || lockClockIn}
                className={`flex items-center gap-2 py-[6px] px-3 rounded text-[14px] border transition ${
                  clockInDone || lockClockIn
                    ? "bg-gray-100 text-gray-400 border-gray-400 cursor-not-allowed"
                    : "bg-[#1D5F33] text-white border-[#1D5F33]"
                }`}
              >
                <CgEnter />{" "}
                {clockInDone
                  ? "Clocked In"
                  : lockClockIn
                  ? "Clock-In Locked"
                  : "Clock In"}
              </button>

              {/* Clock Out Button */}
              <button
                onClick={handleClockOut}
                disabled={clockOutDone || lockClockOut}
                className={`flex items-center gap-2 py-[6px] px-3 rounded text-[14px] border transition ${
                  clockOutDone || lockClockOut
                    ? "bg-gray-100 text-gray-400 border-gray-400 cursor-not-allowed"
                    : "bg-white text-red-600 border-red-500"
                }`}
              >
                <TbLogout2 />{" "}
                {clockOutDone
                  ? "Clocked Out"
                  : lockClockOut
                  ? "Clock-Out Locked"
                  : "Clock Out"}
              </button>
            </div>
          </div>
        </div>

          {/* Apply Leave */}
          <div className="flex flex-col bg-white rounded-[6px] p-4 gap-4 w-70">
            <div className="flex gap-1">
              <img src="/images/leave.png" alt="" className="h-4 w-4" />
              <p className="font-bold text-[16px] leading-[20px]">Apply Leave</p>
            </div>
            <div className="flex flex-col">
              <p className="font-bold text-[10px] leading-[20px] text-[#809191] ">
                UPCOMING LEAVE
              </p>
              <p className="font-bold text-[24px] leading-[24px]">
                02-09-2025
              </p>
            </div>
            <hr className="border-t border-gray-300" />

            <div className="flex flex-col gap-1">
              <div className="flex justify-between">
                <p className="font-normal text-[14px] leading-[20px]">
                  Casual Leaves
                </p>
                <p className="font-bold text-[14px] leading-[20px]">3</p>
              </div>
              <div className="flex justify-between">
                <p className="font-normal text-[14px] leading-[20px]">
                  Sick Leaves
                </p>
                <p className="font-bold text-[14px] leading-[20px]">3</p>
              </div>
              <div className="flex justify-between">
                <p className="font-normal text-[14px] leading-[20px]">
                  Earned Leaves
                </p>
                <p className="font-bold text-[14px] leading-[20px]">3</p>
              </div>
              <div className="flex justify-between">
                <p className="font-normal text-[14px] leading-[20px]">
                  Paid Leaves
                </p>
                <p className="font-bold text-[14px] leading-[20px]">3</p>
              </div>
            </div>
            <hr className="border-t border-gray-300" />
            <div className="flex gap-[20px] justify-end">
              <div
                className="border border-[#940730] text-[#D20F48] rounded py-1 px-3 text-[14px] font-medium cursor-pointer"
                onClick={() => setCallsModelOpen(true)}
              >
                On Call
              </div>
              <div
                className=" bg-dark-green text-white rounded py-1 px-3 text-[14px] font-medium cursor-pointer"
                onClick={() => setDayOffOpen(true)}
              >
                Day Off
              </div>
            </div>
          </div>

          {/* Transportations */}
          <div className="flex flex-col bg-white rounded-[6px] p-4 gap-3  w-70">
            <div className="flex gap-1">
              <img src="/images/clock.png" alt="" />
              <p className="font-bold text-[16px] leading-[20px]">
                Transportations
              </p>
            </div>
            <div className="flex flex-col mb-1">
              <p className="font-bold text-[10px] leading-[20px] text-[#809191]">
                Cents Per Kilometer
              </p>

              <div className="flex justify-between items-center">
                <p className="font-bold text-[24px] leading-[24px] flex items-end gap-1">
                  72
                  <span className="text-[#809191] text-[10px] justify-end">
                    4500 KM
                  </span>
                </p>

                {/* Info Tooltip */}
                <div className="relative group">
                  {/* Info Icon */}
                  <img
                    src="/images/Info.png"
                    alt="info"
                    className="h-5 w-5 cursor-pointer"
                  />

                  {/* Tooltip */}
                  <div
                    className="
                  absolute right-0 bottom-7.5
                  bg-white text-[#4A4A4A] text-[12px]
                  p-3 rounded-xl shadow-xl w-[280px]
                  opacity-0 pointer-events-none
                  group-hover:opacity-100 group-hover:pointer-events-auto
                  transition-all duration-200
                  z-20
                "
                  >
                    Before 5,000 km, your transportation rate will be charged at
                    72¢ per kilometer. After 5,000 km, the rate will increase to
                    66¢ per kilometer.
                    {/* CURVED ARROW */}
                    <svg
                      className="absolute -bottom-2 right-1 text-white drop-shadow-xl"
                      width="24"
                      height="12"
                      viewBox="0 0 24 12"
                      fill="currentColor"
                    >
                      <path d="M12 12L0 0H24L12 12Z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            <hr className="border-t border-gray-300" />
            <div className="flex flex-col gap-[1px] h-25">
              <div className="flex justify-between">
                <p className="font-normal text-[14px] leading-[20px]">
                  Total Rides
                </p>
                <p className="font-bold text-[14px] leading-[20px]">50</p>
              </div>

              <div className="flex justify-between">
                <p className="font-normal text-[14px] leading-[20px]">
                  CRA Mileage Status
                </p>
                <p className="font-bold text-[14px] leading-[20px]">4500</p>
              </div>
            </div>
            <hr className="border-t border-gray-300" />
          </div>
        </div>

        {/* Bottom section: Shifts / Calendar */}
        <div className="flex flex-col gap-4">
          {/* Data section */}
          <div>
            <div className="flex items-center justify-between gap-6 border-b border-gray-300">
              <div className="flex gap-5">
                <div
                  onClick={() => setShiftCategory("Shifts")}
                  className={`pb-2 text-sm font-medium cursor-pointer ${
                    shiftCategory === "Shifts"
                      ? "text-dark-green border-b-2 border-dark-green font-bold"
                      : "text-light-black font-bold"
                  }`}
                >
                  Shifts({userShifts.length})
                </div>
                <div
                  onClick={() => setShiftCategory("Calendar")}
                  className={`pb-2 text-sm font-medium cursor-pointer ${
                    shiftCategory === "Calender"
                      ? "text-dark-green border-b-2 border-dark-green font-bold"
                      : "text-light-black font-bold"
                  }`}
                >
                  Calendar
                </div>
                <div
                  onClick={() => setShiftCategory("Transportation")}
                  className={`pb-2 text-sm font-medium cursor-pointer ${
                    shiftCategory === "Transportation"
                      ? "text-dark-green border-b-2 border-dark-green font-bold"
                      : "text-light-black font-bold"
                  }`}
                >
                  Transportations({userTransportationShift.length})
                </div>
              </div>
              <div className="flex gap-4">
                <div className="relative flex gap-3 items-center">
                  <p className="font-bold text-[16px] leading-[24px]">
                    Calendar
                  </p>
                  <button
                    type="button"
                    onClick={() => setCalendarOpen((v) => !v)}
                    className="flex items-center gap-2 px-3 py-0.5 rounded border border-light-green text-light-green"
                  >
                    <span className="text-sm font-medium">
                      {calendarBadge}
                    </span>
                    <IoChevronDown />
                  </button>

                  {calendarOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setCalendarOpen(false)}
                      />
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

                <div className="flex items-center">|</div>
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
                      <div
                        onClick={() => setStatusOpen(false)}
                        className="fixed inset-0 z-40"
                      />
                      <div className="absolute right-[4px] top-[40px] w-40 bg-white border border-gray-200 shadow-lg rounded-md z-50">
                        <ul className="py-1">
                          {statusOptions.map((status) => (
                            <li
                              key={status}
                              className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-light-black text-sm"
                              onClick={() => {
                                setShiftStatus(
                                  status === "All" ? "" : status
                                );
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
            </div>
          </div>

          {/* All shifts grid */}
          <div className="min-h-[400px]">
          {shiftCategory === "Shifts" && (
            <UserShiftsData userShifts={userShifts} />
          )}

          {shiftCategory === "Calendar" && (
            <ShiftCalendar user={user} />
          )}

          {shiftCategory === "Transportation" && (
            <UserTransportationShifts filteredShifts={userTransportationShift} />
          )}
        </div>
        </div>
      </div>

      {/* On Call modal */}
      {callsModelOpen && (
        <div className="fixed inset-0 bg-black/40 z-10 flex items-center justify-center">
          <div className="flex flex-col gap-1 rounded-[8px] p-3 w-60 bg-white">
            <div className="flex justify-between items-center">
              <p>On Calls (Emergency)</p>
              <p
                onClick={() => setCallsModelOpen(false)}
                className="cursor-pointer font-medium"
              >
                X
              </p>
            </div>

            <hr className="border-t border-gray-300" />

            <div className="flex flex-col gap-[10px] text-light-black mt-2">
              <div className="flex flex-col gap-1">
                <p className="font-normal text-[14px] leading-[20px]">
                  Family Forever
                </p>
                <p className="font-medium text-[14px] leading-[20px] text-dark-green">
                  +1 416-555-0199
                </p>
                <p className="font-medium text-[14px] leading-[20px] text-dark-green">
                  +1 416-555-0199
                </p>
              </div>

              <div className="flex flex-col gap-1">
                <p className="font-normal text-[14px] leading-[20px]">
                  Agency
                </p>
                <p className="font-medium text-[14px] leading-[20px] text-dark-green">
                  +1 416-555-0199
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Leave modal */}
      {dayOffOpen && (
        <div className="fixed inset-0 bg-black/40 z-10 flex items-center justify-center">
          <div className="flex flex-col gap-2 rounded-[8px] bg-white w-[565px] overflow-y-scroll max-h-[630px]">
            {/* Header */}
            <div className="flex bg-dark-green text-white py-2 px-6 font-bold text-[20px] rounded-t-[8px]">
              <p>Apply Leave</p>
            </div>

            {/* Form Body */}
            <div className="flex flex-col gap-4 text-light-black p-4">
              {/* Leave Type */}
              <div className="flex flex-col gap-[6px]">
                <label className="font-bold text-[14px] leading-[20px]">
                  Leave Type
                </label>
                <select
                  value={leaveType}
                  onChange={(e) => setLeaveType(e.target.value)}
                  className="border border-light-gray rounded p-[10px] text-[14px] font-normal"
                >
                  <option value="">Select Leave Type</option>
                  <option value="Casual">Casual Leave</option>
                  <option value="Earned">Earned Leave</option>
                  <option value="Sick">Sick Leave</option>
                  <option value="Paid">Paid Leave</option>
                </select>
              </div>

              {/* Choose Date */}
              <div className="flex flex-col gap-[6px] text-light-black">
                <label className="font-bold text-[14px] leading-[20px]">
                  Choose Date
                </label>

                <div className="flex gap-4">
                  {/* Left: Calendar */}
                  <div className="flex-1">
                    <CustomCalendar
                      selectedDates={selectedDates}
                      onDatesChange={setSelectedDates}
                      onClose={() => {}}
                    />
                  </div>

                  {/* Right: Start / End Date */}
                  <div className="flex flex-1 flex-col gap-4">
                    <div>
                      <label className="text-[14px] font-bold">
                        Start Date
                      </label>
                      <input
                        type="text"
                        value={
                          selectedDates?.[0]
                            ? selectedDates[0].toLocaleDateString()
                            : "Start Date"
                        }
                        readOnly
                        className="border border-light-gray rounded w-full px-3 py-2 text-[14px]"
                      />
                    </div>

                    <div>
                      <label className="text-[14px] font-medium">
                        End Date
                      </label>
                      <input
                        type="text"
                        value={
                          selectedDates?.[selectedDates.length - 1]
                            ? selectedDates[
                                selectedDates.length - 1
                              ].toLocaleDateString()
                            : "End Date"
                        }
                        readOnly
                        className="border border-light-gray rounded w-full px-3 py-2 text-[14px]"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Reason for Leave */}
              <div className="flex flex-col gap-2">
                <label className="font-bold text-[14px] leading-[20px]">
                  Reason for Leave
                </label>
                <textarea
                  placeholder="Reason for leave"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  className="border border-gray-300 rounded-md px-3 py-2 text-[14px] resize-none focus:outline-none focus:border-dark-green"
                ></textarea>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setDayOffOpen(false)}
                  className="px-4 py-2 border border-dark-green rounded-md text-dark-green font-medium text-[14px] hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitLeave}
                  className="px-4 py-2 bg-dark-green text-white rounded-md font-medium text-[14px] hover:bg-green-800 cursor-pointer"
                >
                  Submit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ✅ Notification Slider */}
      {showNotifications && (
        <div
          className={`fixed top-0 right-0 h-full w-[400px] bg-white shadow-lg z-50 transform transition-transform duration-500 ${
            showNotifications ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <NotificationSlider
            onClose={() => setShowNotifications(false)}
            userId={userDocId}
          />
        </div>
      )}
    </div>
  );
};

export default UserDashboard;
