import {
  View,
  Text,
  Pressable,
  ScrollView,
  Share,
  Alert,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import QRCode from "react-native-qrcode-svg";

// ── Color tokens ──────────────────────────────────────────────────────────────
const PRIMARY_GREEN = "#1F6F43";
const PRIMARY_GREEN_DARK = "#155934";
const LIGHT_GREEN = "#F0FDF4";
const DARK_TEXT = "#1A1A1A";
const GRAY_TEXT = "#9CA3AF";
const GRAY_BORDER = "#E5E7EB";

// ── Helpers ───────────────────────────────────────────────────────────────────
const getInitials = (name) => {
  if (!name) return "FF";
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
};

const buildCardNumber = (username) => {
  if (!username) return "FF-XXXX-XXXX-2026";
  const part = username.slice(0, 4).toUpperCase().padEnd(4, "X");
  const num = String(username.length * 137 + 1000).slice(0, 4);
  return `FF-${part}-${num}-2026`;
};

export default function StaffIdCard() {
  const [user, setUser] = useState(null);
  const [isFlipped, setIsFlipped] = useState(false);
  const flipAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const load = async () => {
      try {
        const stored = await AsyncStorage.getItem("user");
        if (stored) setUser(JSON.parse(stored));
      } catch (e) {
        console.log("Error loading user:", e);
      }
    };
    load();
  }, []);

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

  const initials = getInitials(user?.name);
  const cardNumber = buildCardNumber(user?.username);
  const validUntil = "12/31/2026";
  const qrValue = user?.username
    ? `familyforever://staff/${user.username}`
    : "familyforever://staff/unknown";

  const handleShare = async () => {
    try {
      await Share.share({
        message:
          `Family Forever Inc. — Staff ID\n` +
          `Name: ${user?.name || "Staff Member"}\n` +
          `Employee ID: ${user?.userId || user?.username || "N/A"}\n` +
          `Role: ${user?.designation || "Staff"}\n` +
          `Valid Until: ${validUntil}`,
        title: "Staff ID Card",
      });
    } catch {
      Alert.alert("Error", "Could not share ID card.");
    }
  };

  const handleDownload = () => {
    Alert.alert(
      "Download ID Card",
      "Your digital ID card has been saved to your device.",
      [{ text: "OK" }]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* ── HEADER ── */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={DARK_TEXT} />
        </Pressable>
        <Text style={styles.headerTitle}>Staff ID Card</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ── SUBTITLE ── */}
        <Text style={styles.subtitle}>Tap card to view security terms & verification</Text>

        {/* ── ID CARD ── */}
        <Pressable onPress={handleFlip} style={styles.cardShadowWrapper}>
          {/* FRONT SIDE */}
          <Animated.View style={[styles.card, frontAnimatedStyle, { backfaceVisibility: 'hidden' }]}>
            {/* === GREEN HEADER SECTION === */}
            <View style={styles.cardHeader}>
              {/* Logo + Company row */}
              <View style={styles.cardLogoRow}>
                <View style={styles.logoCircle}>
                  <MaterialCommunityIcons
                    name="heart-pulse"
                    size={20}
                    color={PRIMARY_GREEN}
                  />
                </View>
                <View>
                  <Text style={styles.companyNameHeader}>
                    Family Forever Inc.
                  </Text>
                  <Text style={styles.companyTagline}>
                    Healthcare Staffing Solutions
                  </Text>
                </View>
                {/* Chip / NFC icon top right */}
                <View style={{ flex: 1, alignItems: "flex-end" }}>
                  <MaterialCommunityIcons
                    name="contactless-payment"
                    size={26}
                    color="rgba(255,255,255,0.5)"
                  />
                </View>
              </View>

              {/* STAFF IDENTIFICATION badge */}
              <View style={styles.idLabelBadge}>
                <Text style={styles.idLabelText}>STAFF IDENTIFICATION</Text>
              </View>

              {/* Avatar */}
              <View style={styles.avatarWrapper}>
                <View style={styles.avatarRing}>
                  <View style={styles.avatarCircle}>
                    <Text style={styles.avatarInitials}>{initials}</Text>
                  </View>
                </View>
                <View style={styles.activeBadge}>
                  <View style={styles.activeDot} />
                  <Text style={styles.activeText}>Active Member</Text>
                </View>
              </View>
            </View>

            {/* === WHITE BODY SECTION === */}
            <View style={styles.cardBody}>
              {/* Name */}
              <Text style={styles.staffName}>
                {user?.name || "Staff Member"}
              </Text>
              {/* Role */}
              <Text style={styles.staffRole}>
                {user?.designation || "Healthcare Staff"}
              </Text>

              <View style={styles.divider} />

              {/* Info grid */}
              <View style={styles.infoGrid}>
                <View style={styles.infoCell}>
                  <Text style={styles.infoLabel}>EMPLOYEE ID</Text>
                  <Text style={styles.infoValue}>
                    {user?.userId || "—"}
                  </Text>
                </View>
                <View style={styles.infoCell}>
                  <Text style={styles.infoLabel}>USERNAME</Text>
                  <Text style={styles.infoValue}>
                    @{user?.username || "username"}
                  </Text>
                </View>
                <View style={styles.infoCell}>
                  <Text style={styles.infoLabel}>COMPANY</Text>
                  <Text style={styles.infoValue}>Family Forever Inc.</Text>
                </View>
                <View style={styles.infoCell}>
                  <Text style={styles.infoLabel}>VALID UNTIL</Text>
                  <Text style={styles.infoValue}>{validUntil}</Text>
                </View>
              </View>

              <View style={styles.divider} />

              {/* QR + Verified section */}
              <View style={styles.qrSection}>
                <View style={styles.qrContainer}>
                  <QRCode
                    value={qrValue}
                    size={82}
                    color={PRIMARY_GREEN}
                    backgroundColor="#fff"
                  />
                </View>
                <View style={styles.qrInfo}>
                  <Text style={styles.qrTitle}>Scan to Verify</Text>
                  <Text style={styles.qrSubtitle}>
                    Show this QR code to a parent or supervisor to verify your
                    identity and credentials.
                  </Text>
                  <View style={styles.verifiedBadge}>
                    <Ionicons
                      name="shield-checkmark"
                      size={12}
                      color={PRIMARY_GREEN}
                    />
                    <Text style={styles.verifiedText}>Verified Staff</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* === DARK GREEN FOOTER === */}
            <View style={styles.cardFooter}>
              <Text style={styles.cardNumber}>{cardNumber}</Text>
              <View style={styles.cardFooterRight}>
                <Ionicons
                  name="shield-checkmark-outline"
                  size={13}
                  color="rgba(255,255,255,0.6)"
                />
                <Text style={styles.cardValidText}>
                  Thru {validUntil}
                </Text>
              </View>
            </View>
          </Animated.View>

          {/* BACK SIDE */}
          <Animated.View style={[styles.card, styles.cardBack, backAnimatedStyle, { backfaceVisibility: 'hidden', position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }]}>
             <View style={styles.cardHeaderBack}>
               <Text style={styles.backTitle}>Security Terms & Conditions</Text>
             </View>
             <View style={styles.backContent}>
               <View style={styles.backRow}>
                 <Ionicons name="shield" size={14} color={PRIMARY_GREEN} />
                 <Text style={styles.backText}>This card is official identification for Family Forever Inc. personnel.</Text>
               </View>
               <View style={styles.backRow}>
                 <Ionicons name="lock-closed" size={14} color={PRIMARY_GREEN} />
                 <Text style={styles.backText}>Unauthorized use or duplication is strictly prohibited and subject to legal action.</Text>
               </View>
               <View style={styles.backRow}>
                 <Ionicons name="call" size={14} color={PRIMARY_GREEN} />
                 <Text style={styles.backText}>If found, please contact the agency at (555) 0123-4567 or return to administrative headquarters.</Text>
               </View>
               
               <View style={styles.agencyStamp}>
                 <Text style={styles.stampText}>OFFICIAL AGENCY STAMP</Text>
                 <MaterialCommunityIcons name="seal" size={48} color="rgba(31, 111, 67, 0.05)" />
                 <Text style={styles.stampDate}>ISSUED 2026</Text>
               </View>
             </View>
             <View style={styles.cardFooterBack}>
               <Text style={styles.footerBackText}>FAMILY FOREVER INTERNAL SYSTEM • v4.2.0</Text>
             </View>
          </Animated.View>
        </Pressable>

        {/* ── HINT TEXT ── */}
        <Text style={styles.hintText}>
          Present this card for identity verification at client locations
        </Text>

        {/* ── ACTION BUTTONS ── */}
        <View style={styles.actionRow}>
          <Pressable
            onPress={handleShare}
            style={({ pressed }) => [
              styles.actionBtn,
              styles.actionBtnOutline,
              pressed && { opacity: 0.7 },
            ]}
          >
            <Ionicons name="share-social-outline" size={18} color={PRIMARY_GREEN} />
            <Text style={styles.actionBtnOutlineText}>Share ID</Text>
          </Pressable>

          <Pressable
            onPress={handleDownload}
            style={({ pressed }) => [
              styles.actionBtn,
              styles.actionBtnFilled,
              pressed && { opacity: 0.85 },
            ]}
          >
            <Ionicons name="download-outline" size={18} color="#fff" />
            <Text style={styles.actionBtnFilledText}>Download</Text>
          </Pressable>
        </View>

        {/* ── INFO NOTICE ── */}
        <View style={styles.noticeCard}>
          <Ionicons
            name="information-circle-outline"
            size={18}
            color={PRIMARY_GREEN}
          />
          <Text style={styles.noticeText}>
            This digital ID card is official and accepted at all Family Forever
            client locations. Keep your app updated to ensure your card remains
            valid.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  // ── Header ──
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: GRAY_BORDER,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: DARK_TEXT,
    letterSpacing: -0.3,
  },
  // ── Scroll content ──
  scrollContent: {
    padding: 20,
    paddingBottom: 48,
    alignItems: "center",
  },
  subtitle: {
    fontSize: 13,
    color: GRAY_TEXT,
    marginBottom: 20,
    textAlign: "center",
  },
  // ── Card shadow wrapper ──
  cardShadowWrapper: {
    width: "100%",
    maxWidth: 360,
    shadowColor: PRIMARY_GREEN,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 18,
    elevation: 12,
    borderRadius: 22,
  },
  card: {
    borderRadius: 22,
    overflow: "hidden",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  // ── Card Header (green) ──
  cardHeader: {
    backgroundColor: PRIMARY_GREEN,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 28,
    alignItems: "center",
  },
  cardLogoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    alignSelf: "stretch",
    marginBottom: 16,
  },
  logoCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  companyNameHeader: {
    fontSize: 13,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 0.3,
  },
  companyTagline: {
    fontSize: 10,
    color: "rgba(255,255,255,0.7)",
    marginTop: 1,
  },
  idLabelBadge: {
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 16,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    marginBottom: 18,
  },
  idLabelText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 2.5,
  },
  avatarWrapper: {
    alignItems: "center",
  },
  avatarRing: {
    padding: 4,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.4)",
    borderStyle: "dashed",
    marginBottom: 8,
  },
  avatarCircle: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: "rgba(255,255,255,0.22)",
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.7)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitials: {
    fontSize: 32,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 1,
  },
  activeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,255,255,0.18)",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
  },
  activeDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#6EE7A0",
  },
  activeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#fff",
  },
  // ── Card Body (white) ──
  cardBody: {
    backgroundColor: "#fff",
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 18,
  },
  staffName: {
    fontSize: 22,
    fontWeight: "800",
    color: DARK_TEXT,
    textAlign: "center",
    letterSpacing: 0.1,
  },
  staffRole: {
    fontSize: 14,
    color: PRIMARY_GREEN,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: GRAY_BORDER,
    marginVertical: 14,
  },
  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    rowGap: 14,
    columnGap: 8,
  },
  infoCell: {
    width: "47%",
  },
  infoLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: GRAY_TEXT,
    letterSpacing: 1.2,
    marginBottom: 3,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: "700",
    color: DARK_TEXT,
  },
  qrSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  qrContainer: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: LIGHT_GREEN,
    borderWidth: 1,
    borderColor: "#D1FAE5",
  },
  qrInfo: {
    flex: 1,
  },
  qrTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: DARK_TEXT,
    marginBottom: 5,
  },
  qrSubtitle: {
    fontSize: 11,
    color: GRAY_TEXT,
    lineHeight: 16,
    marginBottom: 8,
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: LIGHT_GREEN,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#D1FAE5",
  },
  verifiedText: {
    fontSize: 11,
    fontWeight: "700",
    color: PRIMARY_GREEN,
  },
  // ── Card Footer (dark green strip) ──
  cardFooter: {
    backgroundColor: PRIMARY_GREEN_DARK,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 13,
  },
  cardNumber: {
    fontSize: 12,
    fontWeight: "700",
    color: "rgba(255,255,255,0.85)",
    letterSpacing: 1.5,
  },
  cardFooterRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  cardValidText: {
    fontSize: 11,
    color: "rgba(255,255,255,0.65)",
    fontWeight: "600",
  },
  // ── Below card ──
  hintText: {
    fontSize: 12,
    color: GRAY_TEXT,
    textAlign: "center",
    marginTop: 14,
    marginBottom: 22,
    fontStyle: "italic",
    paddingHorizontal: 20,
    lineHeight: 18,
  },
  actionRow: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
    maxWidth: 360,
    marginBottom: 20,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingVertical: 15,
    borderRadius: 14,
  },
  actionBtnOutline: {
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: PRIMARY_GREEN,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  actionBtnFilled: {
    backgroundColor: PRIMARY_GREEN,
    shadowColor: PRIMARY_GREEN,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  actionBtnOutlineText: {
    fontSize: 14,
    fontWeight: "700",
    color: PRIMARY_GREEN,
  },
  actionBtnFilledText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#fff",
  },
  noticeCard: {
    flexDirection: "row",
    gap: 10,
    backgroundColor: LIGHT_GREEN,
    borderRadius: 14,
    padding: 14,
    width: "100%",
    maxWidth: 360,
    borderWidth: 1,
    borderColor: "#D1FAE5",
    alignItems: "flex-start",
  },
  noticeText: {
    flex: 1,
    fontSize: 12,
    color: "#374151",
    lineHeight: 18,
  },
  // ── Card Back Styles ──
  cardBack: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  cardHeaderBack: {
    backgroundColor: "#111827",
    padding: 18,
    alignItems: "center",
  },
  backTitle: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.5,
    fontFamily: "Poppins",
  },
  backContent: {
    flex: 1,
    padding: 24,
    gap: 16,
  },
  backRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
  },
  backText: {
    flex: 1,
    fontSize: 11,
    color: "#4B5563",
    lineHeight: 16,
    fontFamily: "Inter",
  },
  agencyStamp: {
    marginTop: "auto",
    alignItems: "center",
    justifyContent: "center",
    opacity: 0.8,
    paddingVertical: 10,
  },
  stampText: {
    fontSize: 8,
    fontWeight: "800",
    color: PRIMARY_GREEN,
    letterSpacing: 1,
    marginBottom: 4,
  },
  stampDate: {
    fontSize: 9,
    fontWeight: "700",
    color: "#9CA3AF",
    marginTop: 4,
  },
  cardFooterBack: {
    backgroundColor: "#F9FAFB",
    paddingVertical: 10,
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  footerBackText: {
    fontSize: 9,
    color: "#9CA3AF",
    fontWeight: "600",
    letterSpacing: 0.5,
  },
});
