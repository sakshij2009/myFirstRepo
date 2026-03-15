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
    const [startDate, setStartDate] = useState(new Date());
    const [endDate, setEndDate] = useState(new Date());
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
                const [clientsSnap, usersSnap, categoriesSnap, typesSnap] = await Promise.all([
                    getDocs(query(collection(db, 'clients'), orderBy('fullName'))).catch(() => getDocs(collection(db, 'clients'))),
                    getDocs(query(collection(db, 'users'), orderBy('name'))).catch(() => getDocs(collection(db, 'users'))),
                    getDocs(collection(db, 'shiftCategories')),
                    getDocs(collection(db, 'shiftTypes')),
                ]);

                const clientList = clientsSnap.docs.map(d => {
                    const data = d.data();
                    return {
                        value: d.id,
                        label: `${data.fullName || data.name || 'Unnamed'} (${data.clientId || data.id || d.id.slice(0, 6)})`,
                        fullName: data.fullName || data.name || 'Unnamed',
                        clientId: data.clientId || d.id.slice(0, 6),
                        initials: (data.fullName || data.name || 'UN').substring(0, 2).toUpperCase(),
                    };
                });

                const userList = usersSnap.docs.map(d => {
                    const data = d.data();
                    return {
                        value: d.id,
                        label: `${data.name || data.fullName || 'Unknown'} (${data.cymId || data.employeeId || d.id.slice(0, 6)})`,
                        name: data.name || data.fullName || 'Unknown',
                        cymId: data.cymId || data.employeeId || d.id.slice(0, 6),
                        initials: (data.name || data.fullName || 'UN').substring(0, 2).toUpperCase(),
                    };
                });

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
            if (field === 'startDate') setStartDate(selectedDate);
            else if (field === 'endDate') setEndDate(selectedDate);
            else if (field === 'startTime') setStartTime(selectedDate);
            else if (field === 'endTime') setEndTime(selectedDate);
        }
    };

    const openPicker = (mode, field) => setShowPicker({ visible: true, mode, field });

    const formatDate = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const formatTime = (t) => t.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const pad2 = (n) => String(n).padStart(2, '0');
    const toTimeStr = (d) => `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;

    // ── Submit ──────────────────────────────────────────────────
    const handleSubmit = async () => {
        if (!selectedClient) { Alert.alert('Missing', 'Please select a client.'); return; }
        if (!selectedUser) { Alert.alert('Missing', 'Please select a staff member.'); return; }
        if (!selectedCategory) { Alert.alert('Missing', 'Please select a shift category.'); return; }

        setSubmitting(true);
        try {
            const newShiftId = Date.now().toString();

            // Sync Overnight Logic
            const isOvernight = toTimeStr(endTime) < toTimeStr(startTime);
            let endDateObj = new Date(startDate);
            if (isOvernight) endDateObj.setDate(endDateObj.getDate() + 1);

            const payload = {
                clientId: selectedClient.value,
                clientName: selectedClient.fullName,
                clientDetails: selectedClient, // From web
                name: selectedUser.name,
                userId: selectedUser.value,
                userName: selectedUser.name, // From web
                categoryName: selectedCategory.label,
                shiftCategory: selectedCategory.label,
                typeName: selectedShiftType?.label || 'Regular',
                shiftType: selectedShiftType?.label || 'Regular',
                startDate: startDate, // Web uses Timestamp.fromDate or Javascript Date, let's keep JS Date as it converts fine
                endDate: endDateObj,
                startTime: toTimeStr(startTime),
                endTime: toTimeStr(endTime),
                accessToShiftReport: accessToReport,
                description: description,
                clockIn: "",
                clockOut: "",
                shiftConfirmed: false,
                isRatify: false,
                isCancelled: false, // from web
                shiftReport: "", // from web
                shiftPoints: [], // Important for sync
                createdAt: new Date(),
                id: newShiftId,
            };

            await setDoc(doc(db, 'shifts', newShiftId), payload);
            Alert.alert('✅ Success', 'Shift added successfully.', [
                { text: 'OK', onPress: () => router.back() }
            ]);
        } catch (err) {
            console.error('Error adding shift:', err);
            Alert.alert('Error', 'Failed to add shift. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };


    // helper: the current date field being picked
    const pickerDate =
        showPicker.field === 'startDate' ? startDate :
            showPicker.field === 'endDate' ? endDate :
                showPicker.field === 'startTime' ? startTime :
                    endTime;

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

                    {/* Dates */}
                    <View style={s.row}>
                        <View style={[s.inputContainer, { flex: 1, marginRight: 8 }]}>
                            <Text style={s.label}>Start Date</Text>
                            <Pressable style={s.inputBox} onPress={() => openPicker('date', 'startDate')}>
                                <Text style={s.inputText}>{formatDate(startDate)}</Text>
                                <Feather name="calendar" size={16} color="#666" />
                            </Pressable>
                        </View>
                        <View style={[s.inputContainer, { flex: 1, marginLeft: 8 }]}>
                            <Text style={s.label}>End Date</Text>
                            <Pressable style={s.inputBox} onPress={() => openPicker('date', 'endDate')}>
                                <Text style={s.inputText}>{formatDate(endDate)}</Text>
                                <Feather name="calendar" size={16} color="#666" />
                            </Pressable>
                        </View>
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
                onSelect={setSelectedClient}
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
