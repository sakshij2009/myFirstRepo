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

async function checkIds() {
  const d1 = (await getDoc(doc(db, "shifts", "1776787734569"))).data(); // The one user just pasted
  const d30 = (await getDoc(doc(db, "shifts", "1776788058759"))).data(); // The 30th shift
  const old = (await getDoc(doc(db, "shifts", "1765768040055"))).data(); // Very old shift

  console.log("new bad shift id type:", typeof d1.id, d1.id);
  console.log("30th shift id type:", typeof d30.id, d30.id);
  console.log("old shift id type:", typeof old.id, old.id);

  process.exit(0);
}

checkIds().catch(console.error);
