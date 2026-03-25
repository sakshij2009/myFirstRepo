import {
  View,
  Text,
  ScrollView,
  Pressable,
  Linking,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { collection, query, onSnapshot } from "firebase/firestore";
import { db } from "../src/firebase/config.jsx";

const GREEN = "#18633F";
const LIGHT_GREEN = "#DCFCE7";
const BG = "#F9FAFB";

export default function Routes() {
  const [user, setUser] = useState(null);
  const [shifts, setShifts] = useState([]);

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
            <Pressable key={shift.id} onPress={() => router.push(`/transportation-detail?shiftId=${shift.id}`)} style={styles.routeCard}>
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
});
