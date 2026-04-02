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
import { router } from "expo-router";
import * as Location from "expo-location";

const PRIMARY_GREEN = "#1F6F43";
const LIGHT_GREEN = "#F0FDF4";
const STATS_BG = "#F0FDF4";
const DARK_TEXT = "#1A1A1A";
const GRAY_TEXT = "#9CA3AF";
const GRAY_BORDER = "rgba(0, 0, 0, 0.1)";
const ACCENT_YELLOW = "rgba(254, 249, 195, 0.5)";
const TEXT_YELLOW = "#92600A";
const BADGE_BLUE = "#EBF5FF";
const TEXT_BLUE = "#1E5FA6";
const RED_STATUS = "#EF4444";

const ALLOWED_CATEGORIES = ["Respite Care", "Emergent Care", "Supervised Visitation", "Transportation"];

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
        const isUserShift = s?.name?.toLowerCase() === user?.name?.toLowerCase() || s?.userId === user?.userId;
        const category = s?.category || s?.categoryName || s?.serviceType;
        const isValidCategory = !category || ALLOWED_CATEGORIES.includes(category);
        return isUserShift && isValidCategory;
      });
      setShifts(userShifts);
    });
    return () => unsub();
  }, [user]);

  const parseDate = useCallback((dateStr) => {
    if (!dateStr || typeof dateStr !== "string") return null;
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const sep = dateStr.includes("-") ? "-" : " ";
    const parts = dateStr.split(sep);
    if (parts.length < 3) return null;
    const [dd, mmm, yyyy] = parts;
    const mi = months.indexOf((mmm || "").slice(0, 3));
    if (mi >= 0) return new Date(Number(yyyy), mi, Number(dd));
    return null;
  }, []);

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
            todayShifts.map((shift) => (
              <ShiftCard
                key={shift.id}
                shift={shift}
                onAction={(type, s) => setConfirmAction({ type, shift: s })}
                onDetails={() => router.push({ pathname: "/shift-detail", params: { shiftId: shift.id } })}
                getInitials={getInitials}
                getServiceColor={getServiceColor}
              />
            ))
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
            <Text style={[styles.statValue, { color: PRIMARY_GREEN }]}>{stats.completed}</Text>
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
                      {shift.serviceType || shift.category || "Shift"} · {shift.clientName || shift.name || "Client"}
                    </Text>
                    <Text style={styles.upcomingTime}>
                      {shift.startTime} – {shift.endTime}
                    </Text>
                  </View>
                  {!shift.shiftConfirmed && (
                    <View style={styles.alertBadge}>
                      <Ionicons name="alert" size={12} color="#FFF" />
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
                {confirmAction.shift.category || confirmAction.shift.serviceType} · {confirmAction.shift.clientName || confirmAction.shift.name}
              </Text>
              <Text style={styles.modalMeta}>
                {confirmAction.shift.startDate} · {confirmAction.shift.startTime} – {confirmAction.shift.endTime}
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

function ShiftCard({ shift, onAction, onDetails, getInitials, getServiceColor }) {
  const getStatus = () => {
    if (shift.clockOutTime) return "completed";
    if (shift.clockInTime) return "active";
    return shift.shiftConfirmed ? "confirmed" : "assigned";
  };

  const status = getStatus();
  const serviceColor = getServiceColor(shift.serviceType || shift.category);
  const parseLocations = (locationStr) => {
    if (!locationStr) return [];
    return locationStr.split(",").map((l) => l.trim()).filter((l) => l);
  };
  const locations = parseLocations(shift.location);
  const isTransportation = (shift.serviceType || shift.category || "").toLowerCase().includes("transportation");

  return (
    <View style={styles.shiftCard}>
      {/* Confirmation banner for unconfirmed */}
      {status === "assigned" && (
        <View style={styles.confirmBanner}>
          <Ionicons name="time-outline" size={16} color="#A16207" />
          <Text style={styles.confirmBannerText}>Confirmation required</Text>
          <View style={{ flex: 1 }} />
          <Ionicons name="checkmark-circle" size={16} color={PRIMARY_GREEN} />
          <Text style={styles.confirmBannerStatus}>Assigned</Text>
        </View>
      )}

      {status === "confirmed" && (
        <View style={[styles.confirmBanner, { backgroundColor: LIGHT_GREEN }]}>
          <Ionicons name="checkmark-circle" size={16} color={PRIMARY_GREEN} />
          <Text style={[styles.confirmBannerStatus, { color: PRIMARY_GREEN }]}>Confirmed</Text>
        </View>
      )}

      {status === "active" && (
        <View style={[styles.confirmBanner, { backgroundColor: BADGE_BLUE }]}>
          <View style={styles.pulsingDotBlue} />
          <Text style={[styles.confirmBannerStatus, { color: TEXT_BLUE }]}>In Progress · Checked in at {shift.clockInTime}</Text>
        </View>
      )}

      <View style={styles.shiftCardContent}>
        {/* Top Row: Service Badge + Time */}
        <View style={styles.shiftTopRow}>
          <View style={[styles.serviceBadge, { backgroundColor: serviceColor.bg }]}>
            <Text style={[styles.serviceBadgeText, { color: serviceColor.text }]}>
              {shift.serviceType || shift.category || "Service"}
            </Text>
          </View>
          <Text style={styles.shiftTime}>{shift.startTime} – {shift.endTime}</Text>
        </View>

        {/* Client Row */}
        <View style={styles.clientRow}>
          <View style={styles.clientAvatar}>
            <Text style={styles.clientAvatarText}>{getInitials(shift.clientName || shift.name)}</Text>
            {status !== "assigned" && <View style={styles.onlineDot} />}
          </View>
          <Text style={styles.clientName}>{shift.clientName || shift.name || "Client"}</Text>
        </View>

        {/* Location */}
        {isTransportation && locations.length >= 2 ? (
          <View style={styles.routeRow}>
            <Ionicons name="navigate-outline" size={16} color={PRIMARY_GREEN} />
            <View style={styles.routeStops}>
              <Text style={styles.routeStopText} numberOfLines={1}>{locations[0]?.split(",")[0]}</Text>
              <View style={styles.routeDashed} />
              <Ionicons name="business-outline" size={14} color={PRIMARY_GREEN} />
              <Text style={styles.routeStopText} numberOfLines={1}>{locations[1]?.split(",")[0]}</Text>
              <View style={styles.routeDashed} />
              <Ionicons name="flag-outline" size={14} color={RED_STATUS} />
              <Text style={styles.routeStopText} numberOfLines={1}>{locations[2]?.split(",")[0] || "End"}</Text>
            </View>
          </View>
        ) : (
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={16} color={GRAY_TEXT} />
            <Text style={styles.locationText} numberOfLines={1}>{locations[0] || "No location provided"}</Text>
          </View>
        )}

        {/* Action Buttons */}
        {status === "assigned" && (
          <View style={styles.actionRow}>
            <Pressable onPress={() => onAction("confirm", shift)} style={styles.outlineBtn}>
              <Text style={styles.outlineBtnText}>Confirm Shift</Text>
            </Pressable>
            <Pressable onPress={onDetails}>
              <Text style={styles.detailsLink}>Details &gt;</Text>
            </Pressable>
          </View>
        )}

        {status === "confirmed" && (
          <View style={styles.actionRow}>
            <Pressable onPress={() => onAction("clockIn", shift)} style={styles.solidBtn}>
              <Text style={styles.solidBtnText}>Check In</Text>
            </Pressable>
            <Pressable onPress={onDetails}>
              <Text style={styles.detailsLink}>Details &gt;</Text>
            </Pressable>
          </View>
        )}

        {status === "active" && (
          <View style={styles.actionRow}>
            <Pressable onPress={() => onAction("clockOut", shift)} style={styles.outlineBtn}>
              <Text style={styles.outlineBtnTextGreen}>Check Out</Text>
            </Pressable>
            <Pressable onPress={onDetails}>
              <Text style={styles.detailsLink}>Details &gt;</Text>
            </Pressable>
          </View>
        )}

        {status === "completed" && (
          <View style={styles.completedRow}>
            <View style={styles.completedBadge}>
              <Ionicons name="checkmark" size={14} color={PRIMARY_GREEN} />
              <Text style={styles.completedText}>Completed</Text>
            </View>
            <Pressable onPress={onDetails}>
              <Text style={styles.detailsLink}>Details &gt;</Text>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Header
  header: {
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 8,
    backgroundColor: "#F8F8F6",
  },
  headerLabel: {
    fontSize: 11,
    fontWeight: "500",
    color: GRAY_TEXT,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  headerWelcome: {
    fontSize: 22,
    fontWeight: "700",
    color: DARK_TEXT,
    letterSpacing: -0.4,
    marginBottom: 4,
  },
  headerOrg: {
    fontSize: 13,
    color: GRAY_TEXT,
  },
  // Section
  section: {
    paddingHorizontal: 20,
    marginTop: 28,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: DARK_TEXT,
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
    gap: 2,
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: "500",
    color: PRIMARY_GREEN,
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
    backgroundColor: STATS_BG,
    borderRadius: 14,
    paddingVertical: 18,
    paddingHorizontal: 8,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    marginHorizontal: 20,
    marginTop: 8,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: GRAY_TEXT,
    marginBottom: 4,
    textTransform: "uppercase",
  },
  statValue: {
    fontSize: 20,
    fontWeight: "700",
    color: DARK_TEXT,
    fontFamily: "Poppins",
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: "#E5E7EB",
  },
  // Upcoming rows
  upcomingRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
  },
  upcomingRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  dateBadge: {
    width: 44,
    height: 44,
    backgroundColor: LIGHT_GREEN,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  dateBadgeDay: {
    fontSize: 10,
    fontWeight: "800",
    color: PRIMARY_GREEN,
    textTransform: "uppercase",
    fontFamily: "Inter",
  },
  dateBadgeNum: {
    fontSize: 18,
    fontWeight: "700",
    color: PRIMARY_GREEN,
    fontFamily: "Poppins",
  },
  upcomingInfo: {
    flex: 1,
  },
  upcomingTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: DARK_TEXT,
    marginBottom: 2,
  },
  upcomingTime: {
    fontSize: 12,
    color: GRAY_TEXT,
  },
  alertBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: RED_STATUS,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  // Shift Card
  shiftCard: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    marginBottom: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: GRAY_BORDER,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  confirmBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: ACCENT_YELLOW,
  },
  confirmBannerText: {
    fontSize: 12,
    fontWeight: "700",
    color: TEXT_YELLOW,
  },
  confirmBannerStatus: {
    fontSize: 11,
    fontWeight: "600",
    color: TEXT_YELLOW,
  },
  shiftCardContent: {
    padding: 18,
  },
  shiftTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  serviceBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  serviceBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  shiftTime: {
    fontSize: 13,
    fontWeight: "600",
    color: GRAY_TEXT,
  },
  clientRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  clientAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  clientAvatarText: {
    fontSize: 14,
    fontWeight: "800",
    color: GRAY_TEXT,
  },
  onlineDot: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#22C55E",
    borderWidth: 2,
    borderColor: "#FFF",
  },
  clientName: {
    fontSize: 16,
    fontWeight: "700",
    color: DARK_TEXT,
  },
  routeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  routeStops: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  routeStopText: {
    fontSize: 11,
    fontWeight: "600",
    color: DARK_TEXT,
    maxWidth: 60,
  },
  routeDashed: {
    flex: 1,
    height: 1,
    backgroundColor: "#E5E7EB",
    borderStyle: "dashed",
    borderWidth: 0.5,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  locationText: {
    fontSize: 13,
    color: GRAY_TEXT,
    flex: 1,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  outlineBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: PRIMARY_GREEN,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  outlineBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: PRIMARY_GREEN,
  },
  outlineBtnTextGreen: {
    fontSize: 14,
    fontWeight: "600",
    color: PRIMARY_GREEN,
  },
  solidBtn: {
    flex: 1,
    backgroundColor: PRIMARY_GREEN,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
  },
  solidBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFF",
  },
  detailsLink: {
    fontSize: 13,
    fontWeight: "600",
    color: PRIMARY_GREEN,
  },
  completedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  completedBadge: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: LIGHT_GREEN,
    borderRadius: 12,
    paddingVertical: 12,
    justifyContent: "center",
  },
  completedText: {
    fontSize: 14,
    fontWeight: "700",
    color: PRIMARY_GREEN,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    backgroundColor: "#FFF",
    borderRadius: 24,
    padding: 24,
    width: "100%",
    alignItems: "center",
  },
  modalIconBox: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: LIGHT_GREEN,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: DARK_TEXT,
    textAlign: "center",
    marginBottom: 12,
  },
  modalSubtitle: {
    fontSize: 13,
    fontWeight: "600",
    color: DARK_TEXT,
    marginBottom: 4,
  },
  modalMeta: {
    fontSize: 12,
    color: GRAY_TEXT,
    marginBottom: 4,
  },
  modalLocation: {
    fontSize: 12,
    color: GRAY_TEXT,
    textAlign: "center",
    marginBottom: 16,
  },
  gpsInfoBox: {
    width: "100%",
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  gpsInfoLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: DARK_TEXT,
    marginBottom: 2,
  },
  gpsInfoValue: {
    fontSize: 12,
    color: GRAY_TEXT,
  },
  modalDisclaimer: {
    fontSize: 12,
    color: GRAY_TEXT,
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 18,
  },
  modalPrimaryBtn: {
    width: "100%",
    backgroundColor: PRIMARY_GREEN,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  modalPrimaryBtnText: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "600",
  },
  modalCancelBtn: {
    paddingVertical: 8,
  },
  modalCancelText: {
    color: GRAY_TEXT,
    fontSize: 14,
    fontWeight: "600",
  },
});
