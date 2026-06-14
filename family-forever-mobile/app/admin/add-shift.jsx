import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    Pressable,
    TextInput,
    StyleSheet,
    Platform,
    Switch,
    Modal,
    FlatList,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
    collection,
    getDocs,
    doc,
    setDoc,
    serverTimestamp,
    Timestamp,
    query,
    orderBy,
} from 'firebase/firestore';
import { db } from '../../src/firebase/config';
import ServiceDateCalendar from '../../src/components/ServiceDateCalendar';

const MON3 = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const _p2 = (n) => String(n).padStart(2, '0');
const fmtFlutter = (d) => `${_p2(d.getDate())} ${MON3[d.getMonth()]} ${d.getFullYear()}`;
const fmtDDMMYYYY = (d) => `${_p2(d.getDate())}-${_p2(d.getMonth() + 1)}-${d.getFullYear()}`;

// ── Category resolution (ported from web AddUserShift.resolveCategory) ──
const CAT_ALIAS = [
    { kw: ['supervised visitation + transportation', 'supervised + transportation'], name: 'Supervised Visitation' },
    { kw: ['supervised visitation', 'supervised'], name: 'Supervised Visitation' },
    { kw: ['transportation', 'transport'], name: 'Transportation' },
    { kw: ['respite care', 'respite'], name: 'Respite Care' },
    { kw: ['emergent care', 'emergent', 'emergency care', 'emergency'], name: 'Emergent Care' },
];

// categories = [{ value: id, label: name }]
const resolveCategoryName = (clientData, categories) => {
    if (!clientData) return '';
    const cands = [
        clientData.services?.serviceType, clientData.serviceType, clientData.services?.serviceRequired,
        clientData.category, clientData.typeName, clientData.shiftCategory, clientData.categoryName,
        clientData.serviceCategory, clientData.serviceRequired, clientData.service, clientData.shiftType, clientData.type,
    ].flat().filter(Boolean);

    for (const v of cands) {
        const str = String(v).trim();
        if (!str) continue;
        const byId = categories.find(c => c.value === str);
        if (byId) return byId.label;
        const byName = categories.find(c => c.label.toLowerCase() === str.toLowerCase());
        if (byName) return byName.label;
        const low = str.toLowerCase();
        for (const a of CAT_ALIAS) {
            if (a.kw.some(k => low.includes(k))) {
                const m = categories.find(c => c.label === a.name);
                if (m) return a.name;
            }
        }
    }
    // Structural heuristic: pickup/drop present → Transportation (or Supervised if visit)
    const sp = Array.isArray(clientData.shiftPoints) ? clientData.shiftPoints : [];
    const hasPickupDrop = sp.some(p => p.pickupLocation || p.dropLocation) || clientData.pickupLocation || clientData.dropLocation;
    const hasVisit = sp.some(p => p.visitLocation) || clientData.visitLocation;
    if (hasPickupDrop && hasVisit) { const m = categories.find(c => /supervised/i.test(c.label)); if (m) return m.label; }
    if (hasPickupDrop) { const m = categories.find(c => /transport/i.test(c.label)); if (m) return m.label; }
    return '';
};

const isTransportCat = (label) => /transport/i.test(label || '');
const isSupervisedCat = (label) => /supervised|visitation/i.test(label || '');
const isAddressCat = (label) => /emergent|emergency|respite/i.test(label || '');

/* ─────────────────────────────────────────────────────────── */
/*  Dropdown Sheet Component                                   */
/* ─────────────────────────────────────────────────────────── */
function DropdownSheet({ visible, title, items, selected, onSelect, onClose, labelKey = 'label', valueKey = 'value' }) {
    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <Pressable style={ds.overlay} onPress={onClose}>
                <Pressable style={ds.sheet} onPress={e => e.stopPropagation()}>
                    <View style={ds.sheetHeader}>
                        <Text style={ds.sheetTitle}>{title}</Text>
                        <Pressable onPress={onClose} style={{ padding: 8 }}>
                            <Feather name="x" size={22} color="#333" />
                        </Pressable>
                    </View>
                    <FlatList
                        data={items}
                        keyExtractor={(item, i) => item[valueKey]?.toString() ?? i.toString()}
                        renderItem={({ item }) => {
                            const isSelected = selected === item[valueKey];
                            return (
                                <Pressable
                                    style={[ds.item, isSelected && ds.itemActive]}
                                    onPress={() => { onSelect(item); onClose(); }}
                                >
                                    <Text style={[ds.itemText, isSelected && ds.itemTextActive]}>
                                        {item[labelKey]}
                                    </Text>
                                    {isSelected && <Feather name="check" size={18} color="#2D5F3F" />}
                                </Pressable>
                            );
                        }}
                    />
                </Pressable>
            </Pressable>
        </Modal>
    );
}

const ds = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
    sheet: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '70%', paddingBottom: Platform.OS === 'ios' ? 34 : 16 },
    sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#F0EDE8' },
    sheetTitle: { fontSize: 16, fontWeight: '700', color: '#1a1a1a' },
    item: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F9F7F4' },
    itemActive: { backgroundColor: '#F0F9F5' },
    itemText: { fontSize: 14, color: '#333' },
    itemTextActive: { fontWeight: '600', color: '#2D5F3F' },
});

/* ─────────────────────────────────────────────────────────── */
/*  Main Component                                             */
/* ─────────────────────────────────────────────────────────── */
export default function AddShiftScreen() {
    const router = useRouter();

    // ── Firebase data ──────────────────────────────────────────
    const [clients, setClients] = useState([]);
    const [staff, setStaff] = useState([]);
    const [shiftTypes, setShiftTypes] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loadingData, setLoadingData] = useState(true);

    // ── Form state ──────────────────────────────────────────────
    const [selectedShiftType, setSelectedShiftType] = useState(null);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [selectedClient, setSelectedClient] = useState(null);
    const [selectedUser, setSelectedUser] = useState(null);
    const [serviceDates, setServiceDates] = useState([new Date()]);
    const [showServiceCal, setShowServiceCal] = useState(false);
    // Transportation / Supervised → shift points; Emergent / Respite → single address
    const [shiftPoints, setShiftPoints] = useState([]);
    const [shiftAddress, setShiftAddress] = useState('');
    const [startTime, setStartTime] = useState(new Date());
    const [endTime, setEndTime] = useState(new Date());
    const [accessToReport, setAccessToReport] = useState(false);
    const [description, setDescription] = useState('');

    // ── Picker / dropdown visibility ────────────────────────────
    const [showPicker, setShowPicker] = useState({ visible: false, mode: 'date', field: '' });
    const [openSheet, setOpenSheet] = useState(null); // 'shiftType' | 'category' | 'client' | 'user'

    const [submitting, setSubmitting] = useState(false);

    // ── Fetch Firebase data on mount ────────────────────────────
    useEffect(() => {
        const fetchAll = async () => {
            try {
                // NOTE: no orderBy — Firestore orderBy silently drops docs missing the field
                // (many clients store "name", not "fullName"), which left the dropdown empty.
                const [clientsSnap, usersSnap, categoriesSnap, typesSnap] = await Promise.all([
                    getDocs(collection(db, 'clients')),
                    getDocs(collection(db, 'users')),
                    getDocs(collection(db, 'shiftCategories')),
                    getDocs(collection(db, 'shiftTypes')),
                ]);

                const clientList = clientsSnap.docs.map(d => {
                    const data = d.data();
                    const nm = data.fullName || data.name || 'Unnamed';
                    return {
                        value: d.id,
                        label: `${nm} (${data.clientCode || data.clientId || d.id.slice(0, 6)})`,
                        fullName: nm,
                        clientId: data.clientId || d.id.slice(0, 6),
                        serviceType: Array.isArray(data.services?.serviceType) ? data.services.serviceType : [],
                        initials: nm.substring(0, 2).toUpperCase(),
                        raw: data, // full client doc — for category + shift points derivation
                    };
                }).sort((a, b) => a.fullName.localeCompare(b.fullName));

                const userList = usersSnap.docs.map(d => {
                    const data = d.data();
                    const nm = data.name || data.fullName || 'Unknown';
                    return {
                        value: d.id,
                        label: nm, // staff dropdown shows the name only (no bracket)
                        name: nm,
                        cymId: data.cymId || data.employeeId || d.id.slice(0, 6),
                        initials: nm.substring(0, 2).toUpperCase(),
                    };
                }).sort((a, b) => a.name.localeCompare(b.name));

                const categoryList = categoriesSnap.docs
                    .map(d => ({ value: d.id, label: d.data().name || d.id }))
                    .filter(c => !['Supervised Visitation + Transportation', 'Shadow Shift', 'Administration'].includes(c.label));

                // shiftTypes: fallback to hardcoded if collection is empty
                const typesList = typesSnap.docs.length > 0
                    ? typesSnap.docs.map(d => ({ value: d.id, label: d.data().name || d.id }))
                    : [
                        { value: 'Regular', label: 'Regular' },
                        { value: 'Overtime', label: 'Overtime' },
                        { value: 'Emergency', label: 'Emergency' },
                    ];

                setClients(clientList);
                setStaff(userList);
                setCategories(categoryList);
                setShiftTypes(typesList);
            } catch (err) {
                console.error('Error loading shift form data:', err);
            } finally {
                setLoadingData(false);
            }
        };

        fetchAll();
    }, []);

    // ── Date/time picker ────────────────────────────────────────
    const handleDateChange = (event, selectedDate) => {
        setShowPicker(p => ({ ...p, visible: Platform.OS === 'ios' }));
        if (selectedDate && event.type !== 'dismissed') {
            const field = showPicker.field;
            if (field === 'startTime') setStartTime(selectedDate);
            else if (field === 'endTime') setEndTime(selectedDate);
        }
    };

    const openPicker = (mode, field) => setShowPicker({ visible: true, mode, field });

    const formatDate = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const formatTime = (t) => t.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const pad2 = (n) => String(n).padStart(2, '0');
    const toTimeStr = (d) => `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;

    // ── Submit ──────────────────────────────────────────────────
    // Selecting a client auto-fills category + shift points / address (web behaviour)
    const handleSelectClient = (client) => {
        setSelectedClient(client);
        const data = client?.raw || {};

        // 1. Resolve + set shift category
        const catName = resolveCategoryName(data, categories);
        const catObj = catName ? categories.find(c => c.label === catName) : null;
        if (catObj) setSelectedCategory(catObj);

        // 2. Derive shift points (pickup/drop) from the client's stored shiftPoints
        const sp = Array.isArray(data.shiftPoints) ? data.shiftPoints : [];
        const points = sp
            .filter(p => p.name || p.pickupLocation || p.dropLocation)
            .map(p => ({
                name: p.name || '',
                cyimId: p.cyimId || '',
                pickupLocation: p.pickupLocation || '',
                dropLocation: p.dropLocation || '',
                pickupTime: p.pickupTime || '',
                dropTime: p.dropTime || '',
            }));
        // Single-client transport with direct fields (no shiftPoints array)
        if (points.length === 0 && (data.pickupLocation || data.dropLocation)) {
            points.push({
                name: client.fullName, cyimId: data.cyimId || '',
                pickupLocation: data.pickupLocation || '', dropLocation: data.dropLocation || '',
                pickupTime: data.pickupTime || '', dropTime: data.dropTime || '',
            });
        }
        setShiftPoints(points);

        // 3. Address (for emergent/respite)
        setShiftAddress(data.address || '');
    };

    const updatePoint = (i, field, value) =>
        setShiftPoints(prev => prev.map((p, idx) => idx === i ? { ...p, [field]: value } : p));
    const swapPoint = (i) =>
        setShiftPoints(prev => prev.map((p, idx) => idx === i ? { ...p, pickupLocation: p.dropLocation, dropLocation: p.pickupLocation } : p));

    const handleSubmit = async () => {
        if (!selectedClient) { Alert.alert('Missing', 'Please select a client.'); return; }
        if (!selectedUser) { Alert.alert('Missing', 'Please select a staff member.'); return; }
        if (!selectedCategory) { Alert.alert('Missing', 'Please select a shift category.'); return; }
        if (!serviceDates.length) { Alert.alert('Missing', 'Please select at least one service date.'); return; }

        setSubmitting(true);
        try {
            const isOvernight = toTimeStr(endTime) < toTimeStr(startTime);

            // One shift per selected service date (web app behaviour)
            const sorted = [...serviceDates].sort((a, b) => a - b);
            for (let i = 0; i < sorted.length; i++) {
                const sDate = sorted[i];
                const endDateObj = new Date(sDate);
                if (isOvernight) endDateObj.setDate(endDateObj.getDate() + 1);
                const newShiftId = `${Date.now()}_${i}_${Math.random().toString(36).slice(2, 6)}`;

                await setDoc(doc(db, 'shifts', newShiftId), {
                    clientId: selectedClient.value,
                    clientName: selectedClient.fullName,
                    clientDetails: selectedClient,
                    name: selectedUser.name,
                    userId: selectedUser.value,
                    userName: selectedUser.name,
                    categoryName: selectedCategory.label,
                    shiftCategory: selectedCategory.label,
                    typeName: selectedShiftType?.label || 'Regular',
                    shiftType: selectedShiftType?.label || 'Regular',
                    startDate: fmtFlutter(sDate),
                    endDate: fmtFlutter(endDateObj),
                    dateKey: fmtDDMMYYYY(sDate),
                    timeStampId: sDate.getTime(),
                    startTime: toTimeStr(startTime),
                    endTime: toTimeStr(endTime),
                    accessToShiftReport: accessToReport,
                    description: description,
                    clockIn: "",
                    clockOut: "",
                    shiftConfirmed: false,
                    isRatify: false,
                    isCancelled: false,
                    shiftReport: "",
                    shiftPoints: shiftPoints,
                    shiftAddress: isAddressCat(selectedCategory?.label) ? shiftAddress : '',
                    createdAt: new Date(),
                    id: newShiftId,
                });
            }

            Alert.alert('✅ Success', `${sorted.length} shift${sorted.length !== 1 ? 's' : ''} added successfully.`, [
                { text: 'OK', onPress: () => router.back() }
            ]);
        } catch (err) {
            console.error('Error adding shift:', err);
            Alert.alert('Error', 'Failed to add shift. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };


    // helper: the current time field being picked
    const pickerDate = showPicker.field === 'startTime' ? startTime : endTime;

    return (
        <SafeAreaView style={s.container} edges={['top']}>
            {/* Header */}
            <View style={s.header}>
                <Pressable onPress={() => router.back()} style={s.backBtn}>
                    <Feather name="arrow-left" size={24} color="#333" />
                </Pressable>
                <Text style={s.headerTitle}>Add User Shift</Text>
            </View>

            <ScrollView contentContainerStyle={s.scrollContent} keyboardShouldPersistTaps="handled">

                {/* ── Assignment Preview Card ── */}
                <View style={s.card}>
                    <View style={s.assignRow}>
                        {/* Client side */}
                        <View style={s.assignCol}>
                            <View style={[s.avatarLg, { backgroundColor: '#4ECDC4' }]}>
                                <Text style={s.avaLgText}>
                                    {selectedClient ? selectedClient.initials : '?'}
                                </Text>
                            </View>
                            <Text style={s.assignName} numberOfLines={2}>
                                {selectedClient ? selectedClient.fullName : 'Select Client'}
                            </Text>
                            {selectedClient && (
                                <Text style={s.assignId}>Client ID: {selectedClient.clientId}</Text>
                            )}
                            {selectedCategory && (
                                <View style={[s.badge, { backgroundColor: '#4ECDC4' }]}>
                                    <Text style={s.badgeText} numberOfLines={1}>{selectedCategory.label}</Text>
                                </View>
                            )}
                        </View>

                        <Feather name="arrow-right" size={24} color="#666" style={{ marginHorizontal: 12 }} />

                        {/* Staff side */}
                        <View style={s.assignCol}>
                            <View style={[s.avatarLg, { backgroundColor: '#9D4EDD' }]}>
                                <Text style={s.avaLgText}>
                                    {selectedUser ? selectedUser.initials : '?'}
                                </Text>
                            </View>
                            <Text style={s.assignName} numberOfLines={2}>
                                {selectedUser ? selectedUser.name : 'Select Staff'}
                            </Text>
                            {selectedUser && (
                                <Text style={s.assignId}>CYM ID: {selectedUser.cymId}</Text>
                            )}
                            {selectedShiftType && (
                                <View style={[s.badge, { backgroundColor: '#9D4EDD' }]}>
                                    <Text style={s.badgeText}>{selectedShiftType.label}</Text>
                                </View>
                            )}
                        </View>
                    </View>
                </View>

                {/* ── Form Fields ── */}
                <View style={s.card}>
                    {/* Shift Type */}
                    <View style={s.inputContainer}>
                        <Text style={s.label}>Shift Type</Text>
                        <Pressable style={s.inputBox} onPress={() => setOpenSheet('shiftType')}>
                            <Text style={[s.inputText, !selectedShiftType && s.placeholder]}>
                                {selectedShiftType?.label ?? (loadingData ? 'Loading…' : 'Select shift type')}
                            </Text>
                            <Feather name="chevron-down" size={20} color="#666" />
                        </Pressable>
                    </View>

                    {/* Shift Category */}
                    <View style={s.inputContainer}>
                        <Text style={s.label}>Select Shift Category</Text>
                        <Pressable style={s.inputBox} onPress={() => setOpenSheet('category')}>
                            <Text style={[s.inputText, !selectedCategory && s.placeholder]}>
                                {selectedCategory?.label ?? (loadingData ? 'Loading…' : 'Select shift category')}
                            </Text>
                            <Feather name="chevron-down" size={20} color="#666" />
                        </Pressable>
                    </View>

                    {/* Client */}
                    <View style={s.inputContainer}>
                        <Text style={s.label}>Select Client</Text>
                        <Pressable style={s.inputBox} onPress={() => setOpenSheet('client')}>
                            <Text style={[s.inputText, !selectedClient && s.placeholder]} numberOfLines={1}>
                                {selectedClient?.label ?? (loadingData ? 'Loading…' : 'Search and select a client')}
                            </Text>
                            <Feather name="chevron-down" size={20} color="#666" />
                        </Pressable>
                    </View>

                    {/* Staff */}
                    <View style={s.inputContainer}>
                        <Text style={s.label}>Select User</Text>
                        <Pressable style={s.inputBox} onPress={() => setOpenSheet('user')}>
                            <Text style={[s.inputText, !selectedUser && s.placeholder]} numberOfLines={1}>
                                {selectedUser?.label ?? (loadingData ? 'Loading…' : 'Search and select a staff member')}
                            </Text>
                            <Feather name="chevron-down" size={20} color="#666" />
                        </Pressable>
                    </View>

                    {/* Service Date(s) — pick one or multiple */}
                    <View style={s.inputContainer}>
                        <Text style={s.label}>Service Date</Text>
                        <Pressable style={s.inputBox} onPress={() => setShowServiceCal(true)}>
                            <Text style={s.inputText} numberOfLines={1}>
                                {serviceDates.length === 0 ? 'Select date(s)'
                                    : serviceDates.length === 1 ? formatDate(serviceDates[0])
                                        : `${serviceDates.length} dates selected`}
                            </Text>
                            <Feather name="calendar" size={16} color="#666" />
                        </Pressable>
                    </View>

                    {/* Times */}
                    <View style={s.row}>
                        <View style={[s.inputContainer, { flex: 1, marginRight: 8 }]}>
                            <Text style={s.label}>Start Time</Text>
                            <Pressable style={s.inputBox} onPress={() => openPicker('time', 'startTime')}>
                                <Text style={s.inputText}>{formatTime(startTime)}</Text>
                                <Feather name="clock" size={16} color="#666" />
                            </Pressable>
                        </View>
                        <View style={[s.inputContainer, { flex: 1, marginLeft: 8 }]}>
                            <Text style={s.label}>End Time</Text>
                            <Pressable style={s.inputBox} onPress={() => openPicker('time', 'endTime')}>
                                <Text style={s.inputText}>{formatTime(endTime)}</Text>
                                <Feather name="clock" size={16} color="#666" />
                            </Pressable>
                        </View>
                    </View>

                    {/* Shift Address — Emergent / Respite Care */}
                    {isAddressCat(selectedCategory?.label) && (
                        <View style={s.inputContainer}>
                            <Text style={s.label}>Shift Address</Text>
                            <TextInput
                                style={[s.inputBox, s.textArea]}
                                placeholder="Enter the address where the shift will take place"
                                placeholderTextColor="#999"
                                multiline
                                value={shiftAddress}
                                onChangeText={setShiftAddress}
                            />
                        </View>
                    )}

                    {/* Shift Points — Transportation / Supervised Visitation */}
                    {(isTransportCat(selectedCategory?.label) || isSupervisedCat(selectedCategory?.label)) && (
                        <View style={{ marginBottom: 6 }}>
                            <Text style={[s.label, { fontSize: 15, fontWeight: '700', marginBottom: 10 }]}>Shift Points</Text>
                            {shiftPoints.length === 0 && (
                                <Text style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 10 }}>
                                    No pickup/drop points found for this client.
                                </Text>
                            )}
                            {shiftPoints.map((p, i) => (
                                <View key={i} style={sp.card}>
                                    <View style={sp.head}>
                                        <View style={sp.avatar}><Text style={sp.avatarText}>{(p.name || String.fromCharCode(65 + i)).charAt(0).toUpperCase()}</Text></View>
                                        <Text style={sp.name}>{p.name || `Member ${i + 1}`}</Text>
                                    </View>

                                    <Text style={sp.fieldLabel}>Pickup Location</Text>
                                    <TextInput style={sp.input} placeholder="Pickup address" placeholderTextColor="#9CA3AF" value={p.pickupLocation} onChangeText={(t) => updatePoint(i, 'pickupLocation', t)} />

                                    <Pressable style={sp.swapBtn} onPress={() => swapPoint(i)}>
                                        <Feather name="repeat" size={14} color="#1d4ed8" />
                                        <Text style={sp.swapText}>Swap pickup & drop</Text>
                                    </Pressable>

                                    <Text style={sp.fieldLabel}>Drop Location</Text>
                                    <TextInput style={sp.input} placeholder="Drop address" placeholderTextColor="#9CA3AF" value={p.dropLocation} onChangeText={(t) => updatePoint(i, 'dropLocation', t)} />

                                    <View style={sp.row}>
                                        <View style={{ flex: 1, marginRight: 6 }}>
                                            <Text style={sp.fieldLabel}>Pickup Time</Text>
                                            <TextInput style={sp.input} placeholder="e.g. 09:00 AM" placeholderTextColor="#9CA3AF" value={p.pickupTime} onChangeText={(t) => updatePoint(i, 'pickupTime', t)} />
                                        </View>
                                        <View style={{ flex: 1, marginLeft: 6 }}>
                                            <Text style={sp.fieldLabel}>Drop Time</Text>
                                            <TextInput style={sp.input} placeholder="e.g. 05:00 PM" placeholderTextColor="#9CA3AF" value={p.dropTime} onChangeText={(t) => updatePoint(i, 'dropTime', t)} />
                                        </View>
                                    </View>
                                </View>
                            ))}
                        </View>
                    )}

                    {/* Access Toggle */}
                    <View style={s.toggleContainer}>
                        <View>
                            <Text style={s.toggleTitle}>Access to Shift Report</Text>
                            <Text style={s.toggleSub}>{accessToReport ? 'Yes' : 'No'}</Text>
                        </View>
                        <Switch
                            trackColor={{ false: '#D1D5DB', true: '#2D5F3F' }}
                            thumbColor="#fff"
                            ios_backgroundColor="#D1D5DB"
                            onValueChange={setAccessToReport}
                            value={accessToReport}
                        />
                    </View>

                    {/* Description */}
                    <View style={s.inputContainer}>
                        <Text style={s.label}>Description of shift</Text>
                        <TextInput
                            style={[s.inputBox, s.textArea]}
                            placeholder="Enter shift description"
                            placeholderTextColor="#999"
                            multiline
                            numberOfLines={4}
                            value={description}
                            onChangeText={setDescription}
                        />
                    </View>
                </View>

                <View style={{ height: 100 }} />
            </ScrollView>

            {/* Submit Footer */}
            <View style={s.footer}>
                <Pressable
                    style={[s.submitBtn, submitting && { opacity: 0.7 }]}
                    onPress={handleSubmit}
                    disabled={submitting}
                >
                    {submitting
                        ? <ActivityIndicator color="#fff" />
                        : <Text style={s.submitText}>Add Shift</Text>
                    }
                </Pressable>
            </View>

            {/* Date / Time Picker */}
            {showPicker.visible && (
                <DateTimePicker
                    value={pickerDate}
                    mode={showPicker.mode}
                    display="default"
                    onChange={handleDateChange}
                />
            )}

            <ServiceDateCalendar
                visible={showServiceCal}
                onClose={() => setShowServiceCal(false)}
                mode="multi"
                selectedDates={serviceDates}
                onChange={setServiceDates}
                title="Select Service Date(s)"
            />

            {/* ── Dropdown Sheets ── */}
            <DropdownSheet
                visible={openSheet === 'shiftType'}
                title="Select Shift Type"
                items={shiftTypes}
                selected={selectedShiftType?.value}
                onSelect={setSelectedShiftType}
                onClose={() => setOpenSheet(null)}
            />
            <DropdownSheet
                visible={openSheet === 'category'}
                title="Select Shift Category"
                items={categories}
                selected={selectedCategory?.value}
                onSelect={setSelectedCategory}
                onClose={() => setOpenSheet(null)}
            />
            <DropdownSheet
                visible={openSheet === 'client'}
                title="Select Client"
                items={clients}
                selected={selectedClient?.value}
                onSelect={handleSelectClient}
                onClose={() => setOpenSheet(null)}
            />
            <DropdownSheet
                visible={openSheet === 'user'}
                title="Select Staff Member"
                items={staff}
                selected={selectedUser?.value}
                onSelect={setSelectedUser}
                onClose={() => setOpenSheet(null)}
            />
        </SafeAreaView>
    );
}

/* ─────────────────────────────────────────────────────────── */
/*  Styles                                                     */
/* ─────────────────────────────────────────────────────────── */
const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9F7F4' },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 16, backgroundColor: '#F9F7F4', borderBottomWidth: 1, borderBottomColor: '#ECE8E3' },
    backBtn: { padding: 4, marginRight: 12 },
    headerTitle: { fontSize: 20, fontWeight: '700', color: '#333' },

    scrollContent: { padding: 16 },

    card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 },

    assignRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
    assignCol: { flex: 1, alignItems: 'center' },
    avatarLg: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
    avaLgText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    assignName: { fontSize: 14, fontWeight: '600', color: '#333', textAlign: 'center' },
    assignId: { fontSize: 12, color: '#666', marginTop: 2, marginBottom: 6, textAlign: 'center' },
    badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12, maxWidth: '90%' },
    badgeText: { color: '#fff', fontSize: 10, fontWeight: '600' },

    row: { flexDirection: 'row', justifyContent: 'space-between' },
    inputContainer: { marginBottom: 16 },
    label: { fontSize: 14, fontWeight: '500', color: '#333', marginBottom: 8 },
    inputBox: { backgroundColor: '#F5F5F5', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    inputText: { fontSize: 14, color: '#333', flex: 1, marginRight: 4 },
    placeholder: { color: '#999' },
    textArea: { height: 100, textAlignVertical: 'top' },

    toggleContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F5F5F5', padding: 12, borderRadius: 8, marginBottom: 16 },
    toggleTitle: { fontSize: 14, fontWeight: '500', color: '#333' },
    toggleSub: { fontSize: 12, color: '#666', marginTop: 2 },

    footer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', padding: 16, borderTopWidth: 1, borderTopColor: '#ECE8E3', paddingBottom: Platform.OS === 'ios' ? 34 : 16 },
    submitBtn: { backgroundColor: '#2D5F3F', paddingVertical: 16, borderRadius: 8, alignItems: 'center' },
    submitText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});

const sp = StyleSheet.create({
    card: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#EEF0F2', borderRadius: 12, padding: 14, marginBottom: 12 },
    head: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
    avatar: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#1d4ed8', alignItems: 'center', justifyContent: 'center' },
    avatarText: { color: '#fff', fontWeight: '700', fontSize: 12 },
    name: { fontSize: 14, fontWeight: '700', color: '#1a1a1a' },
    fieldLabel: { fontSize: 11, fontWeight: '600', color: '#6B7280', textTransform: 'uppercase', marginBottom: 6, marginTop: 4 },
    input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#333', marginBottom: 6 },
    row: { flexDirection: 'row' },
    swapBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingVertical: 4, marginBottom: 4 },
    swapText: { color: '#1d4ed8', fontSize: 12, fontWeight: '700' },
});
