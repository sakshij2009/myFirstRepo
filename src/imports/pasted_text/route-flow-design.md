Perfect — so staff controls when to mark each stop (manual tap), but gets Google Maps navigation built in and automatic km tracking between stops. This gives staff flexibility while still maintaining accountability.

---

**Figma Make Prompt — Active Transportation Route Flow (Step-by-Step Driving Experience)**

---

Design an active, step-by-step transportation route experience for "Family Forever" staff mobile app. This replaces the current static route display with an interactive driving flow where staff progresses through each stop (Pickup → Visit → Drop-off) with navigation, manual location capture, and automatic kilometer tracking. Frame size: 390×844 (iPhone 14/15 Pro). Match the existing design language.

**Design System (consistent across all screens):**
- Primary green: #1F6F43
- Background: #F8F8F6 (warm off-white)
- Headings: Poppins — bold/semibold
- Body: Inter — regular/medium
- Card style: White background, border-radius 16px, shadow 0 2px 8px rgba(0,0,0,0.04), 20px internal padding
- Page padding: 20px horizontal

---

**CONCEPT: STEPPER-BASED ROUTE PROGRESSION**

The route screen works like a wizard — staff sees ONE active step at a time, with the completed steps collapsed above and upcoming steps dimmed below. Each step has two phases: "Driving to location" and "Arrived at location." This creates a clear, focused experience instead of showing everything at once.

---

**SCREEN HEADER (consistent throughout the route):**

- Left: Back arrow (24px, #1A1A1A) — returns to Shift Detail. If actively driving, shows a confirmation dialog: "Leave navigation? Your route progress is saved."
- Center: "Complete Shift" in Poppins 18px semibold #1A1A1A
- Below title: "Thu, 20 Mar · 2:00 – 6:00 PM" in Inter 13px regular #9CA3AF
- Right: Km counter — live updating pill badge showing total distance driven so far: "4.2 km" in Inter 12px semibold #1F6F43, background #F0FDF4, border-radius 16px, padding 4px 12px. This updates in real-time from GPS as staff drives.

**ROUTE PROGRESS BAR (12px below header):**
- Horizontal progress indicator showing the 3 stops
- Full width within page padding, height 40px
- Three circles (28px each) connected by a line (2px), equally spaced:
  - Completed stop: Solid #1F6F43 green filled circle with white checkmark (12px)
  - Active/current stop: Solid #1F6F43 green circle with white center dot, subtle pulse animation
  - Upcoming stop: Outlined #D1D5DB gray circle, empty
- Connecting lines: Completed segment = solid 2px #1F6F43. Active segment = 2px #1F6F43 with animated dash (moving dots showing travel). Upcoming segment = 2px dashed #D1D5DB.
- Labels below each circle: "Pickup" / "Visit" / "Drop-off" in Inter 10px medium. Active label in #1F6F43, completed in #6B7280, upcoming in #D1D5DB.

---

**STEP 1: PICKUP (3 sub-states)**

**State 1A — Driving to Pickup (initial state when route starts):**

**Active Step Card (the hero card — takes most of the screen):**
- White card, 16px border-radius, soft shadow, 20px padding
- **Card header row:**
  - Left: Large green circle (40px) with white car icon (20px) inside
  - Middle (12px gap): "Drive to Pickup" in Poppins 16px semibold #1A1A1A. Below: "1234 Oak Street, Suite 5" in Inter 14px regular #6B7280. Below: "ETA: 12 min · 4.2 km" in Inter 13px medium #1F6F43
  - Right: Small "2:00 PM" scheduled time in Inter 12px #9CA3AF

- **Integrated Map View (16px below header, inside the card):**
  - Full card width map area, height 200px, border-radius 12px, overflow hidden
  - Shows Google Maps with the route from current staff location to the pickup address
  - Blue route line drawn on the map showing the driving path
  - Staff's current position: Blue pulsing dot
  - Destination pin: Green branded pin (#1F6F43) at the pickup address
  - Map is interactive — staff can pinch to zoom, pan around
  - Turn-by-turn overlay at the top of the map: "In 200m, turn right onto Oak Street" in Inter 13px semibold white, on a semi-transparent dark bar (rgba(0,0,0,0.7), border-radius 8px, padding 8px 14px) positioned at top of the map area

- **Navigation Button (16px below map):**
  - Full width: Green Google Maps icon (20px) + "Open Full Navigation" — solid #1F6F43, white text Inter 14px semibold, height 48px, border-radius 12px
  - Tapping opens Google Maps with the route pre-loaded for full turn-by-turn navigation
  - Below button: "Or use the mini map above" in Inter 11px #9CA3AF, centered

- **Live Tracking Strip (16px below navigation button, inside the card):**
  - Compact row: background #F9FAFB, border-radius 10px, padding 12px 16px
  - Three stats horizontal:
    - Left: Speedometer icon (14px, #6B7280) + "32 km/h" Inter 12px medium #1A1A1A
    - Center: Route icon (14px, #6B7280) + "4.2 km driven" Inter 12px medium #1A1A1A
    - Right: Clock icon (14px, #6B7280) + "8 min elapsed" Inter 12px medium #1A1A1A
  - These update in real-time from GPS

**Upcoming Stops (collapsed, below the active card, 16px gap):**
- Dimmed compact rows showing what's next — not full cards, just preview lines:
- Row 1: Blue dot (8px) + "Visit Location · 500 City Hall Plaza · 3:00 PM" in Inter 13px #D1D5DB
- Row 2: Red dot (8px) + "Drop-off · 789 Maple Avenue, Apt 3 · 6:00 PM" in Inter 13px #D1D5DB

**Bottom Action Bar (fixed at bottom, above tab bar):**
- Full width button: "I've Arrived at Pickup" — outlined, 2px border #1F6F43, text #1F6F43, Poppins 15px semibold, height 54px, border-radius 14px
- This button is OUTLINED (not solid) because arriving is a checkpoint, not the final action
- Below button: "Tap when you reach the pickup location" in Inter 11px #9CA3AF, centered

---

**State 1B — Arrived at Pickup (after staff taps "I've Arrived"):**

When staff taps "I've Arrived at Pickup":
1. GPS location is captured
2. Timestamp is recorded
3. The card transitions to the "at location" state

**Active Step Card updates:**
- Card header changes: Green circle icon changes to a location pin with checkmark → "At Pickup Location" in Poppins 16px semibold #1F6F43
- "Arrived at 2:05 PM" in Inter 13px medium #1F6F43
- "1234 Oak Street, Suite 5" in Inter 14px regular #6B7280

- **Location Confirmation Banner (replaces the map):**
  - Background #F0FDF4, border-radius 12px, padding 16px
  - Green checkmark circle (32px) + "Location captured" in Inter 14px semibold #1F6F43
  - "43.6532° N, 79.3832° W" in Inter 11px #9CA3AF
  - Small mini map (full width × 80px, border-radius 8px) showing the captured GPS point with green pin

- **Pickup Actions (16px below confirmation):**
  - "Client: Emma Thompson" in Inter 14px semibold #1A1A1A with avatar (32px) "ET"
  - "Confirm you've picked up the client" in Inter 13px #6B7280

**Bottom Action Bar:**
- Full width button: "Pickup Complete — Start Driving to Visit ➜" — solid #1F6F43, white text Poppins 15px semibold, height 54px, border-radius 14px
- This is SOLID green because it's the primary progression action
- Tapping marks pickup as complete and transitions to Step 2

---

**STEP 2: VISIT LOCATION (same pattern, different content)**

**State 2A — Driving to Visit:**

**Completed Pickup (collapsed at top):**
- Compact card, 12px border-radius, background #F9FAFB, 14px padding
- Green checkmark (16px) + "Pickup Complete" in Inter 13px semibold #1F6F43 + "2:05 PM · 1234 Oak Street" in Inter 12px #9CA3AF + "4.2 km" right-aligned in Inter 12px #6B7280
- Thin green left-border 3px #1F6F43
- This card is collapsed and non-interactive — just a reference

**Active Step Card (hero — same structure as Step 1A but for Visit):**
- Large blue circle (40px) with car icon — blue (#1E5FA6) because this is the visit stop, differentiating from green pickup
- "Drive to Visit Location" in Poppins 16px semibold #1A1A1A
- "500 City Hall Plaza" address
- "ETA: 18 min · 8.5 km" in Inter 13px medium #1E5FA6
- Map view showing route to visit location
- Google Maps navigation button
- Live tracking strip (km, speed, time)

**Bottom Action Bar:**
- "I've Arrived at Visit Location" — outlined, 2px border #1E5FA6, text #1E5FA6, height 54px

**State 2B — At Visit Location:**
- Location captured, mini map shows GPS point
- "Client visit in progress" status
- Timer showing how long staff has been at the visit: "Visit duration: 1h 15m" — live updating
- Notes: "Any visit notes can be added to your shift report"

**Bottom Action Bar:**
- "Visit Complete — Start Driving to Drop-off ➜" — solid #1E5FA6, white text, height 54px

---

**STEP 3: DROP-OFF (final stop)**

**State 3A — Driving to Drop-off:**

**Completed Steps (collapsed at top, stacked):**
- Pickup: Compact green card (same as before)
- Visit: Compact blue card with visit duration "1h 30m at location"

**Active Step Card:**
- Large red/coral circle (40px) with flag icon — coral (#D85A30) because this is the final stop
- "Drive to Drop-off" in Poppins 16px semibold
- "789 Maple Avenue, Apt 3" address
- Map + navigation + live tracking

**Bottom Action Bar:**
- "I've Arrived at Drop-off" — outlined coral

**State 3B — At Drop-off Location:**
- Location captured
- "Client: Emma Thompson — Confirm drop-off"

**Bottom Action Bar:**
- "Drop-off Complete ✓" — solid coral (#D85A30), white text

---

**STEP 4: ROUTE SUMMARY (after all 3 stops completed)**

After the final drop-off, the route screen transitions to a summary view:

**Route Complete Success (top of screen):**
- Large green circle (64px) with white checkmark (28px) — scale animation
- "Route Complete!" in Poppins 20px bold #1F6F43, centered
- "All 3 stops completed" in Inter 14px #9CA3AF

**Route Summary Card (16px below success):**
- White card, 16px border-radius, soft shadow, 20px padding
- Card header: "Route Summary" in Poppins 14px semibold #1A1A1A

- **Completed stops timeline (compact):**
  - Row 1: Green dot → "Pickup · 1234 Oak Street · 2:05 PM" → "✓"
  - Row 2: Blue dot → "Visit · 500 City Hall Plaza · 3:00 PM – 4:30 PM (1h 30m)" → "✓"
  - Row 3: Coral dot → "Drop-off · 789 Maple Avenue · 6:00 PM" → "✓"
  - Connecting line between dots, all green (completed)

- **Kilometer Summary (16px below timeline, thin divider above):**
  - Three stat blocks horizontal:
    - "Total Distance" → "22.8 km" in Poppins 20px bold #1A1A1A
    - "Drive Time" → "48 min" in Poppins 20px bold #1A1A1A
    - "Stops" → "3 of 3" in Poppins 20px bold #1F6F43
  - Labels in Inter 11px #9CA3AF above values

- **Leg-by-leg breakdown (12px below stats):**
  - Compact rows showing km between each stop:
  - "Pickup → Visit: 8.5 km · 18 min"
  - "Visit → Drop-off: 14.3 km · 30 min"
  - Inter 13px regular #6B7280

**End Meter Reading Card (16px below route summary):**
- White card, 16px border-radius, soft shadow, 20px padding
- "End Meter Reading" label in Poppins 14px semibold #1A1A1A
- Input field: Background #F9FAFB, border 1.5px #E5E7EB, border-radius 12px, height 52px, placeholder "Enter reading" in Inter 15px #D1D5DB, padding 16px
- "Optional — for vehicle odometer verification" in Inter 11px #9CA3AF below input

**Receipt Upload Card (16px below meter reading):**
- White card, 16px border-radius, soft shadow, 20px padding
- "Fuel & Mileage Receipts" in Poppins 14px semibold #1A1A1A
- Dashed upload area: 2px dashed #D1D5DB, border-radius 12px, height 80px, background #F9FAFB
- Upload icon (24px, #9CA3AF) + "Tap to upload receipt" Inter 13px #6B7280
- "JPEG, PNG, or PDF · Max 10MB" in Inter 11px #D1D5DB

**Submit Button (24px below):**
- Full width: "Submit Report" — solid #1F6F43, white text Poppins 16px semibold, height 56px, border-radius 14px, shadow 0 4px 12px rgba(31,111,67,0.2)

---

**REAL-TIME KILOMETER TRACKING BEHAVIOR:**

- When staff taps "Pickup Complete — Start Driving to Visit", the system begins GPS tracking in the background
- The km counter in the header pill updates every few seconds as staff drives
- Each leg (Pickup→Visit, Visit→Drop-off) is tracked separately
- Total km is the sum of all legs
- The auto-calculated km is shown in the route summary but staff can override with the meter reading if needed
- If GPS signal is lost temporarily, the system interpolates and shows "GPS signal weak" warning in the live tracking strip with an amber indicator
- Battery optimization notice: "Keep the app open for accurate tracking" shown once when route starts

**COLOR CODING PER STOP TYPE:**
- Pickup: Green (#1F6F43) — matches the brand, feels like "start"
- Visit: Blue (#1E5FA6) — differentiates, feels like "in progress"
- Drop-off: Coral (#D85A30) — warm, feels like "destination/end"
- This color coding is consistent in the progress bar circles, the active card icon, and the button colors at each step

**OVERALL UX PHILOSOPHY:**
- Staff should NEVER have to think "what do I do next?" — the active card tells them exactly: you're driving here, tap when you arrive, confirm the action, move to next step
- One action at a time — the bottom bar always has ONE button showing the single next action
- Completed steps collapse into compact reference cards so they don't clutter the screen but remain visible for context
- The map + navigation is integrated, not an afterthought — staff doesn't need to switch between apps
- The live km/speed/time strip creates a sense of active tracking — staff knows the system is recording their drive
- The progress bar at top gives instant orientation — "I'm on stop 2 of 3, almost done"
- Auto km calculation removes manual data entry burden — staff drives, system calculates, everyone wins

---

Want me to refine anything or move on to another feature?