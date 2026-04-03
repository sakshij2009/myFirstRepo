import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Animated,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState, useEffect, useRef } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../src/firebase/config";

// ── Color tokens ──────────────────────────────────────────────────────────────
const PRIMARY = "#1F6F43";
const PRIMARY_LIGHT = "#E8F5ED";
const BG = "#F8FAFC";
const CARD = "#FFFFFF";
const TEXT_PRIMARY = "#0F172A";
const TEXT_SECONDARY = "#64748B";
const TEXT_MUTED = "#94A3B8";
const BORDER = "#E2E8F0";
const SUCCESS = "#10B981";
const ACCENT = "#34D399";

export default function CompleteShift() {
  const { shiftId } = useLocalSearchParams();
  const [shift, setShift] = useState(null);
  const [loading, setLoading] = useState(true);

  // Animations
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    loadShift();
    // Start animations after mount
    setTimeout(() => {
      Animated.sequence([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 5,
          tension: 80,
          useNativeDriver: true,
        }),
        Animated.parallel([
          Animated.timing(opacityAnim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    }, 100);
  }, []);

  const loadShift = async () => {
    try {
      if (shiftId) {
        const q = query(collection(db, "shifts"), where("id", "==", shiftId));
        const snap = await getDocs(q);
        if (!snap.empty) {
          setShift({ id: snap.docs[0].id, ...snap.docs[0].data() });
        }
      }
    } catch {}
    setLoading(false);
  };

  const getDuration = () => {
    if (shift?.clockInTime && shift?.clockOutTime) {
      const parseTime = (t) => {
        if (!t) return 0;
        const [time, period] = t.split(" ");
        let [h, m] = time.split(":").map(Number);
        if (period?.toUpperCase() === "PM" && h !== 12) h += 12;
        if (period?.toUpperCase() === "AM" && h === 12) h = 0;
        return h * 60 + (m || 0);
      };
      const diff = parseTime(shift.clockOutTime) - parseTime(shift.clockInTime);
      if (diff > 0) {
        const h = Math.floor(diff / 60);
        const m = diff % 60;
        return m > 0 ? `${h}h ${m}m` : `${h} hours`;
      }
    }
    return "—";
  };

  const summaryItems = shift ? [
    { icon: "calendar-outline", label: "Date", value: shift.startDate || "Today" },
    { icon: "person-outline", label: "Client", value: shift.clientName || shift.name || "Client" },
    { icon: "time-outline", label: "Shift", value: `${shift.startTime || "—"} – ${shift.endTime || "—"}` },
    { icon: "timer-outline", label: "Duration", value: getDuration() },
    { icon: "location-outline", label: "Location", value: shift.location || "On-site" },
    { icon: "car-outline", label: "KM Traveled", value: shift.kmTraveled ? `${shift.kmTraveled} km` : "—" },
  ] : [];

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={PRIMARY} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Success Animation */}
        <View style={styles.successSection}>
          <Animated.View style={[styles.checkCircleOuter, { transform: [{ scale: scaleAnim }] }]}>
            <View style={styles.checkCircleInner}>
              <Ionicons name="checkmark" size={52} color="#FFF" />
            </View>
          </Animated.View>

          <Animated.View style={{ opacity: opacityAnim, transform: [{ translateY: slideAnim }], alignItems: "center" }}>
            <Text style={styles.successTitle}>Shift Completed!</Text>
            <Text style={styles.successSubtitle}>
              Great work! Your shift has been logged and submitted successfully.
            </Text>
          </Animated.View>
        </View>

        {/* Summary Card */}
        {shift && (
          <Animated.View style={[styles.card, { opacity: opacityAnim, transform: [{ translateY: slideAnim }] }]}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardTitle}>Shift Summary</Text>
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={14} color={SUCCESS} />
                <Text style={styles.verifiedBadgeText}>Verified</Text>
              </View>
            </View>
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
          </Animated.View>
        )}

        {/* Completion Checklist */}
        <Animated.View style={[styles.card, { opacity: opacityAnim, transform: [{ translateY: slideAnim }] }]}>
          <Text style={styles.cardTitle}>Completion Checklist</Text>
          {[
            { label: "Clocked In", done: !!shift?.clockInTime },
            { label: "Shift Report Filed", done: !!shift?.shiftReport },
            { label: "Medications Logged", done: !!shift?.medicationsLoggedAt },
            { label: "Transportation Logged", done: !!shift?.transportationLoggedAt },
            { label: "Clocked Out", done: !!shift?.clockOutTime },
          ].map(({ label, done }) => (
            <View key={label} style={styles.checklistRow}>
              <View style={[styles.checklistDot, done ? styles.checklistDotDone : styles.checklistDotPending]}>
                <Ionicons name={done ? "checkmark" : "remove"} size={12} color={done ? "#FFF" : TEXT_MUTED} />
              </View>
              <Text style={[styles.checklistLabel, !done && styles.checklistLabelPending]}>{label}</Text>
              {!done && <Text style={styles.checklistOptional}>Optional</Text>}
            </View>
          ))}
        </Animated.View>

        {/* Congratulations */}
        <Animated.View style={[styles.congratsCard, { opacity: opacityAnim, transform: [{ translateY: slideAnim }] }]}>
          <Ionicons name="trophy-outline" size={28} color={ACCENT} />
          <View style={styles.congratsInfo}>
            <Text style={styles.congratsTitle}>Excellent work!</Text>
            <Text style={styles.congratsSub}>Your dedication makes a difference every day.</Text>
          </View>
        </Animated.View>
      </ScrollView>

      {/* Bottom button */}
      <View style={styles.bottomBar}>
        <Pressable style={styles.homeBtn} onPress={() => router.replace("/home")} activeOpacity={0.8}>
          <Ionicons name="home-outline" size={20} color="#FFF" style={{ marginRight: 8 }} />
          <Text style={styles.homeBtnText}>Back to Home</Text>
        </Pressable>
        <Pressable style={styles.shiftsBtn} onPress={() => router.replace("/shifts")} activeOpacity={0.7}>
          <Text style={styles.shiftsBtnText}>View All Shifts</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: BG },
  loadingContainer: { flex: 1, backgroundColor: BG, alignItems: "center", justifyContent: "center" },
  scrollContent: { paddingHorizontal: 20, paddingTop: 40, paddingBottom: 130 },
  // Success
  successSection: { alignItems: "center", marginBottom: 32 },
  checkCircleOuter: {
    width: 128,
    height: 128,
    borderRadius: 64,
    backgroundColor: PRIMARY_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  checkCircleInner: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: PRIMARY,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: TEXT_PRIMARY,
    fontFamily: "Poppins-Bold",
    marginBottom: 8,
    textAlign: "center",
  },
  successSubtitle: {
    fontSize: 15,
    color: TEXT_SECONDARY,
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 280,
    fontFamily: "Inter",
  },
  // Card
  card: {
    backgroundColor: CARD,
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  cardTitle: { fontSize: 15, fontWeight: "700", color: TEXT_PRIMARY, fontFamily: "Poppins-SemiBold" },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#D1FAE5",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  verifiedBadgeText: { fontSize: 11, fontWeight: "700", color: SUCCESS, fontFamily: "Inter-SemiBold" },
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
  checklistRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10 },
  checklistDot: { width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  checklistDotDone: { backgroundColor: SUCCESS },
  checklistDotPending: { backgroundColor: "#F1F5F9" },
  checklistLabel: { flex: 1, fontSize: 14, fontWeight: "600", color: TEXT_PRIMARY, fontFamily: "Inter-SemiBold" },
  checklistLabelPending: { color: TEXT_MUTED },
  checklistOptional: { fontSize: 11, color: TEXT_MUTED, fontFamily: "Inter" },
  // Congrats card
  congratsCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    backgroundColor: "#0F172A",
    borderRadius: 18,
    padding: 20,
    marginBottom: 14,
  },
  congratsInfo: { flex: 1 },
  congratsTitle: { fontSize: 15, fontWeight: "700", color: "#FFF", fontFamily: "Poppins-SemiBold", marginBottom: 2 },
  congratsSub: { fontSize: 13, color: "rgba(255,255,255,0.6)", fontFamily: "Inter" },
  // Bottom bar
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: CARD,
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 8,
  },
  homeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: PRIMARY,
    height: 52,
    borderRadius: 14,
  },
  homeBtnText: { fontSize: 16, fontWeight: "700", color: "#FFF", fontFamily: "Poppins-SemiBold" },
  shiftsBtn: {
    height: 46,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: BORDER,
    alignItems: "center",
    justifyContent: "center",
  },
  shiftsBtnText: { fontSize: 14, fontWeight: "600", color: TEXT_SECONDARY, fontFamily: "Inter-SemiBold" },
});
