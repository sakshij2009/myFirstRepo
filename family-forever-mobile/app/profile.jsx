import {
  View,
  Text,
  Pressable,
  Image,
  ScrollView,
  Alert,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState, useMemo } from "react";
import { doc, onSnapshot, updateDoc, collection, query, where } from "firebase/firestore";
import { db } from "../src/firebase/config";
import * as ImagePicker from "expo-image-picker";
import { uploadProfilePhoto } from "../src/utils/uploadProfilePhoto";

// ── Color tokens ──────────────────────────────────────────────────────────────
const PRIMARY_GREEN = "#1F6F43";
const LIGHT_GREEN = "#DCFCE7";
const TEXT_GREEN = "#166534";
const DARK_TEXT = "#111827";
const GRAY_TEXT = "#6B7280";
const GRAY_BORDER = "#F3F4F6";
const PAGE_BG = "#F9FAFB";
const ERROR_RED = "#EF4444";
const WARNING_AMBER = "#F59E0B";

export default function Profile() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsub;
    const loadUser = async () => {
      const stored = await AsyncStorage.getItem("user");
      if (!stored) {
        setLoading(false);
        return;
      }
      const parsed = JSON.parse(stored);
      const userRef = doc(db, "users", parsed.username || parsed.userId);
      unsub = onSnapshot(userRef, (snap) => {
        if (snap.exists()) setUser({ id: snap.id, ...snap.data() });
        setLoading(false);
      });
    };
    loadUser();
    return () => unsub && unsub();
  }, []);

  // Live shifts listener for stats
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "shifts"));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const mine = data.filter(s =>
        s?.userId === user?.userId || s?.name?.toLowerCase() === user?.name?.toLowerCase()
      );
      setShifts(mine);
    });
    return () => unsub();
  }, [user]);

  // Computed live stats
  const stats = useMemo(() => {
    const total = shifts.length;
    const completed = shifts.filter(s => !!s.clockOutTime).length;
    let hours = 0;
    shifts.forEach(s => {
      try {
        const parseTime = (t) => {
          if (!t) return 0;
          const [time, period] = t.split(" ");
          let [h, m] = time.split(":").map(Number);
          if (period?.toUpperCase() === "PM" && h !== 12) h += 12;
          if (period?.toUpperCase() === "AM" && h === 12) h = 0;
          return h + (m || 0) / 60;
        };
        const diff = parseTime(s.endTime) - parseTime(s.startTime);
        hours += diff > 0 ? diff : diff + 24;
      } catch {}
    });
    // Tenure calc
    let tenure = "—";
    if (user?.startDate) {
      const start = new Date(user.startDate);
      if (!isNaN(start.getTime())) {
        const diffMs = Date.now() - start.getTime();
        const months = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30.44));
        tenure = months >= 12 ? `${Math.floor(months / 12)}${months % 12 ? `.${Math.floor((months % 12) / 1.2)}` : ""} yrs` : `${months} mo`;
      }
    }
    return { total, completed, hours: Math.round(hours * 10) / 10, tenure };
  }, [shifts, user]);

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
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

  const handleChangePhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") return;
    const result = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, quality: 0.7 });
    if (!result.canceled) {
      try {
        const url = await uploadProfilePhoto(result.assets[0].uri, user.id);
        await updateDoc(doc(db, "users", user.id), { profilePhotoUrl: url });
      } catch (e) {
        Alert.alert("Error", "Failed to upload photo.");
      }
    }
  };

  if (loading) return <ActivityIndicator style={{ flex: 1 }} color={PRIMARY_GREEN} />;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
        <Pressable style={styles.settingsBtn}><Ionicons name="settings-outline" size={24} color={DARK_TEXT} /></Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Profile Card */}
        <View style={styles.profileBox}>
          <View style={styles.avatarWrapper}>
            <Image 
              source={user?.profilePhotoUrl ? { uri: user.profilePhotoUrl } : require("../assets/defaultuser.jpg")} 
              style={styles.avatar} 
            />
            <Pressable onPress={handleChangePhoto} style={styles.editAvatarBtn}>
              <Ionicons name="camera" size={14} color="#FFF" />
            </Pressable>
          </View>
          <Text style={styles.nameText}>{user?.name || "Sarah Johnson"}</Text>
          <Text style={styles.roleText}>{user?.designation || "Staff - Intake Worker"}</Text>
          <Text style={styles.orgText}>Family Forever Inc.</Text>
          <View style={styles.badgeRow}>
            <View style={styles.badge}><Text style={styles.badgeText}>CYIM: {user?.cyimId || "1432569"}</Text></View>
            <View style={[styles.badge, { backgroundColor: "#F0FDF4" }]}><Text style={[styles.badgeText, { color: "#10B981" }]}>Active</Text></View>
          </View>

          <View style={styles.statsRow}>
            <StatItem value={String(stats.total)} label="Total Shifts" />
            <StatItem value={`${stats.hours}`} label="Hours Logged" />
            <StatItem value={user?.rating ? `${user.rating} ★` : "—"} label="Rating" />
            <StatItem value={stats.tenure} label="Tenure" />
          </View>
        </View>

        {/* Staff ID Card Preview */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Staff ID Card</Text>
          <Pressable onPress={() => router.push("/staff-id-card")}>
            <Text style={styles.linkText}>View Full Card &gt;</Text>
          </Pressable>
        </View>
        <View style={styles.idCardPreview}>
          <View style={styles.idCardHeader}>
            <Text style={styles.idCardOrg}>Family Forever Inc.</Text>
            <Text style={styles.idCardNum}>Employee ID {user?.employeeId || "27"}</Text>
          </View>
          <View style={styles.idCardBody}>
            <Image source={user?.profilePhotoUrl ? { uri: user.profilePhotoUrl } : require("../assets/defaultuser.jpg")} style={styles.idCardAvatar} />
            <View style={{ flex: 1 }}>
              <Text style={styles.idCardName}>{user?.name || "Sarah Johnson"}</Text>
              <Text style={styles.idCardRole}>Child and Youth Care Worker</Text>
            </View>
            <Ionicons name="qr-code-outline" size={32} color={DARK_TEXT} style={{ opacity: 0.1 }} />
          </View>
          <Text style={styles.idCardHint}>Tap to show full card for parent verification</Text>
        </View>

        {/* Personal Details */}
        <View style={styles.detailsBox}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Personal Details</Text>
            <Pressable><Text style={styles.linkText}>Edit &gt;</Text></Pressable>
          </View>
          <DetailItem label="Full Name" value={user?.name || "Sarah Catherine Johnson"} />
          <DetailItem label="Email" value={user?.email || "sarah.johnson@email.com"} isEmail />
          <DetailItem label="Phone" value={user?.phone || "(555) 987-6543"} isPhone />
          <DetailItem label="Date of Birth" value={user?.dob || "June 15, 1994"} />
          <DetailItem label="Gender" value={user?.gender || "Female"} />
          <DetailItem label="Address" value={user?.address || "456 Birch Lane, Ontario"} />
          <DetailItem label="Start Date" value={user?.startDate || "March 1, 2024"} isLast />
        </View>

        {/* Employment */}
        <View style={styles.detailsBox}>
          <Text style={styles.sectionTitle}>Employment</Text>
          <DetailItem label="Employee ID" value={user?.employeeId || "EMP-2024-0087"} />
          <DetailItem label="CYIM ID" value={user?.cyimId || "1432569"} />
          <DetailItem label="Role" value={user?.designation || "Intake Worker"} />
          <DetailItem label="Department" value={user?.department || "Field Services"} />
          <DetailItem label="Salary" value={user?.salary || "$24.50/hr"} isLast />
        </View>



        {/* Quick Actions */}
        <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Quick Actions</Text>
        <View style={styles.actionsBox}>
          <ActionItem icon="lock-closed-outline" label="Change Password" />
          <ActionItem icon="notifications-outline" label="Notification Preferences" />
          <ActionItem icon="shield-checkmark-outline" label="Privacy & Security" />
          <ActionItem icon="help-circle-outline" label="Help & Support" />
          <ActionItem icon="document-text-outline" label="Terms & Policies" isLast />
        </View>

        {/* Sign Out */}
        <Pressable onPress={handleLogout} style={styles.signOutBtn}>
          <Ionicons name="log-out-outline" size={20} color={ERROR_RED} />
          <Text style={styles.signOutText}>Sign Out</Text>
        </Pressable>
        
        <Text style={styles.versionText}>Version 1.0.2</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatItem({ value, label }) {
  return (
    <View style={styles.statItem}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={[styles.statLabel, { marginTop: 4 }]}>{label}</Text>
    </View>
  );
}

function DetailItem({ label, value, isEmail, isPhone, isLast }) {
  return (
    <View style={[styles.detailItem, isLast && { borderBottomWidth: 0 }]}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={[styles.detailValue, isEmail && { color: PRIMARY_GREEN }, isPhone && { color: PRIMARY_GREEN }]}>{value}</Text>
    </View>
  );
}



function ActionItem({ icon, label, isLast }) {
  return (
    <Pressable style={[styles.actionItem, isLast && { borderBottomWidth: 0 }]}>
      <Ionicons name={icon} size={20} color={GRAY_TEXT} />
      <Text style={styles.actionLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={16} color="#D1D5DB" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFF" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingTop: 10, paddingBottom: 15 },
  headerTitle: { fontSize: 24, fontWeight: "800", color: DARK_TEXT, fontFamily: "Poppins-Bold" },
  settingsBtn: { padding: 4 },
  
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  
  profileBox: { alignItems: "center", paddingVertical: 20 },
  avatarWrapper: { position: "relative", marginBottom: 15 },
  avatar: { width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: LIGHT_GREEN },
  editAvatarBtn: { position: "absolute", bottom: 0, right: 0, backgroundColor: PRIMARY_GREEN, width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#FFF" },
  nameText: { fontSize: 22, fontWeight: "800", color: DARK_TEXT, fontFamily: "Poppins-Bold" },
  roleText: { fontSize: 14, color: GRAY_TEXT, marginTop: 4, fontFamily: "Inter" },
  orgText: { fontSize: 13, color: "#9CA3AF", marginTop: 2, fontFamily: "Inter" },
  badgeRow: { flexDirection: "row", gap: 10, marginTop: 15 },
  badge: { backgroundColor: "#F3F4F6", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: "700", color: GRAY_TEXT, fontFamily: "Inter-Bold" },
  
  statsRow: { flexDirection: "row", justifyContent: "space-between", width: "100%", marginTop: 30, paddingHorizontal: 10 },
  statItem: { alignItems: "center" },
  statValue: { fontSize: 18, fontWeight: "800", color: DARK_TEXT, fontFamily: "Poppins-Bold" },
  statLabel: { fontSize: 11, color: "#9CA3AF", fontFamily: "Inter-Bold", textTransform: "uppercase" },
  
  sectionHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 30, marginBottom: 15 },
  sectionTitle: { fontSize: 16, fontWeight: "800", color: DARK_TEXT, fontFamily: "Poppins-Bold" },
  linkText: { fontSize: 13, fontWeight: "700", color: PRIMARY_GREEN, fontFamily: "Inter-Bold" },
  
  idCardPreview: { padding: 20, borderRadius: 20, borderWidth: 1, borderColor: GRAY_BORDER, backgroundColor: "#FFF" },
  idCardHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 15 },
  idCardOrg: { fontSize: 12, fontWeight: "800", color: PRIMARY_GREEN, fontFamily: "Inter-Bold" },
  idCardNum: { fontSize: 11, fontWeight: "700", color: GRAY_TEXT },
  idCardBody: { flexDirection: "row", alignItems: "center", gap: 15 },
  idCardAvatar: { width: 44, height: 44, borderRadius: 22 },
  idCardName: { fontSize: 15, fontWeight: "700", color: DARK_TEXT, fontFamily: "Inter-Bold" },
  idCardRole: { fontSize: 12, color: GRAY_TEXT, marginTop: 2, fontFamily: "Inter" },
  idCardHint: { fontSize: 11, color: "#9CA3AF", marginTop: 15, textAlign: "center", fontFamily: "Inter" },
  
  detailsBox: { padding: 20, borderRadius: 20, borderWidth: 1, borderColor: GRAY_BORDER, marginTop: 20 },
  detailItem: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: GRAY_BORDER },
  detailLabel: { fontSize: 13, color: "#9CA3AF", fontFamily: "Inter" },
  detailValue: { fontSize: 14, fontWeight: "600", color: DARK_TEXT, fontFamily: "Inter-SemiBold" },
  
  uploadRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  docCard: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: GRAY_BORDER, backgroundColor: "#FFF", marginBottom: 10 },
  docIcon: { width: 36, height: 36, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  docTitle: { fontSize: 14, fontWeight: "700", color: DARK_TEXT, fontFamily: "Inter-Bold" },
  docDate: { fontSize: 12, color: GRAY_TEXT, marginTop: 2, fontFamily: "Inter" },
  docSummary: { marginTop: 5, alignItems: "center" },
  docSummaryText: { fontSize: 11, fontWeight: "700", color: "#9CA3AF", fontFamily: "Inter-Bold" },
  docActionBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: PRIMARY_GREEN, marginRight: 5 },
  docActionText: { fontSize: 11, fontWeight: "700", color: PRIMARY_GREEN },
  
  actionsBox: { padding: 10, borderRadius: 20, borderWidth: 1, borderColor: GRAY_BORDER, marginTop: 10 },
  actionItem: { flexDirection: "row", alignItems: "center", gap: 15, paddingVertical: 16, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: GRAY_BORDER },
  actionLabel: { flex: 1, fontSize: 15, fontWeight: "600", color: DARK_TEXT, fontFamily: "Inter-SemiBold" },
  
  signOutBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, marginTop: 40, height: 56, borderRadius: 16, borderWidth: 2, borderColor: "#FEE2E2", backgroundColor: "#FEF2F2" },
  signOutText: { fontSize: 16, fontWeight: "700", color: ERROR_RED, fontFamily: "Inter-Bold" },
  versionText: { textAlign: "center", color: "#D1D5DB", marginTop: 20, fontSize: 12, fontFamily: "Inter" },
});
