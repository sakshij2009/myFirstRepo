import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import {
  applyActionCode,
  checkActionCode,
  confirmPasswordReset,
  isSignInWithEmailLink,
  signInWithEmailLink,
  verifyPasswordResetCode,
} from "firebase/auth";
import { collection, doc, getDocs, query, updateDoc, where } from "firebase/firestore";
import { CheckCircle, AlertCircle, Loader2, Eye, EyeOff, ArrowRight } from "lucide-react";

// ─── Design tokens (match Login.jsx / existing dashboard) ────────────────────
const GREEN = "#1B5E37";
const GREEN_DARK = "#14472A";
const GREEN_BG = "#F0FFF4";

const cardStyle = {
  background: "#FFFFFF",
  borderRadius: 20,
  padding: "40px 36px",
  boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
  width: "100%",
  maxWidth: 440,
  fontFamily: "'Inter', 'Plus Jakarta Sans', sans-serif",
};

const btnPrimary = {
  width: "100%",
  height: 48,
  borderRadius: 10,
  background: GREEN,
  color: "#fff",
  fontSize: 15,
  fontWeight: 600,
  border: "none",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  transition: "background 0.15s ease",
};

const inputStyle = (hasError) => ({
  width: "100%",
  height: 48,
  borderRadius: 10,
  border: hasError ? "1px solid #EF4444" : "1px solid #D1D5DB",
  paddingLeft: 16,
  paddingRight: 40,
  fontSize: 14,
  fontFamily: "'Inter', sans-serif",
  color: "#111827",
  background: "#FFFFFF",
  outline: "none",
  boxSizing: "border-box",
});

// ─── Logo + heading shared header ─────────────────────────────────────────────
function CardHeader({ title, subtitle }) {
  return (
    <div style={{ textAlign: "center", marginBottom: 32 }}>
      <div style={{
        width: 56, height: 56, borderRadius: "50%",
        background: GREEN_BG, margin: "0 auto 16px",
        display: "flex", alignItems: "center", justifyContent: "center",
        overflow: "hidden",
      }}>
        <img src="/images/logo.png" alt="Family Forever" style={{ width: 56, height: 56, objectFit: "contain" }} />
      </div>
      <h1 style={{ fontSize: 20, fontWeight: 700, color: "#111827", margin: 0 }}>Family Forever</h1>
      {title && <p style={{ fontSize: 16, fontWeight: 600, color: "#374151", marginTop: 20, marginBottom: 0 }}>{title}</p>}
      {subtitle && <p style={{ fontSize: 14, color: "#6B7280", marginTop: 8, marginBottom: 0, lineHeight: 1.5 }}>{subtitle}</p>}
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────
export default function AuthActionHandler() {
  const navigate = useNavigate();

  // phase: "loading" | "success" | "error" | "resetForm" | "emailPrompt"
  const [phase, setPhase] = useState("loading");
  const [statusMsg, setStatusMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // password reset form
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pwError, setPwError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // email prompt (sign-in link, email not in localStorage)
  const [promptEmail, setPromptEmail] = useState("");
  const [promptEmailError, setPromptEmailError] = useState("");
  const [pendingHref, setPendingHref] = useState("");

  const params = new URLSearchParams(window.location.search);
  const mode = params.get("mode");
  const oobCode = params.get("oobCode");

  // ── helpers ──────────────────────────────────────────────────────────────────
  const redirectToSignIn = (delayMs = 0) => {
    setTimeout(() => navigate("/intake-form/login", { replace: true }), delayMs);
  };

  const friendlyError = (err) => {
    console.error("Firebase auth action error:", err.code, err);
    switch (err.code) {
      case "auth/expired-action-code":
      case "auth/invalid-action-code":
        return "This link has expired or has already been used. Please request a new one.";
      case "auth/weak-password":
        return "Password must be at least 6 characters.";
      case "auth/user-disabled":
        return "This account has been disabled. Contact support.";
      case "auth/user-not-found":
        return "No account found for this email. Please sign up first.";
      case "auth/invalid-email":
        return "Invalid email address.";
      default:
        return "Something went wrong. Please try again.";
    }
  };

  // ── sign-in via email link ───────────────────────────────────────────────────
  const completeSignIn = async (email, href) => {
    try {
      await signInWithEmailLink(auth, email.trim().toLowerCase(), href);
      window.localStorage.removeItem("emailForSignIn");

      const normalizedEmail = email.trim().toLowerCase();
      const q = query(
        collection(db, "dev_intakeUsers"),
        where("email", "==", normalizedEmail)
      );
      const snap = await getDocs(q);

      if (!snap.empty) {
        // Mark account as verified in Firestore (first-time magic-link sign-in)
        const docRef = doc(db, "dev_intakeUsers", snap.docs[0].id);
        await updateDoc(docRef, { verified: true });

        const userData = { id: snap.docs[0].id, ...snap.docs[0].data(), verified: true };
        localStorage.setItem("intakeUser", JSON.stringify(userData));
        localStorage.setItem("user", JSON.stringify(userData));
        setStatusMsg("Signed in successfully! Redirecting to dashboard…");
        setPhase("success");
        setTimeout(() => navigate("/intake-form/dashboard", { replace: true }), 1200);
      } else {
        setErrorMsg("No account found for this email. Please sign up at the portal.");
        setPhase("error");
      }
    } catch (err) {
      setErrorMsg(friendlyError(err));
      setPhase("error");
    }
  };

  // ── on mount: handle the action code ─────────────────────────────────────────
  useEffect(() => {
    if (!mode || !oobCode) {
      setErrorMsg("Invalid link — missing required parameters.");
      setPhase("error");
      return;
    }

    const href = window.location.href;

    switch (mode) {
      // ── Email verification ──────────────────────────────────────────────────
      case "verifyEmail":
        applyActionCode(auth, oobCode)
          .then(() => {
            setStatusMsg("Email verified ✓ Redirecting to sign in…");
            setPhase("success");
            redirectToSignIn(2000);
          })
          .catch((err) => {
            setErrorMsg(friendlyError(err));
            setPhase("error");
          });
        break;

      // ── Password reset ──────────────────────────────────────────────────────
      case "resetPassword":
        verifyPasswordResetCode(auth, oobCode)
          .then(() => setPhase("resetForm"))
          .catch((err) => {
            setErrorMsg(friendlyError(err));
            setPhase("error");
          });
        break;

      // ── Recover (revert) email ──────────────────────────────────────────────
      case "recoverEmail":
        checkActionCode(auth, oobCode)
          .then(() => applyActionCode(auth, oobCode))
          .then(() => {
            setStatusMsg("Your email address has been recovered. Redirecting to sign in…");
            setPhase("success");
            redirectToSignIn(2500);
          })
          .catch((err) => {
            setErrorMsg(friendlyError(err));
            setPhase("error");
          });
        break;

      // ── Email link sign-in ──────────────────────────────────────────────────
      case "signIn":
        if (!isSignInWithEmailLink(auth, href)) {
          setErrorMsg("Invalid sign-in link.");
          setPhase("error");
          break;
        }
        {
          const emailFromParam = params.get("email");
          const emailFromStorage = window.localStorage.getItem("emailForSignIn");
          const email = emailFromParam
            ? decodeURIComponent(emailFromParam)
            : emailFromStorage;

          if (email) {
            completeSignIn(email, href);
          } else {
            setPendingHref(href);
            setPhase("emailPrompt");
          }
        }
        break;

      // ── Verify + change email ───────────────────────────────────────────────
      case "verifyAndChangeEmail":
        applyActionCode(auth, oobCode)
          .then(() => {
            setStatusMsg("Your email address has been updated. Redirecting to sign in…");
            setPhase("success");
            redirectToSignIn(2500);
          })
          .catch((err) => {
            setErrorMsg(friendlyError(err));
            setPhase("error");
          });
        break;

      default:
        setErrorMsg("Unknown action type.");
        setPhase("error");
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── password reset submit ─────────────────────────────────────────────────────
  const handlePasswordReset = async (e) => {
    e.preventDefault();
    setPwError("");

    if (newPassword.length < 6) {
      setPwError("Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      await confirmPasswordReset(auth, oobCode, newPassword);
      setStatusMsg("Password updated! Redirecting to sign in…");
      setPhase("success");
      redirectToSignIn(2000);
    } catch (err) {
      setPwError(friendlyError(err));
    } finally {
      setSubmitting(false);
    }
  };

  // ── email prompt submit ───────────────────────────────────────────────────────
  const handleEmailPromptSubmit = (e) => {
    e.preventDefault();
    setPromptEmailError("");
    if (!promptEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(promptEmail.trim())) {
      setPromptEmailError("Please enter a valid email address.");
      return;
    }
    setPhase("loading");
    completeSignIn(promptEmail.trim(), pendingHref);
  };

  // ── render ────────────────────────────────────────────────────────────────────
  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(160deg, #F0FFF4 0%, #E8F5E9 100%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px 16px",
      fontFamily: "'Inter', 'Plus Jakarta Sans', sans-serif",
    }}>
      <div style={cardStyle}>

        {/* ── Loading ── */}
        {phase === "loading" && (
          <>
            <CardHeader title="Verifying your link…" />
            <div style={{ display: "flex", justifyContent: "center", padding: "16px 0" }}>
              <Loader2 size={36} color={GREEN} style={{ animation: "spin 1s linear infinite" }} />
            </div>
            <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
          </>
        )}

        {/* ── Success ── */}
        {phase === "success" && (
          <>
            <CardHeader />
            <div style={{ textAlign: "center", padding: "8px 0 24px" }}>
              <CheckCircle size={52} color={GREEN} style={{ margin: "0 auto 16px", display: "block" }} />
              <p style={{ fontSize: 16, fontWeight: 600, color: "#111827", margin: "0 0 8px" }}>{statusMsg}</p>
            </div>
            <button style={{ ...btnPrimary, background: GREEN }} onClick={() => navigate("/intake-form/dashboard", { replace: true })}>
              Go to Dashboard <ArrowRight size={16} />
            </button>
          </>
        )}

        {/* ── Error ── */}
        {phase === "error" && (
          <>
            <CardHeader />
            <div style={{
              background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 10,
              padding: "16px 20px", marginBottom: 24, display: "flex", gap: 12,
            }}>
              <AlertCircle size={20} color="#EF4444" style={{ flexShrink: 0, marginTop: 2 }} />
              <p style={{ fontSize: 14, color: "#991B1B", margin: 0, lineHeight: 1.5 }}>{errorMsg}</p>
            </div>
            <button style={btnPrimary} onClick={() => navigate("/intake-form/login", { replace: true })}>
              Back to sign in <ArrowRight size={16} />
            </button>
          </>
        )}

        {/* ── Password Reset Form ── */}
        {phase === "resetForm" && (
          <>
            <CardHeader
              title="Set a new password"
              subtitle="Choose a strong password for your account."
            />
            <form onSubmit={handlePasswordReset}>
              {/* New password */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>
                  New Password
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showNew ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    style={inputStyle(!!pwError)}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew((v) => !v)}
                    style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#6B7280", padding: 0 }}
                  >
                    {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Confirm password */}
              <div style={{ marginBottom: 4 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>
                  Confirm Password
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showConfirm ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat your new password"
                    style={inputStyle(!!pwError)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((v) => !v)}
                    style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#6B7280", padding: 0 }}
                  >
                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {pwError && (
                <p style={{ fontSize: 13, color: "#EF4444", margin: "8px 0 0" }}>{pwError}</p>
              )}

              <button
                type="submit"
                disabled={submitting}
                style={{ ...btnPrimary, marginTop: 24, opacity: submitting ? 0.7 : 1 }}
              >
                {submitting ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> : null}
                {submitting ? "Updating…" : "Update Password"}
              </button>
            </form>
          </>
        )}

        {/* ── Email Prompt (sign-in link, no email in storage) ── */}
        {phase === "emailPrompt" && (
          <>
            <CardHeader
              title="Confirm your email"
              subtitle="Enter the email address you used when requesting this sign-in link."
            />
            <form onSubmit={handleEmailPromptSubmit}>
              <div style={{ marginBottom: 4 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>
                  Email address
                </label>
                <input
                  type="email"
                  value={promptEmail}
                  onChange={(e) => setPromptEmail(e.target.value)}
                  placeholder="you@example.com"
                  style={inputStyle(!!promptEmailError)}
                  autoFocus
                />
                {promptEmailError && (
                  <p style={{ fontSize: 13, color: "#EF4444", margin: "8px 0 0" }}>{promptEmailError}</p>
                )}
              </div>
              <button type="submit" style={{ ...btnPrimary, marginTop: 20 }}>
                Sign in <ArrowRight size={16} />
              </button>
            </form>
          </>
        )}

      </div>
    </div>
  );
}
