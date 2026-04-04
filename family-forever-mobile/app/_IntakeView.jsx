import React from "react";
import { View, Text, Image } from "react-native";

const LABEL = "#111827";
const VALUE = "#6B7280";
const BORDER = "#E5E7EB";
const CARD_BG = "#FFFFFF";

const IntakeView = ({ intakeData }) => {
  if (!intakeData) return null;

  // Normalize clients data from various form versions
  const clients = (() => {
    // 1. Newest structure: 'clients' object (keys like 0, 1)
    if (intakeData.clients && typeof intakeData.clients === "object" && !Array.isArray(intakeData.clients)) {
      return Object.values(intakeData.clients).map(c => ({
        ...c,
        name: c.fullName || c.name || "Unnamed Client",
        dob: c.birthDate || c.dob || "",
        address: c.address || "",
        criticalMedicalConcerns: c.medicalNotes || c.criticalMedicalConcerns || "",
        anyDiagnosis: c.diagnosis || c.anyDiagnosis || "",
        // parent mapping for newer forms
        parentName: c.parentName || "",
        relationship: c.relationship || "",
        parentPhone: c.parentPhone || "",
        parentEmail: c.parentEmail || "",
        parentAddress: c.parentAddress || ""
      }));
    }
    // 2. Middle structure: 'inTakeClients' array or 'shiftPoints' array
    const arraySource = intakeData.inTakeClients || intakeData.shiftPoints;
    if (Array.isArray(arraySource)) {
      return arraySource.map(c => ({
        ...c,
        name: c.name || c.fullName || "Unnamed Client",
        dob: c.dob || c.birthDate || "",
        healthCareNumber: c.healthCareNumber || c.UID || c.healthCareNo || ""
      }));
    }
    // 3. Fallback: Check for top-level name
    const topLevelName = intakeData.clientName || intakeData.name || intakeData.nameInClientTable || intakeData.childName;
    if (topLevelName) {
      return [{
        name: topLevelName,
        dob: intakeData.dateOfBirth || intakeData.dob || "",
        address: intakeData.address || intakeData.location || "",
        criticalMedicalConcerns: intakeData.medicalConcerns || intakeData.criticalMedicalConcerns || "",
        parentName: intakeData.parentName || "",
      }];
    }
    return [];
  })();

  return (
    <View style={styles.container}>
      {/* ================= INFO ================= */}
      <Section title="Info">
        <Field label="Name" value={intakeData.nameInClientTable || intakeData.name} />
        <Field label="Client Code" value={intakeData.clientCode} />
        <Field label="Client Status" value={intakeData.clientStatus} />
        <Field label="Date of Intake" value={intakeData.dateOfInTake || intakeData.date} />
      </Section>

      {/* ================= SERVICES ================= */}
      <Section title="Services / Support">
        <Field
          label="Type of Services"
          value={(intakeData.serviceRequired || []).join(", ")}
        />
        <Field label="Service Start Date" value={intakeData.serviceStartDate} />
        <Field label="Agency" value={intakeData.agencyName} />
        <Field label="Agency Address" value={intakeData.agencyAddress} />
        <Field label="In-Take Worker" value={intakeData.inTakeWorkerInfo} />
        <Field label="Case Worker Info" value={intakeData.caseWorkerInfo} />
        <Field
          label="Support Description"
          value={intakeData.description || intakeData.servicePlanAndRisk}
          multiline
        />
      </Section>

      {/* ================= CLIENT INFO ================= */}
      <Section title="Client Info">
        {clients.length === 0 ? (
          <Empty text="No client info available." />
        ) : (
          clients.map((client, index) => (
            <SubCard key={`client-${index}`} title={`Client ${index + 1}`}>
              <Field label="Name" value={client.name} />
              <Field label="Gender" value={client.gender} />
              <Field label="Date of Birth" value={client.dob} />
              <Field label="Address" value={client.address} />
              <Field label="Start Date" value={client.serviceStartDate} />
              <Field
                label="Client Info"
                value={client.otherServiceConcerns || client.parentInfo}
                multiline
              />
            </SubCard>
          ))
        )}
      </Section>

      {/* ================= PARENTS INFO ================= */}
      <Section title="Parents Info">
        {clients.length === 0 ? (
          <Empty text="No parent info available." />
        ) : (
          clients.map((client, index) => (
            <SubCard key={`parent-${index}`} title={`Parent / Caregiver ${index + 1}`}>
              <Field label="Name" value={client.parentName} />
              <Field label="Relationship" value={client.relationship} />
              <Field label="Phone No" value={client.parentPhone} />
              <Field label="E-mail" value={client.parentEmail} />
              <Field label="Parent Address" value={client.parentAddress} multiline />
            </SubCard>
          ))
        )}
      </Section>

      {/* ================= MEDICAL INFO ================= */}
      <Section title="Medical Info">
        {clients.length === 0 ? (
          <Empty text="No medical info available." />
        ) : (
          clients.map((client, index) => (
            <SubCard key={`medical-${index}`} title={`Medical (Client ${index + 1})`}>
              <Field label="Healthcare Number" value={client.healthCareNumber} />
              <Field label="Any Diagnosis" value={client.anyDiagnosis} />
              <Field label="Diagnosis Type" value={client.diagnosisType} />
              <Field
                label="Critical Medical Concerns"
                value={client.criticalMedicalConcerns}
                multiline
              />
              <Field
                label="Mobility Assistance Required"
                value={client.mobilityAssistanceRequired}
              />
            </SubCard>
          ))
        )}
      </Section>

      {/* ================= VISIT / TRANSPORT ================= */}
      <Section title="Visit / Transportation">
        {clients.length === 0 ? (
          <Empty text="No visit/transport info available." />
        ) : (
          clients.map((client, index) => (
            <SubCard key={`visit-${index}`} title={`Visit (Client ${index + 1})`}>
              <Field label="Visit Duration" value={client.visitDuration} />
              <Field label="Purpose of Visit" value={client.purposeOfVisit} multiline />
              <Field label="Visit Address" value={client.visitAddress} multiline />
              <Field label="Visit Overview" value={client.visitOverView} multiline />
            </SubCard>
          ))
        )}
      </Section>

      {/* ================= ACKNOWLEDGEMENT ================= */}
      <Section title="Acknowledgement">
        <Field label="Name" value={intakeData.nameOfPerson} />
        <Field label="Date" value={intakeData.date} />

        <View style={{ marginTop: 10 }}>
          <Text style={styles.label}>Work Signature</Text>
          {intakeData.signature ? (
            <View style={styles.signatureWrap}>
              <Image
                source={{ uri: intakeData.signature }}
                style={styles.signature}
                resizeMode="contain"
              />
            </View>
          ) : (
            <Text style={styles.value}>--</Text>
          )}
        </View>
      </Section>
    </View>
  );
};

/* ================= SMALL COMPONENTS ================= */

function Section({ title, children }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function Field({ label, value, multiline = false }) {
  const display = value && String(value).trim().length ? String(value) : "--";
  return (
    <View style={[styles.fieldRow, multiline && { alignItems: "flex-start" }]}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, multiline && { lineHeight: 18 }]}>{display}</Text>
    </View>
  );
}

function SubCard({ title, children }) {
  return (
    <View style={styles.subCard}>
      <Text style={styles.subCardTitle}>{title}</Text>
      <View style={{ marginTop: 8 }}>{children}</View>
    </View>
  );
}

function Empty({ text }) {
  return <Text style={styles.emptyText}>{text}</Text>;
}

/* ================= STYLES ================= */

const styles = {
  container: {
    backgroundColor: CARD_BG,
    marginHorizontal: 20,
    marginTop: 20,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
  },

  section: {
    marginBottom: 16,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: LABEL,
    marginBottom: 10,
  },

  sectionBody: {
    backgroundColor: "#FAFAFA",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 16,
  },

  fieldRow: {
    marginBottom: 10,
  },

  label: {
    fontSize: 13,
    fontWeight: "800",
    color: LABEL,
    marginBottom: 4,
  },

  value: {
    fontSize: 14,
    fontWeight: "600",
    color: VALUE,
  },

  subCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 12,
    marginBottom: 12,
  },

  subCardTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: LABEL,
  },

  signatureWrap: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    backgroundColor: "#fff",
    padding: 10,
  },

  signature: {
    height: 110,
    width: "100%",
  },

  emptyText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#9CA3AF",
  },
};

export default IntakeView;
