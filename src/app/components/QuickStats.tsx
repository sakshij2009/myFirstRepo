interface StatItemProps {
  label: string;
  value: string;
  showDivider?: boolean;
}

function StatItem({ label, value, showDivider }: StatItemProps) {
  return (
    <div className="flex-1 text-center relative">
      <div className="font-['Inter'] font-medium text-[#6B7280] mb-2" style={{ fontSize: '11px', letterSpacing: '0.2px' }}>
        {label}
      </div>
      <div className="font-['Poppins'] font-bold text-[#1A1A1A]" style={{ fontSize: '20px', lineHeight: '1.3', letterSpacing: '-0.3px' }}>
        {value}
      </div>
      {showDivider && (
        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-px h-10 bg-[#E5E7EB]"></div>
      )}
    </div>
  );
}

export function QuickStats() {
  return (
    <section className="mb-6">
      <div className="bg-[#F0FDF4] rounded-[14px] px-5 py-6 flex items-center" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        <StatItem label="This week" value="12 shifts" showDivider />
        <StatItem label="Hours" value="48.5 hrs" showDivider />
        <StatItem label="Completed" value="8 of 12" />
      </div>
    </section>
  );
}