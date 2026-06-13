import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, Pressable, TextInput,
  Image, Alert, ActivityIndicator, StyleSheet,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import {
  collection, getDocs, doc, getDoc, updateDoc, query, where,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../src/firebase/config';

const SERVICE_LIST = [
  { name: 'Emergent Care', key: 'emergentBillingCare' },
  { name: 'Respite Care', key: 'respiteCareBilling' },
  { name: 'Transportation', key: 'transportationsBilling' },
  { name: 'Supervised Visitation + Transportation', key: 'supervisedVisitationsTransportationBilling' },
];

export default function AgencyDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();   // id passed as query param

  const [loadingAgency, setLoadingAgency] = useState(true);
  const [saving, setSaving] = useState(false);
  const [agencyTypes, setAgencyTypes] = useState([]);
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [logoPreview, setLogoPreview] = useState(null);
  const [docId, setDocId] = useState(null);   // actual Firestore document ID

  const [form, setForm] = useState({
    agencyType: '', name: '', email: '', phone: '', address: '', description: '',
  });
  const [rateList, setRateList] = useState(
    SERVICE_LIST.map((s) => ({ name: s.name, billingRate: '', kmRate: '' }))
  );

  // ── Load agency data ────────────────────────────────────────
  useEffect(() => {
    const fetchAgency = async () => {
      if (!id) { setLoadingAgency(false); return; }
      try {
        // Try direct doc fetch first (Firestore doc ID = id)
        const directRef = doc(db, 'agencies', id);
        const directSnap = await getDoc(directRef);

        let data = null;
        let fDocId = id;

        if (directSnap.exists()) {
          data = directSnap.data();
        } else {
          // Fallback: query by the stored `id` field
          const q = query(collection(db, 'agencies'), where('id', '==', id));
          const snap = await getDocs(q);
          if (!snap.empty) {
            fDocId = snap.docs[0].id;
            data = snap.docs[0].data();
          }
        }

        if (data) {
          setDocId(fDocId);
          setForm({
            agencyType: data.agencyType || '',
            name: data.name || '',
            email: data.email || '',
            phone: data.phone || '',
            address: data.address || '',
            description: data.description || '',
          });
          setLogoPreview(data.avatar || null);
          setRateList(
            SERVICE_LIST.map((service) => {
              const matched = data.rateList?.find((r) => r.name === service.name);
              return {
                name: service.name,
                billingRate: matched ? String(matched.billingRate || matched.rate || '') : '',
                kmRate: matched ? String(matched.kmRate || '') : '',
              };
            })
          );
        }
      } catch (err) {
        console.error('Error fetching agency:', err);
      } finally {
        setLoadingAgency(false);
      }
    };

    const fetchTypes = async () => {
      try {
        const snap = await getDocs(collection(db, 'AgencyTypes'));
        setAgencyTypes(snap.docs.map((d) => ({ id: d.id, name: d.data().name })));
      } catch (err) { /* ignore */ }
    };

    fetchAgency();
    fetchTypes();
  }, [id]);

  // ── Update handlers ─────────────────────────────────────────
  const updateForm = (field, value) => setForm((p) => ({ ...p, [field]: value }));
  const updateRate = (index, field, value) => {
    setRateList((p) => { const c = [...p]; c[index] = { ...c[index], [field]: value }; return c; });
  };

  const pickLogo = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.8 });
    if (!result.canceled && result.assets[0]) setLogoPreview(result.assets[0].uri);
  };

  // ── Save ────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!form.name.trim()) { Alert.alert('Validation', 'Please enter the agency name.'); return; }
    if (!form.agencyType.trim()) { Alert.alert('Validation', 'Please select an agency type.'); return; }
    if (!docId) { Alert.alert('Error', 'Cannot find agency to update.'); return; }

    setSaving(true);
    try {
      const rateListWithNames = SERVICE_LIST.map((service, i) => ({
        name: service.name,
        billingRate: rateList[i]?.billingRate || 0,
        kmRate: rateList[i]?.kmRate || 0,
      }));

      let photoURL = logoPreview || '';
      if (logoPreview && !logoPreview.startsWith('http')) {
        const response = await fetch(logoPreview);
        const blob = await response.blob();
        const filename = `agency-${docId}-${Date.now()}.jpg`;
        const storageRef = ref(storage, `agency-images/${filename}`);
        await uploadBytes(storageRef, blob);
        photoURL = await getDownloadURL(storageRef);
      }

      await updateDoc(doc(db, 'agencies', docId), {
        agencyType: form.agencyType,
        name: form.name,
        email: form.email,
        phone: form.phone,
        address: form.address,
        description: form.description,
        rateList: rateListWithNames,
        avatar: photoURL,
        updatedAt: new Date(),
      });

      Alert.alert('✅ Updated', `"${form.name}" saved successfully.`, [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err) {
      console.error('Save error:', err);
      Alert.alert('Error', 'Failed to update agency. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loadingAgency) {
    return (
      <SafeAreaView style={[st.safe, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#2D5F3F" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={st.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Header */}
        <View style={st.header}>
          <Pressable onPress={() => router.back()} style={st.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#333" />
          </Pressable>
          <Text style={st.headerTitle}>Edit Agency</Text>
          <Pressable style={[st.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={st.saveBtnText}>Save</Text>}
          </Pressable>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {/* Logo */}
          <View style={st.card}>
            <View style={st.logoRow}>
              <View style={st.logoCircle}>
                {logoPreview
                  ? <Image source={{ uri: logoPreview }} style={st.logoImg} />
                  : <Ionicons name="business" size={36} color="#999" />}
              </View>
              <View style={{ gap: 8, flex: 1 }}>
                <Pressable style={st.changeLogo} onPress={pickLogo}>
                  <Text style={st.changeLogoText}>Change Logo</Text>
                </Pressable>
                {logoPreview && (
                  <Pressable style={st.removeLogo} onPress={() => setLogoPreview(null)}>
                    <Text style={st.removeLogoText}>Remove Logo</Text>
                  </Pressable>
                )}
              </View>
            </View>
          </View>

          {/* Agency Details */}
          <View style={st.card}>
            <Text style={st.label}>Agency Type</Text>
            <Pressable style={st.selectBtn} onPress={() => setShowTypePicker((v) => !v)}>
              <Text style={[st.selectText, !form.agencyType && { color: '#999' }]}>
                {form.agencyType || 'Select agency type'}
              </Text>
              <Ionicons name={showTypePicker ? 'chevron-up' : 'chevron-down'} size={18} color="#666" />
            </Pressable>
            {showTypePicker && (
              <View style={st.dropdown}>
                {agencyTypes.map((type) => (
                  <Pressable key={type.id}
                    style={[st.dropdownItem, form.agencyType === type.name && st.dropdownItemActive]}
                    onPress={() => { updateForm('agencyType', type.name); setShowTypePicker(false); }}>
                    <Text style={[st.dropdownText, form.agencyType === type.name && { color: '#fff' }]}>{type.name}</Text>
                  </Pressable>
                ))}
              </View>
            )}

            <Text style={st.label}>Agency Name</Text>
            <TextInput style={st.input} placeholder="Enter agency name" placeholderTextColor="#999"
              value={form.name} onChangeText={(v) => updateForm('name', v)} />

            <Text style={st.label}>E-Mail</Text>
            <TextInput style={st.input} placeholder="Enter email address" placeholderTextColor="#999"
              value={form.email} onChangeText={(v) => updateForm('email', v)}
              keyboardType="email-address" autoCapitalize="none" />

            <Text style={st.label}>Phone</Text>
            <TextInput style={st.input} placeholder="Enter phone number" placeholderTextColor="#999"
              value={form.phone} onChangeText={(v) => updateForm('phone', v)} keyboardType="phone-pad" />

            <Text style={st.label}>Address</Text>
            <TextInput style={st.input} placeholder="Enter address" placeholderTextColor="#999"
              value={form.address} onChangeText={(v) => updateForm('address', v)} />

            <Text style={st.label}>Description</Text>
            <TextInput style={[st.input, { height: 100, textAlignVertical: 'top' }]}
              placeholder="Write a brief description..." placeholderTextColor="#999"
              value={form.description} onChangeText={(v) => updateForm('description', v)} multiline numberOfLines={4} />
          </View>

          {/* Service Rates */}
          <View style={st.card}>
            <Text style={st.cardTitle}>Agency Service Rates</Text>
            {rateList.map((rate, index) => (
              <View key={index} style={st.rateRow}>
                <Text style={st.rateLabel}>{rate.name}</Text>
                <View style={st.rateInputRow}>
                  <View style={st.rateInputWrap}>
                    <Text style={st.rateFieldLabel}>Billing Rate</Text>
                    <TextInput style={st.rateInput} placeholder="0.00" placeholderTextColor="#999"
                      value={rate.billingRate} onChangeText={(v) => updateRate(index, 'billingRate', v)}
                      keyboardType="decimal-pad" />
                  </View>
                  <View style={st.rateInputWrap}>
                    <Text style={st.rateFieldLabel}>Kilometer Rate</Text>
                    <TextInput style={st.rateInput} placeholder="0.00" placeholderTextColor="#999"
                      value={rate.kmRate} onChangeText={(v) => updateRate(index, 'kmRate', v)}
                      keyboardType="decimal-pad" />
                  </View>
                </View>
              </View>
            ))}
          </View>

          <Pressable style={[st.submitBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" />
              : <Text style={st.submitText}>Save Changes</Text>}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F9F7F4' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F9F7F4', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#333' },
  saveBtn: { backgroundColor: '#2D5F3F', paddingHorizontal: 18, paddingVertical: 9, borderRadius: 10 },
  saveBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#333', marginBottom: 16 },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  logoCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#F5F5F5', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  logoImg: { width: 80, height: 80, borderRadius: 40 },
  changeLogo: { backgroundColor: '#2D5F3F', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 10, alignItems: 'center' },
  changeLogoText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  removeLogo: { borderWidth: 1, borderColor: '#2D5F3F', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 10, alignItems: 'center' },
  removeLogoText: { color: '#2D5F3F', fontSize: 13, fontWeight: '600' },
  label: { fontSize: 13, fontWeight: '600', color: '#333', marginBottom: 6, marginTop: 14 },
  input: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: '#333', backgroundColor: '#fff' },
  selectBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12 },
  selectText: { fontSize: 14, color: '#333' },
  dropdown: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, marginTop: 4, backgroundColor: '#fff', overflow: 'hidden' },
  dropdownItem: { paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  dropdownItemActive: { backgroundColor: '#2D5F3F' },
  dropdownText: { fontSize: 14, color: '#333' },
  rateRow: { marginBottom: 18, paddingBottom: 18, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  rateLabel: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 10 },
  rateInputRow: { flexDirection: 'row', gap: 12 },
  rateInputWrap: { flex: 1 },
  rateFieldLabel: { fontSize: 11, fontWeight: '500', color: '#666', marginBottom: 6 },
  rateInput: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: '#333' },
  submitBtn: { backgroundColor: '#2D5F3F', paddingVertical: 16, borderRadius: 14, alignItems: 'center', marginTop: 4, shadowColor: '#2D5F3F', shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
