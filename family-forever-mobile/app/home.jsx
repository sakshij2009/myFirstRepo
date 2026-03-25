import {
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
  Dimensions,
  Modal,
  ActivityIndicator
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { collection, query, onSnapshot, getDocs, where, updateDoc } from "firebase/firestore";
import { db } from "../src/firebase/config.jsx";
import { registerForPushNotifications } from "../src/utils/registerForPushNotifications";
import { router } from "expo-router";
import * as Location from "expo-location";

const { width } = Dimensions.get("window");

const PRIMARY_GREEN = "#1F6F43";
const LIGHT_GREEN = "#F0FDF4";
const STATS_GREEN = "#F3F4F6"; 
const DARK_TEXT = "#1A1A1A";
const GRAY_TEXT = "#9CA3AF";
const GRAY_LIGHT = "#F9FAFB";
const GRAY_BORDER = "rgba(0, 0, 0, 0.1)";
const ACCENT_YELLOW = "rgba(254, 249, 195, 0.5)";
const TEXT_YELLOW = "#92600A";
const BADGE_BLUE = "#DBEAFE";
const TEXT_BLUE = "#1E40AF";

export default function Home() {
  const [user, setUser] = useState(null);
  const [shifts, setShifts] = useState([]);
  const [confirmAction, setConfirmAction] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

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

  const calcTotalHours = (shiftList) => {
    let total = 0;
    shiftList.forEach((s) => {
      try {
        const parseTime = (t) => {
          if (!t) return 0;
          const [time, period] = t.split(" ");
          let [h, m] = time.split(":").map(Number);
          if (period?.toUpperCase() === "PM" && h !== 12) h += 12;
          if (period?.toUpperCase() === "AM" && h === 12) h = 0;
          return h + (m || 0) / 60;
        };
        const diff = parseTime(s.endTime) - parseTime(s.startTime);
        total += diff > 0 ? diff : diff + 24;
      } catch {}
    });
    return Math.round(total * 10) / 10;
  };

  const totalShifts = shifts.length;
  const totalHours = calcTotalHours(shifts);
  const confirmedShifts = shifts.filter((s) => s.shiftConfirmed || s.clockInTime || s.clockOutTime).length;

  const upcomingShifts = shifts.filter((s) => {
    const d = parseDate(s.startDate);
    if (!d) return false;
    d.setHours(0, 0, 0, 0);
    return d.getTime() > today.getTime();
  }).sort((a, b) => {
    const da = parseDate(a.startDate);
    const db = parseDate(b.startDate);
    return da - db;
  }).slice(0, 3);

  const handleConfirmAction = async () => {
    if (!confirmAction) return;
    setIsProcessing(true);
    const { type, shift } = confirmAction;
    try {
      if (type === 'confirm') {
        const q = query(collection(db, "shifts"), where("id", "==", shift.id));
        const snap = await getDocs(q);
        if (!snap.empty) await updateDoc(snap.docs[0].ref, { shiftConfirmed: true });
      } else {
        const coeff = 1000 * 60 * 15;
        const roundedDate = new Date(Math.round(new Date().getTime() / coeff) * coeff);
        const roundedTime = roundedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        let locStr = "Location unavailable";
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
           let loc = await Location.getCurrentPositionAsync({});
           let geocode = await Location.reverseGeocodeAsync({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
           if (geocode.length > 0) {
              locStr = `${geocode[0].streetNumber || ""} ${geocode[0].street || geocode[0].name || ""}, ${geocode[0].city || ""}`.trim();
           } else {
              locStr = `Lat: ${loc.coords.latitude.toFixed(4)}, Lon: ${loc.coords.longitude.toFixed(4)}`;
           }
        }

        const q = query(collection(db, "shifts"), where("id", "==", shift.id));
        const snap = await getDocs(q);
        if (!snap.empty) {
           if (type === 'clockIn') {
             await updateDoc(snap.docs[0].ref, { clockInTime: roundedTime, clockInLocation: locStr });
           } else {
             await updateDoc(snap.docs[0].ref, { clockOutTime: roundedTime, clockOutLocation: locStr });
           }
        }
      }
    } catch (e) {
      console.log("Error performing action", e);
    }
    setIsProcessing(false);
    setConfirmAction(null);
  };

  const getInitials = (name) => {
    if (!name) return "—";
    return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#FFF" }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
        scrollEventThrottle={16}
      >
        {/* ── HEADER ── */}
        <View style={{ paddingHorizontal: 16, paddingTop: 32, paddingBottom: 16 }}>
          <Text style={{
            fontSize: 11,
            color: "#9CA3AF",
            fontWeight: "500",
            letterSpacing: 0.8,
            marginBottom: 8,
            fontFamily: "Inter"
          }}>
            STAFF DASHBOARD
          </Text>

          <View style={{ marginBottom: 4 }}>
            <Text style={{
              fontSize: 22,
              fontWeight: "700",
              color: DARK_TEXT,
              letterSpacing: -0.4,
              fontFamily: "Poppins"
            }}>
              Welcome back, <Text style={{ color: PRIMARY_GREEN }}>{user?.name?.split(" ")[0] || "User"}</Text>
            </Text>
          </View>

          <Text style={{
            fontSize: 13,
            color: "#9CA3AF",
            fontFamily: "Inter",
            fontWeight: "400"
          }}>
            Family Forever Inc.
          </Text>
        </View>

        <View style={{ height: 32 }} />

        {/* ── TODAY'S SHIFTS ── */}
        <View style={{ paddingHorizontal: 16 }}>
          <View style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 20,
          }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Text style={{ fontSize: 16, fontWeight: "600", color: DARK_TEXT, fontFamily: "Poppins" }}>
                Today's shifts
              </Text>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: "#22C55E" }} />
            </View>
            <Pressable onPress={() => router.push("/shifts")} style={{ flexDirection: "row", alignItems: "center" }}>
              <Text style={{ fontSize: 14, color: PRIMARY_GREEN, fontWeight: "500", fontFamily: "Inter" }}>
                View all
              </Text>
              <Ionicons name="chevron-forward" size={14} color={PRIMARY_GREEN} style={{ marginLeft: 2 }} />
            </Pressable>
          </View>

          {todayShifts.length === 0 ? (
            <View style={{
              backgroundColor: "#FFF",
              borderRadius: 20,
              padding: 40,
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 1,
              borderColor: GRAY_BORDER,
              borderStyle: "dashed"
            }}>
              <Ionicons name="calendar-outline" size={40} color="#D1D5DB" />
              <Text style={{ fontSize: 16, color: GRAY_TEXT, marginTop: 12, fontWeight: "600" }}>
                No shifts today
              </Text>
            </View>
          ) : (
            todayShifts.map((shift) => (
              <ShiftCard
                key={shift.id}
                shift={shift}
                onAction={(type, s) => setConfirmAction({ type, shift: s })}
                onDetails={() => router.push({ pathname: "/_shift-details", params: { shiftId: shift.id } })}
                getInitials={getInitials}
              />
            ))
          )}
        </View>

        {/* ── STATS SECTION ── */}
        <View style={{ paddingHorizontal: 20, marginTop: 8 }}>
          <View style={{
            backgroundColor: STATS_GREEN,
            borderRadius: 16,
            paddingVertical: 18,
            flexDirection: "row",
            justifyContent: "space-around",
            alignItems: "center",
          }}>
            <View style={{ flex: 1, alignItems: "center" }}>
              <Text style={{ fontSize: 10, color: "#9CA3AF", fontWeight: "600", marginBottom: 4, textTransform: "uppercase" }}>Shifts</Text>
              <Text style={{ fontSize: 13, fontWeight: "700", color: DARK_TEXT }}>
                {totalShifts} total
              </Text>
            </View>
            <View style={{ width: 1, height: 24, backgroundColor: "#E5E7EB" }} />
            <View style={{ flex: 1, alignItems: "center" }}>
              <Text style={{ fontSize: 10, color: "#9CA3AF", fontWeight: "600", marginBottom: 4, textTransform: "uppercase" }}>Hours</Text>
              <Text style={{ fontSize: 13, fontWeight: "700", color: DARK_TEXT }}>
                {totalHours} hrs
              </Text>
            </View>
            <View style={{ width: 1, height: 24, backgroundColor: "#E5E7EB" }} />
            <View style={{ flex: 1, alignItems: "center" }}>
              <Text style={{ fontSize: 10, color: "#9CA3AF", fontWeight: "600", marginBottom: 4, textTransform: "uppercase" }}>Confirmed</Text>
              <Text style={{ fontSize: 13, fontWeight: "700", color: "#1F6F43" }}>
                {confirmedShifts} shifts
              </Text>
            </View>
          </View>
        </View>

        {/* ── COMING UP ── */}
        <View style={{ paddingHorizontal: 25, marginTop: 32 }}>
          <View style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 20,
          }}>
            <Text style={{ fontSize: 18, fontWeight: "800", color: DARK_TEXT }}>
              Coming up
            </Text>
            <Pressable onPress={() => router.push("/availability")} style={{ flexDirection: "row", alignItems: "center" }}>
              <Text style={{ fontSize: 14, color: PRIMARY_GREEN, fontWeight: "600" }}>
                My Availability
              </Text>
              <Ionicons name="chevron-forward" size={14} color={PRIMARY_GREEN} style={{ marginLeft: 4 }} />
            </Pressable>
          </View>

          {upcomingShifts.map((shift, idx) => {
            const date = parseDate(shift.startDate);
            const dayName = date ? date.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase() : "DAY";
            const dayNum = date ? date.getDate() : "00";

            return (
              <Pressable
                key={shift.id}
                onPress={() => router.push({ pathname: "/shifts", params: { shiftId: shift.id } })}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingVertical: 12,
                  borderBottomWidth: idx === upcomingShifts.length - 1 ? 0 : 1,
                  borderBottomColor: GRAY_BORDER,
                }}
              >
                <View style={{
                  width: 50,
                  height: 50,
                  backgroundColor: LIGHT_GREEN,
                  borderRadius: 10,
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 16
                }}>
                  <Text style={{ fontSize: 10, fontWeight: "800", color: PRIMARY_GREEN }}>{dayName}</Text>
                  <Text style={{ fontSize: 16, fontWeight: "800", color: PRIMARY_GREEN }}>{dayNum}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: "700", color: DARK_TEXT }} numberOfLines={1}>
                    {shift.serviceType} • {shift.clientName || shift.name}
                  </Text>
                  <Text style={{ fontSize: 13, color: GRAY_TEXT, marginTop: 2 }}>
                    {shift.startTime} – {shift.endTime}
                  </Text>
                </View>
                {!shift.shiftConfirmed && (
                  <View style={{
                    width: 22,
                    height: 22,
                    borderRadius: 11,
                    backgroundColor: "#EF4444",
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: 12
                  }}>
                    <Ionicons name="alert" size={14} color="#FFF" />
                  </View>
                )}
                <Ionicons name="chevron-forward" size={18} color="#D1D5DB" />
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      {confirmAction && (
        <Modal transparent visible animationType="fade">
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
            <View style={{ backgroundColor: '#FFF', borderRadius: 24, padding: 24, width: '100%', alignItems: 'center' }}>
              <View style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: '#F0FDF4', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                <Ionicons name="checkmark" size={24} color="#1F6F43" />
              </View>
              <Text style={{ fontSize: 20, fontWeight: '700', color: '#1A1A1A', fontFamily: 'Poppins', marginBottom: 20 }}>
                {confirmAction.type === 'confirm' ? 'Confirm this shift?' : 
                 confirmAction.type === 'clockIn' ? 'Clock in to this shift?' : 'Clock out of this shift?'}
              </Text>
              
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#1A1A1A', marginBottom: 6, fontFamily: 'Inter' }}>
                {confirmAction.shift.category || confirmAction.shift.serviceType} · {confirmAction.shift.clientName || confirmAction.shift.name}
              </Text>
              <Text style={{ fontSize: 13, color: '#6B7280', marginBottom: 6, fontFamily: 'Inter' }}>
                {confirmAction.shift.startDate || new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} · {confirmAction.shift.startTime} – {confirmAction.shift.endTime}
              </Text>
              <Text style={{ fontSize: 13, color: '#6B7280', marginBottom: 20, textAlign: 'center', paddingHorizontal: 10, fontFamily: 'Inter' }}>
                {confirmAction.shift.location || "Location not specified"}
              </Text>

              {confirmAction.type !== 'confirm' && (
                <View style={{ width: '100%', backgroundColor: '#F3F4F6', borderRadius: 12, padding: 12, marginBottom: 16 }}>
                  <Text style={{ fontSize: 12, fontWeight: "600", color: "#1A1A1A", marginBottom: 2, fontFamily: 'Inter' }}>
                    <Ionicons name="time-outline" size={13} color="#1F6F43"/> Time logged inside sheet
                  </Text>
                  <Text style={{ fontSize: 13, color: "#6B7280", fontFamily: 'Inter', marginBottom: 8 }}>
                    Current Time (Rounded 15m): <Text style={{ fontWeight: '700', color: '#1A1A1A' }}>
                      {new Date(Math.round(new Date().getTime() / (1000*60*15)) * (1000*60*15)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </Text>
                  <Text style={{ fontSize: 12, fontWeight: "600", color: "#1A1A1A", marginBottom: 2, fontFamily: 'Inter' }}>
                    <Ionicons name="location-outline" size={13} color="#1F6F43"/> GPS Location
                  </Text>
                  <Text style={{ fontSize: 13, color: "#6B7280", fontFamily: 'Inter' }}>
                    Your exact location will be attached to this timesheet entry.
                  </Text>
                </View>
              )}
      
              <Text style={{ fontSize: 13, color: '#6B7280', textAlign: 'center', marginBottom: 24, lineHeight: 20, fontFamily: 'Inter' }}>
                {confirmAction.type === 'confirm' ? 'By confirming, you acknowledge this shift assignment and commit to attending.' :
                 confirmAction.type === 'clockIn' ? 'By clocking in, your time & location will be logged for payroll and assignment tracking.' :
                 'By clocking out, your shift will be marked as complete and your report will be finalized.'}
              </Text>
      
              <Pressable 
                onPress={handleConfirmAction}
                disabled={isProcessing}
                style={{ width: '100%', backgroundColor: '#1F6F43', height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 16, opacity: isProcessing ? 0.7 : 1 }}
              >
                {isProcessing ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={{ color: '#FFF', fontSize: 15, fontWeight: '600', fontFamily: 'Poppins' }}>
                    {confirmAction.type === 'confirm' ? 'Yes, Confirm Shift' : confirmAction.type === 'clockIn' ? 'Yes, Clock In' : 'Yes, Clock Out'}
                  </Text>
                )}
              </Pressable>
      
              <Pressable onPress={() => setConfirmAction(null)} disabled={isProcessing} style={{ paddingVertical: 8 }}>
                <Text style={{ color: '#6B7280', fontSize: 14, fontWeight: '600', fontFamily: 'Inter' }}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

function ShiftCard({ shift, onAction, onDetails, getInitials }) {
  const getStatus = () => {
    if (shift.clockOutTime) return "completed";
    if (shift.clockInTime) return "active";
    return shift.shiftConfirmed ? "confirmed" : "assigned";
  };
  const status = getStatus();
  const parseLocations = (locationStr) => {
    if (!locationStr) return [];
    return locationStr.split(",").map((l) => l.trim()).filter((l) => l);
  };

  const locations = parseLocations(shift.location);
  const catName = shift.category || shift.serviceType || "Service";
  const isTransportation = catName.toLowerCase().includes("transportation");

  return (
    <View style={{
      backgroundColor: "#FFF",
      borderRadius: 10,
      marginBottom: 20,
      overflow: "hidden",
      borderWidth: 0.8,
      borderColor: GRAY_BORDER,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 10,
      elevation: 2,
    }}>
      {/* Banner */}
      {!shift.shiftConfirmed && (
        <View style={{
          backgroundColor: ACCENT_YELLOW,
          paddingHorizontal: 16,
          paddingVertical: 12,
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
        }}>
          <Ionicons name="time-outline" size={18} color="#A16207" />
          <Text style={{ fontSize: 13, fontWeight: "700", color: TEXT_YELLOW }}>
            Confirmation required
          </Text>
        </View>
      )}

      <View style={{ padding: 18 }}>
        {/* Top Row */}
        <View style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}>
          <View style={{
            backgroundColor: BADGE_BLUE,
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: 8,
          }}>
            <Text style={{ fontSize: 12, fontWeight: "700", color: TEXT_BLUE }}>
              {catName}
            </Text>
          </View>
          <Text style={{ fontSize: 14, fontWeight: "700", color: GRAY_TEXT }}>
            {shift.startTime} – {shift.endTime}
          </Text>
        </View>

        {/* Client Row */}
        <View style={{
          flexDirection: "row",
          alignItems: "center",
          marginBottom: 16,
        }}>
          <View style={{ position: "relative" }}>
            <View style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: GRAY_BORDER,
              alignItems: "center",
              justifyContent: "center",
            }}>
              <Text style={{ fontSize: 14, fontWeight: "800", color: GRAY_TEXT }}>
                {getInitials(shift.clientName || shift.name)}
              </Text>
            </View>
            <View style={{
              position: "absolute",
              bottom: 0,
              right: 0,
              width: 12,
              height: 12,
              borderRadius: 6,
              backgroundColor: "#22C55E",
              borderWidth: 2,
              borderColor: "#FFF"
            }} />
          </View>
          <Text style={{ fontSize: 17, fontWeight: "800", color: DARK_TEXT, marginLeft: 12 }}>
            {shift.clientName || shift.name || "Client"}
          </Text>
        </View>

        {/* Multi-stop Route for Transportation */}
        {isTransportation && locations.length >= 2 ? (
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 20 }}>
             <Ionicons name="navigate-outline" size={16} color={PRIMARY_GREEN} />
             <View style={{ flexDirection: "row", alignItems: "center", marginLeft: 8, flex: 1 }}>
                <Text style={{ fontSize: 12, color: DARK_TEXT, fontWeight: "600", fontFamily: "Inter" }}>{locations[0].split(",")[0]}</Text>
                <View style={{ height: 1, flex: 1, backgroundColor: "#E5E7EB", marginHorizontal: 6, borderStyle: "dashed", borderRadius: 1, borderWidth: 0.5 }} />
                <Ionicons name="business-outline" size={14} color={PRIMARY_GREEN} />
                <Text style={{ fontSize: 12, color: DARK_TEXT, fontWeight: "600", marginLeft: 4, fontFamily: "Inter" }}>{locations[1].split(",")[0]}</Text>
                <View style={{ height: 1, flex: 1, backgroundColor: "#E5E7EB", marginHorizontal: 6, borderStyle: "dashed", borderRadius: 1, borderWidth: 0.5 }} />
                <Ionicons name="flag-outline" size={14} color="#EF4444" />
                <Text style={{ fontSize: 12, color: DARK_TEXT, fontWeight: "600", marginLeft: 4, fontFamily: "Inter" }}>{locations[2]?.split(",")[0] || "End"}</Text>
             </View>
          </View>
        ) : (
          <View style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            marginBottom: 20,
          }}>
            <Ionicons name="location-outline" size={18} color={GRAY_TEXT} />
            <Text style={{ fontSize: 13, color: GRAY_TEXT, fontWeight: "400", flex: 1, fontFamily: "Inter" }}>
              {locations[0] || "No location provided"}
            </Text>
          </View>
        )}

        {/* Button */}
        {status === 'assigned' && (
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Pressable
              onPress={() => onAction('confirm', shift)}
              style={{ flex: 1, borderWidth: 1.2, borderColor: PRIMARY_GREEN, borderRadius: 14, paddingVertical: 12, alignItems: "center", justifyContent: "center", marginRight: 16 }}
            >
              <Text style={{ fontSize: 15, fontWeight: "600", color: PRIMARY_GREEN, fontFamily: "Poppins" }}>
                Confirm Shift
              </Text>
            </Pressable>
            <Pressable onPress={onDetails}>
              <Text style={{ fontSize: 14, fontWeight: "600", color: PRIMARY_GREEN, fontFamily: "Inter" }}>Details &gt;</Text>
            </Pressable>
          </View>
        )}
        
        {status === 'confirmed' && (
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Pressable
              onPress={() => onAction('clockIn', shift)}
              style={{ flex: 1, backgroundColor: PRIMARY_GREEN, borderRadius: 14, paddingVertical: 14, alignItems: "center", justifyContent: "center", marginRight: 16 }}
            >
              <Text style={{ fontSize: 15, fontWeight: "600", color: "#FFF", fontFamily: "Poppins" }}>
                Clock In
              </Text>
            </Pressable>
            <Pressable onPress={onDetails}>
              <Text style={{ fontSize: 14, fontWeight: "600", color: PRIMARY_GREEN, fontFamily: "Inter" }}>Details &gt;</Text>
            </Pressable>
          </View>
        )}

        {status === 'active' && (
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Pressable
              onPress={() => onAction('clockOut', shift)}
              style={{ flex: 1, backgroundColor: "#FFF", borderWidth: 1.2, borderColor: PRIMARY_GREEN, borderRadius: 14, paddingVertical: 12, alignItems: "center", justifyContent: "center", marginRight: 16 }}
            >
              <Text style={{ fontSize: 15, fontWeight: "600", color: PRIMARY_GREEN, fontFamily: "Poppins" }}>
                Clock Out
              </Text>
            </Pressable>
            <Pressable onPress={onDetails}>
              <Text style={{ fontSize: 14, fontWeight: "600", color: PRIMARY_GREEN, fontFamily: "Inter" }}>Details &gt;</Text>
            </Pressable>
          </View>
        )}

        {status === 'completed' && (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View style={{ flex: 1, backgroundColor: LIGHT_GREEN, borderRadius: 14, paddingVertical: 14, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ fontSize: 15, fontWeight: "800", color: PRIMARY_GREEN }}>
                ✓ Completed
              </Text>
            </View>
            <Pressable onPress={onDetails}>
              <Text style={{ fontSize: 14, fontWeight: "600", color: PRIMARY_GREEN, fontFamily: "Inter" }}>Details &gt;</Text>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}

