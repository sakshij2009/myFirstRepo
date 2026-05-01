import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, updateDoc, doc } from "firebase/firestore";

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

async function patchMissingFinal() {
  console.log("Fetching shifts...");
  const snap = await getDocs(collection(db, "shifts"));
  
  const patches = [];

  for (const d of snap.docs) {
    const data = d.data();
    const patch = {};

    if (data.shiftConfirmed === undefined) patch.shiftConfirmed = false;
    if (data.jobdescription === undefined) patch.jobdescription = "";
    if (data.shiftReport === undefined) patch.shiftReport = "";
    if (data.clockIn === undefined) patch.clockIn = "";
    if (data.clockOut === undefined) patch.clockOut = "";
    if (data.expenseReceiptUrlList === undefined) patch.expenseReceiptUrlList = [];
    if (data.isRatify === undefined && data.isRatified === undefined) patch.isRatify = false;
    if (data.isCancelled === undefined) patch.isCancelled = false;

    if (Object.keys(patch).length > 0) {
      patches.push({ id: d.id, patch });
    }
  }

  console.log(`Found ${patches.length} shifts to patch final missing fields...`);

  const concurrency = 50;
  for (let i = 0; i < patches.length; i += concurrency) {
    const chunk = patches.slice(i, i + concurrency);
    await Promise.all(chunk.map(p => updateDoc(doc(db, "shifts", p.id), p.patch)));
    console.log(`Patched up to ${Math.min(i + concurrency, patches.length)} / ${patches.length}`);
  }

  console.log("Done.");
  process.exit(0);
}

patchMissingFinal().catch(console.error);
