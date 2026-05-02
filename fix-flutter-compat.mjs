/**
 * FIX TWO ISSUES:
 * 1. Re-add `inTakeClients` to new-structure InTakeForms docs
 *    (removed by cleanup, but Flutter needs it to show intake forms)
 * 2. Fix clients collection: remove `migratedAt:""` and fix `dob` format in shiftPoints
 *
 * Run: node fix-flutter-compat.mjs
 */

import { initializeApp } from "firebase/app";
import {
  getFirestore, collection, getDocs, updateDoc, doc, deleteField,
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

// ─── Fix 1: Re-build inTakeClients on new-structure InTakeForms docs ─────────
function buildInTakeClientsFromNewStructure(data) {
  // New structure uses clients: { client1: {...}, client2: {...} }
  if (data.clients && typeof data.clients === "object" && !Array.isArray(data.clients)) {
    return Object.values(data.clients).map(c => ({
      name:                    c.fullName || c.name || "",
      fullName:                c.fullName || c.name || "",
      dob:                     c.birthDate || c.dob || "",
      address:                 c.address || "",
      clientCode:              String(c.clientCode || ""),
      gender:                  c.gender || "",
      phone:                   c.phone || "",
      email:                   c.email || "",
      parentName:              c.parentName || "",
      parentPhone:             c.parentPhone || "",
      parentEmail:             c.parentEmail || "",
      parentAddress:           c.parentAddress || "",
      relationship:            c.relationship || "",
      healthCareNumber:        c.healthCareNumber || "",
      anyDiagnosis:            c.anyDiagnosis || "",
      diagnosisType:           c.diagnosisType || "",
      criticalMedicalConcerns: c.criticalMedicalConcerns || "",
      mobilityAssistanceRequired: c.mobilityAssistanceRequired || "",
      mobilityAssistanceDetails:  c.mobilityAssistanceDetails || "",
      commAidRequired:         c.commAidRequired || "",
      commAidDetails:          c.commAidDetails || "",
      serviceRequired:         Array.isArray(c.serviceRequired) ? c.serviceRequired : [],
      serviceDetail:           c.serviceDetail || "",
      servicePlanAndRisk:      c.servicePlanAndRisk || "",
      otherServiceConcerns:    c.otherServiceConcerns || "",
      childStatus:             c.childStatus || "",
      cyimId:                  c.cyimId || "",
      pickupAddress:           c.pickupAddress || "",
      dropAddress:             c.dropAddress || "",
      pickupTime:              c.pickupTime || "",
      dropTime:                c.dropTime || "",
      transportOverView:       c.transportOverView || "",
      typeOfSeat:              c.typeOfSeat || "",
      carSeatRequired:         c.carSeatRequired || "",
      visitAddress:            c.visitAddress || "",
      startVisitTime:          c.startVisitTime || "",
      endVisitTime:            c.endVisitTime || "",
      visitDuration:           c.visitDuration || "",
      purposeOfVisit:          c.purposeOfVisit || "",
      visitOverView:           c.visitOverView || "",
      visitDocuments:          Array.isArray(c.visitDocuments) ? c.visitDocuments : [],
      photo:                   c.photo || "",
    }));
  }

  // shared.children structure (Private Family forms)
  if (data.shared?.children && Array.isArray(data.shared.children)) {
    return data.shared.children.map(c => ({
      name:         c.fullName || c.name || "",
      fullName:     c.fullName || c.name || "",
      dob:          c.dob || "",
      gender:       c.gender || "",
      address:      "",
      clientCode:   "",
      phone:        "",
      email:        "",
      parentName:   "",
      parentPhone:  "",
      parentEmail:  "",
      parentAddress:"",
      relationship: "",
      healthCareNumber: "",
      anyDiagnosis: "",
      diagnosisType:"",
      criticalMedicalConcerns:"",
      mobilityAssistanceRequired:"",
      mobilityAssistanceDetails:"",
      commAidRequired:"",
      commAidDetails:"",
      serviceRequired:[],
      serviceDetail:"",
      servicePlanAndRisk:"",
      otherServiceConcerns:"",
      childStatus:"",
      cyimId:"",
      pickupAddress:"",
      dropAddress:"",
      pickupTime:"",
      dropTime:"",
      transportOverView:"",
      typeOfSeat:"",
      carSeatRequired:"",
      visitAddress:"",
      startVisitTime:"",
      endVisitTime:"",
      visitDuration:"",
      purposeOfVisit:"",
      visitOverView:"",
      visitDocuments:[],
      photo:"",
    }));
  }

  return [];
}

// ─── Fix 2: Convert dob from YYYY-MM-DD → DD-MM-YYYY ────────────────────────
function fixDobFormat(dob) {
  if (!dob) return dob;
  // Already DD-MM-YYYY
  if (/^\d{2}-\d{2}-\d{4}$/.test(dob)) return dob;
  // YYYY-MM-DD → DD-MM-YYYY
  if (/^\d{4}-\d{2}-\d{2}$/.test(dob)) {
    const [y, m, d] = dob.split("-");
    return `${d}-${m}-${y}`;
  }
  return dob;
}

async function fixInTakeForms() {
  console.log("\n📦 Fix 1: Re-adding inTakeClients to new-structure InTakeForms docs...");
  const snap = await getDocs(collection(db, "InTakeForms"));
  let fixed = 0;

  for (const d of snap.docs) {
    const data = d.data();
    const isNewStructure = (
      (data.clients && typeof data.clients === "object" && !Array.isArray(data.clients) &&
        Object.keys(data.clients).some(k => k.startsWith("client"))) ||
      (data.shared?.children && Array.isArray(data.shared.children))
    );

    if (!isNewStructure) continue; // Skip old-structure docs
    if (Array.isArray(data.inTakeClients) && data.inTakeClients.length > 0) {
      console.log(`  ⏭  ${d.id} — already has inTakeClients (${data.inTakeClients.length}), skipping`);
      continue;
    }

    const inTakeClients = buildInTakeClientsFromNewStructure(data);
    if (inTakeClients.length === 0) {
      console.log(`  ⚠️  ${d.id} — could not build inTakeClients, skipping`);
      continue;
    }

    // Also rebuild nameInClientTable (needed for Flutter list display)
    const clientName = inTakeClients[0]?.fullName || inTakeClients[0]?.name || data.familyName || "";

    await updateDoc(doc(db, "InTakeForms", d.id), {
      inTakeClients,
      nameInClientTable: clientName,
    });
    console.log(`  ✅ ${d.id} — rebuilt inTakeClients (${inTakeClients.length} client(s)) → "${clientName}"`);
    fixed++;
  }
  console.log(`\n  Total fixed: ${fixed} new-structure docs`);
}

async function fixClients() {
  console.log("\n📦 Fix 2: Cleaning clients collection (migratedAt, dob format in shiftPoints)...");
  const snap = await getDocs(collection(db, "clients"));
  let fixed = 0;

  for (const d of snap.docs) {
    const data = d.data();
    const patch = {};

    // Remove migratedAt if it's an empty string (injected by scripts)
    if ("migratedAt" in data && (data.migratedAt === "" || data.migratedAt === null)) {
      patch.migratedAt = deleteField();
    }

    // Fix dob format in shiftPoints array
    if (Array.isArray(data.shiftPoints) && data.shiftPoints.length > 0) {
      let changed = false;
      const fixedPoints = data.shiftPoints.map(sp => {
        if (!sp.dob) return sp;
        const fixed = fixDobFormat(sp.dob);
        if (fixed !== sp.dob) {
          changed = true;
          return { ...sp, dob: fixed };
        }
        return sp;
      });
      if (changed) patch.shiftPoints = fixedPoints;
    }

    if (Object.keys(patch).length === 0) continue;

    try {
      await updateDoc(doc(db, "clients", d.id), patch);
      const name = data.name || data.familyName || d.id;
      const actions = Object.keys(patch).join(", ");
      console.log(`  ✅ ${name} (${d.id}) — fixed: ${actions}`);
      fixed++;
    } catch (err) {
      console.error(`  ❌ ${d.id}:`, err.message);
    }
  }
  console.log(`\n  Total clients fixed: ${fixed}`);
}

async function run() {
  await fixInTakeForms();
  await fixClients();
  console.log("\n\n✅ All fixes applied. Refresh the Flutter app.\n");
  process.exit(0);
}

run().catch(err => {
  console.error("❌ Fatal:", err);
  process.exit(1);
});
