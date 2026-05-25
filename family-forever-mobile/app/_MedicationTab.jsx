import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  Modal,
  Alert,
} from "react-native";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
} from "firebase/firestore";
import { db } from "../src/firebase/config";

/* ---------------- COMPONENT ---------------- */
export default function MedicationTab({ shift }) {
  const today = new Date();

  const [currentDate, setCurrentDate] = useState({
    month: today.getMonth(),
    year: today.getFullYear(),
  });

  const [medications, setMedications] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [witnessName, setWitnessName] = useState("");
  const [timeBasedMeds, setTimeBasedMeds] = useState([]);

  const [healthcareNumber, setHealthcareNumber] = useState("");
  const [pharmacyInfo, setPharmacyInfo] = useState(null);
  const [clientMedications, setClientMedications] = useState([]);

  const staffName = shift?.name || shift?.user || "Unknown Staff";

  const clientId = shift?.clientId || shift?.clientDetails?.id;
  const clientName = shift?.clientName || shift?.clientDetails?.name;

  /* ---------------- FETCH CLIENT MEDICATION DATA ---------------- */
  useEffect(() => {
    const fetchClientMedicationData = async () => {
      if (!clientId) return;
      try {
        const clientRef = doc(db, "clients", clientId);
        const clientSnap = await getDoc(clientRef);

        if (clientSnap.exists()) {
          const clientData = clientSnap.data();
          if (clientData.pharmacy) setPharmacyInfo(clientData.pharmacy);
          if (Array.isArray(clientData.medications)) {
            setClientMedications(clientData.medications);
          }
        }
      } catch (error) {
        console.error("Error fetching client medications:", error);
      }
    };

    fetchClientMedicationData();
  }, [clientId]);

  /* ---------------- FETCH HEALTHCARE NUMBER (ACH) ---------------- */
  useEffect(() => {
    const fetchHealthcareNumber = async () => {
      const targetName = (clientName || shift?.childName || shift?.familyName || shift?.name || "")?.trim().toLowerCase();
      if (!targetName) return;

      try {
        const collections = ["InTakeForms", "clients"];
        let found = null;

        for (const collName of collections) {
          if (found) break;
          const snapshot = await getDocs(collection(db, collName));
          
          snapshot.docs.some((docSnap) => {
            const data = docSnap.data();
            const docId = docSnap.id;

            // 1. ID Match (if possible)
            const clientId = shift?.clientId || shift?.clientDetails?.id;
            const possibleIds = new Set([docId, data.clientId, data.formId, data.id, data.InTakeFormId, data.intakeId].filter(Boolean).map(id => String(id)));
            
            if (clientId && possibleIds.has(String(clientId))) {
              // Find healthCareNo in this doc
              if (data.healthCareNumber) { found = data.healthCareNumber; return true; }
              if (data.hcNo) { found = data.hcNo; return true; }
              if (data.healthCareNo) { found = data.healthCareNo; return true; }
            }

            // 2. Name Match and Extract HC
            const possibleHC = [];
            
            // medicalInfoList
            if (Array.isArray(data.medicalInfoList)) {
              data.medicalInfoList.forEach(m => {
                const n = (m.clientName || m.name || "").trim().toLowerCase();
                if (n && (n.includes(targetName) || targetName.includes(n)) && (m.healthCareNo || m.healthCareNumber || m.hcNo)) {
                  possibleHC.push(m.healthCareNo || m.healthCareNumber || m.hcNo);
                }
              });
            }

            // clients MAP
            if (data.clients && typeof data.clients === "object" && !Array.isArray(data.clients)) {
              Object.values(data.clients).forEach(c => {
                const n = (c.fullName || c.name || "").trim().toLowerCase();
                if (n && (n.includes(targetName) || targetName.includes(n)) && (c.healthCareNo || c.healthcareNumber || c.healthCareNumber || c.hcNo)) {
                  possibleHC.push(c.healthCareNo || c.healthcareNumber || c.hcNo);
                }
              });
            }

            // inTakeClients ARRAY
            if (Array.isArray(data.inTakeClients)) {
              data.inTakeClients.forEach(c => {
                const n = (c.name || "").trim().toLowerCase();
                if (n && (n.includes(targetName) || targetName.includes(n)) && (c.healthCareNumber || c.healthCareNo || c.hcNo)) {
                  possibleHC.push(c.healthCareNumber || c.healthCareNo || c.hcNo);
                }
              });
            }

            // top-level
            const topNames = [data.clientName, data.name, data.childName, data.familyName].map(n => n?.toString().toLowerCase().trim());
            if (topNames.some(fn => fn && (fn.includes(targetName) || targetName.includes(fn)))) {
              if (data.healthCareNumber) possibleHC.push(data.healthCareNumber);
              if (data.hcNo) possibleHC.push(data.hcNo);
              if (data.healthCareNo) possibleHC.push(data.healthCareNo);
            }

            if (possibleHC.length > 0) {
              found = possibleHC[0];
              return true;
            }
            return false;
          });
        }

        setHealthcareNumber(found || "Not Available");
      } catch (err) {
        console.error("Error fetching healthcare number:", err);
        setHealthcareNumber("Error Loading");
      }
    };

    fetchHealthcareNumber();
  }, [clientName]);

  /* ---------------- FETCH MONTHLY MEDICATION RECORDS ---------------- */
  useEffect(() => {
    const fetchMedications = async () => {
      if (!clientId) return;
      try {
        const docRef = doc(db, "medicationRecords", clientId);
        const docSnap = await getDoc(docRef);

        const monthKey = `${currentDate.year}-${String(
          currentDate.month + 1
        ).padStart(2, "0")}`;

        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.records && data.records[monthKey]) {
            setMedications(data.records[monthKey]);
          } else {
            setMedications({});
          }
        }
      } catch (err) {
        console.error("Error loading medication data:", err);
      }
    };
    fetchMedications();
  }, [clientId, currentDate]);

  /* ---------------- CALENDAR HELPERS ---------------- */
  const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const getDaysInMonth = (m, y) => new Date(y, m + 1, 0).getDate();
  const getFirstDayOfMonth = (m, y) => {
    const day = new Date(y, m, 1).getDay();
    return day === 0 ? 6 : day - 1;
  };

  const daysInMonth = getDaysInMonth(currentDate.month, currentDate.year);
  const firstDayIndex = getFirstDayOfMonth(currentDate.month, currentDate.year);

  const handlePrevMonth = () =>
    setCurrentDate((p) =>
      p.month === 0
        ? { month: 11, year: p.year - 1 }
        : { ...p, month: p.month - 1 }
    );

  const handleNextMonth = () =>
    setCurrentDate((p) =>
      p.month === 11
        ? { month: 0, year: p.year + 1 }
        : { ...p, month: p.month + 1 }
    );

  const monthName = new Date(
    currentDate.year,
    currentDate.month
  ).toLocaleString("default", { month: "long" });

  const isTodayOrPast = (day) =>
    new Date(currentDate.year, currentDate.month, day) <= today;

  /* ---------------- UNIQUE TIMES ---------------- */
  const uniqueTimes = Array.from(
    new Set(
      clientMedications
        .flatMap((m) =>
          (m.timing || "")
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean)
        )
    )
  );

  /* ---------------- TIME CLICK ---------------- */
  const handleTimeClick = (day, time) => {
    const medsAtThisTime = clientMedications.filter((m) =>
      (m.timing || "")
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .includes(time.trim().toLowerCase())
    );

    setTimeBasedMeds(medsAtThisTime);
    setSelectedDay(day);
    setSelectedTime(time);
    setWitnessName("");
    setShowModal(true);
  };

  /* ---------------- TOGGLE GIVEN ---------------- */
  const toggleMedGiven = (index) => {
    setTimeBasedMeds((prev) =>
      prev.map((m, i) => (i === index ? { ...m, given: !m.given } : m))
    );
  };

  /* ---------------- SAVE MODAL ---------------- */
  const handleModalSubmit = async () => {
    if (!selectedDay || !selectedTime) return;

    const updated = { ...medications };
    if (!updated[selectedDay]) updated[selectedDay] = {};
    updated[selectedDay][selectedTime] = timeBasedMeds
      .filter((m) => m.given)
      .map((m) => ({
        medicationName: m.medicationName,
        dosage: m.dosage,
        givenBy: staffName,
        witness: witnessName,
        given: true,
      }));

    setMedications(updated);
    setShowModal(false);
    await handleSaveToFirestore(updated);
  };

  const handleSaveToFirestore = async (updatedMeds = medications) => {
    try {
      if (!clientId || !clientName) {
        Alert.alert("Error", "Client info missing!");
        return;
      }

      const docRef = doc(db, "medicationRecords", clientId);
      const docSnap = await getDoc(docRef);

      const monthKey = `${currentDate.year}-${String(
        currentDate.month + 1
      ).padStart(2, "0")}`;

      const existingData = docSnap.exists() ? docSnap.data() : {};
      const updatedRecords = {
        ...(existingData.records || {}),
        [monthKey]: updatedMeds,
      };

      await setDoc(
        docRef,
        {
          clientId,
          clientName,
          healthCareNumber: healthcareNumber || "",
          records: updatedRecords,
          updatedAt: new Date(),
        },
        { merge: true }
      );

      Alert.alert("Success", "Medication record saved successfully!");
    } catch (err) {
      console.error("Error saving medication:", err);
      Alert.alert("Error", "Failed to save record.");
    }
  };

  /* ---------------- UI ---------------- */
  return (
    <ScrollView style={{ padding: 6 } } >
      <View>
        <Text style={styles.title}>Medication Administration Record</Text>
      </View>
      

      {/* Header Inputs */}
      <View style={styles.row}>
        <View style={styles.field}>
          <Text style={styles.label}>Client Name</Text>
          <TextInput value={clientName || ""} style={styles.input} />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Month/Yr of the Record</Text>
          <TextInput
            value={`${monthName} / ${currentDate.year}`}
            style={[styles.input, { backgroundColor: "#f3f4f6" }]}
            editable={false}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>ACH#</Text>
          <TextInput value={healthcareNumber} style={styles.input} />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Doctor’s Name</Text>
          <TextInput placeholder="Enter doctor's name" style={styles.input} />
        </View>
      </View>

      {/* Medication Timing */}
      
       <View>
        <Text style={styles.title}>Medication Timing & Type</Text>
      </View> 

      <View style={styles.cardBlue}>
        {clientMedications.length > 0 ? (
          clientMedications.map((med, index) => (
            <View key={index} style={{ marginBottom: 10 }}>
              <Text style={styles.medTitle}>
                {med.medicationName || "Unnamed Medication"}
              </Text>
              {med.dosage && <Text>Dosage: {med.dosage}</Text>}
              {med.timing && <Text>Timing: {med.timing}</Text>}
              {med.reasonOfMedication && (
                <Text>Reason: {med.reasonOfMedication}</Text>
              )}
              {med.cautions && <Text>Cautions: {med.cautions}</Text>}
            </View>
          ))
        ) : (
          <Text>No medication information available.</Text>
        )}
      </View>

      {/* Calendar */}
      <View>
         <Text style={styles.sectionTitle}>Monthly Medication Calendar</Text>
      </View>
      

      <View style={styles.calendar}>
        <View style={styles.calendarHeader}>
          <Pressable onPress={handlePrevMonth}>
            <Text>{"<"}</Text>
          </Pressable>
          <Text style={{ fontWeight: "700" }}>
            {monthName.toUpperCase()} {currentDate.year}
          </Text>
          <Pressable onPress={handleNextMonth}>
            <Text>{">"}</Text>
          </Pressable>
        </View>

        <View style={styles.weekRow}>
          {weekDays.map((d) => (
            <Text key={d} style={styles.weekDay}>
              {d}
            </Text>
          ))}
        </View>

        <View style={styles.daysGrid}>
          {Array.from({ length: firstDayIndex }).map((_, i) => (
            <View key={`empty-${i}`} style={styles.dayCell} />
          ))}

          {Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            const showDay = isTodayOrPast(day);
            const medsForDay = medications[day] || {};

            return (
              <View key={day} style={styles.dayCell}>
                <Text>{day}</Text>

                <View style={{ marginTop: 6 }}>
                  {showDay &&
                    uniqueTimes.map((time) => (
                      <Pressable
                        key={time}
                        onPress={() => handleTimeClick(day, time)}
                        style={styles.timeBtn}
                      >
                        <Text style={{ fontSize: 10 }}>{time}</Text>
                      </Pressable>
                    ))}
                </View>

                {Object.entries(medsForDay).map(([time, meds]) => (
                  <Text key={time} style={{ fontSize: 10, color: "green" }}>
                    {time}:{" "}
                    {meds.map((m) => m.medicationName).join(", ")}
                  </Text>
                ))}
              </View>
            );
          })}
        </View>
      </View>

      {/* Modal */}
      <Modal visible={showModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>
              Day {selectedDay} - {selectedTime}
            </Text>

            {timeBasedMeds.map((med, i) => (
              <Pressable
                key={i}
                onPress={() => toggleMedGiven(i)}
                style={styles.checkboxRow}
              >
                <Text>
                  {med.given ? "☑" : "☐"} {med.medicationName} ({med.dosage})
                </Text>
              </Pressable>
            ))}

            <Text style={styles.label}>Staff Name</Text>
            <TextInput value={staffName} editable={false} style={styles.input} />

            <Text style={styles.label}>Witness Name</Text>
            <TextInput
              value={witnessName}
              onChangeText={setWitnessName}
              style={styles.input}
            />

            <View style={styles.modalActions}>
              <Pressable
                onPress={() => setShowModal(false)}
                style={styles.cancelBtn}
              >
                <Text>Cancel</Text>
              </Pressable>
              <Pressable onPress={handleModalSubmit} style={styles.submitBtn}>
                <Text style={{ color: "#fff" }}>Submit</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Footer */}
      <View style={styles.row}>
        <View style={styles.card}>
          <Text style={{ fontWeight: "700" }}>Administration Codes</Text>
          <Text>"X": Client not in program</Text>
          <Text>"E": Medication Error</Text>
        </View>

        <View style={styles.card}>
          <Text style={{ fontWeight: "700" }}>Pharmacy Information</Text>
          {pharmacyInfo ? (
            <>
              <Text>Name: {pharmacyInfo.pharmacyName || "N/A"}</Text>
              <Text>Email: {pharmacyInfo.pharmacyEmail || "N/A"}</Text>
              <Text>Number: {pharmacyInfo.pharmacyPhone || "N/A"}</Text>
              <Text>Address: {pharmacyInfo.pharmacyAddress || "N/A"}</Text>
            </>
          ) : (
            <Text>No pharmacy info found.</Text>
          )}
        </View>

        <View style={styles.card}>
          <Text style={{ fontWeight: "700" }}>
            Authorization Administration (Trained)
          </Text>
          <TextInput placeholder="Name" style={styles.input} />
          <TextInput placeholder="Credentials" style={styles.input} />
        </View>
      </View>

      {/* {user?.role === "admin" && (
        <View style={{ alignItems: "flex-end", marginTop: 16 }}>
          <Pressable style={styles.exportBtn}>
            <Text>Export</Text>
          </Pressable>
        </View>
      )} */}
    </ScrollView>
  );
}

/* ---------------- STYLES ---------------- */
const styles = {
  title: { 
   marginTop: 10, 
  fontSize: 18, 
  fontWeight: "600", 
  marginBottom: 12,
  color: "#111827",   // 👈 REQUIRED
},

sectionTitle: { 
  textAlign: "center",
  fontSize: 18, 
  fontWeight: "600", 
  marginTop: 16, 
  marginBottom: 6,
  color: "#111827",   // 👈 REQUIRED
},

 row: { 
  flexDirection: "column", 
  flexWrap: "wrap", 
  justifyContent: "space-between",
  gap:10
},

field: { 
  width: "100%",   // ensures perfect 2x2 grid
},

  label: { fontSize: 12, fontWeight: "600", marginTop: 6 },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 6,
    padding: 8,
    marginTop: 4,
    backgroundColor: "#fff",
  },
  cardBlue: {
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#D8E9FF",
    borderRadius: 6,
    padding: 10,
  },
  medTitle: { fontWeight: "700", color: "#2563eb" },
  calendar: { borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 6, marginTop: 8 },
  calendarHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 10,
    borderBottomWidth: 1,
    borderColor: "#e5e7eb",
  },
  weekRow: { flexDirection: "row" },
  weekDay: { flex: 1, textAlign: "center", fontWeight: "700", padding: 6 },
  daysGrid: { flexDirection: "row", flexWrap: "wrap" },
  dayCell: {
    width: "14.28%",
    borderWidth: 0.5,
    borderColor: "#e5e7eb",
    padding: 4,
    minHeight: 80,
  },
  timeBtn: {
    borderWidth: 1,
    borderColor: "#93c5fd",
    borderRadius: 4,
    paddingHorizontal: 4,
    marginVertical: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalBox: {
    backgroundColor: "#fff",
    width: "90%",
    borderRadius: 8,
    padding: 16,
  },
  modalTitle: { fontSize: 16, fontWeight: "700", marginBottom: 10 },
  checkboxRow: { paddingVertical: 6 },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 12,
    gap: 8,
  },
  cancelBtn: { padding: 10, backgroundColor: "#e5e7eb", borderRadius: 6 },
  submitBtn: { padding: 10, backgroundColor: "#16a34a", borderRadius: 6 },
  card: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 6,
    padding: 10,
    width: "100%",
  },
  exportBtn: {
    backgroundColor: "#e5e7eb",
    padding: 10,
    borderRadius: 6,
  },
};
