import { View, Text, ScrollView, Pressable, Alert, Linking, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState, useEffect } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { collection, query, where, getDocs, updateDoc } from "firebase/firestore";
import { db } from "../src/firebase/config";

const GREEN = "#1F6F43";

const CHECKLIST_ITEMS = [
  { id: "c1", label: "Vehicle inspection completed" },
  { id: "c2", label: "Passenger safely seated and belt fastened" },
  { id: "c3", label: "Destination confirmed with passenger" },
  { id: "c4", label: "Route planned and reviewed" },
];

export default function TransportationShiftDetail() {
  const { shiftId, taskId } = useLocalSearchParams();
  const [shift, setShift] = useState(null);
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checklist, setChecklist] = useState(CHECKLIST_ITEMS.map((i) => ({ ...i, checked: false })));
  const [submitting, setSubmitting] = useState(false);
  const [mileageStart, setMileageStart] = useState(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "shifts"), where("id", "==", shiftId));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const data = { id: snap.docs[0].id, ref: snap.docs[0].ref, ...snap.docs[0].data() };
        setShift(data);
        if (taskId && data.transportTasks) {
          const found = data.transportTasks.find((t) => t.id === taskId);
          if (found) {
            setTask(found);
            setMileageStart(found.mileageStart || null);
          }
        }
      }
    } catch (e) {
      console.log("Error loading transportation shift detail:", e);
    } finally {
      setLoading(false);
    }
  };

  const toggleCheck = (id) => {
    setChecklist((prev) => prev.map((c) => c.id === id ? { ...c, checked: !c.checked } : c));
  };

  const allChecked = checklist.every((c) => c.checked);

  const handleBeginRoute = () => {
    if (!allChecked) {
      Alert.alert("Pre-Trip Checklist", "Please complete all pre-trip checks before starting the route.");
      return;
    }
    const passenger = task?.passenger || shift?.clientName || "";
    const pickup = task?.pickup || task?.pickupLocation || shift?.pickupLocation || shift?.location || "";
    const destination = task?.destination || task?.dropLocation || shift?.dropLocation || shift?.destination || "";
    router.push(
      `/active-route?shiftId=${shiftId}&taskId=${taskId || ""}&pickup=${encodeURIComponent(pickup)}&destination=${encodeURIComponent(destination)}&passenger=${encodeURIComponent(passenger)}`
    );
  };

  const handleCompleteTrip = async () => {
    Alert.alert("Complete Trip?", "Mark this transportation task as completed?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Complete",
        onPress: async () => {
          setSubmitting(true);
          try {
            if (shift?.ref && task) {
              const updatedTasks = (shift.transportTasks || []).map((t) =>
                t.id === task.id ? { ...t, status: "Completed", completedAt: new Date().toISOString() } : t
              );
              await updateDoc(shift.ref, { transportTasks: updatedTasks });
            }
            Alert.alert("Trip Completed", "The transportation task has been marked as completed.", [
              { text: "OK", onPress: () => router.back() },
            ]);
          } catch {
            Alert.alert("Error", "Failed to complete trip.");
          } finally {
            setSubmitting(false);
          }
        },
      },
    ]);
  };

  const openNavigation = (location) => {
    if (!location) return;
    Linking.openURL(`https://maps.google.com/?q=${encodeURIComponent(location)}`).catch(() =>
      Alert.alert("Error", "Could not open maps.")
    );
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
  const displayDrop = task?.destination || task?.dropLocation || shift?.dropLocation || shift?.destination || "Drop-off";
  const displayTime = task?.time || (shift ? `${shift.startTime} – ${shift.endTime}` : "—");
  const status = task?.status || "Pending";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f8f8f6" }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Header */}
        <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 16, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#e5e7eb" }}>
          <Pressable onPress={() => router.back()} style={{ marginRight: 12 }}>
            <Ionicons name="arrow-back" size={24} color="#374151" />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 18, fontWeight: "700", color: "#1a1a1a" }}>Transportation</Text>
            <Text style={{ fontSize: 12, color: "#9ca3af" }}>{displayTime}</Text>
          </View>
          {status === "Completed" ? (
            <View style={{ backgroundColor: "#dcfce7", paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 }}>
              <Text style={{ fontSize: 12, fontWeight: "700", color: GREEN }}>Completed</Text>
            </View>
          ) : status === "In Progress" ? (
            <View style={{ backgroundColor: "#dbeafe", paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 }}>
              <Text style={{ fontSize: 12, fontWeight: "700", color: "#1e40af" }}>In Progress</Text>
            </View>
          ) : (
            <View style={{ backgroundColor: "#fef3c7", paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 }}>
              <Text style={{ fontSize: 12, fontWeight: "700", color: "#b45309" }}>Pending</Text>
            </View>
          )}
        </View>

        <View style={{ padding: 20 }}>
          {/* Passenger Card */}
          <View style={{ backgroundColor: GREEN, borderRadius: 18, padding: 20, marginBottom: 20 }}>
            <Text style={{ fontSize: 12, fontWeight: "600", color: "rgba(255,255,255,0.7)", marginBottom: 10 }}>PASSENGER</Text>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center", marginRight: 14 }}>
                <Text style={{ fontSize: 16, fontWeight: "800", color: "#fff" }}>
                  {displayClient.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 18, fontWeight: "800", color: "#fff" }}>{displayClient}</Text>
                <Text style={{ fontSize: 13, color: "rgba(255,255,255,0.75)", marginTop: 2 }}>{shift?.startDate || "—"}</Text>
              </View>
              <Pressable
                onPress={() => openNavigation(displayPickup)}
                style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" }}
              >
                <Ionicons name="navigate" size={22} color="#fff" />
              </Pressable>
            </View>
          </View>

          {/* Route Card */}
          <View style={{ backgroundColor: "#fff", borderRadius: 16, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: "#e5e7eb" }}>
            <Text style={{ fontSize: 13, fontWeight: "600", color: "#9ca3af", marginBottom: 14 }}>ROUTE</Text>

            <View style={{ flexDirection: "row", alignItems: "flex-start", marginBottom: 12 }}>
              <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: "#dcfce7", alignItems: "center", justifyContent: "center", marginRight: 12, marginTop: 2 }}>
                <Ionicons name="radio-button-on" size={16} color={GREEN} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 11, color: "#9ca3af", fontWeight: "600", marginBottom: 2 }}>PICKUP</Text>
                <Text style={{ fontSize: 14, fontWeight: "600", color: "#1a1a1a" }}>{displayPickup}</Text>
              </View>
              <Pressable onPress={() => openNavigation(displayPickup)} hitSlop={8}>
                <Ionicons name="open-outline" size={16} color={GREEN} />
              </Pressable>
            </View>

            <View style={{ width: 2, height: 20, backgroundColor: "#d1d5db", marginLeft: 15, marginBottom: 12 }} />

            <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
              <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: "#fee2e2", alignItems: "center", justifyContent: "center", marginRight: 12, marginTop: 2 }}>
                <Ionicons name="location" size={16} color="#dc2626" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 11, color: "#9ca3af", fontWeight: "600", marginBottom: 2 }}>DROP-OFF</Text>
                <Text style={{ fontSize: 14, fontWeight: "600", color: "#1a1a1a" }}>{displayDrop}</Text>
              </View>
              <Pressable onPress={() => openNavigation(displayDrop)} hitSlop={8}>
                <Ionicons name="open-outline" size={16} color="#dc2626" />
              </Pressable>
            </View>
          </View>

          {/* Pre-Trip Checklist */}
          {status === "Pending" && (
            <View style={{ backgroundColor: "#fff", borderRadius: 16, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: "#e5e7eb" }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <Text style={{ fontSize: 14, fontWeight: "700", color: "#1a1a1a" }}>Pre-Trip Checklist</Text>
                <Text style={{ fontSize: 12, color: allChecked ? GREEN : "#9ca3af", fontWeight: "600" }}>
                  {checklist.filter((c) => c.checked).length}/{checklist.length}
                </Text>
              </View>
              {checklist.map((item) => (
                <Pressable
                  key={item.id}
                  onPress={() => toggleCheck(item.id)}
                  style={{ flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" }}
                >
                  <View style={{
                    width: 22, height: 22, borderRadius: 6, borderWidth: 2,
                    borderColor: item.checked ? GREEN : "#d1d5db",
                    backgroundColor: item.checked ? GREEN : "#fff",
                    alignItems: "center", justifyContent: "center", marginRight: 12,
                  }}>
                    {item.checked && <Ionicons name="checkmark" size={14} color="#fff" />}
                  </View>
                  <Text style={{ fontSize: 14, color: item.checked ? "#9ca3af" : "#374151", flex: 1, textDecorationLine: item.checked ? "line-through" : "none" }}>
                    {item.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}

          {/* Quick Actions */}
          <View style={{ flexDirection: "row", gap: 10, marginBottom: 16 }}>
            <Pressable
              onPress={() => router.push(`/vehicle-check?shiftId=${shiftId}`)}
              style={{ flex: 1, backgroundColor: "#fff", borderRadius: 14, padding: 14, alignItems: "center", borderWidth: 1, borderColor: "#e5e7eb" }}
            >
              <Ionicons name="car-outline" size={22} color="#7c3aed" />
              <Text style={{ fontSize: 11, fontWeight: "600", color: "#374151", marginTop: 6, textAlign: "center" }}>Vehicle{"\n"}Check</Text>
            </Pressable>
            <Pressable
              onPress={() => router.push(`/transportation-detail?shiftId=${shiftId}&taskId=${taskId || ""}`)}
              style={{ flex: 1, backgroundColor: "#fff", borderRadius: 14, padding: 14, alignItems: "center", borderWidth: 1, borderColor: "#e5e7eb" }}
            >
              <Ionicons name="map-outline" size={22} color="#0369a1" />
              <Text style={{ fontSize: 11, fontWeight: "600", color: "#374151", marginTop: 6, textAlign: "center" }}>Route{"\n"}Map</Text>
            </Pressable>
            <Pressable
              onPress={() => router.push(`/shift-detail?shiftId=${shiftId}`)}
              style={{ flex: 1, backgroundColor: "#fff", borderRadius: 14, padding: 14, alignItems: "center", borderWidth: 1, borderColor: "#e5e7eb" }}
            >
              <Ionicons name="person-outline" size={22} color={GREEN} />
              <Text style={{ fontSize: 11, fontWeight: "600", color: "#374151", marginTop: 6, textAlign: "center" }}>Client{"\n"}Info</Text>
            </Pressable>
          </View>

          {/* Info Banner */}
          {!allChecked && status === "Pending" && (
            <View style={{ backgroundColor: "#fffbeb", borderRadius: 12, padding: 14, flexDirection: "row", alignItems: "flex-start" }}>
              <Ionicons name="information-circle" size={18} color="#d97706" style={{ marginRight: 10, marginTop: 1 }} />
              <Text style={{ fontSize: 13, color: "#92400e", flex: 1 }}>Complete the pre-trip checklist before beginning the route.</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Bottom CTA */}
      <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: 20, backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: "#e5e7eb" }}>
        {status === "Completed" ? (
          <View style={{ backgroundColor: "#dcfce7", paddingVertical: 16, borderRadius: 14, alignItems: "center", flexDirection: "row", justifyContent: "center" }}>
            <Ionicons name="checkmark-circle" size={20} color={GREEN} style={{ marginRight: 10 }} />
            <Text style={{ color: GREEN, fontSize: 16, fontWeight: "700" }}>Trip Completed</Text>
          </View>
        ) : status === "In Progress" ? (
          <View style={{ flexDirection: "row", gap: 12 }}>
            <Pressable
              onPress={handleBeginRoute}
              style={{ flex: 1, backgroundColor: GREEN, paddingVertical: 16, borderRadius: 14, alignItems: "center", flexDirection: "row", justifyContent: "center" }}
            >
              <Ionicons name="navigate" size={18} color="#fff" style={{ marginRight: 8 }} />
              <Text style={{ color: "#fff", fontSize: 15, fontWeight: "700" }}>Continue Route</Text>
            </Pressable>
            <Pressable
              onPress={handleCompleteTrip}
              disabled={submitting}
              style={{ flex: 1, backgroundColor: submitting ? "#9ca3af" : "#0369a1", paddingVertical: 16, borderRadius: 14, alignItems: "center" }}
            >
              {submitting ? <ActivityIndicator color="#fff" /> : <Text style={{ color: "#fff", fontSize: 15, fontWeight: "700" }}>Complete</Text>}
            </Pressable>
          </View>
        ) : (
          <Pressable
            onPress={handleBeginRoute}
            style={{ backgroundColor: allChecked ? GREEN : "#9ca3af", paddingVertical: 16, borderRadius: 14, alignItems: "center", flexDirection: "row", justifyContent: "center" }}
          >
            <Ionicons name="navigate" size={20} color="#fff" style={{ marginRight: 10 }} />
            <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700" }}>Begin Route</Text>
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  );
}
