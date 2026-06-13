import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator, Alert, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../../../../../src/firebase/config";

// Reusable Checkbox Component
const CheckBox = ({ label, checked, onChange }) => (
    <Pressable onPress={onChange} style={s.checkboxRow}>
        <Ionicons name={checked ? "checkbox" : "square-outline"} size={24} color={checked ? "#2D5F3F" : "#ccc"} />
        <Text style={s.checkboxLabel}>{label}</Text>
    </Pressable>
);

export default function FollowThroughScreen() {
    const { id } = useLocalSearchParams(); // shiftId
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [form, setForm] = useState({
        clientName: "",
        date: new Date().toISOString().split("T")[0],
        taskTitle: "",
        description: "",
        assignedTo: "",
        dueDate: "",
        completionStatus: "Pending", // Pending, In Progress, Completed
        status: "draft"
    });

    useEffect(() => {
        const loadData = async () => {
            try {
                const shiftRef = doc(db, "shifts", id);
                const shiftSnap = await getDoc(shiftRef);

                if (shiftSnap.exists()) {
                    const data = shiftSnap.data();
                    setForm(prev => ({ ...prev, clientName: data.clientName || data.clientDetails?.name || "" }));

                    if (data.followThroughReport) {
                        setForm(prev => ({ ...prev, ...data.followThroughReport }));
                    }
                }
            } catch (err) {
                Alert.alert("Error", "Could not load report data.");
            } finally {
                setLoading(false);
            }
        };

        if (id) loadData();
    }, [id]);

    const handleSave = async (isSubmit = false) => {
        setSaving(true);
        try {
            const shiftRef = doc(db, "shifts", id);
            await setDoc(shiftRef, {
                followThroughReport: { ...form, status: isSubmit ? "submitted" : "draft" }
            }, { merge: true });

            Alert.alert("Success", isSubmit ? "Follow Through submitted." : "Draft saved.");
            if (isSubmit) router.back();
            else setForm(f => ({ ...f, status: "draft" }));
        } catch (e) {
            Alert.alert("Error", "Could not save form.");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <SafeAreaView style={[s.safe, { justifyContent: "center", alignItems: "center" }]}><ActivityIndicator size="large" color="#2D5F3F" /></SafeAreaView>;
    }

    return (
        <SafeAreaView style={s.safe} edges={["top"]}>
            <View style={s.header}>
                <Pressable onPress={() => router.back()} style={s.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#333" />
                </Pressable>
                <View style={s.headerTextCol}>
                    <Text style={s.headerTitle}>Follow Through</Text>
                    <Text style={s.headerSub}>{form.status === "draft" ? "Draft" : "Submitted"}</Text>
                </View>
            </View>

            <ScrollView contentContainerStyle={s.content}>
                <View style={s.card}>
                    <Text style={s.label}>Client Name *</Text>
                    <TextInput style={s.input} value={form.clientName} onChangeText={t => setForm({ ...form, clientName: t })} />

                    <Text style={s.label}>Task/Issue Title</Text>
                    <TextInput style={s.input} value={form.taskTitle} onChangeText={t => setForm({ ...form, taskTitle: t })} />

                    <Text style={s.label}>Detailed Description</Text>
                    <TextInput style={[s.input, s.textArea]} multiline value={form.description} onChangeText={t => setForm({ ...form, description: t })} />

                    <Text style={s.label}>Assigned To</Text>
                    <TextInput style={s.input} value={form.assignedTo} onChangeText={t => setForm({ ...form, assignedTo: t })} placeholder="Name or Role" />

                    <Text style={s.label}>Due Date</Text>
                    <TextInput style={s.input} value={form.dueDate} onChangeText={t => setForm({ ...form, dueDate: t })} placeholder="YYYY-MM-DD" />

                    <Text style={s.label}>Status</Text>
                    <View style={s.radioGroup}>
                        {["Pending", "In Progress", "Completed"].map(statusOption => (
                            <Pressable key={statusOption} style={s.checkboxRow} onPress={() => setForm({ ...form, completionStatus: statusOption })}>
                                <Ionicons name={form.completionStatus === statusOption ? "radio-button-on" : "radio-button-off"} size={22} color={form.completionStatus === statusOption ? "#2D5F3F" : "#ccc"} />
                                <Text style={s.checkboxLabel}>{statusOption}</Text>
                            </Pressable>
                        ))}
                    </View>
                </View>

                <View style={s.btnRow}>
                    <Pressable style={s.draftBtn} onPress={() => handleSave(false)} disabled={saving}>
                        <Text style={s.draftBtnText}>{saving ? "Saving..." : "Save Draft"}</Text>
                    </Pressable>
                    <Pressable style={s.submitBtn} onPress={() => handleSave(true)} disabled={saving}>
                        <Text style={s.submitBtnText}>{saving ? "Submitting..." : "Submit Task"}</Text>
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
    headerSub: { fontSize: 13, color: "#2D5F3F", fontWeight: "600" },
    content: { padding: 16, gap: 16 },
    card: { backgroundColor: "#fff", padding: 16, borderRadius: 12, elevation: 1 },
    label: { fontSize: 13, fontWeight: "600", color: "#666", marginBottom: 6 },
    input: { borderWidth: 1, borderColor: "#EAE6DF", borderRadius: 8, padding: 12, backgroundColor: "#F9F9F9", marginBottom: 16 },
    textArea: { height: 100, textAlignVertical: "top" },
    radioGroup: { gap: 12, marginTop: 4, marginBottom: 10, paddingLeft: 4 },
    checkboxRow: { flexDirection: "row", alignItems: "center", gap: 10 },
    checkboxLabel: { fontSize: 14, color: "#444" },
    btnRow: { flexDirection: "row", gap: 12, marginTop: 10 },
    draftBtn: { flex: 1, padding: 14, borderRadius: 8, borderWidth: 1, borderColor: "#2D5F3F", alignItems: "center" },
    draftBtnText: { color: "#2D5F3F", fontWeight: "600", fontSize: 14 },
    submitBtn: { flex: 1, padding: 14, borderRadius: 8, backgroundColor: "#2D5F3F", alignItems: "center" },
    submitBtnText: { color: "#fff", fontWeight: "600", fontSize: 14 },
});
