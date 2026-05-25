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

const months = {
  Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06",
  Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12"
};

function parseToISO(dateVal, timeVal) {
  let dateStr = "";
  if (typeof dateVal === 'string') {
    dateStr = dateVal;
  } else if (dateVal && dateVal.toDate) {
    // Firebase Timestamp
    const d = dateVal.toDate();
    const day = String(d.getDate()).padStart(2, '0');
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = monthNames[d.getMonth()];
    const year = d.getFullYear();
    dateStr = `${day} ${month} ${year}`;
  } else {
    return null;
  }

  if (typeof timeVal !== 'string') return null;
  
  const parts = dateStr.split(" ");
  if (parts.length !== 3) return null;

  const day = parts[0].padStart(2, "0");
  const month = months[parts[1]];
  const year = parts[2];

  if (!month) return null;

  const timeParts = timeVal.split(":");
  if (timeParts.length !== 2) return null;
  const hour = timeParts[0].padStart(2, "0");
  const minute = timeParts[1].padStart(2, "0");

  return `${year}-${month}-${day}T${hour}:${minute}:00.000Z`;
}

async function restoreShifts() {
  console.log("📦 Fetching ALL shifts for restoration...");
  const snap = await getDocs(collection(db, "shifts"));
  const docs = snap.docs;
  console.log(`✅ Found ${docs.length} shifts.`);

  const patches = [];

  for (const d of docs) {
    const data = d.data();
    const patch = {};

    // Restore clockIn
    if (!data.clockIn && data.startDate && data.startTime) {
      const iso = parseToISO(data.startDate, data.startTime);
      if (iso) patch.clockIn = iso;
    }

    // Restore clockOut
    if (!data.clockOut && data.endDate && data.endTime) {
      const iso = parseToISO(data.endDate, data.endTime);
      if (iso) patch.clockOut = iso;
    }

    if (Object.keys(patch).length > 0) {
      patches.push({ id: d.id, patch });
    }
  }

  console.log(`\n🔄 Found ${patches.length} shifts to restore clockIn/clockOut data.`);

  if (patches.length === 0) {
    console.log("✅ No shifts need restoration.");
    process.exit(0);
  }

  const concurrency = 50;
  for (let i = 0; i < patches.length; i += concurrency) {
    const chunk = patches.slice(i, i + concurrency);
    await Promise.all(chunk.map(p => 
      updateDoc(doc(db, "shifts", p.id), p.patch)
        .catch(e => console.error(`  ❌ Error on ${p.id}:`, e.message))
    ));
    console.log(`  ✅ Restored ${Math.min(i + concurrency, patches.length)} / ${patches.length}`);
  }

  console.log("\n✨ Restoration complete!");
  process.exit(0);
}

restoreShifts().catch(err => {
  console.error("❌ Fatal error:", err);
  process.exit(1);
});
