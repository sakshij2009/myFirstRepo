import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useState, useEffect } from "react";
import {
  collection,
  addDoc,
  doc,
  getDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../src/firebase/config";
import { router, useLocalSearchParams } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ── Color tokens ──────────────────────────────────────────────────────────────
const PRIMARY_GREEN = "#1F6F43";
const LIGHT_GREEN = "#F0FDF4";
const DARK_TEXT = "#1A1A1A";
const GRAY_TEXT = "#9CA3AF";
const GRAY_BORDER = "#E5E7EB";
const ERROR_RED = "#EF4444";
const WARNING_AMBER = "#F59E0B";
const PASS_GREEN = "#22C55E";

// ── Inspection categories & items ─────────────────────────────────────────────
const INSPECTION_CATEGORIES = [
  {
    id: "exterior",
    label: "Exterior",
    icon: "car-outline",
    items: [
      { id: "tires", label: "Tires" },
      { id: "lights", label: "Lights (Head, Tail, Turn)" },
      { id: "body_damage", label: "Body Damage" },
      { id: "windshield", label: "Windshield & Wipers" },
    ],
  },
  {
    id: "interior",
    label: "Interior",
    icon: "options-outline",
    items: [
      { id: "seatbelts", label: "Seatbelts" },
      { id: "horn", label: "Horn" },
      { id: "mirrors", label: "Mirrors" },
      { id: "ac", label: "A/C & Heat" },
    ],
  },
  {
    id: "safety",
    label: "Safety",
    icon: "shield-checkmark-outline",
    items: [
      { id: "first_aid", label: "First Aid Kit" },
      { id: "emergency_equip", label: "Emergency Equipment" },
      { id: "fuel_level", label: "Fuel Level (Min. 1/4 Tank)" },
    ],
  },
  {
    id: "documents",
    label: "Documents",
    icon: "document-text-outline",
    items: [
      { id: "registration", label: "Vehicle Registration" },
      { id: "insurance", label: "Insurance Card" },
    ],
  },
];

const STATUSES = ["Pass", "Fail", "N/A"];

const STATUS_STYLE = {
  Pass: { bg: LIGHT_GREEN, text: PRIMARY_GREEN, border: "#86EFAC" },
  Fail: { bg: "#FEF2F2", text: ERROR_RED, border: "#FECACA" },
  "N/A": { bg: "#F3F4F6", text: GRAY_TEXT, border: GRAY_BORDER },
};

// Build initial checks map
const buildInitialChecks = () => {
  const map = {};
  INSPECTION_CATEGORIES.forEach((cat) => {
    cat.items.forEach((item) => {
      map[item.id] = null; // null = not yet selected
    });
  });
  return map;
};

export default function VehicleCheck() {
  const { shiftId } = useLocalSearchParams();

  const [checks, setChecks] = useState(buildInitialChecks());
  const [notes, setNotes] = useState("");
  const [vehicleInfo, setVehicleInfo] = useState(null);
  const [staffId, setStaffId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [loadingShift, setLoadingShift] = useState(true);

  // Load shift data for vehicle info
  useEffect(() => {
    const loadData = async () => {
      try {
        const uid = await AsyncStorage.getItem("staffId");
        setStaffId(uid);

        if (shiftId) {
          const snap = await getDoc(doc(db, "shifts", shiftId));
          if (snap.exists()) {
            const data = snap.data();
            if (data.vehicleInfo) setVehicleInfo(data.vehicleInfo);
          }
        }
      } catch (err) {
        console.warn("VehicleCheck load error:", err);
      } finally {
        setLoadingShift(false);
      }
    };
    loadData();
  }, [shiftId]);

  const toggleStatus = (itemId, status) => {
    setChecks((prev) => ({
      ...prev,
      [itemId]: prev[itemId] === status ? null : status,
    }));
  };

  const allChecked = Object.values(checks).every((v) => v !== null);

  const hasFail = Object.values(checks).some((v) => v === "Fail");

  const completionCount = Object.values(checks).filter((v) => v !== null).length;
  const totalCount = Object.values(checks).length;

  const handleSubmit = async () => {
    if (!allChecked) {
      Alert.alert(
        "Incomplete Inspection",
        "Please set a status (Pass / Fail / N/A) for every item before submitting.",
        [{ text: "OK" }]
      );
      return;
    }

    if (hasFail) {
      Alert.alert(
        "Failed Items Detected",
        "One or more items failed inspection. Are you sure you want to submit?",
        [
          { text: "Review Again", style: "cancel" },
          { text: "Submit Anyway", style: "destructive", onPress: doSubmit },
        ]
      );
      return;
    }

    doSubmit();
  };

  const doSubmit = async () => {
    setSubmitting(true);
    try {
      await addDoc(collection(db, "vehicleChecks"), {
        shiftId: shiftId || null,
        staffId,
        checks,
        notes: notes.trim(),
        overallStatus: hasFail ? "Fail" : "Pass",
        vehicleInfo: vehicleInfo || null,
        submittedAt: serverTimestamp(),
      });

      Alert.alert(
        "Inspection Submitted",
        hasFail
          ? "Inspection recorded. Supervisor has been notified of failed items."
          : "All items passed. Have a safe trip!",
        [
          {
            text: "Continue",
            onPress: () => router.back(),
          },
        ]
      );
    } catch (err) {
      console.error("VehicleCheck submit error:", err);
      Alert.alert("Error", "Failed to save inspection. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingShift) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={PRIMARY_GREEN} />
          <Text style={styles.loadingText}>Loading inspection form…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backBtn}
          hitSlop={8}
        >
          <Ionicons name="arrow-back" size={22} color={DARK_TEXT} />
        </Pressable>
        <Text style={styles.headerTitle}>Vehicle Check</Text>
        <View style={styles.headerBadge}>
          <Text style={styles.headerBadgeText}>
            {completionCount}/{totalCount}
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Vehicle info card */}
        {vehicleInfo ? (
          <View style={styles.vehicleCard}>
            <View style={styles.vehicleIconWrap}>
              <Ionicons name="car" size={28} color={PRIMARY_GREEN} />
            </View>
            <View style={styles.vehicleDetails}>
              <Text style={styles.vehicleName}>
                {vehicleInfo.year} {vehicleInfo.make} {vehicleInfo.model}
              </Text>
              {vehicleInfo.plate && (
                <View style={styles.plateBadge}>
                  <Text style={styles.plateBadgeText}>
                    {vehicleInfo.plate}
                  </Text>
                </View>
              )}
              {vehicleInfo.color && (
                <Text style={styles.vehicleColor}>
                  {vehicleInfo.color}
                </Text>
              )}
            </View>
          </View>
        ) : (
          <View style={styles.noVehicleCard}>
            <Ionicons name="car-outline" size={20} color={GRAY_TEXT} />
            <Text style={styles.noVehicleText}>
              No vehicle info on file — inspect the assigned vehicle.
            </Text>
          </View>
        )}

        {/* Overall status banner */}
        {allChecked && (
          <View
            style={[
              styles.overallBanner,
              hasFail ? styles.overallBannerFail : styles.overallBannerPass,
            ]}
          >
            <Ionicons
              name={hasFail ? "warning" : "checkmark-circle"}
              size={20}
              color={hasFail ? ERROR_RED : PASS_GREEN}
            />
            <Text
              style={[
                styles.overallBannerText,
                { color: hasFail ? ERROR_RED : PRIMARY_GREEN },
              ]}
            >
              {hasFail
                ? "One or more items failed — supervisor will be notified"
                : "All items passed — vehicle is road-ready!"}
            </Text>
          </View>
        )}

        {/* Inspection categories */}
        {INSPECTION_CATEGORIES.map((cat) => (
          <View key={cat.id} style={styles.categoryCard}>
            {/* Category header */}
            <View style={styles.categoryHeader}>
              <View style={styles.categoryIconWrap}>
                <Ionicons name={cat.icon} size={18} color={PRIMARY_GREEN} />
              </View>
              <Text style={styles.categoryLabel}>{cat.label}</Text>
              <Text style={styles.categoryCount}>
                {cat.items.filter((i) => checks[i.id] !== null).length}/
                {cat.items.length}
              </Text>
            </View>

            {/* Status legend row */}
            <View style={styles.legendRow}>
              {STATUSES.map((s) => (
                <View key={s} style={styles.legendItem}>
                  <View
                    style={[
                      styles.legendDot,
                      { backgroundColor: STATUS_STYLE[s].bg, borderColor: STATUS_STYLE[s].border },
                    ]}
                  />
                  <Text style={styles.legendLabel}>{s}</Text>
                </View>
              ))}
            </View>

            {/* Items */}
            {cat.items.map((item, idx) => (
              <View
                key={item.id}
                style={[
                  styles.itemRow,
                  idx < cat.items.length - 1 && styles.itemRowBorder,
                ]}
              >
                <Text style={styles.itemLabel}>{item.label}</Text>
                <View style={styles.statusButtons}>
                  {STATUSES.map((s) => {
                    const selected = checks[item.id] === s;
                    const style = STATUS_STYLE[s];
                    return (
                      <Pressable
                        key={s}
                        onPress={() => toggleStatus(item.id, s)}
                        style={[
                          styles.statusBtn,
                          {
                            backgroundColor: selected ? style.bg : "#F9FAFB",
                            borderColor: selected ? style.border : GRAY_BORDER,
                          },
                        ]}
                      >
                        {selected && (
                          <Ionicons
                            name="checkmark"
                            size={11}
                            color={style.text}
                            style={{ marginRight: 3 }}
                          />
                        )}
                        <Text
                          style={[
                            styles.statusBtnText,
                            { color: selected ? style.text : GRAY_TEXT },
                          ]}
                        >
                          {s}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ))}
          </View>
        ))}

        {/* Notes field */}
        <View style={styles.notesCard}>
          <View style={styles.notesTitleRow}>
            <Ionicons name="create-outline" size={18} color={PRIMARY_GREEN} />
            <Text style={styles.notesTitle}>Additional Notes</Text>
            <Text style={styles.notesOptional}>(optional)</Text>
          </View>
          <TextInput
            style={styles.notesInput}
            multiline
            numberOfLines={4}
            placeholder="Describe any damage, concerns, or observations…"
            placeholderTextColor={GRAY_TEXT}
            value={notes}
            onChangeText={setNotes}
            textAlignVertical="top"
          />
        </View>

        {/* Incomplete warning */}
        {!allChecked && (
          <View style={styles.incompleteWarning}>
            <Ionicons name="alert-circle-outline" size={16} color={WARNING_AMBER} />
            <Text style={styles.incompleteWarningText}>
              {totalCount - completionCount} item
              {totalCount - completionCount !== 1 ? "s" : ""} still need
              {totalCount - completionCount === 1 ? "s" : ""} a status before
              submitting.
            </Text>
          </View>
        )}

        {/* Submit button */}
        <Pressable
          style={({ pressed }) => [
            styles.submitBtn,
            (!allChecked || submitting) && styles.submitBtnDisabled,
            pressed && allChecked && !submitting && styles.submitBtnPressed,
          ]}
          onPress={handleSubmit}
          disabled={!allChecked || submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons
                name="checkmark-done-outline"
                size={20}
                color="#fff"
                style={{ marginRight: 8 }}
              />
              <Text style={styles.submitBtnText}>Submit Inspection</Text>
            </>
          )}
        </Pressable>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F9FAFB" },

  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: { fontSize: 15, color: GRAY_TEXT },

  // ── Header ──────────────────────────────────────────────────────────────────
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: GRAY_BORDER,
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
    fontSize: 17,
    fontWeight: "600",
    color: DARK_TEXT,
  },
  headerBadge: {
    backgroundColor: LIGHT_GREEN,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "#86EFAC",
  },
  headerBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: PRIMARY_GREEN,
  },

  // ── Scroll ──────────────────────────────────────────────────────────────────
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 12 },

  // ── Vehicle card ─────────────────────────────────────────────────────────────
  vehicleCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: GRAY_BORDER,
  },
  vehicleIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: LIGHT_GREEN,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  vehicleDetails: { flex: 1, gap: 4 },
  vehicleName: { fontSize: 16, fontWeight: "700", color: DARK_TEXT },
  plateBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#F3F4F6",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: GRAY_BORDER,
  },
  plateBadgeText: { fontSize: 12, fontWeight: "600", color: DARK_TEXT, letterSpacing: 1 },
  vehicleColor: { fontSize: 13, color: GRAY_TEXT },
  noVehicleCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: GRAY_BORDER,
    gap: 8,
  },
  noVehicleText: { flex: 1, fontSize: 13, color: GRAY_TEXT },

  // ── Overall banner ───────────────────────────────────────────────────────────
  overallBanner: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    padding: 14,
    gap: 10,
    borderWidth: 1,
  },
  overallBannerPass: {
    backgroundColor: LIGHT_GREEN,
    borderColor: "#86EFAC",
  },
  overallBannerFail: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA",
  },
  overallBannerText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
  },

  // ── Category card ────────────────────────────────────────────────────────────
  categoryCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: GRAY_BORDER,
    overflow: "hidden",
  },
  categoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    backgroundColor: "#FAFAFA",
    borderBottomWidth: 1,
    borderBottomColor: GRAY_BORDER,
  },
  categoryIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: LIGHT_GREEN,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  categoryLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    color: DARK_TEXT,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  categoryCount: { fontSize: 12, color: GRAY_TEXT, fontWeight: "600" },

  legendRow: {
    flexDirection: "row",
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1,
  },
  legendLabel: { fontSize: 11, color: GRAY_TEXT },

  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  itemRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  itemLabel: { flex: 1, fontSize: 14, color: DARK_TEXT },
  statusButtons: { flexDirection: "row", gap: 6 },
  statusBtn: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1.5,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  statusBtnText: { fontSize: 12, fontWeight: "600" },

  // ── Notes ────────────────────────────────────────────────────────────────────
  notesCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: GRAY_BORDER,
  },
  notesTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 8,
  },
  notesTitle: { fontSize: 14, fontWeight: "700", color: DARK_TEXT },
  notesOptional: { fontSize: 12, color: GRAY_TEXT },
  notesInput: {
    backgroundColor: "#F9FAFB",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: GRAY_BORDER,
    padding: 12,
    fontSize: 14,
    color: DARK_TEXT,
    minHeight: 100,
  },

  // ── Incomplete warning ────────────────────────────────────────────────────────
  incompleteWarning: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFBEB",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#FDE68A",
    gap: 8,
  },
  incompleteWarningText: {
    flex: 1,
    fontSize: 13,
    color: WARNING_AMBER,
    fontWeight: "500",
  },

  // ── Submit button ─────────────────────────────────────────────────────────────
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: PRIMARY_GREEN,
    borderRadius: 12,
    paddingVertical: 16,
  },
  submitBtnDisabled: { backgroundColor: "#A7C4B5", },
  submitBtnPressed: { backgroundColor: "#185A37" },
  submitBtnText: { fontSize: 16, fontWeight: "700", color: "#fff" },
});
