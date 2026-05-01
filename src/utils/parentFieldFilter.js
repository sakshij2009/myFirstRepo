/**
 * Filters intake form data to only include fields visible to parents.
 * Removes addresses, emergency contacts, other guardian info, and custodyWith details.
 *
 * @param {object} formData - The full intake form data
 * @returns {object} - Filtered data object safe for parent viewing
 */
/**
 * Filters intake form data to only include fields visible to parents.
 * Handles the new "1 file / 2 party" structure.
 *
 * @param {object} formData - The full intake form data
 * @param {string} currentUserEmail - The email of the parent currently viewing
 * @returns {object} - Filtered data object safe for parent viewing
 */
export function filterFieldsForParents(formData, currentUserEmail) {
  if (!formData) return formData;

  const filtered = { ...formData };
  const email = (currentUserEmail || "").toLowerCase();

  // If it's the new structured model
  if (filtered.shared) {
    // Redact Party A if it's not the current user
    if (filtered.partyA_email && filtered.partyA_email !== email) {
      filtered.partyA = {
        fullName: filtered.partyA?.fullName || "Other Party",
        relationship: filtered.partyA?.relationship || "",
        hidden: true
      };
    }

    // Redact Party B if it's not the current user
    if (filtered.partyB_email && filtered.partyB_email !== email) {
      filtered.partyB = {
        fullName: filtered.partyB?.fullName || "Other Party",
        relationship: filtered.partyB?.relationship || "",
        hidden: true
      };
    }
    
    return filtered;
  }

  // Fallback for old flat model
  // Filter applicant - only keep name, phone, email, relationship
  if (filtered.applicant) {
    filtered.applicant = {
      fullName: filtered.applicant.fullName || "",
      phone: filtered.applicant.phone || "",
      email: filtered.applicant.email || "",
      relationship: filtered.applicant.relationship || "",
    };
  }

  // Remove otherGuardian entirely (contains sensitive info)
  delete filtered.otherGuardian;

  // Remove emergencyContacts entirely
  delete filtered.emergencyContacts;

  // Filter children - remove custodyWith
  if (filtered.children && Array.isArray(filtered.children)) {
    filtered.children = filtered.children.map(({ custodyWith, ...rest }) => rest);
  }

  // Remove sensitive docs
  delete filtered.courtOrderDocUrl;
  delete filtered.safetyDocUrl;
  delete filtered.domesticViolence;
  delete filtered.additionalSafetyConcerns;

  return filtered;
}

/**
 * Filters shift report client info for parent viewing.
 * Removes full addresses, only shows location names.
 *
 * @param {object} shiftData - The shift data object
 * @returns {object} - Filtered shift data safe for parent viewing
 */
export function filterShiftForParents(shiftData) {
  if (!shiftData) return shiftData;

  const filtered = { ...shiftData };

  // Remove direct address fields if they exist
  delete filtered.pickupLocation;
  delete filtered.dropLocation;
  delete filtered.visitLocation;

  // Filter clientDetails if embedded
  if (filtered.clientDetails) {
    const cd = { ...filtered.clientDetails };
    delete cd.address;
    delete cd.pickupAddress;
    delete cd.dropOffAddress;
    delete cd.visitAddress;
    delete cd.emergencyContact;
    delete cd.emergencyPhone;
    filtered.clientDetails = cd;
  }

  // Filter shiftPoints array
  if (filtered.shiftPoints && Array.isArray(filtered.shiftPoints)) {
    filtered.shiftPoints = filtered.shiftPoints.map((point) => {
      const p = { ...point };
      // Keep location names but not full addresses
      delete p.pickupLocation;
      delete p.dropLocation;
      delete p.visitLocation;
      return p;
    });
  }

  return filtered;
}

/**
 * Checks if a user is a parent (non-worker intake user)
 *
 * @param {object} user - The user object from localStorage
 * @returns {boolean}
 */
export function isParentUser(user) {
  if (!user) return false;
  const role = (user.role || "").toLowerCase();
  return role === "parent" || role === "private family";
}