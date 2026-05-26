Good thinking. When staff taps "Completed" tab, they need to see a clear picture of their finished shifts — what's been approved, what's pending review, and locked shifts should be hidden entirely. Let me design this properly.

---

**Figma Make Prompt — Completed Shifts Tab (My Shifts Screen)**

---

Design the "Completed" tab view for the My Shifts screen in the "Family Forever" staff mobile app. When staff taps the "Completed" filter pill, they see their finished shifts with clear approval status from the owner. Locked shifts are completely hidden from staff view. Frame size: 390×844 (iPhone 14/15 Pro). Match the existing design language.

**Design System (consistent across all screens):**
- Primary green: #1F6F43
- Background: #F8F8F6 (warm off-white)
- Headings: Poppins — bold/semibold
- Body: Inter — regular/medium
- Card style: White background, border-radius 16px, shadow 0 2px 8px rgba(0,0,0,0.04), 20px internal padding
- Page padding: 20px horizontal

---

**TOP HEADER & TABS (same as existing My Shifts screen):**

- Header: Back arrow + "My Shifts" Poppins 18px semibold + filter icon
- Subtitle: "Sarah Johnson | Staff" Inter 12px #9CA3AF
- Filter pills: "Upcoming", "In Progress", "Completed" (active — solid #1F6F43 green, white text)
- Count: "24 completed" in Inter 13px regular #9CA3AF

---

**COMPLETED SHIFT CARDS:**

Completed shifts have 3 possible approval states from the owner. Each state has a distinct visual treatment:

**Approval State 1 — Approved by Owner ✓**

**Shift Card (Approved):**
- White card, 16px border-radius, soft shadow, 20px padding
- **Approval badge banner (top of card, inside):**
  - Full card width strip, background #F0FDF4, border-radius 10px, padding 10px 14px, margin-bottom 14px
  - Left: Green checkmark shield icon (18px, #1F6F43) — the shield communicates "owner verified"
  - Text: "Approved by Owner" in Inter 12px semibold #1F6F43
  - Right: Approval date "Mar 14, 4:30 PM" in Inter 11px regular #9CA3AF

- **Card content (below banner):**
  - Top row: Service badge "Respite Care" #EBF5FF/#1E5FA6 + right-aligned: "Completed" status pill, background #F3F4F6, text #6B7280, Inter 11px medium
  - Time row: Clock icon (14px, #9CA3AF) + "9:00 AM – 1:00 PM" Inter 14px medium #6B7280 + "4 hrs" duration badge right-aligned, background #F3F4F6, Inter 12px #6B7280, border-radius 12px, padding 2px 8px
  - Client row: Avatar (36px) "ET" on #F0FDF4 + "Emma Thompson" Inter 14px semibold #1A1A1A + "ID: 0988765" Inter 12px #9CA3AF
  - Location: Map pin (14px, #9CA3AF) + "1234 Oak Street, Suite 5" Inter 13px #9CA3AF

- **Shift summary strip (16px below location, thin divider above, 12px padding-top):**
  - Compact horizontal row of 3 mini stats inside the card:
    - "Clock In" → "9:02 AM" Inter 12px medium #1A1A1A
    - "Clock Out" → "1:08 PM" Inter 12px medium #1A1A1A
    - "Total" → "4h 06m" Inter 12px semibold #1F6F43
  - Labels in Inter 10px #9CA3AF above values
  - Thin vertical dividers between stats

- **Bottom action row (12px below summary strip):**
  - Left: "View Report" — outlined button, 1px border #E5E7EB, text #1A1A1A Inter 13px medium, height 38px, border-radius 10px, with small document icon (14px) before text
  - Right: "View Details >" — text link Inter 13px medium #1F6F43

---

**Approval State 2 — Pending Owner Review (not yet approved)**

**Shift Card (Pending Review):**
- White card, same structure as above BUT:
- **Approval badge banner (amber treatment):**
  - Background #FFF8E1, border-radius 10px, padding 10px 14px
  - Left: Amber clock icon (18px, #92600A)
  - Text: "Pending Owner Review" in Inter 12px semibold #92600A
  - Right: "Submitted Mar 14" in Inter 11px #9CA3AF

- **Card content:** Same structure as approved card — service badge, time, client, location, summary strip

- **Bottom action row:**
  - Left: "View Report" — same outlined button
  - Right: "Pending..." — text in Inter 13px medium #92600A (not a link — just status text, since nothing to do while waiting)

---

**Approval State 3 — Revision Requested (owner sent it back with feedback)**

**Shift Card (Revision Requested):**
- White card, same structure BUT:
- **Approval badge banner (red/coral treatment):**
  - Background #FEF2F2, border-radius 10px, padding 10px 14px
  - LEFT BORDER ACCENT on the entire card: 4px solid #DC2626 — this makes the revision card stand out immediately in the list
  - Left: Red exclamation circle icon (18px, #DC2626)
  - Text: "Revision Requested" in Inter 12px semibold #DC2626
  - Right: "Mar 15, 10:00 AM" in Inter 11px #9CA3AF

- **Owner feedback row (below the banner, inside the card):**
  - Background #FEF2F2, border-radius 8px, padding 12px 14px, margin-bottom 14px
  - Small quote icon (12px, #DC2626) top-left
  - Owner's feedback message: "Please add more details about the medication administration and include the client's mood observations during the visit." in Inter 13px regular #DC2626, line-height 1.5, italics
  - "— Jennifer Adams (Owner)" in Inter 11px medium #9CA3AF, right-aligned

- **Card content:** Same structure as other states

- **Bottom action row:**
  - Left: "Edit Report" — solid #DC2626 red button, white text Inter 13px semibold, height 38px, border-radius 10px — this is a call to action, not just a view button. Tapping opens the shift report in edit mode so staff can address the feedback.
  - Right: "View Details >" — text link Inter 13px medium #1F6F43

---

**LOCKED SHIFTS — COMPLETELY HIDDEN:**

When the owner locks a shift (Shift Lock is ON), that shift is completely removed from the staff's Completed view. Staff cannot see locked shifts at all.

**No visual indicator for locked shifts** — they simply don't appear in the list. This prevents staff from viewing or tampering with finalized, locked records.

**If all shifts in a date group are locked:** The entire date group header disappears too — no empty "Today · March 14" header with nothing below it.

---

**DATE GROUPING (same pattern as Upcoming/In Progress tabs):**

Completed shifts are grouped by date, most recent first:

**Date Group Header:**
- "Today · March 14" in Poppins 13px semibold #1A1A1A (no green dot — green dot is only for today's active shifts)
- 12px gap below before first card

**Example layout showing all 3 states:**

**Today · March 14:**
- Card 1: Respite Care · Emma Thompson · Approved ✓ (green banner)
- Card 2: Emergency Care · Michael Chen · Pending Review (amber banner)

**Yesterday · March 13:**
- Card 3: Supervised Visitation · Lucas Martinez · Revision Requested (red banner + owner feedback)

**Monday · March 11:**
- Card 4: Transportation · Sophia Kim · Approved ✓
- Card 5: Respite Care · Emma Thompson · Approved ✓

---

**COMPLETION STATS STRIP (fixed floating pill at bottom, above tab bar):**

Same floating pill pattern as the other tabs but with completion-specific data:
- "Completed: 24 shifts · 96 hrs · 20 approved" in Inter 12px medium, background #1F6F43, white text, border-radius 20px, padding 8px 16px, soft shadow 0 4px 12px rgba(31,111,67,0.2), centered 20px above tab bar

---

**EMPTY STATE (if no completed shifts yet):**

- Centered vertically
- Soft illustration: Green checkmark circle outline (64px, #D1D5DB)
- "No completed shifts yet" in Poppins 16px semibold #1A1A1A
- "Your finished shifts will appear here after checkout" in Inter 14px regular #9CA3AF

---

**SORT & FILTER (accessible from the filter icon in the header):**

Tapping the filter/sort icon opens a bottom sheet with additional filters specific to the Completed tab:

**Sort by:** "Most Recent" (default), "Oldest First", "Longest Duration", "Shortest Duration"

**Filter by approval status:**
- "All" (default)
- "Approved" — shows only owner-approved shifts
- "Pending Review" — shows only awaiting approval
- "Revision Requested" — shows only shifts needing edits

Each filter option is a tappable pill inside the bottom sheet, same styling as the main filter tabs.

---

**PULL TO REFRESH:**

Staff can pull down on the completed list to refresh — checking if any pending shifts have been approved since they last looked. A brief loading spinner appears at the top, then the list updates with any status changes.

---

**Overall UX Design Notes:**

- **The three approval states (Approved / Pending / Revision) are instantly distinguishable** — green banner for approved, amber for pending, red for revision. Staff scans the list and knows exactly which shifts need attention.
- **Revision Requested is the only state that requires staff action** — the red card accent + "Edit Report" button makes this unmissable. Staff shouldn't have to hunt for shifts that need fixing.
- **Owner feedback is shown inline on revision cards** — staff doesn't need to navigate to a separate screen to read the feedback. They see it right on the card, tap "Edit Report", fix the issue, and resubmit.
- **Locked shifts being completely hidden** protects data integrity. Once an owner locks a shift, it's finalized for billing/payroll. Staff has no business viewing or questioning locked records. From the staff's perspective, it simply moves out of their view — no confusing "locked" icons or grayed-out cards.
- **The shift summary strip** (Clock In, Clock Out, Total) on each completed card gives staff a quick reference of their hours without needing to open the full detail view. This is useful for personal time tracking.
- **The floating completion stats pill** gives instant awareness: "I've completed 24 shifts, logged 96 hours, and 20 are approved." This sense of progress is motivating.
- **Sort and filter options** let staff quickly find specific shifts — "show me only the ones needing revision" or "sort by longest duration" for personal records.
- **Pull to refresh** is important because approval status changes asynchronously — the owner might approve a shift anytime, and staff wants to see updated statuses without restarting the app.
- **Date grouping with most recent first** ensures the most relevant completed shifts (today, yesterday) are always at the top. Older approved shifts naturally scroll below.

---

Want me to work on anything else, or shall we compile everything into the final summary?