import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { collection, query, where, getDocs } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "../firebase";
import { Mail, Lock, Eye, EyeOff, Shield, Accessibility, Heart, Building2, ClipboardList, ArrowRight, ShieldCheck } from "lucide-react";

// ─── Role Selection ────────────────────────────────────────────────────────

function RoleSelectionScreen({ onSelectRole }) {
  const [hovered, setHovered] = useState(null);

  const roles = [
    {
      key: "owner",
      icon: <Building2 size={28} strokeWidth={1.8} />,
      title: "Owner / Admin",
      description: "Manage billing, staff, clients & agencies",
      buttonLabel: "Enter Dashboard",
    },
    {
      key: "intake",
      icon: <ClipboardList size={28} strokeWidth={1.8} />,
      title: "Intake Worker",
      description: "Submit and track intake forms for new clients",
      buttonLabel: "Enter Portal",
    },
  ];

  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen w-full bg-white"
      style={{ fontFamily: "'Inter', 'Plus Jakarta Sans', sans-serif" }}
    >
      {/* Logo */}
      <div className="flex flex-col items-center mb-12 text-center">
        <div className="w-12 h-12 rounded-full flex items-center justify-center overflow-hidden mb-3" style={{ background: "#1B5E37" }}>
          <img src="/images/logo.png" alt="Logo" className="w-12 h-12 object-contain" />
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "#111827" }}>Family Forever</h1>
        <p style={{ fontSize: 14, color: "#6B7280", marginTop: 4 }}>Care Management Platform</p>
      </div>

      <h2 style={{ fontSize: 22, fontWeight: 700, color: "#111827", marginBottom: 32 }}>
        Who are you logging in as?
      </h2>

      {/* Cards */}
      <div className="flex flex-row items-stretch justify-center gap-4" style={{ width: "100%", maxWidth: 600, padding: "0 20px", flexWrap: "wrap" }}>
        {roles.map((role) => {
          const isHovered = hovered === role.key;
          return (
            <div
              key={role.key}
              className="flex flex-col items-center justify-between cursor-pointer"
              style={{
                width: 280, height: 300, borderRadius: 24, background: "#FFFFFF",
                padding: "32px 28px", textAlign: "center",
                border: isHovered ? "2px solid #1B5E37" : "1.5px solid #E5E7EB",
                boxShadow: isHovered ? "0 0 0 4px rgba(27,94,55,0.08), 0 4px 16px rgba(0,0,0,0.06)" : "0 1px 3px rgba(0,0,0,0.08)",
                transform: isHovered ? "scale(1.015)" : "scale(1)",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={() => setHovered(role.key)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => onSelectRole(role.key)}
            >
              <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: "#F0FFF4", color: "#1B5E37" }}>
                {role.icon}
              </div>
              <div className="text-center">
                <p style={{ fontSize: 18, fontWeight: 700, color: "#111827" }}>{role.title}</p>
                <p style={{ fontSize: 13, color: "#6B7280", lineHeight: 1.5, marginTop: 8 }}>{role.description}</p>
              </div>
              <button
                className="w-full flex items-center justify-center gap-2 text-white"
                style={{ height: 44, borderRadius: 8, background: "#1B5E37", fontSize: 14, fontWeight: 600, border: "none" }}
                onClick={(e) => { e.stopPropagation(); onSelectRole(role.key); }}
              >
                {role.buttonLabel}
                <ArrowRight size={15} strokeWidth={2} />
              </button>
            </div>
          );
        })}
      </div>

      <p style={{ fontSize: 13, color: "#6B7280", marginTop: 40, textAlign: "center" }}>
        Have an access code?{" "}
        <span className="underline cursor-pointer hover:text-green-800" style={{ color: "#6B7280" }}
          onClick={() => onSelectRole("owner")}>
          Sign in here →
        </span>
      </p>
    </div>
  );
}

// ─── Owner Login ───────────────────────────────────────────────────────────

function OwnerLoginScreen({ onBack, setUser }) {
  const navigate = useNavigate();
  const [email, setEmail]           = useState("");
  const [password, setPassword]     = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [isLoading, setIsLoading]   = useState(false);

  // OTP state
  const [otpStep, setOtpStep] = useState(false);
  const [otpCode, setOtpCode] = useState(["", "", "", "", "", ""]);
  const [otpError, setOtpError] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [pendingUser, setPendingUser] = useState(null);
  const otpRefs = useRef([]);

  useEffect(() => {
    if (resendTimer <= 0) return;
    const t = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
    return () => clearTimeout(t);
  }, [resendTimer]);

  const sendOtp = async (userEmail, userName) => {
    const sendLoginOTP = httpsCallable(functions, "sendLoginOTP");
    await sendLoginOTP({ email: userEmail, name: userName });
    setResendTimer(30);
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    setEmailError(""); setPasswordError("");
    let hasError = false;
    if (!email.trim()) { setEmailError("Email address is required"); hasError = true; }
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setEmailError("Please enter a valid email address"); hasError = true; }
    if (!password.trim()) { setPasswordError("Password is required"); hasError = true; }
    if (hasError) return;

    setIsLoading(true);
    try {
      const snap = await getDocs(query(collection(db, "users"), where("email", "==", email), where("password", "==", password)));
      if (!snap.empty) {
        const userData = snap.docs[0].data();
        setPendingUser(userData);
        await sendOtp(email, userData.firstName || userData.name);
        setOtpStep(true);
      } else {
        setPasswordError("Invalid email or password");
      }
    } catch (err) {
      console.error(err);
      setPasswordError("Something went wrong. Try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newCode = [...otpCode];
    newCode[index] = value.slice(-1);
    setOtpCode(newCode);
    setOtpError("");
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otpCode[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    const newCode = [...otpCode];
    for (let i = 0; i < 6; i++) newCode[i] = pasted[i] || "";
    setOtpCode(newCode);
    const focusIdx = Math.min(pasted.length, 5);
    otpRefs.current[focusIdx]?.focus();
  };

  const handleVerifyOtp = async (e) => {
    e?.preventDefault();
    const code = otpCode.join("");
    if (code.length !== 6) { setOtpError("Please enter the 6-digit code"); return; }

    setOtpLoading(true);
    try {
      const verifyLoginOTP = httpsCallable(functions, "verifyLoginOTP");
      await verifyLoginOTP({ email, code });
      localStorage.setItem("user", JSON.stringify(pendingUser));
      setUser(pendingUser);
      navigate(pendingUser.role === "admin" ? "/admin-dashboard" : "/user-dashboard");
    } catch (err) {
      const msg = err?.message || "";
      if (msg.includes("expired")) setOtpError("Code has expired. Please request a new one.");
      else if (msg.includes("Too many")) setOtpError("Too many attempts. Please request a new code.");
      else if (msg.includes("Invalid") || msg.includes("permission-denied")) setOtpError("Invalid code. Please try again.");
      else setOtpError("Verification failed. Please try again.");
    } finally {
      setOtpLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendTimer > 0) return;
    setOtpError("");
    setOtpCode(["", "", "", "", "", ""]);
    try {
      await sendOtp(email, pendingUser?.firstName || pendingUser?.name);
    } catch {
      setOtpError("Failed to resend code. Try again.");
    }
  };

  const inputStyle = (hasError) => ({
    width: "100%", height: 48, borderRadius: 10,
    border: hasError ? "1px solid #EF4444" : "1px solid #D1D5DB",
    paddingLeft: 42, paddingRight: 16, fontSize: 14,
    fontFamily: "'Inter', sans-serif", color: "#111827",
    background: "#FFFFFF", outline: "none",
    transition: "all 0.15s ease",
  });

  // ── OTP Verification Screen ──
  if (otpStep) {
    const maskedEmail = email.replace(/(.{2})(.*)(@.*)/, (_, a, b, c) => a + "*".repeat(b.length) + c);
    return (
      <div className="flex flex-col md:flex-row w-screen min-h-screen" style={{ fontFamily: "'Inter', sans-serif" }}>
        {/* Left panel (same branding) */}
        <div className="relative flex flex-col items-center justify-center overflow-hidden h-[30vh] md:h-auto md:w-[55%]" style={{ background: "linear-gradient(160deg, #1B5E37 0%, #14472A 50%, #0D3520 100%)" }}>
          {[
            { w: 500, h: 500, top: -100, right: -120, opacity: 0.06 },
            { w: 400, h: 400, bottom: -80, left: -60, opacity: 0.04 },
            { w: 250, h: 250, top: "40%", left: "20%", opacity: 0.08 },
          ].map((orb, i) => (
            <div key={i} className="absolute pointer-events-none" style={{
              width: orb.w, height: orb.h, borderRadius: "50%",
              background: `radial-gradient(circle, rgba(255,255,255,${orb.opacity}) 0%, transparent 70%)`,
              top: orb.top, bottom: orb.bottom, left: orb.left, right: orb.right,
            }} />
          ))}
          <div className="relative z-10 flex flex-col items-center" style={{ maxWidth: 420, textAlign: "center", padding: "0 32px" }}>
            <div className="flex items-center justify-center overflow-hidden" style={{ width: 72, height: 72, borderRadius: "50%", background: "rgba(255,255,255,0.15)", marginBottom: 28, backdropFilter: "blur(8px)" }}>
              <img src="/images/logo.png" alt="Family Forever" style={{ width: 72, height: 72, objectFit: "contain" }} />
            </div>
            <h1 style={{ fontSize: 32, fontWeight: 700, color: "#FFFFFF", letterSpacing: "-0.02em", lineHeight: 1.2, marginBottom: 12 }}>Family Forever</h1>
            <p style={{ fontSize: 16, color: "rgba(255,255,255,0.75)", lineHeight: 1.6 }}>Caring for every family, every step of the way.</p>
          </div>
        </div>

        {/* Right panel (OTP form) */}
        <div className="flex flex-col items-center justify-center relative flex-1 bg-white p-6 md:p-16">
          <button onClick={() => { setOtpStep(false); setOtpCode(["", "", "", "", "", ""]); setOtpError(""); setPendingUser(null); }}
            className="absolute flex items-center cursor-pointer transition-colors"
            style={{ top: 32, left: 48, fontSize: 13, fontWeight: 500, color: "#9CA3AF", background: "none", border: "none", gap: 6 }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#1B5E37")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#9CA3AF")}
          >
            ← Back to Login
          </button>

          <div style={{ width: "100%", maxWidth: 400 }}>
            <div className="flex flex-col items-center" style={{ marginBottom: 32 }}>
              <div className="flex items-center justify-center" style={{ width: 64, height: 64, borderRadius: 16, background: "#F0FDF4", color: "#1B5E37", marginBottom: 20 }}>
                <ShieldCheck size={32} strokeWidth={1.8} />
              </div>
              <h2 style={{ fontSize: 28, fontWeight: 700, color: "#111827", lineHeight: 1.1, marginBottom: 12, textAlign: "center" }}>Verify Your Identity</h2>
              <p style={{ fontSize: 14, color: "#6B7280", textAlign: "center", lineHeight: 1.6 }}>
                We sent a 6-digit code to<br />
                <span style={{ fontWeight: 600, color: "#374151" }}>{maskedEmail}</span>
              </p>
            </div>

            <form onSubmit={handleVerifyOtp}>
              <div className="flex justify-center" style={{ gap: 10, marginBottom: 24 }}>
                {otpCode.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => (otpRefs.current[i] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                    onPaste={i === 0 ? handleOtpPaste : undefined}
                    autoFocus={i === 0}
                    style={{
                      width: 52, height: 60, borderRadius: 12, textAlign: "center",
                      fontSize: 24, fontWeight: 700, color: "#111827",
                      border: otpError ? "2px solid #EF4444" : digit ? "2px solid #1B5E37" : "1.5px solid #D1D5DB",
                      background: "#FFFFFF", outline: "none",
                      transition: "all 0.15s ease",
                    }}
                    onFocus={(e) => { if (!otpError) { e.target.style.borderColor = "#1B5E37"; e.target.style.boxShadow = "0 0 0 4px rgba(27,94,55,0.08)"; } }}
                    onBlur={(e) => { if (!otpError) { e.target.style.borderColor = digit ? "#1B5E37" : "#D1D5DB"; e.target.style.boxShadow = "none"; } }}
                  />
                ))}
              </div>

              {otpError && <p style={{ fontSize: 13, color: "#EF4444", textAlign: "center", marginBottom: 16 }}>{otpError}</p>}

              <button
                type="submit"
                disabled={otpLoading}
                className="w-full flex items-center justify-center"
                style={{
                  height: 52, borderRadius: 12,
                  background: otpLoading ? "#9CA3AF" : "#1B5E37",
                  color: "#FFFFFF", fontSize: 16, fontWeight: 600,
                  border: "none", boxShadow: "0 2px 4px rgba(27,94,55,0.2)",
                  transition: "all 0.2s ease", cursor: otpLoading ? "not-allowed" : "pointer",
                }}
                onMouseEnter={(e) => { if (!otpLoading) { e.currentTarget.style.background = "#166534"; e.currentTarget.style.transform = "translateY(-1px)"; } }}
                onMouseLeave={(e) => { if (!otpLoading) { e.currentTarget.style.background = "#1B5E37"; e.currentTarget.style.transform = "translateY(0)"; } }}
              >
                {otpLoading ? (
                  <div className="flex items-center" style={{ gap: 10 }}>
                    <svg className="animate-spin" width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="3" />
                      <path d="M12 2a10 10 0 0 1 10 10" stroke="white" strokeWidth="3" strokeLinecap="round" />
                    </svg>
                    Verifying...
                  </div>
                ) : "Verify & Sign In"}
              </button>
            </form>

            <div className="text-center" style={{ marginTop: 24 }}>
              <p style={{ fontSize: 14, color: "#6B7280" }}>
                Didn't receive the code?{" "}
                {resendTimer > 0 ? (
                  <span style={{ fontWeight: 600, color: "#9CA3AF" }}>Resend in {resendTimer}s</span>
                ) : (
                  <button type="button" onClick={handleResendOtp}
                    style={{ fontWeight: 600, color: "#1B5E37", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>
                    Resend Code
                  </button>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row w-screen min-h-screen" style={{ fontFamily: "'Inter', sans-serif" }}>

      {/* ── Left panel ── */}
      <div className="relative flex flex-col items-center justify-center overflow-hidden h-[30vh] md:h-auto md:w-[55%]" style={{ background: "linear-gradient(160deg, #1B5E37 0%, #14472A 50%, #0D3520 100%)" }}>
        {/* Orbs */}
        {[
          { w: 500, h: 500, top: -100, right: -120, opacity: 0.06 },
          { w: 400, h: 400, bottom: -80, left: -60, opacity: 0.04 },
          { w: 250, h: 250, top: "40%", left: "20%", opacity: 0.08 },
        ].map((orb, i) => (
          <div key={i} className="absolute pointer-events-none" style={{
            width: orb.w, height: orb.h, borderRadius: "50%",
            background: `radial-gradient(circle, rgba(255,255,255,${orb.opacity}) 0%, transparent 70%)`,
            top: orb.top, bottom: orb.bottom, left: orb.left, right: orb.right,
          }} />
        ))}

        {/* Brand Content */}
        <div className="relative z-10 flex flex-col items-center" style={{ maxWidth: 420, textAlign: "center", padding: "0 32px" }}>
          <div className="flex items-center justify-center overflow-hidden" style={{ width: 72, height: 72, borderRadius: "50%", background: "rgba(255,255,255,0.15)", marginBottom: 28, backdropFilter: "blur(8px)" }}>
            <img src="/images/logo.png" alt="Family Forever" style={{ width: 72, height: 72, objectFit: "contain" }} />
          </div>
          <h1 style={{ fontSize: 32, fontWeight: 700, color: "#FFFFFF", letterSpacing: "-0.02em", lineHeight: 1.2, marginBottom: 12 }}>Family Forever</h1>
          <p style={{ fontSize: 16, color: "rgba(255,255,255,0.75)", lineHeight: 1.6, marginBottom: 48 }}>Caring for every family, every step of the way.</p>

          <div className="hidden md:flex flex-col" style={{ gap: 16 }}>
            {[
              { icon: <Shield size={16} strokeWidth={2} />, label: "Secure & Confidential" },
              { icon: <Accessibility size={16} strokeWidth={2} />, label: "WCAG Accessible" },
              { icon: <Heart size={16} strokeWidth={2} />, label: "Built for Care Professionals" },
            ].map((item) => (
              <div key={item.label} className="flex items-center" style={{ gap: 12 }}>
                <div className="flex items-center justify-center" style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.8)", flexShrink: 0 }}>
                  {item.icon}
                </div>
                <span style={{ fontSize: 14, fontWeight: 500, color: "rgba(255,255,255,0.75)" }}>{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right panel (Form) ── */}
      <div className="flex flex-col items-center justify-center relative flex-1 bg-white p-6 md:p-16">
        {/* Back Link */}
        <button onClick={onBack} className="absolute flex items-center cursor-pointer transition-colors"
          style={{ top: 32, left: 48, fontSize: 13, fontWeight: 500, color: "#9CA3AF", background: "none", border: "none", gap: 6 }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#1B5E37")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#9CA3AF")}
        >
          ← Back to Role Select
        </button>

        <div style={{ width: "100%", maxWidth: 400 }}>
          {/* Header Labels */}
          <div style={{ marginBottom: 32 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16 }}>Owner Portal</p>
            <h2 style={{ fontSize: 32, fontWeight: 700, color: "#111827", lineHeight: 1.1, marginBottom: 12 }}>Welcome back</h2>
            <p style={{ fontSize: 14, color: "#6B7280" }}>Sign in to manage your operations</p>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Email Field */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 8 }}>Email Address</label>
              <div className="relative group">
                <div className="absolute flex items-center justify-center" style={{ left: 14, top: "50%", transform: "translateY(-50%)", color: "#9CA3AF", pointerEvents: "none" }}>
                  <Mail size={18} strokeWidth={1.8} />
                </div>
                <input
                  type="email"
                  value={email}
                  placeholder="you@familyforever.com"
                  onChange={(e) => { setEmail(e.target.value); if (emailError) setEmailError(""); }}
                  style={inputStyle(!!emailError)}
                  onFocus={(e) => { if (!emailError) { e.target.style.borderColor = "#1B5E37"; e.target.style.boxShadow = "0 0 0 4px rgba(27,94,55,0.08)"; } }}
                  onBlur={(e) => { if (!emailError) { e.target.style.borderColor = "#D1D5DB"; e.target.style.boxShadow = "none"; } }}
                />
              </div>
              {emailError && <p style={{ fontSize: 12, color: "#EF4444", marginTop: 8 }}>{emailError}</p>}
            </div>

            {/* Password Field */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 8 }}>Password</label>
              <div className="relative group">
                <div className="absolute flex items-center justify-center" style={{ left: 14, top: "50%", transform: "translateY(-50%)", color: "#9CA3AF", pointerEvents: "none" }}>
                  <Lock size={18} strokeWidth={1.8} />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  placeholder="Enter your password"
                  onChange={(e) => { setPassword(e.target.value); if (passwordError) setPasswordError(""); }}
                  style={{ ...inputStyle(!!passwordError), paddingRight: 44 }}
                  onFocus={(e) => { if (!passwordError) { e.target.style.borderColor = "#1B5E37"; e.target.style.boxShadow = "0 0 0 4px rgba(27,94,55,0.08)"; } }}
                  onBlur={(e) => { if (!passwordError) { e.target.style.borderColor = "#D1D5DB"; e.target.style.boxShadow = "none"; } }}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute flex items-center justify-center"
                  style={{ right: 12, top: "50%", transform: "translateY(-50%)", color: "#9CA3AF", background: "none", border: "none", cursor: "pointer" }}
                >
                  {showPassword ? <EyeOff size={18} strokeWidth={1.8} /> : <Eye size={18} strokeWidth={1.8} />}
                </button>
              </div>
              {passwordError && <p style={{ fontSize: 12, color: "#EF4444", marginTop: 8 }}>{passwordError}</p>}
            </div>

            {/* Actions: Remember + Forgot */}
            <div className="flex items-center justify-between" style={{ marginBottom: 32 }}>
              <label className="flex items-center cursor-pointer select-none" style={{ gap: 10 }}>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={() => setRememberMe(!rememberMe)}
                  className="hidden"
                />
                <div
                  style={{
                    width: 18, height: 18, borderRadius: 5,
                    border: rememberMe ? "none" : "1.5px solid #D1D5DB",
                    background: rememberMe ? "#1B5E37" : "#FFFFFF",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "all 0.2s ease"
                  }}
                >
                  {rememberMe && <svg width="12" height="10" viewBox="0 0 12 10" fill="none"><path d="M1 5L4.5 8.5L11 1.5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                </div>
                <span style={{ fontSize: 14, color: "#4B5563", fontWeight: 500 }}>Remember me</span>
              </label>
              <button type="button" style={{ fontSize: 14, fontWeight: 600, color: "#1B5E37", background: "none", border: "none", cursor: "pointer" }}>Forgot password?</button>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center"
              style={{
                height: 52, borderRadius: 12,
                background: isLoading ? "#9CA3AF" : "#1B5E37",
                color: "#FFFFFF", fontSize: 16, fontWeight: 600,
                border: "none", boxShadow: "0 2px 4px rgba(27,94,55,0.2)",
                transition: "all 0.2s ease", cursor: isLoading ? "not-allowed" : "pointer"
              }}
              onMouseEnter={(e) => { if (!isLoading) { e.currentTarget.style.background = "#166534"; e.currentTarget.style.transform = "translateY(-1px)"; } }}
              onMouseLeave={(e) => { if (!isLoading) { e.currentTarget.style.background = "#1B5E37"; e.currentTarget.style.transform = "translateY(0)"; } }}
            >
              {isLoading ? (
                <div className="flex items-center" style={{ gap: 10 }}>
                  <svg className="animate-spin" width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="3" />
                    <path d="M12 2a10 10 0 0 1 10 10" stroke="white" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                  Signing in...
                </div>
              ) : "Sign In"}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center" style={{ margin: "32px 0", gap: 16 }}>
            <div style={{ flex: 1, height: 1, background: "#E5E7EB" }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.05em" }}>or continue with</span>
            <div style={{ flex: 1, height: 1, background: "#E5E7EB" }} />
          </div>

          {/* Social Logins */}
          <button type="button" className="w-full flex items-center justify-center"
            style={{ height: 48, borderRadius: 10, border: "1.5px solid #E5E7EB", background: "#FFFFFF", fontSize: 14, fontWeight: 600, color: "#374151", gap: 12, transition: "all 0.15s ease", cursor: "pointer" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#F9FAFB")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#FFFFFF")}
          >
            <svg width="20" height="20" viewBox="0 0 18 18" fill="none">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
              <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

          {/* Footer */}
          <p className="text-center" style={{ marginTop: 40, fontSize: 14, color: "#9CA3AF" }}>
            Don't have an account? <span style={{ color: "#6B7280", fontWeight: 500 }}>Contact your administrator.</span>
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Root Login Component ──────────────────────────────────────────────────

const Login = ({ setUser }) => {
  const navigate = useNavigate();
  const [screen, setScreen] = useState("owner"); // Default to Owner Portal login as requested

  // Removed auto-redirect to ensure we always show the login portal at root
  useEffect(() => {
    // No auto-redirect
  }, []);

  if (screen === "owner") return <OwnerLoginScreen onBack={() => setScreen("role")} setUser={setUser} />;

  return (
    <RoleSelectionScreen
      onSelectRole={(role) => {
        if (role === "intake") navigate("/intake-form/login");
        else setScreen("owner");
      }}
    />
  );
};

export default Login;
