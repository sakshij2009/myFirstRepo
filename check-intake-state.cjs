/**
 * READ-ONLY diagnostic — shows exact state of all InTakeForms documents.
 * No writes, no auth needed (uses Firestore REST API with API key).
 *
 * Run from project root:
 *   node check-intake-state.cjs
 */
"use strict";

const https = require("https");

const PROJECT_ID = "famforeveradmin";
const API_KEY    = "AIzaSyAUmXXLprgpozG0nRh3QXskrhcNChXaw3M";
const BASE_URL   = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = "";
      res.on("data", (c) => data += c);
      res.on("end",  () => {
        try { resolve(JSON.parse(data)); }
        catch(e) { reject(e); }
      });
    }).on("error", reject);
  });
}

/** Extract plain JS value from Firestore REST field value */
function fv(v) {
  if (!v) return undefined;
  if (v.stringValue  !== undefined) return v.stringValue;
  if (v.booleanValue !== undefined) return v.booleanValue;
  if (v.integerValue  !== undefined) return Number(v.integerValue);
  if (v.doubleValue   !== undefined) return v.doubleValue;
  if (v.nullValue     !== undefined) return null;
  if (v.timestampValue !== undefined) return v.timestampValue;
  if (v.arrayValue) {
    return (v.arrayValue.values || []).map(fv);
  }
  if (v.mapValue) {
    const m = {};
    for (const [k, val] of Object.entries(v.mapValue.fields || {})) m[k] = fv(val);
    return m;
  }
  return JSON.stringify(v);
}

function extractDoc(doc) {
  const fields = doc.fields || {};
  const out = {};
  for (const [k, v] of Object.entries(fields)) out[k] = fv(v);
  return out;
}

async function fetchAll(url) {
  const docs = [];
  let nextPage = url;
  while (nextPage) {
    const res = await get(nextPage);
    if (res.documents) docs.push(...res.documents);
    nextPage = res.nextPageToken
      ? `${url}${url.includes("?") ? "&" : "?"}pageToken=${res.nextPageToken}`
      : null;
  }
  return docs;
}

async function main() {
  console.log("Reading InTakeForms from Firestore…\n");
  const url  = `${BASE_URL}/InTakeForms?key=${API_KEY}&pageSize=300`;
  const docs = await fetchAll(url);

  if (!docs.length) {
    console.log("No documents found (or security rules block unauthenticated reads).");
    return;
  }

  console.log(`Found ${docs.length} document(s).\n`);
  console.log("=".repeat(80));

  let badCount = 0;

  for (const rawDoc of docs) {
    const id   = rawDoc.name.split("/").pop();
    const data = extractDoc(rawDoc);

    const name         = data.nameInClientTable || data.childsName || "(no name)";
    const isActive     = data.isActive;
    const doi          = data.dateOfInTake;
    const clients      = data.inTakeClients;
    const hasClients   = Array.isArray(clients) && clients.length > 0;
    const isReact      = !!(data.clients || data.workerInfo || data.services);

    const problems = [];
    if (isActive !== true)  problems.push(`isActive=${JSON.stringify(isActive)}`);
    if (!hasClients)        problems.push("inTakeClients MISSING or empty");
    if (doi === "")         problems.push('dateOfInTake=""  ← CRASHES FLUTTER');
    if (doi && /^\d{4}-\d{2}-\d{2}$/.test(doi)) problems.push(`dateOfInTake="${doi}" YYYY-MM-DD ← CRASHES FLUTTER`);
    if (!doi && doi !== null) problems.push(`dateOfInTake missing`);

    if (hasClients) {
      for (let i = 0; i < clients.length; i++) {
        const c   = clients[i];
        const dob = c.dob;
        if (dob === "")                          problems.push(`client[${i}].dob="" ← CRASHES FLUTTER`);
        if (dob && /^\d{4}-\d{2}-\d{2}$/.test(dob)) problems.push(`client[${i}].dob="${dob}" YYYY-MM-DD ← CRASHES FLUTTER`);
        if (!c.name && c.name !== "")            problems.push(`client[${i}].name MISSING`);
      }
    }

    const status = problems.length > 0 ? "⚠️  PROBLEMS" : "✅  OK";
    if (problems.length > 0) badCount++;

    console.log(`[${id.slice(0,8)}] ${name.padEnd(30)} type:${isReact?"react":"flutter"} active:${String(isActive).padEnd(5)} ${status}`);
    if (problems.length > 0) {
      for (const p of problems) console.log(`         ❌ ${p}`);
    }
  }

  console.log("=".repeat(80));
  console.log(`\nSummary: ${docs.length - badCount} OK, ${badCount} have problems.\n`);

  if (badCount === 0) {
    console.log("✅  All documents look good for Flutter. If app still crashes,");
    console.log("   the issue is NOT InTakeForms data — try clearing ALL site data");
    console.log("   for famforeveradmin.web.app in Chrome DevTools → Application → Storage → Clear site data.");
  } else {
    console.log(`⚠️  ${badCount} document(s) still have issues. Run the migration again.`);
  }
}

main().catch((e) => { console.error("Error:", e.message); process.exit(1); });
