import {
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { collection, query, onSnapshot, getDocs, where, updateDoc } from "firebase/firestore";
import { db } from "../src/firebase/config.jsx";
import { registerForPushNotifications } from "../src/utils/registerForPushNotifications";
import { router } from "expo-router";

const GREEN = "#1F6F43";
const PRIMARY_GREEN = "#1F6F43";
const LIGHT_GREEN = "#F0FDF4";
const DARK_TEXT = "#1A1A1A";
const GRAY_TEXT = "#9CA3AF";
const GRAY_LIGHT = "#F8F8F6";
const GRAY_BORDER = "#E5E7EB";

export default function Home() {
  const [user, setUser] = useState(null);
  const [shifts, setShifts] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());

  useEffect(() => {
    const loadUser = async () => {
      const stored = await AsyncStorage.getItem("user");
      if (!stored) return;
      const parsed = JSON.parse(stored);
      setUser(parsed);
      if (parsed?.userId) await registerForPushNotifications(parsed.username);
    };
    loadUser();
  }, []);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "shifts"));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const userShifts = data.filter(
        (s) =>
          s?.name?.toLowerCase() === user?.name?.toLowerCase() ||
          s?.userId === user?.userId
      );
      setShifts(userShifts);
    });
    return () => unsub();
  }, [user]);

  const parseDate = (dateStr) => {
    if (!dateStr || typeof dateStr !== "string") return null;
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const sep = dateStr.includes("-") ? "-" : " ";
    const [dd, mmm, yyyy] = dateStr.split(sep);
    const mi = months.indexOf((mmm || "").slice(0, 3));
    if (mi >= 0) return new Date(Number(yyyy), mi, Number(dd));
    return null;
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayShifts = shifts.filter((s) => {
    const d = parseDate(s.startDate);
    if (!d) return false;
    d.setHours(0, 0, 0, 0);
    return d.getTime() === today.getTime();
  });

  const confirmShift = async (shiftId) => {
    try {
      const q = query(collection(db, "shifts"), where("id", "==", shiftId));
      const snap = await getDocs(q);
      if (!snap.empty) await updateDoc(snap.docs[0].ref, { shiftConfirmed: true });
    } catch (e) {
      console.log("Error confirming shift", e);
    }
  };

  const getInitials = (name) => {
    if (!name) return "—";
    return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: GRAY_LIGHT }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
        scrollEventThrottle={16}
      >

        {/* ── HEADER WITH LOGO & NOTIFICATION ── */}
        <View style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          paddingHorizontal: 20,
          paddingVertical: 14,
          backgroundColor: "#fff",
          borderBottomWidth: 1,
          borderBottomColor: GRAY_BORDER,
        }}>
          <Image
            source={require("../assets/Logo2.png")}
            style={{ width: 36, height: 36 }}
            resizeMode="contain"
          />
          <Pressable style={{
            width: 44, height: 44, borderRadius: 22,
            backgroundColor: "#f3f4f6",
            alignItems: "center", justifyContent: "center",
            position: "relative",
          }}>
            <Ionicons name="notifications-outline" size={22} color="#374151" />
            <View style={{
              position: "absolute", top: 6, right: 6,
              width: 14, height: 14, borderRadius: 7,
              backgroundColor: "#ef4444",
            }} />
          </Pressable>
        </View>

        {/* ── HEADER - STAFF DASHBOARD LABEL ── */}
        <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 4 }}>
          <Text style={{
            fontSize: 11,
            color: GRAY_TEXT,
            fontWeight: "600",
            letterSpacing: 0.6,
            marginBottom: 8
          }}>
            STAFF DASHBOARD
          </Text>

          {/* Welcome Message */}
          <View style={{ marginBottom: 4 }}>
            <Text style={{
              fontSize: 24,
              fontWeight: "800",
              color: DARK_TEXT,
              lineHeight: 31,
              letterSpacing: -0.5
            }}>
              Welcome back, <Text style={{ color: PRIMARY_GREEN }}>{user?.name?.split(" ")[0] || "User"}</Text>
            </Text>
          </View>

          {/* Company Name */}
          <Text style={{
            fontSize: 13,
            color: GRAY_TEXT,
            lineHeight: 18,
            fontWeight: "400",
            marginBottom: 2
          }}>
            Family Forever Inc.
          </Text>
        </View>

        {/* ── TODAY'S SHIFTS SECTION ── */}
        <View style={{ paddingHorizontal: 20, marginTop: 24, marginBottom: 16 }}>
          {/* Section Header */}
          <View style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 14,
          }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Text style={{ fontSize: 16, fontWeight: "800", color: DARK_TEXT, letterSpacing: -0.2 }}>
                Today's shifts
              </Text>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#22C55E" }} />
            </View>
            <Pressable onPress={() => router.push("/shifts")}>
              <Text style={{ fontSize: 14, color: PRIMARY_GREEN, fontWeight: "600", letterSpacing: -0.2 }}>
                View all →
              </Text>
            </Pressable>
          </View>

          {/* Shift Cards or Empty State */}
          {todayShifts.length === 0 ? (
            <View style={{
              backgroundColor: "#fff",
              borderRadius: 20,
              padding: 52,
              alignItems: "center",
              justifyContent: "center",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.04,
              shadowRadius: 8,
              elevation: 2,
              borderWidth: 1,
              borderColor: "#f3f4f6"
            }}>
              <Ionicons name="calendar-outline" size={60} color="#d1d5db" />
              <Text style={{
                fontSize: 18,
                fontWeight: "700",
                color: "#6b7280",
                marginTop: 20,
                letterSpacing: -0.3
              }}>
                No shifts today
              </Text>
            </View>
          ) : (
            todayShifts.map((shift) => (
              <ShiftCard
                key={shift.id}
                shift={shift}
                onConfirm={() => confirmShift(shift.id)}
                getInitials={getInitials}
              />
            ))
          )}
        </View>

        {/* ── QUICK STATS ── */}
        <View style={{ paddingHorizontal: 20, marginTop: 32, marginBottom: 8 }}>
          <View style={{
            backgroundColor: LIGHT_GREEN,
            borderRadius: 16,
            paddingHorizontal: 20, // 20px horizontally 
            paddingVertical: 24, // 24px vertically
            flexDirection: "row",
            justifyContent: "space-around",
            alignItems: "center",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.04,
            shadowRadius: 8,
            elevation: 2,
            borderWidth: 1,
            borderColor: "#dcfce7"
          }}>
            {/* Stat Item 1 */}
            <View style={{ flex: 1, alignItems: "center" }}>
              <Text style={{
                fontSize: 11,
                color: "#6B7280",
                fontWeight: "500",
                letterSpacing: 0.2,
                marginBottom: 10
              }}>
                This week
              </Text>
              <Text 
                numberOfLines={1} 
                adjustsFontSizeToFit
                style={{
                fontSize: 22,
                fontWeight: "800",
                color: DARK_TEXT,
                letterSpacing: -0.3,
                lineHeight: 28
              }}>
                12 shifts
              </Text>
            </View>

            {/* Divider */}
            <View style={{
              width: 1,
              height: 40,
              backgroundColor: "#E5E7EB",
              marginHorizontal: 16,
              opacity: 1
            }} />

            {/* Stat Item 2 */}
            <View style={{ flex: 1, alignItems: "center" }}>
              <Text style={{
                fontSize: 11,
                color: "#6B7280",
                fontWeight: "500",
                letterSpacing: 0.2,
                marginBottom: 10
              }}>
                Hours
              </Text>
              <Text 
                numberOfLines={1} 
                adjustsFontSizeToFit
                style={{
                fontSize: 22,
                fontWeight: "800",
                color: DARK_TEXT,
                letterSpacing: -0.3,
                lineHeight: 28
              }}>
                48.5 hrs
              </Text>
            </View>

            {/* Divider */}
            <View style={{
              width: 1.5,
              height: 48,
              backgroundColor: "#d1fae5",
              marginHorizontal: 16,
              opacity: 0.6
            }} />

            {/* Stat Item 3 */}
            <View style={{ flex: 1, alignItems: "center" }}>
              <Text style={{
                fontSize: 11,
                color: "#6B7280",
                fontWeight: "500",
                letterSpacing: 0.2,
                marginBottom: 10
              }}>
                Completed
              </Text>
              <Text 
                numberOfLines={1} 
                adjustsFontSizeToFit
                style={{
                fontSize: 22,
                fontWeight: "800",
                color: DARK_TEXT,
                letterSpacing: -0.3,
                lineHeight: 28
              }}>
                8 of 12
              </Text>
            </View>
          </View>
        </View>

        {/* ── DATE PICKER ── */}
        <View style={{ paddingHorizontal: 20, marginTop: 36 }}>
          <Text style={{
            fontSize: 16,
            fontWeight: "800",
            color: DARK_TEXT,
            marginBottom: 16,
            letterSpacing: -0.3
          }}>
            Select Date
          </Text>
          <View style={{
            backgroundColor: "#fff",
            borderRadius: 20,
            padding: 22,
            borderWidth: 1,
            borderColor: "#f0f0f0",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.04,
            shadowRadius: 10,
            elevation: 2
          }}>
            {/* Date Navigation */}
            <View style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 22,
            }}>
              <Pressable style={{
                width: 44, height: 44, borderRadius: 12,
                alignItems: "center", justifyContent: "center",
                backgroundColor: "#f9fafb",
              }} onPress={() => {
                const newDate = new Date(selectedDate);
                newDate.setDate(newDate.getDate() - 1);
                setSelectedDate(newDate);
              }}>
                <Ionicons name="chevron-back" size={28} color={PRIMARY_GREEN} />
              </Pressable>

              <Text style={{
                fontSize: 17,
                fontWeight: "800",
                color: DARK_TEXT,
                letterSpacing: -0.3
              }}>
                {selectedDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </Text>

              <Pressable style={{
                width: 44, height: 44, borderRadius: 12,
                alignItems: "center", justifyContent: "center",
                backgroundColor: "#f9fafb",
              }} onPress={() => {
                const newDate = new Date(selectedDate);
                newDate.setDate(newDate.getDate() + 1);
                setSelectedDate(newDate);
              }}>
                <Ionicons name="chevron-forward" size={28} color={PRIMARY_GREEN} />
              </Pressable>
            </View>

            {/* Quick Date Selection */}
            <View style={{
              flexDirection: "row",
              gap: 12,
            }}>
              {["Today", "Tomorrow", "+2 Days"].map((label, idx) => {
                const quickDate = new Date();
                quickDate.setDate(quickDate.getDate() + idx);
                const isSelected = selectedDate.toDateString() === quickDate.toDateString();

                return (
                  <Pressable
                    key={label}
                    onPress={() => setSelectedDate(quickDate)}
                    style={{
                      flex: 1,
                      paddingVertical: 14,
                      paddingHorizontal: 16,
                      borderRadius: 14,
                      backgroundColor: isSelected ? PRIMARY_GREEN : "#f3f4f6",
                      alignItems: "center",
                      justifyContent: "center",
                      borderWidth: isSelected ? 0 : 1,
                      borderColor: "#e5e7eb"
                    }}
                  >
                    <Text style={{
                      fontSize: 14,
                      fontWeight: "700",
                      color: isSelected ? "#fff" : "#374151",
                      letterSpacing: -0.2
                    }}>
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ShiftCard({ shift, onConfirm, getInitials }) {
  const parseLocations = (locationStr) => {
    if (!locationStr) return [];
    return locationStr.split(",").map((l) => l.trim()).filter((l) => l);
  };

  const locations = parseLocations(shift.location);

  return (
    <View style={{ marginBottom: 14 }}>
      {/* Confirmation Required Banner */}
      {!shift.shiftConfirmed && (
        <View style={{
          backgroundColor: "#fef3c7",
          paddingHorizontal: 14,
          paddingVertical: 10,
          borderRadius: 10,
          marginBottom: 10,
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
        }}>
          <Ionicons name="alert-circle" size={18} color="#d97706" />
          <Text style={{ fontSize: 13, fontWeight: "700", color: "#92400e" }}>
            Confirmation required
          </Text>
        </View>
      )}

      {/* Shift Card */}
      <View style={{
        backgroundColor: "#fff",
        borderRadius: 16,
        padding: 18,
        borderWidth: 1,
        borderColor: "#f0f0f0",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 1,
      }}>
        {/* Top row: service badge + time */}
        <View style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 14,
        }}>
          <View style={{
            backgroundColor: "#dbeafe",
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 8,
          }}>
            <Text style={{ fontSize: 12, fontWeight: "700", color: "#0c4a6e" }}>
              {shift.serviceType || "Service"}
            </Text>
          </View>
          <Text style={{ fontSize: 13, fontWeight: "700", color: "#374151" }}>
            {shift.startTime} – {shift.endTime}
          </Text>
        </View>

        {/* Client row: initials + name */}
        <View style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          marginBottom: 14,
        }}>
          <View style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: "#f3f4f6",
            alignItems: "center",
            justifyContent: "center",
          }}>
            <Text style={{ fontSize: 13, fontWeight: "800", color: "#374151" }}>
              {getInitials(shift.clientName || shift.name)}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, fontWeight: "800", color: "#111827" }}>
              {shift.clientName || shift.name || "Client"}
            </Text>
          </View>
        </View>

        {/* Locations as pills */}
        {locations.length > 0 && (
          <View style={{
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 6,
            marginBottom: 12,
          }}>
            {locations.slice(0, 3).map((loc, idx) => (
              <View
                key={idx}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 4,
                  backgroundColor: "#f3f4f6",
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  borderRadius: 6,
                }}
              >
                <Ionicons name="location" size={12} color="#6b7280" />
                <Text style={{ fontSize: 11, color: "#6b7280", fontWeight: "500" }}>
                  {loc.length > 15 ? loc.slice(0, 15) + "..." : loc}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Confirm Button */}
        {!shift.shiftConfirmed ? (
          <Pressable
            onPress={onConfirm}
            style={{
              borderWidth: 2,
              borderColor: PRIMARY_GREEN,
              borderRadius: 12,
              paddingVertical: 13,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "transparent",
            }}
          >
            <Text style={{ fontSize: 15, fontWeight: "800", color: PRIMARY_GREEN, letterSpacing: -0.2 }}>
              Confirm Shift
            </Text>
          </Pressable>
        ) : (
          <View style={{
            backgroundColor: "#d1fae5",
            borderRadius: 12,
            paddingVertical: 13,
            alignItems: "center",
            justifyContent: "center",
          }}>
            <Text style={{ fontSize: 15, fontWeight: "800", color: PRIMARY_GREEN, letterSpacing: -0.2 }}>
              ✓ Confirmed
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}
