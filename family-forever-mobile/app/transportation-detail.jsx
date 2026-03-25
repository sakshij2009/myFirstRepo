import { View, Text, ScrollView, Pressable, Alert, Linking, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState, useEffect } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { collection, query, where, getDocs, updateDoc, doc } from "firebase/firestore";
import { db } from "../src/firebase/config";

const GREEN = "#1F6F43";

const STATUS_CONFIG = {
  Pending: { label: "Pending", bg: "#fef3c7", text: "#b45309", icon: "time-outline" },
  "In Progress": { label: "In Progress", bg: "#dbeafe", text: "#1e40af", icon: "navigate-outline" },
  Completed: { label: "Completed", bg: "#dcfce7", text: "#166534", icon: "checkmark-circle-outline" },
};

export default function TransportationDetail() {
  const { shiftId, taskId } = useLocalSearchParams();
  const [shift, setShift] = useState(null);
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      if (shiftId) {
        const q = query(collection(db, "shifts"), where("id", "==", shiftId));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const data = { id: snap.docs[0].id, ref: snap.docs[0].ref, ...snap.docs[0].data() };
          setShift(data);
          if (taskId && data.transportTasks) {
            const found = data.transportTasks.find((t) => t.id === taskId);
            if (found) setTask(found);
          }
        }
      }
      // If params include direct task info (from routes tab), populate from params
      const params = useLocalSearchParams ? {} : {};
    } catch (e) {
      console.log("Error loading transportation detail:", e);
    } finally {
      setLoading(false);
    }
  };

  const openNavigation = (location) => {
    if (!location) return;
    const url = `https://maps.google.com/?q=${encodeURIComponent(location)}`;
    Linking.openURL(url).catch(() => Alert.alert("Error", "Could not open maps."));
  };

  const startRoute = async () => {
    if (task) {
      router.push(
        `/active-route?shiftId=${shiftId}&taskId=${task.id}&pickup=${encodeURIComponent(task.pickup || task.pickupLocation || "")}&destination=${encodeURIComponent(task.destination || task.dropLocation || "")}&passenger=${encodeURIComponent(task.passenger || shift?.clientName || "")}`
      );
    } else if (shift) {
      router.push(
        `/active-route?shiftId=${shiftId}&pickup=${encodeURIComponent(shift.pickupLocation || shift.location || "")}&destination=${encodeURIComponent(shift.dropLocation || shift.destination || "")}&passenger=${encodeURIComponent(shift.clientName || "")}`
      );
    }
  };

  const markCompleted = async () => {
    Alert.alert("Complete Route?", "Mark this route as completed?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Complete",
        onPress: async () => {
          setUpdating(true);
          try {
            if (shift?.ref && task) {
              const updatedTasks = (shift.transportTasks || []).map((t) =>
                t.id === task.id ? { ...t, status: "Completed" } : t
              );
              await updateDoc(shift.ref, { transportTasks: updatedTasks });
            }
            Alert.alert("Done", "Route marked as completed.", [
              { text: "OK", onPress: () => router.back() },
            ]);
          } catch {
            Alert.alert("Error", "Failed to update route status.");
          } finally {
            setUpdating(false);
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#f8f8f6", alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color={GREEN} />
      </SafeAreaView>
    );
  }

  const displayClient = task?.passenger || shift?.clientName || shift?.name || "Client";
  const displayPickup = task?.pickup || task?.pickupLocation || shift?.pickupLocation || shift?.location || "Pickup location";
  const displayDrop = task?.destination || task?.dropLocation || shift?.dropLocation || shift?.destination || "Drop-off location";
  const displayTime = task?.time || (shift ? `${shift.startTime} – ${shift.endTime}` : "—");
  const displayDate = shift?.startDate || "—";
  const status = task?.status || shift?.status || "Pending";
  const statusCfg = STATUS_CONFIG[status] || STATUS_CONFIG.Pending;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f8f8f6" }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Header */}
        <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 16, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#e5e7eb" }}>
          <Pressable onPress={() => router.back()} style={{ marginRight: 12 }}>
            <Ionicons name="arrow-back" size={24} color="#374151" />
          </Pressable>
          <Text style={{ fontSize: 18, fontWeight: "700", color: "#1a1a1a", flex: 1 }}>Route Detail</Text>
          <View style={{ backgroundColor: statusCfg.bg, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 }}>
            <Text style={{ fontSize: 12, fontWeight: "700", color: statusCfg.text }}>{statusCfg.label}</Text>
          </View>
        </View>

        <View style={{ padding: 20 }}>
          {/* Map Placeholder */}
          <View style={{ backgroundColor: "#e8f4fd", borderRadius: 20, height: 160, alignItems: "center", justifyContent: "center", marginBottom: 20, overflow: "hidden" }}>
            <View style={{ alignItems: "center" }}>
              <Ionicons name="map" size={48} color="#93c5fd" />
              <Text style={{ fontSize: 13, color: "#60a5fa", marginTop: 8, fontWeight: "600" }}>Route Map</Text>
              <Pressable
                onPress={() => openNavigation(displayPickup)}
                style={{ marginTop: 8, backgroundColor: GREEN, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, flexDirection: "row", alignItems: "center" }}
              >
                <Ionicons name="navigate" size={14} color="#fff" style={{ marginRight: 6 }} />
                <Text style={{ fontSize: 12, fontWeight: "700", color: "#fff" }}>Open in Maps</Text>
              </Pressable>
            </View>
          </View>

          {/* Route Info Card */}
          <View style={{ backgroundColor: "#fff", borderRadius: 16, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: "#e5e7eb" }}>
            <Text style={{ fontSize: 13, fontWeight: "600", color: "#9ca3af", marginBottom: 14 }}>ROUTE INFORMATION</Text>

            {/* Passenger/Client */}
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" }}>
              <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: "#e0f2fe", alignItems: "center", justifyContent: "center", marginRight: 14 }}>
                <Text style={{ fontSize: 15, fontWeight: "700", color: "#0369a1" }}>
                  {displayClient.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: "700", color: "#1a1a1a" }}>{displayClient}</Text>
                <Text style={{ fontSize: 13, color: "#9ca3af" }}>Passenger</Text>
              </View>
            </View>

            {/* Route Stops */}
            <View style={{ marginBottom: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" }}>
              <View style={{ flexDirection: "row", alignItems: "flex-start", marginBottom: 12 }}>
                <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: "#dcfce7", alignItems: "center", justifyContent: "center", marginRight: 12 }}>
                  <Ionicons name="radio-button-on" size={16} color={GREEN} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, color: "#9ca3af", fontWeight: "600", marginBottom: 2 }}>PICKUP</Text>
                  <Text style={{ fontSize: 14, fontWeight: "600", color: "#1a1a1a" }}>{displayPickup}</Text>
                </View>
                <Pressable onPress={() => openNavigation(displayPickup)} style={{ padding: 8 }}>
                  <Ionicons name="navigate-outline" size={18} color={GREEN} />
                </Pressable>
              </View>

              {/* Connector line */}
              <View style={{ width: 2, height: 24, backgroundColor: "#d1d5db", marginLeft: 15, marginBottom: 12 }} />

              <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
                <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: "#fee2e2", alignItems: "center", justifyContent: "center", marginRight: 12 }}>
                  <Ionicons name="location" size={16} color="#dc2626" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, color: "#9ca3af", fontWeight: "600", marginBottom: 2 }}>DROP-OFF</Text>
                  <Text style={{ fontSize: 14, fontWeight: "600", color: "#1a1a1a" }}>{displayDrop}</Text>
                </View>
                <Pressable onPress={() => openNavigation(displayDrop)} style={{ padding: 8 }}>
                  <Ionicons name="navigate-outline" size={18} color="#dc2626" />
                </Pressable>
              </View>
            </View>

            {/* Time and Date */}
            <View style={{ flexDirection: "row", gap: 16 }}>
              <View style={{ flex: 1, flexDirection: "row", alignItems: "center" }}>
                <Ionicons name="time-outline" size={16} color="#9ca3af" style={{ marginRight: 8 }} />
                <View>
                  <Text style={{ fontSize: 11, color: "#9ca3af", fontWeight: "600" }}>TIME</Text>
                  <Text style={{ fontSize: 13, fontWeight: "600", color: "#374151" }}>{displayTime}</Text>
                </View>
              </View>
              <View style={{ flex: 1, flexDirection: "row", alignItems: "center" }}>
                <Ionicons name="calendar-outline" size={16} color="#9ca3af" style={{ marginRight: 8 }} />
                <View>
                  <Text style={{ fontSize: 11, color: "#9ca3af", fontWeight: "600" }}>DATE</Text>
                  <Text style={{ fontSize: 13, fontWeight: "600", color: "#374151" }}>{displayDate}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Quick Actions */}
          <View style={{ flexDirection: "row", gap: 10, marginBottom: 16 }}>
            <Pressable
              onPress={() => router.push(`/vehicle-check?shiftId=${shiftId}`)}
              style={{ flex: 1, backgroundColor: "#fff", borderRadius: 14, padding: 16, alignItems: "center", borderWidth: 1, borderColor: "#e5e7eb" }}
            >
              <Ionicons name="car-outline" size={24} color="#7c3aed" />
              <Text style={{ fontSize: 12, fontWeight: "600", color: "#374151", marginTop: 8, textAlign: "center" }}>Vehicle Check</Text>
            </Pressable>
            <Pressable
              onPress={() => openNavigation(displayPickup)}
              style={{ flex: 1, backgroundColor: "#fff", borderRadius: 14, padding: 16, alignItems: "center", borderWidth: 1, borderColor: "#e5e7eb" }}
            >
              <Ionicons name="compass-outline" size={24} color="#0369a1" />
              <Text style={{ fontSize: 12, fontWeight: "600", color: "#374151", marginTop: 8, textAlign: "center" }}>Navigate</Text>
            </Pressable>
            <Pressable
              onPress={() => router.push(`/shift-detail?shiftId=${shiftId}`)}
              style={{ flex: 1, backgroundColor: "#fff", borderRadius: 14, padding: 16, alignItems: "center", borderWidth: 1, borderColor: "#e5e7eb" }}
            >
              <Ionicons name="document-text-outline" size={24} color={GREEN} />
              <Text style={{ fontSize: 12, fontWeight: "600", color: "#374151", marginTop: 8, textAlign: "center" }}>Shift Detail</Text>
            </Pressable>
          </View>

          {/* Notes */}
          {(shift?.notes || task?.notes) && (
            <View style={{ backgroundColor: "#fffbeb", borderRadius: 14, padding: 16, borderWidth: 1, borderColor: "#fcd34d", marginBottom: 16 }}>
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
                <Ionicons name="document-text-outline" size={16} color="#b45309" style={{ marginRight: 8 }} />
                <Text style={{ fontSize: 13, fontWeight: "700", color: "#b45309" }}>Notes</Text>
              </View>
              <Text style={{ fontSize: 13, color: "#78350f" }}>{task?.notes || shift?.notes}</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Bottom Actions */}
      <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: 20, backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: "#e5e7eb" }}>
        {status === "Pending" ? (
          <Pressable
            onPress={startRoute}
            style={{ backgroundColor: GREEN, paddingVertical: 16, borderRadius: 14, alignItems: "center", flexDirection: "row", justifyContent: "center" }}
          >
            <Ionicons name="navigate" size={20} color="#fff" style={{ marginRight: 10 }} />
            <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700" }}>Start Route</Text>
          </Pressable>
        ) : status === "In Progress" ? (
          <Pressable
            onPress={markCompleted}
            disabled={updating}
            style={{ backgroundColor: updating ? "#9ca3af" : "#0369a1", paddingVertical: 16, borderRadius: 14, alignItems: "center", flexDirection: "row", justifyContent: "center" }}
          >
            {updating ? <ActivityIndicator color="#fff" /> : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#fff" style={{ marginRight: 10 }} />
                <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700" }}>Complete Route</Text>
              </>
            )}
          </Pressable>
        ) : (
          <View style={{ backgroundColor: "#dcfce7", paddingVertical: 16, borderRadius: 14, alignItems: "center", flexDirection: "row", justifyContent: "center" }}>
            <Ionicons name="checkmark-circle" size={20} color={GREEN} style={{ marginRight: 10 }} />
            <Text style={{ color: GREEN, fontSize: 16, fontWeight: "700" }}>Route Completed</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
