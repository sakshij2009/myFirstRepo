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

async function fixSalary() {
  console.log("Fetching shifts...");
  const snap = await getDocs(collection(db, "shifts"));
  
  let patchCount = 0;

  for (const d of snap.docs) {
    const data = d.data();
    if (data.salaryPerHour === 0) {
      // 0 as an int crashes Flutter if it expects double. Delete it to match old shifts.
      await updateDoc(doc(db, "shifts", d.id), {
        salaryPerHour: deleteField()
      });
      patchCount++;
    }
  }

  console.log(`Deleted salaryPerHour: 0 from ${patchCount} shifts.`);
  process.exit(0);
}

fixSalary().catch(console.error);
