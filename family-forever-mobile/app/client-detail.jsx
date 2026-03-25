import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
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

const getInitials = (name) => {
  if (!name) return "?";
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
};

const calculateAge = (dob) => {
  if (!dob) return null;
  const birth = new Date(dob);
  if (isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
};

export default function ClientDetail() {
  const { clientId } = useLocalSearchParams();
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clientId) {
      setLoading(false);
      return;
    }
    fetchClient();
  }, [clientId]);

  const fetchClient = async () => {
    try {
      // 1. Direct doc lookup in "clients" collection
      const docRef = doc(db, "clients", clientId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setClient({ id: docSnap.id, ...docSnap.data() });
        setLoading(false);
        return;
      }

      // 2. Query "clients" by "clientId" field
      const cq = query(
        collection(db, "clients"),
        where("clientId", "==", clientId)
      );
      const cSnap = await getDocs(cq);
      if (!cSnap.empty) {
        setClient({ id: cSnap.docs[0].id, ...cSnap.docs[0].data() });
        setLoading(false);
        return;
      }

      // 3. Fall back: pull client info from matching shift
      const sq = query(
        collection(db, "shifts"),
        where("clientId", "==", clientId)
      );
      const sSnap = await getDocs(sq);
      if (!sSnap.empty) {
        const shiftData = sSnap.docs[0].data();
        setClient({
          id: clientId,
          name: shiftData.clientName || shiftData.name || "Unknown Client",
          location: shiftData.location,
          serviceType: shiftData.serviceType,
          carePlan: shiftData.carePlan || shiftData.notes,
          fromShift: true,
        });
        setLoading(false);
        return;
      }

      // 4. Try shifts doc directly
      const shiftDoc = await getDoc(doc(db, "shifts", clientId));
      if (shiftDoc.exists()) {
        const sd = shiftDoc.data();
        setClient({
          id: clientId,
          name: sd.clientName || sd.name || "Unknown Client",
          location: sd.location,
          serviceType: sd.serviceType,
          carePlan: sd.carePlan || sd.notes,
          fromShift: true,
        });
      }
    } catch (e) {
      console.log("Error fetching client:", e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={PRIMARY_GREEN} />
        <Text style={styles.loadingText}>Loading client profile…</Text>
      </SafeAreaView>
    );
  }

  if (!client) {
    return (
      <SafeAreaView style={styles.centered}>
        <Ionicons name="person-outline" size={56} color={GRAY_BORDER} />
        <Text style={styles.emptyTitle}>Client not found</Text>
        <Text style={styles.emptySubtitle}>
          We couldn't find this client's profile. Please go back and try again.
        </Text>
        <Pressable style={styles.backButtonFull} onPress={() => router.back()}>
          <Text style={styles.backButtonFullText}>Go Back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const initials = getInitials(client.name);
  const age = calculateAge(client.dob || client.dateOfBirth);

  // Avatar color cycles based on name
  const AVATAR_COLORS = [
    { bg: "#DBEAFE", text: "#1E5FA6" },
    { bg: "#D1FAE5", text: "#065F46" },
    { bg: "#EDE9FE", text: "#5B21B6" },
    { bg: "#FCE7F3", text: "#9D174D" },
    { bg: "#FEF3C7", text: "#92600A" },
  ];
  const colorIdx =
    (client.name || "").charCodeAt(0) % AVATAR_COLORS.length;
  const avatarColor = AVATAR_COLORS[colorIdx];

  return (
    <SafeAreaView style={styles.container}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.headerBack}>
          <Ionicons name="chevron-back" size={26} color={DARK_TEXT} />
        </Pressable>
        <Text style={styles.headerTitle}>Client Details</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ── Hero / Avatar Card ── */}
        <View style={styles.heroCard}>
          <View
            style={[
              styles.avatarLarge,
              { backgroundColor: avatarColor.bg },
            ]}
          >
            <Text style={[styles.avatarLargeText, { color: avatarColor.text }]}>
              {initials}
            </Text>
          </View>
          <Text style={styles.clientName}>{client.name || "Unknown Client"}</Text>
          {age !== null && (
            <View style={styles.agePill}>
              <Ionicons name="person" size={13} color={PRIMARY_GREEN} />
              <Text style={styles.agePillText}>{age} years old</Text>
            </View>
          )}
          {client.serviceType && (
            <View style={styles.serviceTypePill}>
              <Text style={styles.serviceTypeText}>{client.serviceType}</Text>
            </View>
          )}
        </View>

        {/* ── Contact Information ── */}
        {(client.phone || client.email || client.address || client.location) && (
          <View style={styles.sectionCard}>
            <View style={styles.sectionLabelRow}>
              <View style={[styles.sectionIconBox, { backgroundColor: "#EBF5FF" }]}>
                <Ionicons name="call-outline" size={16} color="#1E5FA6" />
              </View>
              <Text style={styles.sectionLabel}>CONTACT INFORMATION</Text>
            </View>

            {client.phone && (
              <Pressable
                style={styles.infoRow}
                onPress={() => Linking.openURL(`tel:${client.phone}`)}
              >
                <View style={[styles.iconBox, { backgroundColor: "#EBF5FF" }]}>
                  <Ionicons name="call-outline" size={18} color="#1E5FA6" />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Phone</Text>
                  <Text style={[styles.infoValue, styles.linkText]}>
                    {client.phone}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={GRAY_TEXT} />
              </Pressable>
            )}

            {client.email && (
              <Pressable
                style={styles.infoRow}
                onPress={() => Linking.openURL(`mailto:${client.email}`)}
              >
                <View style={[styles.iconBox, { backgroundColor: "#EDE9FE" }]}>
                  <Ionicons name="mail-outline" size={18} color="#5B21B6" />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Email</Text>
                  <Text style={[styles.infoValue, styles.linkText]}>
                    {client.email}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={GRAY_TEXT} />
              </Pressable>
            )}

            {(client.address || client.location) && (
              <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
                <View style={[styles.iconBox, { backgroundColor: "#FEF3C7" }]}>
                  <Ionicons name="location-outline" size={18} color="#D97706" />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Address</Text>
                  <Text style={styles.infoValue}>
                    {client.address || client.location}
                  </Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* ── Care Plan ── */}
        {(client.carePlan || client.notes) && (
          <View style={styles.sectionCard}>
            <View style={styles.sectionLabelRow}>
              <View style={[styles.sectionIconBox, { backgroundColor: LIGHT_GREEN }]}>
                <Ionicons name="clipboard-outline" size={16} color={PRIMARY_GREEN} />
              </View>
              <Text style={styles.sectionLabel}>CARE PLAN</Text>
            </View>
            <Text style={styles.notesText}>
              {client.carePlan || client.notes}
            </Text>
          </View>
        )}

        {/* ── Medical Notes / Special Needs ── */}
        {(client.medicalNotes || client.specialNeeds || client.allergies || client.conditions) && (
          <View style={styles.sectionCard}>
            <View style={styles.sectionLabelRow}>
              <View style={[styles.sectionIconBox, { backgroundColor: "#FEF2F2" }]}>
                <Ionicons name="medkit-outline" size={16} color={ERROR_RED} />
              </View>
              <Text style={styles.sectionLabel}>MEDICAL NOTES</Text>
            </View>

            {client.medicalNotes && (
              <View style={styles.medNoteRow}>
                <Ionicons
                  name="information-circle-outline"
                  size={18}
                  color={ERROR_RED}
                  style={{ marginTop: 2 }}
                />
                <Text style={styles.medNoteText}>{client.medicalNotes}</Text>
              </View>
            )}

            {client.allergies && (
              <View style={[styles.alertPill, { backgroundColor: "#FEF2F2" }]}>
                <Ionicons name="warning-outline" size={16} color={ERROR_RED} />
                <Text style={[styles.alertPillText, { color: ERROR_RED }]}>
                  Allergies: {client.allergies}
                </Text>
              </View>
            )}

            {client.conditions && (
              <View style={[styles.alertPill, { backgroundColor: "#FFF8E1" }]}>
                <Ionicons name="pulse-outline" size={16} color="#D97706" />
                <Text style={[styles.alertPillText, { color: "#92600A" }]}>
                  Conditions: {client.conditions}
                </Text>
              </View>
            )}

            {client.specialNeeds && (
              <Text style={[styles.notesText, { marginTop: 10 }]}>
                {client.specialNeeds}
              </Text>
            )}
          </View>
        )}

        {/* ── Emergency Contact ── */}
        {(client.emergencyContact ||
          client.emergencyPhone ||
          client.emergencyName) && (
          <View style={styles.sectionCard}>
            <View style={styles.sectionLabelRow}>
              <View
                style={[styles.sectionIconBox, { backgroundColor: "#FEF3C7" }]}
              >
                <Ionicons
                  name="alert-circle-outline"
                  size={16}
                  color="#D97706"
                />
              </View>
              <Text style={styles.sectionLabel}>EMERGENCY CONTACT</Text>
            </View>

            {(client.emergencyName || client.emergencyContact) && (
              <View style={styles.infoRow}>
                <View
                  style={[styles.iconBox, { backgroundColor: "#FEF3C7" }]}
                >
                  <Ionicons name="person-outline" size={18} color="#D97706" />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Name</Text>
                  <Text style={styles.infoValue}>
                    {client.emergencyName || client.emergencyContact}
                  </Text>
                </View>
              </View>
            )}

            {client.emergencyPhone && (
              <Pressable
                style={[styles.infoRow, { borderBottomWidth: 0 }]}
                onPress={() =>
                  Linking.openURL(`tel:${client.emergencyPhone}`)
                }
              >
                <View
                  style={[styles.iconBox, { backgroundColor: "#EBF5FF" }]}
                >
                  <Ionicons name="call-outline" size={18} color="#1E5FA6" />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Phone</Text>
                  <Text style={[styles.infoValue, styles.linkText]}>
                    {client.emergencyPhone}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={GRAY_TEXT} />
              </Pressable>
            )}
          </View>
        )}

        {/* ── Placeholder when no detailed data available ── */}
        {!client.phone &&
          !client.email &&
          !client.carePlan &&
          !client.notes &&
          !client.medicalNotes &&
          !client.emergencyContact && (
            <View style={styles.emptyCard}>
              <Ionicons
                name="document-text-outline"
                size={40}
                color={GRAY_BORDER}
              />
              <Text style={styles.emptyCardTitle}>
                Limited profile information
              </Text>
              <Text style={styles.emptyCardSub}>
                Full client details will appear here once the profile is
                completed in the admin system.
              </Text>
            </View>
          )}

        {/* ── Client ID badge ── */}
        <View style={styles.idBadge}>
          <Ionicons name="finger-print-outline" size={14} color={GRAY_TEXT} />
          <Text style={styles.idBadgeText}>Client ID: {client.id}</Text>
        </View>
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
    paddingTop: 24,
    paddingBottom: 120,
  },
  // Hero card
  heroCard: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 28,
    marginBottom: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: GRAY_BORDER,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  avatarLarge: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  avatarLargeText: {
    fontSize: 32,
    fontWeight: "800",
  },
  clientName: {
    fontSize: 22,
    fontWeight: "800",
    color: DARK_TEXT,
    letterSpacing: -0.5,
    textAlign: "center",
    marginBottom: 10,
  },
  agePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: LIGHT_GREEN,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    marginBottom: 8,
  },
  agePillText: {
    fontSize: 13,
    fontWeight: "700",
    color: PRIMARY_GREEN,
  },
  serviceTypePill: {
    backgroundColor: "#EBF5FF",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 4,
  },
  serviceTypeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1E5FA6",
    letterSpacing: -0.1,
  },
  // Section card
  sectionCard: {
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
  sectionLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
  },
  sectionIconBox: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: GRAY_TEXT,
    letterSpacing: 0.8,
  },
  // Info rows within cards
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    color: GRAY_TEXT,
    fontWeight: "600",
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 15,
    color: DARK_TEXT,
    fontWeight: "600",
    lineHeight: 20,
  },
  linkText: {
    color: "#1E5FA6",
    textDecorationLine: "underline",
  },
  // Medical notes
  medNoteRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
    alignItems: "flex-start",
  },
  medNoteText: {
    flex: 1,
    fontSize: 14,
    color: "#374151",
    lineHeight: 22,
    fontWeight: "400",
  },
  alertPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 8,
  },
  alertPillText: {
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
  },
  // Notes
  notesText: {
    fontSize: 14,
    color: "#374151",
    lineHeight: 22,
    fontWeight: "400",
  },
  // Empty state card
  emptyCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 32,
    alignItems: "center",
    marginBottom: 14,
    borderWidth: 1,
    borderColor: GRAY_BORDER,
  },
  emptyCardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: DARK_TEXT,
    marginTop: 14,
    letterSpacing: -0.2,
  },
  emptyCardSub: {
    fontSize: 13,
    color: GRAY_TEXT,
    textAlign: "center",
    lineHeight: 20,
    marginTop: 8,
  },
  // ID badge
  idBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    justifyContent: "center",
    marginTop: 4,
    marginBottom: 8,
  },
  idBadgeText: {
    fontSize: 12,
    color: GRAY_TEXT,
    fontWeight: "500",
  },
});
