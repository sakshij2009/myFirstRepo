import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, updateDoc } from "firebase/firestore";

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

async function check() {
  const snap = await getDocs(collection(db, "clients"));
  let allKeys = new Set();
  
  for (const d of snap.docs) {
    Object.keys(d.data()).forEach(k => allKeys.add(k));
  }

  const keysArray = Array.from(allKeys);
  
  // Find which docs are missing which keys
  for (const d of snap.docs) {
    const data = d.data();
    const missing = keysArray.filter(k => !Object.keys(data).includes(k));
    if (missing.length > 0) {
      const patch = {};
      missing.forEach(k => patch[k] = "");
      // await updateDoc(doc(db, "clients", d.id), patch);
    }
  }

  process.exit(0);
}

check().catch(console.error);
