import { View, Text, ScrollView, Pressable, TextInput, Alert, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState, useEffect } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { collection, query, where, getDocs, updateDoc } from "firebase/firestore";
import { db } from "../src/firebase/config";

const GREEN = "#1F6F43";

export default function CompleteShift() {
  const { shiftId } = useLocalSearchParams();
  const [shift, setShift] = useState(null);
  const [shiftNotes, setShiftNotes] = useState("");
  const [completing, setCompleting] = useState(false);
  const [checklist, setChecklist] = useState({
    checkedIn: false, intakeForm: false, medicationsLogged: false, clientSignature: false, shiftNotes: false,
  });

  useEffect(() => { loadShift(); }, []);

  const loadShift = async () => {
    try {
      const q = query(collection(db, "shifts"), where("id", "==", shiftId));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const data = { id: snap.docs[0].id, ref: snap.docs[0].ref, ...snap.docs[0].data() };
        setShift(data);
        setChecklist(prev => ({
          ...prev,
          checkedIn: !!data.checkedIn,
          intakeForm: !!data.intakeFormSubmitted,
          medicationsLogged: !!data.medicationsLoggedAt,
        }));
      }
    } catch {}
  };

  const toggleItem = (key) => {
    if (key === "checkedIn") return; // auto-set, not toggleable
    setChecklist(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const requiredItems = ["checkedIn", "intakeForm"];
  const allRequired = requiredItems.every(k => checklist[k]);

  const CHECKLIST_ITEMS = [
    { key: "checkedIn", label: "Checked In", desc: "GPS verified check-in", required: true },
    { key: "intakeForm", label: "Intake Form", desc: "Client assessment completed", required: true },
    { key: "medicationsLogged", label: "Medications Logged", desc: "All medications recorded", required: false },
    { key: "clientSignature", label: "Client Signature", desc: "Client acknowledged service", required: false },
    { key: "shiftNotes", label: "Shift Notes Added", desc: "Shift summary written", required: false },
  ];

  const handleComplete = async () => {
    if (!allRequired) {
      Alert.alert("Incomplete", "Please complete all required items before finishing the shift.");
      return;
    }
    if (!shiftNotes.trim()) {
      Alert.alert("Notes Required", "Please add shift notes before completing.");
      return;
    }
    setCompleting(true);
    try {
      if (shift?.ref) {
        await updateDoc(shift.ref, {
          status: "Completed",
          shiftNotes,
          completionChecklist: checklist,
          completedAt: new Date().toISOString(),
        });
      }
      router.replace(`/geo-checkout?shiftId=${shiftId}`);
    } catch {
      Alert.alert("Error", "Failed to complete shift. Try again.");
    } finally {
      setCompleting(false);
    }
  };

  const completedCount = Object.values(checklist).filter(Boolean).length;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f8f8f6" }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Header */}
        <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 16, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#e5e7eb" }}>
          <Pressable onPress={() => router.back()} style={{ marginRight: 12 }}>
            <Ionicons name="arrow-back" size={24} color="#374151" />
          </Pressable>
          <Text style={{ fontSize: 18, fontWeight: "700", color: "#1a1a1a", flex: 1 }}>Complete Shift</Text>
        </View>

        <View style={{ padding: 20 }}>
          {/* Progress Ring */}
          <View style={{ backgroundColor: GREEN, borderRadius: 20, padding: 24, alignItems: "center", marginBottom: 20 }}>
            <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 12, fontWeight: "600", marginBottom: 4 }}>PRE-COMPLETION CHECKLIST</Text>
            <Text style={{ color: "#fff", fontSize: 40, fontWeight: "800" }}>{completedCount}<Text style={{ fontSize: 20, color: "rgba(255,255,255,0.5)" }}>/{CHECKLIST_ITEMS.length}</Text></Text>
            <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 13 }}>items completed</Text>
            <View style={{ width: "80%", height: 6, backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 3, marginTop: 16, overflow: "hidden" }}>
              <View style={{ height: 6, backgroundColor: "#fff", borderRadius: 3, width: `${(completedCount / CHECKLIST_ITEMS.length) * 100}%` }} />
            </View>
          </View>

          {/* Shift Info */}
          {shift && (
            <View style={{ backgroundColor: "#fff", borderRadius: 14, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: "#e5e7eb" }}>
              <Text style={{ fontSize: 15, fontWeight: "700", color: "#1a1a1a", marginBottom: 4 }}>{shift.clientName || shift.name}</Text>
              <Text style={{ fontSize: 13, color: "#6b7280" }}>{shift.startDate} • {shift.startTime} – {shift.endTime}</Text>
            </View>
          )}

          {/* Checklist */}
          <View style={{ backgroundColor: "#fff", borderRadius: 16, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: "#e5e7eb" }}>
            <Text style={{ fontSize: 15, fontWeight: "700", color: "#1a1a1a", marginBottom: 16 }}>Checklist</Text>
            {CHECKLIST_ITEMS.map(item => (
              <Pressable key={item.key} onPress={() => toggleItem(item.key)} style={{ flexDirection: "row", alignItems: "center", paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" }}>
                <View style={{ width: 26, height: 26, borderRadius: 8, borderWidth: 2, borderColor: checklist[item.key] ? GREEN : "#d1d5db", backgroundColor: checklist[item.key] ? GREEN : "#fff", alignItems: "center", justifyContent: "center", marginRight: 14 }}>
                  {checklist[item.key] && <Ionicons name="checkmark" size={14} color="#fff" />}
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Text style={{ fontSize: 14, fontWeight: "600", color: checklist[item.key] ? "#1a1a1a" : "#6b7280" }}>{item.label}</Text>
                    {item.required && <View style={{ backgroundColor: "#fee2e2", paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4, marginLeft: 8 }}><Text style={{ fontSize: 10, fontWeight: "700", color: "#ef4444" }}>REQ</Text></View>}
                  </View>
                  <Text style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}>{item.desc}</Text>
                </View>
                {item.key !== "checkedIn" && (
                  <Ionicons name={checklist[item.key] ? "checkmark-circle" : "ellipse-outline"} size={20} color={checklist[item.key] ? GREEN : "#d1d5db"} />
                )}
              </Pressable>
            ))}
          </View>

          {/* Quick Actions */}
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 20 }}>
            {[
              { label: "Intake Form", icon: "document-text", route: `/intake-form?shiftId=${shiftId}` },
              { label: "Medications", icon: "medical", route: `/shift-medications?shiftId=${shiftId}` },
            ].map(({ label, icon, route }) => (
              <Pressable key={label} onPress={() => router.push(route)} style={{ flex: 1, backgroundColor: "#fff", borderRadius: 12, padding: 14, alignItems: "center", borderWidth: 1, borderColor: "#e5e7eb", flexDirection: "row", justifyContent: "center" }}>
                <Ionicons name={icon} size={18} color={GREEN} style={{ marginRight: 8 }} />
                <Text style={{ fontSize: 13, fontWeight: "600", color: GREEN }}>{label}</Text>
              </Pressable>
            ))}
          </View>

          {/* Shift Notes */}
          <View style={{ backgroundColor: "#fff", borderRadius: 16, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: "#e5e7eb" }}>
            <Text style={{ fontSize: 15, fontWeight: "700", color: "#1a1a1a", marginBottom: 4 }}>Shift Notes <Text style={{ color: "#ef4444" }}>*</Text></Text>
            <Text style={{ fontSize: 12, color: "#9ca3af", marginBottom: 12 }}>Required before completing</Text>
            <TextInput value={shiftNotes} onChangeText={setShiftNotes} placeholder="Summarize what happened during the shift..." placeholderTextColor="#9ca3af" multiline numberOfLines={5} style={{ borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 10, padding: 12, fontSize: 14, color: "#374151", textAlignVertical: "top", minHeight: 120 }} />
          </View>
        </View>
      </ScrollView>

      {/* Complete Button */}
      <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: 20, backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: "#e5e7eb" }}>
        {!allRequired && (
          <View style={{ backgroundColor: "#fef3c7", borderRadius: 10, padding: 12, marginBottom: 12, flexDirection: "row", alignItems: "center" }}>
            <Ionicons name="alert-circle" size={16} color="#d97706" style={{ marginRight: 8 }} />
            <Text style={{ fontSize: 12, color: "#92400e", flex: 1 }}>Complete required checklist items before finishing.</Text>
          </View>
        )}
        <Pressable onPress={handleComplete} disabled={completing} style={{ backgroundColor: completing ? "#9ca3af" : allRequired ? GREEN : "#9ca3af", paddingVertical: 16, borderRadius: 14, alignItems: "center" }}>
          {completing ? <ActivityIndicator color="#fff" /> : <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700" }}>Complete Shift & Check Out</Text>}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
