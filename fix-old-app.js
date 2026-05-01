/**
 * COMPREHENSIVE PATCH: Make new-structure forms in InTakeForms
 * fully compatible with the old Flutter app.
 *
 * The Flutter app crashes (Null check operator) when it hits a
 * new-structure doc that is missing old-style fields like:
 *   formId, clientId, clientCode, dateOfInTake, date, isEditable,
 *   status, nameInClientTable, inTakeWorkerName, inTakeWorkerPhone,
 *   inTakeWorkerAgencyName, caseWorkerName, inTakeClients (array)
 *
 * This script adds ALL those fields (with safe defaults) to any
 * new-structure doc in InTakeForms that is missing them.
 *
 * Run: node fix-old-app.js
 */

import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  getDocs,
  updateDoc,
  doc,
} from "firebase/firestore";

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

/** Returns true if this document has the NEW web-app structure */
function isNewStructure(d) {
  return (
    (d.services && typeof d.services === "object" && Array.isArray(d.services.serviceType)) ||
    (d.workerInfo && typeof d.workerInfo === "object") ||
    (d.billingInfo && typeof d.billingInfo === "object") ||
    (d.clients && typeof d.clients === "object" && !Array.isArray(d.clients) &&
      Object.keys(d.clients).some(k => k.startsWith("client")))
  );
}

/** Format a date as DD-MM-YYYY for old Flutter app */
function fmtDate(ts) {
  let d;
  if (!ts) { d = new Date(); }
  else if (ts.toDate) { d = ts.toDate(); }
  else if (typeof ts === "string" && ts.includes("-")) { return ts; }
  else { d = new Date(ts); }
  if (isNaN(d)) d = new Date();
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

/** Extract the first client's name from new-structure clients object */
function extractClientName(data) {
  if (data.clients && typeof data.clients === "object") {
    const vals = Object.values(data.clients);
    if (vals.length > 0) {
      const first = vals[0];
      return first.fullName || first.name || "";
    }
  }
  if (data.shared?.children?.length > 0) {
    return data.shared.children.map(c => c.fullName || c.name || "").join(", ");
  }
  return data.familyName || "";
}

/** Build an inTakeClients array the old app can iterate */
function buildInTakeClients(data) {
  if (data.clients && typeof data.clients === "object") {
    return Object.values(data.clients).map(c => ({
      // All fields old app might read from a client entry
      name:        c.fullName || c.name || "",
      fullName:    c.fullName || c.name || "",
      dob:         c.birthDate || c.dob || "",
      address:     c.address || "",
      clientCode:  String(c.clientCode || ""),
      gender:      c.gender || "",
      phone:       c.phone || "",
      email:       c.email || "",
    }));
  }
  if (data.shared?.children) {
    return data.shared.children.map(c => ({
      name:     c.fullName || c.name || "",
      fullName: c.fullName || c.name || "",
      dob:      c.dob || "",
      gender:   c.gender || "",
    }));
  }
  return [];
}

/** Build the full compatibility patch for a new-structure doc */
function buildPatch(docId, data) {
  const dateStr     = fmtDate(data.createdAt || data.lastUpdated || data.submittedAt || null);
  const clientName  = extractClientName(data);
  const inTakeClients = buildInTakeClients(data);

  // Worker info from new-structure
  const workerName  = data.workerInfo?.workerName   || data.intakeworkerName  || data.nameOfPerson || "";
  const workerPhone = data.workerInfo?.workerPhone   || data.intakeworkerPhone || "";
  const workerEmail = data.workerInfo?.workerEmail   || data.intakeworkerEmail || "";
  const agencyName  = data.workerInfo?.agencyName    || data.agencyName        || data.inTakeWorkerAgencyName || "";

  // Case worker info
  const cwName  = data.caseworkerName  || data.caseWorkerName  || "";
  const cwEmail = data.caseworkerEmail || data.caseWorkerEmail || "";
  const cwPhone = data.caseworkerPhone || data.caseWorkerPhone || "";

  // ClientId — use doc id as fallback since it's numeric and matches client records
  const clientId    = String(data.clientId || data.intakeFormId || docId);
  const clientCode  = String(data.clientCode || inTakeClients[0]?.clientCode || "");
  const formIdStr   = String(data.formId || data.intakeFormId || docId);

  return {
    // ── Fields Flutter MUST find (null check operators crash otherwise) ──
    formId:                  formIdStr,
    date:                    dateStr,
    dateOfInTake:            dateStr,
    isEditable:              data.isEditable ?? false,
    status:                  data.status || "Submitted",

    // Client identity
    nameInClientTable:       clientName || "—",
    clientId:                clientId,
    clientCode:              clientCode,

    // inTakeClients array — Flutter iterates this
    inTakeClients:           inTakeClients,

    // Worker fields
    inTakeWorkerName:        workerName,
    inTakeWorkerPhone:       workerPhone,
    inTakeWorkerEmail:       workerEmail,
    inTakeWorkerAgencyName:  agencyName,

    // Case worker fields (may be empty strings — that's ok, just must not be missing)
    caseWorkerName:          cwName,
    caseWorkerEmail:         cwEmail,
    caseWorkerPhone:         cwPhone,

    // Other fields old app may read
    agencyName:              agencyName,
    signature:               data.signature || data.signatureUrl || "",
    notes:                   data.notes || data.jobDescription || "",

    // Mark so we don't re-patch
    _flutterCompat: true,
  };
}

async function fix() {
  console.log("\n📦 Reading InTakeForms collection...");
  const snap = await getDocs(collection(db, "InTakeForms"));
  console.log(`✅ Found ${snap.docs.length} total documents.\n`);

  const toPatch = snap.docs.filter(d => {
    const data = d.data();
    return isNewStructure(data); // patch ALL new-structure docs every time
  });

  if (toPatch.length === 0) {
    console.log("✅ No new-structure documents found. Nothing to patch.");
    process.exit(0);
  }

  console.log(`🔧 Patching ${toPatch.length} new-structure document(s)...\n`);

  let success = 0, failed = 0;
  for (const d of toPatch) {
    try {
      const patch = buildPatch(d.id, d.data());
      await updateDoc(doc(db, "InTakeForms", d.id), patch);
      console.log(`  ✅ ${d.id}  →  client: "${patch.nameInClientTable}"  worker: "${patch.inTakeWorkerName}"`);
      success++;
    } catch (err) {
      console.error(`  ❌ ${d.id}:`, err.message);
      failed++;
    }
  }

  console.log(`\n${"═".repeat(50)}`);
  console.log(`✅ Patched: ${success}  ❌ Failed: ${failed}`);
  console.log(`\nAll ${success} docs now have old-app compatible fields.`);
  console.log(`Refresh the old Flutter web app — all intakes should appear.`);
  console.log(`${"═".repeat(50)}\n`);
  process.exit(0);
}

fix().catch(err => {
  console.error("❌ Script failed:", err);
  process.exit(1);
});
