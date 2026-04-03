import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import { collection, addDoc, serverTimestamp, query, where, getDocs } from "firebase/firestore";
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
  { id: "vacation", label: "Vacation" },
  { id: "sick", label: "Sick leave" },
  { id: "personal", label: "Personal day" },
  { id: "emergency", label: "Emergency" },
];

export default function RequestTimeOff() {
  const [user, setUser] = useState(null);
  const [selectedType, setSelectedType] = useState("vacation");
  const [startDate, setStartDate] = useState(new Date("2026-03-20"));
  const [endDate, setEndDate] = useState(new Date("2026-03-22"));
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      const stored = await AsyncStorage.getItem("user");
      if (stored) setUser(JSON.parse(stored));
    };
    loadUser();
  }, []);

  const formatDate = (date) => {
    const m = (date.getMonth() + 1).toString().padStart(2, "0");
    const d = date.getDate().toString().padStart(2, "0");
    const y = date.getFullYear();
    return `${m}/${d}/${y}`;
  };

  const handleRequest = async () => {
    if (!user) return;
    setSubmitting(true);
    try {
      await addDoc(collection(db, "leaveRequests"), {
        userId: user.username || user.userId,
        staffName: user.name,
        leaveType: selectedType,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        reason: reason,
        status: "Pending",
        createdAt: serverTimestamp(),
      });
      Alert.alert("Success", "Time-off request submitted successfully.", [
        { text: "OK", onPress: () => router.back() }
      ]);
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Could not submit request.");
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
          <Text style={styles.headerTitle}>Request time off</Text>
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
            <Text style={styles.dateInputText}>{formatDate(startDate)}</Text>
          </Pressable>

          <Text style={[styles.sectionLabel, { marginTop: 20 }]}>To</Text>
          <Pressable onPress={() => setShowEndPicker(true)} style={styles.dateInput}>
            <Text style={styles.dateInputText}>{formatDate(endDate)}</Text>
          </Pressable>
        </View>

        {/* Date Pickers */}
        {showStartPicker && (
          <DateTimePicker
            value={startDate}
            mode="date"
            onChange={(e, d) => { setShowStartPicker(false); if (d) setStartDate(d); }}
          />
        )}
        {showEndPicker && (
          <DateTimePicker
            value={endDate}
            mode="date"
            onChange={(e, d) => { setShowEndPicker(false); if (d) setEndDate(d); }}
          />
        )}

        {/* Shifts Section */}
        <View style={styles.shiftsSection}>
          <Text style={styles.sectionLabel}>Shifts in this period</Text>
          
          <View style={styles.shiftItem}>
            <View style={[styles.dot, { backgroundColor: ERROR_RED }]} />
            <View style={styles.shiftInfo}>
              <Text style={styles.shiftTitle}>Respite Care · Emma Thompson</Text>
              <Text style={styles.shiftTimeText}>Mar 20, 2026 · 9:00 AM – 1:00 PM</Text>
            </View>
            <Text style={[styles.statusText, { color: ERROR_RED }]}>Assigned</Text>
          </View>

          <View style={styles.shiftItem}>
            <View style={[styles.dot, { backgroundColor: "#F59E0B" }]} />
            <View style={styles.shiftInfo}>
              <Text style={styles.shiftTitle}>Transportation · Liam Roberts</Text>
              <Text style={styles.shiftTimeText}>Mar 20, 2026 · 2:00 PM – 4:00 PM</Text>
            </View>
            <Text style={[styles.statusText, { color: "#F59E0B" }]}>Pending</Text>
          </View>

          <View style={styles.shiftItem}>
            <View style={[styles.dot, { backgroundColor: ERROR_RED }]} />
            <View style={styles.shiftInfo}>
              <Text style={styles.shiftTitle}>Supervised Visit · Lucas Martinez</Text>
              <Text style={styles.shiftTimeText}>Mar 21, 2026 · 10:00 AM – 12:00 PM</Text>
            </View>
            <Text style={[styles.statusText, { color: ERROR_RED }]}>Assigned</Text>
          </View>
        </View>

        {/* Conflict Alert */}
        <View style={styles.alertBox}>
          <View style={styles.alertHeader}>
            <Ionicons name="warning" size={18} color={ERROR_RED} />
            <Text style={styles.alertTitle}>Shift conflict detected</Text>
          </View>
          <Text style={styles.alertDesc}>
            The following assigned shifts overlap with your requested time off. These will be marked for redistribution if approved.
          </Text>
        </View>

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
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 60, paddingBottom: 15, backgroundColor: PAGE_BG },
  backBtn: { padding: 4 },
  headerTitleBox: { alignItems: "center" },
  headerTitle: { fontSize: 18, fontWeight: "800", color: DARK_TEXT, fontFamily: "Poppins-Bold" },
  headerSubtitle: { fontSize: 12, color: GRAY_TEXT, fontFamily: "Inter" },
  
  scrollContent: { paddingHorizontal: 20, paddingBottom: 60 },
  section: { marginTop: 30 },
  sectionLabel: { fontSize: 14, fontWeight: "700", color: DARK_TEXT, marginBottom: 12, fontFamily: "Inter-Bold" },
  
  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  pill: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: "#FFF", borderWidth: 1, borderColor: GRAY_BORDER },
  pillActive: { backgroundColor: PRIMARY_GREEN, borderColor: PRIMARY_GREEN },
  pillText: { fontSize: 14, fontWeight: "600", color: GRAY_TEXT, fontFamily: "Inter-SemiBold" },
  pillTextActive: { color: "#FFF" },
  
  dateSection: { marginTop: 30 },
  dateInput: { backgroundColor: "#FFF", borderRadius: 14, borderWidth: 1, borderColor: GRAY_BORDER, padding: 18, justifyContent: "center" },
  dateInputText: { fontSize: 15, fontWeight: "600", color: DARK_TEXT, fontFamily: "Inter-SemiBold" },
  
  shiftsSection: { marginTop: 40 },
  shiftItem: { flexDirection: "row", alignItems: "center", marginBottom: 20 },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 12 },
  shiftInfo: { flex: 1 },
  shiftTitle: { fontSize: 13, fontWeight: "700", color: DARK_TEXT, fontFamily: "Inter-Bold" },
  shiftTimeText: { fontSize: 12, color: GRAY_TEXT, marginTop: 2, fontFamily: "Inter" },
  statusText: { fontSize: 11, fontWeight: "700", fontFamily: "Inter-Bold" },
  
  alertBox: { backgroundColor: ERROR_BG, borderRadius: 16, padding: 16, marginTop: 10 },
  alertHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  alertTitle: { fontSize: 14, fontWeight: "700", color: ERROR_RED, fontFamily: "Inter-Bold" },
  alertDesc: { fontSize: 13, color: "#991B1B", lineHeight: 18, fontFamily: "Inter" },
  
  reasonInput: { backgroundColor: "#FFF", borderRadius: 14, borderWidth: 1, borderColor: GRAY_BORDER, padding: 16, minHeight: 120, textAlignVertical: "top", fontSize: 14, color: DARK_TEXT, fontFamily: "Inter" },
  
  submitBtn: { backgroundColor: PRIMARY_GREEN, borderRadius: 16, paddingVertical: 18, alignItems: "center", marginTop: 40 },
  submitBtnText: { color: "#FFF", fontSize: 16, fontWeight: "700", fontFamily: "Inter-Bold" },
});
