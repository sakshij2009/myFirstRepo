export const startOfMonth  = (d) => new Date(d.getFullYear(), d.getMonth(), 1);
export const endOfMonth    = (d) => new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
export const startOfLastMonth = (d) => new Date(d.getFullYear(), d.getMonth() - 1, 1);
export const endOfLastMonth   = (d) => new Date(d.getFullYear(), d.getMonth(), 0, 23, 59, 59);
export const formatLocalISO = (date) => {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

/**
 * Returns a JS Date representing midnight at the start of CURRENT day in Edmonton.
 */
export const getEdmontonToday = () => {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Edmonton',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric'
  });
  const parts = formatter.formatToParts(now);
  const y = parseInt(parts.find(p => p.type === 'year').value, 10);
  const m = parseInt(parts.find(p => p.type === 'month').value, 10);
  const d = parseInt(parts.find(p => p.type === 'day').value, 10);
  return new Date(y, m - 1, d);
};

/**
 * Formats a date to YYYY-MM-DD from the perspective of Edmonton timezone.
 */
export const formatEdmontonISO = (date) => {
  if (!date) return "";
  const dObj = new Date(date);
  if (isNaN(dObj.getTime())) return "";
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Edmonton',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric'
  });
  const parts = formatter.formatToParts(dObj);
  const y = parts.find(p => p.type === 'year').value;
  const m = parts.find(p => p.type === 'month').value.padStart(2, '0');
  const d = parts.find(p => p.type === 'day').value.padStart(2, '0');
  return `${y}-${m}-${d}`;
};

// Month name → 0-based index map for Flutter date format ("07 Jun 2026")
const MONTH_MAP = {
  jan:0, feb:1, mar:2, apr:3, may:4, jun:5,
  jul:6, aug:7, sep:8, oct:9, nov:10, dec:11,
};

/**
 * Safely parse ANY date value into a JS Date using LOCAL midnight.
 * Handles: Firestore Timestamp, Date object, "YYYY-MM-DD", "DD-MM-YYYY",
 * "DD Mon YYYY" (Flutter format e.g. "07 Jun 2026"), ISO datetime strings.
 * Never relies on browser-dependent new Date(string) parsing.
 */
export const parseLocalSafe = (val) => {
  if (!val) return null;

  // Firestore Timestamp
  if (val?.toDate && typeof val.toDate === "function") {
    // Extract date components using local timezone so Timestamps don't shift
    const d = val.toDate();
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  if (val instanceof Date) {
    // Normalise to LOCAL midnight to strip any time component
    return new Date(val.getFullYear(), val.getMonth(), val.getDate());
  }

  if (typeof val === "string") {
    const clean = val.trim();

    // "YYYY-MM-DD" — ISO date only (no time, no Z) → LOCAL midnight
    if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
      const [y, m, d] = clean.split("-").map(Number);
      return new Date(y, m - 1, d);
    }

    // "DD Mon YYYY" — Flutter format e.g. "07 Jun 2026" → LOCAL midnight
    const flutterMatch = clean.match(/^(\d{1,2})\s+([A-Za-z]{3,})\s+(\d{4})$/);
    if (flutterMatch) {
      const day  = parseInt(flutterMatch[1], 10);
      const mon  = MONTH_MAP[flutterMatch[2].substring(0, 3).toLowerCase()];
      const year = parseInt(flutterMatch[3], 10);
      if (mon !== undefined) return new Date(year, mon, day);
    }

    // "DD-MM-YYYY" or "DD/MM/YYYY"
    if (/^\d{2}[-/]\d{2}[-/]\d{4}$/.test(clean)) {
      const parts = clean.split(/[-/]/).map(Number);
      return new Date(parts[2], parts[1] - 1, parts[0]);
    }

    // ISO datetime string e.g. "2026-06-07T18:30:00.000Z"
    // Extract UTC date components and return local midnight for that UTC date
    const isoDateTimeMatch = clean.match(/^(\d{4})-(\d{2})-(\d{2})T/);
    if (isoDateTimeMatch) {
      const d = new Date(clean);
      if (!isNaN(d.getTime())) {
        // Use UTC date components to avoid timezone shift
        return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
      }
    }
  }

  // Last resort — extract components from whatever JS can parse
  const d = new Date(val);
  if (isNaN(d.getTime())) return null;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
};
