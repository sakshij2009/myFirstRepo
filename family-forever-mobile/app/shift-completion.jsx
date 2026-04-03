import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState, useEffect } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { collection, query, where, getDocs, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../src/firebase/config";

// ── Color tokens ──────────────────────────────────────────────────────────────
const PRIMARY = "#1F6F43";
const PRIMARY_LIGHT = "#E8F5ED";
const PRIMARY_DARK = "#145228";
const BG = "#F8FAFC";
const CARD = "#FFFFFF";
const TEXT_PRIMARY = "#0F172A";
const TEXT_SECONDARY = "#64748B";
const TEXT_MUTED = "#94A3B8";
const BORDER = "#E2E8F0";
const SUCCESS = "#10B981";

export default function ShiftCompletion() {
  const { shiftId } = useLocalSearchParams();
  const [shift, setShift] = useState(null);
  const [rating, setRating] = useState(0);
  const [finalNotes, setFinalNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadShift(); }, []);

  const loadShift = async () => {
    try {
      const q = query(collection(db, "shifts"), where("id", "==", shiftId));
      const snap = await getDocs(q);
      if (!snap.empty) setShift({ id: snap.docs[0].id, ref: snap.docs[0].ref, ...snap.docs[0].data() });
    } catch {}
  };

  const getDuration = () => {
    const parseTime = (t) => {
      if (!t) return 0;
      const [time, period] = t.split(" ");
      let [h, m] = time.split(":").map(Number);
      if (period?.toUpperCase() === "PM" && h !== 12) h += 12;
      if (period?.toUpperCase() === "AM" && h === 12) h = 0;
      return h * 60 + (m || 0);
    };
    if (shift?.clockInTime && shift?.clockOutTime) {
      const diff = parseTime(shift.clockOutTime) - parseTime(shift.clockInTime);
      if (diff > 0) {
        const h = Math.floor(diff / 60);
        const m = diff % 60;
        return m > 0 ? `${h}h ${m}m` : `${h} hours`;
      }
    }
    if (shift?.checkInTime && shift?.checkOutTime) {
      const diff = (new Date(shift.checkOutTime) - new Date(shift.checkInTime)) / 1000 / 60;
      const h = Math.floor(diff / 60);
      const m = Math.floor(diff % 60);
      return h > 0 ? `${h}h ${m}m` : `${m}m`;
    }
    return "N/A";
  };

  const handleFinish = async () => {
    setSaving(true);
    try {
      if (shift?.ref) {
        await updateDoc(shift.ref, {
          shiftRating: rating,
          finalNotes,
          completedAt: serverTimestamp(),
        });
      }
      router.replace(`/complete-shift?shiftId=${shiftId}`);
    } catch {
      Alert.alert("Error", "Failed to save. Returning home.");
      router.replace("/home");
    } finally {
      setSaving(false);
    }
  };

  const RATINGS = ["", "Poor", "Fair", "Good", "Very Good", "Excellent"];

  const summaryItems = shift ? [
    { icon: "person-outline", label: "Client", value: shift.clientName || shift.name || "Client" },
    { icon: "calendar-outline", label: "Date", value: shift.startDate || "Today" },
    { icon: "time-outline", label: "Schedule", value: `${shift.startTime || "—"} – ${shift.endTime || "—"}` },
    { icon: "timer-outline", label: "Duration", value: getDuration() },
    { icon: "location-outline", label: "Location", value: shift.location || "On-site" },
  ] : [];

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Success Header */}
        <View style={styles.successHeader}>
          <View style={styles.checkCircle}>
            <Ionicons name="checkmark-circle" size={56} color="#FFF" />
          </View>
          <Text style={styles.successTitle}>Shift Complete!</Text>
          <Text style={styles.successSub}>Great work! Your shift has been logged successfully.</Text>
        </View>

        {/* Shift Summary */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Shift Summary</Text>
          {summaryItems.map(({ icon, label, value }) => (
            <View key={label} style={styles.summaryRow}>
              <View style={styles.summaryIconBox}>
                <Ionicons name={icon} size={16} color={PRIMARY} />
              </View>
              <View style={styles.summaryInfo}>
                <Text style={styles.summaryLabel}>{label}</Text>
                <Text style={styles.summaryValue}>{value}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Completed Tasks */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Completed Tasks</Text>
          {[
            { label: "Checked In", done: !!(shift?.clockInTime || shift?.checkedIn) },
            { label: "Shift Report Filed", done: !!shift?.shiftReport },
            { label: "Medications Logged", done: !!shift?.medicationsLoggedAt },
            { label: "Transportation Logged", done: !!shift?.transportationLoggedAt },
            { label: "Checked Out", done: !!(shift?.clockOutTime || shift?.checkedOut) },
          ].map(({ label, done }) => (
            <View key={label} style={styles.checklistRow}>
              <View style={[styles.checklistDot, done ? styles.checklistDotDone : styles.checklistDotPending]}>
                <Ionicons name={done ? "checkmark" : "remove"} size={12} color={done ? "#FFF" : TEXT_MUTED} />
              </View>
              <Text style={[styles.checklistLabel, !done && styles.checklistLabelPending]}>{label}</Text>
            </View>
          ))}
        </View>

        {/* Rating */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Rate Your Shift</Text>
          <Text style={styles.ratingSubtitle}>Optional — helps us improve scheduling</Text>
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Pressable key={star} onPress={() => setRating(star)} activeOpacity={0.7}>
                <Ionicons
                  name={star <= rating ? "star" : "star-outline"}
                  size={36}
                  color={star <= rating ? "#F59E0B" : BORDER}
                />
              </Pressable>
            ))}
          </View>
          {rating > 0 && (
            <Text style={styles.ratingLabel}>{RATINGS[rating]}</Text>
          )}
        </View>

        {/* Final Notes */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Final Notes</Text>
          <TextInput
            value={finalNotes}
            onChangeText={setFinalNotes}
            placeholder="Any final observations or notes about this shift..."
            placeholderTextColor={TEXT_MUTED}
            multiline
            numberOfLines={4}
            style={styles.notesInput}
            textAlignVertical="top"
          />
        </View>
      </ScrollView>

      {/* Bottom Actions */}
      <View style={styles.bottomBar}>
        <Pressable
          onPress={handleFinish}
          disabled={saving}
          style={[styles.submitBtn, saving && styles.submitBtnDisabled]}
          activeOpacity={0.8}
        >
          {saving ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={20} color="#FFF" style={{ marginRight: 8 }} />
              <Text style={styles.submitBtnText}>Submit & Complete</Text>
            </>
          )}
        </Pressable>
        <Pressable onPress={() => router.replace("/home")} style={styles.skipBtn} activeOpacity={0.7}>
          <Text style={styles.skipBtnText}>Skip & Return Home</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: BG },
  scrollContent: { paddingBottom: 140 },
  // Success header
  successHeader: {
    backgroundColor: PRIMARY,
    paddingTop: 40,
    paddingBottom: 40,
    alignItems: "center",
    paddingHorizontal: 32,
  },
  checkCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  successTitle: {
    color: "#FFF",
    fontSize: 26,
    fontWeight: "800",
    fontFamily: "Poppins-Bold",
    marginBottom: 6,
  },
  successSub: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    fontFamily: "Inter",
  },
  // Card
  card: {
    backgroundColor: CARD,
    borderRadius: 18,
    padding: 18,
    marginHorizontal: 16,
    marginTop: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTitle: { fontSize: 15, fontWeight: "700", color: TEXT_PRIMARY, fontFamily: "Poppins-SemiBold", marginBottom: 14 },
  // Summary rows
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    gap: 12,
  },
  summaryIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: PRIMARY_LIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryInfo: { flex: 1 },
  summaryLabel: { fontSize: 11, color: TEXT_MUTED, fontFamily: "Inter" },
  summaryValue: { fontSize: 14, fontWeight: "600", color: TEXT_PRIMARY, fontFamily: "Inter-SemiBold" },
  // Checklist
  checklistRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 9 },
  checklistDot: { width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  checklistDotDone: { backgroundColor: SUCCESS },
  checklistDotPending: { backgroundColor: "#F1F5F9" },
  checklistLabel: { flex: 1, fontSize: 14, fontWeight: "600", color: TEXT_PRIMARY, fontFamily: "Inter-SemiBold" },
  checklistLabelPending: { color: TEXT_MUTED },
  // Rating
  ratingSubtitle: { fontSize: 12, color: TEXT_MUTED, marginBottom: 16, fontFamily: "Inter" },
  starsRow: { flexDirection: "row", justifyContent: "center", gap: 10, marginBottom: 8 },
  ratingLabel: { textAlign: "center", fontSize: 14, fontWeight: "600", color: TEXT_SECONDARY, fontFamily: "Inter-SemiBold" },
  // Notes
  notesInput: {
    borderWidth: 1.5,
    borderColor: BORDER,
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    color: TEXT_PRIMARY,
    minHeight: 100,
    backgroundColor: "#F8FAFC",
    fontFamily: "Inter",
    lineHeight: 20,
  },
  // Bottom bar
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: CARD,
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 28,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 8,
  },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: PRIMARY,
    height: 52,
    borderRadius: 14,
  },
  submitBtnDisabled: { backgroundColor: TEXT_MUTED },
  submitBtnText: { fontSize: 16, fontWeight: "700", color: "#FFF", fontFamily: "Poppins-SemiBold" },
  skipBtn: { height: 44, alignItems: "center", justifyContent: "center" },
  skipBtnText: { fontSize: 14, color: TEXT_SECONDARY, fontFamily: "Inter-SemiBold" },
});
