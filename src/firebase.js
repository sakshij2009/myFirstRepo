// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getStorage } from "firebase/storage";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";

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
export const functions = getFunctions(app);

// Use local emulator in dev, production Functions when deployed
if (import.meta.env.DEV) {
  connectFunctionsEmulator(functions, "localhost", 5001);
}
auth.settings.appVerificationDisabledForTesting = false;

// ── Firestore Collection Names ─────────────────────────────────
// NEW web app (IntakeForm.jsx / PrivateFamilyIntakeForm / Assessment)
export const COLLECTION_NEW_INTAKES = "dev_InTakeForms";
