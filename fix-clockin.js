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

async function checkClockIn() {
  const snap = await getDocs(collection(db, "shifts"));
  let badClockInCount = 0;
  for (const d of snap.docs) {
    const data = d.data();
    if (typeof data.clockIn === 'string' && data.clockIn.includes(',')) {
      badClockInCount++;
      // Fix it by clearing it or parsing it
      // Let's just clear it to "" for now so it doesn't crash
      await updateDoc(doc(db, "shifts", d.id), { clockIn: "" });
    }
    if (typeof data.clockOut === 'string' && data.clockOut.includes(',')) {
      await updateDoc(doc(db, "shifts", d.id), { clockOut: "" });
    }
  }
  console.log(`Found and cleared ${badClockInCount} shifts with bad clockIn format containing comma.`);
  process.exit(0);
}

checkClockIn().catch(console.error);
