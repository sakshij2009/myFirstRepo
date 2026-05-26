Got it — simple tap with a confirmation dialog. No need to read notes, just acknowledge.

---

**Figma Make Prompt — Shift Confirmation Flow**

---

Add a shift confirmation step to the staff mobile app for "Family Forever." Before a staff member can check in to a shift, they must first confirm the shift — letting the owner know they've acknowledged the assignment and will attend. This is a simple one-tap action with a confirmation dialog. Frame size: 390×844 (iPhone 14/15 Pro). Match the existing design language.

**Design System (consistent across all screens):**
- Primary green: #1F6F43
- Background: #F8F8F6 (warm off-white)
- Headings: Poppins — bold/semibold
- Body: Inter — regular/medium
- Card style: White background, border-radius 16px, shadow 0 2px 8px rgba(0,0,0,0.04), 20px internal padding
- Page padding: 20px horizontal

---

**UPDATED SHIFT LIFECYCLE:**

1. **Assigned** — Owner creates shift, it appears in staff's My Shifts. Status pill: "Assigned" background #FFF8E1 text #92600A
2. **Confirmed** — Staff taps "Confirm Shift", owner is notified. Status pill: "Confirmed" background #F0FDF4 text #1F6F43
3. **Check In** — Staff arrives and geo-tags check-in. Status: "In Progress" background #EBF5FF text #1E5FA6
4. **In Progress** — On shift, writing report, logging medications
5. **Check Out** — Staff finishes, geo-tagged
6. **Completed** — Status pill: "Completed" background #F3F4F6 text #6B7280

---

**PART A: SHIFT CARD ON HOME DASHBOARD — UNCONFIRMED STATE**

When a shift is assigned but NOT yet confirmed, the shift card on the Home Dashboard shows:

**Shift Card (unconfirmed):**
- Same white card structure as existing shift cards (16px border-radius, soft shadow, 20px padding)
- **Top amber banner inside the card:** Full card width, background #FFF8E1, border-radius 12px 12px 0 0 (top corners match card, merges with card top), padding 10px 16px
  - Left: Small amber clock icon (16px, #92600A)
  - Text: "Confirmation required" in Inter 12px semibold #92600A
  - This banner sits at the very top of the card, pushing other content below it
- Service badge, time, client info, location — all same as existing
- **Bottom action button:** Instead of "Check In", show "Confirm Shift" button
  - Full width within card padding
  - Background: Outlined style — 1.5px border #1F6F43, text #1F6F43 in Inter 14px semibold, height 44px, border-radius 10px, transparent/white background
  - The outlined style differentiates it from the solid green "Check In" button — Confirm is a preparatory step, not the primary action

**Shift Card (confirmed, waiting for check-in):**
- No amber banner at top — clean card
- Status pill changes from "Assigned" to "Confirmed" (green #F0FDF4/#1F6F43)
- Bottom action button switches to "Check In" — solid #1F6F43 green background, white text, same dimensions. This is now the primary action.
- Small green checkmark (14px) + "Confirmed ✓" text in Inter 11px #1F6F43 appears above the Check In button as a subtle status indicator

---

**PART B: SHIFT CARD ON MY SHIFTS SCREEN — UNCONFIRMED STATE**

Same pattern as Home Dashboard:

**Unconfirmed shift card in My Shifts:**
- Amber "Confirmation required" banner at top of card
- Status pill in the top row: "Assigned" — background #FFF8E1, text #92600A
- Bottom action row: Left — "Confirm Shift" outlined green button (55% width). Right — "Details >" link text in Inter 13px medium #1F6F43
- The transfer icon button is NOT shown for unconfirmed shifts — staff must confirm before they can transfer

**Confirmed shift card in My Shifts:**
- No amber banner
- Status pill: "Confirmed" — background #F0FDF4, text #1F6F43
- Bottom action row: Left — "Check In" solid green button. Center — transfer icon button (if eligible). Right — "Details >"

---

**PART C: CONFIRMATION DIALOG (appears when staff taps "Confirm Shift")**

When staff taps the "Confirm Shift" button, a centered modal dialog appears over a dimmed background overlay:

**Background overlay:** Full screen, rgba(0,0,0,0.4), blurred backdrop (backdrop-filter blur 4px)

**Dialog card:**
- Background: #FFFFFF
- Border-radius: 20px
- Width: 320px (centered horizontally and vertically on screen)
- Padding: 28px
- Shadow: 0 20px 60px rgba(0,0,0,0.2)

**Dialog content:**
- **Top icon:** Green circle (56px diameter), background #F0FDF4, centered. Inside: Green checkmark icon (24px, #1F6F43). Centered horizontally in the dialog.
- **Title (16px below icon):** "Confirm this shift?" in Poppins 18px semibold #1A1A1A, centered
- **Shift summary (12px below title):** Compact details centered:
  - "Respite Care · Emma Thompson" in Inter 14px medium #1A1A1A, centered
  - "March 14, 2026 · 9:00 AM – 1:00 PM" in Inter 13px regular #6B7280, centered
  - "1234 Oak Street, Suite 5" in Inter 12px regular #9CA3AF, centered
- **Confirmation message (16px below summary):** "By confirming, you acknowledge this shift assignment and commit to attending." in Inter 13px regular #6B7280, centered, line-height 1.5

- **Action buttons (24px below message):**
  - Two buttons stacked vertically, 10px gap:
  - **Primary:** "Yes, Confirm Shift" — full width, solid #1F6F43, white text Poppins 15px semibold, height 50px, border-radius 12px, shadow 0 2px 12px rgba(31,111,67,0.2)
  - **Secondary:** "Cancel" — full width, transparent background, text Inter 14px medium #6B7280, height 44px, border-radius 12px. No border, no shadow — text-only button.

**Dialog animation:**
- Overlay fades in (opacity 0 to 0.4, 200ms)
- Dialog scales up from 0.9 to 1.0 with opacity 0 to 1, 300ms, cubic-bezier(0.16, 1, 0.3, 1)
- Dismiss: Reverse animation (scale down, fade out)

---

**PART D: CONFIRMATION SUCCESS (after tapping "Yes, Confirm Shift")**

**Inside the dialog — success state (replaces the confirmation content):**
- The dialog content transitions smoothly (200ms crossfade):
- Large green checkmark animation: The existing 56px green circle expands slightly (scale 1.0 to 1.1 and back to 1.0, 400ms) with the checkmark becoming bolder
- Title changes to: "Shift Confirmed!" in Poppins 18px semibold #1F6F43, centered
- Subtitle: "Owner has been notified" in Inter 14px regular #9CA3AF, centered
- The dialog auto-dismisses after 1.5 seconds and returns to the shift list
- The shift card underneath updates in real-time: amber banner disappears, status pill changes to "Confirmed", button changes from "Confirm Shift" to "Check In"

---

**PART E: SHIFT DETAIL SCREEN — CONFIRMATION STATUS**

On the Shift Detail screen, the Shift Status Banner at the top now reflects the confirmation state:

**Unconfirmed shift status banner:**
- Background: #FFF8E1 (lightest amber)
- Border-radius 12px, padding 12px 16px
- Left: Amber clock icon (20px, #92600A)
- Text: "Assigned · Awaiting Your Confirmation" in Inter 13px semibold #92600A
- Right: No countdown — just the status

**Confirmed shift status banner:**
- Background: #F0FDF4 (lightest green)
- Left: Green checkmark circle (20px, #1F6F43)
- Text: "Confirmed · Upcoming" in Inter 13px semibold #1F6F43
- Right: "Starts in 45 min" countdown in Inter 12px medium #1F6F43

**Primary Action Button on Shift Detail (bottom of screen):**
- Unconfirmed: "Confirm Shift" — outlined green (1.5px border #1F6F43, text #1F6F43, height 52px, border-radius 14px). Tapping opens the same confirmation dialog.
- Confirmed: "Check In" — solid green (#1F6F43, white text, height 52px, border-radius 14px). Available within 2 hours of shift start.
- Between confirmed and check-in eligible: "Check In" button shown but disabled (opacity 0.5, non-tappable). Helper text below: "Check-in available 2 hours before shift start" in Inter 12px #9CA3AF

---

**PART F: OWNER NOTIFICATION (what the owner sees)**

When staff confirms a shift, the owner receives:

**Notification:**
- Icon: Green checkmark on #F0FDF4 circle
- Title: "Shift confirmed"
- Description: "Sarah Johnson confirmed her Respite Care shift with Emma Thompson on March 14, 9:00 AM – 1:00 PM."
- Time: "Just now"

**On the owner's dashboard:**
- The shift status updates from "Assigned" to "Confirmed" in real-time
- If staff does NOT confirm and the shift is approaching (e.g., within 4 hours), the owner receives a warning notification:
  - Icon: Amber warning triangle on #FFF8E1
  - Title: "Shift not yet confirmed"
  - Description: "Sarah Johnson has not confirmed her Respite Care shift starting in 4 hours. Consider reaching out or assigning backup."

---

**PART G: UNCONFIRMED SHIFT REMINDERS (notification to staff)**

If a shift is assigned but staff hasn't confirmed:

**Reminder notification 1 (when shift is assigned):**
- "New shift assigned — please confirm"
- "You've been assigned a Respite Care shift with Emma Thompson on March 14, 9:00 AM. Please confirm."
- Action pill: "Confirm" — tapping opens the confirmation dialog directly from notifications

**Reminder notification 2 (12 hours before shift, if still unconfirmed):**
- "Shift confirmation reminder"
- "Your Respite Care shift tomorrow at 9:00 AM has not been confirmed. Please confirm to let the owner know you'll attend."
- Action pill: "Confirm"

**Reminder notification 3 (4 hours before shift, if still unconfirmed — urgent):**
- Red left-border accent (urgent)
- "Urgent: Shift starts in 4 hours — not confirmed"
- "Please confirm your shift immediately or contact your supervisor if you cannot attend."
- Action pill: "Confirm"

---

**Overall Design & Behavior Notes:**
- The confirmation step is intentionally lightweight — one tap + dialog confirmation. No forms, no text input, no acknowledgement checkboxes. Staff are busy and mobile — this needs to be fast.
- The outlined green "Confirm Shift" button is visually distinct from the solid green "Check In" button — this prevents confusion between the two actions. Outlined = preparatory step, Solid = primary action.
- The amber "Confirmation required" banner at the top of unconfirmed shift cards creates visual urgency without being aggressive — it's a gentle nudge, not a blocker.
- The dialog is centered and clean with minimal content — shift summary + confirmation message + two buttons. No scrolling, no complexity. Staff reads it in 2 seconds and taps.
- The auto-dismissing success state (1.5 seconds) keeps the flow fast — staff doesn't need to manually close a success screen. The card updates underneath seamlessly.
- The escalating notification reminders (assignment → 12 hours → 4 hours) ensure shifts don't fall through the cracks. The 4-hour reminder uses the red urgent pattern consistent with critical notifications throughout the app.
- Owner visibility is key — the moment staff confirms, the owner knows. If staff doesn't confirm as the shift approaches, the owner gets a warning with enough time to arrange backup.
- Transfer is blocked for unconfirmed shifts — staff must first commit to the shift before they can transfer it. You can't transfer something you haven't acknowledged.
- The shift lifecycle is now fully trackable: Assigned → Confirmed → Checked In → In Progress → Checked Out → Completed. Each state has a distinct visual treatment (amber → green → blue → green → gray) that's consistent across all screens.

---

Want me to compile everything into the final summary document now?