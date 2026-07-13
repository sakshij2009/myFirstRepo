const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const serviceAccount = require("./serviceAccountKey.json");

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

async function findDeletedShifts() {
  const pastTime = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago
  console.log(`\nQuerying shifts as they existed at: ${pastTime.toISOString()}\n`);

  const pastSnapshot = await db.collection("shifts").get({ readTime: pastTime });
  const pastShifts = new Map();
  pastSnapshot.forEach((doc) => pastShifts.set(doc.id, doc.data()));

  const currentSnapshot = await db.collection("shifts").get();
  const currentIds = new Set();
  currentSnapshot.forEach((doc) => currentIds.add(doc.id));

  console.log(`Shifts 2 hours ago: ${pastShifts.size}`);
  console.log(`Shifts now: ${currentIds.size}\n`);

  const deleted = [];
  for (const [id, data] of pastShifts) {
    if (!currentIds.has(id)) deleted.push({ id, ...data });
  }

  if (deleted.length === 0) {
    console.log("No shifts were deleted in the last 45 minutes.");
  } else {
    console.log(`Found ${deleted.length} deleted shift(s):\n`);
    deleted.forEach((shift) => {
      console.log("─".repeat(60));
      console.log(`Shift ID: ${shift.id}`);
      console.log(`Client: ${shift.clientName || "N/A"}`);
      console.log(`Worker: ${shift.workerName || "N/A"}`);
      console.log(`Date: ${shift.date || "N/A"}`);
      console.log(`Agency: ${shift.agencyName || "N/A"}`);
      console.log(`Category: ${shift.categoryName || "N/A"}`);
      console.log(`Status: ${shift.billingStatus || "N/A"}`);
      console.log("\nFull data:", JSON.stringify(shift, null, 2));
    });
  }

  process.exit(0);
}

findDeletedShifts().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
