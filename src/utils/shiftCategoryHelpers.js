/**
 * Shift category display helpers.
 *
 * A Therapy Drive is a Supervised Visitation where the staff drives the client
 * to a clinic, waits, and drives them back. It stays under the Supervised
 * Visitation category on purpose — every calendar, filter and report keeps
 * treating it as one — but it is billed differently, so it carries an
 * `isTherapyDrive` flag and is labelled "Supervised Visitation (Therapy Drive)"
 * everywhere the category is shown after creation.
 */

export const THERAPY_DRIVE_LABEL = "Therapy Drive";

/** True when a shift (or plain category+flag pair) is a therapy drive. */
export const isTherapyDriveShift = (shift) =>
  shift?.isTherapyDrive === true || String(shift?.isTherapyDrive) === "true";

/** True when the category name is Supervised Visitation. */
export const isSupervisedVisitation = (category) => {
  const c = String(category || "").toLowerCase();
  return c.includes("supervised") || c.includes("visitation");
};

/**
 * Category label for display: appends "(Therapy Drive)" when the flag is set.
 *
 * @param {string} category  the stored category name
 * @param {boolean} therapy  whether the therapy-drive flag is set
 * @param {string} fallback  used when there is no category at all
 */
export const categoryLabel = (category, therapy, fallback = "—") => {
  const base = String(category || "").trim();
  // No category to qualify — return the placeholder rather than "— (Therapy Drive)"
  if (!base) return fallback;
  if (!therapy) return base;
  // Don't double-append if the stored name already says it
  if (base.toLowerCase().includes("therapy drive")) return base;
  return `${base} (${THERAPY_DRIVE_LABEL})`;
};

/**
 * Convenience form that reads straight off a shift document, covering the
 * several field names the app has used for the category over time.
 */
export const shiftCategoryLabel = (shift, fallback = "—") =>
  categoryLabel(
    shift?.categoryName || shift?.shiftCategory || shift?.shiftCategoryName ||
      shift?.typeName || shift?.shiftType,
    isTherapyDriveShift(shift),
    fallback
  );
