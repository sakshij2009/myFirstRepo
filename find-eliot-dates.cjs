const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const serviceAccount = require("./serviceAccountKey.json");

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

async function findEliotDates() {
  const snapshot = await db.collection("shifts")
    .where("clientName", ">=", "Eliot")
    .where("clientName", "<=", "Eliot")
    .get();

  console.log(`\nAll Eliot Mergl shifts with date fields:\n`);

  snapshot.forEach((doc) => {
    const d = doc.data();
    // Check all possible date fields
    const dateFields = {};
    for (const key of Object.keys(d)) {
      if (key.toLowerCase().includes("date") || key.toLowerCase().includes("start") || key.toLowerCase().includes("end") || key.toLowerCase().includes("time") || key.toLowerCase().includes("day")) {
        dateFields[key] = d[key];
      }
    }
    // Look for July 7, 14, 21
    const allVals = JSON.stringify(d);
    if (allVals.includes("07-07") || allVals.includes("07-14") || allVals.includes("07-21") ||
        allVals.includes("Jul 7") || allVals.includes("Jul 14") || allVals.includes("Jul 21") ||
        allVals.includes("July 7") || allVals.includes("July 14") || allVals.includes("July 21")) {
      console.log("─".repeat(60));
      console.log(`Shift ID: ${doc.id}`);
      console.log(`Client: ${d.clientName}`);
      console.log(`Category: ${d.categoryName || "N/A"}`);
      console.log(`Date fields:`, JSON.stringify(dateFields, null, 2));
    }
  });

  // Also just print date-related fields of first 3 shifts to understand structure
  console.log("\n\n=== Sample shift structure (first 3) ===\n");
  let count = 0;
  snapshot.forEach((doc) => {
    if (count >= 3) return;
    const d = doc.data();
    console.log(`Shift ID: ${doc.id}`);
    console.log(`All keys: ${Object.keys(d).join(", ")}`);
    const dateFields = {};
    for (const key of Object.keys(d)) {
      if (key.toLowerCase().includes("date") || key.toLowerCase().includes("start") || key.toLowerCase().includes("end") || key.toLowerCase().includes("time") || key.toLowerCase().includes("day")) {
        dateFields[key] = d[key];
      }
    }
    console.log(`Date fields:`, JSON.stringify(dateFields, null, 2));
    console.log();
    count++;
  });

  process.exit(0);
}

findEliotDates().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
