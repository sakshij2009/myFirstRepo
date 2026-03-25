import { View, Text, TextInput, Pressable, Image, Dimensions } from "react-native";
import { useState } from "react";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../src/firebase/config";
import { Ionicons } from "@expo/vector-icons";

const { height } = Dimensions.get("window");

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const handleLogin = async () => {
    setError("");

    if (!email || !password) {
      setError("Please enter email and password");
      return;
    }

    try {
      const q = query(
        collection(db, "users"),
        where("email", "==", email),
        where("password", "==", password)
      );

      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const userData = snapshot.docs[0].data();
        await AsyncStorage.setItem("user", JSON.stringify(userData));
        router.replace("/home");
      } else {
        setError("Invalid email or password");
      }
    } catch {
      setError("Something went wrong");
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#1f5f3b" }}>

      {/* ===== TOP BRANDING ===== */}
      <View
        style={{
          height: height * 0.38,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Image
          source={require("../assets/logo.png")}
          style={{ width: 110, height: 110, marginBottom: 16 }}
          resizeMode="contain"
        />

        <Text style={{ color: "#fff", fontSize: 26, fontWeight: "700" }}>
          Family Forever
        </Text>

        <Text style={{ color: "#c6ddd0", fontSize: 13, marginTop: 6, textAlign: "center", paddingHorizontal: 40 }}>
          Caring for every family, every step of the way.
        </Text>
      </View>

      {/* ===== LOGIN CARD ===== */}
      <View
        style={{
          backgroundColor: "#fff",
          marginHorizontal: 20,
          borderRadius: 20,
          padding: 24,
          shadowColor: "#000",
          shadowOpacity: 0.15,
          shadowRadius: 12,
          elevation: 8,
        }}
      >
        {/* Staff Portal label */}
        <Text style={{ fontSize: 11, fontWeight: "700", color: "#1f5f3b", letterSpacing: 1.2, marginBottom: 6 }}>
          STAFF PORTAL
        </Text>

        <Text style={{ fontSize: 24, fontWeight: "700", marginBottom: 4 }}>
          Welcome back
        </Text>

        <Text style={{ fontSize: 14, color: "#6b7280", marginBottom: 20 }}>
          Sign in to manage your shifts
        </Text>

        {/* Email */}
        <Text style={{ fontSize: 13, fontWeight: "600", marginBottom: 6, color: "#374151" }}>
          Email Address
        </Text>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            borderWidth: 1,
            borderColor: "#d1d5db",
            borderRadius: 10,
            paddingHorizontal: 12,
            marginBottom: 16,
            backgroundColor: "#fafafa",
          }}
        >
          <Ionicons name="mail-outline" size={18} color="#9ca3af" style={{ marginRight: 8 }} />
          <TextInput
            placeholder="you@familyforever.com"
            placeholderTextColor="#9ca3af"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            style={{ flex: 1, paddingVertical: 13, fontSize: 14 }}
          />
        </View>

        {/* Password */}
        <Text style={{ fontSize: 13, fontWeight: "600", marginBottom: 6, color: "#374151" }}>
          Password
        </Text>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            borderWidth: 1,
            borderColor: "#d1d5db",
            borderRadius: 10,
            paddingHorizontal: 12,
            marginBottom: 14,
            backgroundColor: "#fafafa",
          }}
        >
          <Ionicons name="lock-closed-outline" size={18} color="#9ca3af" style={{ marginRight: 8 }} />
          <TextInput
            placeholder="Enter your password"
            placeholderTextColor="#9ca3af"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            style={{ flex: 1, paddingVertical: 13, fontSize: 14 }}
          />
          <Pressable onPress={() => setShowPassword(!showPassword)}>
            <Ionicons
              name={showPassword ? "eye-off-outline" : "eye-outline"}
              size={20}
              color="#6b7280"
            />
          </Pressable>
        </View>

        {/* Remember me + Forgot password */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <Pressable
            onPress={() => setRememberMe(!rememberMe)}
            style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
          >
            <View
              style={{
                width: 18,
                height: 18,
                borderRadius: 4,
                borderWidth: 1.5,
                borderColor: rememberMe ? "#1f5f3b" : "#d1d5db",
                backgroundColor: rememberMe ? "#1f5f3b" : "#fff",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              {rememberMe && <Ionicons name="checkmark" size={12} color="#fff" />}
            </View>
            <Text style={{ fontSize: 13, color: "#6b7280" }}>Remember me</Text>
          </Pressable>

          <Pressable>
            <Text style={{ fontSize: 13, color: "#1f5f3b", fontWeight: "600" }}>
              Forgot password?
            </Text>
          </Pressable>
        </View>

        {error ? (
          <Text style={{ color: "#ef4444", marginBottom: 10, fontSize: 13 }}>{error}</Text>
        ) : null}

        <Pressable
          onPress={handleLogin}
          style={{
            backgroundColor: "#1f5f3b",
            paddingVertical: 15,
            borderRadius: 10,
          }}
        >
          <Text style={{ color: "#fff", textAlign: "center", fontSize: 16, fontWeight: "600" }}>
            Sign In
          </Text>
        </Pressable>

        <Text style={{ textAlign: "center", fontSize: 13, color: "#9ca3af", marginTop: 20 }}>
          Don't have an account?{" "}
          <Text style={{ color: "#1f5f3b", fontWeight: "600" }}>
            Contact your administrator.
          </Text>
        </Text>
      </View>
    </View>
  );
}
