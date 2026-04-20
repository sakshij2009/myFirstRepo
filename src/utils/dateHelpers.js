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

/**
 * Safely parse a date string or object into a JS Date in LOCAL time.
 * This prevents UTC-based date shifts (off-by-one errors).
 */
export const parseLocalSafe = (val) => {
  if (!val) return null;
  // If it's a Firestore Timestamp
  if (val?.toDate && typeof val.toDate === "function") return val.toDate();
  if (val instanceof Date) return val;
  if (typeof val === "string") {
    const clean = val.trim();
    // Match YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
      const [y, m, d] = clean.split("-").map(Number);
      return new Date(y, m - 1, d);
    }
    // Match DD-MM-YYYY or DD/MM/YYYY
    if (/^\d{2}[-/]\d{2}[-/]\d{4}$/.test(clean)) {
      const parts = clean.split(/[-/]/).map(Number);
      return new Date(parts[2], parts[1] - 1, parts[0]);
    }
  }
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
};
