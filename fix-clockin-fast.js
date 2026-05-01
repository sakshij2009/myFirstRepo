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

async function fixClockInFast() {
  console.log("Fetching shifts...");
  const snap = await getDocs(collection(db, "shifts"));
  
  const patches = [];

  for (const d of snap.docs) {
    const data = d.data();
    const patch = {};

    if (typeof data.clockIn === 'string' && data.clockIn.includes(',')) {
      patch.clockIn = "";
    }
    if (typeof data.clockOut === 'string' && data.clockOut.includes(',')) {
      patch.clockOut = "";
    }

    if (Object.keys(patch).length > 0) {
      patches.push({ id: d.id, patch });
    }
  }

  console.log(`Found ${patches.length} shifts to patch for comma format...`);

  const concurrency = 50;
  for (let i = 0; i < patches.length; i += concurrency) {
    const chunk = patches.slice(i, i + concurrency);
    await Promise.all(chunk.map(p => updateDoc(doc(db, "shifts", p.id), p.patch)));
    console.log(`Patched up to ${Math.min(i + concurrency, patches.length)} / ${patches.length}`);
  }

  console.log("Done.");
  process.exit(0);
}

fixClockInFast().catch(console.error);
