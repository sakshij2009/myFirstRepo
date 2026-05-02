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

async function checkV2() {
  const snap = await getDocs(collection(db, "IntakeFormsV2"));
  const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  
  const newInV2 = docs.filter(d => !d._migratedFrom);
  console.log(`Total docs in V2: ${docs.length}`);
  console.log(`New docs in V2 (not migrated): ${newInV2.length}`);
  
  if (newInV2.length > 0) {
    console.log("Example New Doc ID:", newInV2[0].id);
    // console.log("Example New Doc:", JSON.stringify(newInV2[0], null, 2));
  }
  process.exit(0);
}

checkV2().catch(console.error);
