const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { defineSecret } = require("firebase-functions/params");
const { initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const sgMail = require("@sendgrid/mail");

initializeApp();

const sendgridApiKey = defineSecret("SENDGRID_API_KEY");

const APP_URL = "https://ffadmin-prod.web.app";
const AUTH_ACTION_URL = `${APP_URL}/auth/action`;
const INTAKE_LOGIN_URL = `${APP_URL}/intake-form/login`;
const FROM_EMAIL = "intakes@familyforever.ca";
const FROM_NAME = "Family Forever Inc.";

// ── HTML email template ───────────────────────────────────────────────────────
// isInvitation = true  → admin sent this; CTA links directly to signup page
// isInvitation = false → user-requested magic link; CTA is the Firebase sign-in link
function buildEmailHTML(ctaLink, role, isInvitation) {
  const isParent = role === "parent";

  // Header tagline
  const headerTagline = isParent
    ? "Family Portal"
    : "Caring for every family, every step of the way.";

  // Body copy
  const bodyHeading = isInvitation
    ? "You've been invited to Family Forever Inc."
    : "Your sign-in link is ready";

  const bodyIntro = isInvitation
    ? `You have been invited to join the <strong>Family Forever Inc.</strong> Intake Management Portal.
       Click the button below to create your account and get started.`
    : `Click the button below to access the Family Forever Inc. Intake Portal.
       This link is valid for <strong>24 hours</strong> and can only be used once.`;

  const ctaLabel = isInvitation
    ? "Create Your Account &rarr;"
    : "Sign in to Family Forever &rarr;";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>Family Forever Inc.</title>
</head>
<body style="margin:0;padding:0;background:#F3F4F6;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F3F4F6;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0"
        style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(160deg,#1B5E37 0%,#14472A 100%);padding:36px 40px;text-align:center;">
            <img src="${APP_URL}/images/logo.png" alt="Family Forever Inc."
              width="56" height="56"
              style="border-radius:50%;display:block;margin:0 auto 16px;border:2px solid rgba(255,255,255,0.2);">
            <h1 style="color:#ffffff;margin:0;font-size:22px;font-weight:700;">Family Forever Inc.</h1>
            <p style="color:rgba(255,255,255,0.7);margin:6px 0 0;font-size:13px;">${headerTagline}</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:36px 40px 28px;">
            <h2 style="color:#111827;font-size:18px;font-weight:700;margin:0 0 10px;">
              ${bodyHeading}
            </h2>
            <p style="color:#4B5563;font-size:14px;line-height:1.7;margin:0 0 28px;">
              ${bodyIntro}
            </p>

            <!-- CTA -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
              <tr><td align="center">
                <a href="${ctaLink}"
                  style="display:inline-block;background:#1B5E37;color:#ffffff;text-decoration:none;
                         font-size:15px;font-weight:700;padding:15px 40px;border-radius:10px;
                         letter-spacing:0.2px;">
                  ${ctaLabel}
                </a>
              </td></tr>
            </table>

            <!-- First-time instructions -->
            <table width="100%" cellpadding="0" cellspacing="0"
              style="background:#F0FFF4;border-radius:12px;border:1px solid #D1FAE5;margin-bottom:28px;">
              <tr>
                <td style="padding:20px 24px;">
                  <p style="color:#1B5E37;font-size:12px;font-weight:700;margin:0 0 14px;
                             text-transform:uppercase;letter-spacing:0.8px;">
                    First time here? Here's what to do:
                  </p>
                  <table cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="padding:5px 0;">
                        <span style="color:#1B5E37;font-weight:700;margin-right:10px;">1.</span>
                        <span style="color:#374151;font-size:13px;line-height:1.5;">
                          Click the button above to open the portal
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:5px 0;">
                        <span style="color:#1B5E37;font-weight:700;margin-right:10px;">2.</span>
                        <span style="color:#374151;font-size:13px;line-height:1.5;">
                          Complete your sign-up with your name and details
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:5px 0;">
                        <span style="color:#1B5E37;font-weight:700;margin-right:10px;">3.</span>
                        <span style="color:#374151;font-size:13px;line-height:1.5;">
                          Sign in to access your personal dashboard
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:5px 0;">
                        <span style="color:#1B5E37;font-weight:700;margin-right:10px;">4.</span>
                        <span style="color:#374151;font-size:13px;line-height:1.5;">
                          Bookmark
                          <a href="${INTAKE_LOGIN_URL}" style="color:#1B5E37;font-weight:600;">${INTAKE_LOGIN_URL}</a>
                          for easy access in the future
                        </span>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

            <p style="color:#9CA3AF;font-size:12px;line-height:1.7;margin:0;">
              If you did not request this link, you can safely ignore this email.
              <br>Need help? Reply to this email and our team will get back to you.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#F9FAFB;padding:18px 40px;border-top:1px solid #E5E7EB;text-align:center;">
            <p style="color:#9CA3AF;font-size:12px;margin:0 0 4px;">Family Forever Inc.</p>
            <a href="mailto:${FROM_EMAIL}"
              style="color:#1B5E37;font-size:12px;text-decoration:none;">${FROM_EMAIL}</a>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ── Cloud Function ────────────────────────────────────────────────────────────
exports.sendSignInEmail = onCall(
  { secrets: [sendgridApiKey] },
  async (request) => {
    const { email, role, isInvitation } = request.data;

    if (!email || typeof email !== "string") {
      throw new HttpsError("invalid-argument", "A valid email address is required.");
    }

    const normalizedEmail = email.trim().toLowerCase();

    sgMail.setApiKey(sendgridApiKey.value());

    // ── Invitation emails (admin → new worker) ────────────────────────────────
    // Use a direct link to the signup page — no Firebase magic link needed.
    if (isInvitation) {
      try {
        await sgMail.send({
          to: normalizedEmail,
          from: { email: FROM_EMAIL, name: FROM_NAME },
          replyTo: FROM_EMAIL,
          subject: "You're invited to Family Forever Inc.",
          html: buildEmailHTML(INTAKE_LOGIN_URL, role, true),
        });
      } catch (err) {
        console.error("SendGrid error:", err?.response?.body ?? err);
        throw new HttpsError("internal", "Failed to send email.");
      }
      return { success: true };
    }

    // ── Magic-link sign-in emails (user-requested from login page) ────────────
    const params = new URLSearchParams({ email: normalizedEmail });
    if (role) params.set("role", role);

    const actionCodeSettings = {
      url: `${AUTH_ACTION_URL}?${params.toString()}`,
      handleCodeInApp: true,
    };

    let signInLink;
    try {
      signInLink = await getAuth().generateSignInWithEmailLink(
        normalizedEmail,
        actionCodeSettings
      );
    } catch (err) {
      console.error("generateSignInWithEmailLink error:", err);
      throw new HttpsError("internal", "Failed to generate sign-in link.");
    }

    try {
      await sgMail.send({
        to: normalizedEmail,
        from: { email: FROM_EMAIL, name: FROM_NAME },
        replyTo: FROM_EMAIL,
        subject: "Your Family Forever sign-in link",
        html: buildEmailHTML(signInLink, role, false),
      });
    } catch (err) {
      console.error("SendGrid error:", err?.response?.body ?? err);
      throw new HttpsError("internal", "Failed to send email.");
    }

    return { success: true };
  }
);

// ── Auto Clock-Out: runs every 5 minutes ──────────────────────────────────────
// Finds shifts that are in-progress (clocked in, not clocked out) and whose
// scheduled end time passed more than 15 minutes ago, then clocks them out
// at the scheduled end time.
exports.autoClockOut = onSchedule(
  { schedule: "every 5 minutes", timeZone: "America/Edmonton" },
  async () => {
    const db = getFirestore();
    const now = new Date();

    // Edmonton "minutes since midnight" for the current moment
    const edmontonParts = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Edmonton",
      hour: "numeric", minute: "numeric", hour12: false,
    }).formatToParts(now);
    const edmontonH = parseInt(edmontonParts.find(p => p.type === "hour").value, 10);
    const edmontonM = parseInt(edmontonParts.find(p => p.type === "minute").value, 10);
    const nowMins = edmontonH * 60 + edmontonM;

    // Parse any stored time string → Edmonton minutes since midnight
    const timeToMins = (timeStr) => {
      if (!timeStr) return null;
      const t = String(timeStr).trim();
      // Full ISO string
      if (t.includes("T") || t.includes("Z")) {
        const d = new Date(t);
        if (isNaN(d.getTime())) return null;
        const parts = new Intl.DateTimeFormat("en-US", {
          timeZone: "America/Edmonton",
          hour: "numeric", minute: "numeric", hour12: false,
        }).formatToParts(d);
        const h = parseInt(parts.find(p => p.type === "hour").value, 10);
        const m = parseInt(parts.find(p => p.type === "minute").value, 10);
        return h * 60 + m;
      }
      // "9:30 PM" / "09:00 AM"
      if (/AM|PM/i.test(t)) {
        const spaceIdx = t.lastIndexOf(" ");
        const period = t.slice(spaceIdx + 1).toUpperCase();
        let [h, m] = t.slice(0, spaceIdx).split(":").map(Number);
        if (period === "PM" && h !== 12) h += 12;
        if (period === "AM" && h === 12) h = 0;
        if (isNaN(h) || isNaN(m)) return null;
        return h * 60 + m;
      }
      // "21:30" or "09:00"
      if (/^\d{1,2}:\d{2}$/.test(t)) {
        const [h, m] = t.split(":").map(Number);
        if (isNaN(h) || isNaN(m)) return null;
        return h * 60 + m;
      }
      return null;
    };

    // Format minutes-since-midnight as "09:30 PM"
    const minsToTimeStr = (totalMins) => {
      const h = Math.floor(totalMins / 60) % 24;
      const m = totalMins % 60;
      const ampm = h >= 12 ? "PM" : "AM";
      const h12 = h % 12 || 12;
      return `${String(h12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${ampm}`;
    };

    // Query: shifts that have a clockInTime but no clockOutTime and no autoClockOut flag
    const snapshot = await db.collection("shifts")
      .where("autoClockOut", "!=", true)
      .get();

    const batch = db.batch();
    let count = 0;

    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();

      // Must be clocked in but not clocked out
      const clockedIn  = !!(data.clockInTime || data.clockIn || data.clockin);
      const clockedOut = !!(data.clockOutTime || data.clockOut || data.clockout);
      if (!clockedIn || clockedOut) continue;

      const endMins = timeToMins(data.endTime);
      if (endMins === null) continue;

      // Diff: positive = we are past the end time
      let diff = nowMins - endMins;
      if (diff < -720) diff += 1440; // midnight crossover

      if (diff >= 15) {
        const scheduledEndTimeStr = minsToTimeStr(endMins);
        batch.update(docSnap.ref, {
          clockOut: FieldValue.serverTimestamp(),
          clockOutTime: scheduledEndTimeStr,
          clockOutDate: now.toISOString(),
          clockOutLocation: "Auto clock-out (system)",
          autoClockOut: true,
        });
        count++;
      }
    }

    if (count > 0) {
      await batch.commit();
      console.log(`Auto clock-out: processed ${count} shift(s).`);
    } else {
      console.log("Auto clock-out: no shifts needed clock-out.");
    }
  }
);
