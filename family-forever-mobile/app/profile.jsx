import {
  View,
  Text,
  Pressable,
  Image,
  ScrollView,
  Alert,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Linking,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState, useMemo } from "react";
import { doc, onSnapshot, updateDoc, collection, addDoc, serverTimestamp, query } from "firebase/firestore";
import { db, auth } from "../src/firebase/config";
import { reauthenticateWithCredential, EmailAuthProvider, updatePassword } from "firebase/auth";
import * as ImagePicker from "expo-image-picker";
import { uploadProfilePhoto } from "../src/utils/uploadProfilePhoto";
import Constants from "expo-constants";

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
  const [isZoomed, setIsZoomed] = useState(false);
  const [showChangePw, setShowChangePw] = useState(false);
  const [pwCurrent, setPwCurrent] = useState("");
  const [pwNew, setPwNew] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [pwChanging, setPwChanging] = useState(false);
  const [pwShowCurrent, setPwShowCurrent] = useState(false);
  const [pwShowNew, setPwShowNew] = useState(false);
  const [pwShowConfirm, setPwShowConfirm] = useState(false);

  useEffect(() => {
    let unsub;
    const loadUser = async () => {
      const stored = await AsyncStorage.getItem("user");
      if (!stored) {
        setLoading(false);
        return;
      }
      const parsed = JSON.parse(stored);
      // Always show the logged-in user immediately (prevents a wrong/blank profile)
      setUser(parsed);
      setLoading(false);

      // Live-update from Firestore, but ONLY if it's the same person (guard against
      // a stale/colliding doc id showing someone else's profile)
      const docId = parsed.id || parsed.firestoreId || parsed.username || parsed.userId;
      if (!docId) return;
      const userRef = doc(db, "users", String(docId));
      unsub = onSnapshot(userRef, (snap) => {
        if (!snap.exists()) return;
        const data = snap.data();
        const sameUser =
          (parsed.email && data.email && parsed.email === data.email) ||
          (parsed.userId && data.userId && String(parsed.userId) === String(data.userId)) ||
          (!parsed.email && !parsed.userId); // no identifier to compare → trust it
        if (sameUser) setUser({ id: snap.id, ...data });
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
        !s?.isDeleted && (
          s?.userId === user?.userId || s?.staffId === user?.userId || s?.name?.toLowerCase() === user?.name?.toLowerCase() ||
          s?.secondaryUserId === user?.userId || s?.secondaryUserName?.toLowerCase() === user?.name?.toLowerCase() || s?.secondaryUser?.toLowerCase() === user?.name?.toLowerCase()
        )
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
    if (user?.dayOfJoining || user?.startDate) {
      const start = new Date(user?.dayOfJoining || user?.startDate);
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

  const handleChangePassword = async () => {
    if (!pwCurrent || !pwNew || !pwConfirm) {
      Alert.alert("Error", "Please fill in all fields.");
      return;
    }
    if (pwNew !== pwConfirm) {
      Alert.alert("Error", "New passwords do not match.");
      return;
    }
    if (pwNew.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters.");
      return;
    }
    setPwChanging(true);
    try {
      const credential = EmailAuthProvider.credential(user?.email, pwCurrent);
      await reauthenticateWithCredential(auth.currentUser, credential);
      await updatePassword(auth.currentUser, pwNew);
      // Notify admin
      await addDoc(collection(db, "adminNotifications"), {
        title: "Password Changed",
        message: `${user?.name || "A staff member"} (${user?.email}) changed their password.`,
        type: "security",
        userId: user?.userId || user?.id,
        userName: user?.name,
        read: false,
        createdAt: serverTimestamp(),
      });
      setShowChangePw(false);
      setPwCurrent(""); setPwNew(""); setPwConfirm("");
      Alert.alert("Success ✓", "Your password has been updated.");
    } catch (e) {
      if (e.code === "auth/wrong-password" || e.code === "auth/invalid-credential") {
        Alert.alert("Error", "Current password is incorrect.");
      } else {
        Alert.alert("Error", "Failed to update password. Please try again.");
      }
    } finally {
      setPwChanging(false);
    }
  };

  const handleQuickAction = (action) => {
    switch (action) {
      case "Change Password":
        setPwCurrent(""); setPwNew(""); setPwConfirm("");
        setShowChangePw(true);
        break;
      case "Notification Preferences":
        Linking.openSettings();
        break;
      case "Privacy & Security":
        Linking.openURL("https://familyforever.ca/privacy.html").catch(() => {
          Alert.alert("Privacy Policy", "Visit familyforever.ca/privacy.html for our privacy policy.");
        });
        break;
      default:
        break;
    }
  };

  if (loading) return <ActivityIndicator style={{ flex: 1 }} color={PRIMARY_GREEN} />;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={styles.settingsBtn} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Profile Card */}
        <View style={styles.profileBox}>
          <View style={styles.avatarWrapper}>
            <Pressable 
              onPress={() => setIsZoomed(true)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Image 
                source={user?.profilePhotoUrl ? { uri: user.profilePhotoUrl } : require("../assets/defaultuser.jpg")} 
                style={styles.avatar} 
              />
            </Pressable>
            <Pressable onPress={handleChangePhoto} style={styles.editAvatarBtn}>
              <Ionicons name="camera" size={14} color="#FFF" />
            </Pressable>
          </View>
          <Text style={styles.nameText}>{user?.name || "Sarah Johnson"}</Text>
          <Text style={styles.roleText}>{user?.role || "User"} (Staff)</Text>
          <Text style={styles.orgText}>{user?.organization || user?.agencyName || user?.agency || "Family Forever Inc."}</Text>
          <View style={styles.badgeRow}>
            <View style={[styles.badge, { backgroundColor: "#F0FDF4" }]}><Text style={[styles.badgeText, { color: "#10B981" }]}>Active</Text></View>
          </View>

          <View style={styles.statsRow}>
            <StatItem value={String(stats.total)} label="Total Shifts" />
            <StatItem value={`${stats.hours}`} label="Hours Logged" />
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
            <Text style={styles.idCardOrg}>{user?.organization || user?.agencyName || user?.agency || "Family Forever Inc."}</Text>
            <Text style={styles.idCardNum}>Employee ID {user?.userId || user?.employeeId || "—"}</Text>
          </View>
          <View style={styles.idCardBody}>
            <Image source={user?.profilePhotoUrl ? { uri: user.profilePhotoUrl } : require("../assets/defaultuser.jpg")} style={styles.idCardAvatar} />
            <View style={{ flex: 1 }}>
              <Text style={styles.idCardName}>{user?.name || "Sarah Johnson"}</Text>
              <Text style={styles.idCardRole}>{user?.role || "Staff"}</Text>
            </View>
            <Ionicons name="qr-code-outline" size={32} color={DARK_TEXT} style={{ opacity: 0.1 }} />
          </View>
          <Text style={styles.idCardHint}>Tap to show full card for parent verification</Text>
        </View>

        {/* Personal Details */}
        <View style={styles.detailsBox}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Personal Details</Text>
          </View>
          <DetailItem label="Full Name" value={user?.name || "Sarah Catherine Johnson"} />
          <DetailItem label="Email" value={user?.email || "sarah.johnson@email.com"} isEmail />
          <DetailItem label="Phone" value={user?.phone || "(555) 987-6543"} isPhone />
          <DetailItem label="Date of Birth" value={user?.dob || "June 15, 1994"} />
          <DetailItem label="Gender" value={user?.gender || "Female"} />
          <DetailItem label="Address" value={user?.address || "456 Birch Lane, Ontario"} />
          <DetailItem label="Start Date" value={user?.dayOfJoining || user?.dateOfJoining || user?.startDate || "—"} isLast />
        </View>

        {/* Employment */}
        <View style={styles.detailsBox}>
          <Text style={styles.sectionTitle}>Employment</Text>
          <DetailItem label="Employee ID" value={user?.userId || user?.employeeId || "—"} />
          <DetailItem label="Role" value={user?.role || "—"} />
          <DetailItem
            label="Salary"
            value={user?.salaryPerHour ? `$${Number(user.salaryPerHour).toFixed(2)}/hr` : "—"}
          />
          <DetailItem
            label="KM Rate"
            value={(() => {
              const rate = Number(user?.totalKMs) >= 5000
                ? user?.rateAfter5000km
                : user?.rateBefore5000km;
              return rate ? `$${Number(rate).toFixed(3)}/km` : "—";
            })()}
            isLast
          />
        </View>



        {/* Quick Actions */}
        <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Quick Actions</Text>
        <View style={styles.actionsBox}>
          <ActionItem icon="lock-closed-outline" label="Change Password" onPress={() => handleQuickAction("Change Password")} />
          <ActionItem icon="notifications-outline" label="Notification Preferences" onPress={() => handleQuickAction("Notification Preferences")} />
          <ActionItem icon="shield-checkmark-outline" label="Privacy & Security" isLast onPress={() => handleQuickAction("Privacy & Security")} />
        </View>

        {/* Sign Out */}
        <Pressable onPress={handleLogout} style={styles.signOutBtn}>
          <Ionicons name="log-out-outline" size={20} color={ERROR_RED} />
          <Text style={styles.signOutText}>Sign Out</Text>
        </Pressable>
        
        <Text style={styles.versionText}>Version {Constants.expoConfig?.version || "1.0"}</Text>
      </ScrollView>

      {/* Change Password Modal */}
      <Modal visible={showChangePw} transparent animationType="slide">
        <View style={styles.pwOverlay}>
          <View style={styles.pwSheet}>
            <View style={styles.pwSheetHandle} />
            <Text style={styles.pwTitle}>Change Password</Text>
            <Text style={styles.pwSubtitle}>Enter your current password then choose a new one.</Text>

            {/* Current Password */}
            <Text style={styles.pwLabel}>Current Password</Text>
            <View style={styles.pwInputRow}>
              <TextInput
                style={styles.pwInput}
                placeholder="Enter current password"
                placeholderTextColor="#9CA3AF"
                secureTextEntry={!pwShowCurrent}
                value={pwCurrent}
                onChangeText={setPwCurrent}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Pressable onPress={() => setPwShowCurrent(v => !v)} style={styles.pwEyeBtn}>
                <Ionicons name={pwShowCurrent ? "eye-off-outline" : "eye-outline"} size={20} color={GRAY_TEXT} />
              </Pressable>
            </View>

            {/* New Password */}
            <Text style={styles.pwLabel}>New Password</Text>
            <View style={styles.pwInputRow}>
              <TextInput
                style={styles.pwInput}
                placeholder="Enter new password"
                placeholderTextColor="#9CA3AF"
                secureTextEntry={!pwShowNew}
                value={pwNew}
                onChangeText={setPwNew}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Pressable onPress={() => setPwShowNew(v => !v)} style={styles.pwEyeBtn}>
                <Ionicons name={pwShowNew ? "eye-off-outline" : "eye-outline"} size={20} color={GRAY_TEXT} />
              </Pressable>
            </View>

            {/* Confirm New Password */}
            <Text style={styles.pwLabel}>Confirm New Password</Text>
            <View style={styles.pwInputRow}>
              <TextInput
                style={styles.pwInput}
                placeholder="Repeat new password"
                placeholderTextColor="#9CA3AF"
                secureTextEntry={!pwShowConfirm}
                value={pwConfirm}
                onChangeText={setPwConfirm}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Pressable onPress={() => setPwShowConfirm(v => !v)} style={styles.pwEyeBtn}>
                <Ionicons name={pwShowConfirm ? "eye-off-outline" : "eye-outline"} size={20} color={GRAY_TEXT} />
              </Pressable>
            </View>

            {/* Actions */}
            <Pressable
              onPress={handleChangePassword}
              disabled={pwChanging}
              style={[styles.pwSaveBtn, pwChanging && { opacity: 0.6 }]}
            >
              {pwChanging
                ? <ActivityIndicator color="#FFF" size="small" />
                : <Text style={styles.pwSaveBtnText}>Update Password</Text>
              }
            </Pressable>

            <Pressable
              onPress={() => { setShowChangePw(false); setPwCurrent(""); setPwNew(""); setPwConfirm(""); }}
              style={styles.pwCancelBtn}
            >
              <Text style={styles.pwCancelText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Profile Zoom Modal */}
      <Modal visible={isZoomed} transparent animationType="fade">
        <View style={styles.zoomOverlay}>
          <Pressable style={styles.zoomBackground} onPress={() => setIsZoomed(false)} />
          <View style={styles.zoomContent}>
            <View style={styles.zoomedImageWrapper}>
              <Image 
                source={user?.profilePhotoUrl ? { uri: user.profilePhotoUrl } : require("../assets/defaultuser.jpg")} 
                style={styles.zoomedImage} 
              />
            </View>
            <Pressable onPress={() => setIsZoomed(false)} style={styles.zoomCloseBtn}>
              <Ionicons name="close" size={28} color="#FFF" />
            </Pressable>
          </View>
        </View>
      </Modal>
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
      <Text
        style={[
          styles.detailValue,
          { flexShrink: 1, flexWrap: "wrap", textAlign: "right", maxWidth: "60%" },
          isEmail && { color: PRIMARY_GREEN },
          isPhone && { color: PRIMARY_GREEN },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}



function ActionItem({ icon, label, isLast, onPress }) {
  return (
    <Pressable onPress={onPress} style={[styles.actionItem, isLast && { borderBottomWidth: 0 }]}>
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

  // Zoom Modal
  zoomOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.92)", justifyContent: "center", alignItems: "center" },
  zoomBackground: { ...StyleSheet.absoluteFillObject },
  zoomContent: { width: "90%", alignItems: "center" },
  zoomedImageWrapper: { 
    width: 340, 
    height: 340, 
    borderRadius: 30, 
    overflow: "hidden", 
    borderWidth: 4, 
    borderColor: "rgba(255,255,255,0.15)" 
  },
  zoomedImage: { width: "100%", height: "100%", resizeMode: "cover" },
  zoomCloseBtn: {
    marginTop: 40,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)"
  },

  // Change Password Modal
  pwOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  pwSheet: { backgroundColor: "#FFF", borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 28, paddingBottom: 50 },
  pwSheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: "#E5E7EB", alignSelf: "center", marginBottom: 20 },
  pwTitle: { fontSize: 20, fontWeight: "800", color: DARK_TEXT, fontFamily: "Poppins-Bold", marginBottom: 6 },
  pwSubtitle: { fontSize: 13, color: GRAY_TEXT, fontFamily: "Inter", marginBottom: 24, lineHeight: 20 },
  pwLabel: { fontSize: 13, fontWeight: "600", color: DARK_TEXT, fontFamily: "Inter-SemiBold", marginBottom: 8, marginTop: 4 },
  pwInputRow: { flexDirection: "row", alignItems: "center", borderWidth: 1.5, borderColor: GRAY_BORDER, borderRadius: 14, marginBottom: 16, backgroundColor: PAGE_BG },
  pwInput: { flex: 1, height: 52, paddingHorizontal: 16, fontSize: 15, color: DARK_TEXT, fontFamily: "Inter" },
  pwEyeBtn: { paddingHorizontal: 14, height: 52, alignItems: "center", justifyContent: "center" },
  pwSaveBtn: { height: 56, borderRadius: 16, backgroundColor: PRIMARY_GREEN, alignItems: "center", justifyContent: "center", marginTop: 8 },
  pwSaveBtnText: { fontSize: 16, fontWeight: "700", color: "#FFF", fontFamily: "Inter-Bold" },
  pwCancelBtn: { height: 50, alignItems: "center", justifyContent: "center", marginTop: 8 },
  pwCancelText: { fontSize: 15, fontWeight: "600", color: GRAY_TEXT, fontFamily: "Inter-SemiBold" },
});
