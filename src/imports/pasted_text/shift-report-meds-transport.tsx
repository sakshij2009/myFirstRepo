**Figma Make Prompt — Updated Daily Shift Report Card + Medications & Transportations Navigation Cards**

---

Update the Shift Detail screen to clean up the Daily Shift Report card and add navigation cards for Medications and Transportations as separate accessible screens. Frame size: 390×844 (iPhone 14/15 Pro). Match the existing design language.

**Design System (consistent across all screens):**
- Primary green: #1F6F43
- Background: #F8F8F6 (warm off-white)
- Headings: Poppins — bold/semibold
- Body: Inter — regular/medium
- Card style: White background, border-radius 16px, shadow 0 2px 8px rgba(0,0,0,0.04), 20px internal padding
- Page padding: 20px horizontal

---

**CHANGE 1: CLEANED UP DAILY SHIFT REPORT CARD**

Remove the quick-entry pills row ("Meal served", "Medication given", "Activity...") entirely from the Daily Shift Report card. Medications and Transportations now have their own dedicated screens — they should not be triggered from inside the report text area.

**Updated Daily Shift Report Card layout:**
- White card, 16px border-radius, soft shadow 0 2px 8px rgba(0,0,0,0.04), 20px padding
- No left-border accent (clean white card)
- Card header row: Left — "Daily Shift Report" in Poppins 14px semibold #1A1A1A. Right — circular progress ring (24px) showing completion percentage filled in #1F6F43, with percentage text "0%" inside in Inter 9px semibold #1F6F43
- Description: "Document activities, medications, meals, mood, interactions, health observations, and any concerns." in Inter 13px regular #6B7280, line-height 1.5
- **Text area (16px below description):**
  - Background white (#FFFFFF), border 1.5px #1F6F43 (green border on the text input), border-radius 12px, padding 16px, min-height 140px
  - Placeholder: "Start documenting your shift observations..." in Inter 14px regular #D1D5DB
  - Active state shows typed text in Inter 14px regular #1A1A1A
- Below text area (8px gap): "0 / 1000 recommended minimum" in Inter 12px regular #1F6F43
- Auto-save indicator (4px below count): Green checkmark circle (12px, #22C55E) + "Auto-saved 30 sec ago" in Inter 11px regular #9CA3AF
- **Action buttons (20px below auto-save, side by side, 8px gap):**
  - Left: "Download Report" — outlined, 1px border #E5E7EB, download icon (16px, #6B7280) + text Inter 13px medium #1A1A1A, height 44px, border-radius 10px
  - Right: "Save Draft" — solid #1F6F43, white text Inter 13px semibold, height 44px, border-radius 10px

**Nothing else inside this card.** No pills, no medication shortcuts, no transportation links. Just the written report text area and its controls.

---

**CHANGE 2: SHIFT ACTIONS SECTION (24px below Daily Shift Report card)**

Add a new section below the Daily Shift Report card on the Shift Detail screen. This section contains navigation cards that take staff to the dedicated Medications and Transportations screens.

**Section header: "Shift Actions" in Poppins 14px semibold #1A1A1A**

**Medications Navigation Card (12px below section header):**
- White card, 16px border-radius, soft shadow 0 2px 8px rgba(0,0,0,0.04), 20px padding
- Tappable — entire card is a touch target that navigates to the full Medications screen
- **Card layout — horizontal row:**
  - Left: Icon circle (48px diameter), background #F0FDF4 (lightest green), centered pill/capsule icon (22px, #1F6F43)
  - Middle (14px gap from icon):
    - "Medications" in Poppins 15px semibold #1A1A1A
    - "Log administered medications & view schedule" in Inter 12px regular #6B7280, single line, margin-top 3px
  - Right: Two elements stacked
    - Top: Status badge — if medications are pending: "2 due" pill badge, background #FFF8E1, text #92600A, Inter 11px semibold, border-radius 12px, padding 3px 10px. If all medications given: "All done" pill, background #F0FDF4, text #1F6F43. If no medications for this client: "None" pill, background #F3F4F6, text #9CA3AF.
    - Bottom: Right chevron icon (16px, #D1D5DB), vertically centered with the entire row
- **Press state:** Card background shifts to #FAFAFA on tap, subtle scale 0.98 for tactile feedback

**Transportations Navigation Card (12px below Medications card):**
- White card, 16px border-radius, soft shadow 0 2px 8px rgba(0,0,0,0.04), 20px padding
- Same tappable card pattern as Medications
- **Card layout — horizontal row:**
  - Left: Icon circle (48px diameter), background #EBF5FF (lightest blue), centered car/route icon (22px, #1E5FA6)
  - Middle (14px gap):
    - "Transportations" in Poppins 15px semibold #1A1A1A
    - "Log kilometers, routes & upload receipts" in Inter 12px regular #6B7280, single line, margin-top 3px
  - Right:
    - Top: Status badge — if transportation data not submitted: "Incomplete" pill, background #FFF8E1, text #92600A. If submitted: "Submitted" pill, background #F0FDF4, text #1F6F43. If not applicable for this shift: "N/A" pill, background #F3F4F6, text #9CA3AF.
    - Bottom: Right chevron (16px, #D1D5DB)
- Same press state as Medications card

---

**CHANGE 3: OTHER ACTIONS SECTION REMAINS (16px below Transportations card)**

The existing "Other Actions" section stays exactly as designed:
- Section header: "Other Actions" in Poppins 14px semibold #1A1A1A
- Critical Incident Reporting card (red left-border accent #DC2626)
- Medical Contact Log card (blue left-border accent #1E5FA6)
- No changes to these cards

---

**FULL UPDATED SHIFT DETAIL SCREEN SECTION ORDER (scrollable content below the Shift Timeline):**

1. Daily Shift Report card (cleaned — text area only, no pills)
2. "Shift Actions" section header
3. Medications navigation card (tappable → full Medications screen)
4. Transportations navigation card (tappable → full Transportations screen)
5. "Other Actions" section header
6. Critical Incident Reporting card
7. Medical Contact Log card

---

**WHAT THE MEDICATIONS SCREEN LOOKS LIKE (when staff taps the Medications card):**

Full screen, navigated from Shift Detail. Contains all the Medications content we already designed:

**Header:**
- Left: Back arrow (24px, #1A1A1A) — returns to Shift Detail
- Center: "Medications" in Poppins 18px semibold #1A1A1A
- Below title, 4px gap: Client name context "Joseph · ID: 6587879" in Inter 12px regular #9CA3AF

**Content (scrollable):**
- Medication info banner (timing reminder, amber background)
- Today's Medications schedule card (one-tap checklist with status circles — Administered ✓, Due now, Pending, Missed states)
- Medication Error Logging (expandable section)
- Pharmacy Information card (read-only reference — doctor name, email, phone, address)
- Authorization & Signature card (name field + signature pad + Export/Submit buttons)

**No bottom tab bar duplication** — the back arrow returns to Shift Detail which has the tab bar

---

**WHAT THE TRANSPORTATIONS SCREEN LOOKS LIKE (when staff taps the Transportations card):**

Full screen, navigated from Shift Detail. Contains all the Transportations content we already designed:

**Header:**
- Left: Back arrow (24px, #1A1A1A) — returns to Shift Detail
- Center: "Transportations" in Poppins 18px semibold #1A1A1A
- Below title, 4px gap: Client name context "Joseph · ID: 6587879" in Inter 12px regular #9CA3AF

**Content (scrollable):**
- Transportation summary card (date, staff name, staff ID, client name, shift time — auto-populated)
- Kilometer per rate card (reimbursement rates reference)
- Visit Destinations card (stop entries + add another stop)
- Route Details card (starting point, ending point, total kilometer)
- Kilometer Done by Staff card
- Upload Receipt card (fuel/mileage receipts with camera upload, receipt preview thumbnails)
- Submit button (full width, solid #1F6F43)

---

**Overall Design & Behavior Notes:**
- The Daily Shift Report is now purely a text-based documentation tool — clean, focused, no embedded shortcuts to other features. Staff writes observations about activities, meals, mood, interactions. That's it.
- Medications and Transportations are elevated to their own dedicated screens — this gives each feature the space it deserves. Medication logging with one-tap checklist needs its own screen. Transportation kilometer tracking with receipt uploads needs its own screen. They were too complex to be pills inside a text area.
- The navigation cards (Medications, Transportations) use a clear icon + title + description + status badge pattern — staff can see at a glance if medications are due or if transportation data is incomplete before tapping in.
- The status badges on navigation cards provide real-time context: "2 due" tells staff they have pending medications, "Incomplete" tells them transportation data needs attention. This saves unnecessary navigation.
- The icon circles use distinct colors: green for Medications (health/wellness), blue for Transportations (movement/route). This visual coding is consistent with the service badge color system used throughout the app.
- The full section order (Report → Shift Actions → Other Actions) creates a clear priority hierarchy: document first, then specialized logging, then emergency actions at the bottom.
- Each dedicated screen has a back arrow that returns to Shift Detail — maintaining clear navigation hierarchy without confusing tab-within-tab patterns.
- The Medications and Transportations screens are only accessible during active shifts (In Progress status). For upcoming or completed shifts, the navigation cards show in a disabled state with "Available after check-in" or "Submitted" status respectively.

---

Want me to compile everything into a final summary document now?