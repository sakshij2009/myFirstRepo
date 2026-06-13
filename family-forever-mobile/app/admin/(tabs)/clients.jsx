import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, TextInput, ScrollView, Pressable, StyleSheet, Switch, ActivityIndicator, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { collection, doc, getDocs, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../../src/firebase/config';

export default function ClientsScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [clients, setClients] = useState([]);
  const [servicesMap, setServicesMap] = useState({});
  const [loading, setLoading] = useState(true);

  // Filters State
  const [genderFilter, setGenderFilter] = useState('All');
  const [agencyFilter, setAgencyFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('Active');

  // Dropdown UI state (Modal instead of inline)
  const [activeDropdown, setActiveDropdown] = useState(null); // 'Gender', 'Agency', 'Status' or null

  // Agency Options
  const [agencyOptions, setAgencyOptions] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch Clients
      const clientsSnap = await getDocs(collection(db, "clients"));
      const clientsList = clientsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

      // Fetch Agency Types
      const agencySnap = await getDocs(collection(db, "AgencyTypes"));
      setAgencyOptions(agencySnap.docs.map(doc => doc.data().name));

      // Fetch Services mapping via IntakeForms
      const intakeSnap = await getDocs(collection(db, "InTakeForms"));
      const intakeForms = intakeSnap.docs.map(doc => doc.data());
      const services = {};

      for (const client of clientsList) {
        const matchedIntake = intakeForms.find(form =>
          form.inTakeClients?.some(c => c.name?.trim() === client.name?.trim())
        );
        if (matchedIntake) {
          const clientData = matchedIntake.inTakeClients.find(c => c.name?.trim() === client.name?.trim());
          const service = Array.isArray(clientData?.serviceRequired)
            ? clientData.serviceRequired.join(", ")
            : clientData?.serviceRequired;
          services[client.name?.trim()] = service || "Unknown";
        } else {
          services[client.name?.trim()] = "Unknown";
        }
      }

      setServicesMap(services);
      setClients(clientsList);
    } catch (e) {
      console.error("Error fetching clients data", e);
      Alert.alert("Error", "Failed to load clients");
    } finally {
      setLoading(false);
    }
  };

  const getServiceColor = (serviceName) => {
    if (!serviceName) return '#9CA3AF';
    const low = serviceName.toLowerCase();
    if (low.includes('emergent') || low.includes('emergency')) return '#FF4D6D'; // Pink/Red
    if (low.includes('visitation')) return '#FF9F1C'; // Orange
    if (low.includes('respite')) return '#4ECDC4'; // Cyan
    if (low.includes('transportation')) return '#8B5CF6'; // Purple
    return '#3B82F6'; // Blue default
  };

  const handleDeleteClient = (clientId) => {
    Alert.alert("Delete Client", "Are you sure you want to delete this client? This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteDoc(doc(db, "clients", clientId));
            setClients(prev => prev.filter(c => c.id !== clientId));
          } catch (e) {
            Alert.alert("Error", "Failed to delete client");
          }
        }
      }
    ]);
  };

  const handleToggleFileClosure = async (clientId, newValue) => {
    setClients(prev => prev.map(c => c.id === clientId ? { ...c, fileClosed: newValue } : c));
    try {
      await updateDoc(doc(db, "clients", clientId), { fileClosed: newValue });
    } catch (e) {
      Alert.alert("Error", "Failed to update file closure status");
      // Revert optimism if failed
      setClients(prev => prev.map(c => c.id === clientId ? { ...c, fileClosed: !newValue } : c));
    }
  };

  // Memoized filter logic
  const filteredClients = useMemo(() => {
    return clients.filter(client => {
      // Safely handle arrays or undefined for gender
      let cGender = client.gender;
      if (Array.isArray(cGender)) cGender = cGender[0];
      const matchGender = genderFilter === 'All' || (cGender || '').toLowerCase() === genderFilter.toLowerCase();

      const matchAgency = agencyFilter === 'All' || (client.agencyName || '').toLowerCase() === agencyFilter.toLowerCase();

      let matchStatus = false;
      if (statusFilter === 'All') matchStatus = true;
      else if (statusFilter === 'Active') matchStatus = client.clientStatus === 'Active';
      else if (statusFilter === 'Inactive') matchStatus = client.clientStatus === 'Inactive';
      else if (statusFilter === 'Closed') matchStatus = client.fileClosed === true;

      const searchLow = searchQuery.toLowerCase();
      const matchSearch = !searchQuery ||
        (client.name || '').toLowerCase().includes(searchLow) ||
        (client.clientCode || '').toString().toLowerCase().includes(searchLow);

      return matchGender && matchAgency && matchStatus && matchSearch;
    });
  }, [clients, genderFilter, agencyFilter, statusFilter, searchQuery]);

  const renderDropdownModal = () => {
    if (!activeDropdown) return null;

    let options = [];
    let title = '';
    let setter = null;

    if (activeDropdown === 'Gender') {
      options = ['All', 'Male', 'Female'];
      title = 'Select Gender';
      setter = setGenderFilter;
    } else if (activeDropdown === 'Agency') {
      options = ['All', ...agencyOptions];
      title = 'Select Agency';
      setter = setAgencyFilter;
    } else if (activeDropdown === 'Status') {
      options = ['All', 'Active', 'Inactive', 'Closed'];
      title = 'Select Status';
      setter = setStatusFilter;
    }

    return (
      <Modal visible={!!activeDropdown} transparent animationType="fade">
        <Pressable style={s.modalOverlay} onPress={() => setActiveDropdown(null)}>
          <View style={s.modalContent}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>{title}</Text>
              <Pressable onPress={() => setActiveDropdown(null)}>
                <Feather name="x" size={20} color="#666" />
              </Pressable>
            </View>
            <ScrollView style={{ maxHeight: 300 }}>
              {options.map(opt => (
                <Pressable
                  key={opt}
                  style={s.modalItem}
                  onPress={() => {
                    setter(opt);
                    setActiveDropdown(null);
                  }}
                >
                  <Text style={s.modalItemText}>{opt}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    );
  };

  return (
    <SafeAreaView style={s.container} edges={["top"]}>
      {/* Header */}
      <View style={s.headerContainer}>
        <View style={s.headerTopRow}>
          <View>
            <Text style={s.headerTitle}>Manage Clients</Text>
            <Text style={s.headerSubtitle}>Total Client: {clients.length} | Showing Client: {filteredClients.length}</Text>
          </View>
          <Pressable style={s.addBtn} onPress={() => router.push('/admin/add-client')}>
            <Feather name="plus" size={24} color="#fff" />
          </Pressable>
        </View>

        {/* Search Bar */}
        <View style={s.searchContainer}>
          <Feather name="search" size={20} color="#9CA3AF" style={s.searchIcon} />
          <TextInput
            style={s.searchInput}
            placeholder="Search with Name or Client ID..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Filter Chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterScroll}>
          {/* Gender Filter */}
          <FilterChip label={`Gender: ${genderFilter}`} onPress={() => setActiveDropdown('Gender')} />

          {/* Agency Filter */}
          <FilterChip label={`Agency: ${agencyFilter}`} onPress={() => setActiveDropdown('Agency')} />

          {/* Status Filter */}
          <FilterChip label={`Client Status: ${statusFilter}`} onPress={() => setActiveDropdown('Status')} />
        </ScrollView>
      </View>

      {/* Client List */}
      {loading ? (
        <View style={s.center}><ActivityIndicator size="large" color="#2D5F3F" /></View>
      ) : (
        <ScrollView contentContainerStyle={s.listContainer} showsVerticalScrollIndicator={false}>
          {filteredClients.map((client) => {
            const initials = client.name ? client.name.substring(0, 2).toUpperCase() : '??';
            const serviceStr = servicesMap[client.name?.trim()] || 'Unknown';
            const sColor = getServiceColor(serviceStr);
            const statusColor = client.clientStatus === 'Active' ? '#10B981' : '#9CA3AF';

            return (
              <View key={client.id} style={s.card}>
                {/* Edit / Delete Icons */}
                <View style={s.cardActionsRow}>
                  <Pressable style={s.iconBtn} onPress={() => router.push(`/admin/edit-client?id=${client.id}`)}>
                    <Feather name="edit-2" size={16} color="#666" />
                  </Pressable>
                  <Pressable style={[s.iconBtn, { backgroundColor: '#FEF2F2' }]} onPress={() => handleDeleteClient(client.id)}>
                    <Feather name="trash-2" size={16} color="#EF4444" />
                  </Pressable>
                </View>

                {/* Client Info */}
                <View style={s.clientInfoRow}>
                  <View style={[s.avatar, { backgroundColor: sColor }]}>
                    <Text style={s.avatarText}>{initials}</Text>
                  </View>
                  <View style={s.nameContainer}>
                    <Text style={s.clientName}>{client.name || 'Unnamed Client'}</Text>
                    <Text style={s.clientCode}>{client.clientCode || 'NO CODE'}</Text>
                  </View>
                </View>

                {/* Badges */}
                <View style={s.badgesRow}>
                  <View style={[s.badge, { backgroundColor: sColor }]}><Text style={s.badgeText}>{serviceStr}</Text></View>
                  <View style={[s.badge, { backgroundColor: statusColor }]}><Text style={s.badgeText}>{client.clientStatus || 'Unknown'}</Text></View>
                  <View style={[s.badge, { backgroundColor: '#3B82F6' }]}><Text style={s.badgeText}>{client.agencyName || 'No Agency'}</Text></View>
                </View>

                {/* Email Box */}
                <View style={s.emailBox}>
                  <Text style={s.emailLabel}>Parent Email:</Text>
                  <Text style={s.emailValue}>{client.email || 'N/A'}</Text>
                </View>

                {/* File Closure */}
                <View style={s.ClosureBox}>
                  <View>
                    <Text style={s.closureTitle}>File Closure</Text>
                    <Text style={s.closureSub}>{client.fileClosed ? 'Yes' : 'No'}</Text>
                  </View>
                  <Switch
                    value={client.fileClosed || false}
                    onValueChange={(val) => handleToggleFileClosure(client.id, val)}
                    trackColor={{ false: '#d1d5db', true: '#2D8C0C' }}
                    thumbColor="#fff"
                  />
                </View>

                {/* Intake Form Button */}
                <Pressable style={s.intakeBtn} onPress={() => router.push(`/admin/intake-form-view?clientName=${encodeURIComponent(client.name || '')}`)}>
                  <Text style={s.intakeBtnText}>View Intake Form</Text>
                </Pressable>
              </View>
            );
          })}
          {filteredClients.length === 0 && !loading && (
            <View style={s.center}><Text style={{ color: '#666', marginTop: 40 }}>No clients found matching criteria.</Text></View>
          )}
          <View style={{ height: 60 }} />
        </ScrollView>
      )}

      {/* Render Dropdown Modal */}
      {renderDropdownModal()}
    </SafeAreaView>
  );
}

function FilterChip({ label, onPress }) {
  return (
    <Pressable style={s.chip} onPress={onPress}>
      <Text style={s.chipText}>{label}</Text>
      <Feather name="chevron-down" size={16} color="#2D5F3F" />
    </Pressable>
  );
}

/* ------------ STYLES ------------ */
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9F7F4' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  headerContainer: { backgroundColor: '#F9F7F4', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8, zIndex: 10 },
  headerTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#333' },
  headerSubtitle: { fontSize: 13, color: '#666', marginTop: 4 },
  addBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#2D5F3F', justifyContent: 'center', alignItems: 'center', elevation: 3, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },

  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9F7F4', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, paddingHorizontal: 12, height: 48, marginBottom: 16 },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 14, color: '#333' },

  filterScroll: { gap: 8, paddingBottom: 8, overflow: 'visible' },
  chip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, gap: 6 },
  chipText: { fontSize: 13, fontWeight: '600', color: '#333' },

  dropdownMenu: { position: 'absolute', top: 48, left: 0, backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB', minWidth: 140, elevation: 5, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5 },
  dropdownItem: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  dropdownItemText: { fontSize: 14, color: '#333' },

  listContainer: { padding: 16, paddingTop: 8, gap: 16 },
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#F3F4F6', elevation: 2, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },

  cardActionsRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginBottom: -10, zIndex: 2 },
  iconBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },

  clientInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16, paddingRight: 80 },
  avatar: { width: 60, height: 60, borderRadius: 16, justifyContent: 'center', alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  avatarText: { fontSize: 20, fontWeight: '700', color: '#fff' },
  nameContainer: { flex: 1, justifyContent: 'center' },
  clientName: { fontSize: 18, fontWeight: '700', color: '#1a1a1a', marginBottom: 4 },
  clientCode: { fontSize: 13, fontWeight: '600', color: '#9CA3AF' },

  badgesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  badge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: '700', color: '#fff' },

  emailBox: { backgroundColor: '#F9FAFB', padding: 12, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: '#F3F4F6' },
  emailLabel: { fontSize: 12, fontWeight: '600', color: '#6B7280', marginBottom: 4 },
  emailValue: { fontSize: 14, fontWeight: '600', color: '#111827' },

  ClosureBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F9FAFB', padding: 14, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: '#F3F4F6' },
  closureTitle: { fontSize: 14, fontWeight: '600', color: '#111827', marginBottom: 2 },
  closureSub: { fontSize: 12, fontWeight: '600', color: '#9CA3AF' },

  intakeBtn: { width: '100%', paddingVertical: 14, borderWidth: 2, borderColor: '#2D5F3F', borderRadius: 12, alignItems: 'center' },
  intakeBtnText: { color: '#2D5F3F', fontSize: 14, fontWeight: '700' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', elevation: 5, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', backgroundColor: '#F9F7F4' },
  modalTitle: { fontSize: 16, fontWeight: '700', color: '#333' },
  modalItem: { paddingVertical: 16, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  modalItemText: { fontSize: 15, color: '#333', fontWeight: '500' }
});
