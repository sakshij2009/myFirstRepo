import {
  View,
  Text,
  ScrollView,
  Pressable,
  Modal,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect, useState, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import {
  collection,
  query,
  onSnapshot,
  getDocs,
  where,
  updateDoc,
  doc,
  addDoc,
  serverTimestamp
} from "firebase/firestore";
import { db } from "../src/firebase/config";
import { registerForPushNotifications } from "../src/utils/registerForPushNotifications";
import {
  safeString,
  formatCanadaTime,
  parseDate as parseDateFn,
  formatShiftTimeUTCtoCanada,
  formatDateKey,
  getEdmontonToday,
  formatEdmontonISO,
  parseDate
} from "../src/utils/date";
import { router } from "expo-router";
import * as Location from "expo-location";

const PRIMARY_GREEN = "#1F6F43";
const LIGHT_GREEN = "#F0FDF4";
const STATS_BG = "#F0FDF4"; // Light green for stats
const DARK_TEXT = "#1A1A1A";
const GRAY_TEXT = "#6B7280"; // Refined gray
const GRAY_BORDER = "rgba(0, 0, 0, 0.08)";
const ACCENT_YELLOW = "#FEF9C3"; // Banner yellow
const TEXT_YELLOW = "#854D0E"; // Darker brown/yellow
const BADGE_BLUE = "#EFF6FF";
const TEXT_BLUE = "#1D4ED8";
const ERROR_RED = "#EF4444";

const ALLOWED_CATEGORIES = [
  "Respite Care",
  "Emergent Care",
  "Emergency Care",
  "Supervised Visitation",
  "Transportation",
];

const serviceTypeStyles = {
  "Respite Care": { bg: "#EFF6FF", text: "#1D4ED8" },
  "Emergent Care": { bg: "#FEF2F2", text: "#991B1B" },
  "Emergency Care": { bg: "#FEF2F2", text: "#991B1B" },
  "Supervised Visitation": { bg: "#F3F0FF", text: "#5B21B6" },
  "Transportation": { bg: "#FEF9C3", text: "#854D0E" },
  default: { bg: "#F3F4F6", text: "#6B7280" },
};

const getRoundedTime = () => {
  const coeff = 1000 * 60 * 15;
  const rounded = new Date(Math.round(new Date().getTime() / coeff) * coeff);
  return rounded.toLocaleTimeString("en-US", { 
    hour: "2-digit", 
    minute: "2-digit", 
    hour12: true,
    timeZone: "America/Edmonton" 
  });
};

const getLocationString = async () => {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") return "Location unavailable";
    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    const geocode = await Location.reverseGeocodeAsync({
      latitude: loc.coords.latitude,
      longitude: loc.coords.longitude,
    });
    if (geocode.length > 0) {
      const g = geocode[0];
      return `${g.streetNumber || ""} ${g.street || g.name || ""}, ${g.city || ""}`.trim();
    }
    return `Lat: ${loc.coords.latitude.toFixed(4)}, Lon: ${loc.coords.longitude.toFixed(4)}`;
  } catch {
    return "Location unavailable";
  }
};

const sendNotification = async (receiverId, payload) => {
  try {
    await addDoc(collection(db, "notifications", receiverId, "userNotifications"), {
      ...payload,
      read: false,
      status: "pending",
      createdAt: serverTimestamp(),
    });
  } catch (e) {
    console.warn("Notification failed:", e);
  }
};

const calcDuration = (start, end) => {
  if (!start || !end) return "—";
  const parseTime = (t) => {
    if (!t) return 0;
    const [time, period] = t.split(" ");
    let [h, m] = time.split(":").map(Number);
    if (period?.toUpperCase() === "PM" && h !== 12) h += 12;
    if (period?.toUpperCase() === "AM" && h === 12) h = 0;
    return h + (m || 0) / 60;
  };
  const diff = parseTime(end) - parseTime(start);
  const hours = diff > 0 ? diff : diff + 24;
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return m > 0 ? `${h}h ${m}m` : `${h} hrs`;
};

const formatShiftDate = (dateStr) => {
  const d = parseDate(dateStr);
  if (!d) return safeString(dateStr) || "\u2014";
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const t = new Date(d); t.setHours(0, 0, 0, 0);
  const diff = (t - today) / 86400000;
  const day = d.getDate();
  const month = d.toLocaleDateString("en-US", { month: "short" });
  const weekday = d.toLocaleDateString("en-US", { weekday: "short" });
  if (diff === 0) return `Today, ${month} ${day}`;
  if (diff === 1) return `Tomorrow, ${month} ${day}`;
  if (diff === -1) return `Yesterday, ${month} ${day}`;
  return `${weekday}, ${month} ${day}`;
};

const isNumericId = (val) => val && /^\d+$/.test(String(val)) && String(val).length > 8;

function shortAddr(addr) {
  if (!addr) return null;
  const s = safeString(addr);
  const part = s.split(",")[0].trim();
  return part.length > 12 ? part.slice(0, 11) + "…" : part;
}

function RoutePreview({ shift }) {
  const pt = Array.isArray(shift.shiftPoints) && shift.shiftPoints[0];
  const pickup = shortAddr(pt?.pickupLocation || shift.pickupLocation);
  const visit = shortAddr(pt?.visitLocation || shift.visitLocation);
  const drop = shortAddr(pt?.dropLocation || shift.dropLocation);
  if (!pickup && !drop) return null;

  const stops = [
    pickup && { label: pickup, color: "#1F6F43", icon: "navigate" },
    visit && { label: visit, color: "#1E5FA6", icon: "business" },
    drop && { label: drop, color: "#DC2626", icon: "flag" },
  ].filter(Boolean);

  return (
    <View style={{ flexDirection: "row", alignItems: "center", marginTop: 12, marginBottom: 2, gap: 6 }}>
      {stops.map((s, i) => (
        <View key={i} style={{ flexDirection: "row", alignItems: "center", maxWidth: "33%" }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 3, flexShrink: 1 }}>
            <Ionicons name={s.icon} size={13} color={s.color} />
            <Text style={{ fontSize: 11, color: "#4B5563", fontFamily: "Inter" }} numberOfLines={1}>
              {s.label}
            </Text>
          </View>
          {i < stops.length - 1 && (
            <Text style={{ fontSize: 10, color: "#D1D5DB", marginHorizontal: 4 }}>·</Text>
          )}
        </View>
      ))}
    </View>
  );
}

export default function Home() {
  const [user, setUser] = useState(null);
  const [shifts, setShifts] = useState([]);
  const [confirmAction, setConfirmAction] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [stats, setStats] = useState({ total: 0, hours: 0, completed: 0 });

  useEffect(() => {
    const loadUser = async () => {
      const stored = await AsyncStorage.getItem("user");
      if (!stored) return;
      const parsed = JSON.parse(stored);
      setUser(parsed);
      if (parsed?.userId) registerForPushNotifications(parsed.username);
    };
    loadUser();
  }, []);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "shifts"));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const userShifts = data.filter((s) => {
        const nameMatch = s?.name?.toLowerCase() === user?.name?.toLowerCase();
        const userMatch = s?.userId === user?.userId || s?.staffId === user?.userId;
        const category = s?.category || s?.categoryName || s?.serviceType;
        const isValidCategory = !category || ALLOWED_CATEGORIES.includes(category);
        return (nameMatch || userMatch) && isValidCategory;
      });
      setShifts(userShifts);
    });
    return () => unsub();
  }, [user]);

  const todayKey = formatEdmontonISO(new Date());

  const todayShifts = shifts.filter((s) => {
    const d = parseDateFn(s.startDate);
    if (!d) return false;
    return formatDateKey(d) === todayKey;
  });

  const upcomingShifts = shifts.filter((s) => {
    const d = parseDateFn(s.startDate);
    if (!d) return false;
    // Compare dates properly
    const shiftDate = new Date(d);
    shiftDate.setHours(0, 0, 0, 0);
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);
    return shiftDate.getTime() > todayDate.getTime();
  }).sort((a, b) => {
    const da = parseDateFn(a.startDate);
    const db = parseDateFn(b.startDate);
    return (da || 0) - (db || 0);
  }).slice(0, 3);

  const calcTotalHours = (shiftList) => {
    let total = 0;
    shiftList.forEach((s) => {
      try {
        const parseTime = (t) => {
          if (!t) return 0;
          const [time, period] = t.split(" ");
          let [h, m] = time.split(":").map(Number);
          if (period?.toUpperCase() === "PM" && h !== 12) h += 12;
          if (period?.toUpperCase() === "AM" && h === 12) h = 0;
          return h + (m || 0) / 60;
        };
        const diff = parseTime(s.endTime) - parseTime(s.startTime);
        total += diff > 0 ? diff : diff + 24;
      } catch {}
    });
    return Math.round(total * 10) / 10;
  };

  useEffect(() => {
    const now = new Date();
    const currentMonthShifts = shifts.filter((s) => {
      const d = parseDateFn(s.startDate);
      if (!d) return false;
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    
    const countCompleted = currentMonthShifts.filter((s) => s.clockOutTime || s.clockOut || s.status === "completed").length;
    
    setStats({
      total: currentMonthShifts.length,
      hours: calcTotalHours(currentMonthShifts),
      completed: countCompleted,
    });
  }, [shifts]);

  const handleConfirmAction = async () => {
    if (!confirmAction || !confirmAction.shift) return;
    setIsProcessing(true);
    const { type, shift } = confirmAction;

    try {
      const ref = doc(db, "shifts", shift.id);

      if (type === "confirm") {
        await updateDoc(ref, {
          shiftConfirmed: true,
          confirmedAt: new Date().toISOString(),
          confirmedBy: user?.name || user?.username,
        });
        await sendNotification(user?.username || user?.userId, {
          title: "Shift Confirmed",
          message: `You confirmed your ${shift.category || "shift"} on ${formatShiftDate(shift.startDate)}.`,
          type: "schedule",
          category: "Schedule",
          icon: "checkmark-circle",
          iconColor: PRIMARY_GREEN,
          iconBg: "#F0FDF4",
        });
      } else if (type === "clockIn") {
        const roundedTime = getRoundedTime();
        const locationStr = await getLocationString();
        await updateDoc(ref, {
          clockInTime: roundedTime,
          clockInDate: new Date().toISOString(),
          clockInLocation: locationStr,
        });
        await sendNotification(user?.username || user?.userId, {
          title: "Clocked In ✓",
          message: `Clocked in at ${roundedTime} for ${shift.category || "shift"}. Location: ${locationStr}`,
          type: "shift",
          category: "Shifts",
          icon: "time-outline",
          iconColor: PRIMARY_GREEN,
          iconBg: "#F0FDF4",
        });
        
        const catRaw = shift.category || shift.categoryName || shift.serviceType || shift.shiftCategory || "";
        const catLower = safeString(catRaw).toLowerCase();
        if (catLower.includes("transportation") || catLower.includes("supervised") || catLower.includes("visitation")) {
          setIsProcessing(false);
          setConfirmAction(null);
          router.push({ pathname: "/transportation-shift-detail", params: { shiftId: shift.id } });
          return;
        }
      } else if (type === "clockOut") {
        const roundedTime = getRoundedTime();
        const locationStr = await getLocationString();
        await updateDoc(ref, {
          clockOutTime: roundedTime,
          clockOutDate: new Date().toISOString(),
          clockOutLocation: locationStr,
        });
        await sendNotification(user?.username || user?.userId, {
          title: "Shift Completed ✓",
          message: `Clocked out at ${roundedTime}. Great work on your ${shift.category || "shift"}!`,
          type: "shift",
          category: "Shifts",
          icon: "checkmark-circle",
          iconColor: "#10B981",
          iconBg: "#F0FDF4",
        });
      }
    } catch (e) {
      console.error("Action error:", e);
    }

    setIsProcessing(false);
    setConfirmAction(null);
  };

  const getInitials = (name) => {
    if (!name) return "—";
    return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  };

  const getServiceColor = (service) => {
    if (!service) return { bg: BADGE_BLUE, text: TEXT_BLUE };
    const lower = service.toLowerCase();
    if (lower.includes("respite")) return { bg: BADGE_BLUE, text: TEXT_BLUE };
    if (lower.includes("emergency") || lower.includes("emergent")) return { bg: "#FEF2F2", text: "#B91C1C" };
    if (lower.includes("supervised") || lower.includes("visitation")) return { bg: "#F3F0FF", text: "#5B21B6" };
    if (lower.includes("transportation")) return { bg: "#FFF8E1", text: TEXT_YELLOW };
    return { bg: BADGE_BLUE, text: TEXT_BLUE };
  };

  const firstName = user?.name?.split(" ")[0] || "User";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F8F8F6" }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* HEADER */}
        <View style={styles.header}>
          <Text style={styles.headerLabel}>STAFF DASHBOARD</Text>
          <Text style={styles.headerWelcome}>
            Welcome back, <Text style={{ color: PRIMARY_GREEN }}>{firstName}</Text>
          </Text>
          <Text style={styles.headerOrg}>Family Forever Inc.</Text>
        </View>

        {/* TODAY'S SHIFTS */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionTitle}>Today's shifts</Text>
              <View style={styles.pulsingDot} />
            </View>
            <Pressable onPress={() => router.push("/shifts")} style={styles.viewAllRow}>
              <Text style={styles.viewAllText}>View all</Text>
              <Ionicons name="chevron-forward" size={14} color={PRIMARY_GREEN} />
            </Pressable>
          </View>

          {todayShifts.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="calendar-outline" size={40} color="#D1D5DB" />
              <Text style={styles.emptyText}>No shifts today</Text>
            </View>
          ) : (
            todayShifts.map((shift) => {
              const rawName = safeString(shift.familyName || shift.childName || shift.clientName || shift.name || shift.client);
              const clientName = isNumericId(rawName) ? (shift.familyName || shift.childName || "Client") : (rawName || "Client");
              
              return (
                <ShiftCard
                  key={shift.id}
                  shift={shift}
                  clientName={clientName}
                  onAction={(type, s) => setConfirmAction({ type, shift: s })}
                  onDetails={() => router.push({ pathname: "/shift-detail", params: { shiftId: shift.id } })}
                  parseDateFn={parseDateFn}
                />
              );
            })
          )}
        </View>

        {/* STATS STRIP */}
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>This month</Text>
            <Text style={styles.statValue}>{stats.total} shifts</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Hours</Text>
            <Text style={styles.statValue}>{stats.hours} hrs</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Completed</Text>
            <Text style={[styles.statValue, { fontWeight: "700" }]}>
              <Text style={{ color: PRIMARY_GREEN }}>{stats.completed}</Text> of {stats.total}
            </Text>
          </View>
        </View>

        {/* COMING UP */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Coming up</Text>
            <Pressable onPress={() => router.push("/availability")} style={styles.viewAllRow}>
              <Text style={styles.viewAllText}>My Availability</Text>
              <Ionicons name="chevron-forward" size={14} color={PRIMARY_GREEN} />
            </Pressable>
          </View>

          {upcomingShifts.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="calendar-outline" size={32} color="#D1D5DB" />
              <Text style={styles.emptyTextSmall}>No upcoming shifts</Text>
            </View>
          ) : (
            upcomingShifts.map((shift, idx) => {
              const date = parseDateFn(shift.startDate);
              const dayName = date ? date.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase() : "DAY";
              const dayNum = date ? date.getDate() : "00";
              const serviceColor = getServiceColor(shift.serviceType || shift.category);

              return (
                <Pressable
                  key={shift.id}
                  onPress={() => router.push({ pathname: "/shift-detail", params: { shiftId: shift.id } })}
                  style={[styles.upcomingRow, idx < upcomingShifts.length - 1 && styles.upcomingRowBorder]}
                >
                  <View style={styles.dateBadge}>
                    <Text style={styles.dateBadgeDay}>{dayName}</Text>
                    <Text style={styles.dateBadgeNum}>{dayNum}</Text>
                  </View>
                  <View style={styles.upcomingInfo}>
                    <Text style={styles.upcomingTitle} numberOfLines={1}>
                      {safeString(shift.serviceType || shift.category) || "Shift"} · {safeString(shift.childName || shift.clientName || shift.name || shift.familyName) || "Client"}
                    </Text>
                    <Text style={styles.upcomingTime}>
                      {safeString(shift.startTime)} – {safeString(shift.endTime)}
                    </Text>
                  </View>
                  {!shift.shiftConfirmed && idx === 1 && (
                    <View style={styles.countBadge}>
                      <Text style={styles.countBadgeText}>2</Text>
                    </View>
                  )}
                  <Ionicons name="chevron-forward" size={18} color="#D1D5DB" />
                </Pressable>
              );
            })
          )}
        </View>
      </ScrollView>

      {confirmAction && (
        <Modal transparent visible animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={[
                styles.modalIcon,
                confirmAction.type === "clockOut" && { backgroundColor: "#FEF2F2" },
                confirmAction.type === "clockIn" && { backgroundColor: "#F0FDF4" },
              ]}>
                <Ionicons
                  name={
                    confirmAction.type === "clockOut" ? "log-out-outline"
                    : confirmAction.type === "clockIn" ? "log-in-outline"
                    : "checkmark-circle-outline"
                  }
                  size={32}
                  color={confirmAction.type === "clockOut" ? ERROR_RED : PRIMARY_GREEN}
                />
              </View>
              <Text style={styles.modalTitle}>
                {confirmAction.type === "confirm" ? "Confirm Shift?"
                  : confirmAction.type === "clockIn" ? "Clock In Now?"
                  : "Clock Out?"}
              </Text>
              <Text style={styles.modalClient}>
                {safeString(confirmAction.shift?.childName || confirmAction.shift?.clientName || confirmAction.shift?.name || confirmAction.shift?.familyName) || "Client"} ·{" "}
                {safeString(confirmAction.shift?.category) || "Shift"}
              </Text>
              <Text style={styles.modalDesc}>
                {confirmAction.type === "confirm"
                  ? "You'll be committing to attend this shift. The owner will be notified."
                  : confirmAction.type === "clockIn"
                  ? "Your GPS location will be captured and time rounded to the nearest 15 min for payroll accuracy."
                  : "This will finalize your shift hours. Your location will be logged for payroll."}
              </Text>
              <Pressable
                onPress={handleConfirmAction}
                style={[
                  styles.modalActionBtn,
                  confirmAction.type === "clockOut" && { backgroundColor: ERROR_RED },
                ]}
              >
                {isProcessing
                  ? <ActivityIndicator color="#FFF" />
                  : <Text style={styles.modalActionBtnText}>
                      {confirmAction.type === "confirm" ? "Yes, Confirm"
                        : confirmAction.type === "clockIn" ? "Yes, Clock In"
                        : "Yes, Clock Out"}
                    </Text>
                }
              </Pressable>
              <Pressable onPress={() => setConfirmAction(null)} style={styles.modalCancelBtn}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

function ShiftCard({ shift, onAction, onDetails }) {
  const getStatus = () => {
    if (shift.clockOutTime || shift.clockOut || shift.clockout || shift.status === "completed") return "Completed";
    if (shift.clockInTime || shift.clockIn || shift.clockin || shift.status === "active") return "In Progress";
    return shift.shiftConfirmed ? "Confirmed" : "Assigned";
  };

  const status = getStatus();
  let rawServiceType = safeString(shift.category || shift.categoryName || shift.serviceType || shift.shiftCategory) || "Respite Care";
  const hasTransitMarkers = shift.pickupLocation || shift.dropLocation || shift.visitLocation || 
                           (shift.description && shift.description.toLowerCase().includes("pick up")) ||
                           (shift.description && shift.description.toLowerCase().includes("drop to"));
  if ((rawServiceType === "Respite Care" || !rawServiceType) && hasTransitMarkers) {
    rawServiceType = "Transportation";
  }
  const serviceStyle = serviceTypeStyles[rawServiceType] || serviceTypeStyles.default;
  const rawName = safeString(shift.familyName || shift.childName || shift.clientName || shift.name || shift.client || shift.clientDetails?.name);
  const isId = (val) => val && /^\d+$/.test(String(val)) && String(val).length > 8;
  const clientName = isId(rawName) ? (shift.familyName || shift.childName || "Client") : (rawName || "Client");
  const clientId = safeString(shift.clientId || shift.clientDetails?.id) || "\u2014";
  const clientInitials = clientName.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  const duration = calcDuration(safeString(shift.startTime), safeString(shift.endTime));
  const displayDate = formatShiftDate(shift.startDate);
  const isTransport = rawServiceType.toLowerCase().includes("transportation") ||
    rawServiceType.toLowerCase().includes("supervised") ||
    rawServiceType.toLowerCase().includes("visitation");

  const statusColors = {
    "Completed": { dot: "#10B981", text: "#10B981" },
    "In Progress": { dot: "#3B82F6", text: "#3B82F6" },
    "Confirmed": { dot: "#22C55E", text: "#22C55E" },
    "Assigned": { dot: "#F59E0B", text: "#F59E0B" },
  };
  const sc = statusColors[status] || statusColors["Assigned"];

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={{flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1}}>
          <View style={[styles.serviceTag, { backgroundColor: serviceStyle.bg }]}>
            <Text style={[styles.serviceTagText, { color: serviceStyle.text }]}>{rawServiceType}</Text>
          </View>
          <Text style={styles.cardDateInline}>{displayDate}</Text>
        </View>
        <View style={styles.statusBox}>
          <View style={[styles.statusDot, { backgroundColor: sc.dot }]} />
          <Text style={[styles.statusText, { color: sc.text }]}>{status}</Text>
        </View>
      </View>

      <View style={styles.cardBody}>
        <View style={styles.timeRow}>
          <Ionicons name="time-outline" size={16} color={GRAY_TEXT} />
          <Text style={styles.timeText}>
            {formatShiftTimeUTCtoCanada(shift.startDate, shift.startTime)} – {formatShiftTimeUTCtoCanada(shift.startDate, shift.endTime)}
          </Text>
          <View style={styles.durationBadge}>
            <Text style={styles.durationText}>{duration}</Text>
          </View>
        </View>

        <View style={styles.clientRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{clientInitials}</Text>
          </View>
          <View style={styles.clientInfo}>
            <Text style={styles.clientNameText}>{clientName}</Text>
            <Text style={styles.clientIdText}>ID: {clientId}</Text>
          </View>
        </View>

        {isTransport && <RoutePreview shift={shift} />}

        {status === "Completed" && (
          <View style={styles.clockInOutBox}>
            <View style={styles.clockCol}>
              <View style={styles.clockIconRow}>
                <Ionicons name="log-in-outline" size={14} color={PRIMARY_GREEN} />
                <Text style={styles.clockLabel}>Clock In</Text>
              </View>
              <Text style={styles.clockValue}>{formatCanadaTime(shift.clockInTime || shift.clockIn || shift.clockin)}</Text>
            </View>
            <View style={styles.clockDivider} />
            <View style={[styles.clockCol, { alignItems: "flex-end" }]}>
              <View style={styles.clockIconRow}>
                <Ionicons name="log-out-outline" size={14} color={ERROR_RED} />
                <Text style={styles.clockLabel}>Clock Out</Text>
              </View>
              <Text style={styles.clockValue}>{formatCanadaTime(shift.clockOutTime || shift.clockOut || shift.clockout)}</Text>
            </View>
          </View>
        )}
      </View>

      <View style={styles.cardActions}>
        <View style={{ flex: 1 }}>
          {status === "Assigned" && (
            <Pressable onPress={() => onAction("confirm", shift)} style={styles.mainActionBtn}>
              <Text style={styles.mainActionBtnText}>Confirm</Text>
            </Pressable>
          )}
          {status === "Confirmed" && (
            <Pressable onPress={() => onAction("clockIn", shift)} style={styles.mainActionBtn}>
              <Text style={styles.mainActionBtnText}>Clock In</Text>
            </Pressable>
          )}
          {status === "In Progress" && isTransport && (
            <Pressable
              onPress={() => router.push({ pathname: "/transportation-shift-detail", params: { shiftId: shift.id } })}
              style={[styles.mainActionBtn, { backgroundColor: "#1E5FA6" }]}
            >
              <Ionicons name="navigate" size={15} color="#fff" style={{ marginRight: 6 }} />
              <Text style={styles.mainActionBtnText}>Continue Route</Text>
            </Pressable>
          )}
          {status === "In Progress" && !isTransport && (
            <Pressable onPress={() => onAction("clockOut", shift)} style={[styles.mainActionBtn, { backgroundColor: ERROR_RED }]}>
              <Text style={styles.mainActionBtnText}>Clock Out</Text>
            </Pressable>
          )}
          {status === "Completed" && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#ECFDF5", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, alignSelf: 'flex-start' }}>
              <Ionicons name="checkmark-circle" size={16} color="#10B981" />
              <Text style={{ fontSize: 13, fontWeight: "700", color: "#10B981", fontFamily: "Inter-Bold" }}>Completed</Text>
            </View>
          )}
        </View>

        <Pressable
          style={[styles.swapBtn, { marginHorizontal: 10 }]}
          onPress={() => router.push({ pathname: "/transfer-shift", params: { shiftId: shift.id } })}
        >
          <Ionicons name="swap-horizontal" size={20} color={GRAY_TEXT} />
        </Pressable>

        <Pressable
          onPress={isTransport
            ? () => router.push({ pathname: "/transportation-shift-detail", params: { shiftId: shift.id } })
            : () => router.push({ pathname: "/shift-detail", params: { shiftId: shift.id } })
          }
          style={styles.detailsLink}
        >
          <Text style={styles.detailsLinkText}>Details &gt;</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Header
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 16,
    backgroundColor: "#F8F8F6",
  },
  headerLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6B7280",
    letterSpacing: 1,
    marginBottom: 8,
    fontFamily: "Inter-Bold",
  },
  headerWelcome: {
    fontSize: 28,
    fontWeight: "700",
    color: DARK_TEXT,
    letterSpacing: -0.5,
    marginBottom: 4,
    fontFamily: "Poppins-Bold",
  },
  headerOrg: {
    fontSize: 14,
    color: "#6B7280",
    fontFamily: "Inter",
  },
  // Section
  section: {
    paddingHorizontal: 20,
    marginTop: 32,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: DARK_TEXT,
    fontFamily: "Poppins-Bold",
  },
  pulsingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#22C55E",
  },
  pulsingDotBlue: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: TEXT_BLUE,
  },
  viewAllRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: "600",
    color: PRIMARY_GREEN,
    fontFamily: "Inter-SemiBold",
  },
  // Empty card
  emptyCard: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 32,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: GRAY_BORDER,
    borderStyle: "dashed",
  },
  emptyText: {
    fontSize: 15,
    color: GRAY_TEXT,
    marginTop: 10,
    fontWeight: "600",
  },
  emptyTextSmall: {
    fontSize: 13,
    color: GRAY_TEXT,
    marginTop: 8,
  },
  // Stats
  statsCard: {
    backgroundColor: "#F0FDF4",
    borderRadius: 16,
    paddingVertical: 24,
    paddingHorizontal: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginHorizontal: 20,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "rgba(31, 111, 67, 0.08)",
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#4B5563",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    fontFamily: "Inter-Bold",
  },
  statValue: {
    fontSize: 18,
    fontWeight: "700",
    color: DARK_TEXT,
    fontFamily: "Poppins-Bold",
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: "rgba(0, 0, 0, 0.05)",
  },
  // Upcoming rows
  upcomingRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 18,
  },
  upcomingRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  dateBadge: {
    width: 52,
    height: 52,
    backgroundColor: "#F0FDF4",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  dateBadgeDay: {
    fontSize: 11,
    fontWeight: "800",
    color: PRIMARY_GREEN,
    textTransform: "uppercase",
    fontFamily: "Inter-Bold",
  },
  dateBadgeNum: {
    fontSize: 22,
    fontWeight: "700",
    color: PRIMARY_GREEN,
    fontFamily: "Poppins-Bold",
  },
  upcomingInfo: {
    flex: 1,
  },
  upcomingTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: DARK_TEXT,
    marginBottom: 4,
    fontFamily: "Inter-Bold",
  },
  upcomingTime: {
    fontSize: 13,
    color: "#6B7280",
    fontFamily: "Inter",
  },
  countBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: PRIMARY_GREEN,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  countBadgeText: {
    color: "#FFF",
    fontSize: 13,
    fontWeight: "800",
    fontFamily: "Poppins-Bold",
  },
  // Shift Card
  cardDateInline: { fontSize: 12, fontWeight: "600", color: GRAY_TEXT, fontFamily: "Inter-SemiBold" },
  card: { backgroundColor: "#FFF", borderRadius: 20, padding: 20, marginBottom: 15, borderWidth: 1, borderColor: GRAY_BORDER, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 2 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 15, gap: 10 },
  serviceTag: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  serviceTagText: { fontSize: 10, fontWeight: "800", textTransform: "uppercase", fontFamily: "Inter-Bold" },
  statusBox: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "#F9FAF8", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: "#F0F0EE" },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: "700", fontFamily: "Inter-Bold" },
  cardBody: { marginBottom: 15 },
  timeRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 15 },
  timeText: { fontSize: 15, fontWeight: "700", color: DARK_TEXT, fontFamily: "Poppins-Bold" },
  durationBadge: { backgroundColor: "#F3F4F6", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginLeft: "auto" },
  durationText: { fontSize: 12, fontWeight: "700", color: GRAY_TEXT, fontFamily: "Inter-Bold" },
  clientRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 15 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: LIGHT_GREEN, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 14, fontWeight: "800", color: PRIMARY_GREEN },
  clientInfo: { flex: 1 },
  clientNameText: { fontSize: 16, fontWeight: "700", color: DARK_TEXT, fontFamily: "Inter-Bold" },
  clientIdText: { fontSize: 12, color: GRAY_TEXT, marginTop: 2, fontFamily: "Inter" },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: GRAY_BORDER },
  locationText: { fontSize: 13, color: GRAY_TEXT, fontFamily: "Inter", flex: 1 },
  
  clockInOutBox: { flexDirection: "row", backgroundColor: "#F9FAFB", borderRadius: 12, padding: 12, marginTop: 12, borderWidth: 1, borderColor: "#E5E7EB", justifyContent: "space-between" },
  clockCol: { flex: 1 },
  clockIconRow: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 4 },
  clockLabel: { fontSize: 11, color: GRAY_TEXT, fontFamily: "Inter-SemiBold", textTransform: "uppercase", letterSpacing: 0.5 },
  clockValue: { fontSize: 13, fontWeight: "700", color: DARK_TEXT, fontFamily: "Poppins-Bold" },
  clockDivider: { width: 1, backgroundColor: "#E5E7EB", marginHorizontal: 12 },

  cardActions: { flexDirection: "row", alignItems: "center", marginTop: 5 },
  mainActionBtn: { backgroundColor: PRIMARY_GREEN, paddingVertical: 13, borderRadius: 12, flex: 1, alignItems: "center" },
  mainActionBtnText: { color: "#FFF", fontSize: 14, fontWeight: "700", fontFamily: "Inter-Bold" },
  secondaryActions: { flexDirection: "row", alignItems: "center", gap: 10, marginLeft: 10 },
  swapBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: "#F9FAFB", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: GRAY_BORDER },
  detailsLink: { paddingHorizontal: 10, height: 44, justifyContent: "center" },
  detailsLinkText: { fontSize: 14, fontWeight: "700", color: PRIMARY_GREEN, fontFamily: "Inter-Bold" },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: "#FFF", borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 30, alignItems: "center" },
  modalIcon: { width: 68, height: 68, borderRadius: 34, backgroundColor: "#F0FDF4", alignItems: "center", justifyContent: "center", marginBottom: 20 },
  modalTitle: { fontSize: 22, fontWeight: "800", color: DARK_TEXT, marginBottom: 8, fontFamily: "Poppins-Bold" },
  modalClient: { fontSize: 14, fontWeight: "600", color: PRIMARY_GREEN, marginBottom: 12, fontFamily: "Inter-SemiBold" },
  modalDesc: { fontSize: 14, color: GRAY_TEXT, textAlign: "center", lineHeight: 22, marginBottom: 30, fontFamily: "Inter" },
  modalActionBtn: { backgroundColor: PRIMARY_GREEN, paddingVertical: 16, width: "100%", borderRadius: 16, alignItems: "center", marginBottom: 12 },
  modalActionBtnText: { color: "#FFF", fontSize: 16, fontWeight: "700", fontFamily: "Inter-Bold" },
  modalCancelBtn: { paddingVertical: 12 },
  modalCancelText: { fontSize: 15, fontWeight: "700", color: GRAY_TEXT, fontFamily: "Inter-Bold" },
});
