**Figma Make Prompt — Client Details Screen (Mobile)**

---

Design a premium mobile "Client Details" screen for "Family Forever" — a child services management platform. This screen shows staff members the full profile of an assigned client they're working with on a shift. Frame size: 390×844 (iPhone 14/15 Pro). Match the exact design language of the existing owner mobile screens — bold typographic hierarchy, soft card treatments, green accent system, warm off-white background, and refined spacing.

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
- Left: Back arrow icon (24px, #1A1A1A) tapping returns to Shift Detail screen
- Center: "Client Details" in Poppins 18px semibold #1A1A1A
- Right: Share icon (24px, #6B7280) inside 40px circular touch target — tapping allows sharing client summary via internal messaging
- Below title, 4px gap: Subtitle "Assigned Client" in Inter 12px regular #9CA3AF

**Client Profile Hero Card (20px below header — the visual anchor of the screen):**
- White card, 16px border-radius, soft shadow, 20px padding
- **Profile header area:**
  - Center-aligned layout (not left-aligned — this is a hero card):
  - Large client avatar circle (72px) centered at top of card — initials "ET" on soft green background (#F0FDF4), Inter 24px semibold #1F6F43. If photo available, show photo with 2px green (#1F6F43) ring border around the circle.
  - 12px below avatar: Client name "Emma Thompson" in Poppins 20px bold #1A1A1A, centered
  - 4px below name: Client ID "ID: 0988765" in Inter 13px regular #9CA3AF, centered
  - 12px below ID: Row of badge pills centered horizontally, 8px gap between each:
    - Service type pill: "Respite Care" background #EBF5FF text #1E5FA6, Inter 11px semibold, border-radius 20px, padding 4px 14px
    - Status pill: "Active" background #F0FDF4 text #1F6F43, Inter 11px semibold, border-radius 20px, padding 4px 14px
  - 16px below badges: Thin divider 1px #F3F4F6 full card width

- **Quick contact row (16px below divider):**
  - Three equally spaced action buttons in a horizontal row, centered
  - Each: 56px × 56px rounded square (border-radius 12px), background #F9FAFB, centered icon (22px) above label
  - Button 1: Phone icon (#1F6F43) above "Call" in Inter 10px medium #6B7280
  - Button 2: Message/chat icon (#1F6F43) above "Message" in Inter 10px medium #6B7280
  - Button 3: Email icon (#1F6F43) above "Email" in Inter 10px medium #6B7280
  - Each button tappable with subtle press state (background darkens to #F3F4F6)

**Personal Information Card (16px below hero card):**
- White card, 16px border-radius, soft shadow, 20px padding
- Card header row: Left — "Personal Information" in Poppins 14px semibold #1A1A1A. Right — small edit/expand chevron icon (16px, #D1D5DB) indicating more detail available on tap
- 16px below header: Structured key-value rows (matching the owner reports screen's detail row pattern):
  - Each row: min-height 40px, thin bottom divider 1px #F3F4F6 between rows
  - Row label: Inter 13px regular #9CA3AF, left-aligned
  - Row value: Inter 14px medium #1A1A1A, right-aligned
  - Row 1: "Date of Birth" → "April 12, 2018"
  - Row 2: "Age" → "7 years old"
  - Row 3: "Gender" → "Female" with a small gender badge (background #F3F0FF, text #5B21B6, Inter 11px, border-radius 12px, padding 2px 8px)
  - Row 4: "Ethnicity" → "Hispanic/Latino"
  - Row 5: "Primary Language" → "English / Spanish"
  - Row 6: "School" → "Oakridge Elementary"

**Guardian / Contact Information Card (16px below personal info):**
- White card, 16px border-radius, soft shadow, 20px padding
- Card header: "Guardian & Contact" in Poppins 14px semibold #1A1A1A
- **Primary Guardian row (16px below header):**
  - Left: Small avatar circle (36px) initials "MT" on soft amber background (#FFF8E1), Inter 13px semibold #92600A
  - Beside avatar (12px gap): "Maria Thompson" in Inter 14px semibold #1A1A1A. Below: "Mother · Primary Guardian" in Inter 12px regular #9CA3AF
  - Right: Phone icon button (36px circle, background #F0FDF4, phone icon 16px #1F6F43) — tappable quick call
- Thin divider 1px #F3F4F6, 12px vertical margin
- **Contact details rows (same key-value pattern):**
  - Row 1: "Phone" → "(555) 012-3456" in #1F6F43 (tappable link style)
  - Row 2: "Email" → "maria.thompson@email.com" in #1F6F43 (tappable)
  - Row 3: "Address" → "1234 Oak Street, Suite 5, Ontario" in Inter 14px medium #1A1A1A
  - Row 4: "Emergency Contact" → "Robert Thompson (Father)" with phone number "(555) 012-7890" in #1F6F43 below

**Agency Information Card (16px below guardian card):**
- White card, 16px border-radius, soft shadow, 20px padding
- Card header: "Agency" in Poppins 14px semibold #1A1A1A
- **Agency row:**
  - Left: Agency logo/icon placeholder — 40px rounded square (border-radius 8px), background #F0FDF4, building icon (20px, #1F6F43) centered
  - Beside (12px gap): "Ontario Child & Family Services" in Inter 14px semibold #1A1A1A. Below: "Government Agency" badge pill — background #EBF5FF text #1E5FA6, Inter 11px medium, border-radius 20px, padding 3px 10px
- Key-value rows below (12px gap):
  - Row 1: "Case Worker" → "Jennifer Adams"
  - Row 2: "Case ID" → "OCFS-2026-04521"
  - Row 3: "Agency Phone" → "(555) 800-1234" in #1F6F43 (tappable)

**Special Notes & Instructions Card (16px below agency card — critical for staff):**
- White card, 16px border-radius, soft shadow, 20px padding
- LEFT BORDER ACCENT: 4px solid #F59E0B (amber/warning) on the left edge — this signals "pay attention" content, matching the owner screen's accent border pattern but using amber instead of red since these are instructions, not critical incidents
- Card header: Warning/info triangle icon (18px, #F59E0B) beside "Special Notes & Instructions" in Poppins 14px semibold #1A1A1A
- 12px below header: Note content in Inter 14px regular #374151, line-height 1.6:
  - "• Allergic to peanuts — EpiPen in backpack front pocket"
  - "• Comfort object: blue stuffed elephant — must have during transitions"
  - "• Separation anxiety — use calm transition protocol (see care plan)"
  - "• Medication: Albuterol inhaler as needed for asthma"
- Each note on a new line with a bullet point (•), 8px spacing between lines
- 16px below notes: "Last updated: March 10, 2026 by Jennifer Adams" in Inter 11px regular #9CA3AF

**Care Plan Summary Card (16px below special notes):**
- White card, 16px border-radius, soft shadow, 20px padding
- Card header row: Left — "Care Plan" in Poppins 14px semibold #1A1A1A. Right — "View Full Plan >" link text in Inter 13px medium #1F6F43, tappable
- **Compact care plan overview (not full details — just enough for quick reference):**
  - 3 horizontal mini cards in a row (8px gap), each: background #F9FAFB, border-radius 10px, padding 12px, flexible width (1/3 of card minus gaps)
  - Mini card 1: Small green heart icon (16px) centered, "Emotional" in Inter 11px semibold #1A1A1A centered below, "Needs reassurance" in Inter 10px regular #9CA3AF centered below
  - Mini card 2: Small blue shield icon (16px), "Safety" label, "Peanut allergy" subtitle
  - Mini card 3: Small purple activity icon (16px), "Activities" label, "Art, reading" subtitle

**Service History Snapshot (16px below care plan):**
- White card, 16px border-radius, soft shadow, 20px padding
- Card header row: Left — "Service History" in Poppins 14px semibold #1A1A1A. Right — "See All >" in Inter 13px medium #1F6F43
- Compact stat row: 3 stats side by side inside the card (same pattern as home dashboard quick stats):
  - "Total Shifts" → "48" in Poppins 18px bold #1A1A1A
  - "This Month" → "6"
  - "With You" → "12" in #1F6F43 (highlighted green since it's personalized to this staff member)
  - Label in Inter 11px regular #9CA3AF above each value
  - Thin vertical dividers (1px #F3F4F6) between stats

- **Recent activity list (12px below stats):**
  - 3 compact rows showing recent shifts with this client:
  - Each row: 48px height, no background, thin bottom divider
  - Left: Small date text "Mar 12" in Inter 12px medium #9CA3AF, fixed width 50px
  - Middle: "Respite Care · 4 hrs" in Inter 13px regular #1A1A1A
  - Right: Green checkmark icon (16px, #22C55E) for completed, amber clock icon for upcoming
  - Rows: "Mar 12 · Respite Care · 4 hrs ✓", "Mar 8 · Respite Care · 4 hrs ✓", "Mar 5 · Respite Care · 3.5 hrs ✓"

**Bottom Tab Bar (fixed, identical to all screens):**
- 5 tabs: Home, Shifts, Routes, Alerts, Profile
- No specific tab is active-highlighted on this detail screen since it's a deep navigation from Shift Detail → Client Details. The Shifts tab should remain subtly highlighted as the parent context.

**Overall Polish & Behavior Notes:**
- This is an information-dense screen but should NOT feel overwhelming — the card separation, warm background, and consistent typography hierarchy keep it scannable
- The hero card with centered avatar and name gives the client a sense of identity and importance — staff are caring for a real person, not just a case number
- Special Notes card with amber left-border accent is critical — this is the most safety-relevant information on the screen and should visually stand out from other cards
- The quick contact buttons (Call, Message, Email) in the hero card make it fast to reach guardians without scrolling down to the contact card
- Care Plan mini cards give at-a-glance summary without requiring staff to open a separate document mid-shift
- "With You" stat highlighted in green creates a personal connection — "I've worked with this child 12 times"
- All phone numbers and emails styled as tappable links in #1F6F43 — staff can call/email with one tap
- The screen scrolls naturally — most critical info (identity, contact, special notes) is near the top, supporting info (agency, care plan, history) is below the fold
- Ensure proper safe area at the bottom for content to not be hidden behind the tab bar — add 88px bottom padding to the scroll content area

---

Ready for the **Transportation Routes** screen next?