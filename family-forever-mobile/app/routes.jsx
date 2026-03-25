import {
  View,
  Text,
  ScrollView,
  Pressable,
  Modal,
  Linking,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { collection, query, onSnapshot } from "firebase/firestore";
import { db } from "../src/firebase/config.jsx";

const GREEN = "#18633F";
const LIGHT_GREEN = "#DCFCE7";
const BG = "#F9FAFB";

export default function Routes() {
  const [user, setUser] = useState(null);
  const [shifts, setShifts] = useState([]);
  const [selected, setSelected] = useState(null);

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
          (s?.name?.toLowerCase() === user?.name?.toLowerCase() ||
            s?.userId === user?.userId) &&
          (s.serviceType === "Transportation" || s.serviceType === "Transportations")
      );
      setShifts(mine);
    });
    return () => unsub();
  }, [user]);

  const openMaps = (location) => {
    if (!location) return;
    const url = `https://maps.google.com/?q=${encodeURIComponent(location)}`;
    Linking.openURL(url);
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case 'Completed': return { bg: '#F3F4F6', text: '#6B7280' };
      case 'Arrived': return { bg: '#DCFCE7', text: '#166534' };
      case 'In Progress': return { bg: '#DBEAFE', text: '#1E40AF' };
      default: return { bg: '#FEF3C7', text: '#92400E' };
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BG }} edges={['top']}>
      {/* HEADER */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerPreTitle}>TRANSPORTATION</Text>
          <Text style={styles.headerTitle}>My Routes</Text>
        </View>
        <Pressable style={styles.searchButton}>
           <Ionicons name="search-outline" size={20} color="#6B7280" />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        {shifts.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconCircle}>
               <Ionicons name="car-outline" size={40} color={GREEN} />
            </View>
            <Text style={styles.emptyTitle}>No Active Routes</Text>
            <Text style={styles.emptySub}>Your transportation shifts will appear here once assigned by the coordinator.</Text>
          </View>
        ) : (
          shifts.map((shift, idx) => (
            <Pressable key={shift.id} onPress={() => setSelected(shift)} style={styles.routeCard}>
               <View style={styles.routeCardHeader}>
                  <View style={styles.routeBadge}>
                    <Text style={styles.routeBadgeText}>ROUTE #{idx + 101}</Text>
                  </View>
                  <View style={styles.timeContainer}>
                    <Ionicons name="time-outline" size={14} color="#9CA3AF" />
                    <Text style={styles.timeText}>{shift.startTime}</Text>
                  </View>
               </View>

               <Text style={styles.clientName}>{shift.clientName || "Client Name"}</Text>
               <Text style={styles.routeSubText}>Seat Type: Forward Facing Seat</Text>

               <View style={styles.timeline}>
                  <TimelineItem 
                    title="Pick Up" 
                    location={shift.pickupLocation || shift.location} 
                    status="Completed" 
                    time={shift.startTime} 
                    isFirst 
                  />
                  <TimelineItem 
                    title="Visit Location" 
                    location={shift.dropLocation || shift.destination} 
                    status="Arrived" 
                    time="10:45 AM" 
                  />
                  <TimelineItem 
                    title="Drop Off" 
                    location={shift.pickupLocation || shift.location} 
                    status="Pending" 
                    time={shift.endTime} 
                    isLast 
                  />
               </View>

               <View style={styles.footerRow}>
                  <View style={styles.dateContainer}>
                    <Ionicons name="calendar-outline" size={14} color="#9CA3AF" />
                    <Text style={styles.dateText}>{shift.startDate}</Text>
                  </View>
                  <Pressable onPress={() => openMaps(shift.location)} style={styles.navButton}>
                     <Ionicons name="navigate" size={14} color="#FFF" />
                     <Text style={styles.navButtonText}>Navigate</Text>
                  </Pressable>
               </View>
            </Pressable>
          ))
        )}
      </ScrollView>

      {/* DETAIL MODAL (Enhanced) */}
      <Modal visible={!!selected} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
           <View style={styles.modalContent}>
              <View style={styles.modalHandle} />
              <View style={styles.modalHeader}>
                 <Text style={styles.modalTitle}>Route Timeline</Text>
                 <Pressable onPress={() => setSelected(null)} style={styles.closeButton}>
                    <Ionicons name="close" size={20} color="#111827" />
                 </Pressable>
              </View>

              <ScrollView style={{ padding: 20 }}>
                 <TimelineStep icon="radio-button-on" title="Pick Up" subtitle="Pick up client from home" location={selected?.pickupLocation} status="Completed" />
                 <TimelineStep icon="location" title="Visit" subtitle="Supervised Visitation Site" location={selected?.dropLocation} status="In Progress" />
                 <TimelineStep icon="flag" title="Drop Off" subtitle="Return client to home" location={selected?.pickupLocation} status="Pending" isLast />
                 
                 <Pressable style={styles.fullNavButton} onPress={() => openMaps(selected?.location)}>
                    <Ionicons name="navigate" size={20} color="#FFF" />
                    <Text style={styles.fullNavButtonText}>Start Navigation</Text>
                 </Pressable>
              </ScrollView>
           </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function TimelineItem({ title, location, status, time, isFirst, isLast }) {
  return (
    <View style={styles.timelineItem}>
      <View style={styles.timelineLeft}>
        <View style={[styles.timelineDot, status === 'Pending' && { borderColor: '#D1D5DB', backgroundColor: '#FFF' }]} />
        {!isLast && <View style={styles.timelineLine} />}
      </View>
      <View style={styles.timelineRight}>
        <View style={styles.timelineTextRow}>
          <Text style={[styles.timelineTitle, status === 'Pending' && { color: '#9CA3AF' }]}>{title}</Text>
          <Text style={styles.timelineTime}>{time}</Text>
        </View>
        <Text style={styles.timelineLocation} numberOfLines={1}>{location || "Location not set"}</Text>
      </View>
    </View>
  );
}

function TimelineStep({ icon, title, subtitle, location, status, isLast }) {
  const styles2 = getStatusStyle(status);
  return (
    <View style={{ flexDirection: 'row', marginBottom: 30 }}>
       <View style={{ alignItems: 'center', marginRight: 15 }}>
          <View style={[styles.stepIconCircle, { backgroundColor: status === 'Pending' ? '#F3F4F6' : LIGHT_GREEN }]}>
             <Ionicons name={icon} size={20} color={status === 'Pending' ? '#9CA3AF' : GREEN} />
          </View>
          {!isLast && <View style={styles.stepVerticalLine} />}
       </View>
       <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
             <View>
                <Text style={styles.stepTitle}>{title}</Text>
                <Text style={styles.stepSubtitle}>{subtitle}</Text>
             </View>
             <View style={[styles.stepBadge, { backgroundColor: styles2.bg }]}>
                <Text style={[styles.stepBadgeText, { color: styles2.text }]}>{status}</Text>
             </View>
          </View>
          <View style={styles.stepLocationCard}>
             <Ionicons name="location-outline" size={14} color="#6B7280" />
             <Text style={styles.stepLocationText}>{location || "Not specified"}</Text>
          </View>
       </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 25, paddingTop: 20, paddingBottom: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  headerPreTitle: { fontSize: 11, fontWeight: '800', color: GREEN, letterSpacing: 1.5, marginBottom: 5 },
  headerTitle: { fontSize: 26, fontWeight: '900', color: '#111827' },
  searchButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F9FAFB', alignItems: 'center', justifyContent: 'center' },
  routeCard: { backgroundColor: '#FFF', borderRadius: 20, padding: 20, marginBottom: 20, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, borderWidth: 1, borderColor: '#F3F4F6' },
  routeCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  routeBadge: { backgroundColor: '#FEF3C7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  routeBadgeText: { fontSize: 10, fontWeight: '800', color: '#92400E' },
  timeContainer: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  timeText: { fontSize: 12, fontWeight: '700', color: '#111827' },
  clientName: { fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 4 },
  routeSubText: { fontSize: 12, color: '#9CA3AF', fontWeight: '500', marginBottom: 20 },
  timeline: { marginBottom: 20 },
  timelineItem: { flexDirection: 'row', height: 50 },
  timelineLeft: { width: 30, alignItems: 'center' },
  timelineDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: GREEN, borderWidth: 2, borderColor: '#FFF', zIndex: 1 },
  timelineLine: { width: 2, flex: 1, backgroundColor: '#E5E7EB', marginVertical: -2 },
  timelineRight: { flex: 1, paddingLeft: 10 },
  timelineTextRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  timelineTitle: { fontSize: 13, fontWeight: '700', color: '#111827' },
  timelineTime: { fontSize: 11, color: '#9CA3AF', fontWeight: '600' },
  timelineLocation: { fontSize: 12, color: '#6B7280' },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 15, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  dateContainer: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dateText: { fontSize: 12, color: '#9CA3AF', fontWeight: '600' },
  navButton: { backgroundColor: GREEN, paddingHorizontal: 15, paddingVertical: 8, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 6 },
  navButtonText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  emptyCard: { backgroundColor: '#FFF', borderRadius: 24, padding: 50, alignItems: 'center', borderWidth: 1, borderColor: '#F3F4F6' },
  emptyIconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: LIGHT_GREEN, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: '#374151', marginBottom: 10 },
  emptySub: { fontSize: 13, color: '#9CA3AF', textAlign: 'center', lineHeight: 20 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingBottom: 40, maxHeight: '85%' },
  modalHandle: { width: 40, height: 5, borderRadius: 3, backgroundColor: '#E5E7EB', alignSelf: 'center', marginTop: 15 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 25, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  modalTitle: { fontSize: 20, fontWeight: '900', color: '#111827' },
  closeButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F9FAFB', alignItems: 'center', justifyContent: 'center' },
  stepIconCircle: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: "center", zIndex: 1 },
  stepVerticalLine: { width: 2, height: 50, backgroundColor: '#E5E7EB', position: 'absolute', top: 40 },
  stepTitle: { fontSize: 15, fontWeight: '800', color: '#111827' },
  stepSubtitle: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  stepBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  stepBadgeText: { fontSize: 10, fontWeight: '800' },
  stepLocationCard: { backgroundColor: '#F9FAFB', borderRadius: 12, padding: 12, marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepLocationText: { fontSize: 13, color: '#374151', flex: 1, fontWeight: '500' },
  fullNavButton: { backgroundColor: GREEN, paddingVertical: 18, borderRadius: 16, marginTop: 10, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
  fullNavButtonText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
