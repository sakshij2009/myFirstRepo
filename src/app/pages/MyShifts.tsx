import {
  ArrowLeft,
  SlidersHorizontal,
  Clock,
  MapPin,
  CheckCircle2,
  ArrowLeftRight,
  FileText,
  Loader2,
} from 'lucide-react';
import { useState } from 'react';
import { useSafeNavigate } from '../hooks/useSafeNavigate';
import { toast } from 'sonner';
import { ConfirmShiftDialog } from '../components/ConfirmShiftDialog';
import { useAppContext } from '../../context/AppContext';
import {
  useUserShifts,
  getShiftUIStatus,
  formatTime,
  formatDisplayDate,
  todayISO,
  clockTimeDisplay,
  clockElapsed,
  Shift,
} from '../../hooks/useUserShifts';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';

/* ─── Style maps ───────────────────────────────────────────────────── */
const SERVICE_TYPE_STYLES: Record<string, { bg: string; text: string }> = {
  'Respite Care':         { bg: '#EBF5FF', text: '#1E5FA6' },
  'Emergency Care':       { bg: '#FEF2F2', text: '#B91C1C' },
  'Supervised Visitation':{ bg: '#F3F0FF', text: '#5B21B6' },
  'Transportation':       { bg: '#FFF8E1', text: '#92600A' },
};
const DEFAULT_SERVICE_STYLE = { bg: '#F3F4F6', text: '#6B7280' };

const STATUS_STYLES = {
  Assigned:    { bg: '#FFF8E1', text: '#92600A' },
  Confirmed:   { bg: '#F0FDF4', text: '#1F6F43' },
  'In Progress':{ bg: '#EBF5FF', text: '#1E5FA6' },
  Completed:   { bg: '#F3F4F6', text: '#6B7280' },
};

/* ─── Helpers ──────────────────────────────────────────────────────── */

function getServiceLabel(shift: Shift): string {
  return String(shift.typeName || shift.categoryName || 'Shift');
}

function getServiceStyle(shift: Shift): { bg: string; text: string } {
  return SERVICE_TYPE_STYLES[getServiceLabel(shift)] ?? DEFAULT_SERVICE_STYLE;
}

function getInitials(name?: string): string {
  if (!name) return '?';
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

const AVATAR_COLORS = ['#E0F2FE', '#DCFCE7', '#F3F0FF', '#FEF3C7', '#FCE7F3', '#E0E7FF'];
function getAvatarBg(name?: string): string {
  if (!name) return '#F3F4F6';
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
}

/** "HH:MM" duration string e.g. "4 hrs" or "1h 30m" */
function calcDurationLabel(startTime?: string, endTime?: string): string {
  if (!startTime || !endTime) return '';
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  if (isNaN(sh) || isNaN(eh)) return '';
  const mins = eh * 60 + em - (sh * 60 + sm);
  if (mins <= 0) return '';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (m === 0) return `${h} hr${h !== 1 ? 's' : ''}`;
  return `${h}h ${m}m`;
}

/** Minutes from two "HH:MM" strings */
function calcDurationMins(startTime?: string, endTime?: string): number {
  if (!startTime || !endTime) return 0;
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  if (isNaN(sh) || isNaN(eh)) return 0;
  return Math.max(0, eh * 60 + em - (sh * 60 + sm));
}


/** Best ISO date from a shift document */
function getShiftISO(shift: Shift): string {
  if (shift.dateKey_iso) return String(shift.dateKey_iso);
  if (shift.dateKey) {
    const dk = String(shift.dateKey);
    const parts = dk.split('-');
    if (parts.length === 3 && parts[2].length === 4) return `${parts[2]}-${parts[1]}-${parts[0]}`;
    if (dk.length === 10) return dk; // already YYYY-MM-DD
  }
  if (shift.startDate && typeof shift.startDate === 'object' && 'seconds' in (shift.startDate as object)) {
    const d = new Date((shift.startDate as { seconds: number }).seconds * 1000);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  return '';
}

function isoOffset(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getDateGroupLabel(isoDate: string): string {
  if (!isoDate) return 'Unknown Date';
  const today = todayISO();
  const yesterday = isoOffset(-1);
  const tomorrow = isoOffset(1);
  const [y, m, d] = isoDate.split('-').map(Number);
  const monthDay = new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
  if (isoDate === today)     return `Today · ${monthDay}`;
  if (isoDate === yesterday) return `Yesterday · ${monthDay}`;
  if (isoDate === tomorrow)  return `Tomorrow · ${monthDay}`;
  const dayName = new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'long' });
  return `${dayName} · ${monthDay}`;
}

/* ─── ShiftCard (active / upcoming / assigned) ─────────────────────── */
function ShiftCard({ shift }: { shift: Shift }) {
  const navigate = useSafeNavigate();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const uiStatus = getShiftUIStatus(shift);
  const displayStatus =
    uiStatus === 'assigned'    ? 'Assigned' :
    uiStatus === 'confirmed'   ? 'Confirmed' :
    uiStatus === 'in-progress' ? 'In Progress' :
    'Completed';

  const serviceLabel = getServiceLabel(shift);
  const serviceStyle = getServiceStyle(shift);
  const statusStyle  = STATUS_STYLES[displayStatus as keyof typeof STATUS_STYLES] ?? DEFAULT_SERVICE_STYLE;

  const timeRange = [formatTime(shift.startTime ?? ''), formatTime(shift.endTime ?? '')]
    .filter(Boolean).join(' – ');
  const duration    = calcDurationLabel(shift.startTime, shift.endTime);
  const clientName  = shift.clientName || 'Unknown Client';
  const location    = shift.address || '';

  const handleConfirmShift = async () => {
    await updateDoc(doc(db, 'shifts', shift.docId), { shiftConfirmed: true });
  };

  return (
    <>
      <div
        className="bg-white rounded-2xl mb-4 overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
        style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
      >
        {/* Amber banner */}
        {uiStatus === 'assigned' && (
          <div className="flex items-center gap-2 px-4" style={{ padding: '10px 16px', backgroundColor: '#FFF8E1' }}>
            <Clock className="w-4 h-4 text-[#92600A] flex-shrink-0" strokeWidth={2} />
            <span className="font-['Inter'] font-semibold text-[#92600A]" style={{ fontSize: '12px' }}>
              Confirmation required
            </span>
          </div>
        )}

        <div className="p-5" onClick={() => navigate(`/shifts/${shift.docId}`)}>
          {/* Service + status badges */}
          <div className="flex items-center justify-between mb-2">
            <div
              className="px-3 py-1 rounded-full font-['Inter'] font-semibold"
              style={{ backgroundColor: serviceStyle.bg, color: serviceStyle.text, fontSize: '11px' }}
            >
              {serviceLabel}
            </div>
            <div
              className="px-2.5 py-1 rounded-full font-['Inter'] font-medium"
              style={{ backgroundColor: statusStyle.bg, color: statusStyle.text, fontSize: '11px' }}
            >
              {displayStatus}
            </div>
          </div>

          {/* Time row */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#9CA3AF]" strokeWidth={2} />
              <span className="font-['Inter'] font-semibold text-[#1A1A1A]" style={{ fontSize: '14px' }}>
                {timeRange || '—'}
              </span>
            </div>
            {duration && (
              <div className="px-2 py-0.5 rounded-xl font-['Inter'] font-medium bg-[#F3F4F6] text-[#6B7280]" style={{ fontSize: '12px' }}>
                {duration}
              </div>
            )}
          </div>

          {/* Client row */}
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center font-['Inter'] font-semibold flex-shrink-0"
              style={{ backgroundColor: getAvatarBg(clientName), color: '#6B7280', fontSize: '14px' }}
            >
              {getInitials(clientName)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-['Inter'] font-semibold text-[#1A1A1A]" style={{ fontSize: '15px' }}>
                {clientName}
              </div>
              {shift.clientId && (
                <div className="font-['Inter'] text-[#9CA3AF]" style={{ fontSize: '12px' }}>
                  ID: {shift.clientId}
                </div>
              )}
            </div>
          </div>

          {/* Location */}
          {location && (
            <div className="flex items-center gap-1.5 mb-4">
              <MapPin className="w-3.5 h-3.5 text-[#9CA3AF] flex-shrink-0" strokeWidth={2} />
              <span className="font-['Inter'] text-[#6B7280] truncate" style={{ fontSize: '13px' }}>
                {location}
              </span>
            </div>
          )}

          <div className="h-px bg-[#F3F4F6] my-4" />

          {/* Action row */}
          {uiStatus === 'assigned' && (
            <div className="flex items-center justify-between gap-3">
              <button
                className="h-10 rounded-[10px] font-['Inter'] font-semibold transition-colors active:bg-[#F0FDF4]"
                style={{ fontSize: '14px', width: '55%', color: '#1F6F43', border: '1.5px solid #1F6F43', backgroundColor: 'white' }}
                onClick={(e) => { e.stopPropagation(); setShowConfirmDialog(true); }}
              >
                Confirm Shift
              </button>
              <button
                className="font-['Inter'] font-medium text-[#1F6F43] hover:underline flex-shrink-0"
                style={{ fontSize: '13px' }}
                onClick={(e) => { e.stopPropagation(); navigate(`/shifts/${shift.docId}`); }}
              >
                Details &gt;
              </button>
            </div>
          )}

          {uiStatus === 'confirmed' && (
            <div className="flex items-center justify-between gap-3">
              <button
                className="h-10 bg-[#1F6F43] text-white rounded-[10px] font-['Inter'] font-semibold hover:bg-[#1a5e38] transition-colors"
                style={{ fontSize: '14px', width: '55%' }}
                onClick={(e) => { e.stopPropagation(); navigate(`/shifts/${shift.docId}`); }}
              >
                Check In
              </button>
              <button
                className="w-10 h-10 rounded-[10px] flex items-center justify-center flex-shrink-0 transition-colors bg-[#F3F4F6]"
                onClick={(e) => {
                  e.stopPropagation();
                  toast('Transfers must be initiated at least 2 hours before shift start', { duration: 3000 });
                }}
              >
                <ArrowLeftRight className="w-[18px] h-[18px] text-[#6B7280]" strokeWidth={2} />
              </button>
              <button
                className="font-['Inter'] font-medium text-[#1F6F43] hover:underline flex-shrink-0"
                style={{ fontSize: '13px' }}
                onClick={(e) => { e.stopPropagation(); navigate(`/shifts/${shift.docId}`); }}
              >
                Details &gt;
              </button>
            </div>
          )}

          {uiStatus === 'in-progress' && (
            <div className="flex items-center justify-between gap-3">
              <button
                className="flex-1 h-10 bg-white border-[1.5px] border-[#1F6F43] text-[#1F6F43] rounded-[10px] font-['Inter'] font-semibold hover:bg-[#F0FDF4] transition-colors"
                style={{ fontSize: '14px', maxWidth: '55%' }}
                onClick={(e) => { e.stopPropagation(); navigate(`/shifts/${shift.docId}/clock-out`); }}
              >
                Clock Out
              </button>
              <button
                className="font-['Inter'] font-medium text-[#1F6F43] hover:underline"
                style={{ fontSize: '13px' }}
                onClick={(e) => { e.stopPropagation(); navigate(`/shifts/${shift.docId}`); }}
              >
                View Report
              </button>
            </div>
          )}

          {uiStatus === 'completed' && (
            <div className="flex items-center justify-between gap-3">
              <button
                className="flex-1 h-10 bg-white border-[1.5px] border-[#1F6F43] text-[#1F6F43] rounded-[10px] font-['Inter'] font-semibold hover:bg-[#F0FDF4] transition-colors"
                style={{ fontSize: '14px' }}
                onClick={(e) => { e.stopPropagation(); navigate(`/shifts/${shift.docId}`); }}
              >
                View Report
              </button>
              <CheckCircle2 className="w-5 h-5 text-[#1F6F43] flex-shrink-0" strokeWidth={2} />
            </div>
          )}
        </div>
      </div>

      <ConfirmShiftDialog
        open={showConfirmDialog}
        onClose={() => setShowConfirmDialog(false)}
        onConfirmed={handleConfirmShift}
        shiftDocId={shift.docId}
        serviceType={serviceLabel}
        clientName={clientName}
        date={shift.dateKey_iso ? formatDisplayDate(String(shift.dateKey_iso)) : ''}
        timeRange={timeRange}
        location={location}
      />
    </>
  );
}

/* ─── CompletedShiftCard ──────────────────────────────────────────── */
function CompletedShiftCard({ shift }: { shift: Shift }) {
  const navigate = useSafeNavigate();
  const serviceLabel = getServiceLabel(shift);
  const serviceStyle = getServiceStyle(shift);
  const clientName   = shift.clientName || 'Unknown Client';
  const location     = shift.address || '';
  const timeRange    = [formatTime(shift.startTime ?? ''), formatTime(shift.endTime ?? '')]
    .filter(Boolean).join(' – ');
  const duration     = calcDurationLabel(shift.startTime, shift.endTime);
  // Support both current Timestamp format and legacy field names
  const rawClockIn  = shift.clockIn  || (shift as Record<string, unknown>).clockInDate;
  const rawClockOut = shift.clockOut || (shift as Record<string, unknown>).clockOutDate;
  const totalTime   = (rawClockIn && rawClockOut) ? clockElapsed(rawClockIn, rawClockOut) : duration;

  return (
    <div
      className="bg-white rounded-2xl mb-4 overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
      style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
      onClick={() => navigate(`/shifts/${shift.docId}`)}
    >
      <div className="p-5">
        {/* Completed banner */}
        <div
          className="flex items-center justify-between mb-3.5"
          style={{ backgroundColor: '#F0FDF4', borderRadius: '10px', padding: '10px 14px' }}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-[18px] h-[18px] text-[#1F6F43]" strokeWidth={2} />
            <span className="font-['Inter'] font-semibold text-[#1F6F43]" style={{ fontSize: '12px' }}>
              Completed
            </span>
          </div>
          {rawClockOut && (
            <span className="font-['Inter'] text-[#9CA3AF]" style={{ fontSize: '11px' }}>
              Out: {clockTimeDisplay(rawClockOut)}
            </span>
          )}
        </div>

        {/* Service + status */}
        <div className="flex items-center justify-between mb-2">
          <div
            className="px-3 py-1 rounded-full font-['Inter'] font-semibold"
            style={{ backgroundColor: serviceStyle.bg, color: serviceStyle.text, fontSize: '11px' }}
          >
            {serviceLabel}
          </div>
          <div
            className="px-2.5 py-1 rounded-full font-['Inter'] font-medium"
            style={{ backgroundColor: '#F3F4F6', color: '#6B7280', fontSize: '11px' }}
          >
            Completed
          </div>
        </div>

        {/* Time */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-[#9CA3AF]" strokeWidth={2} />
            <span className="font-['Inter'] font-medium text-[#6B7280]" style={{ fontSize: '14px' }}>
              {timeRange || '—'}
            </span>
          </div>
          {duration && (
            <div className="px-2 py-0.5 rounded-xl font-['Inter'] font-medium bg-[#F3F4F6] text-[#6B7280]" style={{ fontSize: '12px' }}>
              {duration}
            </div>
          )}
        </div>

        {/* Client */}
        <div className="flex items-center gap-3 mb-3">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center font-['Inter'] font-semibold flex-shrink-0"
            style={{ backgroundColor: getAvatarBg(clientName), color: '#6B7280', fontSize: '13px' }}
          >
            {getInitials(clientName)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-['Inter'] font-semibold text-[#1A1A1A]" style={{ fontSize: '14px' }}>
              {clientName}
            </div>
            {shift.clientId && (
              <div className="font-['Inter'] text-[#9CA3AF]" style={{ fontSize: '12px' }}>
                ID: {shift.clientId}
              </div>
            )}
          </div>
        </div>

        {/* Location */}
        {location && (
          <div className="flex items-center gap-1.5 mb-4">
            <MapPin className="w-3.5 h-3.5 text-[#9CA3AF] flex-shrink-0" strokeWidth={2} />
            <span className="font-['Inter'] text-[#9CA3AF] truncate" style={{ fontSize: '13px' }}>
              {location}
            </span>
          </div>
        )}

        {/* Summary strip */}
        <div className="border-t border-[#F3F4F6] pt-3 mb-3">
          <div className="flex items-center">
            <div className="flex-1 text-center">
              <p className="font-['Inter'] text-[#9CA3AF]" style={{ fontSize: '10px' }}>Clock In</p>
              <p className="font-['Inter'] font-medium text-[#1A1A1A]" style={{ fontSize: '12px' }}>
                {rawClockIn ? clockTimeDisplay(rawClockIn) : '—'}
              </p>
            </div>
            <div className="w-px h-7 bg-[#F3F4F6]" />
            <div className="flex-1 text-center">
              <p className="font-['Inter'] text-[#9CA3AF]" style={{ fontSize: '10px' }}>Clock Out</p>
              <p className="font-['Inter'] font-medium text-[#1A1A1A]" style={{ fontSize: '12px' }}>
                {rawClockOut ? clockTimeDisplay(rawClockOut) : '—'}
              </p>
            </div>
            <div className="w-px h-7 bg-[#F3F4F6]" />
            <div className="flex-1 text-center">
              <p className="font-['Inter'] text-[#9CA3AF]" style={{ fontSize: '10px' }}>Total</p>
              <p className="font-['Inter'] font-semibold text-[#1F6F43]" style={{ fontSize: '12px' }}>
                {totalTime || '—'}
              </p>
            </div>
          </div>
        </div>

        {/* Action row */}
        <div className="flex items-center justify-between gap-3">
          <button
            className="h-[38px] px-4 rounded-[10px] font-['Inter'] font-medium text-[#1A1A1A] flex items-center gap-1.5"
            style={{ border: '1px solid #E5E7EB', fontSize: '13px' }}
            onClick={(e) => { e.stopPropagation(); navigate(`/shifts/${shift.docId}`); }}
          >
            <FileText className="w-3.5 h-3.5 text-[#6B7280]" strokeWidth={2} />
            View Report
          </button>
          <button
            className="font-['Inter'] font-medium text-[#1F6F43]"
            style={{ fontSize: '13px' }}
            onClick={(e) => { e.stopPropagation(); navigate(`/shifts/${shift.docId}`); }}
          >
            View Details &gt;
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── MyShifts page ─────────────────────────────────────────────────── */
export function MyShifts() {
  const navigate   = useSafeNavigate();
  const { user }   = useAppContext();
  const { shifts, loading } = useUserShifts(user?.userId);
  const [activeTab, setActiveTab] = useState<'Upcoming' | 'In Progress' | 'Completed' | 'All'>('Upcoming');

  /* Filter by tab */
  const filteredShifts = shifts.filter((s) => {
    const status = getShiftUIStatus(s);
    if (activeTab === 'Upcoming')     return status === 'assigned' || status === 'confirmed';
    if (activeTab === 'In Progress')  return status === 'in-progress';
    if (activeTab === 'Completed')    return status === 'completed';
    return true; // All
  });

  /* Group by date */
  const grouped = filteredShifts.reduce<Record<string, Shift[]>>((acc, s) => {
    const iso = getShiftISO(s);
    if (!acc[iso]) acc[iso] = [];
    acc[iso].push(s);
    return acc;
  }, {});

  const sortedDates = Object.keys(grouped).sort((a, b) =>
    activeTab === 'Completed' ? b.localeCompare(a) : a.localeCompare(b)
  );

  // Sort shifts within each date group by startTime
  sortedDates.forEach((d) => {
    grouped[d].sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
  });

  /* Summary badge text */
  const summaryText = (() => {
    if (loading) return '';
    if (activeTab === 'Completed') {
      const totalMins = filteredShifts.reduce((s, sh) => s + calcDurationMins(sh.startTime, sh.endTime), 0);
      const hrs = Math.round(totalMins / 60);
      return `Completed: ${filteredShifts.length} shift${filteredShifts.length !== 1 ? 's' : ''} · ${hrs} hrs`;
    }
    const today = todayISO();
    const todayShifts = filteredShifts.filter((s) => getShiftISO(s) === today);
    const todayMins = todayShifts.reduce((s, sh) => s + calcDurationMins(sh.startTime, sh.endTime), 0);
    return `Today: ${todayShifts.length} shift${todayShifts.length !== 1 ? 's' : ''} · ${Math.round(todayMins / 60)} hrs`;
  })();

  return (
    <div className="px-5 relative">
      {/* Header */}
      <header className="h-14 flex items-center justify-between mb-5 pt-4">
        <button
          onClick={() => navigate('/')}
          className="w-10 h-10 flex items-center justify-center -ml-2"
        >
          <ArrowLeft className="w-6 h-6 text-[#1A1A1A]" strokeWidth={2} />
        </button>

        <div className="flex-1 text-center">
          <h1 className="font-['Poppins'] font-semibold text-[#1A1A1A]" style={{ fontSize: '18px' }}>
            My Shifts
          </h1>
          <div className="font-['Inter'] text-[#9CA3AF]" style={{ fontSize: '12px' }}>
            {user?.name || 'Staff'} | {user?.role || 'Staff'}
          </div>
        </div>

        <button className="w-10 h-10 rounded-full bg-[#F3F4F6] flex items-center justify-center hover:bg-[#E5E7EB] transition-colors">
          <SlidersHorizontal className="w-6 h-6 text-[#6B7280]" strokeWidth={2} />
        </button>
      </header>

      {/* Filter Tabs */}
      <div
        className="flex gap-2 overflow-x-auto pb-3 mb-3 -mx-5 px-5"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {(['Upcoming', 'In Progress', 'Completed', 'All'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-full font-['Inter'] whitespace-nowrap flex-shrink-0 transition-colors ${
              activeTab === tab
                ? 'bg-[#1F6F43] text-white font-semibold'
                : 'bg-[#F3F4F6] text-[#6B7280] font-medium hover:bg-[#E5E7EB]'
            }`}
            style={{ fontSize: '13px', minHeight: '36px' }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Count label */}
      <div className="font-['Inter'] text-[#9CA3AF] mb-4" style={{ fontSize: '13px' }}>
        {loading ? 'Loading shifts…' : `${filteredShifts.length} ${activeTab.toLowerCase()} shift${filteredShifts.length !== 1 ? 's' : ''}`}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-7 h-7 text-[#1F6F43] animate-spin" />
        </div>
      ) : filteredShifts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-14 h-14 rounded-full bg-[#F3F4F6] flex items-center justify-center mb-4">
            <Clock className="w-7 h-7 text-[#D1D5DB]" strokeWidth={1.5} />
          </div>
          <p className="font-['Poppins'] font-semibold text-[#1A1A1A] mb-1" style={{ fontSize: '16px' }}>
            No {activeTab.toLowerCase()} shifts
          </p>
          <p className="font-['Inter'] text-[#9CA3AF]" style={{ fontSize: '14px' }}>
            {activeTab === 'Upcoming' ? "You're all caught up!" : 'Nothing here yet.'}
          </p>
        </div>
      ) : (
        <div>
          {sortedDates.map((isoDate, idx) => (
            <div key={isoDate}>
              <div className={`flex items-center gap-2 mb-3 ${idx > 0 ? 'mt-6' : ''}`}>
                <h2 className="font-['Poppins'] font-semibold text-[#1A1A1A]" style={{ fontSize: '14px' }}>
                  {getDateGroupLabel(isoDate)}
                </h2>
                {isoDate === todayISO() && (
                  <div className="w-1.5 h-1.5 bg-[#22C55E] rounded-full" />
                )}
              </div>
              {grouped[isoDate].map((shift) =>
                activeTab === 'Completed' ? (
                  <CompletedShiftCard key={shift.docId} shift={shift} />
                ) : (
                  <ShiftCard key={shift.docId} shift={shift} />
                )
              )}
            </div>
          ))}
        </div>
      )}

      {/* Floating summary badge */}
      {!loading && filteredShifts.length > 0 && (
        <div className="fixed bottom-[92px] left-1/2 -translate-x-1/2 max-w-[390px] z-10">
          <div
            className="bg-[#1F6F43] text-white px-4 py-2 rounded-full font-['Inter'] font-medium"
            style={{ fontSize: '12px', boxShadow: '0 4px 12px rgba(31,111,67,0.2)' }}
          >
            {summaryText}
          </div>
        </div>
      )}
    </div>
  );
}
