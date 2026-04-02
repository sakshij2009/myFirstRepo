import {
  View,
  Text,
  Pressable,
  Image,
  ScrollView,
  Alert,
  SafeAreaView,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { db } from "../src/firebase/config";
import * as ImagePicker from "expo-image-picker";
import { uploadProfilePhoto } from "../src/utils/uploadProfilePhoto";

const PRIMARY = "#1F6F43";
const SECONDARY = "#DCFCE7";

export default function Profile() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsub;
    const load = async () => {
      try {
        const stored = await AsyncStorage.getItem("user");
        if (!stored) {
          setLoading(false);
          return;
        }
        const parsed = JSON.parse(stored);
        const ref = doc(db, "users", parsed.username || parsed.userId);
        unsub = onSnapshot(ref, (snap) => {
          if (snap.exists()) {
            setUser({ username: parsed.username || parsed.userId, ...snap.data() });
          }
          setLoading(false);
        }, () => setLoading(false));
      } catch {
        setLoading(false);
      }
    };
    load();
    return () => unsub && unsub();
  }, []);

  const handleChangePhoto = () => {
    Alert.alert("Change Profile Photo", "Choose an option", [
      { text: "Camera", onPress: openCamera },
      { text: "Gallery", onPress: openGallery },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const openCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission required", "Camera access is needed.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.7 });
    if (!result.canceled) await savePhoto(result.assets[0].uri);
  };

  const openGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission required", "Photo library access is needed.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, quality: 0.7 });
    if (!result.canceled) await savePhoto(result.assets[0].uri);
  };

  const savePhoto = async (uri) => {
    if (!user) return;
    try {
      const url = await uploadProfilePhoto(uri, user.username);
      await updateDoc(doc(db, "users", user.username), { profilePhotoUrl: url });
    } catch (e) {
      Alert.alert("Error", "Could not upload photo.");
    }
  };

  const handleLogout = () => {
    Alert.alert("Confirm Logout", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await AsyncStorage.removeItem("user");
          router.replace("/login");
        },
      },
    ]);
  };

  const initials = user?.name
    ? user.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#F9FAFB", alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color={PRIMARY} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F9FAFB" }} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 110 }}>

        {/* HEADER */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>My Profile</Text>
          <Pressable onPress={handleLogout} style={styles.logoutBtn}>
            <Ionicons name="log-out-outline" size={18} color="#EF4444" />
            <Text style={styles.logoutText}>Logout</Text>
          </Pressable>
        </View>

        {/* PROFILE HERO */}
        <View style={styles.profileHero}>
           <View style={styles.avatarContainer}>
              {user?.profilePhotoUrl ? (
                <Image source={{ uri: user.profilePhotoUrl }} style={styles.avatarImg} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                   <Text style={styles.avatarInitials}>{initials}</Text>
                </View>
              )}
              <Pressable onPress={handleChangePhoto} style={styles.cameraBtn}>
                 <Ionicons name="camera" size={16} color="#FFF" />
              </Pressable>
           </View>
           <Text style={styles.profileName}>{user?.name || "Staff Member"}</Text>
           <Text style={styles.profileRole}>{user?.designation || "Healthcare Staff"}</Text>
           <View style={styles.idBadge}>
              <Text style={styles.idBadgeText}>EMPLOYEE ID: {user?.userId || "—"}</Text>
           </View>
        </View>

        {/* STATISTICS GRID */}
        <View style={{ paddingHorizontal: 20, marginBottom: 30 }}>
           <Text style={styles.sectionHeading}>PERFORMANCE STATS</Text>
           <View style={styles.statsGrid}>
              <View style={styles.statCell}>
                 <Text style={styles.statValue}>124</Text>
                 <Text style={styles.statLabel}>Shifts Done</Text>
              </View>
              <View style={styles.statCell}>
                 <Text style={styles.statValue}>~482h</Text>
                 <Text style={styles.statLabel}>Hours Total</Text>
              </View>
              <View style={styles.statCell}>
                 <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 3 }}>
                    <Text style={styles.statValue}>4.9</Text>
                    <Ionicons name="star" size={14} color="#F59E0B" />
                 </View>
                 <Text style={styles.statLabel}>Avg Rating</Text>
              </View>
              <View style={styles.statCell}>
                 <Text style={styles.statValue}>98%</Text>
                 <Text style={styles.statLabel}>Attendance</Text>
              </View>
           </View>
        </View>

        {/* DOCUMENTS SECTION */}
        <View style={{ paddingHorizontal: 20, marginBottom: 30 }}>
           <Text style={styles.sectionHeading}>CERTIFICATIONS & DOCS</Text>
           <View style={styles.docCard}>
              <View style={styles.docRow}>
                 <View style={[styles.docIconBox, { backgroundColor: "#F0FDF4" }]}>
                    <Ionicons name="document-text" size={20} color={PRIMARY} />
                 </View>
                 <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.docName}>CPR & First Aid</Text>
                    <Text style={styles.docExpiry}>Valid until Aug 2026</Text>
                 </View>
                 <Ionicons name="checkmark-circle" size={18} color={PRIMARY} />
              </View>
              <View style={styles.docDivider} />
              <View style={styles.docRow}>
                 <View style={[styles.docIconBox, { backgroundColor: "#FEFCE8" }]}>
                    <Ionicons name="shield-checkmark" size={20} color="#854D0E" />
                 </View>
                 <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.docName}>Police Background Check</Text>
                    <Text style={[styles.docExpiry, { color: "#854D0E" }]}>Renewal due in 12 days</Text>
                 </View>
                 <Ionicons name="alert-circle" size={18} color="#F59E0B" />
              </View>
           </View>
           <Pressable style={styles.uploadBtn}>
              <Ionicons name="cloud-upload-outline" size={18} color={PRIMARY} />
              <Text style={styles.uploadBtnText}>Upload New Document</Text>
           </Pressable>
        </View>

        {/* SETTINGS MENU */}
        <View style={{ paddingHorizontal: 20 }}>
           <Text style={styles.sectionHeading}>GENERAL SETTINGS</Text>
           <MenuItem icon="badge-account-outline" title="Digital ID Card" sub="View security QR code" onPress={() => router.push("/staff-id-card")} />
           <MenuItem icon="calendar-check-outline" title="My Availability" sub="Shift preferences & regions" onPress={() => router.push("/availability")} />
           <MenuItem icon="business-outline" title="Agency Information" sub="View assigned agency support" onPress={() => router.push("/agency")} />
           <MenuItem icon="help-circle-outline" title="Help & Support" sub="Contact administrator" onPress={() => Alert.alert("Support", "Contact support@familyforever.ca")} />
        </View>

        <Text style={styles.versionText}>App Version 4.2.0 • Build 20260401</Text>

      </ScrollView>
    </SafeAreaView>
  );
}

function MenuItem({ icon, title, sub, onPress }) {
  return (
    <Pressable onPress={onPress} style={styles.menuItem}>
      <View style={styles.menuIconCircle}>
        <MaterialCommunityIcons name={icon} size={22} color={PRIMARY} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.menuTitle}>{title}</Text>
        <Text style={styles.menuSub}>{sub}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#D1D5DB" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
    fontFamily: "Poppins",
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#FEF2F2",
  },
  logoutText: {
    color: "#EF4444",
    fontWeight: "700",
    marginLeft: 6,
    fontSize: 13,
    fontFamily: "Inter",
  },
  profileHero: {
    alignItems: "center",
    paddingVertical: 35,
  },
  avatarContainer: {
    position: "relative",
    marginBottom: 16,
  },
  avatarImg: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: PRIMARY,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: SECONDARY,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: PRIMARY,
  },
  avatarInitials: {
    fontSize: 34,
    fontWeight: "800",
    color: PRIMARY,
    fontFamily: "Poppins",
  },
  cameraBtn: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: PRIMARY,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFF",
  },
  profileName: {
    fontSize: 24,
    fontWeight: "800",
    color: "#111827",
    fontFamily: "Poppins",
    marginBottom: 4,
  },
  profileRole: {
    fontSize: 14,
    color: "#4B5563",
    fontFamily: "Inter",
    fontWeight: "500",
    marginBottom: 14,
  },
  idBadge: {
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  idBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#6B7280",
    fontFamily: "Inter",
    letterSpacing: 0.5,
  },
  sectionHeading: {
    fontSize: 12,
    fontWeight: "800",
    color: "#9CA3AF",
    letterSpacing: 1.2,
    marginBottom: 16,
    textTransform: "uppercase",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  statCell: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: "#FFF",
    padding: 18,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    alignItems: "center",
  },
  statValue: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111827",
    fontFamily: "Poppins",
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: "#6B7280",
    fontFamily: "Inter",
    fontWeight: "600",
  },
  docCard: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    marginBottom: 16,
  },
  docRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  docIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  docName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    fontFamily: "Poppins",
  },
  docExpiry: {
    fontSize: 11,
    color: PRIMARY,
    fontWeight: "600",
    marginTop: 2,
    fontFamily: "Inter",
  },
  docDivider: {
    height: 1,
    backgroundColor: "#F9FAFB",
    marginVertical: 15,
  },
  uploadBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 15,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#D1FAE5",
    borderStyle: "dashed",
    backgroundColor: "#FAFFFE",
  },
  uploadBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: PRIMARY,
    fontFamily: "Poppins",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
    backgroundColor: "#FFF",
    padding: 16,
    borderRadius: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  menuIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  menuTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
    fontFamily: "Poppins",
  },
  menuSub: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 2,
    fontFamily: "Inter",
  },
  versionText: {
    textAlign: "center",
    fontSize: 11,
    color: "#D1D5DB",
    marginTop: 20,
    fontFamily: "Inter",
    fontWeight: "500",
  },
});
