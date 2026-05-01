import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, updateDoc } from "firebase/firestore";

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

function fixDateString(str) {
  if (typeof str !== 'string') return str;
  if (str.endsWith(' am')) return str.substring(0, str.length - 2) + 'AM';
  if (str.endsWith(' pm')) return str.substring(0, str.length - 2) + 'PM';
  return str;
}

async function fixDates(collectionName) {
  console.log(`Fixing dates in ${collectionName}...`);
  const snap = await getDocs(collection(db, collectionName));
  
  for (const d of snap.docs) {
    const data = d.data();
    const patch = {};

    ['createDate', 'createdAt', 'lastUpdatedAt'].forEach(k => {
      if (typeof data[k] === 'string' && (data[k].endsWith(' am') || data[k].endsWith(' pm'))) {
        patch[k] = fixDateString(data[k]);
      }
    });

    if (Object.keys(patch).length > 0) {
      await updateDoc(doc(db, collectionName, d.id), patch);
      console.log(`Updated ${d.id} with ${JSON.stringify(patch)}`);
    }
  }
}

async function run() {
  await fixDates("InTakeForms");
  console.log("Done");
  process.exit(0);
}

run().catch(console.error);
