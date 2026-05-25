/**
 * FIX CLIENT DOCUMENTS
 * =====================
 * The old Flutter app crashes when a CLIENT document has empty
 * sub-objects like hospital: {} or rateList: [] with missing fields.
 *
 * This script:
 * 1. Scans ALL client-related collections for the Nickel-Crawford
 *    family (and any other client with empty sub-objects)
 * 2. Adds safe default subfields to every nested object
 * 3. Ensures no null values exist in expected fields
 *
 * Run: node fix-client-docs.js
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

/**
 * Merges defaults into an object WITHOUT overwriting existing values.
 * Only fills in missing or null keys.
 */
function safeDefaults(existing, defaults) {
  const result = { ...defaults };
  for (const [k, v] of Object.entries(existing || {})) {
    if (v !== null && v !== undefined) result[k] = v;
  }
  return result;
}

/**
 * Build a safe client document patch.
 * Ensures every nested object/array has at least the subfields
 * the Flutter app expects to access with ! (non-null assertion).
 */
function buildClientPatch(data) {
  const patch = {};

  // ── hospital: {} → needs subfields ──
  if (data.hospital !== undefined) {
    patch.hospital = safeDefaults(data.hospital, {
      name:          "",
      address:       "",
      phone:         "",
      doctorName:    "",
      contactPerson: "",
      notes:         "",
    });
  }

  // ── rateList: [] → ensure it stays an array ──
  if (!Array.isArray(data.rateList)) {
    patch.rateList = [];
  }

  // ── medications: [] → ensure it stays an array ──
  if (!Array.isArray(data.medications)) {
    patch.medications = [];
  }

  // ── Other common nullable fields ──
  const stringDefaults = [
    "name", "agencyName", "agencyId", "agencyAddress", "agencyType",
    "kmRate", "clientCode", "clientStatus", "invoiceEmail",
    "phone", "email", "address", "notes",
  ];
  for (const field of stringDefaults) {
    if (data[field] === null || data[field] === undefined) {
      patch[field] = "";
    }
  }

  const boolDefaults = ["fileClosed", "isActive"];
  for (const field of boolDefaults) {
    if (data[field] === null || data[field] === undefined) {
      patch[field] = false;
    }
  }

  const arrayDefaults = ["shiftHistory", "documents", "notes", "contacts"];
  for (const field of arrayDefaults) {
    if (data[field] === null || data[field] === undefined) {
      patch[field] = [];
    }
  }

  return patch;
}

/**
 * Check if a client doc needs patching
 */
function needsPatch(data) {
  if (data.hospital !== undefined) {
    const h = data.hospital;
    if (typeof h === "object" && !Array.isArray(h)) {
      // Empty object OR missing any expected subfield
      if (!h.name && !h.doctorName && !h.phone) return true;
    }
  }
  return false;
}

async function fixCollection(collName) {
  console.log(`\n📦 Scanning '${collName}'...`);
  let snap;
  try {
    snap = await getDocs(collection(db, collName));
  } catch (e) {
    console.log(`   ⚠️  Collection '${collName}' not found or not accessible — skipping.`);
    return 0;
  }

  if (snap.empty) {
    console.log(`   ℹ️  Empty collection — nothing to do.`);
    return 0;
  }

  const toPatch = snap.docs.filter(d => needsPatch(d.data()));
  console.log(`   Found ${snap.docs.length} docs, ${toPatch.length} need patching.`);

  let fixed = 0;
  for (const d of toPatch) {
    const data = d.data();
    const patch = buildClientPatch(data);
    if (Object.keys(patch).length === 0) continue;
    try {
      await updateDoc(doc(db, collName, d.id), patch);
      const name = data.name || data.clientName || data.familyName || d.id;
      console.log(`   ✅ Fixed: ${name} (${d.id})`);
      fixed++;
    } catch (err) {
      console.error(`   ❌ Failed ${d.id}:`, err.message);
    }
  }
  return fixed;
}

async function run() {
  console.log("\n🔍 Scanning all client-related Firestore collections...\n");

  // Try all possible collection names the Flutter app might use for clients
  const collections = [
    "clients",
    "families",
    "Clients",
    "Families",
    "clientProfiles",
    "familyProfiles",
  ];

  let totalFixed = 0;
  for (const col of collections) {
    const fixed = await fixCollection(col);
    totalFixed += fixed;
  }

  console.log(`\n${"═".repeat(50)}`);
  console.log(`✅ Total documents fixed: ${totalFixed}`);
  console.log(`\nNow refresh the old Flutter app and check again.`);
  console.log(`${"═".repeat(50)}\n`);
  process.exit(0);
}

run().catch(err => {
  console.error("❌ Script failed:", err);
  process.exit(1);
});
