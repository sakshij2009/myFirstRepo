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

async function checkMissingFields() {
  const snap = await getDocs(collection(db, "shifts"));
  
  const requiredFields = [
    "dateKey",
    "shiftPoints",
    "clientName",
    "name",
    "clientId",
    "status",
    "shiftConfirmed",
    "startDate",
    "endDate",
    "id",
    "isCancelled",
    "isRatify",
    "jobdescription", // Is this required?
  ];

  const missingCounts = {};
  requiredFields.forEach(f => missingCounts[f] = 0);

  snap.docs.forEach(d => {
    const data = d.data();
    requiredFields.forEach(f => {
      if (data[f] === undefined) {
        missingCounts[f]++;
      }
    });
  });

  console.log("Missing field counts across all 1992 shifts:");
  console.log(missingCounts);
  process.exit(0);
}

checkMissingFields().catch(console.error);
