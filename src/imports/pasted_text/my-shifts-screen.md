**Figma Make Prompt — My Shifts Screen (Mobile)**

---

Design a premium mobile "My Shifts" screen for "Family Forever" — a child services management platform. This screen shows the staff member's complete shift history and upcoming assignments. Frame size: 390×844 (iPhone 14/15 Pro). Match the exact design language of the existing owner mobile dashboard — bold typographic hierarchy, soft card treatments, green accent system, warm off-white background, and refined spacing.

**Design System (consistent across all screens):**
- Primary green: #1F6F43
- Background: #F8F8F6 (warm off-white)
- Headings: Poppins — bold/semibold
- Body: Inter — regular/medium
- Card style: White background, border-radius 16px, shadow 0 2px 8px rgba(0,0,0,0.04), 20px internal padding
- Icon style: Outlined stroke, 24px
- Page padding: 20px horizontal
- Spacing: 8px base grid, 16px between cards, 24px between sections

**Top Header Area (56px height, flows with content):**
- Left: Back arrow icon (24px, #1A1A1A) tapping returns to Home Dashboard
- Center: Screen title "My Shifts" in Poppins 18px semibold #1A1A1A
- Right: Small filter/sort icon (24px, #6B7280) inside a 40px circular touch target with background #F3F4F6 on tap state. Tapping opens a sort bottom sheet (by date, by service type, by status)
- Below the title row, 4px gap: Subtitle "Sarah Johnson | Staff" in Inter 12px regular #9CA3AF

**Filter Tabs Row (horizontal scrollable pills, 20px below header):**
- Matching the owner dashboard's service filter pills pattern exactly
- Pills in a horizontal scrollable row with 8px gap between each
- Tab options: "Upcoming", "In Progress", "Completed", "All"
- Active tab: Solid #1F6F43 green background, white text, Inter 13px semibold, border-radius 20px (full pill), padding 8px 18px, min-height 36px
- Inactive tabs: Background #F3F4F6, text #6B7280, Inter 13px medium, same border-radius and padding
- Default active tab: "Upcoming"

**Shift Count Summary (12px below filter tabs):**
- Single line: "8 upcoming shifts" in Inter 13px regular #9CA3AF (dynamically reflects active filter — changes to "2 in progress" or "24 completed" based on selected tab)

**Shift Cards List (scrollable, 16px below count summary):**
Each shift card follows a consistent premium structure with date grouping:

**Date Group Header:**
- "Today · March 14" in Poppins 14px semibold #1A1A1A with a small green dot (6px, #22C55E) for today, or just "Tomorrow · March 15" / "Monday · March 17" without the dot for future dates
- 12px gap below the date header before the first card in that group

**Individual Shift Card Structure:**
- White card, 16px border-radius, soft shadow 0 2px 8px rgba(0,0,0,0.04), 20px padding
- **Top row:** Left — Service type badge pill (same service color coding as home screen: Respite Care = #EBF5FF/#1E5FA6, Emergency Care = #FEF2F2/#B91C1C, Supervised Visitation = #F3F0FF/#5B21B6, Transportation = #FFF8E1/#92600A) in Inter 11px semibold, border-radius 20px, padding 4px 12px. Right — Status indicator pill: "Confirmed" = background #F0FDF4 text #1F6F43, "Pending" = background #FFF8E1 text #92600A, "In Progress" = background #EBF5FF text #1E5FA6, "Completed" = background #F3F4F6 text #6B7280. Inter 11px medium, border-radius 20px, padding 4px 10px.
- **Time row (8px below top row):** Clock icon (14px, #9CA3AF) followed by "9:00 AM – 1:00 PM" in Inter 14px semibold #1A1A1A. Right-aligned: Duration badge "4 hrs" in Inter 12px medium #6B7280, background #F3F4F6, border-radius 12px, padding 2px 8px
- **Client row (12px below time):** Client avatar circle (40px) with initials on soft colored background (matching owner screen avatar style — each client gets a distinct soft color: greens, blues, purples, ambers rotating). Beside avatar (12px gap): Client name "Emma Thompson" in Inter 15px semibold #1A1A1A. Below name: "ID: 0988765" in Inter 12px regular #9CA3AF
- **Location row (12px below client):** Map pin icon (14px, #9CA3AF) followed by "1234 Oak Street, Suite 5" in Inter 13px regular #6B7280, single line truncated
- **Divider line:** Thin 1px #F3F4F6 line, full width inside card, 16px vertical margin
- **Bottom action row:** Left — If upcoming: "Check In" button — solid #1F6F43, white text Inter 14px semibold, height 40px, border-radius 10px, width approximately 55% of card width. Right — "Details >" link text in Inter 13px medium #1F6F43, vertically centered with button, taps to Shift Detail screen. If in progress: "Check Out" outlined button (1.5px green border, green text) on left + "View Report" link on right. If completed: "View Report" button outlined style on left + green checkmark icon (20px) on right.

**Show 4 example shift cards with date grouping:**

Date Group 1 — "Today · March 14" (green dot):
- Card 1: Respite Care, 9:00 AM – 1:00 PM, Emma Thompson, Confirmed, upcoming → "Check In" + "Details >"
- Card 2: Emergency Care, 2:00 PM – 6:00 PM, Michael Chen, In Progress → "Check Out" + "View Report"

Date Group 2 — "Tomorrow · March 15":
- Card 3: Supervised Visitation, 10:00 AM – 12:00 PM, Lucas Martinez, Confirmed, upcoming → "Check In" + "Details >"

Date Group 3 — "Monday · March 17":
- Card 4: Transportation, 3:00 PM – 4:30 PM, Sophia Kim, Pending (amber status pill) → No check-in button since pending, show "Pending Confirmation" in Inter 13px italic #92600A centered in the action row instead

**Empty State (shown when "In Progress" or "Completed" tab has no items):**
- Centered vertically in content area
- Soft illustration: Simple line-art calendar icon (64px) in #D1D5DB
- "No shifts in progress" in Poppins 16px semibold #1A1A1A
- "Your active shifts will appear here" in Inter 14px regular #9CA3AF
- 8px gap between title and description

**Floating Quick Action (optional, adds premium feel):**
- Small floating pill at bottom center, 20px above tab bar: "Today: 2 shifts · 8 hrs" in Inter 12px medium, background #1F6F43, white text, border-radius 20px, padding 8px 16px, soft shadow 0 4px 12px rgba(31,111,67,0.2). This gives instant context regardless of scroll position.

**Bottom Tab Bar (fixed, identical to Home screen):**
- 5 tabs: Home, Shifts (active — green icon + label + dot), Routes, Alerts, Profile
- Active state: #1F6F43 icon and label with 3px green dot above icon
- Inactive: #9CA3AF
- Alerts tab with red badge count "3" if unread

**Overall Polish:**
- Smooth transition feel between date groups — the date headers act as natural visual separators
- Cards should feel tappable — the entire card is a touch target that navigates to Shift Detail screen, the Check In button is the primary shortcut action
- Service badge colors should be consistent across all screens — same hex values everywhere
- Status pills should be clearly distinct from service badges (status uses softer, more muted fills)
- Scroll behavior: Tabs row should become sticky when scrolled past, pinning to just below the header for easy filter switching while browsing
- The floating pill summary at the bottom creates a layer of persistent context — premium SaaS apps use this pattern (Linear, Notion mobile)
- Overall density should feel informative but not cramped — each card gives you everything you need at a glance without needing to tap into details

---

Ready for the next screen — **Shift Detail & Check-in/out** — or want to adjust anything here?