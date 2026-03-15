import {
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { collection, query, where, onSnapshot, doc, updateDoc, getDocs, addDoc } from "firebase/firestore";
import { db } from "../src/firebase/config.jsx";
import { useRouter } from "expo-router";
import * as Location from "expo-location";
import { registerForPushNotifications } from "../src/utils/registerForPushNotifications";
import TransferShiftModal from "../app/TransferShiftModal.jsx";
import { requestShiftTransfer } from "../src/utils/transferService.js";
import ShiftCard from "../src/components/ShiftCard";
import CalendarModal from "../src/components/CalendarModal";
import EmergencyCallModal from "../src/components/EmergencyCallModel.jsx"
import ApplyLeaveModal from "../src/components/ApplyLeaveModal.jsx";
// import { useRouter } from "expo-router";
import { sendNotification } from "../src/utils/notificationHelper.js";
import MonthlyCalendar from "../src/components/MonthlyCalendar";
import * as Notifications from "expo-notifications";




/* ===================== */
// Helper: Get Today's Date in Alberta Time
// This ensures that even if user is in India (Feb 9), the app selects Feb 8 (Alberta Today)
const getAlbertaToday = () => {
  const now = new Date();
  // Get components in Alberta time
  const options = { timeZone: "America/Edmonton", year: 'numeric', month: 'numeric', day: 'numeric' };
  const formatter = new Intl.DateTimeFormat('en-US', options);
  const parts = formatter.formatToParts(now);

  const year = parts.find(p => p.type === 'year').value;
  const month = parts.find(p => p.type === 'month').value;
  const day = parts.find(p => p.type === 'day').value;

  return new Date(year, month - 1, day); // Local midnight
};

export default function Home() {
  const [user, setUser] = useState(null);
  const [shifts, setShifts] = useState([]);
  const [activeTab, setActiveTab] = useState("schedule");

  const [calendarOpen, setCalendarOpen] = useState(false);

  // ✅ Initialize with Alberta Today, NOT Device Today
  const [selectedDate, setSelectedDate] = useState(getAlbertaToday());

  const router = useRouter();
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [selectedShift, setSelectedShift] = useState(null);

  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [showDayOffModal, setShowDayOffModal] = useState(false);




  /* ===== LOAD LOGGED IN USER ===== */
  useEffect(() => {
    const loadUser = async () => {
      const stored = await AsyncStorage.getItem("user");
      if (!stored) return;


      setUser(JSON.parse(stored));
      const parsed = JSON.parse(stored);


      console.log(`[DEBUG] Loaded User ID: ${parsed.userId}, Firestore ID: ${parsed.firestoreId}`);

      // 🔔 Register for notifications
      if (parsed?.firestoreId || parsed?.userId) {
        try {
          await registerForPushNotifications(String(parsed.firestoreId || parsed.userId));
        } catch (err) {
          console.log("[❌] Failed to register push token:", err);
        }
      }

      // 🔥 Listen to user document in Firestore (real-time)
      const userRef = doc(db, "users", parsed.userId || parsed.firestoreId);

      onSnapshot(userRef, (snap) => {
        if (snap.exists()) {
          setUser(prev => ({ ...prev, ...snap.data() }));
        }
      });
    };

    loadUser();

    // 🔔 Setup Notification Categories
    const setupCategories = async () => {
      await Notifications.setNotificationCategoryAsync("SHIFT_END", [
        {
          identifier: "EXTEND_SHIFT",
          buttonTitle: "Yes",
          options: { isAuthenticationRequired: false },
        },
        {
          identifier: "NO_ACTION",
          buttonTitle: "No",
          options: { isDestructive: true },
        },
      ]);
    };
    setupCategories();

    // 🔔 Handle Notification Responses (Background/Foreground)
    const subscription = Notifications.addNotificationResponseReceivedListener(async (response) => {
      const actionId = response.actionIdentifier;
      const shiftId = response.notification.request.content.data?.shiftId;

      if (!shiftId) return;

      if (actionId === "EXTEND_SHIFT") {
        try {
          await updateDoc(doc(db, "shifts", shiftId), {
            extended: true,
            extendedAt: new Date().toISOString(),
          });
          alert("✅ Shift Extended! No auto-clock out will happen.");
        } catch (err) {
          console.log("Error extending shift", err);
        }
      } else if (actionId === "NO_ACTION") {
        // User explicitly said NO. We can either do nothing (let auto-clockout happen)
        // or we can trigger immediate clock-out.
        // For now, let's just acknowledge their choice.
        // console.log("User said NO to extension. Auto clock-out will proceed.");
      }
    });

    return () => subscription.remove();
  }, []);



  /* ===== REAL-TIME SHIFTS FROM FIRESTORE ===== */
  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, "shifts"));

    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

      const regularShifts = data.filter(
        (shift) =>
          shift?.name?.toLowerCase() === user?.name?.toLowerCase() ||
          shift?.userId === user?.userId
      );

      setShifts(regularShifts);
    });

    return () => unsub();
  }, [user]);

  const confirmShift = async (shift) => {
    try {
      const q = query(
        collection(db, "shifts"),
        where("id", "==", shift?.id)   // 👈 match your field name
      );

      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        console.log("❌ No shift found with this ShiftID");
        return;
      }

      // Assuming only ONE document matches
      const docRef = snapshot.docs[0].ref;

      await updateDoc(docRef, {
        shiftConfirmed: true,
      });

      console.log("✅ Shift confirmed successfully!");
    } catch (err) {
      console.log("❌ Error confirming shift", err);
    }
  };



  /* ===== DATE MATCH HELPER ===== */
  const isSameDay = (d1, d2) => {
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    );
  };

  // Convert "07 Mar 2025" OR Firestore Timestamp to Date safely
  const parseShiftDate = (str) => {
    if (!str) return null;

    // 1. Handle Firestore Timestamp (has .toDate())
    if (typeof str.toDate === "function") {
      return str.toDate();
    }

    // 2. Handle JS Date object
    if (str instanceof Date) {
      return str;
    }

    // 3. Handle Strings
    if (typeof str === "string") {
      // "10-May-2025" or "2026-02-08" (ISO-like)
      if (str.includes("-")) {
        // Check if it's "YYYY-MM-DD"
        if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
          const [yyyy, mm, dd] = str.split("-").map(Number);
          return new Date(yyyy, mm - 1, dd);
        }

        const [dd, mmm, yyyy] = str.split("-");
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const monthIndex = months.indexOf((mmm || "").slice(0, 3));
        if (monthIndex >= 0) return new Date(Number(yyyy), monthIndex, Number(dd));
      }

      // "07 Mar 2025"
      if (str.includes(" ")) {
        const [dd, mmm, yyyy] = str.split(" ");
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const monthIndex = months.indexOf((mmm || "").slice(0, 3));
        if (monthIndex >= 0) return new Date(Number(yyyy), monthIndex, Number(dd));
      }
    }

    return null;
  };


  const filteredShifts = shifts.filter((s) => {
    const shiftDate = parseShiftDate(s.startDate);
    if (!shiftDate) return false;

    return isSameDay(shiftDate, selectedDate);
  });


  const totalShifts = shifts.length;
  const pendingShifts = shifts.filter(
    (s) => s.status === "pending"
  ).length;

  // Helper: Parse date string into components {y, m, d}
  // Supports: YYYY-MM-DD, DD-Mmm-YYYY, DD Mmm YYYY
  const getRawDateComponents = (str) => {
    if (!str) return null;
    if (typeof str.toDate === "function") {
      const d = str.toDate();
      return { y: d.getFullYear(), m: d.getMonth(), d: d.getDate() };
    }
    if (str instanceof Date) {
      return { y: str.getFullYear(), m: str.getMonth(), d: str.getDate() };
    }
    if (typeof str !== "string") return null;

    // YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
      const [y, m, d] = str.split("-").map(Number);
      return { y, m: m - 1, d };
    }

    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    let parts;

    if (str.includes("-")) parts = str.split("-");
    else if (str.includes(" ")) parts = str.split(" ");
    else return null;

    // DD-Mmm-YYYY or DD Mmm YYYY
    if (parts.length === 3) {
      const d = Number(parts[0]);
      const m = months.indexOf((parts[1] || "").slice(0, 3));
      const y = Number(parts[2]);
      if (m >= 0) return { y, m, d };
    }
    return null;
  };

  // Helper: Get Absolute Date for Alberta Time (MST/MDT)
  // Logic: Treat input as simple YMD H:m. Convert to UTC timestamp. Add 6h (MDT) or 7h (MST) to get accurate epoch.
  const getAlbertaDate = (dateStr, timeStr) => {
    const comp = getRawDateComponents(dateStr);
    if (!comp) return null;

    let { y, m, d } = comp;
    let h = 0, min = 0;

    if (timeStr) {
      let [hourStr, minStr] = timeStr.split(":");
      h = parseInt(hourStr, 10);
      min = parseInt(minStr, 10) || 0;

      if (timeStr.toLowerCase().includes("pm") && h !== 12) h += 12;
      if (timeStr.toLowerCase().includes("am") && h === 12) h = 0;
    }

    // 1. Create structure as if it's UTC
    const utcTs = Date.UTC(y, m, d, h, min);

    // 2. DST Check (Alberta: 2nd Sun Mar - 1st Sun Nov)
    const march1 = new Date(Date.UTC(y, 2, 1));
    const firstSunMar = 1 + ((7 - march1.getUTCDay()) % 7);
    const secondSunMar = firstSunMar + 7;
    const dstStart = Date.UTC(y, 2, secondSunMar, 2, 0);

    const nov1 = new Date(Date.UTC(y, 10, 1));
    const firstSunNov = 1 + ((7 - nov1.getUTCDay()) % 7);
    const dstEnd = Date.UTC(y, 10, firstSunNov, 2, 0);

    const isDst = (utcTs >= dstStart && utcTs < dstEnd);

    // 3. Offset (MDT = UTC-6, MST = UTC-7)
    // To get from Local(Alberta) to UTC, we ADD offset.
    const offsetHours = isDst ? 6 : 7;
    const finalTs = utcTs + (offsetHours * 60 * 60 * 1000);

    return new Date(finalTs);
  };

  // Convert "07 Mar 2025" + "09:00" → Date (Alberta Time)
  const parseShiftDateTime = (dateStr, timeStr) => {
    return getAlbertaDate(dateStr, timeStr);
  };

  // Check if now is within shift window
  const handleTransferClick = (shift) => {
    setSelectedShift(shift);
    setShowTransferModal(true);
  };

  const handleSubmitTransfer = async (staff, reason) => {
    await requestShiftTransfer({
      shift: selectedShift,
      fromUser: user,
      toStaff: staff,
      reason,
    });

    setShowTransferModal(false);
    setSelectedShift(null);
    alert("Transfer request sent");
  };

  // Check if now is within shift window
  const isNowInShift = (shift) => {
    const now = new Date();

    let start = parseShiftDateTime(shift.startDate, shift.startTime);
    let end = parseShiftDateTime(shift.endDate, shift.endTime);

    if (!start || !end) {
      console.log(`[DEBUG] Invalid dates for shift ${shift.id}:`, { start, end });
      return false;
    }

    // Overnight shift fix
    if (end <= start) {
      end = new Date(end.getTime() + 24 * 60 * 60 * 1000);
    }

    // ✅ Allow 60 mins early clock-in
    const startBuffer = new Date(start.getTime() - 60 * 60 * 1000);

    // ✅ STRICT LOCKOUT: 15 mins after START
    const lockoutTime = new Date(start.getTime() + 15 * 60 * 1000);

    // ✅ Active Window Logic
    // If NOT clocked in: Active only until Lockout Time (Start + 15m)
    // If Clocked IN: Active until End Time + 12h (to allow overtime clock-out)
    const activeEndTime = shift.clockIn
      ? new Date(end.getTime() + 12 * 60 * 60 * 1000)
      : lockoutTime;

    // Basic Active Check
    const isActive = now >= startBuffer && now <= activeEndTime;

    // Special Check: If clocked out, it's no longer "Active" for buttons
    // (But we return true so UI can show "Clocked Out" state if needed)
    if (shift.clockOut) {
      // If we return false, activeShift becomes null, UI hides?
      // We want to show "Clocked Out" button.
      // Let's return true only if it's within "End Time + Buffer"? 
      // Actually, if clocked out, we usually just want to see the status.
      // Let's keep it simple: matches existing logic.
      if (isActive) return true;
    }

    // ⛔ STRICT FIX: If NOT clocked in, and NOW > LOCKOUT, return FALSE.
    // This hides the buttons / sets activeShift to null.
    // WAIT! User wants "Contact Admin" button to appear if late?
    // If we return FALSE, activeShift is null -> "Clock In" (Disabled).
    // If we want "Contact Admin", we must return TRUE (so activeShift exists) 
    // BUT we must flag it as "locked".

    // Let's return true even if late, BUT handle the UI state in ScheduleTab.
    // However, if it is WAY past start (e.g. 5 hours), should we still show it?
    // User said "if its shift time is over then clock in button should reset".
    // Shift Time Over = End Time passed.

    // So:
    // 1. If Now > End: Always FALSE (Reset).
    // 2. If Now > Lockout AND Now < End: TRUE (but Locked).

    if (now > end) {
      return false;
    }

    return true; // If we are here, we are roughly within the shift day (filtered by date)
    // But we need to refine "isActive" to be more specific?
    // actually the filter "filteredShifts" does the date check.
    // This function is "isNowInShift".
    // Let's stick to the previous logic but with stricter bounds.

    // Revised Logic:
    // We need to return TRUE if we are in the "Shift Window" (Start-15 to End).
    // The UI will decide if it is "Locked" or "Active".

    // If Now < Start-60: False (Too Early)
    // If Now > End: False (Too Late / Over)
    // Otherwise: True.

    if (now < startBuffer) return false;

    // If clocked in, extend end time
    const absoluteEnd = shift.clockIn ? new Date(end.getTime() + 12 * 60 * 60 * 1000) : end;
    if (now > absoluteEnd) return false;

    return true;
  };

  // 🔔 SCHEDULE NOTIFICATIONS
  useEffect(() => {
    const schedule = async () => {
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== 'granted') {
        const { status: newStatus } = await Notifications.requestPermissionsAsync();
        if (newStatus !== 'granted') {
          console.log("[🔔] Permission for notifications not granted.");
          return;
        }
      }

      if (!shifts.length) {
        console.log("[🔔] No shifts to schedule.");
        return;
      }

      // Cancel all previous
      await Notifications.cancelAllScheduledNotificationsAsync();

      const now = new Date();

      // Helper for logging in Alberta time
      const logTime = (date) => date.toLocaleTimeString("en-CA", { timeZone: "America/Edmonton" });

      console.log(`[🔔] Scheduling checks at ${logTime(now)} (Alberta Time)`);

      for (const shift of shifts) {
        if (shift.clockIn) continue; // Don't notify if already clocked in!
        if (!shift.startDate || !shift.startTime) continue;

        const start = parseShiftDateTime(shift.startDate, shift.startTime);
        if (!start) continue;

        // Intervals:
        // Positive: Before start (15, 10, 5)
        // Zero: At start
        // Negative: After start (-5, -10, -15) -> stop at -15 as requested
        const intervals = [15, 10, 5, 0, -5, -10, -15];

        for (const mins of intervals) {
          const triggerDate = new Date(start.getTime() - mins * 60 * 1000);

          // Only schedule if in future
          const diff = Math.floor((triggerDate.getTime() - new Date().getTime()) / 1000);

          if (diff > 0) {
            let title = "Upcoming Shift ⏳";
            let body = `Your shift at ${shift.siteAddress || "site"} starts in ${mins} minutes!`;

            if (mins === 0) {
              title = "Shift Starting! 🚀";
              body = `Your shift at ${shift.siteAddress || "site"} is starting NOW! Please clock in.`;
            } else if (mins < 0) {
              title = "Shift Started! ⚠️";
              body = `Your shift at ${shift.siteAddress || "site"} started ${Math.abs(mins)} mins ago. Please clock in!`;
            }

            console.log(`[🔔] Shift ${shift.id}: Start ${logTime(start)}, Trigger ${logTime(triggerDate)} (${mins > 0 ? mins + 'm before' : Math.abs(mins) + 'm after'})`);

            if (diff > 0) {
              await Notifications.scheduleNotificationAsync({
                content: {
                  title,
                  body,
                  sound: true,
                },
                trigger: {
                  type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
                  seconds: diff,
                  repeats: false
                },
              });
            }
          }
        }

        // 🚨 STRICT LATE ALERT (15 mins after start)
        // If not clocked in by 9:15, alert them to Contact Admin.
        const lateTrigger = new Date(start.getTime() + 15 * 60 * 1000);
        const lateDiff = Math.floor((lateTrigger.getTime() - new Date().getTime()) / 1000);

        if (lateDiff > 0) {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: "Shift Locked 🔒",
              body: "You missed the clock-in window. Please contact Admin.",
              sound: true,
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
              seconds: lateDiff,
              repeats: false
            },
          });
        }

        // --- NEW: CLOCK-OUT ALERTS & AUTO LOGIC ---
        // Verify End Time
        if (!shift.endDate || !shift.endTime) continue;
        const end = parseShiftDateTime(shift.endDate, shift.endTime);
        // Fix overnight end date if needed (similar to isNowInShift logic logic, but here assume data is correct or use logic)
        let actualEnd = end;
        if (end <= start) {
          actualEnd = new Date(end.getTime() + 24 * 60 * 60 * 1000);
        }

        // Auto-clockout moved to separate interval for reliability

        // DEBUG: Check why Clock-Out might be skipped
        // console.log(`[?] Shift ${shift.id} State: ClockIn=${!!shift.clockIn}, ClockOut=${!!shift.clockOut}, Extended=${!!shift.extended}`);

        // 2. Schedule Clock-Out Reminders (If not clocked out and not extended)
        // MODIFIED: Also schedule if they forgot to clock in (clockIn is null/false)
        if (!shift.clockOut && !shift.extended) {
          // 15m before end, At End, 5m after, 10m after
          const endIntervals = [15, 0, -5, -10];

          // Debug Log
          console.log(`[🔍] Checking Clock-Out for Shift ${shift.id}: End ${logTime(actualEnd)}, Now ${logTime(now)}`);

          for (const mins of endIntervals) {
            const triggerDate = new Date(actualEnd.getTime() - mins * 60 * 1000);
            const diff = Math.floor((triggerDate.getTime() - new Date().getTime()) / 1000);

            console.log(`   - Interval ${mins}m: Trigger ${logTime(triggerDate)} (Diff: ${diff}s)`);

            if (diff > 0) {
              let title = "Shift Ending Soon ⏳";
              let body = `Your shift ends in ${mins} mins. Please clock out when done. To extend your shift, contact admin.`;

              if (mins === 0) {
                title = "Shift Ended! 🛑";
                body = "Your shift has ended. Please clock out. If you need to extend your shift, contact admin.";
              } else if (mins < 0) {
                title = "Overtime Warning ⚠️";
                body = `Your shift ended ${Math.abs(mins)} mins ago. Please clock out. To extend your shift, contact admin.`;
              }

              console.log(`[🔔-END] Schedule for ${shift.id}: ${logTime(triggerDate)}`);

              if (diff > 0) {
                await Notifications.scheduleNotificationAsync({
                  content: {
                    title,
                    body,
                    categoryIdentifier: "SHIFT_END",
                    data: { shiftId: shift.id }, // Pass ID for action
                    sound: true
                  },
                  trigger: {
                    type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
                    seconds: diff,
                    repeats: false
                  }
                });
              } else if (diff > -900) {
                // Recent Past (< 15 mins): Fire immediately
                await Notifications.scheduleNotificationAsync({
                  content: {
                    title: title + " (Missed)",
                    body: body,
                    categoryIdentifier: "SHIFT_END",
                    data: { shiftId: shift.id }, // Pass ID for action
                    sound: true
                  },
                  trigger: null // Fire immediately
                });
                console.log(`     -> Fired Immediately (Missed by ${Math.abs(diff)}s)`);
              } else {
                console.log(`     -> Skipped (Past)`);
              }
            }
          }
        }

      }
    };

    schedule();
  }, [shifts]);

  // ⏰ PERIODIC CHECK: Auto-Clock Out & Missed Notifications
  useEffect(() => {
    const checkInterval = setInterval(async () => {
      const now = new Date();
      if (!shifts.length) return;

      const logTime = (date) => date.toLocaleTimeString("en-CA", { timeZone: "America/Edmonton" });
      // console.log(`[⏰] Running Periodic Check at ${logTime(now)}`);

      if (shifts.length === 0) {
        console.log(`[⏰] Heartbeat: 0 Shifts Found`);
      }

      for (const shift of shifts) {
        // Only care about active shifts (Not Checked Out)
        // MODIFIED: Proceed even if !shift.clockIn (User might have forgotten)
        if (shift.clockOut) {
          continue; // Already finished
        }

        if (!shift.endDate || !shift.endTime) continue;

        const start = parseShiftDateTime(shift.startDate, shift.startTime);
        const end = parseShiftDateTime(shift.endDate, shift.endTime);
        if (!start || !end) continue;

        let actualEnd = end;
        if (end <= start) {
          actualEnd = new Date(end.getTime() + 24 * 60 * 60 * 1000);
        }

        const minutesLeft = Math.floor((actualEnd.getTime() - now.getTime()) / 60000);
        console.log(`[⏰] Monitor Shift ${shift.id}: Ends ${logTime(actualEnd)} (${minutesLeft} mins left)`);

        /* --- 1. AUTO CLOCK OUT CHECK --- */
        if (!shift.extended) {
          const bufferEnd = new Date(actualEnd.getTime() + 15 * 60 * 1000); // 15m Buffer
          if (now > bufferEnd) {
            // console.log(`[⚠️] Auto Clocking Out Shift ${shift.id} (Past Buffer: ${logTime(bufferEnd)})`);
            try {
              // If ClockIn is missing, we must provide one or Firestore might be weird (optional depending on rules)
              // We'll set it to scheduled Start Time if missing.
              const updates = {
                clockOut: actualEnd.toISOString(),
                clockOutLocation: shift.siteAddress || "Auto Clock Out (System)",
                autoClockedOut: true
              };



              await updateDoc(doc(db, "shifts", String(shift.id)), updates);

              // 🔔 Explicit Notification for Auto-Out
              await Notifications.scheduleNotificationAsync({
                content: {
                  title: "Shift Auto-Completed ✅",
                  body: "You were automatically clocked out.",
                  sound: true
                },
                trigger: null
              });

            } catch (err) {
              console.log(`[❌] Auto Clock Out Failed`, err);
            }
          }
        }

        /* --- 2. MISSED NOTIFICATION CHECK --- */
        // Check if we missed a clock-out notification in the last 60 seconds (or slightly more to be safe)
        if (!shift.extended) {
          const endIntervals = [15, 0, -5, -10];
          for (const mins of endIntervals) {
            const triggerDate = new Date(actualEnd.getTime() - mins * 60 * 1000);
            const diff = (now.getTime() - triggerDate.getTime()) / 1000; // seconds since trigger

            // If trigger was in the past 300 seconds (5 mins) - WIDENED WINDOW
            if (diff >= 0 && diff < 300) {
              console.log(`[⏰] Firing Missed Notification for Shift ${shift.id} (Triggered ${diff}s ago)`);

              let title = "Shift Ending Soon ⏳";
              let body = `Your shift ends in ${mins} mins. Please clock out when done. To extend your shift, contact admin.`;

              if (mins === 0) {
                title = "Shift Ended! 🛑";
                body = "Your shift has ended. Please clock out. If you need to extend your shift, contact admin.";
              } else if (mins < 0) {
                title = "Overtime Warning ⚠️";
                body = `Your shift ended ${Math.abs(mins)} mins ago. Please clock out. To extend your shift, contact admin.`;
              }

              await Notifications.scheduleNotificationAsync({
                content: {
                  title: title + " ( Backup)",
                  body,
                  categoryIdentifier: "SHIFT_END",
                  data: { shiftId: shift.id },
                  sound: true
                },
                trigger: null // Fire immediately
              });
            }
          }
        }

      }
    }, 60000); // Run every 60 seconds

    return () => clearInterval(checkInterval);
  }, [shifts]);
  const activeShift = shifts.find(
    (s) =>
      (s.userId === user?.userId ||
        s?.name?.toLowerCase() === user?.name?.toLowerCase()) &&
      isNowInShift(s)
  );

  // Helper: Round to nearest 15 mins
  const getRoundedDate = (date) => {
    const coeff = 1000 * 60 * 15;
    return new Date(Math.round(date.getTime() / coeff) * coeff);
  };

  const handleClockIn = async () => {
    if (!activeShift || activeShift.clockInLocked) return;

    try {
      // Ask permission
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        console.log("❌ Location permission denied");
        return;
      }

      // Get coordinates
      const loc = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = loc.coords;

      // Reverse geocode
      const geo = await Location.reverseGeocodeAsync({ latitude, longitude });
      const place = geo[0];
      const readableAddress = place
        ? `${place.name || ""}, ${place.street || ""}, ${place.city || ""}, ${place.region || ""}, ${place.country || ""}`
        : `${latitude}, ${longitude}`;

      // ✅ Always store EXACTLY the scheduled shift start time (not actual click time)
      // This means whether you clock in 10 mins early or exactly on time, it records 9:00 AM
      const scheduledStart = parseShiftDateTime(activeShift.startDate, activeShift.startTime);
      const clockInTime = scheduledStart ? scheduledStart.toISOString() : new Date().toISOString();

      await updateDoc(doc(db, "shifts", String(activeShift.id)), {
        clockIn: clockInTime,
        clockInLocation: readableAddress,
        clockInCoords: { latitude, longitude },
        status: "in-progress"
      });
    } catch (err) {
      console.log("Clock In error", err);
    }
  };


  const handleClockOut = async () => {
    if (!activeShift || activeShift.clockOutLocked) return;

    try {
      // 1️⃣ Ask location permission
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        console.log("❌ Location permission denied");
        return;
      }

      // 2️⃣ Get current GPS location
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const { latitude, longitude } = loc.coords;

      // 3️⃣ Reverse geocode → readable address
      const geo = await Location.reverseGeocodeAsync({ latitude, longitude });
      const place = geo[0];
      const readableAddress = place
        ? [place.name, place.street, place.city, place.region, place.country].filter(Boolean).join(", ")
        : `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;

      // ✅ Always store EXACTLY the scheduled shift end time (not actual click time)
      // Whether you clock out early or exactly on time, it records the scheduled end
      const scheduledEnd = parseShiftDateTime(activeShift.endDate, activeShift.endTime);
      const clockOutTime = scheduledEnd ? scheduledEnd.toISOString() : new Date().toISOString();

      // 4️⃣ Save to Firestore
      await updateDoc(doc(db, "shifts", String(activeShift.id)), {
        clockOut: clockOutTime,
        clockOutLocation: readableAddress,
        clockOutCoords: { latitude, longitude },
      });

      console.log("✅ Clock Out successful");
    } catch (err) {
      console.log("❌ Clock Out error", err);
    }
  };

  const handleSubmitLeave = async ({ leaveType, reason, startDate, endDate }) => {
    if (!leaveType || !reason.trim() || !startDate || !endDate) {
      alert("Please fill all fields");
      return;
    }

    try {
      // 1️⃣ Save leave request
      const leaveRef = await addDoc(collection(db, "leaveRequests"), {
        userId: user.userId,
        userName: user.name,
        leaveType,
        reason,
        startDate,
        endDate,
        status: "pending",
        createdAt: new Date(),
      });

      const leaveId = leaveRef.id;

      // 2️⃣ Find admin
      const adminQuery = query(
        collection(db, "users"),
        where("role", "==", "admin")
      );
      const adminSnap = await getDocs(adminQuery);

      if (!adminSnap.empty) {
        const adminId = adminSnap.docs[0].id;

        // 3️⃣ Notify admin
        await sendNotification(adminId, {
          type: "request",
          title: "Leave Request",
          message: `${user.name} requested ${leaveType} leave`,
          senderId: user.userId,

          meta: {
            requestType: "leave",
            leaveId,
            leaveType,
            startDate,
            endDate,
          },
        });
      }

      alert("Leave request sent");
      setShowDayOffModal(false);
    } catch (err) {
      console.error("Leave submit error", err);
      alert("Something went wrong. Try again.");
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f6f7f8" }}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>

        {/* ===== HEADER ===== */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Image
              source={require("../assets/Logo2.png")}
              style={{ width: 34, height: 34 }}
            />
            <Text style={styles.headerTitle}>
              Family Forever Inc.
            </Text>
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            {/* 🔔 Bell */}
            <View style={styles.bell}>
              <MaterialCommunityIcons
                name="bell-outline"
                size={18}
                color="#fff"
              />
            </View>

            {/* 👤 Profile Avatar */}
            <Pressable onPress={() => router.push("/profile")}>
              <Image
                source={
                  user?.profilePhotoUrl
                    ? { uri: user.profilePhotoUrl }
                    : require("../assets/defaultuser.jpg") // fallback image
                }
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  borderWidth: 1,
                  borderColor: "#e5e7eb",
                }}
              />
            </Pressable>
          </View>
        </View>

        <Text style={styles.welcome}>
          Welcome {user?.name || "User"}
        </Text>

        {/* ===== STATS ===== */}
        <View style={{ gap: 12, marginBottom: 18 }}>
          <View style={{ flexDirection: "row", gap: 12 }}>
            {statCard("Total Shifts", totalShifts)}
            {statCard("Pending Shifts", pendingShifts)}
          </View>
          <View style={{ flexDirection: "row", gap: 12 }}>
            {statCard("Avg Hours", "12:00")}
            {statCard("Overtime", "03:00")}
          </View>
        </View>

        {/* ===== TABS ===== */}
        <View style={{ flexDirection: "row", gap: 10, marginBottom: 16 }}>
          {tabBtn("schedule", "Schedule", "clock-outline")}
          {tabBtn("leave", "Leave", "calendar-remove-outline")}
          {tabBtn("transport", "Transport", "car-outline")}
        </View>

        {activeTab === "schedule" && (
          <ScheduleTab
            activeShift={activeShift}
            onClockIn={handleClockIn}
            onClockOut={handleClockOut}
            // Pass simple calculated boolean for late lockout logic
            lateLocked={(() => {
              if (!activeShift || activeShift.clockIn) return false;
              const start = parseShiftDateTime(activeShift.startDate, activeShift.startTime);
              const end = parseShiftDateTime(activeShift.endDate, activeShift.endTime); // Get End too

              if (!start) return false;
              const now = new Date();
              // 15 mins after start (STRICT LOCKOUT)
              const lockTime = new Date(start.getTime() + 15 * 60 * 1000);
              const isLate = now > lockTime;

              // DEBUGGING LATE LOCK
              if (isLate) {
                console.log(`[🔒] LATE LOCKED: Shift ${activeShift.id}`);
                console.log(`     Now: ${now.toLocaleTimeString()}`);
                console.log(`     LockTime: ${lockTime.toLocaleTimeString()}`);

                // If shift is technically OVER, why is it still Active?
                if (end && now > end) {
                  console.log(`     [!!!] ANOMALY: Shift Ended at ${end.toLocaleTimeString()} but isNowInShift returned TRUE?`);
                }
              }

              return isLate;
            })()}
          />
        )}
        {activeTab === "leave" && (
          <LeaveTab
            onEmergency={() => setShowEmergencyModal(true)}
            onDayOff={() => setShowDayOffModal(true)}
          />
        )}

        {activeTab === "transport" && (
          <TransportTab
            user={user}
            transportCount={shifts.filter((s) => {
              const type = (s.typeName || "").toLowerCase().replace(/\s/g, "");
              const cat = (s.categoryName || "").toLowerCase().replace(/\s/g, "");
              return type.includes("transportation") || cat.includes("transportation");
            }).length}
          />
        )}
        {/* ===== MONTHLY CALENDAR (INLINE) ===== */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Monthly Calendar</Text>

          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Pressable
              onPress={() =>
                router.push({
                  pathname: "/Availability",
                  params: {
                    userId: user?.userId,
                    // optional
                    userName: user?.name,
                  },
                })
              }
            >

              <Text style={{ color: "#1f5f3b", fontWeight: "700" }}>
                + Add Availability
              </Text>
            </Pressable>
          </View>
        </View>

        <MonthlyCalendar
          shifts={shifts}               // all shifts (it highlights dates)
          selectedDate={selectedDate}   // current selected
          onSelectDate={(d) => setSelectedDate(d)}
        />


        {/* ===== UPCOMING SHIFTS HEADER ===== */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            Upcoming Shifts
          </Text>

          {/* <Pressable onPress={() => setCalendarOpen(true)}>
            <MaterialCommunityIcons
              name="calendar-month-outline"
              size={22}
              color="#1f5f3b"
            />
          </Pressable> */}
        </View>

        {/* ===== SHIFTS LIST ===== */}
        {filteredShifts.length === 0 && (
          <Text style={{ color: "#6b7280" }}>
            No shifts on selected date
          </Text>
        )}

        {filteredShifts.map((shift) => (
          <ShiftCard key={shift.id} shift={shift} onConfirm={confirmShift} onTransfer={handleTransferClick} />
        ))}
        {/* <Text style={{ fontSize: 18, fontWeight: "bold" }}>
            Shifts Loaded: {filteredShifts.length}
            </Text>

            {shifts.map((s) => (
            <Text key={s.id}>
                {s.name} — {String(s.date)}
            </Text>
            ))} */}

      </ScrollView>

      {/* ===== TRANSFER SHIFT MODAL ===== */}
      <TransferShiftModal
        visible={showTransferModal}
        onClose={() => setShowTransferModal(false)}
        onSubmit={handleSubmitTransfer}
      />



      {/* ===== CALENDAR MODAL ===== */}
      <CalendarModal
        visible={calendarOpen}
        onClose={() => setCalendarOpen(false)}
        onSelect={(date) => {
          setSelectedDate(date);
          setCalendarOpen(false);
        }}
      />
      <EmergencyCallModal
        visible={showEmergencyModal}
        onClose={() => setShowEmergencyModal(false)}
      />
      <ApplyLeaveModal
        visible={showDayOffModal}
        onClose={() => setShowDayOffModal(false)}
        onSubmit={handleSubmitLeave}
      />


    </SafeAreaView>
  );

  function tabBtn(key, label, icon) {
    const active = activeTab === key;
    return (
      <Pressable
        onPress={() => setActiveTab(key)}
        style={[styles.tab, active && styles.tabActive]}
      >
        <MaterialCommunityIcons
          name={icon}
          size={16}
          color={active ? "#fff" : "#111"}
        />
        <Text style={{ color: active ? "#fff" : "#111" }}>
          {label}
        </Text>
      </Pressable>
    );
  }
}

/* ===================== */
/* SUB COMPONENTS */
/* ===================== */

function ScheduleTab({ activeShift, onClockIn, onClockOut, lateLocked }) {
  const formatTime = (iso) => {
    if (!iso) return "--";
    return new Date(iso).toLocaleTimeString("en-CA", {
      timeZone: "America/Edmonton", // ✅ Show times in Edmonton (Canada) local time
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // ✅ Live Clock State
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000); // Update every second

    return () => clearInterval(timer);
  }, []);

  // Helpers removed as lateLocked is passed as prop
  // The logic for lateLocked is calculated in the parent component and passed down.



  return (
    <View style={styles.card}>
      {/* Header */}
      <Text style={styles.scheduleTitle}>Time Schedule</Text>

      {/* Current Time */}
      <View style={{ marginTop: 10 }}>
        <Text style={styles.label}>CURRENT TIME</Text>
        <Text style={styles.currentTime}>
          {now.toLocaleTimeString("en-CA", {
            timeZone: "America/Edmonton",   // ✅ Show current time in Edmonton (Canada)
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit"
          })}
        </Text>
      </View>


      {/* Clock In */}
      <View style={styles.scheduleRow}>
        <View>
          <Text style={styles.rowTitle}>Clock In</Text>
          <Text style={styles.rowSub}>
            {formatTime(activeShift?.clockIn)}
          </Text>
        </View>

        <Text style={styles.locationText}>
          {(activeShift?.clockIn && activeShift?.clockInLocation) || "--"}
        </Text>
      </View>

      {/* Clock Out */}
      <View style={styles.scheduleRow}>
        <View>
          <Text style={styles.rowTitle}>Clock Out</Text>
          <Text style={styles.rowSub}>
            {formatTime(activeShift?.clockOut)}
          </Text>
        </View>

        <Text style={styles.locationText}>
          {(activeShift?.clockOut && activeShift?.clockOutLocation) || "--"}
        </Text>
      </View>

      {/* Buttons */}
      <View style={{ flexDirection: "row", gap: 12, marginTop: 14 }}>
        <Pressable
          onPress={onClockIn}
          disabled={!activeShift || !!activeShift?.clockIn || lateLocked}
          style={[
            styles.greenBtn,
            (!activeShift || !!activeShift?.clockIn || lateLocked) && {
              backgroundColor: "#9ca3af",
            },
          ]}
        >
          <Text style={styles.btnText}>
            {activeShift?.clockIn
              ? "Clocked In"
              : lateLocked
                ? "Contact Admin"
                : "Clock In"}
          </Text>
        </Pressable>

        <Pressable
          onPress={onClockOut}
          disabled={!activeShift || !activeShift?.clockIn || !!activeShift?.clockOut}
          style={[
            styles.outlineBtn,
            (!activeShift || !!activeShift?.clockOut) && {
              borderColor: "#9ca3af",
            },
          ]}
        >
          <Text style={{ textAlign: "center" }}>
            {activeShift?.clockOut ? "Clocked Out" : "Clock Out"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}


function LeaveTab({ onEmergency, onDayOff }) {
  return (
    <View style={styles.card}>
      <Text style={{ fontWeight: "700", fontSize: 16 }}>
        Apply Leave
      </Text>

      <Text style={{ fontSize: 11, color: "#6B7280", marginTop: 8 }}>
        UPCOMING LEAVE
      </Text>

      <Text style={{ fontSize: 20, fontWeight: "700" }}>
        09-04-2025
      </Text>

      <View style={{ marginTop: 12 }}>
        {leaveRow("Leaves Taken", 3)}
        {/* {leaveRow("Sick Leaves", 2)}
        {leaveRow("Paid Leaves", 0)}
        {leaveRow("Earned Leaves", 1)} */}
      </View>



      {/* Buttons */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "flex-end",
          gap: 12,
          marginTop: 14,
        }}
      >
        <Pressable
          onPress={onEmergency}
          style={{
            borderWidth: 1,
            borderColor: "#DC2626",
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 6,
          }}
        >
          <Text style={{ color: "#DC2626", fontWeight: "600" }}>
            Emergency Calls
          </Text>
        </Pressable>

        <Pressable
          onPress={onDayOff}
          style={{
            backgroundColor: "#1f5f3b",
            paddingHorizontal: 14,
            paddingVertical: 6,
            borderRadius: 6,
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "600" }}>
            Day Off
          </Text>
        </Pressable>


      </View>
      <View style={{
        marginTop: 14
      }}>
        <Text style={{ fontSize: 10, fontWeight: "700" }}>
          *Note:You have to apply or inform for the leave two days before.
        </Text>

      </View>
    </View>
  );
}


function TransportTab({ user, transportCount }) {
  const totalKMs = Number(user?.totalKMs) || 0;
  const rateBefore = user?.rateBefore5000km ?? "—";
  const rateAfter = user?.rateAfter5000km ?? "—";
  const isOver5000 = totalKMs >= 5000;
  const activeRate = isOver5000 ? rateAfter : rateBefore;

  return (
    <View style={styles.card}>
      {/* Header */}
      <Text style={{ fontWeight: "700", fontSize: 16, marginBottom: 12 }}>Transportation</Text>

      {/* Rate Row */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <View>
          <Text style={{ fontSize: 11, color: "#9CA3AF", fontWeight: "600" }}>CENTS PER KM</Text>
          <Text style={{ fontSize: 26, fontWeight: "700", color: "#111827", marginTop: 2 }}>
            {activeRate}{typeof activeRate === "number" ? "¢" : ""}
          </Text>
          <Text style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2 }}>
            {isOver5000 ? "after 5,000 km" : "before 5,000 km"}
          </Text>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={{ fontSize: 11, color: "#6B7280" }}>Total KMs</Text>
          <Text style={{ fontSize: 16, fontWeight: "700", color: "#111827" }}>{totalKMs} km</Text>
        </View>
      </View>

      {/* Divider */}
      <View style={{ height: 1, backgroundColor: "#E5E7EB", marginVertical: 10 }} />

      {/* Total Rides */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
        <Text style={{ fontSize: 14, color: "#374151" }}>Total Rides</Text>
        <Text style={{ fontSize: 14, fontWeight: "700", color: "#111827" }}>{transportCount ?? 0}</Text>
      </View>

      {/* CRA Mileage */}
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Text style={{ fontSize: 14, color: "#374151" }}>CRA Mileage Status</Text>
        <Text style={{ fontSize: 14, fontWeight: "700", color: "#111827" }}>{totalKMs} km</Text>
      </View>
    </View>
  );
}

function statCard(label, value) {
  return (
    <View style={styles.stat}>
      <Text style={{ color: "#6b7280", fontSize: 12 }}>
        {label}
      </Text>
      <Text style={{ fontSize: 20, fontWeight: "600" }}>
        {value}
      </Text>
    </View>
  );
}

function leaveRow(label, value) {
  return (
    <View style={styles.rowBetween}>
      <Text>{label}</Text>
      <Text>{value}</Text>
    </View>
  );
}

/* ===================== */
/* STYLES */
/* ===================== */

const styles = {
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  bell: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#1f5f3b",
    alignItems: "center",
    justifyContent: "center",
  },
  welcome: {
    marginBottom: 14,
  },
  stat: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#d1d5db",
  },
  tabActive: {
    backgroundColor: "#1f5f3b",
    borderWidth: 0,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 8,
  },
  greenBtn: {
    flex: 1,
    backgroundColor: "#1f5f3b",
    padding: 12,
    borderRadius: 8,
  },
  outlineBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#d1d5db",
    padding: 12,
    borderRadius: 8,
  },
  btnText: {
    color: "#fff",
    textAlign: "center",
  },
  scheduleTitle: {
    fontSize: 16,
    fontWeight: "600",
  },

  label: {
    fontSize: 11,
    color: "#6b7280",
  },

  currentTime: {
    fontSize: 22,
    fontWeight: "700",
    marginTop: 2,
  },

  scheduleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    marginTop: 8,
  },

  rowTitle: {
    fontSize: 14,
    fontWeight: "500",
  },

  rowSub: {
    fontSize: 13,
    color: "#6b7280",
    marginTop: 2,
  },

  locationText: {
    fontSize: 12,
    color: "#6b7280",
    maxWidth: "45%",
    textAlign: "right",
  },

};
