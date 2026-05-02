/**
 * FULL AUDIT: What did every script do to InTakeForms?
 * Run this to understand what's in the collection NOW vs what should be there.
 * 
 * Run: node audit-intakeforms.mjs
 */

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

// Same detection as migrate-intake-forms.js used to DELETE forms
function isNewStructure(data) {
  return (
    (data.services && typeof data.services === "object" && Array.isArray(data.services?.serviceType)) ||
    (data.workerInfo && typeof data.workerInfo === "object") ||
    (data.billingInfo && typeof data.billingInfo === "object") ||
    (data.clients && typeof data.clients === "object" && !Array.isArray(data.clients) &&
      Object.keys(data.clients).some(k => k.startsWith("client")))
  );
}

function extractName(data) {
  if (data.nameInClientTable) return data.nameInClientTable;
  if (data.familyName) return data.familyName;
  if (Array.isArray(data.inTakeClients) && data.inTakeClients[0]) {
    return data.inTakeClients[0].name || data.inTakeClients[0].fullName || "";
  }
  if (data.clients) {
    const vals = Object.values(data.clients);
    if (vals[0]) return vals[0].fullName || vals[0].name || "";
  }
  if (data.shared?.children?.[0]) return data.shared.children[0].fullName || "";
  return data.name || "(no name)";
}

async function audit() {
  console.log("\n📦 Auditing InTakeForms collection...\n");
  const snap = await getDocs(collection(db, "InTakeForms"));
  console.log(`Total docs: ${snap.docs.length}\n`);

  const oldStructure = [];
  const newStructure = [];
  const unknown = [];

  for (const d of snap.docs) {
    const data = d.data();
    const name = extractName(data);
    const hasInjectMarker = "_compatPatched" in data || "_flutterCompat" in data;
    const formType = data.formType || data.agencyType || data.agencyName || "(none)";
    const status = data.status || "(no status)";

    const entry = { id: d.id, name, formType, status, hasInjectMarker, keys: Object.keys(data) };

    if (data.shared?.children || data.clients) {
      newStructure.push(entry);
    } else if (Array.isArray(data.inTakeClients)) {
      oldStructure.push(entry);
    } else {
      unknown.push(entry);
    }
  }

  console.log(`=== OLD-STRUCTURE docs (inTakeClients[]) — ${oldStructure.length} ===`);
  oldStructure.forEach(e => console.log(`  [${e.id}]  "${e.name}"  formType=${e.formType}  status=${e.status}`));

  console.log(`\n=== NEW-STRUCTURE docs (clients{} or shared{}) — ${newStructure.length} ===`);
  newStructure.forEach(e => console.log(`  [${e.id}]  "${e.name}"  formType=${e.formType}  status=${e.status}`));

  console.log(`\n=== UNKNOWN-STRUCTURE docs — ${unknown.length} ===`);
  unknown.forEach(e => console.log(`  [${e.id}]  "${e.name}"  formType=${e.formType}  keys: ${e.keys.join(", ")}`));

  // Check injected fields still present
  const withInjected = snap.docs.filter(d => "_compatPatched" in d.data() || "_flutterCompat" in d.data());
  console.log(`\n=== Docs still with injected markers (_compatPatched/_flutterCompat) — ${withInjected.length} ===`);
  withInjected.forEach(d => console.log(`  [${d.id}]`));

  process.exit(0);
}

audit().catch(err => { console.error(err); process.exit(1); });
