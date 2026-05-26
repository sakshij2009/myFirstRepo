import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import {
  ArrowLeft,
  Plus,
  ChevronLeft,
  ChevronRight,
  Clock,
  CalendarDays,
  Sun,
  Moon,
  X,
  MapPin,
  AlertCircle,
  CheckCircle2,
  Briefcase,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────
type ViewTab = 'availability' | 'schedule';

interface TimeSlot {
  start: string;
  end: string;
  label?: string;
}

interface DayAvailability {
  dayAbbr: string;
  date: number;
  month: string;
  available: boolean;
  slots: TimeSlot[];
  isToday?: boolean;
}

interface TimeOffRequest {
  id: string;
  type: 'vacation' | 'sick' | 'personal';
  startDate: string;
  endDate: string;
  status: 'approved' | 'pending' | 'declined';
  reason: string;
}

interface ScheduleShift {
  id: string;
  day: string;
  date: number;
  time: string;
  duration: string;
  client: string;
  clientInitials: string;
  service: string;
  serviceColor: string;
  serviceBg: string;
  location: string;
}

// ─── Mock Data ────────────────────────────────────────────────────────
const weekAvailability: DayAvailability[] = [
  { dayAbbr: 'MON', date: 9, month: 'Mar', available: true, slots: [{ start: '8:00 AM', end: '4:00 PM', label: 'Full Day' }] },
  { dayAbbr: 'TUE', date: 10, month: 'Mar', available: true, slots: [{ start: '8:00 AM', end: '12:00 PM', label: 'Morning' }, { start: '2:00 PM', end: '6:00 PM', label: 'Afternoon' }] },
  { dayAbbr: 'WED', date: 11, month: 'Mar', available: true, slots: [{ start: '9:00 AM', end: '5:00 PM', label: 'Full Day' }] },
  { dayAbbr: 'THU', date: 12, month: 'Mar', available: false, slots: [] },
  { dayAbbr: 'FRI', date: 13, month: 'Mar', available: true, slots: [{ start: '8:00 AM', end: '1:00 PM', label: 'Morning' }], isToday: false },
  { dayAbbr: 'SAT', date: 14, month: 'Mar', available: true, slots: [{ start: '9:00 AM', end: '1:00 PM', label: 'Morning' }], isToday: true },
  { dayAbbr: 'SUN', date: 15, month: 'Mar', available: false, slots: [] },
];

const timeOffRequests: TimeOffRequest[] = [
  { id: '1', type: 'vacation', startDate: 'Mar 20', endDate: 'Mar 22', status: 'approved', reason: 'Family trip — Spring Break' },
  { id: '2', type: 'personal', startDate: 'Apr 2', endDate: 'Apr 2', status: 'pending', reason: 'Appointment' },
  { id: '3', type: 'sick', startDate: 'Feb 14', endDate: 'Feb 15', status: 'approved', reason: 'Flu recovery' },
];

const scheduleShifts: ScheduleShift[] = [
  { id: '1', day: 'MON', date: 9, time: '8:00 AM – 12:00 PM', duration: '4h', client: 'Emma Thompson', clientInitials: 'ET', service: 'Respite Care', serviceColor: '#1E5FA6', serviceBg: '#EBF5FF', location: '1234 Oak Street, Suite 5' },
  { id: '2', day: 'MON', date: 9, time: '2:00 PM – 5:00 PM', duration: '3h', client: 'Liam Roberts', clientInitials: 'LR', service: 'Transportation', serviceColor: '#92600A', serviceBg: '#FFF8E1', location: '88 Willow Drive' },
  { id: '3', day: 'TUE', date: 10, time: '9:00 AM – 11:00 AM', duration: '2h', client: 'Lucas Martinez', clientInitials: 'LM', service: 'Supervised Visit', serviceColor: '#5B21B6', serviceBg: '#F3F0FF', location: '789 Pine Road, Bldg C' },
  { id: '4', day: 'WED', date: 11, time: '10:00 AM – 2:00 PM', duration: '4h', client: 'Emma Thompson', clientInitials: 'ET', service: 'Respite Care', serviceColor: '#1E5FA6', serviceBg: '#EBF5FF', location: '1234 Oak Street, Suite 5' },
  { id: '5', day: 'FRI', date: 13, time: '8:00 AM – 12:00 PM', duration: '4h', client: 'Sophia Kim', clientInitials: 'SK', service: 'Emergency Care', serviceColor: '#B91C1C', serviceBg: '#FEF2F2', location: '321 Birch Lane, Unit 7A' },
  { id: '6', day: 'SAT', date: 14, time: '9:00 AM – 1:00 PM', duration: '4h', client: 'Michael Chen', clientInitials: 'MC', service: 'Respite Care', serviceColor: '#1E5FA6', serviceBg: '#EBF5FF', location: '5678 Maple Avenue' },
];

// ─── Sub-components ───────────────────────────────────────────────────

function SegmentedToggle({ active, onChange }: { active: ViewTab; onChange: (v: ViewTab) => void }) {
  return (
    <div className="bg-[#F3F4F6] rounded-[10px] p-[3px] flex h-10 mb-5">
      <button
        onClick={() => onChange('availability')}
        className="flex-1 rounded-[8px] font-['Inter'] font-semibold transition-all"
        style={{
          fontSize: '13px',
          backgroundColor: active === 'availability' ? '#FFFFFF' : 'transparent',
          color: active === 'availability' ? '#1A1A1A' : '#6B7280',
          boxShadow: active === 'availability' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
        }}
      >
        My Availability
      </button>
      <button
        onClick={() => onChange('schedule')}
        className="flex-1 rounded-[8px] font-['Inter'] font-semibold transition-all"
        style={{
          fontSize: '13px',
          backgroundColor: active === 'schedule' ? '#FFFFFF' : 'transparent',
          color: active === 'schedule' ? '#1A1A1A' : '#6B7280',
          boxShadow: active === 'schedule' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
        }}
      >
        Schedule Overview
      </button>
    </div>
  );
}

function WeekNavigator({ weekLabel, weekBadge, onPrev, onNext }: { weekLabel: string; weekBadge: string; onPrev: () => void; onNext: () => void }) {
  return (
    <div className="mb-4">
      <div className="flex items-center justify-between">
        <button onClick={onPrev} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[#F3F4F6] transition-colors">
          <ChevronLeft className="w-5 h-5 text-[#6B7280]" strokeWidth={2} />
        </button>
        <span className="font-['Inter'] font-semibold text-[#1A1A1A]" style={{ fontSize: '14px' }}>
          {weekLabel}
        </span>
        <button onClick={onNext} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[#F3F4F6] transition-colors">
          <ChevronRight className="w-5 h-5 text-[#6B7280]" strokeWidth={2} />
        </button>
      </div>
      <div className="flex justify-center mt-1">
        <span
          className="px-3 py-[3px] rounded-2xl font-['Inter'] font-semibold"
          style={{ fontSize: '11px', backgroundColor: '#F0FDF4', color: '#1F6F43' }}
        >
          {weekBadge}
        </span>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────

export function Availability() {
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState<ViewTab>('availability');
  const [weekOffset, setWeekOffset] = useState(0);
  const [showBottomSheet, setShowBottomSheet] = useState(false);
  const [selectedDay, setSelectedDay] = useState<DayAvailability | null>(null);

  const weekLabel = useMemo(() => {
    if (weekOffset === 0) return 'March 9 – 15, 2026';
    if (weekOffset === 1) return 'March 16 – 22, 2026';
    if (weekOffset === -1) return 'March 2 – 8, 2026';
    return `Week ${weekOffset > 0 ? '+' : ''}${weekOffset}`;
  }, [weekOffset]);

  const weekBadge = useMemo(() => {
    if (weekOffset === 0) return 'This Week';
    if (weekOffset === 1) return 'Next Week';
    if (weekOffset === -1) return 'Last Week';
    if (weekOffset > 1) return `${weekOffset} Weeks Out`;
    return `${Math.abs(weekOffset)} Weeks Ago`;
  }, [weekOffset]);

  // Summary stats
  const totalHours = useMemo(() => {
    return weekAvailability.reduce((acc, day) => {
      return acc + day.slots.reduce((sum, slot) => {
        const start = parseTime(slot.start);
        const end = parseTime(slot.end);
        return sum + (end - start);
      }, 0);
    }, 0);
  }, []);

  const availableDays = weekAvailability.filter(d => d.available).length;

  function parseTime(t: string): number {
    const [time, period] = t.split(' ');
    let [h, m] = time.split(':').map(Number);
    if (period === 'PM' && h !== 12) h += 12;
    if (period === 'AM' && h === 12) h = 0;
    return h + m / 60;
  }

  const statusConfig = {
    approved: { bg: '#F0FDF4', color: '#1F6F43', icon: CheckCircle2, label: 'Approved' },
    pending: { bg: '#FFF8E1', color: '#92600A', icon: Clock, label: 'Pending' },
    declined: { bg: '#FEF2F2', color: '#B91C1C', icon: AlertCircle, label: 'Declined' },
  };

  const typeConfig = {
    vacation: { icon: Sun, color: '#F59E0B', label: 'Vacation' },
    sick: { icon: AlertCircle, color: '#EF4444', label: 'Sick Leave' },
    personal: { icon: Briefcase, color: '#6366F1', label: 'Personal' },
  };

  return (
    <div className="px-5 pb-6 relative">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <header className="h-14 flex items-center justify-between pt-4 mb-1">
        <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center -ml-2">
          <ArrowLeft className="w-6 h-6 text-[#1A1A1A]" strokeWidth={2} />
        </button>

        <div className="flex-1 text-center">
          <h1 className="font-['Poppins'] font-semibold text-[#1A1A1A]" style={{ fontSize: '18px' }}>
            Availability
          </h1>
          <div className="font-['Inter'] text-[#9CA3AF]" style={{ fontSize: '12px' }}>
            Sarah Johnson · Staff
          </div>
        </div>

        <button
          onClick={() => setShowBottomSheet(true)}
          className="w-10 h-10 rounded-full flex items-center justify-center transition-colors"
          style={{ backgroundColor: '#F0FDF4' }}
        >
          <Plus className="w-6 h-6 text-[#1F6F43]" strokeWidth={2} />
        </button>
      </header>

      {/* ── Segmented Toggle ───────────────────────────────────────── */}
      <div className="mt-5">
        <SegmentedToggle active={activeView} onChange={setActiveView} />
      </div>

      {/* ── Week Navigator ─────────────────────────────────────────── */}
      <WeekNavigator
        weekLabel={weekLabel}
        weekBadge={weekBadge}
        onPrev={() => setWeekOffset(w => w - 1)}
        onNext={() => setWeekOffset(w => w + 1)}
      />

      {/* ════════════════════════════════════════════════════════════ */}
      {/* VIEW 1: MY AVAILABILITY                                     */}
      {/* ════════════════════════════════════════════════════════════ */}
      {activeView === 'availability' && (
        <>
          {/* Summary Strip */}
          <div
            className="flex items-center justify-between bg-white rounded-2xl px-5 py-3 mb-4"
            style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
          >
            <div className="flex items-center gap-2">
              <CalendarDays className="w-4.5 h-4.5 text-[#1F6F43]" strokeWidth={2} />
              <span className="font-['Inter'] font-semibold text-[#1A1A1A]" style={{ fontSize: '13px' }}>
                {availableDays} days
              </span>
              <span className="font-['Inter'] text-[#9CA3AF]" style={{ fontSize: '13px' }}>available</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4.5 h-4.5 text-[#1F6F43]" strokeWidth={2} />
              <span className="font-['Inter'] font-semibold text-[#1A1A1A]" style={{ fontSize: '13px' }}>
                {totalHours}h
              </span>
              <span className="font-['Inter'] text-[#9CA3AF]" style={{ fontSize: '13px' }}>total</span>
            </div>
          </div>

          {/* Weekly Availability Grid Card */}
          <div
            className="bg-white rounded-2xl p-5 mb-4"
            style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
          >
            {/* Day headers row */}
            <div className="grid grid-cols-7 gap-0 mb-3">
              {weekAvailability.map(day => (
                <button
                  key={day.dayAbbr}
                  onClick={() => setSelectedDay(selectedDay?.dayAbbr === day.dayAbbr ? null : day)}
                  className="flex flex-col items-center gap-1 py-1 transition-opacity"
                  style={{ opacity: day.available ? 1 : 0.4 }}
                >
                  <span className="font-['Inter'] font-semibold text-[#9CA3AF]" style={{ fontSize: '10px' }}>
                    {day.dayAbbr}
                  </span>
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center font-['Inter'] font-semibold"
                    style={{
                      fontSize: '14px',
                      backgroundColor: day.isToday ? '#1F6F43' : selectedDay?.dayAbbr === day.dayAbbr ? '#E8F5F0' : 'transparent',
                      color: day.isToday ? '#FFFFFF' : '#1A1A1A',
                    }}
                  >
                    {day.date}
                  </div>
                </button>
              ))}
            </div>

            {/* Separator */}
            <div className="h-px bg-[#F3F4F6] mb-3"></div>

            {/* Time slot blocks for each day */}
            <div className="grid grid-cols-7 gap-1">
              {weekAvailability.map(day => (
                <div key={day.dayAbbr} className="flex flex-col items-center gap-1">
                  {day.available && day.slots.length > 0 ? (
                    day.slots.map((slot, i) => (
                      <div
                        key={i}
                        className="w-full rounded-lg flex flex-col items-center justify-center py-1.5 px-0.5"
                        style={{ backgroundColor: '#F0FDF4' }}
                      >
                        <span className="font-['Inter'] font-semibold text-[#1F6F43] text-center" style={{ fontSize: '8px', lineHeight: '1.3' }}>
                          {slot.start.replace(' ', '')}
                        </span>
                        <span className="text-[#9CA3AF]" style={{ fontSize: '7px' }}>–</span>
                        <span className="font-['Inter'] font-semibold text-[#1F6F43] text-center" style={{ fontSize: '8px', lineHeight: '1.3' }}>
                          {slot.end.replace(' ', '')}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div
                      className="w-full rounded-lg flex items-center justify-center py-3"
                      style={{ backgroundColor: '#F9FAFB' }}
                    >
                      <Moon className="w-3 h-3 text-[#D1D5DB]" strokeWidth={2} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Selected Day Detail */}
          {selectedDay && selectedDay.available && (
            <div
              className="bg-white rounded-2xl p-5 mb-4 border-l-4 border-[#1F6F43]"
              style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-['Poppins'] font-semibold text-[#1A1A1A]" style={{ fontSize: '15px' }}>
                  {selectedDay.dayAbbr}, {selectedDay.month} {selectedDay.date}
                </h3>
                <button onClick={() => setSelectedDay(null)}>
                  <X className="w-4 h-4 text-[#9CA3AF]" strokeWidth={2} />
                </button>
              </div>
              {selectedDay.slots.map((slot, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 py-2.5 border-b border-[#F3F4F6] last:border-0"
                >
                  <div className="w-8 h-8 rounded-lg bg-[#F0FDF4] flex items-center justify-center">
                    {slot.label === 'Morning' ? (
                      <Sun className="w-4 h-4 text-[#F59E0B]" strokeWidth={2} />
                    ) : slot.label === 'Afternoon' ? (
                      <Sun className="w-4 h-4 text-[#F97316]" strokeWidth={2} />
                    ) : (
                      <Clock className="w-4 h-4 text-[#1F6F43]" strokeWidth={2} />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="font-['Inter'] font-semibold text-[#1A1A1A]" style={{ fontSize: '14px' }}>
                      {slot.label || 'Available'}
                    </div>
                    <div className="font-['Inter'] text-[#9CA3AF]" style={{ fontSize: '12px' }}>
                      {slot.start} – {slot.end}
                    </div>
                  </div>
                  <button className="font-['Inter'] font-medium text-[#1F6F43] hover:underline" style={{ fontSize: '12px' }}>
                    Edit
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Quick Actions */}
          <div className="flex gap-3 mb-6">
            <button
              className="flex-1 h-11 rounded-[10px] font-['Inter'] font-semibold border-[1.5px] border-[#1F6F43] text-[#1F6F43] hover:bg-[#F0FDF4] transition-colors"
              style={{ fontSize: '13px' }}
            >
              Copy to Next Week
            </button>
            <button
              className="flex-1 h-11 rounded-[10px] font-['Inter'] font-semibold bg-[#1F6F43] text-white hover:bg-[#1a5e38] transition-colors"
              style={{ fontSize: '13px', boxShadow: '0 4px 12px rgba(31,111,67,0.2)' }}
            >
              Edit Availability
            </button>
          </div>

          {/* ── Time-Off Requests Section ──────────────────────────── */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-['Poppins'] font-semibold text-[#1A1A1A]" style={{ fontSize: '16px' }}>
              Time-Off Requests
            </h2>
            <button
              onClick={() => navigate('/availability/request-time-off')}
              className="font-['Inter'] font-medium text-[#1F6F43] hover:underline"
              style={{ fontSize: '13px' }}
            >
              + New Request
            </button>
          </div>

          {timeOffRequests.map(req => {
            const sConf = statusConfig[req.status];
            const tConf = typeConfig[req.type];
            const StatusIcon = sConf.icon;
            const TypeIcon = tConf.icon;

            return (
              <div
                key={req.id}
                className="bg-white rounded-2xl p-5 mb-3"
                style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${tConf.color}15` }}
                    >
                      <TypeIcon className="w-4.5 h-4.5" style={{ color: tConf.color }} strokeWidth={2} />
                    </div>
                    <div>
                      <div className="font-['Inter'] font-semibold text-[#1A1A1A]" style={{ fontSize: '14px' }}>
                        {tConf.label}
                      </div>
                      <div className="font-['Inter'] text-[#9CA3AF]" style={{ fontSize: '12px' }}>
                        {req.startDate === req.endDate ? req.startDate : `${req.startDate} – ${req.endDate}`}
                      </div>
                    </div>
                  </div>

                  <div
                    className="flex items-center gap-1 px-2.5 py-1 rounded-full font-['Inter'] font-semibold"
                    style={{ fontSize: '11px', backgroundColor: sConf.bg, color: sConf.color }}
                  >
                    <StatusIcon className="w-3 h-3" strokeWidth={2.5} />
                    {sConf.label}
                  </div>
                </div>

                <div className="font-['Inter'] text-[#6B7280] ml-[46px]" style={{ fontSize: '13px' }}>
                  {req.reason}
                </div>
              </div>
            );
          })}
        </>
      )}

      {/* ════════════════════════════════════════════════════════════ */}
      {/* VIEW 2: SCHEDULE OVERVIEW                                   */}
      {/* ════════════════════════════════════════════════════════════ */}
      {activeView === 'schedule' && (
        <>
          {/* Summary Strip */}
          <div
            className="flex items-center justify-between bg-white rounded-2xl px-5 py-3 mb-4"
            style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
          >
            <div className="text-center flex-1">
              <div className="font-['Poppins'] font-bold text-[#1A1A1A]" style={{ fontSize: '20px' }}>
                {scheduleShifts.length}
              </div>
              <div className="font-['Inter'] text-[#9CA3AF]" style={{ fontSize: '11px' }}>Shifts</div>
            </div>
            <div className="w-px h-10 bg-[#F3F4F6]"></div>
            <div className="text-center flex-1">
              <div className="font-['Poppins'] font-bold text-[#1F6F43]" style={{ fontSize: '20px' }}>
                {scheduleShifts.reduce((sum, s) => sum + parseInt(s.duration), 0)}h
              </div>
              <div className="font-['Inter'] text-[#9CA3AF]" style={{ fontSize: '11px' }}>Total Hours</div>
            </div>
            <div className="w-px h-10 bg-[#F3F4F6]"></div>
            <div className="text-center flex-1">
              <div className="font-['Poppins'] font-bold text-[#1A1A1A]" style={{ fontSize: '20px' }}>
                {new Set(scheduleShifts.map(s => s.client)).size}
              </div>
              <div className="font-['Inter'] text-[#9CA3AF]" style={{ fontSize: '11px' }}>Clients</div>
            </div>
          </div>

          {/* Day headers row (mini calendar) */}
          <div
            className="bg-white rounded-2xl p-4 mb-4"
            style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
          >
            <div className="grid grid-cols-7 gap-0">
              {weekAvailability.map(day => {
                const hasShift = scheduleShifts.some(s => s.date === day.date);
                return (
                  <div key={day.dayAbbr} className="flex flex-col items-center gap-1">
                    <span className="font-['Inter'] font-semibold text-[#9CA3AF]" style={{ fontSize: '10px' }}>
                      {day.dayAbbr}
                    </span>
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center font-['Inter'] font-semibold"
                      style={{
                        fontSize: '14px',
                        backgroundColor: day.isToday ? '#1F6F43' : 'transparent',
                        color: day.isToday ? '#FFFFFF' : '#1A1A1A',
                      }}
                    >
                      {day.date}
                    </div>
                    {hasShift && (
                      <div className="w-1.5 h-1.5 rounded-full bg-[#1F6F43]"></div>
                    )}
                    {!hasShift && <div className="w-1.5 h-1.5"></div>}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Grouped Shift Cards by Day */}
          {(() => {
            const dayOrder = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
            const grouped = dayOrder
              .map(d => ({
                day: d,
                dayData: weekAvailability.find(w => w.dayAbbr === d)!,
                shifts: scheduleShifts.filter(s => s.day === d),
              }))
              .filter(g => g.shifts.length > 0);

            return grouped.map(group => (
              <div key={group.day} className="mb-5">
                {/* Day Label */}
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="font-['Poppins'] font-semibold text-[#1A1A1A]" style={{ fontSize: '14px' }}>
                    {group.day}, Mar {group.dayData.date}
                  </h3>
                  {group.dayData.isToday && (
                    <div className="w-1.5 h-1.5 bg-[#22C55E] rounded-full"></div>
                  )}
                  <span className="font-['Inter'] text-[#9CA3AF]" style={{ fontSize: '12px' }}>
                    · {group.shifts.length} shift{group.shifts.length > 1 ? 's' : ''}
                  </span>
                </div>

                {group.shifts.map(shift => (
                  <div
                    key={shift.id}
                    className="bg-white rounded-2xl p-4 mb-3 cursor-pointer hover:shadow-md transition-shadow"
                    style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
                    onClick={() => navigate('/shifts/1')}
                  >
                    {/* Service badge + time */}
                    <div className="flex items-center justify-between mb-2.5">
                      <div
                        className="px-3 py-1 rounded-full font-['Inter'] font-semibold"
                        style={{ fontSize: '11px', backgroundColor: shift.serviceBg, color: shift.serviceColor }}
                      >
                        {shift.service}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-[#9CA3AF]" strokeWidth={2} />
                        <span className="font-['Inter'] font-medium text-[#6B7280]" style={{ fontSize: '12px' }}>
                          {shift.duration}
                        </span>
                      </div>
                    </div>

                    {/* Time */}
                    <div className="font-['Inter'] font-semibold text-[#1A1A1A] mb-2" style={{ fontSize: '14px' }}>
                      {shift.time}
                    </div>

                    {/* Client row */}
                    <div className="flex items-center gap-2.5 mb-2">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center font-['Inter'] font-semibold"
                        style={{ backgroundColor: '#F0FDF4', color: '#1F6F43', fontSize: '12px' }}
                      >
                        {shift.clientInitials}
                      </div>
                      <span className="font-['Inter'] font-medium text-[#1A1A1A]" style={{ fontSize: '13px' }}>
                        {shift.client}
                      </span>
                    </div>

                    {/* Location */}
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[#9CA3AF]" strokeWidth={2} />
                      <span className="font-['Inter'] text-[#6B7280] truncate" style={{ fontSize: '12px' }}>
                        {shift.location}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ));
          })()}

          {/* Weekly total footer */}
          <div
            className="bg-[#F0FDF4] rounded-2xl p-4 flex items-center justify-between"
            style={{ border: '1px solid #DCFCE7' }}
          >
            <div className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-[#1F6F43]" strokeWidth={2} />
              <span className="font-['Inter'] font-semibold text-[#1F6F43]" style={{ fontSize: '14px' }}>
                Weekly Total
              </span>
            </div>
            <span className="font-['Poppins'] font-bold text-[#1F6F43]" style={{ fontSize: '18px' }}>
              {scheduleShifts.reduce((sum, s) => sum + parseInt(s.duration), 0)} Hours
            </span>
          </div>
        </>
      )}

      {/* ════════════════════════════════════════════════════════════ */}
      {/* BOTTOM SHEET — New Request / Availability Override          */}
      {/* ════════════════════════════════════════════════════════════ */}
      {showBottomSheet && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 z-40"
            onClick={() => setShowBottomSheet(false)}
          ></div>

          {/* Sheet */}
          <div className="fixed bottom-0 left-0 right-0 max-w-[390px] mx-auto bg-white rounded-t-3xl z-50 px-5 pb-8 pt-3">
            {/* Handle */}
            <div className="w-10 h-1 bg-[#D1D5DB] rounded-full mx-auto mb-5"></div>

            <h3 className="font-['Poppins'] font-semibold text-[#1A1A1A] mb-5" style={{ fontSize: '18px' }}>
              Quick Actions
            </h3>

            {/* Option 1: Time-Off Request */}
            <button
              onClick={() => {
                setShowBottomSheet(false);
                navigate('/availability/request-time-off');
              }}
              className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-[#F9FAFB] transition-colors mb-3"
            >
              <div className="w-12 h-12 rounded-xl bg-[#FFF8E1] flex items-center justify-center">
                <Sun className="w-6 h-6 text-[#F59E0B]" strokeWidth={2} />
              </div>
              <div className="flex-1 text-left">
                <div className="font-['Inter'] font-semibold text-[#1A1A1A]" style={{ fontSize: '15px' }}>
                  Request Time Off
                </div>
                <div className="font-['Inter'] text-[#9CA3AF]" style={{ fontSize: '12px' }}>
                  Vacation, sick leave, or personal day
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-[#D1D5DB]" strokeWidth={2} />
            </button>

            {/* Option 2: Set Recurring */}
            <button
              onClick={() => {
                setShowBottomSheet(false);
                navigate('/availability/recurring');
              }}
              className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-[#F9FAFB] transition-colors"
            >
              <div className="w-12 h-12 rounded-xl bg-[#F0FDF4] flex items-center justify-center">
                <Clock className="w-6 h-6 text-[#1F6F43]" strokeWidth={2} />
              </div>
              <div className="flex-1 text-left">
                <div className="font-['Inter'] font-semibold text-[#1A1A1A]" style={{ fontSize: '15px' }}>
                  Set Recurring Hours
                </div>
                <div className="font-['Inter'] text-[#9CA3AF]" style={{ fontSize: '12px' }}>
                  Define your default weekly schedule
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-[#D1D5DB]" strokeWidth={2} />
            </button>

            {/* Cancel */}
            <button
              onClick={() => setShowBottomSheet(false)}
              className="w-full h-12 mt-4 rounded-[14px] font-['Inter'] font-semibold text-[#6B7280] bg-[#F3F4F6] hover:bg-[#E5E7EB] transition-colors"
              style={{ fontSize: '15px' }}
            >
              Cancel
            </button>
          </div>
        </>
      )}
    </div>
  );
}