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

async function fixShiftPoints() {
  console.log("Fetching shifts...");
  const snap = await getDocs(collection(db, "shifts"));
  
  const patches = [];

  for (const d of snap.docs) {
    const data = d.data();
    let changed = false;

    if (Array.isArray(data.shiftPoints)) {
      const fixedPoints = data.shiftPoints.map(p => {
        if (!p || typeof p !== 'object') return p;
        
        const newP = { ...p };
        
        // Check for required old fields
        if (newP.totalKilometers === undefined) { newP.totalKilometers = 0; changed = true; }
        if (newP.pickupLatitude === undefined) { newP.pickupLatitude = 0; changed = true; }
        if (newP.pickupLongitude === undefined) { newP.pickupLongitude = 0; changed = true; }
        if (newP.dropLatitude === undefined) { newP.dropLatitude = 0; changed = true; }
        if (newP.dropLongitude === undefined) { newP.dropLongitude = 0; changed = true; }
        if (newP.transportationMode === undefined) { newP.transportationMode = ""; changed = true; }
        if (newP.purposeOfTransportation === undefined) { newP.purposeOfTransportation = ""; changed = true; }
        if (newP.childName === undefined) { newP.childName = p.name || ""; changed = true; }
        
        return newP;
      });

      if (changed) {
        patches.push({ id: d.id, patch: { shiftPoints: fixedPoints } });
      }
    }
  }

  console.log(`Found ${patches.length} shifts with missing shiftPoints fields to patch...`);

  const concurrency = 50;
  for (let i = 0; i < patches.length; i += concurrency) {
    const chunk = patches.slice(i, i + concurrency);
    await Promise.all(chunk.map(p => updateDoc(doc(db, "shifts", p.id), p.patch)));
    console.log(`Patched up to ${Math.min(i + concurrency, patches.length)} / ${patches.length}`);
  }

  console.log("Done.");
  process.exit(0);
}

fixShiftPoints().catch(console.error);
