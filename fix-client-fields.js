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

async function fix() {
  console.log("Reading clients...");
  const snap = await getDocs(collection(db, "clients"));
  
  for (const d of snap.docs) {
    const data = d.data();
    const patch = {};

    if (data.dob === undefined) patch.dob = "";
    if (data.description === undefined) patch.description = "";
    if (data.updatedAt === undefined) patch.updatedAt = data.createdAt || new Date();

    if (Object.keys(patch).length > 0) {
      await updateDoc(doc(db, "clients", d.id), patch);
      console.log(`Updated client ${d.id} with ${Object.keys(patch).join(', ')}`);
    }
  }

  console.log("Done");
  process.exit(0);
}

fix().catch(console.error);
