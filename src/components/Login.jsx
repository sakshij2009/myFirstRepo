import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { Mail, Lock, Eye, EyeOff, Shield, Accessibility, Heart, Building2, ClipboardList, ArrowRight } from "lucide-react";

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
      <div className="flex flex-row items-stretch justify-center gap-4" style={{ width: 576 }}>
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
        localStorage.setItem("user", JSON.stringify(userData));
        setUser(userData);
        navigate(userData.role === "admin" ? "/admin-dashboard" : "/user-dashboard");
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

  const inputStyle = (hasError) => ({
    width: "100%", height: 44, borderRadius: 8,
    border: hasError ? "1px solid #EF4444" : "1px solid #D1D5DB",
    paddingLeft: 42, paddingRight: 16, fontSize: 14,
    fontFamily: "'Inter', sans-serif", color: "#111827",
    background: "#FFFFFF", outline: "none",
    transition: "border-color 0.15s ease, box-shadow 0.15s ease",
  });

  return (
    <div className="flex w-screen min-h-screen" style={{ fontFamily: "'Inter', sans-serif" }}>

      {/* ── Left panel 55% ── */}
      <div className="relative hidden md:flex flex-col items-center justify-center overflow-hidden" style={{ width: "55%", minHeight: "100vh", background: "linear-gradient(160deg, #1B5E37 0%, #14472A 50%, #0D3520 100%)" }}>
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
        {/* Arcs */}
        {[
          { w: 600, h: 600, top: "10%", left: "-15%" },
          { w: 350, h: 350, bottom: "5%", right: "-8%" },
        ].map((arc, i) => (
          <div key={i} className="absolute pointer-events-none" style={{
            width: arc.w, height: arc.h, borderRadius: "50%",
            border: `1px solid rgba(255,255,255,0.0${i === 0 ? 4 : 5})`,
            top: arc.top, bottom: arc.bottom, left: arc.left, right: arc.right,
          }} />
        ))}

        {/* Brand */}
        <div className="relative z-10 flex flex-col items-center" style={{ maxWidth: 400, textAlign: "center", padding: "0 32px" }}>
          <div className="flex items-center justify-center overflow-hidden" style={{ width: 72, height: 72, borderRadius: "50%", background: "rgba(255,255,255,0.15)", marginBottom: 28, backdropFilter: "blur(8px)" }}>
            <img src="/images/logo.png" alt="Family Forever" style={{ width: 72, height: 72, objectFit: "contain" }} />
          </div>
          <h1 style={{ fontSize: 32, fontWeight: 700, color: "#FFFFFF", letterSpacing: "-0.02em", lineHeight: 1.2, marginBottom: 12 }}>Family Forever</h1>
          <p style={{ fontSize: 16, color: "rgba(255,255,255,0.75)", lineHeight: 1.6, marginBottom: 48 }}>Caring for every family, every step of the way.</p>

          <div className="flex flex-col" style={{ gap: 16 }}>
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

      {/* ── Right panel 45% ── */}
      <div className="flex flex-col items-center justify-center relative flex-1" style={{ background: "#FFFFFF", padding: "48px 64px" }}>
        {/* Back */}
        <button onClick={onBack} className="absolute flex items-center cursor-pointer transition-colors"
          style={{ top: 32, left: 48, fontSize: 13, fontWeight: 500, color: "#6B7280", background: "none", border: "none", gap: 6 }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#1B5E37")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#6B7280")}
        >
          ← Back to Role Select
        </button>

        <div style={{ width: "100%", maxWidth: 420 }}>
          {/* Header */}
          <div style={{ marginBottom: 32 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>Owner Portal</p>
            <h2 style={{ fontSize: 28, fontWeight: 700, color: "#111827", lineHeight: 1.2, marginBottom: 8 }}>Welcome back</h2>
            <p style={{ fontSize: 14, color: "#6B7280" }}>Sign in to manage your operations</p>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Email */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 8 }}>Email Address</label>
              <div className="relative">
                <div className="absolute flex items-center justify-center" style={{ left: 14, top: "50%", transform: "translateY(-50%)", color: "#9CA3AF", pointerEvents: "none" }}>
                  <Mail size={16} strokeWidth={2} />
                </div>
                <input type="email" value={email} placeholder="you@familyforever.com"
                  onChange={(e) => { setEmail(e.target.value); if (emailError) setEmailError(""); }}
                  style={inputStyle(!!emailError)}
                  onFocus={(e) => { if (!emailError) { e.target.style.borderColor = "#1B5E37"; e.target.style.boxShadow = "0 0 0 3px rgba(27,94,55,0.1)"; } }}
                  onBlur={(e) => { if (!emailError) { e.target.style.borderColor = "#D1D5DB"; e.target.style.boxShadow = "none"; } }}
                />
              </div>
              {emailError && <p style={{ fontSize: 12, color: "#EF4444", marginTop: 6 }}>{emailError}</p>}
            </div>

            {/* Password */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 8 }}>Password</label>
              <div className="relative">
                <div className="absolute flex items-center justify-center" style={{ left: 14, top: "50%", transform: "translateY(-50%)", color: "#9CA3AF", pointerEvents: "none" }}>
                  <Lock size={16} strokeWidth={2} />
                </div>
                <input type={showPassword ? "text" : "password"} value={password} placeholder="Enter your password"
                  onChange={(e) => { setPassword(e.target.value); if (passwordError) setPasswordError(""); }}
                  style={{ ...inputStyle(!!passwordError), paddingRight: 44 }}
                  onFocus={(e) => { if (!passwordError) { e.target.style.borderColor = "#1B5E37"; e.target.style.boxShadow = "0 0 0 3px rgba(27,94,55,0.1)"; } }}
                  onBlur={(e) => { if (!passwordError) { e.target.style.borderColor = "#D1D5DB"; e.target.style.boxShadow = "none"; } }}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute flex items-center justify-center"
                  style={{ right: 12, top: "50%", transform: "translateY(-50%)", color: "#9CA3AF", background: "none", border: "none", cursor: "pointer" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#6B7280")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "#9CA3AF")}
                >
                  {showPassword ? <EyeOff size={16} strokeWidth={2} /> : <Eye size={16} strokeWidth={2} />}
                </button>
              </div>
              {passwordError && <p style={{ fontSize: 12, color: "#EF4444", marginTop: 6 }}>{passwordError}</p>}
            </div>

            {/* Remember + Forgot */}
            <div className="flex items-center justify-between" style={{ marginBottom: 28 }}>
              <label className="flex items-center cursor-pointer" style={{ gap: 8 }}>
                <div className="flex items-center justify-center cursor-pointer" onClick={() => setRememberMe(!rememberMe)}
                  style={{ width: 16, height: 16, borderRadius: 4, border: rememberMe ? "none" : "1.5px solid #D1D5DB", background: rememberMe ? "#1B5E37" : "#FFFFFF", transition: "all 0.15s ease" }}>
                  {rememberMe && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                </div>
                <span style={{ fontSize: 13, color: "#374151" }}>Remember me</span>
              </label>
              <button type="button" style={{ fontSize: 13, fontWeight: 500, color: "#1B5E37", background: "none", border: "none", cursor: "pointer" }}>Forgot password?</button>
            </div>

            {/* Sign In */}
            <button type="submit" disabled={isLoading} className="w-full flex items-center justify-center cursor-pointer"
              style={{ height: 48, borderRadius: 10, background: isLoading ? "#9CA3AF" : "#1B5E37", color: "#FFFFFF", fontSize: 15, fontWeight: 600, border: "none", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", transition: "all 0.2s ease", cursor: isLoading ? "not-allowed" : "pointer" }}
              onMouseEnter={(e) => { if (!isLoading) { e.currentTarget.style.background = "#166534"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(27,94,55,0.3)"; } }}
              onMouseLeave={(e) => { if (!isLoading) { e.currentTarget.style.background = "#1B5E37"; e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.1)"; } }}
            >
              {isLoading ? (
                <div className="flex items-center" style={{ gap: 8 }}>
                  <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="3" />
                    <path d="M12 2a10 10 0 0 1 10 10" stroke="white" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                  Signing in...
                </div>
              ) : "Sign In"}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center" style={{ margin: "28px 0", gap: 16 }}>
            <div style={{ flex: 1, height: 1, background: "#E5E7EB" }} />
            <span style={{ fontSize: 12, fontWeight: 500, color: "#9CA3AF" }}>or continue with</span>
            <div style={{ flex: 1, height: 1, background: "#E5E7EB" }} />
          </div>

          {/* Google */}
          <button type="button" className="w-full flex items-center justify-center cursor-pointer"
            style={{ height: 44, borderRadius: 8, border: "1px solid #E5E7EB", background: "#FFFFFF", fontSize: 14, fontWeight: 500, color: "#374151", gap: 10, transition: "all 0.15s ease" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#F9FAFB"; e.currentTarget.style.borderColor = "#D1D5DB"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "#FFFFFF"; e.currentTarget.style.borderColor = "#E5E7EB"; }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
              <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

          <p className="text-center" style={{ marginTop: 32, fontSize: 13, color: "#9CA3AF" }}>
            Don't have an account? <span style={{ color: "#6B7280" }}>Contact your administrator.</span>
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Root ──────────────────────────────────────────────────────────────────

const Login = ({ setUser }) => {
  const navigate = useNavigate();
  const [screen, setScreen] = useState("role");

  useEffect(() => {
    const saved = localStorage.getItem("user");
    if (saved) {
      const u = JSON.parse(saved);
      navigate(u.role === "admin" ? "/admin-dashboard" : "/user-dashboard");
    }
  }, [navigate]);

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
