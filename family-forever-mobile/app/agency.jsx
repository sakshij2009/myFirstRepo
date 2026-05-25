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
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../src/firebase/config";

const GREEN = "#1F6F43";
const AGENT_TYPES = [
  "Intake Worker",
  "Care Provider",
  "Supervisor",
  "Case Worker",
  "Coordinator",
  "Administrator",
];

export default function Agency() {
  const [user, setUser] = useState(null);
  const [agencyInfo, setAgencyInfo] = useState({
    agencyName: "",
    agentType: "Intake Worker",
    contactEmail: "",
    contactPhone: "",
    agencyAddress: "",
    licenseNumber: "",
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        const stored = await AsyncStorage.getItem("user");
        if (!stored) {
          router.replace("/");
          return;
        }
        const parsed = JSON.parse(stored);
        setUser(parsed);
        await loadAgencyInfo(parsed);
      } catch (e) {
        console.log("Error loading user:", e);
      }
    };
    init();
  }, [router]);

  const loadAgencyInfo = async (u) => {
    try {
      const identifier = u.username || u.userId;
      if (!identifier) return;
      const snap = await getDoc(doc(db, "users", identifier));
      if (snap.exists()) {
        const data = snap.data();
        if (data.agencyInfo) {
          setAgencyInfo({ ...agencyInfo, ...data.agencyInfo });
        }
      }
    } catch (e) {
      console.log("Error loading agency info:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!agencyInfo.agencyName.trim()) {
      Alert.alert("Required", "Please enter agency name.");
      return;
    }
    if (!agencyInfo.agentType) {
      Alert.alert("Required", "Please select agent type.");
      return;
    }

    setSaving(true);
    try {
      const identifier = user.username || user.userId;
      const userRef = doc(db, "users", identifier);
      await updateDoc(userRef, {
        agencyInfo,
        updatedAt: new Date(),
      });
      Alert.alert("Success", "Agency information saved successfully.", [
        { text: "OK" },
      ]);
    } catch (error) {
      Alert.alert("Error", "Failed to save agency information. Try again.");
      console.log("Save error:", error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loaderBox}>
          <ActivityIndicator size="large" color={GREEN} />
          <Text style={styles.loaderText}>Loading agency information...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
          </Pressable>
          <Text style={styles.headerTitle}>Agency Support</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={{ padding: 20 }}>
          {/* ── ASSIGNED AGENCY CARD ── */}
          <Text style={styles.sectionHeading}>YOUR ASSIGNED AGENCY</Text>
          <View style={styles.agencyDisplayCard}>
            <View style={styles.agencyCardHeader}>
              <View style={styles.agencyLogoBox}>
                <Ionicons name="business" size={28} color={GREEN} />
              </View>
              <View>
                <Text style={styles.agencyMainName}>Family Forever Inc.</Text>
                <Text style={styles.agencyBranch}>Main Headquarters • Toronto</Text>
              </View>
            </View>

            <View style={styles.agencyDivider} />

            <View style={styles.agencyContactRow}>
              <View style={styles.contactItem}>
                <Text style={styles.contactLabel}>SUPPORT PHONE</Text>
                <Text style={styles.contactValue}>(555) 0123-4567</Text>
              </View>
              <View style={styles.contactItem}>
                <Text style={styles.contactLabel}>DIRECT EMAIL</Text>
                <Text style={styles.contactValue}>ops@familyforever.ca</Text>
              </View>
            </View>

            <View style={styles.agencyDivider} />

            <Pressable style={styles.contactPrimaryBtn}>
              <Ionicons name="chatbubbles" size={18} color="#FFF" />
              <Text style={styles.contactPrimaryText}>Contact Agency Support</Text>
            </Pressable>
          </View>

          {/* ── LEGAL & COMPLIANCE ── */}
          <Text style={styles.sectionHeading}>LEGAL & COMPLIANCE</Text>
          <View style={styles.legalGrid}>
             <View style={styles.legalCell}>
                <Text style={styles.legalLabel}>STAFF CLASSIFICATION</Text>
                <View style={styles.legalValueRow}>
                   <Ionicons name="briefcase" size={14} color={GREEN} />
                   <Text style={styles.legalValue}>Independent Contractor</Text>
                </View>
             </View>
             <View style={[styles.legalCell, { borderTopWidth: 1, borderTopColor: "#F3F4F6", paddingTop: 15 }]}>
                <Text style={styles.legalLabel}>COMPLIANCE STATUS</Text>
                <View style={[styles.legalValueRow, { backgroundColor: "#F0FDF4", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, alignSelf: "flex-start" }]}>
                   <Ionicons name="checkmark-circle" size={14} color={GREEN} />
                   <Text style={[styles.legalValue, { color: GREEN }]}>Verified & Active</Text>
                </View>
             </View>
             <View style={[styles.legalCell, { borderTopWidth: 1, borderTopColor: "#F3F4F6", paddingTop: 15 }]}>
                <Text style={styles.legalLabel}>OPERATING LICENSE</Text>
                <Text style={styles.legalValue}>#FF-2026-X8834</Text>
             </View>
          </View>

          {/* ── INFO BOX ── */}
          <View style={styles.noticeBox}>
            <Ionicons name="information-circle" size={18} color={GREEN} />
            <Text style={styles.noticeText}>
              To update your assigned agency or modify your legal status, please contact your regional supervisor directly.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1A1A1A",
    fontFamily: "Poppins",
  },
  sectionHeading: {
    fontSize: 12,
    fontWeight: "800",
    color: "#9CA3AF",
    letterSpacing: 0.8,
    marginBottom: 16,
    marginTop: 10,
  },
  agencyDisplayCard: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 24,
  },
  agencyCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
  },
  agencyLogoBox: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: "#F0FDF4",
    alignItems: "center",
    justifyContent: "center",
  },
  agencyMainName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    fontFamily: "Poppins",
  },
  agencyBranch: {
    fontSize: 12,
    color: "#6B7280",
    fontFamily: "Inter",
  },
  agencyDivider: {
    height: 1,
    backgroundColor: "#F3F4F6",
    marginVertical: 20,
  },
  agencyContactRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  contactItem: {
    flex: 1,
  },
  contactLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#9CA3AF",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  contactValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    fontFamily: "Inter",
  },
  contactPrimaryBtn: {
    backgroundColor: GREEN,
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  contactPrimaryText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "700",
    fontFamily: "Poppins",
  },
  legalGrid: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 15,
  },
  legalCell: {
    justifyContent: "center",
  },
  legalLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#9CA3AF",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  legalValueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  legalValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    fontFamily: "Inter",
  },
  noticeBox: {
    marginTop: 24,
    backgroundColor: "#F0FDF4",
    padding: 16,
    borderRadius: 12,
    flexDirection: "row",
    gap: 12,
  },
  noticeText: {
    flex: 1,
    fontSize: 12,
    color: GREEN,
    lineHeight: 18,
    fontFamily: "Inter",
  },
  loaderBox: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loaderText: {
    marginTop: 12,
    fontSize: 14,
    color: "#6B7280",
  },
});
