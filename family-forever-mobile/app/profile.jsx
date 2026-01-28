import { View, Text, Pressable, Image, ScrollView, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { db } from "../src/firebase/config";
import * as ImagePicker from "expo-image-picker";
import { uploadProfilePhoto } from "../src/utils/uploadProfilePhoto";

export default function Profile() {
  const router = useRouter();
  const [user, setUser] = useState(null);

  /* ===== LOAD LOGGED IN USER FROM FIRESTORE ===== */
  useEffect(() => {
    let unsubscribe;

    const loadUser = async () => {
      const stored = await AsyncStorage.getItem("user");
      if (!stored) return;

      const parsed = JSON.parse(stored);

      const userRef = doc(db, "users", parsed.username);
      unsubscribe = onSnapshot(userRef, (snap) => {
        if (snap.exists()) setUser({ username: parsed.username, ...snap.data() });
      });
    };

    loadUser();
    return () => unsubscribe && unsubscribe();
  }, []);

  /* ===== CHANGE PROFILE PHOTO ===== */
  const handleChangePhoto = async () => {
    Alert.alert("Change Profile Photo", "Choose an option", [
      { text: "Camera", onPress: openCamera },
      { text: "Gallery", onPress: openGallery },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const openCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission required", "Camera access is needed to take a photo.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.7,
    });

    if (!result.canceled) await savePhoto(result.assets[0].uri);
  };

  const openGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission required", "Photo library access is needed to select an image.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      quality: 0.7,
    });

    if (!result.canceled) await savePhoto(result.assets[0].uri);
  };

  const savePhoto = async (uri) => {
    if (!user) return;

    const downloadURL = await uploadProfilePhoto(uri, user.username);
    await updateDoc(doc(db, "users", user.username), {
      profilePhotoUrl: downloadURL,
    });
  };

  /* ===== LOGOUT ===== */
  const handleLogout = () => {
    Alert.alert("Confirm Logout", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log Out",
        style: "destructive",
        onPress: async () => {
          await AsyncStorage.removeItem("user");
          router.replace("/");
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f6f7f8" }}>
      <ScrollView contentContainerStyle={styles.page}>
        {/* ===== TOP BAR (logo left, icons right) ===== */}
        <View style={styles.topBar}>
          <Image source={require("../assets/logo.png")} style={styles.topLogo} />

          <View style={styles.topRight}>
            <Pressable style={styles.iconCircle} onPress={() => Alert.alert("Notifications")}>
              <MaterialCommunityIcons name="bell-outline" size={18} color="#fff" />
            </Pressable>

            <Pressable onPress={handleChangePhoto} style={styles.avatarTinyWrap}>
              <Image
                source={
                  user?.profilePhotoUrl
                    ? { uri: user.profilePhotoUrl }
                    : require("../assets/defaultuser.jpg")
                }
                style={styles.avatarTiny}
              />
            </Pressable>
          </View>
        </View>

        {/* ===== HEADER ROW (back + centered title like SS) ===== */}
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} hitSlop={10} style={styles.backBtn}>
            <MaterialCommunityIcons name="chevron-left" size={28} color="#111827" />
          </Pressable>

          <Text style={styles.headerTitle}>Profile Menu</Text>

          {/* spacer to keep title centered */}
          <View style={{ width: 40 }} />
        </View>

        {/* ===== PROFILE CENTER ===== */}
        <View style={styles.profileCenter}>
          <View style={styles.avatarBigWrap}>
            <Image
              source={
                user?.profilePhotoUrl
                  ? { uri: user.profilePhotoUrl }
                  : require("../assets/defaultuser.jpg")
              }
              style={styles.avatarBig}
            />
          </View>

          <Text style={styles.name}>{user?.name || "User"}</Text>

          {/* NOTE: your employee card uses `designation`, so show that here too */}
          <Text style={styles.roleChip}>
            {user?.designation || user?.role || ""}
          </Text>
        </View>

        {/* ===== MENU LIST (separate cards like SS) ===== */}
        <View style={styles.list}>
          <MenuRow
            title="View my Card"
            subtitle="View your employee ID card"
            icon="card-account-details-outline"
            iconBg="#E8F2EC"
            iconColor="#1f5f3b"
            onPress={() => router.push("/employee-card")}
          />

          <MenuRow
            title="Settings"
            subtitle="Manage your profile images"
            icon="cog-outline"
            iconBg="#EAF3FF"
            iconColor="#2563eb"
            onPress={handleChangePhoto}
          />

          {/* <MenuRow
            title="Report an Issue"
            subtitle="Let us know about any problems"
            icon="bell-outline"
            iconBg="#FFF4E6"
            iconColor="#f59e0b"
            onPress={() => Alert.alert("Report an Issue", "Add your report screen here.")}
          /> */}

          <MenuRow
            title="Log Out"
            subtitle="Sign out of your account"
            icon="logout"
            iconBg="#FFE8E8"
            iconColor="#dc2626"
            danger
            onPress={handleLogout}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/* ===== MENU ROW COMPONENT (matches screenshot style) ===== */
function MenuRow({
  title,
  subtitle,
  icon,
  iconBg,
  iconColor,
  onPress,
  danger = false,
}) {
  return (
    <Pressable onPress={onPress} style={styles.menuCard} android_ripple={{ color: "#e5e7eb" }}>
      <View style={styles.menuLeft}>
        <View style={[styles.menuIconWrap, { backgroundColor: iconBg }]}>
          <MaterialCommunityIcons name={icon} size={20} color={iconColor} />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={[styles.menuTitle, danger && { color: "#dc2626" }]}>{title}</Text>
          <Text style={styles.menuSubtitle}>{subtitle}</Text>
        </View>
      </View>

      <MaterialCommunityIcons name="chevron-right" size={24} color="#9ca3af" />
    </Pressable>
  );
}

/* ================= STYLES ================= */

const styles = {
  page: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },

  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 8,
    paddingBottom: 6,
  },

  topLogo: {
    width: 46,
    height: 46,
    resizeMode: "contain",
  },

  topRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#0B3B2A",
    alignItems: "center",
    justifyContent: "center",
    elevation: 3,
  },

  avatarTinyWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: "hidden",
    elevation: 3,
    backgroundColor: "#fff",
  },

  avatarTiny: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 6,
    marginBottom: 10,
  },

  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },

  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
  },

  profileCenter: {
    alignItems: "center",
    paddingVertical: 18,
  },

  avatarBigWrap: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
  },

  avatarBig: {
    width: 84,
    height: 84,
    borderRadius: 42,
  },

  name: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
    marginTop: 12,
  },

  roleChip: {
    marginTop: 6,
    fontSize: 12.5,
    color: "#6b7280",
    fontWeight: "700",
  },

  list: {
    marginTop: 6,
    gap: 12,
  },

  menuCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    elevation: 2,
  },

  menuLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
    paddingRight: 10,
  },

  menuIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },

  menuTitle: {
    fontSize: 14.5,
    fontWeight: "800",
    color: "#111827",
  },

  menuSubtitle: {
    marginTop: 3,
    fontSize: 11.5,
    color: "#9ca3af",
    fontWeight: "600",
  },
};
