import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc } from "firebase/firestore";

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

async function compare() {
  const evan = (await getDoc(doc(db, "clients", "family_1775666767340"))).data();
  const brayden = (await getDoc(doc(db, "clients", "1735665335759"))).data();

  const evanKeys = Object.keys(evan);
  const braydenKeys = Object.keys(brayden);

  const missingInEvan = braydenKeys.filter(k => !evanKeys.includes(k));
  console.log("Keys missing in Evan:", missingInEvan);

  console.log("\nChecking types of common keys:");
  for (const k of evanKeys) {
    if (braydenKeys.includes(k)) {
      const et = Array.isArray(evan[k]) ? "array" : typeof evan[k];
      const bt = Array.isArray(brayden[k]) ? "array" : typeof brayden[k];
      if (et !== bt && evan[k] !== null && brayden[k] !== null) {
        console.log(`Mismatch on ${k}: Evan=${et}, Brayden=${bt}`);
      }
    }
  }

  process.exit(0);
}

compare().catch(console.error);
