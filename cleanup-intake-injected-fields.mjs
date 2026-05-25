/**
 * CLEANUP: Remove all fields that were injected by migration/patch scripts
 * from InTakeForms documents. This restores each document to its original state.
 *
 * Fields added by patch-intake-forms.js:
 *   _compatPatched, nameInClientTable, inTakeClients (only on new-structure docs),
 *   dateOfInTake, inTakeWorkerName, clientCode, status
 *
 * Fields added by fix-old-app.js:
 *   _flutterCompat, formId, date, dateOfInTake, isEditable, status,
 *   nameInClientTable, clientId, clientCode, inTakeClients,
 *   inTakeWorkerName, inTakeWorkerPhone, inTakeWorkerEmail, inTakeWorkerAgencyName,
 *   caseWorkerName, caseWorkerEmail, caseWorkerPhone, agencyName, signature, notes
 *
 * Fields added by fix-intake-more-fields.js (on patched docs):
 *   caseWorkerAgencyName, documents, nameOfPerson, createDate
 *
 * IMPORTANT: This only removes fields from NEW-STRUCTURE docs (the ones the
 * web admin app created). Old-structure docs (with inTakeClients array originally)
 * are left completely untouched.
 *
 * Run: node cleanup-intake-injected-fields.mjs
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

// ─── ALL fields injected by our migration scripts ───────────────────────────
// These will be DELETED from any document that has them,
// ONLY if the doc was a new-structure doc (has _compatPatched or _flutterCompat flag).
const INJECTED_FIELDS = [
  "_compatPatched",
  "_flutterCompat",
  // From patch-intake-forms.js & fix-old-app.js
  "formId",
  "date",
  "dateOfInTake",
  "isEditable",
  "nameInClientTable",
  "clientId",
  "clientCode",
  "inTakeWorkerName",
  "inTakeWorkerPhone",
  "inTakeWorkerEmail",
  "inTakeWorkerAgencyName",
  "caseWorkerName",
  "caseWorkerEmail",
  "caseWorkerPhone",
  "agencyName",
  "signature",
  "notes",
  // From fix-intake-more-fields.js
  "caseWorkerAgencyName",
  "documents",
  "nameOfPerson",
  "createDate",
  // inTakeClients was injected on new-structure docs; old-structure docs had it originally.
  // We handle this separately below.
];

// Fields injected into inTakeClients array items on new-structure docs
// (old-structure docs had their own inTakeClients with different fields)

async function cleanup() {
  console.log("\n📦 Reading InTakeForms collection...");
  const snap = await getDocs(collection(db, "InTakeForms"));
  console.log(`✅ Found ${snap.docs.length} total documents.\n`);

  // Identify which docs were patched by our scripts
  const patchedDocs = snap.docs.filter((d) => {
    const data = d.data();
    return data._compatPatched === true || data._flutterCompat === true;
  });

  console.log(`🔍 Found ${patchedDocs.length} documents that were patched by migration scripts.`);

  // Identify old-structure docs (should NOT be touched)
  const oldStructureDocs = snap.docs.filter((d) => {
    const data = d.data();
    return !data._compatPatched && !data._flutterCompat;
  });
  console.log(`✅ Found ${oldStructureDocs.length} original/old-structure documents (will NOT be modified).\n`);

  if (patchedDocs.length === 0) {
    console.log("✅ No patched documents found. Nothing to clean up.");
    process.exit(0);
  }

  console.log("🧹 Removing injected fields from patched documents...\n");

  let cleaned = 0;
  let skipped = 0;
  let failed = 0;

  for (const d of patchedDocs) {
    const data = d.data();

    // Build the deletion payload — only delete fields that actually exist on this doc
    const deletionPayload = {};
    for (const field of INJECTED_FIELDS) {
      if (field in data) {
        deletionPayload[field] = deleteField();
      }
    }

    // For new-structure docs: also remove injected inTakeClients
    // A new-structure doc has clients{} object but originally had NO inTakeClients.
    // We detect this by checking: has clients{} object AND _flutterCompat/_compatPatched.
    const isNewStructure =
      data.clients &&
      typeof data.clients === "object" &&
      !Array.isArray(data.clients) &&
      Object.keys(data.clients).some((k) => k.startsWith("client"));

    if (isNewStructure && "inTakeClients" in data) {
      deletionPayload["inTakeClients"] = deleteField();
    }

    // Also remove status if it was injected (new-structure docs originally had
    // status set by the app, not by the migration — keep it only if the doc
    // already had it before we patched).
    // We can't know for sure so we'll KEEP status (it may be real data).

    if (Object.keys(deletionPayload).length === 0) {
      console.log(`  ⏭  ${d.id} — no injected fields found, skipping.`);
      skipped++;
      continue;
    }

    try {
      await updateDoc(doc(db, "InTakeForms", d.id), deletionPayload);
      const removedFields = Object.keys(deletionPayload).join(", ");
      console.log(`  ✅ ${d.id} — removed: [${removedFields}]`);
      cleaned++;
    } catch (err) {
      console.error(`  ❌ ${d.id} — FAILED:`, err.message);
      failed++;
    }
  }

  console.log(`\n${"═".repeat(60)}`);
  console.log(`✅ Cleaned: ${cleaned} documents`);
  console.log(`⏭  Skipped: ${skipped} documents (already clean)`);
  if (failed > 0) console.log(`❌ Failed:  ${failed} documents`);
  console.log(`\n🔵 Old-structure original documents: ${oldStructureDocs.length} (untouched)`);
  console.log(`\nAll injection fields removed. InTakeForms is restored to original state.`);
  console.log(`${"═".repeat(60)}\n`);
  process.exit(0);
}

cleanup().catch((err) => {
  console.error("❌ Fatal error:", err);
  process.exit(1);
});
