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
