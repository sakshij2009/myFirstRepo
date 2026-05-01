import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  getDocs,
  updateDoc,
  doc,
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

function buildInTakeClients(data) {
  let list = [];
  if (data.clients && typeof data.clients === "object") {
    list = Object.values(data.clients);
  } else if (data.shared?.children) {
    list = data.shared.children;
  } else if (data.inTakeClients && Array.isArray(data.inTakeClients)) {
    list = data.inTakeClients; // fallback if already there but missing fields
  }

  if (list.length === 0) {
    list = [{}]; // Add a dummy client if missing
  }

  return list.map(c => ({
    name: c.fullName || c.name || data.familyName || "",
    fullName: c.fullName || c.name || data.familyName || "",
    dob: c.birthDate || c.dob || "",
    address: c.address || "",
    clientCode: String(c.clientCode || data.clientCode || ""),
    gender: c.gender || "",
    phone: c.phone || "",
    email: c.email || "",
    typeOfSeat: c.typeOfSeat || "",
    dropAddress: c.dropAddress || "",
    visitAddress: c.visitAddress || "",
    mobilityAssistanceDetails: c.mobilityAssistanceDetails || "",
    childStatus: c.childStatus || "",
    serviceConcernList: Array.isArray(c.serviceConcernList) ? c.serviceConcernList : [],
    otherServiceConcerns: c.otherServiceConcerns || "",
    serviceDetail: c.serviceDetail || "",
    visitDuration: c.visitDuration || "",
    endVisitTime: c.endVisitTime || "",
    purposeOfVisit: c.purposeOfVisit || "",
    criticalMedicalConcerns: c.criticalMedicalConcerns || "",
    relationship: c.relationship || "",
    pickupTime: c.pickupTime || "",
    purposeOfTransportation: c.purposeOfTransportation || "",
    serviceStartDate: c.serviceStartDate || "",
    cyimId: c.cyimId || "",
    otherChildStatus: c.otherChildStatus || "",
    parentInfo: c.parentInfo || "",
    parentPhone: c.parentPhone || "",
    anyDiagnosis: c.anyDiagnosis || "",
    visitOverView: c.visitOverView || "",
    startVisitTime: c.startVisitTime || "",
    commAidDetails: c.commAidDetails || "",
    commAidRequired: c.commAidRequired || "",
    visitDocuments: Array.isArray(c.visitDocuments) ? c.visitDocuments : [],
    otherGender: c.otherGender || "",
    parentAddress: c.parentAddress || "",
    servicePlanAndRisk: c.servicePlanAndRisk || "",
    mobilityAssistanceRequired: c.mobilityAssistanceRequired || "",
    dropTime: c.dropTime || "",
    diagnosisType: c.diagnosisType || "",
    carSeatRequired: c.carSeatRequired || "",
    parentName: c.parentName || "",
    parentEmail: c.parentEmail || "",
    photo: c.photo || "",
    transportOverView: c.transportOverView || "",
    serviceRequired: Array.isArray(c.serviceRequired) ? c.serviceRequired : [],
    pickupAddress: c.pickupAddress || "",
    healthCareNumber: c.healthCareNumber || "",
  }));
}

async function fix() {
  console.log("Reading InTakeForms...");
  const snap = await getDocs(collection(db, "InTakeForms"));
  const toPatch = snap.docs.filter(d => d.data()._flutterCompat || d.data()._compatPatched);

  for (const d of toPatch) {
    const data = d.data();
    const inTakeClients = buildInTakeClients(data);
    await updateDoc(doc(db, "InTakeForms", d.id), { inTakeClients });
    console.log(`Updated inTakeClients for ${d.id}`);
  }

  // Also fix clients collection
  const clientsSnap = await getDocs(collection(db, "clients"));
  const clientsToPatch = clientsSnap.docs.filter(d => {
    const data = d.data();
    return data.avatar === undefined || data.parentEmail === undefined || data.agency === undefined || data.caseWorkerInfo === undefined || data.inTakeWorkerInfo === undefined;
  });

  for (const d of clientsToPatch) {
    const patch = {};
    const data = d.data();
    if (data.avatar === undefined) patch.avatar = "";
    if (data.parentEmail === undefined) patch.parentEmail = "";
    if (data.agency === undefined) patch.agency = "";
    if (data.caseWorkerInfo === undefined) patch.caseWorkerInfo = "";
    if (data.inTakeWorkerInfo === undefined) patch.inTakeWorkerInfo = "";
    if (data.UID === undefined) patch.UID = "";

    if (Object.keys(patch).length > 0) {
      await updateDoc(doc(db, "clients", d.id), patch);
      console.log(`Updated client ${d.id} with missing default fields.`);
    }
  }

  console.log("Done.");
  process.exit(0);
}

fix().catch(console.error);
