import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, ScrollView, Pressable, StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../src/firebase/config';
import * as ImagePicker from 'expo-image-picker';

export default function EditClientScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams(); // Comes from /admin/edit-client?id=...

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [avatarUri, setAvatarUri] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    clientCode: '',
    clientStatus: 'Active',
    password: '',
    parentEmail: '',
    agency: '',
    address: '',
    dob: '',
    description: '',
    medications: [{
      medicationName: '',
      dosage: '',
      medicineDescription: '',
      reasonOfMedication: '',
      cautions: ''
    }]
  });

  useEffect(() => {
    if (!id) {
      Alert.alert("Error", "No Client ID provided");
      router.back();
      return;
    }
    fetchClient();
  }, [id]);

  const fetchClient = async () => {
    try {
      const clientSnap = await getDoc(doc(db, "clients", id));
      if (clientSnap.exists()) {
        const data = clientSnap.data();

        let initialMeds = [{
          medicationName: '', dosage: '', medicineDescription: '', reasonOfMedication: '', cautions: ''
        }];

        if (Array.isArray(data.medications) && data.medications.length > 0) {
          initialMeds = data.medications;
        }

        setFormData({
          name: data.name || '',
          clientCode: data.clientCode || '',
          clientStatus: data.clientStatus || 'Active',
          password: data.password || '',
          parentEmail: data.parentEmail || '',
          agency: data.agencyName || data.agency || '',
          address: data.address || '',
          dob: data.dob || '',
          description: data.description || '',
          medications: initialMeds
        });

        if (data.avatar) setAvatarUri(data.avatar);
      } else {
        Alert.alert("Error", "Client not found");
        router.back();
      }
    } catch (e) {
      console.error("Failed to fetch client", e);
      Alert.alert("Error", "Failed to load client details");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));
  const handleMedChange = (field, value) => setFormData(prev => ({
    ...prev,
    medications: [{ ...prev.medications[0], [field]: value }]
  }));

  const handleSubmit = async () => {
    if (!formData.name || !formData.clientCode || !formData.parentEmail) {
      Alert.alert("Missing Fields", "Please fill in the Name, Client Code, and Parent Email.");
      return;
    }

    try {
      setSubmitting(true);

      let photoURL = avatarUri || "";
      if (avatarUri && !avatarUri.startsWith('http')) {
        const response = await fetch(avatarUri);
        const blob = await response.blob();
        const filename = `client-${id}-${Date.now()}.jpg`;
        const storageRef = ref(storage, `client-images/${filename}`);
        await uploadBytes(storageRef, blob);
        photoURL = await getDownloadURL(storageRef);
      }

      const payload = {
        name: formData.name,
        clientCode: formData.clientCode,
        password: formData.password,
        clientStatus: formData.clientStatus,
        parentEmail: formData.parentEmail,
        agency: formData.agency,
        agencyName: formData.agency, // Ensure sync
        address: formData.address,
        dob: formData.dob,
        description: formData.description,
        avatar: photoURL,
        medications: [{
          medicationName: formData.medications[0].medicationName,
          dosage: formData.medications[0].dosage,
          medicineDescription: formData.medications[0].medicineDescription,
          reasonOfMedication: formData.medications[0].reasonOfMedication,
          cautions: formData.medications[0].cautions,
          timing: formData.medications[0].timing || ""
        }],
        updatedAt: new Date(),
      };

      await updateDoc(doc(db, "clients", id), payload);

      Alert.alert("Success", "Client Updated Successfully!", [
        { text: "OK", onPress: () => router.replace('/admin/(tabs)/clients') }
      ]);

    } catch (e) {
      console.error("Error updating client", e);
      Alert.alert("Error", "Failed to update client. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[s.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#2D5F3F" />
      </SafeAreaView>
    );
  }

  const initials = formData.name ? formData.name.substring(0, 2).toUpperCase() : '??';

  return (
    <SafeAreaView style={s.container} edges={["top"]}>
      {/* Header */}
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.backBtn}>
          <Feather name="arrow-left" size={24} color="#333" />
        </Pressable>
        <Text style={s.headerTitle}>Edit Client</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView style={s.scrollArea} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>

          {/* Avatar Upload Section */}
          <View style={s.card}>
            <View style={s.avatarWrapper}>
              <View style={[s.avatarCircle, !avatarUri && { backgroundColor: '#4ECDC4' }]}>
                {avatarUri ? (
                  <Image source={{ uri: avatarUri }} style={s.avatarImg} />
                ) : (
                  <Text style={s.avatarInitials}>{initials}</Text>
                )}
              </View>
              <View style={s.avatarBtns}>
                <Pressable style={s.btnPrimary} onPress={async () => {
                  const result = await ImagePicker.launchImageLibraryAsync({
                    mediaTypes: ImagePicker.MediaTypeOptions.Images,
                    allowsEditing: true,
                    aspect: [1, 1],
                    quality: 0.8,
                  });
                  if (!result.canceled && result.assets[0]) {
                    setAvatarUri(result.assets[0].uri);
                  }
                }}>
                  <Text style={s.btnPrimaryText}>Change Avatar</Text>
                </Pressable>
                <Pressable style={s.btnSecondary} onPress={() => setAvatarUri(null)}>
                  <Text style={s.btnSecondaryText}>Remove</Text>
                </Pressable>
              </View>
            </View>
          </View>

          {/* Basic Information */}
          <View style={s.card}>
            <Text style={s.cardTitle}>Basic Information</Text>

            <FormField label="Name" placeholder="Enter client name" value={formData.name} onChange={(t) => handleChange('name', t)} />
            <FormField label="Client Code" placeholder="Enter client code" value={formData.clientCode} onChange={(t) => handleChange('clientCode', t)} />

            {/* Status Picker (Pseudo) */}
            <Text style={s.label}>Client Status</Text>
            <View style={s.pickerOutline}>
              <Text style={s.pickerText}>{formData.clientStatus}</Text>
              <Pressable style={s.pickerToggle} onPress={() => handleChange('clientStatus', formData.clientStatus === 'Active' ? 'Inactive' : 'Active')}>
                <Feather name="refresh-cw" size={16} color="#2D5F3F" />
              </Pressable>
            </View>

            <FormField label="Password" placeholder="Enter password (leave blank to keep)" value={formData.password} onChange={(t) => handleChange('password', t)} secure />
            <FormField label="Parent E-Mail" placeholder="Enter parent email" value={formData.parentEmail} onChange={(t) => handleChange('parentEmail', t)} type="email-address" />
            <FormField label="Agency" placeholder="Type Agency Name" value={formData.agency} onChange={(t) => handleChange('agency', t)} />

            <Text style={s.label}>Address</Text>
            <TextInput style={[s.input, s.textArea]} placeholder="Enter address" multiline numberOfLines={3} value={formData.address} onChangeText={(t) => handleChange('address', t)} />

            <FormField label="Date of Birth" placeholder="YYYY-MM-DD" value={formData.dob} onChange={(t) => handleChange('dob', t)} />

            <Text style={s.label}>Description of Client</Text>
            <TextInput style={[s.input, s.textArea]} placeholder="Enter description" multiline numberOfLines={4} value={formData.description} onChangeText={(t) => handleChange('description', t)} />
          </View>

          {/* Medications Information */}
          <View style={s.card}>
            <Text style={s.cardTitle}>Medications Information</Text>
            <FormField label="Name of Medications" placeholder="Enter medication name" value={formData.medications[0].medicationName} onChange={(t) => handleMedChange('medicationName', t)} />
            <FormField label="Dosage" placeholder="Enter dosage" value={formData.medications[0].dosage} onChange={(t) => handleMedChange('dosage', t)} />

            <Text style={s.label}>Description</Text>
            <TextInput style={[s.input, s.textArea]} placeholder="Enter medication description" multiline numberOfLines={3} value={formData.medications[0].medicineDescription} onChangeText={(t) => handleMedChange('medicineDescription', t)} />

            <Text style={s.label}>Reasons of Medications</Text>
            <TextInput style={[s.input, s.textArea]} placeholder="Enter reasons" multiline numberOfLines={3} value={formData.medications[0].reasonOfMedication} onChangeText={(t) => handleMedChange('reasonOfMedication', t)} />

            <Text style={s.label}>Cautions</Text>
            <TextInput style={[s.input, s.textArea]} placeholder="Enter cautions" multiline numberOfLines={3} value={formData.medications[0].cautions} onChangeText={(t) => handleMedChange('cautions', t)} />
          </View>

        </ScrollView>
      </KeyboardAvoidingView>

      {/* Footer Submit */}
      <View style={s.footer}>
        <Pressable style={s.submitBtn} onPress={handleSubmit} disabled={submitting}>
          {submitting ? <ActivityIndicator color="#fff" /> : <Text style={s.submitBtnText}>Update Client</Text>}
        </Pressable>
        <Pressable style={s.cancelBtn} onPress={() => router.back()} disabled={submitting}>
          <Text style={s.cancelBtnText}>Cancel</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function FormField({ label, placeholder, value, onChange, secure, type = "default" }) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        style={s.input}
        placeholder={placeholder}
        placeholderTextColor="#9CA3AF"
        value={value}
        onChangeText={onChange}
        secureTextEntry={secure}
        keyboardType={type}
      />
    </View>
  );
}

/* ------------ STYLES ------------ */
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9F7F4' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#F9F7F4', borderBottomWidth: 1, borderBottomColor: '#E5E7EB', zIndex: 10 },
  backBtn: { width: 40, height: 40, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#333' },

  scrollArea: { flex: 1 },
  scrollContent: { padding: 16, gap: 16, paddingBottom: 120 },

  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#F3F4F6', elevation: 2, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8 },
  cardTitle: { fontSize: 18, fontWeight: '600', color: '#333', marginBottom: 16 },

  avatarWrapper: { alignItems: 'center', marginVertical: 8 },
  avatarCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center', marginBottom: 16, overflow: 'hidden', elevation: 3, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 6 },
  avatarImg: { width: '100%', height: '100%' },
  avatarInitials: { fontSize: 32, fontWeight: '700', color: '#fff' },
  avatarBtns: { flexDirection: 'row', gap: 12 },
  btnPrimary: { backgroundColor: '#2D5F3F', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  btnPrimaryText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  btnSecondary: { backgroundColor: '#fff', borderWidth: 2, borderColor: '#2D5F3F', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  btnSecondaryText: { color: '#2D5F3F', fontSize: 13, fontWeight: '600' },

  label: { fontSize: 13, fontWeight: '600', color: '#333', marginBottom: 8 },
  input: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 14, fontSize: 14, color: '#333' },
  textArea: { height: 100, textAlignVertical: 'top' },

  pickerOutline: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 16 },
  pickerText: { fontSize: 14, color: '#333' },
  pickerToggle: { padding: 4 },

  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', padding: 16, borderTopWidth: 1, borderTopColor: '#E5E7EB', elevation: 10, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, shadowOffset: { width: 0, height: -4 } },
  submitBtn: { backgroundColor: '#2D5F3F', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginBottom: 12 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  cancelBtn: { paddingVertical: 8, alignItems: 'center' },
  cancelBtnText: { color: '#666', fontSize: 14, fontWeight: '600' },
});
