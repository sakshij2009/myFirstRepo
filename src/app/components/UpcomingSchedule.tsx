import { ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router';

interface ScheduleItemProps {
  dayOfWeek: string;
  date: string;
  shiftSummary: string;
  clientInitial: string;
  timeRange: string;
  shiftCount?: number;
}

function ScheduleItem({ dayOfWeek, date, shiftSummary, clientInitial, timeRange, shiftCount }: ScheduleItemProps) {
  return (
    <div className="h-16 flex items-center gap-3 border-b border-[#F3F4F6] last:border-0">
      {/* Date badge */}
      <div className="w-11 h-11 flex-shrink-0 rounded-[10px] bg-[#F0FDF4] flex flex-col items-center justify-center">
        <div className="font-['Inter'] font-bold text-[#1F6F43]" style={{ fontSize: '10px', letterSpacing: '0.5px' }}>
          {dayOfWeek}
        </div>
        <div className="font-['Poppins'] font-bold text-[#1F6F43]" style={{ fontSize: '18px', lineHeight: '1' }}>
          {date}
        </div>
      </div>
      
      {/* Shift info */}
      <div className="flex-1 min-w-0">
        <div className="font-['Inter'] font-medium text-[#1A1A1A] truncate" style={{ fontSize: '14px' }}>
          {shiftSummary} · {clientInitial}
        </div>
        <div className="font-['Inter'] text-[#9CA3AF]" style={{ fontSize: '12px', lineHeight: '1.5' }}>
          {timeRange}
        </div>
      </div>
      
      {/* Shift count badge or chevron */}
      {shiftCount && shiftCount > 1 ? (
        <div className="w-6 h-6 flex-shrink-0 rounded-full bg-[#1F6F43] text-white flex items-center justify-center font-['Inter'] font-bold" style={{ fontSize: '12px' }}>
          {shiftCount}
        </div>
      ) : (
        <ChevronRight className="w-4 h-4 text-[#D1D5DB] flex-shrink-0" strokeWidth={2} />
      )}
    </div>
  );
}

export function UpcomingSchedule() {
  const navigate = useNavigate();

  return (
    <section className="pb-6">
      {/* Section header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-['Poppins'] font-semibold text-[#1A1A1A]" style={{ fontSize: '16px', letterSpacing: '-0.2px' }}>
          Coming up
        </h2>
        <button
          onClick={() => navigate('/availability')}
          className="font-['Inter'] font-semibold text-[#1F6F43] hover:opacity-75 transition-opacity"
          style={{ fontSize: '13px' }}
        >
          My Availability &gt;
        </button>
      </div>
      
      {/* Schedule list */}
      <div>
        <ScheduleItem
          dayOfWeek="TUE"
          date="18"
          shiftSummary="Respite Care"
          clientInitial="Emma T."
          timeRange="9:00 AM – 1:00 PM"
        />
        <ScheduleItem
          dayOfWeek="WED"
          date="19"
          shiftSummary="Supervised Visitation"
          clientInitial="Lucas M."
          timeRange="10:00 AM – 12:00 PM"
          shiftCount={2}
        />
        <ScheduleItem
          dayOfWeek="THU"
          date="20"
          shiftSummary="Transportation"
          clientInitial="Sophia K."
          timeRange="3:00 PM – 4:30 PM"
        />
      </div>
    </section>
  );
}