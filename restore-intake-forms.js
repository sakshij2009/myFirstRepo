/**
 * RESTORE SCRIPT
 * Copies all documents from IntakeFormsV2 that were originally
 * from InTakeForms (i.e., have _migratedFrom: "InTakeForms")
 * back to InTakeForms so the old Flutter app doesn't crash.
 *
 * Run: node restore-intake-forms.js
 */

import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, setDoc, doc } from "firebase/firestore";

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

async function restore() {
  console.log("\n📦 Reading IntakeFormsV2...");
  const v2Snap = await getDocs(collection(db, "IntakeFormsV2"));

  console.log(`✅ Found ${v2Snap.docs.length} docs in IntakeFormsV2.\n`);
  console.log("📦 Reading InTakeForms (existing)...");
  const oldSnap = await getDocs(collection(db, "InTakeForms"));
  const existingIds = new Set(oldSnap.docs.map(d => d.id));

  // Restore docs that were migrated FROM InTakeForms but are now MISSING from it
  const toRestore = v2Snap.docs.filter(d => {
    const data = d.data();
    return (
      data._migratedFrom === "InTakeForms" && // was originally from old collection
      !existingIds.has(d.id)                   // but is now missing from it
    );
  });

  if (toRestore.length === 0) {
    console.log("✅ Nothing to restore — all forms already present in InTakeForms.");
    process.exit(0);
  }

  console.log(`\n🔄 Restoring ${toRestore.length} missing forms back to InTakeForms...\n`);

  let success = 0;
  let failed = 0;

  for (const d of toRestore) {
    const data = d.data();
    // Remove the migration tracking fields we added
    const { _migratedFrom, _migratedAt, ...cleanData } = data;
    try {
      await setDoc(doc(db, "InTakeForms", d.id), cleanData);
      console.log(`  ✅ Restored → ${d.id}`);
      success++;
    } catch (err) {
      console.error(`  ❌ FAILED  → ${d.id}:`, err.message);
      failed++;
    }
  }

  console.log(`\n═══════════════════════════════════════`);
  console.log(`✅ Restored: ${success} documents to InTakeForms`);
  if (failed > 0) console.log(`❌ Failed:   ${failed}`);
  console.log(`\nThe old Flutter app should now work again.`);
  console.log(`═══════════════════════════════════════\n`);
  process.exit(0);
}

restore().catch(err => {
  console.error("❌ Restore failed:", err);
  process.exit(1);
});
