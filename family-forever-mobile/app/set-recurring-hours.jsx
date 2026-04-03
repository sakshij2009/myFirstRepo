import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TextInput,
  Switch,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../src/firebase/config";

// ── Color tokens ──────────────────────────────────────────────────────────────
const PRIMARY_GREEN = "#1F6F43";
const LIGHT_GREEN = "#DCFCE7";
const TEXT_GREEN = "#166534";
const DARK_TEXT = "#111827";
const GRAY_TEXT = "#6B7280";
const GRAY_BORDER = "#F3F4F6";
const PAGE_BG = "#F9FAFB";
const ACCENT_BLUE = "#3B82F6";

const DAYS = [
  { key: "mon", label: "Monday", short: "Mon" },
  { key: "tue", label: "Tuesday", short: "Tue" },
  { key: "wed", label: "Wednesday", short: "Wed" },
  { key: "thu", label: "Thursday", short: "Thu" },
  { key: "fri", label: "Friday", short: "Fri" },
  { key: "sat", label: "Saturday", short: "Sat" },
  { key: "sun", label: "Sunday", short: "Sun" },
];

const SLOTS = [
  { id: "morning", label: "Morning", icon: "sunny", start: "06:00", end: "12:00" },
  { id: "afternoon", label: "Afternoon", icon: "cloud", start: "12:00", end: "18:00" },
  { id: "night", label: "Night", icon: "moon", start: "18:00", end: "23:00" },
];

export default function SetRecurringHours() {
  const [user, setUser] = useState(null);
  const [selectedDays, setSelectedDays] = useState(["mon", "tue", "wed", "thu", "fri"]);
  const [expandedDay, setExpandedDay] = useState("mon");
  const [schedule, setSchedule] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      const stored = await AsyncStorage.getItem("user");
      if (!stored) return;
      const u = JSON.parse(stored);
      setUser(u);
      
      try {
        const uid = u.userId || u.uid || u.id || u.username;
        const snap = await getDoc(doc(db, "users", uid));
        if (snap.exists() && snap.data().recurringHours) {
          setSchedule(snap.data().recurringHours);
          if (snap.data().selectedActiveDays) {
            setSelectedDays(snap.data().selectedActiveDays);
          }
        } else {
          // Default schedule
          const initialSchedule = {};
          DAYS.forEach((d) => {
            initialSchedule[d.key] = {
              morning: { enabled: true, start: "06:00", end: "12:00" },
              afternoon: { enabled: true, start: "12:00", end: "18:00" },
              night: { enabled: false, start: "18:00", end: "23:00" },
            };
          });
          setSchedule(initialSchedule);
        }
      } catch (err) {
        console.error(err);
        // Set defaults on error
        const initialSchedule = {};
        DAYS.forEach((d) => {
          initialSchedule[d.key] = {
            morning: { enabled: true, start: "06:00", end: "12:00" },
            afternoon: { enabled: true, start: "12:00", end: "18:00" },
            night: { enabled: false, start: "18:00", end: "23:00" },
          };
        });
        setSchedule(initialSchedule);
      }
    };
    loadData();
  }, []);

  const toggleDaySelection = (key) => {
    setSelectedDays((prev) => 
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const handlePreset = (type) => {
    if (type === "WEEKDAYS") setSelectedDays(["mon", "tue", "wed", "thu", "fri"]);
    if (type === "WEEKENDS") setSelectedDays(["sat", "sun"]);
    if (type === "EVERYDAY") setSelectedDays(DAYS.map(d => d.key));
    if (type === "CLEAR") setSelectedDays([]);
  };

  const updateSlot = (dayKey, slotId, field, value) => {
    setSchedule((prev) => ({
      ...prev,
      [dayKey]: {
        ...prev[dayKey],
        [slotId]: {
          ...prev[dayKey][slotId],
          [field]: value,
        },
      },
    }));
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const uid = user.userId || user.uid || user.id || user.username;
      await updateDoc(doc(db, "users", uid), {
        recurringHours: schedule,
        selectedActiveDays: selectedDays,
      });
      Alert.alert("Success", "Recurring hours updated successfully.", [
        { text: "OK", onPress: () => router.back() }
      ]);
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Could not save your schedule.");
    } finally {
      setSaving(false);
    }
  };

  const renderSlot = (dayKey, slot) => {
    const data = schedule[dayKey]?.[slot.id] || { enabled: false, start: slot.start, end: slot.end };
    return (
      <View key={slot.id} style={styles.slotRow}>
        <View style={styles.slotLeft}>
          <Ionicons name={slot.icon} size={18} color={data.enabled ? PRIMARY_GREEN : GRAY_TEXT} />
          <Text style={[styles.slotLabel, !data.enabled && { color: GRAY_TEXT }]}>{slot.label}</Text>
        </View>
        <View style={styles.slotTimeBox}>
          <View style={styles.timeInput}>
            <Text style={styles.timeInputText}>{data.start}</Text>
          </View>
          <Text style={styles.timeSeparator}>–</Text>
          <View style={styles.timeInput}>
            <Text style={styles.timeInputText}>{data.end}</Text>
          </View>
        </View>
        <Switch
          trackColor={{ false: "#E5E7EB", true: LIGHT_GREEN }}
          thumbColor={data.enabled ? PRIMARY_GREEN : "#FFF"}
          onValueChange={(val) => updateSlot(dayKey, slot.id, "enabled", val)}
          value={data.enabled}
        />
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={DARK_TEXT} />
        </Pressable>
        <View style={styles.headerTitleBox}>
          <Text style={styles.headerTitle}>Set recurring hours</Text>
          <Text style={styles.headerSubtitle}>Customize shift slots per day</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Days Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>DAYS AVAILABLE</Text>
          <View style={styles.dayCirclesRow}>
            {DAYS.map((d) => (
              <Pressable
                key={d.key}
                onPress={() => toggleDaySelection(d.key)}
                style={[
                  styles.dayCircle,
                  selectedDays.includes(d.key) && styles.dayCircleActive
                ]}
              >
                <Text style={[
                  styles.dayCircleText,
                  selectedDays.includes(d.key) && { color: "#FFF" }
                ]}>
                  {d.short}
                </Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.presetRow}>
            <Pressable onPress={() => handlePreset("WEEKDAYS")}><Text style={styles.presetText}>Weekdays</Text></Pressable>
            <Pressable onPress={() => handlePreset("WEEKENDS")}><Text style={styles.presetText}>Weekends</Text></Pressable>
            <Pressable onPress={() => handlePreset("EVERYDAY")}><Text style={styles.presetText}>Every day</Text></Pressable>
            <Pressable onPress={() => handlePreset("CLEAR")}><Text style={[styles.presetText, { color: GRAY_TEXT }]}>Clear</Text></Pressable>
          </View>
        </View>

        {/* Shift Slots */}
        <View style={styles.slotsContainer}>
          <Text style={styles.sectionLabel}>SHIFT SLOTS PER DAY</Text>
          
          {DAYS.map((day) => (
            <View key={day.key} style={styles.dayAccordion}>
              <Pressable 
                onPress={() => setExpandedDay(expandedDay === day.key ? null : day.key)}
                style={styles.dayHeader}
              >
                <View style={styles.dayHeaderLeft}>
                  <View style={[styles.dot, { backgroundColor: selectedDays.includes(day.key) ? "#22C55E" : "#D1D5DB" }]} />
                  <Text style={styles.dayTitle}>{day.label}</Text>
                  <Text style={styles.daySubtitle}>
                    {schedule[day.key] && Object.entries(schedule[day.key]).filter(x => x[1].enabled).map(x => x[0].charAt(0).toUpperCase() + x[0].slice(1)).join(", ") || "Off"}
                  </Text>
                </View>
                <Ionicons 
                  name={expandedDay === day.key ? "chevron-up" : "chevron-down"} 
                  size={16} 
                  color={GRAY_TEXT} 
                />
              </Pressable>
              
              {expandedDay === day.key && (
                <View style={styles.daySlotsContent}>
                  {SLOTS.map((slot) => renderSlot(day.key, slot))}
                </View>
              )}
            </View>
          ))}
        </View>

        {/* Weekly Preview */}
        <View style={styles.previewSection}>
          <Text style={styles.sectionLabel}>WEEKLY PREVIEW</Text>
          <View style={styles.previewCard}>
            {DAYS.map((d) => {
              const activeSlots = schedule[d.key] ? Object.entries(schedule[d.key]).filter(x => x[1].enabled).map(x => x[0].charAt(0).toUpperCase() + x[0].slice(1)) : [];
              return (
                <View key={d.key} style={styles.previewRow}>
                  <Text style={styles.previewDay}>{d.label}</Text>
                  <View style={styles.previewSlotsRow}>
                    {activeSlots.length > 0 ? (
                      activeSlots.map((s) => <Text key={s} style={styles.previewSlotText}>{s}</Text>)
                    ) : (
                      <Text style={[styles.previewSlotText, { color: "#D1D5DB" }]}>Off</Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* Info Box */}
        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={20} color={ACCENT_BLUE} />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.infoTitle}>Affects future shifts only</Text>
            <Text style={styles.infoDesc}>Already confirmed shifts won't be changed. Use Override Availability to modify those.</Text>
          </View>
        </View>

        {/* Save Button */}
        <Pressable 
          onPress={handleSave} 
          disabled={saving} 
          style={[styles.saveBtn, saving && { opacity: 0.7 }]}
        >
          {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>Save Schedule</Text>}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: PAGE_BG },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 10, paddingBottom: 15, backgroundColor: PAGE_BG },
  backBtn: { padding: 4 },
  headerTitleBox: { alignItems: "center" },
  headerTitle: { fontSize: 18, fontWeight: "800", color: DARK_TEXT, fontFamily: "Poppins-Bold" },
  headerSubtitle: { fontSize: 12, color: GRAY_TEXT, fontFamily: "Inter" },
  
  scrollContent: { paddingHorizontal: 20, paddingBottom: 60 },
  section: { marginTop: 25 },
  sectionLabel: { fontSize: 12, fontWeight: "700", color: "#9CA3AF", marginBottom: 15, letterSpacing: 0.5, fontFamily: "Inter-Bold" },
  
  dayCirclesRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 15 },
  dayCircle: { width: 38, height: 38, borderRadius: 19, backgroundColor: "#FFF", borderWidth: 1, borderColor: GRAY_BORDER, alignItems: "center", justifyContent: "center" },
  dayCircleActive: { backgroundColor: PRIMARY_GREEN, borderColor: PRIMARY_GREEN },
  dayCircleText: { fontSize: 12, fontWeight: "700", color: GRAY_TEXT, fontFamily: "Inter-Bold" },
  
  presetRow: { flexDirection: "row", gap: 15, paddingLeft: 5 },
  presetText: { fontSize: 13, fontWeight: "700", color: "#166534", fontFamily: "Inter-Bold" },
  
  slotsContainer: { marginTop: 35 },
  dayAccordion: { backgroundColor: "#FFF", borderRadius: 16, marginBottom: 10, borderWidth: 1, borderColor: GRAY_BORDER, overflow: "hidden" },
  dayHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 18 },
  dayHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  dayTitle: { fontSize: 15, fontWeight: "700", color: DARK_TEXT, fontFamily: "Inter-Bold" },
  daySubtitle: { fontSize: 12, color: GRAY_TEXT, fontFamily: "Inter" },
  dot: { width: 6, height: 6, borderRadius: 3 },
  
  daySlotsContent: { paddingHorizontal: 18, paddingBottom: 18, borderTopWidth: 1, borderTopColor: "#F9FAFB" },
  slotRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", height: 60, borderBottomWidth: 1, borderBottomColor: "#F9FAFB" },
  slotLeft: { flexDirection: "row", alignItems: "center", gap: 10, width: "25%" },
  slotLabel: { fontSize: 14, fontWeight: "600", color: DARK_TEXT, fontFamily: "Inter-SemiBold" },
  slotTimeBox: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 15 },
  timeInput: { backgroundColor: "#F9FAFB", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, width: 60, alignItems: "center" },
  timeInputText: { fontSize: 12, fontWeight: "600", color: DARK_TEXT, fontFamily: "Inter-Medium" },
  timeSeparator: { color: GRAY_TEXT },
  
  previewSection: { marginTop: 35 },
  previewCard: { backgroundColor: "#F9FAFB", borderRadius: 20, padding: 10 },
  previewRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 12, paddingHorizontal: 15, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  previewDay: { fontSize: 14, color: GRAY_TEXT, fontFamily: "Inter" },
  previewSlotsRow: { flexDirection: "row", gap: 8 },
  previewSlotText: { fontSize: 12, fontWeight: "700", color: ACCENT_BLUE, fontFamily: "Inter-Bold" },
  
  infoBox: { flexDirection: "row", backgroundColor: "#EFF6FF", padding: 16, borderRadius: 16, marginTop: 30 },
  infoTitle: { fontSize: 14, fontWeight: "700", color: "#1D4ED8", fontFamily: "Inter-Bold" },
  infoDesc: { fontSize: 12, color: "#1E40AF", marginTop: 4, lineHeight: 16, fontFamily: "Inter" },
  
  saveBtn: { backgroundColor: PRIMARY_GREEN, borderRadius: 16, paddingVertical: 18, alignItems: "center", marginTop: 40 },
  saveBtnText: { color: "#FFF", fontSize: 16, fontWeight: "700", fontFamily: "Inter-Bold" },
});
