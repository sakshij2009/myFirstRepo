Here's the detailed Figma Make prompt for the Staff Home Dashboard. This is the screen staff see every time they open the app — optimized for quick glance and immediate action.

---

**Figma Make Prompt — Staff Home Dashboard (Mobile)**

---

Design a premium mobile Staff Home Dashboard screen for "Family Forever" — a child services management platform. This is the primary landing screen for staff members. Frame size: 390×844 (iPhone 14). Use the existing design system: deep green primary (#1F6F43), neutral palette, Inter for body text, Poppins for headings, 8px grid, soft shadows, rounded corners (12px cards, 8px inner elements), WCAG AA accessible.

**Top Header Bar (sticky, 56px height):**
- Left: Small Family Forever logo mark (green leaf icon, 28px)
- Center: Greeting text — "Good morning, Sarah" in Poppins 16px semibold, color #1A1A1A
- Right: Notification bell icon (24px) with a red badge dot (8px circle) if unread notifications exist. Bell taps to Notifications screen.
- Background: white (#FFFFFF) with a subtle 1px bottom border (#E5E7EB)

**Today's Shifts Section (primary focus, immediately below header):**
- Section label: "Today's shifts" in Poppins 14px semibold, color #1A1A1A, with a small green dot (6px) indicator pulsing gently to show active day. Right-aligned: "View all →" link text in #1F6F43, 13px Inter medium, taps to My Shifts screen.
- Shift Cards (stacked vertically, 16px gap between cards):
  - Each card: white background, 12px border-radius, subtle shadow (0 1px 3px rgba(0,0,0,0.06)), 16px internal padding
  - Card top row: Left — Service type badge pill (e.g., "Respite Care") with colored background per service type: Respite Care = soft blue (#EBF5FF text #1E5FA6), Emergency Care = soft red (#FEF2F2 text #B91C1C), Supervised Visitation = soft purple (#F3F0FF text #5B21B6), Transportation = soft amber (#FFF8E1 text #92600A). Right — Time range "9:00 AM – 1:00 PM" in Inter 13px medium #374151
  - Card middle row: Client name "Emma Thompson" in Inter 15px semibold #1A1A1A. Below: Location line with a small map pin icon (14px, #6B7280) + address text "1234 Oak Street, Suite 5" in Inter 13px regular #6B7280, single line truncated with ellipsis
  - Card bottom row: Left — Staff avatar circle (32px) with status dot (online green #22C55E / offline gray). Right — **Primary action button**: If shift is upcoming: "Check In" button — solid green (#1F6F43) background, white text, Inter 14px semibold, 36px height, 100px width, 8px border-radius. If shift is active/checked-in: "Check Out" button — outlined style with green border and green text. If shift is completed: "Completed" gray badge pill, non-interactive.
  - Show 2 shift cards for today as example data. First card: upcoming shift with "Check In" CTA. Second card: active shift with "Check Out" CTA.

**Quick Stats Strip (horizontal scroll, below today's shifts, 12px top margin):**
- Compact row of 3 mini stat cards, horizontally scrollable if needed, each card: 110px wide, background #F9FAFB, 8px border-radius, 12px padding
- Stat 1: "This week" label 11px Inter #6B7280, value "12 shifts" in 16px Inter semibold #1A1A1A
- Stat 2: "Hours" label, value "48.5 hrs"
- Stat 3: "Completed" label, value "8 of 12"

**Upcoming Schedule Preview (below stats strip, 20px top margin):**
- Section label: "Coming up" in Poppins 14px semibold #1A1A1A
- Compact list items (not full cards — lighter treatment for upcoming days):
  - Each row: 56px height, no card background, thin bottom divider line (#F3F4F6)
  - Left column: Date badge — compact rounded square (40px × 40px, 8px radius), background #F0FDF4 (lightest green), showing day "TUE" in 10px Inter bold #1F6F43 and date number "18" in 16px Poppins semibold #1F6F43
  - Middle column: Shift summary — "Respite Care · Emma T." in Inter 14px medium #1A1A1A. Second line: "9:00 AM – 1:00 PM" in Inter 12px #6B7280
  - Right column: Shift count badge if multiple shifts that day — circular badge "2" in 12px, background #1F6F43, white text
  - Show 3 upcoming day rows (tomorrow, day after, and 2 days out)

**Bottom Tab Bar (sticky, 72px height including safe area):**
- Background: white (#FFFFFF), top border 1px #E5E7EB
- 5 equally spaced tab items, each with icon (24px) above label (10px Inter medium)
- Tabs: Home (house icon, active state — green #1F6F43 icon + label + tiny 3px green dot above icon), Shifts (calendar icon), Routes (navigation/route icon), Alerts (bell icon, with red badge count if unread), Profile (person icon)
- Inactive tabs: icon and label in #9CA3AF
- Active tab: icon and label in #1F6F43 with the dot indicator above

**Overall Layout Notes:**
- Content area scrollable between header and tab bar
- 20px horizontal padding throughout
- Background: #FAFAFA (very light warm gray, not pure white — creates subtle depth against white cards)
- No hamburger menu — all navigation through bottom tabs
- All interactive elements have minimum 44px touch targets
- Compact density — no excessive whitespace between sections, everything visible with minimal scrolling on standard screen

---

You can paste this directly into Figma Make. Want me to move to the next screen — **My Shifts** — or would you like to refine anything on this Home Dashboard first?