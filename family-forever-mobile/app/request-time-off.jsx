import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import { collection, addDoc, serverTimestamp, onSnapshot } from "firebase/firestore";
import { db } from "../src/firebase/config";

// ── Color tokens ──────────────────────────────────────────────────────────────
const PRIMARY_GREEN = "#1F6F43";
const LIGHT_GREEN = "#DCFCE7";
const TEXT_GREEN = "#166534";
const DARK_TEXT = "#111827";
const GRAY_TEXT = "#6B7280";
const GRAY_BORDER = "#F3F4F6";
const PAGE_BG = "#F9FAFB";
const ERROR_RED = "#EF4444";
const ERROR_BG = "#FEF2F2";

const LEAVE_TYPES = [
  { id: "Vacation", label: "Vacation" },
  { id: "Sick Leave", label: "Sick leave" },
  { id: "Personal", label: "Personal day" },
  { id: "Emergency", label: "Emergency" },
];

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function formatDate(date) {
  const m = (date.getMonth() + 1).toString().padStart(2, "0");
  const d = date.getDate().toString().padStart(2, "0");
  const y = date.getFullYear();
  return `${m}/${d}/${y}`;
}

function formatShiftDate(raw) {
  if (!raw) return "";
  const d = typeof raw?.toDate === "function" ? raw.toDate() : new Date(raw);
  if (isNaN(d)) return "";
  return `${MONTH_NAMES[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function isInRange(raw, start, end) {
  const d = typeof raw?.toDate === "function" ? raw.toDate() : new Date(raw);
  if (isNaN(d)) return false;
  const dayOnly = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const s = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const e = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  return dayOnly >= s && dayOnly <= e;
}

function getShiftStatusColor(status) {
  const s = (status || "").toLowerCase();
  if (s === "assigned" || s === "confirmed") return ERROR_RED;
  if (s === "pending") return "#F59E0B";
  return GRAY_TEXT;
}

export default function RequestTimeOff() {
  const [user, setUser] = useState(null);
  const [selectedType, setSelectedType] = useState("Vacation");
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d;
  });
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [allShifts, setAllShifts] = useState([]);
  const [loadingShifts, setLoadingShifts] = useState(true);

  // Load user
  useEffect(() => {
    const loadUser = async () => {
      const stored = await AsyncStorage.getItem("user");
      if (stored) setUser(JSON.parse(stored));
    };
    loadUser();
  }, []);

  // Listen to all user shifts
  useEffect(() => {
    if (!user) return;
    const uid = user.userId || user.uid || user.id || user.username;
    const unsub = onSnapshot(collection(db, "shifts"), (snap) => {
      const mine = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter(
          (s) =>
            s.userId === uid ||
            (s.name && user.name && s.name.toLowerCase() === user.name.toLowerCase())
        );
      setAllShifts(mine);
      setLoadingShifts(false);
    });
    return () => unsub();
  }, [user]);

  // Compute conflicting shifts for selected range
  const conflictingShifts = allShifts.filter((s) => {
    const raw = s.date || s.startDate || s.shiftDate;
    return raw && isInRange(raw, startDate, endDate);
  });

  const hasConflict = conflictingShifts.length > 0;

  const handleRequest = async () => {
    if (!user) return;
    if (endDate < startDate) {
      Alert.alert("Invalid Dates", "End date must be on or after start date.");
      return;
    }
    setSubmitting(true);
    try {
      const uid = user.userId || user.uid || user.id || user.username;
      await addDoc(collection(db, "timeOffRequests"), {
        userId: uid,
        staffName: user.name || "",
        type: selectedType,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        reason: reason.trim(),
        status: "Pending",
        hasConflict,
        conflictCount: conflictingShifts.length,
        createdAt: serverTimestamp(),
      });
      Alert.alert("Submitted!", "Your time-off request has been sent for approval.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Could not submit request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={DARK_TEXT} />
        </Pressable>
        <View style={styles.headerTitleBox}>
          <Text style={styles.headerTitle}>Request Time Off</Text>
          <Text style={styles.headerSubtitle}>Conflict check runs automatically</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Leave Type */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Leave type</Text>
          <View style={styles.pillRow}>
            {LEAVE_TYPES.map((type) => (
              <Pressable
                key={type.id}
                onPress={() => setSelectedType(type.id)}
                style={[styles.pill, selectedType === type.id && styles.pillActive]}
              >
                <Text style={[styles.pillText, selectedType === type.id && styles.pillTextActive]}>
                  {type.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Date Inputs */}
        <View style={styles.dateSection}>
          <Text style={styles.sectionLabel}>From</Text>
          <Pressable onPress={() => setShowStartPicker(true)} style={styles.dateInput}>
            <Ionicons name="calendar-outline" size={18} color={GRAY_TEXT} style={{ marginRight: 10 }} />
            <Text style={styles.dateInputText}>{formatDate(startDate)}</Text>
          </Pressable>

          <Text style={[styles.sectionLabel, { marginTop: 20 }]}>To</Text>
          <Pressable onPress={() => setShowEndPicker(true)} style={styles.dateInput}>
            <Ionicons name="calendar-outline" size={18} color={GRAY_TEXT} style={{ marginRight: 10 }} />
            <Text style={styles.dateInputText}>{formatDate(endDate)}</Text>
          </Pressable>
        </View>

        {/* Date Pickers */}
        {showStartPicker && (
          <DateTimePicker
            value={startDate}
            mode="date"
            minimumDate={new Date()}
            onChange={(e, d) => {
              setShowStartPicker(false);
              if (d) {
                setStartDate(d);
                if (d > endDate) setEndDate(d);
              }
            }}
          />
        )}
        {showEndPicker && (
          <DateTimePicker
            value={endDate}
            mode="date"
            minimumDate={startDate}
            onChange={(e, d) => { setShowEndPicker(false); if (d) setEndDate(d); }}
          />
        )}

        {/* Conflicts */}
        {loadingShifts ? (
          <ActivityIndicator color={PRIMARY_GREEN} style={{ marginTop: 30 }} />
        ) : conflictingShifts.length > 0 ? (
          <>
            <View style={styles.shiftsSection}>
              <Text style={styles.sectionLabel}>Shifts in this period</Text>
              {conflictingShifts.map((shift) => {
                const svcType = shift.serviceType || shift.category || shift.categoryName || "Shift";
                const client = shift.clientName || shift.name || "Client";
                const shiftDate = formatShiftDate(shift.date || shift.startDate || shift.shiftDate);
                const startT = shift.startTime || "";
                const endT = shift.endTime || "";
                const timeStr = startT ? (endT ? `${startT} – ${endT}` : startT) : "";
                const statusColor = getShiftStatusColor(shift.status);
                const status = shift.status || "Assigned";
                return (
                  <View key={shift.id} style={styles.shiftItem}>
                    <View style={[styles.dot, { backgroundColor: statusColor }]} />
                    <View style={styles.shiftInfo}>
                      <Text style={styles.shiftTitle}>{svcType} · {client}</Text>
                      <Text style={styles.shiftTimeText}>
                        {shiftDate}{timeStr ? ` · ${timeStr}` : ""}
                      </Text>
                    </View>
                    <Text style={[styles.statusText, { color: statusColor }]}>{status}</Text>
                  </View>
                );
              })}
            </View>

            <View style={styles.alertBox}>
              <View style={styles.alertHeader}>
                <Ionicons name="warning" size={18} color={ERROR_RED} />
                <Text style={styles.alertTitle}>Shift conflict detected</Text>
              </View>
              <Text style={styles.alertDesc}>
                {conflictingShifts.length} shift{conflictingShifts.length !== 1 ? "s" : ""} overlap with your requested time off. These will be marked for redistribution if approved.
              </Text>
            </View>
          </>
        ) : (
          <View style={styles.noConflictBox}>
            <Ionicons name="checkmark-circle" size={20} color={PRIMARY_GREEN} />
            <Text style={styles.noConflictText}>No shift conflicts in this period</Text>
          </View>
        )}

        {/* Reason Input */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Reason (Optional)</Text>
          <TextInput
            style={styles.reasonInput}
            placeholder="E.g. Family vacation"
            placeholderTextColor="#9CA3AF"
            value={reason}
            onChangeText={setReason}
            multiline
          />
        </View>

        {/* Submit Button */}
        <Pressable
          onPress={handleRequest}
          disabled={submitting}
          style={[styles.submitBtn, submitting && { opacity: 0.7 }]}
        >
          {submitting ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.submitBtnText}>Submit Request</Text>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: PAGE_BG },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 15,
    backgroundColor: PAGE_BG,
  },
  backBtn: { padding: 4 },
  headerTitleBox: { alignItems: "center" },
  headerTitle: { fontSize: 18, fontWeight: "800", color: DARK_TEXT, fontFamily: "Poppins-Bold" },
  headerSubtitle: { fontSize: 12, color: GRAY_TEXT, fontFamily: "Inter" },

  scrollContent: { paddingHorizontal: 20, paddingBottom: 60 },
  section: { marginTop: 30 },
  sectionLabel: { fontSize: 13, fontWeight: "700", color: DARK_TEXT, marginBottom: 12, fontFamily: "Inter-Bold" },

  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  pill: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: "#FFF", borderWidth: 1, borderColor: GRAY_BORDER },
  pillActive: { backgroundColor: PRIMARY_GREEN, borderColor: PRIMARY_GREEN },
  pillText: { fontSize: 14, fontWeight: "600", color: GRAY_TEXT, fontFamily: "Inter-SemiBold" },
  pillTextActive: { color: "#FFF" },

  dateSection: { marginTop: 30 },
  dateInput: {
    backgroundColor: "#FFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: GRAY_BORDER,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  dateInputText: { fontSize: 15, fontWeight: "600", color: DARK_TEXT, fontFamily: "Inter-SemiBold" },

  shiftsSection: { marginTop: 36 },
  shiftItem: { flexDirection: "row", alignItems: "center", marginBottom: 18 },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 12, flexShrink: 0 },
  shiftInfo: { flex: 1 },
  shiftTitle: { fontSize: 13, fontWeight: "700", color: DARK_TEXT, fontFamily: "Inter-Bold" },
  shiftTimeText: { fontSize: 12, color: GRAY_TEXT, marginTop: 2, fontFamily: "Inter" },
  statusText: { fontSize: 11, fontWeight: "700", fontFamily: "Inter-Bold" },

  alertBox: { backgroundColor: ERROR_BG, borderRadius: 16, padding: 16, marginTop: 8 },
  alertHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  alertTitle: { fontSize: 14, fontWeight: "700", color: ERROR_RED, fontFamily: "Inter-Bold" },
  alertDesc: { fontSize: 13, color: "#991B1B", lineHeight: 18, fontFamily: "Inter" },

  noConflictBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#F0FDF4",
    borderRadius: 14,
    padding: 16,
    marginTop: 24,
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  noConflictText: { fontSize: 14, fontWeight: "600", color: TEXT_GREEN, fontFamily: "Inter-SemiBold" },

  reasonInput: {
    backgroundColor: "#FFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: GRAY_BORDER,
    padding: 16,
    minHeight: 110,
    textAlignVertical: "top",
    fontSize: 14,
    color: DARK_TEXT,
    fontFamily: "Inter",
  },

  submitBtn: { backgroundColor: PRIMARY_GREEN, borderRadius: 16, paddingVertical: 18, alignItems: "center", marginTop: 36 },
  submitBtnText: { color: "#FFF", fontSize: 16, fontWeight: "700", fontFamily: "Inter-Bold" },
});
