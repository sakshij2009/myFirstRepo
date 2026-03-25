import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../src/firebase/config";
import { router, useLocalSearchParams } from "expo-router";

// ── Color tokens ─────────────────────────────────────────────────────────────
const PRIMARY_GREEN = "#1F6F43";
const LIGHT_GREEN = "#F0FDF4";
const DARK_TEXT = "#1A1A1A";
const GRAY_TEXT = "#9CA3AF";
const GRAY_LIGHT = "#F8F8F6";
const GRAY_BORDER = "#E5E7EB";
const ERROR_RED = "#EF4444";

export default function GeoCheckin() {
  const { shiftId } = useLocalSearchParams();
  const [shift, setShift] = useState(null);
  const [shiftDocId, setShiftDocId] = useState(null);
  const [loadingShift, setLoadingShift] = useState(true);
  const [location, setLocation] = useState(null);
  const [locationStatus, setLocationStatus] = useState("idle"); // idle | locating | obtained | error
  const [checkingIn, setCheckingIn] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
      const stored = await AsyncStorage.getItem("user");
      if (stored) setUser(JSON.parse(stored));
    };
    loadUser();
  }, []);

  useEffect(() => {
    if (!shiftId) {
      setLoadingShift(false);
      return;
    }
    fetchShift();
    startLocating();
  }, [shiftId]);

  const fetchShift = async () => {
    try {
      const docRef = doc(db, "shifts", shiftId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setShift({ id: docSnap.id, ...docSnap.data() });
        setShiftDocId(docSnap.id);
        setLoadingShift(false);
        return;
      }
      const q = query(collection(db, "shifts"), where("id", "==", shiftId));
      const snap = await getDocs(q);
      if (!snap.empty) {
        setShift({ id: snap.docs[0].id, ...snap.docs[0].data() });
        setShiftDocId(snap.docs[0].id);
      }
    } catch (e) {
      console.log("Error fetching shift:", e);
    } finally {
      setLoadingShift(false);
    }
  };

  const startLocating = async () => {
    setLocationStatus("locating");
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setLocationStatus("error");
        Alert.alert(
          "Location Permission Required",
          "Please enable location permissions in your device settings to check in.",
          [{ text: "OK" }]
        );
        return;
      }
      const coords = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setLocation(coords.coords);
      setLocationStatus("obtained");
    } catch (e) {
      console.log("Location error:", e);
      setLocationStatus("error");
    }
  };

  const handleCheckIn = async () => {
    if (checkingIn) return;

    if (locationStatus !== "obtained" || !location) {
      Alert.alert(
        "Location Required",
        "We need your location to check in. Please wait for location to be obtained or tap 'Retry Location'.",
        [{ text: "OK" }]
      );
      return;
    }

    setCheckingIn(true);
    try {
      const checkInTime = new Date().toISOString();
      const checkInLocation = {
        lat: location.latitude,
        lng: location.longitude,
        accuracy: location.accuracy,
      };

      const updateData = {
        checkedIn: true,
        checkInTime,
        checkInLocation,
        status: "In Progress",
      };

      if (shiftDocId) {
        await updateDoc(doc(db, "shifts", shiftDocId), updateData);
      } else {
        const q = query(
          collection(db, "shifts"),
          where("id", "==", shiftId)
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          await updateDoc(snap.docs[0].ref, updateData);
        }
      }

      Alert.alert(
        "Checked In",
        "You have successfully checked in to this shift.",
        [
          {
            text: "Continue",
            onPress: () => router.replace("/home"),
          },
        ]
      );
    } catch (e) {
      console.log("Check-in error:", e);
      Alert.alert(
        "Check-In Failed",
        "Something went wrong while checking in. Please try again.",
        [{ text: "OK" }]
      );
    } finally {
      setCheckingIn(false);
    }
  };

  const formatTime = (timeStr) => timeStr || "—";

  return (
    <SafeAreaView style={styles.container}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.headerBack}>
          <Ionicons name="chevron-back" size={26} color={DARK_TEXT} />
        </Pressable>
        <Text style={styles.headerTitle}>Check In</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.body}>
        {/* ── Map Placeholder ── */}
        <View style={styles.mapPlaceholder}>
          <View style={styles.mapPinOuter}>
            <View style={styles.mapPinInner}>
              <Ionicons name="location" size={32} color={PRIMARY_GREEN} />
            </View>
          </View>
          {locationStatus === "locating" && (
            <Text style={styles.mapPlaceholderText}>Getting your location…</Text>
          )}
          {locationStatus === "obtained" && (
            <Text style={styles.mapPlaceholderText}>
              {location?.latitude.toFixed(5)}, {location?.longitude.toFixed(5)}
            </Text>
          )}
          {locationStatus === "error" && (
            <Text style={[styles.mapPlaceholderText, { color: ERROR_RED }]}>
              Location unavailable
            </Text>
          )}
          {locationStatus === "idle" && (
            <Text style={styles.mapPlaceholderText}>Initializing GPS…</Text>
          )}
        </View>

        {/* ── Location Status Bar ── */}
        <View style={styles.locationStatusBar}>
          {locationStatus === "locating" && (
            <>
              <ActivityIndicator size="small" color={PRIMARY_GREEN} />
              <Text style={styles.locationStatusText}>
                Acquiring GPS signal…
              </Text>
            </>
          )}
          {locationStatus === "obtained" && (
            <>
              <View style={styles.greenDot} />
              <Text style={[styles.locationStatusText, { color: PRIMARY_GREEN }]}>
                Location obtained
              </Text>
              {location?.accuracy && (
                <Text style={styles.accuracyText}>
                  ±{Math.round(location.accuracy)}m
                </Text>
              )}
            </>
          )}
          {locationStatus === "error" && (
            <>
              <View style={[styles.greenDot, { backgroundColor: ERROR_RED }]} />
              <Text style={[styles.locationStatusText, { color: ERROR_RED }]}>
                Location error
              </Text>
              <Pressable onPress={startLocating} style={styles.retryBtn}>
                <Text style={styles.retryBtnText}>Retry</Text>
              </Pressable>
            </>
          )}
        </View>

        {/* ── Shift Info Card ── */}
        {loadingShift ? (
          <View style={styles.shiftCard}>
            <ActivityIndicator size="small" color={PRIMARY_GREEN} />
          </View>
        ) : shift ? (
          <View style={styles.shiftCard}>
            <Text style={styles.shiftCardLabel}>SHIFT DETAILS</Text>

            <View style={styles.shiftInfoRow}>
              <View style={[styles.shiftIconBox, { backgroundColor: LIGHT_GREEN }]}>
                <Ionicons name="time-outline" size={18} color={PRIMARY_GREEN} />
              </View>
              <View style={styles.shiftInfoContent}>
                <Text style={styles.shiftInfoLabel}>Scheduled Time</Text>
                <Text style={styles.shiftInfoValue}>
                  {formatTime(shift.startTime)} – {formatTime(shift.endTime)}
                </Text>
              </View>
            </View>

            <View style={styles.shiftInfoRow}>
              <View style={[styles.shiftIconBox, { backgroundColor: "#EBF5FF" }]}>
                <Ionicons name="person-outline" size={18} color="#1E5FA6" />
              </View>
              <View style={styles.shiftInfoContent}>
                <Text style={styles.shiftInfoLabel}>Client</Text>
                <Text style={styles.shiftInfoValue}>
                  {shift.clientName || shift.name || "—"}
                </Text>
              </View>
            </View>

            {(shift.location) && (
              <View style={[styles.shiftInfoRow, { borderBottomWidth: 0 }]}>
                <View style={[styles.shiftIconBox, { backgroundColor: "#FEF3C7" }]}>
                  <Ionicons name="map-outline" size={18} color="#D97706" />
                </View>
                <View style={styles.shiftInfoContent}>
                  <Text style={styles.shiftInfoLabel}>Location</Text>
                  <Text style={styles.shiftInfoValue} numberOfLines={2}>
                    {shift.location}
                  </Text>
                </View>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.shiftCard}>
            <Text style={styles.shiftCardNoData}>
              Shift details unavailable
            </Text>
          </View>
        )}

        {/* ── Staff Badge ── */}
        {user?.name && (
          <View style={styles.staffBadge}>
            <Ionicons name="shield-checkmark-outline" size={16} color={PRIMARY_GREEN} />
            <Text style={styles.staffBadgeText}>
              Checking in as {user.name}
            </Text>
          </View>
        )}
      </View>

      {/* ── Check In Button (pinned bottom) ── */}
      <View style={styles.footer}>
        <Pressable
          style={[
            styles.checkInBtn,
            (checkingIn || locationStatus === "locating") && styles.checkInBtnDisabled,
          ]}
          onPress={handleCheckIn}
          disabled={checkingIn || locationStatus === "locating"}
        >
          {checkingIn ? (
            <>
              <ActivityIndicator size="small" color="#fff" />
              <Text style={styles.checkInBtnText}>Checking In…</Text>
            </>
          ) : (
            <>
              <Ionicons name="location" size={22} color="#fff" />
              <Text style={styles.checkInBtnText}>Check In Now</Text>
            </>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: GRAY_LIGHT,
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
  body: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  // Map placeholder
  mapPlaceholder: {
    height: 180,
    backgroundColor: "#E8EEE8",
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
    borderWidth: 1,
    borderColor: GRAY_BORDER,
    overflow: "hidden",
    gap: 12,
  },
  mapPinOuter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(31, 111, 67, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  mapPinInner: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(31, 111, 67, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  mapPlaceholderText: {
    fontSize: 13,
    color: "#4B5563",
    fontWeight: "600",
    letterSpacing: -0.1,
  },
  // Location status bar
  locationStatusBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: GRAY_BORDER,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  greenDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#22C55E",
  },
  locationStatusText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    color: DARK_TEXT,
    letterSpacing: -0.2,
  },
  accuracyText: {
    fontSize: 12,
    color: GRAY_TEXT,
    fontWeight: "500",
  },
  retryBtn: {
    backgroundColor: "#FEF2F2",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  retryBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: ERROR_RED,
  },
  // Shift card
  shiftCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: GRAY_BORDER,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  shiftCardLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: GRAY_TEXT,
    letterSpacing: 0.8,
    marginBottom: 14,
  },
  shiftCardNoData: {
    fontSize: 14,
    color: GRAY_TEXT,
    textAlign: "center",
    paddingVertical: 8,
  },
  shiftInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  shiftIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  shiftInfoContent: {
    flex: 1,
  },
  shiftInfoLabel: {
    fontSize: 11,
    color: GRAY_TEXT,
    fontWeight: "600",
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  shiftInfoValue: {
    fontSize: 15,
    color: DARK_TEXT,
    fontWeight: "700",
    letterSpacing: -0.2,
    lineHeight: 20,
  },
  // Staff badge
  staffBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: LIGHT_GREEN,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D1FAE5",
  },
  staffBadgeText: {
    fontSize: 14,
    fontWeight: "700",
    color: PRIMARY_GREEN,
    letterSpacing: -0.2,
  },
  // Footer button
  footer: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    paddingTop: 12,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: GRAY_BORDER,
  },
  checkInBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: PRIMARY_GREEN,
    borderRadius: 18,
    paddingVertical: 18,
    shadowColor: PRIMARY_GREEN,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  checkInBtnDisabled: {
    backgroundColor: "#6B9E80",
    shadowOpacity: 0.1,
    elevation: 1,
  },
  checkInBtnText: {
    fontSize: 17,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: -0.3,
  },
});
