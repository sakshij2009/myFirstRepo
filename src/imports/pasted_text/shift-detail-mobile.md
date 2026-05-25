**Figma Make Prompt — Shift Detail & Check-in/out Screen (Mobile)**

---

Design a premium mobile "Shift Detail" screen for "Family Forever" — a child services management platform. This is the most action-heavy screen in the staff app — where staff view full shift information and perform check-in/check-out. Frame size: 390×844 (iPhone 14/15 Pro). Match the exact design language of the existing owner mobile screens — bold typographic hierarchy, soft card treatments, green accent system, warm off-white background, and refined spacing.

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
- Left: Back arrow icon (24px, #1A1A1A) tapping returns to My Shifts screen
- Center: "Shift Details" in Poppins 18px semibold #1A1A1A
- Right: Three-dot overflow menu icon (24px, #6B7280) inside 40px circular touch target. Tapping opens a bottom sheet with options: "Report Issue", "Request Swap", "Contact Manager"
- Below title, 4px gap: Subtitle showing shift date context "Today · March 14, 2026" in Inter 12px regular #9CA3AF

**Shift Status Banner (16px below header, full-width within page padding):**
- A compact banner card indicating current shift state
- Background: #F0FDF4 (lightest green) for confirmed/upcoming, #EBF5FF (lightest blue) for in-progress, #F3F4F6 for completed
- Border-radius 12px, padding 12px 16px, no shadow
- Left: Status icon — green checkmark circle (20px) for confirmed, blue pulsing dot (20px) for in-progress, gray check for completed
- Center text: "Confirmed · Upcoming" in Inter 13px semibold #1F6F43. For in-progress: "In Progress · Checked In at 9:02 AM" in #1E5FA6. For completed: "Completed · 4 hrs logged" in #6B7280
- Right: Small countdown or time indicator — "Starts in 45 min" in Inter 12px medium #1F6F43 for upcoming. "2 hrs 15 min elapsed" in #1E5FA6 for in-progress. Nothing for completed.

**Client-Staff Pairing Card (20px below banner — matching the owner dashboard's pairing card pattern exactly):**
- White card, 16px border-radius, soft shadow, 20px padding
- **Pairing row (matching owner's client→staff arrow pattern):**
  - Left side: Client avatar circle (48px) with initials "ET" on a soft green background (#F0FDF4), Inter 16px semibold #1F6F43. Below avatar: Client name "Emma Thompson" in Inter 14px semibold #1A1A1A. Below name: "ID: 0988765" in Inter 12px regular #9CA3AF
  - Center: Small gray arrow icon (→) in #D1D5DB (16px), vertically centered with avatars, showing the assignment relationship
  - Right side: Staff avatar circle (48px) — photo or initials "SJ" on soft purple background (#F3F0FF), Inter 16px semibold #5B21B6. Below avatar: "Sarah Johnson" in Inter 14px semibold #1A1A1A. Below name: "CYIM: 1432569" in Inter 12px regular #9CA3AF
- **Service badge row (12px below pairing):** Service type pill "Respite Care" with background #EBF5FF, text #1E5FA6, Inter 12px semibold, border-radius 20px, padding 4px 14px

**Shift Information Card (16px below pairing card):**
- White card, 16px border-radius, soft shadow, 20px padding
- Structured key-value rows inside the card with clean alignment (matching the owner's report detail style — labels left-aligned, values right-aligned):
  - Each row: 44px height, thin bottom divider 1px #F3F4F6 between rows (no divider after last row)
  - Row label: Inter 13px regular #9CA3AF, left-aligned
  - Row value: Inter 14px medium #1A1A1A, right-aligned

  - Row 1: Label "SHIFT TYPE" → Value "Regular" in Inter 14px medium #1A1A1A
  - Row 2: Label "DATE & TIME" → Value "March 14, 2026" in Inter 14px medium #1A1A1A, below value: "9:00 AM – 1:00 PM" in Inter 12px regular #9CA3AF
  - Row 3: Label "DURATION" → Value "4 hours"
  - Row 4: Label "LOCATION" → Value "1234 Oak Street, Suite 5" in Inter 14px medium #1A1A1A (tappable — styled as a link with #1F6F43 color and small external arrow icon, opens maps)
  - Row 5: Label "STATUS" → Value displayed as a status pill: "Active · Confirmed" with background #F0FDF4, text #1F6F43, Inter 12px semibold, border-radius 20px, padding 4px 12px

- **Shift Lock toggle row (12px below last info row, inside the same card):**
  - Thin top divider 1px #F3F4F6
  - Left: Lock icon (18px, #6B7280) followed by "Shift Lock" in Inter 14px medium #1A1A1A
  - Right: Toggle switch — 48px wide × 28px tall, border-radius 14px (full pill). Off state: background #E5E7EB with white circle knob. On state: background #1F6F43 with white knob shifted right. Currently off.
  - Below toggle row: "Prevents accidental modifications" in Inter 11px regular #9CA3AF, left-aligned with the label text

**Shift Timeline Card (16px below information card — matching the owner reports screen's Clock In/Out timeline pattern):**
- White card, 16px border-radius, soft shadow, 20px padding
- Card header: "Shift Timeline" in Poppins 14px semibold #1A1A1A
- **Timeline visualization (16px below header):**
  - Vertical timeline with a green connecting line (2px, #1F6F43) running top to bottom on the left side
  - Each timeline node:
    - Circle indicator (24px) on the timeline line — filled green (#1F6F43) with white checkmark icon for completed events, outlined green circle with filled green center dot for current/active event, outlined gray (#D1D5DB) circle for future/pending events
    - Right of circle (12px gap): Event label in Inter 14px semibold #1A1A1A (e.g., "Clock In"). Below label: Time "9:02 AM" and location "Ontario, 15 BH Street" in Inter 12px regular #9CA3AF
    - 24px vertical gap between timeline nodes

  - Timeline nodes (example for an active/in-progress shift):
    - Node 1 (completed): Green filled circle + white check → "Clock In" / "9:02 AM" / "1234 Oak Street, Suite 5"
    - Node 2 (active/current): Green outlined circle with center dot, subtle pulse animation → "In Progress" / "Currently on shift" / elapsed time "2h 15m"
    - Node 3 (pending): Gray outlined circle → "Clock Out" / "Scheduled: 1:00 PM" / "—"
  - Total hours row at bottom of timeline: "Total Hours:" left-aligned in Inter 14px medium #6B7280 → Right-aligned value "4 Hours" in Inter 14px semibold #1F6F43 (shows estimated for upcoming, actual for completed)

**Primary Action Button Area (24px below timeline card):**
- **For upcoming shifts (not yet checked in):**
  - Full-width button: "Check In" — solid #1F6F43 green background, white text "Check In" in Poppins 16px semibold, height 52px, border-radius 14px, centered text, soft green shadow 0 4px 12px rgba(31,111,67,0.2). This should be the most visually prominent element on the screen — bold, inviting, unmissable.
  - Below button, 8px gap: Helper text "You can check in 15 minutes before shift start" in Inter 12px regular #9CA3AF, centered

- **For in-progress shifts (checked in, needs check-out):**
  - Full-width button: "Check Out" — outlined style: 2px border #1F6F43, text #1F6F43 in Poppins 16px semibold, height 52px, border-radius 14px, white/transparent background. Outlined because check-out is a closing action, feels less aggressive than solid fill.
  - Below: "Shift will auto-close at 1:00 PM" in Inter 12px regular #9CA3AF, centered

- **For completed shifts:**
  - Two side-by-side buttons (8px gap):
    - Left (60% width): "View Report" — solid #1F6F43 green, white text Inter 14px semibold, height 48px, border-radius 12px
    - Right (40% width): Download icon button — background #F3F4F6, download icon (20px, #6B7280), height 48px, border-radius 12px, square-ish

**Daily Shift Report Section (16px below action button — visible only for in-progress or completed shifts):**
- White card, 16px border-radius, soft shadow, 20px padding
- Card header: "Daily Shift Report" in Poppins 14px semibold #1A1A1A
- Description: "Include details about: activities, medications, meals, mood, interactions, health observations, and any concerns." in Inter 13px regular #6B7280, line-height 1.5
- **Text input area (12px below description):**
  - Rounded text area: background #F9FAFB, border 1px #E5E7EB, border-radius 12px, padding 16px, min-height 120px, placeholder text "Begin your report" in Inter 14px regular #D1D5DB
  - Below text area, 8px gap: Character count "Character count: 0 | Recommended: Minimum 1000 words for the report." in Inter 11px regular #9CA3AF
- **Report action buttons (16px below text area):**
  - Two buttons side by side, 8px gap:
    - Left: "Download Report" — outlined style, 1px border #E5E7EB, text #1A1A1A, download icon (16px) before text, Inter 13px medium, height 44px, border-radius 10px
    - Right: "Submit" — solid #1F6F43, white text Inter 13px semibold, height 44px, border-radius 10px

**Other Actions Section (16px below report card):**
- Section label: "Other Actions" in Poppins 14px semibold #1A1A1A

- **Critical Incident Reporting Card:**
  - White card, 16px border-radius, LEFT BORDER ACCENT: 4px solid #DC2626 (red) on the left edge of the card (matching the owner's critical incident card pattern exactly)
  - 20px padding
  - Top: Warning triangle icon (20px, #DC2626) beside "Critical Incident Reporting" in Inter 15px semibold #1A1A1A
  - Description: "For serious incident requiring immediate management attention" in Inter 13px regular #6B7280
  - Subcategory tags: "Self-harm, violence, abuse allegations, serious accidents, medication errors..." in Inter 12px italic #DC2626, line-height 1.4
  - Full-width button (12px below tags): "Report Critical Incident" — solid #DC2626 red background, white text Inter 14px semibold, height 44px, border-radius 10px

- **Medical Contact Log Card (16px below critical incident card):**
  - White card, 16px border-radius, LEFT BORDER ACCENT: 4px solid #1E5FA6 (blue) on the left edge
  - 20px padding
  - Top: Medical cross icon (20px, #1E5FA6) beside "Medical Contact Log" in Inter 15px semibold #1A1A1A
  - Description: "Use this form to document medical-related contacts, incidents, or communications involving a client." in Inter 13px regular #6B7280
  - Subcategory tags: "medical incidents, emergency care, medication" in Inter 12px italic #1E5FA6
  - Full-width button: "Open Medical Log" — outlined style, 1.5px border #1E5FA6, text #1E5FA6, Inter 14px semibold, height 44px, border-radius 10px

**Bottom Tab Bar (fixed, identical to all screens):**
- 5 tabs: Home, Shifts (active state if navigated from Shifts tab), Routes, Alerts, Profile
- Tab bar matches all other screens exactly

**Overall Polish & Behavior Notes:**
- The screen should scroll smoothly with all sections stacked vertically
- The primary action button (Check In / Check Out) should be the visual hero — the user's eye should be drawn there immediately after the shift info
- The Shift Timeline card should closely match the owner's Reports screen timeline pattern — green circles for Clock In/Out, vertical connecting line, same spacing and typography
- The Client-Staff pairing card should exactly replicate the owner dashboard's avatar → arrow → avatar pattern
- The Critical Incident card's red left-border accent is a key visual pattern from the owner screens — replicate it exactly with 4px solid left border, not a full border
- All information is scannable: a staff member should understand the full shift context (who, when, where, what to do) within 3 seconds of viewing this screen
- The report text area should feel inviting, not clinical — warm gray background, generous padding, clear placeholder
- Transition feel: tapping a shift card from My Shifts should feel like sliding into a detail view — natural information architecture, not a jarring screen change

---

Want me to continue with the **Client Details** screen next, or refine anything on this Shift Detail screen?