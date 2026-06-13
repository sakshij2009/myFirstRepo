import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator, Alert, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../../../../../src/firebase/config";

export default function ContactNoteScreen() {
    const { id } = useLocalSearchParams(); // shiftId
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [form, setForm] = useState({
        clientName: "",
        date: new Date().toISOString().split("T")[0],
        time: "",
        contactMethod: "",
        personContacted: "",
        reason: "",
        summary: "",
        outcome: "",
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

                    if (data.medicalContactLog) {
                        setForm(prev => ({ ...prev, ...data.medicalContactLog }));
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
                medicalContactLog: { ...form, status: isSubmit ? "submitted" : "draft" }
            }, { merge: true });

            Alert.alert("Success", isSubmit ? "Contact Note submitted." : "Draft saved.");
            if (isSubmit) router.back();
            else setForm(f => ({ ...f, status: "draft" }));
        } catch (e) {
            Alert.alert("Error", "Could not save note.");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <SafeAreaView style={[s.safe, { justifyContent: "center", alignItems: "center" }]}><ActivityIndicator size="large" color="#3B82F6" /></SafeAreaView>;
    }

    return (
        <SafeAreaView style={s.safe} edges={["top"]}>
            <View style={s.header}>
                <Pressable onPress={() => router.back()} style={s.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#333" />
                </Pressable>
                <View style={s.headerTextCol}>
                    <Text style={s.headerTitle}>Contact Note</Text>
                    <Text style={s.headerSub}>{form.status === "draft" ? "Draft" : "Submitted"}</Text>
                </View>
            </View>

            <ScrollView contentContainerStyle={s.content}>
                <View style={s.card}>
                    <Text style={s.label}>Client Name *</Text>
                    <TextInput style={s.input} value={form.clientName} onChangeText={t => setForm({ ...form, clientName: t })} />

                    <Text style={s.label}>Date of Contact</Text>
                    <TextInput style={s.input} value={form.date} onChangeText={t => setForm({ ...form, date: t })} placeholder="YYYY-MM-DD" />

                    <Text style={s.label}>Person Contacted</Text>
                    <TextInput style={s.input} value={form.personContacted} onChangeText={t => setForm({ ...form, personContacted: t })} />

                    <Text style={s.label}>Summary of Contact</Text>
                    <TextInput style={[s.input, s.textArea]} multiline value={form.summary} onChangeText={t => setForm({ ...form, summary: t })} />
                </View>

                <View style={s.btnRow}>
                    <Pressable style={s.draftBtn} onPress={() => handleSave(false)} disabled={saving}>
                        <Text style={s.draftBtnText}>{saving ? "Saving..." : "Save Draft"}</Text>
                    </Pressable>
                    <Pressable style={s.submitBtn} onPress={() => handleSave(true)} disabled={saving}>
                        <Text style={s.submitBtnText}>{saving ? "Submitting..." : "Submit Note"}</Text>
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
    headerSub: { fontSize: 13, color: "#3B82F6", fontWeight: "600" },
    content: { padding: 16, gap: 16 },
    card: { backgroundColor: "#fff", padding: 16, borderRadius: 12, elevation: 1 },
    label: { fontSize: 13, fontWeight: "600", color: "#666", marginBottom: 6 },
    input: { borderWidth: 1, borderColor: "#EAE6DF", borderRadius: 8, padding: 12, backgroundColor: "#F9F9F9", marginBottom: 16 },
    textArea: { height: 120, textAlignVertical: "top" },
    btnRow: { flexDirection: "row", gap: 12, marginTop: 10 },
    draftBtn: { flex: 1, padding: 14, borderRadius: 8, borderWidth: 1, borderColor: "#3B82F6", alignItems: "center" },
    draftBtnText: { color: "#3B82F6", fontWeight: "600", fontSize: 14 },
    submitBtn: { flex: 1, padding: 14, borderRadius: 8, backgroundColor: "#3B82F6", alignItems: "center" },
    submitBtnText: { color: "#fff", fontWeight: "600", fontSize: 14 },
});
