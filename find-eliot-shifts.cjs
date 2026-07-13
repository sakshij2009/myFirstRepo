const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const serviceAccount = require("./serviceAccountKey.json");

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

async function findEliotShifts() {
  const snapshot = await db.collection("shifts")
    .where("clientName", ">=", "Eliot")
    .where("clientName", "<=", "Eliot")
    .get();

  console.log(`\nFound ${snapshot.size} shifts matching "Eliot":\n`);

  snapshot.forEach((doc) => {
    const d = doc.data();
    console.log("─".repeat(60));
    console.log(`Shift ID: ${doc.id}`);
    console.log(`Client: ${d.clientName}`);
    console.log(`Worker: ${d.workerName || "N/A"}`);
    console.log(`Date: ${d.date || "N/A"}`);
    console.log(`Category: ${d.categoryName || "N/A"}`);
    console.log(`Status: ${d.billingStatus || "N/A"}`);
    console.log(`Billing Locked: ${d.billingLocked || false}`);
  });

  if (snapshot.empty) {
    // Try case-insensitive broader search
    console.log("\nNo exact match. Trying broader search...\n");
    const allSnap = await db.collection("shifts").get();
    allSnap.forEach((doc) => {
      const d = doc.data();
      if (d.clientName && d.clientName.toLowerCase().includes("eliot")) {
        console.log(`Found: ${doc.id} | ${d.clientName} | Date: ${d.date}`);
      }
      if (d.clientName && d.clientName.toLowerCase().includes("mergl")) {
        console.log(`Found: ${doc.id} | ${d.clientName} | Date: ${d.date}`);
      }
    });
  }

  process.exit(0);
}

findEliotShifts().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
