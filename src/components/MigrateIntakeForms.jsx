import React, { useState } from "react";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";

// ─────────────────────────────────────────────────────────────────────────────
// ONE-TIME MIGRATION: Fix existing InTakeForms docs for Flutter compatibility
//
// Two types of docs exist in Firestore:
//
//  A) OLD Flutter-created forms
//     Already have: inTakeClients[], dateOfInTake, nameInClientTable, isActive
//     Problem:  isActive may be false/missing, dob may be "" or YYYY-MM-DD
//
//  B) NEW React-created forms (saved before the code fix)
//     Have: clients:{client1:{fullName,birthDate,...}}, workerInfo:{date,...}
//     Missing: inTakeClients[], nameInClientTable, childsName, dateOfInTake, isActive
//     Flutter crashes the moment it tries to read those missing fields
// ─────────────────────────────────────────────────────────────────────────────

/** Convert any date value to DD-MM-YYYY string, or null if empty/bad */
function toFlutterDate(val) {
  if (!val || typeof val !== "string" || val.trim() === "") return null;
  if (/^\d{2}-\d{2}-\d{4}$/.test(val)) return val;               // already good
  if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {                         // YYYY-MM-DD
    const [y, m, d] = val.split("-");
    return `${d}-${m}-${y}`;
  }
  return null;   // anything else (long format, etc.) → null is safer than crashing
}

/** True if value would crash Flutter's DateFormat('dd-MM-yyyy').parse() */
function isBadDateVal(val) {
  if (val === null || val === undefined) return false;   // null is safe (Flutter checks)
  if (val === "") return true;                           // empty → crashes at pos 0
  if (typeof val === "string" && /^\d{4}-\d{2}-\d{2}$/.test(val)) return true;
  return false;
}

/** Build inTakeClients[] from new React clients:{client1:{...}} object */
function buildInTakeClientsFromReact(clients) {
  if (!clients || typeof clients !== "object" || Array.isArray(clients)) return [];
  return Object.values(clients).map((c) => ({
    name:        c.fullName    || "",
    gender:      c.gender      || "",
    dob:         toFlutterDate(c.birthDate) ?? null,
    address:     c.address     || "",
    phone:       c.phone       || "",
    email:       c.email       || "",
    diagnosis:   c.diagnosis   || "",
    allergies:   c.allergies   || "",
    // medical / transport / service placeholders expected by Flutter
    medicalInfo: "",
    transportNeeds: "",
    serviceType: "",
    visitFrequency: "",
  }));
}

/** Fix an existing inTakeClients[] array — clean dob, ensure name */
function fixExistingInTakeClients(arr) {
  if (!Array.isArray(arr)) return arr;
  return arr.map((c) => ({
    ...c,
    name: c.name || c.fullName || "",
    dob:  isBadDateVal(c.dob) ? toFlutterDate(c.dob) : (c.dob ?? null),
  }));
}

export default function MigrateIntakeForms() {
  const [status, setStatus] = useState("idle");
  const [log, setLog]       = useState([]);
  const [stats, setStats]   = useState({ total: 0, updated: 0, skipped: 0, errors: 0 });

  const addLog = (msg) => setLog((prev) => [...prev, msg]);

  const runMigration = async () => {
    setStatus("running");
    setLog([]);
    setStats({ total: 0, updated: 0, skipped: 0, errors: 0 });

    try {
      addLog("Fetching all InTakeForms documents…");
      const snapshot = await getDocs(collection(db, "InTakeForms"));
      addLog(`Found ${snapshot.size} document(s).\n`);

      let updated = 0, skipped = 0, errors = 0;

      for (const docSnap of snapshot.docs) {
        const data    = docSnap.data();
        const ref     = doc(db, "InTakeForms", docSnap.id);
        const patch   = {};
        const reasons = [];
        const label   = data.nameInClientTable || data.childsName || "(no name)";

        // ── Detect form type ──────────────────────────────────────────────────
        const isReactForm = (
          (data.clients && typeof data.clients === "object" && !Array.isArray(data.clients)) ||
          (data.workerInfo && typeof data.workerInfo === "object") ||
          (data.services  && typeof data.services  === "object")
        );
        const hasLegacyClients = Array.isArray(data.inTakeClients) && data.inTakeClients.length > 0;

        // ── Fix 1: isActive (both types) ──────────────────────────────────────
        if (data.isActive !== true) {
          patch.isActive = true;
          reasons.push("isActive");
        }

        // ── Fix 2: Build missing inTakeClients[] for React-created forms ──────
        if (!hasLegacyClients && isReactForm && data.clients) {
          const built = buildInTakeClientsFromReact(data.clients);
          if (built.length > 0) {
            patch.inTakeClients = built;
            reasons.push(`inTakeClients(built ${built.length})`);
          }
        }

        // ── Fix 3: Fix existing inTakeClients[] dob / name ────────────────────
        if (hasLegacyClients) {
          const fixed   = fixExistingInTakeClients(data.inTakeClients);
          const changed = JSON.stringify(fixed) !== JSON.stringify(data.inTakeClients);
          if (changed) {
            patch.inTakeClients = fixed;
            reasons.push("inTakeClients.dob/name");
          }
        }

        // ── Fix 4: nameInClientTable / childsName ─────────────────────────────
        if (!data.nameInClientTable || !data.childsName) {
          let name = data.nameInClientTable || data.childsName || "";
          if (!name && isReactForm && data.clients) {
            const first = Object.values(data.clients)[0];
            name = first?.fullName || "";
          }
          if (!name && Array.isArray(patch.inTakeClients) && patch.inTakeClients[0]) {
            name = patch.inTakeClients[0].name || "";
          }
          if (name) {
            if (!data.nameInClientTable) { patch.nameInClientTable = name; reasons.push("nameInClientTable"); }
            if (!data.childsName)        { patch.childsName        = name; reasons.push("childsName"); }
          }
        }

        // ── Fix 5: dateOfInTake ───────────────────────────────────────────────
        // Use `"dateOfInTake" in data` so empty string ("") is also caught
        if ("dateOfInTake" in data) {
          if (isBadDateVal(data.dateOfInTake)) {
            patch.dateOfInTake = toFlutterDate(data.dateOfInTake); // null if empty
            reasons.push(`dateOfInTake("${data.dateOfInTake}"→${patch.dateOfInTake})`);
          }
        } else if (isReactForm) {
          // React form missing dateOfInTake entirely → build from workerInfo.date
          const raw = data.workerInfo?.date || "";
          patch.dateOfInTake = toFlutterDate(raw) || null;
          reasons.push(`dateOfInTake(new:"${patch.dateOfInTake}")`);
        }

        // ── Fix 6: nameOfPerson / inTakeWorkerName ────────────────────────────
        if (!data.nameOfPerson && isReactForm) {
          const wn = data.workerInfo?.workerName || "";
          if (wn) { patch.nameOfPerson = wn; reasons.push("nameOfPerson"); }
        }
        if (!data.inTakeWorkerName && isReactForm) {
          const wn = data.intakeworkerName || data.workerInfo?.workerName || "";
          if (wn) { patch.inTakeWorkerName = wn; reasons.push("inTakeWorkerName"); }
        }

        // ── Fix 7: null-out any empty date strings at top level ───────────────
        for (const field of ["submittedOn", "createdAt", "dateOfBirth"]) {
          if (data[field] === "") {
            patch[field] = null;
            reasons.push(`${field}→null`);
          }
        }

        // ── Skip if nothing changed ───────────────────────────────────────────
        if (Object.keys(patch).length === 0) {
          addLog(`  ✓ SKIP  [${docSnap.id.slice(0, 8)}] ${label}`);
          skipped++;
          continue;
        }

        try {
          await updateDoc(ref, patch);
          addLog(`  ✅ FIXED [${docSnap.id.slice(0, 8)}] ${label} → ${reasons.join(", ")}`);
          updated++;
        } catch (err) {
          addLog(`  ❌ ERROR [${docSnap.id.slice(0, 8)}] ${label}: ${err.message}`);
          errors++;
        }
      }

      setStats({ total: snapshot.size, updated, skipped, errors });
      addLog(`\nDone: ${updated} fixed, ${skipped} already OK, ${errors} errors.`);
      setStatus("done");
    } catch (err) {
      addLog(`Fatal error: ${err.message}`);
      setStatus("error");
    }
  };

  const reset = () => {
    setStatus("idle");
    setLog([]);
    setStats({ total: 0, updated: 0, skipped: 0, errors: 0 });
  };

  const btnStyle = (bg) => ({
    background: bg, color: "#fff", border: "none", borderRadius: 8,
    padding: "12px 28px", fontSize: 15, fontWeight: 600, cursor: "pointer",
    marginBottom: 24, marginRight: 12,
  });

  return (
    <div style={{ minHeight: "100vh", background: "#F9FAFB", fontFamily: "'Plus Jakarta Sans', sans-serif", padding: "40px 24px" }}>
      <div style={{ maxWidth: 800, margin: "0 auto" }}>

        <h1 style={{ fontSize: 24, fontWeight: 700, color: "#111827", marginBottom: 8 }}>
          InTakeForms — Legacy Migration
        </h1>
        <p style={{ fontSize: 14, color: "#6B7280", marginBottom: 16, lineHeight: 1.6 }}>
          Fixes all Firestore <code>InTakeForms</code> documents so the old Flutter app can read them.
          Safe to run multiple times.
        </p>

        <div style={{ background: "#FEF3C7", border: "1px solid #FCD34D", borderRadius: 8, padding: "10px 16px", fontSize: 13, color: "#92400E", marginBottom: 24 }}>
          <strong>What this fixes:</strong>
          <ul style={{ margin: "6px 0 0", paddingLeft: 18, lineHeight: 2 }}>
            <li>Sets <code>isActive: true</code> on every document</li>
            <li>Builds <code>inTakeClients[]</code> for React-created forms that are missing it</li>
            <li>Converts <code>dob</code> / <code>dateOfInTake</code> from <code>YYYY-MM-DD</code> → <code>DD-MM-YYYY</code></li>
            <li>Replaces empty date strings (<code>""</code>) with <code>null</code></li>
            <li>Adds missing <code>nameInClientTable</code>, <code>childsName</code>, <code>nameOfPerson</code></li>
          </ul>
        </div>

        {/* Stats */}
        {status !== "idle" && (
          <div style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
            {[
              { label: "Total",      value: stats.total,   color: "#3B82F6" },
              { label: "Fixed",      value: stats.updated, color: "#10B981" },
              { label: "Already OK", value: stats.skipped, color: "#6B7280" },
              { label: "Errors",     value: stats.errors,  color: "#EF4444" },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 10, padding: "12px 20px", minWidth: 110, textAlign: "center" }}>
                <div style={{ fontSize: 26, fontWeight: 700, color }}>{value}</div>
                <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2 }}>{label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Buttons */}
        {status === "idle" && <button onClick={runMigration} style={btnStyle("#1B5E37")}>Run Migration</button>}
        {(status === "done" || status === "error") && <button onClick={reset} style={btnStyle("#4B5563")}>Run Again</button>}
        {status === "running" && <div style={{ marginBottom: 24, color: "#1B5E37", fontWeight: 600 }}>⏳ Running…</div>}

        {status === "done" && (
          <div style={{ background: "#D1FAE5", border: "1px solid #6EE7B7", borderRadius: 8, padding: "12px 20px", fontSize: 14, color: "#065F46", fontWeight: 600, marginBottom: 24 }}>
            ✅ Migration complete!<br />
            <span style={{ fontWeight: 400 }}>
              Now open <strong>famforeveradmin.web.app</strong> and press <strong>Ctrl+Shift+R</strong> (hard refresh) to clear the Flutter cache and reload fresh data.
            </span>
          </div>
        )}
        {status === "error" && (
          <div style={{ background: "#FEE2E2", border: "1px solid #FCA5A5", borderRadius: 8, padding: "12px 20px", fontSize: 14, color: "#991B1B", fontWeight: 600, marginBottom: 24 }}>
            ❌ Error — make sure you are logged in as admin and check the log below.
          </div>
        )}

        {/* Log */}
        {log.length > 0 && (
          <div style={{ background: "#111827", borderRadius: 10, padding: 20, fontFamily: "monospace", fontSize: 12, color: "#D1FAE5", lineHeight: 1.8, maxHeight: 520, overflowY: "auto", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
            {log.map((line, i) => (
              <div key={i} style={{ color: line.includes("❌") ? "#FCA5A5" : line.includes("✅") ? "#6EE7B7" : line.includes("✓") ? "#9CA3AF" : "#D1FAE5" }}>
                {line}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
