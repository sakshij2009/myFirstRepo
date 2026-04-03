import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import { db } from "../src/firebase/config";

// ── Color tokens ──────────────────────────────────────────────────────────────
const PRIMARY_GREEN = "#1F6F43";
const LIGHT_GREEN = "#DCFCE7";
const TEXT_GREEN = "#166534";
const DARK_TEXT = "#111827";
const GRAY_TEXT = "#6B7280";
const GRAY_BORDER = "#F3F4F6";
const PAGE_BG = "#F9FAFB";
const PENDING_YELLOW = "#FEF9C3";
const PENDING_TEXT = "#854D0E";

// ── Constants ─────────────────────────────────────────────────────────────────
const DAYS = [
  { key: "mon", label: "Monday", short: "MON", date: "9", hasShift: true },
  { key: "tue", label: "Tuesday", short: "TUE", date: "10", hasShift: true },
  { key: "wed", label: "Wednesday", short: "WED", date: "11", hasShift: true },
  { key: "thu", label: "Thursday", short: "THU", date: "12", hasShift: false },
  { key: "fri", label: "Friday", short: "FRI", date: "13", hasShift: true },
  { key: "sat", label: "Saturday", short: "SAT", date: "14", hasShift: true },
  { key: "sun", label: "Sunday", short: "SUN", date: "15", hasShift: false },
];

export default function Availability() {
  const [activeTab, setActiveTab] = useState("AVAILABILITY"); // AVAILABILITY or OVERVIEW
  const [user, setUser] = useState(null);
  const [showQuickActions, setShowQuickActions] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      const stored = await AsyncStorage.getItem("user");
      if (stored) setUser(JSON.parse(stored));
    };
    loadUser();
  }, []);

  const renderAvailability = () => (
    <View style={{ flex: 1 }}>
      {/* Week Selector */}
      <View style={styles.weekSelector}>
        <Pressable><Ionicons name="chevron-back" size={20} color={GRAY_TEXT} /></Pressable>
        <View style={{ alignItems: "center" }}>
          <Text style={styles.dateRangeText}>March 9 – 15, 2026</Text>
          <View style={styles.thisWeekBadge}>
            <Text style={styles.thisWeekText}>This Week</Text>
          </View>
        </View>
        <Pressable><Ionicons name="chevron-forward" size={20} color={GRAY_TEXT} /></Pressable>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Ionicons name="calendar-outline" size={18} color={PRIMARY_GREEN} />
          <Text style={styles.statText}><Text style={{ fontWeight: "700", color: DARK_TEXT }}>5 days</Text> available</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="time-outline" size={18} color={PRIMARY_GREEN} />
          <Text style={styles.statText}><Text style={{ fontWeight: "700", color: DARK_TEXT }}>33h</Text> total</Text>
        </View>
      </View>

      {/* Grid Card */}
      <View style={styles.gridCard}>
        <View style={styles.gridHeader}>
          {DAYS.map((d) => (
            <View key={d.key} style={styles.gridHeaderCol}>
              <Text style={styles.gridDayLabel}>{d.short}</Text>
              <View style={[styles.gridDateCircle, d.date === "14" && styles.gridDateCircleActive]}>
                <Text style={[styles.gridDateText, d.date === "14" && { color: "#FFF" }]}>{d.date}</Text>
              </View>
              {d.hasShift && d.date !== "14" && <View style={styles.gridDot} />}
            </View>
          ))}
        </View>
        <View style={styles.gridDivider} />
        <View style={styles.gridBody}>
          {DAYS.map((d) => (
            <View key={d.key} style={styles.gridBodyCol}>
              {d.key === "mon" && (
                <View style={styles.timePill}><Text style={styles.timePillText}>8:00AM</Text><Text style={styles.timePillText}>4:00PM</Text></View>
              )}
              {d.key === "tue" && (
                <View style={styles.timePill}><Text style={styles.timePillText}>8:00AM</Text><Text style={styles.timePillText}>12:00PM</Text></View>
              )}
              {d.key === "wed" && (
                <>
                  <View style={styles.timePill}><Text style={styles.timePillText}>9:00AM</Text><Text style={styles.timePillText}>5:00PM</Text></View>
                  <View style={styles.timePill}><Text style={styles.timePillText}>2:00PM</Text><Text style={styles.timePillText}>6:00PM</Text></View>
                </>
              )}
              {d.key === "thu" && <Ionicons name="moon-outline" size={16} color="#D1D5DB" />}
              {d.key === "fri" && (
                <View style={styles.timePill}><Text style={styles.timePillText}>8:00AM</Text><Text style={styles.timePillText}>1:00PM</Text></View>
              )}
              {d.key === "sat" && (
                <View style={styles.timePill}><Text style={styles.timePillText}>8:00AM</Text><Text style={styles.timePillText}>1:00PM</Text></View>
              )}
              {d.key === "sun" && <Ionicons name="moon-outline" size={16} color="#D1D5DB" />}
            </View>
          ))}
        </View>
      </View>

      {/* Buttons */}
      <View style={styles.actionRow}>
        <Pressable style={styles.outlineBtn}><Text style={styles.outlineBtnText}>Copy to Next Week</Text></Pressable>
        <Pressable style={styles.solidBtn}><Text style={styles.solidBtnText}>Edit Availability</Text></Pressable>
      </View>

      {/* Time-Off Requests */}
      <View style={styles.timeOffSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Time-Off Requests</Text>
          <Pressable onPress={() => router.push("/request-time-off")}><Text style={styles.newRequestLink}>+ New Request</Text></Pressable>
        </View>

        <View style={styles.requestCard}>
          <View style={[styles.requestIcon, { backgroundColor: "#FFF7ED" }]}><Ionicons name="sunny-outline" size={20} color="#F59E0B" /></View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <View style={styles.requestHeader}>
              <Text style={styles.requestTitleText}>Vacation</Text>
              <View style={[styles.statusBadge, { backgroundColor: LIGHT_GREEN }]}><Ionicons name="checkmark-circle" size={12} color={TEXT_GREEN} /><Text style={styles.statusBadgeText}>Approved</Text></View>
            </View>
            <Text style={styles.requestDateText}>Mar 20 – Mar 22</Text>
            <Text style={styles.requestSubtext}>Family trip — Spring Break</Text>
          </View>
        </View>

        <View style={styles.requestCard}>
          <View style={[styles.requestIcon, { backgroundColor: "#EEF2FF" }]}><Ionicons name="briefcase-outline" size={20} color="#4F46E5" /></View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <View style={styles.requestHeader}>
              <Text style={styles.requestTitleText}>Personal</Text>
              <View style={[styles.statusBadge, { backgroundColor: PENDING_YELLOW }]}><Ionicons name="time" size={12} color={PENDING_TEXT} /><Text style={[styles.statusBadgeText, { color: PENDING_TEXT }]}>Pending</Text></View>
            </View>
            <Text style={styles.requestDateText}>Apr 2</Text>
            <Text style={styles.requestSubtext}>Appointment</Text>
          </View>
        </View>
      </View>
    </View>
  );

  const renderOverview = () => (
    <View style={{ flex: 1 }}>
      {/* Stats Strip */}
      <View style={styles.overviewStatsStrip}>
        <View style={styles.overviewStatItem}>
          <Text style={styles.overviewStatValue}>6</Text>
          <Text style={styles.overviewStatLabel}>Shifts</Text>
        </View>
        <View style={styles.overviewStatDivider} />
        <View style={styles.overviewStatItem}>
          <Text style={styles.overviewStatValue}>21h</Text>
          <Text style={styles.overviewStatLabel}>Total Hours</Text>
        </View>
        <View style={styles.overviewStatDivider} />
        <View style={styles.overviewStatItem}>
          <Text style={styles.overviewStatValue}>5</Text>
          <Text style={styles.overviewStatLabel}>Clients</Text>
        </View>
      </View>

      {/* Week Selector Overview */}
      <View style={styles.overviewWeekSelector}>
        <Pressable><Ionicons name="chevron-back" size={20} color={GRAY_TEXT} /></Pressable>
        {DAYS.map((d) => (
          <View key={d.key} style={styles.overviewDayItem}>
            <Text style={styles.overviewDayLabel}>{d.short}</Text>
            <View style={[styles.overviewDateCircle, d.date === "14" && styles.overviewDateCircleActive]}>
              <Text style={[styles.overviewDateText, d.date === "14" && { color: "#FFF" }]}>{d.date}</Text>
            </View>
            {d.hasShift && d.date !== "14" && <View style={styles.overviewDot} />}
          </View>
        ))}
        <Pressable><Ionicons name="chevron-forward" size={20} color={GRAY_TEXT} /></Pressable>
      </View>

      {/* Shift Feed */}
      <View style={styles.shiftFeed}>
        <Text style={styles.dayHeader}>MON, Mar 9 · <Text style={{ color: GRAY_TEXT }}>2 shifts</Text></Text>
        
        <View style={styles.shiftListCard}>
          <View style={styles.shiftListTop}>
            <View style={[styles.serviceTag, { backgroundColor: "#EFF6FF" }]}><Text style={[styles.serviceTagText, { color: "#1D4ED8" }]}>Respite Care</Text></View>
            <View style={styles.durationTag}><Ionicons name="time-outline" size={14} color={GRAY_TEXT} /><Text style={styles.durationText}>4h</Text></View>
          </View>
          <Text style={styles.shiftListTime}>8:00 AM – 12:00 PM</Text>
          <View style={styles.shiftListClient}>
            <View style={styles.clientAvatar}><Text style={styles.avatarText}>ET</Text></View>
            <Text style={styles.clientLabel}>Emma Thompson</Text>
          </View>
          <View style={styles.shiftListLocation}>
            <Ionicons name="location-outline" size={14} color={GRAY_TEXT} />
            <Text style={styles.locationLabel}>1234 Oak Street, Suite 5</Text>
          </View>
        </View>

        <View style={styles.shiftListCard}>
          <View style={styles.shiftListTop}>
            <View style={[styles.serviceTag, { backgroundColor: "#FEF9C3" }]}><Text style={[styles.serviceTagText, { color: "#854D0E" }]}>Transportation</Text></View>
            <View style={styles.durationTag}><Ionicons name="time-outline" size={14} color={GRAY_TEXT} /><Text style={styles.durationText}>3h</Text></View>
          </View>
          <Text style={styles.shiftListTime}>2:00 PM – 5:00 PM</Text>
          <View style={styles.shiftListClient}>
            <View style={styles.clientAvatar}><Text style={styles.avatarText}>LR</Text></View>
            <Text style={styles.clientLabel}>Liam Roberts</Text>
          </View>
          <View style={styles.shiftListLocation}>
            <Ionicons name="location-outline" size={14} color={GRAY_TEXT} />
            <Text style={styles.locationLabel}>88 Willow Drive</Text>
          </View>
        </View>

        <Text style={styles.dayHeader}>TUE, Mar 10 · <Text style={{ color: GRAY_TEXT }}>1 shift</Text></Text>
        <View style={styles.shiftListCard}>
          <View style={styles.shiftListTop}>
            <View style={[styles.serviceTag, { backgroundColor: "#F5F3FF" }]}><Text style={[styles.serviceTagText, { color: "#5B21B6" }]}>Supervised Visit</Text></View>
            <View style={styles.durationTag}><Ionicons name="time-outline" size={14} color={GRAY_TEXT} /><Text style={styles.durationText}>2h</Text></View>
          </View>
          <Text style={styles.shiftListTime}>9:00 AM – 11:00 AM</Text>
          <View style={styles.shiftListClient}>
            <View style={styles.clientAvatar}><Text style={styles.avatarText}>LM</Text></View>
            <Text style={styles.clientLabel}>Lucas Martinez</Text>
          </View>
          <View style={styles.shiftListLocation}>
            <Ionicons name="location-outline" size={14} color={GRAY_TEXT} />
            <Text style={styles.locationLabel}>789 Pine Road, Bldg C</Text>
          </View>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.headerBack}>
          <Ionicons name="arrow-back" size={24} color={DARK_TEXT} />
        </Pressable>
        <View style={styles.headerTitleBox}>
          <Text style={styles.headerTitle}>Availability</Text>
          <Text style={styles.headerSubtitle}>{user?.name || "Sarah Johnson"} · Staff</Text>
        </View>
        <Pressable onPress={() => setShowQuickActions(true)} style={styles.headerPlus}>
          <Ionicons name="add" size={28} color={PRIMARY_GREEN} />
        </Pressable>
      </View>

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        <Pressable onPress={() => setActiveTab("AVAILABILITY")} style={[styles.tabItem, activeTab === "AVAILABILITY" && styles.tabItemActive]}>
          <Text style={[styles.tabItemText, activeTab === "AVAILABILITY" && styles.tabItemTextActive]}>My Availability</Text>
        </Pressable>
        <Pressable onPress={() => setActiveTab("OVERVIEW")} style={[styles.tabItem, activeTab === "OVERVIEW" && styles.tabItemActive]}>
          <Text style={[styles.tabItemText, activeTab === "OVERVIEW" && styles.tabItemTextActive]}>Schedule Overview</Text>
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {activeTab === "AVAILABILITY" ? renderAvailability() : renderOverview()}
      </ScrollView>

      {/* Quick Actions Modal */}
      {showQuickActions && (
        <View style={styles.modalOverlay}>
          <Pressable style={{ flex: 1 }} onPress={() => setShowQuickActions(false)} />
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Quick Actions</Text>
            
            <Pressable onPress={() => { setShowQuickActions(false); router.push("/request-time-off"); }} style={styles.modalOption}>
              <View style={[styles.modalOptionIcon, { backgroundColor: "#FFF7ED" }]}><Ionicons name="sunny-outline" size={22} color="#F59E0B" /></View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.modalOptionTitle}>Request Time Off</Text>
                <Text style={styles.modalOptionSubtitle}>Vacation, sick leave, or personal day</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#D1D5DB" />
            </Pressable>

            <Pressable onPress={() => { setShowQuickActions(false); router.push("/set-recurring-hours"); }} style={styles.modalOption}>
              <View style={[styles.modalOptionIcon, { backgroundColor: "#F0FDF4" }]}><Ionicons name="time-outline" size={22} color={PRIMARY_GREEN} /></View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.modalOptionTitle}>Set Recurring Hours</Text>
                <Text style={styles.modalOptionSubtitle}>Define your default weekly schedule</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#D1D5DB" />
            </Pressable>

            <Pressable onPress={() => setShowQuickActions(false)} style={styles.modalCancelBtn}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: PAGE_BG },
  // Header
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 10, paddingBottom: 15, backgroundColor: PAGE_BG },
  headerBack: { padding: 4 },
  headerTitleBox: { alignItems: "center", flex: 1 },
  headerTitle: { fontSize: 20, fontWeight: "800", color: DARK_TEXT, fontFamily: "Poppins-Bold" },
  headerSubtitle: { fontSize: 13, color: GRAY_TEXT, marginTop: 1, fontFamily: "Inter" },
  headerPlus: { backgroundColor: "#FFF", width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(0,0,0,0.05)", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  // Tab Bar
  tabBar: { flexDirection: "row", backgroundColor: "#F3F4F6", marginHorizontal: 20, borderRadius: 14, padding: 4, marginTop: 10 },
  tabItem: { flex: 1, paddingVertical: 12, alignItems: "center", borderRadius: 10 },
  tabItemActive: { backgroundColor: "#FFF", shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  tabItemText: { fontSize: 14, fontWeight: "600", color: GRAY_TEXT, fontFamily: "Inter-SemiBold" },
  tabItemTextActive: { color: DARK_TEXT, fontWeight: "700" },
  // Week Selector
  weekSelector: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 30, marginTop: 25 },
  dateRangeText: { fontSize: 18, fontWeight: "800", color: DARK_TEXT, fontFamily: "Poppins-Bold" },
  thisWeekBadge: { backgroundColor: LIGHT_GREEN, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginTop: 4 },
  thisWeekText: { fontSize: 11, fontWeight: "700", color: TEXT_GREEN, fontFamily: "Inter-Bold" },
  // Stats
  statsRow: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 20, marginTop: 25, gap: 12 },
  statCard: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#FFF", borderWidth: 1, borderColor: GRAY_BORDER, borderRadius: 16, padding: 16 },
  statText: { fontSize: 14, color: GRAY_TEXT, fontFamily: "Inter" },
  // Grid Card
  gridCard: { marginHorizontal: 20, marginTop: 25, backgroundColor: "#FFF", borderRadius: 24, borderWidth: 1, borderColor: GRAY_BORDER, paddingVertical: 24, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.02, shadowRadius: 12, elevation: 2 },
  gridHeader: { flexDirection: "row", justifyContent: "space-around", paddingHorizontal: 10 },
  gridHeaderCol: { alignItems: "center" },
  gridDayLabel: { fontSize: 10, fontWeight: "700", color: "#9CA3AF", marginBottom: 10, fontFamily: "Inter-Bold" },
  gridDateCircle: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  gridDateCircleActive: { backgroundColor: PRIMARY_GREEN },
  gridDateText: { fontSize: 15, fontWeight: "800", color: DARK_TEXT, fontFamily: "Poppins-Bold" },
  gridDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: "#22C55E", marginTop: 6 },
  gridDivider: { height: 1, backgroundColor: GRAY_BORDER, marginVertical: 20 },
  gridBody: { flexDirection: "row", justifyContent: "space-around", paddingHorizontal: 10 },
  gridBodyCol: { width: "12%", alignItems: "center", gap: 8 },
  timePill: { backgroundColor: "#DCFCE7", paddingVertical: 6, paddingHorizontal: 2, borderRadius: 8, width: "100%", alignItems: "center" },
  timePillText: { fontSize: 7.5, fontWeight: "800", color: "#166534", fontFamily: "Inter-Bold" },
  // Buttons
  actionRow: { flexDirection: "row", paddingHorizontal: 20, gap: 12, marginTop: 30 },
  outlineBtn: { flex: 1, borderWidth: 1.5, borderColor: PRIMARY_GREEN, borderRadius: 14, paddingVertical: 14, alignItems: "center" },
  outlineBtnText: { fontSize: 15, fontWeight: "700", color: PRIMARY_GREEN, fontFamily: "Inter-Bold" },
  solidBtn: { flex: 1, backgroundColor: PRIMARY_GREEN, borderRadius: 14, paddingVertical: 14, alignItems: "center" },
  solidBtnText: { fontSize: 15, fontWeight: "700", color: "#FFF", fontFamily: "Inter-Bold" },
  // Time Off Section
  timeOffSection: { paddingHorizontal: 20, marginTop: 40 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 15 },
  sectionTitle: { fontSize: 18, fontWeight: "800", color: DARK_TEXT, fontFamily: "Poppins-Bold" },
  newRequestLink: { fontSize: 14, color: PRIMARY_GREEN, fontWeight: "600", fontFamily: "Inter-SemiBold" },
  requestCard: { flexDirection: "row", backgroundColor: "#FFF", borderRadius: 18, padding: 16, borderWidth: 1, borderColor: "rgba(0,0,0,0.04)", marginBottom: 12, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.02, shadowRadius: 8, elevation: 1 },
  requestIcon: { width: 48, height: 48, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  requestHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
  requestTitleText: { fontSize: 16, fontWeight: "700", color: DARK_TEXT, fontFamily: "Inter-Bold" },
  statusBadge: { flexDirection: "row", alignItems: "center", borderRadius: 8, backgroundColor: LIGHT_GREEN, gap: 4, paddingHorizontal: 8, paddingVertical: 4 },
  statusBadgeText: { fontSize: 11, fontWeight: "700", color: TEXT_GREEN, fontFamily: "Inter-Bold" },
  requestDateText: { fontSize: 13, color: GRAY_TEXT, marginTop: 2, fontFamily: "Inter-Medium" },
  requestSubtext: { fontSize: 13, color: GRAY_TEXT, marginTop: 8, fontFamily: "Inter" },
  // Overview Stats
  overviewStatsStrip: { flexDirection: "row", backgroundColor: "#FFF", marginHorizontal: 20, borderRadius: 16, padding: 20, marginTop: 20, borderWidth: 1, borderColor: GRAY_BORDER, justifyContent: "space-around", alignItems: "center" },
  overviewStatItem: { alignItems: "center" },
  overviewStatValue: { fontSize: 20, fontWeight: "800", color: DARK_TEXT, fontFamily: "Poppins-Bold" },
  overviewStatLabel: { fontSize: 12, color: GRAY_TEXT, marginTop: 2, fontFamily: "Inter" },
  overviewStatDivider: { width: 1, height: 30, backgroundColor: GRAY_BORDER },
  // Overview Week Selector
  overviewWeekSelector: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, marginTop: 25 },
  overviewDayItem: { alignItems: "center" },
  overviewDayLabel: { fontSize: 10, fontWeight: "700", color: "#9CA3AF", marginBottom: 10 },
  overviewDateCircle: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  overviewDateCircleActive: { backgroundColor: PRIMARY_GREEN },
  overviewDateText: { fontSize: 14, fontWeight: "700", color: DARK_TEXT },
  overviewDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: PRIMARY_GREEN, marginTop: 4 },
  // Shift Feed
  shiftFeed: { paddingHorizontal: 20, marginTop: 30 },
  dayHeader: { fontSize: 15, fontWeight: "800", color: DARK_TEXT, marginBottom: 15, textTransform: "uppercase", letterSpacing: 0.5, fontFamily: "Inter-Bold" },
  shiftListCard: { backgroundColor: "#FFF", borderRadius: 20, padding: 20, marginBottom: 12, borderWidth: 1, borderColor: "rgba(0,0,0,0.04)" },
  shiftListTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  serviceTag: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  serviceTagText: { fontSize: 11, fontWeight: "800", textTransform: "uppercase", fontFamily: "Inter-Bold" },
  durationTag: { flexDirection: "row", alignItems: "center", gap: 4 },
  durationText: { fontSize: 13, fontWeight: "700", color: GRAY_TEXT, fontFamily: "Poppins-Bold" },
  shiftListTime: { fontSize: 16, fontWeight: "700", color: DARK_TEXT, marginBottom: 16, fontFamily: "Poppins-Bold" },
  shiftListClient: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14 },
  clientAvatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: "#F3F4F6", alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 12, fontWeight: "800", color: GRAY_TEXT },
  clientLabel: { fontSize: 15, fontWeight: "700", color: DARK_TEXT, fontFamily: "Inter-Bold" },
  shiftListLocation: { flexDirection: "row", alignItems: "center", gap: 6 },
  locationLabel: { fontSize: 13, color: GRAY_TEXT, fontFamily: "Inter" },
  // Modal Sheet
  modalOverlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modalSheet: { backgroundColor: "#FFF", borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, paddingBottom: 50 },
  modalHandle: { width: 40, height: 4, backgroundColor: "#E5E7EB", borderRadius: 2, alignSelf: "center", marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: "800", color: DARK_TEXT, marginBottom: 24, fontFamily: "Poppins-Bold" },
  modalOption: { flexDirection: "row", alignItems: "center", paddingVertical: 16, borderBottomWidth: 0, borderBottomColor: "#F3F4F6" },
  modalOptionIcon: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  modalOptionTitle: { fontSize: 16, fontWeight: "700", color: DARK_TEXT, fontFamily: "Inter-Bold" },
  modalOptionSubtitle: { fontSize: 13, color: GRAY_TEXT, marginTop: 2, fontFamily: "Inter" },
  modalCancelBtn: { backgroundColor: "#F3F4F6", borderRadius: 16, paddingVertical: 16, alignItems: "center", marginTop: 24 },
  modalCancelText: { fontSize: 15, fontWeight: "700", color: GRAY_TEXT, fontFamily: "Inter-Bold" },
});
