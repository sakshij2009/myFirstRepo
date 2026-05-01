import React, { useState } from "react";
import { db, auth } from "../firebase";
import {
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
} from "firebase/auth";
import { Mail, ArrowRight, ClipboardList, Shield, Heart } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";

const IntakeLogin = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isSignUp, setIsSignUp] = useState(false);

  // Sign In
  const [loginEmail, setLoginEmail] = useState("");

  // Sign Up
  const [name, setName] = useState("");
  const [role, setRole] = useState("Intake Worker");
  const [email, setEmail] = useState("");
  const [agency, setAgency] = useState("");
  const [phone, setPhone] = useState("");
  const [invoiceEmail, setInvoiceEmail] = useState("");

  const UPCS_EMAIL_OPTIONS = [
    "invoicewest@upcs.org",
    "invoiceparkland@upcs.org",
  ];

  const isUPCSAgency = agency.trim().toLowerCase().startsWith("upcs");

  // UI state
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // ── On mount: clear stale session & detect magic link return ──────────────
  React.useEffect(() => {
    // Clear stale session so login page always appears fresh
    localStorage.removeItem("intakeUser");

    // Detect if user has returned from a magic link email
    if (isSignInWithEmailLink(auth, window.location.href)) {
      const emailParam = new URLSearchParams(window.location.search).get("email");
      let emailForSignIn = emailParam
        ? decodeURIComponent(emailParam)
        : window.localStorage.getItem("emailForSignIn");

      if (!emailForSignIn) {
        emailForSignIn = window.prompt("Please confirm your email address:");
      }

      if (emailForSignIn) {
        setIsLoading(true);
        signInWithEmailLink(auth, emailForSignIn.trim().toLowerCase(), window.location.href)
          .then(async () => {
            window.localStorage.removeItem("emailForSignIn");
            const { collection, query: fbQuery, where, getDocs } = await import("firebase/firestore");
            const q = fbQuery(collection(db, "intakeUsers"), where("email", "==", emailForSignIn.trim().toLowerCase()));
            const snap = await getDocs(q);
            if (!snap.empty) {
              const userData = { id: snap.docs[0].id, ...snap.docs[0].data() };
              localStorage.setItem("intakeUser", JSON.stringify(userData));
              localStorage.setItem("user", JSON.stringify(userData));
              navigate("/intake-form/dashboard");
            } else {
              setError("Account not found. Please sign up first.");
              setIsLoading(false);
            }
          })
          .catch((err) => {
            console.error("Magic link error:", err);
            setError("The link may have expired or already been used. Please request a new one.");
            setIsLoading(false);
          });
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Pre-fill email/role from URL params (from invitation email)
  React.useEffect(() => {
    const emailParam = searchParams.get("email");
    const roleParam = searchParams.get("role");

    if (emailParam) {
      const decoded = decodeURIComponent(emailParam);
      setLoginEmail(decoded);
      setEmail(decoded);
      setIsSignUp(true);
    }

    if (roleParam) {
      if (roleParam.toLowerCase() === "parent") {
        setRole("Parent");
      } else {
        setRole("Intake Worker");
      }
      setIsSignUp(true);
    }
  }, [searchParams]);

  // ── Sign In — check email exists then send magic link ───────────────────────
  const handleSignIn = async () => {
    setError("");
    setMessage("");
    if (!loginEmail) {
      setError("Please enter your email address.");
      return;
    }

    setIsLoading(true);
    try {
      const { collection, query: fbQuery, where, getDocs } = await import("firebase/firestore");
      const q = fbQuery(collection(db, "intakeUsers"), where("email", "==", loginEmail.trim().toLowerCase()));
      const snap = await getDocs(q);

      if (snap.empty) {
        setError("No account found with this email. Please sign up first.");
        setIsLoading(false);
        return;
      }

      // Send magic link
      const encodedEmail = encodeURIComponent(loginEmail.trim().toLowerCase());
      const actionCodeSettings = {
        url: `${window.location.origin}/intake-form/login?email=${encodedEmail}`,
        handleCodeInApp: true,
      };
      await sendSignInLinkToEmail(auth, loginEmail.trim().toLowerCase(), actionCodeSettings);
      window.localStorage.setItem("emailForSignIn", loginEmail.trim().toLowerCase());

      setMessage("Sign-in link sent! Please check your email and click the link to continue.");
    } catch (err) {
      setError("Failed to send sign-in link: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // ── Sign Up — add new user to Firestore then send verification link ─────────
  const handleSignUp = async () => {
    setError("");
    setMessage("");
    if (!name || !role || !email || !phone || !invoiceEmail) {
      setError("Please fill in all required fields.");
      return;
    }
    if (role === "Intake Worker" && !agency) {
      setError("Agency Name is required for Intake Workers.");
      return;
    }

    setIsLoading(true);
    try {
      const { collection: fbCollection, query: fbQuery, where, getDocs, addDoc, orderBy, limit } = await import("firebase/firestore");

      // Check if email already exists
      const q = fbQuery(fbCollection(db, "intakeUsers"), where("email", "==", email.trim().toLowerCase()));
      const snap = await getDocs(q);

      if (!snap.empty) {
        setError("An account with this email already exists. Please sign in.");
        setIsLoading(false);
        return;
      }

      let showAssessmentLink = false;
      let showIntakeFormLink = role !== "Parent"; // Default true if not parent, but parents need explicit logic
      let linkedParentId = "";
      
      if (role === "Parent" || role.toLowerCase() === "parent") {
         const userEmail = email.trim().toLowerCase();
         // Check if they are primary email
         let invQ = fbQuery(fbCollection(db, "parentInvites"), where("primaryEmail", "==", userEmail));
         let invSnap = await getDocs(invQ);
         
         if (!invSnap.empty) {
            const latestInvite = invSnap.docs.sort((a,b) => b.data().createdAt - a.data().createdAt)[0].data();
            showAssessmentLink = !!latestInvite.primaryShowAssessmentLink;
            showIntakeFormLink = !!latestInvite.primaryShowIntakeFormLink;
         } else {
            // Check if they are secondary email
            const secondQ = fbQuery(fbCollection(db, "parentInvites"), where("secondParentEmail", "==", userEmail));
            const secondSnap = await getDocs(secondQ);
            
            if (!secondSnap.empty) {
               const latestInvite = secondSnap.docs.sort((a,b) => b.data().createdAt - a.data().createdAt)[0].data();
               showAssessmentLink = !!latestInvite.secondShowAssessmentLink;
               showIntakeFormLink = !!latestInvite.secondShowIntakeFormLink;

               // Link to primary parent if they exist
               if (latestInvite.primaryEmail) {
                  const pQuery = fbQuery(fbCollection(db, "intakeUsers"), where("email", "==", latestInvite.primaryEmail));
                  const pSnap = await getDocs(pQuery);
                  if (!pSnap.empty) {
                     linkedParentId = pSnap.docs[0].id;
                  }
               }
            } else {
               showIntakeFormLink = true; // Fallback
            }
         }
      }

      // Add to Firestore
      const newUser = {
        name,
        role,
        agency: role === "Intake Worker" ? agency : "",
        phone,
        email: email.trim().toLowerCase(),
        invoiceEmail: invoiceEmail.trim().toLowerCase(),
        showAssessmentLink,
        showIntakeFormLink,
        ...(linkedParentId ? { linkedParentId } : {}),
        createdAt: new Date(),
      };
      await addDoc(fbCollection(db, "intakeUsers"), newUser);

      // Send verification magic link
      const encodedEmail = encodeURIComponent(email.trim().toLowerCase());
      const actionCodeSettings = {
        url: `${window.location.origin}/intake-form/login?email=${encodedEmail}`,
        handleCodeInApp: true,
      };
      await sendSignInLinkToEmail(auth, email.trim().toLowerCase(), actionCodeSettings);
      window.localStorage.setItem("emailForSignIn", email.trim().toLowerCase());

      // Switch to Sign In tab and show success
      setIsSignUp(false);
      setLoginEmail(email.trim().toLowerCase());
      setMessage("Account created! A verification link has been sent to your email. Click it to sign in.");
    } catch (err) {
      setError("Sign up failed: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // ΓöÇΓöÇ Styles ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  const inputStyle = () => ({
    width: "100%",
    height: 48,
    borderRadius: 10,
    border: "1px solid #D1D5DB",
    padding: "0 14px",
    fontSize: 14,
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    color: "#111827",
    background: "#FFFFFF",
    outline: "none",
    transition: "border-color 0.15s ease",
    boxSizing: "border-box",
  });

  return (
    <div className="flex min-h-screen" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      {/* ΓöÇΓöÇ Left panel ΓöÇΓöÇ */}
      <div
        className="relative hidden md:flex flex-col items-center justify-center overflow-hidden"
        style={{ width: "55%", minHeight: "100vh", background: "linear-gradient(160deg, #1B5E37 0%, #14472A 50%, #0D3520 100%)" }}
      >
        {[
          { w: 500, h: 500, top: -100, right: -120, opacity: 0.06 },
          { w: 400, h: 400, bottom: -80, left: -60, opacity: 0.04 },
          { w: 250, h: 250, top: "40%", left: "20%", opacity: 0.08 },
        ].map((orb, i) => (
          <div
            key={i}
            className="absolute pointer-events-none"
            style={{
              width: orb.w, height: orb.h, borderRadius: "50%",
              background: `radial-gradient(circle, rgba(255,255,255,${orb.opacity}) 0%, transparent 70%)`,
              top: orb.top, bottom: orb.bottom, left: orb.left, right: orb.right,
            }}
          />
        ))}

        <div className="relative z-10 flex flex-col items-center" style={{ textAlign: "center", padding: "0 40px" }}>
          <div
            className="flex items-center justify-center overflow-hidden"
            style={{
              width: 72, height: 72, borderRadius: "50%",
              background: "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)",
              marginBottom: 28,
            }}
          >
            <img src="/images/logo.png" alt="Family Forever" style={{ width: 72, height: 72, objectFit: "contain" }} />
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: "#FFFFFF", letterSpacing: "-0.02em", lineHeight: 1.2, marginBottom: 12 }}>
            Family Forever
          </h1>
          <p style={{ fontSize: 15, color: "rgba(255,255,255,0.75)", lineHeight: 1.6, marginBottom: 40 }}>
            Intake Management Portal
          </p>

          <div className="flex flex-col" style={{ gap: 16 }}>
            {[
              { icon: <Shield size={16} strokeWidth={2} />, label: "Secure & Confidential" },
              { icon: <Heart size={16} strokeWidth={2} />, label: "Built for Care Professionals" },
              { icon: <ClipboardList size={16} strokeWidth={2} />, label: "Streamlined Intake Process" },
            ].map((item) => (
              <div key={item.label} className="flex items-center" style={{ gap: 12 }}>
                <div
                  className="flex items-center justify-center"
                  style={{
                    width: 32, height: 32, borderRadius: 8,
                    background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.8)", flexShrink: 0,
                  }}
                >
                  {item.icon}
                </div>
                <span style={{ fontSize: 14, fontWeight: 500, color: "rgba(255,255,255,0.75)" }}>
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ΓöÇΓöÇ Right panel ΓöÇΓöÇ */}
      <div
        className="flex flex-col items-center justify-center relative flex-1 bg-white"
        style={{ padding: "48px 40px" }}
      >
        <div style={{ width: "100%", maxWidth: 420 }}>
          {/* Mobile logo */}
          <div className="flex flex-col items-center mb-8 md:hidden">
            <div className="w-12 h-12 rounded-full flex items-center justify-center overflow-hidden mb-2" style={{ background: "#1B5E37" }}>
              <img src="/images/logo.png" alt="Logo" className="w-12 h-12 object-contain" />
            </div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: "#111827" }}>Family Forever</h1>
          </div>

          {/* Header */}
          <div style={{ marginBottom: 32 }}>
            <div className="flex items-center gap-2 mb-3">
              <div
                className="flex items-center justify-center"
                style={{ width: 36, height: 36, borderRadius: 10, background: "#F0FFF4", color: "#1B5E37" }}
              >
                <ClipboardList size={18} strokeWidth={2} />
              </div>
              <span style={{ fontSize: 11, fontWeight: 600, color: "#1B5E37", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Intake Portal
              </span>
            </div>
            <h2 style={{ fontSize: 26, fontWeight: 700, color: "#111827", lineHeight: 1.2, marginBottom: 6 }}>
              {isSignUp ? "Create an Account" : "Welcome back"}
            </h2>
            <p style={{ fontSize: 14, color: "#6B7280" }}>
              {isSignUp ? "Register to start submitting intake forms" : "Sign in to manage intake forms"}
            </p>
          </div>

          {/* Error */}
          {error && (
            <div
              className="flex items-center gap-2 px-4 py-3 rounded-lg mb-4"
              style={{ background: "#FEF2F2", border: "1px solid #FECACA", color: "#DC2626", fontSize: 13 }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {error}
            </div>
          )}

          {/* Success message */}
          {message && (
            <div
              className="flex items-center gap-2 px-4 py-3 rounded-lg mb-4"
              style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", color: "#166534", fontSize: 13 }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><polyline points="20 6 9 17 4 12" />
              </svg>
              {message}
            </div>
          )}

          {isSignUp ? (
            <>
              {/* ΓöÇΓöÇ SIGN UP FORM ΓöÇΓöÇ */}
              <div style={{ display: "flex", flexDirection: "column", gap: 18, marginBottom: 24 }}>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 8 }}>
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    placeholder="Enter full name"
                    onChange={(e) => { setName(e.target.value); setError(""); }}
                    style={inputStyle()}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 8 }}>
                    Role
                  </label>
                  <input
                    type="text"
                    value={role}
                    readOnly
                    style={{ ...inputStyle(), paddingLeft: 14, background: "#F3F4F6", color: "#6B7280", cursor: "not-allowed" }}
                  />
                </div>

                {role === "Intake Worker" && (
                  <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 8 }}>
                      Name of Agency / Organisation
                    </label>
                    <input
                      type="text"
                      value={agency}
                      placeholder="Enter agency name"
                      onChange={(e) => { setAgency(e.target.value); setError(""); }}
                      style={inputStyle()}
                    />
                  </div>
                )}

                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 8 }}>
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    placeholder="Enter phone number"
                    onChange={(e) => { setPhone(e.target.value); setError(""); }}
                    style={inputStyle()}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 8 }}>
                    Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute flex items-center justify-center"
                      style={{ left: 14, top: "50%", transform: "translateY(-50%)", color: "#9CA3AF", pointerEvents: "none" }}>
                      <Mail size={16} strokeWidth={2} />
                    </div>
                    <input
                      type="email"
                      value={email}
                      placeholder="you@example.com"
                      onChange={(e) => { setEmail(e.target.value); setError(""); }}
                      style={{ ...inputStyle(), paddingLeft: 42 }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 8 }}>
                    Invoice E-mail
                  </label>
                  {isUPCSAgency ? (
                    <select
                      value={invoiceEmail}
                      onChange={(e) => { setInvoiceEmail(e.target.value); setError(""); }}
                      style={{ ...inputStyle(), cursor: "pointer" }}
                    >
                      <option value="">Select Invoice Email</option>
                      {UPCS_EMAIL_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="email"
                      value={invoiceEmail}
                      placeholder="Enter invoice email"
                      onChange={(e) => { setInvoiceEmail(e.target.value); setError(""); }}
                      style={inputStyle()}
                      onKeyDown={(e) => e.key === "Enter" && handleSignUp()}
                    />
                  )}
                </div>
              </div>

              <button
                onClick={handleSignUp}
                disabled={isLoading}
                className="w-full flex items-center justify-center"
                style={{
                  height: 48, borderRadius: 10,
                  background: isLoading ? "#9CA3AF" : "#1B5E37",
                  color: "#FFFFFF", fontSize: 15, fontWeight: 600,
                  border: "none", boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                  cursor: isLoading ? "not-allowed" : "pointer",
                  transition: "all 0.2s ease", gap: 8,
                }}
                onMouseEnter={(e) => { if (!isLoading) e.currentTarget.style.background = "#166534"; }}
                onMouseLeave={(e) => { if (!isLoading) e.currentTarget.style.background = "#1B5E37"; }}
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="3" />
                      <path d="M12 2a10 10 0 0 1 10 10" stroke="white" strokeWidth="3" strokeLinecap="round" />
                    </svg>
                    Creating account...
                  </>
                ) : (
                  <>Create Account <ArrowRight size={16} strokeWidth={2} /></>
                )}
              </button>

              <p className="text-center mt-5" style={{ fontSize: 13, color: "#6B7280" }}>
                Already have an account?{" "}
                <span
                  className="font-medium cursor-pointer hover:underline"
                  style={{ color: "#1B5E37" }}
                  onClick={() => { setIsSignUp(false); setError(""); }}
                >
                  Sign In
                </span>
              </p>
            </>
          ) : (
            <>
              {/* ΓöÇΓöÇ SIGN IN FORM ΓöÇΓöÇ */}
              <div style={{ marginBottom: 24 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 8 }}>
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute flex items-center justify-center"
                    style={{ left: 14, top: "50%", transform: "translateY(-50%)", color: "#9CA3AF", pointerEvents: "none" }}>
                    <Mail size={16} strokeWidth={2} />
                  </div>
                  <input
                    type="email"
                    value={loginEmail}
                    placeholder="you@familyforever.com"
                    onChange={(e) => { setLoginEmail(e.target.value); setError(""); }}
                    style={{ ...inputStyle(), paddingLeft: 42 }}
                    onKeyDown={(e) => e.key === "Enter" && handleSignIn()}
                  />
                </div>
              </div>

              <button
                onClick={handleSignIn}
                disabled={isLoading}
                className="w-full flex items-center justify-center"
                style={{
                  height: 48, borderRadius: 10,
                  background: isLoading ? "#9CA3AF" : "#1B5E37",
                  color: "#FFFFFF", fontSize: 15, fontWeight: 600,
                  border: "none", boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                  cursor: isLoading ? "not-allowed" : "pointer",
                  transition: "all 0.2s ease", gap: 8,
                }}
                onMouseEnter={(e) => { if (!isLoading) e.currentTarget.style.background = "#166534"; }}
                onMouseLeave={(e) => { if (!isLoading) e.currentTarget.style.background = "#1B5E37"; }}
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="3" />
                      <path d="M12 2a10 10 0 0 1 10 10" stroke="white" strokeWidth="3" strokeLinecap="round" />
                    </svg>
                    Signing in...
                  </>
                ) : (
                  <>Sign In <ArrowRight size={16} strokeWidth={2} /></>
                )}
              </button>

              <div className="flex items-center" style={{ margin: "24px 0", gap: 16 }}>
                <div style={{ flex: 1, height: 1, background: "#E5E7EB" }} />
                <span style={{ fontSize: 12, fontWeight: 500, color: "#9CA3AF" }}>or</span>
                <div style={{ flex: 1, height: 1, background: "#E5E7EB" }} />
              </div>

              <p className="text-center" style={{ fontSize: 13, color: "#6B7280" }}>
                Don't have an account?{" "}
                <span
                  className="font-medium cursor-pointer hover:underline"
                  style={{ color: "#1B5E37" }}
                  onClick={() => { setIsSignUp(true); setError(""); }}
                >
                  Sign Up
                </span>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default IntakeLogin;
