import { useState, useEffect } from 'react';
import { Mail, Lock, Eye, EyeOff, Check, Users, Shield, CheckCircle, Heart } from 'lucide-react';
import { useSafeNavigate } from '../hooks/useSafeNavigate';
import logoImg from 'figma:asset/0d495a4b0b39eba28a6b72e320f92e9a00760e61.png';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAppContext } from '../../context/AppContext';

type ButtonState = 'idle' | 'loading' | 'success';

export function Login() {
  const navigate = useSafeNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [buttonState, setButtonState] = useState<ButtonState>('idle');
  const [mounted, setMounted] = useState(false);
  const { setUser } = useAppContext();

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

  const validateEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

  const handleSignIn = async () => {
    let valid = true;
    if (!email || !validateEmail(email)) {
      setEmailError('Please enter a valid email address');
      valid = false;
    } else setEmailError('');
    if (!password) {
      setPasswordError('Please enter your password');
      valid = false;
    } else setPasswordError('');
    if (!valid) return;

    setButtonState('loading');
    try {
      // Query users collection by email + password (same pattern as admin app)
      const snap = await getDocs(
        query(
          collection(db, 'users'),
          where('email', '==', email.trim().toLowerCase()),
          where('password', '==', password)
        )
      );

      if (snap.empty) {
        setPasswordError('Invalid email or password. Please try again.');
        setButtonState('idle');
        return;
      }

      const userDoc = snap.docs[0];
      const data = userDoc.data();

      setUser({
        docId: userDoc.id,
        userId: data.userId || data.id || userDoc.id,
        name: data.name || data.username || '',
        email: data.email || '',
        phone: data.phone || '',
        role: data.role || 'staff',
        agencyName: data.agencyName || '',
        avatar: data.avatar || data.profilePhotoUrl || '',
      });

      setButtonState('success');
      setTimeout(() => navigate('/'), 800);
    } catch {
      setPasswordError('Something went wrong. Please check your connection.');
      setButtonState('idle');
    }
  };

  return (
    <div
      className="relative flex flex-col overflow-hidden"
      style={{
        minHeight: '100dvh',
        maxWidth: '390px',
        margin: '0 auto',
        background: 'linear-gradient(180deg, #0E3D20 0%, #0A2A16 35%, #071D0F 65%, #0B2E18 100%)',
      }}
    >
      {/* ═══ Atmospheric orbs ═══ */}
      <div
        className="absolute pointer-events-none"
        style={{
          width: '600px',
          height: '600px',
          left: '-120px',
          top: '-80px',
          background: 'radial-gradient(circle, rgba(34,120,60,0.18) 0%, transparent 65%)',
          animation: 'orbDrift1 22s ease-in-out infinite',
        }}
      />
      <div
        className="absolute pointer-events-none"
        style={{
          width: '500px',
          height: '500px',
          right: '-100px',
          bottom: '40px',
          background: 'radial-gradient(circle, rgba(31,111,67,0.12) 0%, transparent 60%)',
          animation: 'orbDrift2 28s ease-in-out infinite',
        }}
      />

      {/* Accent light beam */}
      <div
        className="absolute pointer-events-none"
        style={{
          width: '200px',
          height: '350px',
          left: '50%',
          top: '0',
          transform: 'translateX(-50%)',
          background: 'linear-gradient(180deg, rgba(52,168,95,0.08) 0%, transparent 100%)',
          filter: 'blur(40px)',
        }}
      />

      {/* Decorative rings */}
      <div
        className="absolute rounded-full pointer-events-none"
        style={{ width: '420px', height: '420px', left: '-80px', top: '-60px', border: '1px solid rgba(255,255,255,0.025)' }}
      />
      <div
        className="absolute rounded-full pointer-events-none"
        style={{ width: '320px', height: '320px', right: '-60px', top: '80px', border: '1px solid rgba(255,255,255,0.018)' }}
      />
      <div
        className="absolute rounded-full pointer-events-none"
        style={{ width: '260px', height: '260px', left: '-40px', bottom: '120px', border: '1px solid rgba(255,255,255,0.015)' }}
      />

      {/* Noise overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          opacity: 0.2,
          mixBlendMode: 'overlay',
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundSize: '200px 200px',
        }}
      />

      {/* ═══ CONTENT WRAPPER ═══ */}
      <div className="relative z-10 flex flex-col flex-1" style={{ padding: '0 24px' }}>

        {/* ═══ BRAND HEADER ═══ */}
        <div
          className="flex flex-col items-center"
          style={{
            paddingTop: '70px',
            transition: 'opacity 0.9s cubic-bezier(0.16,1,0.3,1), transform 0.9s cubic-bezier(0.16,1,0.3,1)',
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(-24px)',
          }}
        >
          {/* Logo */}
          <div className="relative">
            <div
              className="absolute rounded-full"
              style={{
                width: '96px',
                height: '96px',
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)',
                border: '1px solid rgba(255,255,255,0.06)',
                animation: 'logoPulse 4s ease-in-out infinite',
              }}
            />
            <div
              className="relative flex items-center justify-center"
              style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                background: 'linear-gradient(145deg, rgba(255,255,255,0.1), rgba(255,255,255,0.03))',
                border: '1.5px solid rgba(255,255,255,0.1)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
              }}
            >
              <img src={logoImg} alt="Family Forever" style={{ width: '40px', height: '40px', objectFit: 'contain' }} />
            </div>
          </div>

          <h1
            className="font-['Poppins'] font-semibold text-white text-center"
            style={{ fontSize: '32px', letterSpacing: '-0.8px', marginTop: '24px' }}
          >
            Family Forever
          </h1>
          <p
            className="font-['Inter'] text-center"
            style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', maxWidth: '240px', lineHeight: '1.5', marginTop: '8px' }}
          >
            Caring for every family, every step of the way.
          </p>
        </div>

        {/* ═══ FLOATING WHITE CARD ═══ */}
        <div
          className="relative"
          style={{
            marginTop: '32px',
            transition: 'opacity 0.9s cubic-bezier(0.16,1,0.3,1), transform 0.9s cubic-bezier(0.16,1,0.3,1)',
            transitionDelay: '0.12s',
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(32px)',
          }}
        >
          {/* Green glow behind card top */}
          <div
            className="absolute pointer-events-none"
            style={{
              width: '200px',
              height: '80px',
              left: '50%',
              top: '-30px',
              transform: 'translateX(-50%)',
              background: 'radial-gradient(ellipse, rgba(31,111,67,0.1) 0%, transparent 70%)',
            }}
          />

          <div
            className="relative bg-white"
            style={{
              borderRadius: '24px',
              padding: '34px 24px 28px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.25), 0 1px 3px rgba(0,0,0,0.08)',
            }}
          >
            {/* Card header */}
            <span
              className="font-['Poppins'] font-bold text-[#1F6F43] uppercase block"
              style={{ fontSize: '11px', letterSpacing: '1.5px', marginBottom: '6px' }}
            >
              STAFF PORTAL
            </span>
            <h2
              className="font-['Poppins'] font-semibold text-[#111111]"
              style={{ fontSize: '26px', letterSpacing: '-0.3px', marginBottom: '4px' }}
            >
              Welcome back
            </h2>
            <p
              className="font-['Inter'] text-[#9CA3AF]"
              style={{ fontSize: '14px', marginBottom: '30px' }}
            >
              Sign in to manage your shifts
            </p>

            {/* Email */}
            <label
              className="font-['Inter'] font-semibold text-[#374151] block"
              style={{ fontSize: '12.5px', letterSpacing: '0.1px', marginBottom: '8px' }}
            >
              Email Address
            </label>
            <div className="relative" style={{ marginBottom: emailError ? '6px' : '22px' }}>
              <Mail
                className="absolute top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ left: '15px', width: '17px', height: '17px', color: emailFocused ? '#1F6F43' : '#CBD5E1', transition: 'color 0.2s' }}
                strokeWidth={2}
              />
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); if (emailError) setEmailError(''); }}
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
                placeholder="you@familyforever.com"
                className="w-full font-['Inter'] outline-none"
                style={{
                  height: '52px',
                  paddingLeft: '44px',
                  paddingRight: '48px',
                  fontSize: '15px',
                  color: '#111111',
                  borderRadius: '14px',
                  border: emailError ? '1.5px solid #EF4444' : emailFocused ? '1.5px solid #1F6F43' : '1.5px solid #EAECEF',
                  backgroundColor: emailError ? '#FEF7F7' : emailFocused ? '#FAFFFE' : '#F7F8F9',
                  boxShadow: emailError
                    ? '0 0 0 4px rgba(239,68,68,0.06)'
                    : emailFocused
                    ? '0 0 0 4px rgba(31,111,67,0.06), 0 2px 8px rgba(31,111,67,0.04)'
                    : 'none',
                  transition: 'all 0.2s',
                }}
              />
            </div>
            {emailError && (
              <p className="font-['Inter'] font-medium text-[#EF4444]" style={{ fontSize: '11.5px', marginBottom: '22px' }}>
                {emailError}
              </p>
            )}

            {/* Password */}
            <label
              className="font-['Inter'] font-semibold text-[#374151] block"
              style={{ fontSize: '12.5px', letterSpacing: '0.1px', marginBottom: '8px' }}
            >
              Password
            </label>
            <div className="relative" style={{ marginBottom: passwordError ? '6px' : '22px' }}>
              <Lock
                className="absolute top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ left: '15px', width: '17px', height: '17px', color: passwordFocused ? '#1F6F43' : '#CBD5E1', transition: 'color 0.2s' }}
                strokeWidth={2}
              />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => { setPassword(e.target.value); if (passwordError) setPasswordError(''); }}
                onFocus={() => setPasswordFocused(true)}
                onBlur={() => setPasswordFocused(false)}
                placeholder="Enter your password"
                className="w-full font-['Inter'] outline-none"
                style={{
                  height: '52px',
                  paddingLeft: '44px',
                  paddingRight: '56px',
                  fontSize: '15px',
                  color: '#111111',
                  borderRadius: '14px',
                  border: passwordError ? '1.5px solid #EF4444' : passwordFocused ? '1.5px solid #1F6F43' : '1.5px solid #EAECEF',
                  backgroundColor: passwordError ? '#FEF7F7' : passwordFocused ? '#FAFFFE' : '#F7F8F9',
                  boxShadow: passwordError
                    ? '0 0 0 4px rgba(239,68,68,0.06)'
                    : passwordFocused
                    ? '0 0 0 4px rgba(31,111,67,0.06), 0 2px 8px rgba(31,111,67,0.04)'
                    : 'none',
                  transition: 'all 0.2s',
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute top-1/2 -translate-y-1/2 flex items-center justify-center hover:bg-[#F3F4F6] transition-colors"
                style={{ right: '12px', width: '36px', height: '36px', borderRadius: '8px' }}
              >
                {showPassword ? (
                  <EyeOff style={{ width: '17px', height: '17px', color: '#CBD5E1' }} strokeWidth={2} />
                ) : (
                  <Eye style={{ width: '17px', height: '17px', color: '#CBD5E1' }} strokeWidth={2} />
                )}
              </button>
            </div>
            {passwordError && (
              <p className="font-['Inter'] font-medium text-[#EF4444]" style={{ fontSize: '11.5px', marginBottom: '22px' }}>
                {passwordError}
              </p>
            )}

            {/* Remember + Forgot */}
            <div className="flex items-center justify-between" style={{ marginBottom: '28px' }}>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <button
                  type="button"
                  onClick={() => setRememberMe(!rememberMe)}
                  className="flex items-center justify-center flex-shrink-0 transition-all"
                  style={{
                    width: '17px',
                    height: '17px',
                    borderRadius: '5px',
                    border: rememberMe ? 'none' : '1.5px solid #D1D5DB',
                    backgroundColor: rememberMe ? '#1F6F43' : '#F9FAFB',
                  }}
                >
                  {rememberMe && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
                </button>
                <span className="font-['Inter'] text-[#6B7280]" style={{ fontSize: '13px' }}>
                  Remember me
                </span>
              </label>
              <button
                type="button"
                className="font-['Inter'] font-semibold text-[#1F6F43] hover:opacity-75 transition-opacity"
                style={{ fontSize: '13px' }}
              >
                Forgot password?
              </button>
            </div>

            {/* Sign In Button */}
            <button
              type="button"
              onClick={handleSignIn}
              disabled={buttonState !== 'idle'}
              className="relative w-full overflow-hidden flex items-center justify-center transition-all"
              style={{
                height: '54px',
                borderRadius: '16px',
                background: buttonState === 'success'
                  ? 'linear-gradient(135deg, #22C55E, #16A34A)'
                  : 'linear-gradient(135deg, #1F6F43, #175C37, #1A6B3A)',
                boxShadow: buttonState === 'idle'
                  ? '0 6px 20px rgba(31,111,67,0.3), inset 0 1px 0 rgba(255,255,255,0.08)'
                  : buttonState === 'success'
                  ? '0 6px 20px rgba(34,197,94,0.3), inset 0 1px 0 rgba(255,255,255,0.08)'
                  : '0 2px 8px rgba(31,111,67,0.2)',
                pointerEvents: buttonState !== 'idle' ? 'none' : 'auto',
                transition: 'all 0.3s',
              }}
            >
              {/* Shimmer */}
              {buttonState === 'idle' && (
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: 'linear-gradient(110deg, transparent 25%, rgba(255,255,255,0.07) 40%, rgba(255,255,255,0.07) 60%, transparent 75%)',
                    animation: 'shimmer 5s 2.5s infinite',
                  }}
                />
              )}
              {buttonState === 'idle' && (
                <span className="font-['Poppins'] font-semibold text-white" style={{ fontSize: '16px' }}>
                  Sign In
                </span>
              )}
              {buttonState === 'loading' && (
                <div
                  className="rounded-full"
                  style={{
                    width: '22px',
                    height: '22px',
                    border: '2.5px solid rgba(255,255,255,0.25)',
                    borderTopColor: '#FFFFFF',
                    animation: 'spin 0.8s linear infinite',
                  }}
                />
              )}
              {buttonState === 'success' && (
                <div className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-white" strokeWidth={2.5} />
                  <span className="font-['Poppins'] font-semibold text-white" style={{ fontSize: '16px' }}>
                    Welcome, Sarah!
                  </span>
                </div>
              )}
            </button>

            {/* Contact admin */}
            <div className="text-center" style={{ marginTop: '20px', lineHeight: '1.5' }}>
              <span className="font-['Inter'] text-[#9CA3AF]" style={{ fontSize: '13px' }}>
                Don't have an account?{' '}
              </span>
              <button
                type="button"
                className="font-['Inter'] font-semibold text-[#1F6F43] hover:underline"
                style={{ fontSize: '13px' }}
              >
                Contact your administrator.
              </button>
            </div>
          </div>
        </div>

        {/* ═══ TRUST BADGES ═══ */}
        <div
          className="flex items-center justify-center gap-5"
          style={{
            marginTop: '20px',
            transition: 'opacity 0.9s cubic-bezier(0.16,1,0.3,1), transform 0.9s cubic-bezier(0.16,1,0.3,1)',
            transitionDelay: '0.3s',
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(32px)',
          }}
        >
          {[
            { icon: Shield, label: 'Encrypted' },
            { icon: CheckCircle, label: 'WCAG AA' },
            { icon: Heart, label: 'Care-first' },
          ].map((b) => {
            const Icon = b.icon;
            return (
              <div key={b.label} className="flex items-center gap-1.5">
                <Icon style={{ width: '12px', height: '12px', stroke: 'rgba(255,255,255,0.18)', strokeWidth: 2 }} />
                <span
                  className="font-['Inter'] font-medium"
                  style={{ fontSize: '10.5px', color: 'rgba(255,255,255,0.22)', letterSpacing: '0.2px' }}
                >
                  {b.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Version */}
        <p
          className="font-['Inter'] text-center"
          style={{
            fontSize: '9.5px',
            color: 'rgba(255,255,255,0.08)',
            marginTop: '10px',
            paddingBottom: '24px',
            transition: 'opacity 0.9s cubic-bezier(0.16,1,0.3,1), transform 0.9s cubic-bezier(0.16,1,0.3,1)',
            transitionDelay: '0.4s',
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(32px)',
          }}
        >
          v1.0.2 · Family Forever Inc.
        </p>
      </div>

      {/* Keyframes */}
      <style>{`
        @keyframes logoPulse {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
        @keyframes shimmer {
          0% { transform: translateX(-100%) skewX(-20deg); }
          20% { transform: translateX(200%) skewX(-20deg); }
          100% { transform: translateX(200%) skewX(-20deg); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes orbDrift1 {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(20px, 10px); }
        }
        @keyframes orbDrift2 {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(-20px, -10px); }
        }
      `}</style>
    </div>
  );
}