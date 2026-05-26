import {
  ArrowLeft,
  MoreVertical,
  CheckCircle2,
  Lock,
  Download,
  AlertTriangle,
  CreditCard,
  Check,
  FileText,
  CircleCheck,
  Pill,
  Car,
  ChevronRight,
  Clock,
  Loader2,
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router';
import { useState, useRef } from 'react';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';
import { ConfirmShiftDialog } from '../components/ConfirmShiftDialog';
import { useAppContext } from '../../context/AppContext';
import { useSingleShift, getShiftUIStatus, formatTime, formatDisplayDate, clockTimeDisplay, clockElapsed } from '../../hooks/useUserShifts';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';

const MINI_MAP_IMG =
  'https://images.unsplash.com/photo-1567612365380-46b90f9bf281?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzdHJlZXQlMjBtYXAlMjBzYXRlbGxpdGUlMjB2aWV3JTIwbmVpZ2hib3Job29kfGVufDB8fHx8MTc3MzU1NTI5NXww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral';

/* ─── Helpers ──────────────────────────────────────────────────────── */

function getInitials(name?: string): string {
  if (!name) return '?';
  return name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
}

/** "HH:MM" → human duration label "4 hrs" */
function calcDurationLabel(startTime?: string, endTime?: string): string {
  if (!startTime || !endTime) return '';
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  if (isNaN(sh) || isNaN(eh)) return '';
  const mins = eh * 60 + em - (sh * 60 + sm);
  if (mins <= 0) return '';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (m === 0) return `${h} hour${h !== 1 ? 's' : ''}`;
  return `${h}h ${m}m`;
}

/** Minutes until a "HH:MM" start time (negative = started already) */
function minutesUntilStart(startTime?: string): number | null {
  if (!startTime) return null;
  const [h, m] = startTime.split(':').map(Number);
  if (isNaN(h)) return null;
  const now = new Date();
  return h * 60 + m - (now.getHours() * 60 + now.getMinutes());
}

/** Minutes since a clock-in value — handles Timestamp, "HH:MM", or "h:mm AM/PM" */
function minutesSince(val: unknown): string {
  if (!val) return '';
  let refMs: number;
  if (typeof val === 'object' && val !== null && 'seconds' in (val as object)) {
    refMs = (val as { seconds: number }).seconds * 1000;
  } else {
    const s = String(val).trim();
    if (/^\d{1,2}:\d{2}$/.test(s)) {
      const [h, m] = s.split(':').map(Number);
      const d = new Date(); d.setHours(h, m, 0, 0); refMs = d.getTime();
    } else if (/^\d+:\d+\s*(AM|PM)$/i.test(s)) {
      refMs = new Date(`${new Date().toDateString()} ${s}`).getTime();
    } else { return ''; }
  }
  const elapsed = Math.round((Date.now() - refMs) / 60000);
  if (elapsed < 0) return '';
  const eh = Math.floor(elapsed / 60);
  const em = elapsed % 60;
  return `${eh}h ${String(em).padStart(2, '0')}m elapsed`;
}

function getCharColor(len: number): string {
  if (len >= 1000) return '#1F6F43';
  if (len >= 500)  return '#F59E0B';
  return '#DC2626';
}

function getProgressPercent(len: number): number {
  return Math.min(100, Math.round((len / 1000) * 100));
}

/* ─── Component ────────────────────────────────────────────────────── */
export function ShiftDetail() {
  const navigate          = useNavigate();
  const { id: shiftDocId } = useParams<{ id: string }>();
  const { user }          = useAppContext();
  const { shift, loading } = useSingleShift(shiftDocId);

  const [shiftLocked,    setShiftLocked]    = useState(false);
  const [reportText,     setReportText]     = useState('');
  const [autoSaveText,   setAutoSaveText]   = useState('Auto-saved 30 sec ago');
  const [showConfirmDlg, setShowConfirmDlg] = useState(false);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  /* Derive status from real Firestore fields */
  const uiStatus   = shift ? getShiftUIStatus(shift) : 'assigned';
  // Map hook's 'confirmed' → local 'upcoming' (same as original naming)
  const shiftStatus: 'assigned' | 'upcoming' | 'in-progress' | 'completed' =
    uiStatus === 'confirmed' ? 'upcoming' : uiStatus as 'assigned' | 'in-progress' | 'completed';

  /* Display values */
  const clientName   = shift?.clientName  || 'Client';
  const staffName    = user?.name          || 'Staff';
  const serviceType  = String(shift?.typeName || shift?.categoryName || 'Respite Care');
  const location     = shift?.address      || '';
  const timeRange    = [formatTime(shift?.startTime ?? ''), formatTime(shift?.endTime ?? '')].filter(Boolean).join(' – ');
  const durationLabel = calcDurationLabel(shift?.startTime, shift?.endTime);
  const dateDisplay  = shift?.dateKey_iso ? formatDisplayDate(String(shift.dateKey_iso)) : 'Today';

  // Support both current Timestamp format and legacy string format
  const rawClockIn  = shift?.clockIn  || (shift as Record<string, unknown>)?.clockInDate;
  const rawClockOut = shift?.clockOut || (shift as Record<string, unknown>)?.clockOutDate;
  const clockInDisplay  = rawClockIn  ? clockTimeDisplay(rawClockIn)  : null;
  const clockOutDisplay = rawClockOut ? clockTimeDisplay(rawClockOut) : null;
  const elapsedDisplay  = (rawClockIn && rawClockOut) ? clockElapsed(rawClockIn, rawClockOut) : null;
  const liveElapsed = minutesSince(rawClockIn);

  const minsUntil = minutesUntilStart(shift?.startTime);
  const startsInLabel = minsUntil !== null && minsUntil > 0
    ? `Starts in ${minsUntil < 60 ? `${minsUntil} min` : `${Math.round(minsUntil / 60)}h`}`
    : null;

  /* Write confirm to Firestore */
  const handleConfirmShift = async () => {
    if (!shiftDocId) return;
    await updateDoc(doc(db, 'shifts', shiftDocId), { shiftConfirmed: true });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 text-[#1F6F43] animate-spin" />
      </div>
    );
  }

  if (!shift) {
    return (
      <div className="px-5 py-20 text-center">
        <p className="font-['Inter'] text-[#9CA3AF]">Shift not found.</p>
        <button onClick={() => navigate('/shifts')} className="mt-4 font-['Inter'] font-medium text-[#1F6F43]">
          ← Back to shifts
        </button>
      </div>
    );
  }

  return (
    <div className="px-5 pb-6">
      {/* Header */}
      <header className="h-14 flex items-center justify-between mb-4 pt-4">
        <button
          onClick={() => navigate('/shifts')}
          className="w-10 h-10 flex items-center justify-center -ml-2"
        >
          <ArrowLeft className="w-6 h-6 text-[#1A1A1A]" strokeWidth={2} />
        </button>

        <div className="flex-1 text-center">
          <h1 className="font-['Poppins'] font-semibold text-[#1A1A1A]" style={{ fontSize: '18px' }}>
            Shift Details
          </h1>
          <div className="font-['Inter'] text-[#9CA3AF]" style={{ fontSize: '12px' }}>
            {dateDisplay}
          </div>
        </div>

        <button className="w-10 h-10 flex items-center justify-center">
          <MoreVertical className="w-6 h-6 text-[#6B7280]" strokeWidth={2} />
        </button>
      </header>

      {/* Shift Status Banner */}
      {shiftStatus === 'assigned' && (
        <div className="rounded-xl p-3 px-4 mb-5 flex items-center gap-3" style={{ backgroundColor: '#FFF8E1' }}>
          <Clock className="w-5 h-5 text-[#92600A] flex-shrink-0" strokeWidth={2} />
          <span className="font-['Inter'] font-semibold text-[#92600A]" style={{ fontSize: '13px' }}>
            Assigned · Awaiting Your Confirmation
          </span>
        </div>
      )}
      {shiftStatus === 'upcoming' && (
        <div className="rounded-xl p-3 px-4 mb-5 flex items-center justify-between" style={{ backgroundColor: '#F0FDF4' }}>
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-[#1F6F43] flex-shrink-0" strokeWidth={2} />
            <span className="font-['Inter'] font-semibold text-[#1F6F43]" style={{ fontSize: '13px' }}>
              Confirmed · Upcoming
            </span>
          </div>
          {startsInLabel && (
            <span className="font-['Inter'] font-medium text-[#1F6F43]" style={{ fontSize: '12px' }}>
              {startsInLabel}
            </span>
          )}
        </div>
      )}
      {shiftStatus === 'in-progress' && (
        <div className="rounded-xl p-3 px-4 mb-5 flex items-center gap-3" style={{ backgroundColor: '#EBF5FF' }}>
          <div className="w-2.5 h-2.5 rounded-full bg-[#1E5FA6] animate-pulse" />
          <span className="font-['Inter'] font-semibold text-[#1E5FA6]" style={{ fontSize: '13px' }}>
            In Progress{liveElapsed ? ` · ${liveElapsed}` : ''}
          </span>
        </div>
      )}
      {shiftStatus === 'completed' && (
        <div className="rounded-xl p-3 px-4 mb-5 flex items-center gap-3" style={{ backgroundColor: '#F3F4F6' }}>
          <CheckCircle2 className="w-5 h-5 text-[#6B7280] flex-shrink-0" strokeWidth={2} />
          <span className="font-['Inter'] font-semibold text-[#6B7280]" style={{ fontSize: '13px' }}>
            Completed
          </span>
        </div>
      )}

      {/* Client–Staff Pairing Card */}
      <div className="bg-white rounded-2xl p-5 mb-4" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        <div className="flex items-start justify-between mb-3">
          {/* Client */}
          <button
            onClick={() => shift.clientId && navigate(`/clients/${shift.clientId}`)}
            className="flex flex-col items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center font-['Inter'] font-semibold"
              style={{ backgroundColor: '#F0FDF4', color: '#1F6F43', fontSize: '16px' }}
            >
              {getInitials(clientName)}
            </div>
            <div className="text-center">
              <div className="font-['Inter'] font-semibold text-[#1A1A1A]" style={{ fontSize: '14px' }}>
                {clientName}
              </div>
              {shift.clientId && (
                <div className="font-['Inter'] text-[#9CA3AF]" style={{ fontSize: '12px' }}>
                  ID: {shift.clientId}
                </div>
              )}
            </div>
          </button>

          {/* Arrow */}
          <div className="flex items-center pt-5">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-[#D1D5DB]">
              <path d="M3 8H13M13 8L9 4M13 8L9 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>

          {/* Staff */}
          <div className="flex flex-col items-center gap-2">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center font-['Inter'] font-semibold"
              style={{ backgroundColor: '#F3F0FF', color: '#5B21B6', fontSize: '16px' }}
            >
              {getInitials(staffName)}
            </div>
            <div className="text-center">
              <div className="font-['Inter'] font-semibold text-[#1A1A1A]" style={{ fontSize: '14px' }}>
                {staffName}
              </div>
              {user?.role && (
                <div className="font-['Inter'] text-[#9CA3AF]" style={{ fontSize: '12px' }}>
                  {user.role}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Service badge */}
        <div className="flex justify-center">
          <div
            className="px-3.5 py-1 rounded-full font-['Inter'] font-semibold"
            style={{ backgroundColor: '#EBF5FF', color: '#1E5FA6', fontSize: '12px' }}
          >
            {serviceType}
          </div>
        </div>

        {/* ID card shortcut */}
        <div className="mt-3 pt-3 flex justify-center" style={{ borderTop: '1px solid #F3F4F6' }}>
          <button
            onClick={() => navigate('/profile/id-card')}
            className="flex items-center gap-1.5 active:opacity-70 transition-opacity"
          >
            <CreditCard className="w-4 h-4 text-[#1F6F43]" strokeWidth={2} />
            <span className="font-['Inter'] font-medium text-[#1F6F43]" style={{ fontSize: '13px' }}>
              Show ID Card to Parent
            </span>
          </button>
        </div>
      </div>

      {/* Shift Information Card */}
      <div className="bg-white rounded-2xl p-5 mb-4" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        <div className="flex items-center justify-between h-11 border-b border-[#F3F4F6]">
          <span className="font-['Inter'] text-[#9CA3AF]" style={{ fontSize: '13px' }}>SHIFT TYPE</span>
          <span className="font-['Inter'] font-medium text-[#1A1A1A]" style={{ fontSize: '14px' }}>
            {String(shift.description || 'Regular')}
          </span>
        </div>

        <div className="flex items-start justify-between py-3 border-b border-[#F3F4F6]">
          <span className="font-['Inter'] text-[#9CA3AF] pt-0.5" style={{ fontSize: '13px' }}>DATE &amp; TIME</span>
          <div className="text-right">
            <div className="font-['Inter'] font-medium text-[#1A1A1A]" style={{ fontSize: '14px' }}>
              {dateDisplay}
            </div>
            <div className="font-['Inter'] text-[#9CA3AF]" style={{ fontSize: '12px' }}>
              {timeRange || '—'}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between h-11 border-b border-[#F3F4F6]">
          <span className="font-['Inter'] text-[#9CA3AF]" style={{ fontSize: '13px' }}>DURATION</span>
          <span className="font-['Inter'] font-medium text-[#1A1A1A]" style={{ fontSize: '14px' }}>
            {durationLabel || '—'}
          </span>
        </div>

        {location && (
          <div className="flex items-center justify-between h-11 border-b border-[#F3F4F6]">
            <span className="font-['Inter'] text-[#9CA3AF]" style={{ fontSize: '13px' }}>LOCATION</span>
            <button
              className="font-['Inter'] font-medium text-[#1F6F43] flex items-center gap-1 hover:underline"
              style={{ fontSize: '14px' }}
            >
              {location}
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-[#1F6F43]">
                <path d="M3 9L9 3M9 3H3.5M9 3V8.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        )}

        <div className="flex items-center justify-between h-11">
          <span className="font-['Inter'] text-[#9CA3AF]" style={{ fontSize: '13px' }}>STATUS</span>
          <div
            className="px-3 py-1 rounded-full font-['Inter'] font-semibold"
            style={{
              backgroundColor:
                shiftStatus === 'assigned'    ? '#FFF8E1' :
                shiftStatus === 'upcoming'    ? '#F0FDF4' :
                shiftStatus === 'in-progress' ? '#EBF5FF' : '#F3F4F6',
              color:
                shiftStatus === 'assigned'    ? '#92600A' :
                shiftStatus === 'upcoming'    ? '#1F6F43' :
                shiftStatus === 'in-progress' ? '#1E5FA6' : '#6B7280',
              fontSize: '12px',
            }}
          >
            {shiftStatus === 'assigned'    ? 'Assigned' :
             shiftStatus === 'upcoming'    ? 'Active · Confirmed' :
             shiftStatus === 'in-progress' ? 'In Progress' : 'Completed'}
          </div>
        </div>

        {/* Shift Lock Toggle */}
        <div className="pt-3 mt-3 border-t border-[#F3F4F6]">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-[#6B7280]" strokeWidth={2} />
              <span className="font-['Inter'] font-medium text-[#1A1A1A]" style={{ fontSize: '14px' }}>
                Shift Lock
              </span>
            </div>
            <button
              onClick={() => setShiftLocked(!shiftLocked)}
              className="relative w-12 h-7 rounded-full transition-colors"
              style={{ backgroundColor: shiftLocked ? '#1F6F43' : '#E5E7EB' }}
            >
              <div
                className="absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform"
                style={{ transform: shiftLocked ? 'translateX(20px)' : 'translateX(0)' }}
              />
            </button>
          </div>
          <p className="font-['Inter'] text-[#9CA3AF]" style={{ fontSize: '11px' }}>
            Prevents accidental modifications
          </p>
        </div>
      </div>

      {/* Shift Timeline Card */}
      <div className="bg-white rounded-2xl p-5 mb-6" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        <h3 className="font-['Poppins'] font-semibold text-[#1A1A1A] mb-4" style={{ fontSize: '14px' }}>
          Shift Timeline
        </h3>

        <div className="relative pl-9">
          {/* Vertical line */}
          <div
            className="absolute left-3 top-0 w-0.5"
            style={{
              height: 'calc(100% - 24px)',
              backgroundColor: (shiftStatus === 'upcoming' || shiftStatus === 'assigned') ? '#D1D5DB' : '#1F6F43',
            }}
          />

          <div className="space-y-6">
            {/* Clock In Node */}
            <div className="relative">
              {(shiftStatus !== 'upcoming' && shiftStatus !== 'assigned') ? (
                <div className="absolute -left-9 top-0 w-6 h-6 rounded-full bg-[#1F6F43] flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" strokeWidth={3} />
                </div>
              ) : (
                <div className="absolute -left-9 top-0 w-6 h-6 rounded-full border-2 border-[#D1D5DB] bg-white" />
              )}
              <div>
                <div className="font-['Inter'] font-semibold text-[#1A1A1A]" style={{ fontSize: '14px' }}>
                  Clock In
                </div>
                {(shiftStatus !== 'upcoming' && shiftStatus !== 'assigned') ? (
                  <>
                    <div className="font-['Inter'] font-medium text-[#1F6F43]" style={{ fontSize: '13px' }}>
                      {clockInDisplay || '—'}
                    </div>
                    {location && (
                      <div className="font-['Inter'] text-[#6B7280]" style={{ fontSize: '12px' }}>{location}</div>
                    )}
                    {/* Mini map */}
                    <div className="mt-2 rounded-lg overflow-hidden" style={{ width: '200px', height: '70px', border: '0.5px solid #E5E7EB' }}>
                      <div className="relative w-full h-full">
                        <ImageWithFallback src={MINI_MAP_IMG} alt="Check-in location" className="w-full h-full object-cover" />
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full">
                          <div className="w-4 h-4 rounded-full bg-[#1F6F43] flex items-center justify-center" style={{ boxShadow: '0 1px 4px rgba(31,111,67,0.4)' }}>
                            <div className="w-1.5 h-1.5 rounded-full bg-white" />
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                      <Check className="w-3 h-3 text-[#1F6F43]" strokeWidth={3} />
                      <span className="font-['Inter'] text-[#1F6F43]" style={{ fontSize: '10px' }}>Location verified</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="font-['Inter'] text-[#9CA3AF]" style={{ fontSize: '12px' }}>
                      Scheduled: {formatTime(shift.startTime ?? '') || '—'}
                    </div>
                    {location && (
                      <div className="font-['Inter'] text-[#9CA3AF]" style={{ fontSize: '12px' }}>{location}</div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Shift Report Node */}
            <div className="relative">
              {(shiftStatus === 'upcoming' || shiftStatus === 'assigned') ? (
                <div className="absolute -left-9 top-0 w-6 h-6 rounded-full border-2 border-[#D1D5DB] bg-white" />
              ) : shiftStatus === 'in-progress' ? (
                <div className="absolute -left-9 top-0 w-6 h-6 rounded-full bg-[#EBF5FF] flex items-center justify-center">
                  <FileText className="w-3 h-3 text-[#1E5FA6]" strokeWidth={2.5} />
                </div>
              ) : (
                <div className="absolute -left-9 top-0 w-6 h-6 rounded-full bg-[#1F6F43] flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" strokeWidth={3} />
                </div>
              )}
              <div>
                <div className="font-['Inter'] font-semibold text-[#1A1A1A]" style={{ fontSize: '14px' }}>Shift Report</div>
                {(shiftStatus === 'upcoming' || shiftStatus === 'assigned') ? (
                  <div className="font-['Inter'] text-[#9CA3AF]" style={{ fontSize: '12px' }}>No report yet</div>
                ) : shiftStatus === 'in-progress' ? (
                  <>
                    <div className="font-['Inter'] font-medium text-[#1E5FA6]" style={{ fontSize: '13px' }}>Report in progress</div>
                    <div className="font-['Inter'] text-[#9CA3AF]" style={{ fontSize: '12px' }}>
                      {reportText.length} characters
                    </div>
                  </>
                ) : (
                  <>
                    <div className="font-['Inter'] font-medium text-[#1F6F43]" style={{ fontSize: '13px' }}>Report completed</div>
                    {reportText.length > 0 && (
                      <div className="font-['Inter'] text-[#9CA3AF]" style={{ fontSize: '12px' }}>
                        {reportText.length} characters
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* In Progress Node */}
            <div className="relative">
              {shiftStatus === 'in-progress' ? (
                <div className="absolute -left-9 top-0 w-6 h-6 rounded-full bg-[#EBF5FF] border-2 border-[#1E5FA6] flex items-center justify-center">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#1E5FA6] animate-pulse" />
                </div>
              ) : shiftStatus === 'completed' ? (
                <div className="absolute -left-9 top-0 w-6 h-6 rounded-full bg-[#1F6F43] flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" strokeWidth={3} />
                </div>
              ) : (
                <div className="absolute -left-9 top-0 w-6 h-6 rounded-full border-2 border-[#D1D5DB] bg-white" />
              )}
              <div>
                <div className="font-['Inter'] font-semibold text-[#1A1A1A]" style={{ fontSize: '14px' }}>In Progress</div>
                {shiftStatus === 'in-progress' ? (
                  <div className="font-['Inter'] text-[#1E5FA6]" style={{ fontSize: '12px' }}>
                    Currently on shift{liveElapsed ? ` · ${liveElapsed}` : ''}
                  </div>
                ) : shiftStatus === 'completed' ? (
                  <div className="font-['Inter'] text-[#6B7280]" style={{ fontSize: '12px' }}>
                    {elapsedDisplay ? `${elapsedDisplay} total` : durationLabel}
                  </div>
                ) : (
                  <div className="font-['Inter'] text-[#9CA3AF]" style={{ fontSize: '12px' }}>—</div>
                )}
              </div>
            </div>

            {/* Clock Out Node */}
            <div className="relative">
              {shiftStatus === 'completed' ? (
                <div className="absolute -left-9 top-0 w-6 h-6 rounded-full bg-[#1F6F43] flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" strokeWidth={3} />
                </div>
              ) : (
                <div className="absolute -left-9 top-0 w-6 h-6 rounded-full border-2 border-[#D1D5DB] bg-white" />
              )}
              <div>
                <div className="font-['Inter'] font-semibold text-[#1A1A1A]" style={{ fontSize: '14px' }}>Clock Out</div>
                {shiftStatus === 'completed' ? (
                  <>
                    <div className="font-['Inter'] font-medium text-[#1F6F43]" style={{ fontSize: '13px' }}>
                      {clockOutDisplay || '—'}
                    </div>
                    {location && (
                      <div className="font-['Inter'] text-[#6B7280]" style={{ fontSize: '12px' }}>{location}</div>
                    )}
                    <div className="mt-2 rounded-lg overflow-hidden" style={{ width: '200px', height: '70px', border: '0.5px solid #E5E7EB' }}>
                      <div className="relative w-full h-full">
                        <ImageWithFallback src={MINI_MAP_IMG} alt="Check-out location" className="w-full h-full object-cover" />
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full">
                          <div className="w-4 h-4 rounded-full bg-[#1F6F43] flex items-center justify-center" style={{ boxShadow: '0 1px 4px rgba(31,111,67,0.4)' }}>
                            <div className="w-1.5 h-1.5 rounded-full bg-white" />
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                      <Check className="w-3 h-3 text-[#1F6F43]" strokeWidth={3} />
                      <span className="font-['Inter'] text-[#1F6F43]" style={{ fontSize: '10px' }}>Location verified</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="font-['Inter'] text-[#9CA3AF]" style={{ fontSize: '12px' }}>
                      Scheduled: {formatTime(shift.endTime ?? '') || '—'}
                    </div>
                    <div className="font-['Inter'] text-[#9CA3AF]" style={{ fontSize: '12px' }}>—</div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Total hours footer */}
          <div className="flex flex-col mt-6 pt-4 border-t border-[#F3F4F6]">
            <div className="flex items-center justify-between">
              <span className="font-['Inter'] font-medium text-[#6B7280]" style={{ fontSize: '14px' }}>Total Hours:</span>
              <span className="font-['Inter'] font-semibold text-[#1F6F43]" style={{ fontSize: '14px' }}>
                {shiftStatus === 'completed' && elapsedDisplay ? elapsedDisplay : (durationLabel || '—')}
              </span>
            </div>
            {shiftStatus === 'completed' && elapsedDisplay && durationLabel && (
              <div className="font-['Inter'] text-[#9CA3AF] text-right mt-0.5" style={{ fontSize: '11px' }}>
                Scheduled: {durationLabel}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Daily Shift Report Card */}
      <div
        className="bg-white rounded-2xl p-5 mb-4 relative"
        style={{
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          opacity: (shiftStatus === 'upcoming' || shiftStatus === 'assigned') ? 0.5 : 1,
        }}
      >
        {/* Locked overlay */}
        {(shiftStatus === 'upcoming' || shiftStatus === 'assigned') && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
            <Lock className="w-5 h-5 text-[#9CA3AF] mb-1.5" strokeWidth={2} />
            <span className="font-['Inter'] font-medium text-[#9CA3AF]" style={{ fontSize: '13px' }}>
              Report available after clock-in
            </span>
          </div>
        )}

        <div className="flex items-center justify-between mb-2">
          <h3 className="font-['Poppins'] font-semibold text-[#1A1A1A]" style={{ fontSize: '14px' }}>
            Daily Shift Report
          </h3>
          {shiftStatus === 'in-progress' && (
            <div className="relative flex items-center justify-center" style={{ width: '24px', height: '24px' }}>
              <svg width="24" height="24" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" fill="none" stroke="#E5E7EB" strokeWidth="3" />
                <circle
                  cx="12" cy="12" r="10" fill="none" stroke="#1F6F43" strokeWidth="3"
                  strokeDasharray={`${(getProgressPercent(reportText.length) / 100) * 62.83} 62.83`}
                  strokeLinecap="round"
                  transform="rotate(-90 12 12)"
                />
              </svg>
              <span className="absolute font-['Inter'] font-semibold text-[#1F6F43]" style={{ fontSize: '7px' }}>
                {getProgressPercent(reportText.length)}%
              </span>
            </div>
          )}
          {shiftStatus === 'completed' && (
            <div className="flex items-center gap-1.5">
              <Check className="w-4 h-4 text-[#1F6F43]" strokeWidth={3} />
              <span className="px-2 py-0.5 rounded-full font-['Inter'] font-semibold" style={{ backgroundColor: '#F0FDF4', color: '#1F6F43', fontSize: '11px' }}>
                Submitted
              </span>
            </div>
          )}
        </div>

        {shiftStatus === 'in-progress' && (
          <>
            <p className="font-['Inter'] text-[#6B7280] mb-3" style={{ fontSize: '13px', lineHeight: '1.5' }}>
              Document activities, medications, meals, mood, interactions, health observations, and any concerns.
            </p>
            <textarea
              ref={textAreaRef}
              value={reportText}
              onChange={(e) => setReportText(e.target.value)}
              placeholder="Start documenting your shift observations..."
              className="w-full font-['Inter'] text-[#1A1A1A] placeholder-[#D1D5DB] resize-none outline-none"
              style={{ fontSize: '14px', minHeight: '160px', border: '1.5px solid #1F6F43', borderRadius: '12px', padding: '16px', backgroundColor: '#FFFFFF' }}
            />
            <div className="flex items-center justify-between mt-1.5">
              <span className="font-['Inter']" style={{ fontSize: '11px', color: getCharColor(reportText.length) }}>
                {reportText.length} / 1000 recommended minimum
              </span>
            </div>
            <div className="flex items-center gap-1 mt-1">
              <CircleCheck className="w-3 h-3 text-[#22C55E]" strokeWidth={2} />
              <span className="font-['Inter'] text-[#9CA3AF]" style={{ fontSize: '10px' }}>{autoSaveText}</span>
            </div>
            <div className="flex gap-2 mt-5">
              <button
                className="flex-1 flex items-center justify-center gap-1.5 rounded-[10px] font-['Inter'] font-medium text-[#1A1A1A]"
                style={{ height: '44px', fontSize: '13px', border: '1px solid #E5E7EB' }}
              >
                <Download className="w-4 h-4 text-[#6B7280]" strokeWidth={2} />
                Download Report
              </button>
              <button
                className="flex-1 rounded-[10px] font-['Inter'] font-semibold text-white bg-[#1F6F43]"
                style={{ height: '44px', fontSize: '13px' }}
                onClick={() => setAutoSaveText('Saved just now')}
              >
                Save Draft
              </button>
            </div>
          </>
        )}

        {shiftStatus === 'completed' && (
          <>
            <div className="font-['Inter'] text-[#374151] rounded-xl p-4 mb-2" style={{ fontSize: '14px', backgroundColor: '#F9FAFB', lineHeight: '1.6' }}>
              {reportText.length > 0 ? reportText : (
                <span className="text-[#9CA3AF] italic">No report submitted yet.</span>
              )}
            </div>
            <button
              className="flex items-center justify-center gap-1.5 rounded-[10px] font-['Inter'] font-medium text-[#1A1A1A] mt-3 w-full"
              style={{ height: '40px', fontSize: '13px', border: '1px solid #E5E7EB' }}
            >
              <Download className="w-4 h-4" strokeWidth={2} />
              Download Report
            </button>
          </>
        )}

        {(shiftStatus === 'upcoming' || shiftStatus === 'assigned') && (
          <div className="pointer-events-none">
            <p className="font-['Inter'] text-[#9CA3AF] mb-3" style={{ fontSize: '13px' }}>
              Document activities, medications, meals, mood, interactions...
            </p>
            <div className="w-full rounded-xl" style={{ minHeight: '80px', border: '1.5px solid #E5E7EB', backgroundColor: '#F9FAFB' }} />
          </div>
        )}
      </div>

      {/* Shift Actions */}
      <h3 className="font-['Poppins'] font-semibold text-[#1A1A1A] mt-6 mb-3" style={{ fontSize: '14px' }}>
        Shift Actions
      </h3>

      {/* Medications */}
      <button
        onClick={() => shiftStatus === 'in-progress' && navigate(`/shifts/${shiftDocId}/medications`)}
        className="w-full bg-white rounded-2xl p-5 mb-3 flex items-center gap-3.5 text-left transition-all active:scale-[0.98] active:bg-[#FAFAFA]"
        style={{
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          opacity: (shiftStatus === 'upcoming' || shiftStatus === 'assigned') ? 0.5 : 1,
          pointerEvents: (shiftStatus === 'upcoming' || shiftStatus === 'assigned') ? 'none' : 'auto',
        }}
      >
        <div className="flex-shrink-0 rounded-full flex items-center justify-center" style={{ width: '48px', height: '48px', backgroundColor: '#F0FDF4' }}>
          <Pill className="text-[#1F6F43]" style={{ width: '22px', height: '22px' }} strokeWidth={2} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-['Poppins'] font-semibold text-[#1A1A1A]" style={{ fontSize: '15px' }}>Medications</div>
          <div className="font-['Inter'] text-[#6B7280] mt-0.5" style={{ fontSize: '12px' }}>Log administered medications &amp; view schedule</div>
        </div>
        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
          <span className="px-2.5 py-0.5 rounded-xl font-['Inter'] font-semibold" style={{ fontSize: '11px', backgroundColor: shiftStatus === 'completed' ? '#F0FDF4' : '#FFF8E1', color: shiftStatus === 'completed' ? '#1F6F43' : '#92600A' }}>
            {shiftStatus === 'completed' ? 'All done' : '2 due'}
          </span>
          <ChevronRight className="w-4 h-4 text-[#D1D5DB]" strokeWidth={2} />
        </div>
      </button>

      {/* Transportations */}
      <button
        onClick={() => shiftStatus === 'in-progress' && navigate(`/shifts/${shiftDocId}/transportations`)}
        className="w-full bg-white rounded-2xl p-5 mb-3 flex items-center gap-3.5 text-left transition-all active:scale-[0.98] active:bg-[#FAFAFA]"
        style={{
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          opacity: (shiftStatus === 'upcoming' || shiftStatus === 'assigned') ? 0.5 : 1,
          pointerEvents: (shiftStatus === 'upcoming' || shiftStatus === 'assigned') ? 'none' : 'auto',
        }}
      >
        <div className="flex-shrink-0 rounded-full flex items-center justify-center" style={{ width: '48px', height: '48px', backgroundColor: '#EBF5FF' }}>
          <Car className="text-[#1E5FA6]" style={{ width: '22px', height: '22px' }} strokeWidth={2} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-['Poppins'] font-semibold text-[#1A1A1A]" style={{ fontSize: '15px' }}>Transportations</div>
          <div className="font-['Inter'] text-[#6B7280] mt-0.5" style={{ fontSize: '12px' }}>Log kilometers, routes &amp; upload receipts</div>
        </div>
        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
          <span className="px-2.5 py-0.5 rounded-xl font-['Inter'] font-semibold" style={{ fontSize: '11px', backgroundColor: shiftStatus === 'completed' ? '#F0FDF4' : '#FFF8E1', color: shiftStatus === 'completed' ? '#1F6F43' : '#92600A' }}>
            {shiftStatus === 'completed' ? 'Submitted' : 'Incomplete'}
          </span>
          <ChevronRight className="w-4 h-4 text-[#D1D5DB]" strokeWidth={2} />
        </div>
      </button>

      {/* Other Actions (in-progress / completed only) */}
      {(shiftStatus === 'in-progress' || shiftStatus === 'completed') && (
        <>
          <h3 className="font-['Poppins'] font-semibold text-[#1A1A1A] mt-4 mb-3" style={{ fontSize: '14px' }}>
            Other Actions
          </h3>

          <div className="bg-white rounded-2xl p-5 mb-3" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)', borderLeft: '4px solid #DC2626' }}>
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-[#DC2626]" strokeWidth={2} />
              <span className="font-['Inter'] font-semibold text-[#1A1A1A]" style={{ fontSize: '15px' }}>Critical Incident Reporting</span>
            </div>
            <p className="font-['Inter'] text-[#6B7280] mb-2" style={{ fontSize: '13px' }}>For serious incident requiring immediate management attention</p>
            <p className="font-['Inter'] italic text-[#DC2626] mb-4" style={{ fontSize: '12px' }}>Self-harm, violence, abuse allegations, serious accidents, medication errors..</p>
            <button className="w-full rounded-[10px] font-['Inter'] font-semibold text-white bg-[#DC2626]" style={{ height: '44px', fontSize: '14px' }}>
              Report Critical Incident
            </button>
          </div>

          <div className="bg-white rounded-2xl p-5 mb-4" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)', borderLeft: '4px solid #1E5FA6' }}>
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-5 h-5 text-[#1E5FA6]" strokeWidth={2} />
              <span className="font-['Inter'] font-semibold text-[#1A1A1A]" style={{ fontSize: '15px' }}>Medical Contact Log</span>
            </div>
            <p className="font-['Inter'] text-[#6B7280] mb-4" style={{ fontSize: '13px' }}>Record any medical contacts or health-related communications during your shift</p>
            <button className="w-full rounded-[10px] font-['Inter'] font-semibold text-white bg-[#1E5FA6]" style={{ height: '44px', fontSize: '14px' }}>
              Log Medical Contact
            </button>
          </div>
        </>
      )}

      {/* Primary Action Button */}
      {shiftStatus === 'assigned' && (
        <>
          <button
            onClick={() => setShowConfirmDlg(true)}
            className="w-full h-13 rounded-[14px] font-['Poppins'] font-semibold mb-2 transition-colors active:bg-[#F0FDF4]"
            style={{ fontSize: '16px', color: '#1F6F43', backgroundColor: 'white', border: '1.5px solid #1F6F43', height: '52px' }}
          >
            Confirm Shift
          </button>
          <p className="text-center font-['Inter'] text-[#9CA3AF] mb-6" style={{ fontSize: '12px' }}>
            Confirm to let the owner know you'll attend
          </p>
        </>
      )}

      {shiftStatus === 'upcoming' && (
        <>
          <button
            onClick={() => navigate(`/shifts/${shiftDocId}/clock-in`)}
            className="w-full bg-[#1F6F43] text-white rounded-[14px] font-['Poppins'] font-semibold mb-2 hover:bg-[#1a5e38] transition-colors"
            style={{ fontSize: '16px', height: '52px', boxShadow: '0 4px 12px rgba(31,111,67,0.2)' }}
          >
            Clock In
          </button>
          <p className="text-center font-['Inter'] text-[#9CA3AF] mb-6" style={{ fontSize: '12px' }}>
            You can clock in 15 minutes before shift start
          </p>
        </>
      )}

      {shiftStatus === 'in-progress' && (
        <>
          <button
            onClick={() => navigate(`/shifts/${shiftDocId}/clock-out`)}
            className="w-full rounded-[14px] font-['Poppins'] font-semibold mb-2 transition-colors"
            style={{ fontSize: '16px', height: '52px', color: '#1F6F43', backgroundColor: 'white', border: '2px solid #1F6F43' }}
          >
            Clock Out
          </button>
          <p className="text-center font-['Inter'] text-[#9CA3AF] mb-6" style={{ fontSize: '12px' }}>
            End your shift and record your clock-out time
          </p>
        </>
      )}

      {shiftStatus === 'completed' && (
        <div className="flex items-center justify-center gap-2 rounded-xl p-3 px-4 mb-6" style={{ backgroundColor: '#F0FDF4' }}>
          <CheckCircle2 className="w-5 h-5 text-[#1F6F43]" strokeWidth={2} />
          <span className="font-['Inter'] font-semibold text-[#1F6F43]" style={{ fontSize: '14px' }}>Shift Completed</span>
        </div>
      )}

      {/* Confirm Dialog */}
      <ConfirmShiftDialog
        open={showConfirmDlg}
        onClose={() => setShowConfirmDlg(false)}
        onConfirmed={handleConfirmShift}
        shiftDocId={shiftDocId}
        serviceType={serviceType}
        clientName={clientName}
        date={dateDisplay}
        timeRange={timeRange}
        location={location}
      />
    </div>
  );
}
