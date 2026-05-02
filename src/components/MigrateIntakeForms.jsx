import React, { useState } from "react";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";

// ─────────────────────────────────────────────────────────────────────────────
// ONE-TIME MIGRATION: Fix existing InTakeForms documents for Flutter compatibility
//
// Problems fixed:
//  1. Missing `isActive: true`   → Flutter queries where("isActive","==",true)
//  2. dob in YYYY-MM-DD format   → Flutter DateFormat('dd-MM-yyyy').parse() crashes
//  3. dob: ""  empty string      → Flutter DateFormat.parse("") crashes
//  4. Missing `name` in inTakeClients entries (only had fullName)
// ─────────────────────────────────────────────────────────────────────────────

function convertDob(dob) {
  if (!dob || dob === "") return null;
  // Already DD-MM-YYYY → keep as-is
  if (/^\d{2}-\d{2}-\d{4}$/.test(dob)) return dob;
  // YYYY-MM-DD → convert to DD-MM-YYYY
  if (/^\d{4}-\d{2}-\d{2}$/.test(dob)) {
    const [yyyy, mm, dd] = dob.split("-");
    return `${dd}-${mm}-${yyyy}`;
  }
  // Unknown format → null (safe for Flutter)
  return null;
}

function fixInTakeClients(clients) {
  if (!Array.isArray(clients)) return clients;
  return clients.map((c) => ({
    ...c,
    // Ensure `name` field exists (Flutter reads c.name, not c.fullName)
    name: c.name || c.fullName || "",
    // Fix dob
    dob: convertDob(c.dob),
  }));
}

export default function MigrateIntakeForms() {
  const [status, setStatus] = useState("idle"); // idle | running | done | error
  const [log, setLog] = useState([]);
  const [stats, setStats] = useState({ total: 0, updated: 0, skipped: 0, errors: 0 });

  const addLog = (msg) => setLog((prev) => [...prev, msg]);

  const runMigration = async () => {
    setStatus("running");
    setLog([]);
    setStats({ total: 0, updated: 0, skipped: 0, errors: 0 });

    try {
      addLog("Fetching all InTakeForms documents…");
      const snapshot = await getDocs(collection(db, "InTakeForms"));
      addLog(`Found ${snapshot.size} document(s).`);

      let updated = 0;
      let skipped = 0;
      let errors = 0;

      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        const ref = doc(db, "InTakeForms", docSnap.id);
        const patch = {};

        // ── Fix 1: isActive ───────────────────────────────────────────────
        if (data.isActive !== true) {
          patch.isActive = true;
        }

        // ── Fix 2 & 3 & 4: inTakeClients dob + name ──────────────────────
        if (Array.isArray(data.inTakeClients) && data.inTakeClients.length > 0) {
          const fixed = fixInTakeClients(data.inTakeClients);
          // Only patch if something actually changed
          const changed = JSON.stringify(fixed) !== JSON.stringify(data.inTakeClients);
          if (changed) patch.inTakeClients = fixed;
        }

        // ── Fix 5: dateOfInTake format ────────────────────────────────────
        if (data.dateOfInTake) {
          const fixedDate = convertDob(data.dateOfInTake);
          if (fixedDate !== data.dateOfInTake) {
            patch.dateOfInTake = fixedDate;
          }
        }

        if (Object.keys(patch).length === 0) {
          addLog(`  ✓ SKIP  [${docSnap.id.slice(0, 8)}…] ${data.nameInClientTable || data.childsName || "(no name)"} — already OK`);
          skipped++;
          continue;
        }

        try {
          await updateDoc(ref, patch);
          const patchKeys = Object.keys(patch).join(", ");
          addLog(`  ✅ FIXED [${docSnap.id.slice(0, 8)}…] ${data.nameInClientTable || data.childsName || "(no name)"} → patched: ${patchKeys}`);
          updated++;
        } catch (err) {
          addLog(`  ❌ ERROR [${docSnap.id.slice(0, 8)}…] ${err.message}`);
          errors++;
        }
      }

      setStats({ total: snapshot.size, updated, skipped, errors });
      addLog("");
      addLog(`Migration complete: ${updated} fixed, ${skipped} skipped, ${errors} errors.`);
      setStatus("done");
    } catch (err) {
      addLog(`Fatal error: ${err.message}`);
      setStatus("error");
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#F9FAFB",
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      padding: "40px 24px",
    }}>
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        {/* Header */}
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "#111827", marginBottom: 8 }}>
          InTakeForms — Legacy Migration
        </h1>
        <p style={{ fontSize: 14, color: "#6B7280", marginBottom: 32, lineHeight: 1.6 }}>
          This one-time migration fixes existing Firestore documents so the old Flutter app
          can read them correctly. It will:
        </p>
        <ul style={{ fontSize: 13, color: "#374151", marginBottom: 32, paddingLeft: 20, lineHeight: 2 }}>
          <li>Set <code>isActive: true</code> on all documents missing this field</li>
          <li>Convert <code>dob</code> fields from <code>YYYY-MM-DD</code> → <code>DD-MM-YYYY</code> in <code>inTakeClients[]</code></li>
          <li>Replace empty-string <code>dob: ""</code> with <code>dob: null</code></li>
          <li>Ensure each client entry has a <code>name</code> field (copies from <code>fullName</code> if needed)</li>
          <li>Convert <code>dateOfInTake</code> from <code>YYYY-MM-DD</code> → <code>DD-MM-YYYY</code></li>
        </ul>

        {/* Stats */}
        {status !== "idle" && (
          <div style={{
            display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap",
          }}>
            {[
              { label: "Total", value: stats.total, color: "#3B82F6" },
              { label: "Fixed", value: stats.updated, color: "#10B981" },
              { label: "Already OK", value: stats.skipped, color: "#6B7280" },
              { label: "Errors", value: stats.errors, color: "#EF4444" },
            ].map(({ label, value, color }) => (
              <div key={label} style={{
                background: "#fff",
                border: "1px solid #E5E7EB",
                borderRadius: 10,
                padding: "12px 20px",
                minWidth: 110,
                textAlign: "center",
              }}>
                <div style={{ fontSize: 26, fontWeight: 700, color }}>{value}</div>
                <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2 }}>{label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Run button */}
        {status === "idle" && (
          <button
            onClick={runMigration}
            style={{
              background: "#1B5E37",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "12px 28px",
              fontSize: 15,
              fontWeight: 600,
              cursor: "pointer",
              marginBottom: 24,
            }}
          >
            Run Migration
          </button>
        )}

        {status === "running" && (
          <div style={{ marginBottom: 24, color: "#1B5E37", fontWeight: 600 }}>
            ⏳ Running…
          </div>
        )}

        {status === "done" && (
          <div style={{
            background: "#D1FAE5",
            border: "1px solid #6EE7B7",
            borderRadius: 8,
            padding: "12px 20px",
            fontSize: 14,
            color: "#065F46",
            fontWeight: 600,
            marginBottom: 24,
          }}>
            ✅ Migration complete! You can now close this page.
          </div>
        )}

        {status === "error" && (
          <div style={{
            background: "#FEE2E2",
            border: "1px solid #FCA5A5",
            borderRadius: 8,
            padding: "12px 20px",
            fontSize: 14,
            color: "#991B1B",
            fontWeight: 600,
            marginBottom: 24,
          }}>
            ❌ Migration encountered an error. Check the log below and ensure you are logged in as admin.
          </div>
        )}

        {/* Log */}
        {log.length > 0 && (
          <div style={{
            background: "#111827",
            borderRadius: 10,
            padding: 20,
            fontFamily: "monospace",
            fontSize: 12,
            color: "#D1FAE5",
            lineHeight: 1.7,
            maxHeight: 480,
            overflowY: "auto",
            whiteSpace: "pre-wrap",
            wordBreak: "break-all",
          }}>
            {log.map((line, i) => (
              <div key={i} style={{
                color: line.includes("❌") ? "#FCA5A5"
                  : line.includes("✅") ? "#6EE7B7"
                  : line.includes("✓") ? "#9CA3AF"
                  : "#D1FAE5",
              }}>
                {line}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
