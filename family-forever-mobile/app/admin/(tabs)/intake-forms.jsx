import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, TextInput, ScrollView, Pressable, StyleSheet, ActivityIndicator, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { collection, getDocs } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../../../src/firebase/config';

const hasVal = (v) => v !== undefined && v !== null && String(v).trim() !== '' && String(v).trim() !== '—';

const careColor = (name) => {
  const l = (name || '').toLowerCase();
  if (l.includes('emergent') || l.includes('emergency')) return '#FF4D6D';
  if (l.includes('visitation') || l.includes('supervised')) return '#FF9F1C';
  if (l.includes('respite')) return '#4ECDC4';
  if (l.includes('transport')) return '#8B5CF6';
  return '#3B82F6';
};

export default function IntakeFormsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [forms, setForms] = useState([]);
  const [search, setSearch] = useState('');

  const [agencyFilter, setAgencyFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [picker, setPicker] = useState(null); // { title, options, onSelect }

  // Send-intake modal
  const [sendStep, setSendStep] = useState(null); // null | 'choose' | 'email'
  const [sendRole, setSendRole] = useState(null); // 'parent' | 'worker'
  const [sendEmail, setSendEmail] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => { fetchForms(); }, []);

  const fetchForms = async () => {
    try {
      setLoading(true);
      const [intakeSnap, catSnap] = await Promise.all([
        getDocs(collection(db, 'InTakeForms')),
        getDocs(collection(db, 'shiftCategories')),
      ]);

      const categoryMap = {};
      catSnap.docs.forEach(d => {
        const data = d.data();
        categoryMap[d.id] = data.name || data.categoryName || data.label || '';
        if (data.id) categoryMap[data.id] = categoryMap[d.id];
      });

      const derived = intakeSnap.docs.map(d => {
        const data = d.data();

        // Form type
        const workerish = hasVal(data.intakeworkerName) || hasVal(data.intakeWorkerInfo) ||
          hasVal(data.caseWorkerInfo) || hasVal(data.isCaseWorker) || hasVal(data.agencyName) || hasVal(data.agency);
        const formType = (data.formType && /worker/i.test(data.formType)) || workerish ? 'Intake Worker' : 'Private Family';

        // Client name
        let clientName = '—';
        let clientCode = `CL-${d.id.slice(0, 7)}`;
        let parentEmail = data.parentEmail || data.email || data.applicantEmail || '—';
        let agency = data.agencyName || data.agency || '—';

        const arr = Array.isArray(data.inTakeClients) ? data.inTakeClients
          : Array.isArray(data.clients) ? data.clients
            : (data.clients && typeof data.clients === 'object' ? Object.values(data.clients) : []);
        if (arr.length) {
          const first = arr[0];
          clientName = first.name || first.fullName || clientName;
          clientCode = first.clientCode || first.clientId || clientCode;
          parentEmail = first.parentEmail || first.email || parentEmail;
          agency = first.agencyName || first.agency || agency;
        }
        if (!hasVal(clientName)) {
          clientName = data.clientName || data.childName || data.familyName || data.name || '—';
        }

        // Care category from services.serviceType ids → names, else serviceRequired
        let category = '—';
        const ids = data.services?.serviceType;
        if (Array.isArray(ids) && ids.length) {
          const names = ids.map(id => categoryMap[id]).filter(Boolean);
          if (names.length) category = names.join(', ');
        }
        if (!hasVal(category) && arr.length) {
          const sr = arr[0].serviceRequired;
          category = Array.isArray(sr) ? sr.join(', ') : (sr || '—');
        }

        const status = data.status || 'Submitted';

        return { id: d.id, clientName, clientCode, parentEmail, agency, category, status, formType };
      });

      setForms(derived);
    } catch (e) {
      console.error('Error loading intake forms', e);
      Alert.alert('Error', 'Failed to load intake forms');
    } finally {
      setLoading(false);
    }
  };

  const agencyOptions = useMemo(() => ['All', ...new Set(forms.map(f => f.agency).filter(hasVal))], [forms]);
  const statusOptions = useMemo(() => ['All', ...new Set(forms.map(f => f.status).filter(hasVal))], [forms]);
  const categoryOptions = useMemo(() => ['All', ...new Set(forms.map(f => f.category).filter(hasVal))], [forms]);

  const filtered = useMemo(() => forms.filter(f => {
    const matchAgency = agencyFilter === 'All' || f.agency === agencyFilter;
    const matchStatus = statusFilter === 'All' || f.status === statusFilter;
    const matchCat = categoryFilter === 'All' || f.category === categoryFilter;
    const q = search.toLowerCase();
    const matchSearch = !search || (f.clientName || '').toLowerCase().includes(q) || (f.clientCode || '').toLowerCase().includes(q);
    return matchAgency && matchStatus && matchCat && matchSearch;
  }), [forms, agencyFilter, statusFilter, categoryFilter, search]);

  const intakeFormCount = forms.filter(f => f.formType === 'Intake Worker').length;

  const handleSend = async () => {
    const email = sendEmail.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      Alert.alert('Invalid email', 'Please enter a valid email address.');
      return;
    }
    setSending(true);
    try {
      const sendSignInEmail = httpsCallable(functions, 'sendSignInEmail');
      await sendSignInEmail({ email, role: sendRole === 'worker' ? 'worker' : 'parent', isInvitation: true });
      Alert.alert('Sent', `Intake form link sent to ${email}.`);
      setSendStep(null); setSendRole(null); setSendEmail('');
    } catch (e) {
      console.error('Send intake link error', e);
      Alert.alert('Error', 'Failed to send the intake form link. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const statusColor = (st) => {
    const l = (st || '').toLowerCase();
    if (l.includes('accept') || l.includes('active')) return '#10B981';
    if (l.includes('reject') || l.includes('inactive')) return '#9CA3AF';
    if (l.includes('draft')) return '#9CA3AF';
    return '#F59E0B'; // submitted/pending
  };

  return (
    <SafeAreaView style={s.container} edges={["top"]}>
      {/* Header */}
      <View style={s.header}>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Clients Intake Forms</Text>
          <Text style={s.headerSub}>Total Intake Form: {forms.length} | Intake Worker: {intakeFormCount}</Text>
        </View>
        <Pressable style={s.workersBtn} onPress={() => router.push('/admin/intake-workers')}>
          <Ionicons name="people-outline" size={18} color="#2D5F3F" />
        </Pressable>
        <Pressable style={s.addBtn} onPress={() => { setSendRole(null); setSendStep('choose'); }}>
          <Ionicons name="add" size={26} color="#fff" />
        </Pressable>
      </View>

      {/* Search */}
      <View style={s.searchWrap}>
        <Feather name="search" size={18} color="#9CA3AF" />
        <TextInput style={s.searchInput} placeholder="Search name or code..." placeholderTextColor="#9CA3AF" value={search} onChangeText={setSearch} />
      </View>

      {/* Filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterRow}>
        <FilterChip label={`Agency: ${agencyFilter}`} onPress={() => setPicker({ title: 'Agency', options: agencyOptions, onSelect: setAgencyFilter })} />
        <FilterChip label={`Client Status: ${statusFilter}`} onPress={() => setPicker({ title: 'Client Status', options: statusOptions, onSelect: setStatusFilter })} />
        <FilterChip label={`Care Category: ${categoryFilter}`} onPress={() => setPicker({ title: 'Care Category', options: categoryOptions, onSelect: setCategoryFilter })} />
      </ScrollView>

      {loading ? (
        <View style={s.center}><ActivityIndicator size="large" color="#2D5F3F" /></View>
      ) : (
        <ScrollView contentContainerStyle={s.list} showsVerticalScrollIndicator={false}>
          {filtered.map(f => (
            <View key={f.id} style={s.card}>
              <View style={s.cardTopRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.clientName}>{f.clientName}</Text>
                  <Text style={s.clientCode}>{f.clientCode}</Text>
                </View>
              </View>

              <View style={s.badgesRow}>
                {hasVal(f.category) && <View style={[s.badge, { backgroundColor: careColor(f.category) }]}><Text style={s.badgeText}>{f.category}</Text></View>}
                <View style={[s.badge, { backgroundColor: statusColor(f.status) }]}><Text style={s.badgeText}>{f.status}</Text></View>
                <View style={[s.badge, { backgroundColor: '#8B5CF6' }]}><Text style={s.badgeText}>{f.formType}</Text></View>
              </View>

              <Text style={s.emailLabel}>Parent Email:</Text>
              <Text style={s.emailValue}>{f.parentEmail}</Text>

              <Pressable style={s.viewBtn} onPress={() => router.push(`/admin/intake-form-view?clientName=${encodeURIComponent(f.clientName || '')}&clientId=${encodeURIComponent(f.id)}`)}>
                <Text style={s.viewBtnText}>View Intake Form</Text>
              </Pressable>
            </View>
          ))}
          {filtered.length === 0 && (
            <View style={s.center}><Text style={{ color: '#9CA3AF', marginTop: 40 }}>No intake forms found.</Text></View>
          )}
          <View style={{ height: 80 }} />
        </ScrollView>
      )}

      {/* Filter picker */}
      <Modal visible={!!picker} transparent animationType="fade" onRequestClose={() => setPicker(null)}>
        <Pressable style={s.overlay} onPress={() => setPicker(null)}>
          <View style={s.sheet}>
            <View style={s.sheetHeader}>
              <Text style={s.sheetTitle}>{picker?.title}</Text>
              <Pressable onPress={() => setPicker(null)}><Feather name="x" size={20} color="#666" /></Pressable>
            </View>
            <ScrollView style={{ maxHeight: 320 }}>
              {(picker?.options || []).map(opt => (
                <Pressable key={opt} style={s.sheetItem} onPress={() => { picker.onSelect(opt); setPicker(null); }}>
                  <Text style={s.sheetItemText}>{opt}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>

      {/* Send intake: choose recipient type */}
      <Modal visible={sendStep === 'choose'} transparent animationType="fade" onRequestClose={() => setSendStep(null)}>
        <Pressable style={s.overlay} onPress={() => setSendStep(null)}>
          <View style={s.sheet}>
            <View style={s.sheetHeader}>
              <Text style={s.sheetTitle}>Send Intake Form</Text>
              <Pressable onPress={() => setSendStep(null)}><Feather name="x" size={20} color="#666" /></Pressable>
            </View>
            <Text style={s.sheetSub}>Who is this intake form for?</Text>
            <Pressable style={s.choiceBtn} onPress={() => { setSendRole('parent'); setSendStep('email'); }}>
              <Ionicons name="home-outline" size={20} color="#2D5F3F" />
              <Text style={s.choiceText}>Private Family</Text>
              <Feather name="chevron-right" size={18} color="#9CA3AF" />
            </Pressable>
            <Pressable style={s.choiceBtn} onPress={() => { setSendRole('worker'); setSendStep('email'); }}>
              <Ionicons name="briefcase-outline" size={20} color="#2D5F3F" />
              <Text style={s.choiceText}>Intake Worker</Text>
              <Feather name="chevron-right" size={18} color="#9CA3AF" />
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      {/* Send intake: email */}
      <Modal visible={sendStep === 'email'} transparent animationType="fade" onRequestClose={() => setSendStep(null)}>
        <Pressable style={s.overlay} onPress={() => !sending && setSendStep(null)}>
          <View style={s.sheet}>
            <View style={s.sheetHeader}>
              <Text style={s.sheetTitle}>{sendRole === 'worker' ? 'Intake Worker' : 'Private Family'} — Email</Text>
              <Pressable onPress={() => !sending && setSendStep('choose')}><Feather name="arrow-left" size={20} color="#666" /></Pressable>
            </View>
            <Text style={s.sheetSub}>Enter the email to send the intake form link to.</Text>
            <TextInput
              style={s.emailInput}
              placeholder="recipient@example.com"
              placeholderTextColor="#9CA3AF"
              value={sendEmail}
              onChangeText={setSendEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoFocus
            />
            <Pressable style={[s.sendBtn, sending && { opacity: 0.6 }]} onPress={handleSend} disabled={sending}>
              {sending ? <ActivityIndicator color="#fff" /> : <Text style={s.sendBtnText}>Send Intake Form Link</Text>}
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function FilterChip({ label, onPress }) {
  return (
    <Pressable style={s.chip} onPress={onPress}>
      <Text style={s.chipText}>{label}</Text>
      <Feather name="chevron-down" size={15} color="#2D5F3F" />
    </Pressable>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9F7F4' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#333' },
  headerSub: { fontSize: 12, color: '#666', marginTop: 2 },
  workersBtn: { width: 42, height: 42, borderRadius: 12, borderWidth: 1, borderColor: '#2D5F3F', justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  addBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#2D5F3F', justifyContent: 'center', alignItems: 'center' },

  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginTop: 4, paddingHorizontal: 12, height: 46, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, backgroundColor: '#fff' },
  searchInput: { flex: 1, fontSize: 14, color: '#333' },

  filterRow: { gap: 8, paddingHorizontal: 16, paddingVertical: 12 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB', paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20 },
  chipText: { fontSize: 13, fontWeight: '600', color: '#333' },

  list: { paddingHorizontal: 16, paddingTop: 4, gap: 16 },
  card: { backgroundColor: '#fff', borderRadius: 18, padding: 18, borderWidth: 1, borderColor: '#F3F4F6' },
  cardTopRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  clientName: { fontSize: 17, fontWeight: '700', color: '#1a1a1a' },
  clientCode: { fontSize: 13, color: '#9CA3AF', marginTop: 2, fontWeight: '600' },

  badgesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  badge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  badgeText: { fontSize: 11, fontWeight: '700', color: '#fff' },

  emailLabel: { fontSize: 12, color: '#6B7280', fontWeight: '600' },
  emailValue: { fontSize: 14, color: '#111827', fontWeight: '600', marginTop: 2, marginBottom: 14 },

  viewBtn: { borderWidth: 1.5, borderColor: '#2D5F3F', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  viewBtnText: { color: '#2D5F3F', fontSize: 14, fontWeight: '700' },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  sheet: { backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', padding: 0 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', backgroundColor: '#F9F7F4' },
  sheetTitle: { fontSize: 16, fontWeight: '700', color: '#333' },
  sheetSub: { fontSize: 13, color: '#6B7280', paddingHorizontal: 16, paddingTop: 14 },
  sheetItem: { paddingVertical: 16, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  sheetItemText: { fontSize: 15, color: '#333', fontWeight: '500' },

  choiceBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 16, marginTop: 12, padding: 16, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, backgroundColor: '#F9FAFB' },
  choiceText: { flex: 1, fontSize: 15, fontWeight: '700', color: '#1a1a1a' },

  emailInput: { marginHorizontal: 16, marginTop: 14, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: '#333', backgroundColor: '#F9FAFB' },
  sendBtn: { margin: 16, backgroundColor: '#2D5F3F', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  sendBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
