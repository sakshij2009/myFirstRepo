import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../src/firebase/config';
import IntakeView from '../_IntakeView';

// Admin intake view — renders the SAME IntakeView used in the staff app so the
// layout/fields match exactly.
export default function IntakeFormViewScreen() {
  const router = useRouter();
  const { clientName, clientId } = useLocalSearchParams();

  const [loading, setLoading] = useState(true);
  const [intakeData, setIntakeData] = useState(null);

  useEffect(() => {
    let active = true;
    const fetchIntake = async () => {
      try {
        const name = (clientName || '').toString().trim();
        const idParam = (clientId || '').toString().trim();
        let matched = null;

        // 1. Direct match by childsName
        if (name) {
          const iq = query(collection(db, 'InTakeForms'), where('childsName', '==', name));
          const iSnap = await getDocs(iq);
          if (!iSnap.empty) matched = { id: iSnap.docs[0].id, ...iSnap.docs[0].data() };
        }

        // 2. Broader scan across InTakeForms + clients (by id or any name field)
        if (!matched) {
          const lname = name.toLowerCase();
          for (const coll of ['InTakeForms', 'clients']) {
            if (matched) break;
            const snap = await getDocs(collection(db, coll));
            for (const d of snap.docs) {
              const data = d.data();
              const names = [data.childsName, data.clientName, data.name, data.familyName, data.childName, data.nameInClientTable]
                .filter(Boolean).map((x) => String(x).toLowerCase());
              const idMatch = idParam && (d.id === idParam || data.clientId === idParam);
              const nameMatch = lname && names.includes(lname);
              const arrMatch = Array.isArray(data.inTakeClients) &&
                data.inTakeClients.some((c) => (c.name || '').toLowerCase() === lname);
              if (idMatch || nameMatch || arrMatch) { matched = { id: d.id, ...data }; break; }
            }
          }
        }

        if (active) setIntakeData(matched);
      } catch (e) {
        console.error('Intake fetch error:', e);
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchIntake();
    return () => { active = false; };
  }, [clientName, clientId]);

  return (
    <SafeAreaView style={s.container} edges={["top"]}>
      {/* Header */}
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.iconBtn}>
          <Ionicons name="chevron-back" size={26} color="#111827" />
        </Pressable>
        <Text style={s.headerTitle}>Client Intake Form</Text>
        <View style={{ width: 26 }} />
      </View>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color="#1F6F43" />
        </View>
      ) : intakeData ? (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>
          <IntakeView intakeData={intakeData} />
        </ScrollView>
      ) : (
        <View style={s.center}>
          <Ionicons name="document-text-outline" size={40} color="#D1D5DB" />
          <Text style={s.emptyText}>No intake form found for this client.</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 24 },
  emptyText: { fontSize: 14, color: '#6B7280', textAlign: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  iconBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#111827' },
});
