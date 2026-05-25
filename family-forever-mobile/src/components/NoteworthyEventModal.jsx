// ✅ Create: src/components/NoteworthyEventModal.jsx
// Then import + wire it in app/report.jsx (instructions at bottom)

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  ScrollView,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function NoteworthyEventModal({
  visible,
  onClose,
  shift,
  onSubmit,
}) {
  const [form, setForm] = useState({
    clientName: shift?.clientName || "",
    cyimId: shift?.clientId || "",
    eventText: "",
    employeeSignature: shift?.name || "",
    date: shift?.startDate || "",
  });
  const insets = useSafeAreaInsets();


  // ✅ when modal opens, refresh prefilled values from shift
  useEffect(() => {
    if (!visible) return;
    setForm((p) => ({
      ...p,
      clientName: shift?.clientName || "",
      cyimId: shift?.clientId || "",
      employeeSignature: shift?.name || "",
      date: shift?.startDate || "",
    }));
  }, [visible, shift]);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const validate = () => {
    if (!form.clientName?.trim()) return "Client Name is required";
    if (!form.eventText?.trim()) return "Noteworthy Event is required";
    return null;
  };

  const handleSubmit = () => {
    const err = validate();
    if (err) return alert(err);

    onSubmit?.(form);
    onClose?.();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: "#F2F4F6" }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
  contentContainerStyle={{
    paddingHorizontal: 16,
    paddingBottom: 30,
    paddingTop: 12 + insets.top, // ✅ pushes below notch/status bar
  }}
>

          {/* TOP HEADER */}
          <View style={styles.topCard}>
            <View style={styles.topIcon}>
              <MaterialCommunityIcons name="pencil-outline" size={18} color="#F97316" />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.topTitle}>Noteworthy Event</Text>
              <Text style={styles.topSub}>
                Complete all sections thoroughly - This report is confidential and protected
              </Text>
            </View>

            <Pressable onPress={onClose} hitSlop={10} style={styles.closeBtn}>
              <MaterialCommunityIcons name="close" size={20} color="#111827" />
            </Pressable>
          </View>

          {/* CLIENT INFORMATION */}
          <Text style={styles.sectionTitle}>
            Client Information<Text style={{ color: "#DC2626" }}> *</Text>
          </Text>

          <Label label="Client Name" required />
          <TextInput
            value={form.clientName}
            onChangeText={(t) => set("clientName", t)}
            placeholder="Please write the name of client"
            style={styles.input}
          />

          <Label label="CYIM ID Number" />
          <TextInput
            value={form.cyimId}
            onChangeText={(t) => set("cyimId", t)}
            placeholder="Please enter the phone number"
            style={styles.input}
          />

          {/* NOTEWORTHY EVENT */}
          <Text style={styles.sectionTitle}>
            Noteworthy Event<Text style={{ color: "#DC2626" }}> *</Text>
          </Text>

          <TextInput
            value={form.eventText}
            onChangeText={(t) => set("eventText", t)}
            placeholder="Write down any Noteworthy Event for the client."
            multiline
            style={[styles.textArea, { height: 200 }]}
            textAlignVertical="top"
          />

          {/* SIGNATURE + DATE */}
          <Text style={styles.sectionTitle}>Employee Signature</Text>
          <TextInput
            value={form.employeeSignature}
            onChangeText={(t) => set("employeeSignature", t)}
            placeholder="Please write the name of client"
            style={styles.input}
          />

          <Text style={styles.sectionTitle}>Date</Text>
          <TextInput
            value={form.date}
            onChangeText={(t) => set("date", t)}
            placeholder="Please provide the date of filling the form"
            style={styles.input}
          />

          {/* SUBMISSION CARD (orange like your screenshot) */}
          <View style={styles.submitCard}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <View style={styles.submitIcon}>
                <MaterialCommunityIcons name="pencil-outline" size={18} color="#F97316" />
              </View>
              <Text style={styles.submitTitle}>Critical Incident Report Submission</Text>
            </View>

            <Text style={styles.submitText}>
              This report must be submitted immediately upon completion. Management will be automatically notified.
              Ensure all sections are complete and accurate as this is a legal document.
            </Text>

            <View style={{ flexDirection: "row", gap: 12, marginTop: 12 }}>
              <Pressable onPress={onClose} style={styles.draftBtn}>
                <Text style={styles.draftText}>Save Draft</Text>
              </Pressable>

              <Pressable onPress={handleSubmit} style={styles.submitBtn}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  <MaterialCommunityIcons name="alert-outline" size={18} color="#fff" />
                  <Text style={styles.submitBtnText}>Noteworthy Event</Text>
                </View>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function Label({ label, required }) {
  return (
    <Text style={styles.label}>
      {label} {required ? <Text style={{ color: "#DC2626" }}>*</Text> : null}
    </Text>
  );
}

const styles = {
  topCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  topIcon: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: "#FFEDD5",
    alignItems: "center",
    justifyContent: "center",
  },
  topTitle: { fontSize: 14, fontWeight: "900", color: "#111827" },
  topSub: { marginTop: 4, fontSize: 11.5, color: "#6B7280", fontWeight: "600" },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },

  sectionTitle: { marginTop: 16, marginBottom: 8, fontSize: 13, fontWeight: "900", color: "#111827" },
  label: { fontSize: 12, fontWeight: "800", color: "#111827", marginBottom: 6 },

  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
    fontSize: 13,
  },

  textArea: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    padding: 12,
    fontSize: 13,
    marginBottom: 12,
  },

  submitCard: {
    marginTop: 14,
    backgroundColor: "#FFF7ED",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FDBA74",
    padding: 14,
  },
  submitIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#FFEDD5",
    alignItems: "center",
    justifyContent: "center",
  },
  submitTitle: { fontSize: 12.5, fontWeight: "900", color: "#F97316", flex: 1 },
  submitText: { marginTop: 8, fontSize: 11.5, lineHeight: 16, color: "#F97316", fontWeight: "600" },

  draftBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#14532D",
    backgroundColor: "#E7F5EC",
  },
  draftText: { textAlign: "center", fontWeight: "900", color: "#14532D" },

  submitBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#F97316",
  },
  submitBtnText: { fontWeight: "900", color: "#fff" },
};
