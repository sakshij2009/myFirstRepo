import { View, Text, TextInput, Pressable, Image, Dimensions, KeyboardAvoidingView, ScrollView, Platform } from "react-native";
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
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"} 
      style={{ flex: 1, backgroundColor: "#0E3D20" }}
    >
      <ScrollView 
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }} 
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ===== TOP BRANDING ===== */}
        <View
          style={{
            height: height * 0.35,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Image
            source={require("../assets/logo.png")}
            style={{ width: 100, height: 100, marginBottom: 12 }}
            resizeMode="contain"
          />

          <Text style={{ color: "#fff", fontSize: 24, fontWeight: "700" }}>
            Family Forever
          </Text>

          <Text style={{ color: "#c6ddd0", fontSize: 13, marginTop: 6, textAlign: "center", paddingHorizontal: 40 }}>
            Caring for every family, every step of the way.
          </Text>
        </View>

        {/* ===== LOGIN CARD ===== */}
        <View
          style={{
            flex: 1,
            backgroundColor: "#fff",
            borderTopLeftRadius: 40,
            borderTopRightRadius: 40,
            padding: 32,
            marginTop: -20,
            paddingBottom: 60,
          }}
        >
          {/* Staff Portal label */}
          <Text style={{ fontSize: 11, fontWeight: "700", color: "#1F6F43", letterSpacing: 1.2, marginBottom: 8, fontFamily: "Inter" }}>
            STAFF PORTAL
          </Text>
          
          <Text style={{ fontSize: 28, fontWeight: "700", marginBottom: 2, color: "#1A1A1A", fontFamily: "Poppins" }}>
            Welcome back
          </Text>

          <Text style={{ fontSize: 14, color: "#6B7280", marginBottom: 32, fontFamily: "Inter" }}>
            Sign in to manage your shifts
          </Text>

          {/* Email */}
          <Text style={{ fontSize: 12.5, fontWeight: "600", marginBottom: 8, color: "#374151" }}>
            Email Address
          </Text>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              borderRadius: 12,
              paddingHorizontal: 16,
              marginBottom: error ? 12 : 24,
              backgroundColor: "#F3F4F6",
              height: 56,
            }}
          >
            <Ionicons name="mail-outline" size={20} color="#9CA3AF" style={{ marginRight: 12 }} />
            <TextInput
              placeholder="you@familyforever.com"
              placeholderTextColor="#9CA3AF"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              style={{ flex: 1, height: "100%", fontSize: 15, color: "#1A1A1A", fontFamily: "Inter" }}
            />
          </View>

          {/* Password */}
          <Text style={{ fontSize: 12.5, fontWeight: "600", marginBottom: 8, color: "#374151" }}>
            Password
          </Text>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              borderRadius: 12,
              paddingHorizontal: 16,
              marginBottom: error ? 12 : 24,
              backgroundColor: "#F3F4F6",
              height: 56,
            }}
          >
            <Ionicons name="lock-closed-outline" size={20} color="#9CA3AF" style={{ marginRight: 12 }} />
            <TextInput
              placeholder="Enter your password"
              placeholderTextColor="#9CA3AF"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              style={{ flex: 1, height: "100%", fontSize: 15, color: "#1A1A1A", fontFamily: "Inter" }}
            />
            <Pressable onPress={() => setShowPassword(!showPassword)}>
              <Ionicons
                name={showPassword ? "eye-off-outline" : "eye-outline"}
                size={20}
                color="#9CA3AF"
              />
            </Pressable>
          </View>

          {/* Remember me + Forgot password */}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 32 }}>
            <Pressable
              onPress={() => setRememberMe(!rememberMe)}
              style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
            >
              <View
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 6,
                  borderWidth: 1.5,
                  borderColor: rememberMe ? "#1F6F43" : "#D1D5DB",
                  backgroundColor: rememberMe ? "#1F6F43" : "transparent",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                {rememberMe && <Ionicons name="checkmark" size={14} color="#fff" />}
              </View>
              <Text style={{ fontSize: 14, color: "#4B5563", fontFamily: "Inter" }}>Remember me</Text>
            </Pressable>

            <Pressable>
              <Text style={{ fontSize: 14, color: "#1F6F43", fontWeight: "600", fontFamily: "Inter" }}>
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
              backgroundColor: "#1F6F43",
              height: 54,
              borderRadius: 16,
              alignItems: "center",
              justifyContent: "center",
              shadowColor: "#1F6F43",
              shadowOpacity: 0.3,
              shadowRadius: 10,
              shadowOffset: { width: 0, height: 4 },
              elevation: 4,
            }}
          >
            <Text style={{ color: "#fff", textAlign: "center", fontSize: 16, fontWeight: "700" }}>
              Sign In
            </Text>
          </Pressable>

          <Text style={{ textAlign: "center", fontSize: 13, color: "#9CA3AF", marginTop: 24 }}>
            Don't have an account?{" "}
            <Text style={{ color: "#1F6F43", fontWeight: "700" }}>
              Contact your administrator.
            </Text>
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
