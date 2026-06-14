import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, ScrollView, Pressable, StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Image, Switch, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { doc, getDoc, updateDoc, collection, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../src/firebase/config';
import * as ImagePicker from 'expo-image-picker';

const SEAT_TYPES = ['Forward Facing Seat', 'Rear Facing Seat', 'Booster Seat', 'No Seat Required'];
const GENDERS = ['Male', 'Female', 'Other'];
const STATUSES = ['Active', 'Inactive'];

const emptyShiftPoint = () => ({
  name: '', seatType: 'Forward Facing Seat', gender: 'Male', dob: '',
  pickupTime: '', dropTime: '', pickupLocation: '', dropLocation: '',
  clientInfo: '', parentName: '', relationship: '', parentPhone: '',
  parentEmail: '', parentAddress: '',
});
const emptyMedication = () => ({
  medicationName: '', dosage: '', timing: '', medicineDescription: '',
  reasonOfMedication: '', cautions: '',
});
const emptyPharmacy = () => ({ pharmacyName: '', pharmacyEmail: '', pharmacyPhone: '', pharmacyAddress: '' });

export default function EditClientScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [agencies, setAgencies] = useState([]);
  const [avatarUri, setAvatarUri] = useState(null);     // newly picked
  const [existingAvatar, setExistingAvatar] = useState('');
  const [picker, setPicker] = useState(null);
  const [showPharmacy, setShowPharmacy] = useState(false);

  const [form, setForm] = useState({
    name: '', clientCode: '', password: '', clientStatus: 'Active',
    parentEmail: '', agency: '', address: '', dob: '',
    kmRate: '', clientRate: '', isFamily: false, description: '',
    shiftPoints: [],
    medications: [emptyMedication()],
    pharmacy: emptyPharmacy(),
  });

  useEffect(() => {
    const fetchAgencies = async () => {
      try {
        const snap = await getDocs(collection(db, 'agencies'));
        const names = snap.docs.map(d => d.data().agencyName || d.data().name).filter(Boolean);
        if (names.length) { setAgencies([...new Set(names)].sort()); return; }
      } catch (e) { /* fall through */ }
      try {
        const snap = await getDocs(collection(db, 'AgencyTypes'));
        setAgencies(snap.docs.map(d => d.data().name).filter(Boolean));
      } catch (e) { /* noop */ }
    };
    fetchAgencies();
  }, []);

  useEffect(() => {
    if (!id) { Alert.alert('Error', 'No Client ID provided'); router.back(); return; }
    const load = async () => {
      try {
        const snap = await getDoc(doc(db, 'clients', id));
        if (!snap.exists()) { Alert.alert('Not Found', 'Client not found.'); router.back(); return; }
        const data = snap.data();
        const str = (v) => (v === undefined || v === null) ? '' : String(v);
        setForm({
          name: data.name || '',
          clientCode: data.clientCode || '',
          password: data.password || '',
          clientStatus: data.clientStatus || 'Active',
          parentEmail: data.parentEmail || '',
          agency: data.agencyName || data.agency || '',
          address: data.address || '',
          dob: data.dob ? str(data.dob) : '',
          kmRate: str(data.kmRate),
          clientRate: str(data.clientRate),
          isFamily: data.isFamily === true,
          description: data.description || '',
          shiftPoints: Array.isArray(data.shiftPoints) ? data.shiftPoints.map(sp => ({ ...emptyShiftPoint(), ...sp })) : [],
          medications: Array.isArray(data.medications)
            ? data.medications.map(m => ({ ...emptyMedication(), ...m })).filter(m => m.medicationName || m.dosage || m.medicineDescription)
            : [],
          pharmacy: { ...emptyPharmacy(), ...(data.pharmacy || {}) },
        });
        // Show pharmacy section only if it already has data
        const ph = data.pharmacy || {};
        setShowPharmacy(!!(ph.pharmacyName || ph.pharmacyEmail || ph.pharmacyPhone || ph.pharmacyAddress));
        setExistingAvatar(data.avatar || '');
      } catch (e) {
        console.error('Load client error:', e);
        Alert.alert('Error', 'Failed to load client.');
      } finally {
        setFetching(false);
      }
    };
    load();
  }, [id]);

  const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }));
  const setPharmacy = (field, value) => setForm(prev => ({ ...prev, pharmacy: { ...prev.pharmacy, [field]: value } }));

  const addShiftPoint = () => setForm(prev => ({ ...prev, shiftPoints: [...prev.shiftPoints, emptyShiftPoint()] }));
  const removeShiftPoint = (i) => setForm(prev => ({ ...prev, shiftPoints: prev.shiftPoints.filter((_, idx) => idx !== i) }));
  const setShiftPoint = (i, field, value) => setForm(prev => ({
    ...prev, shiftPoints: prev.shiftPoints.map((sp, idx) => idx === i ? { ...sp, [field]: value } : sp),
  }));

  const addMedication = () => setForm(prev => ({ ...prev, medications: [...prev.medications, emptyMedication()] }));
  const removeMedication = (i) => setForm(prev => ({ ...prev, medications: prev.medications.filter((_, idx) => idx !== i) }));
  const setMedication = (i, field, value) => setForm(prev => ({
    ...prev, medications: prev.medications.map((m, idx) => idx === i ? { ...m, [field]: value } : m),
  }));

  const pickAvatar = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) setAvatarUri(result.assets[0].uri);
  };

  const handleSubmit = async () => {
    if (!form.name) { Alert.alert('Missing Fields', 'Please enter the client / family name.'); return; }
    if (!form.isFamily && !form.clientCode) { Alert.alert('Missing Fields', 'Client Code is required.'); return; }
    if (!form.agency) { Alert.alert('Missing Fields', 'Please select an agency.'); return; }

    try {
      setLoading(true);
      let photoURL = existingAvatar;
      if (avatarUri) {
        const response = await fetch(avatarUri);
        const blob = await response.blob();
        const storageRef = ref(storage, `client-images/client-${id}-${Date.now()}.jpg`);
        await uploadBytes(storageRef, blob);
        photoURL = await getDownloadURL(storageRef);
      }

      const payload = {
        name: form.name,
        clientCode: form.clientCode,
        password: form.password,
        clientStatus: form.isFamily ? 'Active' : form.clientStatus,
        parentEmail: form.parentEmail,
        agency: form.agency,
        agencyName: form.agency,
        address: form.address,
        dob: form.dob || null,
        kmRate: form.kmRate,
        clientRate: form.clientRate,
        isFamily: form.isFamily,
        clientCount: form.isFamily ? form.shiftPoints.length : 1,
        description: form.description,
        avatar: photoURL,
        shiftPoints: form.shiftPoints,
        medications: form.medications,
        pharmacy: form.pharmacy,
        updatedAt: new Date(),
      };

      await updateDoc(doc(db, 'clients', id), payload);
      Alert.alert('Success', 'Client Updated Successfully!', [
        { text: 'OK', onPress: () => router.replace('/admin/(tabs)/clients') },
      ]);
    } catch (e) {
      console.error('Error updating client', e);
      Alert.alert('Error', 'Failed to update client. Try again.');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <SafeAreaView style={[s.container, { justifyContent: 'center', alignItems: 'center' }]} edges={["top"]}>
        <ActivityIndicator size="large" color="#2D5F3F" />
      </SafeAreaView>
    );
  }

  const avatarShown = avatarUri || existingAvatar;

  return (
    <SafeAreaView style={s.container} edges={["top"]}>
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.backBtn}>
          <Feather name="arrow-left" size={24} color="#333" />
        </Pressable>
        <Text style={s.headerTitle}>Edit Client</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView style={s.scrollArea} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {/* Avatar */}
          <View style={s.card}>
            <View style={s.avatarWrapper}>
              <View style={s.avatarCircle}>
                {avatarShown ? <Image source={{ uri: avatarShown }} style={s.avatarImg} /> : <Feather name="camera" size={32} color="#9CA3AF" />}
              </View>
              <View style={s.avatarBtns}>
                <Pressable style={s.btnPrimary} onPress={pickAvatar}><Text style={s.btnPrimaryText}>Change Avatar</Text></Pressable>
                <Pressable style={s.btnSecondary} onPress={() => { setAvatarUri(null); setExistingAvatar(''); }}><Text style={s.btnSecondaryText}>Remove</Text></Pressable>
              </View>
            </View>
          </View>

          {/* Basic Information */}
          <View style={s.card}>
            <Text style={s.cardTitle}>Basic Information</Text>

            <View style={s.rowBetween}>
              <View style={{ flex: 1 }}>
                <Text style={s.label}>Family Client</Text>
                <Text style={s.hint}>Siblings are managed as Shift Points below</Text>
              </View>
              <Switch value={form.isFamily} onValueChange={(v) => set('isFamily', v)} trackColor={{ false: '#d1d5db', true: '#2D5F3F' }} thumbColor="#fff" />
            </View>

            <Field label={form.isFamily ? 'Family Name' : 'Name'} placeholder={form.isFamily ? 'Enter family name' : 'Enter client name'} value={form.name} onChange={(t) => set('name', t)} />
            {!form.isFamily && <Field label="Client Code" placeholder="Enter a specific ID" value={form.clientCode} onChange={(t) => set('clientCode', t)} />}
            {!form.isFamily && <PickerField label="Client Status" value={form.clientStatus} onPress={() => setPicker({ title: 'Client Status', options: STATUSES, onSelect: (v) => set('clientStatus', v) })} />}
            <Field label="Password" placeholder="Enter a specific password" value={form.password} onChange={(t) => set('password', t)} secure />
            <Field label="Parent E-Mail" placeholder="Enter the e-mail ID" value={form.parentEmail} onChange={(t) => set('parentEmail', t)} type="email-address" />
            <PickerField label="Agency" value={form.agency || 'Select agency'} onPress={() => setPicker({ title: 'Select Agency', options: agencies, onSelect: (v) => set('agency', v) })} />

            <Text style={s.label}>Address</Text>
            <TextInput style={[s.input, s.textArea]} placeholder="Enter the address" placeholderTextColor="#9CA3AF" multiline value={form.address} onChangeText={(t) => set('address', t)} />

            {!form.isFamily && <Field label="Date of Birth" placeholder="YYYY-MM-DD" value={form.dob} onChange={(t) => set('dob', t)} />}
            <Field label="Client KM Rate" placeholder="Enter the KM Rate" value={form.kmRate} onChange={(t) => set('kmRate', t)} type="numeric" />
            <Field label="Client Rate" placeholder="Enter the Rate" value={form.clientRate} onChange={(t) => set('clientRate', t)} type="numeric" />

            <Text style={s.label}>Description of Client</Text>
            <TextInput style={[s.input, s.textArea]} placeholder="Write the description of the client" placeholderTextColor="#9CA3AF" multiline value={form.description} onChangeText={(t) => set('description', t)} />
          </View>

          {/* Shift Points / Siblings */}
          <View style={s.card}>
            <View style={s.rowBetween}>
              <Text style={s.cardTitle}>{form.isFamily ? 'Siblings / Family Members' : 'Shift Points'}</Text>
              <Pressable style={s.addInlineBtn} onPress={addShiftPoint}>
                <Feather name="plus" size={16} color="#2D5F3F" /><Text style={s.addInlineText}>Add</Text>
              </Pressable>
            </View>
            {form.shiftPoints.length === 0 && <Text style={s.hint}>No shift points added yet.</Text>}

            {form.shiftPoints.map((sp, i) => (
              <View key={i} style={s.subCard}>
                <View style={s.rowBetween}>
                  <Text style={s.subCardTitle}>{sp.name?.trim() || `Shift Point #${i + 1}`}</Text>
                  <Pressable onPress={() => removeShiftPoint(i)}><Feather name="trash-2" size={16} color="#EF4444" /></Pressable>
                </View>
                <Field label="Name" placeholder="Enter name" value={sp.name} onChange={(t) => setShiftPoint(i, 'name', t)} />
                <PickerField label="Seat Type" value={sp.seatType} onPress={() => setPicker({ title: 'Seat Type', options: SEAT_TYPES, onSelect: (v) => setShiftPoint(i, 'seatType', v) })} />
                <PickerField label="Gender" value={sp.gender} onPress={() => setPicker({ title: 'Gender', options: GENDERS, onSelect: (v) => setShiftPoint(i, 'gender', v) })} />
                <Field label="Date of Birth" placeholder="YYYY-MM-DD" value={sp.dob} onChange={(t) => setShiftPoint(i, 'dob', t)} />
                <Field label="Pickup Time" placeholder="e.g. 09:00 AM" value={sp.pickupTime} onChange={(t) => setShiftPoint(i, 'pickupTime', t)} />
                <Field label="Drop Time" placeholder="e.g. 05:00 PM" value={sp.dropTime} onChange={(t) => setShiftPoint(i, 'dropTime', t)} />
                <Text style={s.label}>Pickup Location</Text>
                <TextInput style={[s.input, s.textAreaSm]} placeholder="Enter pickup location" placeholderTextColor="#9CA3AF" multiline value={sp.pickupLocation} onChangeText={(t) => setShiftPoint(i, 'pickupLocation', t)} />
                <Text style={s.label}>Drop Location</Text>
                <TextInput style={[s.input, s.textAreaSm]} placeholder="Enter drop location" placeholderTextColor="#9CA3AF" multiline value={sp.dropLocation} onChangeText={(t) => setShiftPoint(i, 'dropLocation', t)} />
                <Text style={s.label}>Client Info / Service Notes</Text>
                <TextInput style={[s.input, s.textAreaSm]} placeholder="Individual client notes" placeholderTextColor="#9CA3AF" multiline value={sp.clientInfo} onChangeText={(t) => setShiftPoint(i, 'clientInfo', t)} />

                <Text style={s.parentHeading}>Parent / Guardian</Text>
                <Field label="Name" placeholder="Parent name" value={sp.parentName} onChange={(t) => setShiftPoint(i, 'parentName', t)} />
                <Field label="Relationship" placeholder="e.g. Mother, Father" value={sp.relationship} onChange={(t) => setShiftPoint(i, 'relationship', t)} />
                <Field label="Phone" placeholder="Parent phone" value={sp.parentPhone} onChange={(t) => setShiftPoint(i, 'parentPhone', t)} type="phone-pad" />
                <Field label="Email" placeholder="Parent email" value={sp.parentEmail} onChange={(t) => setShiftPoint(i, 'parentEmail', t)} type="email-address" />
                <Field label="Address" placeholder="Parent address" value={sp.parentAddress} onChange={(t) => setShiftPoint(i, 'parentAddress', t)} />
              </View>
            ))}
          </View>

          {/* Medications */}
          <View style={s.card}>
            <View style={s.rowBetween}>
              <Text style={s.cardTitle}>Medications Information</Text>
              <Pressable style={s.addInlineBtn} onPress={addMedication}>
                <Feather name="plus" size={16} color="#2D5F3F" /><Text style={s.addInlineText}>Add</Text>
              </Pressable>
            </View>
            {form.medications.length === 0 && <Text style={s.hint}>No medications added. Tap “Add” to add one.</Text>}
            {form.medications.map((m, i) => (
              <View key={i} style={s.subCard}>
                <View style={s.rowBetween}>
                  <Text style={s.subCardTitle}>Medication #{i + 1}</Text>
                  {form.medications.length > 1 && <Pressable onPress={() => removeMedication(i)}><Feather name="trash-2" size={16} color="#EF4444" /></Pressable>}
                </View>
                <Field label="Name of Medication" placeholder="Enter medication name" value={m.medicationName} onChange={(t) => setMedication(i, 'medicationName', t)} />
                <Field label="Dosage" placeholder="Enter dosage" value={m.dosage} onChange={(t) => setMedication(i, 'dosage', t)} />
                <Field label="Timing" placeholder="e.g. Morning, After meal" value={m.timing} onChange={(t) => setMedication(i, 'timing', t)} />
                <Text style={s.label}>Description</Text>
                <TextInput style={[s.input, s.textAreaSm]} placeholder="Enter medication description" placeholderTextColor="#9CA3AF" multiline value={m.medicineDescription} onChangeText={(t) => setMedication(i, 'medicineDescription', t)} />
                <Text style={s.label}>Reasons of Medication</Text>
                <TextInput style={[s.input, s.textAreaSm]} placeholder="Enter reasons" placeholderTextColor="#9CA3AF" multiline value={m.reasonOfMedication} onChangeText={(t) => setMedication(i, 'reasonOfMedication', t)} />
                <Text style={s.label}>Cautions</Text>
                <TextInput style={[s.input, s.textAreaSm]} placeholder="Enter cautions" placeholderTextColor="#9CA3AF" multiline value={m.cautions} onChangeText={(t) => setMedication(i, 'cautions', t)} />
              </View>
            ))}
          </View>

          {/* Pharmacy */}
          <View style={s.card}>
            <View style={s.rowBetween}>
              <Text style={[s.cardTitle, { marginBottom: 0 }]}>Pharmacy Information</Text>
              {!showPharmacy ? (
                <Pressable style={s.addInlineBtn} onPress={() => setShowPharmacy(true)}>
                  <Feather name="plus" size={16} color="#2D5F3F" /><Text style={s.addInlineText}>Add</Text>
                </Pressable>
              ) : (
                <Pressable onPress={() => { setShowPharmacy(false); setForm(prev => ({ ...prev, pharmacy: emptyPharmacy() })); }}>
                  <Feather name="trash-2" size={18} color="#EF4444" />
                </Pressable>
              )}
            </View>
            {showPharmacy && (
              <View style={{ marginTop: 16 }}>
                <Field label="Pharmacy Name" placeholder="Enter pharmacy name" value={form.pharmacy.pharmacyName} onChange={(t) => setPharmacy('pharmacyName', t)} />
                <Field label="Pharmacy Email" placeholder="Enter pharmacy email" value={form.pharmacy.pharmacyEmail} onChange={(t) => setPharmacy('pharmacyEmail', t)} type="email-address" />
                <Field label="Pharmacy Phone" placeholder="Enter pharmacy phone" value={form.pharmacy.pharmacyPhone} onChange={(t) => setPharmacy('pharmacyPhone', t)} type="phone-pad" />
                <Text style={s.label}>Pharmacy Address</Text>
                <TextInput style={[s.input, s.textAreaSm]} placeholder="Enter pharmacy address" placeholderTextColor="#9CA3AF" multiline value={form.pharmacy.pharmacyAddress} onChangeText={(t) => setPharmacy('pharmacyAddress', t)} />
              </View>
            )}
          </View>

        </ScrollView>
      </KeyboardAvoidingView>

      <View style={s.footer}>
        <Pressable style={s.submitBtn} onPress={handleSubmit} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.submitBtnText}>Save Changes</Text>}
        </Pressable>
        <Pressable style={s.cancelBtn} onPress={() => router.back()} disabled={loading}>
          <Text style={s.cancelBtnText}>Cancel</Text>
        </Pressable>
      </View>

      <Modal visible={!!picker} transparent animationType="fade" onRequestClose={() => setPicker(null)}>
        <Pressable style={s.modalOverlay} onPress={() => setPicker(null)}>
          <View style={s.modalContent}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>{picker?.title}</Text>
              <Pressable onPress={() => setPicker(null)}><Feather name="x" size={20} color="#666" /></Pressable>
            </View>
            <ScrollView style={{ maxHeight: 320 }}>
              {(picker?.options || []).length === 0 && <Text style={s.emptyOpt}>No options available</Text>}
              {(picker?.options || []).map((opt) => (
                <Pressable key={opt} style={s.modalItem} onPress={() => { picker.onSelect(opt); setPicker(null); }}>
                  <Text style={s.modalItemText}>{opt}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function Field({ label, placeholder, value, onChange, secure, type = 'default' }) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={s.label}>{label}</Text>
      <TextInput style={s.input} placeholder={placeholder} placeholderTextColor="#9CA3AF" value={value} onChangeText={onChange} secureTextEntry={secure} keyboardType={type} autoCapitalize={type === 'email-address' ? 'none' : 'sentences'} />
    </View>
  );
}

function PickerField({ label, value, onPress }) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={s.label}>{label}</Text>
      <Pressable style={s.pickerOutline} onPress={onPress}>
        <Text style={s.pickerText}>{value}</Text>
        <Feather name="chevron-down" size={18} color="#2D5F3F" />
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9F7F4' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#F9F7F4', borderBottomWidth: 1, borderBottomColor: '#E5E7EB', zIndex: 10 },
  backBtn: { width: 40, height: 40, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#333' },

  scrollArea: { flex: 1 },
  scrollContent: { padding: 16, gap: 16, paddingBottom: 140 },

  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#F3F4F6' },
  cardTitle: { fontSize: 18, fontWeight: '600', color: '#333', marginBottom: 16 },
  subCard: { backgroundColor: '#F9FAFB', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#EEF0F2', marginBottom: 12 },
  subCardTitle: { fontSize: 14, fontWeight: '700', color: '#1a1a1a', marginBottom: 8 },
  parentHeading: { fontSize: 13, fontWeight: '700', color: '#2D5F3F', marginTop: 4, marginBottom: 10 },

  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, gap: 12 },
  addInlineBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: '#2D5F3F', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  addInlineText: { color: '#2D5F3F', fontSize: 13, fontWeight: '700' },

  avatarWrapper: { alignItems: 'center', marginVertical: 8 },
  avatarCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center', marginBottom: 16, overflow: 'hidden' },
  avatarImg: { width: '100%', height: '100%' },
  avatarBtns: { flexDirection: 'row', gap: 12 },
  btnPrimary: { backgroundColor: '#2D5F3F', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  btnPrimaryText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  btnSecondary: { backgroundColor: '#fff', borderWidth: 2, borderColor: '#2D5F3F', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  btnSecondaryText: { color: '#2D5F3F', fontSize: 13, fontWeight: '600' },

  label: { fontSize: 13, fontWeight: '600', color: '#333', marginBottom: 8 },
  hint: { fontSize: 12, color: '#9CA3AF', marginBottom: 8 },
  input: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 14, fontSize: 14, color: '#333' },
  textArea: { height: 100, textAlignVertical: 'top', marginBottom: 16 },
  textAreaSm: { height: 70, textAlignVertical: 'top', marginBottom: 16 },

  pickerOutline: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 14 },
  pickerText: { fontSize: 14, color: '#333' },

  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', padding: 16, borderTopWidth: 1, borderTopColor: '#E5E7EB', elevation: 10, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, shadowOffset: { width: 0, height: -4 } },
  submitBtn: { backgroundColor: '#2D5F3F', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginBottom: 12 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  cancelBtn: { paddingVertical: 8, alignItems: 'center' },
  cancelBtnText: { color: '#666', fontSize: 14, fontWeight: '600' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', backgroundColor: '#F9F7F4' },
  modalTitle: { fontSize: 16, fontWeight: '700', color: '#333' },
  modalItem: { paddingVertical: 16, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  modalItemText: { fontSize: 15, color: '#333', fontWeight: '500' },
  emptyOpt: { padding: 20, textAlign: 'center', color: '#9CA3AF' },
});
