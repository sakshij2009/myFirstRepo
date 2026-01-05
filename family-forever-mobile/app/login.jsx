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
          height: height * 0.42,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Image
          source={require("../assets/logo.png")}
          style={{ width: 110, height: 110, marginBottom: 16 }}
          resizeMode="contain"
        />

        <Text style={{ color: "#fff", fontSize: 22, fontWeight: "600" }}>
          Family Forever
        </Text>

        <Text style={{ color: "#e5e7eb", fontSize: 14, marginTop: 6 }}>
          Welcome to Family Forever Agency
        </Text>

        <Text style={{ color: "#d1d5db", fontSize: 13, marginTop: 4 }}>
          From Humanity to Community
        </Text>
      </View>

      {/* ===== LOGIN CARD ===== */}
      <View
        style={{
          backgroundColor: "#fff",
          marginHorizontal: 20,
          borderRadius: 20,
          padding: 20,
          shadowColor: "#000",
          shadowOpacity: 0.15,
          shadowRadius: 12,
          elevation: 8,
        }}
      >
        <Text style={{ fontSize: 22, fontWeight: "600", marginBottom: 6, textAlign: "center" }}>
          Welcome
        </Text>

        <Text style={{ fontSize: 14, color: "#6b7280", marginBottom: 16,textAlign: "center" }}>
          Sign in with your Family Forever Account.
        </Text>

        {/* Email */}
        <Text style={{ fontSize: 14, fontWeight: "600", marginBottom: 4 }}>
          Email
        </Text>
        <TextInput
          placeholder="Enter your email"
          placeholderTextColor="#9ca3af"
          value={email}
          onChangeText={setEmail}
          style={{
            borderWidth: 1,
            borderColor: "#d1d5db",
            borderRadius: 8,
            padding: 12,
            marginBottom: 14,
          }}
        />

        {/* Password */}
        <Text style={{ fontSize: 14, fontWeight: "600", marginBottom: 4 }}>
          Password
        </Text>
        <View
            style={{
                flexDirection: "row",
                alignItems: "center",
                borderWidth: 1,
                borderColor: "#d1d5db",
                borderRadius: 8,
                paddingHorizontal: 12,
                marginBottom: 12,
            }}
            >
            <TextInput
                placeholder="Enter your password"
                placeholderTextColor="#9ca3af"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                style={{
                flex: 1,
                paddingVertical: 12,
                }}
            />

            <Pressable onPress={() => setShowPassword(!showPassword)}>
                <Ionicons
                name={showPassword ? "eye-off-outline" : "eye-outline"}
                size={20}
                color="#6b7280"
                />
            </Pressable>
            </View>


        {error ? (
          <Text style={{ color: "red", marginBottom: 8 }}>{error}</Text>
        ) : null}

        <Pressable
          onPress={handleLogin}
          style={{
            backgroundColor: "#1f5f3b",
            paddingVertical: 14,
            borderRadius: 8,
            marginTop: 6,
          }}
        >
          <Text style={{ color: "#fff", textAlign: "center", fontSize: 16 }}>
            Log In
          </Text>
        </Pressable>

        {/* OR Divider */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginVertical: 14,
          }}
        >
          <View style={{ flex: 1, height: 1, backgroundColor: "#d1d5db" }} />
          <Text style={{ marginHorizontal: 10, color: "#6b7280", fontSize: 12 }}>
            OR
          </Text>
          <View style={{ flex: 1, height: 1, backgroundColor: "#d1d5db" }} />
        </View>

        <Text style={{ textAlign: "center", fontSize: 13, color: "#6b7280" }}>
          Don’t have an account? Contact{" "}
          <Text style={{ color: "#1f5f3b", fontWeight: "600" }}>
            familyforever@gmail.com
          </Text>
        </Text>
      </View>

      {/* ===== FOOTER TEXT ===== */}
      <Text
        style={{
          position: "absolute",
          bottom: 16,
          alignSelf: "center",
          color: "#d1d5db",
          fontSize: 12,
        }}
      >
        From Humanity to Community
      </Text>
    </View>
  );
}
