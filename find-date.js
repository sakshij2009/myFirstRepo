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

async function findDate() {
  const c = await getDocs(collection(db, "clients"));
  for (const d of c.docs) {
    const data = d.data();
    if (JSON.stringify(data).includes("07 Mar 2026 03:51 pm") || JSON.stringify(data).includes("07 Mar 2026 03:51 PM")) {
      console.log(`Found in clients/${d.id}`);
      console.log(data);
    }
  }

  const i = await getDocs(collection(db, "InTakeForms"));
  for (const d of i.docs) {
    const data = d.data();
    if (JSON.stringify(data).includes("07 Mar 2026 03:51 pm") || JSON.stringify(data).includes("07 Mar 2026 03:51 PM")) {
      console.log(`Found in InTakeForms/${d.id}`);
      console.log(data);
    }
  }

  process.exit(0);
}

findDate().catch(console.error);
