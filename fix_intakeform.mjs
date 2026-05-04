import { readFileSync, writeFileSync } from 'fs';

const path = './src/components/IntakeForm.jsx';
let content = readFileSync(path, 'utf8');

const startMarker = '      // ================== FINAL PAYLOAD ==================';
const endMarker   = '      // ================== SAVE INTAKE ==================';

const startIdx = content.indexOf(startMarker);
const endIdx   = content.indexOf(endMarker, startIdx);

if (startIdx === -1 || endIdx === -1) {
  console.error('Markers not found!', startIdx, endIdx);
  process.exit(1);
}

// Detect line ending style used in the file
const CRLF = '\r\n';

const newSection =
`      // ================== LEGACY FIELDS (backward compat for old Flutter app) ==================\r
      // The old Flutter app reads: inTakeClients (array), nameInClientTable, childsName,\r
      // dateOfInTake, nameOfPerson, servicePlanAndRisk, serviceRequired, etc.\r
      // We write them alongside the new structure so BOTH apps read the same Firestore document.\r
      const legacyInTakeClients = clientsWithPhotos.map((c) => {\r
        const parent = (values.parentInfoList || []).find(\r
          (p) => !p.clientName || p.clientName.includes(c.fullName)\r
        ) || {};\r
        const medical = (values.medicalInfoList || []).find(\r
          (m) => !m.clientName || m.clientName.includes(c.fullName)\r
        ) || {};\r
        const transport = (values.transportationInfoList || []).find(\r
          (t) => !t.clientName || t.clientName.includes(c.fullName)\r
        ) || {};\r
        const visit = (values.supervisedVisitations || []).find(\r
          (v) => !v.clientName || v.clientName.includes(c.fullName)\r
        ) || {};\r
        return {\r
          name: c.fullName || "",\r
          gender: c.gender || "",\r
          dob: c.birthDate || "",\r
          address: c.address || "",\r
          serviceStartDate: c.startDate || "",\r
          otherServiceConcerns: c.clientInfo || "",\r
          // Parent\r
          parentName: parent.parentName || "",\r
          relationship: parent.relationShip || "",\r
          parentPhone: parent.parentPhone || "",\r
          parentEmail: parent.parentEmail || "",\r
          parentAddress: parent.parentAddress || "",\r
          // Medical\r
          healthCareNumber: medical.healthCareNo || "",\r
          anyDiagnosis: (medical.diagnosis || medical.diagnosisType) ? "Yes" : "No",\r
          diagnosisType: medical.diagnosisType || medical.diagnosis || "",\r
          criticalMedicalConcerns: medical.medicalConcern || "",\r
          mobilityAssistanceRequired: medical.mobilityAssistance || "",\r
          mobilityAssistanceDetails: medical.mobilityInfo || "",\r
          commAidRequired: medical.communicationAid || "",\r
          commAidDetails: medical.communicationInfo || "",\r
          // Transportation\r
          pickupAddress: transport.pickupAddress || "",\r
          dropAddress: transport.dropoffAddress || "",\r
          pickupTime: transport.pickupTime || "",\r
          dropTime: transport.dropOffTime || "",\r
          typeOfSeat: transport.carSeatType || "",\r
          transportOverView: transport.transportationOverview || "",\r
          // Supervised Visit\r
          visitDuration: visit.visitDuration || "",\r
          purposeOfVisit: visit.visitPurpose || "",\r
          visitAddress: visit.visitAddress || "",\r
          visitOverView: visit.visitOverview || "",\r
          startVisitTime: visit.visitStartTime || "",\r
          endVisitTime: visit.visitEndTime || "",\r
        };\r
      });\r
\r
      const primaryClientName = clientsWithPhotos[0]?.fullName || values.familyName || "";\r
      const workerName = values.workerInfo?.workerName || user?.name || "";\r
\r
      // ================== FINAL PAYLOAD ==================\r
      const payload = {\r
        avatar: avatarPreview || null,\r
\r
        services: {\r
          ...values.services,\r
          serviceType: values.services.serviceType || [],\r
        },\r
\r
        clients: clientsObj,\r
\r
        billingInfo: values.billingInfo,\r
        parentInfoList: (values.parentInfoList || []).filter((p) =>\r
          p.parentName || p.parentPhone || p.parentEmail || p.relationShip || p.parentAddress\r
        ),\r
        medicalInfoList: (values.medicalInfoList || []).filter((m) =>\r
          m.healthCareNo || m.diagnosis || m.diagnosisType || m.medicalConcern || m.mobilityAssistance || m.mobilityInfo || m.communicationAid || m.communicationInfo\r
        ),\r
        transportationInfoList: (values.transportationInfoList || []).filter((t) =>\r
          t.pickupAddress || t.dropoffAddress || t.pickupTime || t.dropOffTime || t.transportationOverview || t.carSeatType\r
        ),\r
        supervisedVisitations: (values.supervisedVisitations || []).filter((s) =>\r
          s.visitStartTime || s.visitEndTime || s.visitDuration || s.visitPurpose || s.visitAddress || s.visitOverview\r
        ),\r
\r
        uploadedDocs: uploadedDocURLs,\r
\r
        workerInfo: {\r
          ...values.workerInfo,\r
          workerName: workerName,\r
          signature: signatureURL,\r
        },\r
\r
        intakeworkerName: values.intakeworkerName || "",\r
        agencyName: values.agencyName || "",\r
        intakeworkerPhone: values.intakeworkerPhone || "",\r
        intakeworkerEmail: values.intakeworkerEmail || "",\r
\r
        familyName: values.familyName || "",\r
\r
        isCaseWorker: !!isCaseWorker,\r
        status: values.status || "Submitted",\r
\r
        // Flag: clients auto-created when status changes to Accepted\r
        clientsCreated: values.clientsCreated || false,\r
\r
        // Admin edit access flag\r
        isEditable: mode === "update" ? (values.isEditable !== undefined ? values.isEditable : true) : true,\r
\r
        // submittedOn + createdAt are immutable — only set when creating a new form\r
        ...(mode !== "update" ? {\r
          submittedOn: formatReadableDate(new Date()),\r
          createdAt: formatReadableDate(new Date()),\r
        } : {}),\r
\r
        // Always track last update\r
        lastUpdatedAt: formatReadableDate(new Date()),\r
        lastUpdatedBy: workerName || user?.email || "Intake Worker",\r
\r
        // ── LEGACY FIELDS — required so the old Flutter app can read these documents ──\r
        // These duplicate key data in the old schema format alongside the new one.\r
        inTakeClients: legacyInTakeClients,\r
        nameInClientTable: primaryClientName,\r
        childsName: primaryClientName,\r
        dateOfInTake: values.workerInfo?.date || new Date().toISOString().split("T")[0],\r
        nameOfPerson: workerName,\r
        inTakeWorkerName: values.intakeworkerName || "",\r
        inTakeWorkerAgencyName: values.agencyName || "",\r
        inTakeWorkerPhone: values.intakeworkerPhone || "",\r
        inTakeWorkerEmail: values.intakeworkerEmail || "",\r
        servicePlanAndRisk: values.services?.safetyPlan || "",\r
        serviceDetail: values.services?.serviceDesc || "",\r
        serviceRequired: values.services?.serviceType || [],\r
        date: values.workerInfo?.date || "",\r
        signature: signatureURL,\r
        filledBy: workerName,\r
      };\r
\r
\r
`;

const newContent = content.substring(0, startIdx) + newSection + content.substring(endIdx);
writeFileSync(path, newContent, 'utf8');
console.log('SUCCESS. New file length:', newContent.length, '(was:', content.length, ')');
