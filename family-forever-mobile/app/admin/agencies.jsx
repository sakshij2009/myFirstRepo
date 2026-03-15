import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  StyleSheet,
  Platform,
  ActivityIndicator,
  Alert,
  Modal,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  query,
  orderBy,
} from 'firebase/firestore';
import { db } from '../../src/firebase/config';

/* ─── helpers ─────────────────────────────────────────────── */
const RATE_NAMES = [
  'Emergent Care',
  'Respite Care',
  'Transportation',
  'Supervised Visitation + Transportation',
];

const RATE_LABELS = {
  'Emergent Care': 'Emergent Care',
  'Respite Care': 'Respite Care',
  'Transportation': 'Transportation',
  'Supervised Visitation + Transportation': 'Visitation + Transport',
};

const getTypeColor = (type) => {
  if (!type) return '#6B7280';
  if (type.toLowerCase().includes('gov')) return '#8B5CF6';
  if (type.toLowerCase().includes('priv')) return '#EC4899';
  if (type.toLowerCase().includes('non')) return '#3B82F6';
  return '#2F6B4F';
};

const getRate = (rateList, name) => {
  if (!Array.isArray(rateList)) return '–';
  const item = rateList.find((r) => r.name === name);
  if (!item) return '–';
  const val = item.billingRate || item.rate;
  if (!val && val !== 0) return '–';
  return `$${parseFloat(val).toFixed(2)}`;
};

/* ─── Main Screen ──────────────────────────────────────────── */
export default function AgenciesScreen() {
  const router = useRouter();

  const [agencies, setAgencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [agencyTypes, setAgencyTypes] = useState(['All']);
  const [filterModalOpen, setFilterModalOpen] = useState(false);

  // Fetch agencies + agency types
  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [agenciesSnap, typesSnap] = await Promise.all([
          getDocs(collection(db, 'agencies')),
          getDocs(collection(db, 'AgencyTypes')).catch(() => ({ docs: [] })),
        ]);

        const list = agenciesSnap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort((a, b) => {
            const tA = a.createdAt?.toMillis?.() ?? new Date(a.createdAt || 0).getTime();
            const tB = b.createdAt?.toMillis?.() ?? new Date(b.createdAt || 0).getTime();
            return tB - tA;
          });

        setAgencies(list);

        const types = ['All', ...typesSnap.docs.map((d) => d.data().name).filter(Boolean)];
        setAgencyTypes(types);
      } catch (err) {
        console.error('Error fetching agencies:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  // Delete handler
  const handleDelete = (agencyId, agencyName) => {
    Alert.alert(
      'Delete Agency',
      `Are you sure you want to delete "${agencyName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'agencies', agencyId));
              setAgencies((prev) => prev.filter((a) => a.id !== agencyId));
              Alert.alert('Deleted', 'Agency deleted successfully.');
            } catch (err) {
              console.error('Delete error:', err);
              Alert.alert('Error', 'Failed to delete. Please try again.');
            }
          },
        },
      ]
    );
  };

  // Filter
  const filtered = agencies.filter((a) => {
    const srch = search.trim().toLowerCase();
    const matchSearch = !srch ||
      a.name?.toLowerCase().includes(srch) ||
      a.email?.toLowerCase().includes(srch);
    const matchType = filterType === 'All' || a.agencyType === filterType;
    return matchSearch && matchType;
  });

  if (loading) {
    return (
      <SafeAreaView style={[s.safe, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#2D5F3F" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* ── Header ── */}
      <View style={s.header}>
        <Pressable style={s.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color="#333" />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Manage Agency</Text>
          <Text style={s.headerSub}>
            Total: {agencies.length} | Showing: {filtered.length}
          </Text>
        </View>
        <Pressable
          style={s.addBtn}
          onPress={() => router.push('/admin/add-agency')}
        >
          <Feather name="plus" size={22} color="#fff" />
        </Pressable>
      </View>

      {/* ── Search + Filter ── */}
      <View style={s.searchRow}>
        <View style={s.searchBox}>
          <Feather name="search" size={16} color="#999" style={{ marginRight: 8 }} />
          <TextInput
            style={s.searchInput}
            placeholder="Search by name or email"
            placeholderTextColor="#999"
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')}>
              <Feather name="x" size={16} color="#999" />
            </Pressable>
          )}
        </View>
        <Pressable style={s.filterBtn} onPress={() => setFilterModalOpen(true)}>
          <Text style={s.filterBtnText}>{filterType}</Text>
          <Feather name="chevron-down" size={14} color="#2D5F3F" />
        </Pressable>
      </View>

      {/* ── Agency List ── */}
      <ScrollView contentContainerStyle={s.listContent} showsVerticalScrollIndicator={false}>
        {filtered.length === 0 ? (
          <View style={s.emptyState}>
            <Feather name="inbox" size={48} color="#ccc" />
            <Text style={s.emptyText}>No agencies found</Text>
          </View>
        ) : (
          filtered.map((agency) => (
            <AgencyCard
              key={agency.id}
              agency={agency}
              onDelete={() => handleDelete(agency.id, agency.name)}
              onEdit={() => router.push(`/admin/agency-details?id=${agency.id}`)}
            />
          ))
        )}
        <View style={{ height: 32 }} />
      </ScrollView>

      {/* ── Filter Modal ── */}
      <Modal visible={filterModalOpen} transparent animationType="slide" onRequestClose={() => setFilterModalOpen(false)}>
        <Pressable style={s.modalOverlay} onPress={() => setFilterModalOpen(false)}>
          <Pressable style={s.modalSheet} onPress={(e) => e.stopPropagation()}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Filter by Agency Type</Text>
              <Pressable onPress={() => setFilterModalOpen(false)} style={{ padding: 8 }}>
                <Feather name="x" size={22} color="#333" />
              </Pressable>
            </View>
            <FlatList
              data={agencyTypes}
              keyExtractor={(item) => item}
              renderItem={({ item }) => {
                const isActive = filterType === item;
                return (
                  <Pressable
                    style={[s.filterItem, isActive && s.filterItemActive]}
                    onPress={() => { setFilterType(item); setFilterModalOpen(false); }}
                  >
                    <Text style={[s.filterItemText, isActive && s.filterItemTextActive]}>{item}</Text>
                    {isActive && <Feather name="check" size={18} color="#2D5F3F" />}
                  </Pressable>
                );
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

/* ─── Agency Card ──────────────────────────────────────────── */
function AgencyCard({ agency, onDelete, onEdit }) {
  const [showRates, setShowRates] = useState(false);
  const typeColor = getTypeColor(agency.agencyType);

  const initials = (agency.name || '?')
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  return (
    <View style={s.card}>
      {/* Top: avatar + info + actions */}
      <View style={s.cardTop}>
        <View style={[s.avatar, { backgroundColor: typeColor + '22' }]}>
          {agency.avatar ? (
            // Image would go here if needed
            <Text style={[s.avatarText, { color: typeColor }]}>{initials}</Text>
          ) : (
            <Text style={[s.avatarText, { color: typeColor }]}>{initials}</Text>
          )}
        </View>

        <View style={{ flex: 1 }}>
          <Text style={s.agencyName} numberOfLines={2}>{agency.name || 'Unnamed Agency'}</Text>
          <View style={[s.typeBadge, { backgroundColor: typeColor + '18', borderColor: typeColor + '55' }]}>
            <Text style={[s.typeBadgeText, { color: typeColor }]}>{agency.agencyType || 'Unknown'}</Text>
          </View>
        </View>

        <View style={s.cardActions}>
          <Pressable style={s.actionBtn} onPress={onEdit}>
            <Feather name="edit-2" size={16} color="#666" />
          </Pressable>
          <Pressable style={[s.actionBtn, { marginTop: 4 }]} onPress={onDelete}>
            <Feather name="trash-2" size={16} color="#EF4444" />
          </Pressable>
        </View>
      </View>

      {/* Email */}
      {agency.email ? (
        <View style={s.emailRow}>
          <Feather name="mail" size={14} color="#7A7A7A" />
          <Text style={s.emailText} numberOfLines={1}>{agency.email}</Text>
        </View>
      ) : null}

      {/* Phone */}
      {agency.phone ? (
        <View style={s.emailRow}>
          <Feather name="phone" size={14} color="#7A7A7A" />
          <Text style={s.emailText}>{agency.phone}</Text>
        </View>
      ) : null}

      {/* Service Rates Toggle */}
      <Pressable style={s.ratesToggle} onPress={() => setShowRates((v) => !v)}>
        <Text style={s.ratesToggleText}>Service Rates</Text>
        <Feather name={showRates ? 'chevron-up' : 'chevron-down'} size={16} color="#2D5F3F" />
      </Pressable>

      {showRates && (
        <View style={s.ratesGrid}>
          {RATE_NAMES.map((name) => (
            <View key={name} style={[s.rateCell, name === 'Supervised Visitation + Transportation' && s.rateCellFull]}>
              <Text style={s.rateLabel}>{RATE_LABELS[name]}</Text>
              <Text style={s.rateValue}>{getRate(agency.rateList, name)}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

/* ─── Styles ───────────────────────────────────────────────── */
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F9F7F4' },

  /* Header */
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#F9F7F4', borderBottomWidth: 1, borderBottomColor: '#ECE8E3' },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4 },
  headerTitle: { fontSize: 19, fontWeight: '700', color: '#333' },
  headerSub: { fontSize: 12, color: '#888', marginTop: 2 },
  addBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#2D5F3F', justifyContent: 'center', alignItems: 'center', elevation: 4 },

  /* Search row */
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 12 },
  searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#E5E1DC', paddingHorizontal: 12, paddingVertical: 10 },
  searchInput: { flex: 1, fontSize: 14, color: '#333' },
  filterBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E1DC', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
  filterBtnText: { fontSize: 13, fontWeight: '600', color: '#333' },

  /* List */
  listContent: { paddingHorizontal: 16, paddingTop: 4 },

  /* Empty */
  emptyState: { alignItems: 'center', marginTop: 80 },
  emptyText: { fontSize: 16, color: '#bbb', marginTop: 12, fontWeight: '500' },

  /* Card */
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  avatar: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 16, fontWeight: '800' },
  agencyName: { fontSize: 15, fontWeight: '700', color: '#1a1a1a', marginBottom: 6, lineHeight: 20, paddingRight: 8 },
  typeBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20, borderWidth: 1 },
  typeBadgeText: { fontSize: 11, fontWeight: '700' },
  cardActions: { alignItems: 'center' },
  actionBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#F9F7F4', justifyContent: 'center', alignItems: 'center' },

  /* Email/Phone */
  emailRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  emailText: { fontSize: 13, color: '#555', flex: 1 },

  /* Rates */
  ratesToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 10, marginTop: 4, borderTopWidth: 1, borderTopColor: '#F0EDE8' },
  ratesToggleText: { fontSize: 13, fontWeight: '600', color: '#2D5F3F' },
  ratesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  rateCell: { width: '47%', backgroundColor: '#F9F7F4', borderRadius: 10, padding: 10 },
  rateCellFull: { width: '100%' },
  rateLabel: { fontSize: 11, color: '#7A7A7A', marginBottom: 4 },
  rateValue: { fontSize: 14, fontWeight: '700', color: '#2D5F3F' },

  /* Filter modal */
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '60%', paddingBottom: Platform.OS === 'ios' ? 34 : 16 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#F0EDE8' },
  modalTitle: { fontSize: 16, fontWeight: '700', color: '#1a1a1a' },
  filterItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F9F7F4' },
  filterItemActive: { backgroundColor: '#F0F9F5' },
  filterItemText: { fontSize: 14, color: '#333' },
  filterItemTextActive: { fontWeight: '700', color: '#2D5F3F' },
});
