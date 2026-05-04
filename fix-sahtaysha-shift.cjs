"use strict";
const BASE = "C:/Users/Sakshi Jamwal/Desktop/startup/FFAdmin-prod/node_modules/firebase";
const { initializeApp }                      = require(`${BASE}/app/dist/index.cjs.js`);
const { getAuth, signInWithEmailAndPassword } = require(`${BASE}/auth/dist/index.cjs.js`);
const { getFirestore, doc, updateDoc }        = require(`${BASE}/firestore/dist/index.cjs.js`);

const firebaseConfig = {
  apiKey:            "AIzaSyAUmXXLprgpozG0nRh3QXskrhcNChXaw3M",
  authDomain:        "famforeveradmin.firebaseapp.com",
  projectId:         "famforeveradmin",
  storageBucket:     "famforeveradmin.appspot.com",
  messagingSenderId: "849373739430",
  appId:             "1:849373739430:web:5e3d88fbb3200dc3a43767",
};

async function main() {
  const password = process.argv[2];
  if (!password) { console.error("Usage: node fix-sahtaysha-shift.cjs PASSWORD"); process.exit(1); }

  const app  = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db   = getFirestore(app);

  await signInWithEmailAndPassword(auth, "familyforeverca@gmail.com", password);
  console.log("Signed in.");

  const shiftId = "1777658880025";
  const ref = doc(db, "shifts", shiftId);

  // Fix all fields Flutter needs
  const patch = {
    // ── CRITICAL: dateKey Flutter queries by DD-MM-YYYY ──
    dateKey:        "03-05-2026",
    dateKey_iso:    "2026-05-03",

    // ── CRITICAL: userId must be numeric integer ──
    userId:         27,
    username:       "jas.singh027",
    phone:          "7805227050",
    email:          "jaskarans7050@gmail.com",

    // ── dates as strings (Flutter expects "DD Mon YYYY") ──
    startDate:      "03 May 2026",
    endDate:        "03 May 2026",

    // ── shift type & category with real Firestore IDs ──
    typeName:       "Regular",
    typeId:         "1737138828300",
    categoryName:   "Supervised Visitation",
    categoryId:     "1734975686976",
    jobname:        "Sahtaysha Zylstra",
    jobdescription: "Sahtaysha Zylstra is good kid who loves Lilo and Stitch, stickers and especially her dad David. Meet Joy at the 7 Eleven by Davids house and pick up Sahtaysha and take her to Davids house for the visit",

    // ── status flags ──
    status:         "Pending",
    billingStatus:  "Billable",
    locked:         false,

    // ── financial defaults ──
    kms:             0,
    approvedKms:     0,
    expense:         0,
    approvedExpense: 0,
    clientRate:      0,
    clientKMRate:    0,

    // ── other Flutter-expected fields ──
    timeStampId:    1746266880000,   // ~May 3 2026 10am
    startLatitude:  0,
    startLongitude: 0,
    endLatitude:    0,
    endLongitude:   0,
    expenseReceiptUrlList: [],
    profilePhotoUrl: "",
    shiftReportImageUrl: "",
    primaryUserId:  "jas.singh027",
    primaryUserName: "Jaskaran Singh",
  };

  await updateDoc(ref, patch);
  console.log("✅ Shift", shiftId, "fixed!");
  console.log("   dateKey:", patch.dateKey);
  console.log("   userId:", patch.userId, "(numeric)");
  console.log("Now open famforeveradmin.web.app in Incognito and check today's shifts.");
  process.exit(0);
}

main().catch(e => { console.error("Error:", e.message); process.exit(1); });
