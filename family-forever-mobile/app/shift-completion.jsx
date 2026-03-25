import { View, Text, ScrollView, Pressable, TextInput, Alert, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState, useEffect } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { collection, query, where, getDocs, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../src/firebase/config";

const GREEN = "#1F6F43";

export default function ShiftCompletion() {
  const { shiftId } = useLocalSearchParams();
  const [shift, setShift] = useState(null);
  const [rating, setRating] = useState(0);
  const [finalNotes, setFinalNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadShift(); }, []);

  const loadShift = async () => {
    try {
      const q = query(collection(db, "shifts"), where("id", "==", shiftId));
      const snap = await getDocs(q);
      if (!snap.empty) setShift({ id: snap.docs[0].id, ref: snap.docs[0].ref, ...snap.docs[0].data() });
    } catch {}
  };

  const getDuration = () => {
    if (!shift?.checkInTime || !shift?.checkOutTime) return "N/A";
    const diff = (new Date(shift.checkOutTime) - new Date(shift.checkInTime)) / 1000 / 60;
    const h = Math.floor(diff / 60);
    const m = Math.floor(diff % 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  const handleFinish = async () => {
    setSaving(true);
    try {
      if (shift?.ref) {
        await updateDoc(shift.ref, { shiftRating: rating, finalNotes, completedAt: serverTimestamp() });
      }
      router.replace("/home");
    } catch {
      Alert.alert("Error", "Failed to save. Returning home.");
      router.replace("/home");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f8f8f6" }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Success Header */}
        <View style={{ backgroundColor: GREEN, paddingTop: 40, paddingBottom: 40, alignItems: "center" }}>
          <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
            <Ionicons name="checkmark-circle" size={52} color="#fff" />
          </View>
          <Text style={{ color: "#fff", fontSize: 26, fontWeight: "800", marginBottom: 6 }}>Shift Complete!</Text>
          <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 15, textAlign: "center", paddingHorizontal: 40 }}>Great work! Your shift has been logged successfully.</Text>
        </View>

        <View style={{ padding: 20 }}>
          {/* Shift Summary */}
          <View style={{ backgroundColor: "#fff", borderRadius: 20, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: "#e5e7eb" }}>
            <Text style={{ fontSize: 15, fontWeight: "700", color: "#1a1a1a", marginBottom: 16 }}>Shift Summary</Text>
            {[
              { icon: "person-outline", label: "Client", value: shift?.clientName || shift?.name || "Client" },
              { icon: "calendar-outline", label: "Date", value: shift?.startDate || "Today" },
              { icon: "time-outline", label: "Schedule", value: `${shift?.startTime} – ${shift?.endTime}` },
              { icon: "timer-outline", label: "Duration", value: getDuration() },
              { icon: "location-outline", label: "Location", value: shift?.location || "On-site" },
            ].map(({ icon, label, value }) => (
              <View key={label} style={{ flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" }}>
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "#f0fdf4", alignItems: "center", justifyContent: "center", marginRight: 12 }}>
                  <Ionicons name={icon} size={18} color={GREEN} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 12, color: "#9ca3af" }}>{label}</Text>
                  <Text style={{ fontSize: 14, fontWeight: "600", color: "#1a1a1a" }}>{value}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* Completed Tasks */}
          <View style={{ backgroundColor: "#fff", borderRadius: 20, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: "#e5e7eb" }}>
            <Text style={{ fontSize: 15, fontWeight: "700", color: "#1a1a1a", marginBottom: 14 }}>Completed Tasks</Text>
            {[
              { label: "Checked In", done: !!shift?.checkedIn },
              { label: "Intake Form", done: false },
              { label: "Medications Logged", done: false },
              { label: "Checked Out", done: !!shift?.checkedOut },
            ].map(({ label, done }) => (
              <View key={label} style={{ flexDirection: "row", alignItems: "center", paddingVertical: 8 }}>
                <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: done ? "#dcfce7" : "#f3f4f6", alignItems: "center", justifyContent: "center", marginRight: 12 }}>
                  <Ionicons name={done ? "checkmark" : "remove"} size={13} color={done ? GREEN : "#9ca3af"} />
                </View>
                <Text style={{ fontSize: 14, color: done ? "#1a1a1a" : "#9ca3af", fontWeight: done ? "600" : "400" }}>{label}</Text>
              </View>
            ))}
          </View>

          {/* Rating */}
          <View style={{ backgroundColor: "#fff", borderRadius: 20, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: "#e5e7eb" }}>
            <Text style={{ fontSize: 15, fontWeight: "700", color: "#1a1a1a", marginBottom: 6 }}>Rate Your Shift</Text>
            <Text style={{ fontSize: 13, color: "#9ca3af", marginBottom: 16 }}>Optional — helps us improve scheduling</Text>
            <View style={{ flexDirection: "row", justifyContent: "center", gap: 12 }}>
              {[1, 2, 3, 4, 5].map(star => (
                <Pressable key={star} onPress={() => setRating(star)}>
                  <Ionicons name={star <= rating ? "star" : "star-outline"} size={32} color={star <= rating ? "#f59e0b" : "#d1d5db"} />
                </Pressable>
              ))}
            </View>
            {rating > 0 && (
              <Text style={{ textAlign: "center", marginTop: 8, fontSize: 13, color: "#6b7280" }}>
                {["", "Poor", "Fair", "Good", "Very Good", "Excellent"][rating]}
              </Text>
            )}
          </View>

          {/* Final Notes */}
          <View style={{ backgroundColor: "#fff", borderRadius: 20, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: "#e5e7eb" }}>
            <Text style={{ fontSize: 15, fontWeight: "700", color: "#1a1a1a", marginBottom: 12 }}>Final Notes</Text>
            <TextInput value={finalNotes} onChangeText={setFinalNotes} placeholder="Any final observations or notes..." placeholderTextColor="#9ca3af" multiline numberOfLines={4} style={{ borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 10, padding: 12, fontSize: 14, color: "#374151", textAlignVertical: "top", minHeight: 100 }} />
          </View>
        </View>
      </ScrollView>

      {/* Bottom Actions */}
      <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: 20, backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: "#e5e7eb", gap: 10 }}>
        <Pressable onPress={handleFinish} disabled={saving} style={{ backgroundColor: saving ? "#9ca3af" : GREEN, paddingVertical: 16, borderRadius: 14, alignItems: "center" }}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700" }}>Submit & Go Home</Text>}
        </Pressable>
        <Pressable onPress={() => router.replace("/home")} style={{ paddingVertical: 12, alignItems: "center" }}>
          <Text style={{ color: "#6b7280", fontSize: 14 }}>Skip & Return Home</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
