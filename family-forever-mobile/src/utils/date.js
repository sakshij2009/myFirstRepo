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
  // Firestore Timestamp
  if (dateStr?.seconds !== undefined) return new Date(dateStr.seconds * 1000);
  if (dateStr?.toDate && typeof dateStr.toDate === "function") return dateStr.toDate();
  // Already a Date
  if (dateStr instanceof Date) return dateStr;
  if (typeof dateStr !== "string") return null;

  // Try native parse first (handles ISO, YYYY-MM-DD etc.)
  const native = new Date(dateStr);
  if (!isNaN(native.getTime()) && dateStr.length > 6) return native;

  // Custom formats check: "DD-Mon-YYYY" or "DD Mon YYYY"
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const sep = dateStr.includes("-") ? "-" : " ";
  const parts = dateStr.split(sep);
  if (parts.length < 3) return null;

  const [dd, mmm, yyyy] = parts;
  const monthIdx = months.findIndex(m => mmm?.toLowerCase().slice(0, 3) === m.toLowerCase());
  if (monthIdx >= 0) return new Date(Number(yyyy), monthIdx, Number(dd));

  return null;
};

export const formatDateKey = (date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
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
