import React, { useMemo, useState, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  SafeAreaView,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  doc,
  query,
  collection,
  where,
  onSnapshot,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../src/firebase/config";
import { useLocalSearchParams, useRouter } from "expo-router";

const { width } = Dimensions.get("window");

// Figma Color Palette
const PRIMARY_GREEN = "#18633F"; // Deep Emerald from Figma
const LIGHT_GREEN_BG = "#DCFCE7";
const TEXT_GREEN = "#166534";
const PENDING_YELLOW_BG = "#FEF9C3";
const PENDING_YELLOW_TEXT = "#854D0E";
const GRAY_TEXT = "#6B7280";
const DARK_TEXT = "#111827";
const GRAY_BORDER = "#F3F4F6";
const PAGE_BG = "#F9FAFB";

const SERVICES = [
  { key: "emergentCare", label: "Emergent Care" },
  { key: "respiteCare", label: "Respite Care" },
  { key: "transportations", label: "Transportations" },
  { key: "supervisedVisitations", label: "Supervised Visitations" },
];

const PERIODS = [
  { key: "morning", label: "Morning", time: "06:00 - 14:00", icon: "☀️" },
  { key: "evening", label: "Evening", time: "14:00 - 22:00", icon: "🌇" },
  { key: "night", label: "Night", time: "22:00 - 06:00", icon: "🌙" },
];

const pad2 = (n) => String(n).padStart(2, "0");
const toDateKey = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

function RequestCard({ icon, title, date, note, status }) {
  const isApproved = status === "Approved";
  const isPending = status === "Pending";
  
  // Icon style mapping based on Figma
  const getIconStyle = () => {
    switch(title) {
      case "Vacation": return { bg: "#FFF7ED", color: "#F59E0B", icon: "sunny-outline" };
      case "Personal": return { bg: "#EEF2FF", color: "#4F46E5", icon: "briefcase-outline" };
      case "Sick Leave": return { bg: "#FEE2E2", color: "#EF4444", icon: "alert-circle-outline" };
      default: return { bg: "#F3F4F6", color: "#6B7280", icon: "document-text-outline" };
    }
  };

  const style = getIconStyle();

  return (
    <View style={styles.requestCard}>
      <View style={[styles.requestIconContainer, { backgroundColor: style.bg }]}>
        <Ionicons name={style.icon} size={22} color={style.color} />
      </View>
      <View style={{ flex: 1, marginLeft: 12 }}>
        <View style={styles.requestHeaderRow}>
          <Text style={styles.requestTitle}>{title}</Text>
          <View style={[
            styles.statusBadge, 
            { backgroundColor: isApproved ? LIGHT_GREEN_BG : PENDING_YELLOW_BG }
          ]}>
            <Ionicons 
              name={isApproved ? "checkmark-circle" : "time"} 
              size={14} 
              color={isApproved ? TEXT_GREEN : PENDING_YELLOW_TEXT} 
            />
            <Text style={[
              styles.statusText, 
              { color: isApproved ? TEXT_GREEN : PENDING_YELLOW_TEXT }
            ]}>
              {status}
            </Text>
          </View>
        </View>
        <Text style={styles.requestDate}>{date}</Text>
        {note ? <Text style={styles.requestNote}>{note}</Text> : null}
      </View>
    </View>
  );
}

export default function Availability() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const userId = Array.isArray(params.userId) ? params.userId[0] : params.userId;

  const [activeTab, setActiveTab] = useState("My Availability");
  const [isEditing, setIsEditing] = useState(false);
  const [user, setUser] = useState(null);
  const [draftAvail, setDraftAvail] = useState({});
  const [timeOffRequests, setTimeOffRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday;
  });

  const [selectedDate, setSelectedDate] = useState(new Date());
  const selectedKey = toDateKey(selectedDate);

  useEffect(() => {
    if (!userId) return;
    const unsubUser = onSnapshot(doc(db, "users", userId), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setUser(data);
        setDraftAvail(JSON.parse(JSON.stringify(data.availability || {})));
      }
      setLoading(false);
    });

    const q = query(collection(db, "timeOffRequests"), where("userId", "==", userId));
    const unsubTimeOff = onSnapshot(q, (snap) => {
      setTimeOffRequests(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => { unsubUser(); unsubTimeOff(); };
  }, [userId]);

  const weekDaysData = useMemo(() => {
    const days = [];
    const source = isEditing ? draftAvail : (user?.availability || {});
    for (let i = 0; i < 7; i++) {
      const d = new Date(currentWeekStart);
      d.setDate(currentWeekStart.getDate() + i);
      const key = toDateKey(d);
      const availData = source[key] || null;
      
      const dayAvail = [];
      if (availData) {
        if (Object.values(availData.morning || {}).some(v => v === true)) dayAvail.push("8:00AM-4:00PM");
        if (Object.values(availData.evening || {}).some(v => v === true)) dayAvail.push("2:00PM-10:00PM");
        if (Object.values(availData.night || {}).some(v => v === true)) dayAvail.push("10:00PM-6:00AM");
      }

      const isSelected = toDateKey(d) === toDateKey(selectedDate);

      days.push({
        day: d.toLocaleString("en-US", { weekday: "short" }).toUpperCase(),
        date: d.getDate().toString(),
        avail: dayAvail,
        icon: (dayAvail.length === 0 && !isEditing) ? "moon-outline" : null,
        highlighted: isSelected,
        key: key,
        rawDate: new Date(d)
      });
    }
    return days;
  }, [currentWeekStart, user, isEditing, draftAvail, selectedDate]);

  const stats = useMemo(() => {
    let daysCount = 0, hoursCount = 0;
    weekDaysData.forEach(d => { if (d.avail.length > 0) { daysCount++; hoursCount += d.avail.length * 8; } });
    return { days: daysCount, hours: hoursCount };
  }, [weekDaysData]);

  const saveToFirebase = async () => {
    try {
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, {
        availability: draftAvail,
        updatedAt: serverTimestamp()
      });
      setIsEditing(false);
      Alert.alert("Success", "Availability updated successfully");
    } catch (e) {
      Alert.alert("Error", "Failed to save availability");
    }
  };

  const toggleService = (period, service) => {
    const key = selectedKey;
    const next = JSON.parse(JSON.stringify(draftAvail));
    if (!next[key]) next[key] = { morning: {}, evening: {}, night: {} };
    if (!next[key][period]) next[key][period] = {};
    next[key][period][service] = !next[key][period][service];
    setDraftAvail(next);
  };

  if (loading) return <View style={{ flex: 1, justifyContent: "center" }}><ActivityIndicator size="large" color={PRIMARY_GREEN} /></View>;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: PAGE_BG }}>
      {/* HEADER */}
      <View style={styles.header}>
        <Pressable onPress={() => isEditing ? setIsEditing(false) : router.back()} style={styles.backButton}>
          <Ionicons name={isEditing ? "close" : "arrow-back"} size={24} color={DARK_TEXT} />
        </Pressable>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>{isEditing ? "Edit Availability" : "Availability"}</Text>
          <Text style={styles.headerSubtitle}>{user?.name} · Staff</Text>
        </View>
        <Pressable style={styles.plusButton}>
          <Ionicons name="add" size={28} color={PRIMARY_GREEN} />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {!isEditing && (
          <View style={styles.tabContainer}>
            {["My Availability", "Schedule Overview"].map(t => (
              <Pressable key={t} onPress={() => setActiveTab(t)} style={[styles.tab, activeTab === t && styles.activeTab]}>
                <Text style={[styles.tabText, activeTab === t && styles.activeTabText]}>{t}</Text>
              </Pressable>
            ))}
          </View>
        )}

        {/* WEEK SELECTOR */}
        <View style={styles.weekSelector}>
          <Pressable onPress={() => setCurrentWeekStart(new Date(new Date(currentWeekStart).setDate(currentWeekStart.getDate() - 7)))}>
            <Ionicons name="chevron-back" size={24} color={GRAY_TEXT} />
          </Pressable>
          <View style={{ alignItems: "center" }}>
            <Text style={styles.dateRange}>{currentWeekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – {new Date(new Date(currentWeekStart).setDate(currentWeekStart.getDate() + 6)).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</Text>
            <View style={styles.thisWeekBadge}>
              <Text style={styles.thisWeekText}>This Week</Text>
            </View>
          </View>
          <Pressable onPress={() => setCurrentWeekStart(new Date(new Date(currentWeekStart).setDate(currentWeekStart.getDate() + 7)))}>
            <Ionicons name="chevron-forward" size={24} color={GRAY_TEXT} />
          </Pressable>
        </View>

        {!isEditing && (
          <View style={styles.statsBar}>
            <View style={styles.statItem}>
              <Ionicons name="calendar-outline" size={20} color={PRIMARY_GREEN} />
              <Text style={styles.statText}><Text style={styles.boldStat}>{stats.days} days</Text> available</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="time-outline" size={20} color={PRIMARY_GREEN} />
              <Text style={styles.statText}><Text style={styles.boldStat}>{stats.hours}h</Text> total</Text>
            </View>
          </View>
        )}

        {/* CALENDAR GRID */}
        <View style={styles.gridCard}>
          <View style={styles.gridHeader}>
            {weekDaysData.map((wd, i) => (
              <Pressable key={i} onPress={() => setSelectedDate(wd.rawDate)} style={styles.gridHeaderItem}>
                <Text style={styles.gridDayName}>{wd.day}</Text>
                <View style={[styles.gridDateCircle, wd.highlighted && styles.activeDateCircle]}>
                  <Text style={[styles.gridDateText, wd.highlighted && styles.activeDateText]}>{wd.date}</Text>
                </View>
              </Pressable>
            ))}
          </View>
          <View style={styles.gridDivider} />
          <View style={styles.gridBody}>
            {weekDaysData.map((wd, i) => (
              <View key={i} style={styles.gridColumn}>
                {wd.avail.map((time, idx) => (
                  <View key={idx} style={styles.timePill}>
                    <Text style={styles.timePillText}>{time.split("-")[0]}</Text>
                    <Text style={styles.timePillText}>{time.split("-")[1]}</Text>
                  </View>
                ))}
                {wd.icon && <View style={styles.moonContainer}><Ionicons name={wd.icon} size={18} color="#D1D5DB" /></View>}
              </View>
            ))}
          </View>
        </View>

        {isEditing ? (
          <View style={{ paddingHorizontal: 20, marginTop: 25 }}>
            <Text style={{ fontWeight: "800", marginBottom: 15, fontSize: 16 }}>Set Hours for {selectedDate.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}</Text>
            {PERIODS.map(p => (
              <View key={p.key} style={styles.editPeriodCard}>
                <Text style={{ fontWeight: "700", marginBottom: 10 }}>{p.icon} {p.label} ({p.time})</Text>
                {SERVICES.map(s => (
                  <Pressable key={s.key} onPress={() => toggleService(p.key, s.key)} style={styles.serviceRow}>
                    <View style={[
                      styles.checkbox, 
                       draftAvail[selectedKey]?.[p.key]?.[s.key] && styles.checkboxActive
                    ]}>
                      {draftAvail[selectedKey]?.[p.key]?.[s.key] && <Ionicons name="checkmark" size={14} color="white" />}
                    </View>
                    <Text style={styles.serviceLabel}>{s.label}</Text>
                  </Pressable>
                ))}
              </View>
            ))}
            <Pressable onPress={saveToFirebase} style={styles.filledButton}>
              <Text style={styles.filledButtonText}>Save Availability</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={styles.actionButtonRow}>
              <Pressable style={styles.outlinedButton}>
                <Text style={styles.outlinedButtonText}>Copy to Next Week</Text>
              </Pressable>
              <Pressable onPress={() => setIsEditing(true)} style={styles.filledButton}>
                <Text style={styles.filledButtonText}>Edit Availability</Text>
              </Pressable>
            </View>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Time-Off Requests</Text>
              <Pressable>
                <Text style={styles.newRequestLink}>+ New Request</Text>
              </Pressable>
            </View>

            <View style={styles.requestList}>
              {timeOffRequests.length === 0 ? (
                <View style={styles.emptyRequests}>
                  <Text style={styles.emptyText}>No requests found</Text>
                </View>
              ) : (
                timeOffRequests.map((req, idx) => (
                  <RequestCard 
                    key={req.id || idx} 
                    title={req.type} 
                    date={req.dateRange} 
                    note={req.note} 
                    status={req.status} 
                  />
                ))
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { 
    flexDirection: "row", 
    alignItems: "center", 
    justifyContent: "space-between", 
    paddingHorizontal: 20, 
    paddingVertical: 15,
    backgroundColor: PAGE_BG
  },
  headerTitleContainer: { alignItems: "center", flex: 1 },
  headerTitle: { fontSize: 20, fontWeight: "800", color: DARK_TEXT },
  headerSubtitle: { fontSize: 13, color: GRAY_TEXT, marginTop: 2 },
  backButton: { padding: 8 },
  plusButton: { backgroundColor: "#FFF", width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: GRAY_BORDER },
  tabContainer: { flexDirection: "row", backgroundColor: "#F3F4F6", marginHorizontal: 20, borderRadius: 14, padding: 4, marginTop: 10 },
  tab: { flex: 1, paddingVertical: 12, alignItems: "center", borderRadius: 10 },
  activeTab: { backgroundColor: "#FFF", elevation: 2 },
  tabText: { fontSize: 14, fontWeight: "600", color: GRAY_TEXT },
  activeTabText: { color: DARK_TEXT },
  weekSelector: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 30, marginTop: 25 },
  dateRange: { fontSize: 18, fontWeight: "800", color: DARK_TEXT },
  thisWeekBadge: { backgroundColor: LIGHT_GREEN_BG, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginTop: 4 },
  thisWeekText: { fontSize: 11, fontWeight: "700", color: TEXT_GREEN },
  statsBar: { flexDirection: "row", justifyContent: "space-around", backgroundColor: "#FFF", borderWidth: 1, borderColor: GRAY_BORDER, marginHorizontal: 20, borderRadius: 16, paddingVertical: 15, marginTop: 25 },
  statItem: { flexDirection: "row", alignItems: "center", gap: 8 },
  statText: { fontSize: 14, color: GRAY_TEXT },
  boldStat: { fontWeight: "800", color: DARK_TEXT },
  gridCard: { marginHorizontal: 20, marginTop: 25, backgroundColor: "#FFF", borderRadius: 20, borderWidth: 1, borderColor: GRAY_BORDER, paddingVertical: 20 },
  gridHeader: { flexDirection: "row", justifyContent: "space-around", paddingHorizontal: 10 },
  gridHeaderItem: { alignItems: "center" },
  gridDayName: { fontSize: 11, fontWeight: "700", color: "#9CA3AF", marginBottom: 8 },
  gridDateCircle: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  activeDateCircle: { backgroundColor: PRIMARY_GREEN },
  gridDateText: { fontSize: 16, fontWeight: "800", color: DARK_TEXT },
  activeDateText: { color: "#FFF" },
  gridDivider: { height: 1, backgroundColor: GRAY_BORDER, marginVertical: 15 },
  gridBody: { flexDirection: "row", justifyContent: "space-around", paddingHorizontal: 10 },
  gridColumn: { width: width * 0.11, alignItems: "center", gap: 6 },
  timePill: { backgroundColor: LIGHT_GREEN_BG, paddingVertical: 6, paddingHorizontal: 2, borderRadius: 8, width: "100%", alignItems: "center" },
  timePillText: { fontSize: 7, fontWeight: "800", color: TEXT_GREEN },
  moonContainer: { width: 34, height: 34, borderRadius: 17, backgroundColor: PAGE_BG, alignItems: "center", justifyContent: "center" },
  actionButtonRow: { flexDirection: "row", paddingHorizontal: 20, gap: 12, marginTop: 30 },
  outlinedButton: { flex: 1, borderWidth: 1.5, borderColor: PRIMARY_GREEN, borderRadius: 14, paddingVertical: 14, alignItems: "center" },
  outlinedButtonText: { fontSize: 15, fontWeight: "800", color: PRIMARY_GREEN },
  filledButton: { flex: 1, backgroundColor: PRIMARY_GREEN, borderRadius: 14, paddingVertical: 14, alignItems: "center" },
  filledButtonText: { fontSize: 15, fontWeight: "800", color: "#FFF" },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, marginTop: 40, marginBottom: 15 },
  sectionTitle: { fontSize: 18, fontWeight: "800", color: DARK_TEXT },
  newRequestLink: { fontSize: 14, color: PRIMARY_GREEN, fontWeight: "600" },
  requestList: { paddingHorizontal: 20, gap: 12 },
  requestCard: { flexDirection: "row", backgroundColor: "#FFF", borderRadius: 18, padding: 20, borderWidth: 1, borderColor: GRAY_BORDER, marginBottom: 12 },
  requestIconContainer: { width: 50, height: 50, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  requestHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  requestTitle: { fontSize: 16, fontWeight: "800", color: DARK_TEXT },
  statusBadge: { flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, gap: 6 },
  statusText: { fontSize: 12, fontWeight: "700" },
  requestDate: { fontSize: 14, color: GRAY_TEXT, marginTop: 2 },
  requestNote: { fontSize: 14, color: GRAY_TEXT, marginTop: 12 },
  editPeriodCard: { backgroundColor: "#FFF", borderRadius: 18, padding: 15, marginBottom: 15, borderWidth: 1, borderColor: GRAY_BORDER },
  serviceRow: { flexDirection: "row", alignItems: "center", marginTop: 10 },
  checkbox: { height: 22, width: 22, borderRadius: 6, borderWidth: 1.5, borderColor: "#CBD5E1", alignItems: "center", justifyContent: "center", marginRight: 12 },
  checkboxActive: { backgroundColor: PRIMARY_GREEN, borderColor: PRIMARY_GREEN },
  serviceLabel: { fontSize: 14, color: DARK_TEXT, fontWeight: "500" },
  emptyRequests: { padding: 30, alignItems: "center" },
  emptyText: { color: "#9CA3AF", fontSize: 14, fontWeight: "500" },
});
