"use strict";
const https = require("https");
const PROJECT_ID = "famforeveradmin";
const API_KEY    = "AIzaSyAUmXXLprgpozG0nRh3QXskrhcNChXaw3M";

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let d = ""; res.on("data", c => d += c); res.on("end", () => resolve(JSON.parse(d)));
    }).on("error", reject);
  });
}
function fv(v) {
  if (!v) return undefined;
  if (v.stringValue  !== undefined) return v.stringValue;
  if (v.booleanValue !== undefined) return v.booleanValue;
  if (v.integerValue !== undefined) return Number(v.integerValue);
  if (v.nullValue    !== undefined) return null;
  if (v.timestampValue !== undefined) return v.timestampValue;
  if (v.arrayValue)  return (v.arrayValue.values||[]).map(fv);
  if (v.mapValue)    { const m={}; for(const[k,val] of Object.entries(v.mapValue.fields||{})) m[k]=fv(val); return m; }
  return JSON.stringify(v);
}

async function main() {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/InTakeForms?key=${API_KEY}&pageSize=300`;
  const res = await get(url);
  const docs = res.documents || [];

  // Show first 5 no-name flutter docs with ALL fields
  let shown = 0;
  for (const rawDoc of docs) {
    const fields = {};
    for (const [k,v] of Object.entries(rawDoc.fields||{})) fields[k] = fv(v);
    const hasName = fields.nameInClientTable || fields.childsName;
    const isReact = !!(fields.clients || fields.workerInfo || fields.services);
    if (!hasName && !isReact && shown < 3) {
      shown++;
      const fullId = rawDoc.name.split("/").pop();
      console.log(`\n${"=".repeat(60)}`);
      console.log(`FULL ID: ${fullId}`);
      console.log(`ALL FIELDS (${Object.keys(fields).length} total):`);
      for (const [k,v] of Object.entries(fields)) {
        const val = Array.isArray(v) ? `Array(${v.length}) ${JSON.stringify(v).slice(0,60)}` : JSON.stringify(v)?.slice(0,100);
        console.log(`  ${k.padEnd(25)} ${val}`);
      }
    }
  }
}
main().catch(e => console.error(e));
