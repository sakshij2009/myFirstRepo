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
import { collection, query, onSnapshot, getDocs, where, updateDoc } from "firebase/firestore";
import { db } from "../src/firebase/config";
import { registerForPushNotifications } from "../src/utils/registerForPushNotifications";
import { safeString, toDate, formatCanadaTime, parseDate } from "../src/utils/date";
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

const ALLOWED_CATEGORIES = ["Respite Care", "Emergent Care", "Supervised Visitation", "Transportation"];

const serviceTypeStyles = {
  "Respite Care": { bg: "#EFF6FF", text: "#1D4ED8" },
  "Emergent Care": { bg: "#FEF2F2", text: "#991B1B" },
  "Emergency Care": { bg: "#FEF2F2", text: "#991B1B" },
  "Supervised Visitation": { bg: "#F3F0FF", text: "#5B21B6" },
  "Transportation": { bg: "#FEF9C3", text: "#854D0E" },
  default: { bg: "#F3F4F6", text: "#6B7280" },
};

const calcDuration = (start, end) => {
  if (!start || !end) return "\u2014";
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

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayShifts = shifts.filter((s) => {
    const d = parseDate(s.startDate);
    if (!d) return false;
    d.setHours(0, 0, 0, 0);
    return d.getTime() === today.getTime();
  });

  const upcomingShifts = shifts.filter((s) => {
    const d = parseDate(s.startDate);
    if (!d) return false;
    d.setHours(0, 0, 0, 0);
    return d.getTime() > today.getTime();
  }).sort((a, b) => {
    const da = parseDate(a.startDate);
    const db = parseDate(b.startDate);
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
    const confirmed = shifts.filter((s) => s.shiftConfirmed || s.clockInTime || s.clockOutTime).length;
    setStats({
      total: shifts.length,
      hours: calcTotalHours(shifts),
      completed: confirmed,
    });
  }, [shifts]);

  const handleConfirmAction = async () => {
    if (!confirmAction) return;
    setIsProcessing(true);
    const { type, shift } = confirmAction;
    try {
      if (type === "confirm") {
        const q = query(collection(db, "shifts"), where("id", "==", shift.id));
        const snap = await getDocs(q);
        if (!snap.empty) await updateDoc(snap.docs[0].ref, { shiftConfirmed: true });
      } else {
        const coeff = 1000 * 60 * 15;
        const roundedDate = new Date(Math.round(new Date().getTime() / coeff) * coeff);
        const roundedTime = roundedDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

        let locStr = "Location unavailable";
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status === "granted") {
          let loc = await Location.getCurrentPositionAsync({});
          let geocode = await Location.reverseGeocodeAsync({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
          if (geocode.length > 0) {
            locStr = `${geocode[0].streetNumber || ""} ${geocode[0].street || geocode[0].name || ""}, ${geocode[0].city || ""}`.trim();
          } else {
            locStr = `Lat: ${loc.coords.latitude.toFixed(4)}, Lon: ${loc.coords.longitude.toFixed(4)}`;
          }
        }

        const q = query(collection(db, "shifts"), where("id", "==", shift.id));
        const snap = await getDocs(q);
        if (!snap.empty) {
          if (type === "clockIn") {
            await updateDoc(snap.docs[0].ref, { clockInTime: roundedTime, clockInLocation: locStr });
          } else {
            await updateDoc(snap.docs[0].ref, { clockOutTime: roundedTime, clockOutLocation: locStr });
          }
        }
      }
    } catch (e) {
      console.log("Error performing action", e);
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
              return (
                <Pressable key={shift.id} onPress={() => router.push({ pathname: "/shift-detail", params: { shiftId: shift.id } })}>
                  <ShiftCard
                    shift={shift}
                    onAction={(type, s) => setConfirmAction({ type, shift: s })}
                    onDetails={() => router.push({ pathname: "/shift-detail", params: { shiftId: shift.id } })}
                    parseDateFn={parseDate}
                  />
                </Pressable>
              );
            })
          )}
        </View>

        {/* STATS STRIP */}
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>This week</Text>
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
              const date = parseDate(shift.startDate);
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
                      {safeString(shift.serviceType || shift.category) || "Shift"} · {safeString(shift.clientName || shift.name) || "Client"}
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

      {/* CONFIRM MODAL */}
      {confirmAction && (
        <Modal transparent visible animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalIconBox}>
                <Ionicons name="checkmark" size={24} color={PRIMARY_GREEN} />
              </View>
              <Text style={styles.modalTitle}>
                {confirmAction.type === "confirm" ? "Confirm this shift?" :
                  confirmAction.type === "clockIn" ? "Clock in to this shift?" : "Clock out of this shift?"}
              </Text>

              <Text style={styles.modalSubtitle}>
                {safeString(confirmAction.shift.category || confirmAction.shift.serviceType)} · {safeString(confirmAction.shift.clientName || confirmAction.shift.name)}
              </Text>
              <Text style={styles.modalMeta}>
                {safeString(confirmAction.shift.startDate)} · {safeString(confirmAction.shift.startTime)} – {safeString(confirmAction.shift.endTime)}
              </Text>
              <Text style={styles.modalLocation}>
                {confirmAction.shift.location || "Location not specified"}
              </Text>

              {confirmAction.type !== "confirm" && (
                <View style={styles.gpsInfoBox}>
                  <Text style={styles.gpsInfoLabel}>
                    <Ionicons name="time-outline" size={12} color={PRIMARY_GREEN} /> Time logged (Rounded 15m):
                  </Text>
                  <Text style={styles.gpsInfoValue}>
                    {new Date(Math.round(new Date().getTime() / (1000 * 60 * 15)) * (1000 * 60 * 15)).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </Text>
                  <Text style={[styles.gpsInfoLabel, { marginTop: 8 }]}>
                    <Ionicons name="location-outline" size={12} color={PRIMARY_GREEN} /> GPS Location
                  </Text>
                  <Text style={styles.gpsInfoValue}>Your exact location will be attached.</Text>
                </View>
              )}

              <Text style={styles.modalDisclaimer}>
                {confirmAction.type === "confirm" ? "By confirming, you acknowledge this shift assignment." :
                  confirmAction.type === "clockIn" ? "Your time & location will be logged for payroll." :
                    "Your shift will be marked as complete."}
              </Text>

              <Pressable
                onPress={handleConfirmAction}
                disabled={isProcessing}
                style={[styles.modalPrimaryBtn, isProcessing && { opacity: 0.7 }]}
              >
                {isProcessing ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.modalPrimaryBtnText}>
                    {confirmAction.type === "confirm" ? "Yes, Confirm Shift" :
                      confirmAction.type === "clockIn" ? "Yes, Clock In" : "Yes, Clock Out"}
                  </Text>
                )}
              </Pressable>

              <Pressable onPress={() => setConfirmAction(null)} disabled={isProcessing} style={styles.modalCancelBtn}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

function ShiftCard({ shift, onAction, onDetails, parseDateFn }) {
  const getStatus = () => {
    if (shift.clockOutTime || shift.clockOut || shift.clockout || shift.status === "completed") return "Completed";
    if (shift.clockInTime || shift.clockIn || shift.clockin || shift.status === "active") return "In Progress";
    return shift.shiftConfirmed ? "Confirmed" : "Assigned";
  };

  const status = getStatus();
  const rawServiceType = safeString(shift.category || shift.categoryName || shift.serviceType) || "Transportation";
  const serviceStyle = serviceTypeStyles[rawServiceType] || serviceTypeStyles.default;
  const clientName = safeString(shift.clientName || shift.name) || "Client";
  const clientInitials = clientName.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  const location = safeString(shift.location || shift.address) || "Location not specified";
  const duration = calcDuration(safeString(shift.startTime), safeString(shift.endTime));
  const displayDate = formatShiftDate(shift.startDate, parseDateFn);

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
            <Text style={styles.clientIdText}>ID: {safeString(shift.clientId) || "—"}</Text>
          </View>
        </View>



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
        {status === "In Progress" && (
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
          <Pressable onPress={onDetails} style={styles.detailsLink}>
            <Text style={styles.detailsLinkText}>Details &gt;</Text>
          </Pressable>
        </View>
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
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 15 },
  serviceTag: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  serviceTagText: { fontSize: 11, fontWeight: "800", textTransform: "uppercase", fontFamily: "Inter-Bold" },
  statusBox: { flexDirection: "row", alignItems: "center", gap: 6 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 12, fontWeight: "700", fontFamily: "Inter-Bold" },
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

  cardActions: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 5 },
  mainActionBtn: { backgroundColor: PRIMARY_GREEN, paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12, flex: 1, alignItems: "center" },
  mainActionBtnText: { color: "#FFF", fontSize: 14, fontWeight: "700", fontFamily: "Inter-Bold" },
  secondaryActions: { flexDirection: "row", alignItems: "center", gap: 10, marginLeft: 10 },
  swapBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: "#F9FAFB", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: GRAY_BORDER },
  detailsLink: { paddingHorizontal: 10, height: 44, justifyContent: "center" },
  detailsLinkText: { fontSize: 14, fontWeight: "700", color: PRIMARY_GREEN, fontFamily: "Inter-Bold" },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalCard: {
    backgroundColor: "#FFF",
    borderRadius: 32,
    padding: 32,
    width: "100%",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
  },
  modalIconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#F0FDF4",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: DARK_TEXT,
    textAlign: "center",
    marginBottom: 16,
    fontFamily: "Poppins-Bold",
  },
  modalSubtitle: {
    fontSize: 15,
    fontWeight: "700",
    color: DARK_TEXT,
    marginBottom: 6,
    fontFamily: "Inter-Bold",
  },
  modalMeta: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 6,
    fontFamily: "Inter",
  },
  modalLocation: {
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 20,
    fontFamily: "Inter",
  },
  gpsInfoBox: {
    width: "100%",
    backgroundColor: "#F9FAFB",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  gpsInfoLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 4,
    fontFamily: "Inter-Bold",
  },
  gpsInfoValue: {
    fontSize: 13,
    color: "#6B7280",
    fontFamily: "Inter",
  },
  modalDisclaimer: {
    fontSize: 12,
    color: "#9CA3AF",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 18,
    fontFamily: "Inter",
  },
  modalPrimaryBtn: {
    width: "100%",
    backgroundColor: PRIMARY_GREEN,
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  modalPrimaryBtnText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "700",
    fontFamily: "Inter-Bold",
  },
  modalCancelBtn: {
    paddingVertical: 10,
  },
  modalCancelText: {
    color: "#6B7280",
    fontSize: 15,
    fontWeight: "600",
    fontFamily: "Inter-SemiBold",
  },
});
