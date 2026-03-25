import React, { useMemo, useState } from "react";
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

/* ---------- ACTION CARD (NOW CLICKABLE) ---------- */
export const ActionCard = ({
  title,
  description,
  btnText,
  bg,
  color,
  icon,
  onPress,
}) => (
  <View
    style={{
      backgroundColor: bg,
      borderRadius: 12,
      padding: 14,
      marginBottom: 14,
      borderWidth: 1,
      borderColor: color + "40",
    }}
  >
    {/* HEADER */}
    <View style={{ flexDirection: "row", alignItems: "center" }}>
      <View
        style={{
          backgroundColor: color + "22",
          padding: 8,
          borderRadius: 10,
          marginRight: 10,
        }}
      >
        <MaterialCommunityIcons name={icon} size={20} color={color} />
      </View>

      <Text style={{ fontWeight: "900", color, fontSize: 16 }}>{title}</Text>
    </View>

    <Text style={{ color, fontSize: 12, marginTop: 6, marginBottom: 10 }}>
      {description}
    </Text>

    {/* BUTTON */}
    <Pressable
      onPress={onPress}
      style={{
        backgroundColor: color,
        paddingVertical: 12,
        borderRadius: 10,
        marginTop: 2,
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        gap: 6,
      }}
    >
      <MaterialCommunityIcons
        name="arrow-right-circle-outline"
        size={18}
        color="#fff"
      />
      <Text style={{ color: "#fff", fontWeight: "800" }}>{btnText}</Text>
    </Pressable>
  </View>
);

/* =================================================================
   ✅ MEDICAL CONTACT LOG (Modal Form)
   - Looks like your screenshot layout
   - Simple + small (as requested)
   - Uses shift data to prefill where possible
================================================================= */
export const MedicalContactLogModal = ({
  visible,
  onClose,
  shift,
  onSubmit,
}) => {
  const clientOptions = useMemo(() => {
    // if you later have multiple clients, you can pass them in
    const name = shift?.clientName || "";
    return name ? [name] : [];
  }, [shift]);

  const [form, setForm] = useState({
    clientName: shift?.clientName || "",
    cyimId: shift?.clientId || "",
    staffName: shift?.name || "",
    dateOfContact: shift?.startDate || "",
    personOfContact: "",
    timeOfContact: "",
    program: [], // multi
    contactType: [], // multi
    details: "",
    followUpRequired: "",
    employeeSignature: shift?.name || "",
    date: shift?.startDate || "",
  });

  const toggleMulti = (key, value) => {
    setForm((prev) => {
      const arr = prev[key] || [];
      const exists = arr.includes(value);
      return { ...prev, [key]: exists ? arr.filter((x) => x !== value) : [...arr, value] };
    });
  };

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const validate = () => {
    // minimal validation like your UI (required fields marked *)
    if (!form.clientName?.trim()) return "Client Name is required";
    if (!form.details?.trim()) return "Details is required";
    if (!form.followUpRequired?.trim()) return "Follow-up Required is required";
    return null;
  };

  const handleSubmit = () => {
    const err = validate();
    if (err) return alert(err);

    // send to parent to save to firestore
    onSubmit?.(form);
    onClose?.();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: "#F2F4F6" }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 30 }}>
          {/* TOP HEADER */}
          <View style={stylesForm.topCard}>
            <View style={stylesForm.topIcon}>
              <MaterialCommunityIcons name="clipboard-text-outline" size={18} color="#2563eb" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={stylesForm.topTitle}>Medical Contact Log</Text>
              <Text style={stylesForm.topSub}>
                Complete all sections thoroughly - This report is confidential and protected
              </Text>
            </View>
            <Pressable onPress={onClose} hitSlop={10} style={stylesForm.closeBtn}>
              <MaterialCommunityIcons name="close" size={20} color="#111827" />
            </Pressable>
          </View>

          {/* SECTION: CLIENT INFORMATION */}
          <Text style={stylesForm.sectionTitle}>
            Client Information<Text style={{ color: "#dc2626" }}> *</Text>
          </Text>

          <FieldLabel label="Client Name" required />
          {/* if you want dropdown later, keep as TextInput now */}
          <TextInput
            value={form.clientName}
            onChangeText={(t) => set("clientName", t)}
            placeholder="Please write the name of client"
            style={stylesForm.input}
          />

          <FieldLabel label="CYIM ID Number" />
          <TextInput
            value={form.cyimId}
            onChangeText={(t) => set("cyimId", t)}
            placeholder="Please enter the phone number"
            style={stylesForm.input}
          />

          <FieldLabel label="Staff Name" />
          <TextInput
            value={form.staffName}
            onChangeText={(t) => set("staffName", t)}
            placeholder="Please enter the phone number"
            style={stylesForm.input}
          />

          <FieldLabel label="Date of Contact" />
          <TextInput
            value={form.dateOfContact}
            onChangeText={(t) => set("dateOfContact", t)}
            placeholder="Please select the service start details"
            style={stylesForm.input}
          />

          <FieldLabel label="Person of Contact" />
          <TextInput
            value={form.personOfContact}
            onChangeText={(t) => set("personOfContact", t)}
            placeholder="Please enter the e-mail"
            style={stylesForm.input}
          />

          <FieldLabel label="Time of Contact" />
          <TextInput
            value={form.timeOfContact}
            onChangeText={(t) => set("timeOfContact", t)}
            placeholder="Please enter the e-mail"
            style={stylesForm.input}
          />

          {/* PROGRAM (checkbox list) */}
          <Text style={stylesForm.subTitle}>Program</Text>
          <CheckRow
            label="Transportation"
            checked={form.program.includes("Transportation")}
            onPress={() => toggleMulti("program", "Transportation")}
          />
          <CheckRow
            label="Supervised Visit"
            checked={form.program.includes("Supervised Visit")}
            onPress={() => toggleMulti("program", "Supervised Visit")}
          />
          <CheckRow
            label="Respite-In Home"
            checked={form.program.includes("Respite-In Home")}
            onPress={() => toggleMulti("program", "Respite-In Home")}
          />
          <CheckRow
            label="Respite- Out of Home"
            checked={form.program.includes("Respite- Out of Home")}
            onPress={() => toggleMulti("program", "Respite- Out of Home")}
          />
          <CheckRow
            label="Emergent Care"
            checked={form.program.includes("Emergent Care")}
            onPress={() => toggleMulti("program", "Emergent Care")}
          />

          {/* TYPE OF CONTACT */}
          <Text style={stylesForm.subTitle}>Type of Contact</Text>
          <CheckRow
            label="Telephone"
            checked={form.contactType.includes("Telephone")}
            onPress={() => toggleMulti("contactType", "Telephone")}
          />
          <CheckRow
            label="Face to Face"
            checked={form.contactType.includes("Face to Face")}
            onPress={() => toggleMulti("contactType", "Face to Face")}
          />
          <CheckRow
            label="Professional"
            checked={form.contactType.includes("Professional")}
            onPress={() => toggleMulti("contactType", "Professional")}
          />
          <CheckRow
            label="Significant Person/ Family"
            checked={form.contactType.includes("Significant Person/ Family")}
            onPress={() => toggleMulti("contactType", "Significant Person/ Family")}
          />
          <CheckRow
            label="Other"
            checked={form.contactType.includes("Other")}
            onPress={() => toggleMulti("contactType", "Other")}
          />

          {/* DETAILS */}
          <Text style={stylesForm.sectionTitle}>
            Details<Text style={{ color: "#dc2626" }}> *</Text>
          </Text>
          <TextInput
            value={form.details}
            onChangeText={(t) => set("details", t)}
            placeholder="Write down description who was involved during the incident"
            multiline
            style={[stylesForm.textArea, { height: 140 }]}
            textAlignVertical="top"
          />

          {/* FOLLOW UP */}
          <Text style={stylesForm.sectionTitle}>
            Follow-up Required<Text style={{ color: "#dc2626" }}> *</Text>
          </Text>
          <TextInput
            value={form.followUpRequired}
            onChangeText={(t) => set("followUpRequired", t)}
            placeholder="Write down description who was involved during the incident"
            multiline
            style={[stylesForm.textArea, { height: 140 }]}
            textAlignVertical="top"
          />

          {/* SIGNATURE + DATE */}
          <Text style={stylesForm.sectionTitle}>Employee Signature</Text>
          <TextInput
            value={form.employeeSignature}
            onChangeText={(t) => set("employeeSignature", t)}
            placeholder="Please write the name of client"
            style={stylesForm.input}
          />

          <Text style={stylesForm.sectionTitle}>Date</Text>
          <TextInput
            value={form.date}
            onChangeText={(t) => set("date", t)}
            placeholder="Please provide the date of filling the form"
            style={stylesForm.input}
          />

          {/* SUBMISSION CARD */}
          <View style={stylesForm.submitCard}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <View style={stylesForm.submitIcon}>
                <MaterialCommunityIcons name="alert-circle-outline" size={18} color="#2563eb" />
              </View>
              <Text style={stylesForm.submitTitle}>Critical Incident Report Submission</Text>
            </View>

            <Text style={stylesForm.submitText}>
              This report must be submitted immediately upon completion. Management will be automatically notified.
              Ensure all sections are complete and accurate as this is a legal document.
            </Text>

            <View style={{ flexDirection: "row", gap: 12, marginTop: 12 }}>
              <Pressable
                onPress={onClose}
                style={stylesForm.draftBtn}
              >
                <Text style={stylesForm.draftText}>Save Draft</Text>
              </Pressable>

              <Pressable
                onPress={handleSubmit}
                style={stylesForm.submitBtn}
              >
                <Text style={stylesForm.submitBtnText}>Submit</Text>
              </Pressable>
            </View>
          </View>

          <View style={{ height: 20 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
};

/* ---------- SMALL UI HELPERS ---------- */
function FieldLabel({ label, required }) {
  return (
    <Text style={stylesForm.label}>
      {label} {required ? <Text style={{ color: "#dc2626" }}>*</Text> : null}
    </Text>
  );
}

function CheckRow({ label, checked, onPress }) {
  return (
    <Pressable onPress={onPress} style={stylesForm.checkRow}>
      <View style={[stylesForm.checkbox, checked && stylesForm.checkboxOn]}>
        {checked ? (
          <MaterialCommunityIcons name="check" size={16} color="#fff" />
        ) : null}
      </View>
      <Text style={stylesForm.checkText}>{label}</Text>
    </Pressable>
  );
}

/* ---------- FORM STYLES (matches your screenshot) ---------- */
const stylesForm = {
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
    backgroundColor: "#DBEAFE",
    alignItems: "center",
    justifyContent: "center",
  },
  topTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: "#111827",
  },
  topSub: {
    marginTop: 4,
    fontSize: 11.5,
    color: "#6B7280",
    fontWeight: "600",
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    marginTop: 16,
    marginBottom: 8,
    fontSize: 13,
    fontWeight: "900",
    color: "#111827",
  },
  label: {
    fontSize: 12,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 6,
  },
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
  subTitle: {
    marginTop: 4,
    marginBottom: 10,
    fontSize: 12.5,
    fontWeight: "900",
    color: "#111827",
  },
  checkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxOn: {
    backgroundColor: "#14532D",
    borderColor: "#14532D",
  },
  checkText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
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
    backgroundColor: "#EFF6FF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#BFDBFE",
    padding: 14,
  },
  submitIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#DBEAFE",
    alignItems: "center",
    justifyContent: "center",
  },
  submitTitle: {
    fontSize: 12.5,
    fontWeight: "900",
    color: "#2563eb",
    flex: 1,
  },
  submitText: {
    marginTop: 8,
    fontSize: 11.5,
    lineHeight: 16,
    color: "#2563eb",
    fontWeight: "600",
  },
  draftBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#14532D",
    backgroundColor: "#E7F5EC",
  },
  draftText: {
    textAlign: "center",
    fontWeight: "900",
    color: "#14532D",
  },
  submitBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#2563EB",
  },
  submitBtnText: {
    textAlign: "center",
    fontWeight: "900",
    color: "#fff",
  },
};
