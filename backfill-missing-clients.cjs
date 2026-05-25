/**
 * Creates minimal InTakeForms entries for clients that exist in the `clients`
 * collection but have NO InTakeForms entry — so they appear in Flutter's
 * "Add Shift" client dropdown.
 *
 * Run:  node backfill-missing-clients.cjs YOUR_ADMIN_PASSWORD
 */
"use strict";

const BASE = "C:/Users/Sakshi Jamwal/Desktop/startup/FFAdmin-prod/node_modules/firebase";
const { initializeApp }                      = require(`${BASE}/app/dist/index.cjs.js`);
const { getAuth, signInWithEmailAndPassword } = require(`${BASE}/auth/dist/index.cjs.js`);
const { getFirestore, collection, getDocs, addDoc, Timestamp }
                                             = require(`${BASE}/firestore/dist/index.cjs.js`);

const firebaseConfig = {
  apiKey:            "AIzaSyAUmXXLprgpozG0nRh3QXskrhcNChXaw3M",
  authDomain:        "famforeveradmin.firebaseapp.com",
  projectId:         "famforeveradmin",
  storageBucket:     "famforeveradmin.appspot.com",
  messagingSenderId: "849373739430",
  appId:             "1:849373739430:web:5e3d88fbb3200dc3a43767",
};

// Clients to SKIP — test/placeholder entries
const SKIP_NAMES = new Set([
  "abc", "tara", "family example", "Family Forever", "Britney",
  "Vivian", "cammi", "ali chabot", "TJ",
]);

function normalize(name) {
  return (name || "").toLowerCase().trim().replace(/\s+/g, " ");
}

function namesOverlap(a, b) {
  const na = normalize(a);
  const nb = normalize(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  // Check if first significant word matches
  const wa = na.split(/[\s,&]+/).filter(w => w.length > 2);
  const wb = nb.split(/[\s,&]+/).filter(w => w.length > 2);
  return wa.some(w => wb.includes(w));
}

async function main() {
  const password = process.argv[2];
  if (!password) { console.error("Usage: node backfill-missing-clients.cjs PASSWORD"); process.exit(1); }

  console.log("Initialising Firebase…");
  const app  = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db   = getFirestore(app);

  await signInWithEmailAndPassword(auth, "familyforeverca@gmail.com", password);
  console.log("✅  Signed in.\n");

  // Load all InTakeForms names
  const intakeSnap = await getDocs(collection(db, "InTakeForms"));
  const intakeNames = intakeSnap.docs.map(d => d.data().nameInClientTable || d.data().childsName || "").filter(Boolean);
  console.log(`InTakeForms: ${intakeSnap.size} docs, ${intakeNames.length} with names.\n`);

  // Load all clients
  const clientsSnap = await getDocs(collection(db, "clients"));
  console.log(`Clients collection: ${clientsSnap.size} clients.\n`);

  let created = 0, skipped = 0;

  for (const docSnap of clientsSnap.docs) {
    const cData = docSnap.data();
    const clientName = cData.name || cData.fullName || cData.clientName || "";

    if (!clientName) { skipped++; continue; }
    if (SKIP_NAMES.has(clientName)) { console.log(`  ⏭  SKIP (test entry): ${clientName}`); skipped++; continue; }

    // Check if already has an InTakeForms entry
    const alreadyExists = intakeNames.some(n => namesOverlap(n, clientName));
    if (alreadyExists) {
      console.log(`  ✓  EXISTS: ${clientName}`);
      skipped++;
      continue;
    }

    // Create minimal InTakeForms entry
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, "0");
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const yyyy = today.getFullYear();
    const todayStr = `${dd}-${mm}-${yyyy}`;

    const newDoc = {
      isActive:          true,
      nameInClientTable: clientName,
      childsName:        clientName,
      dateOfInTake:      cData.intakeDate || todayStr,
      nameOfPerson:      "",
      inTakeWorkerName:  "",
      inTakeClients: [{
        name:           clientName,
        gender:         cData.gender || "",
        dob:            null,
        address:        cData.address || "",
        phone:          cData.phone || cData.parentPhone || "",
        email:          cData.email || "",
        diagnosis:      cData.diagnosis || "",
        allergies:      cData.allergies || "",
        medicalInfo:    "",
        transportNeeds: "",
        serviceType:    "",
        visitFrequency: "",
      }],
      // Link back to the clients doc
      clientId:   docSnap.id,
      formType:   "auto-created",
      createdAt:  todayStr,
      submittedOn: todayStr,
      status:     "Accepted",
    };

    try {
      await addDoc(collection(db, "InTakeForms"), newDoc);
      console.log(`  ✅ CREATED InTakeForm for: ${clientName}`);
      created++;
      // Add to our local list so we don't double-create
      intakeNames.push(clientName);
    } catch (e) {
      console.error(`  ❌ ERROR for ${clientName}: ${e.message}`);
    }
  }

  console.log(`\n${"─".repeat(60)}`);
  console.log(`Done: ${created} InTakeForms created, ${skipped} skipped.`);
  console.log("Now hard-refresh famforeveradmin.web.app in Incognito.");
  process.exit(0);
}

main().catch(e => { console.error("Fatal:", e); process.exit(1); });
