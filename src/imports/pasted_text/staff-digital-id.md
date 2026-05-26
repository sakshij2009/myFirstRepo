Smart feature — this is essentially a **digital staff ID card** that parents/guardians can verify when the staff member arrives. Great for child safety and trust. Let me think through how this integrates into the Profile screen.

The card should be viewable within the Profile screen and also quickly accessible — a parent standing at the door needs to see it fast. Let me design it as a tappable card preview on the Profile screen that expands into a full-screen ID card view with a flip animation to show front/back.

---

**Figma Make Prompt — Staff Digital ID Card (Profile Screen Integration + Full Card View)**

---

Design a "Digital Staff ID Card" feature integrated into the Profile & Documents screen for "Family Forever" — a child services management platform. This card serves as a visual identity verification tool — parents and guardians can confirm which staff member is arriving for their child's service. The card has a front side (staff identity) and a back side (QR code + terms). Frame size: 390×844 (iPhone 14/15 Pro). Match the existing design language.

**Design System (consistent across all screens):**
- Primary green: #1F6F43
- Background: #F8F8F6 (warm off-white)
- Headings: Poppins — bold/semibold
- Body: Inter — regular/medium
- Card style: White background, border-radius 16px, shadow 0 2px 8px rgba(0,0,0,0.04), 20px internal padding

---

**PART A: ID CARD PREVIEW ON PROFILE SCREEN**

Add a tappable card preview between the Profile Hero Card (avatar, name, stats) and the Personal Details Card on the existing Profile & Documents screen:

**ID Card Preview Section (16px below profile hero card's stat row):**
- Section header row: Left — "Staff ID Card" in Poppins 14px semibold #1A1A1A. Right — "View Full Card >" in Inter 13px medium #1F6F43, tappable
- 12px below header:

**Compact Card Preview (tappable — opens full card view):**
- White card, 16px border-radius, soft shadow 0 2px 8px rgba(0,0,0,0.04)
- Card aspect ratio: Mimics a physical ID card proportion — approximately 350px wide × 100px tall (landscape credit-card shape within the page padding)
- **Top half of the mini card:** Dark green (#1F6F43) background with border-radius 16px 16px 0 0
  - Left: Small Family Forever logo mark (white, 20px) beside "Family Forever Inc." in Poppins 12px semibold white
  - Right: "Employee ID 27" in Inter 11px medium white
- **Bottom half:** White background
  - Left: Small circular staff photo/avatar (36px) with thin green ring
  - Beside: "Sarah Johnson" in Inter 13px semibold #1A1A1A. Below: "Child and Youth Care Worker" in Inter 10px regular #9CA3AF
  - Right: Small QR code thumbnail (28px × 28px, decorative/tiny — not scannable at this size)
- The entire card has a subtle hover/press state — slight scale down (0.98) on tap before opening full view
- Below the card, 8px gap: "Tap to show full card for parent verification" in Inter 11px regular #9CA3AF, centered

---

**PART B: FULL-SCREEN ID CARD VIEW (opens when tapping the preview or "View Full Card")**

This is a dedicated full-screen view showing the ID card large and clear, optimized for showing to a parent at the door. The card can be flipped to show front and back.

**Screen Background:**
- Dark overlay background: #1A1A1A (near black, 95% opacity) — this creates a "card spotlight" effect, making the white card pop visually. Similar to how Apple Wallet shows a card full-screen.
- No tab bar visible on this screen — full immersive card view

**Top Bar (over the dark background):**
- Left: "← Close" in Inter 14px medium white, tapping returns to Profile screen
- Center: "Staff ID Card" in Poppins 16px semibold white
- Right: Share icon (24px, white) — tapping allows sharing the card as an image or PDF

---

**FRONT SIDE OF THE CARD (default view):**

The card floats centered on the dark background with generous padding around it.

**Card Container:**
- Width: 350px (centered horizontally with 20px side margins)
- Height: approximately 520px (portrait card, taller than a credit card — closer to a badge proportion)
- Border-radius: 20px
- Soft shadow: 0 8px 32px rgba(0,0,0,0.3) — elevated card feel on dark background

**Card Layout — Front Side (matching Image 1 exactly):**

- **Top section (green header area):**
  - Background: #1F6F43 (primary green), occupying roughly top 35% of the card
  - Border-radius: 20px 20px 0 0
  - Top center: Family Forever logo — the circular badge logo (the one with the people icon inside a circular "Family Forever" text ring) in white/light treatment, approximately 48px size. Beside the logo: "Family Forever Inc." in Poppins 18px bold white
  - Below logo row (16px gap): "Employee ID 27" in Poppins 16px semibold white, centered

- **Avatar overlap area:**
  - Staff photo in a large circle (100px diameter) with a 4px white border ring, centered horizontally
  - The avatar sits at the boundary between the green header and white body — roughly 50% overlapping the green section and 50% on the white section. This creates the signature visual effect from Image 1.
  - If no photo: Initials "SJ" on #F0FDF4 background, Inter 36px semibold #1F6F43

- **Bottom section (white body area):**
  - Background: white (#FFFFFF), occupying bottom 65% of the card
  - The white area has a subtle curved top edge — a large concave curve that creates the organic wave shape visible in Image 1, where the white area curves up around the avatar
  - Border-radius: 0 0 20px 20px

  - **Below avatar (24px gap from avatar bottom):**
    - Staff name: "Adam Smasher" (or "Sarah Johnson") in Poppins 22px bold #1A1A1A, centered
    - 4px below: Role title "Child and Youth Care Worker" in Inter 14px regular #6B7280, centered

  - **Contact details (32px below role):**
    - Email: "adamsmasher89@gmail.com" in Inter 14px regular #374151, centered
    - 8px gap
    - Phone: "+1-376-345-3456" in Inter 14px regular #374151, centered

  - **Bottom tagline (positioned at bottom of card, 24px from card bottom edge):**
    - "From Humanity to Community" in Poppins 14px bold #1F6F43, centered — this is the company tagline/motto

---

**BACK SIDE OF THE CARD (shown when flipped):**

**Card Container:** Same dimensions, border-radius, and shadow as front side.

**Card Layout — Back Side (matching Image 2 exactly):**

- **Entire card is white background**, border-radius 20px

- **Top area:**
  - "Family Forever Inc." in Poppins 22px bold #374151, centered, 40px from top of card
  - 32px below: QR code — large, centered, approximately 140px × 140px. The QR code should be a black-on-white standard QR code graphic. This QR code links to the staff member's verification page on the Family Forever portal — parents can scan to verify identity digitally.

- **Middle area (40px below QR code):**
  - "Terms & Conditions" in Poppins 16px bold #374151, centered
  - 16px below: Terms text in Inter 13px regular #6B7280, centered, line-height 1.6, max-width 280px:
    - "Use of this card indicates agreement with Family Forever Inc's. Policies and procedures. This Card is the property of Family Forever Inc. of Edmonton, if found please call"
  - 8px below: Phone numbers "825-982-3256 / 825-522-3256" in Inter 14px semibold #374151, centered

- **Bottom area (positioned at bottom, 24px from card bottom edge):**
  - Website: "www.familyforever.ca" in Inter 14px regular #6B7280, centered

---

**FLIP INTERACTION:**

**Flip Button (below the card, on the dark background):**
- Centered horizontally, 24px below the card
- Pill-shaped button: background rgba(255,255,255,0.15) (subtle frosted white on dark), border 1px rgba(255,255,255,0.25), border-radius 24px, padding 10px 24px
- Flip/rotate icon (18px, white) beside "Tap to flip card" in Inter 13px medium white
- On tap: The card performs a smooth 3D horizontal flip animation (rotateY 180deg, ~400ms ease-in-out) to reveal the back side. Tapping again flips back to front.
- The button text changes to "Tap to see front" when showing the back side

**Side Indicator Dots (8px below flip button):**
- Two small dots (8px each) centered horizontally, 8px gap
- Active dot (current side showing): white filled
- Inactive dot: rgba(255,255,255,0.3) semi-transparent
- Left dot = Front side, Right dot = Back side

---

**PART C: QUICK ACCESS — SHOWING CARD TO PARENTS DURING SHIFTS**

For maximum utility, add a quick-access button to show the ID card from the Shift Detail screen (since that's where staff are when they're about to meet a parent):

**On the Shift Detail screen, inside the Client-Staff Pairing Card:**
- Below the existing From → To avatar pairing and service badge
- Add a small row: Left — ID card icon (16px, #1F6F43) beside "Show ID Card to Parent" in Inter 13px medium #1F6F43, tappable
- Tapping opens the same full-screen dark-background card view directly
- This means staff can go: arrive at location → open shift → tap "Show ID Card" → hold phone up for parent to see — 3 taps max

---

**PART D: BRIGHTNESS BOOST BEHAVIOR**

When the full-screen card view opens:
- Note for developer spec: The app should request maximum screen brightness while this view is active (common pattern in boarding passes, Apple Wallet, Starbucks app). This ensures the card and QR code are clearly visible even in bright daylight.
- When the view closes (back to Profile), brightness returns to normal.
- Add a subtle brightness icon (16px, white) in the top-right area of the dark background with "Auto-brightness on" in Inter 10px white — informing the user their screen is temporarily brighter.

---

**Overall Design & Behavior Notes:**
- The ID card must feel TRUSTWORTHY and OFFICIAL — the dark green header with company logo, the clean typography, the professional layout all contribute to this. Parents need to feel confident this is a real employee of Family Forever.
- The large avatar/photo is critical — it's the primary verification element. Parents look at the face, match it to the person at their door, and feel secure. If no photo is uploaded, the Profile screen should show a gentle prompt: "Upload your photo to complete your Staff ID Card" with amber left-border accent card.
- The QR code on the back side adds a digital verification layer — scanning it could open a web page confirming "Sarah Johnson is a verified employee of Family Forever Inc." with their photo, role, and active status. This is a premium trust feature.
- The flip animation should feel physical and satisfying — like flipping an actual card. Not too fast (feels cheap), not too slow (feels laggy). 400ms with ease-in-out is the sweet spot.
- The dark background spotlight effect (Apple Wallet style) makes the card feel special and purposeful — it's not just another screen, it's a verification moment.
- The compact preview on the Profile screen uses the landscape credit-card shape to be recognizable as "a card" even at small size — the green header + white body + tiny avatar is enough visual information.
- Quick access from Shift Detail screen is the key UX decision — staff don't have time to navigate Home → Profile → ID Card when a parent is at the door. The shortcut from shift context makes it 3 taps.
- The card design exactly matches the Figma screens provided (Image 1 front, Image 2 back) — the green header with curved white body overlap, centered avatar at the boundary, company logo, employee ID, name, role, contact info, tagline on front. QR code, terms, phone numbers, website on back.

---

Want me to compile all the staff mobile screens into a final summary document, or is there anything else to refine?