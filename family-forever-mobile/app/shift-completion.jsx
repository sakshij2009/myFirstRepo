import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  ActivityIndicator,
  StyleSheet,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState, useEffect } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { doc, onSnapshot, updateDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../src/firebase/config";

// ── Safe date formatter (handles Firestore Timestamps, ISO strings, plain strings) ──
const safeDate = (val) => {
  if (!val) return "";
  if (val?.toDate) {
    return val.toDate().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  }
  if (typeof val === "string") {
    const d = new Date(val);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    }
    return val;
  }
  return String(val);
};

// ── Color tokens ──────────────────────────────────────────────────────────────
const PRIMARY    = "#1F6F43";
const PRIMARY_LT = "#E8F5ED";
const BLUE       = "#1E5FA6";
const BLUE_LT    = "#EFF6FF";
const DARK       = "#0F172A";
const GRAY       = "#64748B";
const MUTED      = "#94A3B8";
const BORDER     = "#E2E8F0";
const BG         = "#F8FAFC";
const CARD       = "#FFFFFF";
const SUCCESS    = "#10B981";
const AMBER      = "#D97706";
const AMBER_LT   = "#FFFBEB";

const OFFICE_ADDRESS = "#206, 10110 124 Street, Edmonton, AB T5N 1P6";

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtMinutes(mins) {
  if (!mins && mins !== 0) return "—";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function isTransportOrVisit(shift) {
  const raw = (
    shift?.serviceType ||
    shift?.category ||
    shift?.categoryName ||
    shift?.shiftCategory ||
    ""
  ).toLowerCase();
  return (
    raw.includes("transport") ||
    raw.includes("supervised") ||
    raw.includes("visitation") ||
    raw.includes("visit")
  );
}

function getDuration(shift) {
  const parseTime = (t) => {
    if (!t) return 0;
    const [time, period] = String(t).split(" ");
    let [h, m] = time.split(":").map(Number);
    if (period?.toUpperCase() === "PM" && h !== 12) h += 12;
    if (period?.toUpperCase() === "AM" && h === 12) h = 0;
    return h * 60 + (m || 0);
  };
  if (shift?.clockInTime && shift?.clockOutTime) {
    const diff = parseTime(shift.clockOutTime) - parseTime(shift.clockInTime);
    if (diff > 0) return fmtMinutes(diff);
  }
  return "N/A";
}

// ─────────────────────────────────────────────────────────────────────────────
export default function ShiftCompletion() {
  const { shiftId } = useLocalSearchParams();

  const [shift, setShift]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);

  // General report fields
  const [rating, setRating]         = useState(0);
  const [finalNotes, setFinalNotes] = useState("");

  // Transportation-specific fields
  const [approvedBy, setApprovedBy]               = useState("");
  const [adminComments, setAdminComments]         = useState("");
  const [officeToPickupKm, setOfficeToPickupKm]   = useState("");
  const [dropToOfficeKm, setDropToOfficeKm]       = useState("");
  const [receiptPhoto, setReceiptPhoto]           = useState(null);
  const [uploadingReceipt, setUploadingReceipt]   = useState(false);

  // Load shift (real-time)
  useEffect(() => {
    if (!shiftId) { setLoading(false); return; }
    const unsub = onSnapshot(doc(db, "shifts", shiftId), (snap) => {
      if (snap.exists()) {
        setShift({ id: snap.id, ref: snap.ref, ...snap.data() });
      }
      setLoading(false);
    });
    return () => unsub();
  }, [shiftId]);

  const isTransport = shift ? isTransportOrVisit(shift) : false;
  const isPersonalVehicle = shift?.vehicleType === "personal";

  // Total route KM from complete-shift
  const routeKm = shift?.transportationKm ?? null;
  // Total time tracked during route
  const routeTimeMinutes = shift?.totalTimeMinutes ?? null;
  // Visit notes
  const visitNotes = shift?.visitNotes || "";

  // Compute total KM for personal vehicle (route + office segments)
  const officePickupNum  = parseFloat(officeToPickupKm) || 0;
  const dropOfficeNum    = parseFloat(dropToOfficeKm) || 0;
  const totalKm = isPersonalVehicle && routeKm != null
    ? (routeKm + officePickupNum + dropOfficeNum)
    : routeKm;

  const pickReceiptPhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      // Try gallery as fallback for receipt
      const galleryStatus = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (galleryStatus.status !== "granted") {
        Alert.alert("Permission required", "Camera or gallery access is needed to upload receipt.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.8 });
      if (!result.canceled && result.assets?.[0]) setReceiptPhoto(result.assets[0]);
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (!result.canceled && result.assets?.[0]) setReceiptPhoto(result.assets[0]);
  };

  const handleFinish = async () => {
    setSaving(true);
    try {
      let receiptUrl = null;
      if (receiptPhoto?.uri) {
        setUploadingReceipt(true);
        const blob = await (await fetch(receiptPhoto.uri)).blob();
        const storageRef = ref(storage, `receipts/${shiftId}/${Date.now()}.jpg`);
        await uploadBytes(storageRef, blob);
        receiptUrl = await getDownloadURL(storageRef);
        setUploadingReceipt(false);
      }

      const updateData = {
        shiftRating: rating || null,
        finalNotes: finalNotes.trim() || null,
        reportCompletedAt: serverTimestamp(),
        reportStatus: "submitted",
      };

      if (isTransport) {
        Object.assign(updateData, {
          approvedBy: approvedBy.trim() || null,
          reportAdminComments: adminComments.trim() || null,
          receiptUrl,
          ...(isPersonalVehicle && {
            officeToPickupKm: officePickupNum || null,
            dropToOfficeKm: dropOfficeNum || null,
            totalKmIncludingOffice: totalKm,
          }),
        });
      }

      if (shift?.ref) {
        await updateDoc(shift.ref, updateData);
      }

      Alert.alert("Report Submitted!", "Your shift report has been saved successfully.", [
        { text: "OK", onPress: () => router.replace("/home") },
      ]);
    } catch (e) {
      console.error("ShiftCompletion submit error:", e);
      Alert.alert("Error", "Failed to save report. Please try again.");
    } finally {
      setSaving(false);
      setUploadingReceipt(false);
    }
  };

  const RATINGS = ["", "Poor", "Fair", "Good", "Very Good", "Excellent"];

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: BG, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color={PRIMARY} />
      </SafeAreaView>
    );
  }

  const summaryItems = shift ? [
    { icon: "person-outline",   label: "Client",    value: shift.clientName || shift.name || "Client" },
    { icon: "calendar-outline", label: "Date",      value: safeDate(shift.startDate || shift.date) || "Today" },
    { icon: "time-outline",     label: "Schedule",  value: `${shift.startTime || "—"} – ${shift.endTime || "—"}` },
    { icon: "timer-outline",    label: "Duration",  value: getDuration(shift) },
    { icon: "location-outline", label: "Location",  value: shift.location || shift.address || "On-site" },
  ] : [];

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* ── Success Header ─────────────────────────────────────────────── */}
        <View style={styles.successHeader}>
          <View style={styles.checkCircle}>
            <Ionicons name="checkmark-circle" size={56} color="#FFF" />
          </View>
          <Text style={styles.successTitle}>Shift Complete!</Text>
          <Text style={styles.successSub}>
            Great work! Please complete the shift report below.
          </Text>
        </View>

        {/* ── Shift Summary ───────────────────────────────────────────────── */}
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

        {/* ── Transportation / Supervised Visit Report ───────────────────── */}
        {isTransport && (
          <View style={[styles.card, { borderTopWidth: 3, borderTopColor: BLUE }]}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: BLUE_LT, alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="car-sport-outline" size={18} color={BLUE} />
              </View>
              <View>
                <Text style={[styles.cardTitle, { marginBottom: 0 }]}>Transportation Report</Text>
                <Text style={{ fontSize: 12, color: GRAY, fontFamily: "Inter" }}>
                  {shift?.vehicleType === "personal" ? "Personal vehicle" : "Office vehicle"}
                </Text>
              </View>
            </View>

            {/* Route KM */}
            <View style={styles.transportRow}>
              <View style={styles.transportIconBox}>
                <Ionicons name="navigate-outline" size={16} color={BLUE} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.transportLabel}>Route Distance</Text>
                <Text style={styles.transportValue}>
                  {routeKm != null ? `${routeKm.toFixed(1)} km` : "—"}
                </Text>
              </View>
            </View>

            {/* Personal vehicle: office segments */}
            {isPersonalVehicle && (
              <>
                <View style={[styles.officeNote]}>
                  <Ionicons name="business-outline" size={14} color={AMBER} style={{ marginRight: 8 }} />
                  <Text style={styles.officeNoteText}>
                    Personal vehicle — enter office commute distances to calculate total KM
                  </Text>
                </View>

                <View style={{ gap: 12, marginTop: 4 }}>
                  <View>
                    <Text style={styles.inputLabel}>
                      Office → First Pickup (km)
                    </Text>
                    <Text style={{ fontSize: 11, color: MUTED, fontFamily: "Inter", marginBottom: 6 }}>
                      From: {OFFICE_ADDRESS}
                    </Text>
                    <TextInput
                      style={styles.kmInput}
                      value={officeToPickupKm}
                      onChangeText={setOfficeToPickupKm}
                      placeholder="e.g. 4.2"
                      placeholderTextColor="#C4C8CE"
                      keyboardType="decimal-pad"
                    />
                    {shift?.personalVehicleFirstPickup ? (
                      <Text style={{ fontSize: 11, color: GRAY, marginTop: 4, fontFamily: "Inter" }}>
                        To: {shift.personalVehicleFirstPickup}
                      </Text>
                    ) : null}
                  </View>

                  <View>
                    <Text style={styles.inputLabel}>Last Drop → Office (km)</Text>
                    <TextInput
                      style={styles.kmInput}
                      value={dropToOfficeKm}
                      onChangeText={setDropToOfficeKm}
                      placeholder="e.g. 5.1"
                      placeholderTextColor="#C4C8CE"
                      keyboardType="decimal-pad"
                    />
                    {shift?.personalVehicleLastDrop ? (
                      <Text style={{ fontSize: 11, color: GRAY, marginTop: 4, fontFamily: "Inter" }}>
                        From: {shift.personalVehicleLastDrop}
                      </Text>
                    ) : null}
                  </View>
                </View>

                {/* Total KM (personal) */}
                <View style={[styles.totalKmBox, { marginTop: 14 }]}>
                  <Text style={styles.totalKmLabel}>Total KM (Route + Office)</Text>
                  <Text style={styles.totalKmValue}>{totalKm?.toFixed(1) ?? "—"} km</Text>
                </View>
              </>
            )}

            {/* Total KM (office vehicle) */}
            {!isPersonalVehicle && routeKm != null && (
              <View style={styles.totalKmBox}>
                <Text style={styles.totalKmLabel}>Total KM</Text>
                <Text style={styles.totalKmValue}>{routeKm.toFixed(1)} km</Text>
              </View>
            )}

            {/* Route Time */}
            <View style={[styles.transportRow, { marginTop: 10 }]}>
              <View style={styles.transportIconBox}>
                <Ionicons name="time-outline" size={16} color={BLUE} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.transportLabel}>Total Route Time</Text>
                <Text style={styles.transportValue}>{fmtMinutes(routeTimeMinutes)}</Text>
              </View>
            </View>

            {/* Visit Notes (read-only from complete-shift) */}
            {!!visitNotes && (
              <View style={{ marginTop: 12 }}>
                <Text style={styles.inputLabel}>Visit Notes</Text>
                <View style={{ backgroundColor: "#F8FAFF", borderRadius: 10, padding: 12, borderWidth: 1, borderColor: "#DBEAFE" }}>
                  <Text style={{ fontSize: 14, color: DARK, fontFamily: "Inter", lineHeight: 20 }}>{visitNotes}</Text>
                </View>
              </View>
            )}

            {/* Approved By */}
            <View style={{ marginTop: 14 }}>
              <Text style={styles.inputLabel}>Approved By</Text>
              <TextInput
                style={styles.textInput}
                value={approvedBy}
                onChangeText={setApprovedBy}
                placeholder="Supervisor name or employee ID"
                placeholderTextColor="#C4C8CE"
              />
            </View>

            {/* Receipt Upload */}
            <View style={{ marginTop: 14 }}>
              <Text style={styles.inputLabel}>Upload Receipt / Authorization</Text>
              {receiptPhoto ? (
                <View style={{ marginTop: 8 }}>
                  <Image
                    source={{ uri: receiptPhoto.uri }}
                    style={{ width: "100%", height: 160, borderRadius: 10, marginBottom: 8 }}
                    resizeMode="cover"
                  />
                  <Pressable onPress={() => setReceiptPhoto(null)} style={styles.retakeBtn}>
                    <Ionicons name="refresh-outline" size={14} color={PRIMARY} style={{ marginRight: 6 }} />
                    <Text style={styles.retakeBtnText}>Replace Photo</Text>
                  </Pressable>
                </View>
              ) : (
                <Pressable onPress={pickReceiptPhoto} style={styles.uploadBox}>
                  <View style={styles.uploadIconWrap}>
                    <Ionicons name="cloud-upload-outline" size={26} color="#9CA3AF" />
                  </View>
                  <Text style={styles.uploadLabel}>Tap to upload receipt</Text>
                  <Text style={styles.uploadHint}>Camera or gallery</Text>
                </Pressable>
              )}
            </View>

            {/* Admin / Report Comments */}
            <View style={{ marginTop: 14 }}>
              <Text style={styles.inputLabel}>Additional Comments</Text>
              <TextInput
                style={[styles.textInput, { minHeight: 90, textAlignVertical: "top" }]}
                value={adminComments}
                onChangeText={setAdminComments}
                placeholder="Any additional notes for this transportation shift..."
                placeholderTextColor="#C4C8CE"
                multiline
              />
            </View>
          </View>
        )}

        {/* ── Completed Tasks ─────────────────────────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Completed Tasks</Text>
          {[
            { label: "Checked In",                done: !!(shift?.clockInTime || shift?.checkedIn) },
            { label: "Shift Report Filed",         done: !!shift?.shiftReport },
            { label: "Medications Logged",         done: !!shift?.medicationsLoggedAt },
            { label: "Transportation Logged",      done: !!(isTransport ? shift?.transportationCompleted : true) },
            { label: "Checked Out",                done: !!(shift?.clockOutTime || shift?.checkedOut) },
          ].map(({ label, done }) => (
            <View key={label} style={styles.checklistRow}>
              <View style={[styles.checklistDot, done ? styles.dotDone : styles.dotPending]}>
                <Ionicons name={done ? "checkmark" : "remove"} size={12} color={done ? "#FFF" : MUTED} />
              </View>
              <Text style={[styles.checklistLabel, !done && { color: MUTED }]}>{label}</Text>
            </View>
          ))}
        </View>

        {/* ── Rate Your Shift ─────────────────────────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Rate Your Shift</Text>
          <Text style={{ fontSize: 12, color: MUTED, marginBottom: 16, fontFamily: "Inter" }}>
            Optional — helps us improve scheduling
          </Text>
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
            <Text style={{ textAlign: "center", fontSize: 14, fontWeight: "600", color: GRAY, fontFamily: "Inter-SemiBold" }}>
              {RATINGS[rating]}
            </Text>
          )}
        </View>

        {/* ── Final Notes ─────────────────────────────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Final Notes</Text>
          <TextInput
            value={finalNotes}
            onChangeText={setFinalNotes}
            placeholder="Any final observations or notes about this shift..."
            placeholderTextColor={MUTED}
            multiline
            numberOfLines={4}
            style={styles.notesInput}
            textAlignVertical="top"
          />
        </View>
      </ScrollView>

      {/* ── Bottom Actions ───────────────────────────────────────────────── */}
      <View style={styles.bottomBar}>
        <Pressable
          onPress={handleFinish}
          disabled={saving}
          style={[styles.submitBtn, saving && { opacity: 0.6 }]}
          activeOpacity={0.8}
        >
          {saving ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={20} color="#FFF" style={{ marginRight: 8 }} />
              <Text style={styles.submitBtnText}>
                {uploadingReceipt ? "Uploading..." : "Submit & Complete"}
              </Text>
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

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: BG },
  scrollContent: { paddingBottom: 140 },

  // Success header
  successHeader: {
    backgroundColor: PRIMARY,
    paddingTop: 36,
    paddingBottom: 36,
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
  successTitle: { color: "#FFF", fontSize: 26, fontWeight: "800", fontFamily: "Poppins-Bold", marginBottom: 6 },
  successSub: { color: "rgba(255,255,255,0.75)", fontSize: 14, textAlign: "center", lineHeight: 20, fontFamily: "Inter" },

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
  cardTitle: { fontSize: 15, fontWeight: "700", color: DARK, fontFamily: "Poppins-SemiBold", marginBottom: 14 },

  // Summary
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
    backgroundColor: PRIMARY_LT,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryInfo: { flex: 1 },
  summaryLabel: { fontSize: 11, color: MUTED, fontFamily: "Inter" },
  summaryValue: { fontSize: 14, fontWeight: "600", color: DARK, fontFamily: "Inter-SemiBold" },

  // Transportation fields
  transportRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    gap: 12,
  },
  transportIconBox: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: BLUE_LT,
    alignItems: "center",
    justifyContent: "center",
  },
  transportLabel: { fontSize: 11, color: MUTED, fontFamily: "Inter" },
  transportValue: { fontSize: 15, fontWeight: "700", color: DARK, fontFamily: "Inter-Bold" },

  officeNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: AMBER_LT,
    borderRadius: 10,
    padding: 10,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  officeNoteText: { flex: 1, fontSize: 12, color: "#78350F", fontFamily: "Inter", lineHeight: 17 },

  totalKmBox: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: BLUE_LT,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  totalKmLabel: { fontSize: 13, fontWeight: "600", color: BLUE, fontFamily: "Inter-SemiBold" },
  totalKmValue: { fontSize: 18, fontWeight: "800", color: BLUE, fontFamily: "Poppins-Bold" },

  inputLabel: { fontSize: 13, fontWeight: "700", color: DARK, marginBottom: 8, fontFamily: "Inter-Bold" },
  kmInput: {
    borderWidth: 1.5,
    borderColor: BORDER,
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: DARK,
    backgroundColor: "#FAFAFA",
    fontFamily: "Inter",
  },
  textInput: {
    borderWidth: 1.5,
    borderColor: BORDER,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: DARK,
    backgroundColor: "#FAFAFA",
    fontFamily: "Inter",
  },

  // Receipt upload
  uploadBox: {
    borderWidth: 1.5,
    borderColor: "#D1D5DB",
    borderStyle: "dashed",
    borderRadius: 12,
    padding: 24,
    alignItems: "center",
    marginTop: 8,
    backgroundColor: "#FAFAFA",
  },
  uploadIconWrap: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  uploadLabel: { fontSize: 14, fontWeight: "600", color: "#374151", fontFamily: "Inter-SemiBold", marginBottom: 4 },
  uploadHint: { fontSize: 12, color: MUTED, fontFamily: "Inter" },
  retakeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: PRIMARY,
    borderRadius: 10,
    paddingVertical: 8,
  },
  retakeBtnText: { fontSize: 13, fontWeight: "600", color: PRIMARY, fontFamily: "Inter-SemiBold" },

  // Checklist
  checklistRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 9 },
  checklistDot: { width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  dotDone: { backgroundColor: SUCCESS },
  dotPending: { backgroundColor: "#F1F5F9" },
  checklistLabel: { flex: 1, fontSize: 14, fontWeight: "600", color: DARK, fontFamily: "Inter-SemiBold" },

  // Stars
  starsRow: { flexDirection: "row", justifyContent: "center", gap: 10, marginBottom: 8 },

  // Notes
  notesInput: {
    borderWidth: 1.5,
    borderColor: BORDER,
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    color: DARK,
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
  submitBtnText: { fontSize: 16, fontWeight: "700", color: "#FFF", fontFamily: "Poppins-SemiBold" },
  skipBtn: { height: 44, alignItems: "center", justifyContent: "center" },
  skipBtnText: { fontSize: 14, color: GRAY, fontFamily: "Inter-SemiBold" },
});
