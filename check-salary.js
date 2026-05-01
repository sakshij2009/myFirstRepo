import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDocs, collection, query, orderBy, limit } from "firebase/firestore";

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

async function checkOldShifts() {
  const oldSnap = await getDocs(query(collection(db, "shifts"), orderBy("createdAt", "asc"), limit(10)));
  const oldDocs = oldSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  
  oldDocs.forEach(d => {
    console.log(`[${d.id}] salaryPerHour: ${d.salaryPerHour} (${typeof d.salaryPerHour})`);
  });

  process.exit(0);
}

checkOldShifts().catch(console.error);
