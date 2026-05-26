I can see the Transportation Shift screen and the full Intake Form. Let me analyze both carefully and create the updated prompt. There are several improvements needed:

1. **Seat Type proximity** — needs to move to left side under client name
2. **Caseworker & Intake Worker** — add weekend contact number since they're unavailable on weekends
3. **Intake Form access** — staff should be able to view the intake form details from this screen
4. **All intake form data** needs to be represented accurately

---

**Figma Make Prompt — Updated Transportation Shift Screen (Contact Info, Weekend Numbers, Intake Form Access)**

---

Update the Transportation Shift screen for "Family Forever" staff mobile app. Fix the seat type placement, add weekend emergency contact numbers for caseworker and intake worker, and add access to view the client's Intake Form directly from this screen. Frame size: 390×844 (iPhone 14/15 Pro). Match the existing design language.

**Design System (consistent across all screens):**
- Primary green: #1F6F43
- Background: #F8F8F6 (warm off-white)
- Headings: Poppins — bold/semibold
- Body: Inter — regular/medium
- Card style: White background, border-radius 16px, shadow 0 2px 8px rgba(0,0,0,0.04), 20px internal padding
- Page padding: 20px horizontal

---

**SCREEN HEADER:**
- Left: Back arrow (24px, #1A1A1A)
- Center: "Transportation Shift" in Poppins 18px semibold #1A1A1A
- Below: "Thu, 20 Mar · 2:00 – 6:00 PM" in Inter 13px regular #9CA3AF

---

**SECTION 1: CLIENT INFO CARD (fix seat type proximity)**

White card, 16px border-radius, soft shadow, 20px padding.

**Updated layout — seat type moved to left under client name:**

- **Top row (full width, space-between):**
  - Left: "Michael Chen" in Poppins 16px semibold #1A1A1A
  - Right: "Transportation" service badge pill — background #FFF8E1, text #92600A, Inter 11px semibold, border-radius 20px, padding 5px 14px

- **Seat type row (6px below client name, LEFT aligned):**
  - Small car-seat icon (14px, #6B7280) + "Car Seat" text inside a subtle pill — background #F3F4F6, text #1A1A1A Inter 12px medium, border-radius 8px, padding 4px 10px
  - This sits directly below "Michael Chen" on the left side — it's a client attribute, not a shift attribute
  - 16px gap between seat type and the contacts below

---

**SECTION 2: CONTACTS CARD (Caseworker, Intake Worker, Weekend Emergency)**

White card, 16px border-radius, soft shadow, 20px padding. This replaces the simple contact rows.

**Card header:** "Contacts" in Poppins 14px semibold #1A1A1A

**Caseworker Row (16px below header):**
- Left: Avatar circle (40px) with initials "JR" on soft green background (#F0FDF4), Inter 14px semibold #1F6F43
- Middle (10px gap):
  - "Janet Robinson" in Inter 14px semibold #1A1A1A
  - "Caseworker" in Inter 12px regular #9CA3AF
  - **Availability indicator:** Small green dot (6px, #22C55E) + "Available Mon–Fri, 8AM–5PM" in Inter 10px regular #6B7280
- Right: Green phone icon button (40px circle, background #F0FDF4, phone icon 18px #1F6F43) — tappable to call

**Thin divider 1px #F3F4F6 (12px vertical margin)**

**Intake Worker Row:**
- Left: Avatar circle (40px) "DL" on soft blue background (#EBF5FF), Inter 14px semibold #1E5FA6
- Middle:
  - "David Lee" in Inter 14px semibold #1A1A1A
  - "Intake Worker" in Inter 12px regular #9CA3AF
  - **Availability indicator:** Same green dot + "Available Mon–Fri, 8AM–5PM" in Inter 10px #6B7280
- Right: Green phone icon button (same as caseworker)

**Thin divider 1px #F3F4F6 (12px vertical margin)**

**Weekend & After-Hours Emergency Contact Row:**
- This is a special row that stands out — staff needs to know who to call on weekends
- LEFT BORDER ACCENT: 3px solid #F59E0B (amber) — signaling "pay attention, different from normal contacts"
- Background: #FFF8E1 (lightest amber) instead of white — differentiating from regular contacts
- Border-radius 10px, padding 14px
- Left: Amber phone icon circle (40px, background #FFF8E1, border 1.5px #F59E0B, phone icon 18px #92600A)
- Middle:
  - "Weekend & After-Hours" in Inter 14px semibold #92600A
  - "Emergency Contact Line" in Inter 12px regular #92600A
  - "Available Sat–Sun & after 5PM weekdays" in Inter 10px medium #92600A
- Right: Phone number displayed directly — "(825) 982-3256" in Inter 13px semibold #92600A, tappable
- Below the number: Second number "(825) 522-3256" in Inter 12px regular #92600A

**Small notice below the contacts card (8px gap):**
- Info icon (12px, #9CA3AF) + "Caseworker & Intake Worker are unavailable on weekends. Use the emergency line above." in Inter 11px regular #9CA3AF

---

**SECTION 3: INTAKE FORM ACCESS CARD (NEW — staff can view full intake details)**

White card, 16px border-radius, soft shadow, 20px padding. 16px below contacts card.

**Card header row:**
- Left: Document/clipboard icon (20px, #1F6F43) beside "Intake Form" in Poppins 14px semibold #1A1A1A
- Right: "View Full Form >" in Inter 13px medium #1F6F43, tappable — opens the full intake form detail screen

**Compact intake summary (16px below header) — key fields from the intake form displayed inline for quick reference:**

Staff doesn't need the full form on this screen, but they need the critical info at a glance. Show the most important fields in a key-value layout:

- **Client Statistics section:**
  - Row: "Name" → "Michael Chen"
  - Row: "Date of Birth" → "March 15, 2016"
  - Row: "Gender" → "Male"
  - Row: "Services" → "Respite Care, Transportation" (as pills)
  - Each row: Label in Inter 12px regular #9CA3AF left, value in Inter 13px medium #1A1A1A right
  - Thin divider between rows

- **Quick Info Tags (12px below the rows):**
  - Horizontal wrapping row of small info pills:
  - "House No: 4" pill — background #F3F4F6, text #6B7280, Inter 11px
  - "Seat Type: Car Seat" pill — background #FFF8E1, text #92600A
  - "2 meals/day" pill if applicable

**Thin divider 1px #F3F4F6**

- **Parent Info (compact):**
  - "Parent: Sarah Chen · (555) 012-3456" in Inter 13px #1A1A1A, phone number in #1F6F43 (tappable)

- **Medical Alert (if any — highlighted):**
  - If the client has medical concerns from the intake form:
  - Small amber banner inside the card: Background #FFF8E1, border-radius 8px, padding 10px 12px
  - Warning icon (14px, #F59E0B) + "Peanut allergy — EpiPen in backpack" in Inter 12px semibold #92600A
  - This pulls from the "Critical/Medical Concerns" field of the intake form

- **Support Needs (compact):**
  - "Mobility Assistance: Required" or "No special mobility needs" in Inter 12px regular #6B7280

**"View Full Form" button at bottom of card:**
- Full width inside card: "View Complete Intake Form" — outlined, 1px border #E5E7EB, text #1A1A1A Inter 13px medium, height 40px, border-radius 10px, with document icon (14px) before text
- Tapping opens the full Intake Form screen

---

**SECTION 4: ROUTE DESCRIPTION CARD (existing — no changes)**

White card, 16px border-radius, soft shadow, 20px padding.
- "Route Description" in Poppins 14px semibold #1A1A1A
- Description text: "Pick up car seat from foster parent Kristeen (4711 128 Ave) at 1:15pm then pick up Adriana from Homesteader School. Drive to visit location: McDonald's 10375 51 Ave or McDonald's 1..." in Inter 14px regular #374151, line-height 1.6
- "Read More" link in Inter 14px medium #1F6F43 — expands the full text

---

**SECTION 5: ROUTE CARD (existing with active step-by-step flow)**

As previously designed — the active route with Pickup → Visit → Drop-off stepper flow with GPS tracking, navigation, and manual arrival confirmation.

---

**SECTION 6: CHOOSE VEHICLE BUTTON (existing)**

Full width: "Choose Vehicle" — solid #1F6F43, white text Poppins 15px semibold, height 52px, border-radius 14px

---

**FULL INTAKE FORM SCREEN (opens when staff taps "View Complete Intake Form"):**

This is a separate full screen showing all intake form data from the owner's intake form. Staff can view but NOT edit — read-only.

**Header:**
- Left: Back arrow → returns to Transportation Shift screen
- Center: "Intake Form" in Poppins 18px semibold #1A1A1A
- Right: Small Family Forever logo (24px)
- Below: "Family Forever Inc." in Inter 12px regular #9CA3AF

**Client Photo & Stats Card:**
- White card, 16px border-radius, soft shadow, 20px padding
- Center: Client avatar/photo (64px) circle with green ring
- Below: Client name "Michael Chen" Poppins 18px bold #1A1A1A
- Client statistics row: "DOB: March 15, 2016 · Male · Age: 10" in Inter 13px #6B7280
- Services pills: "Respite Care", "Transportation" — standard service badge pills
- "Two meals / day" note in Inter 12px #9CA3AF

**Info Section (16px below) — matches the Intake Form fields exactly:**

Each section is a white card with header and key-value rows:

**Card: "Info"**
- "Name" → "Michael Chen"
- "Date of Intake" → "January 15, 2026"
- "Type of Services" → "Respite Care, Transportation"
- "Service Start Details" → "Started January 20, 2026"
- "House No" → "4"
- "Safety Plan / Risk Management" → "No known risks. Standard child safety protocols apply."

**Card: "Client Info"**
- "Name" → "Michael Chen"
- "Gender" → "Male"
- "Date of Birth" → "March 15, 2016"
- "Address" → "789 Maple Avenue, Apt 3, Edmonton"
- "Star Date" → "January 20, 2026"
- "CYW Info" → "Assigned to David Lee, Intake Worker"

**Card: "Parents Info"**
- "Name" → "Sarah Chen"
- "Relationship" → "Mother"
- "Phone No" → "(555) 012-3456" in #1F6F43 (tappable)
- "Email" → "sarah.chen@email.com" in #1F6F43 (tappable)
- "Parent Address" → "789 Maple Avenue, Apt 3, Edmonton"

**Card: "Medical Info"**
- "Healthcare Number" → "AHC-2026-88432"
- "Any Diagnosis" → "Mild asthma"
- "Diagnosis Type" → "Respiratory"
- "Critical/Medical Concerns" → "Peanut allergy — EpiPen in backpack front pocket. Albuterol inhaler as needed." — This text is highlighted with amber background #FFF8E1, border-radius 8px, padding 10px — drawing attention to critical medical info
- "Uploading Medical Documents" → "2 documents uploaded" with small document icons

**Card: "Support Needs"**
- "Mobility Assistance Required" → "No"
- "If Yes Specify" → "N/A"
- "Communication Abilities/need" → "Verbal, English primary. Some Mandarin with parents."
- "If Yes Specify" → "N/A"

**Card: "Transportations"**
- "Pick-Up Address" → "789 Maple Avenue, Apt 3"
- "Drop-off Address" → "1234 Oak Street, Suite 5"
- "Pick-Up Time" → "2:00 PM"
- "Drop-off Time" → "6:00 PM"
- "Transportation Overview" → "Standard school-to-home route with one visit stop"

**Card: "Supervised Visitations" (if applicable)**
- "Visit Start Time" → "3:00 PM"
- "Visit End Time" → "4:30 PM"
- "Visit Duration" → "1h 30m"
- "Type of Visit" → "In-person, supervised"
- "Visit Address" → "500 City Hall Plaza"
- "Visit Overview" → "Monthly supervised visitation with biological parent"

**Card: "Acknowledgement"**
- "Name" → "Sarah Chen"
- "Date" → "January 15, 2026"
- "Work Signature" → Signature image displayed (read-only, non-editable)

**Bottom of form:**
- "Go Back" button — outlined, 1px border #E5E7EB, text #6B7280, full width, height 48px, border-radius 12px

**All fields are READ-ONLY for staff** — no edit buttons, no input fields, no toggles. Staff views this for reference only. Only the owner/intake worker can edit intake forms.

---

**Overall Design & UX Notes:**

- **Seat type is now left-aligned under the client name** — it's a client attribute (this child needs a car seat), so it belongs with the client identity, not floating on the right competing with the service tag
- **The weekend emergency contact row is visually distinct** with the amber treatment — when staff is on a Saturday shift and needs to call someone, they shouldn't have to hunt through contacts. The amber background + border makes it pop immediately.
- **Caseworker and Intake Worker availability hours** are shown right on their contact rows — staff knows at a glance "it's Saturday, Janet isn't available, I need to use the emergency line"
- **The Intake Form summary card** gives staff the 80% of info they need without opening the full form — client name, DOB, services, parent contact, medical alerts, and support needs. The "View Full Form" button is there for the 20% of cases where staff needs more detail.
- **Medical alerts pulled from the intake form** are highlighted with amber treatment — peanut allergy, EpiPen location — this is potentially life-saving information that staff MUST see before interacting with the client
- **The full Intake Form screen is read-only** — staff can reference all the information the intake worker/owner has recorded, but cannot modify it. This protects data integrity while giving staff full visibility.
- **Every phone number is tappable** — staff can call parents, caseworkers, intake workers, or the emergency line with one tap. In a child services context, quick communication can be critical.
- **The section order on the Transportation Shift screen is now:** Client Info (with seat type) → Contacts (with weekend numbers) → Intake Form Access → Route Description → Active Route → Choose Vehicle. This puts the most important contextual information (who is this child, who do I call, what do I need to know) before the driving instructions.

---

Want me to work on anything else?