import React, { useEffect, useMemo, useState } from "react";
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

/* ================== OPTIONS (edit anytime) ================== */

const CFG_STATUS = ["CAG", "ICO", "TGO", "PGO", "SFP"];

const FACILITY_TYPES = [
  "Foster Care",
  "Kinship Care",
  "ILS/SIL/TSIL",
  "Community Group Care",
  "Agency Campus-based Treatment Centre",
  "Ministry Campus-based Treatment Centre",
  "Personalized Community Care",
  "Secure Services / PSECA Confident",
  "PSECA (Voluntary)",
  "Other No placement",
];

const TYPE_OF_INCIDENT = [
  "Accident",
  "Allegations of Abuse/ Neglect allegations related to (must also select appropriate purported maltreater Sub categories).",
  "Absent from Care/ Unauthorized Absence",
  "Child Criminal Activity/Charges/Offences (or potential of)",
  "Staff/Staff Criminal Activity/Charges/Offences (or potential of)",
  "Death of the Child",
  "Destruction",
  "Fire",
  "Infectious Disease",
  "Level of harm (must also select appropriate subcategories)",
  "Purported Perpetrator",
  "Medication Error/ Medication Concern",
  "Medical attention was required for (must also select appropriate subcategories)",
  "Placement Disruption",
  "Self-harm/ Self-injury",
  "Sexually Problematic Behaviours",
  "Substance Use/Abuse (must also select appropriate sub-categories). Use or use occurred,",
  "Suicide Attempt/ Suicidal Ideation",
  "Weapons",
  "Violence/ Aggression",
  "Victimization",
  "Injury to Staff/Staff Level of harm (must also select appropriate sub-categories)",
];

/* Nested choices based on your screenshots */
const ALLEGATION_SUB = [
  "Current Staff/Staff",
  "Program/ House peer",
  "Parent /Guardian",
  "Previous Staff",
  "Community member",
  "Other (Please describe)",
];

const HARM_CHILD_SUB = [
  "Minor injury (non-life threatening, may or may not have required first aid attention)",
  "Moderate injury (non-life threatening, medical attention required)",
  "Serious Injury to Child (life-threatening OR significant impairment to child’s health)",
];

const PERPETRATOR_SUB = [
  "Injury by self",
  "Injury by program peer",
  "Injury by staff/Staff",
  "Injury by community member",
  "Other (Please describe)",
  "Unknown",
];

const MEDICAL_REQUIRED_FOR = ["Child", "Program/ house peer", "Staff/Staff"];

const SUBSTANCE_USE_SUB = [
  "In licensed facility or placement/home",
  "Outside of licensed facility or placement/home",
];

const STAFF_HARM_SUB = [
  "Minor injury (non-life threatening, may or may not have required first aid attention)",
  "Moderate injury (non-life threatening, medical attention required)",
  "Serious Injury (life-threatening OR significant impairment to staff’s health)",
];

const STAFF_PERPETRATOR_SUB = [
  "Accidental (self)",
  "Injury by child/youth in program/house",
  "Injury by staff/Staff",
  "Injury by community member",
  "Other (Please describe)",
];

/* Intrusive / Restrictive */
const INTRUSIVE_MEASURES = [
  "Use of monitoring and/or restricting private communication",
  "Surveillance",
  "Room search",
  "Personal search",
  "Voluntary surrender",
  "Restricting access to or confiscating personal property",
];

const RESTRICTIVE_PROCEDURES = [
  "Physical restraint (physical escort, seated, supine, standing, and/or floor restraint)",
  "Isolation room (locked confinement)",
  "Inclusionary time out",
  "Exclusionary time out",
];

const PROHIBITED = ["Use of a Prohibited Practice(s)"];

/* Notifications */
const NOTIFICATIONS = [
  "CFS Intervention Practitioner",
  "Response Team (CIRT)",
  "Child’s Family",
  "OCYA Complaints Officer",
];

/* ================== SMALL UI HELPERS ================== */

function SectionTitle({ children, required }) {
  return (
    <Text style={styles.sectionTitle}>
      {children}
      {required ? <Text style={{ color: "#DC2626" }}> *</Text> : null}
    </Text>
  );
}

function Label({ children, required }) {
  return (
    <Text style={styles.label}>
      {children} {required ? <Text style={{ color: "#DC2626" }}>*</Text> : null}
    </Text>
  );
}

function Input({ value, onChangeText, placeholder }) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
        placeholderTextColor="#6B7280" 
      style={styles.input}
    />
  );
}

function TextArea({ value, onChangeText, placeholder, height = 120 }) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor="#6B7280" 
      multiline
      style={[styles.textArea, { height }]}
      textAlignVertical="top"
    />
  );
}

function CheckRow({ label, checked, onPress, indent = 0 }) {
  return (
    <Pressable onPress={onPress} style={[styles.checkRow, { marginLeft: indent }]}>
      <View style={[styles.checkbox, checked && styles.checkboxOn]}>
        {checked ? <MaterialCommunityIcons name="check" size={14} color="#fff" /> : null}
      </View>
      <Text style={styles.checkText}>{label}</Text>
    </Pressable>
  );
}

function RadioRow({ label, selected, onPress }) {
  return (
    <Pressable onPress={onPress} style={styles.radioRow}>
      <View style={[styles.radioOuter, selected && styles.radioOuterOn]}>
        {selected ? <View style={styles.radioInner} /> : null}
      </View>
      <Text style={styles.checkText}>{label}</Text>
    </Pressable>
  );
}

/* ================== MAIN MODAL ================== */

export default function CriticalIncidentModal({
  visible,
  onClose,
  shift,
  onSubmit,
  onSaveDraft,
}) {
  const insets = useSafeAreaInsets();

  const initial = useMemo(
    () => ({
      /* Client */
      clientName: shift?.clientName || "",
      cyimId: shift?.clientId || "",
      cipOffice: "",
      dob: shift?.dob || "",
      cipName: "",
      centralOffice: "",
      cfgStatus: [],

      /* Facility */
      agencyName: "Family Forever Inc.",
      staffIdLicense: shift?.userId || "",
      facilityStaffAddress: "",
      facilityType: [],
      facilitySpecify: "",

      /* Incident background */
      personCompletingReport: shift?.name || "",
      incidentDate: "",
      incidentEndReturnTime: "",
      titleRole: "",
      incidentOccurrenceTime: "",
      incidentLocationDescription: "",
      whoInvolvedWitnesses: "",

      /* Type of incident + nested */
      typeOfIncident: [],
      allegationSub: [],
      harmChildSub: [],
      perpetratorSub: [],
      perpetratorOther: "",
      medicalRequiredFor: [],
      substanceUseSub: [],
      staffHarmSub: [],
      staffPerpetratorSub: [],

      /* Intrusive / Restrictive */
      intrusiveMeasures: [],
      restrictiveProcedures: [],
      prohibitedPractices: [],
      intrusiveSpecify: "",
      restrictiveSpecify: "",

      /* Incident details */
      precedingEvents: "",
      contributeFactors: "",
      incidentDescriptions: "",
      mitigationApproaches: "",
      safetyPlan: "",
      continuousImprovement: "",

      /* Restrictive procedures section */
      debriefCompleted: null, // true/false
      debriefPrecedingEvents: "",
      informedRights: null, // true/false

      /* Notifications */
      notifications: [], // keys from NOTIFICATIONS
      notificationDetails: {
        "CFS Intervention Practitioner": { time: "", name: "" },
        "Response Team (CIRT)": { time: "", name: "" },
        "Child’s Family": { time: "", name: "" },
        "OCYA Complaints Officer": { time: "", name: "" },
      },

      /* Signature */
      employeeSignature: shift?.name || "",
      date: shift?.startDate || "",
    }),
    [shift]
  );

  const [form, setForm] = useState(initial);

  useEffect(() => {
    if (!visible) return;
    setForm(initial);
  }, [visible, initial]);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const toggleArr = (key, value) => {
    setForm((p) => {
      const arr = p[key] || [];
      const exists = arr.includes(value);
      return { ...p, [key]: exists ? arr.filter((x) => x !== value) : [...arr, value] };
    });
  };

  const toggleNotification = (label) => toggleArr("notifications", label);

  const validate = () => {
    if (!form.clientName?.trim()) return "Client Name is required";
    if (!form.whoInvolvedWitnesses?.trim()) return "Who was involved is required";
    if (!form.typeOfIncident.length) return "Please select at least one Type of Incident";
    return null;
  };

  const handleDraft = () => {
    onSaveDraft?.(form);
    // optional: close after draft
    // onClose?.();
    alert("Draft saved (local callback). Hook Firestore next.");
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
            paddingTop: 12 + insets.top, // ✅ notch fix
          }}
        >
          {/* TOP HEADER */}
          <View style={styles.topCard}>
            <View style={styles.topIconRed}>
              <MaterialCommunityIcons name="alert" size={18} color="#DC2626" />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.topTitle}>Critical Incident Report</Text>
              <Text style={styles.topSub}>
                Complete all sections thoroughly - This report is confidential and protected
              </Text>
            </View>

            <Pressable onPress={onClose} hitSlop={10} style={styles.closeBtn}>
              <MaterialCommunityIcons name="close" size={20} color="#111827" />
            </Pressable>
          </View>

          {/* ================= CLIENT INFO ================= */}
          <SectionTitle required>Client Information</SectionTitle>

          <Label>Client Name</Label>
          <Input
            value={form.clientName}
            onChangeText={(t) => set("clientName", t)}
            placeholder="Please select the type of service"
          />

          <Label>CYIM ID Number</Label>
          <Input
            value={form.cyimId}
            onChangeText={(t) => set("cyimId", t)}
            placeholder="Please enter the phone number"
          />

          <Label>CIP Office</Label>
          <Input
            value={form.cipOffice}
            onChangeText={(t) => set("cipOffice", t)}
            placeholder="Please enter the phone number"
          />

          <Label>Date of Birth</Label>
          <Input
            value={form.dob}
            onChangeText={(t) => set("dob", t)}
            placeholder="Please select the service start details"
          />

          <Label>Client Intervention Practitioner (CIP)</Label>
          <Input
            value={form.cipName}
            onChangeText={(t) => set("cipName", t)}
            placeholder="Please enter the e-mail"
          />

          <Label>Central Office</Label>
          <Input
            value={form.centralOffice}
            onChangeText={(t) => set("centralOffice", t)}
            placeholder="Please enter the e-mail"
          />

         <Label>CFG Status</Label>

<View style={styles.cfgWrap}>
  {CFG_STATUS.map((s) => {
    const checked = form.cfgStatus.includes(s);
    return (
      <Pressable
        key={s}
        onPress={() => toggleArr("cfgStatus", s)}
        style={styles.cfgItem}
      >
        <View style={[styles.cfgBox, checked && styles.cfgBoxOn]}>
          {checked ? (
            <MaterialCommunityIcons name="check" size={14} color="#fff" />
          ) : null}
        </View>
        <Text style={styles.cfgText}>{s}</Text>
      </Pressable>
    );
  })}
</View>


          {/* ================= FACILITY ================= */}
          <SectionTitle required>Facility Information</SectionTitle>

          <Label>Name of Agency</Label>
          <Input
            value={form.agencyName}
            onChangeText={(t) => set("agencyName", t)}
            placeholder="Please select the type of service"
          />

          <Label>Staff ID / License# (if applicable)</Label>
          <Input
            value={form.staffIdLicense}
            onChangeText={(t) => set("staffIdLicense", t)}
            placeholder="Please enter the phone number"
          />

          <Label>Facility Staff Address</Label>
          <Input
            value={form.facilityStaffAddress}
            onChangeText={(t) => set("facilityStaffAddress", t)}
            placeholder="Please select the service start details"
          />

          <Label>Type of Facility</Label>
          {FACILITY_TYPES.map((t) => (
            <CheckRow
              key={t}
              label={t}
              checked={form.facilityType.includes(t)}
              onPress={() => toggleArr("facilityType", t)}
            />
          ))}

          <Label>Please Specify</Label>
          <Input
            value={form.facilitySpecify}
            onChangeText={(t) => set("facilitySpecify", t)}
            placeholder="Write down the type of facility for no placement"
          />

          {/* ================= INCIDENT BACKGROUND ================= */}
          <SectionTitle required>Incident Background</SectionTitle>

          <Label>Name of Person Completing Report</Label>
          <Input
            value={form.personCompletingReport}
            onChangeText={(t) => set("personCompletingReport", t)}
            placeholder="Person Completing Report"
          />

          <Label>Date of Incident (YYY-MM-DD)</Label>
          <Input
            value={form.incidentDate}
            onChangeText={(t) => set("incidentDate", t)}
            placeholder="Please enter the phone number"
          />

          <Label>Time of Incident End/ Return Time</Label>
          <Input
            value={form.incidentEndReturnTime}
            onChangeText={(t) => set("incidentEndReturnTime", t)}
            placeholder="Please enter the phone number"
          />

          <Label>Title/Position/Role</Label>
          <Input
            value={form.titleRole}
            onChangeText={(t) => set("titleRole", t)}
            placeholder="What is the position of the staff"
          />

          <Label>Time of Incident Occurrence</Label>
          <Input
            value={form.incidentOccurrenceTime}
            onChangeText={(t) => set("incidentOccurrenceTime", t)}
            placeholder="What is the position of the staff"
          />

          <Label>Description of Incident Location</Label>
          <Input
            value={form.incidentLocationDescription}
            onChangeText={(t) => set("incidentLocationDescription", t)}
            placeholder="What is the position of the staff"
          />

          <Label required>Description of who was involved in the incident including any witness (es)</Label>
          <TextArea
            value={form.whoInvolvedWitnesses}
            onChangeText={(t) => set("whoInvolvedWitnesses", t)}
            placeholder="Write down description who was involved during the incident"
            height={140}
          />

          {/* ================= TYPE OF INCIDENT ================= */}
          <SectionTitle required>Type of Incident</SectionTitle>
          <Text style={styles.helper}>
            Identify the type of Incident (Select as many Categories as apply to the incident that has occured)
          </Text>

          {TYPE_OF_INCIDENT.map((t) => (
            <View key={t}>
              <CheckRow
                label={t}
                checked={form.typeOfIncident.includes(t)}
                onPress={() => toggleArr("typeOfIncident", t)}
              />

              {/* Nested: Allegations */}
              {t.startsWith("Allegations") && form.typeOfIncident.includes(t) ? (
                <View style={{ marginTop: 6, marginBottom: 8 }}>
                  {ALLEGATION_SUB.map((s) => (
                    <CheckRow
                      key={s}
                      label={s}
                      indent={22}
                      checked={form.allegationSub.includes(s)}
                      onPress={() => toggleArr("allegationSub", s)}
                    />
                  ))}
                </View>
              ) : null}

              {/* Nested: Level of harm (child) */}
              {t.startsWith("Level of harm") && form.typeOfIncident.includes(t) ? (
                <View style={{ marginTop: 6, marginBottom: 8 }}>
                  {HARM_CHILD_SUB.map((s) => (
                    <CheckRow
                      key={s}
                      label={s}
                      indent={22}
                      checked={form.harmChildSub.includes(s)}
                      onPress={() => toggleArr("harmChildSub", s)}
                    />
                  ))}
                 
                </View>
              ) : null}

{/* Nested: Purported Perpetrator */}
{t === "Purported Perpetrator" && form.typeOfIncident.includes(t) ? (
  <View style={{ marginTop: 6, marginBottom: 8 }}>
    {PERPETRATOR_SUB.map((s) => (
      <CheckRow
        key={s}
        label={s}
        indent={22}
        checked={form.perpetratorSub.includes(s)}
        onPress={() => toggleArr("perpetratorSub", s)}
      />
    ))}

    {/* Show "Please describe" input only if Other is checked */}
    {form.perpetratorSub.includes("Other (Please describe)") ? (
      <TextInput
        value={form.perpetratorOther}
        onChangeText={(v) => set("perpetratorOther", v)}
        placeholder="Please describe"
        placeholderTextColor="#6B7280"
        style={[styles.input, { marginLeft: 22 }]}
      />
    ) : null}
  </View>
) : null}



              {/* Nested: Medical attention required for */}
              {t.startsWith("Medical attention") && form.typeOfIncident.includes(t) ? (
                <View style={{ marginTop: 6, marginBottom: 8 }}>
                  {MEDICAL_REQUIRED_FOR.map((s) => (
                    <CheckRow
                      key={s}
                      label={s}
                      indent={22}
                      checked={form.medicalRequiredFor.includes(s)}
                      onPress={() => toggleArr("medicalRequiredFor", s)}
                    />
                  ))}
                </View>
              ) : null}

              {/* Nested: Substance Use */}
              {t.startsWith("Substance Use") && form.typeOfIncident.includes(t) ? (
                <View style={{ marginTop: 6, marginBottom: 8 }}>
                  {SUBSTANCE_USE_SUB.map((s) => (
                    <CheckRow
                      key={s}
                      label={s}
                      indent={22}
                      checked={form.substanceUseSub.includes(s)}
                      onPress={() => toggleArr("substanceUseSub", s)}
                    />
                  ))}
                </View>
              ) : null}

              {/* Nested: Injury to Staff */}
              {t.startsWith("Injury to Staff") && form.typeOfIncident.includes(t) ? (
                <View style={{ marginTop: 6, marginBottom: 8 }}>
                  {STAFF_HARM_SUB.map((s) => (
                    <CheckRow
                      key={s}
                      label={s}
                      indent={22}
                      checked={form.staffHarmSub.includes(s)}
                      onPress={() => toggleArr("staffHarmSub", s)}
                    />
                  ))}
                  <Text style={[styles.helper, { marginLeft: 22, marginTop: 6 }]}>
                    Purported Perpetrator
                  </Text>
                  {STAFF_PERPETRATOR_SUB.map((s) => (
                    <CheckRow
                      key={s}
                      label={s}
                      indent={22}
                      checked={form.staffPerpetratorSub.includes(s)}
                      onPress={() => toggleArr("staffPerpetratorSub", s)}
                    />
                  ))}
                </View>
              ) : null}
            </View>
          ))}

          {/* ================= INTRUSIVE / RESTRICTIVE ================= */}
          <SectionTitle>Incidents with use of Intrusive Measures and Restrictive Procedures</SectionTitle>
          <Text style={styles.helper}>
            Identify the type of response (select as many as apply) to the incident.
          </Text>

          <Label>Use of Intrusive Measures (must also select appropriate sub-categories)</Label>
          {INTRUSIVE_MEASURES.map((s) => (
            <CheckRow
              key={s}
              label={s}
              indent={10}
              checked={form.intrusiveMeasures.includes(s)}
              onPress={() => toggleArr("intrusiveMeasures", s)}
            />
          ))}

          <Label>Use of Restrictive Procedure (must also select appropriate sub-categories)</Label>
          {RESTRICTIVE_PROCEDURES.map((s) => (
            <CheckRow
              key={s}
              label={s}
              indent={10}
              checked={form.restrictiveProcedures.includes(s)}
              onPress={() => toggleArr("restrictiveProcedures", s)}
            />
          ))}

          <Label>Use of a Prohibited Practice(s)</Label>
          {PROHIBITED.map((s) => (
            <CheckRow
              key={s}
              label={s}
              indent={10}
              checked={form.prohibitedPractices.includes(s)}
              onPress={() => toggleArr("prohibitedPractices", s)}
            />
          ))}

          <Label>Please Specify</Label>
          <Input
            value={form.intrusiveSpecify}
            onChangeText={(t) => set("intrusiveSpecify", t)}
            placeholder="Write down the type of facility for no placement"
          />

          {/* <Label>Please Specify</Label>
          <Input
            value={form.restrictiveSpecify}
            onChangeText={(t) => set("restrictiveSpecify", t)}
            placeholder="Write down the type of facility for no placement"
          /> */}

          {/* ================= INCIDENT DETAILS ================= */}
          <SectionTitle required>Incident Details</SectionTitle>

          <Label>Preceding Events</Label>
          <TextArea
            value={form.precedingEvents}
            onChangeText={(t) => set("precedingEvents", t)}
            placeholder="Write down preceding event"
            height={90}
          />

          <Label>Contribute Factors</Label>
          <TextArea
            value={form.contributeFactors}
            onChangeText={(t) => set("contributeFactors", t)}
            placeholder="Provide a description of factors including environmental that may have contributed to the incident."
            height={110}
          />

          <Label>Incident Descriptions</Label>
          <TextArea
            value={form.incidentDescriptions}
            onChangeText={(t) => set("incidentDescriptions", t)}
            placeholder="Provide a description of the events in chronological order. Include details relating to who, what, when and where the incident occurred."
            height={130}
          />

          <Label>Mitigation Approaches</Label>
          <TextArea
            value={form.mitigationApproaches}
            onChangeText={(t) => set("mitigationApproaches", t)}
            placeholder="Description of actions and measures taken to proactively problem solve, de-escalate, manage and mitigate the incident."
            height={120}
          />

          <Label>Safety Plan</Label>
          <TextArea
            value={form.safetyPlan}
            onChangeText={(t) => set("safetyPlan", t)}
            placeholder="Provide a description of child safety plan created following the incident (Where applicable)"
            height={120}
          />

          <Label>Continuous Improvement</Label>
          <TextArea
            value={form.continuousImprovement}
            onChangeText={(t) => set("continuousImprovement", t)}
            placeholder="Description of any follow up, recommendations, and continuous improvement measures that may be required to prevent a similar incident from occurring in the future."
            height={130}
          />

          {/* ================= RESTRICTIVE PROCEDURES (RADIOS) ================= */}
          <SectionTitle required>Restrictive Procedures</SectionTitle>

          <View style={styles.radioCard}>
            <Text style={styles.label}>Was a debrief completed with the child?</Text>
            <View style={{ flexDirection: "row", gap: 18, marginTop: 10 }}>
              <RadioRow
                label="Yes"
                selected={form.debriefCompleted === true}
                onPress={() => set("debriefCompleted", true)}
              />
              <RadioRow
                label="No"
                selected={form.debriefCompleted === false}
                onPress={() => set("debriefCompleted", false)}
              />
            </View>
          </View>

          <Label>Preceding Events</Label>
          <Input
            value={form.debriefPrecedingEvents}
            onChangeText={(t) => set("debriefPrecedingEvents", t)}
            placeholder="Write down preceding event"
          />

          <View style={styles.radioCard}>
            <Text style={styles.label}>
              During the debrief, was the child informed of their rights, available grievance procedures and access to the OCYA?
            </Text>
            <View style={{ flexDirection: "row", gap: 18, marginTop: 10 }}>
              <RadioRow
                label="Yes"
                selected={form.informedRights === true}
                onPress={() => set("informedRights", true)}
              />
              <RadioRow
                label="No"
                selected={form.informedRights === false}
                onPress={() => set("informedRights", false)}
              />
            </View>
          </View>

          {/* ================= NOTIFICATIONS ================= */}
          <SectionTitle required>Notifications</SectionTitle>

          {NOTIFICATIONS.map((n) => {
            const checked = form.notifications.includes(n);
            const details = form.notificationDetails[n];

            return (
              <View key={n} style={{ marginBottom: 10 }}>
                <CheckRow
                  label={n}
                  checked={checked}
                  onPress={() => toggleNotification(n)}
                />

                {checked ? (
                  <View style={{ marginLeft: 28, marginTop: 8 }}>
                    <Label>Time of Incident End/ Return Time</Label>
                    <Input
                      value={details?.time || ""}
                      onChangeText={(t) =>
                        setForm((p) => ({
                          ...p,
                          notificationDetails: {
                            ...p.notificationDetails,
                            [n]: { ...(p.notificationDetails[n] || {}), time: t },
                          },
                        }))
                      }
                      placeholder="Please enter the timeline of report"
                    />

                    <Label>Name of Person (If applicable)</Label>
                    <Input
                      value={details?.name || ""}
                      onChangeText={(t) =>
                        setForm((p) => ({
                          ...p,
                          notificationDetails: {
                            ...p.notificationDetails,
                            [n]: { ...(p.notificationDetails[n] || {}), name: t },
                          },
                        }))
                      }
                      placeholder="Please enter the name of the person"
                    />
                  </View>
                ) : null}
              </View>
            );
          })}

          {/* ================= SUBMISSION BOX ================= */}
          <View style={styles.submitCard}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <View style={styles.submitIcon}>
                <MaterialCommunityIcons name="alert" size={18} color="#DC2626" />
              </View>
              <Text style={styles.submitTitle}>Critical Incident Report Submission</Text>
            </View>

            <Text style={styles.submitText}>
              This report must be submitted immediately upon completion. Management will be automatically notified.
              Ensure all sections are complete and accurate as this is a legal document.
            </Text>

            <View style={{ flexDirection: "row", gap: 12, marginTop: 12 }}>
              <Pressable onPress={handleDraft} style={styles.draftBtn}>
                <Text style={styles.draftText}>Save Draft</Text>
              </Pressable>

              <Pressable onPress={handleSubmit} style={styles.submitBtn}>
                <Text style={styles.submitBtnText}>Report Critical Incident</Text>
              </Pressable>
            </View>
          </View>

          <View style={{ height: 30 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/* ================== STYLES ================== */

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
  topIconRed: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: "#FEE2E2",
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

  sectionTitle: { marginTop: 18, marginBottom: 10, fontSize: 13, fontWeight: "900", color: "#111827" },
  label: { fontSize: 12, fontWeight: "800", color: "#111827", marginBottom: 6 },

  helper: { fontSize: 11.5, color: "#6B7280", fontWeight: "600", marginBottom: 10 },

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

  checkRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
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
  checkboxOn: { backgroundColor: "#14532D", borderColor: "#14532D" },
  checkText: { fontSize: 13, fontWeight: "700", color: "#111827", flex: 1 },

  radioCard: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  radioRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  radioOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: "#9CA3AF",
    alignItems: "center",
    justifyContent: "center",
  },
  radioOuterOn: { borderColor: "#16A34A" },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#16A34A" },

  submitCard: {
    marginTop: 14,
    backgroundColor: "#FEF2F2",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FCA5A5",
    padding: 14,
  },
  submitIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
  },
  submitTitle: { fontSize: 12.5, fontWeight: "900", color: "#DC2626", flex: 1 },
  submitText: { marginTop: 8, fontSize: 11.5, lineHeight: 16, color: "#DC2626", fontWeight: "600" },

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
    backgroundColor: "#DC2626",
  },
  submitBtnText: { textAlign: "center", fontWeight: "900", color: "#fff" },
  cfgWrap: {
  flexDirection: "row",
  flexWrap: "wrap",
  gap: 10,
  marginTop: 8,
  marginBottom: 10,
},
cfgItem: {
  flexDirection: "row",
  alignItems: "center",
  gap: 8,
  paddingVertical: 6,
  paddingHorizontal: 10,
  borderWidth: 1,
  borderColor: "#E5E7EB",
  borderRadius: 10,
  backgroundColor: "#fff",
},
cfgBox: {
  width: 18,
  height: 18,
  borderRadius: 4,
  borderWidth: 1,
  borderColor: "#D1D5DB",
  backgroundColor: "#fff",
  alignItems: "center",
  justifyContent: "center",
},
cfgBoxOn: {
  backgroundColor: "#14532D",
  borderColor: "#14532D",
},
cfgText: {
  fontSize: 12.5,
  fontWeight: "800",
  color: "#111827",
},

};
