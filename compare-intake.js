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
  const evan = (await getDoc(doc(db, "InTakeForms", "1775666767340"))).data();
  const will = (await getDoc(doc(db, "InTakeForms", "1747150824330"))).data();

  const evanKeys = Object.keys(evan);
  const willKeys = Object.keys(will);

  console.log("Keys missing in Evan IntakeForm:", willKeys.filter(k => !evanKeys.includes(k)));

  if (will.inTakeClients && will.inTakeClients.length > 0 && evan.inTakeClients && evan.inTakeClients.length > 0) {
    const willClientKeys = Object.keys(will.inTakeClients[0]);
    const evanClientKeys = Object.keys(evan.inTakeClients[0]);
    console.log("\nKeys missing in Evan inTakeClients[0]:", willClientKeys.filter(k => !evanClientKeys.includes(k)));
  }

  process.exit(0);
}

compare().catch(console.error);
