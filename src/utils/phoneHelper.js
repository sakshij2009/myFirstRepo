/**
 * Canadian phone number helpers.
 * Format: XXX-XXX-XXXX (10 digits, dashes auto-inserted, not counted as input).
 */

/** Strip every non-digit character */
export const stripPhone = (v) => (v || "").replace(/\D/g, "");

/**
 * Format raw digits as XXX-XXX-XXXX.
 * Accepts any string — extracts up to 10 digits and formats them.
 */
export const formatPhone = (v) => {
  const digits = stripPhone(v).slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
};

/**
 * onChange handler for a phone input.
 * Call with the raw event value; returns the formatted string to store.
 */
export const handlePhoneChange = (rawValue) => formatPhone(rawValue);

/** Validate: must be exactly 10 digits */
export const isValidPhone = (v) => stripPhone(v).length === 10;
