// inspect-private-forms.mjs — Show the structure of private family forms in InTakeForms
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

async function inspect() {
  const snap = await getDocs(collection(db, "InTakeForms"));
  console.log(`Total docs in InTakeForms: ${snap.docs.length}\n`);

  // Find private family forms
  const privateForms = snap.docs.filter(d => {
    const data = d.data();
    const ft = (data.formType || "").toLowerCase();
    const agency = (data.agencyName || data.agencyType || "").toLowerCase();
    return ft.includes("private") || ft.includes("family") || agency.includes("private");
  });

  console.log(`Private family forms found: ${privateForms.length}\n`);
  
  if (privateForms.length > 0) {
    // Show structure of first one as example
    const ex = privateForms[0];
    console.log(`=== Example Private Form: ${ex.id} ===`);
    console.log("Top-level keys:", Object.keys(ex.data()).join(", "));
    console.log("\nFull doc:");
    console.log(JSON.stringify(ex.data(), null, 2));
  }

  // Also show all formTypes present
  const formTypes = new Set();
  snap.docs.forEach(d => {
    const data = d.data();
    const ft = data.formType || data.agencyType || data.agencyName || "(none)";
    formTypes.add(ft);
  });
  console.log("\n=== All formType values in InTakeForms ===");
  formTypes.forEach(ft => console.log(" -", ft));

  process.exit(0);
}

inspect().catch(err => { console.error(err); process.exit(1); });
