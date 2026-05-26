Good correction — that makes much more sense. The Daily Shift Report is written **during the shift** (between Clock In and Clock Out), not after checkout. Staff document activities, medications, meals, mood, observations in real-time while they're with the client. By checkout time, the report should already be complete.

This changes the flow:

**Updated logic:**
- After Check In → staff is on shift → the Shift Detail screen shows the Daily Shift Report section as **active and editable**
- Staff writes/updates the report throughout the shift while with the client
- At Check Out → system checks if report is complete. If report is empty or below minimum, show a warning before allowing checkout
- After Check Out → report is locked/submitted, no longer editable

**What this affects:**
- The Check-Out success screen should NOT redirect to "Write Shift Report" — remove that
- The Shift Detail screen's Daily Shift Report section becomes available only when shift status is "In Progress" (between Clock In and Clock Out)
- Checkout confirmation should show report completion status

Let me update the prompt:

---

**Figma Make Prompt — Shift Report Timing Update (During Shift, Not After)**

---

Update the Check-In / Check-Out flow and Shift Detail screen to reflect that the Daily Shift Report is written **during the shift** — between Clock In and Clock Out — not after checkout. Staff document observations in real-time while with the client.

**Design System:** Same as all other screens — #1F6F43 primary green, Poppins headings, Inter body, warm off-white background, 16px rounded cards with soft shadows.

---

**CHANGE 1: SHIFT DETAIL SCREEN — REPORT SECTION STATES**

The Daily Shift Report card on the Shift Detail screen has 4 different states depending on shift status:

**State A — Shift is Upcoming (before Clock In):**
- Daily Shift Report card is visible but locked
- Card has reduced opacity (0.5)
- Overlay message centered on the card: Lock icon (20px, #9CA3AF) above "Report available after check-in" in Inter 13px medium #9CA3AF
- Text area is not interactive, placeholder grayed out
- This tells staff the report exists but they can't write until they're officially on shift

**State B — Shift is In Progress (after Clock In, before Clock Out) — PRIMARY ACTIVE STATE:**
- Daily Shift Report card is fully active, editable, and prominent
- LEFT BORDER ACCENT: 4px solid #1F6F43 (green) — indicating this is an active task
- Card header: "Daily Shift Report" in Poppins 14px semibold #1A1A1A. Right side: Report completion indicator — small circular progress ring (24px) showing percentage filled in #1F6F43 green, with percentage text "35%" inside in Inter 9px semibold #1F6F43. This updates as staff types.
- Description: "Document activities, medications, meals, mood, interactions, health observations, and any concerns." in Inter 13px regular #6B7280, line-height 1.5
- **Text area (fully active):**
  - Background: white (#FFFFFF), border 1.5px #1F6F43 (green border indicating active/focused state), border-radius 12px, padding 16px, min-height 160px (taller than the post-shift version since this is the primary writing time)
  - Placeholder: "Start documenting your shift observations..." in Inter 14px regular #D1D5DB
  - As staff types, text appears in Inter 14px regular #1A1A1A
- Character count below text area: "324 / 1000 recommended minimum" in Inter 11px regular — green #1F6F43 when above 1000, amber #F59E0B when between 500–999, red #DC2626 when below 500
- **Auto-save indicator (below character count, 4px gap):**
  - Small cloud-check icon (12px, #22C55E) + "Auto-saved 30 sec ago" in Inter 10px regular #9CA3AF
  - Report auto-saves every 30 seconds so nothing is lost if the app closes
- **Quick-entry buttons row (12px below text area):**
  - Horizontal scrollable row of small pill buttons for common report entries, helping staff write faster:
  - "Meal served", "Medication given", "Activity completed", "Mood: Happy", "Mood: Upset", "Incident noted", "Nap/Rest"
  - Each pill: Background #F3F4F6, text #374151, Inter 12px medium, border-radius 16px, padding 6px 14px
  - Tapping a pill inserts a timestamped template line into the text area. Example: tapping "Meal served" inserts "10:32 AM — Meal served: " with cursor positioned after the colon for staff to add details
  - Selected/used pills shift to outlined green border #1F6F43 to show they've been used this shift
- **Action buttons (16px below quick-entry pills):**
  - Left: "Download Report" — outlined, 1px border #E5E7EB, text #1A1A1A, download icon, Inter 13px medium, height 40px, border-radius 10px
  - Right: "Save Draft" — solid #1F6F43, white text Inter 13px semibold, height 40px, border-radius 10px (manual save in addition to auto-save, for staff confidence)

**State C — Shift is Completed (after Clock Out):**
- Report is locked and submitted
- Card has no left-border accent
- Card header: "Daily Shift Report" in Poppins 14px semibold #1A1A1A. Right: Green checkmark (16px) + "Submitted" pill badge — background #F0FDF4, text #1F6F43, Inter 11px semibold
- Report text is displayed as read-only (no editable text area) — Inter 14px regular #374151, with a subtle background #F9FAFB, border-radius 12px, padding 16px
- Below text: "Submitted at 1:08 PM · 1,247 characters" in Inter 11px regular #9CA3AF
- Action: "Download Report" button only — no edit capability
- If report was empty at checkout (edge case): Show amber warning — "No report submitted for this shift" with "Report was not completed before check-out" in Inter 12px #92600A

**State D — Shift Auto-Closed (staff forgot to check out):**
- Same as State C but with additional amber notice:
- "Shift was auto-closed. Report may be incomplete." in Inter 12px #F59E0B inside an amber banner at top of the card

---

**CHANGE 2: CHECK-OUT CONFIRMATION — REPORT COMPLETION CHECK**

On the Check-Out confirmation screen (Screen 3 from the geo-tagged flow), add a report status section between the Shift Duration Summary and the bottom action button:

**Report Completion Status Card (16px below duration summary):**

- **If report meets minimum (1000+ characters):**
  - Compact banner: background #F0FDF4, border-radius 12px, padding 14px 16px
  - Green checkmark circle (24px) + "Shift report complete" in Inter 14px semibold #1F6F43
  - "1,247 characters · Report will be submitted with checkout" in Inter 12px regular #6B7280
  - Checkout proceeds normally

- **If report is partially complete (500–999 characters):**
  - Banner: background #FFF8E1, border-radius 12px, padding 14px 16px
  - LEFT BORDER ACCENT: 3px solid #F59E0B
  - Amber warning icon (24px) + "Report below recommended minimum" in Inter 14px semibold #92600A
  - "Your report is 724 characters. Recommended minimum is 1,000 characters." in Inter 13px regular #92600A
  - Two action options below:
    - "Continue editing report" — text link Inter 13px medium #1F6F43 (returns to shift detail to continue writing)
    - The checkout button text changes to: "Check Out Anyway" — still functional but amber #F59E0B background instead of green, making staff consciously acknowledge the incomplete report

- **If report is empty (0 characters):**
  - Banner: background #FEF2F2, border-radius 12px, padding 14px 16px
  - LEFT BORDER ACCENT: 4px solid #DC2626
  - Red warning icon (24px) + "No shift report written" in Inter 14px semibold #DC2626
  - "You have not written a shift report. This will be flagged for owner review." in Inter 13px regular #DC2626
  - "Go back and write report" — text link Inter 13px semibold #1F6F43
  - Checkout button: "Check Out Without Report" — outlined red: 1.5px border #DC2626, text #DC2626, white background. Visually discouraging but still possible — there may be legitimate reasons (emergency, etc.)
  - Below button: "Owner will be notified about missing report" in Inter 11px #DC2626

---

**CHANGE 3: CHECK-IN SUCCESS SCREEN — REPORT REMINDER**

Update the Check-In success screen (Screen 2) to include a report reminder:

After the green checkmark animation and "Checked In!" text:
- Add below the shift info: A small card-style reminder
- Background #F0FDF4, border-radius 10px, padding 12px 16px
- Document/pen icon (16px, #1F6F43) + "Remember to document your shift observations throughout your visit" in Inter 13px regular #1F6F43
- This primes staff to start writing their report during the shift, not wait until checkout

---

**CHANGE 4: CHECK-OUT SUCCESS SCREEN — REMOVE REPORT REDIRECT**

Update the Check-Out success screen (Screen 4):
- Remove "Your daily shift report is ready to fill" text
- Remove "Write Shift Report →" button
- Remove "Skip for now" link

Replace with:
- "Checked Out!" success animation (same)
- Time and location info (same)
- "Total: 4h 06m" (same)
- **Report submission confirmation:** "Shift report submitted · 1,247 characters" in Inter 13px regular #6B7280 with small green check icon — confirming the report that was written during the shift has been locked and submitted
- Or if no report: "No shift report submitted" in Inter 13px regular #DC2626 with amber warning icon
- Single button: "Back to My Shifts" — solid #1F6F43, white text
- "Cancel Transfer Request" link below if applicable (existing)

---

**CHANGE 5: SHIFT TIMELINE — REPORT ACTIVITY NODE**

Add a new node to the Shift Timeline between Clock In and Clock Out to show report activity:

**Updated Timeline Structure:**
- Node 1: Clock In (completed, green filled circle, with mini map) — existing
- **Node 2 (NEW): Shift Report** — document icon (16px) inside a teal/blue circle (24px, #EBF5FF background, #1E5FA6 icon)
  - If in progress: "Report in progress" in Inter 13px medium #1E5FA6. Below: "724 characters · Last updated 10:45 AM" in Inter 12px #9CA3AF
  - If completed: Green checkmark treatment. "Report completed" in Inter 13px medium #1F6F43. Below: "1,247 characters · Completed 12:55 PM" in Inter 12px #9CA3AF
  - If empty: Gray circle. "No report yet" in Inter 13px medium #9CA3AF
  - No mini map for this node — it's a documentation action, not a location event
- Node 3: In Progress / Clock Out — existing

---

**Overall Design & Behavior Notes:**
- Writing the report DURING the shift is fundamentally better than after — staff capture real-time observations while details are fresh, not trying to recall 4 hours of events after checking out
- The auto-save every 30 seconds is critical — staff are on mobile, moving around, caring for a child. The app should never lose their work if they switch apps, take a call, or the phone locks
- Quick-entry pills ("Meal served", "Medication given" etc.) dramatically reduce friction — staff don't have to type full sentences for common events. The timestamped insertion makes the report automatically chronological
- The graduated checkout warnings (green complete → amber partial → red empty) create accountability without being punitive. Staff CAN check out with an incomplete report in genuine emergencies, but the visual friction ensures it's a conscious choice
- The circular progress ring on the report card header gives constant visual feedback during the shift — staff can see at a glance if they're meeting the recommended minimum
- Report locking after checkout prevents retroactive editing — this is important for compliance and audit integrity in child services. What was documented during the shift is the official record.
- Owner notification for empty reports ensures management awareness without blocking field operations — the system trusts staff to do their job but maintains oversight

---

All prompts are now updated with the correct report timing. Want me to compile everything into a final summary document?