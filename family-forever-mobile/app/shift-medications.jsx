import { View, Text, ScrollView, Pressable, Alert, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState, useEffect } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { collection, query, where, getDocs, doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../src/firebase/config";
import { formatShiftTimeUTCtoCanada } from "../src/utils/date";

const GREEN = "#1F6F43";

export default function ShiftMedications() {
  const { shiftId } = useLocalSearchParams();
  const [shift, setShift] = useState(null);
  const [clientMedications, setClientMedications] = useState([]);
  const [pharmacyInfo, setPharmacyInfo] = useState(null);
  const [healthcareNumber, setHealthcareNumber] = useState("");
  const [administered, setAdministered] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const q = query(collection(db, "shifts"), where("id", "==", shiftId));
      const snap = await getDocs(q);
      if (snap.empty) { setLoading(false); return; }

      const shiftData = { id: snap.docs[0].id, ref: snap.docs[0].ref, ...snap.docs[0].data() };
      setShift(shiftData);

      const clientId = shiftData.clientId || shiftData.clientDetails?.id;
      const clientName = shiftData.clientName || shiftData.clientDetails?.name || "";

      if (clientId) {
        const clientRef = doc(db, "clients", clientId);
        const clientSnap = await getDoc(clientRef);
        if (clientSnap.exists()) {
          const clientData = clientSnap.data();
          if (Array.isArray(clientData.medications)) {
            setClientMedications(clientData.medications);
          }
          if (clientData.pharmacy) setPharmacyInfo(clientData.pharmacy);
        }

        const today = new Date();
        const monthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
        const day = today.getDate();
        const recRef = doc(db, "medicationRecords", clientId);
        const recSnap = await getDoc(recRef);
        if (recSnap.exists()) {
          const rec = recSnap.data();
          const todayRec = rec.records?.[monthKey]?.[day] || {};
          setAdministered(todayRec);
        }
      }

      if (clientName) {
        const targetName = clientName.trim().toLowerCase();
        const intakeSnap = await getDocs(collection(db, "InTakeForms"));
        let found = null;
        intakeSnap.forEach((docSnap) => {
          if (found) return;
          const data = docSnap.data();
          if (Array.isArray(data.medicalInfoList)) {
            const match = data.medicalInfoList.find(m =>
              m.clientName?.trim().toLowerCase() === targetName && m.healthCareNo
            );
            if (match?.healthCareNo) { found = match.healthCareNo; return; }
          }
          if (data.clients && typeof data.clients === "object") {
            Object.values(data.clients).forEach(c => {
              if (found) return;
              const name = c.fullName || c.name || "";
              if (name.trim().toLowerCase() === targetName && c.healthCareNo) found = c.healthCareNo;
            });
          }
          if (Array.isArray(data.inTakeClients)) {
            const match = data.inTakeClients.find(c =>
              c.name?.trim().toLowerCase() === targetName && c.healthCareNumber
            );
            if (match?.healthCareNumber) { found = match.healthCareNumber; return; }
          }
          if (data.clientName?.trim().toLowerCase() === targetName && data.healthCareNumber) {
            found = data.healthCareNumber;
          }
        });
        setHealthcareNumber(found || "Not Available");
      }
    } catch (e) {
      console.error("Error loading medications:", e);
    } finally {
      setLoading(false);
    }
  };

  const toggleTime = (medName, time) => {
    setAdministered(prev => {
      const key = `${medName}__${time}`;
      return { ...prev, [key]: !prev[key] };
    });
  };

  const isAdministered = (medName, time) => !!administered[`${medName}__${time}`];

  const getTimes = (med) =>
    (med.timing || "").split(",").map(t => t.trim()).filter(Boolean);

  const allCount = clientMedications.reduce((acc, m) => acc + getTimes(m).length, 0);
  const doneCount = Object.values(administered).filter(Boolean).length;

  const handleSave = async () => {
    setSaving(true);
    try {
      const clientId = shift?.clientId || shift?.clientDetails?.id;
      if (!clientId) { Alert.alert("Error", "Client info missing."); return; }

      const today = new Date();
      const monthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
      const day = today.getDate();
      const user = JSON.parse(await AsyncStorage.getItem("user") || "{}");

      const recRef = doc(db, "medicationRecords", clientId);
      const recSnap = await getDoc(recRef);
      const existing = recSnap.exists() ? recSnap.data() : {};
      const existingRecords = existing.records || {};

      await setDoc(recRef, {
        clientId,
        clientName: shift.clientName || shift.clientDetails?.name || "",
        healthCareNumber: healthcareNumber || "",
        records: {
          ...existingRecords,
          [monthKey]: { ...(existingRecords[monthKey] || {}), [day]: administered },
        },
        updatedAt: new Date(),
      }, { merge: true });

      Alert.alert("Saved", "Medication record saved successfully.", [{ text: "OK", onPress: () => router.back() }]);
    } catch (e) {
      console.error("Save error:", e);
      Alert.alert("Error", "Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#f8f8f6", alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color={GREEN} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f8f8f6" }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 16, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#e5e7eb" }}>
          <Pressable onPress={() => router.back()} style={{ marginRight: 12 }}>
            <Ionicons name="arrow-back" size={24} color="#374151" />
          </Pressable>
          <Text style={{ fontSize: 18, fontWeight: "700", color: "#1a1a1a", flex: 1 }}>Medication Administration</Text>
          {allCount > 0 && doneCount === allCount && (
            <View style={{ backgroundColor: "#dcfce7", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 }}>
              <Text style={{ fontSize: 12, fontWeight: "600", color: "#166534" }}>All Given</Text>
            </View>
          )}
        </View>

        <View style={{ padding: 20 }}>
          {shift && (
            <View style={{ backgroundColor: GREEN, borderRadius: 14, padding: 16, marginBottom: 20, flexDirection: "row", alignItems: "center" }}>
              <Ionicons name="person-circle" size={36} color="rgba(255,255,255,0.7)" style={{ marginRight: 12 }} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: "#fff", fontSize: 15, fontWeight: "700" }}>
                  {shift.clientName || shift.clientDetails?.name || "Client"}
                </Text>
                <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 13 }}>
                  {formatShiftTimeUTCtoCanada(null, shift.startTime)} – {formatShiftTimeUTCtoCanada(null, shift.endTime)}
                </Text>
                {healthcareNumber && healthcareNumber !== "Not Available" && (
                  <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 11, marginTop: 2 }}>
                    ACH: {healthcareNumber}
                  </Text>
                )}
              </View>
            </View>
          )}

          {allCount > 0 && (
            <View style={{ backgroundColor: "#fff", borderRadius: 14, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: "#e5e7eb" }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <Text style={{ fontSize: 14, fontWeight: "600", color: "#374151" }}>Progress</Text>
                <Text style={{ fontSize: 14, fontWeight: "700", color: GREEN }}>{doneCount}/{allCount} administered</Text>
              </View>
              <View style={{ height: 8, backgroundColor: "#f3f4f6", borderRadius: 4, overflow: "hidden" }}>
                <View style={{ height: 8, backgroundColor: GREEN, borderRadius: 4, width: `${allCount ? (doneCount / allCount) * 100 : 0}%` }} />
              </View>
            </View>
          )}

          {clientMedications.length === 0 ? (
            <View style={{ alignItems: "center", paddingVertical: 60 }}>
              <Ionicons name="medical-outline" size={48} color="#d1d5db" />
              <Text style={{ fontSize: 16, fontWeight: "600", color: "#9ca3af", marginTop: 16 }}>No medications found for this client</Text>
            </View>
          ) : (
            clientMedications.map((med, idx) => {
              const times = getTimes(med);
              return (
                <View key={idx} style={{ backgroundColor: "#fff", borderRadius: 16, padding: 18, marginBottom: 14, borderWidth: 1, borderColor: "#e5e7eb" }}>
                  <View style={{ marginBottom: 12 }}>
                    <Text style={{ fontSize: 16, fontWeight: "700", color: "#1a1a1a", marginBottom: 2 }}>
                      {med.medicationName
                        ? med.medicationName.toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
                        : "Unnamed Medication"}
                    </Text>
                    {med.dosage && (
                      <Text style={{ fontSize: 13, color: "#6b7280" }}>Dosage: {med.dosage}</Text>
                    )}
                    {med.reasonOfMedication && (
                      <Text style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}>Reason: {med.reasonOfMedication}</Text>
                    )}
                    {med.cautions && (
                      <View style={{ backgroundColor: "#fff7ed", borderRadius: 8, padding: 8, marginTop: 8, flexDirection: "row", alignItems: "center" }}>
                        <Ionicons name="warning-outline" size={14} color="#ea580c" style={{ marginRight: 6 }} />
                        <Text style={{ fontSize: 12, color: "#ea580c", flex: 1 }}>Caution: {med.cautions}</Text>
                      </View>
                    )}
                  </View>

                  {times.length > 0 && (
                    <View>
                      <Text style={{ fontSize: 12, fontWeight: "600", color: "#9ca3af", marginBottom: 8, textTransform: "uppercase" }}>Timing</Text>
                      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                        {times.map((time, tIdx) => {
                          const done = isAdministered(med.medicationName, time);
                          return (
                            <Pressable
                              key={tIdx}
                              onPress={() => toggleTime(med.medicationName, time)}
                              style={{
                                flexDirection: "row", alignItems: "center",
                                backgroundColor: done ? "#dcfce7" : "#f0f9ff",
                                borderWidth: 1, borderColor: done ? "#86efac" : "#93c5fd",
                                borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6,
                              }}
                            >
                              {done && <Ionicons name="checkmark-circle" size={14} color={GREEN} style={{ marginRight: 4 }} />}
                              <Text style={{ fontSize: 12, fontWeight: "600", color: done ? "#166534" : "#1e40af" }}>{time}</Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    </View>
                  )}
                </View>
              );
            })
          )}

          {pharmacyInfo && (
            <View style={{ backgroundColor: "#fff", borderRadius: 14, padding: 16, marginTop: 6, borderWidth: 1, borderColor: "#e5e7eb" }}>
              <Text style={{ fontSize: 14, fontWeight: "700", color: "#1a1a1a", marginBottom: 10 }}>Pharmacy Information</Text>
              {pharmacyInfo.pharmacyName && (
                <Text style={{ fontSize: 13, color: "#374151", marginBottom: 4 }}>
                  <Text style={{ fontWeight: "600" }}>Name: </Text>{pharmacyInfo.pharmacyName}
                </Text>
              )}
              {pharmacyInfo.pharmacyPhone && (
                <Text style={{ fontSize: 13, color: "#374151", marginBottom: 4 }}>
                  <Text style={{ fontWeight: "600" }}>Phone: </Text>{pharmacyInfo.pharmacyPhone}
                </Text>
              )}
              {pharmacyInfo.pharmacyEmail && (
                <Text style={{ fontSize: 13, color: "#374151", marginBottom: 4 }}>
                  <Text style={{ fontWeight: "600" }}>Email: </Text>{pharmacyInfo.pharmacyEmail}
                </Text>
              )}
              {pharmacyInfo.pharmacyAddress && (
                <Text style={{ fontSize: 13, color: "#374151" }}>
                  <Text style={{ fontWeight: "600" }}>Address: </Text>{pharmacyInfo.pharmacyAddress}
                </Text>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: 20, backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: "#e5e7eb" }}>
        <Pressable onPress={handleSave} disabled={saving} style={{ backgroundColor: saving ? "#9ca3af" : GREEN, paddingVertical: 16, borderRadius: 14, alignItems: "center" }}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700" }}>Save Medication Record</Text>}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
