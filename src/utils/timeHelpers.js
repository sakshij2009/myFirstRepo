/**
 * Central 12-hour time formatting helpers.
 *
 * The app stores times in a mix of shapes (Firestore Timestamps, "HH:mm",
 * "HH:mm:ss", "YYYY-MM-DD, HH:mm:ss", ISO strings, and already-formatted
 * "h:mm AM/PM"). Every USER-FACING time must render in 12-hour format.
 *
 * NOTE: Storage/parsing stays 24-hour on purpose — these helpers are for
 * display only. Never use them to build a value written back to Firestore.
 */

const AMPM_RE = /^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)$/i;

/** "13:05" | "13:05:22" → "1:05 PM". Returns "" for empty input. */
export const to12HourClock = (hhmm) => {
  if (hhmm === null || hhmm === undefined) return "";
  const s = String(hhmm).trim();
  if (!s) return "";

  // Already 12-hour — just normalise spacing, drop seconds, strip a leading zero
  const ampmMatch = s.match(AMPM_RE);
  if (ampmMatch) {
    const h = parseInt(ampmMatch[1], 10) || 12;
    return `${h}:${ampmMatch[2]} ${ampmMatch[3].toUpperCase()}`;
  }

  const m = s.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return s;

  let h = parseInt(m[1], 10);
  if (isNaN(h)) return s;
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${m[2]} ${ampm}`;
};

/**
 * Format ANY time-ish value as "h:mm AM/PM".
 * Handles Firestore Timestamp, Date, "YYYY-MM-DD, HH:mm:ss", "HH:mm",
 * "h:mm AM/PM" and ISO datetime strings.
 *
 * @param {*} value      the raw value
 * @param {string} fallback what to return when the value is empty/unparseable
 */
export const formatTime12 = (value, fallback = "") => {
  if (value === null || value === undefined || value === "") return fallback;

  // Firestore Timestamp
  if (typeof value?.toDate === "function") {
    return value.toDate().toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  }

  // Plain { seconds } Timestamp shape (mobile app / raw REST reads)
  if (typeof value === "object" && value !== null && typeof value.seconds === "number") {
    return new Date(value.seconds * 1000).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  }

  if (value instanceof Date) {
    if (isNaN(value.getTime())) return fallback;
    return value.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  }

  const s = String(value).trim();
  if (!s) return fallback;

  // Already "9:32 AM"
  if (AMPM_RE.test(s)) return to12HourClock(s);

  // "YYYY-MM-DD, HH:mm:ss" — split on the comma so the browser timezone
  // never shifts a time that was already recorded in Edmonton local time.
  if (s.includes(",")) {
    const timePart = s.split(",")[1]?.trim();
    if (timePart) return to12HourClock(timePart);
  }

  // Bare "HH:mm" / "HH:mm:ss"
  if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(s)) return to12HourClock(s);

  // ISO / anything else the engine can parse
  const d = new Date(s);
  if (!isNaN(d.getTime())) {
    return d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  }

  return s;
};

/**
 * Parse forgiving user time entry into the canonical 24-hour "HH:mm" that the
 * app stores. Accepts "9", "9pm", "9:30 PM", "930", "2130", "21:30", "09:00".
 *
 * @returns "HH:mm", "" for blank input, or null when it cannot be parsed.
 */
export const parseTimeInput = (raw) => {
  if (raw === null || raw === undefined) return "";
  const s = String(raw).trim().toLowerCase().replace(/\./g, "");
  if (!s) return "";

  // Trailing meridiem, e.g. "9:30 pm" / "9pm" / "930 p"
  const mer = s.match(/^(.*?)\s*([ap])m?$/);
  const body = (mer ? mer[1] : s).trim().replace(/\s+/g, "");
  const meridiem = mer ? mer[2] : null;

  let h;
  let min;

  const colon = body.match(/^(\d{1,2}):(\d{2})$/);
  if (colon) {
    h = parseInt(colon[1], 10);
    min = parseInt(colon[2], 10);
  } else if (/^\d{1,2}$/.test(body)) {          // "9" → 9:00
    h = parseInt(body, 10);
    min = 0;
  } else if (/^\d{3,4}$/.test(body)) {          // "930" → 9:30, "2130" → 21:30
    h = parseInt(body.slice(0, body.length - 2), 10);
    min = parseInt(body.slice(-2), 10);
  } else {
    return null;
  }

  if (isNaN(h) || isNaN(min) || min > 59) return null;

  if (meridiem) {
    if (h < 1 || h > 12) return null;
    if (meridiem === "p" && h !== 12) h += 12;
    if (meridiem === "a" && h === 12) h = 0;
  } else if (h > 23) {
    return null;
  }

  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
};

/** "09:00"–"17:00" → "9:00 AM – 5:00 PM" (empty sides are dropped). */
export const formatTimeRange12 = (start, end, separator = " – ") => {
  const a = formatTime12(start);
  const b = formatTime12(end);
  if (a && b) return `${a}${separator}${b}`;
  return a || b || "";
};

/** Current wall-clock time in Edmonton, 12-hour, e.g. "3:04:22 PM". */
export const edmontonNow12 = (withSeconds = true) =>
  new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    ...(withSeconds ? { second: "2-digit" } : {}),
    hour12: true,
    timeZone: "America/Edmonton",
  }).format(new Date());

export default formatTime12;
