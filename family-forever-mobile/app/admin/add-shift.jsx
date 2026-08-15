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
import { calculateRouteDistance } from '../../src/utils/mapboxHelper';

const OFFICE_ADDRESS = '10110 124 St NW, Edmonton, AB T5N 1P6, Canada';

// Scheduled km for one shift point (office → pickup → drop → office), all rounded.
// Returns the individual legs so the user app can show office→pickup + drop→office.
const computePointKm = async (p) => {
    if (!p?.pickupLocation || !p?.dropLocation) return {};
    try {
        const [o2p, d2o, p2d] = await Promise.all([
            calculateRouteDistance([OFFICE_ADDRESS, p.pickupLocation]),
            calculateRouteDistance([p.dropLocation, OFFICE_ADDRESS]),
            calculateRouteDistance([p.pickupLocation, p.dropLocation]),
        ]);
        const officeToPickupKm = o2p?.km || 0;   // helper already Math.rounds km
        const dropToOfficeKm = d2o?.km || 0;
        const routeKm = p2d?.km || 0;            // scheduled pickup→drop
        return { officeToPickupKm, dropToOfficeKm, scheduledRouteKm: routeKm, totalKilometers: officeToPickupKm + routeKm + dropToOfficeKm };
    } catch (e) {
        console.warn('computePointKm error', e);
        return {};
    }
};

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
function DropdownSheet({ visible, title, items, selected, onSelect, onClose, labelKey = 'label', valueKey = 'value', searchable = false, renderBadge }) {
    const [search, setSearch] = useState('');
    useEffect(() => { if (!visible) setSearch(''); }, [visible]);
    const q = search.trim().toLowerCase();
    const filtered = q ? items.filter(it => String(it[labelKey] || '').toLowerCase().includes(q)) : items;

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
                    {searchable && (
                        <View style={ds.searchWrap}>
                            <Feather name="search" size={18} color="#9CA3AF" />
                            <TextInput
                                style={ds.searchInput}
                                placeholder="Type a name to search..."
                                placeholderTextColor="#9CA3AF"
                                value={search}
                                onChangeText={setSearch}
                                autoCorrect={false}
                                autoCapitalize="none"
                            />
                            {!!search && <Pressable onPress={() => setSearch('')}><Feather name="x-circle" size={16} color="#9CA3AF" /></Pressable>}
                        </View>
                    )}
                    <FlatList
                        data={filtered}
                        keyboardShouldPersistTaps="handled"
                        keyExtractor={(item, i) => item[valueKey]?.toString() ?? i.toString()}
                        ListEmptyComponent={<Text style={ds.empty}>No matches</Text>}
                        renderItem={({ item }) => {
                            const isSelected = selected === item[valueKey];
                            const badge = renderBadge ? renderBadge(item) : null;
                            return (
                                <Pressable
                                    style={[ds.item, isSelected && ds.itemActive]}
                                    onPress={() => { onSelect(item); onClose(); }}
                                >
                                    <Text style={[ds.itemText, isSelected && ds.itemTextActive, { flex: 1 }]} numberOfLines={1}>
                                        {item[labelKey]}
                                    </Text>
                                    {badge}
                                    {isSelected && <Feather name="check" size={18} color="#2D5F3F" style={{ marginLeft: 8 }} />}
                                </Pressable>
                            );
                        }}
                    />
                </Pressable>
            </Pressable>
        </Modal>
    );
}

function AvailabilityBadge({ avail }) {
    if (!avail) return null;
    if (avail.hasConflict) return <View style={[ds.badge, { backgroundColor: '#FEF2F2' }]}><Text style={[ds.badgeText, { color: '#EF4444' }]}>Conflict</Text></View>;
    if (avail.count > 0) return <View style={[ds.badge, { backgroundColor: '#FFFBEB' }]}><Text style={[ds.badgeText, { color: '#D97706' }]}>{avail.count} assigned</Text></View>;
    return <View style={[ds.badge, { backgroundColor: '#F0FDF4' }]}><Text style={[ds.badgeText, { color: '#16A34A' }]}>Available</Text></View>;
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
    searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginTop: 12, paddingHorizontal: 12, height: 44, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, backgroundColor: '#F9FAFB' },
    searchInput: { flex: 1, fontSize: 14, color: '#333' },
    empty: { textAlign: 'center', color: '#9CA3AF', padding: 24 },
    badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    badgeText: { fontSize: 11, fontWeight: '700' },
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
    const [allShifts, setAllShifts] = useState([]);
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
    // Return trip (transportation): swapped pickup/drop, own times, optional different driver
    const [returnTrip, setReturnTrip] = useState(false);
    const [returnStartTime, setReturnStartTime] = useState('');
    const [returnEndTime, setReturnEndTime] = useState('');
    const [returnShiftPoints, setReturnShiftPoints] = useState([]);
    const [returnDriverId, setReturnDriverId] = useState(''); // '' = same as main staff
    // Scheduled km (office→pickup→drop→office), auto-calculated via map
    const [scheduledKm, setScheduledKm] = useState(0);
    const [kmCalculating, setKmCalculating] = useState(false);
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
                const [clientsSnap, usersSnap, categoriesSnap, typesSnap, shiftsSnap] = await Promise.all([
                    getDocs(collection(db, 'clients')),
                    getDocs(collection(db, 'users')),
                    getDocs(collection(db, 'shiftCategories')),
                    getDocs(collection(db, 'shiftTypes')),
                    getDocs(collection(db, 'shifts')),
                ]);
                setAllShifts(shiftsSnap.docs.map(d => ({ id: d.id, ...d.data() })));

                const clientList = clientsSnap.docs.map(d => {
                    const data = d.data();
                    const nm = data.fullName || data.name || 'Unnamed';
                    return {
                        value: d.id,
                        label: nm, // name only — no bracket/id
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
    const formatTime = (t) => t.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    const pad2 = (n) => String(n).padStart(2, '0');
    const toTimeStr = (d) => `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;

    // ── Submit ──────────────────────────────────────────────────
    // Staff availability across the selected service dates (ported from web)
    const getAvailability = (userId) => {
        if (!serviceDates.length) return null;
        let count = 0, hasConflict = false;
        const st = toTimeStr(startTime), et = toTimeStr(endTime);
        for (const d of serviceDates) {
            const dateISO = d.toISOString().split('T')[0];
            const dayShifts = allShifts.filter(s => {
                const isUser = s.primaryUserId === userId || s.userId === userId || s.secondaryUserDocId === userId;
                if (!isUser) return false;
                let iso = s.dateKey_iso;
                if (!iso && s.dateKey) { const p = s.dateKey.split('-'); if (p.length === 3) iso = `${p[2]}-${p[1]}-${p[0]}`; }
                if (!iso && typeof s.timeStampId === 'number') iso = new Date(s.timeStampId).toISOString().split('T')[0];
                return iso === dateISO;
            });
            count += dayShifts.length;
            if (st && et) dayShifts.forEach(s => { if (s.startTime && s.endTime && s.startTime < et && st < s.endTime) hasConflict = true; });
        }
        return { count, hasConflict };
    };

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
        recomputeScheduledKm(points);

        // 3. Address (for emergent/respite)
        setShiftAddress(data.address || '');

        // 4. Auto-fill shift description from the client's intake (web behaviour)
        const intakeDesc = data.description || data.jobDescription || data.services?.serviceDesc || '';
        if (intakeDesc) setDescription(intakeDesc);
    };

    // Scheduled km = sum of office→pickup→drop→office across all points (via map)
    const recomputeScheduledKm = async (points) => {
        const list = points || shiftPoints;
        const valid = list.filter(p => p.pickupLocation && p.dropLocation);
        if (!valid.length) { setScheduledKm(0); return; }
        setKmCalculating(true);
        try {
            const results = await Promise.all(valid.map(p => computePointKm(p)));
            setScheduledKm(results.reduce((s, r) => s + (r.totalKilometers || 0), 0));
        } catch (e) {
            console.warn('scheduled km error', e);
        } finally {
            setKmCalculating(false);
        }
    };

    const updatePoint = (i, field, value) =>
        setShiftPoints(prev => prev.map((p, idx) => idx === i ? { ...p, [field]: value } : p));
    const swapPoint = (i) =>
        setShiftPoints(prev => prev.map((p, idx) => idx === i ? { ...p, pickupLocation: p.dropLocation, dropLocation: p.pickupLocation } : p));

    // ── Return trip ──────────────────────────────────────────────
    const enableReturnTrip = () => {
        setReturnTrip(true);
        // Start from the main points with pickup/drop swapped
        setReturnShiftPoints(shiftPoints.map(p => ({ ...p, pickupLocation: p.dropLocation, dropLocation: p.pickupLocation })));
    };
    const disableReturnTrip = () => {
        setReturnTrip(false); setReturnShiftPoints([]); setReturnStartTime(''); setReturnEndTime(''); setReturnDriverId('');
    };
    const updateReturnPoint = (i, field, value) =>
        setReturnShiftPoints(prev => prev.map((p, idx) => idx === i ? { ...p, [field]: value } : p));
    const swapReturnPoint = (i) =>
        setReturnShiftPoints(prev => prev.map((p, idx) => idx === i ? { ...p, pickupLocation: p.dropLocation, dropLocation: p.pickupLocation } : p));

    const handleSubmit = async () => {
        if (!selectedClient) { Alert.alert('Missing', 'Please select a client.'); return; }
        if (!selectedUser) { Alert.alert('Missing', 'Please select a staff member.'); return; }
        if (!selectedCategory) { Alert.alert('Missing', 'Please select a shift category.'); return; }
        if (!serviceDates.length) { Alert.alert('Missing', 'Please select at least one service date.'); return; }

        setSubmitting(true);
        try {
            const isOvernight = toTimeStr(endTime) < toTimeStr(startTime);
            const wantReturn = returnTrip && returnShiftPoints.length > 0 && returnStartTime && returnEndTime;
            const returnStaff = returnDriverId ? (staff.find(u => u.value === returnDriverId) || selectedUser) : selectedUser;

            // Scheduled km via Mapbox (office→pickup→drop→office) — computed once, stored on each point
            const enrichedPoints = await Promise.all(shiftPoints.map(async p => ({ ...p, ...(await computePointKm(p)) })));
            const enrichedReturnPoints = wantReturn
                ? await Promise.all(returnShiftPoints.map(async p => ({ ...p, ...(await computePointKm(p)) })))
                : [];

            // One shift per selected service date (web app behaviour)
            const sorted = [...serviceDates].sort((a, b) => a - b);
            for (let i = 0; i < sorted.length; i++) {
                const sDate = sorted[i];
                const endDateObj = new Date(sDate);
                if (isOvernight) endDateObj.setDate(endDateObj.getDate() + 1);
                const newShiftId = `${Date.now()}_${i}_${Math.random().toString(36).slice(2, 6)}`;
                const batchId = newShiftId; // links the outgoing + return trip for this date

                const baseShift = {
                    clientId: selectedClient.value,
                    clientName: selectedClient.fullName,
                    clientDetails: selectedClient,
                    categoryName: selectedCategory.label,
                    shiftCategory: selectedCategory.label,
                    typeName: selectedShiftType?.label || 'Regular',
                    shiftType: selectedShiftType?.label || 'Regular',
                    dateKey: fmtDDMMYYYY(sDate),
                    timeStampId: sDate.getTime(),
                    accessToShiftReport: accessToReport,
                    description: description,
                    clockIn: "",
                    clockOut: "",
                    shiftConfirmed: false,
                    isRatify: false,
                    isCancelled: false,
                    shiftReport: "",
                    shiftAddress: isAddressCat(selectedCategory?.label) ? shiftAddress : '',
                    totalScheduledKm: scheduledKm,
                    createdAt: new Date(),
                    batchId,
                };

                // Outgoing shift
                await setDoc(doc(db, 'shifts', newShiftId), {
                    ...baseShift,
                    name: selectedUser.name,
                    userId: selectedUser.value,
                    userName: selectedUser.name,
                    startDate: fmtFlutter(sDate),
                    endDate: fmtFlutter(endDateObj),
                    startTime: toTimeStr(startTime),
                    endTime: toTimeStr(endTime),
                    shiftPoints: enrichedPoints,
                    officeToPickupKm: enrichedPoints[0]?.officeToPickupKm || 0,
                    dropToOfficeKm: enrichedPoints[0]?.dropToOfficeKm || 0,
                    isReturnTrip: false,
                    id: newShiftId,
                });

                // Return trip shift (swapped points, own times, possibly different driver)
                if (wantReturn) {
                    const retOvernight = returnEndTime < returnStartTime;
                    const retEnd = new Date(sDate);
                    if (retOvernight) retEnd.setDate(retEnd.getDate() + 1);
                    const retId = `${newShiftId}_ret`;
                    await setDoc(doc(db, 'shifts', retId), {
                        ...baseShift,
                        name: returnStaff.name,
                        userId: returnStaff.value,
                        userName: returnStaff.name,
                        startDate: fmtFlutter(sDate),
                        endDate: fmtFlutter(retEnd),
                        startTime: returnStartTime,
                        endTime: returnEndTime,
                        shiftPoints: enrichedReturnPoints,
                        officeToPickupKm: enrichedReturnPoints[0]?.officeToPickupKm || 0,
                        dropToOfficeKm: enrichedReturnPoints[0]?.dropToOfficeKm || 0,
                        isReturnTrip: true,
                        id: retId,
                    });
                }
            }

            const total = sorted.length * (wantReturn ? 2 : 1);
            Alert.alert('✅ Success', `${total} shift${total !== 1 ? 's' : ''} added successfully.`, [
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

                            {/* Scheduled Kilometers (office → pickup → drop → office) */}
                            {shiftPoints.length > 0 && (
                                <View style={km.box}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={km.label}>Scheduled Kilometers</Text>
                                        <Text style={km.sub}>Office → Pickup → Drop → Office (via map)</Text>
                                    </View>
                                    {kmCalculating
                                        ? <ActivityIndicator color="#145228" />
                                        : <Text style={km.value}>{scheduledKm} km</Text>}
                                    <Pressable style={km.recalc} onPress={() => recomputeScheduledKm()}>
                                        <Feather name="refresh-cw" size={16} color="#145228" />
                                    </Pressable>
                                </View>
                            )}
                        </View>
                    )}

                    {/* Return Trip — Transportation / Supervised with points */}
                    {(isTransportCat(selectedCategory?.label) || isSupervisedCat(selectedCategory?.label)) && shiftPoints.length > 0 && (
                        <>
                            {!returnTrip ? (
                                <Pressable style={rt.addBtn} onPress={enableReturnTrip}>
                                    <Feather name="corner-down-left" size={16} color="#1d4ed8" />
                                    <Text style={rt.addText}>Add Return Trip</Text>
                                </Pressable>
                            ) : (
                                <View style={rt.section}>
                                    <View style={rt.header}>
                                        <Text style={rt.title}>↩ Return Trip</Text>
                                        <Pressable onPress={disableReturnTrip}><Text style={rt.remove}>Remove</Text></Pressable>
                                    </View>
                                    <Text style={rt.note}>Pickup & drop are swapped · set the return times</Text>

                                    <View style={sp.row}>
                                        <View style={{ flex: 1, marginRight: 6 }}>
                                            <Text style={sp.fieldLabel}>Return Start Time</Text>
                                            <TextInput style={sp.input} placeholder="e.g. 02:00 PM" placeholderTextColor="#9CA3AF" value={returnStartTime} onChangeText={setReturnStartTime} />
                                        </View>
                                        <View style={{ flex: 1, marginLeft: 6 }}>
                                            <Text style={sp.fieldLabel}>Return End Time</Text>
                                            <TextInput style={sp.input} placeholder="e.g. 03:00 PM" placeholderTextColor="#9CA3AF" value={returnEndTime} onChangeText={setReturnEndTime} />
                                        </View>
                                    </View>

                                    {/* Return driver */}
                                    <Text style={sp.fieldLabel}>Return Trip Driver</Text>
                                    <View style={rt.driverRow}>
                                        <Text style={rt.driverName}>
                                            {(returnDriverId ? (staff.find(u => u.value === returnDriverId)?.name) : selectedUser?.name) || 'Same as main shift'}
                                            {!returnDriverId ? ' (same as main)' : ''}
                                        </Text>
                                        <Pressable style={rt.changeBtn} onPress={() => setOpenSheet('returnDriver')}>
                                            <Text style={rt.changeText}>Change Driver</Text>
                                        </Pressable>
                                    </View>
                                    {!!returnDriverId && (
                                        <Pressable onPress={() => setReturnDriverId('')}><Text style={rt.resetDriver}>Reset to same driver</Text></Pressable>
                                    )}

                                    {/* Return points */}
                                    {returnShiftPoints.map((p, i) => (
                                        <View key={i} style={[sp.card, { backgroundColor: '#eef4ff', borderColor: '#dbeafe', marginTop: 10 }]}>
                                            <View style={sp.head}>
                                                <View style={sp.avatar}><Text style={sp.avatarText}>{(p.name || String.fromCharCode(65 + i)).charAt(0).toUpperCase()}</Text></View>
                                                <Text style={sp.name}>{p.name || `Member ${i + 1}`}</Text>
                                            </View>
                                            <Text style={sp.fieldLabel}>Pickup Location</Text>
                                            <TextInput style={sp.input} placeholder="Pickup address" placeholderTextColor="#9CA3AF" value={p.pickupLocation} onChangeText={(t) => updateReturnPoint(i, 'pickupLocation', t)} />
                                            <Pressable style={sp.swapBtn} onPress={() => swapReturnPoint(i)}>
                                                <Feather name="repeat" size={14} color="#1d4ed8" />
                                                <Text style={sp.swapText}>Swap pickup & drop</Text>
                                            </Pressable>
                                            <Text style={sp.fieldLabel}>Drop Location</Text>
                                            <TextInput style={sp.input} placeholder="Drop address" placeholderTextColor="#9CA3AF" value={p.dropLocation} onChangeText={(t) => updateReturnPoint(i, 'dropLocation', t)} />
                                        </View>
                                    ))}
                                </View>
                            )}
                        </>
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

            {/* Time picker — Android shows the native dialog; iOS uses a bottom sheet */}
            {showPicker.visible && Platform.OS === 'android' && (
                <DateTimePicker value={pickerDate} mode={showPicker.mode} display="default" onChange={handleDateChange} />
            )}
            {Platform.OS === 'ios' && (
                <Modal visible={showPicker.visible} transparent animationType="slide"
                    onRequestClose={() => setShowPicker(p => ({ ...p, visible: false }))}>
                    <Pressable style={tp.overlay} onPress={() => setShowPicker(p => ({ ...p, visible: false }))} />
                    <View style={tp.sheet}>
                        <View style={tp.header}>
                            <Text style={tp.title}>{showPicker.field === 'startTime' ? 'Start Time' : 'End Time'}</Text>
                            <Pressable onPress={() => setShowPicker(p => ({ ...p, visible: false }))}>
                                <Text style={tp.done}>Done</Text>
                            </Pressable>
                        </View>
                        <DateTimePicker value={pickerDate} mode={showPicker.mode} display="spinner"
                            onChange={handleDateChange} textColor="#111827" style={{ height: 216, width: '100%' }} />
                    </View>
                </Modal>
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
                searchable
            />
            <DropdownSheet
                visible={openSheet === 'user'}
                title="Select Staff Member"
                items={staff}
                selected={selectedUser?.value}
                onSelect={setSelectedUser}
                onClose={() => setOpenSheet(null)}
                searchable
                renderBadge={(u) => <AvailabilityBadge avail={getAvailability(u.value)} />}
            />
            <DropdownSheet
                visible={openSheet === 'returnDriver'}
                title="Return Trip Driver"
                items={staff}
                selected={returnDriverId}
                onSelect={(u) => setReturnDriverId(u.value)}
                onClose={() => setOpenSheet(null)}
                searchable
                renderBadge={(u) => <AvailabilityBadge avail={getAvailability(u.value)} />}
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

const rt = StyleSheet.create({
    addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1.5, borderColor: '#1d4ed8', borderRadius: 10, paddingVertical: 12, marginBottom: 14, backgroundColor: '#eef4ff' },
    addText: { color: '#1d4ed8', fontSize: 14, fontWeight: '700' },
    section: { borderWidth: 1, borderColor: '#bfdbfe', borderRadius: 12, padding: 14, marginBottom: 14, backgroundColor: '#f8faff' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    title: { fontSize: 15, fontWeight: '700', color: '#1d4ed8' },
    remove: { color: '#ef4444', fontSize: 13, fontWeight: '700' },
    note: { fontSize: 12, color: '#60a5fa', marginTop: 2, marginBottom: 10 },
    driverRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 4 },
    driverName: { flex: 1, fontSize: 13, fontWeight: '600', color: '#1a1a1a' },
    changeBtn: { borderWidth: 1, borderColor: '#93c5fd', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
    changeText: { color: '#1d4ed8', fontSize: 12, fontWeight: '700' },
    resetDriver: { color: '#6b7280', fontSize: 12, fontWeight: '600', marginTop: 6 },
});

const tp = StyleSheet.create({
    overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.35)' },
    sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 30 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F0EDE8' },
    title: { fontSize: 16, fontWeight: '700', color: '#1a1a1a' },
    done: { fontSize: 16, fontWeight: '700', color: '#2D5F3F' },
});

const km = StyleSheet.create({
    box: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#bbf7d0', borderRadius: 12, padding: 14, marginTop: 4 },
    label: { fontSize: 14, fontWeight: '700', color: '#145228' },
    sub: { fontSize: 11, color: '#6b7280', marginTop: 2 },
    value: { fontSize: 18, fontWeight: '800', color: '#145228' },
    recalc: { padding: 6 },
});
