import { View, Text, Pressable, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../src/firebase/config";
import QRCode from "react-native-qrcode-svg";

export default function EmployeeCard() {
  const router = useRouter();
  const [showBack, setShowBack] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    let unsubscribe;

    const loadUser = async () => {
      const stored = await AsyncStorage.getItem("user");
      if (!stored) return;

      const parsed = JSON.parse(stored);
      const userRef = doc(db, "users", parsed.username);

      unsubscribe = onSnapshot(userRef, (snap) => {
        if (snap.exists()) setUser({ username: parsed.username, ...snap.data() });
      });
    };

    loadUser();
    return () => unsubscribe && unsubscribe();
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f6f7f8" }}>
      <View style={{ padding: 18 }}>
        {/* HEADER */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Text style={styles.backArrow}>←</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Employee Card</Text>
        </View>

        {/* CARD */}
        <Pressable onPress={() => setShowBack((v) => !v)} activeOpacity={0.92}>
          {!showBack ? (
            /* FRONT */
            <View style={styles.card}>
              {/* TOP GREEN */}
              <View style={styles.topGreen}>
                {/* Logo (top-left) */}
                <View style={styles.logoWrap}>
                  <Image
                    source={require("../assets/logo.png")}
                    style={styles.logo}
                  />
                </View>

                {/* Centered Title */}
                <Text style={styles.company}>Family Forever Inc.</Text>
                <Text style={styles.employeeId}>
                  Employee ID {user?.userId ?? "--"}
                </Text>

                {/* White Arc */}
                <View style={styles.whiteArc} />
              </View>

              {/* BODY */}
              <View style={styles.body}>
                <View style={styles.avatarWrap}>
                  <Image
                    source={
                      user?.profilePhotoUrl
                        ? { uri: user.profilePhotoUrl }
                        : require("../assets/defaultuser.jpg")
                    }
                    style={styles.avatar}
                  />
                </View>

                <Text style={styles.name}>{user?.name || "Adam Smasher"}</Text>

                <Text style={styles.role}>
                  {user?.designation || "Child and Youth Care Worker"}
                </Text>

                <Text style={styles.email}>
                  {user?.email || "adamsmasher89@gmail.com"}
                </Text>

                <Text style={styles.phone}>
                  {user?.phone || "+1-376-345-3456"}
                </Text>

                <Text style={styles.tagline}>From Humanity to Community</Text>
              </View>
            </View>
          ) : (
            /* BACK */
            <View style={styles.cardBack}>
              <Text style={styles.backCompany}>Family Forever Inc.</Text>

              <View style={{ marginVertical: 18 }}>
                <QRCode value="https://familyforever.ca/" size={140} />
              </View>

              <Text style={styles.termsTitle}>Terms & Conditions</Text>
              <Text style={styles.termsText}>
                Use of this card indicates agreement with Family Forever Inc.'s
                Policies and procedures. This card is the property of Family
                Forever Inc. of Edmonton, if found please call{"\n"}
                825-982-3256 / 825-522-3256
              </Text>

              <Text style={styles.website}>www.familyforever.ca</Text>
            </View>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

/* ================= STYLES ================= */

const GREEN = "#0B3B2A";

const styles = {
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
  },
  backArrow: {
    fontSize: 18,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginLeft: 12,
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    overflow: "hidden",
    elevation: 6,
    height:450
  },

  topGreen: {
    height: 240,
    backgroundColor: GREEN,
    alignItems: "center",
    justifyContent: "flex-start",
    paddingTop: 28,
    position: "relative",
  },

  logoWrap: {
    position: "absolute",
    left: 18,
    top: 22,
    width: 55,
    height: 55,
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: 28,
    height: 28,
    resizeMode: "contain",
  },

  company: {
    color: "#fff",
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: 0.2,
    marginTop: 6,
  },

  employeeId: {
    color: "rgba(255,255,255,0.85)",
    marginTop: 16,
    fontSize: 18,
    fontWeight: "600",
  },

  // This makes the big smooth white dome/arc like the screenshot
  whiteArc: {
    position: "absolute",
    width: 560,
    height: 560,
    borderRadius: 280,
    backgroundColor: "#fff",
    bottom: -500,
    left: "50%",
    transform: [{ translateX: -280 }],
  },

  body: {
    alignItems: "center",
    paddingHorizontal: 22,
    paddingBottom: 22,
    paddingTop: 0,
    marginTop: -85, // pulls content up so avatar overlaps the arc
  },

  avatarWrap: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    // subtle shadow to match the screenshot ring feel
  },

  avatar: {
    width: 102,
    height: 102,
    borderRadius: 51,
    borderColor: "#fff",
  },

  name: {
    fontSize: 20,
    fontWeight: "800",
    marginTop: 14,
    color: "#111827",
  },

  role: {
    fontSize: 13,
    color: "#6b7280",
    marginTop: 6,
    marginBottom: 18,
    fontWeight: "600",
  },

  email: {
    fontSize: 13,
    marginBottom: 8,
    color: "#374151",
  },

  phone: {
    fontSize: 13,
    marginBottom: 22,
    color: "#374151",
  },

  tagline: {
    fontSize: 13,
    fontWeight: "700",
    color: "#374151",
    marginTop: 10,
  },

  /* BACK */
  cardBack: {
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingVertical: 26,
    paddingHorizontal: 22,
    alignItems: "center",
    elevation: 6,
    height:450
  },

  backCompany: {
    fontSize: 25,
    fontWeight: "800",
    color: "#111827",
  },

  termsTitle: {
    fontWeight: "800",
    marginTop: 10,
    color: "#111827",
    fontSize: 17,
  },

  termsText: {
    textAlign: "center",
    fontSize: 14,
    color: "#6b7280",
    lineHeight: 16,
    marginTop: 10,
  },

  website: {
    marginTop: 45,
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
};
