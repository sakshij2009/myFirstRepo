"use strict";
// READ-ONLY duplicate-intake-form finder.
// Does NOT delete or modify anything. Groups InTakeForms documents that look
// like the same submission (same client/family + agency) and prints a report
// so a human can decide what to do next. Writes the same report to
// duplicate-intake-forms-report.json for later use by a cleanup script.

const https = require("https");
const fs = require("fs");

const API_KEY = "AIzaSyAUmXXLprgpozG0nRh3QXskrhcNChXaw3M";
const PROJECT_ID = "famforeveradmin";
const COLLECTION = "InTakeForms";

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (r) => {
      let d = "";
      r.on("data", (c) => (d += c));
      r.on("end", () => {
        try { resolve(JSON.parse(d)); } catch (e) { reject(e); }
      });
    }).on("error", reject);
  });
}

// Convert a Firestore REST "fields" map into a plain JS object.
function fv(v) {
  if (!v) return undefined;
  if (v.stringValue !== undefined) return v.stringValue;
  if (v.booleanValue !== undefined) return v.booleanValue;
  if (v.integerValue !== undefined) return Number(v.integerValue);
  if (v.doubleValue !== undefined) return Number(v.doubleValue);
  if (v.nullValue !== undefined) return null;
  if (v.timestampValue !== undefined) return v.timestampValue;
  if (v.arrayValue) return (v.arrayValue.values || []).map(fv);
  if (v.mapValue) {
    const m = {};
    for (const [k, val] of Object.entries(v.mapValue.fields || {})) m[k] = fv(val);
    return m;
  }
  return undefined;
}

async function fetchAllDocs() {
  let docs = [];
  let pageToken = null;
  do {
    const url =
      `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${COLLECTION}` +
      `?key=${API_KEY}&pageSize=300` + (pageToken ? `&pageToken=${pageToken}` : "");
    const r = await get(url);
    docs = docs.concat(r.documents || []);
    pageToken = r.nextPageToken || null;
  } while (pageToken);
  return docs;
}

function normalize(s) {
  return String(s || "").toLowerCase().trim().replace(/\s+/g, " ");
}

// Resolve a display name + agency the same way the admin panel does,
// so grouping lines up with what the admin actually sees in the table.
function extractIdentity(f) {
  let clientName = "—";
  if (f.familyName) {
    clientName = f.familyName;
  } else if (Array.isArray(f.inTakeClients) && f.inTakeClients[0]) {
    clientName = f.inTakeClients[0].name || f.inTakeClients[0].fullName || clientName;
  } else if (f.clients && typeof f.clients === "object") {
    const vals = Object.values(f.clients);
    if (vals[0]) clientName = vals[0].fullName || vals[0].name || clientName;
  } else if (Array.isArray(f.children) && f.children[0]) {
    clientName = f.children.map((c) => c.fullName || c.name).filter(Boolean).join(", ") || clientName;
  }
  if (clientName === "—") {
    clientName =
      f.clientName || f.childName || f.childFullName || f.name ||
      f.nameInClientTable || f.applicantName || f.submitterName ||
      (f.firstName && f.lastName ? `${f.firstName} ${f.lastName}` : "") ||
      f.parentName || f.inTakeWorkerName || "—";
  }

  const agency = f.agencyName || f.agency || "";
  const parentEmail = f.parentEmail || f.email || f.applicantEmail || "";
  const workerEmail = f.intakeworkerEmail || f.inTakeWorkerEmail || "";

  return { clientName, agency, parentEmail, workerEmail };
}

function completeness(f) {
  return Object.values(f).filter((v) => v !== null && v !== undefined && v !== "" &&
    !(Array.isArray(v) && v.length === 0)).length;
}

async function main() {
  console.log(`Fetching all documents from ${COLLECTION}...`);
  const docs = await fetchAllDocs();
  console.log(`Fetched ${docs.length} documents.\n`);

  const records = docs.map((raw) => {
    const f = {};
    for (const [k, v] of Object.entries(raw.fields || {})) f[k] = fv(v);
    const id = raw.name.split("/").pop();
    const identity = extractIdentity(f);
    return {
      id,
      identity,
      createdAt: f.createdAt || f.submittedOn || "—",
      lastUpdatedAt: f.lastUpdatedAt || "—",
      lastUpdatedBy: f.lastUpdatedBy || "—",
      status: f.status || "—",
      fieldCount: completeness(f),
      raw: f,
    };
  });

  // Group by normalized clientName + agency (the strongest identity signal
  // available without guessing). Blank/"—" names are skipped — too ambiguous
  // to group safely.
  const groups = new Map();
  for (const rec of records) {
    const nameKey = normalize(rec.identity.clientName);
    if (!nameKey || nameKey === "—") continue;
    const key = `${nameKey}|${normalize(rec.identity.agency)}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(rec);
  }

  const dupGroups = [...groups.entries()].filter(([, recs]) => recs.length > 1);

  console.log(`Found ${dupGroups.length} candidate duplicate group(s) out of ${groups.size} distinct client/agency identities.\n`);
  console.log("=".repeat(80));

  const report = [];
  for (const [key, recs] of dupGroups) {
    // Sort so the most complete, most recently updated record is first —
    // that's the recommended "keep" candidate, never a deletion target by default.
    const sorted = [...recs].sort((a, b) => {
      if (b.fieldCount !== a.fieldCount) return b.fieldCount - a.fieldCount;
      return String(b.lastUpdatedAt).localeCompare(String(a.lastUpdatedAt));
    });

    console.log(`\nGroup: ${key}`);
    sorted.forEach((rec, i) => {
      console.log(`  ${i === 0 ? "[KEEP →]" : "[REVIEW]"} id=${rec.id}`);
      console.log(`           client="${rec.identity.clientName}" agency="${rec.identity.agency}"`);
      console.log(`           parentEmail="${rec.identity.parentEmail}" workerEmail="${rec.identity.workerEmail}"`);
      console.log(`           status=${rec.status}  fieldCount=${rec.fieldCount}`);
      console.log(`           createdAt=${rec.createdAt}  lastUpdatedAt=${rec.lastUpdatedAt}  lastUpdatedBy=${rec.lastUpdatedBy}`);
    });

    report.push({
      groupKey: key,
      recommendedKeepId: sorted[0].id,
      candidates: sorted.map((r) => ({
        id: r.id,
        clientName: r.identity.clientName,
        agency: r.identity.agency,
        parentEmail: r.identity.parentEmail,
        workerEmail: r.identity.workerEmail,
        status: r.status,
        fieldCount: r.fieldCount,
        createdAt: r.createdAt,
        lastUpdatedAt: r.lastUpdatedAt,
        lastUpdatedBy: r.lastUpdatedBy,
      })),
    });
  }

  console.log("\n" + "=".repeat(80));
  console.log(`\nNo documents were changed or deleted. This is a read-only report.`);
  fs.writeFileSync("duplicate-intake-forms-report.json", JSON.stringify(report, null, 2));
  console.log(`Full report (with all fields per candidate) written to duplicate-intake-forms-report.json`);
}

main().catch(console.error);
