import {
  View,
  Text,
  Pressable,
  Image,
  ScrollView,
  Alert,
  SafeAreaView,
} from "react-native";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { db } from "../src/firebase/config";
import * as ImagePicker from "expo-image-picker";
import { uploadProfilePhoto } from "../src/utils/uploadProfilePhoto";

const GREEN = "#1f5f3b";

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
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f9fafb" }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

        {/* ── HEADER ── */}
        <View style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingVertical: 14,
          backgroundColor: "#fff",
          borderBottomWidth: 1,
          borderBottomColor: "#e5e7eb",
        }}>
          <Text style={{ fontSize: 20, fontWeight: "700", color: "#111827" }}>
            Profile
          </Text>
          <Pressable style={{
            width: 40, height: 40, borderRadius: 20,
            backgroundColor: "#f3f4f6",
            alignItems: "center", justifyContent: "center",
          }}>
            <MaterialCommunityIcons name="cog-outline" size={20} color="#374151" />
          </Pressable>
        </View>

        {/* ── PROFILE CARD ── */}
        <View style={{
          backgroundColor: "#fff",
          marginHorizontal: 16,
          marginTop: 16,
          borderRadius: 16,
          padding: 24,
          alignItems: "center",
          borderWidth: 1,
          borderColor: "#e5e7eb",
        }}>
          {/* Avatar */}
          <Pressable onPress={handleChangePhoto} style={{ position: "relative", marginBottom: 12 }}>
            {user?.profilePhotoUrl ? (
              <Image
                source={{ uri: user.profilePhotoUrl }}
                style={{ width: 80, height: 80, borderRadius: 40, borderWidth: 3, borderColor: "#fff" }}
              />
            ) : (
              <View style={{
                width: 80, height: 80, borderRadius: 40,
                backgroundColor: "#dbeafe",
                alignItems: "center", justifyContent: "center",
                borderWidth: 3, borderColor: "#fff",
              }}>
                <Text style={{ fontSize: 24, fontWeight: "800", color: "#1d4ed8" }}>
                  {initials}
                </Text>
              </View>
            )}
            <View style={{
              position: "absolute", bottom: 0, right: 0,
              width: 24, height: 24, borderRadius: 12,
              backgroundColor: GREEN,
              alignItems: "center", justifyContent: "center",
              borderWidth: 2, borderColor: "#fff",
            }}>
              <Ionicons name="camera" size={12} color="#fff" />
            </View>
          </Pressable>

          <Text style={{ fontSize: 18, fontWeight: "700", color: "#111827", marginTop: 8 }}>
            {user?.name || "Staff Member"}
          </Text>
          <Text style={{ fontSize: 13, color: "#9ca3af", marginTop: 2 }}>
            {user?.designation || "Staff • Role"}
          </Text>
          <Text style={{ fontSize: 13, color: "#9ca3af" }}>
            Family Forever Inc.
          </Text>

          {/* Badges row */}
          <View style={{ flexDirection: "row", gap: 10, marginTop: 12, alignItems: "center" }}>
            <View style={{
              backgroundColor: "#f3f4f6",
              paddingHorizontal: 12, paddingVertical: 6,
              borderRadius: 8,
            }}>
              <Text style={{ fontSize: 12, fontWeight: "700", color: "#374151" }}>
                CYIM: {user?.userId || "1432569"}
              </Text>
            </View>
            <View style={{
              backgroundColor: "#d1fae5",
              paddingHorizontal: 10, paddingVertical: 5,
              borderRadius: 6,
            }}>
              <Text style={{ fontSize: 12, fontWeight: "700", color: GREEN }}>
                Active
              </Text>
            </View>
          </View>

          {/* Stats row */}
          <View style={{
            flexDirection: "row",
            gap: 10,
            marginTop: 16,
            paddingTop: 16,
            borderTopWidth: 1,
            borderTopColor: "#e5e7eb",
            width: "100%",
          }}>
            {[
              { value: "148", label: "Total Shifts" },
              { value: "592", label: "Hours Logged" },
              { value: "4.9★", label: "Rating" },
              { value: "2 yrs", label: "Tenure" },
            ].map((stat, idx) => (
              <View key={idx} style={{ flex: 1, alignItems: "center" }}>
                <Text style={{ fontSize: 16, fontWeight: "800", color: "#111827" }}>
                  {stat.value}
                </Text>
                <Text style={{ fontSize: 11, color: "#9ca3af", marginTop: 4, textAlign: "center" }}>
                  {stat.label}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── STAFF ID CARD ── */}
        <View style={{ paddingHorizontal: 16, marginTop: 20 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <Text style={{ fontSize: 15, fontWeight: "700", color: "#111827" }}>
              Staff ID Card
            </Text>
            <Pressable onPress={() => router.push("/employee-card")}>
              <Text style={{ fontSize: 13, color: GREEN, fontWeight: "600" }}>
                View Full Card →
              </Text>
            </Pressable>
          </View>

          {/* Green card preview */}
          <View style={{
            backgroundColor: GREEN,
            borderRadius: 14,
            padding: 14,
            marginBottom: 8,
          }}>
            {/* Card header */}
            <View style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 12,
            }}>
              <View>
                <Text style={{ fontSize: 13, fontWeight: "700", color: "#fff" }}>
                  Family Forever Inc.
                </Text>
              </View>
              <View style={{
                backgroundColor: "rgba(255,255,255,0.2)",
                paddingHorizontal: 8, paddingVertical: 4,
                borderRadius: 6,
              }}>
                <Text style={{ fontSize: 11, fontWeight: "700", color: "#fff" }}>
                  Employee ID 27
                </Text>
              </View>
            </View>

            {/* Card body */}
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                {user?.profilePhotoUrl ? (
                  <Image
                    source={{ uri: user.profilePhotoUrl }}
                    style={{ width: 48, height: 48, borderRadius: 24 }}
                  />
                ) : (
                  <View style={{
                    width: 48, height: 48, borderRadius: 24,
                    backgroundColor: "rgba(255,255,255,0.2)",
                    alignItems: "center", justifyContent: "center",
                  }}>
                    <Text style={{ fontSize: 14, fontWeight: "700", color: "#fff" }}>
                      {initials}
                    </Text>
                  </View>
                )}
                <View>
                  <Text style={{ fontSize: 13, fontWeight: "700", color: "#fff" }}>
                    {user?.name || "Staff Member"}
                  </Text>
                  <Text style={{ fontSize: 11, color: "rgba(255,255,255,0.8)", marginTop: 2 }}>
                    {user?.designation || "Role"}
                  </Text>
                </View>
              </View>
              {/* QR code placeholder */}
              <View style={{
                width: 44, height: 44,
                backgroundColor: "#fff",
                borderRadius: 6,
                alignItems: "center", justifyContent: "center",
              }}>
                <MaterialCommunityIcons name="qrcode" size={28} color={GREEN} />
              </View>
            </View>
          </View>

          <Text style={{ fontSize: 11, color: "#9ca3af", textAlign: "center", fontStyle: "italic" }}>
            Tap to show full card for parent verification
          </Text>
        </View>

        {/* ── PERSONAL DETAILS ── */}
        <View style={{ paddingHorizontal: 16, marginTop: 20, marginBottom: 12 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ fontSize: 15, fontWeight: "700", color: "#111827" }}>
              Personal Details
            </Text>
            <Pressable>
              <Text style={{ fontSize: 13, color: GREEN, fontWeight: "600" }}>
                Edit →
              </Text>
            </Pressable>
          </View>
        </View>

        {/* ── MENU ITEMS ── */}
        <View style={{ paddingHorizontal: 16, gap: 10 }}>
          <MenuItem
            icon="calendar-check-outline"
            title="Set Availability"
            onPress={() => router.push("/Availability")}
          />

          <MenuItem
            icon="help-circle-outline"
            title="Help & Support"
            onPress={() => Alert.alert("Help", "Contact familyforever@gmail.com")}
          />

          <MenuItem
            icon="logout"
            title="Sign Out"
            danger
            onPress={handleLogout}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function MenuItem({ icon, title, onPress, danger = false }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        backgroundColor: "#fff",
        borderRadius: 12,
        paddingVertical: 13,
        paddingHorizontal: 14,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        borderWidth: 1,
        borderColor: "#e5e7eb",
      }}
    >
      <MaterialCommunityIcons
        name={icon}
        size={20}
        color={danger ? "#dc2626" : GREEN}
      />
      <Text style={{
        fontSize: 14, fontWeight: "600",
        color: danger ? "#dc2626" : "#111827",
        flex: 1,
      }}>
        {title}
      </Text>
      <MaterialCommunityIcons name="chevron-right" size={20} color="#d1d5db" />
    </Pressable>
  );
}
