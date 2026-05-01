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

async function findDeepNulls() {
  console.log("Fetching shifts...");
  const snap = await getDocs(collection(db, "shifts"));
  
  const patches = [];

  const removeNulls = (obj, isChanged = { val: false }) => {
    if (Array.isArray(obj)) {
      return obj.map(item => removeNulls(item, isChanged));
    } else if (obj !== null && typeof obj === 'object') {
      const newObj = {};
      for (const [k, v] of Object.entries(obj)) {
        if (v === null) {
          newObj[k] = "";
          isChanged.val = true;
        } else {
          newObj[k] = removeNulls(v, isChanged);
        }
      }
      return newObj;
    }
    return obj;
  };

  for (const d of snap.docs) {
    const data = d.data();
    const isChanged = { val: false };
    const newData = removeNulls(data, isChanged);
    
    if (isChanged.val) {
      patches.push({ id: d.id, patch: newData });
    }
  }

  console.log(`Found ${patches.length} shifts with deep nulls to patch...`);

  // Batch patch
  const concurrency = 50;
  for (let i = 0; i < patches.length; i += concurrency) {
    const chunk = patches.slice(i, i + concurrency);
    await Promise.all(chunk.map(p => updateDoc(doc(db, "shifts", p.id), p.patch).catch(e => console.error(e))));
    console.log(`Patched up to ${Math.min(i + concurrency, patches.length)} / ${patches.length}`);
  }

  console.log("Done.");
  process.exit(0);
}

findDeepNulls().catch(console.error);
