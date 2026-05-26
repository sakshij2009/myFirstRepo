For medication logging, I'm going with a **checklist style with one-tap time stamp**. Here's my reasoning: Staff already have the medication schedule pre-loaded (owner sets it up). During the shift, staff just need to confirm "I gave this medication at this time." A checklist with a single tap to mark "Administered" + auto-captured time is the fastest possible interaction. No calendar grid (that's for monthly overview, better for owner), no form fields to fill. One tap per dose — done.

---

**Figma Make Prompt — Staff Reports Screen (Reports, Medications, Transportations Tabs)**

---

Design a premium mobile "Reports" screen for "Family Forever" — a child services management platform. This screen is where staff complete shift documentation during their active shift. It has 3 tabs: Reports (daily shift report + other actions), Medications (one-tap medication logging), and Transportations (kilometer tracking + receipt uploads). Frame size: 390×844 (iPhone 14/15 Pro). Match the existing owner mobile design language.

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

**TOP HEADER (consistent across all 3 tabs):**

**Header area (56px):**
- Left: Back arrow (24px, #1A1A1A) — returns to Shift Detail screen
- Center: "Reports" in Poppins 18px semibold #1A1A1A
- Right: Empty
- Below title, 4px gap: "kibo Gin | Intake Worker" in Inter 12px regular #9CA3AF (staff name + role, matching owner UI)

**Client Selector (16px below header):**
- Compact row: Client avatar (40px) teal/green circle with initials "JW" + "Joseph" in Inter 15px semibold #1A1A1A + "ID: 6587879" in Inter 12px #9CA3AF + dropdown chevron (16px, #6B7280) on the right
- Background: white card style, 12px border-radius, soft shadow, 12px padding
- The dropdown allows switching between assigned clients if the staff has multiple clients on the same shift (rare but possible)

**Tab Bar (12px below client selector):**
- Three tabs horizontally, equally spaced, bottom-border style (matching owner UI tabs exactly):
- "Reports" | "Medications" | "Transportations"
- Active tab: Inter 14px semibold #1A1A1A with 2px solid #1F6F43 green bottom border
- Inactive tabs: Inter 14px regular #9CA3AF, no bottom border
- Default active: "Reports"

---

**TAB 1: REPORTS**

**Report Summary Card (16px below tabs):**
- White card, 16px border-radius, soft shadow, 20px padding
- LEFT BORDER ACCENT: 4px solid #1F6F43 (green) — active report
- Card header: "Report 1" in Poppins 16px semibold #1A1A1A
- **Shift meta information rows (matching owner UI report layout exactly):**
  - Each row has an icon (16px, #6B7280) + label + value
  - Row 1: Calendar icon + "Date:" in Inter 13px regular #6B7280 → "10/02/2001" in Inter 13px semibold #1A1A1A
  - Row 2: Person icon + "Staff Name:" → "Benjamin Harris"
  - Row 3: ID badge icon + "Staff ID:" → "9987775"
  - Row 4: Person icon + "Client Name:" → "Joseph"
  - Row 5: Clock icon + "Shift Time:" → "08:30 – 13:30"
  - 8px vertical gap between each row
  - This section is auto-populated from the shift data — staff doesn't fill this manually

**Shift Timeline Card (16px below report card):**
- White card, 16px border-radius, soft shadow, 20px padding
- Card header: "Shift Timeline" in Poppins 14px semibold #1A1A1A
- **Timeline (matching owner UI exactly):**
  - Clock In node: Green filled circle (32px) with white checkmark → "Clock In" in Inter 14px semibold #1A1A1A. Below: "9:30 AM" in Inter 13px #6B7280. Below: "Ontario, 15 BH Street" in Inter 12px #9CA3AF
  - Vertical green connecting line (2px, #1F6F43)
  - Clock Out node: Red/coral filled circle (32px) with white checkmark → "Clock Out" in Inter 14px semibold #1A1A1A. Below: "10:30 PM". Below: "Ontario, 20 Main Street"
  - **Mini maps (below each node):** Small map thumbnails (full card width minus padding × 70px, border-radius 8px) showing the recorded GPS location with a pin. Thin border 0.5px #E5E7EB. Clock In map shows green pin, Clock Out map shows red/coral pin.
- **Total Hours row:** Bottom of card, thin top divider 1px #F3F4F6. "Total Hours:" in Inter 14px medium #6B7280 left → "13 Hours" in Inter 14px semibold #1F6F43 right

**Daily Shift Report Card (16px below timeline):**
- White card, 16px border-radius, soft shadow, 20px padding
- Card header: "Daily Shift Report" in Poppins 14px semibold #1A1A1A
- Description: "Include details about: activities, medications, meals, mood, interactions, health observations, and any concerns." in Inter 13px regular #6B7280, line-height 1.5
- **Text area:**
  - Background #F9FAFB, border 1px #E5E7EB (changes to 1.5px #1F6F43 when focused/active), border-radius 12px, padding 16px, min-height 140px
  - Placeholder: "Begin your report" in Inter 14px regular #D1D5DB
  - Active state shows typed text in Inter 14px regular #1A1A1A
- Character count: "Character count: 0 | Recommended: Minimum 1000 words for the report." in Inter 11px regular #9CA3AF
- Auto-save indicator: Cloud-check icon (12px, #22C55E) + "Auto-saved" in Inter 10px #9CA3AF
- **Action buttons (16px below text area, side by side, 8px gap):**
  - Left: "Download Report" — outlined, 1px border #E5E7EB, download icon (16px) + text Inter 13px medium #1A1A1A, height 44px, border-radius 10px
  - Right: "Submit" — solid #1F6F43, white text Inter 13px semibold, height 44px, border-radius 10px

**Other Actions Section (24px below report card):**
- Section header: "Other Actions" in Poppins 14px semibold #1A1A1A

- **Critical Incident Reporting Card:**
  - White card, 16px border-radius, soft shadow, 20px padding
  - LEFT BORDER ACCENT: 4px solid #DC2626 (red)
  - Warning triangle icon (20px, #DC2626) beside "Critical Incident Reporting" in Inter 15px semibold #1A1A1A
  - Description: "For serious incident requiring immediate management attention" in Inter 13px regular #6B7280
  - Tags: "Self-harm, violence, abuse allegations, serious accidents, medication errors.." in Inter 12px italic #DC2626
  - Full-width button: "Report Critical Incident" — solid #DC2626, white text Inter 14px semibold, height 44px, border-radius 10px

- **Medical Contact Log Card (16px below):**
  - White card, 16px border-radius, soft shadow, 20px padding
  - LEFT BORDER ACCENT: 4px solid #1E5FA6 (blue)
  - Medical clipboard icon (20px, #1E5FA6) beside "Medical Contact Log" in Inter 15px semibold #1A1A1A
  - Description: "Use this form to document medical-related contacts, incidents, or communications involving a client." in Inter 13px regular #6B7280
  - Tags: "medical incidents, emergency care, medication" in Inter 12px italic #1E5FA6
  - Full-width button: "Contact Note" — solid #1E5FA6, white text Inter 14px semibold, height 44px, border-radius 10px

---

**TAB 2: MEDICATIONS (One-Tap Medication Logging)**

This tab is designed for maximum simplicity. The client's medication schedule is pre-loaded by the owner. Staff only need to confirm each dose was administered with a single tap.

**Medication Info Banner (16px below tabs):**
- Compact banner: background #FFF8E1, border-radius 12px, padding 12px 16px
- Pill/capsule icon (18px, #92600A) + "Medications should be administered half an hour before and half an hour after the shift." in Inter 13px regular #92600A, line-height 1.4

**Today's Medication Schedule Card (16px below banner):**
- White card, 16px border-radius, soft shadow, 20px padding
- Card header row: Left — "Today's Medications" in Poppins 14px semibold #1A1A1A. Right — Progress indicator: "2 of 5 given" in Inter 12px medium #1F6F43 with small circular progress ring (20px, 40% filled green)

**Medication Checklist (16px below header):**
Each medication is a tappable row that staff can mark as administered with one tap:

- **Individual Medication Row Structure:**
  - Min-height 72px, thin bottom divider 1px #F3F4F6 between rows
  - Left: Status circle (36px):
    - Pending (not yet due): Outlined gray circle (#D1D5DB), empty
    - Due now (within current time window): Outlined green circle (#1F6F43) with pulsing subtle animation — draws attention
    - Administered: Solid green circle (#1F6F43) with white checkmark (14px)
    - Missed (past the time window, not marked): Solid red circle (#DC2626) with white X (14px)
  - Middle (12px gap from circle):
    - Medication name: "Amoxicillin (antibiotic)" in Inter 14px semibold #1A1A1A (green color #1F6F43 for the name to match owner UI)
    - Dosage + schedule: "500 mg · every 8 hours for 7 days" in Inter 12px regular #6B7280
    - Scheduled time: "Next dose: 3:00 PM" in Inter 12px medium #9CA3AF. If due now: "Due now" in Inter 12px semibold #1F6F43. If administered: "Given at 3:02 PM" in Inter 12px medium #1F6F43. If missed: "Missed — was due at 3:00 PM" in Inter 12px medium #DC2626
  - Right: Time tag pill showing time-of-day category:
    - "Morning" pill — background #FFF8E1, text #92600A, Inter 10px semibold, border-radius 12px
    - "Afternoon" pill — background #F3F0FF, text #5B21B6
    - "Night" pill — background #EBF5FF, text #1E5FA6
    - "Emergency" pill — background #FEF2F2, text #DC2626

- **One-Tap Interaction:**
  - When staff taps a "Due now" or "Pending" medication row:
    - The status circle immediately animates from outlined → solid green with checkmark (200ms)
    - The system auto-captures the current time as "Given at [time]"
    - A small green toast notification slides up from bottom for 2 seconds: "✓ Amoxicillin logged at 3:02 PM" in Inter 13px semibold white on #1F6F43 green background, border-radius 10px
    - The row updates in-place — no modal, no form, no extra taps
  - **Undo:** The toast includes a small "Undo" text button (white, right side) — tapping within 3 seconds reverses the action

- **Example Medications (show 4-5):**
  - Row 1: Amoxicillin 500mg — Morning — Administered ✓ at 7:05 AM
  - Row 2: Amoxicillin 500mg — Afternoon — Due now (3:00 PM window) — pulsing green circle
  - Row 3: Atorvastatin 10mg — Night — Pending (9:00 PM)
  - Row 4: Albuterol inhaler — As needed — Pending (no scheduled time, "Administer as needed" text)
  - Row 5: Amoxicillin 500mg — Night — Pending (11:00 PM)

**Medication Error Logging (16px below checklist, inside the same card):**
- Thin divider 1px #F3F4F6
- Expandable section: Tap to expand
- Header row: Warning icon (16px, #F59E0B) + "Log Medication Error" in Inter 13px medium #F59E0B + chevron down (14px) on right
- **When expanded:**
  - Small form inside the card:
  - Dropdown: "Select medication" — standard select input
  - Text field: "Describe the error" — text area, background #F9FAFB, 80px height, placeholder "e.g., Wrong dosage given, medication missed due to..." Inter 13px
  - Button: "Submit Error Report" — outlined amber, 1.5px border #F59E0B, text #F59E0B, Inter 13px semibold, height 40px, border-radius 10px
  - Note below: "* Medication errors require an incident report" in Inter 11px italic #DC2626

**Pharmacy Information Card (16px below medications card):**
- White card, 16px border-radius, soft shadow, 20px padding
- Pill/pharmacy icon (20px, #DC2626) beside "Pharmacy Information" in Poppins 14px semibold #1A1A1A
- Key-value rows (matching owner UI):
  - "Name:" → "Dr. Tony Wales"
  - "E-Mail:" → "tonywales21@gmail.com" in #1F6F43 (tappable)
  - "Number:" → "+61-364837891" in #1F6F43 (tappable)
  - "Address:" → "123, ABC Park"
- This is read-only reference info — staff can quickly contact the pharmacy if medication questions arise

**Authorization & Signature Card (16px below pharmacy):**
- White card, 16px border-radius, soft shadow, 20px padding
- Card header: "Authorization Administration (Trained):" in Poppins 14px semibold #1A1A1A
- **Name field:** Label "Name" in Inter 13px #6B7280 → text input, height 44px, background #F9FAFB, border 1px #E5E7EB, border-radius 10px
- **Signature field (16px below name):**
  - Label: "Work Signature *" in Inter 13px #6B7280 (red asterisk for required)
  - Signature pad: 280px wide × 140px tall, background #F9FAFB, border 1px #E5E7EB, border-radius 12px
  - Center: Shield/pen icon (40px, #F59E0B on #FFF8E1 circle) + "Tap to Sign" in Poppins 14px semibold #1A1A1A + "Draw your signature above" in Inter 12px #9CA3AF
  - Tapping opens a full-width signature drawing canvas where staff draws their signature with finger
- **Action buttons (16px below signature, side by side):**
  - Left: "Export" — outlined, 1px border #E5E7EB, text #1F6F43, Inter 14px semibold, height 48px, border-radius 10px
  - Right: "Submit" — solid #1F6F43, white text Inter 14px semibold, height 48px, border-radius 10px

---

**TAB 3: TRANSPORTATIONS**

This tab tracks kilometers driven and fuel/mileage receipts when clients on Respite or Emergency Care services need to go out during a shift. Staff logs where they drove, total distance, and uploads receipts for owner reimbursement.

**Transportation Summary Card (16px below tabs):**
- White card, 16px border-radius, soft shadow, 20px padding
- LEFT BORDER ACCENT: 4px solid #1F6F43
- Card header: "Transportations" in Poppins 16px semibold #1A1A1A
- **Shift meta info rows (auto-populated, same pattern as Reports tab):**
  - Calendar icon + "Date –" → "10/02/2001" in Inter 13px semibold
  - Person icon + "Staff Name –" → "Benjamin Harris"
  - ID icon + "Staff ID –" → "9987775"
  - Person icon + "Client Name –" → "Joseph"
  - Clock icon + "Shift Time –" → "08:30 – 13:30"

**Kilometer Rate Card (16px below summary):**
- White card, 16px border-radius, soft shadow, 20px padding
- Card header: "Kilometer per rate" in Poppins 14px semibold #1A1A1A
- Rate info rows:
  - "Before 5000 Kilometer" → "72(¢)" in Inter 14px medium #1A1A1A
  - "After 5000 Kilometer" → "66(¢)" in Inter 14px medium #1A1A1A
  - Thin divider
  - "Total Hours" → "13 Hours" in Inter 14px semibold #1F6F43
- This is reference info showing the reimbursement rates — staff knows what they'll be compensated per km

**Visit Destinations Card (16px below rates):**
- White card, 16px border-radius, soft shadow, 20px padding
- Card header row: Left — "Visit Destinations" in Poppins 14px semibold #1A1A1A. Right — "+ Add another stop" in Inter 13px medium #1F6F43, tappable
- **Stop entries:**
  - "Stop 1" label in Inter 12px semibold #9CA3AF
  - Text input: Background #F9FAFB, border 1px #E5E7EB, border-radius 10px, height 48px, placeholder "Enter destination address" in Inter 14px #D1D5DB, padding 14px
  - If multiple stops added, each gets numbered: Stop 1, Stop 2, Stop 3 etc.
  - Each stop (except Stop 1) has a small red trash icon (16px) on the right to remove it
  - Tapping "+ Add another stop" appends a new empty input below

**Route Details Card (16px below destinations):**
- White card, 16px border-radius, soft shadow, 20px padding
- Card header: "Route Details" in Poppins 14px semibold #1A1A1A
- **Form fields (12px gap between each):**
  - "Starting Point" label Inter 12px semibold #6B7280 → text input, placeholder "Enter starting location"
  - "Ending Point" label → text input, placeholder "Enter ending location"
  - "Total Kilometer" label → text input, placeholder "Enter total kilometers" — number input type, shows numeric keyboard on mobile
- All inputs: Background #F9FAFB, border 1px #E5E7EB, border-radius 10px, height 48px, padding 14px

**Kilometer Done by Staff Card (16px below route details):**
- White card, 16px border-radius, soft shadow, 16px padding
- Simpler single-field card:
- "Kilometer Done by Staff" in Poppins 14px semibold #1A1A1A
- Text input: placeholder "Enter kilometers completed" — number input

**Fuel & Mileage Receipt Upload Card (16px below kilometers):**
- White card, 16px border-radius, soft shadow, 20px padding
- Card header: "Upload Receipt" in Poppins 14px semibold #1A1A1A
- Description: "Upload fuel or mileage receipts for reimbursement" in Inter 13px regular #6B7280

- **Upload area:**
  - Dashed border rectangle: 2px dashed #D1D5DB, border-radius 12px, height 100px, background #F9FAFB
  - Center: Upload cloud icon (32px, #9CA3AF) + "Tap to upload receipt" in Inter 14px medium #6B7280 + "JPEG, PNG, or PDF · Max 10MB" in Inter 11px #D1D5DB
  - Tapping opens device camera/file picker — staff can take a photo of the receipt or select from gallery

- **Uploaded receipt preview (shown after upload):**
  - Compact receipt card: 60px height, white background, 10px border-radius, 0.5px border #E5E7EB, 12px padding
  - Left: Small thumbnail of the receipt image (40px × 40px, border-radius 6px, object-fit cover)
  - Middle: "receipt_001.jpg" in Inter 13px medium #1A1A1A. Below: "2.4 MB · Uploaded just now" in Inter 11px #9CA3AF
  - Right: Red trash icon (16px, #DC2626) to remove
  - Staff can upload multiple receipts — each appears as a stacked receipt card with 8px gap

- **Receipt total field (12px below uploads):**
  - "Total Amount" label Inter 12px semibold #6B7280 → text input with "$" prefix, placeholder "0.00", number input type
  - This is the total fuel/mileage cost the staff is claiming for reimbursement

**Submit Button (24px below receipt card):**
- Full-width: "Submit" — solid #1F6F43, white text Poppins 15px semibold, height 50px, border-radius 12px
- Below button, 8px gap: "Transportation data will be sent to owner for review" in Inter 11px #9CA3AF, centered

**Extra bottom padding: 100px for comfortable scrolling above tab bar**

---

**Bottom Tab Bar (fixed, consistent across all tabs within Reports):**
- Standard 5-tab bar: Home, Shifts, Routes, Alerts, Profile
- No specific tab highlighted as active since this is a deep screen within the shift flow

---

**Overall Design & Behavior Notes:**
- **Medications tab is designed for one-tap speed** — staff in the field are caring for a child, not sitting at a desk. The checklist pattern means: see medication → see it's due → tap the row → done. Time is auto-captured. No forms, no modals, no typing required for standard administration.
- **The undo toast on medication logging** prevents anxiety — if staff accidentally tap the wrong medication, they have 3 seconds to reverse it without any extra steps.
- **Time-of-day tag pills** (Morning/Afternoon/Night/Emergency) provide instant visual grouping — staff can quickly scan "what's due this afternoon" without reading every dosage line.
- **Medication error logging is deliberately hidden behind an expandable section** — it's available when needed but doesn't clutter the primary one-tap workflow. Error reporting flows into the incident reporting system.
- **Pharmacy info is read-only reference** — staff don't edit this, but they need quick access if a medication question arises mid-shift. Tappable phone/email means one tap to call the doctor.
- **The signature pad matches the owner UI pattern** (Image 5) — it's the authorization that the staff member is trained to administer medications.
- **Transportations tab is form-based by nature** — unlike medications which can be one-tap, transportation logging requires specific data (addresses, kilometers, receipts). But the form is chunked into logical cards: where you went → route details → kilometers → receipts → submit. Each card is a clear step.
- **Receipt upload with camera access** is critical — staff are on the road, they get a fuel receipt, they snap a photo immediately. The inline preview confirms it uploaded correctly.
- **Kilometer rates are shown as reference** — staff can see exactly what they'll be reimbursed (72¢/km before 5000km, 66¢/km after) which creates transparency and trust.
- **The tab structure (Reports | Medications | Transportations)** matches the owner UI exactly — consistency between owner and staff views means the owner knows exactly where to find data when reviewing.
- **Other Actions is limited to Critical Incident and Medical Contact only** — staff don't need Noteworthy Event and Follow Through, keeping the interface focused on field-critical actions only.
- **All data auto-saves and syncs** — the auto-save indicator gives staff confidence that their documentation isn't lost if the app closes or phone switches context.

---

Want me to now compile everything into a final summary document with all staff mobile prompts?