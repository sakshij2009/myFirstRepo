Good choices. For the interaction pattern, I'm going with a **full-screen multi-step wizard**. Here's my reasoning: transfer involves eligibility checks, staff selection with availability filtering, conflict warnings, reason input, and a confirmation review — that's 4-5 steps with meaningful content at each stage. A bottom sheet would feel cramped and require scrolling within a partial overlay. A full-screen wizard gives each step breathing room, clear progress indication, and feels appropriately "serious" for an action that affects 3 people and a client's care.

This will be a longer prompt since it covers the full flow. Let's go.

---

**Figma Make Prompt — Transfer Shift Flow (Mobile, Multi-Screen Wizard)**

---

Design a premium mobile "Transfer Shift" multi-step wizard flow for "Family Forever" — a child services management platform. This flow allows staff to transfer an assigned shift to another qualified, available staff member. The transfer requires dual approval — the receiving staff must accept AND the owner must confirm before the transfer is finalized. Frame size: 390×844 (iPhone 14/15 Pro). Match the exact design language of the existing owner mobile screens.

**Design System (consistent across all screens):**
- Primary green: #1F6F43
- Background: #F8F8F6 (warm off-white)
- Headings: Poppins — bold/semibold
- Body: Inter — regular/medium
- Card style: White background, border-radius 16px, shadow 0 2px 8px rgba(0,0,0,0.04), 20px internal padding
- Icon style: Outlined stroke, 24px
- Page padding: 20px horizontal
- Spacing: 8px base grid, 16px between cards, 24px between sections

---

**PART A: TRANSFER BUTTON PLACEMENT ON MY SHIFTS SCREEN**

Add a transfer button to every eligible shift card on the My Shifts screen:

- **Inside each shift card's bottom action row:**
  - Existing layout: Left — "Check In" or "Check Out" button. Right — "Details >" link
  - **New layout:** Left — "Check In" / "Check Out" button (55% width). Center — small transfer icon button (40px × 40px, border-radius 10px, background #F3F4F6, swap/transfer arrows icon 18px #6B7280). Right — "Details >" link text.
  - The transfer icon is a compact two-arrow swap icon (↔ style, two curved arrows forming a cycle), subtle gray treatment so it doesn't compete with the primary Check In CTA
  - Tapping the transfer icon button launches the full-screen Transfer Shift wizard

- **Transfer button visibility rules:**
  - SHOW transfer button: Only on "Upcoming" and "Confirmed" shifts that are 2+ hours from start time
  - HIDE transfer button: On "In Progress" shifts (already checked in), "Completed" shifts, "Pending" shifts (not yet confirmed by owner), and any shift starting within 2 hours
  - DISABLED state: If the shift is within 2–3 hours of start, show the icon but grayed out (#D1D5DB) with a tooltip on tap: "Transfers must be initiated at least 2 hours before shift start" — small toast message, Inter 12px, appears at bottom of screen for 3 seconds
  - If a transfer is already pending for this shift, replace the transfer icon with a small amber clock icon (18px, #F59E0B) on #FFF8E1 background — tapping shows transfer status

---

**PART B: FULL-SCREEN TRANSFER WIZARD (4 Steps)**

**Wizard Header (consistent across all 4 steps, sticky top, 100px total height):**
- Top row (56px): Left — "Cancel" text button in Inter 14px medium #DC2626 (tapping shows a confirmation dialog: "Cancel transfer? Your progress will be lost." with "Go Back" and "Yes, Cancel" buttons). Center — "Transfer Shift" in Poppins 16px semibold #1A1A1A. Right — Step indicator "Step 1 of 4" in Inter 12px regular #9CA3AF
- Below (44px): Progress bar — full width within 20px page padding, 4px height, border-radius 2px, background #E5E7EB. Filled portion in #1F6F43 green — 25% for step 1, 50% for step 2, 75% for step 3, 100% for step 4. Smooth animated transition between steps.

---

**STEP 1: SHIFT SUMMARY & REASON (confirm what you're transferring and why)**

**Shift Being Transferred Card (20px below wizard header):**
- White card, 16px border-radius, soft shadow, 20px padding
- Card header: "Shift to Transfer" in Poppins 14px semibold #1A1A1A
- LEFT BORDER ACCENT: 4px solid #1F6F43 (green) — highlighting this is the subject shift
- 16px below header: Shift details matching the standard shift card layout:
  - Service badge pill: "Respite Care" #EBF5FF/#1E5FA6
  - Time: "9:00 AM – 1:00 PM · 4 hours" in Inter 14px semibold #1A1A1A
  - Date: "Friday, March 14, 2026" in Inter 13px regular #6B7280
  - Client row: Avatar (36px) "ET" on #F0FDF4 + "Emma Thompson" Inter 14px medium #1A1A1A + "ID: 0988765" Inter 12px #9CA3AF
  - Location: Map pin icon + "1234 Oak Street, Suite 5" Inter 13px #6B7280

**Important Notice Card (16px below shift card):**
- Compact info card: background #EBF5FF (lightest blue), border-radius 12px, padding 14px 16px
- Left: Info circle icon (18px, #1E5FA6)
- Text (12px gap from icon): "This transfer requires approval from both the receiving staff member and the owner before it is confirmed. You will remain assigned until the transfer is fully approved." in Inter 13px regular #1E5FA6, line-height 1.5

**Reason for Transfer (20px below notice):**
- Section label: "Reason for Transfer" in Poppins 14px semibold #1A1A1A
- Required field indicator: Red asterisk (*) beside the label

- **Reason quick-select pills (12px below label):**
  - Horizontal wrapping row of tappable pills, 8px gap:
  - "Personal Emergency", "Schedule Conflict", "Illness", "Family Obligation", "Training/Course", "Other"
  - Unselected pill: Background #F3F4F6, text #6B7280, Inter 13px medium, border-radius 20px, padding 8px 16px
  - Selected pill: Background #1F6F43, white text, same sizing — only one can be selected at a time

- **Additional notes text area (16px below pills):**
  - Label: "Additional Notes (optional)" in Inter 13px regular #9CA3AF
  - Text area: Background #F9FAFB, border 1px #E5E7EB, border-radius 12px, padding 14px, min-height 80px, placeholder "Add any additional context for the owner..." Inter 14px #D1D5DB
  - Character limit: "0 / 500" in Inter 11px #D1D5DB below the text area, right-aligned

**Bottom Action Bar (fixed at bottom, above safe area, 72px height, white background, top border 0.5px #E5E7EB):**
- Full-width button: "Select Staff →" — solid #1F6F43, white text Poppins 15px semibold, height 50px, border-radius 12px, within 20px horizontal padding
- Button is disabled (opacity 0.5, non-tappable) until a reason pill is selected. Becomes active with full opacity once a reason is chosen.

---

**STEP 2: SELECT RECEIVING STAFF (the core selection screen with eligibility filtering)**

**Search & Filter Area (20px below wizard header):**
- Search bar: Full width, height 44px, background #F3F4F6, border-radius 10px, padding 0 14px. Left — search magnifying glass icon (18px, #9CA3AF). Placeholder: "Search staff by name or ID" in Inter 14px #D1D5DB. Typing filters the list in real-time.
- Below search (12px gap): Filter pills horizontal row:
  - "Available Only" pill — default ACTIVE (solid green), filtering to only show staff with no conflicts
  - "All Staff" pill — inactive, shows everyone including unavailable (with conflict indicators)
  - "Same Service Type" pill — toggleable, filters to staff qualified for Respite Care

**Available Staff Count (12px below filters):**
- "6 staff available for this shift" in Inter 13px regular #9CA3AF (dynamically updates based on filters)

**Staff Selection List (16px below count):**
Each staff member is a selectable card. Cards clearly show availability status and qualifications.

- **Available Staff Card (selectable):**
  - White card, 14px border-radius, soft shadow, 16px padding
  - Left: Staff avatar circle (44px) with photo or initials, colored background per person
  - Middle (12px gap):
    - Name: "Benjamin Harris" in Inter 15px semibold #1A1A1A
    - Role + ID: "Intake Worker · CYIM: 1432570" in Inter 12px regular #9CA3AF
    - Qualification badges row (4px below): Small pills — "Respite ✓" background #F0FDF4 text #1F6F43 Inter 10px semibold, "Emergency ✓" etc. Only showing service types they're qualified for.
  - Right: Availability indicator
    - Available: Green checkmark circle (24px, #F0FDF4 background, #1F6F43 check 12px) with "Free" text below in Inter 10px #1F6F43
  - **Selected state:** Card gets a 2px border #1F6F43, background shifts to #FCFEFB (very subtle green), green radio circle (24px) replaces the availability indicator — filled green outer ring with solid green inner dot
  - **Tapping a card selects that staff member — only one can be selected**

- **Unavailable Staff Card (shown when "All Staff" filter is active):**
  - White card but with reduced opacity (0.6) — visually de-emphasized
  - Same layout as available card BUT:
  - Right: Red/amber conflict indicator
    - Time conflict: Amber warning circle (24px, #FFF8E1 background, #F59E0B exclamation 12px)
    - Below: "Conflict" in Inter 10px #F59E0B
  - Below the main row, inside the card: Conflict detail banner — background #FFF8E1, border-radius 8px, padding 8px 12px:
    - "Has shift: Emergency Care 8:00 AM – 12:00 PM" in Inter 12px regular #92600A
    - This clearly explains WHY they're unavailable
  - Card is NOT selectable — tapping shows no response, keeps the non-interactive feel

- **Suspended Staff Card (rare but must handle):**
  - Same reduced opacity treatment
  - Right: Red X circle (24px, #FEF2F2 background, #DC2626 X 12px)
  - Below: "Suspended" in Inter 10px #DC2626
  - Not selectable

- **Max Hours Exceeded Staff Card:**
  - Same reduced opacity
  - Right: Amber indicator
  - Conflict banner: "At maximum weekly hours (48/48 hrs)" in Inter 12px #92600A
  - Not selectable

- **Unqualified Staff Card (when "Same Service Type" filter is OFF):**
  - Same reduced opacity
  - Right: Gray info circle
  - Conflict banner: "Not certified for Respite Care" in Inter 12px #6B7280
  - Not selectable

**Show 6 staff cards example:**
1. Benjamin Harris — Available, qualified ✓ (selectable)
2. Christine Parker — Available, qualified ✓ (selectable)
3. David Wilson — Available, qualified ✓ (selectable)
4. Amanda Lee — Time conflict, shift overlap 8 AM – 12 PM (not selectable, shown with "All Staff" filter)
5. James Rivera — Max hours reached 48/48 (not selectable)
6. Kibo Gin — Suspended (not selectable)

**Bottom Action Bar (fixed):**
- "Review Transfer →" button — solid #1F6F43, same styling as Step 1
- Disabled until a staff member is selected
- When a staff member is selected, the button text updates to: "Review Transfer with Benjamin →" (showing the selected name for confidence)

---

**STEP 3: REVIEW & CONFIRM (summary of everything before submission)**

**Transfer Summary Card (20px below wizard header):**
- White card, 16px border-radius, soft shadow, 20px padding
- Card header: "Transfer Summary" in Poppins 16px semibold #1A1A1A
- 16px below: Visual transfer representation:

  - **From → To pairing (matching the owner dashboard's client-staff pairing pattern):**
    - Left: Your avatar (48px) "SJ" with name "Sarah Johnson" below in Inter 14px semibold #1A1A1A, "You" label below in Inter 11px #9CA3AF
    - Center: Large transfer arrow icon (→) 24px, #1F6F43, with small "Transfer" label above the arrow in Inter 10px #9CA3AF
    - Right: Receiving staff avatar (48px) "BH" with "Benjamin Harris" below, "Receiving" label below in Inter 11px #9CA3AF

  - Thin divider (16px vertical margin)

  - **Shift details summary (compact key-value):**
    - Row 1: "Shift" → "Respite Care · 4 hours"
    - Row 2: "Date & Time" → "March 14, 2026 · 9:00 AM – 1:00 PM"
    - Row 3: "Client" → "Emma Thompson"
    - Row 4: "Location" → "1234 Oak Street, Suite 5"
    - Row 5: "Reason" → "Schedule Conflict" (the selected reason from Step 1)
    - Same key-value styling as all other detail cards

**Approval Process Info Card (16px below summary):**
- White card, 16px border-radius, soft shadow, 20px padding
- Card header: "Approval Process" in Poppins 14px semibold #1A1A1A
- **Visual approval pipeline — vertical steps with status indicators:**
  - Step indicators use the same timeline pattern as the Shift Detail and Transportation Routes screens:

  - Step 1: Green filled circle (24px) with "1" in white → "You submit transfer request" in Inter 13px medium #1A1A1A. Below: "Immediate" in Inter 12px #9CA3AF
  - Green connecting line (2px #D1D5DB dashed — future steps)
  - Step 2: Gray outlined circle (24px) with "2" in #9CA3AF → "Benjamin Harris accepts or declines" in Inter 13px medium #1A1A1A. Below: "Notified immediately" in Inter 12px #9CA3AF
  - Gray dashed connecting line
  - Step 3: Gray outlined circle (24px) with "3" → "Owner reviews and approves" in Inter 13px medium #1A1A1A. Below: "Final confirmation" in Inter 12px #9CA3AF
  - Gray dashed connecting line
  - Step 4: Gray outlined circle (24px) with checkmark → "Transfer confirmed" in Inter 13px medium #1A1A1A. Below: "Shift reassigned to Benjamin" in Inter 12px #9CA3AF

**Client Care Notice Card (16px below approval card):**
- LEFT BORDER ACCENT: 4px solid #F59E0B (amber)
- Background: white card with amber accent
- Warning icon (18px, #F59E0B) beside "Client Care Handover" in Inter 14px semibold #1A1A1A
- Description: "Emma Thompson has special care instructions including peanut allergy and separation anxiety protocol. Benjamin Harris will receive these notes upon transfer confirmation." in Inter 13px regular #6B7280, line-height 1.5
- This ensures the initiating staff is aware that client safety info will be communicated

**Important Terms Card (16px below client notice):**
- Compact card: background #F9FAFB, border-radius 12px, padding 14px 16px
- Bullet points in Inter 12px regular #6B7280, line-height 1.6:
  - "• You remain assigned until the transfer is fully approved"
  - "• Either Benjamin or the owner can decline this request"
  - "• You can cancel this transfer anytime before final approval"
  - "• If declined, you will be notified and remain assigned"

**Bottom Action Bar (fixed):**
- Two buttons side by side, 8px gap:
  - Left (35% width): "← Back" — outlined, 1px border #E5E7EB, text #6B7280, Inter 14px medium, height 50px, border-radius 12px
  - Right (65% width): "Submit Transfer Request" — solid #1F6F43, white text Poppins 15px semibold, height 50px, border-radius 12px

---

**STEP 4: CONFIRMATION & STATUS (after submission — the transfer is now pending)**

**Success Animation (centered, 24px below wizard header):**
- Large green circle (80px) with white checkmark icon (32px) inside — appears with a subtle scale-up animation (from 0.8 to 1.0 scale over 300ms)
- 16px below: "Transfer Request Submitted!" in Poppins 18px bold #1A1A1A, centered
- 8px below: "Awaiting approval from Benjamin Harris and the owner" in Inter 14px regular #9CA3AF, centered, max-width 280px for wrapping

**Live Transfer Status Card (24px below success message):**
- White card, 16px border-radius, soft shadow, 20px padding
- Card header: "Transfer Status" in Poppins 14px semibold #1A1A1A. Right: Live indicator — small green pulsing dot (6px) beside "Live" in Inter 11px medium #1F6F43

- **Status pipeline (same vertical timeline as Step 3, but now with live state updates):**

  - Step 1: Green filled circle + white check → "Request submitted" in Inter 13px semibold #1F6F43. "Just now" in Inter 12px #9CA3AF. ✓ Completed.
  - Green solid connecting line (2px #1F6F43)
  - Step 2: Blue outlined circle with pulsing blue center dot → "Awaiting Benjamin's response" in Inter 13px semibold #1E5FA6. "Notification sent" in Inter 12px #9CA3AF. ⏳ Active/waiting.
  - Gray dashed connecting line
  - Step 3: Gray outlined circle → "Owner approval" in Inter 13px medium #9CA3AF. "Pending" in Inter 12px #D1D5DB
  - Gray dashed connecting line
  - Step 4: Gray outlined circle → "Transfer confirmed" in Inter 13px medium #9CA3AF. "Pending" in Inter 12px #D1D5DB

**Transfer Details Recap (16px below status card):**
- Compact white card, 14px border-radius, 16px padding
- Two-column layout:
  - Left: "From: Sarah Johnson" in Inter 13px #6B7280
  - Right: "To: Benjamin Harris" in Inter 13px #1A1A1A
- Below: "Respite Care · March 14 · 9:00 AM – 1:00 PM" in Inter 12px #9CA3AF, centered

**Action Buttons (24px below recap):**
- Primary button full-width: "Back to My Shifts" — solid #1F6F43, white text Poppins 15px semibold, height 50px, border-radius 12px
- Below (12px gap): "Cancel Transfer Request" — text-only link button, Inter 13px medium #DC2626, centered, no background. Tapping shows confirmation dialog: "Cancel this transfer request? You will remain assigned to this shift." with "Keep Request" (green) and "Yes, Cancel" (red outlined) buttons.

**No bottom tab bar on Step 4 — the "Back to My Shifts" button handles navigation. This keeps the confirmation screen focused and conclusive.**

---

**PART C: TRANSFER STATUS STATES ON SHIFT CARDS (back on My Shifts screen after submission)**

Once a transfer is submitted, the shift card on My Shifts needs to reflect the pending transfer:

**Shift Card with Pending Transfer:**
- Standard shift card structure, but with an added transfer status banner at the top of the card:
- Banner: Full card width, background #FFF8E1 (lightest amber), border-radius 12px 12px 0 0 (top corners only, merging with card top), padding 10px 16px
- Left: Transfer arrows icon (16px, #92600A). Text: "Transfer pending · Awaiting Benjamin's response" in Inter 12px semibold #92600A
- Right: Small "Cancel" text in Inter 11px medium #DC2626
- The rest of the shift card remains the same below this banner
- The "Check In" button changes to: "Check In (Still Assigned)" — same green button but with the parenthetical note reminding staff they're still responsible until transfer completes

**Shift Card with Declined Transfer:**
- Same banner pattern but: Background #FEF2F2, text #DC2626
- "Transfer declined by Benjamin Harris" in Inter 12px semibold #DC2626
- Small "Dismiss" text on right to clear the banner
- The shift card reverts to normal state after dismissing

**Shift Card with Approved Transfer:**
- Same banner pattern but: Background #F0FDF4, text #1F6F43
- "Transfer approved · Reassigned to Benjamin Harris" in Inter 12px semibold #1F6F43
- This card should fade out / animate away from the staff's My Shifts list after 5 seconds or on next screen load, since it's no longer their shift

---

**PART D: RECEIVING STAFF EXPERIENCE (what Benjamin sees)**

When Benjamin Harris receives the transfer request, he gets:

**Notification Card (in his Notifications screen):**
- Unread style with green left-border accent
- Icon: Transfer arrows on purple (#F3F0FF)
- Title: "Shift transfer request"
- Description: "Sarah Johnson wants to transfer a Respite Care shift to you on March 14, 9:00 AM – 1:00 PM."
- Right: Action pill "Review" — solid #1F6F43, white text
- Tapping opens a Transfer Request Detail screen

**Transfer Request Detail Screen (full screen for Benjamin):**
- Header: "Transfer Request" in Poppins 18px semibold, with "Cancel" / back arrow
- Shift summary card (same as Step 3 summary)
- Client Care Notes card — showing Emma Thompson's special instructions (amber left-border accent)
- From/To pairing visual
- Reason: "Schedule Conflict" with any additional notes from Sarah

- **Bottom Action Bar (2 buttons):**
  - Left (50%): "Decline" — outlined, 1.5px border #DC2626, text #DC2626, Inter 14px semibold, height 50px, border-radius 12px
  - Right (50%): "Accept Transfer" — solid #1F6F43, white text, same sizing
  - Tapping "Decline" opens a bottom sheet: "Reason for declining" with quick pills ("Schedule conflict", "Not comfortable with client", "Personal reason", "Other") + optional notes + "Confirm Decline" red button
  - Tapping "Accept" shows confirmation: "Accept this shift transfer? You will be assigned to this shift once the owner approves." with "Cancel" and "Yes, Accept" buttons

---

**PART E: OWNER APPROVAL EXPERIENCE (what the owner sees — on their mobile dashboard)**

After Benjamin accepts, the owner receives:

**Notification:**
- "Shift transfer needs your approval — Sarah Johnson → Benjamin Harris for Respite Care on March 14"
- Action pill: "Review"

**Owner Transfer Review Screen:**
- Full shift details + both staff profiles
- Eligibility check summary card (auto-generated):
  - "✓ Benjamin is available at this time"
  - "✓ Benjamin is qualified for Respite Care"
  - "✓ Benjamin has 32/48 weekly hours (16 hrs remaining)"
  - "✓ No client care concerns flagged"
  - All checks in green with checkmarks, or amber warnings if any concern exists
- Approve / Decline buttons at bottom
- Declining requires a reason (same pattern as staff decline)

---

**Overall Design & Behavior Notes:**
- The 4-step wizard uses a clear progress bar — staff always knows where they are in the process
- Unavailable staff are VISIBLE but clearly non-selectable — this prevents confusion ("where is Benjamin?") while making it obvious why someone can't be chosen
- The dual-approval pipeline visualization (Steps 3 & 4) uses the same timeline pattern from Shift Detail and Transportation Routes — visual consistency across the app
- The amber transfer-pending banner on shift cards is critical — it reminds staff they're still responsible until the transfer completes
- Client care handover notice (Step 3) ensures safety is front-of-mind — no transfer happens in a vacuum, the child's needs are always visible
- The 2-hour minimum lead time prevents last-minute chaos — the disabled state with tooltip explanation teaches the rule
- Every state change triggers notifications to all 3 parties — the notification designs ensure nobody is left in the dark
- Decline flows always require a reason — this creates accountability and helps owners understand patterns (if one staff member is frequently declining, that's a management signal)
- The receiving staff sees the client's special instructions BEFORE accepting — they can make an informed decision about whether they're comfortable with the assignment
- Audit trail is implicit: every approval/decline with timestamp and reason is logged — this is critical for child services compliance

---

That's the complete Transfer Shift feature flow! Want me to refine any part of this, or shall we compile everything into a final summary?