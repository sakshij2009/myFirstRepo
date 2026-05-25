"use strict";
const https = require("https");
const API_KEY = "AIzaSyAUmXXLprgpozG0nRh3QXskrhcNChXaw3M";

function get(url) {
  return new Promise((res,rej)=>{https.get(url,r=>{let d="";r.on("data",c=>d+=c);r.on("end",()=>res(JSON.parse(d)))}).on("error",rej)});
}
function fv(v) {
  if(!v) return undefined;
  if(v.stringValue!==undefined) return v.stringValue;
  if(v.booleanValue!==undefined) return v.booleanValue;
  if(v.integerValue!==undefined) return Number(v.integerValue);
  if(v.nullValue!==undefined) return null;
  if(v.arrayValue) return (v.arrayValue.values||[]).map(fv);
  if(v.mapValue){const m={};for(const[k,val] of Object.entries(v.mapValue.fields||{}))m[k]=fv(val);return m;}
  return undefined;
}

async function main() {
  const r = await get(`https://firestore.googleapis.com/v1/projects/famforeveradmin/databases/(default)/documents/clients?key=${API_KEY}&pageSize=300`);
  const docs = r.documents || [];

  // Get InTakeForms names to find which clients are missing
  const ir = await get(`https://firestore.googleapis.com/v1/projects/famforeveradmin/databases/(default)/documents/InTakeForms?key=${API_KEY}&pageSize=300`);
  const intakeNames = (ir.documents||[]).map(d=>{
    const f={};for(const[k,v] of Object.entries(d.fields||{}))f[k]=fv(v);
    return (f.nameInClientTable||f.childsName||"").toLowerCase().trim();
  }).filter(Boolean);

  function normalize(n){return (n||"").toLowerCase().trim().replace(/\s+/g," ");}
  function hasIntake(name){
    const nn=normalize(name);
    if(!nn) return true;
    return intakeNames.some(n=>n.includes(nn.split(/[\s,&]+/)[0])||nn.includes(n.split(/[\s,&]+/)[0]));
  }

  console.log("=== Clients WITHOUT InTakeForms — showing all their fields ===\n");
  const skip = new Set(["abc","tara","family example","Family Forever","Britney","Vivian","cammi","ali chabot","TJ"]);

  for (const raw of docs) {
    const f={};for(const[k,v] of Object.entries(raw.fields||{}))f[k]=fv(v);
    const name = f.name||f.fullName||f.clientName||"";
    if(!name||skip.has(name)||hasIntake(name)) continue;

    console.log(`\n── ${name} ──`);
    const allFields = Object.entries(f).filter(([,v])=>v!==null&&v!==undefined&&v!=="");
    if(allFields.length===0){console.log("  (no fields at all)");continue;}
    for(const[k,v] of allFields){
      const display = typeof v==="object"?JSON.stringify(v).slice(0,80):String(v).slice(0,80);
      console.log(`  ${k.padEnd(22)} ${display}`);
    }
  }
}
main().catch(console.error);
