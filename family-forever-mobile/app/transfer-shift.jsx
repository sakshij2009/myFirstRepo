import { View, Text, ScrollView, Pressable, TextInput, Alert, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState, useEffect } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { collection, query, where, getDocs, updateDoc } from "firebase/firestore";
import { db } from "../src/firebase/config";

const GREEN = "#1F6F43";
const REASONS = ["Emergency", "Personal", "Scheduling Conflict", "Medical", "Family Emergency", "Other"];
const DEMO_STAFF = [
  { id: "1", name: "Sarah Johnson", role: "Support Worker", initials: "SJ", available: true },
  { id: "2", name: "Michael Chen", role: "Senior Carer", initials: "MC", available: true },
  { id: "3", name: "Priya Patel", role: "Support Worker", initials: "PP", available: false },
  { id: "4", name: "James Wilson", role: "Care Assistant", initials: "JW", available: true },
  { id: "5", name: "Emma Davis", role: "Senior Support Worker", initials: "ED", available: true },
];

export default function TransferShift() {
  const { shiftId } = useLocalSearchParams();
  const [step, setStep] = useState(1);
  const [shift, setShift] = useState(null);
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { loadShift(); }, []);

  const loadShift = async () => {
    try {
      const q = query(collection(db, "shifts"), where("id", "==", shiftId));
      const snap = await getDocs(q);
      if (!snap.empty) setShift({ id: snap.docs[0].id, ...snap.docs[0].data() });
    } catch {}
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const q = query(collection(db, "shifts"), where("id", "==", shiftId));
      const snap = await getDocs(q);
      if (!snap.empty) {
        await updateDoc(snap.docs[0].ref, {
          transferRequested: true,
          transferTo: selectedStaff.name,
          transferToId: selectedStaff.id,
          transferReason: reason,
          transferNotes: notes,
          transferRequestedAt: new Date().toISOString(),
        });
      }
      Alert.alert("Transfer Requested", `Your transfer request to ${selectedStaff.name} has been submitted.`, [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch {
      Alert.alert("Error", "Failed to submit transfer request.");
    } finally {
      setSubmitting(false);
    }
  };

  const stepDot = (n) => (
    <View key={n} style={{ width: n === step ? 24 : 8, height: 8, borderRadius: 4, backgroundColor: n <= step ? GREEN : "#d1d5db", marginHorizontal: 3 }} />
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f8f8f6" }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Header */}
        <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 16, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#e5e7eb" }}>
          <Pressable onPress={() => (step > 1 ? setStep(step - 1) : router.back())} style={{ marginRight: 12 }}>
            <Ionicons name="arrow-back" size={24} color="#374151" />
          </Pressable>
          <Text style={{ fontSize: 18, fontWeight: "700", color: "#1a1a1a", flex: 1 }}>Transfer Shift</Text>
          <Text style={{ fontSize: 13, color: "#9ca3af" }}>Step {step} of 3</Text>
        </View>

        {/* Progress */}
        <View style={{ flexDirection: "row", justifyContent: "center", paddingVertical: 16, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#f3f4f6" }}>
          {[1, 2, 3].map(stepDot)}
        </View>

        <View style={{ padding: 20 }}>
          {/* STEP 1: Shift Info + Reason */}
          {step === 1 && (
            <>
              <Text style={{ fontSize: 20, fontWeight: "800", color: "#1a1a1a", marginBottom: 6 }}>Why are you transferring?</Text>
              <Text style={{ fontSize: 14, color: "#6b7280", marginBottom: 20 }}>Select a reason for the shift transfer request.</Text>

              {shift && (
                <View style={{ backgroundColor: "#fff", borderRadius: 16, padding: 18, marginBottom: 20, borderWidth: 1, borderColor: "#e5e7eb" }}>
                  <Text style={{ fontSize: 12, fontWeight: "600", color: "#9ca3af", marginBottom: 10 }}>SHIFT TO TRANSFER</Text>
                  <Text style={{ fontSize: 16, fontWeight: "700", color: "#1a1a1a", marginBottom: 4 }}>{shift.clientName || shift.name || "Client"}</Text>
                  <Text style={{ fontSize: 13, color: "#6b7280" }}>{shift.startDate} • {shift.startTime} – {shift.endTime}</Text>
                  {shift.serviceType && (
                    <View style={{ backgroundColor: "#dbeafe", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, alignSelf: "flex-start", marginTop: 8 }}>
                      <Text style={{ fontSize: 12, fontWeight: "600", color: "#1e40af" }}>{shift.serviceType}</Text>
                    </View>
                  )}
                </View>
              )}

              <Text style={{ fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 12 }}>Reason for Transfer</Text>
              {REASONS.map(r => (
                <Pressable key={r} onPress={() => setReason(r)} style={{ flexDirection: "row", alignItems: "center", backgroundColor: reason === r ? "#f0fdf4" : "#fff", borderRadius: 12, padding: 16, marginBottom: 8, borderWidth: 1.5, borderColor: reason === r ? GREEN : "#e5e7eb" }}>
                  <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: reason === r ? GREEN : "#d1d5db", backgroundColor: reason === r ? GREEN : "#fff", alignItems: "center", justifyContent: "center", marginRight: 12 }}>
                    {reason === r && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#fff" }} />}
                  </View>
                  <Text style={{ fontSize: 14, fontWeight: reason === r ? "600" : "400", color: reason === r ? GREEN : "#374151" }}>{r}</Text>
                </Pressable>
              ))}

              <Text style={{ fontSize: 14, fontWeight: "600", color: "#374151", marginTop: 16, marginBottom: 8 }}>Additional Notes (optional)</Text>
              <TextInput value={notes} onChangeText={setNotes} placeholder="Any additional details..." placeholderTextColor="#9ca3af" multiline numberOfLines={3} style={{ borderWidth: 1, borderColor: "#d1d5db", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: "#374151", backgroundColor: "#fff", textAlignVertical: "top", minHeight: 80 }} />
            </>
          )}

          {/* STEP 2: Select Staff */}
          {step === 2 && (
            <>
              <Text style={{ fontSize: 20, fontWeight: "800", color: "#1a1a1a", marginBottom: 6 }}>Select Staff Member</Text>
              <Text style={{ fontSize: 14, color: "#6b7280", marginBottom: 20 }}>Choose an available staff member to take over this shift.</Text>

              {DEMO_STAFF.map(staff => (
                <Pressable key={staff.id} onPress={() => staff.available && setSelectedStaff(staff)} style={{ flexDirection: "row", alignItems: "center", backgroundColor: selectedStaff?.id === staff.id ? "#f0fdf4" : "#fff", borderRadius: 14, padding: 16, marginBottom: 10, borderWidth: 1.5, borderColor: selectedStaff?.id === staff.id ? GREEN : "#e5e7eb", opacity: staff.available ? 1 : 0.5 }}>
                  <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: selectedStaff?.id === staff.id ? GREEN : "#e0f2fe", alignItems: "center", justifyContent: "center", marginRight: 14 }}>
                    <Text style={{ fontSize: 15, fontWeight: "700", color: selectedStaff?.id === staff.id ? "#fff" : "#0369a1" }}>{staff.initials}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontWeight: "600", color: "#1a1a1a" }}>{staff.name}</Text>
                    <Text style={{ fontSize: 13, color: "#6b7280" }}>{staff.role}</Text>
                  </View>
                  <View style={{ backgroundColor: staff.available ? "#dcfce7" : "#fee2e2", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 }}>
                    <Text style={{ fontSize: 11, fontWeight: "600", color: staff.available ? "#166534" : "#991b1b" }}>{staff.available ? "Available" : "Unavailable"}</Text>
                  </View>
                </Pressable>
              ))}
            </>
          )}

          {/* STEP 3: Confirm */}
          {step === 3 && (
            <>
              <Text style={{ fontSize: 20, fontWeight: "800", color: "#1a1a1a", marginBottom: 6 }}>Confirm Transfer</Text>
              <Text style={{ fontSize: 14, color: "#6b7280", marginBottom: 20 }}>Review the transfer details before submitting.</Text>

              <View style={{ backgroundColor: "#fff", borderRadius: 16, padding: 20, borderWidth: 1, borderColor: "#e5e7eb", marginBottom: 16 }}>
                <Text style={{ fontSize: 13, fontWeight: "600", color: "#9ca3af", marginBottom: 14 }}>TRANSFER SUMMARY</Text>
                <View style={{ gap: 14 }}>
                  <View>
                    <Text style={{ fontSize: 12, color: "#9ca3af", marginBottom: 3 }}>SHIFT</Text>
                    <Text style={{ fontSize: 14, fontWeight: "600", color: "#1a1a1a" }}>{shift?.clientName || "Client"} • {shift?.startDate}</Text>
                    <Text style={{ fontSize: 13, color: "#6b7280" }}>{shift?.startTime} – {shift?.endTime}</Text>
                  </View>
                  <View style={{ height: 1, backgroundColor: "#f3f4f6" }} />
                  <View>
                    <Text style={{ fontSize: 12, color: "#9ca3af", marginBottom: 3 }}>TRANSFERRING TO</Text>
                    <Text style={{ fontSize: 14, fontWeight: "600", color: "#1a1a1a" }}>{selectedStaff?.name}</Text>
                    <Text style={{ fontSize: 13, color: "#6b7280" }}>{selectedStaff?.role}</Text>
                  </View>
                  <View style={{ height: 1, backgroundColor: "#f3f4f6" }} />
                  <View>
                    <Text style={{ fontSize: 12, color: "#9ca3af", marginBottom: 3 }}>REASON</Text>
                    <Text style={{ fontSize: 14, fontWeight: "600", color: "#1a1a1a" }}>{reason}</Text>
                    {notes ? <Text style={{ fontSize: 13, color: "#6b7280", marginTop: 2 }}>{notes}</Text> : null}
                  </View>
                </View>
              </View>

              <View style={{ backgroundColor: "#fef3c7", borderRadius: 12, padding: 14, flexDirection: "row", alignItems: "flex-start" }}>
                <Ionicons name="information-circle" size={18} color="#d97706" style={{ marginRight: 10, marginTop: 1 }} />
                <Text style={{ fontSize: 13, color: "#92400e", flex: 1 }}>This request will be sent to your manager for approval before the shift is officially transferred.</Text>
              </View>
            </>
          )}
        </View>
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: 20, backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: "#e5e7eb" }}>
        {step < 3 ? (
          <Pressable
            onPress={() => { if (step === 1 && !reason) { Alert.alert("Required", "Please select a reason."); return; } if (step === 2 && !selectedStaff) { Alert.alert("Required", "Please select a staff member."); return; } setStep(step + 1); }}
            style={{ backgroundColor: GREEN, paddingVertical: 16, borderRadius: 14, alignItems: "center" }}
          >
            <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700" }}>Continue</Text>
          </Pressable>
        ) : (
          <Pressable onPress={handleSubmit} disabled={submitting} style={{ backgroundColor: submitting ? "#9ca3af" : GREEN, paddingVertical: 16, borderRadius: 14, alignItems: "center" }}>
            {submitting ? <ActivityIndicator color="#fff" /> : <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700" }}>Submit Transfer Request</Text>}
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  );
}
