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
import { collection, query, where, onSnapshot, doc, updateDoc, getDocs ,addDoc} from "firebase/firestore";
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




/* ===================== */

export default function Home() {
  const [user, setUser] = useState(null);
  const [shifts, setShifts] = useState([]);
  const [activeTab, setActiveTab] = useState("schedule");

  const [calendarOpen, setCalendarOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());

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


    // 🔔 Register for notifications
    if (parsed?.userId) {
      await registerForPushNotifications(parsed.username);
    }

    // 🔥 Listen to user document in Firestore (real-time)
    const userRef = doc(db, "users", parsed.userId);

    // const unsubscribe = onSnapshot(userRef, (snap) => {
    //   if (snap.exists()) {
    //     setUser({ userId: parsed.userId, ...snap.data() });
    //   }
    // });

    // return unsubscribe;
  };

  loadUser();
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

 // Convert "07 Mar 2025" to Date safely
const parseShiftDate = (str) => {
  if (!str) return null;

  // "10-May-2025"
  if (str.includes("-")) {
    const [dd, mmm, yyyy] = str.split("-");
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const monthIndex = months.indexOf((mmm || "").slice(0, 3));
    if (monthIndex >= 0) return new Date(Number(yyyy), monthIndex, Number(dd));
  }

  // "07 Mar 2025"
  if (str.includes(" ")) {
    const [dd, mmm, yyyy] = str.split(" ");
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const monthIndex = months.indexOf((mmm || "").slice(0, 3));
    if (monthIndex >= 0) return new Date(Number(yyyy), monthIndex, Number(dd));
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

  //////////////////////////////////////
  // Convert "07 Mar 2025" + "09:00" → Date
const parseShiftDateTime = (dateStr, timeStr) => {
  if (!dateStr || !timeStr) return null;

  const date = new Date(dateStr);
  if (isNaN(date)) return null;

  const [h, m] = timeStr.split(":").map(Number);

  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    h || 0,
    m || 0,
    0,
    0
  );
};


const handleTransferClick = (shift) => {
  setSelectedShift(shift);
  setShowTransferModal(true);
};

const handleSubmitTransfer = async (staff, reason) => {
  await requestShiftTransfer({
    shift: selectedShift,
    fromUser: currentUser,
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

  if (!start || !end) return false;

  // Overnight shift fix
  if (end <= start) {
    end = new Date(end.getTime() + 24 * 60 * 60 * 1000);
  }

  return now >= start && now <= end;
};
const activeShift = shifts.find(
  (s) =>
    (s.userId === user?.userId ||
      s?.name?.toLowerCase() === user?.name?.toLowerCase()) &&
    isNowInShift(s)
);

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
    const geo = await Location.reverseGeocodeAsync({
      latitude,
      longitude,
    });

    const place = geo[0];

    const readableAddress = place
      ? `${place.name || ""}, ${place.street || ""}, ${place.city || ""}, ${place.region || ""}, ${place.country || ""}`
      : `${latitude}, ${longitude}`;

    await updateDoc(doc(db, "shifts", activeShift.id), {
      clockIn: new Date().toISOString(),
      clockInLocation: readableAddress,
      clockInCoords: { latitude, longitude }, // ✅ optional but recommended
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
    const geo = await Location.reverseGeocodeAsync({
      latitude,
      longitude,
    });

    const place = geo[0];

    const readableAddress = place
      ? [
          place.name,
          place.street,
          place.city,
          place.region,
          place.country,
        ]
          .filter(Boolean)
          .join(", ")
      : `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;

    // 4️⃣ Save to Firestore
    await updateDoc(doc(db, "shifts", activeShift.id), {
      clockOut: new Date().toISOString(), // ✅ actual time
      clockOutLocation: readableAddress, // ✅ readable address
      clockOutCoords: {
        latitude,
        longitude,
      }, // ✅ for maps / audit
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
                    ? { uri: user.profilePhotoUrl}
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
        />
      )}
      {activeTab === "leave" && (
  <LeaveTab
    onEmergency={() => setShowEmergencyModal(true)}
    onDayOff={() => setShowDayOffModal(true)}
  />
)}

        {activeTab === "transport" && <TransportTab />}
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
          <ShiftCard key={shift.id} shift={shift}  onConfirm={confirmShift}   onTransfer={handleTransferClick}/>
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

function ScheduleTab({ activeShift, onClockIn, onClockOut }) {
  const formatTime = (iso) => {
    if (!iso) return "--";
    return new Date(iso).toLocaleTimeString("en-CA", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <View style={styles.card}>
      {/* Header */}
      <Text style={styles.scheduleTitle}>Time Schedule</Text>

     {/* Current Time */}
<View style={{ marginTop: 10 }}>
  <Text style={styles.label}>CURRENT TIME</Text>
  <Text style={styles.currentTime}>
    {new Date().toLocaleTimeString("en-CA", {
      timeZone: "America/Edmonton",   // ✅ Force Edmonton time
      hour: "2-digit",
      minute: "2-digit",
     
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
          {activeShift?.clockInLocation || "--"}
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
          {activeShift?.clockOutLocation || "--"}
        </Text>
      </View>

      {/* Buttons */}
      <View style={{ flexDirection: "row", gap: 12, marginTop: 14 }}>
        <Pressable
          onPress={onClockIn}
          disabled={!activeShift || activeShift?.clockIn}
          style={[
            styles.greenBtn,
            (!activeShift || activeShift?.clockIn) && {
              backgroundColor: "#9ca3af",
            },
          ]}
        >
          <Text style={styles.btnText}>
            {activeShift?.clockIn ? "Clocked In" : "Clock In"}
          </Text>
        </Pressable>

        <Pressable
          onPress={onClockOut}
          disabled={!activeShift || !activeShift?.clockIn || activeShift?.clockOut}
          style={[
            styles.outlineBtn,
            (!activeShift || activeShift?.clockOut) && {
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
        <Text  style={{ fontSize: 10, fontWeight: "700" }}>
          *Note:You have to apply or inform for the leave two days before.
        </Text>
        
      </View>
    </View>
  );
}


function TransportTab() {
  return (
    <View style={styles.card}>
      <Text style={{ fontWeight: "600" }}>Transportations</Text>
      <Text style={{ fontSize: 22 }}>72¢</Text>
      <Text>Total Rides: 50</Text>
      <Text>CRA Mileage: 4500 KM</Text>
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
