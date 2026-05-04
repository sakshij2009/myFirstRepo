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

// ─── Step-3 shift helpers ─────────────────────────────────────────────────────

const _MON = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

/** Convert any date-like value → JS Date, or null */
function parseAnyDate(val) {
  if (!val) return null;
  if (val && typeof val.toDate === "function") return val.toDate();   // Firestore Timestamp
  if (val && val.seconds)  return new Date(val.seconds * 1000);       // plain {seconds, nanoseconds}
  if (typeof val === "number") return new Date(val);
  if (typeof val === "string") {
    if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
      const [y, m, d] = val.split("-");
      return new Date(Number(y), Number(m) - 1, Number(d));
    }
    if (/^\d{2}-\d{2}-\d{4}$/.test(val)) {
      const [d, m, y] = val.split("-");
      return new Date(Number(y), Number(m) - 1, Number(d));
    }
    const p = new Date(val);
    if (!isNaN(p)) return p;
  }
  return null;
}
/** "03 May 2026" */
function fmtFlutter(d) {
  return `${String(d.getDate()).padStart(2,"0")} ${_MON[d.getMonth()]} ${d.getFullYear()}`;
}
/** "03-05-2026" */
function fmtDDMMYYYY(d) {
  return `${String(d.getDate()).padStart(2,"0")}-${String(d.getMonth()+1).padStart(2,"0")}-${d.getFullYear()}`;
}
/** "2026-05-03" */
function fmtISO(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
/** True if value is a Firestore Timestamp object or {seconds} plain object */
function isTimestamp(v) {
  return v && (typeof v.toDate === "function" || (typeof v.seconds === "number" && typeof v.nanoseconds === "number"));
}

// ─── component ────────────────────────────────────────────────────────────────

export default function MigrateIntakeForms() {
  const [status, setStatus] = useState("idle");
  const [log, setLog]       = useState([]);
  const [stats, setStats]   = useState({ fixed: 0, skipped: 0, created: 0, errors: 0, total: 0, shiftsFixed: 0 });

  const addLog = (msg, type = "info") => setLog(prev => [...prev, { msg, type }]);

  const runMigration = async () => {
    setStatus("running");
    setLog([]);
    setStats({ fixed: 0, skipped: 0, created: 0, errors: 0, total: 0, shiftsFixed: 0 });

    let fixed = 0, skipped = 0, created = 0, errors = 0, shiftsFixed = 0;

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

        // 5. familyName — Flutter queries / displays InTakeForms by this field
        if (!data.familyName) {
          const fn = data.nameInClientTable || data.childsName
                  || patch.nameInClientTable || patch.childsName || "";
          if (fn) { patch.familyName = fn; reasons.push("familyName"); }
        }

        // 6. nameOfPerson / inTakeWorkerName
        if (!data.nameOfPerson && isReact) {
          const wn = data.workerInfo?.workerName || "";
          if (wn) { patch.nameOfPerson = wn; reasons.push("nameOfPerson"); }
        }
        if (!data.inTakeWorkerName && isReact) {
          const wn = data.intakeworkerName || data.workerInfo?.workerName || "";
          if (wn) { patch.inTakeWorkerName = wn; reasons.push("inTakeWorkerName"); }
        }

        // 7. Null-out empty date strings
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
          familyName:        clientName,   // Flutter queries InTakeForms by this field
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

      // ══════════════════════════════════════════════════════════════
      // STEP 3 — Fix React-created shifts with wrong field formats
      // ══════════════════════════════════════════════════════════════
      addLog("", "info");
      addLog("── STEP 3: Fixing React-created shifts ──", "header");
      addLog("  (Detecting shifts where dateKey is YYYY-MM-DD or userId is non-numeric…)");

      // ── 3a. Build lookup maps ──────────────────────────────────────

      addLog("  Loading users, shiftTypes, shiftCategories…");

      const [usersSnap, typesSnap, catsSnap] = await Promise.all([
        getDocs(collection(db, "users")),
        getDocs(collection(db, "shiftTypes")),
        getDocs(collection(db, "shiftCategories")),
      ]);

      // users: keyed by docId and by username (lowercase)
      const usersByDocId   = {};
      const usersByUsername = {};
      for (const uSnap of usersSnap.docs) {
        const u = uSnap.data();
        usersByDocId[uSnap.id] = u;
        if (u.username) usersByUsername[u.username.toLowerCase()] = u;
        if (u.email)    usersByUsername[u.email.toLowerCase()]    = u;
      }

      // shiftTypes: keyed by name (lowercase) and by id
      const typesByName = {};
      const typesById   = {};
      for (const tSnap of typesSnap.docs) {
        const t = { id: tSnap.id, ...tSnap.data() };
        if (t.name) typesByName[t.name.toLowerCase()] = t;
        typesById[tSnap.id] = t;
      }

      // shiftCategories: keyed by name (lowercase) and by id
      const catsByName = {};
      const catsById   = {};
      for (const cSnap of catsSnap.docs) {
        const c = { id: cSnap.id, ...cSnap.data() };
        if (c.name) catsByName[c.name.toLowerCase()] = c;
        catsById[cSnap.id] = c;
      }

      addLog(`  Loaded ${usersSnap.size} users, ${typesSnap.size} shiftTypes, ${catsSnap.size} categories.`);

      // ── 3b. Fetch and scan all shifts ──────────────────────────────

      addLog("  Fetching all shifts — please wait…");
      const shiftsSnap = await getDocs(collection(db, "shifts"));
      addLog(`  Found ${shiftsSnap.size} shifts total.`);

      let s3Fixed = 0, s3Skipped = 0, s3Errors = 0;

      // Today midnight — used to detect future shifts
      const todayMidnight = new Date();
      todayMidnight.setHours(0, 0, 0, 0);

      for (const sSnap of shiftsSnap.docs) {
        const s = sSnap.data();

        // Parse shift date from DD-MM-YYYY for future-shift check
        let shiftDateParsed = null;
        if (typeof s.dateKey === "string" && /^\d{2}-\d{2}-\d{4}$/.test(s.dateKey)) {
          const [dd, mm, yy] = s.dateKey.split("-");
          shiftDateParsed = new Date(Number(yy), Number(mm) - 1, Number(dd));
        }
        const isFutureShift = shiftDateParsed && shiftDateParsed > todayMidnight;

        // ── Detect shifts that need fixing ──
        const hasWrongDateKey   = typeof s.dateKey === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s.dateKey);
        const hasWrongUserId    = typeof s.userId  === "string" && !/^\d+$/.test((s.userId || "").trim());
        // Old React used shiftType / shiftCategory (name strings) instead of typeId/typeName/categoryId/categoryName
        const hasOldTypeFields  = (s.shiftType && !s.typeId) || (s.shiftCategory && !s.categoryId);
        const missingCoreFields = !s.typeName || !s.categoryId || s.status === undefined || s.billingStatus === undefined;
        // shiftConfirmed=true means worker finished+confirmed — status must be "Confirmed" not "Pending"
        const statusMismatch    = s.shiftConfirmed === true && s.status === "Pending";
        // Future shifts should never have pre-filled clockIn/clockOut (they haven't happened yet)
        const hasFakeClockTimes = isFutureShift && !!(s.clockIn || s.clockOut);

        if (!hasWrongDateKey && !hasWrongUserId && !hasOldTypeFields && !missingCoreFields && !statusMismatch && !hasFakeClockTimes) {
          s3Skipped++;
          continue;
        }

        const patch3   = {};
        const reasons3 = [];

        // ── Fix dateKey ──
        let shiftDate = null;
        if (hasWrongDateKey) {
          shiftDate = parseAnyDate(s.dateKey);
          if (shiftDate) {
            patch3.dateKey     = fmtDDMMYYYY(shiftDate);
            patch3.dateKey_iso = fmtISO(shiftDate);
            reasons3.push("dateKey");
          }
        } else if (typeof s.dateKey === "string" && /^\d{2}-\d{2}-\d{4}$/.test(s.dateKey)) {
          // Already correct — just parse for later use
          const [dd, mm, yy] = s.dateKey.split("-");
          shiftDate = new Date(Number(yy), Number(mm) - 1, Number(dd));
        }

        // ── Fix startDate / endDate ──
        const sdRaw = s.startDate;
        const edRaw = s.endDate;

        // Need to fix if stored as a Firestore Timestamp OR as "YYYY-MM-DD" string
        const sdNeedsfix = isTimestamp(sdRaw) || (typeof sdRaw === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sdRaw));
        const edNeedsfix = isTimestamp(edRaw) || (typeof edRaw === "string" && /^\d{4}-\d{2}-\d{2}$/.test(edRaw));

        if (sdNeedsfix) {
          const d = parseAnyDate(sdRaw);
          if (d) {
            patch3.startDate = fmtFlutter(d);
            if (!shiftDate) shiftDate = d;
            reasons3.push("startDate");
          }
        }
        if (edNeedsfix) {
          const d = parseAnyDate(edRaw);
          if (d) { patch3.endDate = fmtFlutter(d); reasons3.push("endDate"); }
        }

        // ── Fix timeStampId ──
        if (!s.timeStampId && shiftDate) {
          patch3.timeStampId = shiftDate.getTime();
          reasons3.push("timeStampId");
        }

        // ── Clear fake clockIn/clockOut on future shifts ──
        // Flutter pre-fills these with scheduled times for ALL shifts, even ones months away.
        // A shift that hasn't happened yet cannot have real clock-in/out times.
        if (isFutureShift && (s.clockIn || s.clockOut)) {
          patch3.clockIn  = "";
          patch3.clockOut = "";
          reasons3.push("cleared future clockIn/Out");
        }

        // ── Fix userId / user fields ──
        if (hasWrongUserId) {
          const key     = (s.userId || "").toLowerCase();
          const userDoc = usersByUsername[key] || usersByDocId[s.userId] || null;

          if (userDoc) {
            // userId must be numeric for Flutter
            const numId = userDoc.userId ?? userDoc.numericId ?? userDoc.id ?? null;
            if (numId !== null && numId !== undefined) {
              patch3.userId = Number(numId);
              reasons3.push(`userId→${numId}`);
            }
            if (!s.username && userDoc.username) {
              patch3.username = userDoc.username; reasons3.push("username");
            }
            if (!s.phone && userDoc.phone) {
              patch3.phone = userDoc.phone; reasons3.push("phone");
            }
            if (!s.email && userDoc.email) {
              patch3.email = userDoc.email; reasons3.push("email");
            }
            const fullName = userDoc.name || userDoc.fullName || "";
            if (!s.primaryUserName && fullName) {
              patch3.primaryUserName = fullName; reasons3.push("primaryUserName");
            }
          } else {
            addLog(`  ⚠️  shift ${sSnap.id.slice(-8)} — user "${s.userId}" not found in users collection`, "err");
          }

          if (!s.primaryUserId && s.userId) {
            patch3.primaryUserId = s.userId; reasons3.push("primaryUserId");
          }
        }

        // ── Fix typeName / typeId ──
        // Source priority: typeName → shiftType (old React field) → nothing
        const typeNameSrc = (s.typeName || s.shiftType || "").trim();
        if (typeNameSrc && (!s.typeId || !s.typeName)) {
          const t = typesByName[typeNameSrc.toLowerCase()];
          if (t) {
            if (!s.typeName)  { patch3.typeName = t.name; reasons3.push("typeName"); }
            if (!s.typeId)    { patch3.typeId   = t.id;   reasons3.push("typeId"); }
          }
        } else if (!s.typeName && s.typeId) {
          const t = typesById[s.typeId];
          if (t?.name) { patch3.typeName = t.name; reasons3.push("typeName"); }
        }

        // ── Fix categoryName / categoryId ──
        // Source priority: categoryName → shiftCategory (old React field) → nothing
        const catNameSrc = (s.categoryName || s.shiftCategory || "").trim();
        if (catNameSrc && (!s.categoryId || !s.categoryName)) {
          const c = catsByName[catNameSrc.toLowerCase()];
          if (c) {
            if (!s.categoryName)  { patch3.categoryName = c.name; reasons3.push("categoryName"); }
            if (!s.categoryId)    { patch3.categoryId   = c.id;   reasons3.push("categoryId"); }
          }
        } else if (!s.categoryName && s.categoryId) {
          const c = catsById[s.categoryId];
          if (c?.name) { patch3.categoryName = c.name; reasons3.push("categoryName"); }
        }

        // ── Fix jobname / jobdescription ──
        if (!s.jobname && (s.clientName || s.client)) {
          patch3.jobname = s.clientName || s.client; reasons3.push("jobname");
        }
        if (!s.jobdescription && (s.description || s.notes)) {
          patch3.jobdescription = s.description || s.notes; reasons3.push("jobdescription");
        }

        // ── Fix status mismatch: shiftConfirmed=true but status still "Pending" ──
        if (s.shiftConfirmed === true && s.status === "Pending") {
          patch3.status = "Confirmed";
          reasons3.push("status→Confirmed(shiftConfirmed)");
        }

        // ── Add missing status flags (only when undefined/null — never downgrade existing) ──
        if ((s.status      === undefined || s.status      === null) && !patch3.status)  { patch3.status       = "Pending";  reasons3.push("status"); }
        if (s.billingStatus === undefined)                          { patch3.billingStatus = "Billable"; reasons3.push("billingStatus"); }
        if (s.locked       === undefined)                           { patch3.locked        = false;      reasons3.push("locked"); }

        // ── Add missing numeric/financial fields ──
        const numDefaults = { kms: 0, approvedKms: 0, expense: 0, approvedExpense: 0, clientRate: 0, clientKMRate: 0 };
        for (const [k, v] of Object.entries(numDefaults)) {
          if (s[k] === undefined) patch3[k] = v;
        }

        // ── Add missing coordinate / media fields ──
        if (s.startLatitude      === undefined) patch3.startLatitude      = 0;
        if (s.startLongitude     === undefined) patch3.startLongitude     = 0;
        if (s.endLatitude        === undefined) patch3.endLatitude        = 0;
        if (s.endLongitude       === undefined) patch3.endLongitude       = 0;
        if (!Array.isArray(s.expenseReceiptUrlList)) patch3.expenseReceiptUrlList = [];
        if (s.profilePhotoUrl    === undefined) patch3.profilePhotoUrl    = "";
        if (s.shiftReportImageUrl === undefined) patch3.shiftReportImageUrl = "";

        if (Object.keys(patch3).length === 0) {
          s3Skipped++;
          continue;
        }

        try {
          await updateDoc(doc(db, "shifts", sSnap.id), patch3);
          addLog(`  ✅ FIXED shift …${sSnap.id.slice(-8)}  → ${reasons3.join(", ")}`, "ok");
          s3Fixed++;
          shiftsFixed++;
        } catch (e) {
          addLog(`  ❌ ERROR shift ${sSnap.id}: ${e.message}`, "err");
          s3Errors++;
          errors++;
        }
      }

      addLog(`  Step 3 done: ${s3Fixed} shifts fixed, ${s3Skipped} skipped (already OK), ${s3Errors} errors.`, "done");

      setStats({ fixed, skipped, created, errors, total: intakeSnap.size, shiftsFixed });
      addLog("", "info");
      addLog(`All steps done: ${fixed} forms fixed, ${created} new IntakeForms created, ${shiftsFixed} shifts fixed, ${errors} errors.`, "done");
      setStatus("done");

    } catch (e) {
      addLog(`Fatal: ${e.message}`, "err");
      setStatus("error");
    }
  };

  const reset = () => { setStatus("idle"); setLog([]); setStats({ fixed:0, skipped:0, created:0, errors:0, total:0, shiftsFixed:0 }); };

  const logColor = (type) => ({
    ok: "#6EE7B7", err: "#FCA5A5", skip: "#9CA3AF", header: "#FCD34D", done: "#6EE7B7", info: "#D1FAE5"
  }[type] || "#D1FAE5");

  return (
    <div style={{ minHeight: "100vh", background: "#F9FAFB", fontFamily: "'Plus Jakarta Sans', sans-serif", padding: "40px 24px" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>

        <h1 style={{ fontSize: 24, fontWeight: 700, color: "#111827", marginBottom: 6 }}>
          Database Migration — Full Sync
        </h1>
        <p style={{ fontSize: 14, color: "#6B7280", marginBottom: 20 }}>
          Three-step fix so both the React admin app and the Flutter app share data correctly.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 28 }}>
          {[
            {
              step: "Step 1", title: "Fix existing InTakeForms",
              items: [
                "Sets isActive: true on all docs",
                "Adds missing familyName (Flutter queries by this)",
                "Adds missing dateOfInTake (DD-MM-YYYY)",
                "Adds missing nameInClientTable & childsName",
                "Converts dob/dates YYYY-MM-DD → DD-MM-YYYY",
                "Builds inTakeClients[] for React-created forms",
              ],
            },
            {
              step: "Step 2", title: "Create forms for missing clients",
              items: [
                "Reads all docs from clients collection",
                "Finds clients with no InTakeForms entry",
                "Creates a FULL InTakeForms doc with all data",
                "Preserves dob, diagnosis, allergies, medications",
                "Preserves parent/guardian contacts & agency info",
                "Clients now appear in Flutter's Add Shift dropdown",
              ],
            },
            {
              step: "Step 3", title: "Fix React-created shifts",
              items: [
                "Scans all shifts for YYYY-MM-DD dateKey",
                "Converts dateKey to DD-MM-YYYY (Flutter format)",
                "Converts startDate/endDate Timestamps → strings",
                "Sets userId to numeric integer (Flutter queries by int)",
                "Maps shiftType/shiftCategory → typeId/typeName/categoryId",
                "Adds missing typeId, categoryId, username, phone…",
                "Adds status, billingStatus, locked, kms defaults",
                "Syncs status→Confirmed when shiftConfirmed=true",
                "Clears fake clockIn/Out on future shifts (not worked yet)",
              ],
            },
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
              { label: "Intake Docs",    value: stats.total,       color: "#3B82F6" },
              { label: "Forms Fixed",    value: stats.fixed,       color: "#10B981" },
              { label: "New Forms",      value: stats.created,     color: "#8B5CF6" },
              { label: "Shifts Fixed",   value: stats.shiftsFixed, color: "#F59E0B" },
              { label: "Already OK",     value: stats.skipped,     color: "#6B7280" },
              { label: "Errors",         value: stats.errors,      color: "#EF4444" },
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
              Open <strong>famforeveradmin.web.app</strong> in a new <strong>Incognito window</strong> (Ctrl+Shift+N) — all shifts and clients should now appear.
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
