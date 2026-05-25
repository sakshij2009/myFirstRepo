/**
 * CLEANUP v2: Remove ALL injected migration fields from InTakeForms.
 *
 * Strategy: Instead of checking for a flag value, we check if the FIELD EXISTS
 * at all (regardless of value — could be "", true, false, etc.).
 *
 * Fields to remove from EVERY document that has them:
 *   _compatPatched, _flutterCompat,
 *   agencyName, anticipatedServices, applicantEmail, avatar, billingInfo (string),
 *   caseWorkerAgencyName, caseWorkerEmail, caseWorkerName, caseWorkerPhone,
 *   clientCode, clientId, createDate, date, dateOfInTake, documents,
 *   formId, isEditable, nameInClientTable, nameOfPerson, notes, signature,
 *   inTakeWorkerAgencyName, inTakeWorkerEmail, inTakeWorkerName, inTakeWorkerPhone
 *
 * SAFE fields (kept on ALL docs):
 *   - Everything in the original old-structure docs (inTakeClients, shiftPoints, etc.)
 *   - Everything in the original new-structure docs (services, clients, workerInfo,
 *     billingInfo as an OBJECT, parentInfoList, medicalInfoList, etc.)
 *   - status (may be real data from the admin portal)
 *
 * Run: node cleanup-intake-v2.mjs
 */

import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  getDocs,
  updateDoc,
  doc,
  deleteField,
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

// ─── Complete list of fields injected by ALL migration/patch scripts ─────────
// patch-intake-forms.js   → _compatPatched, nameInClientTable, dateOfInTake,
//                            inTakeWorkerName, clientCode, status
// fix-old-app.js          → _flutterCompat, formId, date, dateOfInTake, isEditable,
//                            nameInClientTable, clientId, clientCode, inTakeClients,
//                            inTakeWorkerName/Phone/Email/AgencyName,
//                            caseWorkerName/Email/Phone, agencyName, signature, notes
// fix-intake-more-fields  → caseWorkerAgencyName, documents, nameOfPerson, createDate
// fix-flutter-nulls.js    → inTakeClients (rebuilt on patched docs)
// The extra fields visible in screenshot (anticipatedServices, applicantEmail, avatar,
// billingInfo as string "") came from the migration script writing new-structure fields
// into old-structure docs or vice-versa.

const FIELDS_TO_REMOVE = [
  "_compatPatched",
  "_flutterCompat",
  // Identity / tracking fields added by scripts
  "formId",
  "date",
  "dateOfInTake",
  "isEditable",
  "nameInClientTable",
  "clientId",
  "clientCode",
  "nameOfPerson",
  "createDate",
  // Worker fields added by scripts
  "inTakeWorkerName",
  "inTakeWorkerPhone",
  "inTakeWorkerEmail",
  "inTakeWorkerAgencyName",
  // Case worker fields added by scripts
  "caseWorkerName",
  "caseWorkerEmail",
  "caseWorkerPhone",
  "caseWorkerAgencyName",
  // Misc fields added by scripts
  "agencyName",
  "signature",
  "notes",
  "documents",
  // Extra new-structure fields that got leaked into old-structure docs
  "anticipatedServices",
  "applicantEmail",
  "avatar",
];

// These fields are ONLY removed if they are a string (i.e., incorrectly injected).
// If they are a proper object, they belong to a new-structure doc and we keep them.
const FIELDS_REMOVE_IF_STRING = [
  "billingInfo",
  "agencyName",
];

// inTakeClients is removed ONLY from new-structure docs
// (old-structure docs originally had this field — we KEEP it there).
function isNewStructureDoc(data) {
  return (
    (data.services && typeof data.services === "object" && Array.isArray(data.services?.serviceType)) ||
    (data.workerInfo && typeof data.workerInfo === "object") ||
    (data.clients && typeof data.clients === "object" && !Array.isArray(data.clients) &&
      Object.keys(data.clients).some(k => k.startsWith("client")))
  );
}

async function cleanup() {
  console.log("\n📦 Reading InTakeForms collection...");
  const snap = await getDocs(collection(db, "InTakeForms"));
  console.log(`✅ Found ${snap.docs.length} total documents.\n`);

  let cleaned = 0;
  let alreadyClean = 0;
  let failed = 0;

  for (const d of snap.docs) {
    const data = d.data();
    const payload = {};

    // Remove all injected fields that exist on this doc
    for (const field of FIELDS_TO_REMOVE) {
      if (field in data) {
        payload[field] = deleteField();
      }
    }

    // Remove billingInfo ONLY if it's a string (empty or otherwise)
    // If it's an object, it belongs to a new-structure doc — keep it.
    for (const field of FIELDS_REMOVE_IF_STRING) {
      if (field in data && typeof data[field] === "string") {
        payload[field] = deleteField();
      }
    }

    // Remove inTakeClients ONLY from new-structure docs
    // (old-structure docs had this originally — leave it alone)
    if (isNewStructureDoc(data) && "inTakeClients" in data) {
      payload["inTakeClients"] = deleteField();
    }

    if (Object.keys(payload).length === 0) {
      alreadyClean++;
      continue;
    }

    try {
      await updateDoc(doc(db, "InTakeForms", d.id), payload);
      const removed = Object.keys(payload).join(", ");
      console.log(`  ✅ ${d.id} — removed: [${removed}]`);
      cleaned++;
    } catch (err) {
      console.error(`  ❌ ${d.id} — FAILED:`, err.message);
      failed++;
    }
  }

  console.log(`\n${"═".repeat(60)}`);
  console.log(`✅ Cleaned:       ${cleaned} documents`);
  console.log(`⏭  Already clean: ${alreadyClean} documents`);
  if (failed > 0) console.log(`❌ Failed:        ${failed} documents`);
  console.log(`\nInTakeForms collection restored to original state.`);
  console.log(`${"═".repeat(60)}\n`);
  process.exit(0);
}

cleanup().catch((err) => {
  console.error("❌ Fatal error:", err);
  process.exit(1);
});
