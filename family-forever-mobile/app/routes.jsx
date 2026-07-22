import {
  View,
  Text,
  ScrollView,
  Pressable,
  Linking,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { collection, query, where, orderBy, limit, onSnapshot } from "firebase/firestore";
import { db } from "../src/firebase/config";
import { safeString } from "../src/utils/date";

// ── Color tokens ──────────────────────────────────────────────────────────────
const PRIMARY_GREEN = "#1F6F43";
const LIGHT_GREEN = "#DCFCE7";
const TEXT_GREEN = "#166534";
const DARK_TEXT = "#111827";
const GRAY_TEXT = "#6B7280";
const GRAY_BORDER = "#F3F4F6";
const PAGE_BG = "#F9FAFB";

const TABS = ["All", "Upcoming", "Active", "Done"];

export default function Routes() {
  const [user, setUser] = useState(null);
  const [shifts, setShifts] = useState([]);
  const [activeTab, setActiveTab] = useState("All");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      const stored = await AsyncStorage.getItem("user");
      if (stored) setUser(JSON.parse(stored));
    };
    loadUser();
  }, []);

  useEffect(() => {
    if (!user) return;
    const userId = user?.userId;
    const userDocId = user?.username; // Firestore doc ID stored as username field
    const userName = user?.name;
    // Primary uses orderBy+limit; secondary queries use only where+limit (no composite index needed)
    const primaryConstraints = [orderBy("startDate", "desc"), limit(100)];
    const secondaryConstraints = [limit(100)];
    const isTransport = (s) =>
      s.serviceType === "Transportation" || s.category === "Transportation" ||
      s.categoryName === "Transportation";

    let primaryShifts = [];
    let secondaryByIdShifts = [];
    let secondaryByDocIdShifts = [];
    let secondaryByNameShifts = [];
    let primaryLoaded = false;
    let secondaryByIdLoaded = false;
    let secondaryByDocIdLoaded = false;
    let secondaryByNameLoaded = false;

    const merge = () => {
      if (!primaryLoaded || !secondaryByIdLoaded || !secondaryByDocIdLoaded || !secondaryByNameLoaded) return;
      const seen = new Set();
      const combined = [
        ...primaryShifts,
        ...secondaryByIdShifts,
        ...secondaryByDocIdShifts,
        ...secondaryByNameShifts,
      ].filter(s => {
        if (seen.has(s.id)) return false;
        seen.add(s.id);
        if (s?.isDeleted) return false;
        return isTransport(s);
      });
      setShifts(combined);
      setLoading(false);
    };

    const qPrimary = userId
      ? query(collection(db, "dev_shifts"), where("userId", "==", userId), ...primaryConstraints)
      : query(collection(db, "dev_shifts"), ...primaryConstraints);
    const unsubPrimary = onSnapshot(qPrimary, (snap) => {
      primaryShifts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      primaryLoaded = true;
      merge();
    }, (err) => { console.warn("primary routes query error:", err?.message); primaryLoaded = true; merge(); });

    // Secondary query by custom userId
    let unsubSecondaryById = () => {};
    if (userId) {
      const qSecondaryById = query(collection(db, "dev_shifts"), where("secondaryUserId", "==", userId), ...secondaryConstraints);
      unsubSecondaryById = onSnapshot(qSecondaryById, (snap) => {
        secondaryByIdShifts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        secondaryByIdLoaded = true;
        merge();
      }, (err) => { console.warn("secondaryById routes query error:", err?.message); secondaryByIdLoaded = true; merge(); });
    } else {
      secondaryByIdLoaded = true;
    }

    // Secondary query by Firestore doc ID (username) — catches shifts where userId was empty at save time
    let unsubSecondaryByDocId = () => {};
    if (userDocId && userDocId !== userId) {
      const qSecondaryByDocId = query(collection(db, "dev_shifts"), where("secondaryUserId", "==", userDocId), ...secondaryConstraints);
      unsubSecondaryByDocId = onSnapshot(qSecondaryByDocId, (snap) => {
        secondaryByDocIdShifts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        secondaryByDocIdLoaded = true;
        merge();
      }, (err) => { console.warn("secondaryByDocId routes query error:", err?.message); secondaryByDocIdLoaded = true; merge(); });
    } else {
      secondaryByDocIdLoaded = true;
    }

    // Secondary fallback query by name
    let unsubSecondaryByName = () => {};
    if (userName) {
      const qSecondaryByName = query(collection(db, "dev_shifts"), where("secondaryUserName", "==", userName), ...secondaryConstraints);
      unsubSecondaryByName = onSnapshot(qSecondaryByName, (snap) => {
        secondaryByNameShifts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        secondaryByNameLoaded = true;
        merge();
      }, (err) => { console.warn("secondaryByName routes query error:", err?.message); secondaryByNameLoaded = true; merge(); });
    } else {
      secondaryByNameLoaded = true;
    }

    return () => { unsubPrimary(); unsubSecondaryById(); unsubSecondaryByDocId(); unsubSecondaryByName(); };
  }, [user]);

  const filteredShifts = shifts.filter((s) => {
    const status = getShiftStatus(s);
    if (activeTab === "All") return true;
    return status === activeTab;
  });

  function getShiftStatus(shift) {
    if (shift.clockOutTime) return "Done";
    if (shift.clockInTime) return "Active";
    return "Upcoming";
  }

  const openMaps = (location) => {
    if (!location) return;
    Linking.openURL(`https://maps.google.com/?q=${encodeURIComponent(location)}`);
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Transportation</Text>
          <Text style={styles.headerSubtitle}>Recent Transportations</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        {TABS.map((tab) => (
          <Pressable
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
          </Pressable>
        ))}
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={styles.scrollContent}
      >
        {loading ? (
          <ActivityIndicator color={PRIMARY_GREEN} style={{ marginTop: 50 }} />
        ) : filteredShifts.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="car-outline" size={60} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>No routes found</Text>
            <Text style={styles.emptySubtitle}>Adjust your filters or check back later.</Text>
          </View>
        ) : (
          filteredShifts.map((shift) => (
            <RouteCard key={shift.id} shift={shift} onOpenMaps={() => openMaps(shift.location)} />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function RouteCard({ shift, onOpenMaps }) {
  const status = shift.clockOutTime ? "Completed" : (shift.clockInTime ? "Active" : "Upcoming");
  const clientName = shift.clientName || shift.name || "Joseph Walker";
  const clientId = shift.clientId || "0987654";
  
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.statusBadge}>
          <Ionicons name="checkmark-circle" size={14} color="#10B981" />
          <Text style={styles.statusBadgeText}>{status}</Text>
        </View>
        <Text style={styles.timeText}>{safeString(shift.startTime) || "10:00 AM"}</Text>
      </View>

      <View style={styles.timelineContainer}>
        <TimelineItem 
          type="Pick Up" 
          location={safeString(shift.pickupLocation) || "Ontario, 15 BH Street"} 
          time={safeString(shift.clockInTime) || "10:00 AM"} 
          iconColor="#10B981" 
        />
        <TimelineItem 
          type="Visit" 
          location="Family Forever, Inc" 
          time="Arrived: 10:30 AM" 
          iconColor="#F59E0B" 
        />
        <TimelineItem 
          type="Drop Off" 
          location={safeString(shift.dropLocation) || "Ontario, 20 Main Street"} 
          time={shift.clockOutTime ? `Dropped: ${safeString(shift.clockOutTime)}` : "02:00 PM"} 
          iconColor="#EF4444" 
          isLast 
        />
      </View>

      <View style={styles.infoGrid}>
        <InfoItem label="Client:" value={clientName} />
        <InfoItem label="Client ID:" value={clientId} />
        <InfoItem label="Seat Type:" value="Forward Facing Seat" />
        <InfoItem label="Transportation:" value="Staff Car" />
      </View>

      <View style={styles.cardActions}>
        <Pressable onPress={onOpenMaps} style={styles.mapsBtn}>
          <Text style={styles.mapsBtnText}>View in Maps</Text>
        </Pressable>
        <Pressable onPress={() => router.push(`/transportation-detail?shiftId=${shift.id}`)} style={styles.moreBtn}>
          <Text style={styles.moreBtnText}>View More</Text>
        </Pressable>
      </View>
    </View>
  );
}

function TimelineItem({ type, location, time, iconColor, isLast }) {
  return (
    <View style={styles.timelineItem}>
      <View style={styles.timelineLeft}>
        <View style={[styles.timelineDot, { borderColor: iconColor }]}>
          <View style={[styles.timelineDotInner, { backgroundColor: iconColor }]} />
        </View>
        {!isLast && <View style={styles.timelineLine} />}
      </View>
      <View style={styles.timelineRight}>
        <Text style={[styles.timelineType, { color: iconColor }]}>{type}</Text>
        <Text style={styles.timelineLoc}>{location}</Text>
        <Text style={styles.timelineTime}>{time}</Text>
      </View>
    </View>
  );
}

function InfoItem({ label, value }) {
  return (
    <View style={styles.infoItem}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFF" },
  header: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    alignItems: "center", 
    paddingHorizontal: 20, 
    paddingTop: 10, 
    paddingBottom: 20 
  },
  headerTitle: { fontSize: 24, fontWeight: "800", color: DARK_TEXT, fontFamily: "Poppins-Bold" },
  headerSubtitle: { fontSize: 14, color: GRAY_TEXT, fontFamily: "Inter" },
  
  tabContainer: { 
    flexDirection: "row", 
    paddingHorizontal: 20, 
    gap: 8, 
    marginBottom: 10 
  },
  tab: { 
    paddingHorizontal: 16, 
    paddingVertical: 10, 
    borderRadius: 20, 
    backgroundColor: "#F3F4F6" 
  },
  tabActive: { backgroundColor: PRIMARY_GREEN },
  tabText: { fontSize: 13, fontWeight: "600", color: GRAY_TEXT, fontFamily: "Inter-SemiBold" },
  tabTextActive: { color: "#FFF" },
  
  scrollContent: { paddingHorizontal: 20, paddingBottom: 100 },
  
  card: { 
    backgroundColor: "#FFF", 
    borderRadius: 24, 
    padding: 24, 
    marginTop: 20,
    borderWidth: 1, 
    borderColor: GRAY_BORDER,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 3
  },
  cardHeader: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    alignItems: "center", 
    marginBottom: 20 
  },
  statusBadge: { 
    flexDirection: "row", 
    alignItems: "center", 
    gap: 6, 
    backgroundColor: "#F0FDF4", 
    paddingHorizontal: 10, 
    paddingVertical: 6, 
    borderRadius: 12 
  },
  statusBadgeText: { fontSize: 12, fontWeight: "700", color: "#10B981" },
  timeText: { fontSize: 12, color: GRAY_TEXT, fontWeight: "600" },
  
  timelineContainer: { marginBottom: 25 },
  timelineItem: { flexDirection: "row", minHeight: 60 },
  timelineLeft: { alignItems: "center", marginRight: 15, width: 20 },
  timelineDot: { 
    width: 20, 
    height: 20, 
    borderRadius: 10, 
    borderWidth: 2, 
    alignItems: "center", 
    justifyContent: "center",
    backgroundColor: "#FFF"
  },
  timelineDotInner: { width: 8, height: 8, borderRadius: 4 },
  timelineLine: { width: 2, flex: 1, backgroundColor: "#E5E7EB", marginVertical: 2 },
  timelineRight: { flex: 1 },
  timelineType: { fontSize: 13, fontWeight: "700", marginBottom: 2 },
  timelineLoc: { fontSize: 14, fontWeight: "500", color: DARK_TEXT },
  timelineTime: { fontSize: 12, color: GRAY_TEXT, marginTop: 2 },
  
  infoGrid: { borderTopWidth: 1, borderTopColor: GRAY_BORDER, paddingTop: 20, gap: 12 },
  infoItem: { flexDirection: "row", justifyContent: "space-between" },
  infoLabel: { fontSize: 14, color: "#9CA3AF" },
  infoValue: { fontSize: 14, fontWeight: "600", color: DARK_TEXT },
  
  cardActions: { 
    flexDirection: "row", 
    gap: 12, 
    marginTop: 25 
  },
  mapsBtn: { 
    flex: 1, 
    height: 48, 
    borderRadius: 12, 
    borderWidth: 1.5, 
    borderColor: PRIMARY_GREEN, 
    alignItems: "center", 
    justifyContent: "center" 
  },
  mapsBtnText: { color: PRIMARY_GREEN, fontSize: 14, fontWeight: "700" },
  moreBtn: { 
    flex: 1, 
    height: 48, 
    borderRadius: 12, 
    backgroundColor: PRIMARY_GREEN, 
    alignItems: "center", 
    justifyContent: "center" 
  },
  moreBtnText: { color: "#FFF", fontSize: 14, fontWeight: "700" },

  emptyContainer: { alignItems: "center", marginTop: 100 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: DARK_TEXT, marginTop: 15 },
  emptySubtitle: { fontSize: 14, color: GRAY_TEXT, textAlign: "center", marginTop: 8 },
});
