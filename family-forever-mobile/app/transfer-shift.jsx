import { View, Text, ScrollView, Pressable, TextInput, Alert, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState, useEffect } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { collection, query, where, getDocs, updateDoc } from "firebase/firestore";
import { db } from "../src/firebase/config";
import { safeString } from "../src/utils/date";

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
          <Text style={{ fontSize: 18, fontWeight: "700", color: "#1a1a1a", flex: 1, fontFamily: "Poppins" }}>Transfer Shift</Text>
          <Text style={{ fontSize: 13, color: "#9ca3af", fontFamily: "Inter" }}>Step {step} of 4</Text>
        </View>

        {/* Progress */}
        <View style={{ flexDirection: "row", justifyContent: "center", paddingVertical: 16, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#f3f4f6" }}>
          {[1, 2, 3, 4].map(stepDot)}
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
                  <Text style={{ fontSize: 13, color: "#6b7280" }}>{safeString(shift.startDate)} • {safeString(shift.startTime)} – {safeString(shift.endTime)}</Text>
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
              <Text style={{ fontSize: 20, fontWeight: "800", color: "#1a1a1a", marginBottom: 6, fontFamily: "Poppins" }}>Select Staff Member</Text>
              <Text style={{ fontSize: 14, color: "#6b7280", marginBottom: 20, fontFamily: "Inter" }}>Choose an available staff member to take over.</Text>

              <View style={{ marginBottom: 20 }}>
                <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 12, paddingHorizontal: 12, borderWidth: 1, borderColor: "#e5e7eb" }}>
                  <Ionicons name="search" size={20} color="#9ca3af" />
                  <TextInput placeholder="Search by name or role..." style={{ flex: 1, height: 48, marginLeft: 10, fontSize: 14, fontFamily: "Inter" }} />
                </View>
              </View>

              <Text style={{ fontSize: 12, fontWeight: "700", color: "#9ca3af", marginBottom: 15, letterSpacing: 0.5 }}>RECENT STAFF</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 25, marginHorizontal: -20, paddingHorizontal: 20 }}>
                {DEMO_STAFF.map(s => (
                  <Pressable key={s.id} onPress={() => setSelectedStaff(s)} style={{ alignItems: "center", marginRight: 20 }}>
                    <View style={[{ width: 56, height: 56, borderRadius: 28, backgroundColor: "#F0FDF4", alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "transparent" }, selectedStaff?.id === s.id && { borderColor: GREEN }]}>
                      <Text style={{ fontSize: 16, fontWeight: "700", color: GREEN }}>{s.initials}</Text>
                    </View>
                    <Text style={{ fontSize: 11, color: "#4b5563", marginTop: 6, fontWeight: "600", fontFamily: "Inter" }}>{s.name.split(" ")[0]}</Text>
                  </Pressable>
                ))}
              </ScrollView>

              <Text style={{ fontSize: 12, fontWeight: "700", color: "#9ca3af", marginBottom: 15, letterSpacing: 0.5 }}>AVAILABILITY LIST</Text>
              {DEMO_STAFF.map(staff => (
                <Pressable key={staff.id} onPress={() => staff.available && setSelectedStaff(staff)} style={{ flexDirection: "row", alignItems: "center", backgroundColor: selectedStaff?.id === staff.id ? "#f0fdf4" : "#fff", borderRadius: 14, padding: 16, marginBottom: 10, borderWidth: 1.5, borderColor: selectedStaff?.id === staff.id ? GREEN : "#e5e7eb", opacity: staff.available ? 1 : 0.5 }}>
                  <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: selectedStaff?.id === staff.id ? GREEN : "#F3F4F6", alignItems: "center", justifyContent: "center", marginRight: 14 }}>
                    <Text style={{ fontSize: 15, fontWeight: "700", color: selectedStaff?.id === staff.id ? "#fff" : "#6B7280" }}>{staff.initials}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontWeight: "600", color: "#1a1a1a", fontFamily: "Inter" }}>{staff.name}</Text>
                    <Text style={{ fontSize: 13, color: "#6b7280", fontFamily: "Inter" }}>{staff.role}</Text>
                  </View>
                  <View style={{ backgroundColor: staff.available ? "#dcfce7" : "#fee2e2", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 }}>
                    <Text style={{ fontSize: 11, fontWeight: "600", color: staff.available ? "#166534" : "#991b1b", fontFamily: "Inter" }}>{staff.available ? "Available" : "Unavailable"}</Text>
                  </View>
                </Pressable>
              ))}
            </>
          )}

          {/* STEP 3: Message */}
          {step === 3 && (
            <>
               <Text style={{ fontSize: 20, fontWeight: "800", color: "#1a1a1a", marginBottom: 6, fontFamily: "Poppins" }}>Add a Message</Text>
               <Text style={{ fontSize: 14, color: "#6b7280", marginBottom: 20, fontFamily: "Inter" }}>Explain why you're requesting this transfer.</Text>
               
               <View style={{ backgroundColor: "#fff", borderRadius: 16, padding: 20, borderWidth: 1, borderColor: "#e5e7eb" }}>
                  <Text style={{ fontSize: 14, fontWeight: "700", color: "#1a1a1a", marginBottom: 12, fontFamily: "Inter" }}>Transfer Message</Text>
                  <TextInput 
                    value={notes} 
                    onChangeText={setNotes} 
                    placeholder="Hi, I'm unable to make this shift because..." 
                    placeholderTextColor="#9ca3af" 
                    multiline 
                    style={{ fontSize: 15, color: "#374151", minHeight: 120, textAlignVertical: "top", fontFamily: "Inter" }} 
                  />
               </View>
               <Text style={{ fontSize: 12, color: "#9ca3af", marginTop: 10, textAlign: "right" }}>{notes.length} / 500 characters</Text>
            </>
          )}

          {/* STEP 4: Confirm */}
          {step === 4 && (
            <>
              <Text style={{ fontSize: 20, fontWeight: "800", color: "#1a1a1a", marginBottom: 6, fontFamily: "Poppins" }}>Confirm Transfer</Text>
              <Text style={{ fontSize: 14, color: "#6b7280", marginBottom: 20, fontFamily: "Inter" }}>Review the details before submitting request.</Text>
              
              <View style={{ backgroundColor: "#F0FDF4", borderRadius: 16, padding: 20, borderWidth: 1, borderColor: "#DCFCE7", marginBottom: 16 }}>
                 <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 15 }}>
                    <Ionicons name="checkmark-circle" size={20} color={GREEN} />
                    <Text style={{ fontSize: 14, fontWeight: "700", color: GREEN, fontFamily: "Poppins" }}>Ready for Review</Text>
                 </View>

                 <View style={{ gap: 14 }}>
                   <View>
                     <Text style={{ fontSize: 11, color: "#6B7280", fontWeight: "700", letterSpacing: 0.5, marginBottom: 4 }}>SHIFT</Text>
                     <Text style={{ fontSize: 15, fontWeight: "700", color: "#1a1a1a", fontFamily: "Poppins" }}>{safeString(shift?.clientName) || "Client"} • {safeString(shift?.startDate)}</Text>
                     <Text style={{ fontSize: 13, color: "#6b7280" }}>{shift?.startTime} – {shift?.endTime}</Text>
                   </View>
                   
                   <View style={{ height: 1, backgroundColor: "#DCFCE7" }} />
                   
                   <View>
                     <Text style={{ fontSize: 11, color: "#6B7280", fontWeight: "700", letterSpacing: 0.5, marginBottom: 4 }}>TRANSFERRING TO</Text>
                     <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                        <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: GREEN, alignItems: "center", justifyContent: "center" }}>
                           <Text style={{ color: "#FFF", fontSize: 12, fontWeight: "700" }}>{selectedStaff?.initials}</Text>
                        </View>
                        <View>
                           <Text style={{ fontSize: 14, fontWeight: "700", color: "#1a1a1a" }}>{selectedStaff?.name}</Text>
                           <Text style={{ fontSize: 12, color: "#6b7280" }}>{selectedStaff?.role}</Text>
                        </View>
                     </View>
                   </View>

                   <View style={{ height: 1, backgroundColor: "#DCFCE7" }} />

                   <View>
                     <Text style={{ fontSize: 11, color: "#6B7280", fontWeight: "700", letterSpacing: 0.5, marginBottom: 4 }}>REASON & MESSAGE</Text>
                     <Text style={{ fontSize: 14, fontWeight: "700", color: "#1a1a1a" }}>{reason}</Text>
                     {notes ? <Text style={{ fontSize: 13, color: "#6b7280", marginTop: 4, lineHeight: 18 }}>"{notes}"</Text> : null}
                   </View>
                 </View>
              </View>

              <View style={{ backgroundColor: "#FFFBEB", borderRadius: 12, padding: 14, flexDirection: "row", alignItems: "flex-start", borderWidth: 1, borderColor: "#FEF3C7" }}>
                <Ionicons name="information-circle" size={18} color="#d97706" style={{ marginRight: 10, marginTop: 1 }} />
                <Text style={{ fontSize: 12, color: "#92400e", flex: 1, lineHeight: 18 }}>The shift remains your responsibility until the transfer is officially approved by administration.</Text>
              </View>
            </>
          )}
        </View>
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, paddingVertical: 15, paddingHorizontal: 20, backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: "#e5e7eb" }}>
        {step < 4 ? (
          <Pressable
            onPress={() => { 
                if (step === 1 && !reason) { Alert.alert("Required", "Please select a reason."); return; } 
                if (step === 2 && !selectedStaff) { Alert.alert("Required", "Please select a staff member."); return; } 
                setStep(step + 1); 
            }}
            style={{ backgroundColor: GREEN, height: 54, borderRadius: 15, alignItems: "center", justifyContent: "center" }}
          >
            <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700", fontFamily: "Poppins" }}>Continue</Text>
          </Pressable>
        ) : (
          <Pressable onPress={handleSubmit} disabled={submitting} style={{ backgroundColor: submitting ? "#9ca3af" : GREEN, height: 54, borderRadius: 15, alignItems: "center", justifyContent: "center" }}>
            {submitting ? <ActivityIndicator color="#fff" /> : <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700", fontFamily: "Poppins" }}>Submit Request</Text>}
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  );
}
