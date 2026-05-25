/**
 * PATCH SCRIPT: Normalize new-structure forms in InTakeForms
 * ============================================================
 * The 9 new-webapp forms in InTakeForms have fields Flutter doesn't
 * understand (clients{}, services{}, billingInfo{}). Flutter expects
 * old fields like nameInClientTable, inTakeClients[], dateOfInTake.
 *
 * This script patches those docs to add the old-style fields
 * Flutter needs, so it can display them without crashing.
 *
 * Run: node patch-intake-forms.js
 */

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

/**
 * Detects if a doc has new-webapp structure
 */
function isNewWebAppForm(data) {
  if (data.services && typeof data.services === "object" && Array.isArray(data.services.serviceType)) return true;
  if (data.workerInfo && typeof data.workerInfo === "object") return true;
  if (data.billingInfo && typeof data.billingInfo === "object") return true;
  if (data.clients && typeof data.clients === "object" && !Array.isArray(data.clients)) {
    const keys = Object.keys(data.clients);
    if (keys.some(k => k.startsWith("client"))) return true;
  }
  return false;
}

/**
 * Converts new-webapp structure → old-style compatibility fields
 * Flutter reads: nameInClientTable, inTakeClients[], dateOfInTake,
 *                inTakeWorkerName, clientCode, status, clientId
 */
function buildCompatFields(data) {
  // ── Extract first client name ──
  let clientName = "";
  let clientCode = "";
  let inTakeClients = [];

  if (data.clients && typeof data.clients === "object") {
    const clientVals = Object.values(data.clients);
    if (clientVals.length > 0) {
      clientName = clientVals[0].fullName || clientVals[0].name || "";
      clientCode = clientVals[0].clientCode || "";
      // Build inTakeClients array for Flutter
      inTakeClients = clientVals.map(c => ({
        name: c.fullName || c.name || "",
        dob: c.birthDate || c.dob || "",
        address: c.address || "",
        clientCode: c.clientCode || "",
        gender: c.gender || "",
      }));
    }
  } else if (data.shared?.children) {
    // Private family forms — use children
    const children = data.shared.children;
    clientName = children.map(c => c.fullName || c.name || "").join(", ");
    inTakeClients = children.map(c => ({
      name: c.fullName || c.name || "",
      dob: c.dob || "",
      address: "",
    }));
  }

  // ── Extract worker name ──
  const workerName =
    data.workerInfo?.workerName ||
    data.intakeworkerName ||
    data.nameOfPerson ||
    "";

  // ── Date ──
  const today = new Date();
  const dateStr = data.createdAt || `${String(today.getDate()).padStart(2,"0")}-${String(today.getMonth()+1).padStart(2,"0")}-${today.getFullYear()}`;

  return {
    // Fields Flutter reads for display
    nameInClientTable: clientName || data.familyName || "—",
    inTakeClients,
    dateOfInTake: dateStr,
    inTakeWorkerName: workerName,
    clientCode: clientCode || data.clientCode || "",
    // Preserve existing status
    status: data.status || "Submitted",
    // Mark as patched so we know
    _compatPatched: true,
  };
}

async function patch() {
  console.log("\n📦 Reading InTakeForms collection...");
  const snap = await getDocs(collection(db, "InTakeForms"));

  console.log(`✅ Found ${snap.docs.length} documents.\n`);

  const toPatch = snap.docs.filter(d => {
    const data = d.data();
    return isNewWebAppForm(data) && !data._compatPatched;
  });

  if (toPatch.length === 0) {
    console.log("✅ No patching needed — all new-structure docs already patched.");
    process.exit(0);
  }

  console.log(`🔧 Patching ${toPatch.length} new-structure forms to add Flutter-compatible fields...\n`);

  let success = 0;
  let failed  = 0;

  for (const d of toPatch) {
    try {
      const compatFields = buildCompatFields(d.data());
      await updateDoc(doc(db, "InTakeForms", d.id), compatFields);
      console.log(`  ✅ Patched → ${d.id}  (clientName: "${compatFields.nameInClientTable}")`);
      success++;
    } catch (err) {
      console.error(`  ❌ FAILED  → ${d.id}:`, err.message);
      failed++;
    }
  }

  console.log(`\n═══════════════════════════════════════`);
  console.log(`✅ Patched: ${success} documents`);
  if (failed > 0) console.log(`❌ Failed:  ${failed}`);
  console.log(`\nOld Flutter app should now render these forms correctly.`);
  console.log(`═══════════════════════════════════════\n`);
  process.exit(0);
}

patch().catch(err => {
  console.error("❌ Patch failed:", err);
  process.exit(1);
});
