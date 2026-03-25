import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect, useState, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
} from "firebase/firestore";
import { db } from "../src/firebase/config";
import { router } from "expo-router";

// ── Color tokens ───────────────────────────────────────────────────────────────
const PRIMARY_GREEN = "#1F6F43";
const LIGHT_GREEN = "#F0FDF4";
const DARK_TEXT = "#1A1A1A";
const GRAY_TEXT = "#9CA3AF";
const GRAY_BORDER = "#E5E7EB";
const GRAY_LIGHT = "#F8F8F6";
const ERROR_RED = "#EF4444";
const WARNING_AMBER = "#F59E0B";
const BLUE = "#3B82F6";

// ── Status config ──────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  Completed: { bg: LIGHT_GREEN, text: PRIMARY_GREEN, dot: "#22C55E" },
  "In Progress": { bg: "#EBF5FF", text: "#1E5FA6", dot: BLUE },
  Missed: { bg: "#FEF2F2", text: "#B91C1C", dot: ERROR_RED },
  Assigned: { bg: "#FFF8E1", text: "#92600A", dot: WARNING_AMBER },
  Confirmed: { bg: LIGHT_GREEN, text: PRIMARY_GREEN, dot: "#22C55E" },
};

// ── Filter helpers ─────────────────────────────────────────────────────────────
const getFilterDates = (filter) => {
  const now = new Date();
  if (filter === "This Week") {
    const day = now.getDay(); // 0=Sun
    const diffToMon = (day + 6) % 7;
    const mon = new Date(now);
    mon.setDate(now.getDate() - diffToMon);
    mon.setHours(0, 0, 0, 0);
    return { from: mon, to: null };
  }
  if (filter === "This Month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from: start, to: null };
  }
  return { from: null, to: null };
};

const parseShiftDate = (shift) => {
  const raw = shift.startDate || shift.date || "";
  if (!raw) return null;
  // Handle "MM/DD/YYYY", "YYYY-MM-DD", or Firestore Timestamp
  if (raw?.seconds) return new Date(raw.seconds * 1000);
  const d = new Date(raw);
  return isNaN(d) ? null : d;
};

const calculateDuration = (start, end) => {
  if (!start || !end) return "—";
  try {
    const parseTime = (t) => {
      const [time, period] = t.split(" ");
      let [h, m] = time.split(":").map(Number);
      if (period?.toUpperCase() === "PM" && h !== 12) h += 12;
      if (period?.toUpperCase() === "AM" && h === 12) h = 0;
      return h + (m || 0) / 60;
    };
    let diff = parseTime(end) - parseTime(start);
    if (diff < 0) diff += 24;
    return `${Math.round(diff * 10) / 10} hrs`;
  } catch {
    return "—";
  }
};

const deriveStatus = (shift) => {
  if (shift.status) return shift.status;
  if (shift.checkedIn && shift.checkedOut) return "Completed";
  if (shift.checkedIn && !shift.checkedOut) return "In Progress";
  if (shift.missed) return "Missed";
  if (shift.shiftConfirmed) return "Confirmed";
  return "Assigned";
};

// ── Summary Card ──────────────────────────────────────────────────────────────
function SummaryCard({ icon, iconBg, iconColor, label, value }) {
  return (
    <View style={styles.summaryCard}>
      <View style={[styles.summaryIconBox, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={22} color={iconColor} />
      </View>
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

// ── Shift Report Card ─────────────────────────────────────────────────────────
function ShiftReportCard({ shift }) {
  const status = deriveStatus(shift);
  const statusCfg = STATUS_CONFIG[status] || STATUS_CONFIG["Assigned"];
  const clientName = shift.clientName || shift.name || "Client";
  const date = shift.startDate || shift.date || "—";
  const time = `${shift.startTime || "—"} – ${shift.endTime || "—"}`;
  const duration = calculateDuration(shift.startTime, shift.endTime);

  return (
    <Pressable
      style={styles.reportCard}
      onPress={() => router.push(`/shift-detail?shiftId=${shift.id}`)}
    >
      {/* Top row: date + status badge */}
      <View style={styles.reportCardTop}>
        <View style={styles.reportDateRow}>
          <Ionicons name="calendar-outline" size={14} color={GRAY_TEXT} />
          <Text style={styles.reportDate}>{date}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusCfg.bg }]}>
          <View style={[styles.statusDot, { backgroundColor: statusCfg.dot }]} />
          <Text style={[styles.statusText, { color: statusCfg.text }]}>
            {status}
          </Text>
        </View>
      </View>

      {/* Client name */}
      <Text style={styles.reportClient} numberOfLines={1}>
        {clientName}
      </Text>

      {/* Time + duration row */}
      <View style={styles.reportMeta}>
        <View style={styles.reportMetaItem}>
          <Ionicons name="time-outline" size={14} color={GRAY_TEXT} />
          <Text style={styles.reportMetaText}>{time}</Text>
        </View>
        <View style={styles.reportMetaItem}>
          <Ionicons name="hourglass-outline" size={14} color={GRAY_TEXT} />
          <Text style={styles.reportMetaText}>{duration}</Text>
        </View>
      </View>

      {/* Service type */}
      {!!shift.serviceType && (
        <Text style={styles.reportService} numberOfLines={1}>
          {shift.serviceType}
        </Text>
      )}

      {/* View details link */}
      <View style={styles.viewDetailsRow}>
        <Text style={styles.viewDetailsText}>View Details</Text>
        <Ionicons name="chevron-forward" size={14} color={PRIMARY_GREEN} />
      </View>
    </Pressable>
  );
}

// ── Main Screen ────────────────────────────────────────────────────────────────
export default function StaffReports() {
  const [user, setUser] = useState(null);
  const [allShifts, setAllShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState("All");

  const FILTERS = ["All", "This Week", "This Month"];

  // Load user from AsyncStorage
  useEffect(() => {
    const loadUser = async () => {
      const stored = await AsyncStorage.getItem("user");
      if (stored) setUser(JSON.parse(stored));
    };
    loadUser();
  }, []);

  // Fetch shifts once user is loaded
  useEffect(() => {
    if (user !== null) fetchShifts();
  }, [user]);

  const fetchShifts = useCallback(async () => {
    try {
      let q;
      const staffId = user?.uid || user?.id || user?.staffId;
      const staffEmail = user?.email;

      if (staffId) {
        // Try staffId field
        q = query(
          collection(db, "shifts"),
          where("staffId", "==", staffId)
        );
        let snap = await getDocs(q);
        if (!snap.empty) {
          const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          setAllShifts(docs);
          return;
        }
        // Try userId field
        q = query(collection(db, "shifts"), where("userId", "==", staffId));
        snap = await getDocs(q);
        if (!snap.empty) {
          setAllShifts(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
          return;
        }
      }

      if (staffEmail) {
        q = query(
          collection(db, "shifts"),
          where("staffEmail", "==", staffEmail)
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          setAllShifts(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
          return;
        }
      }

      // Fallback: fetch all and let user see their own
      const snap = await getDocs(collection(db, "shifts"));
      setAllShifts(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.log("Error fetching shifts:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchShifts();
  };

  // Apply filter
  const filteredShifts = (() => {
    if (activeFilter === "All") return allShifts;
    const { from } = getFilterDates(activeFilter);
    return allShifts.filter((s) => {
      const d = parseShiftDate(s);
      if (!d) return false;
      return from ? d >= from : true;
    });
  })();

  // Sort by date desc
  const sortedShifts = [...filteredShifts].sort((a, b) => {
    const da = parseShiftDate(a);
    const db_ = parseShiftDate(b);
    if (!da && !db_) return 0;
    if (!da) return 1;
    if (!db_) return -1;
    return db_ - da;
  });

  // Summary stats
  const totalShifts = filteredShifts.length;
  const completed = filteredShifts.filter(
    (s) => deriveStatus(s) === "Completed"
  ).length;
  const pending = filteredShifts.filter((s) => {
    const st = deriveStatus(s);
    return st === "Assigned" || st === "Confirmed";
  }).length;
  const totalHours = filteredShifts.reduce((acc, s) => {
    const dur = calculateDuration(s.startTime, s.endTime);
    const n = parseFloat(dur);
    return acc + (isNaN(n) ? 0 : n);
  }, 0);

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={PRIMARY_GREEN} />
        <Text style={styles.loadingText}>Loading reports…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.headerBack}>
          <Ionicons name="chevron-back" size={26} color={DARK_TEXT} />
        </Pressable>
        <Text style={styles.headerTitle}>Reports</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={PRIMARY_GREEN}
          />
        }
      >
        {/* ── Filter Tabs ── */}
        <View style={styles.filterRow}>
          {FILTERS.map((f) => (
            <Pressable
              key={f}
              style={[
                styles.filterTab,
                activeFilter === f && styles.filterTabActive,
              ]}
              onPress={() => setActiveFilter(f)}
            >
              <Text
                style={[
                  styles.filterTabText,
                  activeFilter === f && styles.filterTabTextActive,
                ]}
              >
                {f}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* ── Summary Cards ── */}
        <View style={styles.summaryGrid}>
          <SummaryCard
            icon="calendar-outline"
            iconBg="#EBF5FF"
            iconColor={BLUE}
            label="Total Shifts"
            value={totalShifts}
          />
          <SummaryCard
            icon="time-outline"
            iconBg={LIGHT_GREEN}
            iconColor={PRIMARY_GREEN}
            label="Total Hours"
            value={`${Math.round(totalHours * 10) / 10}`}
          />
          <SummaryCard
            icon="checkmark-circle-outline"
            iconBg={LIGHT_GREEN}
            iconColor={PRIMARY_GREEN}
            label="Completed"
            value={completed}
          />
          <SummaryCard
            icon="hourglass-outline"
            iconBg="#FFF8E1"
            iconColor={WARNING_AMBER}
            label="Pending"
            value={pending}
          />
        </View>

        {/* ── Shift Reports List ── */}
        <Text style={styles.sectionLabel}>
          SHIFT HISTORY
          {sortedShifts.length > 0 && (
            <Text style={styles.sectionCount}> ({sortedShifts.length})</Text>
          )}
        </Text>

        {sortedShifts.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconBox}>
              <Ionicons name="document-text-outline" size={40} color={GRAY_TEXT} />
            </View>
            <Text style={styles.emptyTitle}>No reports found</Text>
            <Text style={styles.emptySubtitle}>
              {activeFilter === "All"
                ? "You have no shift records yet."
                : `No shifts found for ${activeFilter.toLowerCase()}.`}
            </Text>
          </View>
        ) : (
          sortedShifts.map((shift) => (
            <ShiftReportCard key={shift.id} shift={shift} />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: GRAY_LIGHT,
  },
  centered: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  loadingText: {
    marginTop: 14,
    fontSize: 15,
    color: GRAY_TEXT,
    fontWeight: "500",
  },
  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: GRAY_BORDER,
  },
  headerBack: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: DARK_TEXT,
    letterSpacing: -0.3,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 100,
  },
  // Filter tabs
  filterRow: {
    flexDirection: "row",
    backgroundColor: "#F3F4F6",
    borderRadius: 14,
    padding: 4,
    marginBottom: 20,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 9,
    alignItems: "center",
    borderRadius: 11,
  },
  filterTabActive: {
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: "600",
    color: GRAY_TEXT,
  },
  filterTabTextActive: {
    color: DARK_TEXT,
    fontWeight: "800",
  },
  // Summary grid
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 24,
  },
  summaryCard: {
    width: "47%",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: GRAY_BORDER,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  summaryIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  summaryValue: {
    fontSize: 26,
    fontWeight: "800",
    color: DARK_TEXT,
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: GRAY_TEXT,
    fontWeight: "500",
  },
  // Section label
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: GRAY_TEXT,
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  sectionCount: {
    fontSize: 11,
    fontWeight: "600",
    color: GRAY_TEXT,
  },
  // Empty state
  emptyState: {
    alignItems: "center",
    paddingVertical: 48,
  },
  emptyIconBox: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: DARK_TEXT,
    letterSpacing: -0.3,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: GRAY_TEXT,
    textAlign: "center",
    lineHeight: 22,
  },
  // Report card
  reportCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: GRAY_BORDER,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  reportCardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  reportDateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  reportDate: {
    fontSize: 13,
    color: GRAY_TEXT,
    fontWeight: "500",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: -0.1,
  },
  reportClient: {
    fontSize: 16,
    fontWeight: "800",
    color: DARK_TEXT,
    letterSpacing: -0.3,
    marginBottom: 10,
  },
  reportMeta: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 8,
  },
  reportMetaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  reportMetaText: {
    fontSize: 13,
    color: GRAY_TEXT,
    fontWeight: "500",
  },
  reportService: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
    marginBottom: 12,
    backgroundColor: "#F3F4F6",
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
  },
  viewDetailsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: GRAY_BORDER,
  },
  viewDetailsText: {
    fontSize: 13,
    fontWeight: "700",
    color: PRIMARY_GREEN,
  },
});
