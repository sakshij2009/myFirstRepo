Perfect choices — this makes the system rock-solid for compliance. Full-screen confirmation with map preview feels appropriately serious for a geo-tracked action, blocking without GPS ensures data integrity, and mini maps on the timeline give owners visual proof of where staff actually were.

---

**Figma Make Prompt — Geo-Tagged Check In / Check Out Flow (Mobile, Multi-Screen)**

---

Design a premium mobile "Geo-Tagged Check In / Check Out" flow for "Family Forever" — a child services management platform. When staff tap Check In or Check Out, the system captures the exact timestamp and GPS location automatically. This flow includes a full-screen confirmation with map preview, location match verification, and updates the Shift Timeline with recorded location data. Frame size: 390×844 (iPhone 14/15 Pro). Match the existing design language.

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

**SCREEN 1: CHECK-IN CONFIRMATION (full-screen with map preview)**

This screen appears after staff taps "Check In" on a shift card (from Home Dashboard, My Shifts, or Shift Detail). The system immediately starts fetching GPS location.

**Loading State (shown for 1–2 seconds while GPS resolves):**
- Full screen, background #F8F8F6
- Center: Animated green location pin icon (48px) with a subtle pulsing ring animation expanding outward (like a GPS radar ping)
- Below icon: "Getting your location..." in Poppins 16px semibold #1A1A1A, centered
- Below text: "Please ensure location services are enabled" in Inter 13px regular #9CA3AF, centered
- This transitions automatically to the confirmation screen once GPS resolves

**Top Header (56px, after GPS resolves):**
- Left: "← Cancel" text in Inter 14px medium #6B7280 — returns to previous screen without checking in
- Center: "Check In" in Poppins 18px semibold #1A1A1A
- Right: Empty

**Map Preview Card (20px below header — the hero visual element):**
- White card, 16px border-radius, soft shadow, overflow hidden (map fills the card top)
- **Map area:** Top portion of the card, height 200px, full card width, no internal padding — the map bleeds to card edges (border-radius clips the top corners)
  - Shows a Google Maps / Apple Maps style satellite or standard map view centered on the staff's current GPS location
  - Green map pin (Family Forever branded — #1F6F43 colored pin with white center dot) dropped at the exact current location
  - Map zoom level: Close enough to see the street and nearby buildings (approximately 200m radius view)
  - If the expected shift location is different from current location, show a second pin (amber #F59E0B) at the expected location with a dashed line between the two pins showing the distance

- **Location details area (below map, 16px padding):**
  - "Your Current Location" label in Inter 11px medium #9CA3AF, letter-spacing 0.3px
  - Current address: "1234 Oak Street, Suite 5, Ontario" in Inter 15px semibold #1A1A1A
  - GPS coordinates: "43.6532° N, 79.3832° W" in Inter 11px regular #D1D5DB (subtle, for audit purposes)

**Location Match Status (16px below map card):**

- **SCENARIO A — Location matches expected shift location (within 200m radius):**
  - Compact banner: background #F0FDF4, border-radius 12px, padding 14px 16px
  - Left: Green checkmark circle (24px, #1F6F43 background, white check 12px)
  - Text: "Location matches shift address" in Inter 14px semibold #1F6F43
  - Below: "1234 Oak Street, Suite 5" in Inter 12px regular #6B7280
  - This is the happy path — everything is good

- **SCENARIO B — Location does NOT match (more than 200m from expected):**
  - Compact banner: background #FFF8E1, border-radius 12px, padding 14px 16px
  - LEFT BORDER ACCENT: 4px solid #F59E0B (amber warning)
  - Left: Amber warning triangle (24px, #F59E0B)
  - Title: "Location mismatch detected" in Inter 14px semibold #92600A
  - Description: "You are 1.2 km from the expected shift location (1234 Oak Street, Suite 5). Your current location will be recorded." in Inter 13px regular #92600A, line-height 1.5
  - Below: "This will be flagged for owner review" in Inter 12px medium #92600A
  - Staff can still proceed — the system records the mismatch but doesn't block. The amber warning creates accountability.

**Shift Summary Card (16px below location status):**
- White card, 16px border-radius, soft shadow, 16px padding
- Compact shift details for final confirmation:
  - Row 1: Service pill "Respite Care" #EBF5FF/#1E5FA6 + "4 hours" duration badge right-aligned
  - Row 2: "Emma Thompson" in Inter 14px semibold #1A1A1A + client avatar (28px) inline
  - Row 3: Clock icon (14px, #9CA3AF) + "9:00 AM – 1:00 PM" in Inter 13px #6B7280
  - Row 4: "Check-in time:" left → Current time "9:02 AM" right, in Inter 14px semibold #1F6F43

**Timestamp Confirmation (16px below shift summary):**
- Centered block:
  - Large time display: "9:02 AM" in Poppins 32px bold #1A1A1A, centered — this is the exact time being recorded
  - "March 14, 2026" in Inter 14px regular #9CA3AF, centered below
  - Small live clock icon (14px, #1F6F43) beside the time — indicating this is the current live time

**Bottom Action Area (fixed at bottom, 20px above safe area):**
- Full-width button: "Confirm Check In" — solid #1F6F43 green background, white text Poppins 16px semibold, height 54px, border-radius 14px, soft green shadow 0 4px 12px rgba(31,111,67,0.2)
- Below button (8px gap): "By checking in, your time and location will be recorded" in Inter 11px regular #9CA3AF, centered

- For SCENARIO B (location mismatch): Button text changes to "Check In Anyway" and button color shifts to amber #F59E0B background with white text — visually distinct, making the staff consciously acknowledge the mismatch. Below button text: "Location mismatch will be reported to owner" in Inter 11px #92600A

---

**SCREEN 2: CHECK-IN SUCCESS CONFIRMATION (brief success screen, auto-dismisses)**

After tapping "Confirm Check In":

**Full screen, background #F8F8F6:**
- Center: Large green circle (80px) with white checkmark (32px) — scale-up animation 0.8→1.0 over 300ms
- 16px below: "Checked In!" in Poppins 22px bold #1F6F43, centered
- 8px below: "9:02 AM · 1234 Oak Street, Suite 5" in Inter 14px regular #9CA3AF, centered
- 16px below: Shift info "Respite Care · Emma Thompson · 4 hrs" in Inter 13px regular #6B7280, centered

**Auto-redirect:** This screen auto-dismisses after 2.5 seconds and returns to the Shift Detail screen, where the shift status is now "In Progress" and the timeline reflects the Clock In data.

**Or:** Staff can tap anywhere to dismiss immediately.

---

**SCREEN 3: CHECK-OUT CONFIRMATION (same pattern as Check-In, with duration summary)**

Same full-screen map preview structure as Check-In, but with additional checkout-specific elements:

**Top Header:**
- "Check Out" in Poppins 18px semibold #1A1A1A

**Map Preview Card:** Same as check-in — shows current location with match status.

**Location Match Status:** Same two scenarios as check-in (match / mismatch).

**Shift Duration Summary Card (replaces the shift summary card — more prominent for checkout):**
- White card, 16px border-radius, soft shadow, 20px padding
- Card header: "Shift Summary" in Poppins 14px semibold #1A1A1A

- **Clock In / Clock Out comparison layout:**
  - Two columns side by side:
  - Left column (Clock In): Green circle (32px, #F0FDF4, green clock icon 16px) above "Clock In" label Inter 12px #9CA3AF above "9:02 AM" in Poppins 18px bold #1A1A1A above "1234 Oak Street" in Inter 11px #9CA3AF
  - Right column (Clock Out): Green outlined circle (32px, pulsing dot) above "Clock Out" label above current time "1:08 PM" in Poppins 18px bold #1A1A1A above current address in Inter 11px #9CA3AF
  - Connecting dashed line between the two columns with duration in the middle

- **Total Duration (centered below the two columns, 16px gap):**
  - Large centered: "4h 06m" in Poppins 28px bold #1F6F43
  - "Total shift duration" in Inter 12px regular #9CA3AF below
  - If overtime (exceeds scheduled duration): Duration text in amber #F59E0B with small "Overtime: +6 min" badge below

- **Comparison row (thin divider above, 12px padding):**
  - "Scheduled: 4h 00m" left-aligned Inter 13px #9CA3AF → "Actual: 4h 06m" right-aligned Inter 13px semibold #1A1A1A

**Bottom Action Area:**
- Full-width button: "Confirm Check Out" — outlined style: 2px border #1F6F43, text #1F6F43 Poppins 16px semibold, height 54px, border-radius 14px, white background (outlined because checkout is a closing action — less aggressive than solid fill)
- Below: "Your final time and location will be recorded" in Inter 11px #9CA3AF

---

**SCREEN 4: CHECK-OUT SUCCESS (brief, then redirects to Daily Report)**

- Same success animation as check-in: green circle + checkmark
- "Checked Out!" in Poppins 22px bold #1F6F43
- "1:08 PM · 1234 Oak Street, Suite 5" in Inter 14px #9CA3AF
- "Total: 4h 06m" in Poppins 18px semibold #1A1A1A
- 24px below: "Your daily shift report is ready to fill" in Inter 14px regular #6B7280
- Button: "Write Shift Report →" — solid #1F6F43, white text, navigates to the Daily Shift Report section on the Shift Detail screen
- Below button: "Skip for now" in Inter 13px medium #9CA3AF (tappable, returns to My Shifts — but report remains pending)

---

**SCREEN 5: GPS UNAVAILABLE / BLOCKED STATE**

If the staff taps Check In but GPS/location services are disabled:

**Full screen, background #F8F8F6:**
- Center: Large gray-red location icon (64px) with a small X overlay — location disabled visual
- 16px below: "Location Services Required" in Poppins 18px bold #1A1A1A, centered
- 8px below: "Family Forever requires your location to verify shift check-in. Please enable location services to continue." in Inter 14px regular #6B7280, centered, max-width 300px, line-height 1.5

**Action buttons (24px below text):**
- Full-width: "Open Settings" — solid #1F6F43, white text Poppins 15px semibold, height 50px, border-radius 12px (opens device location settings)
- Below (12px gap): "Go Back" — text link Inter 14px medium #6B7280, centered (returns to previous screen)

**No way to bypass this screen — GPS is mandatory for check-in/out. The system will not record a check-in without location data.**

---

**PART B: UPDATED SHIFT TIMELINE WITH GEO-DATA AND MINI MAPS**

Update the Shift Timeline card on the Shift Detail screen to include recorded location data and mini maps:

**Updated Timeline Node Structure (for completed Clock In / Clock Out events):**

Each completed timeline node now includes a mini map:

- **Clock In Node (completed):**
  - Green filled circle (24px) with white checkmark — existing pattern
  - Right of circle:
    - "Clock In" in Inter 14px semibold #1A1A1A
    - "9:02 AM" in Inter 13px medium #1F6F43
    - "1234 Oak Street, Suite 5" in Inter 12px regular #6B7280
  - **Mini map (8px below the address text):**
    - Small rectangular map preview: 200px wide × 80px tall, border-radius 8px, overflow hidden
    - Shows a map thumbnail centered on the recorded GPS location with a small green pin
    - Thin border 0.5px #E5E7EB around the map
    - Tapping the mini map opens the full map in device maps app
  - **Location match badge (4px below mini map):**
    - If matched: Small inline badge — green check (12px) + "Location verified" in Inter 10px #1F6F43
    - If mismatched: Amber warning (12px) + "1.2 km from expected" in Inter 10px #F59E0B

- **Clock Out Node (completed):**
  - Same structure as Clock In but with Clock Out data
  - Its own mini map showing the checkout location
  - If checkout location differs from check-in location (e.g., transportation shift where you drop off at a different address), both maps show distinct pins — this is expected and normal, no warning needed

- **In Progress Node (currently on shift — between Clock In and Clock Out):**
  - Blue pulsing circle — existing pattern
  - "In Progress" label
  - "Currently on shift · 2h 15m elapsed" in Inter 12px #1E5FA6
  - No mini map (location is only captured at check-in/out moments, not continuously tracked)

**Updated Total Hours Row (at bottom of timeline):**
- "Total Hours:" left → "4h 06m" right in Inter 14px semibold #1F6F43
- Below: "Scheduled: 4h 00m · Overtime: +6m" in Inter 11px regular #9CA3AF (only shows if overtime exists)

---

**PART C: EARLY CHECK-IN AND LATE CHECK-IN HANDLING**

**Early Check-In (more than 15 minutes before shift start):**
- On the Check-In confirmation screen, add a notice card below the location status:
- Compact banner: background #EBF5FF, border-radius 12px, padding 12px 16px
- Info icon (18px, #1E5FA6) + "You're checking in 23 minutes early. Your actual start time (9:02 AM) will be recorded." in Inter 13px regular #1E5FA6
- Check-in is allowed — just informational

**Late Check-In (after scheduled shift start time):**
- Notice card: background #FEF2F2, border-radius 12px, padding 12px 16px
- LEFT BORDER ACCENT: 3px solid #DC2626
- Warning icon (18px, #DC2626) + "You're checking in 12 minutes late. Scheduled start was 9:00 AM. Your actual check-in time (9:12 AM) will be recorded and flagged." in Inter 13px regular #DC2626
- Check-in is allowed — the system records the actual time honestly

**Forgot to Check Out (auto-close):**
- If staff doesn't check out within 30 minutes after scheduled shift end:
- System auto-records checkout at the scheduled end time
- Shift Timeline shows: Clock Out node with amber warning — "Auto-closed · Staff did not check out" in Inter 12px #F59E0B
- No mini map for auto-closed checkout (no GPS data captured)
- Owner is notified: "Sarah Johnson's shift was auto-closed — no check-out recorded"

---

**PART D: OWNER VISIBILITY — WHAT THE OWNER SEES**

On the owner's dashboard / shift management screens, each shift shows the geo-tracked data:

**Owner's Shift Detail view includes:**
- Clock In: Time + address + mini map + "Location verified" or "Mismatch: 1.2 km away" badge
- Clock Out: Same structure
- Any flags: Late check-in, location mismatch, auto-closed checkout — all highlighted with amber/red indicators
- This gives owners full audit trail visibility without needing to request reports from staff

---

**Overall Design & Behavior Notes:**
- The full-screen Check-In confirmation with map preview feels appropriately serious — this is a geo-tracked, timestamped action with legal/compliance implications in child services. It shouldn't feel like a casual button tap.
- The large timestamp display (Poppins 32px) on the confirmation screen makes the recorded time unmistakably clear — no "I didn't know what time was recorded" disputes
- GPS blocking is non-negotiable — the system cannot function without location verification. The "Open Settings" button makes it easy to resolve, and the messaging is clear without being aggressive.
- Location mismatch is a warning, not a blocker — there are legitimate reasons to check in from a nearby location (parked across the street, at a neighbor's, etc.). The amber visual treatment creates accountability without preventing work.
- Mini maps on the Shift Timeline are powerful for owner review — they can visually confirm "yes, staff was at the right place" without reading addresses. This is a premium feature that most competitor apps lack.
- The checkout flow adds duration summary — staff immediately see their total hours, overtime, and comparison to scheduled time. This prevents payroll disputes.
- Auto-close after 30 minutes protects against forgotten checkouts — the system maintains data integrity even when staff forget. The amber flag ensures owners know it was auto-closed, not a genuine checkout.
- The redirect from Check-Out success to "Write Shift Report" is a smart UX chain — staff complete the physical action (checkout) and immediately flow into the documentation action (report). This captures information while it's fresh.
- All geo-data is for accountability and safety, not surveillance — the messaging should feel professional ("location verified") not punitive ("we're tracking you"). The green checkmark for location match reinforces positive behavior.

---

Now want me to compile everything into a final summary document?