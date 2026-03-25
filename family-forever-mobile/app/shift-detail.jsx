import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
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
const WARNING_AMBER = "#F59E0B";

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  Confirmed: { bg: LIGHT_GREEN, text: PRIMARY_GREEN, dot: "#22C55E" },
  Assigned: { bg: "#FFF8E1", text: "#92600A", dot: WARNING_AMBER },
  "In Progress": { bg: "#EBF5FF", text: "#1E5FA6", dot: "#3B82F6" },
  Completed: { bg: "#F3F4F6", text: "#6B7280", dot: "#9CA3AF" },
};

// ── Service type colors ───────────────────────────────────────────────────────
const SERVICE_CONFIG = {
  "Respite Care": { bg: "#EBF5FF", text: "#1E5FA6" },
  "Emergent Care": { bg: "#FEF2F2", text: "#B91C1C" },
  "Emergency Care": { bg: "#FEF2F2", text: "#B91C1C" },
  Transportation: { bg: "#FFF8E1", text: "#92600A" },
  "Supervised Visitation": { bg: "#F3F0FF", text: "#5B21B6" },
  default: { bg: "#D1FAE5", text: "#1F6F43" },
};

const getInitials = (name) => {
  if (!name) return "?";
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
};

export default function ShiftDetail() {
  const { shiftId } = useLocalSearchParams();
  const [shift, setShift] = useState(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      const stored = await AsyncStorage.getItem("user");
      if (stored) setUser(JSON.parse(stored));
    };
    loadUser();
  }, []);

  useEffect(() => {
    if (!shiftId) {
      setLoading(false);
      return;
    }
    fetchShift();
  }, [shiftId]);

  const fetchShift = async () => {
    try {
      // Try direct doc lookup first
      const docRef = doc(db, "shifts", shiftId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setShift({ id: docSnap.id, ...docSnap.data() });
        setLoading(false);
        return;
      }
      // Fallback: query by "id" field
      const q = query(collection(db, "shifts"), where("id", "==", shiftId));
      const snap = await getDocs(q);
      if (!snap.empty) {
        setShift({ id: snap.docs[0].id, ...snap.docs[0].data() });
      }
    } catch (e) {
      console.log("Error fetching shift:", e);
    } finally {
      setLoading(false);
    }
  };

  const confirmShift = async () => {
    if (!shift || confirming) return;
    setConfirming(true);
    try {
      const q = query(
        collection(db, "shifts"),
        where("id", "==", shift.id)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        await updateDoc(snap.docs[0].ref, { shiftConfirmed: true });
        setShift((prev) => ({ ...prev, shiftConfirmed: true }));
      } else {
        // Try direct doc ref
        const docRef = doc(db, "shifts", shift.id);
        await updateDoc(docRef, { shiftConfirmed: true });
        setShift((prev) => ({ ...prev, shiftConfirmed: true }));
      }
    } catch (e) {
      console.log("Error confirming shift:", e);
    } finally {
      setConfirming(false);
    }
  };

  // Derive status
  const deriveStatus = (s) => {
    if (!s) return "Assigned";
    if (s.status) return s.status;
    if (s.checkedIn && !s.checkedOut) return "In Progress";
    if (s.shiftConfirmed) return "Confirmed";
    return "Assigned";
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={PRIMARY_GREEN} />
        <Text style={styles.loadingText}>Loading shift details…</Text>
      </SafeAreaView>
    );
  }

  if (!shift) {
    return (
      <SafeAreaView style={styles.centered}>
        <Ionicons name="calendar-outline" size={56} color={GRAY_BORDER} />
        <Text style={styles.emptyTitle}>Shift not found</Text>
        <Text style={styles.emptySubtitle}>
          We couldn't load this shift. Please go back and try again.
        </Text>
        <Pressable style={styles.backButtonFull} onPress={() => router.back()}>
          <Text style={styles.backButtonFullText}>Go Back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const status = deriveStatus(shift);
  const statusCfg = STATUS_CONFIG[status] || STATUS_CONFIG["Assigned"];
  const serviceStyle =
    SERVICE_CONFIG[shift.serviceType] || SERVICE_CONFIG.default;
  const clientName = shift.clientName || shift.name || "Client";
  const clientInitials = getInitials(clientName);

  return (
    <SafeAreaView style={styles.container}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.headerBack}>
          <Ionicons name="chevron-back" size={26} color={DARK_TEXT} />
        </Pressable>
        <Text style={styles.headerTitle}>Shift Details</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ── Status + Service + Time Hero Card ── */}
        <View style={styles.heroCard}>
          {/* Status badge */}
          <View style={styles.heroTopRow}>
            <View style={[styles.statusBadge, { backgroundColor: statusCfg.bg }]}>
              <View style={[styles.statusDot, { backgroundColor: statusCfg.dot }]} />
              <Text style={[styles.statusText, { color: statusCfg.text }]}>
                {status}
              </Text>
            </View>
            {/* Service type badge */}
            <View
              style={[
                styles.serviceBadge,
                { backgroundColor: serviceStyle.bg },
              ]}
            >
              <Text style={[styles.serviceText, { color: serviceStyle.text }]}>
                {shift.serviceType || "General Care"}
              </Text>
            </View>
          </View>

          {/* Time */}
          <View style={styles.timeRow}>
            <Ionicons name="time-outline" size={20} color={PRIMARY_GREEN} />
            <Text style={styles.timeText}>
              {shift.startTime || "—"} – {shift.endTime || "—"}
            </Text>
          </View>

          {/* Date */}
          <View style={styles.dateRow}>
            <Ionicons name="calendar-outline" size={18} color={GRAY_TEXT} />
            <Text style={styles.dateText}>
              {shift.startDate || shift.date || "Date not set"}
            </Text>
          </View>
        </View>

        {/* ── Client Section ── */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionLabel}>CLIENT</Text>
          <View style={styles.clientRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{clientInitials}</Text>
            </View>
            <View style={styles.clientInfo}>
              <Text style={styles.clientName}>{clientName}</Text>
              {shift.clientId && (
                <Text style={styles.clientId}>ID: {shift.clientId}</Text>
              )}
            </View>
          </View>
          <Pressable
            style={styles.viewClientBtn}
            onPress={() =>
              router.push(
                `/client-detail?clientId=${shift.clientId || shift.id}`
              )
            }
          >
            <Ionicons name="person-circle-outline" size={18} color={PRIMARY_GREEN} />
            <Text style={styles.viewClientText}>View Client Profile</Text>
            <Ionicons name="chevron-forward" size={16} color={PRIMARY_GREEN} />
          </Pressable>
        </View>

        {/* ── Location Section ── */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionLabel}>LOCATION</Text>
          <View style={styles.infoRow}>
            <View style={[styles.iconBox, { backgroundColor: "#FEF3C7" }]}>
              <Ionicons name="map-outline" size={20} color="#D97706" />
            </View>
            <Text style={styles.infoText} numberOfLines={2}>
              {shift.location || "Location not specified"}
            </Text>
          </View>
        </View>

        {/* ── Staff Section ── */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionLabel}>ASSIGNED STAFF</Text>
          <View style={styles.infoRow}>
            <View style={[styles.iconBox, { backgroundColor: LIGHT_GREEN }]}>
              <Ionicons name="person-outline" size={20} color={PRIMARY_GREEN} />
            </View>
            <Text style={styles.infoText}>
              {user?.name || shift.staffName || "You"}
            </Text>
          </View>
        </View>

        {/* ── Action Buttons based on status ── */}
        {status === "Confirmed" && (
          <Pressable
            style={styles.primaryBtn}
            onPress={() =>
              router.push(`/geo-checkin?shiftId=${shiftId}`)
            }
          >
            <Ionicons name="location" size={20} color="#fff" />
            <Text style={styles.primaryBtnText}>Check In</Text>
          </Pressable>
        )}

        {status === "In Progress" && (
          <View style={styles.actionGroup}>
            <Pressable
              style={styles.primaryBtn}
              onPress={() =>
                router.push(`/geo-checkout?shiftId=${shiftId}`)
              }
            >
              <Ionicons name="log-out-outline" size={20} color="#fff" />
              <Text style={styles.primaryBtnText}>Check Out</Text>
            </Pressable>
          </View>
        )}

        {status === "Assigned" && (
          <Pressable
            style={styles.outlineBtn}
            onPress={confirmShift}
            disabled={confirming}
          >
            {confirming ? (
              <ActivityIndicator size="small" color={PRIMARY_GREEN} />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={20} color={PRIMARY_GREEN} />
                <Text style={styles.outlineBtnText}>Confirm Shift</Text>
              </>
            )}
          </Pressable>
        )}

        {/* ── Quick Actions Grid ── */}
        <Text style={styles.quickActionsLabel}>QUICK ACTIONS</Text>
        <View style={styles.quickGrid}>
          {/* Medications */}
          <Pressable
            style={styles.quickCard}
            onPress={() =>
              router.push(`/shift-medications?shiftId=${shiftId}`)
            }
          >
            <View style={[styles.quickIconBox, { backgroundColor: "#EBF5FF" }]}>
              <Ionicons name="medical-outline" size={24} color="#1E5FA6" />
            </View>
            <Text style={styles.quickCardTitle}>Medications</Text>
            <Text style={styles.quickCardSub}>Track & log meds</Text>
          </Pressable>

          {/* Transportation */}
          <Pressable
            style={styles.quickCard}
            onPress={() =>
              router.push(`/shift-transportations?shiftId=${shiftId}`)
            }
          >
            <View style={[styles.quickIconBox, { backgroundColor: "#FFF8E1" }]}>
              <Ionicons name="car-outline" size={24} color="#D97706" />
            </View>
            <Text style={styles.quickCardTitle}>Transportation</Text>
            <Text style={styles.quickCardSub}>Log trips & miles</Text>
          </Pressable>

          {/* Intake Form */}
          <Pressable
            style={styles.quickCard}
            onPress={() =>
              router.push(`/intake-form?shiftId=${shiftId}`)
            }
          >
            <View style={[styles.quickIconBox, { backgroundColor: "#F3F0FF" }]}>
              <Ionicons name="document-text-outline" size={24} color="#5B21B6" />
            </View>
            <Text style={styles.quickCardTitle}>Intake Form</Text>
            <Text style={styles.quickCardSub}>Complete intake</Text>
          </Pressable>

          {/* Transfer Shift */}
          <Pressable
            style={styles.quickCard}
            onPress={() =>
              router.push(`/transfer-shift?shiftId=${shiftId}`)
            }
          >
            <View style={[styles.quickIconBox, { backgroundColor: "#FEF2F2" }]}>
              <Ionicons name="swap-horizontal-outline" size={24} color={ERROR_RED} />
            </View>
            <Text style={styles.quickCardTitle}>Transfer Shift</Text>
            <Text style={styles.quickCardSub}>Reassign shift</Text>
          </Pressable>
        </View>

        {/* ── Notes Section ── */}
        {!!shift.notes && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionLabel}>NOTES</Text>
            <Text style={styles.notesText}>{shift.notes}</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: GRAY_LIGHT,
  },
  centered: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  loadingText: {
    marginTop: 14,
    fontSize: 15,
    color: GRAY_TEXT,
    fontWeight: "500",
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: DARK_TEXT,
    marginTop: 16,
    letterSpacing: -0.3,
  },
  emptySubtitle: {
    fontSize: 14,
    color: GRAY_TEXT,
    marginTop: 8,
    textAlign: "center",
    lineHeight: 22,
  },
  backButtonFull: {
    marginTop: 24,
    backgroundColor: PRIMARY_GREEN,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 14,
  },
  backButtonFullText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
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
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 120,
  },
  // Hero card
  heroCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: GRAY_BORDER,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
    flexWrap: "wrap",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: -0.1,
  },
  serviceBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  serviceText: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: -0.1,
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  timeText: {
    fontSize: 22,
    fontWeight: "800",
    color: DARK_TEXT,
    letterSpacing: -0.5,
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dateText: {
    fontSize: 14,
    color: GRAY_TEXT,
    fontWeight: "500",
  },
  // Section card
  sectionCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
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
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: GRAY_TEXT,
    letterSpacing: 0.8,
    marginBottom: 14,
  },
  // Client
  clientRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 16,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#DBEAFE",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1E5FA6",
  },
  clientInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: 17,
    fontWeight: "800",
    color: DARK_TEXT,
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  clientId: {
    fontSize: 13,
    color: GRAY_TEXT,
    fontWeight: "500",
  },
  viewClientBtn: {
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
  viewClientText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    color: PRIMARY_GREEN,
    letterSpacing: -0.2,
  },
  // Info row
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  infoText: {
    flex: 1,
    fontSize: 15,
    color: DARK_TEXT,
    fontWeight: "500",
    lineHeight: 22,
    paddingTop: 10,
  },
  // Primary button
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: PRIMARY_GREEN,
    borderRadius: 16,
    paddingVertical: 17,
    marginBottom: 14,
    shadowColor: PRIMARY_GREEN,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: -0.3,
  },
  // Outline button
  outlineBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderWidth: 2,
    borderColor: PRIMARY_GREEN,
    borderRadius: 16,
    paddingVertical: 15,
    marginBottom: 14,
    backgroundColor: "#fff",
  },
  outlineBtnText: {
    fontSize: 16,
    fontWeight: "800",
    color: PRIMARY_GREEN,
    letterSpacing: -0.3,
  },
  actionGroup: {
    gap: 10,
    marginBottom: 4,
  },
  // Quick actions
  quickActionsLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: GRAY_TEXT,
    letterSpacing: 0.8,
    marginBottom: 12,
    marginTop: 4,
  },
  quickGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 14,
  },
  quickCard: {
    width: "47%",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: GRAY_BORDER,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  quickIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  quickCardTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: DARK_TEXT,
    letterSpacing: -0.2,
    marginBottom: 4,
  },
  quickCardSub: {
    fontSize: 12,
    color: GRAY_TEXT,
    fontWeight: "400",
    lineHeight: 16,
  },
  // Notes
  notesText: {
    fontSize: 14,
    color: "#374151",
    lineHeight: 22,
    fontWeight: "400",
  },
});
