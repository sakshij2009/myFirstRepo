// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getStorage } from "firebase/storage";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAUmXXLprgpozG0nRh3QXskrhcNChXaw3M",
  authDomain: "famforeveradmin.firebaseapp.com",
  projectId: "famforeveradmin",
  storageBucket: "famforeveradmin.appspot.com",
  messagingSenderId: "849373739430",
  appId: "1:849373739430:web:5e3d88fbb3200dc3a43767",
  measurementId: "G-NQ4XW9FTHP"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
export const storage = getStorage(app);
export const db = getFirestore(app);
export const auth = getAuth(app);
auth.settings.appVerificationDisabledForTesting = false;

// ── Firestore Collection Names ─────────────────────────────────
// OLD web app (legacy structure) → keeps old InTakeForms data
export const COLLECTION_OLD_INTAKES = "InTakeForms";
// NEW web app (IntakeForm.jsx / PrivateFamilyIntakeForm / Assessment)
// Reverted: Using InTakeForms as the primary collection again.
export const COLLECTION_NEW_INTAKES = "InTakeForms";
