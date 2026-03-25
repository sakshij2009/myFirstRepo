import {
  View,
  Text,
  Pressable,
  Image,
  ScrollView,
  Alert,
  SafeAreaView,
  StyleSheet,
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

  useEffect(() => {
    let unsub;
    const load = async () => {
      const stored = await AsyncStorage.getItem("user");
      if (!stored) return;
      const parsed = JSON.parse(stored);
      const ref = doc(db, "users", parsed.username);
      unsub = onSnapshot(ref, (snap) => {
        if (snap.exists()) setUser({ username: parsed.username, ...snap.data() });
      });
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
    const url = await uploadProfilePhoto(uri, user.username);
    await updateDoc(doc(db, "users", user.username), { profilePhotoUrl: url });
  };

  const handleLogout = () => {
    Alert.alert("Confirm Logout", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await AsyncStorage.removeItem("user");
          router.replace("/");
        },
      },
    ]);
  };

  const initials = user?.name
    ? user.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F9FAFB" }} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

        {/* HEADER */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { fontFamily: 'Poppins' }]}>Profile</Text>
          <Pressable style={styles.headerIcon}>
            <Ionicons name="settings-outline" size={22} color="#1A1A1A" />
          </Pressable>
        </View>

        {/* PROFILE MAIN CARD */}
        <View style={styles.profileCard}>
          <Pressable onPress={handleChangePhoto} style={styles.avatarWrapper}>
            {user?.profilePhotoUrl ? (
              <Image source={{ uri: user.profilePhotoUrl }} style={styles.avatarImg} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
            )}
            <View style={styles.cameraBadge}>
              <Ionicons name="camera" size={12} color="#fff" />
            </View>
          </Pressable>

          <Text style={styles.userName}>{user?.name || "Staff Member"}</Text>
          <Text style={styles.userRole}>{user?.designation || "Staff Consultant"}</Text>
          
          <View style={styles.idBadge}>
            <Text style={styles.idBadgeText}>CYIM: {user?.userId || "1432569"}</Text>
          </View>

          <View style={styles.statsRow}>
            {[
              { val: "148", lab: "Total Shifts" },
              { val: "592", lab: "Hours Logged" },
              { val: "4.9★", lab: "Rating" },
              { val: "2 yrs", lab: "Tenure" },
            ].map((s, i) => (
              <View key={i} style={styles.statCol}>
                <Text style={styles.statVal}>{s.val}</Text>
                <Text style={styles.statLab}>{s.lab}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* STAFF ID SECTION */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Staff ID Card</Text>
            <Pressable onPress={() => router.push("/_employee-card")}>
              <Text style={styles.sectionLink}>View Full Card &gt;</Text>
            </Pressable>
          </View>

          <View style={styles.idCardPreview}>
             <View style={styles.idCardHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="people-circle" size={16} color="#FFF" />
                  <Text style={styles.idCardLogo}>Family Forever Inc.</Text>
                </View>
                <Text style={styles.idCardTagText}>Employee ID 27</Text>
             </View>
             <View style={styles.idCardBody}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <Image source={{ uri: user?.profilePhotoUrl || 'https://via.placeholder.com/100' }} style={styles.idCardThumb} />
                  <View>
                    <Text style={styles.idCardName}>{user?.name}</Text>
                    <Text style={styles.idCardRole}>{user?.designation || 'Staff Intake Worker'}</Text>
                  </View>
                </View>
                <MaterialCommunityIcons name="qrcode" size={32} color="#1A1A1A" />
             </View>
          </View>
          <Text style={styles.idFooter}>Tap to show full card for parent verification</Text>
        </View>

        {/* MENU */}
        <View style={styles.menuContainer}>
           <MenuItem icon="calendar-check-outline" title="My Availability" sub="Manage shift preferences" onPress={() => router.push("/_Availability")} />
           <MenuItem icon="help-circle-outline" title="Support Center" sub="FAQs & Contact Admin" onPress={() => Alert.alert("Support", "Contact support@familyforever.org")} />
           <MenuItem icon="logout" title="Sign Out" sub="Securely exit your account" danger onPress={handleLogout} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function MenuItem({ icon, title, sub, onPress, danger }) {
  return (
    <Pressable onPress={onPress} style={styles.menuItem}>
      <View style={[styles.menuIconCircle, { backgroundColor: danger ? '#FEF2F2' : SECONDARY }]}>
        <MaterialCommunityIcons name={icon} size={22} color={danger ? '#DC2626' : PRIMARY} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.menuTitle, danger && { color: '#DC2626' }]}>{title}</Text>
        <Text style={styles.menuSub}>{sub}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#D1D5DB" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { padding: 25, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#1A1A1A' },
  headerIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
  profileCard: { backgroundColor: '#FFF', marginHorizontal: 20, borderRadius: 24, padding: 25, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.05, shadowRadius: 20 },
  avatarWrapper: { position: 'relative', marginBottom: 15 },
  avatarImg: { width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: '#F0FDF4' },
  avatarPlaceholder: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#F0FDF4', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#FFF' },
  avatarText: { fontSize: 32, fontWeight: '800', color: '#1F6F43' },
  cameraBadge: { position: 'absolute', bottom: 5, right: 5, width: 28, height: 28, borderRadius: 14, backgroundColor: '#1F6F43', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#FFF' },
  userName: { fontSize: 20, fontWeight: '800', color: '#1A1A1A', fontFamily: 'Poppins' },
  userRole: { fontSize: 13, color: '#9CA3AF', fontWeight: '500', marginBottom: 12, fontFamily: 'Inter' },
  idBadge: { backgroundColor: '#F3F4F6', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12, marginBottom: 20 },
  idBadgeText: { fontSize: 12, fontWeight: '600', color: '#6B7280', fontFamily: 'Inter' },
  statsRow: { flexDirection: 'row', width: '100%', borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 20 },
  statCol: { flex: 1, alignItems: 'center' },
  statVal: { fontSize: 17, fontWeight: '800', color: '#111827' },
  statLab: { fontSize: 11, color: '#9CA3AF', fontWeight: '600', marginTop: 2 },
  sectionContainer: { marginTop: 30, paddingHorizontal: 20 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A1A', fontFamily: 'Poppins' },
  sectionLink: { fontSize: 13, fontWeight: '600', color: '#1F6F43' },
  idCardPreview: { backgroundColor: '#FFF', borderRadius: 16, overflow: 'hidden', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1 },
  idCardHeader: { backgroundColor: '#0E3D20', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 10 },
  idCardLogo: { color: '#FFF', fontSize: 12, fontWeight: '700', fontFamily: 'Inter' },
  idCardTagText: { color: '#FFF', fontSize: 11, fontWeight: '500' },
  idCardBody: { backgroundColor: '#F3F4F6', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15 },
  idCardThumb: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: '#FFF' },
  idCardName: { color: '#1A1A1A', fontSize: 15, fontWeight: '700', fontFamily: 'Poppins' },
  idCardRole: { color: '#6B7280', fontSize: 12, fontFamily: 'Inter' },
  idFooter: { textAlign: 'center', fontSize: 11, color: '#9CA3AF', marginTop: 12, fontFamily: 'Inter' },
  menuContainer: { marginTop: 20, paddingHorizontal: 20, gap: 12 },
  menuItem: { backgroundColor: '#FFF', padding: 15, borderRadius: 18, flexDirection: 'row', alignItems: 'center', gap: 15, borderWidth: 1, borderColor: '#F3F4F6' },
  menuIconCircle: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  menuTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  menuSub: { fontSize: 12, color: '#9CA3AF', marginTop: 1 },
});
