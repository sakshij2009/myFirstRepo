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

const formatLocalISO = (dateVal) => {
  if (!dateVal) return "";
  let d;
  if (dateVal.toDate) d = dateVal.toDate();
  else d = new Date(dateVal);

  if (isNaN(d.getTime())) return "";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

async function fixAllShiftsFast() {
  console.log("Fetching ALL shifts...");
  const snap = await getDocs(collection(db, "shifts"));
  
  const patches = [];

  for (const d of snap.docs) {
    const data = d.data();
    const patch = {};

    // 1. Fix dateKey
    if (!data.dateKey) {
      const dKey = formatLocalISO(data.startDate);
      if (dKey) patch.dateKey = dKey;
    }

    // 2. Fix shiftPoints array
    if (!data.shiftPoints || data.shiftPoints.length === 0) {
      patch.shiftPoints = [{
        pickupLocation: "", pickupTime: "", pickupLatitude: 0, pickupLongitude: 0,
        visitLocation: "", visitStartTime: "", visitEndTime: "", visitLatitude: 0, visitLongitude: 0,
        dropLocation: "", dropTime: "", dropLatitude: 0, dropLongitude: 0,
        seatType: "Forward Facing Seat", transportationMode: "", totalKilometers: 0,
        purposeOfTransportation: "", childName: ""
      }];
    } else {
      let needsFixing = false;
      const fixedPoints = data.shiftPoints.map(p => {
        if (typeof p !== 'object' || p === null) {
          needsFixing = true;
          return {
            pickupLocation: "", pickupTime: "", pickupLatitude: 0, pickupLongitude: 0,
            visitLocation: "", visitStartTime: "", visitEndTime: "", visitLatitude: 0, visitLongitude: 0,
            dropLocation: "", dropTime: "", dropLatitude: 0, dropLongitude: 0,
            seatType: "Forward Facing Seat", transportationMode: "", totalKilometers: 0,
            purposeOfTransportation: "", childName: ""
          };
        }
        return p;
      });
      if (needsFixing) patch.shiftPoints = fixedPoints;
    }

    // 3. Fix missing names (IMPORTANT: avoid patching if it evaluates to empty string and is already missing, but wait, if it's missing, we MUST add it as "")
    if (data.clientName === undefined || data.clientName === null) patch.clientName = data.clientDetails?.name || data.clientDetails?.fullName || "";
    if (data.name === undefined || data.name === null) patch.name = data.userName || data.user?.name || "";
    if (data.clientId === undefined || data.clientId === null) patch.clientId = data.clientDetails?.id || data.client || "";
    if (data.userId === undefined || data.userId === null) patch.userId = data.user || "";
    
    // 4. Missing booleans / status
    if (data.status === undefined || data.status === null) patch.status = "Confirmed";

    // 5. Replace any remaining nulls
    for (const [key, value] of Object.entries(data)) {
      if (value === null) {
        patch[key] = ""; 
      }
    }
    
    if (data.shiftReportImageUrl === null || data.shiftReportImageUrl === undefined) {
        patch.shiftReportImageUrl = "";
    }

    if (Object.keys(patch).length > 0) {
      patches.push({ id: d.id, patch });
    }
  }

  console.log(`Found ${patches.length} shifts to patch...`);

  const concurrency = 50;
  for (let i = 0; i < patches.length; i += concurrency) {
    const chunk = patches.slice(i, i + concurrency);
    await Promise.all(chunk.map(p => updateDoc(doc(db, "shifts", p.id), p.patch).catch(e => console.error(`Error on ${p.id}:`, e))));
    console.log(`Patched up to ${Math.min(i + concurrency, patches.length)} / ${patches.length}`);
  }

  console.log("Done.");
  process.exit(0);
}

fixAllShiftsFast().catch(console.error);
