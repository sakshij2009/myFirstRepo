import { View, Text, ScrollView, Pressable, TextInput, Alert, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState, useEffect } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { collection, query, where, getDocs, updateDoc, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../src/firebase/config";

const GREEN = "#1F6F43";
const DEMO_MEDS = [
  { id: "m1", name: "Metformin", dosage: "500mg", time: "8:00 AM", route: "Oral", administered: false, notes: "" },
  { id: "m2", name: "Lisinopril", dosage: "10mg", time: "8:00 AM", route: "Oral", administered: false, notes: "" },
  { id: "m3", name: "Atorvastatin", dosage: "20mg", time: "9:00 PM", route: "Oral", administered: false, notes: "" },
];

export default function ShiftMedications() {
  const { shiftId } = useLocalSearchParams();
  const [shift, setShift] = useState(null);
  const [medications, setMedications] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const q = query(collection(db, "shifts"), where("id", "==", shiftId));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const data = { id: snap.docs[0].id, ref: snap.docs[0].ref, ...snap.docs[0].data() };
        setShift(data);
        const meds = data.medications?.length ? data.medications : DEMO_MEDS;
        setMedications(meds.map(m => ({ ...m, administered: m.administered || false, notes: m.notes || "" })));
      } else {
        setMedications(DEMO_MEDS);
      }
    } catch { setMedications(DEMO_MEDS); }
  };

  const toggleAdministered = (id) => {
    setMedications(prev => prev.map(m => m.id === id ? { ...m, administered: !m.administered } : m));
  };

  const updateNotes = (id, text) => {
    setMedications(prev => prev.map(m => m.id === id ? { ...m, notes: text } : m));
  };

  const allAdministered = medications.length > 0 && medications.every(m => m.administered);
  const adminCount = medications.filter(m => m.administered).length;

  const handleSave = async () => {
    setSaving(true);
    try {
      if (shift?.ref) {
        await updateDoc(shift.ref, { medications, medicationsLoggedAt: new Date().toISOString() });
      }
      await addDoc(collection(db, "medicationLogs"), {
        shiftId, medications,
        loggedAt: serverTimestamp(),
        staffId: (JSON.parse(await AsyncStorage.getItem("user") || "{}"))?.userId,
      });
      Alert.alert("Saved", "Medication log saved successfully.", [{ text: "OK", onPress: () => router.back() }]);
    } catch {
      Alert.alert("Error", "Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const routeColor = (r) => ({ Oral: "#dbeafe", Injection: "#fee2e2", Topical: "#fef3c7", Inhaled: "#d1fae5" }[r] || "#f3f4f6");
  const routeTextColor = (r) => ({ Oral: "#1e40af", Injection: "#991b1b", Topical: "#b45309", Inhaled: "#065f46" }[r] || "#374151");

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f8f8f6" }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Header */}
        <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 16, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#e5e7eb" }}>
          <Pressable onPress={() => router.back()} style={{ marginRight: 12 }}>
            <Ionicons name="arrow-back" size={24} color="#374151" />
          </Pressable>
          <Text style={{ fontSize: 18, fontWeight: "700", color: "#1a1a1a", flex: 1 }}>Medications</Text>
          {allAdministered && (
            <View style={{ backgroundColor: "#dcfce7", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 }}>
              <Text style={{ fontSize: 12, fontWeight: "600", color: "#166534" }}>All Given</Text>
            </View>
          )}
        </View>

        <View style={{ padding: 20 }}>
          {/* Shift Banner */}
          {shift && (
            <View style={{ backgroundColor: GREEN, borderRadius: 14, padding: 16, marginBottom: 20, flexDirection: "row", alignItems: "center" }}>
              <Ionicons name="person-circle" size={36} color="rgba(255,255,255,0.7)" style={{ marginRight: 12 }} />
              <View>
                <Text style={{ color: "#fff", fontSize: 15, fontWeight: "700" }}>{shift.clientName || shift.name || "Client"}</Text>
                <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 13 }}>{shift.startTime} – {shift.endTime}</Text>
              </View>
            </View>
          )}

          {/* Progress */}
          <View style={{ backgroundColor: "#fff", borderRadius: 14, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: "#e5e7eb" }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <Text style={{ fontSize: 14, fontWeight: "600", color: "#374151" }}>Progress</Text>
              <Text style={{ fontSize: 14, fontWeight: "700", color: GREEN }}>{adminCount}/{medications.length} administered</Text>
            </View>
            <View style={{ height: 8, backgroundColor: "#f3f4f6", borderRadius: 4, overflow: "hidden" }}>
              <View style={{ height: 8, backgroundColor: GREEN, borderRadius: 4, width: `${medications.length ? (adminCount / medications.length) * 100 : 0}%` }} />
            </View>
          </View>

          {/* Medication List */}
          {medications.length === 0 ? (
            <View style={{ alignItems: "center", paddingVertical: 60 }}>
              <Ionicons name="medical-outline" size={48} color="#d1d5db" />
              <Text style={{ fontSize: 16, fontWeight: "600", color: "#9ca3af", marginTop: 16 }}>No medications scheduled</Text>
            </View>
          ) : (
            medications.map(med => (
              <View key={med.id} style={{ backgroundColor: "#fff", borderRadius: 16, padding: 18, marginBottom: 12, borderWidth: 1.5, borderColor: med.administered ? GREEN : "#e5e7eb" }}>
                <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <Text style={{ fontSize: 16, fontWeight: "700", color: "#1a1a1a" }}>{med.name}</Text>
                      <View style={{ backgroundColor: routeColor(med.route), paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 }}>
                        <Text style={{ fontSize: 11, fontWeight: "600", color: routeTextColor(med.route) }}>{med.route}</Text>
                      </View>
                    </View>
                    <Text style={{ fontSize: 14, color: "#6b7280" }}>{med.dosage} • {med.time}</Text>
                  </View>
                  <Pressable onPress={() => toggleAdministered(med.id)} style={{ width: 28, height: 28, borderRadius: 8, borderWidth: 2, borderColor: med.administered ? GREEN : "#d1d5db", backgroundColor: med.administered ? GREEN : "#fff", alignItems: "center", justifyContent: "center" }}>
                    {med.administered && <Ionicons name="checkmark" size={16} color="#fff" />}
                  </Pressable>
                </View>

                {med.administered && (
                  <View>
                    <View style={{ backgroundColor: "#f0fdf4", borderRadius: 8, padding: 10, marginBottom: 10, flexDirection: "row", alignItems: "center" }}>
                      <Ionicons name="checkmark-circle" size={16} color={GREEN} style={{ marginRight: 6 }} />
                      <Text style={{ fontSize: 13, color: GREEN, fontWeight: "600" }}>Administered at {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</Text>
                    </View>
                    <TextInput
                      value={med.notes}
                      onChangeText={t => updateNotes(med.id, t)}
                      placeholder="Add notes (optional)..."
                      placeholderTextColor="#9ca3af"
                      style={{ borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 13, color: "#374151" }}
                    />
                  </View>
                )}
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Save Button */}
      <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: 20, backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: "#e5e7eb" }}>
        <Pressable onPress={handleSave} disabled={saving} style={{ backgroundColor: saving ? "#9ca3af" : GREEN, paddingVertical: 16, borderRadius: 14, alignItems: "center" }}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700" }}>Save Medication Log</Text>}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
