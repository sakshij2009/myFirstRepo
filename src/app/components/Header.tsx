export function Header() {
  return (
    <header className="pt-6 pb-4">
      {/* Label */}
      <div className="font-['Inter'] font-medium text-[#9CA3AF] mb-2" style={{ fontSize: '11px', letterSpacing: '0.5px' }}>
        STAFF DASHBOARD
      </div>

      {/* Main Greeting */}
      <h1 className="font-['Poppins'] font-bold mb-1" style={{ fontSize: '24px', lineHeight: '1.3', letterSpacing: '-0.5px' }}>
        <span className="text-[#1A1A1A]">Welcome back, </span>
        <span className="text-[#1F6F43]">Sarah</span>
      </h1>

      {/* Company name */}
      <div className="font-['Inter'] text-[#9CA3AF]" style={{ fontSize: '13px', lineHeight: '1.4' }}>
        Family Forever Inc.
      </div>
    </header>
  );
}