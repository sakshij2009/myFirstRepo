// inspect-sahtaysha.mjs — Get the full client record for Sahtaysha
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, collection, getDocs } from "firebase/firestore";

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
  // 1. Get the full client doc
  const clientRef = doc(db, "clients", "1735936156411");
  const clientSnap = await getDoc(clientRef);
  if (clientSnap.exists()) {
    console.log("\n=== CLIENT DOC (1735936156411) ===");
    console.log(JSON.stringify(clientSnap.data(), null, 2));
  }

  // 2. Also scan intakeForms (mobile collection) more carefully
  console.log("\n\n=== Scanning all intakeForms docs for Sahtaysha ===");
  const mobileSnap = await getDocs(collection(db, "intakeForms"));
  console.log(`Total intakeForms docs: ${mobileSnap.docs.length}`);
  mobileSnap.docs.forEach(d => {
    const json = JSON.stringify(d.data()).toLowerCase();
    if (json.includes("sahtaysha") || json.includes("zylstra")) {
      console.log(`FOUND in intakeForms: ${d.id}`);
      console.log(JSON.stringify(d.data(), null, 2));
    }
  });

  console.log("\nDone.");
  process.exit(0);
}

inspect().catch(err => { console.error(err); process.exit(1); });
