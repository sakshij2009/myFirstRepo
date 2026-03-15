/**
 * ONE-TIME MIGRATION v2: Fix existing family docs to use the simplified shiftPoints structure.
 * Each shiftPoints entry gets ALL child info merged (personal + parent + medical + transport)
 * using field names that match AddClient.jsx (name, dob, seatType, pickupLocation, etc.).
 * Removes the separate 'siblings' array.
 *
 * Run: node migrate-clients.mjs
 */

import { initializeApp } from "firebase/app";
import {
    getFirestore, collection, getDocs, getDoc, doc, setDoc, deleteDoc,
    query, where, Timestamp,
} from "firebase/firestore";

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

const generateClientCode = () => Math.floor(100000 + Math.random() * 900000).toString();

async function migrate() {
    console.log("📦 Fetching clients and intake forms...\n");

    const [clientsSnap, formsSnap] = await Promise.all([
        getDocs(collection(db, "clients")),
        getDocs(collection(db, "InTakeForms")),
    ]);

    const allClients = clientsSnap.docs.map((d) => ({ docId: d.id, ...d.data() }));
    const allForms = formsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

    // -- 1. Delete any stray individual sibling docs (non-family, has intakeId) --
    const individualClients = allClients.filter((c) => c.intakeId && !c.isFamily);
    for (const c of individualClients) {
        await deleteDoc(doc(db, "clients", c.docId));
        console.log(`🗑️  Deleted individual doc: clients/${c.docId} (${c.name || c.fullName})`);
    }

    // -- 2. Rebuild every family doc using the IntakeForms source of truth ------
    const familyDocs = allClients.filter((c) => c.isFamily);
    for (const fam of familyDocs) {
        const intake = allForms.find((f) => f.id === fam.intakeId);
        if (!intake) { console.warn(`⚠️  No intake form for ${fam.docId} — skipping`); continue; }

        // Normalize clients
        const clients = intake.clients
            ? (Array.isArray(intake.clients) ? intake.clients : Object.values(intake.clients))
            : [];

        // Build merged shiftPoints (one per child, ALL info, correct field names)
        const shiftPoints = clients.map((c) => {
            const parent = (intake.parentInfoList || []).find((p) => p.clientName === c.fullName) || {};
            const medical = (intake.medicalInfoList || []).find((m) => m.clientName === c.fullName) || {};
            const transport = (intake.transportationInfoList || []).find((t) => t.clientName === c.fullName) || {};
            return {
                name: c.fullName || "",
                gender: c.gender || "",
                dob: c.birthDate || "",
                address: c.address || "",
                phone: c.phone || "",
                email: c.email || "",
                photos: Array.isArray(c.photos) ? c.photos : [],
                clientInfo: c.clientInfo || "",
                cfsStatus: c.cfsStatus || "",
                dfnaNumber: c.dfnaNumber || "",
                treatyNumber: c.treatyNumber || "",
                parentName: parent.parentName || "",
                relationship: parent.relationShip || "",
                parentPhone: parent.parentPhone || "",
                parentEmail: parent.parentEmail || "",
                parentAddress: parent.parentAddress || "",
                healthCareNo: medical.healthCareNo || "",
                diagnosis: medical.diagnosis || "",
                medicalConcern: medical.medicalConcern || "",
                mobilityAssistance: medical.mobilityAssistance || "",
                mobilityInfo: medical.mobilityInfo || "",
                communicationAid: medical.communicationAid || "",
                communicationInfo: medical.communicationInfo || "",
                seatType: transport.carSeatType || "No Seat Required",
                carSeatRequired: transport.carSeatRequired || "no",
                pickupLocation: transport.pickupAddress || "",
                dropLocation: transport.dropoffAddress || "",
                pickupTime: transport.pickupTime || "",
                dropTime: transport.dropOffTime || "",
                transportationOverview: transport.transportationOverview || "",
                cyimId: c.cyimId || "",
                pickupDate: "", dropDate: "",
                visitDate: "", visitStartTime: "", visitEndTime: "",
                visitDuration: "", visitLocation: "",
            };
        });

        const familyName =
            intake.familyName ||
            (clients[0]?.fullName ? clients[0].fullName.split(" ").slice(-1)[0] + " Family" : "Unknown Family");

        await setDoc(doc(db, "clients", fam.docId), {
            name: familyName,
            familyName: familyName,
            isFamily: true,
            id: fam.docId,
            intakeId: fam.intakeId,
            clientStatus: fam.clientStatus || "Active",
            fileClosed: fam.fileClosed ?? false,
            clientCode: fam.clientCode || generateClientCode(),
            // All child data in shiftPoints — no siblings array
            shiftPoints,
            serviceDesc: intake.services?.serviceDesc || "",
            invoiceEmail: intake.billingInfo?.invoiceEmail || "",
            agencyName: fam.agencyName || intake.agencyName || "",
            agencyId: fam.agencyId || "",
            agencyAddress: fam.agencyAddress || "",
            agencyType: fam.agencyType || "",
            clientRate: fam.clientRate || "",
            kmRate: fam.kmRate || "",
            rateList: fam.rateList || [],
            intakeworkerName: fam.intakeworkerName || intake.intakeworkerName || "",
            intakeworkerEmail: fam.intakeworkerEmail || intake.intakeworkerEmail || "",
            intakeworkerPhone: fam.intakeworkerPhone || intake.intakeworkerPhone || "",
            medications: fam.medications || [],
            pharmacy: fam.pharmacy || {},
            hospital: fam.hospital || {},
            createdAt: fam.createdAt || Timestamp.now(),
            migratedAt: Timestamp.now(),
        });

        console.log(`✅ Updated family doc: ${fam.docId} (${familyName}) — ${shiftPoints.length} child(ren)`);
        shiftPoints.forEach((sp) => console.log(`   └─ ${sp.name} | pickup: ${sp.pickupLocation || "—"} → ${sp.dropLocation || "—"}`));
        console.log();
    }

    console.log("🎉 Migration v2 complete!");
    process.exit(0);
}

migrate().catch((err) => { console.error("❌ Failed:", err); process.exit(1); });
