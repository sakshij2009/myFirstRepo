/**
 * ================================================================
 * STEP 2 — DELETE NEW-WEBAPP FORMS FROM InTakeForms
 *
 * "New web app" forms are identified by having the `services`
 * field (nested object with serviceType array) — this is ONLY
 * present in forms saved by the new IntakeForm.jsx / 
 * PrivateFamilyIntakeForm.jsx / AssessmentForm.jsx.
 *
 * Old web app forms have flat fields like inTakeClients[], 
 * shiftPoints[], nameInClientTable, etc. — no `services` object.
 *
 * HOW TO RUN:
 *   node migrate-intake-forms.js
 *
 * SAFETY: Run in DRY_RUN mode first (prints what WOULD be deleted).
 *         Set DRY_RUN = false to actually delete.
 * ================================================================
 */

const DRY_RUN = false; // ← set false to actually delete

// ──────────────────────────────────────────────────────────────
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, deleteDoc, doc } from "firebase/firestore";

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

/**
 * Returns true if this doc was saved by the NEW web app
 * (IntakeForm.jsx / PrivateFamilyIntakeForm.jsx / AssessmentForm.jsx)
 *
 * New web app docs have:
 *   - services: { serviceType: [], ... }  ← nested services object
 *   - clients: { client1: {...}, ... }    ← object (not array) of clients
 *   - workerInfo: { ... }                 ← nested worker info
 *   - billingInfo: { ... }                ← billing section
 *   - formType: "intake-worker"|"private" ← explicit form type string
 */
function isNewWebAppForm(data) {
  // Primary signal: has `services` as an object with serviceType array
  if (data.services && typeof data.services === "object" && Array.isArray(data.services.serviceType)) {
    return true;
  }
  // Secondary signal: has `workerInfo` nested object
  if (data.workerInfo && typeof data.workerInfo === "object") {
    return true;
  }
  // Tertiary signal: has `billingInfo`
  if (data.billingInfo && typeof data.billingInfo === "object") {
    return true;
  }
  // Quaternary: has `clients` as an object (not array) with client1, client2 keys
  if (data.clients && typeof data.clients === "object" && !Array.isArray(data.clients)) {
    const keys = Object.keys(data.clients);
    if (keys.some(k => k.startsWith("client"))) return true;
  }
  return false;
}

async function cleanup() {
  console.log(`\n📦 Reading InTakeForms collection...`);
  const snap = await getDocs(collection(db, "InTakeForms"));

  if (snap.empty) {
    console.log("⚠️  Collection is empty. Nothing to do.");
    process.exit(0);
  }

  console.log(`✅ Found ${snap.docs.length} total documents.\n`);

  let toDelete = [];
  let toKeep   = [];

  for (const d of snap.docs) {
    const data = d.data();
    if (isNewWebAppForm(data)) {
      toDelete.push(d);
    } else {
      toKeep.push(d);
    }
  }

  console.log(`🗑️  New web app forms (to delete from InTakeForms): ${toDelete.length}`);
  console.log(`📂  Old web app forms (to keep in InTakeForms):     ${toKeep.length}\n`);

  if (toDelete.length === 0) {
    console.log("✅ Nothing matched — no deletions needed.");
    process.exit(0);
  }

  if (DRY_RUN) {
    console.log("🔍 DRY RUN — the following would be deleted:");
    toDelete.forEach(d => console.log(`   ⚠️  ${d.id}`));
    console.log("\n💡 Set DRY_RUN = false to actually delete.");
    process.exit(0);
  }

  // ── Perform deletions ──
  console.log("🗑️  Deleting new web app forms from InTakeForms...\n");
  let success = 0;
  let failed  = 0;

  for (const d of toDelete) {
    try {
      await deleteDoc(doc(db, "InTakeForms", d.id));
      console.log(`  ✅ Deleted → ${d.id}`);
      success++;
    } catch (err) {
      console.error(`  ❌ FAILED  → ${d.id}:`, err.message);
      failed++;
    }
  }

  console.log(`\n═══════════════════════════════════════`);
  console.log(`✅ Deleted: ${success} new-webapp forms`);
  console.log(`📂 Kept:    ${toKeep.length} old-app forms`);
  if (failed > 0) console.log(`❌ Failed:  ${failed}`);
  console.log(`═══════════════════════════════════════\n`);
  process.exit(0);
}

cleanup().catch(err => {
  console.error("❌ Script failed:", err);
  process.exit(1);
});
