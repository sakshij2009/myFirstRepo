import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Linking,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

// ── Color tokens ──────────────────────────────────────────────────────────────
const PRIMARY_GREEN = "#1F6F43";
const LIGHT_GREEN = "#F0FDF4";
const DARK_TEXT = "#1A1A1A";
const GRAY_TEXT = "#9CA3AF";
const GRAY_BORDER = "#E5E7EB";
const ERROR_RED = "#EF4444";
const WARNING_AMBER = "#F59E0B";

export default function GpsUnavailable() {
  const handleOpenSettings = async () => {
    try {
      if (Platform.OS === "ios") {
        await Linking.openURL("app-settings:");
      } else {
        await Linking.openSettings();
      }
    } catch {
      // Fallback — openSettings is available on both platforms via Linking
      Linking.openSettings();
    }
  };

  const handleContinueWithoutGps = () => {
    router.back();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backBtn}
          hitSlop={8}
        >
          <Ionicons name="arrow-back" size={22} color={DARK_TEXT} />
        </Pressable>
        <Text style={styles.headerTitle}>Location Services</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Body */}
      <View style={styles.body}>
        {/* Icon badge */}
        <View style={styles.iconWrapper}>
          <View style={styles.iconCircle}>
            <Ionicons name="location-off" size={52} color={ERROR_RED} />
          </View>
          {/* Pulse ring decoration */}
          <View style={styles.pulseRing} />
        </View>

        <Text style={styles.title}>Location Unavailable</Text>

        <Text style={styles.description}>
          GPS is required for check-in. Please enable location services to
          verify your presence at the shift location.
        </Text>

        {/* Info card */}
        <View style={styles.infoCard}>
          <Ionicons
            name="information-circle"
            size={18}
            color={PRIMARY_GREEN}
            style={styles.infoIcon}
          />
          <Text style={styles.infoText}>
            Family Forever Inc. uses your location only during active shifts to
            confirm on-site check-in. Your privacy is protected.
          </Text>
        </View>

        {/* Steps */}
        <View style={styles.stepsContainer}>
          <Text style={styles.stepsTitle}>How to enable location:</Text>
          <View style={styles.stepRow}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepNumber}>1</Text>
            </View>
            <Text style={styles.stepText}>
              Open{" "}
              <Text style={styles.stepBold}>
                {Platform.OS === "ios" ? "Settings → Privacy → Location" : "Settings → Location"}
              </Text>
            </Text>
          </View>
          <View style={styles.stepRow}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepNumber}>2</Text>
            </View>
            <Text style={styles.stepText}>
              Find{" "}
              <Text style={styles.stepBold}>Family Forever</Text> in the app
              list
            </Text>
          </View>
          <View style={styles.stepRow}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepNumber}>3</Text>
            </View>
            <Text style={styles.stepText}>
              Select{" "}
              <Text style={styles.stepBold}>
                {Platform.OS === "ios" ? '"While Using the App"' : '"Allow only while using the app"'}
              </Text>
            </Text>
          </View>
        </View>
      </View>

      {/* Action buttons */}
      <View style={styles.footer}>
        <Pressable
          style={({ pressed }) => [
            styles.primaryBtn,
            pressed && styles.primaryBtnPressed,
          ]}
          onPress={handleOpenSettings}
        >
          <Ionicons
            name="settings-outline"
            size={20}
            color="#fff"
            style={styles.btnIcon}
          />
          <Text style={styles.primaryBtnText}>Open Settings</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.secondaryBtn,
            pressed && styles.secondaryBtnPressed,
          ]}
          onPress={handleContinueWithoutGps}
        >
          <Ionicons
            name="warning-outline"
            size={18}
            color={WARNING_AMBER}
            style={styles.btnIcon}
          />
          <Text style={styles.secondaryBtnText}>Continue Without GPS</Text>
        </Pressable>

        <Text style={styles.warningNote}>
          Continuing without GPS may affect your check-in record and require
          supervisor approval.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#fff",
  },

  // ── Header ──────────────────────────────────────────────────────────────────
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: GRAY_BORDER,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 17,
    fontWeight: "600",
    color: DARK_TEXT,
  },
  headerSpacer: {
    width: 36,
  },

  // ── Body ────────────────────────────────────────────────────────────────────
  body: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 40,
  },
  iconWrapper: {
    width: 120,
    height: 120,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 28,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#FEF2F2",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  pulseRing: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: "#FECACA",
    opacity: 0.5,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: DARK_TEXT,
    marginBottom: 12,
    textAlign: "center",
  },
  description: {
    fontSize: 15,
    color: GRAY_TEXT,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  infoCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: LIGHT_GREEN,
    borderRadius: 12,
    padding: 14,
    marginBottom: 28,
    width: "100%",
  },
  infoIcon: {
    marginRight: 10,
    marginTop: 1,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: PRIMARY_GREEN,
    lineHeight: 19,
  },

  // ── Steps ───────────────────────────────────────────────────────────────────
  stepsContainer: {
    width: "100%",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: GRAY_BORDER,
  },
  stepsTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: DARK_TEXT,
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  stepBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: PRIMARY_GREEN,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    marginTop: 1,
  },
  stepNumber: {
    fontSize: 12,
    fontWeight: "700",
    color: "#fff",
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    color: DARK_TEXT,
    lineHeight: 20,
  },
  stepBold: {
    fontWeight: "600",
  },

  // ── Footer ──────────────────────────────────────────────────────────────────
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 12,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: GRAY_BORDER,
    backgroundColor: "#fff",
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: PRIMARY_GREEN,
    borderRadius: 12,
    paddingVertical: 15,
    marginBottom: 12,
  },
  primaryBtnPressed: {
    backgroundColor: "#185A37",
  },
  btnIcon: {
    marginRight: 8,
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },
  secondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFBEB",
    borderRadius: 12,
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: "#FDE68A",
    marginBottom: 12,
  },
  secondaryBtnPressed: {
    backgroundColor: "#FEF3C7",
  },
  secondaryBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: WARNING_AMBER,
  },
  warningNote: {
    fontSize: 12,
    color: GRAY_TEXT,
    textAlign: "center",
    lineHeight: 17,
    paddingHorizontal: 8,
  },
});
