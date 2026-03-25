import {
  View,
  Text,
  ScrollView,
  Pressable,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { collection, query, onSnapshot, getDocs, where, updateDoc } from "firebase/firestore";
import { db } from "../src/firebase/config.jsx";
import { router } from "expo-router";

const serviceTypeStyles = {
  "Respite Care": { bg: "#EBF5FF", text: "#1E5FA6" },
  "Emergent Care": { bg: "#FEF2F2", text: "#B91C1C" },
  "Emergency Care": { bg: "#FEF2F2", text: "#B91C1C" },
  "Transportation": { bg: "#FFF8E1", text: "#92600A" },
  "Supervised Visitation": { bg: "#F3F0FF", text: "#5B21B6" },
  default: { bg: "#d1fae5", text: "#1f5f3b" },
};

const statusStyles = {
  Assigned: { bg: "#FFF8E1", text: "#92600A" },
  Confirmed: { bg: "#F0FDF4", text: "#1F6F43" },
  Pending: { bg: "#FFF8E1", text: "#92600A" },
  "In Progress": { bg: "#EBF5FF", text: "#1E5FA6" },
  Completed: { bg: "#F3F4F6", text: "#6B7280" },
};

function ShiftCard({ shift, onConfirm, onDetails }) {
  const serviceType = shift.serviceType || "Service";
  const status = shift.shiftConfirmed ? "Confirmed" : "Assigned";
  const serviceStyle = serviceTypeStyles[serviceType] || serviceTypeStyles.default;
  const statusStyle = statusStyles[status] || statusStyles.Assigned;

  const clientName = shift.clientName || shift.name || "Client";
  const clientInitials = clientName.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  const location = shift.location || "Location not specified";
  
  const calculateDuration = (start, end) => {
    if (!start || !end) return "";
    try {
      const parseTime = (timeStr) => {
        const [time, period] = timeStr.split(" ");
        let [hours, mins] = time.split(":").map(Number);
        if (period?.toUpperCase() === "PM" && hours !== 12) hours += 12;
        if (period?.toUpperCase() === "AM" && hours === 12) hours = 0;
        return hours + (mins || 0) / 60;
      };
      const s = parseTime(start);
      const e = parseTime(end);
      let diff = e - s;
      if (diff < 0) diff += 24;
      return `${Math.round(diff * 10) / 10} hrs`;
    } catch {
      return "";
    }
  };
  
  const duration = calculateDuration(shift.startTime, shift.endTime) || "Shift";

  return (
    <Pressable
      onPress={onDetails}
      style={{
        backgroundColor: "#fff",
        borderRadius: 16,
        marginBottom: 16,
        overflow: "hidden",
        elevation: 2,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
      }}
    >
      {status === 'Assigned' && (
        <View style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: "#FFF8E1",
          paddingHorizontal: 16,
          paddingVertical: 10,
          gap: 8,
        }}>
          <Ionicons name="time-outline" size={16} color="#92600A" />
          <Text style={{ fontSize: 12, fontWeight: "600", color: "#92600A", letterSpacing: 0.2 }}>
            Confirmation required
          </Text>
        </View>
      )}

      <View style={{ padding: 20 }}>
        {/* Top row */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <View style={{ backgroundColor: serviceStyle.bg, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 16 }}>
            <Text style={{ fontSize: 11, fontWeight: "600", color: serviceStyle.text }}>
              {serviceType}
            </Text>
          </View>
          <View style={{ backgroundColor: statusStyle.bg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 16 }}>
             <Text style={{ fontSize: 11, fontWeight: "500", color: statusStyle.text }}>
               {status}
             </Text>
          </View>
        </View>

        {/* Time row */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Ionicons name="time-outline" size={14} color="#9CA3AF" />
            <Text style={{ fontSize: 14, fontWeight: "600", color: "#1A1A1A" }}>
              {shift.startTime} – {shift.endTime}
            </Text>
          </View>
          <View style={{ backgroundColor: "#F3F4F6", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 }}>
            <Text style={{ fontSize: 12, fontWeight: "500", color: "#6B7280" }}>
              {duration}
            </Text>
          </View>
        </View>

        {/* Client row */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "#E0F2FE", alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontSize: 14, fontWeight: "600", color: "#6B7280" }}>{clientInitials}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, fontWeight: "600", color: "#1A1A1A" }}>{clientName}</Text>
            <Text style={{ fontSize: 12, color: "#9CA3AF" }}>ID: {shift.clientId || shift.id?.slice(-6) || "N/A"}</Text>
          </View>
        </View>

        {/* Location row */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 16 }}>
          <Ionicons name="location-outline" size={14} color="#9CA3AF" />
          <Text style={{ fontSize: 13, color: "#6B7280" }} numberOfLines={1}>{location}</Text>
        </View>

        {/* Divider */}
        <View style={{ height: 1, backgroundColor: "#F3F4F6", marginBottom: 16 }} />

        {/* Action row */}
        {status === 'Assigned' && (
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Pressable
              onPress={onConfirm}
              style={{
                height: 40,
                borderWidth: 1.5,
                borderColor: "#1F6F43",
                borderRadius: 10,
                alignItems: "center",
                justifyContent: "center",
                width: "55%",
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: "600", color: "#1F6F43" }}>Confirm Shift</Text>
            </Pressable>
            <Text style={{ fontSize: 13, fontWeight: "500", color: "#1F6F43" }}>Details &gt;</Text>
          </View>
        )}

        {status === 'Confirmed' && (
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Pressable
              onPress={onDetails}
              style={{
                height: 40,
                backgroundColor: "#1F6F43",
                borderRadius: 10,
                alignItems: "center",
                justifyContent: "center",
                width: "55%",
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: "600", color: "#FFF" }}>Check In</Text>
            </Pressable>
            <Text style={{ fontSize: 13, fontWeight: "500", color: "#1F6F43" }}>Details &gt;</Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

export default function Shifts() {
  const [user, setUser] = useState(null);
  const [shifts, setShifts] = useState([]);
  const [activeTab, setActiveTab] = useState("Upcoming");
  const [selectedShift, setSelectedShift] = useState(null);

  useEffect(() => {
    const load = async () => {
      const stored = await AsyncStorage.getItem("user");
      if (stored) setUser(JSON.parse(stored));
    };
    load();
  }, []);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "shifts"));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const mine = data.filter(
        (s) =>
          s?.name?.toLowerCase() === user?.name?.toLowerCase() ||
          s?.userId === user?.userId
      );
      mine.sort((a, b) => {
        const da = parseDate(a.startDate);
        const db2 = parseDate(b.startDate);
        if (!da || !db2) return 0;
        return db2 - da; // Descending order: latest first
      });
      setShifts(mine);
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

  const filtered = shifts.filter((s) => {
    const d = parseDate(s.startDate);
    if (!d) return activeTab === "All";
    d.setHours(0, 0, 0, 0);
    if (activeTab === "Upcoming") return d.getTime() >= today.getTime();
    if (activeTab === "Past") return d.getTime() < today.getTime();
    // "In Progress" could be shifts today right now, but we'll map Today into Upcoming logic for simplicity.
    if (activeTab === "In Progress") return d.getTime() === today.getTime();
    return true;
  });

  const grouped = filtered.reduce((acc, shift) => {
    const key = shift.startDate || "Unknown";
    if (!acc[key]) acc[key] = [];
    acc[key].push(shift);
    return acc;
  }, {});

  const confirmShift = async (shiftId) => {
    try {
      const q = query(collection(db, "shifts"), where("id", "==", shiftId));
      const snap = await getDocs(q);
      if (!snap.empty) {
        await updateDoc(snap.docs[0].ref, { shiftConfirmed: true });
      }
    } catch (e) {
      console.log("Error confirming", e);
    }
  };

  const formatDateHeader = (dateStr) => {
    const d = parseDate(dateStr);
    if (!d) return dateStr;
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    d.setHours(0, 0, 0, 0);
    const dateFormatted = d.toLocaleDateString("en-CA", { month: "short", day: "numeric" });
    if (d.getTime() === now.getTime()) return "Today · " + dateFormatted;
    if (d.getTime() === now.getTime() + 86400000) return "Tomorrow · " + dateFormatted;
    return d.toLocaleDateString("en-CA", { weekday: "long", month: "short", day: "numeric" });
  };

  const getShiftCount = () => {
    const len = Object.values(grouped).flat().length;
    switch (activeTab) {
      case "Upcoming": return `${len} upcoming shifts`;
      case "In Progress": return `${len} in progress`;
      case "Past": return `${len} past shifts`;
      case "All": return `${len} total shifts`;
      default: return "";
    }
  };

  const getFloatingActionText = () => {
    const shiftsInTab = Object.values(grouped).flat();
    const count = shiftsInTab.length;
    let totalHrs = 0;
    shiftsInTab.forEach(s => {
      try {
        const parseTime = (timeStr) => {
          if (!timeStr) return 0;
          const [time, period] = timeStr.split(" ");
          let [hours, mins] = time.split(":").map(Number);
          if (period?.toUpperCase() === "PM" && hours !== 12) hours += 12;
          if (period?.toUpperCase() === "AM" && hours === 12) hours = 0;
          return hours + (mins || 0) / 60;
        };
        if (s.startTime && s.endTime) {
          let diff = parseTime(s.endTime) - parseTime(s.startTime);
          if (diff < 0) diff += 24;
          totalHrs += diff;
        }
      } catch (e) {
        // ignore malformed times
      }
    });

    const roundedHrs = Math.round(totalHrs * 10) / 10;
    
    if (activeTab === "Upcoming") return `Upcoming: ${count} shifts · ${roundedHrs} hrs`;
    if (activeTab === "In Progress") return `In Progress: ${count} shifts · ${roundedHrs} hrs`;
    if (activeTab === "Past") return `Past: ${count} shifts · ${roundedHrs} hrs`;
    return `Total: ${count} shifts · ${roundedHrs} hrs`;
  };

  const getServiceColor = (type) => serviceTypeStyles[type] || serviceTypeStyles.default;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F8F8F6" }} edges={['top']}>
      {!selectedShift ? (
        <>
          {/* ── HEADER ── */}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20, marginTop: 8, paddingHorizontal: 20 }}>
            <Pressable onPress={() => router.push("/home")} style={{ width: 40, height: 40, justifyContent: "center", marginLeft: -8 }}>
              <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
            </Pressable>
            
            <View style={{ flex: 1, alignItems: "center" }}>
              <Text style={{ fontSize: 18, fontWeight: "600", color: "#1A1A1A" }}>
                My Shifts
              </Text>
              <Text style={{ fontSize: 12, color: "#9CA3AF" }}>
                {user?.name || "User"} | Staff
              </Text>
            </View>
            
            <Pressable style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "#F3F4F6", alignItems: "center", justifyContent: "center" }}>
              <Ionicons name="options-outline" size={20} color="#6B7280" />
            </Pressable>
          </View>

          {/* ── FILTER TABS ── */}
          <View style={{ paddingHorizontal: 20, paddingBottom: 16 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {["Upcoming", "In Progress", "Past", "All"].map((tab) => (
                <Pressable
                  key={tab}
                  onPress={() => setActiveTab(tab)}
                  style={{
                    paddingHorizontal: 18,
                    paddingVertical: 10,
                    borderRadius: 20,
                    backgroundColor: activeTab === tab ? "#1F6F43" : "#F3F4F6",
                  }}
                >
                  <Text style={{
                    fontSize: 13,
                    fontWeight: activeTab === tab ? "600" : "500",
                    color: activeTab === tab ? "#fff" : "#6B7280",
                  }}>
                    {tab}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          {/* ── SHIFT LIST ── */}
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}>
            <Text style={{ fontSize: 13, color: "#9CA3AF", marginBottom: 16 }}>
              {getShiftCount()}
            </Text>

            {Object.keys(grouped).length === 0 ? (
              <View style={{
                backgroundColor: "#fff", borderRadius: 16,
                padding: 40, alignItems: "center",
                borderWidth: 1, borderColor: "#e5e7eb",
              }}>
                <Ionicons name="calendar-outline" size={52} color="#d1d5db" />
                <Text style={{ fontSize: 16, fontWeight: "700", color: "#9ca3af", marginTop: 14 }}>
                  No {activeTab.toLowerCase()} shifts found
                </Text>
              </View>
            ) : (
              Object.entries(grouped)
                .sort(([keyA], [keyB]) => {
                  const da = parseDate(keyA);
                  const db2 = parseDate(keyB);
                  if (!da || !db2) return 0;
                  return db2 - da;
                })
                .map(([dateKey, dayShifts]) => (
                <View key={dateKey} style={{ marginBottom: 12 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 16, marginTop: 8 }}>
                    <Text style={{ fontSize: 14, fontWeight: "600", color: "#1A1A1A" }}>
                      {formatDateHeader(dateKey)}
                    </Text>
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: "#22C55E" }} />
                  </View>

                  {dayShifts.map((shift) => (
                    <ShiftCard
                      key={shift.id}
                      shift={shift}
                      onConfirm={() => confirmShift(shift.id)}
                      onDetails={() => setSelectedShift(shift)}
                    />
                  ))}
                </View>
              ))
            )}
          </ScrollView>

          {/* ── FLOATING QUICK ACTION ── */}
          <View style={{ position: "absolute", bottom: 20, alignSelf: "center", zIndex: 10 }}>
            <View style={{
              backgroundColor: "#1F6F43",
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 20,
              shadowColor: "#1F6F43",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.2,
              shadowRadius: 12,
              elevation: 5,
            }}>
              <Text style={{ fontSize: 12, fontWeight: "500", color: "#fff" }}>
                {getFloatingActionText()}
              </Text>
            </View>
          </View>
        </>
      ) : (
        <ShiftDetailView
          shift={selectedShift}
          user={user}
          onClose={() => setSelectedShift(null)}
          onConfirm={() => confirmShift(selectedShift.id)}
          onReport={() => {
            const sid = selectedShift.id;
            setSelectedShift(null);
            router.push({ pathname: "/_report", params: { shiftId: sid } });
          }}
          getServiceColor={getServiceColor}
        />
      )}
    </SafeAreaView>
  );
}

/* ── SHIFT DETAIL VIEW (NON-MODAL) ── */
function ShiftDetailView({ shift, user, onClose, onConfirm, onReport, getServiceColor }) {
  const sc = getServiceColor(shift.serviceType || "Service");
  const isConfirmed = !!shift.shiftConfirmed;
  const [shiftLocked, setShiftLocked] = useState(false);
  
  const clientName = shift.clientName || shift.name || "Client";
  const clientInitials = clientName.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  const staffName = user?.name || "Staff Member";
  const staffInitials = staffName.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

  const calculateDuration = (start, end) => {
    if (!start || !end) return "4 hours";
    try {
      const parseTime = (timeStr) => {
        const [time, period] = timeStr.split(" ");
        let [hours, mins] = time.split(":").map(Number);
        if (period?.toUpperCase() === "PM" && hours !== 12) hours += 12;
        if (period?.toUpperCase() === "AM" && hours === 12) hours = 0;
        return hours * 60 + (mins || 0);
      };
      const diff = parseTime(end) - parseTime(start);
      const m = diff < 0 ? diff + 1440 : diff;
      const h = Math.floor(m / 60);
      const rem = m % 60;
      return rem > 0 ? `${h}h ${rem}m` : `${h} hours`;
    } catch { return "4 hours"; }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#F8F8F6" }}>
      {/* Header */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16 }}>
        <Pressable onPress={onClose} style={{ width: 40, height: 40, justifyContent: "center", marginLeft: -8 }}>
          <Ionicons name="arrow-back" size={24} color="#101828" />
        </Pressable>
        <View style={{ flex: 1, alignItems: "center" }}>
          <Text style={{ fontSize: 18, fontWeight: "600", color: "#101828" }}>Shift Details</Text>
          <Text style={{ fontSize: 12, color: "#9CA3AF" }}>{shift.startDate || "Date missing"}</Text>
        </View>
        <Pressable style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="ellipsis-vertical" size={24} color="#6B7280" />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120 }}>
        
        {/* Status Banner */}
        {!isConfirmed ? (
          <View style={{ backgroundColor: "#FFF8E1", borderRadius: 12, padding: 12, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 20 }}>
            <Ionicons name="time-outline" size={20} color="#92600A" />
            <Text style={{ fontSize: 13, fontWeight: "600", color: "#92600A" }}>Assigned · Awaiting Your Confirmation</Text>
          </View>
        ) : (
          <View style={{ backgroundColor: "#F0FDF4", borderRadius: 12, padding: 12, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Ionicons name="checkmark-circle" size={20} color="#1F6F43" />
              <Text style={{ fontSize: 13, fontWeight: "600", color: "#1F6F43" }}>Confirmed · Upcoming</Text>
            </View>
          </View>
        )}

        {/* Client Pairing Card */}
        <View style={{ backgroundColor: "#fff", borderRadius: 16, padding: 20, marginBottom: 16, elevation: 1, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
            <View style={{ alignItems: "center", flex: 1 }}>
              <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: "#F0FDF4", alignItems: "center", justifyContent: "center", marginBottom: 8 }}>
                <Text style={{ fontSize: 16, fontWeight: "600", color: "#1F6F43" }}>{clientInitials}</Text>
              </View>
              <Text style={{ fontSize: 14, fontWeight: "600", color: "#1A1A1A", textAlign: "center" }}>{clientName}</Text>
              <Text style={{ fontSize: 11, color: "#9CA3AF" }}>ID: {shift.clientId || "N/A"}</Text>
            </View>

            <View style={{ flex: 0.5, alignItems: "center", justifyContent: "center", paddingTop: 16 }}>
              <Ionicons name="arrow-forward" size={16} color="#D1D5DB" />
            </View>

            <View style={{ alignItems: "center", flex: 1 }}>
              <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: "#F3F0FF", alignItems: "center", justifyContent: "center", marginBottom: 8 }}>
                <Text style={{ fontSize: 16, fontWeight: "600", color: "#5B21B6" }}>{staffInitials}</Text>
              </View>
              <Text style={{ fontSize: 14, fontWeight: "600", color: "#1A1A1A", textAlign: "center" }}>{staffName}</Text>
              <Text style={{ fontSize: 11, color: "#9CA3AF" }}>Staff ID: {user?.userId?.slice(-6).toUpperCase() || "N/A"}</Text>
            </View>
          </View>
          
          <View style={{ alignItems: "center" }}>
            <View style={{ backgroundColor: sc.bg, paddingHorizontal: 14, paddingVertical: 4, borderRadius: 16 }}>
              <Text style={{ fontSize: 12, fontWeight: "600", color: sc.text }}>{shift.serviceType || "Service"}</Text>
            </View>
          </View>

          <View style={{ borderTopWidth: 1, borderTopColor: "#F3F4F6", marginTop: 16, paddingTop: 12, alignItems: "center" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Ionicons name="card-outline" size={16} color="#1F6F43" />
              <Text style={{ fontSize: 13, fontWeight: "500", color: "#1F6F43" }}>Show ID Card to Parent</Text>
            </View>
          </View>
        </View>

        {/* Info Card */}
        <View style={{ backgroundColor: "#fff", borderRadius: 16, padding: 20, marginBottom: 24, elevation: 1, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8 }}>
          
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" }}>
            <Text style={{ fontSize: 12, color: "#9CA3AF", fontWeight: "600" }}>SHIFT TYPE</Text>
            <Text style={{ fontSize: 14, color: "#1A1A1A", fontWeight: "500" }}>Regular</Text>
          </View>

          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" }}>
            <Text style={{ fontSize: 12, color: "#9CA3AF", fontWeight: "600", marginTop: 2 }}>DATE & TIME</Text>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={{ fontSize: 14, color: "#1A1A1A", fontWeight: "500" }}>{shift.startDate}</Text>
              <Text style={{ fontSize: 12, color: "#9CA3AF" }}>{shift.startTime} – {shift.endTime}</Text>
            </View>
          </View>

          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" }}>
            <Text style={{ fontSize: 12, color: "#9CA3AF", fontWeight: "600" }}>DURATION</Text>
            <Text style={{ fontSize: 14, color: "#1A1A1A", fontWeight: "500" }}>{calculateDuration(shift.startTime, shift.endTime)}</Text>
          </View>

          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" }}>
            <Text style={{ fontSize: 12, color: "#9CA3AF", fontWeight: "600" }}>LOCATION</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Text style={{ fontSize: 13, color: "#1F6F43", fontWeight: "500", maxWidth: 180 }} numberOfLines={1}>{shift.location || "Not specified"}</Text>
              <Ionicons name="arrow-forward" size={12} style={{ transform: [{rotate: "-45deg"}]}} color="#1F6F43" />
            </View>
          </View>

          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12 }}>
            <Text style={{ fontSize: 12, color: "#9CA3AF", fontWeight: "600" }}>STATUS</Text>
            <View style={{ backgroundColor: isConfirmed ? "#F0FDF4" : "#FFF8E1", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
              <Text style={{ fontSize: 12, color: isConfirmed ? "#1F6F43" : "#92600A", fontWeight: "600" }}>
                Active · {isConfirmed ? "Confirmed" : "Pending"}
              </Text>
            </View>
          </View>

          <View style={{ paddingTop: 16, marginTop: 4, borderTopWidth: 1, borderTopColor: "#F3F4F6", flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <Ionicons name="lock-closed-outline" size={16} color="#6B7280" />
                <Text style={{ fontSize: 14, color: "#1A1A1A", fontWeight: "600" }}>Shift Lock</Text>
              </View>
              <Text style={{ fontSize: 11, color: "#9CA3AF" }}>Prevents accidental modifications</Text>
            </View>
            <Pressable
              onPress={() => setShiftLocked(!shiftLocked)}
              style={{ width: 44, height: 24, borderRadius: 12, backgroundColor: shiftLocked ? "#1F6F43" : "#E5E7EB", justifyContent: "center", paddingHorizontal: 2 }}
            >
              <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: "#fff", transform: [{ translateX: shiftLocked ? 20 : 0 }] }} />
            </Pressable>
          </View>
        </View>

        {/* Timeline Card */}
        <View style={{ backgroundColor: "#fff", borderRadius: 16, padding: 20, marginBottom: 24, elevation: 1, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8 }}>
          <Text style={{ fontSize: 14, fontWeight: "600", color: "#1A1A1A", marginBottom: 24 }}>Shift Timeline</Text>
          
          <View style={{ flexDirection: "row", marginBottom: 24 }}>
            <View style={{ width: 20, alignItems: "center", marginRight: 16 }}>
              <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: "#D1D5DB", backgroundColor: "#fff" }} />
              <View style={{ width: 2, height: 30, backgroundColor: "#D1D5DB", marginVertical: 4 }} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: "600", color: "#1A1A1A" }}>Clock In</Text>
              <Text style={{ fontSize: 12, color: "#9CA3AF" }}>Scheduled: {shift.startTime}</Text>
              <Text style={{ fontSize: 12, color: "#9CA3AF" }}>{shift.location}</Text>
            </View>
          </View>

          <View style={{ flexDirection: "row", marginBottom: 24 }}>
            <View style={{ width: 20, alignItems: "center", marginRight: 16 }}>
              <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: "#D1D5DB", backgroundColor: "#fff" }} />
              <View style={{ width: 2, height: 30, backgroundColor: "#D1D5DB", marginVertical: 4 }} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: "600", color: "#1A1A1A" }}>Shift Report</Text>
              <Text style={{ fontSize: 12, color: "#9CA3AF" }}>No report yet</Text>
            </View>
          </View>

          <View style={{ flexDirection: "row", marginBottom: 24 }}>
            <View style={{ width: 20, alignItems: "center", marginRight: 16 }}>
              <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: "#D1D5DB", backgroundColor: "#fff" }} />
              <View style={{ width: 2, height: 30, backgroundColor: "#D1D5DB", marginVertical: 4 }} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: "600", color: "#1A1A1A" }}>In Progress</Text>
              <Text style={{ fontSize: 12, color: "#9CA3AF" }}>—</Text>
            </View>
          </View>

          <View style={{ flexDirection: "row" }}>
            <View style={{ width: 20, alignItems: "center", marginRight: 16 }}>
              <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: "#D1D5DB", backgroundColor: "#fff" }} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: "600", color: "#1A1A1A" }}>Clock Out</Text>
              <Text style={{ fontSize: 12, color: "#9CA3AF" }}>Scheduled: {shift.endTime}</Text>
            </View>
          </View>

          <View style={{ borderTopWidth: 1, borderTopColor: "#F3F4F6", paddingTop: 16, marginTop: 20, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ fontSize: 14, fontWeight: "500", color: "#6B7280" }}>Total:</Text>
            <Text style={{ fontSize: 14, fontWeight: "600", color: "#1F6F43" }}>{calculateDuration(shift.startTime, shift.endTime)}</Text>
          </View>
        </View>

        {/* Report box placeholder */}
        <View style={{ backgroundColor: "#fff", borderRadius: 16, padding: 20, marginBottom: 24, elevation: 1, shadowColor: "#000", overflow: "hidden" }}>
          <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(255,255,255,0.8)", zIndex: 5, alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="lock-closed" size={20} color="#9CA3AF" />
            <Text style={{ fontSize: 12, color: "#9CA3AF", marginTop: 4 }}>Report available after clock-in</Text>
          </View>
          <Text style={{ fontSize: 14, fontWeight: "600", color: "#1A1A1A", marginBottom: 8 }}>Daily Shift Report</Text>
          <View style={{ height: 60, backgroundColor: "#F9FAFB", borderRadius: 8, borderWidth: 1, borderColor: "#E5E7EB" }} />
        </View>

        {/* Actions */}
        <Text style={{ fontSize: 14, fontWeight: "600", color: "#1A1A1A", marginBottom: 12 }}>Shift Actions</Text>
        <ActionRow icon="medkit" color="#1F6F43" bg="#F0FDF4" title="Medications" sub="Log meds & schedule" tag="2 due" />
        <ActionRow icon="car" color="#1E5FA6" bg="#EBF5FF" title="Transportations" sub="Log km & receipts" tag="Incomplete" />

        {/* Main Footer Button */}
        <Pressable
          onPress={!isConfirmed ? onConfirm : () => console.log("Clocking in...")}
          style={{ 
            height: 52, borderRadius: 14, alignItems: "center", justifyContent: "center", marginTop: 20,
            backgroundColor: isConfirmed ? "#1F6F43" : "#fff",
            borderWidth: isConfirmed ? 0 : 1.5,
            borderColor: "#1F6F43"
          }}
        >
          <Text style={{ fontSize: 16, fontWeight: "600", color: isConfirmed ? "#fff" : "#1F6F43" }}>
            {isConfirmed ? "Clock In" : "Confirm Shift"}
          </Text>
        </Pressable>
        <Text style={{ textAlign: "center", fontSize: 12, color: "#9CA3AF", marginTop: 8 }}>
          {!isConfirmed ? "Confirm to show parent you're attending" : "Clock in up to 15 min early"}
        </Text>

      </ScrollView>
    </View>
  );
}

function ActionRow({ icon, color, bg, title, sub, tag }) {
  return (
    <Pressable style={{ backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 12, flexDirection: "row", alignItems: "center", gap: 12, elevation: 1, shadowColor: "#000" }}>
      <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: bg, alignItems: "center", justifyContent: "center" }}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 14, fontWeight: "600", color: "#1A1A1A" }}>{title}</Text>
        <Text style={{ fontSize: 12, color: "#6B7280" }}>{sub}</Text>
      </View>
      <View style={{ backgroundColor: "#FFF8E1", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 }}>
         <Text style={{ fontSize: 10, fontWeight: "600", color: "#92600A" }}>{tag}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color="#D1D5DB" />
    </Pressable>
  );
}
