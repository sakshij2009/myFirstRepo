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
  console.log("Reading InTakeForms...");
  const snap = await getDocs(collection(db, "InTakeForms"));
  const toPatch = snap.docs.filter(d => d.data()._flutterCompat || d.data()._compatPatched);

  for (const d of toPatch) {
    const data = d.data();
    const patch = {};

    if (data.caseWorkerAgencyName === undefined) patch.caseWorkerAgencyName = "";
    if (data.documents === undefined) patch.documents = [];
    if (data.nameOfPerson === undefined) patch.nameOfPerson = data.inTakeWorkerName || "";
    if (data.createDate === undefined) patch.createDate = data.createdAt || data.dateOfInTake || "";

    if (Object.keys(patch).length > 0) {
      await updateDoc(doc(db, "InTakeForms", d.id), patch);
      console.log(`Updated InTakeForm ${d.id} with ${Object.keys(patch).join(', ')}`);
    }
  }

  console.log("Done");
  process.exit(0);
}

fix().catch(console.error);
