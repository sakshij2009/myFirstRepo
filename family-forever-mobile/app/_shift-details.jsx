import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Modal
} from "react-native";
import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { doc, onSnapshot, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../src/firebase/config.jsx";
import { router, useLocalSearchParams } from "expo-router";
import * as Location from "expo-location";

const serviceTypeStyles = {
  "Respite Care": { bg: "#EFF6FF", text: "#1D4ED8" },
  "Emergent Care": { bg: "#FEF2F2", text: "#991B1B" },
  "Supervised Visitation": { bg: "#F3F0FF", text: "#5B21B6" },
  "Transportation": { bg: "#FEF9C3", text: "#854D0E" },
  default: { bg: "#DCFCE7", text: "#15803D" },
};

export default function ShiftDetailsPage() {
  const { shiftId } = useLocalSearchParams();
  const [user, setUser] = useState(null);
  const [shift, setShift] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [shiftLocked, setShiftLocked] = useState(false);
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
    if (!shiftId) return;
    const shiftRef = doc(db, "shifts", shiftId);
    const unsub = onSnapshot(shiftRef, (snap) => {
      if (snap.exists()) {
        setShift({ id: snap.id, ...snap.data() });
      }
      setLoading(false);
    });
    return () => unsub();
  }, [shiftId]);

  if (loading || !shift) {
    return (
      <View style={{ flex: 1, backgroundColor: "#FFF", justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#1F6F43" />
      </View>
    );
  }

  const getStatus = () => {
    if (shift.clockOutTime) return "completed";
    if (shift.clockInTime) return "in-progress";
    return shift.shiftConfirmed ? "upcoming" : "assigned";
  };
  const shiftStatus = getStatus();

  const clientName = shift.clientName || shift.name || "Client";
  const clientInitials = clientName.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  const staffName = user?.name || "Staff Member";
  const staffInitials = staffName.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  
  const catName = shift.category || shift.serviceType || "Service";
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

  const handleConfirmAction = async () => {
    if (!confirmAction) return;
    setIsProcessing(true);
    const { type, shift: actionShift } = confirmAction;
    try {
      const shiftRef = doc(db, "shifts", actionShift.id);
      if (type === 'confirm') {
        await updateDoc(shiftRef, { shiftConfirmed: true });
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
        if (type === 'clockIn') {
          await updateDoc(shiftRef, { clockInTime: roundedTime, clockInLocation: locStr });
        } else {
          await updateDoc(shiftRef, { clockOutTime: roundedTime, clockOutLocation: locStr });
        }
      }
    } catch (e) {
      console.log("Error performing action", e);
    }
    setIsProcessing(false);
    setConfirmAction(null);
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#FFF" }}>
      {/* Header */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16 }}>
        <Pressable onPress={() => router.back()} style={{ width: 40, height: 40, justifyContent: "center", marginLeft: -10 }}>
          <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
        </Pressable>
        <View style={{ flex: 1, alignItems: "center" }}>
          <Text style={{ fontSize: 18, fontWeight: "600", color: "#1A1A1A", fontFamily: "Poppins" }}>Shift Details</Text>
          <Text style={{ fontSize: 12, color: "#9CA3AF" }}>{shift.startDate || "March 14, 2026"}</Text>
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
            <Text style={{ fontSize: 12, color: "#1F6F43", fontWeight: "500" }}></Text>
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
            <TimelineStep title="Clock In" sub={shift.clockInTime ? shift.clockInLocation || shift.location : `Scheduled: ${shift.startTime}`} time={shift.clockInTime || "—"} completed={!!shift.clockInTime} verified={!!shift.clockInTime} />
            <TimelineStep title="Shift Report" sub={shift.clockInTime ? (shift.clockOutTime ? "Report completed" : "Report in progress") : "Locked until clock-in"} time="—" completed={!!shift.clockInTime} locked={!shift.clockInTime} />
            <TimelineStep title="Clock Out" sub={shift.clockOutTime ? shift.clockOutLocation || shift.location : `Scheduled: ${shift.endTime}`} time={shift.clockOutTime || "—"} completed={!!shift.clockOutTime} verified={!!shift.clockOutTime} isLast />
          </View>
        </View>

        <Text style={styles.sectionTitle}>Shift Actions</Text>
        <ActionRow icon="medkit-outline" color="#1F6F43" bg="#F0FDF4" title="Medications" sub="Log meds & view schedule" tag={shiftStatus === 'completed' ? 'All done' : '2 due'} />
        <ActionRow icon="car-outline" color="#1E5FA6" bg="#EBF5FF" title="Transportations" sub="Log km, routes & receipts" tag={shiftStatus === 'completed' ? 'Submitted' : 'Incomplete'} />

        <Pressable
             onPress={() => {
               if (shiftStatus === 'assigned') setConfirmAction({ type: 'confirm', shift });
               else if (shiftStatus === 'upcoming') setConfirmAction({ type: 'clockIn', shift });
               else if (shiftStatus === 'in-progress') setConfirmAction({ type: 'clockOut', shift });
             }}
             style={[styles.mainButton, { backgroundColor: shiftStatus !== 'assigned' ? '#1F6F43' : '#FFF', borderWidth: shiftStatus === 'assigned' ? 1.5 : 0 }]}
           >
             <Text style={[styles.mainButtonText, { color: shiftStatus === 'assigned' ? '#1F6F43' : '#FFF' }]}>
               {shiftStatus === 'assigned' ? "Confirm Shift" : (shiftStatus === 'upcoming' ? "Clock In" : (shiftStatus === 'in-progress' ? "Clock Out" : "View Report"))}
             </Text>
        </Pressable>
      </ScrollView>

      {/* Confirmation Modal overlay exactly like we have it */}
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
  badge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
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
