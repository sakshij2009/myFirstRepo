import {
  View,
  Text,
  ScrollView,
  Pressable,
  Modal,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect, useState, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import {
  collection,
  query,
  onSnapshot,
  doc,
  updateDoc,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../src/firebase/config";
import { router } from "expo-router";
import * as Location from "expo-location";
import { safeString, toDate, formatCanadaTime, parseDate } from "../src/utils/date";

// ── Color tokens ──────────────────────────────────────────────────────────────
const PRIMARY_GREEN = "#1F6F43";
const LIGHT_GREEN = "#DCFCE7";
const TEXT_GREEN = "#166534";
const DARK_TEXT = "#111827";
const GRAY_TEXT = "#6B7280";
const GRAY_BORDER = "#F3F4F6";
const PAGE_BG = "#F9FAFB";
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

const getRoundedTime = () => {
  const coeff = 1000 * 60 * 15;
  const rounded = new Date(Math.round(new Date().getTime() / coeff) * coeff);
  return rounded.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
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

// ── ShiftCard Component ───────────────────────────────────────────────────────
// Extract short label from an address string
function shortAddr(addr) {
  if (!addr) return null;
  const s = safeString(addr);
  // Take first meaningful segment before comma
  const part = s.split(",")[0].trim();
  // Shorten to ~10 chars
  return part.length > 12 ? part.slice(0, 11) + "…" : part;
}

// Mini route preview for transportation shifts
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
    <View style={{ flexDirection: "row", alignItems: "center", marginTop: 10, marginBottom: 2, flexWrap: "wrap", gap: 2 }}>
      {stops.map((s, i) => (
        <View key={i} style={{ flexDirection: "row", alignItems: "center" }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
            <Ionicons name={s.icon} size={13} color={s.color} />
            <Text style={{ fontSize: 12, color: "#374151", fontFamily: "Inter" }}>{s.label}</Text>
          </View>
          {i < stops.length - 1 && (
            <Text style={{ fontSize: 11, color: "#D1D5DB", marginHorizontal: 4 }}>· · ·</Text>
          )}
        </View>
      ))}
    </View>
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
  const rawName = safeString(shift.familyName || shift.clientName || shift.name || shift.client || shift.clientDetails?.name);
  const isId = (val) => val && /^\d+$/.test(String(val)) && String(val).length > 8;
  const clientName = isId(rawName) ? "Client" : (rawName || "Client");
  const clientId = safeString(shift.clientId || shift.clientDetails?.id) || "\u2014";
  const clientInitials = clientName.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  const duration = calcDuration(safeString(shift.startTime), safeString(shift.endTime));
  const displayDate = formatShiftDate(shift.startDate);
  const isTransport = rawServiceType === "Transportation" || rawServiceType === "Supervised Visitation + Transportation";

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
          <Text style={styles.timeText}>{safeString(shift.startTime) || "—"} – {safeString(shift.endTime) || "—"}</Text>
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
          // Transport "In Progress" → go back to transportation detail (Choose Vehicle / active route)
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
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#ECFDF5", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 }}>
            <Ionicons name="checkmark-circle" size={16} color="#10B981" />
            <Text style={{ fontSize: 13, fontWeight: "700", color: "#10B981", fontFamily: "Inter-Bold" }}>Completed</Text>
          </View>
        )}
        <View style={styles.secondaryActions}>
          <Pressable
            style={styles.swapBtn}
            onPress={() => router.push({ pathname: "/transfer-shift", params: { shiftId: shift.id } })}
          >
            <Ionicons name="swap-horizontal" size={20} color={GRAY_TEXT} />
          </Pressable>
          {/* Transport shifts always open transportation-shift-detail for Details */}
          <Pressable
            onPress={isTransport
              ? () => router.push({ pathname: "/transportation-shift-detail", params: { shiftId: shift.id } })
              : onDetails
            }
            style={styles.detailsLink}
          >
            <Text style={styles.detailsLinkText}>Details &gt;</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function Shifts() {
  const [user, setUser] = useState(null);
  const [shifts, setShifts] = useState([]);
  const [activeTab, setActiveTab] = useState("Upcoming");
  const [confirmAction, setConfirmAction] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const stored = await AsyncStorage.getItem("user");
      if (stored) setUser(JSON.parse(stored));
    };
    load();
  }, []);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "shifts"));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const mine = data.filter(s => {
        const isUser = s?.userId === user?.userId || s?.name?.toLowerCase() === user?.name?.toLowerCase();
        const cat = s?.category || s?.categoryName || s?.serviceType;
        return isUser && (!cat || ALLOWED_CATEGORIES.includes(cat));
      });
      setShifts(mine);
      setLoading(false);
    });
    return () => unsub();
  }, [user]);

  // Live tab filtering
  const today = new Date(); today.setHours(0, 0, 0, 0);

  const isShiftCompleted = (s) => !!(s.clockOutTime || s.clockOut || s.clockout || s.status === "completed");
  const isShiftInProgress = (s) => !!(s.clockInTime || s.clockIn || s.clockin || s.status === "active") && !isShiftCompleted(s);

  const filtered = shifts.filter(s => {
    const d = parseDate(s.startDate);
    if (d) d.setHours(0, 0, 0, 0);

    const completed = isShiftCompleted(s);
    const inProgress = isShiftInProgress(s);

    switch (activeTab) {
      case "Upcoming":
        // Show shifts not yet started/completed AND must be today or in the future
        return !completed && !inProgress && (d ? d.getTime() >= today.getTime() : true);
      case "In Progress": return inProgress;
      case "Completed": return completed;
      default: return true; // "All"
    }
  }).sort((a, b) => {
    // Latest date first (descending)
    const da = parseDate(a.startDate);
    const db2 = parseDate(b.startDate);
    return (db2 || 0) - (da || 0);
  });

  // Live stats for floating badge
  const todayShifts = shifts.filter(s => {
    const d = parseDate(s.startDate);
    if (d) d.setHours(0, 0, 0, 0);
    return d && d.getTime() === today.getTime();
  });

  const todayHours = todayShifts.reduce((acc, s) => {
    const parseTime = (t) => {
      if (!t) return 0;
      const [time, period] = t.split(" ");
      let [h, m] = time.split(":").map(Number);
      if (period?.toUpperCase() === "PM" && h !== 12) h += 12;
      if (period?.toUpperCase() === "AM" && h === 12) h = 0;
      return h + (m || 0) / 60;
    };
    const diff = parseTime(s.endTime) - parseTime(s.startTime);
    return acc + (diff > 0 ? diff : diff + 24);
  }, 0);

  const handleAction = async () => {
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
        // For transportation shifts, navigate to transportation detail after clock-in
        const catRaw = shift.category || shift.categoryName || shift.serviceType || shift.shiftCategory || "";
        const catLower = safeString(catRaw).toLowerCase();
        if (catLower.includes("transportation")) {
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
      Alert.alert("Error", "Something went wrong. Please try again.");
    }

    setIsProcessing(false);
    setConfirmAction(null);
  };

  const TABS = ["Upcoming", "In Progress", "Completed", "All"];
  const tabCounts = {
    Upcoming: shifts.filter(s => {
      const d = parseDate(s.startDate);
      if (d) d.setHours(0, 0, 0, 0);
      return !isShiftCompleted(s) && !isShiftInProgress(s) && (d ? d.getTime() >= today.getTime() : true);
    }).length,
    "In Progress": shifts.filter(isShiftInProgress).length,
    Completed: shifts.filter(isShiftCompleted).length,
    All: shifts.length,
  };

  const today2 = new Date();
  const todayLabel = today2.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={DARK_TEXT} />
        </Pressable>
        <View style={styles.headerTitleBox}>
          <Text style={styles.headerTitle}>My Shifts</Text>
          <Text style={styles.headerSubtitle}>{user?.name || "Staff Member"}</Text>
        </View>
        <Pressable style={styles.filterBtn}>
          <Ionicons name="options-outline" size={22} color={DARK_TEXT} />
        </Pressable>
      </View>

      {/* Tabs */}
      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScroll}>
          {TABS.map(tab => (
            <Pressable
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
              {tabCounts[tab] > 0 && (
                <View style={[styles.tabBadge, activeTab === tab && { backgroundColor: "rgba(255,255,255,0.3)" }]}>
                  <Text style={[styles.tabBadgeText, activeTab === tab && { color: "#FFF" }]}>{tabCounts[tab]}</Text>
                </View>
              )}
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
        {/* Live section meta */}
        <View style={styles.dateLabelRow}>
          <Text style={styles.sectionMeta}>
            {filtered.length} {activeTab === "All" ? "total" : activeTab.toLowerCase()} shift{filtered.length !== 1 ? "s" : ""}
          </Text>
          <View style={styles.liveDot} />
          <Text style={styles.liveDateText}>Live</Text>
        </View>

        {loading ? (
          <ActivityIndicator color={PRIMARY_GREEN} style={{ marginTop: 40 }} />
        ) : filtered.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="calendar-outline" size={52} color="#E5E7EB" />
            <Text style={styles.emptyTitle}>No {activeTab} Shifts</Text>
            <Text style={styles.emptySubtitle}>You have no shifts in this category right now.</Text>
          </View>
        ) : (
          filtered.map(s => (
            <ShiftCard
              key={s.id}
              shift={s}
              onAction={(type, shift) => setConfirmAction({ type, shift })}
              onDetails={() => router.push({ pathname: "/shift-detail", params: { shiftId: s.id } })}
            />
          ))
        )}
      </ScrollView>

      {/* Live Floating Badge */}
      <View style={styles.floatingContainer}>
        <View style={styles.floatingBadge}>
          <Ionicons name="today-outline" size={16} color="rgba(255,255,255,0.8)" />
          <Text style={styles.floatingText}>
            Today: {todayShifts.length} shift{todayShifts.length !== 1 ? "s" : ""} · {Math.round(todayHours * 10) / 10} hrs
          </Text>
        </View>
      </View>

      {/* Confirmation Modal */}
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
                {safeString(confirmAction.shift?.clientName || confirmAction.shift?.name) || "Client"} ·{" "}
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
                onPress={handleAction}
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: PAGE_BG },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 10, paddingBottom: 15 },
  headerTitleBox: { alignItems: "center" },
  headerTitle: { fontSize: 18, fontWeight: "800", color: DARK_TEXT, fontFamily: "Poppins-Bold" },
  headerSubtitle: { fontSize: 13, color: GRAY_TEXT, fontFamily: "Inter", marginTop: 2 },
  filterBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: "#FFF", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: GRAY_BORDER },

  tabScroll: { paddingHorizontal: 20, gap: 10, paddingVertical: 5, paddingBottom: 15 },
  tab: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: "#E5E7EB", gap: 6 },
  tabActive: { backgroundColor: PRIMARY_GREEN },
  tabText: { fontSize: 13, fontWeight: "600", color: GRAY_TEXT, fontFamily: "Inter-SemiBold" },
  tabTextActive: { color: "#FFF" },
  tabBadge: { backgroundColor: "#D1D5DB", paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10 },
  tabBadgeText: { fontSize: 11, fontWeight: "700", color: GRAY_TEXT, fontFamily: "Inter-Bold" },

  list: { paddingHorizontal: 20, paddingBottom: 140 },
  dateLabelRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 20, marginBottom: 20 },
  liveDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: "#22C55E" },
  liveDateText: { fontSize: 12, fontWeight: "700", color: "#22C55E", fontFamily: "Inter-Bold" },
  sectionMeta: { fontSize: 13, fontWeight: "700", color: DARK_TEXT, fontFamily: "Poppins-Bold", flex: 1 },
  cardDateInline: { fontSize: 12, fontWeight: "600", color: GRAY_TEXT, fontFamily: "Inter-SemiBold" },

  card: { backgroundColor: "#FFF", borderRadius: 20, padding: 20, marginBottom: 15, borderWidth: 1, borderColor: GRAY_BORDER, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 2 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 15 },
  serviceTag: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  serviceTagText: { fontSize: 11, fontWeight: "800", textTransform: "uppercase", fontFamily: "Inter-Bold" },
  statusBox: { flexDirection: "row", alignItems: "center", gap: 6 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 12, fontWeight: "700", fontFamily: "Inter-Bold" },
  cardBody: { marginBottom: 15 },
  dateRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 },
  dateText: { fontSize: 12, color: GRAY_TEXT, fontFamily: "Inter" },
  timeRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 15 },
  timeText: { fontSize: 15, fontWeight: "700", color: DARK_TEXT, fontFamily: "Poppins-Bold" },
  durationBadge: { backgroundColor: "#F3F4F6", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginLeft: "auto" },
  durationText: { fontSize: 12, fontWeight: "700", color: GRAY_TEXT, fontFamily: "Inter-Bold" },
  clientRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 15 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: LIGHT_GREEN, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 14, fontWeight: "800", color: TEXT_GREEN },
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

  cardActions: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 5 },
  mainActionBtn: { backgroundColor: PRIMARY_GREEN, paddingHorizontal: 25, paddingVertical: 13, borderRadius: 12, minWidth: 120, alignItems: "center" },
  mainActionBtnText: { color: "#FFF", fontSize: 14, fontWeight: "700", fontFamily: "Inter-Bold" },
  secondaryActions: { flexDirection: "row", alignItems: "center", gap: 15 },
  swapBtn: { width: 40, height: 40, borderRadius: 10, backgroundColor: "#F3F4F6", alignItems: "center", justifyContent: "center" },
  detailsLink: { paddingVertical: 10 },
  detailsLinkText: { fontSize: 13, fontWeight: "700", color: PRIMARY_GREEN, fontFamily: "Inter-Bold" },

  emptyBox: { alignItems: "center", paddingVertical: 60 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: DARK_TEXT, marginTop: 15, fontFamily: "Poppins-Bold" },
  emptySubtitle: { fontSize: 14, color: GRAY_TEXT, marginTop: 8, textAlign: "center", fontFamily: "Inter" },

  floatingContainer: { position: "absolute", bottom: 90, alignSelf: "center", zIndex: 100 },
  floatingBadge: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#11452D", paddingHorizontal: 20, paddingVertical: 12, borderRadius: 30, shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 10, elevation: 6 },
  floatingText: { color: "#FFF", fontSize: 13, fontWeight: "700", fontFamily: "Inter-Bold" },

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
