**Figma Make Prompt — Staff Mobile Login Screen**

---

Design a premium mobile login screen for "Family Forever" — a child services management platform. This is the staff-only login screen with email and password authentication. Frame size: 390×844 (iPhone 14/15 Pro). The screen uses a two-zone vertical composition — dark green branded header flowing into a white bottom sheet login card.

**Design System:**
- Primary green: #1F6F43
- Headings: Poppins — bold/semibold/extrabold
- Body: Inter — regular/medium/semibold
- Background green gradient: warm forest green matching the owner desktop login panel

---

**ZONE 1: DARK GREEN BRANDED HEADER (top ~38% of screen)**

**Background:**
- Full-width gradient: linear-gradient from #1B5E35 (top) through #164F2D, #114425 to #0A2E17 (where it meets the white card). The gradient should feel rich, warm, and organic — not flat or cold.
- Subtle central radial glow: A soft lighter green radial gradient (rgba 35,130,65 at 20% opacity) centered horizontally and positioned vertically around 15% from top. This creates a warm spotlight effect behind the logo. Radius approximately 350px, fading to transparent.
- Three concentric decorative ring circles centered on the same point as the radial glow:
  - Outer ring: 420px diameter, 1px border rgba(255,255,255,0.025), no fill
  - Middle ring: 300px diameter, 1px border rgba(255,255,255,0.03), no fill
  - Inner ring: 180px diameter, 1px border rgba(255,255,255,0.025), no fill
  - These rings are extremely subtle — barely visible, adding depth without distraction
- Very subtle noise texture overlay across the entire green area: 20% opacity, mix-blend-mode overlay — adds a premium tactile grain quality

**Brand Content (centered horizontally in the green zone):**

- **Logo container (positioned 72px from top of screen):**
  - Circular container: 80px diameter, border-radius 50% (full circle)
  - Background: rgba(255,255,255,0.07) — frosted glass effect
  - Border: 1.5px solid rgba(255,255,255,0.1)
  - Backdrop blur: 8px (if supported, fallback to solid rgba background)
  - Inside: Family Forever logo icon — the circular badge with people/family icon in white/light strokes, approximately 40px. Use the actual Family Forever brand mark matching the owner desktop login.
  - Outer pulse ring: A second circle 8px larger than the logo container (96px diameter), centered on same point, 1px border rgba(255,255,255,0.06). This ring has a very slow gentle pulse animation — opacity fading between 50% and 100% over 4 seconds. Adds a subtle "alive" quality.

- **Brand name (28px below logo container):**
  - "Family Forever" in Poppins 28px bold, color #FFFFFF, letter-spacing -0.5px, centered

- **Tagline (10px below brand name):**
  - "Caring for every family, every step of the way." in Inter 13px regular, color rgba(255,255,255,0.38), centered, max-width 230px, line-height 1.55

- **Bottom padding: 40px** from tagline to where the white card begins

---

**ZONE 2: WHITE LOGIN CARD (bottom ~62% of screen)**

The white card is styled as a bottom sheet — it has rounded top corners and extends to the very bottom of the screen with no rounded bottom corners. This creates the feeling of a panel sliding up from below.

**Card Container:**
- Background: #FFFFFF
- Border-radius: 28px 28px 0 0 (rounded top-left and top-right, flat bottom)
- Shadow: 0 -4px 40px rgba(0,0,0,0.15) — shadow cast upward onto the green zone, creating elevation
- Padding: 36px left/right 28px, 36px top, 40px bottom
- The card fills from its start point to the bottom of the screen — it is not a floating card, it docks to the bottom edge

**Card Header (top of white area):**
- "STAFF PORTAL" in Poppins 11px bold, letter-spacing 1.5px, color #1F6F43, uppercase, left-aligned. Margin-bottom 10px.
- "Welcome back" in Poppins 28px bold, color #111111, letter-spacing -0.4px, left-aligned. Margin-bottom 8px.
- "Sign in to manage your shifts" in Inter 14px regular, color #9CA3AF, left-aligned. Margin-bottom 36px.

**Email Field (36px below subtitle):**
- Field label: "Email Address" in Inter 13px semibold, color #374151. Margin-bottom 10px.
- Input wrapper: Relative positioned container
  - Left icon: Mail/envelope outlined icon (18px, color #C0C5CC) positioned absolutely 16px from left edge inside the input
  - Input: Width 100%, height 52px, padding-left 46px, padding-right 16px. Background #F8F9FA, border 1.5px solid #E8EAED, border-radius 14px. Font: Inter 15px regular, color #111111. Placeholder "you@familyforever.com" in color #C0C5CC.
  - Focus state: Background changes to #FFFFFF, border changes to 1.5px solid #1F6F43, box-shadow 0 0 0 3.5px rgba(31,111,67,0.07). The left icon color changes to #1F6F43.
  - Error state: Border 1.5px solid #EF4444, background #FEF2F2. Error message appears below: "Please enter a valid email address" in Inter 11.5px medium #EF4444, 6px margin-top.

**Password Field (24px below email field):**
- Same structure and sizing as email field
- Left icon: Lock outlined icon (18px, #C0C5CC)
- Placeholder: "Enter your password"
- Right icon button: Eye/visibility toggle — 38px × 38px touch target, positioned absolutely right 10px. Eye icon 18px, color #C0C5CC. On hover: light gray background #F3F4F6, icon color #6B7280. Tapping toggles between password hidden (dots) and visible (plain text), eye icon changes to eye-with-slash.
- Same focus and error states as email field

**Remember Me + Forgot Password Row (24px below password field):**
- Flexbox row, space-between alignment
- Left: Custom checkbox (18px × 18px, border 1.5px solid #D1D5DB, border-radius 5px, background #F9FAFB). Checked state: #1F6F43 green fill with white checkmark. Label: "Remember me" in Inter 13px regular #6B7280, 9px gap from checkbox. The entire label + checkbox is wrapped in a tappable label element.
- Right: "Forgot password?" in Inter 13px semibold #1F6F43 — tappable link. On hover: opacity reduces to 0.75.
- Margin-bottom 32px below this row.

**Sign In Button (32px below remember row):**
- Full width, height 56px, background #1F6F43, border-radius 14px
- Text: "Sign In" in Poppins 16px semibold white, centered
- Shadow: 0 4px 16px rgba(31,111,67,0.28) — green-tinted elevation
- Hover state: Background darkens to #1A6039, translateY -1px upward, shadow expands to 0 8px 28px rgba(31,111,67,0.35)
- Active/pressed state: Scale 0.985, shadow reduces to 0 2px 8px rgba(31,111,67,0.2)
- Subtle shimmer animation: A very faint diagonal white gradient (6% opacity, 50% width, skewed -18deg) sweeps across the button surface from left to right every 5 seconds. Very subtle — barely noticeable, adds premium living quality.
- Loading state (after tap): Button text fades out, replaced by a white spinning circle (22px, 2.5px border, top-border white, other borders 25% white opacity). Button becomes non-interactive with pointer-events none.
- Success state (after 1.8s loading): Background transitions to #22C55E (bright green), text changes to checkmark icon + "Welcome, Sarah!" with smooth transition.

**Contact Administrator Footer (pushed to bottom of card with margin-top auto):**
- 24px padding-top above the text
- "Don't have an account?" in Inter 13px regular #9CA3AF, followed by "Contact your administrator." as a tappable link in Inter 13px semibold #1F6F43. On hover: underline appears.
- Text is center-aligned
- The margin-top auto on this footer element pushes it to the very bottom of the card, ensuring it always sits near the bottom regardless of content above — prevents it from crowding the Sign In button.

---

**Animation on Screen Load (staggered reveal):**
- Zone 1 (brand area): Fades in with a slight downward slide (translateY from -24px to 0, opacity 0 to 1) over 0.9 seconds with cubic-bezier(0.16, 1, 0.3, 1) easing. Starts immediately.
- Zone 2 (white card): Fades in with a slight upward slide (translateY from 32px to 0, opacity 0 to 1) over 0.9 seconds with the same easing. Starts with a 0.12 second delay after Zone 1 begins. This creates the feeling of the card sliding up into position.

---

**Overall Design Notes:**
- The two-zone composition (dark green top + white bottom sheet) creates a premium, app-like feel — the branded area establishes identity and the white card is the functional workspace
- The bottom sheet card pattern (rounded top, flat bottom) is a native mobile convention — it feels natural and intentional, not like a floating card awkwardly placed
- The upward shadow on the card creates clear separation between the two zones without a hard edge
- The green background should feel identical to the owner desktop login's green panel — same warmth, same depth, same concentric ring pattern
- The frosted glass logo container with the pulsing outer ring is the one decorative flourish — it adds brand identity without cluttering the interface
- All spacing is generous and deliberate — the design breathes at every level (logo to name, name to tagline, header to first field, between fields, field to button, button to footer)
- Input fields at 52px height with 14px radius feel substantial and tappable — not thin or cramped
- The green focus state on inputs (border + subtle glow shadow) ties the form interaction back to the brand color
- The Sign In button at 56px is deliberately taller than in-app buttons (which are 48-52px) — the login action deserves extra prominence as the gateway to the entire staff experience
- Font pairing is exactly the design system: Poppins for headings and branded text, Inter for form labels, inputs, and body text — no deviations

---

Want me to compile all the staff mobile prompts into a final summary document now?