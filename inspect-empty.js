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

async function findEmpty() {
  const snap = await getDocs(collection(db, "shifts"));
  const empty = snap.docs.filter(d => !d.data().clockIn);
  console.log(`Found ${empty.length} shifts with empty clockIn.`);
  
  if (empty.length > 0) {
      const sample = empty[0].data();
      console.log("Sample ID:", empty[0].id);
      console.log("startDate:", sample.startDate);
      console.log("startTime:", sample.startTime);
      console.log("endDate:", sample.endDate);
      console.log("endTime:", sample.endTime);
  }
  process.exit(0);
}

findEmpty().catch(console.error);
