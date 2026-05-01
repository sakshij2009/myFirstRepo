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

async function checkClientDetails() {
  const d30 = (await getDoc(doc(db, "shifts", "1776788058759"))).data();
  const d29 = (await getDoc(doc(db, "shifts", "1776787793371"))).data();

  console.log("30th shift clientDetails type:", typeof d30.clientDetails, Array.isArray(d30.clientDetails) ? 'array' : '', d30.clientDetails === null ? 'null' : '');
  console.log("29th shift clientDetails type:", typeof d29.clientDetails, Array.isArray(d29.clientDetails) ? 'array' : '', d29.clientDetails === null ? 'null' : '');
  
  console.log("30th shift user type:", typeof d30.user, Array.isArray(d30.user) ? 'array' : '', d30.user === null ? 'null' : '');
  console.log("29th shift user type:", typeof d29.user, Array.isArray(d29.user) ? 'array' : '', d29.user === null ? 'null' : '');

  process.exit(0);
}

checkClientDetails().catch(console.error);
