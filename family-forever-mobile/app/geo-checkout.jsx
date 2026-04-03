import {
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState, useEffect, useRef } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { collection, query, where, getDocs, updateDoc } from "firebase/firestore";
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
const ERROR = "#EF4444";
const SUCCESS = "#10B981";

export default function GeoCheckOut() {
  const { shiftId } = useLocalSearchParams();
  const [shift, setShift] = useState(null);
  const [location, setLocation] = useState(null);
  const [locationStatus, setLocationStatus] = useState("idle");
  const [elapsed, setElapsed] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    loadShift();
    getLocation();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const loadShift = async () => {
    try {
      const q = query(collection(db, "shifts"), where("id", "==", shiftId));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const data = { id: snap.docs[0].id, ref: snap.docs[0].ref, ...snap.docs[0].data() };
        setShift(data);
        // Start timer from clock-in time
        const checkInStr = data.clockInTime || data.checkInTime;
        if (checkInStr) {
          // Try parsing as time string like "09:00 AM"
          const parseTime = (t) => {
            const [time, period] = t.split(" ");
            let [h, m] = time.split(":").map(Number);
            if (period?.toUpperCase() === "PM" && h !== 12) h += 12;
            if (period?.toUpperCase() === "AM" && h === 12) h = 0;
            const now = new Date();
            const dt = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m || 0);
            return dt;
          };
          try {
            const checkInDate = checkInStr.includes(":") ? parseTime(checkInStr) : new Date(checkInStr);
            const startElapsed = Math.floor((Date.now() - checkInDate.getTime()) / 1000);
            if (startElapsed > 0) setElapsed(startElapsed);
          } catch {}
        }
        timerRef.current = setInterval(() => setElapsed((prev) => prev + 1), 1000);
      }
    } catch (e) {
      console.log("Error loading shift:", e);
    }
  };

  const getLocation = async () => {
    setLocationStatus("loading");
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setLocationStatus("denied");
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setLocation(loc.coords);
      setLocationStatus("obtained");
    } catch {
      setLocationStatus("error");
    }
  };

  const formatElapsed = (secs) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`;
    return `${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`;
  };

  const handleCheckOut = async () => {
    if (locationStatus === "loading") {
      Alert.alert("Please wait", "Waiting for GPS location...");
      return;
    }
    setSubmitting(true);
    try {
      const coeff = 1000 * 60 * 15;
      const roundedDate = new Date(Math.round(new Date().getTime() / coeff) * coeff);
      const roundedTime = roundedDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

      let locStr = "Location unavailable";
      if (location) {
        const geocode = await Location.reverseGeocodeAsync({
          latitude: location.latitude,
          longitude: location.longitude,
        });
        if (geocode.length > 0) {
          locStr = `${geocode[0].streetNumber || ""} ${geocode[0].street || geocode[0].name || ""}, ${geocode[0].city || ""}`.trim();
        } else {
          locStr = `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`;
        }
      }

      const q = query(collection(db, "shifts"), where("id", "==", shiftId));
      const snap = await getDocs(q);
      if (!snap.empty) {
        await updateDoc(snap.docs[0].ref, {
          clockOutTime: roundedTime,
          clockOutLocation: locStr,
          checkedOut: true,
          checkOutTime: new Date().toISOString(),
          status: "Completed",
        });
      }
      if (timerRef.current) clearInterval(timerRef.current);
      router.replace(`/shift-completion?shiftId=${shiftId}`);
    } catch {
      Alert.alert("Error", "Failed to check out. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const serviceType = shift?.category || shift?.serviceType || "Service";
  const clientName = shift?.clientName || shift?.name || "Client";

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={TEXT_PRIMARY} />
        </Pressable>
        <Text style={styles.headerTitle}>Clock Out</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Elapsed Time Banner */}
        <View style={styles.timerCard}>
          <View style={styles.timerLiveIndicator}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>SHIFT IN PROGRESS</Text>
          </View>
          <Text style={styles.timerValue}>{formatElapsed(elapsed)}</Text>
          <Text style={styles.timerLabel}>Time worked</Text>
        </View>

        {/* Clock-in summary */}
        {shift && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Shift Summary</Text>
            <View style={styles.summaryGrid}>
              <View style={styles.summaryCell}>
                <Ionicons name="person-outline" size={16} color={TEXT_MUTED} />
                <Text style={styles.summaryCellLabel}>Client</Text>
                <Text style={styles.summaryCellValue} numberOfLines={1}>{clientName}</Text>
              </View>
              <View style={styles.summaryCell}>
                <Ionicons name="layers-outline" size={16} color={TEXT_MUTED} />
                <Text style={styles.summaryCellLabel}>Type</Text>
                <Text style={styles.summaryCellValue} numberOfLines={1}>{serviceType}</Text>
              </View>
              <View style={styles.summaryCell}>
                <Ionicons name="log-in-outline" size={16} color={TEXT_MUTED} />
                <Text style={styles.summaryCellLabel}>Clocked In</Text>
                <Text style={styles.summaryCellValue}>{shift.clockInTime || "—"}</Text>
              </View>
              <View style={styles.summaryCell}>
                <Ionicons name="time-outline" size={16} color={TEXT_MUTED} />
                <Text style={styles.summaryCellLabel}>Scheduled</Text>
                <Text style={styles.summaryCellValue}>{shift.startTime} – {shift.endTime}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Location Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Current Location</Text>
          {/* Map placeholder */}
          <View style={styles.mapPlaceholder}>
            {locationStatus === "loading" ? (
              <>
                <ActivityIndicator color={PRIMARY} size="small" />
                <Text style={styles.mapPlaceholderText}>Getting GPS location...</Text>
              </>
            ) : locationStatus === "obtained" ? (
              <>
                <View style={styles.mapPinCircle}>
                  <Ionicons name="location" size={28} color={PRIMARY} />
                </View>
                <Text style={styles.mapPlaceholderText}>Location obtained</Text>
              </>
            ) : (
              <>
                <Ionicons name="location-off" size={32} color={TEXT_MUTED} />
                <Text style={styles.mapPlaceholderText}>Location unavailable</Text>
              </>
            )}
          </View>
          <View style={styles.locationRow}>
            <View style={[styles.locationDot, {
              backgroundColor: locationStatus === "obtained" ? SUCCESS : locationStatus === "loading" ? "#F59E0B" : "#EF4444",
            }]} />
            <Text style={styles.locationText}>
              {locationStatus === "obtained"
                ? `${location?.latitude?.toFixed(5)}, ${location?.longitude?.toFixed(5)}`
                : locationStatus === "loading"
                  ? "Acquiring GPS..."
                  : locationStatus === "denied"
                    ? "Permission denied"
                    : "GPS unavailable"}
            </Text>
            {locationStatus !== "obtained" && locationStatus !== "loading" && (
              <Pressable onPress={getLocation} style={styles.retryBtn} activeOpacity={0.7}>
                <Text style={styles.retryBtnText}>Retry</Text>
              </Pressable>
            )}
          </View>
        </View>

        {/* Accuracy indicator */}
        {locationStatus === "obtained" && location?.accuracy && (
          <View style={styles.accuracyBadge}>
            <Ionicons name="shield-checkmark" size={14} color={SUCCESS} />
            <Text style={styles.accuracyText}>
              GPS accuracy: ±{Math.round(location.accuracy)}m
            </Text>
          </View>
        )}

        {locationStatus === "denied" || locationStatus === "error" ? (
          <Pressable
            style={styles.gpsUnavailableLink}
            onPress={() => router.push(`/gps-unavailable?shiftId=${shiftId}`)}
            activeOpacity={0.7}
          >
            <Ionicons name="help-circle-outline" size={16} color={PRIMARY} />
            <Text style={styles.gpsUnavailableLinkText}>GPS Unavailable? Tap here</Text>
          </Pressable>
        ) : null}
      </ScrollView>

      {/* Bottom Button */}
      <View style={styles.bottomBar}>
        <Pressable
          onPress={handleCheckOut}
          disabled={submitting}
          style={[styles.checkOutBtn, submitting && styles.checkOutBtnDisabled]}
          activeOpacity={0.8}
        >
          {submitting ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Ionicons name="log-out-outline" size={20} color="#FFF" style={{ marginRight: 8 }} />
              <Text style={styles.checkOutBtnText}>Confirm Check-Out</Text>
            </>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: BG },
  header: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: CARD,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  backBtn: { width: 40, height: 40, justifyContent: "center", alignItems: "center" },
  headerTitle: { flex: 1, textAlign: "center", fontSize: 17, fontWeight: "700", color: TEXT_PRIMARY, fontFamily: "Poppins-SemiBold" },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 120 },
  // Timer card
  timerCard: {
    backgroundColor: PRIMARY,
    borderRadius: 20,
    padding: 28,
    alignItems: "center",
    marginBottom: 16,
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  timerLiveIndicator: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 12 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#4ADE80" },
  liveText: { color: "rgba(255,255,255,0.7)", fontSize: 11, fontWeight: "700", letterSpacing: 1 },
  timerValue: { fontSize: 52, fontWeight: "800", color: "#FFF", letterSpacing: -2, fontFamily: "Poppins-Bold" },
  timerLabel: { color: "rgba(255,255,255,0.7)", fontSize: 13, marginTop: 4, fontFamily: "Inter" },
  // Card
  card: {
    backgroundColor: CARD,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTitle: { fontSize: 14, fontWeight: "700", color: TEXT_PRIMARY, fontFamily: "Inter-SemiBold", marginBottom: 14 },
  // Summary grid
  summaryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  summaryCell: { flex: 1, minWidth: "45%", gap: 4 },
  summaryCellLabel: { fontSize: 11, color: TEXT_MUTED, fontFamily: "Inter" },
  summaryCellValue: { fontSize: 13, fontWeight: "600", color: TEXT_PRIMARY, fontFamily: "Inter-SemiBold" },
  // Map
  mapPlaceholder: {
    height: 130,
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 12,
  },
  mapPlaceholderText: { fontSize: 13, color: TEXT_SECONDARY, fontFamily: "Inter" },
  mapPinCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: PRIMARY_LIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  locationDot: { width: 8, height: 8, borderRadius: 4 },
  locationText: { flex: 1, fontSize: 12, color: TEXT_SECONDARY, fontFamily: "Inter" },
  retryBtn: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8, backgroundColor: PRIMARY_LIGHT },
  retryBtnText: { fontSize: 12, fontWeight: "600", color: PRIMARY, fontFamily: "Inter-SemiBold" },
  // Accuracy badge
  accuracyBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#D1FAE5",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: "center",
    marginBottom: 14,
  },
  accuracyText: { fontSize: 12, fontWeight: "600", color: "#065F46", fontFamily: "Inter-SemiBold" },
  // GPS unavailable link
  gpsUnavailableLink: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
  },
  gpsUnavailableLinkText: { fontSize: 13, color: PRIMARY, fontWeight: "600", fontFamily: "Inter-SemiBold" },
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 8,
  },
  checkOutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: ERROR,
    height: 54,
    borderRadius: 14,
  },
  checkOutBtnDisabled: { backgroundColor: TEXT_MUTED },
  checkOutBtnText: { fontSize: 16, fontWeight: "700", color: "#FFF", fontFamily: "Poppins-SemiBold" },
});
