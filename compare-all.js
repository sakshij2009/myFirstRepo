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

async function patchAll(collectionName) {
  const snap = await getDocs(collection(db, collectionName));
  let allKeys = new Set();
  
  for (const d of snap.docs) {
    Object.keys(d.data()).forEach(k => allKeys.add(k));
  }

  const keysArray = Array.from(allKeys);
  
  for (const d of snap.docs) {
    const data = d.data();
    const missing = keysArray.filter(k => !Object.keys(data).includes(k));
    if (missing.length > 0) {
      const patch = {};
      missing.forEach(k => {
        // give safe defaults based on key name
        if (k === 'documents' || k === 'inTakeClients' || k === 'shiftPoints' || k === 'rateList' || k === 'medications' || k === 'contacts' || k === 'notes' || k === 'shiftHistory') {
          patch[k] = [];
        } else if (k === 'isEditable' || k === 'isActive' || k === 'fileClosed' || k === 'isFamily' || k === 'clientsCreated' || k === 'isCaseWorker') {
          patch[k] = false;
        } else {
          patch[k] = "";
        }
      });
      await updateDoc(doc(db, collectionName, d.id), patch);
      console.log(`Patched ${collectionName}/${d.id} with ${missing.length} missing keys`);
    }
  }
}

async function run() {
  console.log("Patching InTakeForms...");
  await patchAll("InTakeForms");
  console.log("Patching clients...");
  await patchAll("clients");
  console.log("Done");
  process.exit(0);
}

run().catch(console.error);
