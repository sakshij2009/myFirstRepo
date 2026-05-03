import React, { useState } from "react";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";

// ─────────────────────────────────────────────────────────────────────────────
// MIGRATION v4 — fixes ALL 50 InTakeForms docs for Flutter compatibility
//
// Root cause of crash: our earlier migration set isActive:true on 40 old
// flutter docs that were MISSING dateOfInTake, nameInClientTable, childsName.
// Flutter now queries them (isActive==true) and crashes on the null fields.
// ─────────────────────────────────────────────────────────────────────────────

function toFlutterDate(val) {
  if (!val || typeof val !== "string" || !val.trim()) return null;
  if (/^\d{2}-\d{2}-\d{4}$/.test(val)) return val;          // already DD-MM-YYYY ✓
  if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
    const [y, m, d] = val.split("-");
    return `${d}-${m}-${y}`;
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
  return arr.map((c) => ({
    ...c,
    name: c.name || c.fullName || "",
    dob:  isBadDate(c.dob) ? (toFlutterDate(c.dob) || null) : (c.dob !== undefined ? c.dob : null),
  }));
}

function buildClientsFromReact(clients) {
  if (!clients || typeof clients !== "object" || Array.isArray(clients)) return [];
  return Object.values(clients).map((c) => ({
    name: c.fullName || "", gender: c.gender || "",
    dob: toFlutterDate(c.birthDate) || null,
    address: c.address || "", phone: c.phone || "", email: c.email || "",
    diagnosis: c.diagnosis || "", allergies: c.allergies || "",
    medicalInfo: "", transportNeeds: "", serviceType: "", visitFrequency: "",
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
        const data  = docSnap.data();
        const ref   = doc(db, "InTakeForms", docSnap.id);
        const patch = {};
        const reasons = [];

        const isReactForm = !!(
          (data.clients   && typeof data.clients   === "object" && !Array.isArray(data.clients)) ||
          (data.workerInfo && typeof data.workerInfo === "object") ||
          (data.services   && typeof data.services  === "object")
        );
        const hasLegacy = Array.isArray(data.inTakeClients) && data.inTakeClients.length > 0;

        // 1. isActive
        if (data.isActive !== true) { patch.isActive = true; reasons.push("isActive"); }

        // 2. inTakeClients — build if missing, fix dob/name if present
        if (!hasLegacy) {
          if (isReactForm && data.clients) {
            const built = buildClientsFromReact(data.clients);
            patch.inTakeClients = built.length > 0 ? built : [];
            reasons.push(`inTakeClients(built ${patch.inTakeClients.length})`);
          } else {
            patch.inTakeClients = [];
            reasons.push("inTakeClients([])");
          }
        } else {
          const fixed = fixExistingClients(data.inTakeClients);
          if (JSON.stringify(fixed) !== JSON.stringify(data.inTakeClients)) {
            patch.inTakeClients = fixed; reasons.push("inTakeClients.dob/name");
          }
        }

        // 3. nameInClientTable / childsName — must be non-null strings for Flutter
        if (!data.nameInClientTable || !data.childsName) {
          let name = data.nameInClientTable || data.childsName || "";
          if (!name && hasLegacy) name = (data.inTakeClients[0] && data.inTakeClients[0].name) || "";
          if (!name && patch.inTakeClients && patch.inTakeClients[0]) name = patch.inTakeClients[0].name || "";
          if (!name && isReactForm && data.clients) {
            const first = Object.values(data.clients)[0];
            name = (first && first.fullName) || "";
          }
          if (!data.nameInClientTable) { patch.nameInClientTable = name; reasons.push("nameInClientTable"); }
          if (!data.childsName)        { patch.childsName        = name; reasons.push("childsName"); }
        }

        // 4. dateOfInTake — CRITICAL: must be non-null DD-MM-YYYY string for Flutter
        const hasDoi = Object.prototype.hasOwnProperty.call(data, "dateOfInTake");
        if (!hasDoi) {
          // Field completely missing — use consentDate if available (it's already DD-MM-YYYY)
          const fallback = toFlutterDate(data.consentDate) || "01-05-2026";
          patch.dateOfInTake = fallback;
          reasons.push(`dateOfInTake(added:"${fallback}")`);
        } else if (isBadDate(data.dateOfInTake)) {
          const fixed = toFlutterDate(data.dateOfInTake) || toFlutterDate(data.consentDate) || "01-05-2026";
          patch.dateOfInTake = fixed;
          reasons.push(`dateOfInTake("${data.dateOfInTake}"→"${fixed}")`);
        }

        // 5. nameOfPerson / inTakeWorkerName for React forms
        if (!data.nameOfPerson && isReactForm) {
          const wn = (data.workerInfo && data.workerInfo.workerName) || "";
          if (wn) { patch.nameOfPerson = wn; reasons.push("nameOfPerson"); }
        }
        if (!data.inTakeWorkerName && isReactForm) {
          const wn = data.intakeworkerName || (data.workerInfo && data.workerInfo.workerName) || "";
          if (wn) { patch.inTakeWorkerName = wn; reasons.push("inTakeWorkerName"); }
        }

        // 6. Null-out top-level empty date strings
        for (const field of ["submittedOn", "createdAt", "dateOfBirth"]) {
          if (data[field] === "") { patch[field] = null; reasons.push(`${field}→null`); }
        }

        if (Object.keys(patch).length === 0) {
          const label = data.nameInClientTable || data.childsName || "(no name)";
          addLog(`  ✓ SKIP  ${label}`);
          skipped++;
          continue;
        }

        const label = data.nameInClientTable || data.childsName || patch.nameInClientTable || "(no name)";
        try {
          await updateDoc(ref, patch);
          addLog(`  ✅ FIXED ${label.padEnd(28)} → ${reasons.join(", ")}`);
          updated++;
        } catch (err) {
          addLog(`  ❌ ERROR ${label}: ${err.message}`);
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

  const reset = () => { setStatus("idle"); setLog([]); setStats({ total: 0, updated: 0, skipped: 0, errors: 0 }); };

  const btn = (bg, label, onClick) => (
    <button onClick={onClick} style={{
      background: bg, color: "#fff", border: "none", borderRadius: 8,
      padding: "12px 28px", fontSize: 15, fontWeight: 600, cursor: "pointer",
      marginBottom: 24, marginRight: 12,
    }}>{label}</button>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#F9FAFB", fontFamily: "'Plus Jakarta Sans', sans-serif", padding: "40px 24px" }}>
      <div style={{ maxWidth: 820, margin: "0 auto" }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "#111827", marginBottom: 8 }}>
          InTakeForms — Migration v4
        </h1>
        <p style={{ fontSize: 14, color: "#6B7280", marginBottom: 16 }}>
          Fixes all 50 InTakeForms documents so the old Flutter app works correctly.
        </p>

        <div style={{ background: "#FEF3C7", border: "1px solid #FCD34D", borderRadius: 8, padding: "12px 18px", fontSize: 13, color: "#92400E", marginBottom: 28 }}>
          <strong>What this fixes:</strong>
          <ul style={{ margin: "6px 0 0", paddingLeft: 20, lineHeight: 2.2 }}>
            <li>Sets <code>isActive: true</code> on every document</li>
            <li><strong>Adds missing <code>dateOfInTake</code></strong> to all 40 old flutter forms (uses <code>consentDate</code>)</li>
            <li><strong>Adds missing <code>nameInClientTable</code> / <code>childsName</code></strong> from <code>inTakeClients[0].name</code></li>
            <li>Builds <code>inTakeClients[]</code> for React forms missing it</li>
            <li>Sets <code>inTakeClients: []</code> for flutter forms missing it</li>
            <li>Converts <code>dob</code> / <code>dateOfInTake</code> from <code>YYYY-MM-DD</code> → <code>DD-MM-YYYY</code></li>
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

        {status === "idle"                      && btn("#1B5E37", "Run Migration", runMigration)}
        {(status === "done" || status === "error") && btn("#4B5563", "Run Again", reset)}
        {status === "running" && <div style={{ marginBottom: 24, color: "#1B5E37", fontWeight: 600 }}>⏳ Running…</div>}

        {status === "done" && (
          <div style={{ background: "#D1FAE5", border: "1px solid #6EE7B7", borderRadius: 8, padding: "14px 20px", fontSize: 14, color: "#065F46", fontWeight: 600, marginBottom: 24 }}>
            ✅ Migration complete!<br />
            <span style={{ fontWeight: 400 }}>
              Now go to <strong>famforeveradmin.web.app</strong> and press <strong>Ctrl+Shift+R</strong> to hard-refresh.
            </span>
          </div>
        )}
        {status === "error" && (
          <div style={{ background: "#FEE2E2", border: "1px solid #FCA5A5", borderRadius: 8, padding: "12px 20px", fontSize: 14, color: "#991B1B", fontWeight: 600, marginBottom: 24 }}>
            ❌ Error — are you logged in as admin? Check the log below.
          </div>
        )}

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
