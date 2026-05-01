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

async function diff() {
  const s29 = (await getDoc(doc(db, "shifts", "1776787793371"))).data();
  const s30 = (await getDoc(doc(db, "shifts", "1776788058759"))).data();

  const keys29 = Object.keys(s29);
  const keys30 = Object.keys(s30);

  const onlyIn30 = keys30.filter(k => !keys29.includes(k));
  const onlyIn29 = keys29.filter(k => !keys30.includes(k));

  console.log("Keys only in 30th (visible):", onlyIn30);
  console.log("Keys only in 29th (not visible):", onlyIn29);

  // also diff shiftPoints array keys
  const sp29 = s29.shiftPoints[0] || {};
  const sp30 = s30.shiftPoints[0] || {};
  
  const spKeys29 = Object.keys(sp29);
  const spKeys30 = Object.keys(sp30);
  
  console.log("ShiftPoints Keys only in 30th:", spKeys30.filter(k => !spKeys29.includes(k)));
  console.log("ShiftPoints Keys only in 29th:", spKeys29.filter(k => !spKeys30.includes(k)));

  process.exit(0);
}

diff().catch(console.error);
