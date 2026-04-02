import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect, useState, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { collection, query, onSnapshot, orderBy, updateDoc, doc, deleteDoc } from "firebase/firestore";
import { db } from "../src/firebase/config.jsx";

const GREEN = "#1f5f3b";
const BG = "#f4f6f5";

const FALLBACK_ALERTS = [
  {
    id: "s1",
    type: "warning",
    title: "Shift Confirmation Pending",
    message: "You have unconfirmed shifts. Please confirm your attendance.",
    time: "Just now",
    icon: "alert-circle",
    read: false,
  },
  {
    id: "s2",
    type: "info",
    title: "Schedule Updated",
    message: "Your shift schedule for next week has been updated by the admin.",
    time: "2 hours ago",
    icon: "information-circle",
    read: false,
  },
  {
    id: "s3",
    type: "success",
    title: "Leave Approved",
    message: "Your leave request has been approved.",
    time: "1 day ago",
    icon: "checkmark-circle",
    read: true,
  },
  {
    id: "s4",
    type: "warning",
    title: "Clock-In Reminder",
    message: "Don't forget to clock in for your upcoming shift.",
    time: "2 days ago",
    icon: "time",
    read: true,
  },
];

const TYPE_STYLES = {
  warning: {
    bg: "#fffbeb",
    border: "#fbbf24",
    iconColor: "#f59e0b",
    labelBg: "#fef3c7",
    labelText: "#b45309",
    label: "Action Required",
  },
  info: {
    bg: "#eff6ff",
    border: "#60a5fa",
    iconColor: "#3b82f6",
    labelBg: "#dbeafe",
    labelText: "#1e40af",
    label: "Info",
  },
  success: {
    bg: "#f0fdf4",
    border: "#6ee7b7",
    iconColor: "#10b981",
    labelBg: "#d1fae5",
    labelText: "#065f46",
    label: "Update",
  },
};

const TYPE_MAP = {
  transfer: { type: "info", icon: "swap-horizontal" },
  leave: { type: "success", icon: "calendar" },
  shift: { type: "warning", icon: "calendar-outline" },
  alert: { type: "warning", icon: "alert-circle" },
  info: { type: "info", icon: "information-circle" },
  success: { type: "success", icon: "checkmark-circle" },
  warning: { type: "warning", icon: "alert-circle" },
};

const formatTime = (ts) => {
  if (!ts) return "";
  try {
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    const diff = Date.now() - d.getTime();
    if (diff < 60000) return "Just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  } catch {
    return "";
  }
};

export default function Alerts() {
  const [user, setUser] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); 
  const [usingFallback, setUsingFallback] = useState(false);
  const pulseAnim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.4, duration: 1500, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  useEffect(() => {
    const load = async () => {
      const stored = await AsyncStorage.getItem("user");
      if (stored) setUser(JSON.parse(stored));
    };
    load();
  }, []);

  useEffect(() => {
    if (!user?.username) return;
    let unsub;
    try {
      const notifRef = collection(db, "notifications", user.username, "userNotifications");
      const q = query(notifRef, orderBy("createdAt", "desc"));
      unsub = onSnapshot(
        q,
        (snap) => {
          if (snap.empty) {
            setAlerts(FALLBACK_ALERTS);
            setUsingFallback(true);
          } else {
            const data = snap.docs.map((d) => {
              const raw = d.data();
              const typeCfg = TYPE_MAP[raw.type] || TYPE_MAP.info;
              return {
                id: d.id,
                firestoreId: d.id,
                type: typeCfg.type,
                icon: raw.icon || typeCfg.icon,
                title: raw.title || "Notification",
                message: raw.message || raw.body || "",
                time: formatTime(raw.createdAt),
                read: raw.read || false,
              };
            });
            setAlerts(data);
            setUsingFallback(false);
          }
          setLoading(false);
        },
        () => {
          setAlerts(FALLBACK_ALERTS);
          setUsingFallback(true);
          setLoading(false);
        }
      );
    } catch {
      setAlerts(FALLBACK_ALERTS);
      setUsingFallback(true);
      setLoading(false);
    }
    return () => unsub && unsub();
  }, [user]);

  const dismissAlert = async (id) => {
    if (!usingFallback && user?.username) {
      try {
        await deleteDoc(doc(db, "notifications", user.username, "userNotifications", id));
      } catch {}
    }
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  const markRead = async (id) => {
    if (!usingFallback && user?.username) {
      try {
        await updateDoc(doc(db, "notifications", user.username, "userNotifications", id), { read: true });
      } catch {}
    }
    setAlerts((prev) => prev.map((a) => a.id === id ? { ...a, read: true } : a));
  };

  const markAllRead = async () => {
    if (!usingFallback && user?.username) {
      alerts.filter((a) => !a.read).forEach(async (a) => {
        try {
          await updateDoc(doc(db, "notifications", user.username, "userNotifications", a.id), { read: true });
        } catch {}
      });
    }
    setAlerts((prev) => prev.map((a) => ({ ...a, read: true })));
  };

  const clearAll = async () => {
    if (!usingFallback && user?.username) {
      alerts.forEach(async (a) => {
        try {
          await deleteDoc(doc(db, "notifications", user.username, "userNotifications", a.id));
        } catch {}
      });
    }
    setAlerts([]);
  };

  const filtered = alerts.filter((a) => {
    if (filter === "unread") return !a.read;
    if (filter === "read") return a.read;
    return true;
  });

  const unreadCount = alerts.filter((a) => !a.read).length;

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: BG, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color={GREEN} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BG }}>
      {/* ── HEADER ── */}
      <View style={{
        backgroundColor: "#fff",
        borderBottomWidth: 1,
        borderBottomColor: "#e5e7eb",
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 12,
      }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
          <View>
            <Text style={{ fontSize: 11, fontWeight: "700", color: GREEN, letterSpacing: 1.2, marginBottom: 4 }}>
              NOTIFICATIONS
            </Text>
            <Text style={{ fontSize: 26, fontWeight: "800", color: "#111827" }}>
              Alerts
            </Text>
          </View>
          {unreadCount > 0 && (
            <Pressable
              onPress={markAllRead}
              style={{
                paddingHorizontal: 12, paddingVertical: 7,
                borderRadius: 8,
                borderWidth: 1, borderColor: GREEN,
                marginTop: 4,
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: "700", color: GREEN }}>
                Mark all read
              </Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* ── FILTER TABS ── */}
      <View style={{
        flexDirection: "row",
        paddingHorizontal: 16, paddingVertical: 10,
        gap: 8,
        backgroundColor: "#fff",
        borderBottomWidth: 1,
        borderBottomColor: "#f3f4f6",
      }}>
        {[
          { key: "all", label: `All (${alerts.length})` },
          { key: "unread", label: `Unread (${unreadCount})` },
          { key: "read", label: "Read" },
        ].map((f) => (
          <Pressable
            key={f.key}
            onPress={() => setFilter(f.key)}
            style={{
              paddingHorizontal: 14, paddingVertical: 7,
              borderRadius: 20,
              backgroundColor: filter === f.key ? GREEN : "#f3f4f6",
            }}
          >
            <Text style={{
              fontSize: 12, fontWeight: "700",
              color: filter === f.key ? "#fff" : "#6b7280",
            }}>
              {f.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* ── ALERTS LIST ── */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        {filtered.length === 0 ? (
          <View style={{
            backgroundColor: "#fff", borderRadius: 16,
            padding: 48, alignItems: "center",
            borderWidth: 1, borderColor: "#e5e7eb",
          }}>
            <View style={{
              width: 72, height: 72, borderRadius: 36,
              backgroundColor: "#d1fae5",
              alignItems: "center", justifyContent: "center",
              marginBottom: 16,
            }}>
              <Ionicons name="notifications-off-outline" size={36} color={GREEN} />
            </View>
            <Text style={{ fontSize: 17, fontWeight: "800", color: "#374151" }}>
              All caught up!
            </Text>
            <Text style={{ fontSize: 13, color: "#9ca3af", marginTop: 6, textAlign: "center" }}>
              No {filter !== "all" ? filter + " " : ""}notifications here
            </Text>
          </View>
        ) : (
          filtered.map((alert, idx) => {
            const ts = TYPE_STYLES[alert.type] || TYPE_STYLES.info;
            return (
              <Pressable
                key={alert.id}
                onPress={() => markRead(alert.id)}
                style={{
                  backgroundColor: "#fff",
                  borderRadius: 16,
                  marginBottom: 10,
                  overflow: "hidden",
                  borderWidth: 1,
                  borderColor: alert.read ? "#e5e7eb" : ts.border,
                  opacity: alert.read ? 0.8 : 1,
                }}
              >
                {/* Accent bar */}
                <View style={{ height: 3, backgroundColor: alert.read ? "#e5e7eb" : ts.border }} />

                <View style={{ padding: 14, flexDirection: "row", gap: 12, alignItems: "flex-start" }}>
                  {/* Icon */}
                  <View style={{
                    width: 44, height: 44, borderRadius: 22,
                    backgroundColor: ts.bg,
                    alignItems: "center", justifyContent: "center",
                    flexShrink: 0,
                  }}>
                    <Ionicons
                      name={alert.icon}
                      size={22}
                      color={alert.read ? "#9ca3af" : ts.iconColor}
                    />
                  </View>

                  {/* Content */}
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <View style={{
                        backgroundColor: alert.read ? "#f3f4f6" : ts.labelBg,
                        paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6,
                      }}>
                        <Text style={{
                          fontSize: 10, fontWeight: "700",
                          color: alert.read ? "#9ca3af" : ts.labelText,
                          letterSpacing: 0.5,
                        }}>
                          {ts.label.toUpperCase()}
                        </Text>
                      </View>
                      {!alert.read && (
                        <Animated.View style={{
                          width: 8, height: 8, borderRadius: 4,
                          backgroundColor: ts.iconColor,
                          opacity: pulseAnim,
                        }} />
                      )}
                    </View>

                    <Text style={{
                      fontSize: 14, fontWeight: "700",
                      color: alert.read ? "#6b7280" : "#111827",
                      marginBottom: 4,
                    }}>
                      {alert.title}
                    </Text>

                    <Text style={{
                      fontSize: 12, color: "#6b7280",
                      lineHeight: 17, marginBottom: 6,
                    }}>
                      {alert.message}
                    </Text>

                    <Text style={{ fontSize: 11, color: "#d1d5db", fontWeight: "600" }}>
                      {alert.time}
                    </Text>
                  </View>

                  {/* Dismiss */}
                  <Pressable
                    onPress={() => dismissAlert(alert.id)}
                    style={{ padding: 4 }}
                    hitSlop={8}
                  >
                    <Ionicons name="close" size={17} color="#d1d5db" />
                  </Pressable>
                </View>
              </Pressable>
            );
          })
        )}

        {/* Clear all */}
        {alerts.length > 0 && (
          <Pressable
            onPress={clearAll}
            style={{
              borderWidth: 1, borderColor: "#e5e7eb",
              borderRadius: 12, paddingVertical: 13,
              alignItems: "center", backgroundColor: "#fff",
              marginTop: 8,
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: "600", color: "#9ca3af" }}>
              Clear All Notifications
            </Text>
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
