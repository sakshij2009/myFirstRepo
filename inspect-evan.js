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
  
  let oldDoc = null;
  let evanDoc = null;

  for (const d of snap.docs) {
    const data = d.data();
    if (data.nameInClientTable === "Evan Xander Nickel-Crawford") {
      evanDoc = { id: d.id, ...data };
    } else if (!data._flutterCompat && !data._compatPatched && oldDoc === null) {
      oldDoc = { id: d.id, ...data };
    }
  }

  console.log("=== EVAN DOC ===");
  console.log(JSON.stringify(evanDoc, null, 2));
  
  console.log("\n=== OLD WORKING DOC ===");
  console.log(JSON.stringify(oldDoc, null, 2));

  process.exit(0);
}

inspect().catch(console.error);
