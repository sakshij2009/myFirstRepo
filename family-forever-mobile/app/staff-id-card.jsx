import {
  View,
  Text,
  Pressable,
  ScrollView,
  Share,
  Alert,
  StyleSheet,
  Animated,
  Image,
  Dimensions,
} from "react-native";
import QRCode from "qrcode";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState, useRef } from "react";


const { width } = Dimensions.get("window");
const CARD_WIDTH = width * 0.85;
const CARD_HEIGHT = CARD_WIDTH * 1.5;

// ── Color tokens ──────────────────────────────────────────────────────────────
const PRIMARY_GREEN = "#1F6F43";
const DARK_SCREEN_BG = "#121212";
const CARD_WHITE = "#FFFFFF";
const DARK_TEXT = "#111827";
const GRAY_TEXT = "#6B7280";

export default function StaffIdCard() {
  const [user, setUser] = useState(null);
  const [qrMatrix, setQrMatrix] = useState(null);
  const [isFlipped, setIsFlipped] = useState(false);
  const flipAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const load = async () => {
      const stored = await AsyncStorage.getItem("user");
      if (stored) setUser(JSON.parse(stored));
    };
    load();
  }, []);

  useEffect(() => {
    try {
      const value = `familyforever://verify/${user?.id || user?.username || "staff"}`;
      const qr = QRCode.create(value, { errorCorrectionLevel: "M" });
      setQrMatrix({ data: qr.modules.data, size: qr.modules.size });
    } catch (e) {
      console.warn("QR generation failed:", e);
    }
  }, [user]);

  const handleFlip = () => {
    Animated.timing(flipAnim, {
      toValue: isFlipped ? 0 : 180,
      duration: 600,
      useNativeDriver: true,
    }).start();
    setIsFlipped(!isFlipped);
  };

  const frontInterpolate = flipAnim.interpolate({
    inputRange: [0, 180],
    outputRange: ["0deg", "180deg"],
  });
  const backInterpolate = flipAnim.interpolate({
    inputRange: [0, 180],
    outputRange: ["180deg", "360deg"],
  });

  const frontAnimatedStyle = { transform: [{ rotateY: frontInterpolate }] };
  const backAnimatedStyle = { transform: [{ rotateY: backInterpolate }] };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.headerAction}>
          <Ionicons name="chevron-back" size={20} color="#FFF" />
          <Text style={styles.headerActionText}>Close</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Staff ID Card</Text>
        <Pressable style={styles.headerAction}>
          <Ionicons name="share-outline" size={22} color="#FFF" />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.brightnessBox}>
          <Ionicons name="sunny" size={14} color={GRAY_TEXT} />
          <Text style={styles.brightnessText}>Auto-brightness on</Text>
        </View>

        {/* 3D Card Container */}
        <View style={styles.perspectiveWrapper}>
          {/* FRONT */}
          <Animated.View style={[styles.idCard, frontAnimatedStyle, { backfaceVisibility: "hidden" }]}>
            <View style={styles.cardHeader}>
              <View style={styles.logoRow}>
                <View style={styles.logoCircle}>
                  <Ionicons name="pulse" size={18} color={PRIMARY_GREEN} />
                </View>
                <Text style={styles.cardOrgName}>Family Forever Inc.</Text>
              </View>
              <Text style={styles.cardEmployeeId}>Employee ID {user?.employeeId || "27"}</Text>
              
              {/* Curve implementation: using a background overlay or just styling */}
              <View style={styles.curveOverlay} />
            </View>

            <View style={styles.cardBody}>
              <View style={styles.avatarContainer}>
                <Image 
                  source={user?.profilePhotoUrl ? { uri: user.profilePhotoUrl } : require("../assets/defaultuser.jpg")} 
                  style={styles.avatarImg} 
                />
              </View>
              
              <View style={styles.mainInfo}>
                <Text style={styles.nameText}>{user?.name || "Sarah Johnson"}</Text>
                <Text style={styles.roleText}>{user?.designation || "Child and Youth Care Worker"}</Text>
              </View>

              <View style={styles.contactDetails}>
                <Text style={styles.contactText}>{user?.email || "sarah.johnson@email.com"}</Text>
                <Text style={styles.contactText}>{user?.phone || "+1-555-987-6543"}</Text>
              </View>

              <View style={styles.footerBrand}>
                <Text style={styles.brandSlogan}>From Humanity to Community</Text>
              </View>
            </View>
          </Animated.View>

          {/* BACK */}
          <Animated.View style={[styles.idCard, styles.backCard, backAnimatedStyle, { backfaceVisibility: "hidden", position: "absolute" }]}>
            <Text style={styles.backOrgName}>Family Forever Inc.</Text>
            
            <View style={styles.qrBox}>
              {qrMatrix ? (
                <QRMatrix matrix={qrMatrix} cellSize={3.6} />
              ) : (
                <View style={{ width: 160, height: 160, alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ color: GRAY_TEXT, fontSize: 12 }}>Generating QR...</Text>
                </View>
              )}
            </View>

            <View style={styles.backFooter}>
              <Text style={styles.termsTitle}>Terms & Conditions</Text>
              <Text style={styles.termsBody}>
                Use of this card indicates agreement with Family Forever Inc's. Policies and procedures. This Card is the property of Family Forever Inc. of Edmonton, if found please call
              </Text>
              <Text style={styles.backContact}>825-982-3256 / 825-522-3256</Text>
              <Text style={styles.backWeb}>www.familyforever.ca</Text>
            </View>
          </Animated.View>
        </View>

        {/* Flip Action */}
        <Pressable onPress={handleFlip} style={styles.flipPill}>
          <Ionicons name="refresh-outline" size={18} color="#FFF" />
          <Text style={styles.flipText}>{isFlipped ? "Tap to see front" : "Tap to flip card"}</Text>
        </Pressable>

        <View style={styles.pager}>
          <View style={[styles.pagerDot, !isFlipped && styles.pagerDotActive]} />
          <View style={[styles.pagerDot, isFlipped && styles.pagerDotActive]} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Pure-JS QR Code renderer (no native modules needed) ──────────────────────
function QRMatrix({ matrix, cellSize = 3 }) {
  const { data, size } = matrix;
  const rows = [];
  for (let row = 0; row < size; row++) {
    const cells = [];
    for (let col = 0; col < size; col++) {
      const isDark = data[row * size + col];
      cells.push(
        <View
          key={col}
          style={{
            width: cellSize,
            height: cellSize,
            backgroundColor: isDark ? "#111827" : "#FFFFFF",
          }}
        />
      );
    }
    rows.push(
      <View key={row} style={{ flexDirection: "row" }}>
        {cells}
      </View>
    );
  }
  return (
    <View style={{ backgroundColor: "#FFFFFF", padding: 8, borderRadius: 8 }}>
      {rows}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: DARK_SCREEN_BG },
  header: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    alignItems: "center", 
    paddingHorizontal: 20, 
    height: 60,
    backgroundColor: DARK_SCREEN_BG
  },
  headerAction: { flexDirection: "row", alignItems: "center", minWidth: 60, gap: 4 },
  headerActionText: { color: "#FFF", fontSize: 14, fontWeight: "600", fontFamily: "Inter-SemiBold" },
  headerTitle: { color: "#FFF", fontSize: 18, fontWeight: "700", fontFamily: "Poppins-Bold" },
  
  scrollContent: { alignItems: "center", paddingBottom: 60 },
  brightnessBox: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 15, marginBottom: 25 },
  brightnessText: { color: GRAY_TEXT, fontSize: 12, fontFamily: "Inter" },
  
  perspectiveWrapper: { width: CARD_WIDTH, height: CARD_HEIGHT, marginTop: 10 },
  idCard: { 
    width: CARD_WIDTH, 
    height: CARD_HEIGHT, 
    borderRadius: 36, 
    backgroundColor: CARD_WHITE, 
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.4,
    shadowRadius: 30,
    elevation: 20
  },
  backCard: { padding: 30, alignItems: "center", justifyContent: "space-between" },
  
  cardHeader: { 
    height: "40%", 
    backgroundColor: PRIMARY_GREEN, 
    alignItems: "center", 
    paddingTop: 35,
    position: "relative"
  },
  logoRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 6 },
  logoCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: "#FFF", alignItems: "center", justifyContent: "center" },
  cardOrgName: { color: "#FFF", fontSize: 17, fontWeight: "800", fontFamily: "Inter-Bold" },
  cardEmployeeId: { color: "rgba(255,255,255,0.7)", fontSize: 13, fontWeight: "600", fontFamily: "Inter" },
  
  curveOverlay: {
    position: "absolute",
    bottom: -50,
    left: -20,
    right: -20,
    height: 100,
    backgroundColor: CARD_WHITE,
    borderRadius: 100,
    transform: [{ scaleX: 1.5 }]
  },

  cardBody: { flex: 1, backgroundColor: CARD_WHITE, alignItems: "center", paddingTop: 0 },
  avatarContainer: { 
    width: 104, 
    height: 104, 
    borderRadius: 52, 
    backgroundColor: CARD_WHITE, 
    padding: 6,
    marginTop: -45, // Center it on the curve
    zIndex: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4
  },
  avatarImg: { width: 92, height: 92, borderRadius: 46 },
  
  mainInfo: { marginTop: 20, alignItems: "center" },
  nameText: { fontSize: 26, fontWeight: "800", color: DARK_TEXT, fontFamily: "Poppins-Bold" },
  roleText: { fontSize: 14, color: GRAY_TEXT, marginTop: 4, fontFamily: "Inter-Medium" },
  
  contactDetails: { marginTop: 35, alignItems: "center", gap: 6 },
  contactText: { fontSize: 13, color: GRAY_TEXT, fontFamily: "Inter" },
  
  footerBrand: { marginTop: "auto", marginBottom: 35 },
  brandSlogan: { fontSize: 15, fontWeight: "700", color: PRIMARY_GREEN, fontFamily: "Inter-Bold" },
  
  backOrgName: { fontSize: 20, fontWeight: "800", color: DARK_TEXT, fontFamily: "Poppins-Bold" },
  qrBox: { padding: 15, backgroundColor: "#FFF", borderRadius: 20, borderWidth: 1, borderColor: "#F1F5F9" },
  backFooter: { alignItems: "center" },
  termsTitle: { fontSize: 16, fontWeight: "800", color: DARK_TEXT, marginBottom: 12, fontFamily: "Poppins-Bold" },
  termsBody: { fontSize: 11, color: GRAY_TEXT, textAlign: "center", lineHeight: 18, fontFamily: "Inter", paddingHorizontal: 10 },
  backContact: { fontSize: 12, fontWeight: "700", color: DARK_TEXT, marginTop: 20, fontFamily: "Inter-Bold" },
  backWeb: { fontSize: 12, color: DARK_TEXT, marginTop: 4, fontFamily: "Inter" },
  
  flipPill: { 
    flexDirection: "row", 
    alignItems: "center", 
    gap: 10, 
    backgroundColor: "#222", 
    paddingHorizontal: 28, 
    paddingVertical: 14, 
    borderRadius: 30,
    marginTop: 40,
    borderWidth: 1,
    borderColor: "#333"
  },
  flipText: { color: "#FFF", fontSize: 14, fontWeight: "700", fontFamily: "Inter-Bold" },
  
  pager: { flexDirection: "row", gap: 8, marginTop: 25 },
  pagerDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: "#333" },
  pagerDotActive: { backgroundColor: "#FFF" },
});
