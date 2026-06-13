import { View, ActivityIndicator } from "react-native";
import { useEffect } from "react";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    const checkLogin = async () => {
      try {
        const storedUser = await AsyncStorage.getItem("user");

        if (storedUser) {
          // ✅ User already logged in — route by role
          let isAdmin = false;
          try {
            const u = JSON.parse(storedUser);
            const r = u?.role?.toLowerCase();
            isAdmin = r === "admin" || r === "owner";
          } catch { /* fall back to staff home */ }
          router.replace(isAdmin ? "/admin/dashboard" : "/home");
        } else {
          // ❌ No user found
          router.replace("/login");
        }
      } catch (err) {
        console.log("Auto-login error:", err);
        router.replace("/login");
      }
    };

    checkLogin();
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <ActivityIndicator size="large" />
    </View>
  );
}
