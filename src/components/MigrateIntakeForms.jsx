import React, { useState } from "react";
import { collection, getDocs, doc, updateDoc, addDoc } from "firebase/firestore";
import { db } from "../firebase";

// ─── helpers ──────────────────────────────────────────────────────────────────

function toFlutterDate(val) {
  if (!val || typeof val !== "string" || !val.trim()) return null;
  if (/^\d{2}-\d{2}-\d{4}$/.test(val)) return val;
  if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
    const [y, m, d] = val.split("-"); return `${d}-${m}-${y}`;
  }
  return null;
}
function isBadDate(val) {
  if (val === "" || val === null || val === undefined) return true;
  if (typeof val === "string" && /^\d{4}-\d{2}-\d{2}$/.test(val)) return true;
  return false;
}
function fixExistingClients(arr) {
  if (!Array.isArray(arr)) return arr;
  return arr.map(c => ({
    ...c,
    name: c.name || c.fullName || "",
    dob: isBadDate(c.dob) ? (toFlutterDate(c.dob) || null) : (c.dob !== undefined ? c.dob : null),
  }));
}
function buildClientsFromReact(clients) {
  if (!clients || typeof clients !== "object" || Array.isArray(clients)) return [];
  return Object.values(clients).map(c => ({
    name: c.fullName || "", gender: c.gender || "",
    dob: toFlutterDate(c.birthDate) || null,
    address: c.address || "", phone: c.phone || "", email: c.email || "",
    diagnosis: c.diagnosis || "", allergies: c.allergies || "",
    medicalInfo: "", transportNeeds: "", serviceType: "", visitFrequency: "",
  }));
}
function normalize(name) {
  return (name || "").toLowerCase().trim().replace(/\s+/g, " ");
}
function namesOverlap(a, b) {
  const na = normalize(a), nb = normalize(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  const wa = na.split(/[\s,&]+/).filter(w => w.length > 2);
  const wb = nb.split(/[\s,&]+/).filter(w => w.length > 2);
  return wa.some(w => wb.includes(w));
}
function todayDDMMYYYY() {
  const t = new Date();
  return `${String(t.getDate()).padStart(2,"0")}-${String(t.getMonth()+1).padStart(2,"0")}-${t.getFullYear()}`;
}
const SKIP_NAMES = new Set(["abc","tara","family example","Family Forever","Britney","Vivian","cammi","ali chabot","TJ","test","demo"]);

// ─── component ────────────────────────────────────────────────────────────────

export default function MigrateIntakeForms() {
  const [status, setStatus] = useState("idle");
  const [log, setLog]       = useState([]);
  const [stats, setStats]   = useState({ fixed: 0, skipped: 0, created: 0, errors: 0, total: 0 });

  const addLog = (msg, type = "info") => setLog(prev => [...prev, { msg, type }]);

  const runMigration = async () => {
    setStatus("running");
    setLog([]);
    setStats({ fixed: 0, skipped: 0, created: 0, errors: 0, total: 0 });

    let fixed = 0, skipped = 0, created = 0, errors = 0;

    try {
      // ══════════════════════════════════════════════════════════════
      // STEP 1 — Fix all existing InTakeForms documents
      // ══════════════════════════════════════════════════════════════
      addLog("── STEP 1: Fixing existing InTakeForms documents ──", "header");
      const intakeSnap = await getDocs(collection(db, "InTakeForms"));
      addLog(`Found ${intakeSnap.size} InTakeForms documents.`);

      const intakeNames = []; // build as we go for step 2

      for (const docSnap of intakeSnap.docs) {
        const data    = docSnap.data();
        const ref     = doc(db, "InTakeForms", docSnap.id);
        const patch   = {};
        const reasons = [];

        const isReact = !!(
          (data.clients   && typeof data.clients   === "object" && !Array.isArray(data.clients)) ||
          (data.workerInfo && typeof data.workerInfo === "object") ||
          (data.services   && typeof data.services  === "object")
        );
        const hasLegacy = Array.isArray(data.inTakeClients) && data.inTakeClients.length > 0;

        // 1. isActive
        if (data.isActive !== true) { patch.isActive = true; reasons.push("isActive"); }

        // 2. inTakeClients
        if (!hasLegacy) {
          if (isReact && data.clients) {
            const built = buildClientsFromReact(data.clients);
            patch.inTakeClients = built.length > 0 ? built : [];
            reasons.push(`inTakeClients(built ${patch.inTakeClients.length})`);
          } else {
            patch.inTakeClients = [];
            reasons.push("inTakeClients([])");
          }
        } else {
          const fixed2 = fixExistingClients(data.inTakeClients);
          if (JSON.stringify(fixed2) !== JSON.stringify(data.inTakeClients)) {
            patch.inTakeClients = fixed2; reasons.push("inTakeClients.dob/name");
          }
        }

        // 3. nameInClientTable / childsName
        if (!data.nameInClientTable || !data.childsName) {
          let name = data.nameInClientTable || data.childsName || "";
          if (!name && hasLegacy)                  name = data.inTakeClients[0]?.name || "";
          if (!name && patch.inTakeClients?.[0])   name = patch.inTakeClients[0].name || "";
          if (!name && isReact && data.clients)    name = Object.values(data.clients)[0]?.fullName || "";
          if (!data.nameInClientTable) { patch.nameInClientTable = name; reasons.push("nameInClientTable"); }
          if (!data.childsName)        { patch.childsName        = name; reasons.push("childsName"); }
        }

        // 4. dateOfInTake
        const hasDoi = Object.prototype.hasOwnProperty.call(data, "dateOfInTake");
        if (!hasDoi) {
          patch.dateOfInTake = toFlutterDate(data.consentDate) || todayDDMMYYYY();
          reasons.push(`dateOfInTake(added)`);
        } else if (isBadDate(data.dateOfInTake)) {
          patch.dateOfInTake = toFlutterDate(data.dateOfInTake) || toFlutterDate(data.consentDate) || todayDDMMYYYY();
          reasons.push(`dateOfInTake(fixed)`);
        }

        // 5. nameOfPerson / inTakeWorkerName
        if (!data.nameOfPerson && isReact) {
          const wn = data.workerInfo?.workerName || "";
          if (wn) { patch.nameOfPerson = wn; reasons.push("nameOfPerson"); }
        }
        if (!data.inTakeWorkerName && isReact) {
          const wn = data.intakeworkerName || data.workerInfo?.workerName || "";
          if (wn) { patch.inTakeWorkerName = wn; reasons.push("inTakeWorkerName"); }
        }

        // 6. Null-out empty date strings
        for (const f of ["submittedOn", "createdAt", "dateOfBirth"]) {
          if (data[f] === "") { patch[f] = null; reasons.push(`${f}→null`); }
        }

        // Track name for step 2
        const finalName = patch.nameInClientTable || data.nameInClientTable || data.childsName || patch.childsName || "";
        if (finalName) intakeNames.push(finalName);

        if (Object.keys(patch).length === 0) {
          addLog(`  ✓ OK   ${finalName || "(no name)"}`, "skip");
          skipped++;
        } else {
          try {
            await updateDoc(ref, patch);
            addLog(`  ✅ FIXED ${(finalName || "(no name)").padEnd(30)} → ${reasons.join(", ")}`, "ok");
            fixed++;
          } catch (e) {
            addLog(`  ❌ ERROR ${finalName}: ${e.message}`, "err");
            errors++;
          }
        }
      }

      // ══════════════════════════════════════════════════════════════
      // STEP 2 — Create InTakeForms for clients missing one
      // ══════════════════════════════════════════════════════════════
      addLog("", "info");
      addLog("── STEP 2: Creating InTakeForms for clients missing one ──", "header");

      const clientsSnap = await getDocs(collection(db, "clients"));
      addLog(`Found ${clientsSnap.size} clients in clients collection.`);

      for (const cSnap of clientsSnap.docs) {
        const cData = cSnap.data();
        const clientName = cData.name || cData.fullName || cData.clientName || "";

        if (!clientName) continue;
        if (SKIP_NAMES.has(clientName.trim())) {
          addLog(`  ⏭  SKIP (test): ${clientName}`, "skip"); continue;
        }

        const exists = intakeNames.some(n => namesOverlap(n, clientName));
        if (exists) {
          addLog(`  ✓ OK   ${clientName}`, "skip"); continue;
        }

        // Build rich InTakeForms entry from ALL available clients data
        const today = todayDDMMYYYY();

        // Resolve dob → DD-MM-YYYY
        const clientDob = toFlutterDate(cData.dob) || null;

        // Resolve dateOfInTake: prefer intakeDate field, then today
        const intakeDate = toFlutterDate(cData.intakeDate) || today;

        // Worker names
        const caseWorker   = cData.caseWorkerInfo   || {};
        const intakeWorker = cData.inTakeWorkerInfo  || {};
        const workerName   = intakeWorker.name || intakeWorker.workerName
                           || caseWorker.name  || caseWorker.workerName || "";

        // Build the inTakeClients entry with all available fields
        const clientEntry = {
          name:           clientName,
          gender:         cData.gender        || "",
          dob:            clientDob,
          address:        cData.address       || "",
          phone:          cData.phone         || cData.parentPhone || "",
          email:          cData.email         || "",
          diagnosis:      cData.diagnosis     || "",
          allergies:      cData.allergies     || "",
          medicalInfo:    cData.description   || "",   // narrative notes
          transportNeeds: "",
          serviceType:    cData.serviceType   || "",
          visitFrequency: cData.visitFrequency || "",
        };
        // Carry across any medications array
        if (Array.isArray(cData.medications) && cData.medications.length > 0) {
          clientEntry.medications = cData.medications;
        }

        const newDoc = {
          isActive:          true,
          nameInClientTable: clientName,
          childsName:        clientName,
          dateOfInTake:      intakeDate,
          nameOfPerson:      workerName,
          inTakeWorkerName:  workerName,
          formType:          "auto-created",
          status:            "Accepted",
          createdAt:         today,
          submittedOn:       today,
          clientId:          cSnap.id,
          inTakeClients:     [clientEntry],
        };

        // Preserve all rich data from clients collection on the top-level doc
        if (caseWorker.name || caseWorker.phone || caseWorker.email) {
          newDoc.caseWorkerInfo = caseWorker;
        }
        if (intakeWorker.name || intakeWorker.phone || intakeWorker.email) {
          newDoc.inTakeWorkerInfo = intakeWorker;
        }
        if (Array.isArray(cData.contacts) && cData.contacts.length > 0) {
          newDoc.contacts = cData.contacts;          // parent / guardian info
        }
        if (Array.isArray(cData.notes) && cData.notes.length > 0) {
          newDoc.notes = cData.notes;
        }
        if (Array.isArray(cData.shiftPoints) && cData.shiftPoints.length > 0) {
          newDoc.shiftPoints = cData.shiftPoints;
        }
        if (cData.agencyName)    newDoc.agencyName    = cData.agencyName;
        if (cData.agencyAddress) newDoc.agencyAddress = cData.agencyAddress;
        if (cData.agencyId)      newDoc.agencyId      = cData.agencyId;
        if (cData.clientCode)    newDoc.clientCode    = cData.clientCode;
        if (cData.description)   newDoc.description   = cData.description;
        if (cData.UID)           newDoc.clientUID     = cData.UID;

        try {
          await addDoc(collection(db, "InTakeForms"), newDoc);
          addLog(`  ✅ CREATED IntakeForm for: ${clientName}`, "ok");
          intakeNames.push(clientName);
          created++;
        } catch (e) {
          addLog(`  ❌ ERROR ${clientName}: ${e.message}`, "err");
          errors++;
        }
      }

      setStats({ fixed, skipped, created, errors, total: intakeSnap.size });
      addLog("", "info");
      addLog(`Done: ${fixed} fixed, ${created} new IntakeForms created, ${skipped} already OK, ${errors} errors.`, "done");
      setStatus("done");

    } catch (e) {
      addLog(`Fatal: ${e.message}`, "err");
      setStatus("error");
    }
  };

  const reset = () => { setStatus("idle"); setLog([]); setStats({ fixed:0, skipped:0, created:0, errors:0, total:0 }); };

  const logColor = (type) => ({
    ok: "#6EE7B7", err: "#FCA5A5", skip: "#9CA3AF", header: "#FCD34D", done: "#6EE7B7", info: "#D1FAE5"
  }[type] || "#D1FAE5");

  return (
    <div style={{ minHeight: "100vh", background: "#F9FAFB", fontFamily: "'Plus Jakarta Sans', sans-serif", padding: "40px 24px" }}>
      <div style={{ maxWidth: 860, margin: "0 auto" }}>

        <h1 style={{ fontSize: 24, fontWeight: 700, color: "#111827", marginBottom: 6 }}>
          InTakeForms — Full Migration
        </h1>
        <p style={{ fontSize: 14, color: "#6B7280", marginBottom: 20 }}>
          Two-step fix so the old Flutter app shows all clients and all forms correctly.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 28 }}>
          {[
            { step: "Step 1", title: "Fix existing InTakeForms", items: ["Sets isActive: true on all docs", "Adds missing dateOfInTake (uses consentDate)", "Adds missing nameInClientTable from inTakeClients[0].name", "Converts dob / dateOfInTake from YYYY-MM-DD → DD-MM-YYYY", "Builds inTakeClients[] for React-created forms"] },
            { step: "Step 2", title: "Create forms for missing clients", items: ["Reads all clients from clients collection", "Finds clients with no InTakeForms entry", "Creates a FULL InTakeForms doc with all client data", "Preserves: dob, address, diagnosis, allergies, medications", "Preserves: parent/guardian contacts, notes, shift points", "Preserves: case worker & intake worker info, agency info", "These clients now appear in Flutter's Add Shift dropdown"] },
          ].map(({ step, title, items }) => (
            <div key={step} style={{ background: "#FEF3C7", border: "1px solid #FCD34D", borderRadius: 8, padding: "14px 18px" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#92400E", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>{step}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#78350F", marginBottom: 8 }}>{title}</div>
              <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12, color: "#92400E", lineHeight: 2 }}>
                {items.map((item, i) => <li key={i}>{item}</li>)}
              </ul>
            </div>
          ))}
        </div>

        {/* Stats */}
        {status !== "idle" && (
          <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
            {[
              { label: "Total Docs",   value: stats.total,   color: "#3B82F6" },
              { label: "Fixed",        value: stats.fixed,   color: "#10B981" },
              { label: "New Forms",    value: stats.created, color: "#8B5CF6" },
              { label: "Already OK",  value: stats.skipped, color: "#6B7280" },
              { label: "Errors",       value: stats.errors,  color: "#EF4444" },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 10, padding: "10px 16px", minWidth: 100, textAlign: "center" }}>
                <div style={{ fontSize: 24, fontWeight: 700, color }}>{value}</div>
                <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2 }}>{label}</div>
              </div>
            ))}
          </div>
        )}

        {status === "idle" && (
          <button onClick={runMigration} style={{ background: "#1B5E37", color: "#fff", border: "none", borderRadius: 8, padding: "13px 32px", fontSize: 15, fontWeight: 700, cursor: "pointer", marginBottom: 24 }}>
            Run Full Migration
          </button>
        )}
        {(status === "done" || status === "error") && (
          <button onClick={reset} style={{ background: "#4B5563", color: "#fff", border: "none", borderRadius: 8, padding: "13px 32px", fontSize: 15, fontWeight: 700, cursor: "pointer", marginBottom: 24, marginRight: 12 }}>
            Run Again
          </button>
        )}
        {status === "running" && <div style={{ marginBottom: 20, color: "#1B5E37", fontWeight: 700, fontSize: 15 }}>⏳ Running — please wait…</div>}

        {status === "done" && (
          <div style={{ background: "#D1FAE5", border: "1px solid #6EE7B7", borderRadius: 8, padding: "14px 20px", fontSize: 14, color: "#065F46", fontWeight: 600, marginBottom: 24 }}>
            ✅ Migration complete!<br />
            <span style={{ fontWeight: 400, fontSize: 13 }}>
              Now open <strong>famforeveradmin.web.app</strong> in a new <strong>Incognito window</strong> (Ctrl+Shift+N) to see all forms and clients.
            </span>
          </div>
        )}
        {status === "error" && (
          <div style={{ background: "#FEE2E2", border: "1px solid #FCA5A5", borderRadius: 8, padding: "12px 20px", fontSize: 14, color: "#991B1B", fontWeight: 600, marginBottom: 24 }}>
            ❌ Error — make sure you are logged in as admin.
          </div>
        )}

        {log.length > 0 && (
          <div style={{ background: "#111827", borderRadius: 10, padding: 20, fontFamily: "monospace", fontSize: 12, lineHeight: 1.8, maxHeight: 560, overflowY: "auto", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
            {log.map((entry, i) => (
              <div key={i} style={{ color: logColor(entry.type), fontWeight: entry.type === "header" ? 700 : 400 }}>
                {entry.msg}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
