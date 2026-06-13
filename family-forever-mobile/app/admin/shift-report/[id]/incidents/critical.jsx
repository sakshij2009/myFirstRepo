import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator, Alert, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { doc, getDoc, updateDoc, setDoc } from "firebase/firestore";
import { db } from "../../../../../src/firebase/config";

// --- Form Categories (From Web App logic) ---
const facilityTypesLeft = [
    "Foster Care", "Kinship Care", "ILS/SIL/TSIL", "Community Group Care", "Agency Campus-based Treatment Centre"
];
const facilityTypesRight = [
    "Ministry Campus-based Treatment Centre", "Personalized Community Care", "Secure Services / PSECA Confident", "PSECA (Voluntary)", "Other No placement"
];

// Reusable Checkbox Component
const CheckBox = ({ label, checked, onChange }) => (
    <Pressable onPress={onChange} style={s.checkboxRow}>
        <Ionicons name={checked ? "checkbox" : "square-outline"} size={24} color={checked ? "#2D5F3F" : "#ccc"} />
        <Text style={s.checkboxLabel}>{label}</Text>
    </Pressable>
);

export default function CriticalIncidentScreen() {
    const { id, type } = useLocalSearchParams(); // id = shiftId
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Using a simplified local state instead of Formik for this first iteration to ensure stability in React Native
    const [form, setForm] = useState({
        clientName: "",
        dob: "",
        cyimId: "",
        cipPractitioner: "",
        agencyName: "",
        staffAddress: "",
        staffId: "",
        facilityTypes: {},
        description: "",
        status: "draft"
    });

    useEffect(() => {
        const loadIncidentData = async () => {
            try {
                const shiftRef = doc(db, "shifts", id);
                const shiftSnap = await getDoc(shiftRef);

                if (shiftSnap.exists()) {
                    const data = shiftSnap.data();

                    // Pre-fill from shift/client data
                    setForm(prev => ({
                        ...prev,
                        clientName: data.clientName || data.clientDetails?.name || "",
                        cipPractitioner: data.caseWorkerName || "",
                    }));

                    // If existing report exists, merge it
                    if (data.criticalIncidentReport) {
                        const existing = data.criticalIncidentReport;
                        setForm(prev => ({
                            ...prev,
                            ...existing.meta,
                            ...existing.facility,
                            status: existing._meta?.status || "draft"
                        }));
                    }
                }
            } catch (err) {
                console.error(err);
                Alert.alert("Error", "Could not load report data.");
            } finally {
                setLoading(false);
            }
        };

        if (id) loadIncidentData();
    }, [id]);

    const handleSaveDraft = async () => {
        setSaving(true);
        try {
            const shiftRef = doc(db, "shifts", id);
            await setDoc(shiftRef, { criticalIncidentReport: { ...form, _meta: { status: "draft" } } }, { merge: true });
            Alert.alert("Success", "Draft saved.");
        } catch (e) {
            Alert.alert("Error", "Could not save draft.");
        } finally {
            setSaving(false);
        }
    };

    const handleSubmit = async () => {
        if (!form.clientName || !form.agencyName) {
            Alert.alert("Validation", "Client Name and Agency Name are required.");
            return;
        }

        setSaving(true);
        try {
            const shiftRef = doc(db, "shifts", id);
            await setDoc(shiftRef, { criticalIncidentReport: { ...form, _meta: { status: "submitted" } } }, { merge: true });
            Alert.alert("Success", "Incident Report submitted.");
            router.back();
        } catch (e) {
            Alert.alert("Error", "Could not submit report.");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <SafeAreaView style={[s.safe, { justifyContent: "center", alignItems: "center" }]}>
                <ActivityIndicator size="large" color="#2D5F3F" />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={s.safe} edges={["top"]}>
            <View style={s.header}>
                <Pressable onPress={() => router.back()} style={s.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#333" />
                </Pressable>
                <View style={s.headerTextCol}>
                    <Text style={s.headerTitle}>Critical Incident Report</Text>
                    <Text style={s.headerSub}>{form.status === "draft" ? "Draft" : "Submitted"}</Text>
                </View>
            </View>

            <ScrollView contentContainerStyle={s.content}>

                {/* Client Information */}
                <View style={s.card}>
                    <Text style={s.sectionTitle}>Client Information</Text>

                    <Text style={s.label}>Client Name *</Text>
                    <TextInput style={s.input} value={form.clientName} onChangeText={t => setForm({ ...form, clientName: t })} />

                    <Text style={s.label}>Date of Birth</Text>
                    <TextInput style={s.input} value={form.dob} onChangeText={t => setForm({ ...form, dob: t })} placeholder="YYYY-MM-DD" />

                    <Text style={s.label}>CYIM ID Number</Text>
                    <TextInput style={s.input} value={form.cyimId} onChangeText={t => setForm({ ...form, cyimId: t })} />

                    <Text style={s.label}>Client Intervention Practitioner</Text>
                    <TextInput style={s.input} value={form.cipPractitioner} onChangeText={t => setForm({ ...form, cipPractitioner: t })} />
                </View>

                {/* Facility Information */}
                <View style={s.card}>
                    <Text style={s.sectionTitle}>Facility Information</Text>

                    <Text style={s.label}>Name of Agency *</Text>
                    <TextInput style={s.input} value={form.agencyName} onChangeText={t => setForm({ ...form, agencyName: t })} />

                    <Text style={s.label}>Type of Facility</Text>
                    <View style={s.facilityGrid}>
                        {facilityTypesLeft.concat(facilityTypesRight).map(type => (
                            <CheckBox
                                key={type}
                                label={type}
                                checked={!!form.facilityTypes[type]}
                                onChange={() => setForm(f => ({
                                    ...f, facilityTypes: { ...f.facilityTypes, [type]: !f.facilityTypes[type] }
                                }))}
                            />
                        ))}
                    </View>
                </View>

                {/* Submit Container */}
                <View style={s.btnRow}>
                    <Pressable style={s.draftBtn} onPress={handleSaveDraft} disabled={saving}>
                        <Text style={s.draftBtnText}>{saving ? "Saving..." : "Save Draft"}</Text>
                    </Pressable>
                    <Pressable style={s.submitBtn} onPress={handleSubmit} disabled={saving}>
                        <Text style={s.submitBtnText}>{saving ? "Submitting..." : "Submit Report"}</Text>
                    </Pressable>
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const s = StyleSheet.create({
    safe: { flex: 1, backgroundColor: "#F9F7F4" },
    header: { flexDirection: "row", alignItems: "center", padding: 16, borderBottomWidth: 1, borderBottomColor: "#EAE6DF", backgroundColor: "#fff" },
    backBtn: { padding: 8, marginRight: 8, borderRadius: 8, backgroundColor: "rgba(0,0,0,0.05)" },
    headerTextCol: { flex: 1 },
    headerTitle: { fontSize: 20, fontWeight: "700", color: "#333" },
    headerSub: { fontSize: 13, color: "#EF4444", fontWeight: "600" },
    content: { padding: 16, gap: 16 },
    card: { backgroundColor: "#fff", padding: 16, borderRadius: 12, elevation: 1 },
    sectionTitle: { fontSize: 18, fontWeight: "700", marginBottom: 16, color: "#333" },
    label: { fontSize: 13, fontWeight: "600", color: "#666", marginBottom: 6 },
    input: { borderWidth: 1, borderColor: "#EAE6DF", borderRadius: 8, padding: 12, backgroundColor: "#F9F9F9", marginBottom: 16 },
    facilityGrid: { gap: 10, marginTop: 8 },
    checkboxRow: { flexDirection: "row", alignItems: "center", gap: 10 },
    checkboxLabel: { fontSize: 14, color: "#444" },
    btnRow: { flexDirection: "row", gap: 12, marginTop: 10 },
    draftBtn: { flex: 1, padding: 14, borderRadius: 8, borderWidth: 1, borderColor: "#2D5F3F", alignItems: "center" },
    draftBtnText: { color: "#2D5F3F", fontWeight: "600", fontSize: 14 },
    submitBtn: { flex: 1, padding: 14, borderRadius: 8, backgroundColor: "#2D5F3F", alignItems: "center" },
    submitBtnText: { color: "#fff", fontWeight: "600", fontSize: 14 },
});
