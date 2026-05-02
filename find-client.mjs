// find-client.mjs — Search all intake collections for a client name
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

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

const SEARCH_NAME = "sahtaysha";

function extractName(data) {
  const checks = [
    data.nameInClientTable,
    data.familyName,
    data.name,
    data.clientName,
  ];
  // from clients object
  if (data.clients && typeof data.clients === "object") {
    Object.values(data.clients).forEach(c => {
      checks.push(c.fullName, c.name);
    });
  }
  // from inTakeClients array
  if (Array.isArray(data.inTakeClients)) {
    data.inTakeClients.forEach(c => checks.push(c.name, c.fullName));
  }
  // from parentInfoList
  if (Array.isArray(data.parentInfoList)) {
    data.parentInfoList.forEach(p => checks.push(p.clientName));
  }
  return checks.filter(Boolean).join(" | ");
}

async function search() {
  const COLLECTIONS = ["InTakeForms", "intakeForms", "familyIntakeForms", "clients"];

  for (const col of COLLECTIONS) {
    console.log(`\n🔍 Searching "${col}"...`);
    try {
      const snap = await getDocs(collection(db, col));
      const found = snap.docs.filter(d => {
        const json = JSON.stringify(d.data()).toLowerCase();
        return json.includes(SEARCH_NAME.toLowerCase());
      });

      if (found.length === 0) {
        console.log(`   ❌ Not found`);
      } else {
        found.forEach(d => {
          const data = d.data();
          console.log(`\n   ✅ FOUND — doc ID: ${d.id}`);
          console.log(`      Names extracted: ${extractName(data)}`);
          console.log(`      Top-level keys:  ${Object.keys(data).join(", ")}`);
          // Show structure type
          if (data.clients && typeof data.clients === "object" && !Array.isArray(data.clients)) {
            console.log(`      Structure: NEW (clients object)`);
            Object.entries(data.clients).forEach(([k, c]) => {
              console.log(`        ${k}: fullName="${c.fullName || ""}", name="${c.name || ""}"`);
            });
          } else if (Array.isArray(data.inTakeClients)) {
            console.log(`      Structure: OLD (inTakeClients array)`);
            data.inTakeClients.forEach((c, i) => {
              console.log(`        [${i}]: name="${c.name || ""}", fullName="${c.fullName || ""}"`);
            });
          } else {
            console.log(`      Structure: UNKNOWN / flat`);
          }
        });
      }
    } catch (err) {
      console.log(`   ⚠️  Error: ${err.message}`);
    }
  }

  console.log("\n\nDone.\n");
  process.exit(0);
}

search().catch(err => {
  console.error("Fatal:", err);
  process.exit(1);
});
