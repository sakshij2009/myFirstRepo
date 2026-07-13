const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const serviceAccount = require("./serviceAccountKey.json");

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

async function find() {
  const snapshot = await db.collection("shifts")
    .where("clientName", "==", "Eliot Mergl")
    .get();

  console.log(`\nFound ${snapshot.size} Eliot Mergl shifts total.\n`);

  const targets = ["07-07-2026", "14-07-2026", "21-07-2026"];
  let found = 0;

  snapshot.forEach((doc) => {
    const d = doc.data();
    if (targets.includes(d.dateKey)) {
      found++;
      console.log("─".repeat(60));
      console.log(`Shift ID: ${doc.id}`);
      console.log(`Worker: ${d.userName || d.name || d.username || "N/A"}`);
      console.log(`Date: ${d.startDate} (dateKey: ${d.dateKey})`);
      console.log(`Time: ${d.startTime} - ${d.endTime}`);
      console.log(`Category: ${d.categoryName || "N/A"}`);
      console.log(`Agency: ${d.agencyName || "N/A"}`);
      console.log(`Status: ${d.billingStatus || "N/A"}`);
    }
  });

  if (found === 0) {
    console.log("No shifts found for July 7, 14, or 21.\n");
    console.log("All unique dateKeys for Eliot Mergl:");
    const dates = new Set();
    snapshot.forEach((doc) => {
      const d = doc.data();
      if (d.dateKey) dates.add(d.dateKey);
    });
    [...dates].sort().forEach((dt) => console.log(`  ${dt}`));
  }

  process.exit(0);
}

find().catch((err) => { console.error("Error:", err.message); process.exit(1); });
