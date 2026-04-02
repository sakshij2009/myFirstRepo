import { View, Text, ScrollView, Pressable, TextInput, Alert, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState, useEffect } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { collection, query, where, getDocs, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../src/firebase/config";

const GREEN = "#1F6F43";
const ACTIVITIES = ["Meal Preparation", "Personal Hygiene", "Bathing/Showering", "Medication Administration", "Exercise/Mobility", "Social Interaction", "Housekeeping", "Laundry", "Shopping/Errands"];

export default function IntakeForm() {
  const { shiftId } = useLocalSearchParams();
  const [shift, setShift] = useState(null);
  const [formType, setFormType] = useState("intake"); // 'intake' or 'private'
  const [arrivalCondition, setArrivalCondition] = useState("");
  const [conditionNotes, setConditionNotes] = useState("");
  const [vitals, setVitals] = useState({ bp: "", pulse: "", temp: "", spo2: "", weight: "" });
  const [activities, setActivities] = useState([]);
  const [hasIncident, setHasIncident] = useState(false);
  const [incidentDesc, setIncidentDesc] = useState("");
  const [staffNotes, setStaffNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const sections = ["Arrival", "Vitals", "Activities", "Incidents", "Notes"];
  const totalFilled = [arrivalCondition, Object.values(vitals).some(v => v), activities.length > 0, true, true].filter(Boolean).length;

  useEffect(() => { loadShift(); }, []);

  const loadShift = async () => {
    try {
      const q = query(collection(db, "shifts"), where("id", "==", shiftId));
      const snap = await getDocs(q);
      if (!snap.empty) setShift({ id: snap.docs[0].id, ...snap.docs[0].data() });
    } catch {}
  };

  const toggleActivity = (act) => {
    setActivities(prev => prev.includes(act) ? prev.filter(a => a !== act) : [...prev, act]);
  };

  const handleSubmit = async () => {
    if (!arrivalCondition) { Alert.alert("Required", "Please select the client's arrival condition."); return; }
    setSaving(true);
    try {
      const user = JSON.parse(await AsyncStorage.getItem("user") || "{}");
      await addDoc(collection(db, "intakeForms"), {
        shiftId, clientName: shift?.clientName || shift?.name,
        formType, // 'intake' or 'private'
        arrivalCondition, conditionNotes, vitals, activitiesCompleted: activities,
        hasIncident, incidentDescription: incidentDesc, staffNotes,
        staffId: user?.userId, staffName: user?.name,
        showWorkerInfo: formType === "intake", // Flag for showing worker information
        submittedAt: serverTimestamp(),
      });
      const typeLabel = formType === "intake" ? "Intake Form" : "Private Form";
      Alert.alert("Submitted", `${typeLabel} saved successfully.`, [{ text: "OK", onPress: () => router.back() }]);
    } catch {
      Alert.alert("Error", "Failed to save form. Try again.");
    } finally {
      setSaving(false);
    }
  };

  const ConditionButton = ({ label, color }) => (
    <Pressable onPress={() => setArrivalCondition(label)} style={{ flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: "center", borderWidth: 2, borderColor: arrivalCondition === label ? color : "#e5e7eb", backgroundColor: arrivalCondition === label ? color + "20" : "#fff" }}>
      <Text style={{ fontSize: 13, fontWeight: "700", color: arrivalCondition === label ? color : "#6b7280" }}>{label}</Text>
    </Pressable>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f8f8f6" }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Header */}
        <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 16, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#e5e7eb" }}>
          <Pressable onPress={() => router.back()} style={{ marginRight: 12 }}>
            <Ionicons name="arrow-back" size={24} color="#374151" />
          </Pressable>
          <Text style={{ fontSize: 18, fontWeight: "700", color: "#1a1a1a", flex: 1 }}>Intake Form</Text>
          <Text style={{ fontSize: 13, color: GREEN, fontWeight: "600" }}>{totalFilled}/5</Text>
        </View>

        {/* Progress */}
        <View style={{ height: 4, backgroundColor: "#f3f4f6" }}>
          <View style={{ height: 4, backgroundColor: GREEN, width: `${(totalFilled / 5) * 100}%` }} />
        </View>

        <View style={{ padding: 20 }}>
          {/* Form Type Selector */}
          <View style={{ backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: "#e5e7eb" }}>
            <Text style={{ fontSize: 13, fontWeight: "600", color: "#6b7280", marginBottom: 12 }}>FORM TYPE</Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {["intake", "private"].map((type) => (
                <Pressable
                  key={type}
                  onPress={() => setFormType(type)}
                  style={{
                    flex: 1,
                    paddingVertical: 10,
                    paddingHorizontal: 16,
                    borderRadius: 10,
                    borderWidth: 2,
                    borderColor: formType === type ? GREEN : "#e5e7eb",
                    backgroundColor: formType === type ? GREEN + "15" : "#fff",
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "600",
                      color: formType === type ? GREEN : "#6b7280",
                      textTransform: "capitalize",
                    }}
                  >
                    {type === "intake" ? "Intake" : "Private"}
                  </Text>
                </Pressable>
              ))}
            </View>
            {formType === "private" && (
              <Text style={{ fontSize: 11, color: "#9ca3af", marginTop: 10 }}>Private forms won't display staff worker information in reports.</Text>
            )}
          </View>

          {/* Client Banner */}
          {shift && (
            <View style={{ backgroundColor: GREEN, borderRadius: 14, padding: 16, marginBottom: 20 }}>
              <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 12, fontWeight: "600" }}>CLIENT</Text>
              <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700", marginTop: 2 }}>{shift.clientName || shift.name}</Text>
              <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 13 }}>{shift.startDate} • {shift.startTime} – {shift.endTime}</Text>
            </View>
          )}

          {/* Section 1: Arrival Condition */}
          <View style={{ backgroundColor: "#fff", borderRadius: 16, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: "#e5e7eb" }}>
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}>
              <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: "#f0fdf4", alignItems: "center", justifyContent: "center", marginRight: 10 }}>
                <Text style={{ fontSize: 13, fontWeight: "800", color: GREEN }}>1</Text>
              </View>
              <Text style={{ fontSize: 15, fontWeight: "700", color: "#1a1a1a" }}>Arrival Condition</Text>
            </View>
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 14 }}>
              <ConditionButton label="Good" color="#22c55e" />
              <ConditionButton label="Fair" color="#f59e0b" />
              <ConditionButton label="Poor" color="#ef4444" />
            </View>
            <TextInput value={conditionNotes} onChangeText={setConditionNotes} placeholder="Notes about client's condition..." placeholderTextColor="#9ca3af" multiline numberOfLines={2} style={{ borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 10, padding: 12, fontSize: 13, color: "#374151", textAlignVertical: "top" }} />
          </View>

          {/* Section 2: Vital Signs */}
          <View style={{ backgroundColor: "#fff", borderRadius: 16, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: "#e5e7eb" }}>
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}>
              <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: "#f0fdf4", alignItems: "center", justifyContent: "center", marginRight: 10 }}>
                <Text style={{ fontSize: 13, fontWeight: "800", color: GREEN }}>2</Text>
              </View>
              <Text style={{ fontSize: 15, fontWeight: "700", color: "#1a1a1a" }}>Vital Signs</Text>
            </View>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
              {[{ key: "bp", label: "Blood Pressure", placeholder: "120/80" }, { key: "pulse", label: "Pulse", placeholder: "72 bpm" }, { key: "temp", label: "Temperature", placeholder: "98.6°F" }, { key: "spo2", label: "SpO2", placeholder: "98%" }, { key: "weight", label: "Weight", placeholder: "lbs" }].map(v => (
                <View key={v.key} style={{ width: "47%" }}>
                  <Text style={{ fontSize: 12, fontWeight: "600", color: "#6b7280", marginBottom: 6 }}>{v.label}</Text>
                  <TextInput value={vitals[v.key]} onChangeText={t => setVitals(prev => ({ ...prev, [v.key]: t }))} placeholder={v.placeholder} placeholderTextColor="#9ca3af" style={{ borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: "#374151", backgroundColor: "#fafafa" }} />
                </View>
              ))}
            </View>
          </View>

          {/* Section 3: Activities */}
          <View style={{ backgroundColor: "#fff", borderRadius: 16, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: "#e5e7eb" }}>
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}>
              <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: "#f0fdf4", alignItems: "center", justifyContent: "center", marginRight: 10 }}>
                <Text style={{ fontSize: 13, fontWeight: "800", color: GREEN }}>3</Text>
              </View>
              <Text style={{ fontSize: 15, fontWeight: "700", color: "#1a1a1a" }}>Activities Completed</Text>
            </View>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {ACTIVITIES.map(act => (
                <Pressable key={act} onPress={() => toggleActivity(act)} style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: activities.includes(act) ? GREEN : "#e5e7eb", backgroundColor: activities.includes(act) ? "#f0fdf4" : "#fff" }}>
                  {activities.includes(act) && <Ionicons name="checkmark" size={14} color={GREEN} style={{ marginRight: 4 }} />}
                  <Text style={{ fontSize: 12, fontWeight: "600", color: activities.includes(act) ? GREEN : "#6b7280" }}>{act}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Section 4: Incidents */}
          <View style={{ backgroundColor: "#fff", borderRadius: 16, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: "#e5e7eb" }}>
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}>
              <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: "#f0fdf4", alignItems: "center", justifyContent: "center", marginRight: 10 }}>
                <Text style={{ fontSize: 13, fontWeight: "800", color: GREEN }}>4</Text>
              </View>
              <Text style={{ fontSize: 15, fontWeight: "700", color: "#1a1a1a", flex: 1 }}>Incidents</Text>
              <Pressable onPress={() => setHasIncident(!hasIncident)} style={{ width: 46, height: 26, borderRadius: 13, backgroundColor: hasIncident ? "#ef4444" : "#d1d5db", justifyContent: "center", paddingHorizontal: 3 }}>
                <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: "#fff", alignSelf: hasIncident ? "flex-end" : "flex-start" }} />
              </Pressable>
            </View>
            {hasIncident && (
              <TextInput value={incidentDesc} onChangeText={setIncidentDesc} placeholder="Describe the incident..." placeholderTextColor="#9ca3af" multiline numberOfLines={3} style={{ borderWidth: 1, borderColor: "#fca5a5", borderRadius: 10, padding: 12, fontSize: 13, color: "#374151", textAlignVertical: "top", backgroundColor: "#fff5f5" }} />
            )}
            {!hasIncident && <Text style={{ fontSize: 13, color: "#9ca3af" }}>No incidents to report</Text>}
          </View>

          {/* Section 5: Staff Notes */}
          <View style={{ backgroundColor: "#fff", borderRadius: 16, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: "#e5e7eb" }}>
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}>
              <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: "#f0fdf4", alignItems: "center", justifyContent: "center", marginRight: 10 }}>
                <Text style={{ fontSize: 13, fontWeight: "800", color: GREEN }}>5</Text>
              </View>
              <Text style={{ fontSize: 15, fontWeight: "700", color: "#1a1a1a" }}>Staff Notes</Text>
            </View>
            <TextInput value={staffNotes} onChangeText={setStaffNotes} placeholder="General observations, client mood, any concerns..." placeholderTextColor="#9ca3af" multiline numberOfLines={5} style={{ borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 10, padding: 12, fontSize: 13, color: "#374151", textAlignVertical: "top", minHeight: 120 }} />
          </View>
        </View>
      </ScrollView>

      {/* Submit */}
      <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: 20, backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: "#e5e7eb" }}>
        <Pressable onPress={handleSubmit} disabled={saving} style={{ backgroundColor: saving ? "#9ca3af" : GREEN, paddingVertical: 16, borderRadius: 14, alignItems: "center" }}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700" }}>Submit Intake Form</Text>}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
