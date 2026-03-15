import React, { useState, useEffect } from 'react';
import {
    View, Text, ScrollView, Pressable, TextInput, StyleSheet,
    Platform, Switch, Modal, FlatList, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
    collection, getDocs, doc, getDoc, updateDoc,
    query, orderBy, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../src/firebase/config';

/* ─── Dropdown Sheet ─────────────────────────────────────── */
function DropdownSheet({ visible, title, items, selected, onSelect, onClose }) {
    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <Pressable style={ds.overlay} onPress={onClose}>
                <Pressable style={ds.sheet} onPress={(e) => e.stopPropagation()}>
                    <View style={ds.header}>
                        <Text style={ds.title}>{title}</Text>
                        <Pressable onPress={onClose} style={{ padding: 8 }}>
                            <Feather name="x" size={22} color="#333" />
                        </Pressable>
                    </View>
                    <FlatList
                        data={items}
                        keyExtractor={(item) => item.value?.toString() ?? item.label}
                        renderItem={({ item }) => {
                            const isSelected = selected === item.value;
                            return (
                                <Pressable style={[ds.item, isSelected && ds.itemActive]}
                                    onPress={() => { onSelect(item); onClose(); }}>
                                    <Text style={[ds.itemText, isSelected && ds.itemTextActive]}>{item.label}</Text>
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
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#F0EDE8' },
    title: { fontSize: 16, fontWeight: '700', color: '#1a1a1a' },
    item: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F9F7F4' },
    itemActive: { backgroundColor: '#F0F9F5' },
    itemText: { fontSize: 14, color: '#333' },
    itemTextActive: { fontWeight: '700', color: '#2D5F3F' },
});

/* ─── Helpers ────────────────────────────────────────────── */
const formatDate = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
const formatTime = (t) => t.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
const pad2 = (n) => String(n).padStart(2, '0');
const toHHMM = (d) => `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;

const parseTimeStr = (str) => {
    // Parse "HH:MM" or "H:MM AM/PM" into a Date
    if (!str) return new Date();
    const d = new Date();
    if (str.includes(':')) {
        const parts = str.split(':');
        d.setHours(parseInt(parts[0], 10) || 0, parseInt(parts[1], 10) || 0, 0, 0);
    }
    return d;
};

/* ─── Main Screen ────────────────────────────────────────── */
export default function EditShiftScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams();

    const [loadingShift, setLoadingShift] = useState(true);
    const [saving, setSaving] = useState(false);

    // Dropdown data
    const [clients, setClients] = useState([]);
    const [staff, setStaff] = useState([]);
    const [categories, setCategories] = useState([]);
    const [shiftTypes, setShiftTypes] = useState([
        { value: 'Regular', label: 'Regular' },
        { value: 'Overtime', label: 'Overtime' },
        { value: 'Emergency', label: 'Emergency' },
    ]);

    // Form state
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

    // Picker state
    const [showPicker, setShowPicker] = useState({ visible: false, mode: 'date', field: '' });
    const [openSheet, setOpenSheet] = useState(null);

    // ── Load shift data ──────────────────────────────────────
    useEffect(() => {
        const loadAll = async () => {
            try {
                const [shiftSnap, clientsSnap, usersSnap, categoriesSnap] = await Promise.all([
                    getDoc(doc(db, 'shifts', id)),
                    getDocs(collection(db, 'clients')).catch(() => ({ docs: [] })),
                    getDocs(collection(db, 'users')).catch(() => ({ docs: [] })),
                    getDocs(collection(db, 'shiftCategories')).catch(() => ({ docs: [] })),
                ]);

                // Build dropdown lists
                const clientList = clientsSnap.docs.map((d) => {
                    const data = d.data();
                    return {
                        value: d.id,
                        label: `${data.fullName || data.name || 'Unnamed'} (${data.clientId || d.id.slice(0, 6)})`,
                        fullName: data.fullName || data.name || 'Unnamed',
                        clientId: data.clientId || d.id.slice(0, 6),
                        initials: (data.fullName || data.name || 'UN').substring(0, 2).toUpperCase(),
                    };
                });
                const userList = usersSnap.docs.map((d) => {
                    const data = d.data();
                    return {
                        value: d.id,
                        label: `${data.name || data.fullName || 'Unknown'} (${data.cymId || d.id.slice(0, 6)})`,
                        name: data.name || data.fullName || 'Unknown',
                        cymId: data.cymId || d.id.slice(0, 6),
                        initials: (data.name || data.fullName || 'UN').substring(0, 2).toUpperCase(),
                    };
                });
                const categoryList = categoriesSnap.docs.map((d) => ({ value: d.id, label: d.data().name || d.id }));

                setClients(clientList);
                setStaff(userList);
                setCategories(categoryList);

                // Pre-fill form from shift data
                if (shiftSnap.exists()) {
                    const data = shiftSnap.data();

                    const clientMatch = clientList.find((c) => c.value === data.clientId) || null;
                    const userMatch = userList.find((u) => u.value === data.userId) || null;
                    const catMatch = categoryList.find((c) => c.label === (data.shiftCategory || data.categoryName)) || null;
                    const typeMatch = shiftTypes.find((t) => t.label === (data.shiftType || data.typeName)) || null;

                    setSelectedClient(clientMatch || (data.clientId ? { value: data.clientId, label: data.clientName || data.clientId, fullName: data.clientName || 'Unknown', clientId: data.clientId, initials: (data.clientName || 'UN').substring(0, 2).toUpperCase() } : null));
                    setSelectedUser(userMatch || (data.userId ? { value: data.userId, label: data.name || data.userId, name: data.name || 'Unknown', cymId: data.userId, initials: (data.name || 'UN').substring(0, 2).toUpperCase() } : null));
                    setSelectedCategory(catMatch || (data.shiftCategory ? { value: data.shiftCategory, label: data.shiftCategory } : null));
                    setSelectedShiftType(typeMatch || (data.shiftType ? { value: data.shiftType, label: data.shiftType } : null));

                    const sDate = data.startDate?.toDate ? data.startDate.toDate() : new Date(data.startDate || Date.now());
                    const eDate = data.endDate?.toDate ? data.endDate.toDate() : new Date(data.endDate || Date.now());
                    setStartDate(sDate);
                    setEndDate(eDate);
                    setStartTime(parseTimeStr(data.startTime));
                    setEndTime(parseTimeStr(data.endTime));
                    setAccessToReport(!!data.accessToShiftReport);
                    setDescription(data.description || '');
                }
            } catch (err) {
                console.error('Error loading shift:', err);
            } finally {
                setLoadingShift(false);
            }
        };
        if (id) loadAll();
        else setLoadingShift(false);
    }, [id]);

    // ── Date picker handler ──────────────────────────────────
    const handleDateChange = (event, selectedDate) => {
        setShowPicker((p) => ({ ...p, visible: Platform.OS === 'ios' }));
        if (selectedDate && event.type !== 'dismissed') {
            const field = showPicker.field;
            if (field === 'startDate') setStartDate(selectedDate);
            else if (field === 'endDate') setEndDate(selectedDate);
            else if (field === 'startTime') setStartTime(selectedDate);
            else setEndTime(selectedDate);
        }
    };

    const pickerDate =
        showPicker.field === 'startDate' ? startDate :
            showPicker.field === 'endDate' ? endDate :
                showPicker.field === 'startTime' ? startTime : endTime;

    // ── Save changes ─────────────────────────────────────────
    const handleSave = async () => {
        if (!selectedClient) { Alert.alert('Missing', 'Please select a client.'); return; }
        if (!selectedUser) { Alert.alert('Missing', 'Please select a staff member.'); return; }

        setSaving(true);
        try {
            // Sync Overnight Logic
            const isOvernight = toHHMM(endTime) < toHHMM(startTime);
            let endDateObj = new Date(startDate);
            if (isOvernight) endDateObj.setDate(endDateObj.getDate() + 1);

            await updateDoc(doc(db, 'shifts', id), {
                clientId: selectedClient.value,
                clientName: selectedClient.fullName,
                clientDetails: selectedClient, // from web
                name: selectedUser.name,
                userId: selectedUser.value,
                userName: selectedUser.name, // from web
                categoryName: selectedCategory?.label || '',
                shiftCategory: selectedCategory?.label || '',
                typeName: selectedShiftType?.label || 'Regular',
                shiftType: selectedShiftType?.label || 'Regular',
                startDate: startDate,
                endDate: endDateObj,
                startTime: toHHMM(startTime),
                endTime: toHHMM(endTime),
                accessToShiftReport: accessToReport,
                description: description,
                updatedAt: serverTimestamp(),
                dateKey: startDate.toISOString().split("T")[0],
            });
            Alert.alert('✅ Updated', 'Shift updated successfully.', [
                { text: 'OK', onPress: () => router.back() },
            ]);
        } catch (err) {
            console.error('Update error:', err);
            Alert.alert('Error', 'Failed to update shift. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    if (loadingShift) {
        return (
            <SafeAreaView style={[s.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color="#2D5F3F" />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={s.container} edges={['top']}>
            {/* Header */}
            <View style={s.header}>
                <Pressable onPress={() => router.back()} style={s.backBtn}>
                    <Feather name="arrow-left" size={24} color="#333" />
                </Pressable>
                <Text style={s.headerTitle}>Edit Shift</Text>
                <Pressable style={[s.saveHeaderBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
                    {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.saveHeaderText}>Save</Text>}
                </Pressable>
            </View>

            <ScrollView contentContainerStyle={s.scrollContent} keyboardShouldPersistTaps="handled">
                {/* Assignment Preview */}
                <View style={s.card}>
                    <View style={s.assignRow}>
                        <View style={s.assignCol}>
                            <View style={[s.avatarLg, { backgroundColor: '#4ECDC4' }]}>
                                <Text style={s.avaLgText}>{selectedClient?.initials || '?'}</Text>
                            </View>
                            <Text style={s.assignName} numberOfLines={2}>{selectedClient?.fullName || 'Select Client'}</Text>
                            {selectedCategory && (
                                <View style={[s.badge, { backgroundColor: '#4ECDC4' }]}>
                                    <Text style={s.badgeText} numberOfLines={1}>{selectedCategory.label}</Text>
                                </View>
                            )}
                        </View>
                        <Feather name="arrow-right" size={24} color="#666" style={{ marginHorizontal: 12 }} />
                        <View style={s.assignCol}>
                            <View style={[s.avatarLg, { backgroundColor: '#9D4EDD' }]}>
                                <Text style={s.avaLgText}>{selectedUser?.initials || '?'}</Text>
                            </View>
                            <Text style={s.assignName} numberOfLines={2}>{selectedUser?.name || 'Select Staff'}</Text>
                            {selectedShiftType && (
                                <View style={[s.badge, { backgroundColor: '#9D4EDD' }]}>
                                    <Text style={s.badgeText}>{selectedShiftType.label}</Text>
                                </View>
                            )}
                        </View>
                    </View>
                </View>

                {/* Form */}
                <View style={s.card}>
                    {/* Shift Type */}
                    <FieldRow label="Shift Type" value={selectedShiftType?.label} placeholder="Select shift type" onPress={() => setOpenSheet('shiftType')} />
                    {/* Category */}
                    <FieldRow label="Shift Category" value={selectedCategory?.label} placeholder="Select category" onPress={() => setOpenSheet('category')} />
                    {/* Client */}
                    <FieldRow label="Client" value={selectedClient?.label} placeholder="Select client" onPress={() => setOpenSheet('client')} />
                    {/* Staff */}
                    <FieldRow label="Staff Member" value={selectedUser?.label} placeholder="Select staff" onPress={() => setOpenSheet('user')} />

                    {/* Dates */}
                    <View style={s.row}>
                        <View style={[s.inputContainer, { flex: 1, marginRight: 8 }]}>
                            <Text style={s.label}>Start Date</Text>
                            <Pressable style={s.inputBox} onPress={() => setShowPicker({ visible: true, mode: 'date', field: 'startDate' })}>
                                <Text style={s.inputText}>{formatDate(startDate)}</Text>
                                <Feather name="calendar" size={16} color="#666" />
                            </Pressable>
                        </View>
                        <View style={[s.inputContainer, { flex: 1, marginLeft: 8 }]}>
                            <Text style={s.label}>End Date</Text>
                            <Pressable style={s.inputBox} onPress={() => setShowPicker({ visible: true, mode: 'date', field: 'endDate' })}>
                                <Text style={s.inputText}>{formatDate(endDate)}</Text>
                                <Feather name="calendar" size={16} color="#666" />
                            </Pressable>
                        </View>
                    </View>

                    {/* Times */}
                    <View style={s.row}>
                        <View style={[s.inputContainer, { flex: 1, marginRight: 8 }]}>
                            <Text style={s.label}>Start Time</Text>
                            <Pressable style={s.inputBox} onPress={() => setShowPicker({ visible: true, mode: 'time', field: 'startTime' })}>
                                <Text style={s.inputText}>{formatTime(startTime)}</Text>
                                <Feather name="clock" size={16} color="#666" />
                            </Pressable>
                        </View>
                        <View style={[s.inputContainer, { flex: 1, marginLeft: 8 }]}>
                            <Text style={s.label}>End Time</Text>
                            <Pressable style={s.inputBox} onPress={() => setShowPicker({ visible: true, mode: 'time', field: 'endTime' })}>
                                <Text style={s.inputText}>{formatTime(endTime)}</Text>
                                <Feather name="clock" size={16} color="#666" />
                            </Pressable>
                        </View>
                    </View>

                    {/* Toggle */}
                    <View style={s.toggleContainer}>
                        <View>
                            <Text style={s.toggleTitle}>Access to Shift Report</Text>
                            <Text style={s.toggleSub}>{accessToReport ? 'Yes' : 'No'}</Text>
                        </View>
                        <Switch trackColor={{ false: '#D1D5DB', true: '#2D5F3F' }} thumbColor="#fff"
                            ios_backgroundColor="#D1D5DB" onValueChange={setAccessToReport} value={accessToReport} />
                    </View>

                    {/* Description */}
                    <View style={s.inputContainer}>
                        <Text style={s.label}>Description</Text>
                        <TextInput style={[s.inputBox, s.textArea]} placeholder="Enter shift description"
                            placeholderTextColor="#999" multiline numberOfLines={4}
                            value={description} onChangeText={setDescription} />
                    </View>
                </View>

                {/* Save Footer Button */}
                <Pressable style={[s.submitBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
                    {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.submitText}>Save Changes</Text>}
                </Pressable>

                <View style={{ height: 40 }} />
            </ScrollView>

            {/* Date/Time Picker */}
            {showPicker.visible && (
                <DateTimePicker value={pickerDate} mode={showPicker.mode} display="default" onChange={handleDateChange} />
            )}

            {/* Dropdown Sheets */}
            <DropdownSheet visible={openSheet === 'shiftType'} title="Shift Type" items={shiftTypes}
                selected={selectedShiftType?.value} onSelect={setSelectedShiftType} onClose={() => setOpenSheet(null)} />
            <DropdownSheet visible={openSheet === 'category'} title="Shift Category" items={categories}
                selected={selectedCategory?.value} onSelect={setSelectedCategory} onClose={() => setOpenSheet(null)} />
            <DropdownSheet visible={openSheet === 'client'} title="Select Client" items={clients}
                selected={selectedClient?.value} onSelect={setSelectedClient} onClose={() => setOpenSheet(null)} />
            <DropdownSheet visible={openSheet === 'user'} title="Select Staff Member" items={staff}
                selected={selectedUser?.value} onSelect={setSelectedUser} onClose={() => setOpenSheet(null)} />
        </SafeAreaView>
    );
}

function FieldRow({ label, value, placeholder, onPress }) {
    return (
        <View style={s.inputContainer}>
            <Text style={s.label}>{label}</Text>
            <Pressable style={s.inputBox} onPress={onPress}>
                <Text style={[s.inputText, !value && s.placeholder]} numberOfLines={1}>
                    {value ?? placeholder}
                </Text>
                <Feather name="chevron-down" size={20} color="#666" />
            </Pressable>
        </View>
    );
}

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9F7F4' },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#F9F7F4', borderBottomWidth: 1, borderBottomColor: '#ECE8E3' },
    backBtn: { padding: 4, marginRight: 12 },
    headerTitle: { flex: 1, fontSize: 20, fontWeight: '700', color: '#333' },
    saveHeaderBtn: { backgroundColor: '#2D5F3F', paddingHorizontal: 18, paddingVertical: 9, borderRadius: 10 },
    saveHeaderText: { color: '#fff', fontSize: 14, fontWeight: '700' },
    scrollContent: { padding: 16 },
    card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 },
    assignRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
    assignCol: { flex: 1, alignItems: 'center' },
    avatarLg: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
    avaLgText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    assignName: { fontSize: 14, fontWeight: '600', color: '#333', textAlign: 'center' },
    badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12, marginTop: 4, maxWidth: '90%' },
    badgeText: { color: '#fff', fontSize: 10, fontWeight: '600' },
    row: { flexDirection: 'row' },
    inputContainer: { marginBottom: 16 },
    label: { fontSize: 14, fontWeight: '500', color: '#333', marginBottom: 8 },
    inputBox: { backgroundColor: '#F5F5F5', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    inputText: { fontSize: 14, color: '#333', flex: 1, marginRight: 4 },
    placeholder: { color: '#999' },
    textArea: { height: 100, textAlignVertical: 'top' },
    toggleContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F5F5F5', padding: 12, borderRadius: 8, marginBottom: 16 },
    toggleTitle: { fontSize: 14, fontWeight: '500', color: '#333' },
    toggleSub: { fontSize: 12, color: '#666', marginTop: 2 },
    submitBtn: { backgroundColor: '#2D5F3F', paddingVertical: 16, borderRadius: 8, alignItems: 'center' },
    submitText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
