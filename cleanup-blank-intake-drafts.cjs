"use strict";
// Removes ONLY InTakeForms documents that are empty/abandoned drafts — no
// client name, no inTakeClients/clients data, nothing a human ever filled in.
// Safety:
//   1. Re-verifies every candidate against the live DB right before deleting.
//   2. Backs up the full document JSON to blank-intake-drafts-backup.json
//      BEFORE deleting anything, so nothing is ever unrecoverable.
//   3. Refuses to touch a document if it has ANY real client-identifying data.
// Run with --dry-run (default) to only see what would be deleted.
// Run with --confirm to actually delete (after reviewing the dry run).

const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const fs = require("fs");
const serviceAccount = require("./serviceAccountKey.json");

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

const CONFIRM = process.argv.includes("--confirm");

// A doc is a "blank draft" only if NONE of these ever got filled in.
function isBlankDraft(f) {
  const nameFields = [
    f.familyName, f.childsName, f.nameInClientTable, f.clientName,
    f.childName, f.applicantName, f.parentName, f.filledBy,
  ];
  if (nameFields.some((v) => String(v || "").trim())) return false;

  const arrayFields = [f.inTakeClients, f.clients && Object.values(f.clients), f.children];
  if (arrayFields.some((a) => Array.isArray(a) && a.length > 0)) return false;

  if (String(f.invoiceEmail || "").trim()) return false;
  if (String(f.intakeworkerName || f.inTakeWorkerName || "").trim()) return false;

  return true;
}

async function main() {
  const snap = await db.collection("InTakeForms").get();
  const candidates = [];
  snap.forEach((doc) => {
    const f = doc.data();
    if (isBlankDraft(f)) candidates.push({ id: doc.id, data: f });
  });

  console.log(`Scanned ${snap.size} documents. Found ${candidates.length} blank/abandoned draft(s):\n`);
  for (const c of candidates) {
    console.log(`  ${c.id}  status=${c.data.status || "—"}  createdAt=${c.data.createdAt || "—"}`);
  }

  if (candidates.length === 0) {
    console.log("\nNothing to do.");
    return;
  }

  const backupPath = `blank-intake-drafts-backup-${Date.now()}.json`;
  fs.writeFileSync(backupPath, JSON.stringify(candidates, null, 2));
  console.log(`\nFull backup of these ${candidates.length} document(s) written to ${backupPath}`);

  if (!CONFIRM) {
    console.log("\nDRY RUN — no documents deleted. Re-run with --confirm to actually delete these.");
    return;
  }

  console.log("\n--confirm passed — deleting now...");
  for (const c of candidates) {
    // Re-verify against the live doc immediately before deleting, in case
    // someone filled the draft in between the scan and now.
    const fresh = await db.collection("InTakeForms").doc(c.id).get();
    if (!fresh.exists) { console.log(`  ${c.id} — already gone, skipping`); continue; }
    if (!isBlankDraft(fresh.data())) { console.log(`  ${c.id} — no longer blank, SKIPPING (not deleted)`); continue; }
    await db.collection("InTakeForms").doc(c.id).delete();
    console.log(`  ${c.id} — deleted`);
  }
  console.log("\nDone.");
}

main().catch(console.error);
