import { View, Text, ScrollView, Pressable, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState, useEffect } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { collection, query, where, getDocs, updateDoc } from "firebase/firestore";
import { db } from "../src/firebase/config";

const GREEN = "#1F6F43";
const DEMO_TASKS = [
  { id: "t1", passenger: "Margaret Thompson", pickup: "42 Oak Street, Springfield", destination: "Springfield Medical Center", time: "9:00 AM", status: "Pending" },
  { id: "t2", passenger: "Robert Davis", pickup: "Springfield Medical Center", destination: "15 Elm Avenue, Springfield", time: "11:30 AM", status: "Pending" },
  { id: "t3", passenger: "Helen Carter", pickup: "78 Pine Road, Springfield", destination: "Community Center, 5 Main St", time: "2:00 PM", status: "Pending" },
];

const STATUS_COLORS = {
  Pending: { bg: "#fef3c7", text: "#b45309", border: "#fcd34d" },
  "In Progress": { bg: "#dbeafe", text: "#1e40af", border: "#93c5fd" },
  Completed: { bg: "#dcfce7", text: "#166534", border: "#86efac" },
};

export default function ShiftTransportations() {
  const { shiftId } = useLocalSearchParams();
  const [shift, setShift] = useState(null);
  const [tasks, setTasks] = useState([]);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const q = query(collection(db, "shifts"), where("id", "==", shiftId));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const data = { id: snap.docs[0].id, ref: snap.docs[0].ref, ...snap.docs[0].data() };
        setShift(data);
        setTasks(data.transportTasks?.length ? data.transportTasks : DEMO_TASKS);
      } else {
        setTasks(DEMO_TASKS);
      }
    } catch { setTasks(DEMO_TASKS); }
  };

  const updateStatus = (id, newStatus) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status: newStatus } : t));
  };

  const startRoute = (task) => {
    updateStatus(task.id, "In Progress");
    router.push(`/active-route?shiftId=${shiftId}&taskId=${task.id}&pickup=${encodeURIComponent(task.pickup)}&destination=${encodeURIComponent(task.destination)}&passenger=${encodeURIComponent(task.passenger)}`);
  };

  const completeTask = (id) => {
    Alert.alert("Complete Task?", "Mark this transportation task as completed?", [
      { text: "Cancel", style: "cancel" },
      { text: "Complete", onPress: () => updateStatus(id, "Completed") },
    ]);
  };

  const completed = tasks.filter(t => t.status === "Completed").length;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f8f8f6" }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Header */}
        <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 16, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#e5e7eb" }}>
          <Pressable onPress={() => router.back()} style={{ marginRight: 12 }}>
            <Ionicons name="arrow-back" size={24} color="#374151" />
          </Pressable>
          <Text style={{ fontSize: 18, fontWeight: "700", color: "#1a1a1a", flex: 1 }}>Transportation Tasks</Text>
          <Text style={{ fontSize: 13, fontWeight: "600", color: GREEN }}>{completed}/{tasks.length}</Text>
        </View>

        <View style={{ padding: 20 }}>
          {/* Shift Banner */}
          {shift && (
            <View style={{ backgroundColor: "#fff7ed", borderRadius: 14, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: "#fed7aa" }}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Ionicons name="car" size={20} color="#ea580c" style={{ marginRight: 10 }} />
                <View>
                  <Text style={{ fontSize: 14, fontWeight: "700", color: "#1a1a1a" }}>{shift.clientName || "Client"}</Text>
                  <Text style={{ fontSize: 13, color: "#6b7280" }}>{shift.startTime} – {shift.endTime}</Text>
                </View>
              </View>
            </View>
          )}

          {/* Progress */}
          <View style={{ backgroundColor: "#fff", borderRadius: 14, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: "#e5e7eb" }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 10 }}>
              <Text style={{ fontSize: 14, fontWeight: "600", color: "#374151" }}>Routes Progress</Text>
              <Text style={{ fontSize: 14, fontWeight: "700", color: GREEN }}>{completed} of {tasks.length} done</Text>
            </View>
            <View style={{ height: 8, backgroundColor: "#f3f4f6", borderRadius: 4, overflow: "hidden" }}>
              <View style={{ height: 8, backgroundColor: GREEN, borderRadius: 4, width: `${tasks.length ? (completed / tasks.length) * 100 : 0}%` }} />
            </View>
          </View>

          {/* Task List */}
          {tasks.map((task, idx) => {
            const colors = STATUS_COLORS[task.status] || STATUS_COLORS.Pending;
            return (
              <View key={task.id} style={{ backgroundColor: "#fff", borderRadius: 16, marginBottom: 14, borderWidth: 1, borderColor: "#e5e7eb", overflow: "hidden" }}>
                {/* Status Bar */}
                <View style={{ backgroundColor: colors.bg, paddingHorizontal: 16, paddingVertical: 8, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Text style={{ fontSize: 12, fontWeight: "600", color: colors.text }}>Route {idx + 1}</Text>
                  <View style={{ backgroundColor: colors.border + "60", paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 }}>
                    <Text style={{ fontSize: 11, fontWeight: "700", color: colors.text }}>{task.status}</Text>
                  </View>
                </View>

                <View style={{ padding: 16 }}>
                  {/* Passenger */}
                  <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 14 }}>
                    <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "#e0f2fe", alignItems: "center", justifyContent: "center", marginRight: 10 }}>
                      <Text style={{ fontSize: 13, fontWeight: "700", color: "#0369a1" }}>{task.passenger.split(" ").map(w => w[0]).join("").slice(0,2)}</Text>
                    </View>
                    <View>
                      <Text style={{ fontSize: 14, fontWeight: "700", color: "#1a1a1a" }}>{task.passenger}</Text>
                      <Text style={{ fontSize: 12, color: "#9ca3af" }}>Scheduled: {task.time}</Text>
                    </View>
                  </View>

                  {/* Route */}
                  <View style={{ marginBottom: 14 }}>
                    <View style={{ flexDirection: "row", alignItems: "flex-start", marginBottom: 8 }}>
                      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: GREEN, marginTop: 4, marginRight: 10 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 11, color: "#9ca3af", fontWeight: "600" }}>PICKUP</Text>
                        <Text style={{ fontSize: 13, color: "#374151" }}>{task.pickup}</Text>
                      </View>
                    </View>
                    <View style={{ width: 2, height: 20, backgroundColor: "#d1d5db", marginLeft: 4, marginBottom: 8 }} />
                    <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
                      <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: "#ef4444", marginTop: 4, marginRight: 10 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 11, color: "#9ca3af", fontWeight: "600" }}>DESTINATION</Text>
                        <Text style={{ fontSize: 13, color: "#374151" }}>{task.destination}</Text>
                      </View>
                    </View>
                  </View>

                  {/* Action */}
                  {task.status === "Pending" && (
                    <Pressable onPress={() => startRoute(task)} style={{ backgroundColor: GREEN, borderRadius: 10, paddingVertical: 12, alignItems: "center", flexDirection: "row", justifyContent: "center" }}>
                      <Ionicons name="navigate" size={16} color="#fff" style={{ marginRight: 8 }} />
                      <Text style={{ color: "#fff", fontSize: 14, fontWeight: "700" }}>Start Route</Text>
                    </Pressable>
                  )}
                  {task.status === "In Progress" && (
                    <Pressable onPress={() => completeTask(task.id)} style={{ backgroundColor: "#dbeafe", borderRadius: 10, paddingVertical: 12, alignItems: "center", borderWidth: 1, borderColor: "#93c5fd" }}>
                      <Text style={{ color: "#1e40af", fontSize: 14, fontWeight: "700" }}>Mark as Completed</Text>
                    </Pressable>
                  )}
                  {task.status === "Completed" && (
                    <View style={{ backgroundColor: "#f0fdf4", borderRadius: 10, paddingVertical: 12, alignItems: "center", borderWidth: 1, borderColor: "#86efac" }}>
                      <Text style={{ color: GREEN, fontSize: 14, fontWeight: "700" }}>✓ Completed</Text>
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
