// delete-intakeformsv2.mjs
// Permanently deletes ALL documents inside the IntakeFormsV2 collection.
// Run with: node delete-intakeformsv2.mjs

import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  getDocs,
  deleteDoc,
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

async function deleteIntakeFormsV2() {
  const collectionName = "IntakeFormsV2";
  console.log(`\n🔍 Fetching all documents in "${collectionName}"...`);

  const snap = await getDocs(collection(db, collectionName));

  if (snap.empty) {
    console.log(`✅ Collection "${collectionName}" is already empty. Nothing to delete.`);
    process.exit(0);
  }

  console.log(`⚠️  Found ${snap.docs.length} documents. Deleting...`);

  let deleted = 0;
  let failed = 0;

  for (const docSnap of snap.docs) {
    try {
      await deleteDoc(doc(db, collectionName, docSnap.id));
      deleted++;
      process.stdout.write(`\r   Deleted ${deleted}/${snap.docs.length}...`);
    } catch (err) {
      console.error(`\n❌ Failed to delete doc ${docSnap.id}:`, err.message);
      failed++;
    }
  }

  console.log(`\n\n✅ Done! Deleted: ${deleted} | Failed: ${failed}`);
  console.log(`   The "${collectionName}" collection is now empty and will no longer appear in Firestore.`);
  process.exit(0);
}

deleteIntakeFormsV2().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
