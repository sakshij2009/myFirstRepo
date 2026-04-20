/**
 * Safely convert any Firestore value to a displayable string.
 * Handles: Firestore Timestamp {seconds, nanoseconds}, Date objects, ISO strings, plain strings, null/undefined.
 * Use this EVERYWHERE you render a field from Firestore that could be a Timestamp.
 */
export const safeString = (val) => {
  if (val === null || val === undefined) return "";
  if (typeof val === "string") return val;
  if (typeof val === "number") return String(val);
  if (typeof val === "boolean") return String(val);
  // Firestore Timestamp (has .toDate method)
  if (val?.toDate && typeof val.toDate === "function") {
    return val.toDate().toLocaleString();
  }
  // Raw Date object
  if (val instanceof Date) return val.toLocaleString();
  // Object with seconds/nanoseconds (Firestore Timestamp serialized)
  if (val?.seconds !== undefined && val?.nanoseconds !== undefined) {
    return new Date(val.seconds * 1000).toLocaleString();
  }
  // Fallback: stringify
  return JSON.stringify(val);
};

/**
 * Convert a Firestore value to a JS Date object.
 */
export const toDate = (val) => {
  if (!val) return null;
  // Firestore Timestamp serialization (has seconds, nanoseconds)
  if (val?.seconds !== undefined) return new Date(val.seconds * 1000);
  if (val instanceof Date) return val;
  if (val?.toDate && typeof val.toDate === "function") return val.toDate();
  if (typeof val === "string") {
    // Check if it's an ISO string or standard parseable string
    const d = new Date(val);
    if (!isNaN(d.getTime()) && val.length > 6) return d;
    // Else fall back: custom format parse
  }
  return null;
};

/**
 * Enhanced Date parser for multiple formats used in shifts
 */
export const parseDate = (dateStr) => {
  if (!dateStr) return null;
  
  // Firestore Timestamp handling
  if (dateStr?.seconds !== undefined) return new Date(dateStr.seconds * 1000);
  if (dateStr?.toDate && typeof dateStr.toDate === "function") return dateStr.toDate();
  if (dateStr instanceof Date) return dateStr;
  
  if (typeof dateStr !== "string") return null;

  const clean = dateStr.trim();
  if (!clean) return null;

  // 1. Try ISO-like YYYY-MM-DD (e.g., "2026-04-06")
  // We avoid new Date("YYYY-MM-DD") because it often defaults to UTC midnight.
  if (/^\d{4}-\d{1,2}-\d{1,2}/.test(clean)) {
    const [y, m, d] = clean.split("-").map(Number);
    return new Date(y, m - 1, d);
  }

  // 2. Try DD-MMM-YYYY (e.g., "06-Apr-2026" or "06 Apr 2026")
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const parts = clean.split(/[- ]/);
  if (parts.length >= 3) {
    // Check if middle or first part is a month name
    let d = NaN, m = -1, y = NaN;
    
    // Pattern: DD MMM YYYY
    if (isNaN(Number(parts[1]))) {
      m = months.findIndex(name => name.toLowerCase() === parts[1].slice(0, 3).toLowerCase());
      d = Number(parts[0]);
      y = Number(parts[2]);
    } 
    // Pattern: MMM DD YYYY
    else if (isNaN(Number(parts[0]))) {
      m = months.findIndex(name => name.toLowerCase() === parts[0].slice(0, 3).toLowerCase());
      d = Number(parts[1]);
      y = Number(parts[2]);
    }

    if (m >= 0 && !isNaN(d) && !isNaN(y)) {
      // Correct for 2-digit years if any
      const fullY = y < 100 ? 2000 + y : y;
      return new Date(fullY, m, d);
    }
  }

  // Fallback to native but verify
  const native = new Date(clean);
  if (!isNaN(native.getTime())) return native;

  return null;
};

export const formatDateKey = (date) => {
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

export const formatCanadaTime = (timeVal) => {
  if (!timeVal) return "—";
  try {
    // If it's already a simple time string like "09:00 AM" or "09:30 PM", we check if we should keep it or format it
    if (typeof timeVal === "string" && !timeVal.includes("T") && timeVal.match(/\d+:\d+/)) {
      return timeVal.toUpperCase();
    }
    const date = timeVal.toDate && typeof timeVal.toDate === "function" ? timeVal.toDate() : new Date(timeVal);
    if (isNaN(date.getTime())) {
      return typeof timeVal === "string" ? timeVal : "—";
    }
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZone: "America/Edmonton",
    });
  } catch (e) {
    return "—";
  }
};

/**
 * Display a shift time string correctly.
 *
 * Admin panels store times in LOCAL Edmonton time (e.g. "14:00" means 2:00 PM Edmonton).
 * We must NOT treat these as UTC — doing so shifts the display by 6–7 hours.
 *
 * Rules:
 *  - Already has AM/PM  → return as-is (uppercase)
 *  - Plain "HH:MM"      → convert to 12-hour display directly (no UTC math)
 *  - Anything else      → return raw string
 */
export const formatShiftTimeUTCtoCanada = (dateStr, timeStr) => {
  if (!timeStr) return "—";
  try {
    const tStr = String(timeStr).trim();

    // Already formatted with AM/PM marker
    if (/AM|PM/i.test(tStr)) return tStr.toUpperCase();

    // Plain 24-hour "HH:MM" or "H:MM" — stored as local Edmonton time
    if (/^\d{1,2}:\d{2}$/.test(tStr)) {
      const [h, m] = tStr.split(":").map(Number);
      const ampm = h >= 12 ? "PM" : "AM";
      const h12 = h % 12 || 12;
      return `${h12}:${m.toString().padStart(2, "0")} ${ampm}`;
    }

    // Full ISO timestamp (has 'T') — convert with timezone
    if (tStr.includes("T") || tStr.includes("Z")) {
      const date = new Date(tStr);
      if (!isNaN(date.getTime())) {
        return date.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
          timeZone: "America/Edmonton",
        });
      }
    }

    return tStr;
  } catch (e) {
    return String(timeStr);
  }
};
