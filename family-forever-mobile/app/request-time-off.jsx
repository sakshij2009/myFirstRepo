import { View, Text, ScrollView, Pressable, TextInput, Alert, Modal, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState, useEffect } from "react";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { collection, addDoc, query, where, getDocs, serverTimestamp } from "firebase/firestore";
import { db } from "../src/firebase/config";

const GREEN = "#1F6F43";
const LEAVE_TYPES = ["Vacation", "Sick Leave", "Personal", "Emergency", "Bereavement", "Other"];

export default function RequestTimeOff() {
  const [user, setUser] = useState(null);
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [leaveType, setLeaveType] = useState("Vacation");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [successModal, setSuccessModal] = useState(false);
  const [requests, setRequests] = useState([]);
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);

  useEffect(() => {
    const load = async () => {
      const stored = await AsyncStorage.getItem("user");
      if (stored) {
        const u = JSON.parse(stored);
        setUser(u);
        loadRequests(u);
      }
    };
    load();
  }, []);

  const loadRequests = async (u) => {
    try {
      const q = query(collection(db, "leaveRequests"), where("userId", "==", u.userId || u.username));
      const snap = await getDocs(q);
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setRequests(data.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
    } catch {}
  };

  const formatDate = (d) => d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  const getDuration = () => {
    const diff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
    return diff <= 0 ? 1 : diff;
  };

  const handleSubmit = async () => {
    if (!reason.trim()) { Alert.alert("Required", "Please add a reason for your request."); return; }
    if (endDate < startDate) { Alert.alert("Invalid Dates", "End date must be on or after start date."); return; }
    setSubmitting(true);
    try {
      await addDoc(collection(db, "leaveRequests"), {
        userId: user?.userId || user?.username,
        staffName: user?.name,
        leaveType,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        reason,
        status: "Pending",
        createdAt: serverTimestamp(),
      });
      setSuccessModal(true);
      setReason("");
      loadRequests(user);
    } catch {
      Alert.alert("Error", "Failed to submit request. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const statusColor = (s) => ({ Pending: "#f59e0b", Approved: "#22c55e", Rejected: "#ef4444" }[s] || "#9ca3af");
  const statusBg = (s) => ({ Pending: "#fef3c7", Approved: "#dcfce7", Rejected: "#fee2e2" }[s] || "#f3f4f6");

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f8f8f6" }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Header */}
        <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 16, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#e5e7eb" }}>
          <Pressable onPress={() => router.back()} style={{ marginRight: 12 }}>
            <Ionicons name="arrow-back" size={24} color="#374151" />
          </Pressable>
          <Text style={{ fontSize: 18, fontWeight: "700", color: "#1a1a1a", flex: 1 }}>Request Time Off</Text>
        </View>

        <View style={{ padding: 20 }}>
          {/* Duration preview */}
          <View style={{ backgroundColor: GREEN, borderRadius: 16, padding: 20, marginBottom: 20, flexDirection: "row", alignItems: "center" }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 12, fontWeight: "600" }}>DURATION</Text>
              <Text style={{ color: "#fff", fontSize: 28, fontWeight: "800", marginTop: 4 }}>{getDuration()} day{getDuration() !== 1 ? "s" : ""}</Text>
            </View>
            <Ionicons name="calendar" size={40} color="rgba(255,255,255,0.3)" />
          </View>

          {/* Form Card */}
          <View style={{ backgroundColor: "#fff", borderRadius: 16, padding: 20, borderWidth: 1, borderColor: "#e5e7eb", marginBottom: 20 }}>
            <Text style={{ fontSize: 16, fontWeight: "700", color: "#1a1a1a", marginBottom: 20 }}>Request Details</Text>

            {/* Leave Type */}
            <Text style={{ fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 8 }}>Leave Type</Text>
            <Pressable onPress={() => setShowTypeDropdown(!showTypeDropdown)} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderWidth: 1, borderColor: "#d1d5db", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 13, marginBottom: showTypeDropdown ? 0 : 16, backgroundColor: "#fafafa" }}>
              <Text style={{ fontSize: 14, color: "#374151" }}>{leaveType}</Text>
              <Ionicons name={showTypeDropdown ? "chevron-up" : "chevron-down"} size={18} color="#6b7280" />
            </Pressable>
            {showTypeDropdown && (
              <View style={{ borderWidth: 1, borderColor: "#d1d5db", borderRadius: 10, marginBottom: 16, overflow: "hidden" }}>
                {LEAVE_TYPES.map((t, i) => (
                  <Pressable key={t} onPress={() => { setLeaveType(t); setShowTypeDropdown(false); }} style={{ paddingHorizontal: 14, paddingVertical: 13, backgroundColor: leaveType === t ? "#f0fdf4" : "#fff", borderBottomWidth: i < LEAVE_TYPES.length - 1 ? 1 : 0, borderBottomColor: "#f3f4f6" }}>
                    <Text style={{ fontSize: 14, color: leaveType === t ? GREEN : "#374151", fontWeight: leaveType === t ? "600" : "400" }}>{t}</Text>
                  </Pressable>
                ))}
              </View>
            )}

            {/* Dates */}
            <View style={{ flexDirection: "row", gap: 12, marginBottom: 16 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 8 }}>Start Date</Text>
                <Pressable onPress={() => setShowStartPicker(true)} style={{ borderWidth: 1, borderColor: "#d1d5db", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 13, backgroundColor: "#fafafa", flexDirection: "row", alignItems: "center" }}>
                  <Ionicons name="calendar-outline" size={16} color="#9ca3af" style={{ marginRight: 8 }} />
                  <Text style={{ fontSize: 13, color: "#374151" }}>{formatDate(startDate)}</Text>
                </Pressable>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 8 }}>End Date</Text>
                <Pressable onPress={() => setShowEndPicker(true)} style={{ borderWidth: 1, borderColor: "#d1d5db", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 13, backgroundColor: "#fafafa", flexDirection: "row", alignItems: "center" }}>
                  <Ionicons name="calendar-outline" size={16} color="#9ca3af" style={{ marginRight: 8 }} />
                  <Text style={{ fontSize: 13, color: "#374151" }}>{formatDate(endDate)}</Text>
                </Pressable>
              </View>
            </View>

            {showStartPicker && (
              <DateTimePicker
                value={startDate}
                mode="date"
                display="spinner"
                onChange={(event, selectedDate) => {
                  if (event.type === 'dismissed') {
                    setShowStartPicker(false);
                  } else if (selectedDate) {
                    setStartDate(selectedDate);
                    setShowStartPicker(false);
                  }
                }}
              />
            )}
            {showEndPicker && (
              <DateTimePicker
                value={endDate}
                mode="date"
                display="spinner"
                minimumDate={startDate}
                onChange={(event, selectedDate) => {
                  if (event.type === 'dismissed') {
                    setShowEndPicker(false);
                  } else if (selectedDate) {
                    setEndDate(selectedDate);
                    setShowEndPicker(false);
                  }
                }}
              />
            )}

            {/* Reason */}
            <Text style={{ fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 8 }}>Reason</Text>
            <TextInput
              value={reason}
              onChangeText={setReason}
              placeholder="Briefly describe the reason for your request..."
              placeholderTextColor="#9ca3af"
              multiline
              numberOfLines={4}
              style={{ borderWidth: 1, borderColor: "#d1d5db", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: "#374151", backgroundColor: "#fafafa", textAlignVertical: "top", minHeight: 100 }}
            />
          </View>

          {/* Submit */}
          <Pressable onPress={handleSubmit} disabled={submitting} style={{ backgroundColor: submitting ? "#9ca3af" : GREEN, paddingVertical: 16, borderRadius: 14, alignItems: "center", marginBottom: 28 }}>
            {submitting ? <ActivityIndicator color="#fff" /> : <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700" }}>Submit Request</Text>}
          </Pressable>

          {/* Recent Requests */}
          {requests.length > 0 && (
            <View>
              <Text style={{ fontSize: 16, fontWeight: "700", color: "#1a1a1a", marginBottom: 14 }}>Recent Requests</Text>
              {requests.slice(0, 5).map(r => (
                <View key={r.id} style={{ backgroundColor: "#fff", borderRadius: 14, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: "#e5e7eb" }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <Text style={{ fontSize: 14, fontWeight: "600", color: "#1a1a1a" }}>{r.leaveType}</Text>
                    <View style={{ backgroundColor: statusBg(r.status), paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 }}>
                      <Text style={{ fontSize: 12, fontWeight: "600", color: statusColor(r.status) }}>{r.status}</Text>
                    </View>
                  </View>
                  <Text style={{ fontSize: 13, color: "#6b7280" }}>{new Date(r.startDate).toLocaleDateString()} – {new Date(r.endDate).toLocaleDateString()}</Text>
                  {r.reason && <Text style={{ fontSize: 13, color: "#9ca3af", marginTop: 4 }} numberOfLines={1}>{r.reason}</Text>}
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Success Modal */}
      <Modal visible={successModal} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <View style={{ backgroundColor: "#fff", borderRadius: 20, padding: 32, alignItems: "center", width: "100%" }}>
            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: "#dcfce7", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
              <Ionicons name="checkmark-circle" size={36} color={GREEN} />
            </View>
            <Text style={{ fontSize: 20, fontWeight: "800", color: "#1a1a1a", marginBottom: 8 }}>Request Submitted!</Text>
            <Text style={{ fontSize: 14, color: "#6b7280", textAlign: "center", marginBottom: 24 }}>Your time off request has been sent to your manager for review.</Text>
            <Pressable onPress={() => setSuccessModal(false)} style={{ backgroundColor: GREEN, paddingVertical: 14, paddingHorizontal: 32, borderRadius: 12 }}>
              <Text style={{ color: "#fff", fontSize: 15, fontWeight: "700" }}>Done</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
