Perfect — bell stays only on the Alerts tab in the bottom nav bar. No duplicate bell in the header. Let's go.

---

**Figma Make Prompt — Notifications Screen (Mobile)**

---

Design a premium mobile "Notifications" screen for "Family Forever" — a child services management platform. This screen is the central hub for all staff alerts, shift reminders, schedule changes, new assignments, and system notifications. Accessed from the Alerts tab in the bottom navigation bar. Frame size: 390×844 (iPhone 14/15 Pro). Match the exact design language of the existing owner mobile screens — bold typographic hierarchy, soft card treatments, green accent system, warm off-white background, and refined spacing.

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
- Left: "Notifications" in Poppins 20px bold #1A1A1A (no back arrow — this is a root tab destination)
- Right: "Mark All Read" in Inter 13px medium #1F6F43, tappable — clears all unread indicators. When no unread notifications exist, this text changes to a small settings gear icon (24px, #6B7280) inside 40px circular touch target that opens notification preferences
- Below title, 4px gap: "3 unread" in Inter 12px regular #9CA3AF (dynamically updates — "All caught up" when zero unread)

**Filter Tabs Row (20px below header):**
- Horizontal scrollable pills matching all other screens
- Pills: "All", "Shifts", "Schedule", "Assignments", "System"
- Active tab: Solid #1F6F43 green background, white text Inter 13px semibold, border-radius 20px, padding 8px 18px, min-height 36px
- Inactive tabs: Background #F3F4F6, text #6B7280, Inter 13px medium
- Default active: "All"
- If a category has unread items, show a tiny red dot (6px) on the top-right edge of that inactive pill

**Notifications List (16px below filter tabs):**
Notifications are grouped by time period with lightweight date headers. Each notification is a distinct card-style row with clear visual hierarchy.

**Time Group Header:**
- "Today" in Poppins 13px semibold #1A1A1A — for today's notifications
- "Yesterday" / "This Week" / "Earlier" for older groups
- 12px gap below group header before the first notification in that group

**Individual Notification Structure:**
Each notification is a compact card-row. Unread vs read is clearly distinguished:

- **Unread notification:**
  - White background card, 14px border-radius, soft shadow 0 2px 8px rgba(0,0,0,0.04), padding 16px
  - LEFT BORDER ACCENT: 3px solid #1F6F43 (green) on the left edge — the unread indicator, matching the owner screen's left-border accent pattern
  - Entire card has a very subtle green tint overlay — background #FCFEFB instead of pure white to subtly differentiate from read notifications

- **Read notification:**
  - White background card (#FFFFFF), 14px border-radius, NO shadow (flat, de-emphasized), padding 16px
  - No left border accent
  - Text colors slightly more muted

- **Card internal layout (same for all notifications):**
  - **Left: Category icon circle (40px)**
    - Each notification type gets a distinct icon and soft background color:
    - Shift Reminder: Clock icon (18px, #1F6F43) on #F0FDF4 background
    - Schedule Change: Calendar shuffle icon (18px, #1E5FA6) on #EBF5FF background
    - New Assignment: Person plus icon (18px, #5B21B6) on #F3F0FF background
    - Check-in Reminder: Map pin icon (18px, #92600A) on #FFF8E1 background
    - Critical/Urgent: Warning triangle icon (18px, #DC2626) on #FEF2F2 background
    - System/General: Info circle icon (18px, #6B7280) on #F3F4F6 background

  - **Middle content (12px gap from icon, flex-grow):**
    - Title: Inter 14px semibold #1A1A1A for unread, Inter 14px medium #374151 for read
    - Description: Inter 13px regular #6B7280, max 2 lines, truncated with ellipsis if longer. Line-height 1.4
    - Timestamp: Inter 11px regular #9CA3AF, 4px below description — relative time format: "5 min ago", "2 hours ago", "Yesterday at 3:15 PM"

  - **Right: Action indicator (optional)**
    - Small right chevron (14px, #D1D5DB) if the notification is tappable and navigates somewhere
    - Or a small action pill for actionable notifications (see examples below)

- **8px gap between notification cards within the same time group**
- **24px gap between time groups**

**Example Notifications (show 7-8 notifications across time groups):**

**Group: Today**

- **Notification 1 (Unread — Shift Reminder):**
  - Icon: Clock on green (#F0FDF4)
  - Left border: 3px #1F6F43
  - Title: "Shift starting soon"
  - Description: "Your Respite Care shift with Emma Thompson begins at 9:00 AM. Location: 1234 Oak Street."
  - Time: "15 min ago"
  - Right: Small pill button "Check In" — background #1F6F43, white text Inter 11px semibold, border-radius 16px, padding 4px 12px, height 28px. This is an inline quick action — tapping goes directly to shift check-in.

- **Notification 2 (Unread — New Assignment):**
  - Icon: Person plus on purple (#F3F0FF)
  - Left border: 3px #1F6F43
  - Title: "New shift assigned"
  - Description: "You've been assigned a Supervised Visitation shift with Lucas Martinez on March 19."
  - Time: "1 hour ago"
  - Right: Chevron (navigates to shift detail)

- **Notification 3 (Unread — Critical/Urgent):**
  - Icon: Warning triangle on red (#FEF2F2)
  - Left border: 3px #DC2626 (red instead of green — urgent notifications get red accent)
  - Card background: #FFFBFB (very subtle red tint instead of green tint)
  - Title: "Schedule change — action required"
  - Description: "Your Emergency Care shift on March 16 has been moved from 2:00 PM to 4:00 PM. Please confirm."
  - Time: "3 hours ago"
  - Right: Small pill button "Confirm" — background #1F6F43, white text, same inline action pill pattern

**Group: Yesterday**

- **Notification 4 (Read — Check-in Reminder):**
  - Icon: Map pin on amber (#FFF8E1)
  - No left border, flat card, muted text
  - Title: "Check-in reminder"
  - Description: "Don't forget to check in for your Transportation shift with Sophia Kim at 3:00 PM."
  - Time: "Yesterday at 2:45 PM"
  - Right: Chevron

- **Notification 5 (Read — Schedule Change):**
  - Icon: Calendar on blue (#EBF5FF)
  - Title: "Shift completed"
  - Description: "Your Respite Care shift with Emma Thompson has been marked as completed. 4 hours logged."
  - Time: "Yesterday at 1:05 PM"
  - Right: Chevron

**Group: This Week**

- **Notification 6 (Read — System):**
  - Icon: Info circle on gray (#F3F4F6)
  - Title: "Availability reminder"
  - Description: "Please update your availability for the week of March 23. Deadline: March 18."
  - Time: "March 12 at 9:00 AM"
  - Right: Small pill "Update" — outlined style, 1px border #1F6F43, text #1F6F43, Inter 11px medium, border-radius 16px, padding 4px 12px

- **Notification 7 (Read — New Assignment):**
  - Icon: Person plus on purple (#F3F0FF)
  - Title: "New client added to your roster"
  - Description: "You've been assigned to work with a new client: Aiden Park (Emergency Care)."
  - Time: "March 11 at 2:30 PM"
  - Right: Chevron

- **Notification 8 (Read — System):**
  - Icon: Info circle on gray (#F3F4F6)
  - Title: "Document expiring soon"
  - Description: "Your First Aid certification expires on April 1, 2026. Please upload your renewed certificate."
  - Time: "March 10 at 10:00 AM"
  - Right: Small pill "Upload" — outlined, same pattern as "Update" above

**Swipe Actions (interaction note — not visually shown by default):**
- Swiping a notification card LEFT reveals two action buttons behind the card:
  - "Archive" — gray background (#6B7280), white archive icon
  - "Delete" — red background (#DC2626), white trash icon
- This is a standard iOS/Android pattern — note in the design spec for developer handoff

**Empty State (shown when "All caught up"):**
- Centered vertically in content area
- Soft illustration: Green checkmark circle (64px) with outline style, #D1D5DB
- "All caught up!" in Poppins 16px semibold #1A1A1A
- "You have no new notifications" in Inter 14px regular #9CA3AF
- 8px gap between lines

**Bottom Tab Bar (fixed, identical to all screens):**
- 5 tabs: Home, Shifts, Routes, Alerts (active — green icon + label + 3px dot), Profile
- Alerts tab active state: bell icon filled/highlighted in #1F6F43, label #1F6F43, green dot above
- When this screen is open, the red badge count on the Alerts tab is hidden (user is already viewing notifications)

**Overall Polish & Behavior Notes:**
- The unread vs read distinction should be immediately visible — the green left-border accent + subtle background tint makes unread notifications pop without being aggressive
- Critical/urgent notifications break the pattern with a RED left-border accent and red background tint — this is intentional. Safety-critical alerts (schedule conflicts, incident reports, urgent reassignments) need to visually stand out from routine notifications
- Inline action pills ("Check In", "Confirm", "Update", "Upload") are a premium pattern — they let staff take action directly from the notification without navigating away. This reduces friction significantly. These pills should be small and secondary to the notification content — not full-width buttons
- The timestamp uses relative time ("5 min ago") for recent notifications and absolute time ("March 12 at 9:00 AM") for older ones — this is the standard premium app pattern (Slack, Linear, Notion)
- The filter tab pills with tiny red dots indicate which categories have unread items — this helps staff quickly filter to what needs attention
- Notification cards should be tappable as a whole — the entire card is a touch target that navigates to the relevant screen (shift detail, availability, profile documents, etc.)
- Scroll performance is important here — staff may accumulate dozens of notifications. The list should scroll smoothly with lazy rendering
- "Mark All Read" is a power action — it should feel accessible but not accidentally triggerable. Consider a brief confirmation toast ("Marked all as read" with an "Undo" option that fades after 3 seconds)
- The screen should feel organized and calm even with many notifications — the time grouping, consistent card structure, and clear icon color coding prevent visual chaos

---

Ready for the last screen — **Profile & Documents**?