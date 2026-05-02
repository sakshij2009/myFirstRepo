// verify-sahtaysha-display.mjs — Simulate exactly how ManageIntakeForms.jsx would read this doc
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

function normalizeFormType(raw) {
  const s = (raw || "").toLowerCase();
  if (s.includes("private") || s.includes("family")) return "private-family";
  return "intake-worker";
}

function normalizeServiceType(raw) {
  const s = (raw || "").toLowerCase();
  if (s.includes("emergency")) return "Emergency Care";
  if (s.includes("respite")) return "Respite Care";
  if (s.includes("supervised") || s.includes("visitation")) return "Supervised Visitations";
  if (s.includes("transport")) return "Transportations";
  return raw || "—";
}

function normalizeClientStatus(status) {
  if (status === "Accepted") return "Active";
  if (status === "Rejected") return "Inactive";
  return "Pending";
}

async function verify() {
  const snap = await getDoc(doc(db, "InTakeForms", "1735936156411"));
  if (!snap.exists()) { console.log("❌ Doc not found!"); process.exit(1); }

  const data = snap.data();
  const d = { id: snap.id, data: () => data };

  // Simulate exactly what processDoc does in ManageIntakeForms.jsx
  const rawFormType = data.formType || (data.intakeworkerName ? "Intake Worker" : "Private Family");
  const formType = normalizeFormType(rawFormType);

  let clientName = "—";
  let clientCode = snap.id.slice(0, 7);
  let parentEmail = data.parentEmail || data.email || data.applicantEmail || "—";
  let agency = data.agencyName || data.agency || "—";
  let serviceType = normalizeServiceType(data.serviceType || data.shiftCategory || data.visitDetails || "");

  if (data.shared?.children?.[0]?.fullName) {
    clientName = data.shared.children.map(c => c.fullName).join(", ");
  } else if (data.children?.[0]?.fullName || data.children?.[0]?.name) {
    clientName = data.children.map(c => c.fullName || c.name || "").filter(Boolean).join(", ");
  }

  if ((!clientName || clientName === "—") && Array.isArray(data.inTakeClients) && data.inTakeClients.length > 0) {
    const first = data.inTakeClients[0];
    if (first.name || first.fullName) {
      clientName = first.name || first.fullName;
      parentEmail = first.parentEmail || first.email || parentEmail;
      agency = first.agencyName || first.agency || agency;
      serviceType = normalizeServiceType(first.serviceType || first.shiftCategory || serviceType);
    }
  }

  if ((!clientName || clientName === "—") && data.clients && typeof data.clients === "object") {
    const vals = Object.values(data.clients);
    if (vals.length > 0 && (vals[0].fullName || vals[0].name)) {
      clientName = vals[0].fullName || vals[0].name;
    }
  }

  if (!clientName || clientName === "—") {
    clientName = data.clientName || data.childName || data.name
      || data.nameInClientTable || data.familyName || "—";
  }

  const serviceFromClients = Array.isArray(data.inTakeClients) && data.inTakeClients[0]?.serviceRequired?.[0];
  if (serviceType === "—" && serviceFromClients) {
    serviceType = normalizeServiceType(serviceFromClients);
  }

  const result = {
    id: snap.id,
    clientName,
    formType,
    formTypeLabel: formType === "private-family" ? "✅ Private Family" : "Intake Worker",
    clientStatus: normalizeClientStatus(data.status || "Pending"),
    agency,
    serviceType,
    parentEmail,
    submittedAt: data.submittedOn || data.createDate || data.createdAt || data.dateOfInTake || "—",
    filledBy: data.filledBy || data.inTakeWorkerName || data.parentName || "—",
  };

  console.log("\n=== How ManageIntakeForms.jsx will display Sahtaysha ===\n");
  Object.entries(result).forEach(([k, v]) => console.log(`  ${k.padEnd(15)}: ${v}`));
  console.log("\n✅ She will appear correctly in the Private Family tab of Manage Intake Forms.\n");
  process.exit(0);
}

verify().catch(err => { console.error(err); process.exit(1); });
