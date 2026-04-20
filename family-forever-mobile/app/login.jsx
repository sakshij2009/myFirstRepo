import { View, Text, TextInput, Pressable, Image, Dimensions, KeyboardAvoidingView, ScrollView, Platform, StyleSheet, Animated } from "react-native";
import { useState, useEffect, useRef } from "react";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../src/firebase/config";
import { Ionicons } from "@expo/vector-icons";

const { height, width } = Dimensions.get("window");
const PRIMARY_GREEN = "#1F6F43";
const DARK_GREEN_TOP = "#0E3D20";
const DARK_GREEN_BOTTOM = "#0B2E18";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Animation values
  const brandOpacity = useRef(new Animated.Value(0)).current;
  const brandTranslateY = useRef(new Animated.Value(-24)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const cardTranslateY = useRef(new Animated.Value(32)).current;
  const badgesOpacity = useRef(new Animated.Value(0)).current;
  const badgesTranslateY = useRef(new Animated.Value(16)).current;

  // New drift animations (Prompt 1, line 68)
  const orb1Drift = useRef(new Animated.Value(0)).current;
  const orb2Drift = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    // Brand animation
    Animated.parallel([
      Animated.timing(brandOpacity, {
        toValue: 1,
        duration: 900,
        useNativeDriver: true,
      }),
      Animated.timing(brandTranslateY, {
        toValue: 0,
        duration: 900,
        useNativeDriver: true,
        easing: require("react-native").Easing.out(require("react-native").Easing.cubic),
      }),
    ]).start();

    // Card animation (0.12s delay)
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(cardOpacity, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(cardTranslateY, {
          toValue: 0,
          duration: 900,
          useNativeDriver: true,
          easing: require("react-native").Easing.out(require("react-native").Easing.cubic),
        }),
      ]).start();
    }, 120);

    // Badges animation (0.3s delay)
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(badgesOpacity, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(badgesTranslateY, {
          toValue: 0,
          duration: 900,
          useNativeDriver: true,
        }),
      ]).start();
    }, 300);

    // Drift loops (Prompt 1, line 68)
    Animated.loop(
      Animated.sequence([
        Animated.timing(orb1Drift, { toValue: 20, duration: 11000, useNativeDriver: true }),
        Animated.timing(orb1Drift, { toValue: 0, duration: 11000, useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(orb2Drift, { toValue: -20, duration: 14000, useNativeDriver: true }),
        Animated.timing(orb2Drift, { toValue: 0, duration: 14000, useNativeDriver: true }),
      ])
    ).start();

    // Logo pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.5, duration: 2000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const handleLogin = async () => {
    setError("");
    if (!email || !password) {
      setError("Please enter email and password");
      return;
    }

    setLoading(true);
    try {
      const q = query(
        collection(db, "users"),
        where("email", "==", email.trim().toLowerCase()),
        where("password", "==", password)
      );
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const userData = snapshot.docs[0].data();
        if (rememberMe) {
          await AsyncStorage.setItem("user", JSON.stringify(userData));
        } else {
          await AsyncStorage.setItem("user", JSON.stringify(userData));
        }
        setSuccess(true);
        setTimeout(() => router.replace("/home"), 800);
      } else {
        setError("Invalid email or password");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Dark green gradient background */}
      <View style={styles.greenBackground}>
        {/* Atmospheric light orb - top left */}
        <Animated.View style={[styles.lightOrbTop, { transform: [{ translateY: orb1Drift }] }]} />
        {/* Atmospheric light orb - bottom right */}
        <Animated.View style={[styles.lightOrbBottom, { transform: [{ translateY: orb2Drift }] }]} />
        {/* Top accent beam */}
        <View style={styles.accentBeam} />
        {/* Decorative rings */}
        <View style={styles.ring1} />
        <View style={styles.ring2} />
        <View style={styles.ring3} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ===== BRAND HEADER ===== */}
          <Animated.View
            style={[
              styles.brandContainer,
              {
                opacity: brandOpacity,
                transform: [{ translateY: brandTranslateY }],
              },
            ]}
          >
            {/* Logo with pulse ring */}
            <View style={styles.logoWrapper}>
              <Animated.View style={[styles.pulseRing, { opacity: pulseAnim }]} />
              <View style={styles.logoCircle}>
                <Image
                  source={require("../assets/logo.png")}
                  style={{ width: 68, height: 68, resizeMode: "contain" }}
                />
              </View>
            </View>

            <Text style={styles.brandName}>Family Forever</Text>
            <Text style={styles.tagline}>
              From Humanity To Community.
            </Text>
          </Animated.View>

          {/* ===== FLOATING WHITE LOGIN CARD ===== */}
          <Animated.View
            style={[
              styles.loginCard,
              {
                opacity: cardOpacity,
                transform: [{ translateY: cardTranslateY }],
              },
            ]}
          >
            {/* Staff Portal label */}
            <Text style={styles.staffLabel}>STAFF PORTAL</Text>

            <Text style={styles.welcomeText}>Welcome back</Text>
            <Text style={styles.subtitleText}>Sign in to manage your shifts</Text>

            {/* Email Field */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email Address</Text>
              <View style={[styles.inputWrapper, error && !email ? styles.inputError : null]}>
                <Ionicons name="mail-outline" size={17} color="#CBD5E1" style={styles.inputIcon} />
                <TextInput
                  placeholder="you@familyforever.com"
                  placeholderTextColor="#C4C8CE"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={styles.textInput}
                />
              </View>
            </View>

            {/* Password Field */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Password</Text>
              <View style={[styles.inputWrapper, error && !password ? styles.inputError : null]}>
                <Ionicons name="lock-closed-outline" size={17} color="#CBD5E1" style={styles.inputIcon} />
                <TextInput
                  placeholder="Enter your password"
                  placeholderTextColor="#C4C8CE"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  style={styles.textInput}
                />
                <Pressable
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeButton}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={17}
                    color="#9CA3AF"
                  />
                </Pressable>
              </View>
            </View>

            {/* Remember Me + Forgot Password */}
            <View style={styles.rowBetween}>
              <Pressable onPress={() => setRememberMe(!rememberMe)} style={styles.rememberRow}>
                <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                  {rememberMe && <Ionicons name="checkmark" size={12} color="#fff" />}
                </View>
                <Text style={styles.rememberText}>Remember me</Text>
              </Pressable>

              <Pressable>
                <Text style={styles.forgotText}>Forgot password?</Text>
              </Pressable>
            </View>

            {/* Error Message */}
            {error ? (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={14} color="#EF4444" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* Sign In Button */}
            <Pressable
              onPress={handleLogin}
              disabled={loading || success}
              style={[
                styles.signInButton,
                success && styles.signInButtonSuccess,
              ]}
            >
              {success ? (
                <>
                  <Ionicons name="checkmark" size={20} color="#fff" />
                  <Text style={styles.signInButtonTextSuccess}>Welcome!</Text>
                </>
              ) : loading ? (
                <View style={styles.spinnerContainer}>
                  <View style={styles.spinner} />
                </View>
              ) : (
                <Text style={styles.signInButtonText}>Sign In</Text>
              )}
            </Pressable>

            {/* Contact Admin */}
            <Text style={styles.contactText}>
              Don't have an account?{" "}
              <Text style={styles.contactLink}>Contact your administrator.</Text>
            </Text>
          </Animated.View>

          {/* ===== TRUST BADGES ===== */}
          <Animated.View
            style={[
              styles.trustBadges,
              {
                opacity: badgesOpacity,
                transform: [{ translateY: badgesTranslateY }],
              },
            ]}
          >
            <View style={styles.badge}>
              <Ionicons name="shield-checkmark-outline" size={12} color="rgba(255,255,255,0.22)" />
              <Text style={styles.badgeText}>Encrypted</Text>
            </View>
            <View style={styles.badge}>
              <Ionicons name="checkmark-circle-outline" size={12} color="rgba(255,255,255,0.22)" />
              <Text style={styles.badgeText}>WCAG AA</Text>
            </View>
            <View style={styles.badge}>
              <Ionicons name="heart-outline" size={12} color="rgba(255,255,255,0.22)" />
              <Text style={styles.badgeText}>Care-first</Text>
            </View>
          </Animated.View>

          {/* Version */}
          <Text style={styles.versionText}>v1.0.2 · Family Forever Inc.</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DARK_GREEN_TOP,
  },
  greenBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: DARK_GREEN_TOP,
  },
  lightOrbTop: {
    position: "absolute",
    top: -200,
    left: -150,
    width: 600,
    height: 600,
    borderRadius: 300,
    backgroundColor: "rgba(34,120,60,0.18)",
  },
  lightOrbBottom: {
    position: "absolute",
    bottom: -150,
    right: -100,
    width: 500,
    height: 500,
    borderRadius: 250,
    backgroundColor: "rgba(31,111,67,0.12)",
  },
  accentBeam: {
    position: "absolute",
    top: 0,
    alignSelf: "center",
    width: 200,
    height: 350,
    backgroundColor: "rgba(52,168,95,0.08)",
  },
  ring1: {
    position: "absolute",
    top: 50,
    left: -100,
    width: 420,
    height: 420,
    borderRadius: 210,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.025)",
  },
  ring2: {
    position: "absolute",
    top: 80,
    right: -80,
    width: 320,
    height: 320,
    borderRadius: 160,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.018)",
  },
  ring3: {
    position: "absolute",
    bottom: 200,
    left: -60,
    width: 260,
    height: 260,
    borderRadius: 130,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.015)",
  },
  brandContainer: {
    alignItems: "center",
    paddingTop: 70,
    paddingBottom: 20,
  },
  logoWrapper: {
    width: 96,
    height: 96,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  pulseRing: {
    position: "absolute",
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  brandName: {
    fontSize: 32,
    fontWeight: "600",
    color: "#FFFFFF",
    letterSpacing: -0.8,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 13,
    color: "rgba(255,255,255,0.35)",
    textAlign: "center",
    maxWidth: 240,
    lineHeight: 20,
  },
  loginCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    marginHorizontal: 20,
    paddingHorizontal: 32,
    paddingTop: 34,
    paddingBottom: 28,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.25,
    shadowRadius: 60,
    elevation: 20,
  },
  staffLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: PRIMARY_GREEN,
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  welcomeText: {
    fontSize: 26,
    fontWeight: "600",
    color: "#111111",
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  subtitleText: {
    fontSize: 14,
    color: "#9CA3AF",
    marginBottom: 30,
  },
  inputGroup: {
    marginBottom: 22,
  },
  inputLabel: {
    fontSize: 12.5,
    fontWeight: "600",
    color: "#374151",
    letterSpacing: 0.1,
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    height: 52,
    backgroundColor: "#F7F8F9",
    borderWidth: 1.5,
    borderColor: "#EAECEF",
    borderRadius: 14,
    paddingHorizontal: 15,
  },
  inputError: {
    borderColor: "#EF4444",
    backgroundColor: "#FEF7F7",
  },
  inputIcon: {
    marginRight: 12,
  },
  textInput: {
    flex: 1,
    height: "100%",
    fontSize: 15,
    color: "#111111",
  },
  eyeButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
  },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 28,
  },
  rememberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  checkbox: {
    width: 17,
    height: 17,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: "#D1D5DB",
    backgroundColor: "#F9FAFB",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    backgroundColor: PRIMARY_GREEN,
    borderColor: PRIMARY_GREEN,
  },
  rememberText: {
    fontSize: 13,
    color: "#6B7280",
  },
  forgotText: {
    fontSize: 13,
    fontWeight: "600",
    color: PRIMARY_GREEN,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  errorText: {
    fontSize: 11.5,
    fontWeight: "500",
    color: "#EF4444",
  },
  signInButton: {
    height: 54,
    borderRadius: 16,
    backgroundColor: PRIMARY_GREEN,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: PRIMARY_GREEN,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 6,
    marginBottom: 20,
  },
  signInButtonSuccess: {
    backgroundColor: "#22C55E",
  },
  signInButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  signInButtonTextSuccess: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    marginLeft: 8,
  },
  spinnerContainer: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2.5,
    borderColor: "rgba(255,255,255,0.3)",
    borderTopColor: "#fff",
  },
  contactText: {
    textAlign: "center",
    fontSize: 13,
    color: "#9CA3AF",
    lineHeight: 20,
  },
  contactLink: {
    fontWeight: "600",
    color: PRIMARY_GREEN,
  },
  trustBadges: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 20,
    marginTop: 24,
    marginBottom: 8,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  badgeText: {
    fontSize: 10.5,
    fontWeight: "500",
    color: "rgba(255,255,255,0.22)",
  },
  versionText: {
    textAlign: "center",
    fontSize: 9.5,
    color: "rgba(255,255,255,0.08)",
    marginTop: 8,
  },
});
