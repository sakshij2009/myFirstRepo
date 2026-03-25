import { View, Text, ScrollView, Pressable, TextInput, Alert, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState, useEffect } from "react";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../src/firebase/config";

const GREEN = "#1F6F43";
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const TEMPLATES = [
  { label: "Full Time", desc: "Mon–Fri, 9:00 AM – 5:00 PM", days: [0,1,2,3,4], start: "9:00 AM", end: "5:00 PM" },
  { label: "Part Time", desc: "Mon/Wed/Fri, 10:00 AM – 3:00 PM", days: [0,2,4], start: "10:00 AM", end: "3:00 PM" },
  { label: "Weekends", desc: "Sat & Sun, 8:00 AM – 4:00 PM", days: [5,6], start: "8:00 AM", end: "4:00 PM" },
];

const defaultSchedule = () => DAYS.map((d, i) => ({ day: d, enabled: i < 5, start: "9:00 AM", end: "5:00 PM", maxHours: "8" }));

export default function SetRecurringHours() {
  const [schedule, setSchedule] = useState(defaultSchedule());
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    const stored = await AsyncStorage.getItem("user");
    if (!stored) return;
    const u = JSON.parse(stored);
    setUser(u);
    try {
      const snap = await getDoc(doc(db, "users", u.username));
      if (snap.exists() && snap.data().recurringSchedule) {
        setSchedule(snap.data().recurringSchedule);
      }
    } catch {}
  };

  const toggleDay = (idx) => setSchedule(prev => prev.map((d, i) => i === idx ? { ...d, enabled: !d.enabled } : d));
  const updateField = (idx, field, val) => setSchedule(prev => prev.map((d, i) => i === idx ? { ...d, [field]: val } : d));

  const applyTemplate = (tmpl) => {
    setSchedule(DAYS.map((d, i) => ({
      day: d,
      enabled: tmpl.days.includes(i),
      start: tmpl.days.includes(i) ? tmpl.start : "9:00 AM",
      end: tmpl.days.includes(i) ? tmpl.end : "5:00 PM",
      maxHours: "8",
    })));
  };

  const totalWeeklyHours = () => {
    return schedule.filter(d => d.enabled).reduce((sum, d) => {
      return sum + parseFloat(d.maxHours || 0);
    }, 0);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (user) await updateDoc(doc(db, "users", user.username), { recurringSchedule: schedule });
      Alert.alert("Saved", "Recurring schedule updated.", [{ text: "OK", onPress: () => router.back() }]);
    } catch {
      Alert.alert("Error", "Failed to save. Try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f8f8f6" }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Header */}
        <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 16, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#e5e7eb" }}>
          <Pressable onPress={() => router.back()} style={{ marginRight: 12 }}>
            <Ionicons name="arrow-back" size={24} color="#374151" />
          </Pressable>
          <Text style={{ fontSize: 18, fontWeight: "700", color: "#1a1a1a", flex: 1 }}>Recurring Hours</Text>
          <View style={{ backgroundColor: "#f0fdf4", paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 }}>
            <Text style={{ fontSize: 12, fontWeight: "700", color: GREEN }}>{totalWeeklyHours()}h/week</Text>
          </View>
        </View>

        <View style={{ padding: 20 }}>
          {/* Templates */}
          <Text style={{ fontSize: 15, fontWeight: "700", color: "#1a1a1a", marginBottom: 12 }}>Quick Templates</Text>
          <View style={{ flexDirection: "row", gap: 10, marginBottom: 24 }}>
            {TEMPLATES.map(tmpl => (
              <Pressable key={tmpl.label} onPress={() => applyTemplate(tmpl)} style={{ flex: 1, backgroundColor: "#fff", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: "#e5e7eb", alignItems: "center" }}>
                <Text style={{ fontSize: 13, fontWeight: "700", color: GREEN }}>{tmpl.label}</Text>
                <Text style={{ fontSize: 10, color: "#9ca3af", textAlign: "center", marginTop: 3 }}>{tmpl.desc}</Text>
              </Pressable>
            ))}
          </View>

          {/* Weekly Schedule */}
          <Text style={{ fontSize: 15, fontWeight: "700", color: "#1a1a1a", marginBottom: 14 }}>Weekly Schedule</Text>
          {schedule.map((day, idx) => (
            <View key={day.day} style={{ backgroundColor: "#fff", borderRadius: 14, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: day.enabled ? GREEN + "40" : "#e5e7eb" }}>
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: day.enabled ? 12 : 0 }}>
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: day.enabled ? "#f0fdf4" : "#f3f4f6", alignItems: "center", justifyContent: "center", marginRight: 12 }}>
                  <Text style={{ fontSize: 13, fontWeight: "800", color: day.enabled ? GREEN : "#9ca3af" }}>{day.day}</Text>
                </View>
                <Text style={{ flex: 1, fontSize: 14, fontWeight: "600", color: day.enabled ? "#1a1a1a" : "#9ca3af" }}>{["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"][idx]}</Text>
                <Pressable onPress={() => toggleDay(idx)} style={{ width: 46, height: 26, borderRadius: 13, backgroundColor: day.enabled ? GREEN : "#d1d5db", justifyContent: "center", paddingHorizontal: 3 }}>
                  <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: "#fff", alignSelf: day.enabled ? "flex-end" : "flex-start" }} />
                </Pressable>
              </View>
              {day.enabled && (
                <View style={{ flexDirection: "row", gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 11, color: "#9ca3af", fontWeight: "600", marginBottom: 6 }}>START TIME</Text>
                    <TextInput value={day.start} onChangeText={v => updateField(idx, "start", v)} style={{ borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13, color: "#374151" }} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 11, color: "#9ca3af", fontWeight: "600", marginBottom: 6 }}>END TIME</Text>
                    <TextInput value={day.end} onChangeText={v => updateField(idx, "end", v)} style={{ borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13, color: "#374151" }} />
                  </View>
                  <View style={{ width: 60 }}>
                    <Text style={{ fontSize: 11, color: "#9ca3af", fontWeight: "600", marginBottom: 6 }}>MAX HRS</Text>
                    <TextInput value={day.maxHours} onChangeText={v => updateField(idx, "maxHours", v)} keyboardType="numeric" style={{ borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13, color: "#374151" }} />
                  </View>
                </View>
              )}
            </View>
          ))}

          {/* Monthly Limit */}
          <View style={{ backgroundColor: "#fff", borderRadius: 14, padding: 16, marginTop: 8, borderWidth: 1, borderColor: "#e5e7eb" }}>
            <Text style={{ fontSize: 14, fontWeight: "700", color: "#1a1a1a", marginBottom: 14 }}>Monthly Limits</Text>
            <View style={{ flexDirection: "row", gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>Max Hours/Month</Text>
                <TextInput defaultValue="160" keyboardType="numeric" style={{ borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: "#374151" }} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>Max Shifts/Month</Text>
                <TextInput defaultValue="20" keyboardType="numeric" style={{ borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: "#374151" }} />
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Save */}
      <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: 20, backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: "#e5e7eb" }}>
        <Pressable onPress={handleSave} disabled={saving} style={{ backgroundColor: saving ? "#9ca3af" : GREEN, paddingVertical: 16, borderRadius: 14, alignItems: "center" }}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700" }}>Save Schedule</Text>}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
