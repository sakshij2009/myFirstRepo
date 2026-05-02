import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, where } from "firebase/firestore";

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

async function findEmpty() {
  const snap = await getDocs(collection(db, "shifts"));
  const empty = snap.docs.filter(d => d.data().clockIn === "" || d.data().clockIn === null || d.data().clockIn === undefined);
  console.log(`Found ${empty.length} shifts with empty clockIn.`);
  if (empty.length > 0) {
    console.log("Example ID:", empty[0].id);
    console.log("Example data:", JSON.stringify(empty[0].data(), null, 2));
  }
  process.exit(0);
}

findEmpty().catch(console.error);
