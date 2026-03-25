import {
  View,
  Text,
  ScrollView,
  Pressable,
  Modal,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { collection, query, onSnapshot, getDocs, where, updateDoc } from "firebase/firestore";
import { db } from "../src/firebase/config.jsx";
import { router } from "expo-router";
import * as Location from "expo-location";

const serviceTypeStyles = {
  "Respite Care": { bg: "#EFF6FF", text: "#1D4ED8" },
  "Emergent Care": { bg: "#FEF2F2", text: "#991B1B" },
  "Supervised Visitation": { bg: "#F3F0FF", text: "#5B21B6" },
  "Transportation": { bg: "#FEF9C3", text: "#854D0E" },
  default: { bg: "#DCFCE7", text: "#15803D" },
};

const statusStyles = {
  Assigned: { bg: "#FEF9C3", text: "#854D0E" },
  Confirmed: { bg: "#DCFCE7", text: "#15803D" },
  Pending: { bg: "#FEF9C3", text: "#854D0E" },
  Active: { bg: "#EFF6FF", text: "#1D4ED8" },
  Complete: { bg: "#F3F4F6", text: "#6B7280" },
};

function ShiftCard({ shift, onAction, onDetails }) {
  const getStatus = () => {
    if (shift.clockOutTime) return "Complete";
    if (shift.clockInTime) return "Active";
    return shift.shiftConfirmed ? "Confirmed" : "Assigned";
  };

  const serviceType = shift.category || shift.categoryName || shift.serviceType || "Service";
  const status = getStatus();

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
        elevation: 0,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        borderWidth: 0.5,
        borderColor: "#E5E7EB"
      }}
    >
      {status === 'Assigned' && (
        <View style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: "#FFF8E1",
          paddingHorizontal: 16,
          paddingVertical: 10,
          gap: 6,
        }}>
          <Ionicons name="time-outline" size={14} color="#92600A" />
          <Text style={{ fontSize: 12, fontWeight: "600", color: "#92600A", letterSpacing: 0.2, fontFamily: "Inter" }}>
            Confirmation required
          </Text>
        </View>
      )}

      <View style={{ padding: 20 }}>
        {/* Top row: Service badge and status */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <View style={{ backgroundColor: serviceStyle.bg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
            <Text style={{ fontSize: 11, fontWeight: "600", color: serviceStyle.text }}>
              {serviceType}
            </Text>
          </View>
          <View style={{ backgroundColor: statusStyle.bg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
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
          <View style={{ backgroundColor: "#F3F4F6", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 }}>
            <Text style={{ fontSize: 12, fontWeight: "500", color: "#6B7280" }}>
              {duration}
            </Text>
          </View>
        </View>

        {/* Client row */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "#EBF5FF", alignItems: "center", justifyContent: "center" }}>
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
          <Text style={{ fontSize: 13, color: "#9CA3AF" }} numberOfLines={1}>{location}</Text>
        </View>

        {/* Divider */}
        <View style={{ height: 1, backgroundColor: "#F3F4F6", marginBottom: 16 }} />

        {/* Action row */}
        {status === 'Assigned' && (
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Pressable
              onPress={() => onAction('confirm', shift)}
              style={{
                height: 44,
                backgroundColor: "#1F6F43",
                borderRadius: 10,
                alignItems: "center",
                justifyContent: "center",
                width: "55%",
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: "600", color: "#FFF", fontFamily: "Poppins" }}>Confirm Shift</Text>
            </Pressable>
            <Pressable onPress={() => router.push(`/transfer-shift?shiftId=${shift.id}`)} style={{ width: 44, height: 44, borderRadius: 10, backgroundColor: "#F3F4F6", alignItems: "center", justifyContent: "center" }}>
               <Ionicons name="swap-horizontal" size={20} color="#6B7280" />
            </Pressable>
            <Pressable onPress={onDetails}><Text style={{ fontSize: 13, fontWeight: "500", color: "#1F6F43" }}>Details &gt;</Text></Pressable>
          </View>
        )}

        {status === 'Confirmed' && (
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Pressable
              onPress={() => onAction('clockIn', shift)}
              style={{
                height: 44,
                backgroundColor: "#1F6F43",
                borderRadius: 10,
                alignItems: "center",
                justifyContent: "center",
                width: "55%",
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: "600", color: "#FFF", fontFamily: "Poppins" }}>Clock In</Text>
            </Pressable>
            <Pressable onPress={() => router.push(`/transfer-shift?shiftId=${shift.id}`)} style={{ width: 44, height: 44, borderRadius: 10, backgroundColor: "#F3F4F6", alignItems: "center", justifyContent: "center" }}>
               <Ionicons name="swap-horizontal" size={20} color="#6B7280" />
            </Pressable>
            <Pressable onPress={onDetails}><Text style={{ fontSize: 13, fontWeight: "500", color: "#1F6F43" }}>Details &gt;</Text></Pressable>
          </View>
        )}

        {status === 'Active' && (
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Pressable
              onPress={() => onAction('clockOut', shift)}
              style={{
                height: 44,
                backgroundColor: "#1F6F43",
                borderRadius: 10,
                alignItems: "center",
                justifyContent: "center",
                width: "55%",
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: "600", color: "#FFF", fontFamily: "Poppins" }}>Clock Out</Text>
            </Pressable>
            <Pressable onPress={onDetails}><Text style={{ fontSize: 13, fontWeight: "500", color: "#1F6F43" }}>View Report</Text></Pressable>
          </View>
        )}

        {status === 'Complete' && (
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Pressable
              onPress={onDetails}
              style={{
                height: 44,
                backgroundColor: "#FFF",
                borderWidth: 1.2,
                borderColor: "#1F6F43",
                borderRadius: 10,
                alignItems: "center",
                justifyContent: "center",
                width: "55%",
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: "600", color: "#1F6F43", fontFamily: "Poppins" }}>View Report</Text>
            </Pressable>
            <Ionicons name="checkmark-circle" size={24} color="#1F6F43" />
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
  const [confirmAction, setConfirmAction] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

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
        return db2 - da; 
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
    if (!d) return false;
    d.setHours(0, 0, 0, 0);
    
    switch (activeTab) {
      case "Upcoming": return d.getTime() > today.getTime() || (d.getTime() === today.getTime() && !s.clockInTime);
      case "In Progress": return s.clockInTime && !s.clockOutTime;
      case "Completed": return !!s.clockOutTime;
      case "Needs Attention": return !s.shiftConfirmed && d.getTime() >= today.getTime();
      case "All": return true;
      default: return true;
    }
  });

  const grouped = filtered.reduce((acc, shift) => {
    const key = shift.startDate || "Unknown";
    if (!acc[key]) acc[key] = [];
    acc[key].push(shift);
    return acc;
  }, {});

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

  const formatDateHeader = (dateStr) => {
    const d = parseDate(dateStr);
    if (!d) return dateStr;
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    d.setHours(0, 0, 0, 0);
    const dateFormatted = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    if (d.getTime() === now.getTime()) return "Today · " + dateFormatted;
    if (d.getTime() === now.getTime() + 86400000) return "Tomorrow · " + dateFormatted;
    return d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
  };

  const getShiftCountText = () => {
    const len = filtered.length;
    if (len === 0) return `No ${activeTab.toLowerCase()} shifts`;
    if (activeTab === "All") return `${len} total shifts`;
    return `${len} ${activeTab.toLowerCase()} ${len === 1 ? 'shift' : 'shifts'}`;
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F9FAFB" }} edges={['top']}>
        <>
          <View style={styles.header}>
            <Pressable onPress={() => router.push("/home")} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
            </Pressable>
            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerTitle}>My Shifts</Text>
              <Text style={styles.headerSubtitle}>{user?.name} | Staff</Text>
            </View>
            <Pressable style={styles.filterButton}>
              <Ionicons name="options-outline" size={22} color="#6B7280" />
            </Pressable>
          </View>

          <View style={styles.tabContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}>
              {["Upcoming", "In Progress", "Completed", "Needs Attention", "All"].map((tab) => (
                <Pressable
                  key={tab}
                  onPress={() => setActiveTab(tab)}
                  style={[styles.tab, activeTab === tab && styles.activeTab]}
                >
                  <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                    {tab}
                  </Text>
                  {tab === "Needs Attention" && shifts.filter(s => !s.shiftConfirmed).length > 0 && (
                     <View style={styles.badge} />
                  )}
                </Pressable>
              ))}
            </ScrollView>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.listContent}>
            <Text style={styles.countText}>{getShiftCountText()}</Text>

            {Object.keys(grouped).length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="calendar-outline" size={60} color="#D1D5DB" />
                <Text style={styles.emptyTitle}>Nothing to see here</Text>
                <Text style={styles.emptySubtitle}>You don't have any {activeTab.toLowerCase()} shifts at the moment.</Text>
              </View>
            ) : (
              Object.entries(grouped)
                .sort(([keyA], [keyB]) => (parseDate(keyB) || 0) - (parseDate(keyA) || 0))
                .map(([dateKey, dayShifts]) => (
                <View key={dateKey} style={styles.dateGroup}>
                  <View style={styles.dateHeader}>
                    <Text style={styles.dateText}>{formatDateHeader(dateKey)}</Text>
                    <View style={styles.dateDot} />
                  </View>

                  {dayShifts.map((shift) => (
                    <ShiftCard
                      key={shift.id}
                      shift={shift}
                      onAction={(type, s) => setConfirmAction({ type, shift: s })}
                      onDetails={() => router.push({ pathname: "/_shift-details", params: { shiftId: shift.id } })}
                    />
                  ))}
                </View>
              ))
            )}
          </ScrollView>

          <View style={styles.floatingContainer}>
            <View style={styles.floatingBadge}>
              <Text style={styles.floatingBadgeText}>
                {activeTab === 'Completed'
                  ? `Completed: ${filtered.length} shifts · 96 hrs · 20 approved`
                  : `Today: ${filtered.length} shifts · 8 hrs`}
              </Text>
            </View>
          </View>
        </>

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

function ShiftDetailView({ shift, user, onClose, onActionRequest }) {
  const getStatus = () => {
    if (shift.clockOutTime) return "completed";
    if (shift.clockInTime) return "in-progress";
    return shift.shiftConfirmed ? "upcoming" : "assigned";
  };

  const shiftStatus = getStatus();
  const [shiftLocked, setShiftLocked] = useState(false);
  
  const clientName = shift.clientName || shift.name || "Client";
  const clientInitials = clientName.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  const staffName = user?.name || "Staff Member";
  const staffInitials = staffName.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  
  const catName = shift.categoryName || shift.serviceType || "Service";
  const serviceStyle = serviceTypeStyles[catName] || serviceTypeStyles.default;

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
    <View style={{ flex: 1, backgroundColor: "#FFF" }}>
      {/* Header */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16 }}>
        <Pressable onPress={onClose} style={{ width: 40, height: 40, justifyContent: "center", marginLeft: -10 }}>
          <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
        </Pressable>
        <View style={{ flex: 1, alignItems: "center" }}>
          <Text style={{ fontSize: 18, fontWeight: "600", color: "#1A1A1A", fontFamily: "Poppins" }}>Shift Details</Text>
          <Text style={{ fontSize: 12, color: "#9CA3AF" }}>Today · {shift.startDate || "March 14, 2026"}</Text>
        </View>
        <Ionicons name="ellipsis-vertical" size={24} color="#6B7280" />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120 }}>
        {/* Status Banner */}
        {shiftStatus === 'assigned' ? (
          <View style={{ backgroundColor: "#FFF8E1", borderRadius: 12, padding: 12, flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 20 }}>
            <Ionicons name="time-outline" size={20} color="#92600A" />
            <Text style={{ fontSize: 13, fontWeight: "600", color: "#92600A" }}>Assigned · Awaiting Your Confirmation</Text>
          </View>
        ) : shiftStatus === 'upcoming' ? (
          <View style={{ backgroundColor: "#F0FDF4", borderRadius: 12, padding: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Ionicons name="checkmark-circle" size={20} color="#1F6F43" />
              <Text style={{ fontSize: 13, fontWeight: "600", color: "#1F6F43" }}>Confirmed · Upcoming</Text>
            </View>
            <Text style={{ fontSize: 12, color: "#1F6F43", fontWeight: "500" }}>Starts in 45 min</Text>
          </View>
        ) : shiftStatus === 'in-progress' ? (
          <View style={{ backgroundColor: "#EBF5FF", borderRadius: 12, padding: 12, flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 20 }}>
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: "#1E5FA6" }} />
            <Text style={{ fontSize: 13, fontWeight: "600", color: "#1E5FA6" }}>In Progress</Text>
          </View>
        ) : (
          <View style={{ backgroundColor: "#F3F4F6", borderRadius: 12, padding: 12, flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 20 }}>
            <Ionicons name="checkmark-circle" size={20} color="#6B7280" />
            <Text style={{ fontSize: 13, fontWeight: "600", color: "#6B7280" }}>Completed</Text>
          </View>
        )}

        {/* Pairing Card */}
        <View style={styles.detailCard}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 16 }}>
             <View style={{ alignItems: "center", flex: 1 }}>
               <View style={[styles.avatarCircle, { backgroundColor: '#F0FDF4' }]}><Text style={[styles.avatarText, { color: '#1F6F43' }]}>{clientInitials}</Text></View>
               <Text style={styles.nameText}>{clientName}</Text>
               <Text style={styles.idText}>ID: {shift.clientId || "N/A"}</Text>
             </View>
             <Ionicons name="arrow-forward" size={16} color="#D1D5DB" style={{ marginTop: 24 }} />
             <View style={{ alignItems: "center", flex: 1 }}>
               <View style={[styles.avatarCircle, { backgroundColor: '#F3F0FF' }]}><Text style={[styles.avatarText, { color: '#5B21B6' }]}>{staffInitials}</Text></View>
               <Text style={styles.nameText}>{staffName}</Text>
               <Text style={styles.idText}>CYIM: {user?.userId?.slice(-7).toUpperCase() || "1432569"}</Text>
             </View>
          </View>
          <View style={{ alignItems: "center" }}>
            <View style={[styles.badge, { backgroundColor: serviceStyle.bg }]}><Text style={{ color: serviceStyle.text, fontWeight: '700', fontSize: 12 }}>{catName}</Text></View>
          </View>
          <View style={{ height: 1, backgroundColor: "#F3F4F6", marginVertical: 12 }} />
          <Pressable style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 }}>
            <Ionicons name="card-outline" size={16} color="#1F6F43" />
            <Text style={{ fontSize: 13, fontWeight: "600", color: "#1F6F43" }}>Show ID Card to Parent</Text>
          </Pressable>
        </View>

        {/* Info Card */}
        <View style={styles.detailCard}>
           {[
             { label: 'SHIFT TYPE', value: 'Regular' },
             { label: 'DATE & TIME', value: `${shift.startDate || 'Mar 14'}\n${shift.startTime} – ${shift.endTime}` },
             { label: 'DURATION', value: calculateDuration(shift.startTime, shift.endTime) },
             { label: 'LOCATION', value: shift.location, icon: 'navigate-circle-outline' },
           ].map((row, i) => (
             <View key={i} style={styles.infoRow}>
               <Text style={styles.infoLabel}>{row.label}</Text>
               <View style={{ alignItems: 'flex-end', flex: 1 }}>
                 <Text style={styles.infoValue}>{row.value}</Text>
                 {row.icon && <Ionicons name={row.icon} size={16} color="#1F6F43" style={{ marginTop: 4 }} />}
               </View>
             </View>
           ))}
           <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 12 }}>
             <View>
               <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                 <Ionicons name="lock-closed-outline" size={18} color="#6B7280" />
                 <Text style={{ fontSize: 14, fontWeight: "500", color: "#1A1A1A" }}>Shift Lock</Text>
               </View>
               <Text style={{ fontSize: 11, color: "#9CA3AF" }}>Prevents accidental modifications</Text>
             </View>
             <Pressable 
               onPress={() => setShiftLocked(!shiftLocked)}
               style={{ width: 48, height: 26, borderRadius: 13, backgroundColor: shiftLocked ? "#1F6F43" : "#E5E7EB", padding: 3 }}
             >
               <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: "#FFF", alignSelf: shiftLocked ? 'flex-end' : 'flex-start' }} />
             </Pressable>
           </View>
        </View>

        {/* Timeline */}
        <View style={styles.detailCard}>
          <Text style={styles.cardInternalTitle}>Shift Timeline</Text>
          <View style={{ marginTop: 15 }}>
            <TimelineStep title="Clock In" sub={shift.clockInTime ? shift.location : `Scheduled: ${shift.startTime}`} time={shift.clockInTime || "—"} completed={!!shift.clockInTime} verified={!!shift.clockInTime} />
            <TimelineStep title="Shift Report" sub={shift.clockInTime ? (shift.clockOutTime ? "Report completed" : "Report in progress") : "Locked until clock-in"} time="—" completed={!!shift.clockInTime} locked={!shift.clockInTime} />
            <TimelineStep title="Clock Out" sub={shift.clockOutTime ? shift.location : `Scheduled: ${shift.endTime}`} time={shift.clockOutTime || "—"} completed={!!shift.clockOutTime} verified={!!shift.clockOutTime} isLast />
          </View>
        </View>

        <Text style={styles.sectionTitle}>Shift Actions</Text>
        <ActionRow icon="medkit-outline" color="#1F6F43" bg="#F0FDF4" title="Medications" sub="Log meds & view schedule" tag={shiftStatus === 'completed' ? 'All done' : '2 due'} />
        <ActionRow icon="car-outline" color="#1E5FA6" bg="#EBF5FF" title="Transportations" sub="Log km, routes & receipts" tag={shiftStatus === 'completed' ? 'Submitted' : 'Incomplete'} />

        <Pressable
             onPress={() => {
               if (shiftStatus === 'assigned') onActionRequest('confirm', shift);
               else if (shiftStatus === 'upcoming') onActionRequest('clockIn', shift);
               else if (shiftStatus === 'in-progress') onActionRequest('clockOut', shift);
             }}
             style={[styles.mainButton, { backgroundColor: shiftStatus !== 'assigned' ? '#1F6F43' : '#FFF', borderWidth: shiftStatus === 'assigned' ? 1.5 : 0 }]}
           >
             <Text style={[styles.mainButtonText, { color: shiftStatus === 'assigned' ? '#1F6F43' : '#FFF' }]}>
               {shiftStatus === 'assigned' ? "Confirm Shift" : (shiftStatus === 'upcoming' ? "Clock In" : (shiftStatus === 'in-progress' ? "Clock Out" : "View Report"))}
             </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function ActionRow({ icon, color, bg, title, sub, tag }) {
  return (
    <Pressable style={styles.actionRowCard}>
      <View style={[styles.actionIconOuter, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.actionTitle}>{title}</Text>
        <Text style={styles.actionSub}>{sub}</Text>
      </View>
      <View style={{ alignItems: "flex-end", gap: 4 }}>
        <View style={[styles.actionBadge, { backgroundColor: tag === 'All done' || tag === 'Submitted' ? '#F0FDF4' : '#FFF8E1' }]}>
           <Text style={[styles.actionBadgeText, { color: tag === 'All done' || tag === 'Submitted' ? '#1F6F43' : '#92600A' }]}>{tag}</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color="#D1D5DB" />
      </View>
    </Pressable>
  );
}

function TimelineStep({ title, sub, time, completed, verified, locked, isLast }) {
  return (
    <View style={styles.timelineStep}>
       <View style={{ alignItems: 'center', marginRight: 15 }}>
          <View style={[styles.dotInactive, completed && styles.dotActive]}>
             {completed && verified ? <Ionicons name="checkmark" size={10} color="#FFF" /> : (locked && <Ionicons name="lock-closed" size={8} color="#9CA3AF" />)}
          </View>
          {!isLast && <View style={[styles.timelineLine, completed && { backgroundColor: '#1F6F43' }]} />}
       </View>
       <View style={{ flex: 1, paddingBottom: isLast ? 0 : 25 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
             <Text style={[styles.stepTitle, !completed && !locked && { color: '#9CA3AF' }]}>{title}</Text>
             <Text style={[styles.stepTime, completed && verified && { color: '#1F6F43' }]}>{time}</Text>
          </View>
          <Text style={[styles.stepSub, completed && verified && { color: '#6B7280' }]} numberOfLines={1}>{sub}</Text>
          {completed && verified && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 }}>
              <Ionicons name="shield-checkmark" size={12} color="#1F6F43" />
              <Text style={{ fontSize: 10, color: "#1F6F43", fontWeight: "600" }}>Location verified</Text>
            </View>
          )}
       </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 15 },
  headerTitleContainer: { flex: 1, alignItems: "center" },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#1A1A1A", fontFamily: "Poppins" },
  headerSubtitle: { fontSize: 13, color: "#9CA3AF", marginTop: 2, fontFamily: "Inter" },
  backButton: { width: 40, height: 40, justifyContent: "center" },
  filterButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#F3F4F6", alignItems: "center", justifyContent: "center" },
  tabContainer: { paddingBottom: 15 },
  tab: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: "#F3F4F6", position: "relative" },
  activeTab: { backgroundColor: "#1F6F43" },
  tabText: { fontSize: 13, fontWeight: "600", color: "#6B7280", fontFamily: "Poppins" },
  activeTabText: { color: "#FFF" },
  badge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  listContent: { paddingHorizontal: 20, paddingBottom: 120 },
  countText: { fontSize: 13, color: "#9CA3AF", marginBottom: 20, fontWeight: "500" },
  dateGroup: { marginBottom: 10 },
  dateHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 15, marginTop: 10 },
  dateText: { fontSize: 14, fontWeight: "800", color: "#111827" },
  dateDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#22C55E" },
  emptyState: { alignItems: "center", justifyContent: "center", marginTop: 60, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 18, fontWeight: "800", color: "#374151", marginTop: 20 },
  emptySubtitle: { fontSize: 14, color: "#9CA3AF", textAlign: "center", marginTop: 8 },
  floatingContainer: { position: "absolute", bottom: 20, alignSelf: "center", zIndex: 100 },
  floatingBadge: { backgroundColor: "#0E3D20", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 25, shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 5 },
  floatingBadgeText: { color: "#FFF", fontSize: 12, fontWeight: "500", fontFamily: "Inter" },
  floatingText: { color: "#FFF", fontSize: 12, fontWeight: "700", fontFamily: "Poppins" },
  detailCard: { backgroundColor: "#fff", borderRadius: 16, padding: 20, marginBottom: 16, elevation: 2, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05 },
  avatarCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: "#F0FDF4", alignItems: "center", justifyContent: "center", marginBottom: 8 },
  avatarText: { fontSize: 16, fontWeight: "700", color: "#1F6F43" },
  nameText: { fontSize: 14, fontWeight: "700", color: "#111827", textAlign: "center" },
  idText: { fontSize: 11, color: "#9CA3AF", marginTop: 2 },
  infoRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  infoLabel: { fontSize: 11, color: "#9CA3AF", fontWeight: "700" },
  infoValue: { fontSize: 14, color: "#111827", fontWeight: "600", textAlign: 'right' },
  sectionTitle: { fontSize: 15, fontWeight: "800", color: "#111827", marginBottom: 15, marginTop: 10 },
  actionRowCard: { backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 12, flexDirection: "row", alignItems: "center", gap: 12, elevation: 1, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, borderWidth: 1, borderColor: '#F3F4F6' },
  actionIconOuter: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  actionTitle: { fontSize: 14, fontWeight: "700", color: "#111827" },
  actionSub: { fontSize: 12, color: "#6B7280", marginTop: 2 },
  actionBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  actionBadgeText: { fontSize: 10, fontWeight: "800" },
  mainButton: { height: 54, borderRadius: 15, alignItems: "center", justifyContent: "center", marginTop: 20, borderColor: '#1F6F43' },
  mainButtonText: { fontSize: 16, fontWeight: "700" },
  cardInternalTitle: { fontSize: 14, fontWeight: "800", color: "#111827" },
  timelineStep: { flexDirection: 'row' },
  timelineLine: { width: 2, flex: 1, backgroundColor: '#E5E7EB', marginVertical: 3 },
  dotActive: { width: 14, height: 14, borderRadius: 7, backgroundColor: '#1F6F43', borderWidth: 3, borderColor: '#DCFCE7' },
  dotInactive: { width: 14, height: 14, borderRadius: 7, backgroundColor: '#FFF', borderWidth: 2, borderColor: '#D1D5DB', alignItems: 'center', justifyContent: 'center' },
  stepTitle: { fontSize: 14, fontWeight: '700', color: '#111827' },
  stepTime: { fontSize: 11, color: '#9CA3AF', fontWeight: '600' },
  stepSub: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
});
