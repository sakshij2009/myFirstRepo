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

const DEFAULT_DATE = "01-01-2025";
const DEFAULT_DATE_TIME = "01 Jan 2025 12:00 AM";

async function fixEmptyDates() {
  console.log("Fixing clients...");
  const clientsSnap = await getDocs(collection(db, "clients"));
  for (const d of clientsSnap.docs) {
    const data = d.data();
    const patch = {};
    if (data.dob === "") patch.dob = DEFAULT_DATE;
    
    // Also check if any other fields are empty strings that might be parsed
    if (data.updatedAt === "") patch.updatedAt = DEFAULT_DATE_TIME;

    if (Object.keys(patch).length > 0) {
      await updateDoc(doc(db, "clients", d.id), patch);
      console.log(`Updated clients/${d.id} with ${JSON.stringify(patch)}`);
    }
  }

  console.log("Fixing InTakeForms...");
  const formsSnap = await getDocs(collection(db, "InTakeForms"));
  for (const d of formsSnap.docs) {
    const data = d.data();
    const patch = {};

    // Root fields
    if (data.date === "") patch.date = DEFAULT_DATE;
    if (data.dateOfInTake === "") patch.dateOfInTake = DEFAULT_DATE;
    if (data.createDate === "") patch.createDate = DEFAULT_DATE_TIME;
    if (data.createdAt === "") patch.createdAt = DEFAULT_DATE_TIME;
    if (data.lastUpdatedAt === "") patch.lastUpdatedAt = DEFAULT_DATE_TIME;
    if (data.consentDate === "") patch.consentDate = DEFAULT_DATE;

    // inTakeClients fields
    if (data.inTakeClients && Array.isArray(data.inTakeClients)) {
      let changed = false;
      const newClients = data.inTakeClients.map(c => {
        const cPatch = { ...c };
        if (cPatch.dob === "") { cPatch.dob = DEFAULT_DATE; changed = true; }
        if (cPatch.serviceStartDate === "") { cPatch.serviceStartDate = DEFAULT_DATE; changed = true; }
        return cPatch;
      });
      if (changed) patch.inTakeClients = newClients;
    }

    if (Object.keys(patch).length > 0) {
      await updateDoc(doc(db, "InTakeForms", d.id), patch);
      console.log(`Updated InTakeForms/${d.id} with empty dates fixed`);
    }
  }

  console.log("Done");
  process.exit(0);
}

fixEmptyDates().catch(console.error);
