/**
 * create-sahtaysha-intake.mjs
 * Creates a proper InTakeForms document for Sahtaysha Zylstra
 * from her existing clients collection record.
 * Uses the old-structure format so it works with both the web app and Flutter.
 *
 * Run: node create-sahtaysha-intake.mjs
 */

import { initializeApp } from "firebase/app";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  updateDoc,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAUmXXLprgpozG0nRh3QXskrhcNChXaw3M",
  authDomain: "famforeveradmin.firebaseapp.com",
  projectId: "famforeveradmin",
  storageBucket: "famforeveradmin.appspot.com",
  messagingSenderId: "849373739430",
  appId: "1:849373739430:web:5e3d88fbb3200dc3a43767",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const CLIENT_DOC_ID = "1735936156411";

async function createIntakeForm() {
  console.log("\n📦 Reading client record...");
  const clientRef = doc(db, "clients", CLIENT_DOC_ID);
  const clientSnap = await getDoc(clientRef);

  if (!clientSnap.exists()) {
    console.error("❌ Client doc not found!");
    process.exit(1);
  }

  const client = clientSnap.data();
  console.log(`✅ Found client: ${client.name}`);

  // Use the same ID as the client so they are linked
  const intakeId = CLIENT_DOC_ID;

  // Build the intake form using the OLD structure format
  // (inTakeClients array — compatible with both web app and Flutter)
  const intakeDoc = {
    // ── Identity ──
    nameInClientTable: client.name,
    familyName: client.name,

    // ── Date ──
    dateOfInTake: "03-01-2025",
    date: "03-01-2025",
    createdAt: "03 Jan 2025 12:00 AM",

    // ── Client list (old structure) ──
    inTakeClients: [
      {
        name: client.name,
        fullName: client.name,
        dob: client.dob || "",
        address: client.address || "",
        clientCode: client.clientCode || "",
        gender: client.gender || "",
        phone: client.phone || "",
        email: client.email || "",
        parentName: "",
        parentPhone: "",
        parentEmail: client.email || "",
        parentAddress: client.address || "",
        relationship: "",
        healthCareNumber: "",
        anyDiagnosis: "",
        diagnosisType: "",
        criticalMedicalConcerns: "",
        mobilityAssistanceRequired: "",
        mobilityAssistanceDetails: "",
        commAidRequired: "",
        commAidDetails: "",
        serviceRequired: ["Supervised Visitation"],
        serviceDetail: client.description || "",
        servicePlanAndRisk: "",
        otherServiceConcerns: client.description || "",
        childStatus: "",
        treatyNumber: "",
        cyimId: "",
        // Transportation / visitation
        pickupAddress: "",
        dropAddress: "",
        pickupTime: "",
        dropTime: "",
        transportOverView: "",
        typeOfSeat: "",
        carSeatRequired: "",
        visitAddress: "",
        startVisitTime: "",
        endVisitTime: "",
        visitDuration: "",
        purposeOfVisit: "",
        visitOverView: "",
        visitDocuments: [],
        // Photos
        photo: "",
      },
    ],

    // ── Worker info ──
    nameOfPerson: "",
    inTakeWorkerName: "",
    inTakeWorkerPhone: "",
    inTakeWorkerEmail: "",
    inTakeWorkerAgencyName: client.agencyName || "private",

    // ── Case worker ──
    caseWorkerName: "",
    caseWorkerPhone: "",
    caseWorkerEmail: "",
    caseWorkerAgencyName: "",

    // ── Agency / billing ──
    agencyName: client.agencyName || "private",
    agencyId: client.agencyId || "",
    agencyType: client.agencyType || "Private",
    clientId: CLIENT_DOC_ID,
    clientCode: client.clientCode || "",

    // ── Status ──
    status: "Accepted",
    clientsCreated: true,
    formType: "private",
    isCaseWorker: false,

    // ── Misc ──
    serviceDetail: client.description || "",
    signature: "",
  };

  console.log(`\n📝 Creating InTakeForms/${intakeId} ...`);

  await setDoc(doc(db, "InTakeForms", intakeId), intakeDoc);
  console.log(`✅ Intake form created for ${client.name}`);

  // Also update the client doc to link back to this intake form
  if (!client.intakeId) {
    await updateDoc(clientRef, { intakeId });
    console.log(`✅ Linked client doc to intakeId: ${intakeId}`);
  }

  console.log("\n✅ Done! Sahtaysha Zylstra will now appear in the intake forms dashboard.\n");
  process.exit(0);
}

createIntakeForm().catch((err) => {
  console.error("❌ Fatal error:", err);
  process.exit(1);
});
