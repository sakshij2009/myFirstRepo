/**
 * DIRECT FIRESTORE MIGRATION — run from project root in terminal:
 *
 *   node run-migration.cjs YOUR_ADMIN_PASSWORD
 *
 * e.g.  node run-migration.cjs MyPassword123
 */
"use strict";

const BASE = "C:/Users/Sakshi Jamwal/Desktop/startup/FFAdmin-prod/node_modules/firebase";
const { initializeApp }                      = require(`${BASE}/app/dist/index.cjs.js`);
const { getAuth, signInWithEmailAndPassword } = require(`${BASE}/auth/dist/index.cjs.js`);
const { getFirestore, collection, getDocs, doc, updateDoc }
                                             = require(`${BASE}/firestore/dist/index.cjs.js`);

const firebaseConfig = {
  apiKey:            "AIzaSyAUmXXLprgpozG0nRh3QXskrhcNChXaw3M",
  authDomain:        "famforeveradmin.firebaseapp.com",
  projectId:         "famforeveradmin",
  storageBucket:     "famforeveradmin.appspot.com",
  messagingSenderId: "849373739430",
  appId:             "1:849373739430:web:5e3d88fbb3200dc3a43767",
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function toFlutterDate(val) {
  if (!val || typeof val !== "string" || !val.trim()) return null;
  if (/^\d{2}-\d{2}-\d{4}$/.test(val)) return val;          // already DD-MM-YYYY ✓
  if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {                    // YYYY-MM-DD → flip
    const [y, m, d] = val.split("-");
    return `${d}-${m}-${y}`;
  }
  return null;
}

function isBadDate(val) {
  if (val === "" || val === null || val === undefined) return true;
  if (typeof val === "string" && /^\d{4}-\d{2}-\d{2}$/.test(val)) return true;
  return false;
}

function fixExistingClients(arr) {
  if (!Array.isArray(arr)) return arr;
  return arr.map((c) => ({
    ...c,
    name: c.name || c.fullName || "",
    dob:  isBadDate(c.dob) ? (toFlutterDate(c.dob) || null) : (c.dob !== undefined ? c.dob : null),
  }));
}

function buildClientsFromReact(clients) {
  if (!clients || typeof clients !== "object" || Array.isArray(clients)) return [];
  return Object.values(clients).map((c) => ({
    name:           c.fullName        || "",
    gender:         c.gender          || "",
    dob:            toFlutterDate(c.birthDate) || null,
    address:        c.address         || "",
    phone:          c.phone           || "",
    email:          c.email           || "",
    diagnosis:      c.diagnosis       || "",
    allergies:      c.allergies       || "",
    medicalInfo:    "",
    transportNeeds: "",
    serviceType:    "",
    visitFrequency: "",
  }));
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const password = process.argv[2];
  if (!password) {
    console.error("❌  Usage: node run-migration.cjs YOUR_ADMIN_PASSWORD");
    process.exit(1);
  }

  const adminEmail = "familyforeverca@gmail.com";
  console.log("Initialising Firebase…");
  const app  = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db   = getFirestore(app);

  console.log(`Signing in as ${adminEmail}…`);
  try {
    await signInWithEmailAndPassword(auth, adminEmail, password);
    console.log("✅  Signed in.\n");
  } catch (e) {
    console.error("❌  Sign-in failed:", e.message);
    process.exit(1);
  }

  console.log("Fetching all InTakeForms documents…");
  const snapshot = await getDocs(collection(db, "InTakeForms"));
  console.log(`Found ${snapshot.size} document(s).\n`);

  let updated = 0, skipped = 0, errors = 0;

  for (const docSnap of snapshot.docs) {
    const data    = docSnap.data();
    const ref     = doc(db, "InTakeForms", docSnap.id);
    const patch   = {};
    const reasons = [];

    const isReactForm   = !!(
      (data.clients   && typeof data.clients   === "object" && !Array.isArray(data.clients)) ||
      (data.workerInfo && typeof data.workerInfo === "object") ||
      (data.services   && typeof data.services  === "object")
    );
    const hasLegacy = Array.isArray(data.inTakeClients) && data.inTakeClients.length > 0;

    // ── 1. isActive ───────────────────────────────────────────────────────────
    if (data.isActive !== true) {
      patch.isActive = true; reasons.push("isActive");
    }

    // ── 2. inTakeClients ──────────────────────────────────────────────────────
    if (!hasLegacy) {
      if (isReactForm && data.clients) {
        // React form missing inTakeClients — build from clients object
        const built = buildClientsFromReact(data.clients);
        if (built.length > 0) { patch.inTakeClients = built; reasons.push(`inTakeClients(built ${built.length})`); }
        else                  { patch.inTakeClients = [];    reasons.push("inTakeClients([])"); }
      } else {
        // Flutter/unknown form missing inTakeClients — set empty array
        patch.inTakeClients = [];
        reasons.push("inTakeClients([])");
      }
    } else {
      // Fix dob format + ensure name field in existing array
      const fixed   = fixExistingClients(data.inTakeClients);
      const changed = JSON.stringify(fixed) !== JSON.stringify(data.inTakeClients);
      if (changed) { patch.inTakeClients = fixed; reasons.push("inTakeClients.dob/name"); }
    }

    // ── 3. nameInClientTable / childsName ─────────────────────────────────────
    if (!data.nameInClientTable || !data.childsName) {
      // Try to get name from: existing clients, patched clients, react clients
      let name = data.nameInClientTable || data.childsName || "";
      if (!name && hasLegacy)           name = (data.inTakeClients[0] && data.inTakeClients[0].name) || "";
      if (!name && patch.inTakeClients && patch.inTakeClients[0]) name = patch.inTakeClients[0].name || "";
      if (!name && isReactForm && data.clients) {
        const first = Object.values(data.clients)[0];
        name = (first && first.fullName) || "";
      }
      // Even if name is still "" that is non-null and safe for Flutter
      if (!data.nameInClientTable) { patch.nameInClientTable = name; reasons.push("nameInClientTable"); }
      if (!data.childsName)        { patch.childsName        = name; reasons.push("childsName"); }
    }

    // ── 4. dateOfInTake ───────────────────────────────────────────────────────
    const hasDoi = Object.prototype.hasOwnProperty.call(data, "dateOfInTake");
    if (!hasDoi) {
      // Field completely missing — use consentDate if available, else today
      const fallback = toFlutterDate(data.consentDate) || "01-05-2026";
      patch.dateOfInTake = fallback;
      reasons.push(`dateOfInTake(added:"${fallback}")`);
    } else if (isBadDate(data.dateOfInTake)) {
      // Field exists but value is bad (empty string or YYYY-MM-DD)
      const fixed = toFlutterDate(data.dateOfInTake) || toFlutterDate(data.consentDate) || "01-05-2026";
      patch.dateOfInTake = fixed;
      reasons.push(`dateOfInTake("${data.dateOfInTake}"→"${fixed}")`);
    }

    // ── 5. nameOfPerson / inTakeWorkerName ────────────────────────────────────
    if (!data.nameOfPerson && isReactForm) {
      const wn = (data.workerInfo && data.workerInfo.workerName) || "";
      if (wn) { patch.nameOfPerson = wn; reasons.push("nameOfPerson"); }
    }
    if (!data.inTakeWorkerName && isReactForm) {
      const wn = data.intakeworkerName || (data.workerInfo && data.workerInfo.workerName) || "";
      if (wn) { patch.inTakeWorkerName = wn; reasons.push("inTakeWorkerName"); }
    }

    // ── 6. Null-out top-level empty-string date fields ────────────────────────
    for (const field of ["submittedOn", "createdAt", "dateOfBirth"]) {
      if (data[field] === "") { patch[field] = null; reasons.push(`${field}→null`); }
    }

    // ── Skip / Update ─────────────────────────────────────────────────────────
    if (Object.keys(patch).length === 0) {
      const label = data.nameInClientTable || data.childsName || "(no name)";
      console.log(`  ✓ SKIP  [${docSnap.id.slice(0,10)}] ${label}`);
      skipped++;
      continue;
    }

    const label = data.nameInClientTable || data.childsName || patch.nameInClientTable || "(no name)";
    try {
      await updateDoc(ref, patch);
      console.log(`  ✅ FIXED [${docSnap.id.slice(0,10)}] ${label.padEnd(28)} → ${reasons.join(", ")}`);
      updated++;
    } catch (e) {
      console.error(`  ❌ ERROR [${docSnap.id.slice(0,10)}] ${label}: ${e.message}`);
      errors++;
    }
  }

  console.log(`\n${"─".repeat(70)}`);
  console.log(`Migration complete:`);
  console.log(`  Fixed:      ${updated}`);
  console.log(`  Already OK: ${skipped}`);
  console.log(`  Errors:     ${errors}`);
  console.log(`  Total:      ${snapshot.size}`);
  console.log("─".repeat(70));
  console.log("\nNow hard-refresh famforeveradmin.web.app: Ctrl+Shift+R");
  process.exit(0);
}

main().catch((e) => { console.error("Fatal:", e); process.exit(1); });
