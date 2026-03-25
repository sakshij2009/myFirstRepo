import {
  View,
  Text,
  Pressable,
  ScrollView,
  Switch,
  TextInput,
  Alert,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../src/firebase/config";

// ── Color tokens ──────────────────────────────────────────────────────────────
const PRIMARY_GREEN = "#1F6F43";
const LIGHT_GREEN = "#F0FDF4";
const DARK_TEXT = "#1A1A1A";
const GRAY_TEXT = "#9CA3AF";
const GRAY_BORDER = "#E5E7EB";
const GRAY_BG = "#F8F9FA";

// ── Constants ─────────────────────────────────────────────────────────────────
const DAYS = [
  { key: "mon", label: "Monday", short: "Mon" },
  { key: "tue", label: "Tuesday", short: "Tue" },
  { key: "wed", label: "Wednesday", short: "Wed" },
  { key: "thu", label: "Thursday", short: "Thu" },
  { key: "fri", label: "Friday", short: "Fri" },
  { key: "sat", label: "Saturday", short: "Sat" },
  { key: "sun", label: "Sunday", short: "Sun" },
];

const DEFAULT_SCHEDULE = DAYS.reduce((acc, d) => {
  acc[d.key] = { available: false, startTime: "09:00", endTime: "17:00" };
  return acc;
}, {});

const STATUS_COLORS = {
  pending: { bg: "#FFF8E1", text: "#92600A", dot: "#F59E0B" },
  approved: { bg: LIGHT_GREEN, text: PRIMARY_GREEN, dot: "#22C55E" },
  denied: { bg: "#FEF2F2", text: "#B91C1C", dot: "#EF4444" },
};

export default function Availability() {
  const [activeTab, setActiveTab] = useState("weekly");
  const [schedule, setSchedule] = useState(DEFAULT_SCHEDULE);
  const [timeOffRequests, setTimeOffRequests] = useState([]);
  const [user, setUser] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [savedAt, setSavedAt] = useState(null);

  // Load user + existing schedule
  useEffect(() => {
    const init = async () => {
      try {
        const stored = await AsyncStorage.getItem("user");
        if (!stored) return;
        const parsed = JSON.parse(stored);
        setUser(parsed);
        await loadSchedule(parsed);
      } catch (e) {
        console.log("Error loading user:", e);
      }
    };
    init();
  }, []);

  // Load time-off when tab switches
  useEffect(() => {
    if (activeTab === "timeoff" && user) {
      loadTimeOffRequests(user);
    }
  }, [activeTab, user]);

  const loadSchedule = async (u) => {
    try {
      const identifier = u.username || u.userId;
      if (!identifier) return;
      const snap = await getDoc(doc(db, "users", identifier));
      if (snap.exists()) {
        const data = snap.data();
        if (data.weeklySchedule) {
          setSchedule({ ...DEFAULT_SCHEDULE, ...data.weeklySchedule });
        }
      }
    } catch (e) {
      console.log("Error loading schedule:", e);
    }
  };

  const loadTimeOffRequests = async (u) => {
    setLoadingRequests(true);
    try {
      const identifier = u.username || u.userId;
      const q = query(
        collection(db, "timeOffRequests"),
        where("staffId", "==", identifier)
      );
      const snap = await getDocs(q);
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setTimeOffRequests(list);
    } catch (e) {
      console.log("Error loading time-off requests:", e);
      setTimeOffRequests([]);
    } finally {
      setLoadingRequests(false);
    }
  };

  const toggleDay = (dayKey) => {
    setSchedule((prev) => ({
      ...prev,
      [dayKey]: { ...prev[dayKey], available: !prev[dayKey].available },
    }));
  };

  const updateTime = (dayKey, field, value) => {
    setSchedule((prev) => ({
      ...prev,
      [dayKey]: { ...prev[dayKey], [field]: value },
    }));
  };

  const setAllDays = (available) => {
    setSchedule((prev) => {
      const next = { ...prev };
      DAYS.forEach((d) => {
        next[d.key] = { ...next[d.key], available };
      });
      return next;
    });
  };

  const handleSave = async () => {
    if (!user) {
      Alert.alert("Error", "User not found. Please log in again.");
      return;
    }
    setSaving(true);
    try {
      const identifier = user.username || user.userId;
      // Try direct doc update
      const userRef = doc(db, "users", identifier);
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        await updateDoc(userRef, {
          weeklySchedule: schedule,
          updatedAt: serverTimestamp(),
        });
      } else {
        // Fallback: query by userId
        const q = query(
          collection(db, "users"),
          where("userId", "==", identifier)
        );
        const qs = await getDocs(q);
        if (!qs.empty) {
          await updateDoc(qs.docs[0].ref, {
            weeklySchedule: schedule,
            updatedAt: serverTimestamp(),
          });
        }
      }
      setSavedAt(new Date());
      Alert.alert("Saved", "Your availability has been updated successfully.");
    } catch (e) {
      console.log("Error saving schedule:", e);
      Alert.alert("Error", "Failed to save availability. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const availableCount = DAYS.filter((d) => schedule[d.key]?.available).length;

  return (
    <SafeAreaView style={styles.container}>
      {/* ── HEADER ── */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={DARK_TEXT} />
        </Pressable>
        <Text style={styles.headerTitle}>Availability</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* ── TABS ── */}
      <View style={styles.tabsRow}>
        <Pressable
          style={[styles.tab, activeTab === "weekly" && styles.tabActive]}
          onPress={() => setActiveTab("weekly")}
        >
          <Ionicons
            name="calendar-outline"
            size={15}
            color={activeTab === "weekly" ? PRIMARY_GREEN : GRAY_TEXT}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === "weekly" && styles.tabTextActive,
            ]}
          >
            Weekly Schedule
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === "timeoff" && styles.tabActive]}
          onPress={() => setActiveTab("timeoff")}
        >
          <Ionicons
            name="time-outline"
            size={15}
            color={activeTab === "timeoff" ? PRIMARY_GREEN : GRAY_TEXT}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === "timeoff" && styles.tabTextActive,
            ]}
          >
            Time Off
          </Text>
        </Pressable>
      </View>

      {/* ── CONTENT ── */}
      {activeTab === "weekly" ? (
        <>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Summary banner */}
            <View style={styles.summaryBanner}>
              <View style={styles.summaryLeft}>
                <Text style={styles.summaryCount}>{availableCount}</Text>
                <Text style={styles.summaryLabel}>days available this week</Text>
              </View>
              <View style={styles.summaryRight}>
                <Pressable
                  onPress={() => setAllDays(true)}
                  style={styles.quickBtn}
                >
                  <Text style={styles.quickBtnText}>All On</Text>
                </Pressable>
                <Pressable
                  onPress={() => setAllDays(false)}
                  style={[styles.quickBtn, styles.quickBtnOutline]}
                >
                  <Text style={styles.quickBtnOutlineText}>All Off</Text>
                </Pressable>
              </View>
            </View>

            {/* Day rows */}
            {DAYS.map((day, idx) => {
              const dayData = schedule[day.key];
              const isAvailable = dayData?.available ?? false;
              const isWeekend = day.key === "sat" || day.key === "sun";

              return (
                <View
                  key={day.key}
                  style={[
                    styles.dayCard,
                    isAvailable && styles.dayCardActive,
                    isWeekend && styles.dayCardWeekend,
                  ]}
                >
                  {/* Day row header */}
                  <View style={styles.dayRow}>
                    <View style={styles.dayLeft}>
                      <View
                        style={[
                          styles.dayIndicator,
                          isAvailable
                            ? styles.dayIndicatorActive
                            : styles.dayIndicatorInactive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.dayShort,
                            isAvailable
                              ? styles.dayShortActive
                              : styles.dayShortInactive,
                          ]}
                        >
                          {day.short}
                        </Text>
                      </View>
                      <View>
                        <Text style={styles.dayLabel}>{day.label}</Text>
                        <Text style={styles.dayStatus}>
                          {isAvailable
                            ? `${dayData.startTime} – ${dayData.endTime}`
                            : "Not available"}
                        </Text>
                      </View>
                    </View>
                    <Switch
                      value={isAvailable}
                      onValueChange={() => toggleDay(day.key)}
                      trackColor={{ false: GRAY_BORDER, true: "#86EFAC" }}
                      thumbColor={isAvailable ? PRIMARY_GREEN : "#fff"}
                      ios_backgroundColor={GRAY_BORDER}
                    />
                  </View>

                  {/* Time pickers – shown when available */}
                  {isAvailable && (
                    <View style={styles.timePickers}>
                      <View style={styles.timePickerField}>
                        <Text style={styles.timePickerLabel}>Start Time</Text>
                        <View style={styles.timeInputWrapper}>
                          <Ionicons
                            name="time-outline"
                            size={14}
                            color={PRIMARY_GREEN}
                          />
                          <TextInput
                            value={dayData.startTime}
                            onChangeText={(v) =>
                              updateTime(day.key, "startTime", v)
                            }
                            placeholder="09:00"
                            placeholderTextColor={GRAY_TEXT}
                            style={styles.timeInput}
                            maxLength={5}
                          />
                        </View>
                      </View>
                      <View style={styles.timePickerArrow}>
                        <Ionicons
                          name="arrow-forward"
                          size={16}
                          color={GRAY_TEXT}
                        />
                      </View>
                      <View style={styles.timePickerField}>
                        <Text style={styles.timePickerLabel}>End Time</Text>
                        <View style={styles.timeInputWrapper}>
                          <Ionicons
                            name="time-outline"
                            size={14}
                            color={PRIMARY_GREEN}
                          />
                          <TextInput
                            value={dayData.endTime}
                            onChangeText={(v) =>
                              updateTime(day.key, "endTime", v)
                            }
                            placeholder="17:00"
                            placeholderTextColor={GRAY_TEXT}
                            style={styles.timeInput}
                            maxLength={5}
                          />
                        </View>
                      </View>
                    </View>
                  )}
                </View>
              );
            })}

            {savedAt && (
              <Text style={styles.savedHint}>
                Last saved at {savedAt.toLocaleTimeString()}
              </Text>
            )}
          </ScrollView>

          {/* ── SAVE BUTTON (sticky bottom) ── */}
          <View style={styles.bottomBar}>
            <Pressable
              onPress={handleSave}
              disabled={saving}
              style={({ pressed }) => [
                styles.saveBtn,
                pressed && { opacity: 0.85 },
              ]}
            >
              {saving ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="#fff" />
                  <Text style={styles.saveBtnText}>Save Availability</Text>
                </>
              )}
            </Pressable>
          </View>
        </>
      ) : (
        /* ── TIME OFF TAB ── */
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Request button */}
          <Pressable
            onPress={() => router.push("/request-time-off")}
            style={styles.requestBtn}
          >
            <View style={styles.requestBtnLeft}>
              <View style={styles.requestBtnIcon}>
                <Ionicons name="add" size={20} color="#fff" />
              </View>
              <View>
                <Text style={styles.requestBtnTitle}>Request Time Off</Text>
                <Text style={styles.requestBtnSub}>
                  Submit vacation, sick leave, or personal days
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={PRIMARY_GREEN} />
          </Pressable>

          {/* Requests list */}
          {loadingRequests ? (
            <View style={styles.loaderBox}>
              <ActivityIndicator size="large" color={PRIMARY_GREEN} />
              <Text style={styles.loaderText}>Loading requests…</Text>
            </View>
          ) : timeOffRequests.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons
                name="calendar-outline"
                size={52}
                color={GRAY_BORDER}
              />
              <Text style={styles.emptyTitle}>No Requests Yet</Text>
              <Text style={styles.emptySubtitle}>
                Your time off requests will appear here once submitted.
              </Text>
            </View>
          ) : (
            <>
              <Text style={styles.sectionLabel}>YOUR REQUESTS</Text>
              {timeOffRequests.map((req) => {
                const cfg =
                  STATUS_COLORS[req.status?.toLowerCase()] ||
                  STATUS_COLORS.pending;
                return (
                  <View key={req.id} style={styles.requestCard}>
                    <View style={styles.requestCardTop}>
                      <View style={styles.requestTypeTag}>
                        <MaterialCommunityIcons
                          name="briefcase-outline"
                          size={13}
                          color={PRIMARY_GREEN}
                        />
                        <Text style={styles.requestTypeText}>
                          {req.type || "Time Off"}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.statusBadge,
                          { backgroundColor: cfg.bg },
                        ]}
                      >
                        <View
                          style={[styles.statusDot, { backgroundColor: cfg.dot }]}
                        />
                        <Text
                          style={[styles.statusText, { color: cfg.text }]}
                        >
                          {req.status || "Pending"}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.requestDates}>
                      <Ionicons
                        name="calendar"
                        size={14}
                        color={GRAY_TEXT}
                      />
                      <Text style={styles.requestDateText}>
                        {req.startDate || "—"} → {req.endDate || "—"}
                      </Text>
                    </View>
                    {!!req.reason && (
                      <Text style={styles.requestReason} numberOfLines={2}>
                        {req.reason}
                      </Text>
                    )}
                  </View>
                );
              })}
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: GRAY_BG,
  },
  // ── Header ──
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
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: DARK_TEXT,
    letterSpacing: -0.3,
  },
  // ── Tabs ──
  tabsRow: {
    flexDirection: "row",
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingBottom: 0,
    borderBottomWidth: 1,
    borderBottomColor: GRAY_BORDER,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 13,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabActive: {
    borderBottomColor: PRIMARY_GREEN,
  },
  tabText: {
    fontSize: 13,
    fontWeight: "600",
    color: GRAY_TEXT,
  },
  tabTextActive: {
    color: PRIMARY_GREEN,
    fontWeight: "700",
  },
  // ── Scroll content ──
  scrollContent: {
    padding: 16,
    paddingBottom: 110,
  },
  // ── Summary banner ──
  summaryBanner: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: GRAY_BORDER,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  summaryLeft: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
  },
  summaryCount: {
    fontSize: 32,
    fontWeight: "800",
    color: PRIMARY_GREEN,
    lineHeight: 36,
  },
  summaryLabel: {
    fontSize: 13,
    color: GRAY_TEXT,
    fontWeight: "500",
  },
  summaryRight: {
    flexDirection: "row",
    gap: 8,
  },
  quickBtn: {
    backgroundColor: PRIMARY_GREEN,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  quickBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#fff",
  },
  quickBtnOutline: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: GRAY_BORDER,
  },
  quickBtnOutlineText: {
    fontSize: 12,
    fontWeight: "700",
    color: DARK_TEXT,
  },
  // ── Day cards ──
  dayCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: GRAY_BORDER,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  dayCardActive: {
    borderColor: "#D1FAE5",
    backgroundColor: "#FAFFFE",
  },
  dayCardWeekend: {
    borderStyle: "dashed",
  },
  dayRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dayLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  dayIndicator: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  dayIndicatorActive: {
    backgroundColor: LIGHT_GREEN,
  },
  dayIndicatorInactive: {
    backgroundColor: "#F3F4F6",
  },
  dayShort: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  dayShortActive: {
    color: PRIMARY_GREEN,
  },
  dayShortInactive: {
    color: GRAY_TEXT,
  },
  dayLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: DARK_TEXT,
    letterSpacing: -0.2,
  },
  dayStatus: {
    fontSize: 12,
    color: GRAY_TEXT,
    marginTop: 2,
    fontWeight: "400",
  },
  // ── Time pickers ──
  timePickers: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: GRAY_BORDER,
  },
  timePickerField: {
    flex: 1,
  },
  timePickerLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: GRAY_TEXT,
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  timeInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: LIGHT_GREEN,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: "#D1FAE5",
  },
  timeInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    color: DARK_TEXT,
    padding: 0,
  },
  timePickerArrow: {
    paddingTop: 20,
  },
  // ── Bottom bar ──
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: GRAY_BORDER,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 5,
  },
  saveBtn: {
    backgroundColor: PRIMARY_GREEN,
    borderRadius: 16,
    paddingVertical: 17,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    shadowColor: PRIMARY_GREEN,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: -0.3,
  },
  savedHint: {
    fontSize: 12,
    color: GRAY_TEXT,
    textAlign: "center",
    marginTop: 4,
    fontStyle: "italic",
  },
  // ── Time Off tab ──
  requestBtn: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1.5,
    borderColor: PRIMARY_GREEN,
    shadowColor: PRIMARY_GREEN,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  requestBtnLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    flex: 1,
  },
  requestBtnIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: PRIMARY_GREEN,
    alignItems: "center",
    justifyContent: "center",
  },
  requestBtnTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: DARK_TEXT,
    letterSpacing: -0.2,
  },
  requestBtnSub: {
    fontSize: 12,
    color: GRAY_TEXT,
    marginTop: 2,
  },
  loaderBox: {
    alignItems: "center",
    paddingVertical: 48,
  },
  loaderText: {
    fontSize: 14,
    color: GRAY_TEXT,
    marginTop: 12,
  },
  emptyBox: {
    alignItems: "center",
    paddingVertical: 56,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: DARK_TEXT,
    marginTop: 16,
    letterSpacing: -0.3,
  },
  emptySubtitle: {
    fontSize: 13,
    color: GRAY_TEXT,
    marginTop: 8,
    textAlign: "center",
    lineHeight: 20,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: GRAY_TEXT,
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  requestCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: GRAY_BORDER,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  requestCardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  requestTypeTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: LIGHT_GREEN,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#D1FAE5",
  },
  requestTypeText: {
    fontSize: 12,
    fontWeight: "700",
    color: PRIMARY_GREEN,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "700",
  },
  requestDates: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginBottom: 8,
  },
  requestDateText: {
    fontSize: 13,
    color: DARK_TEXT,
    fontWeight: "600",
  },
  requestReason: {
    fontSize: 13,
    color: GRAY_TEXT,
    lineHeight: 18,
  },
});
