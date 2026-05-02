import React, { useState } from "react";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";

// ─────────────────────────────────────────────────────────────────────────────
// ONE-TIME MIGRATION: Fix existing InTakeForms documents for Flutter compatibility
// ─────────────────────────────────────────────────────────────────────────────

/** Convert any date string to DD-MM-YYYY, or null if empty / unparseable */
function convertDate(val) {
  if (val === null || val === undefined || val === "") return null;
  if (typeof val !== "string") return null;
  // Already DD-MM-YYYY
  if (/^\d{2}-\d{2}-\d{4}$/.test(val)) return val;
  // YYYY-MM-DD  →  DD-MM-YYYY
  if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
    const [yyyy, mm, dd] = val.split("-");
    return `${dd}-${mm}-${yyyy}`;
  }
  // Any other non-empty, non-parseable value → null  (safer than crashing Flutter)
  return null;
}

/** Return true if this field value is a "bad" date Flutter would crash on */
function isBadDate(val) {
  if (val === "" || val === null || val === undefined) return true;
  if (typeof val !== "string") return false;
  // YYYY-MM-DD crashes Flutter's DateFormat('dd-MM-yyyy')
  if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return true;
  return false;
}

function fixInTakeClients(clients) {
  if (!Array.isArray(clients)) return clients;
  return clients.map((c) => ({
    ...c,
    name: c.name || c.fullName || "",
    dob: convertDate(c.dob),
  }));
}

export default function MigrateIntakeForms() {
  const [status, setStatus] = useState("idle"); // idle | running | done | error
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
      addLog(`Found ${snapshot.size} document(s).`);

      let updated = 0, skipped = 0, errors = 0;

      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        const ref  = doc(db, "InTakeForms", docSnap.id);
        const patch = {};
        const reasons = [];

        // ── Fix 1: isActive ───────────────────────────────────────────────────
        if (data.isActive !== true) {
          patch.isActive = true;
          reasons.push("isActive");
        }

        // ── Fix 2 & 3: inTakeClients — dob format + name field ───────────────
        if (Array.isArray(data.inTakeClients) && data.inTakeClients.length > 0) {
          const fixed   = fixInTakeClients(data.inTakeClients);
          const changed = JSON.stringify(fixed) !== JSON.stringify(data.inTakeClients);
          if (changed) {
            patch.inTakeClients = fixed;
            reasons.push("inTakeClients.dob/name");
          }
        }

        // ── Fix 4: dateOfInTake ───────────────────────────────────────────────
        // BUG-FIX: use `val in data` not `if (data.dateOfInTake)` so empty
        // strings ("") are caught — Flutter crashes on DateFormat.parse("")
        const doi = data.dateOfInTake;
        if ("dateOfInTake" in data && isBadDate(doi)) {
          patch.dateOfInTake = convertDate(doi); // null for empty, DD-MM-YYYY for YYYY-MM-DD
          reasons.push(`dateOfInTake("${doi}"→${patch.dateOfInTake})`);
        } else if (doi && /^\d{4}-\d{2}-\d{2}$/.test(doi)) {
          patch.dateOfInTake = convertDate(doi);
          reasons.push(`dateOfInTake(reformat)`);
        }

        // ── Fix 5: submittedOn / createdAt — null-out empty strings ──────────
        for (const field of ["submittedOn", "createdAt"]) {
          if (field in data && data[field] === "") {
            patch[field] = null;
            reasons.push(`${field}("")→null`);
          }
        }

        // ── Skip if nothing to change ─────────────────────────────────────────
        if (Object.keys(patch).length === 0) {
          addLog(`  ✓ SKIP  [${docSnap.id.slice(0, 8)}…] ${data.nameInClientTable || data.childsName || "(no name)"}`);
          skipped++;
          continue;
        }

        try {
          await updateDoc(ref, patch);
          addLog(`  ✅ FIXED [${docSnap.id.slice(0, 8)}…] ${data.nameInClientTable || data.childsName || "(no name)"} → ${reasons.join(", ")}`);
          updated++;
        } catch (err) {
          addLog(`  ❌ ERROR [${docSnap.id.slice(0, 8)}…] ${err.message}`);
          errors++;
        }
      }

      setStats({ total: snapshot.size, updated, skipped, errors });
      addLog("");
      addLog(`Done: ${updated} fixed, ${skipped} already OK, ${errors} errors.`);
      setStatus("done");
    } catch (err) {
      addLog(`Fatal error: ${err.message}`);
      setStatus("error");
    }
  };

  const reset = () => { setStatus("idle"); setLog([]); setStats({ total: 0, updated: 0, skipped: 0, errors: 0 }); };

  const btnStyle = (bg) => ({
    background: bg, color: "#fff", border: "none", borderRadius: 8,
    padding: "12px 28px", fontSize: 15, fontWeight: 600, cursor: "pointer",
    marginBottom: 24, marginRight: 12,
  });

  return (
    <div style={{ minHeight: "100vh", background: "#F9FAFB", fontFamily: "'Plus Jakarta Sans', sans-serif", padding: "40px 24px" }}>
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "#111827", marginBottom: 8 }}>
          InTakeForms — Legacy Migration
        </h1>
        <p style={{ fontSize: 14, color: "#6B7280", marginBottom: 16, lineHeight: 1.6 }}>
          Fixes existing Firestore documents so the old Flutter app can read them correctly.
        </p>
        <ul style={{ fontSize: 13, color: "#374151", marginBottom: 28, paddingLeft: 20, lineHeight: 2 }}>
          <li>Sets <code>isActive: true</code> on all documents</li>
          <li>Converts <code>dob</code> in <code>inTakeClients[]</code> from <code>YYYY-MM-DD</code> → <code>DD-MM-YYYY</code></li>
          <li>Replaces <code>dob: ""</code> with <code>null</code></li>
          <li>Fixes <code>dateOfInTake: ""</code> or wrong format → <code>null</code> / <code>DD-MM-YYYY</code></li>
          <li>Null-outs any empty <code>submittedOn</code> / <code>createdAt</code> strings</li>
          <li>Ensures <code>name</code> field exists in each client entry</li>
        </ul>

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
        {(status === "idle") && (
          <button onClick={runMigration} style={btnStyle("#1B5E37")}>Run Migration</button>
        )}
        {(status === "done" || status === "error") && (
          <button onClick={reset} style={btnStyle("#6B7280")}>Run Again</button>
        )}

        {status === "running" && (
          <div style={{ marginBottom: 24, color: "#1B5E37", fontWeight: 600 }}>⏳ Running…</div>
        )}
        {status === "done" && (
          <div style={{ background: "#D1FAE5", border: "1px solid #6EE7B7", borderRadius: 8, padding: "12px 20px", fontSize: 14, color: "#065F46", fontWeight: 600, marginBottom: 24 }}>
            ✅ Migration complete! Now hard-refresh the Flutter app at famforeveradmin.web.app (Ctrl+Shift+R).
          </div>
        )}
        {status === "error" && (
          <div style={{ background: "#FEE2E2", border: "1px solid #FCA5A5", borderRadius: 8, padding: "12px 20px", fontSize: 14, color: "#991B1B", fontWeight: 600, marginBottom: 24 }}>
            ❌ Error — make sure you are logged in as admin and check the log below.
          </div>
        )}

        {/* Log */}
        {log.length > 0 && (
          <div style={{ background: "#111827", borderRadius: 10, padding: 20, fontFamily: "monospace", fontSize: 12, color: "#D1FAE5", lineHeight: 1.7, maxHeight: 500, overflowY: "auto", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
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
