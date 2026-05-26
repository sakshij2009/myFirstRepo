This is complex but very realistic. So the transportation flow needs to handle:

- **Cancel options:** Cancel one client OR cancel entire route
- **Unlimited clients per route** (owner decides)
- **Any combination of pickup/drop-off addresses:** Same pickup same drop-off, same pickup different drop-off, different pickup same drop-off, different pickup different drop-off
- **Confirm each client individually** at pickup
- **Confirm visit arrival AND visit completion** separately
- **Then confirm each client's drop-off individually**

This changes the entire architecture. Instead of a simple 3-step flow (Pickup → Visit → Drop-off), we need a **dynamic multi-client stepper** that adapts based on how many clients and which addresses are unique.

---

**Figma Make Prompt — Multi-Client Transportation Flow (Complete Redesign)**

---

Redesign the Complete Shift / Transportation route flow for "Family Forever" staff mobile app. The new flow supports multiple clients per route with any combination of pickup and drop-off addresses. Staff confirms each client individually at each stop, can cancel individual clients or the entire route, and confirms visit arrival and completion separately. Frame size: 390×844 (iPhone 14/15 Pro). Match the existing design language.

**Design System (consistent across all screens):**
- Primary green: #1F6F43
- Background: #F8F8F6 (warm off-white)
- Headings: Poppins — bold/semibold
- Body: Inter — regular/medium
- Card style: White background, border-radius 16px, shadow 0 2px 8px rgba(0,0,0,0.04), 20px internal padding
- Page padding: 20px horizontal

---

**SCREEN HEADER (consistent throughout):**

- Left: Back arrow (24px, #1A1A1A) — with confirmation if route is active
- Center: "Complete Shift" in Poppins 18px semibold #1A1A1A
- Below: "Thu, 20 Mar · 2:00 – 6:00 PM" in Inter 13px regular #9CA3AF
- Right: Live km pill "4.2 km" background #F0FDF4, text #1F6F43, Inter 12px semibold, border-radius 16px

---

**SMART ROUTE PROGRESS BAR (replaces the simple 3-dot stepper):**

The progress bar now adapts dynamically based on the number of unique stops. Instead of just "Pickup → Visit → Drop-off", it shows every actual stop the staff needs to make.

**Example: 3 clients, 2 pickup addresses, 1 visit, 2 drop-off addresses:**
Progress bar shows: ● Pickup A → ● Pickup B → ● Visit → ● Drop-off A → ● Drop-off B (5 dots)

**Example: 2 clients, same pickup, same drop-off:**
Progress bar shows: ● Pickup → ● Visit → ● Drop-off (3 dots, but pickup/drop-off show "2 clients" badge)

**Progress bar design:**
- Horizontal row of circles (20px each for 3-4 stops, 16px each for 5+ stops) connected by a line (2px)
- Completed: Solid green #1F6F43 with white checkmark
- Active: Green with pulse animation
- Upcoming: Outlined gray #D1D5DB
- Labels below each: "Pickup A", "Pickup B", "Visit", "Drop A", "Drop B" in Inter 9px
- If a stop has multiple clients: Small count badge (14px circle, #1F6F43, white text "2") overlapping the top-right of the circle

---

**CLIENT ROSTER CARD (NEW — shown at the top of the route, always visible):**

White card, 16px border-radius, soft shadow, 16px padding. This gives staff an overview of all clients on this route.

**Card header row:**
- Left: People icon (18px, #1F6F43) + "Clients on this route" in Poppins 13px semibold #1A1A1A
- Right: Count badge "3 clients" in Inter 11px semibold #1F6F43, background #F0FDF4, border-radius 12px, padding 3px 10px

**Client mini-rows (compact, 8px gap between rows):**
Each client is a single compact row, 40px height:
- Left: Avatar (28px) with initials
- Middle: Client name Inter 13px semibold #1A1A1A + Seat type pill (if applicable) Inter 10px, background #F3F4F6, border-radius 6px, padding 2px 8px
- Right: Status indicator that updates as the route progresses:
  - Before pickup: Gray dot (8px) + "Waiting" Inter 10px #D1D5DB
  - Picked up: Green dot + "In vehicle" Inter 10px #1F6F43
  - At visit: Blue dot + "Visiting" Inter 10px #1E5FA6
  - Dropped off: Green checkmark (12px) + "Complete" Inter 10px #1F6F43
  - Cancelled: Red X (12px) + "Cancelled" Inter 10px #DC2626

**Example with 3 clients:**
- Row 1: "MC" avatar + "Michael Chen" + "Car Seat" pill → "Waiting"
- Row 2: "AT" avatar + "Adriana Torres" + "Booster" pill → "Waiting"
- Row 3: "LK" avatar + "Liam Kim" → "Waiting"

---

**PHASE 1: PICKUPS**

The system groups clients by pickup address. If 2 clients share the same address, they appear together at one stop. If they have different addresses, each address is a separate stop.

**Scenario A: Multiple clients at SAME pickup address**

**Active Stop Card:**
- White card, 16px border-radius, soft shadow, 20px padding
- **Card header:**
  - Green circle (40px) with car icon
  - "Pickup — 1234 Oak Street, Suite 5" in Poppins 15px semibold #1A1A1A
  - "2 clients at this location" in Inter 12px regular #6B7280
  - "2:00 PM" scheduled time, right-aligned, Inter 12px #9CA3AF

- **Map + Navigation (same as before):**
  - Embedded map 180px showing route to pickup address
  - "Open Full Navigation" button — solid #1F6F43

- **Individual Client Confirmation Checklist:**
  - Section label: "Confirm each client pickup:" in Inter 13px semibold #1A1A1A
  - Each client is a confirmable row:

  **Client Row — Not yet confirmed:**
  - White background, border 1.5px #E5E7EB, border-radius 12px, padding 14px, margin-bottom 10px
  - Left: Avatar (36px) "MC" + "Michael Chen" Inter 14px semibold #1A1A1A + "Car Seat" pill below
  - Right: "Confirm Pickup" pill button — background #F0FDF4, text #1F6F43, Inter 12px semibold, border-radius 20px, padding 8px 16px, tappable
  - Far right: Small "X" cancel icon (20px, #D1D5DB) — tapping opens cancel options

  **Client Row — Confirmed (after tapping "Confirm Pickup"):**
  - Background shifts to #F0FDF4 (lightest green), border 1.5px #1F6F43
  - Left: Avatar + name (same)
  - Right: Green checkmark circle (24px, #1F6F43 background, white check) + "Picked up · 2:05 PM" Inter 11px #1F6F43
  - GPS location auto-captured at confirmation time
  - Cancel icon disappears — can't cancel after confirming pickup

  **Client Row — Cancelled:**
  - Background #FEF2F2 (lightest red), border 1.5px #DC2626, opacity 0.7
  - Left: Avatar + name with strikethrough text
  - Right: Red X circle (24px) + "Cancelled" Inter 11px #DC2626
  - Row is non-interactive after cancellation

**Scenario B: Clients at DIFFERENT pickup addresses**

If Client A is at Address 1 and Client B is at Address 2, the system creates two separate pickup stops:

- **Stop 1: "Pickup — 1234 Oak Street" (Client A only)**
  - Same card structure but showing only Client A
  - After confirming Client A, the "Next Stop" button appears

- **Stop 2: "Pickup — 789 Elm Drive" (Client B only)**
  - Navigate to the second address
  - Confirm Client B pickup
  - After confirming, proceed to Visit

---

**CANCEL OPTIONS (when staff taps the X icon on a client row):**

**Cancel Bottom Sheet (slides up from bottom):**
- Background overlay: rgba(0,0,0,0.4)
- White sheet, border-radius 20px 20px 0 0, padding 24px 28px 32px

- **Sheet header:** "Cancel Pickup" in Poppins 16px semibold #1A1A1A
- "Michael Chen — 1234 Oak Street" in Inter 13px #6B7280

- **Reason selection (required):**
  - Section label: "Reason:" in Inter 13px semibold #374151
  - Tappable pill options (wrapping row, 8px gap):
    - "Client not available"
    - "Client refused"
    - "Wrong address"
    - "Safety concern"
    - "Other"
  - Unselected: Background #F3F4F6, text #6B7280
  - Selected: Background #DC2626, white text

- **Notes field:** Optional text area, placeholder "Add details (optional)", 80px height, background #F9FAFB, border 1px #E5E7EB, border-radius 10px

- **Two action buttons (16px below, stacked):**
  - "Cancel This Client Only" — outlined red, 1.5px border #DC2626, text #DC2626, Inter 14px semibold, height 48px, border-radius 12px, full width. Below in Inter 11px #9CA3AF: "Route continues with remaining clients"
  - "Cancel Entire Route" — text-only button, Inter 14px medium #DC2626, centered, 12px below. Tapping shows secondary confirmation: "Cancel the entire transportation shift? All clients will be removed and the owner will be notified."
  - "Go Back" — text link Inter 14px #6B7280, centered, 8px below

---

**BOTTOM ACTION BAR FOR PICKUPS:**

The bottom button changes dynamically based on client confirmation status:

- **No clients confirmed yet:** Button disabled (opacity 0.4): "Confirm all clients to continue"
- **Some clients confirmed, some remaining:** Button shows progress: "1 of 2 confirmed — Continue confirming"
- **All clients at this stop confirmed:** Button active: "All Picked Up — Drive to Visit ➜" solid #1F6F43, white text, height 54px
- **All clients at this stop confirmed OR cancelled (at least 1 confirmed):** Same active button
- **All clients cancelled:** Button changes to "Return — No Clients" solid #DC2626, white text — ends the route

---

**PHASE 2: VISIT**

After all pickups are complete, staff drives to the visit location.

**State 2A — Driving to Visit:**
- Completed pickup stops collapse into compact cards at top (green left-border, showing confirmed client names + times)
- Active card shows visit destination with map + navigation
- Blue color scheme (#1E5FA6) for visit phase

**State 2B — Arrived at Visit (two sub-actions: Arrive + Complete):**

**Arrival Confirmation:**
- Staff taps "I've Arrived at Visit"
- GPS captured, timestamp recorded
- Card transitions to "At Visit Location" state

**At Visit — Client Activity Tracking:**
- Timer starts: "Visit duration: 0h 0m" live counting
- Client checklist showing who is present at the visit:

**Client Visit Row:**
- Each client who was picked up (not cancelled) has a row:
- Avatar + name + "Present at visit" green checkmark
- If a client needs to be noted as not participating: staff can tap to mark "Not participating" with a reason

**Visit Complete Confirmation:**
- After the visit activities are done, staff taps "Visit Complete"
- This is separate from arrival — arrival just marks "I'm here", completion marks "activities are finished, ready to leave"
- System records visit duration (arrival time → completion time)

**Bottom Action Bar:**
- On arrival: "Visit Complete — Ready to Leave ➜" (initially disabled until at least 5 minutes have passed — prevents accidental immediate completion)
- After 5 min: Button becomes active, solid #1E5FA6, white text

---

**PHASE 3: DROP-OFFS**

Same logic as pickups but in reverse — grouped by drop-off address.

**Scenario A: All clients go to SAME drop-off address:**
- Single stop showing all clients
- Staff confirms each client individually: "Confirm Drop-off" per client
- Each confirmation captures GPS + timestamp

**Scenario B: Clients have DIFFERENT drop-off addresses:**
- Multiple stops, each showing only the clients for that address
- Staff navigates between drop-off locations
- Confirms clients at each stop

**Client Drop-off Row (same structure as pickup rows):**
- Not yet confirmed: White background, "Confirm Drop-off" pill button
- Confirmed: Green background, checkmark + "Dropped off · 5:45 PM"
- Each drop-off captures GPS location

**Coral color scheme (#D85A30) for drop-off phase** — matching the previous design

---

**PHASE 4: ROUTE SUMMARY (after all drop-offs complete)**

**Route Complete Success:**
- Green circle (64px) with checkmark animation
- "Route Complete!" Poppins 20px bold #1F6F43
- "All clients delivered safely" Inter 14px #9CA3AF

**Summary Card:**
- **Client-by-client breakdown:**
  - Each client gets a compact summary row:
  - "Michael Chen" → Pickup 2:05 PM → Visit 3:00 PM → Drop-off 5:45 PM → "Complete ✓"
  - "Adriana Torres" → Pickup 2:05 PM → Visit 3:00 PM → Drop-off 6:00 PM → "Complete ✓"
  - If cancelled: "Liam Kim" → "Cancelled at Pickup — Client not available" in #DC2626

- **Kilometer Summary:**
  - Total Distance: "22.8 km" (auto-calculated from GPS)
  - Leg breakdown: "Pickup A → Visit: 8.5 km", "Visit → Drop-off A: 10.2 km", "Drop-off A → Drop-off B: 4.1 km"
  - Total Drive Time: "48 min"
  - Visit Duration: "1h 30m"

- **End Meter Reading** input field (optional)
- **Receipt Upload** area
- **Submit Report** button

---

**EDGE CASE HANDLING:**

**1. Only 1 client on the route (simple case):**
- Client roster card shows 1 client
- Progress bar shows simple 3 stops: Pickup → Visit → Drop-off
- No multi-client checklist — single "Confirm Pickup" button for the one client
- Flow feels identical to the original simple flow but with the improved confirmation steps

**2. Client cancelled mid-route (after pickup, before drop-off):**
- This shouldn't happen normally (client is in the vehicle), but if an emergency occurs:
- Staff can tap the client's row in the roster card → "Report Issue" → options: "Client picked up early by parent", "Medical emergency", "Behavioral issue — returning client"
- The client is marked as "Early removal" with timestamp and reason
- Route continues for remaining clients

**3. All clients cancelled at pickup:**
- Route ends, staff taps "Return — No Clients"
- Summary shows all cancellations with reasons
- Owner is notified immediately

**4. GPS signal lost during drive:**
- Live tracking strip shows amber warning: "GPS signal weak — distance may be approximate"
- Km counter continues with last known trajectory
- When signal returns, it recalculates

**5. Staff arrives at wrong address:**
- Location mismatch banner (amber) appears when staff taps "I've Arrived"
- Staff can proceed anyway (location mismatch is logged) or navigate to correct address

---

**OVERALL UX DESIGN PHILOSOPHY:**

- **One action at a time** — the screen always focuses on the CURRENT task. Staff never sees all stops with equal weight. The active stop is the hero, completed stops collapse, upcoming stops are dimmed.
- **Individual client accountability** — every client pickup and drop-off is confirmed separately. No "I picked up all 3 at once" blanket action. This creates an audit trail per child.
- **Cancel is always available but never easy** — the X icon is small and requires a reason + confirmation. This prevents accidental cancellations while keeping the option accessible.
- **Color progression tells the story** — Green (pickup phase) → Blue (visit phase) → Coral (drop-off phase). Staff always knows which phase they're in.
- **The client roster card is always visible** — like a passenger manifest. Staff can glance up and see who is in the vehicle, who has been dropped off, and who was cancelled. Real-time status dots update as the route progresses.
- **Smart stop grouping** — the system automatically groups clients by address. If 3 clients share the same pickup, it's one stop with 3 confirmations. If they have different addresses, it's 3 separate stops with navigation between each. Staff doesn't need to figure this out — the system presents the optimal route.
- **Visit has two distinct moments** — "I arrived" and "Visit complete" are separate because staff might arrive at 3:00 PM but the visit activities don't finish until 4:30 PM. The system needs both timestamps for billing and reporting.
- **Auto km calculation runs throughout** — from the moment the route starts to the final drop-off. Each leg is tracked separately for accurate reimbursement. Staff never needs to manually enter distances.

---

Want me to refine any part of this or move to the next thing?