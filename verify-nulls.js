import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

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

async function checkNulls() {
  console.log("Checking all shifts for nulls...");
  const snap = await getDocs(collection(db, "shifts"));
  
  let nullCount = 0;
  
  const check = (obj, path, docId) => {
    if (obj === null) {
      console.log(`Found null at ${path} in doc ${docId}`);
      nullCount++;
    } else if (Array.isArray(obj)) {
      obj.forEach((item, i) => check(item, `${path}[${i}]`, docId));
    } else if (typeof obj === 'object') {
      for (const [k, v] of Object.entries(obj)) {
        check(v, `${path}.${k}`, docId);
      }
    }
  };

  snap.docs.forEach(d => check(d.data(), "root", d.id));
  console.log(`Finished. Found ${nullCount} nulls.`);
  process.exit(0);
}

checkNulls().catch(console.error);
