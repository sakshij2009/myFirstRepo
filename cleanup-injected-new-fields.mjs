/**
 * cleanup-injected-new-fields.mjs
 * 
 * Removes NEW-structure fields that were injected as empty strings ("") 
 * into OLD-structure InTakeForms docs (those with inTakeClients[]).
 * 
 * Flutter crashes when it tries to cast "" (String) as Map/List.
 * These fields should only exist on new-structure docs with REAL data.
 * 
 * Run: node cleanup-injected-new-fields.mjs
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

// Fields that are ONLY valid on new-structure docs with real Map/List values.
// If they exist on old-structure docs as empty strings or false, they MUST be deleted
// because Flutter will try to cast them and crash.
const NEW_STRUCTURE_FIELDS_TO_PURGE = [
  // List fields — Flutter does data['x'] as List → crashes if ""
  "parentInfoList",
  "transportationInfoList",
  "medicalInfoList",
  "supervisedVisitations",
  "uploadedDocs",
  // Map fields — Flutter does data['x'] as Map → crashes if ""
  "services",
  "clients",
  "workerInfo",
  // String fields that are injected defaults (not original data)
  "consentSignature",
  "consentForServices",
  "consentDate",
  "reasonForReferral",
  "presentingNeeds",
  "currentCustodyArrangement",
  "submittedAt",
  "submittedBy",
  "lastUpdatedAt",
  "lastUpdatedBy",
  "intakeworkerEmail",
  "intakeworkerName",
  "intakeworkerPhone",
  "familyName",       // empty string only — old docs use nameInClientTable
  // Bool flags injected as false
  "isCaseWorker",
  "clientsCreated",
  // Redundant id field (doc ID = Firestore doc ID already)
  "id",
];

// A field is safe to remove only if:
// - it doesn't exist, OR
// - it's an empty string "", OR
// - it's null/undefined, OR  
// - it's boolean false (for bool fields), OR
// - it's an empty array [] (for list fields that were injected empty)
// We NEVER remove fields that have actual real data.
function isSafeToRemove(value) {
  if (value === null || value === undefined) return true;
  if (value === "") return true;
  if (value === false) return true;
  if (Array.isArray(value) && value.length === 0) return true;
  if (typeof value === "object" && !Array.isArray(value) && Object.keys(value).length === 0) return true;
  return false;
}

// Detect old-structure docs (have inTakeClients[] with data)
function isOldStructure(data) {
  return Array.isArray(data.inTakeClients) && data.inTakeClients.length > 0;
}

// Detect new-structure docs (have clients{} object or shared.children[])
function isNewStructure(data) {
  return (
    (data.clients && typeof data.clients === "object" && !Array.isArray(data.clients) &&
      Object.keys(data.clients).some(k => k.startsWith("client"))) ||
    (data.shared?.children && Array.isArray(data.shared.children))
  );
}

async function cleanup() {
  console.log("\n📦 Reading InTakeForms collection...");
  const snap = await getDocs(collection(db, "InTakeForms"));
  console.log(`✅ Found ${snap.docs.length} docs.\n`);

  let cleaned = 0;
  let skipped = 0;

  for (const d of snap.docs) {
    const data = d.data();

    // Only clean old-structure docs
    // (new-structure docs should KEEP these fields — they have real data)
    if (!isOldStructure(data)) {
      // But if it has NO inTakeClients AND is not new-structure → still check
      if (isNewStructure(data)) {
        skipped++;
        continue;
      }
    }

    const payload = {};
    const removed = [];

    for (const field of NEW_STRUCTURE_FIELDS_TO_PURGE) {
      if (field in data && isSafeToRemove(data[field])) {
        payload[field] = deleteField();
        removed.push(field);
      }
    }

    if (removed.length === 0) {
      skipped++;
      continue;
    }

    try {
      await updateDoc(doc(db, "InTakeForms", d.id), payload);
      const name = data.nameInClientTable || data.familyName ||
        (Array.isArray(data.inTakeClients) ? data.inTakeClients[0]?.name : "") || d.id;
      console.log(`  ✅ ${d.id} ("${name}") — removed: [${removed.join(", ")}]`);
      cleaned++;
    } catch (err) {
      console.error(`  ❌ ${d.id}:`, err.message);
    }
  }

  console.log(`\n${"═".repeat(60)}`);
  console.log(`✅ Cleaned: ${cleaned} old-structure docs`);
  console.log(`⏭  Skipped: ${skipped} docs (new-structure or already clean)`);
  console.log(`\nFlutter null-cast errors from empty-string fields should be gone.`);
  console.log(`${"═".repeat(60)}\n`);
  process.exit(0);
}

cleanup().catch(err => {
  console.error("❌ Fatal:", err);
  process.exit(1);
});
