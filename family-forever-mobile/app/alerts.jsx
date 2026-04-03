import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { collection, query, onSnapshot, orderBy, updateDoc, doc } from "firebase/firestore";
import { db } from "../src/firebase/config";

// ── Color tokens ──────────────────────────────────────────────────────────────
const PRIMARY_GREEN = "#1F6F43";
const LIGHT_GREEN = "#DCFCE7";
const TEXT_GREEN = "#166534";
const DARK_TEXT = "#111827";
const GRAY_TEXT = "#6B7280";
const GRAY_BORDER = "#F3F4F6";
const PAGE_BG = "#F9FAFB";

const TABS = ["All", "Shifts", "Schedule", "Assignment"];

export default function Alerts() {
  const [user, setUser] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [activeTab, setActiveTab] = useState("All");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      const stored = await AsyncStorage.getItem("user");
      if (stored) setUser(JSON.parse(stored));
    };
    loadUser();
  }, []);

  useEffect(() => {
    if (!user?.username) {
      setLoading(false);
      return;
    }
    const notifRef = collection(db, "notifications", user.username, "userNotifications");
    const q = query(notifRef, orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setAlerts(data);
      setLoading(false);
    });
    return () => unsub();
  }, [user]);

  const unreadCount = alerts.filter(a => !a.read).length;

  const filtered = alerts.filter(a => {
    if (activeTab === "All") return true;
    return a.category?.toLowerCase() === activeTab.toLowerCase() || 
           a.type?.toLowerCase() === activeTab.toLowerCase();
  });

  const markAllRead = async () => {
    if (!user?.username) return;
    alerts.forEach(async (a) => {
      if (!a.read) {
        await updateDoc(doc(db, "notifications", user.username, "userNotifications", a.id), { read: true });
      }
    });
  };

  const markRead = async (id) => {
    if (!user?.username) return;
    await updateDoc(doc(db, "notifications", user.username, "userNotifications", id), { read: true });
  };

  // Group notifications by date (Today, Yesterday, This Week, Older)
  const groupByDate = (items) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
    const weekStart = new Date(today); weekStart.setDate(today.getDate() - 7);

    const groups = { Today: [], Yesterday: [], "This Week": [], Older: [] };

    items.forEach(item => {
      let d;
      if (item.createdAt?.toDate) {
        d = item.createdAt.toDate();
      } else if (item.createdAt) {
        d = new Date(item.createdAt);
      } else if (item.timestamp?.toDate) {
        d = item.timestamp.toDate();
      }
      if (!d || isNaN(d.getTime())) {
        groups["Today"].push(item); // Fallback to today
        return;
      }
      const itemDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      if (itemDate.getTime() === today.getTime()) groups["Today"].push(item);
      else if (itemDate.getTime() === yesterday.getTime()) groups["Yesterday"].push(item);
      else if (itemDate >= weekStart) groups["This Week"].push(item);
      else groups["Older"].push(item);
    });

    return Object.entries(groups)
      .filter(([, items]) => items.length > 0)
      .map(([label, items]) => ({ label, items }));
  };

  // Format Firestore timestamp for display
  const formatTimestamp = (ts) => {
    let d;
    if (ts?.toDate) d = ts.toDate();
    else if (ts) d = new Date(ts);
    if (!d || isNaN(d.getTime())) return "";
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const itemDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const timeStr = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    if (itemDate.getTime() === today.getTime()) return `Today at ${timeStr}`;
    const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
    if (itemDate.getTime() === yesterday.getTime()) return `Yesterday at ${timeStr}`;
    return `${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })} at ${timeStr}`;
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Notifications</Text>
          <Text style={styles.headerSubtitle}>{unreadCount} unread</Text>
        </View>
        <Pressable onPress={markAllRead}>
          <Text style={styles.markReadText}>Mark All Read</Text>
        </Pressable>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        {TABS.map((tab) => (
          <Pressable
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
            {(tab === "Schedule" || tab === "Assignment") && <View style={styles.tabDot} />}
          </Pressable>
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {loading ? (
          <ActivityIndicator color={PRIMARY_GREEN} style={{ marginTop: 50 }} />
        ) : filtered.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="notifications-off-outline" size={60} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>All caught up!</Text>
            <Text style={styles.emptySubtitle}>No notifications to display right now.</Text>
          </View>
        ) : (
          <>
            {groupByDate(filtered).map(({ label, items }) => (
              <View key={label}>
                <SectionHeader title={label} />
                {items.map((alert) => (
                  <NotificationCard
                    key={alert.id}
                    alert={alert}
                    onPress={() => markRead(alert.id)}
                  />
                ))}
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionHeader({ title }) {
  return <Text style={styles.sectionHeader}>{title}</Text>;
}

function NotificationCard({ alert, onPress }) {
  const getIconConfig = () => {
    if (alert.icon) return { name: alert.icon, color: alert.iconColor, bg: alert.iconBg };
    switch (alert.type?.toLowerCase()) {
      case 'shift': return { name: "time-outline", color: "#10B981", bg: "#F0FDF4" };
      case 'assignment': return { name: "person-add-outline", color: "#8B5CF6", bg: "#F5F3FF" };
      case 'schedule': return { name: "alert-circle-outline", color: "#EF4444", bg: "#FEF2F2" };
      default: return { name: "information-circle-outline", color: "#6B7280", bg: "#F3F4F6" };
    }
  };

  const icon = getIconConfig();

  return (
    <Pressable style={[styles.card, alert.read && styles.cardRead]} onPress={onPress}>
      <View style={[styles.iconBox, { backgroundColor: icon.bg }]}>
        <Ionicons name={icon.name} size={20} color={icon.color} />
      </View>
      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{alert.title}</Text>
          {alert.actionLabel && (
            <Pressable style={styles.actionBtn}>
              <Text style={styles.actionBtnText}>{alert.actionLabel}</Text>
            </Pressable>
          )}
          {alert.type === 'shift' && !alert.read && (
            <Pressable style={styles.actionBtn}>
              <Text style={styles.actionBtnText}>Check In</Text>
            </Pressable>
          )}
          {alert.type === 'schedule' && !alert.read && (
            <Pressable style={[styles.actionBtn, { backgroundColor: PRIMARY_GREEN }]}>
              <Text style={[styles.actionBtnText, { color: "#FFF" }]}>Confirm</Text>
            </Pressable>
          )}
        </View>
        <Text style={styles.cardMessage} numberOfLines={2}>{alert.message}</Text>
        <Text style={styles.cardTime}>
          {(() => {
            const ts = alert.createdAt || alert.timestamp;
            if (!ts) return "Just now";
            if (typeof ts === "string") return ts;
            let d;
            if (ts?.toDate) d = ts.toDate();
            else d = new Date(ts);
            if (!d || isNaN(d.getTime())) return "Just now";
            const now = new Date();
            const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const itemDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
            const timeStr = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
            if (itemDate.getTime() === todayStart.getTime()) return `Today at ${timeStr}`;
            const yday = new Date(todayStart); yday.setDate(todayStart.getDate() - 1);
            if (itemDate.getTime() === yday.getTime()) return `Yesterday at ${timeStr}`;
            return `${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })} at ${timeStr}`;
          })()}
        </Text>
      </View>
      {!alert.read && <View style={styles.unreadDot} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFF" },
  header: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    alignItems: "center", 
    paddingHorizontal: 20, 
    paddingTop: 10, 
    paddingBottom: 20 
  },
  headerTitle: { fontSize: 22, fontWeight: "800", color: DARK_TEXT, fontFamily: "Poppins-Bold" },
  headerSubtitle: { fontSize: 13, color: GRAY_TEXT, fontFamily: "Inter" },
  markReadText: { fontSize: 13, fontWeight: "700", color: PRIMARY_GREEN, fontFamily: "Inter-Bold" },
  
  tabContainer: { 
    flexDirection: "row", 
    paddingHorizontal: 20, 
    gap: 12, 
    marginBottom: 20 
  },
  tab: { 
    paddingHorizontal: 16, 
    paddingVertical: 10, 
    borderRadius: 20, 
    backgroundColor: "#F3F4F6",
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  },
  tabActive: { backgroundColor: PRIMARY_GREEN },
  tabText: { fontSize: 13, fontWeight: "600", color: GRAY_TEXT, fontFamily: "Inter-SemiBold" },
  tabTextActive: { color: "#FFF" },
  tabDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: "#EF4444" },
  
  scrollContent: { paddingHorizontal: 20, paddingBottom: 100 },
  sectionHeader: { fontSize: 14, fontWeight: "800", color: DARK_TEXT, marginTop: 10, marginBottom: 15, fontFamily: "Poppins-Bold" },
  
  card: { 
    flexDirection: "row", 
    backgroundColor: "#FFF", 
    borderRadius: 20, 
    padding: 18, 
    marginBottom: 12,
    borderWidth: 1, 
    borderColor: GRAY_BORDER,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2
  },
  cardRead: { opacity: 0.7, shadowOpacity: 0 },
  iconBox: { 
    width: 44, 
    height: 44, 
    borderRadius: 12, 
    alignItems: "center", 
    justifyContent: "center",
    marginRight: 15 
  },
  cardContent: { flex: 1 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 },
  cardTitle: { fontSize: 15, fontWeight: "700", color: DARK_TEXT, flex: 1, marginRight: 10, fontFamily: "Inter-Bold" },
  cardMessage: { fontSize: 13, color: GRAY_TEXT, lineHeight: 18, marginBottom: 8, fontFamily: "Inter" },
  cardTime: { fontSize: 11, color: "#9CA3AF", fontFamily: "Inter" },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: PRIMARY_GREEN, position: "absolute", right: 15, top: 18 },
  
  actionBtn: { 
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: 12, 
    borderWidth: 1, 
    borderColor: PRIMARY_GREEN,
    backgroundColor: "#F0FDF4"
  },
  actionBtnText: { fontSize: 12, fontWeight: "700", color: PRIMARY_GREEN, fontFamily: "Inter-Bold" },

  emptyContainer: { alignItems: "center", marginTop: 100 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: DARK_TEXT, marginTop: 15 },
  emptySubtitle: { fontSize: 14, color: GRAY_TEXT, textAlign: "center", marginTop: 8 },
});
