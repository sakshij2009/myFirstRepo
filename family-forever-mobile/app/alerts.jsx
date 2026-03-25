import {
  View,
  Text,
  ScrollView,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../src/firebase/config.jsx";

const GREEN = "#1f5f3b";
const BG = "#f4f6f5";

const SAMPLE_ALERTS = [
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

export default function Alerts() {
  const [user, setUser] = useState(null);
  const [alerts, setAlerts] = useState(SAMPLE_ALERTS);
  const [filter, setFilter] = useState("all"); // all | unread | read

  useEffect(() => {
    const load = async () => {
      const stored = await AsyncStorage.getItem("user");
      if (stored) setUser(JSON.parse(stored));
    };
    load();
  }, []);

  const dismissAlert = (id) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  const markRead = (id) => {
    setAlerts((prev) => prev.map((a) => a.id === id ? { ...a, read: true } : a));
  };

  const markAllRead = () => {
    setAlerts((prev) => prev.map((a) => ({ ...a, read: true })));
  };

  const clearAll = () => {
    setAlerts([]);
  };

  const filtered = alerts.filter((a) => {
    if (filter === "unread") return !a.read;
    if (filter === "read") return a.read;
    return true;
  });

  const unreadCount = alerts.filter((a) => !a.read).length;

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
                        <View style={{
                          width: 7, height: 7, borderRadius: 4,
                          backgroundColor: ts.iconColor,
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
