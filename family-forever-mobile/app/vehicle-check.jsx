import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Image,
  Alert,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState, useEffect } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { doc, getDoc, addDoc, updateDoc, collection, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../src/firebase/config";

const GREEN = "#1F6F43";
const DARK = "#111827";
const GRAY = "#6B7280";
const BORDER = "#E5E7EB";
const PAGE_BG = "#F9FAFB";
const AMBER = "#D97706";
const AMBER_BG = "#FFFBEB";
const AMBER_BORDER = "#FDE68A";

export default function VehicleCheck() {
  const { shiftId } = useLocalSearchParams();

  const [vehicleType, setVehicleType] = useState(null); // "office" | "personal"
  const [preSelectedFromShift, setPreSelectedFromShift] = useState(false); // locked from Firestore
  const [photos, setPhotos] = useState([]); // array of ImagePicker asset objects
  const [meterStart, setMeterStart] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Pre-select vehicle type from shift data if already set.
  // Handles any string the admin might have stored ("office", "Office Vehicle", "Company Car", etc.)
  useEffect(() => {
    if (!shiftId) return;
    getDoc(doc(db, "dev_shifts", shiftId)).then((snap) => {
      if (snap.exists()) {
        const raw = snap.data()?.vehicleType;
        if (!raw) return;
        const lower = String(raw).toLowerCase().trim();
        let resolved = null;
        if (lower === "office" || lower === "personal") {
          resolved = lower;
        } else if (lower.includes("office") || lower.includes("company") || lower.includes("agency") || lower.includes("staff")) {
          resolved = "office";
        } else if (lower.includes("personal") || lower.includes("private") || lower.includes("own")) {
          resolved = "personal";
        }
        if (resolved) {
          setVehicleType(resolved);
          setPreSelectedFromShift(true); // lock the card — don't show picker
        }
      }
    }).catch(() => {});
  }, [shiftId]);

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Camera Required", "Camera permission is needed to take a vehicle photo.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ allowsEditing: false, quality: 0.7 });
    if (!result.canceled && result.assets?.[0]) {
      setPhotos((prev) => [...prev, result.assets[0]]);
    }
  };

  const removePhoto = (index) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleConfirm = async () => {
    if (!vehicleType) {
      Alert.alert("Vehicle Required", "Please select a vehicle type.");
      return;
    }

    setSubmitting(true);
    try {
      const photoUrls = [];
      for (const photo of photos) {
        if (photo?.uri) {
          const blob = await (await fetch(photo.uri)).blob();
          const storageRef = ref(storage, `vehiclePhotos/${shiftId}/${Date.now()}.jpg`);
          await uploadBytes(storageRef, blob);
          photoUrls.push(await getDownloadURL(storageRef));
        }
      }

      // 1. Log to vehicleChecks collection (audit trail)
      await addDoc(collection(db, "dev_vehicleChecks"), {
        shiftId: shiftId || null,
        vehicleType,
        meterStart: meterStart ? Number(meterStart) : null,
        photoUrls,
        submittedAt: serverTimestamp(),
      });

      // 2. Also save photos + meter directly on the shift document so admin can see them
      if (shiftId) {
        await updateDoc(doc(db, "dev_shifts", shiftId), {
          vehicleCheckPhotoUrls: photoUrls,
          vehicleCheckMeterStart: meterStart ? Number(meterStart) : null,
          vehicleCheckSubmittedAt: serverTimestamp(),
        });
      }

      router.push({ pathname: "/complete-shift", params: { shiftId, vehicleType } });
    } catch (e) {
      console.error("VehicleCheck submit error:", e);
      Alert.alert("Error", "Failed to save. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const isOffice = vehicleType === "office";
  const isPersonal = vehicleType === "personal";
  const canConfirm = !!vehicleType;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: PAGE_BG }}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backBtn}
          hitSlop={8}
        >
          <Ionicons name="arrow-back" size={20} color={DARK} />
        </Pressable>
        <Text style={styles.headerTitle}>Vehicle Check</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 20, paddingBottom: 120, gap: 16 }}
      >
        {/* ── Vehicle Type Selection ──────────────────────────────────────── */}
        {preSelectedFromShift ? (
          /* Locked — type came from the shift assignment, staff cannot change it */
          <View>
            <Text style={[styles.sectionQuestion, { marginBottom: 4 }]}>Vehicle — from shift assignment</Text>
            <View style={[styles.vehicleLockedCard]}>
              <View style={[styles.vehicleIconWrap, { backgroundColor: "#F0FDF4" }]}>
                <Ionicons
                  name={isOffice ? "business-outline" : "car-outline"}
                  size={28}
                  color={GREEN}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.vehicleLabel, { color: GREEN }]}>
                  {isOffice ? "Office vehicle" : "Personal vehicle"}
                </Text>
                <Text style={styles.vehicleSub}>
                  {isOffice ? "Transport hours billed only" : "Shift + mileage paid"}
                </Text>
              </View>
              <Ionicons name="checkmark-circle" size={22} color={GREEN} />
            </View>
          </View>
        ) : (
          /* Manual picker — no vehicle type set on the shift */
          <View>
            <Text style={styles.sectionQuestion}>Which vehicle are you using?</Text>
            <View style={{ flexDirection: "row", gap: 12, marginTop: 4 }}>
              {/* Office Vehicle */}
              <Pressable
                onPress={() => setVehicleType("office")}
                style={[styles.vehicleCard, isOffice && styles.vehicleCardSelected]}
              >
                <View style={[styles.vehicleIconWrap, isOffice && { backgroundColor: "#F0FDF4" }]}>
                  <Ionicons name="business-outline" size={28} color={isOffice ? GREEN : GRAY} />
                </View>
                <Text style={[styles.vehicleLabel, isOffice && { color: GREEN, fontWeight: "700" }]}>
                  Office vehicle
                </Text>
                <Text style={styles.vehicleSub}>Mileage tracked in-app</Text>
              </Pressable>

              {/* Personal Vehicle */}
              <Pressable
                onPress={() => setVehicleType("personal")}
                style={[styles.vehicleCard, isPersonal && styles.vehicleCardSelected]}
              >
                <View style={[styles.vehicleIconWrap, isPersonal && { backgroundColor: "#F0FDF4" }]}>
                  <Ionicons name="car-outline" size={28} color={isPersonal ? GREEN : GRAY} />
                </View>
                <Text style={[styles.vehicleLabel, isPersonal && { color: GREEN, fontWeight: "700" }]}>
                  Personal vehicle
                </Text>
                <Text style={styles.vehicleSub}>Shift + mileage paid</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* ── Info Banner ──────────────────────────────────────────────────── */}
        <View style={styles.infoBanner}>
          <Ionicons
            name="information-circle-outline"
            size={18}
            color={AMBER}
            style={{ marginTop: 1, marginRight: 10 }}
          />
          <Text style={styles.infoBannerText}>
            <Text style={{ fontWeight: "700" }}>Office vehicle:</Text> transport
            hours billed only.{" "}
            <Text style={{ fontWeight: "700" }}>Personal vehicle:</Text> shift +
            mileage. If multiple staff share a car, only the car owner receives
            mileage compensation.
          </Text>
        </View>

        {/* ── Office Vehicle: Meter Reading ───────────────────────────────── */}
        {isOffice && (
          <View style={styles.card}>
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 14 }}>
              <View style={styles.cardIconWrap}>
                <Ionicons name="speedometer-outline" size={18} color={GREEN} />
              </View>
              <Text style={styles.cardTitle}>Odometer Reading</Text>
            </View>
            <Text style={styles.inputLabel}>Starting Meter (km)</Text>
            <TextInput
              style={styles.input}
              value={meterStart}
              onChangeText={setMeterStart}
              placeholder="e.g. 45820"
              placeholderTextColor="#C4C8CE"
              keyboardType="numeric"
            />
            <Text style={styles.inputHint}>
              Record the odometer reading before starting the route.
            </Text>
          </View>
        )}

        {/* ── Damage Report (office vehicle only) ─────────────────────────── */}
        {isOffice && (
          <View style={styles.card}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 4,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <View style={styles.cardIconWrap}>
                  <Ionicons name="camera-outline" size={18} color={GREEN} />
                </View>
                <Text style={styles.cardTitle}>Damage Report</Text>
              </View>
              <View style={styles.optionalBadge}>
                <Text style={styles.optionalBadgeText}>OPTIONAL</Text>
              </View>
            </View>

            {/* Photo grid */}
            {photos.length > 0 && (
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 12 }}>
                {photos.map((p, idx) => (
                  <View key={idx} style={{ position: "relative" }}>
                    <Image
                      source={{ uri: p.uri }}
                      style={{ width: 100, height: 90, borderRadius: 10 }}
                      resizeMode="cover"
                    />
                    <Pressable
                      onPress={() => removePhoto(idx)}
                      style={{ position: "absolute", top: -6, right: -6, backgroundColor: "#EF4444", borderRadius: 10, width: 20, height: 20, alignItems: "center", justifyContent: "center" }}
                    >
                      <Ionicons name="close" size={12} color="#fff" />
                    </Pressable>
                  </View>
                ))}
              </View>
            )}
            <Pressable onPress={takePhoto} style={[styles.photoBox, photos.length > 0 && { marginTop: 10, paddingVertical: 16 }]}>
              <View style={styles.photoIconWrap}>
                <Ionicons name="camera-outline" size={28} color="#9CA3AF" />
              </View>
              <Text style={styles.photoBoxLabel}>{photos.length > 0 ? "Add Another Photo" : "Take live photo"}</Text>
              <Text style={styles.photoBoxHint}>Gallery not permitted — live camera only</Text>
            </Pressable>
          </View>
        )}

        {/* ── Personal vehicle info note ────────────────────────────────────── */}
        {isPersonal && (
          <View style={[styles.infoBanner, { backgroundColor: "#F0FDF4", borderColor: "#BBF7D0" }]}>
            <Ionicons name="car-outline" size={18} color={GREEN} style={{ marginTop: 1, marginRight: 10 }} />
            <Text style={[styles.infoBannerText, { color: "#166534" }]}>
              <Text style={{ fontWeight: "700" }}>Personal vehicle selected.</Text>{" "}
              Your mileage will include office-to-route and route-to-office segments. These are tracked in the shift report.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* ── Bottom Button ──────────────────────────────────────────────────── */}
      <View style={styles.bottomBar}>
        <Pressable
          onPress={handleConfirm}
          disabled={!canConfirm || submitting}
          style={({ pressed }) => [
            styles.confirmBtn,
            (!canConfirm || submitting) && styles.confirmBtnDisabled,
            pressed && canConfirm && !submitting && { backgroundColor: "#185A37" },
          ]}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.confirmBtnText}>Confirm &amp; Start Drive</Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "700",
    color: DARK,
    fontFamily: "Poppins-SemiBold",
  },

  // Section question
  sectionQuestion: {
    fontSize: 16,
    fontWeight: "600",
    color: DARK,
    fontFamily: "Inter-SemiBold",
    marginBottom: 4,
  },

  // Vehicle type cards
  vehicleLockedCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "#F0FDF4",
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: GREEN,
    marginTop: 4,
  },
  vehicleCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: BORDER,
    gap: 8,
  },
  vehicleCardSelected: {
    borderColor: GREEN,
    backgroundColor: "#F0FDF4",
  },
  vehicleIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  vehicleLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: DARK,
    textAlign: "center",
    fontFamily: "Inter-SemiBold",
  },
  vehicleSub: {
    fontSize: 12,
    color: GRAY,
    textAlign: "center",
    fontFamily: "Inter",
  },

  // Info banner
  infoBanner: {
    backgroundColor: AMBER_BG,
    borderRadius: 12,
    padding: 14,
    flexDirection: "row",
    alignItems: "flex-start",
    borderWidth: 1,
    borderColor: AMBER_BORDER,
  },
  infoBannerText: {
    flex: 1,
    fontSize: 13,
    color: "#78350F",
    lineHeight: 19,
    fontFamily: "Inter",
  },

  // Card
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  cardIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: "#F0FDF4",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: DARK,
    fontFamily: "Inter-Bold",
  },
  optionalBadge: {
    backgroundColor: "#F3F4F6",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  optionalBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: GRAY,
    letterSpacing: 0.8,
    fontFamily: "Inter-Bold",
  },

  // Photo box (dashed)
  photoBox: {
    borderWidth: 1.5,
    borderColor: "#D1D5DB",
    borderStyle: "dashed",
    borderRadius: 14,
    padding: 28,
    alignItems: "center",
    marginTop: 12,
    backgroundColor: "#FAFAFA",
  },
  photoIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  photoBoxLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    fontFamily: "Inter-SemiBold",
    marginBottom: 4,
  },
  photoBoxHint: {
    fontSize: 12,
    color: "#EF4444",
    fontFamily: "Inter",
  },
  retakeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: GREEN,
    borderRadius: 10,
    paddingVertical: 10,
  },
  retakeBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: GREEN,
    fontFamily: "Inter-SemiBold",
  },

  // Input
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 6,
    fontFamily: "Inter-SemiBold",
  },
  input: {
    borderWidth: 1.5,
    borderColor: BORDER,
    borderRadius: 12,
    padding: 13,
    fontSize: 15,
    color: DARK,
    backgroundColor: "#FAFAFA",
    fontFamily: "Inter",
  },
  inputHint: {
    fontSize: 12,
    color: GRAY,
    marginTop: 6,
    fontFamily: "Inter",
  },

  // Bottom
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: BORDER,
    padding: 20,
  },
  confirmBtn: {
    backgroundColor: GREEN,
    borderRadius: 14,
    paddingVertical: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmBtnDisabled: {
    backgroundColor: "#A7C4B5",
  },
  confirmBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    fontFamily: "Poppins-SemiBold",
  },
});
