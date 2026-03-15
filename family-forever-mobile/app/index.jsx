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
          // ✅ Route based on role
          const parsed = JSON.parse(storedUser);
          if (parsed.role?.toLowerCase() === "admin") {
            router.replace("/admin/dashboard");
          } else {
            router.replace("/home");
          }
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
