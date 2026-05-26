Good idea — the Check In and Check Out should also have confirmation dialogs, not just instant actions. These are geo-tagged, timestamped actions with compliance implications — they deserve a confirmation step just like the shift confirmation.

Let me design the complete flow:

---

**Figma Make Prompt — Check In / Check Out Confirmation Flow (Full Functionality)**

---

Design the complete Check In and Check Out confirmation flow for "Family Forever" staff mobile app. Both actions require a confirmation dialog before executing, and both capture GPS location and timestamp automatically. Frame size: 390×844 (iPhone 14/15 Pro). Match the existing design language.

**Design System (consistent across all screens):**
- Primary green: #1F6F43
- Background: #F8F8F6 (warm off-white)
- Headings: Poppins — bold/semibold
- Body: Inter — regular/medium
- Card style: White background, border-radius 16px, shadow 0 2px 8px rgba(0,0,0,0.04), 20px internal padding
- Page padding: 20px horizontal

---

**COMPLETE SHIFT ACTION LIFECYCLE ON THE HOME DASHBOARD:**

The shift card's primary action button changes through 4 states. Design all 4 states of the same shift card to show the full progression:

**STATE 1 — UNCONFIRMED (shift assigned, not yet confirmed):**
- Amber banner at top of card: "Confirmation required" in Inter 12px semibold #92600A with clock icon (16px, #92600A), background #FFF8E1, border-radius 12px 12px 0 0, padding 10px 16px
- Service badge "Respite Care" + time "9:00 AM – 1:00 PM"
- Client: "Emma Thompson" with avatar "ET"
- Location: "1234 Oak Street, Suite 5"
- **Button:** "Confirm Shift" — outlined, 1.5px border #1F6F43, text #1F6F43 Inter 14px semibold, height 44px, border-radius 10px, full width within card padding

**STATE 2 — CONFIRMED (waiting for check-in window):**
- No amber banner — clean card
- Same service badge, time, client, location
- Small status line above button: Green checkmark icon (14px, #1F6F43) + "Confirmed ✓" in Inter 11px medium #1F6F43, left-aligned
- **Button:** "Check In" — solid #1F6F43 green, white text Inter 14px semibold, height 44px, border-radius 10px, full width
- If check-in window not yet open (more than 2 hours before shift): Button is disabled, opacity 0.4, non-tappable. Small text below button: "Check-in opens 2 hours before shift" in Inter 11px regular #9CA3AF, centered

**STATE 3 — CHECKED IN (in progress):**
- No banner
- Same card content
- Small status line above button: Blue pulsing dot (8px, #1E5FA6) + "In Progress · Checked in at 9:02 AM" in Inter 11px medium #1E5FA6, left-aligned
- **Button:** "Check Out" — outlined, 1.5px border #1F6F43, text #1F6F43 Inter 14px semibold, height 44px, border-radius 10px, full width. Outlined because checkout is a closing action.

**STATE 4 — COMPLETED (shift done):**
- No banner
- Same card content but with muted treatment
- Small status line: Gray checkmark (14px, #6B7280) + "Completed · 4h 06m" in Inter 11px medium #6B7280
- **Button area:** Two side-by-side buttons, 8px gap:
  - Left (60%): "View Report" — outlined, 1px border #E5E7EB, text #1A1A1A Inter 13px medium, height 40px, border-radius 10px
  - Right (40%): "Details >" — text link, Inter 13px medium #1F6F43, vertically centered

**Design all 4 states as separate shift cards in a vertical flow on a single frame, labeled "State 1", "State 2", "State 3", "State 4" for developer reference.**

---

**CHECK IN FLOW — STEP BY STEP:**

**Step 1: Staff taps "Check In" button on the shift card**

**Step 2: GPS Loading Screen (full screen, 1-2 seconds)**
- Full screen, background #F8F8F6
- Center: Animated green location pin icon (48px, #1F6F43) with a pulsing ring expanding outward (3 rings, each 60px/90px/120px, fading opacity, 1.5 second cycle) — like a GPS radar ping
- Below icon (16px gap): "Getting your location..." in Poppins 16px semibold #1A1A1A, centered
- Below text (6px gap): "Please ensure location services are enabled" in Inter 13px regular #9CA3AF, centered
- This screen auto-transitions to Step 3 once GPS resolves

**Step 2B: GPS BLOCKED (if location services disabled)**
- Full screen, background #F8F8F6
- Center: Large location icon (64px) in #D1D5DB with a red X overlay circle (20px) at bottom-right
- "Location Services Required" in Poppins 18px bold #1A1A1A, centered
- "Family Forever requires your location to verify shift check-in. Please enable location services to continue." in Inter 14px regular #6B7280, centered, max-width 300px, line-height 1.5
- **Buttons (24px below):**
  - "Open Settings" — solid #1F6F43, white text Poppins 15px semibold, height 50px, full width, border-radius 12px
  - "Go Back" — text link Inter 14px medium #6B7280, centered, 12px below
- **No way to bypass — GPS is mandatory**

**Step 3: Check-In Confirmation Screen (full screen with map)**

**Header (56px):**
- Left: "← Cancel" text Inter 14px medium #6B7280 — returns to previous screen
- Center: "Check In" in Poppins 18px semibold #1A1A1A

**Map Preview Card (20px below header):**
- White card, 16px border-radius, soft shadow, overflow hidden
- **Map area:** Top portion, height 180px, full card width, no internal padding — map bleeds to card edges. Shows a standard map view centered on staff's current GPS coordinates. Green branded pin (#1F6F43 colored with white center dot) dropped at exact location. Zoom level: ~200m radius view showing street and buildings.
- **Location details (below map, 16px padding):**
  - "Your Current Location" in Inter 11px medium #9CA3AF, letter-spacing 0.3px
  - Address: "1234 Oak Street, Suite 5, Ontario" in Inter 15px semibold #1A1A1A
  - GPS: "43.6532° N, 79.3832° W" in Inter 11px regular #D1D5DB

**Location Match Status (16px below map card):**

- **Match (within 200m):** Compact banner, background #F0FDF4, border-radius 12px, padding 14px 16px. Green checkmark circle (24px, #1F6F43 background, white check 12px) + "Location matches shift address" in Inter 14px semibold #1F6F43. Below: "1234 Oak Street, Suite 5" in Inter 12px regular #6B7280.

- **Mismatch (more than 200m):** Banner background #FFF8E1, LEFT BORDER ACCENT 4px solid #F59E0B. Amber warning triangle (24px, #F59E0B) + "Location mismatch detected" in Inter 14px semibold #92600A. "You are 1.2 km from the expected shift location. Your current location will be recorded." in Inter 13px regular #92600A. "This will be flagged for owner review" in Inter 12px medium #92600A.

**Shift Summary Card (16px below location status):**
- White card, 14px border-radius, 16px padding, compact
- Row 1: Service pill "Respite Care" #EBF5FF/#1E5FA6 + "4 hours" duration badge
- Row 2: Client avatar (28px) "ET" inline + "Emma Thompson" Inter 14px semibold #1A1A1A
- Row 3: Clock icon (14px, #9CA3AF) + "9:00 AM – 1:00 PM" Inter 13px #6B7280

**Timestamp Display (16px below shift summary):**
- Centered block:
  - Large time: "9:02 AM" in Poppins 32px bold #1A1A1A, centered
  - "March 14, 2026" in Inter 14px regular #9CA3AF, centered
  - Small live clock icon (14px, #1F6F43) beside the time

**Early/Late Notice (if applicable, 12px below timestamp):**
- Early (15+ min before start): Info banner, background #EBF5FF, border-radius 12px, padding 12px 16px. Info icon (18px, #1E5FA6) + "You're checking in 23 minutes early. Your actual start time will be recorded." Inter 13px regular #1E5FA6
- Late (after scheduled start): Warning banner, background #FEF2F2, LEFT BORDER ACCENT 3px solid #DC2626. Warning icon (18px, #DC2626) + "You're checking in 12 minutes late. Scheduled start was 9:00 AM. Your actual time will be recorded and flagged." Inter 13px regular #DC2626

**Check-In Confirmation Dialog (fixed at bottom, replaces a simple button — this is the confirmation moment):**

Instead of just a button, show a confirmation card docked at the bottom:

- White card, border-radius 20px 20px 0 0, padding 24px 28px 32px, shadow 0 -4px 24px rgba(0,0,0,0.08)
- **Confirmation text:** "Confirm check-in at 9:02 AM?" in Poppins 16px semibold #1A1A1A
- **Subtext:** "Your time and location will be recorded" in Inter 13px regular #9CA3AF, 4px below
- **Buttons (20px below, stacked):**
  - Primary: "Confirm Check In" — solid #1F6F43, white text Poppins 15px semibold, height 52px, border-radius 14px, shadow 0 4px 12px rgba(31,111,67,0.2), full width
  - Secondary: "Cancel" — text only, Inter 14px medium #6B7280, centered, 12px below, height 40px

- For location mismatch: Primary button text changes to "Check In Anyway" and button color shifts to #F59E0B (amber) with white text. Subtext changes to "Location mismatch will be reported to owner" in Inter 13px #92600A.

**Step 4: Check-In Success (brief, auto-dismisses)**
- Full screen, background #F8F8F6
- Center: Large green circle (80px) with white checkmark (32px) — scale-up animation 0.8→1.0 over 300ms
- "Checked In!" in Poppins 22px bold #1F6F43, centered, 16px below
- "9:02 AM · 1234 Oak Street, Suite 5" in Inter 14px regular #9CA3AF, centered
- "Respite Care · Emma Thompson · 4 hrs" in Inter 13px regular #6B7280, centered
- Reminder card (16px below): Background #F0FDF4, border-radius 10px, padding 12px 16px. Document icon (16px, #1F6F43) + "Remember to document your shift observations throughout your visit" in Inter 13px regular #1F6F43
- Auto-dismisses after 2.5 seconds → returns to Shift Detail screen with updated "In Progress" status
- Or: Staff taps anywhere to dismiss immediately

---

**CHECK OUT FLOW — STEP BY STEP:**

**Step 1: Staff taps "Check Out" button on the shift card or Shift Detail screen**

**Step 2: GPS Loading (same as check-in loading screen)**

**Step 3: Check-Out Confirmation Screen (full screen with map + duration)**

**Header (56px):**
- Left: "← Cancel" — returns without checking out
- Center: "Check Out" in Poppins 18px semibold #1A1A1A

**Map Preview Card:** Same as check-in — shows current location with match/mismatch status.

**Shift Duration Summary Card (16px below location status):**
- White card, 16px border-radius, soft shadow, 20px padding
- Card header: "Shift Summary" in Poppins 14px semibold #1A1A1A
- **Clock In / Clock Out comparison — two columns side by side:**
  - Left column: Green filled circle (32px, #F0FDF4 background, green clock icon 16px) above "Clock In" label Inter 12px #9CA3AF above "9:02 AM" Poppins 18px bold #1A1A1A above "1234 Oak Street" Inter 11px #9CA3AF
  - Center: Dashed line connecting the two columns with an arrow, duration text in the middle
  - Right column: Green outlined circle (32px, pulsing dot) above "Clock Out" label above current time "1:08 PM" Poppins 18px bold #1A1A1A above current address Inter 11px #9CA3AF
- **Total Duration (centered below columns, 16px gap):**
  - "4h 06m" in Poppins 28px bold #1F6F43, centered
  - "Total shift duration" in Inter 12px regular #9CA3AF below
  - If overtime: Duration in #F59E0B amber + "Overtime: +6 min" badge below
- **Comparison row (thin divider above, 12px padding):**
  - "Scheduled: 4h 00m" left Inter 13px #9CA3AF → "Actual: 4h 06m" right Inter 13px semibold #1A1A1A

**Report Completion Status (16px below duration card):**
- If report complete (1000+ chars): Green banner — checkmark + "Shift report complete · 1,247 characters" Inter 14px semibold #1F6F43. "Report will be submitted with checkout" Inter 12px #6B7280.
- If partial (500-999 chars): Amber banner with LEFT BORDER ACCENT #F59E0B — warning + "Report below recommended minimum · 724 characters" Inter 14px semibold #92600A. Below: "Continue editing report" link in Inter 13px #1F6F43.
- If empty (0 chars): Red banner with LEFT BORDER ACCENT #DC2626 — warning + "No shift report written" Inter 14px semibold #DC2626. "This will be flagged for owner review" Inter 13px #DC2626. "Go back and write report" link in Inter 13px semibold #1F6F43.

**Check-Out Confirmation Card (docked at bottom, same pattern as check-in):**
- White card, border-radius 20px 20px 0 0, padding 24px 28px 32px, shadow 0 -4px 24px rgba(0,0,0,0.08)
- "Confirm check-out at 1:08 PM?" in Poppins 16px semibold #1A1A1A
- "Your final time, location, and report will be recorded" in Inter 13px regular #9CA3AF
- **Buttons:**
  - Report complete: "Confirm Check Out" — outlined, 2px border #1F6F43, text #1F6F43, Poppins 15px semibold, height 52px, border-radius 14px. Outlined because checkout is a closing action.
  - Report partial: "Check Out Anyway" — #F59E0B amber, white text
  - Report empty: "Check Out Without Report" — outlined #DC2626 red border, text #DC2626
  - Cancel: "Cancel" text link below

**Step 4: Check-Out Success**
- Full screen success animation — green circle + checkmark
- "Checked Out!" in Poppins 22px bold #1F6F43
- "1:08 PM · 1234 Oak Street, Suite 5" in Inter 14px #9CA3AF
- "Total: 4h 06m" in Poppins 18px semibold #1A1A1A
- Report status: "Shift report submitted · 1,247 characters" with green check. Or "No shift report submitted" with amber warning.
- Single button: "Back to My Shifts" — solid #1F6F43, white text Poppins 15px semibold, height 50px, border-radius 12px
- Auto-dismisses after 3 seconds or on tap

---

**UPDATED SHIFT TIMELINE ON SHIFT DETAIL SCREEN (reflecting all recorded data):**

After both check-in and check-out, the Shift Timeline card shows the complete geo-tagged record:

**Timeline Nodes:**

- **Node 1 — Confirmed:**
  - Green filled circle (24px) with white check
  - "Shift Confirmed" Inter 14px semibold #1A1A1A
  - "March 14, 8:30 AM" Inter 12px #9CA3AF
  - No mini map — confirmation is not location-based

- **Node 2 — Clock In:**
  - Green filled circle (24px) with white check
  - "Clock In" Inter 14px semibold #1A1A1A
  - "9:02 AM" Inter 13px medium #1F6F43
  - "1234 Oak Street, Suite 5" Inter 12px #9CA3AF
  - **Mini map:** 200px wide × 70px tall, border-radius 8px, 0.5px border #E5E7EB. Map centered on GPS coordinates with green pin. Tappable — opens device maps.
  - Location badge: Green check (12px) + "Location verified" Inter 10px #1F6F43. Or amber warning + "1.2 km from expected" Inter 10px #F59E0B.

- **Node 3 — Report (between check-in and check-out):**
  - Teal/blue circle (24px, #EBF5FF background, document icon 12px #1E5FA6)
  - "Shift Report" Inter 14px semibold #1A1A1A
  - In progress: "In progress · 724 characters · Last updated 10:45 AM" Inter 12px #9CA3AF
  - Completed: "Completed · 1,247 characters" Inter 12px #1F6F43
  - No mini map

- **Node 4 — Clock Out:**
  - Green filled circle (24px) with white check (if completed). Gray outlined if pending.
  - "Clock Out" Inter 14px semibold #1A1A1A
  - "1:08 PM" Inter 13px medium #1F6F43
  - "1234 Oak Street, Suite 5" Inter 12px #9CA3AF
  - **Mini map:** Same as Clock In — showing checkout GPS location with pin
  - Location badge: Same pattern

- **Connecting lines between nodes:**
  - Completed segments: 2px solid #1F6F43 (green)
  - Active/current segment: 2px solid #1E5FA6 (blue, pulsing)
  - Future/pending segments: 2px dashed #D1D5DB (gray)

**Total Hours Row (bottom of timeline):**
- "Total Hours:" Inter 14px medium #6B7280 left → "4h 06m" Inter 14px semibold #1F6F43 right
- Below: "Scheduled: 4h 00m · Overtime: +6m" Inter 11px #9CA3AF (only if overtime)

---

**OWNER NOTIFICATIONS FOR EACH ACTION:**

- **Shift Confirmed:** "Sarah Johnson confirmed her Respite Care shift on March 14, 9:00 AM"
- **Checked In:** "Sarah Johnson checked in at 9:02 AM · Location verified ✓" (or "Location mismatch — 1.2 km from expected" with amber warning)
- **Checked In Late:** "Sarah Johnson checked in 12 minutes late at 9:12 AM"
- **Checked Out:** "Sarah Johnson checked out at 1:08 PM · Total: 4h 06m"
- **Checked Out Without Report:** "Sarah Johnson checked out without a shift report — flagged for review"
- **Auto-Closed (forgot checkout):** "Sarah Johnson's shift was auto-closed at 1:30 PM — no check-out recorded"

---

**Overall Design & Behavior Notes:**
- Every significant shift action (Confirm, Check In, Check Out) now has a confirmation step — this prevents accidental actions and creates clear audit moments
- The confirmation card docked at the bottom of the Check In/Out screens feels intentional and weighty — it's not a tiny dialog that could be accidentally tapped, it's a deliberate UI element that demands attention
- The GPS loading screen with the radar ping animation gives staff visual feedback that something is happening — no ambiguity about whether the button worked
- GPS is mandatory and non-negotiable — the "Open Settings" screen makes it easy to fix but impossible to bypass
- The location match/mismatch system creates accountability without being punitive — mismatches are flagged but not blocked
- The report completion check before checkout ensures documentation quality — the graduated visual treatment (green/amber/red) makes staff consciously acknowledge report status
- The complete Shift Timeline with mini maps gives owners a visual audit trail — they can see exactly where and when every action happened
- The 4-state shift card progression (Unconfirmed → Confirmed → In Progress → Completed) creates a clear visual story of the shift lifecycle on a single card
- Button styling follows a consistent logic: Outlined green = preparatory/secondary action (Confirm, Check Out). Solid green = primary action (Check In). Amber = proceed with caution. Red outlined = proceed without compliance.

---

Want me to compile everything into the final summary document now?