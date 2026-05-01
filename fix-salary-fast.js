import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, updateDoc, doc, deleteField } from "firebase/firestore";

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

async function fixSalaryFast() {
  console.log("Fetching shifts...");
  const snap = await getDocs(collection(db, "shifts"));
  
  const patches = [];

  for (const d of snap.docs) {
    const data = d.data();
    if (data.salaryPerHour === 0) {
      patches.push(d.id);
    }
  }

  console.log(`Found ${patches.length} shifts with salaryPerHour === 0 to patch...`);

  const concurrency = 50;
  for (let i = 0; i < patches.length; i += concurrency) {
    const chunk = patches.slice(i, i + concurrency);
    await Promise.all(chunk.map(id => updateDoc(doc(db, "shifts", id), { salaryPerHour: deleteField() }).catch(e => console.error(e))));
    console.log(`Patched up to ${Math.min(i + concurrency, patches.length)} / ${patches.length}`);
  }

  console.log("Done.");
  process.exit(0);
}

fixSalaryFast().catch(console.error);
