I can see the difference clearly. Your **owner mobile screens** (Images 2-5) have a much more premium feel compared to the staff home dashboard (Image 1). Let me analyze what makes your owner screens work so well:

**What your owner screens do right:**
- Larger, bolder welcome heading with the name in green (#1F6F43) for personality
- Avatar/profile photo in the header (not just a logo mark)
- Notification bell as a green circle icon, not plain
- KPI cards with soft background fills, centered icons above labels, and green percentage indicators
- Service filter pills (All, Respite Care, Emergent Care, etc.) as a horizontal scrollable row with the active pill filled solid green
- Client-to-Staff pairing cards showing avatar circles with arrow connections — a unique, premium pattern
- Cards have generous padding, soft rounded corners, clean hierarchy
- The Reports screen uses green circular icons for Clock In/Out timeline, section cards with clear visual separation
- Critical Incident section uses a red left-border accent card — great visual urgency
- Bottom tab bar uses line-style icons with labels, active tab in green with filled icon
- Overall: more whitespace, softer card treatments, bolder typography hierarchy

The staff home dashboard I prompted (Image 1) looks flatter and more generic — the header is too plain, the shift cards lack visual richness, and it doesn't match the warmth and premium density of your owner screens.

Let me redo this prompt properly, matching your established owner mobile design language:

---

**Figma Make Prompt — Staff Home Dashboard (Mobile) — REVISED**

---

Design a premium mobile Staff Home Dashboard screen for "Family Forever" — a child services management platform. This is the primary landing screen for staff members. Frame size: 390×844 (iPhone 14/15 Pro). Match the exact design language of the existing owner mobile dashboard: bold typographic hierarchy, soft card treatments, green accent system, and refined spacing.

**Design System (match owner mobile exactly):**
- Primary green: #1F6F43
- Headings: Poppins — bold/semibold, large sizes (22px–24px for main greeting, 16px for section heads)
- Body text: Inter — regular 14px for descriptions, medium 13px for metadata, 12px for tertiary info
- Card style: White background, border-radius 16px, subtle shadow (0 2px 8px rgba(0,0,0,0.04)), generous 20px internal padding
- Background: #F8F8F6 (warm off-white, matching owner screens)
- Icon style: Outlined stroke icons, 24px, green fill for active states
- Touch targets: minimum 44px
- Spacing: 8px base grid, 20px horizontal page padding, 16px between cards, 24px between sections

**Top Header Area (not a sticky bar — flows naturally with content, 80px height):**
- Top row: Left — Staff avatar photo in a 40px circle with a thin 2px green (#1F6F43) ring border around it. Right side — Notification bell icon (24px) inside a 40px circular button with background #F0FDF4 (lightest green tint), with a small red dot badge (8px) overlapping top-right if unread notifications exist.
- Below the avatar row, 8px gap: Small label "STAFF DASHBOARD" in Inter 11px medium, letter-spacing 0.5px, color #9CA3AF (light gray, all caps tracking)
- Main greeting: "Welcome back, **Sarah**" in Poppins 22px bold, where "Welcome back," is #1A1A1A and "Sarah" is #1F6F43 (green, matching owner screen pattern exactly). The name must be green to match the owner dashboard's "Joseph" in green.
- Below greeting: "Family Forever Inc." in Inter 13px regular, color #9CA3AF

**Today's Shifts Section (primary content area, 24px below header):**
- Section header row: Left — "Today's shifts" in Poppins 16px semibold #1A1A1A with a small pulsing green dot (6px, #22C55E) beside it indicating active day. Right — "View all >" in Inter 13px medium #1F6F43, tappable.

- **Shift Card 1 (Upcoming — needs check-in):**
  - White card, 16px border-radius, soft shadow, 20px padding
  - Top row: Service badge pill — "Respite Care" with background #EBF5FF, text #1E5FA6, Inter 11px semibold, border-radius 20px (full pill), padding 4px 12px. Right-aligned: time "9:00 AM – 1:00 PM" in Inter 13px medium #6B7280
  - Client-Staff pairing row (matching owner's shift card pattern): Left — Client avatar circle (44px) with initials "ET" on #F3F4F6 background, Inter 14px semibold, with a tiny green online dot (8px) at bottom-right of avatar. Client name "Emma Thompson" in Inter 15px semibold #1A1A1A below or beside the avatar. Right side — small gray arrow icon (→) pointing to staff info is not needed here since this is the staff's own shift. Instead, show the location: small map pin icon (16px, #9CA3AF) followed by "1234 Oak Street, Suite 5" in Inter 13px regular #6B7280, single line, truncated with ellipsis.
  - Bottom row: Full-width "Check In" button — solid #1F6F43 green background, white text "Check In" in Inter 14px semibold, height 44px, border-radius 10px, centered text. This is the primary call-to-action.

- **Shift Card 2 (Active — currently checked in):**
  - Same card structure as above
  - Service badge: "Emergency Care" with background #FEF2F2, text #B91C1C
  - Time: "2:00 PM – 6:00 PM"
  - Client: "Michael Chen" with initials "MC" avatar (use a soft purple #F3F0FF background for variety)
  - Location: "5678 Maple Avenue, Apt 12B"
  - Bottom row: "Check Out" button — outlined style: 1.5px border #1F6F43, text #1F6F43, transparent/white background, same 44px height and 10px radius. This is secondary since it's an active shift.

**Quick Stats Strip (24px below shift cards):**
- Horizontal row of 3 equal-width stat blocks inside a single soft card (background #F0FDF4 very light green tint, 14px border-radius, 16px padding)
- Each stat: Top — Label in Inter 11px medium #6B7280 (e.g., "This week", "Hours", "Completed"). Bottom — Value in Poppins 20px bold #1A1A1A (e.g., "12 shifts", "48.5 hrs", "8 of 12"). Center-aligned text within each third.
- Thin vertical divider lines (1px #E5E7EB) between each stat block

**Coming Up Section (24px below stats):**
- Section label: "Coming up" in Poppins 16px semibold #1A1A1A

- **Upcoming Day Rows (compact list, not full cards — lighter treatment):**
  - Each row: 64px height, no card background, thin bottom divider line (#F3F4F6, 1px)
  - Left: Date badge — rounded square (44px × 44px, 10px border-radius), background #F0FDF4, showing weekday "TUE" in Inter 10px bold #1F6F43 (uppercase) and date number "18" in Poppins 18px bold #1F6F43, both centered vertically stacked
  - Middle: Shift summary — "Respite Care · Emma T." in Inter 14px medium #1A1A1A. Second line: "9:00 AM – 1:00 PM" in Inter 12px regular #9CA3AF
  - Right: If multiple shifts that day, show count badge — circular 24px, background #1F6F43, white text "2" in Inter 12px bold. If single shift, show a small right chevron icon (16px, #D1D5DB)
  - Show 3 rows: TUE 18, WED 19 (with "2" badge for 2 shifts), THU 20

**Bottom Tab Bar (fixed, 72px height including home indicator safe area):**
- Background: white #FFFFFF, top border 0.5px #E5E7EB
- 5 equally spaced tabs: Home, Shifts, Routes, Alerts, Profile
- Each tab: outlined stroke icon (24px) above label (Inter 10px medium)
- Active tab (Home): Icon and label in #1F6F43, with a small 3px solid green dot centered above the icon
- Inactive tabs: Icon and label in #9CA3AF
- Alerts tab: if unread, show small red badge circle (16px) with count "3" in white 9px bold, positioned top-right of the bell icon
- Icons should match the owner's tab bar style — clean outlined stroke, not filled

**Overall Polish:**
- Ensure card shadows are soft and consistent (0 2px 8px rgba(0,0,0,0.04))
- All text should have proper line-height (1.4 for headings, 1.5 for body)
- The Check In button should feel like THE primary action on the entire screen — prominent, bold, inviting to tap
- Color consistency: Only #1F6F43 for interactive green elements, #22C55E for status dots, service badge colors for categorization
- No harsh borders on cards — shadow-only separation like the owner screens
- The screen should feel warm, premium, and immediately actionable — staff opens the app and within 1 second knows what shift is next and can check in

---

This revised prompt now matches your owner mobile design language — the bold green name in the greeting, the avatar with green ring, the soft warm background, the generous card treatments, and the refined typography hierarchy. Want me to proceed to the **My Shifts** screen next, or refine anything here?