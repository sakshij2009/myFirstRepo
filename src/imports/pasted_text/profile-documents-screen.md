**Figma Make Prompt — Profile & Documents Screen (Mobile)**

---

Design a premium mobile "Profile & Documents" screen for "Family Forever" — a child services management platform. This is the staff member's personal hub for viewing their profile, managing uploaded documents and certifications, and accessing account settings. Frame size: 390×844 (iPhone 14/15 Pro). Match the exact design language of the existing owner mobile screens — bold typographic hierarchy, soft card treatments, green accent system, warm off-white background, and refined spacing.

**Design System (consistent across all screens):**
- Primary green: #1F6F43
- Background: #F8F8F6 (warm off-white)
- Headings: Poppins — bold/semibold
- Body: Inter — regular/medium
- Card style: White background, border-radius 16px, shadow 0 2px 8px rgba(0,0,0,0.04), 20px internal padding
- Icon style: Outlined stroke, 24px
- Page padding: 20px horizontal
- Spacing: 8px base grid, 16px between cards, 24px between sections

**Top Header Area (56px height):**
- Left: "Profile" in Poppins 20px bold #1A1A1A (no back arrow — this is a root tab destination)
- Right: Settings gear icon (24px, #6B7280) inside 40px circular touch target with background #F3F4F6 — tapping opens Account Settings screen (separate screen, not designed here)
- No subtitle needed — the profile hero card below establishes context

**Profile Hero Card (20px below header — the visual anchor):**
- White card, 16px border-radius, soft shadow, 20px padding
- **Center-aligned profile layout:**
  - Large avatar circle (80px) centered — staff photo if available, otherwise initials "SJ" on soft green background (#F0FDF4), Inter 28px semibold #1F6F43. Around the avatar: 3px green ring border (#1F6F43). Small camera/edit icon overlay (24px circle, background #1F6F43, white camera icon 12px) positioned at bottom-right of the avatar circle, overlapping the ring — tapping allows photo upload/change.
  - 12px below avatar: "Sarah Johnson" in Poppins 20px bold #1A1A1A, centered
  - 4px below name: "Staff · Intake Worker" in Inter 13px regular #9CA3AF, centered
  - 8px below role: "Family Forever Inc." in Inter 12px regular #9CA3AF, centered
  - 16px below org: Row of badge pills centered, 8px gap between:
    - "CYIM: 1432569" pill — background #F3F4F6, text #6B7280, Inter 11px semibold, border-radius 20px, padding 4px 14px
    - "Active" status pill — background #F0FDF4, text #1F6F43, Inter 11px semibold, border-radius 20px, padding 4px 14px

- **Quick stats row (20px below badges, thin top divider 1px #F3F4F6, 16px padding-top):**
  - 4 equally spaced stat blocks inside the card:
  - Each stat: Value on top in Poppins 18px bold #1A1A1A, label below in Inter 11px regular #6B7280, center-aligned
  - Stat 1: "148" → "Total Shifts"
  - Stat 2: "592" → "Hours Logged"
  - Stat 3: "4.9" → "Rating" (with a tiny gold star icon 10px beside the value, #F59E0B)
  - Stat 4: "2 yrs" → "Tenure"
  - Thin vertical dividers (1px #F3F4F6) between each stat

**Personal Details Card (16px below hero card):**
- White card, 16px border-radius, soft shadow, 20px padding
- Card header row: Left — "Personal Details" in Poppins 14px semibold #1A1A1A. Right — "Edit >" in Inter 13px medium #1F6F43, tappable
- 16px below header: Structured key-value rows (matching the owner screen detail row pattern):
  - Each row: min-height 40px, thin bottom divider 1px #F3F4F6 between rows (no divider after last)
  - Row label: Inter 13px regular #9CA3AF, left-aligned
  - Row value: Inter 14px medium #1A1A1A, right-aligned

  - Row 1: "Full Name" → "Sarah Catherine Johnson"
  - Row 2: "Email" → "sarah.johnson@email.com" in #1F6F43 (tappable link)
  - Row 3: "Phone" → "(555) 987-6543" in #1F6F43 (tappable)
  - Row 4: "Date of Birth" → "June 15, 1994"
  - Row 5: "Gender" → "Female" with small badge (background #F3F0FF, text #5B21B6, Inter 11px, border-radius 12px, padding 2px 8px)
  - Row 6: "Address" → "456 Birch Lane, Ontario"
  - Row 7: "Start Date" → "March 1, 2024"

**Employment Information Card (16px below personal details):**
- White card, 16px border-radius, soft shadow, 20px padding
- Card header: "Employment" in Poppins 14px semibold #1A1A1A
- Key-value rows:
  - Row 1: "Employee ID" → "EMP-2024-0087"
  - Row 2: "CYIM ID" → "1432569"
  - Row 3: "Role" → "Intake Worker"
  - Row 4: "Department" → "Field Services"
  - Row 5: "Salary" → "$24.50/hr" (visible only to the staff member, not shared)
  - Row 6: "Status" → "Active" pill (background #F0FDF4, text #1F6F43, Inter 11px semibold, border-radius 20px, padding 3px 10px)
  - Row 7: "Supervisor" → "Jennifer Adams" in #1F6F43 (tappable — opens supervisor contact)

**Documents & Certifications Section (24px below employment card):**
- Section header row: Left — "Documents & Certifications" in Poppins 14px semibold #1A1A1A. Right — "+ Upload" in Inter 13px medium #1F6F43 with small upload icon (14px) before text, tappable — opens file picker to upload new document

**Document Cards (16px below section header, 12px gap between cards):**
Each document is a compact card with status awareness:

- **Document Card Structure:**
  - White card, 14px border-radius, soft shadow, 16px padding
  - Left: File type icon circle (40px) with distinct colors per type:
    - Certificate: Award/ribbon icon (18px, #1F6F43) on #F0FDF4 background
    - ID Document: ID card icon (18px, #1E5FA6) on #EBF5FF background
    - Training: Graduation cap icon (18px, #5B21B6) on #F3F0FF background
    - Medical: Medical cross icon (18px, #DC2626) on #FEF2F2 background
  - Middle (12px gap from icon):
    - Document name: Inter 14px semibold #1A1A1A
    - Details line: Inter 12px regular #9CA3AF — file info and upload date
  - Right: Status indicator + action
    - Valid: Green checkmark circle (20px, #F0FDF4 background, #1F6F43 check icon 10px)
    - Expiring soon: Amber warning circle (20px, #FFF8E1 background, #F59E0B exclamation icon 10px)
    - Expired: Red X circle (20px, #FEF2F2 background, #DC2626 X icon 10px)
  - Tapping the card opens document preview or download

- **Example Documents (show 5):**

  - Card 1 — Valid certificate:
    - Icon: Award on green
    - "First Aid Certification"
    - "Uploaded: Jan 15, 2026 · Expires: Apr 1, 2026"
    - RIGHT: Amber warning circle (expiring soon)
    - LEFT BORDER ACCENT: 3px solid #F59E0B (amber) — highlighting expiring status, matching the notification card pattern for items needing attention

  - Card 2 — Valid certificate:
    - Icon: Award on green
    - "CPR Certification"
    - "Uploaded: Feb 20, 2026 · Expires: Feb 20, 2027"
    - RIGHT: Green checkmark (valid)
    - No left border accent (all good)

  - Card 3 — ID document:
    - Icon: ID card on blue
    - "Driver's License"
    - "Uploaded: Dec 5, 2025 · Expires: Jun 15, 2028"
    - RIGHT: Green checkmark
    - No left border accent

  - Card 4 — Training:
    - Icon: Graduation cap on purple
    - "Child Safety Training"
    - "Completed: Nov 10, 2025 · Annual renewal"
    - RIGHT: Green checkmark
    - No left border accent

  - Card 5 — Medical:
    - Icon: Medical cross on red
    - "Vulnerable Sector Check"
    - "Uploaded: Mar 1, 2024 · Expires: Mar 1, 2025"
    - RIGHT: Red X circle (expired)
    - LEFT BORDER ACCENT: 3px solid #DC2626 (red) — urgent, expired document needs renewal

**Document Summary Strip (16px below document cards):**
- Compact strip: background #F0FDF4, border-radius 12px, padding 12px 16px
- Horizontal row: "5 documents" in Inter 13px regular #6B7280 → "3 valid" in Inter 13px semibold #1F6F43 → "1 expiring" in Inter 13px semibold #F59E0B → "1 expired" in Inter 13px semibold #DC2626
- Separated by small dot dividers (·) in #D1D5DB

**Quick Actions Section (24px below document summary):**
- Section header: "Quick Actions" in Poppins 14px semibold #1A1A1A

- **Action rows inside a single white card (16px border-radius, soft shadow, no internal padding — rows have their own padding):**
  - Each action row: 56px height, 20px horizontal padding, thin bottom divider 1px #F3F4F6 between rows (no divider after last)
  - Left: Icon (20px) in respective color
  - Middle (12px gap): Action label in Inter 14px medium #1A1A1A
  - Right: Chevron right (16px, #D1D5DB)

  - Row 1: Lock icon (#6B7280) → "Change Password"
  - Row 2: Bell icon (#6B7280) → "Notification Preferences"
  - Row 3: Shield icon (#6B7280) → "Privacy & Security"
  - Row 4: Help circle icon (#6B7280) → "Help & Support"
  - Row 5: File text icon (#6B7280) → "Terms & Policies"

**Sign Out Button (24px below quick actions):**
- Full-width button: Outlined style — 1.5px border #DC2626, text "Sign Out" in Inter 14px semibold #DC2626, height 48px, border-radius 12px, transparent background
- Center-aligned text with small logout/exit icon (16px, #DC2626) before the text
- 8px below button: "Version 1.0.2" in Inter 11px regular #D1D5DB, centered — subtle app version indicator

**Extra bottom padding: 100px below sign out button to ensure comfortable scrolling above the tab bar**

**Bottom Tab Bar (fixed, identical to all screens):**
- 5 tabs: Home, Shifts, Routes, Alerts, Profile (active — green icon + label + 3px dot)
- Profile tab active: person icon filled/highlighted in #1F6F43, label #1F6F43, green dot above
- Alerts tab with red badge if unread

**Overall Polish & Behavior Notes:**
- The profile hero card with centered large avatar, name, role, and stats creates a sense of identity and pride — staff should feel recognized, not like a number in a system
- The 4-stat row (Total Shifts, Hours, Rating, Tenure) adds a gamification-lite element — staff can see their contribution at a glance. The gold star beside Rating adds warmth
- Document cards with expiry-aware status indicators are critical for compliance — the amber and red left-border accents instantly highlight documents needing attention, matching the pattern used in Notifications and Shift Detail for urgent items
- The document summary strip gives instant compliance status — "3 valid, 1 expiring, 1 expired" is scannable in under 1 second
- Quick Actions section follows the standard iOS/Android settings pattern — icon + label + chevron rows inside a grouped card. This is familiar and requires no learning
- The Sign Out button is intentionally red-outlined and placed at the very bottom — it's accessible but not accidentally tappable. Red color creates a clear "destructive action" signal
- The camera/edit icon overlay on the avatar is a premium touch — it shows that the profile is customizable and personal
- All tappable links (email, phone, supervisor) use #1F6F43 green styling consistently across all screens
- The screen is information-dense but organized into clear card sections with breathing room between them — Personal → Employment → Documents → Actions → Sign Out follows a logical information architecture
- The "+ Upload" button in the Documents section header matches the owner screen's pattern of having section-level actions in the header row (consistent with "View all >" and "Edit >" patterns used elsewhere)
- Ensure the profile photo upload interaction is smooth — tapping the camera icon should offer "Take Photo" and "Choose from Library" options in a native action sheet

---

That's all 8 staff mobile screens complete! Here's what we've covered:

1. Staff Home Dashboard
2. My Shifts
3. Shift Detail & Check-in/out
4. Client Details
5. Transportation Routes
6. Availability & Schedule
7. Notifications
8. Profile & Documents

Want me to create a final summary document with all prompts compiled, or would you like to refine any specific screen before moving forward?