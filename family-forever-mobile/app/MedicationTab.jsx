import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, Pressable, TextInput,
  Modal, StyleSheet, ActivityIndicator, Alert, Dimensions
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { collection, getDocs, doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../src/firebase/config';

const { width, height } = Dimensions.get('window');

const TAG_COLORS = {
  Morning: '#FFF4E6',
  Afternoon: '#E3F2FD',
  Night: '#F3E5F5',
  Emergency: '#FFEBEE',
};

const TAG_TEXT_COLORS = {
  Morning: '#E65100',
  Afternoon: '#1565C0',
  Night: '#6A1B9A',
  Emergency: '#C62828',
};

export default function MedicationTab({ shift }) {
  const todayDate = new Date();

  const [currentDate, setCurrentDate] = useState({
    month: todayDate.getMonth(),
    year: todayDate.getFullYear(),
  });

  const [selectedDay, setSelectedDay] = useState(null);
  const [showBottomSheet, setShowBottomSheet] = useState(false);
  const [activeTab, setActiveTab] = useState('add');

  // Data State
  const [medications, setMedications] = useState({}); // { 1: [{}], 12: [{}] }
  const [clientMedications, setClientMedications] = useState([]);
  const [healthcareNumber, setHealthcareNumber] = useState('');
  const [pharmacyInfo, setPharmacyInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  // Form State
  const [medicationForm, setMedicationForm] = useState({
    name: '', dosage: '', time: '', tag: 'Morning',
    errorField: '', staff: '', witness: '', reason: ''
  });

  const clientId = shift?.clientId || shift?.clientDetails?.id;
  const clientName = shift?.clientName || shift?.clientDetails?.name;
  const staffName = shift?.name || shift?.user || "Unknown Staff";

  /* --- DATA FETCHING (Merged from old logic) --- */
  useEffect(() => {
    const fetchAllData = async () => {
      if (!clientId) {
        setLoading(false);
        return;
      }
      try {
        // 1. Fetch Client Profile (Meds & Pharmacy)
        const clientRef = doc(db, "clients", clientId);
        const clientSnap = await getDoc(clientRef);
        if (clientSnap.exists()) {
          const cData = clientSnap.data();
          if (cData.pharmacy) setPharmacyInfo(cData.pharmacy);
          if (Array.isArray(cData.medications)) setClientMedications(cData.medications);
        }

        // 2. Fetch Medication Records for Month
        const docRef = doc(db, "medicationRecords", clientId);
        const docSnap = await getDoc(docRef);
        const monthKey = `${currentDate.year}-${String(currentDate.month + 1).padStart(2, "0")}`;

        if (docSnap.exists() && docSnap.data().records && docSnap.data().records[monthKey]) {
          setMedications(docSnap.data().records[monthKey]);
        } else {
          setMedications({});
        }

      } catch (e) {
        console.error("Error loading meds", e);
      } finally {
        setLoading(false);
      }
    };
    fetchAllData();
  }, [clientId, currentDate]);

  /* --- CALENDAR LOGIC --- */
  const monthName = new Date(currentDate.year, currentDate.month).toLocaleString("default", { month: "long" });
  const displayMonth = `${monthName.toUpperCase()} ${currentDate.year}`;
  const daysInMonth = Array.from({ length: new Date(currentDate.year, currentDate.month + 1, 0).getDate() }, (_, i) => i + 1);
  const firstDayOfWeek = new Date(currentDate.year, currentDate.month, 1).getDay() || 7; // Mon=1
  const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const calendarGrid = [];
  let currentWeek = [];

  for (let i = 1; i < firstDayOfWeek; i++) currentWeek.push(null);
  daysInMonth.forEach((day) => {
    currentWeek.push(day);
    if (currentWeek.length === 7) {
      calendarGrid.push([...currentWeek]);
      currentWeek = [];
    }
  });
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) currentWeek.push(null);
    calendarGrid.push(currentWeek);
  }

  const handleDayClick = (day) => {
    if (day) {
      setSelectedDay(day);
      setShowBottomSheet(true);
      setActiveTab('add');
      setMedicationForm({
        name: '', dosage: '', time: '', tag: 'Morning',
        errorField: '', staff: staffName, witness: '', reason: ''
      });
    }
  };

  const handleSubmitMedication = async () => {
    if (!selectedDay || !medicationForm.name || !medicationForm.dosage || !medicationForm.time) {
      Alert.alert("Missing Fields", "Please enter Medicine Name, Dosage, and Time");
      return;
    }

    const newMedication = { ...medicationForm, given: true, givenAt: new Date().toISOString() };
    const updatedMeds = { ...medications };
    updatedMeds[selectedDay] = [...(updatedMeds[selectedDay] || []), newMedication];

    // Optimistic Update
    setMedications(updatedMeds);
    setShowBottomSheet(false);

    try {
      const docRef = doc(db, "medicationRecords", clientId);
      const monthKey = `${currentDate.year}-${String(currentDate.month + 1).padStart(2, "0")}`;

      const docSnap = await getDoc(docRef);
      const existingData = docSnap.exists() ? docSnap.data() : {};
      const updatedRecords = { ...(existingData.records || {}), [monthKey]: updatedMeds };

      await setDoc(docRef, {
        clientId, clientName,
        records: updatedRecords,
        updatedAt: new Date(),
      }, { merge: true });

      Alert.alert("Success", "Medication added successfully!");
    } catch (e) {
      console.log("Save error", e);
      Alert.alert("Error", "Failed to save medication to database.");
    }
  };

  const administrationCodes = [
    { code: '*A*', description: 'Administered, Per Instructions' },
    { code: '*', description: 'Client not in program' },
    { code: '*E*', description: 'Medication Error' },
    { note: '** note: E requires an incident report **' },
  ];

  if (loading) return <View style={{ padding: 20 }}><ActivityIndicator size="large" color="#2D5F3F" /></View>;

  return (
    <View style={s.container}>

      {/* Header Card */}
      <View style={s.card}>
        <Text style={s.cardTitle}>Medication Administration Record</Text>
        <View style={s.grid}>
          {['Client Name', 'Month/Yr of the Record', 'ACH#', "Doctor's Name"].map((label, i) => (
            <View key={i} style={s.gridItem}>
              <Text style={s.label}>{label}</Text>
              <TextInput
                value={
                  label === 'Client Name' ? clientName :
                    label === 'Month/Yr of the Record' ? displayMonth :
                      label === 'ACH#' ? healthcareNumber : ""
                }
                editable={label === "Doctor's Name"}
                placeholder={`Enter ${label.toLowerCase()}`}
                style={[s.input, label !== "Doctor's Name" && { backgroundColor: '#F3F4F6' }]}
              />
            </View>
          ))}
        </View>
      </View>

      {/* Medication Timing & Type */}
      <View style={s.card}>
        <Text style={s.cardTitle}>Medication Timing & Type</Text>
        {clientMedications.length > 0 ? clientMedications.map((med, index) => (
          <View key={index} style={s.medBlock}>
            <Text style={s.medTitle}>{med.medicationName || "Unnamed Medication"}</Text>
            <View style={s.bulletRow}>
              <Text style={s.bullet}>•</Text>
              <Text style={s.bulletText}><Text style={{ fontWeight: '700' }}>Dosage:</Text> {med.dosage}</Text>
            </View>
            <View style={s.bulletRow}>
              <Text style={s.bullet}>•</Text>
              <Text style={s.bulletText}><Text style={{ fontWeight: '700' }}>Timing example:</Text> {med.timing}</Text>
            </View>
          </View>
        )) : (
          <Text style={s.noData}>No prescribed medications found for {clientName}.</Text>
        )}
      </View>

      {/* Monthly Medication Calendar */}
      <View style={s.cardZeroPad}>
        <View style={s.calHeader}>
          <Pressable onPress={() => setCurrentDate(p => p.month === 0 ? { month: 11, year: p.year - 1 } : { ...p, month: p.month - 1 })}>
            <Feather name="chevron-left" size={24} color="#2F6B4F" />
          </Pressable>
          <Text style={s.calTitle}>{displayMonth}</Text>
          <Pressable onPress={() => setCurrentDate(p => p.month === 11 ? { month: 0, year: p.year + 1 } : { ...p, month: p.month + 1 })}>
            <Feather name="chevron-right" size={24} color="#2F6B4F" />
          </Pressable>
        </View>

        <View style={s.calBody}>
          <View style={s.daysHeaderRow}>
            {daysOfWeek.map((day) => <Text key={day} style={s.dayHeaderText}>{day}</Text>)}
          </View>

          {calendarGrid.map((week, wIndex) => (
            <View key={wIndex} style={s.calRow}>
              {week.map((day, dIndex) => {
                const isToday = day === todayDate.getDate() && currentDate.month === todayDate.getMonth() && currentDate.year === todayDate.getFullYear();
                const meds = day ? medications[day] : null;
                const hasMeds = meds && meds.length > 0;

                return (
                  <Pressable
                    key={dIndex}
                    onPress={() => handleDayClick(day)}
                    disabled={!day}
                    style={[
                      s.calCell,
                      !day && { borderWidth: 0 },
                      isToday && { backgroundColor: '#E8F5EE', borderColor: '#2F6B4F' }
                    ]}
                  >
                    {day && (
                      <>
                        <Text style={[s.calDayText, isToday && { color: '#2F6B4F' }]}>{day}</Text>

                        {hasMeds ? (
                          <View style={s.medTagsContainer}>
                            {meds.slice(0, 2).map((m, idx) => (
                              <View key={idx} style={[s.medTag, { backgroundColor: TAG_COLORS[m.tag] }]}>
                                <Text style={[s.medTagText, { color: TAG_TEXT_COLORS[m.tag] }]} numberOfLines={1}>
                                  {m.name}
                                </Text>
                              </View>
                            ))}
                            {meds.length > 2 && <Text style={s.moreMeds}>+{meds.length - 2}</Text>}
                          </View>
                        ) : (
                          <View style={s.addMedBtn}>
                            <Text style={s.addMedText}>+</Text>
                          </View>
                        )}
                      </>
                    )}
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>
      </View>

      {/* Administration Codes */}
      <View style={s.card}>
        <Text style={s.cardTitle}>Administration Codes</Text>
        <Text style={s.codeText}><Text style={{ fontWeight: '700' }}>Initials:</Text> Administered, Per Instructions</Text>
        {administrationCodes.map((item, index) => (
          <Text key={index} style={[s.codeText, item.note && { fontStyle: 'italic', color: '#9CA3AF' }]}>
            {item.code && <Text style={{ fontWeight: '700' }}>{item.code} </Text>}
            {item.description || item.note}
          </Text>
        ))}
      </View>

      {/* Pharmacy Info */}
      <View style={s.card}>
        <View style={s.titleRow}>
          <Text style={s.emoji}>💊</Text>
          <Text style={s.cardTitle}>Pharmacy Information</Text>
        </View>
        <View style={s.pharmFlex}>
          <Text style={s.pharmLabel}>Name:</Text><Text style={s.pharmValue}>{pharmacyInfo?.pharmacyName || 'N/A'}</Text>
        </View>
        <View style={s.pharmFlex}>
          <Text style={s.pharmLabel}>E-Mail:</Text><Text style={s.pharmValue}>{pharmacyInfo?.pharmacyEmail || 'N/A'}</Text>
        </View>
        <View style={s.pharmFlex}>
          <Text style={s.pharmLabel}>Number:</Text><Text style={s.pharmValue}>{pharmacyInfo?.pharmacyPhone || 'N/A'}</Text>
        </View>
        <View style={s.pharmFlex}>
          <Text style={s.pharmLabel}>Address:</Text><Text style={s.pharmValue}>{pharmacyInfo?.pharmacyAddress || 'N/A'}</Text>
        </View>
      </View>

      {/* Authorization */}
      <View style={s.card}>
        <Text style={s.cardTitle}>Authorization Administration (Trained):</Text>
        <Text style={s.label}>Name</Text>
        <TextInput style={[s.input, { marginBottom: 10 }]} placeholder="Enter name" />
        <View style={s.sigBox}><Text style={s.sigText}>Sign Here</Text></View>
      </View>

      {/* Bottom Sheet Modal */}
      <Modal visible={showBottomSheet} transparent animationType="slide">
        <Pressable style={s.modalOverlay} onPress={() => setShowBottomSheet(false)}>
          <Pressable style={s.bottomSheet} onPress={(e) => e.stopPropagation()}>
            <View style={s.sheetHandle} />

            <View style={s.sheetHeader}>
              <Text style={s.sheetTitle}>Medications – {monthName} {selectedDay}</Text>
              <Pressable onPress={() => setShowBottomSheet(false)}>
                <Feather name="x" size={24} color="#666" />
              </Pressable>
            </View>

            <View style={s.sheetTabs}>
              <Pressable onPress={() => setActiveTab('add')} style={[s.sheetTabBtn, activeTab === 'add' && s.sheetTabActive]}>
                <Text style={[s.sheetTabText, activeTab === 'add' && s.sheetTabTextActive]}>Add</Text>
              </Pressable>
              <Pressable onPress={() => setActiveTab('history')} style={[s.sheetTabBtn, activeTab === 'history' && s.sheetTabActive]}>
                <Text style={[s.sheetTabText, activeTab === 'history' && s.sheetTabTextActive]}>History</Text>
              </Pressable>
            </View>

            <ScrollView style={s.sheetContent}>
              {activeTab === 'add' ? (
                <View style={s.form}>
                  <View style={s.noticeBox}>
                    <Text style={s.noticeText}>Medications should be administered half an hour before and half an hour after the shift.</Text>
                  </View>

                  <Text style={s.sheetLabel}>Medicine Name</Text>
                  <TextInput style={s.input} placeholder="Search medicine name..." value={medicationForm.name} onChangeText={(t) => setMedicationForm({ ...medicationForm, name: t })} />

                  <Text style={s.sheetLabel}>Dosage</Text>
                  <TextInput style={s.input} placeholder="e.g., 500 Mg, 2 tablets" value={medicationForm.dosage} onChangeText={(t) => setMedicationForm({ ...medicationForm, dosage: t })} />

                  <Text style={s.sheetLabel}>Time</Text>
                  <TextInput style={s.input} placeholder="HH:MM (e.g., 09:00)" value={medicationForm.time} onChangeText={(t) => setMedicationForm({ ...medicationForm, time: t })} />

                  <Text style={s.sheetLabel}>Tag Selector</Text>
                  <View style={s.tagRow}>
                    {['Morning', 'Afternoon', 'Night', 'Emergency'].map(tag => (
                      <Pressable
                        key={tag}
                        onPress={() => setMedicationForm({ ...medicationForm, tag })}
                        style={[s.formTag, { backgroundColor: TAG_COLORS[tag] }, medicationForm.tag !== tag && { opacity: 0.5 }]}
                      >
                        <Text style={[s.formTagText, { color: TAG_TEXT_COLORS[tag] }]}>{tag}</Text>
                      </Pressable>
                    ))}
                  </View>

                  <Text style={s.sheetLabel}>Staff Name</Text>
                  <TextInput style={s.input} value={medicationForm.staff} onChangeText={(t) => setMedicationForm({ ...medicationForm, staff: t })} />

                  <Text style={s.sheetLabel}>Witness Name</Text>
                  <TextInput style={s.input} placeholder="Enter the name of witness" value={medicationForm.witness} onChangeText={(t) => setMedicationForm({ ...medicationForm, witness: t })} />

                  <Text style={s.sheetLabel}>Reason</Text>
                  <TextInput
                    style={[s.input, { height: 80, textAlignVertical: 'top' }]}
                    multiline placeholder="Detailed reason..."
                    value={medicationForm.reason}
                    onChangeText={(t) => setMedicationForm({ ...medicationForm, reason: t })}
                  />

                  <Pressable style={s.submitMedsBtn} onPress={handleSubmitMedication}>
                    <Text style={s.submitMedsText}>Add Medication</Text>
                  </Pressable>
                </View>
              ) : (
                <View style={s.historyContainer}>
                  {medications[selectedDay] && medications[selectedDay].length > 0 ? (
                    medications[selectedDay].map((med, idx) => (
                      <View key={idx} style={s.historyCard}>
                        <View style={[s.formTag, { backgroundColor: TAG_COLORS[med.tag] }]}><Text style={[s.formTagText, { color: TAG_TEXT_COLORS[med.tag] }]}>{med.tag}</Text></View>
                        <Text style={s.historyTitle}>{med.name}</Text>
                        <Text style={s.historyDesc}>{med.dosage} • {med.time}</Text>
                        <Text style={s.historyMeta}>Staff: {med.staff}</Text>
                        {med.witness ? <Text style={s.historyMeta}>Witness: {med.witness}</Text> : null}
                      </View>
                    ))
                  ) : (
                    <Text style={s.noData}>No medications recorded for this day</Text>
                  )}
                </View>
              )}
            </ScrollView>

          </Pressable>
        </Pressable>
      </Modal>

      <View style={{ height: 20 }} />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  card: { backgroundColor: '#fff', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#E3E8E6', marginBottom: 16 },
  cardZeroPad: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#E3E8E6', marginBottom: 16, overflow: 'hidden' },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#1a1a1a', marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  gridItem: { width: '48%' },
  label: { fontSize: 12, fontWeight: '600', color: '#666', marginBottom: 6 },
  input: { backgroundColor: '#F7F9F8', borderWidth: 1, borderColor: '#E3E8E6', padding: 12, borderRadius: 8, fontSize: 13, color: '#1a1a1a' },

  medBlock: { borderBottomWidth: 1, borderBottomColor: '#E3E8E6', paddingBottom: 12, marginBottom: 12 },
  medTitle: { fontSize: 14, fontWeight: '700', color: '#2F6B4F', marginBottom: 8 },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 4 },
  bullet: { fontSize: 14, color: '#666', marginRight: 6 },
  bulletText: { fontSize: 12, color: '#666', flex: 1 },
  noData: { fontSize: 13, color: '#9CA3AF', textAlign: 'center', padding: 16 },

  calHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: 16, borderBottomWidth: 1, borderBottomColor: '#E3E8E6' },
  calTitle: { fontSize: 16, fontWeight: '700', color: '#1a1a1a' },
  calBody: { padding: 12, paddingBottom: 16 },
  daysHeaderRow: { flexDirection: 'row', marginBottom: 8 },
  dayHeaderText: { flex: 1, textAlign: 'center', fontSize: 10, fontWeight: '600', color: '#666' },
  calRow: { flexDirection: 'row', gap: 6, marginBottom: 6 },
  calCell: { flex: 1, minHeight: 60, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E3E8E6', borderRadius: 8, padding: 4, position: 'relative' },
  calDayText: { fontSize: 11, fontWeight: '600', color: '#1a1a1a', position: 'absolute', top: 4, left: 6 },
  medTagsContainer: { position: 'absolute', bottom: 4, left: 4, right: 4, gap: 2 },
  medTag: { paddingHorizontal: 4, paddingVertical: 2, borderRadius: 10 },
  medTagText: { fontSize: 8, fontWeight: '600' },
  moreMeds: { fontSize: 9, color: '#2F6B4F', fontWeight: '700', paddingLeft: 4 },
  addMedBtn: { position: 'absolute', bottom: 4, right: 4, width: 20, height: 20, backgroundColor: '#2F6B4F', borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  addMedText: { color: '#fff', fontSize: 12, fontWeight: '700', marginTop: -2 },

  codeText: { fontSize: 12, color: '#666', marginBottom: 6 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  emoji: { fontSize: 18 },
  pharmFlex: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  pharmLabel: { fontSize: 13, color: '#666', fontWeight: '500' },
  pharmValue: { fontSize: 13, color: '#333', fontWeight: '600' },
  sigBox: { height: 100, backgroundColor: '#F7F9F8', borderWidth: 1, borderColor: '#E3E8E6', borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  sigText: { color: '#9CA3AF', fontStyle: 'italic' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  bottomSheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, height: height * 0.85 },
  sheetHandle: { width: 40, height: 4, backgroundColor: '#E3E8E6', borderRadius: 2, alignSelf: 'center', marginTop: 12 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#E3E8E6' },
  sheetTitle: { fontSize: 18, fontWeight: '700', color: '#2b3232' },
  sheetTabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#E3E8E6', paddingHorizontal: 16 },
  sheetTabBtn: { paddingVertical: 12, marginRight: 20, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  sheetTabActive: { borderBottomColor: '#2F6B4F' },
  sheetTabText: { fontSize: 14, fontWeight: '600', color: '#666' },
  sheetTabTextActive: { color: '#2F6B4F' },

  sheetContent: { flex: 1, padding: 16 },
  form: { gap: 16, paddingBottom: 40 },
  noticeBox: { backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#d8e9ff', padding: 12, borderRadius: 8 },
  noticeText: { color: '#2f5ce9', fontSize: 12 },
  sheetLabel: { fontSize: 13, fontWeight: '700', color: '#2b3232', marginBottom: -8 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  formTag: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20 },
  formTagText: { fontSize: 12, fontWeight: '700' },
  submitMedsBtn: { backgroundColor: '#2F6B4F', paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  submitMedsText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  historyContainer: { gap: 12 },
  historyCard: { backgroundColor: '#F7F9F8', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#E3E8E6', alignItems: 'flex-start' },
  historyTitle: { fontSize: 16, fontWeight: '700', color: '#2b3232', marginTop: 8, marginBottom: 4 },
  historyDesc: { fontSize: 13, color: '#666', marginBottom: 4 },
  historyMeta: { fontSize: 12, color: '#666', fontWeight: '500' }
});
