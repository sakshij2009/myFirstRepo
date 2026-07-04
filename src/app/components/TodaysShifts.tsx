import { ChevronRight, MapPin, Clock, CheckCircle2, Check, Navigation, Building2, Flag, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useSafeNavigate } from '../hooks/useSafeNavigate';
import { ConfirmShiftDialog } from './ConfirmShiftDialog';
import { useAppContext } from '../../context/AppContext';
import { useTodayShifts, useSingleShift, getShiftUIStatus, formatTime, type Shift } from '../../hooks/useUserShifts';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';

/* ─── Service type styles ─────────────────────────────────────────── */
const serviceTypeStyles: Record<string, { bg: string; text: string }> = {
  'Respite Care':          { bg: '#EBF5FF', text: '#1E5FA6' },
  'Emergency Care':        { bg: '#FEF2F2', text: '#B91C1C' },
  'Supervised Visitation': { bg: '#F3F0FF', text: '#5B21B6' },
  'Transportation':        { bg: '#FFF8E1', text: '#92600A' },
  'default':               { bg: '#F3F4F6', text: '#374151' },
};

function getServiceStyle(typeName: string) {
  return serviceTypeStyles[typeName] || serviceTypeStyles['default'];
}

/* ─── Generic shift card ──────────────────────────────────────────── */
function ShiftCard({ shift: seedShift }: { shift: Shift }) {
  const navigate = useSafeNavigate();
  const [showDialog, setShowDialog] = useState(false);

  // Subscribe directly to this document so status updates (confirm/clock-in/out)
  // are reflected instantly without depending on the list query re-firing.
  const { shift: live } = useSingleShift(seedShift.docId);
  const shift = live ?? seedShift;

  const uiStatus = getShiftUIStatus(shift);
  const style = getServiceStyle(shift.typeName || '');
  const clientName = shift.clientName || 'Unknown Client';
  const initials = clientName.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
  const timeRange = `${formatTime(shift.startTime || '')} – ${formatTime(shift.endTime || '')}`;
  const location = shift.address
    || (shift.clientDetails as any)?.address
    || (shift.shiftPoints?.[0]?.pickupLocation)
    || '—';

  const handleConfirmed = async () => {
    try {
      await updateDoc(doc(db, 'dev_shifts', shift.docId), { shiftConfirmed: true });
    } catch (e) {
      console.error('Failed to confirm shift:', e);
    }
  };

  return (
    <>
      <div
        className="bg-white overflow-hidden"
        style={{ borderRadius: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
      >
        {/* Amber banner for unconfirmed */}
        {uiStatus === 'assigned' && (
          <div className="flex items-center gap-2" style={{ padding: '12px 16px', backgroundColor: '#FFF8E1', borderRadius: '16px 16px 0 0' }}>
            <Clock className="w-4 h-4 text-[#92600A] flex-shrink-0" strokeWidth={2} />
            <span className="font-['Inter'] font-semibold text-[#92600A]" style={{ fontSize: '12px' }}>Confirmation required</span>
          </div>
        )}

        <div className="p-5">
          {/* Top row */}
          <div className="flex items-center justify-between mb-4">
            <div className="px-3 py-1 rounded-full font-['Inter'] font-semibold" style={{ backgroundColor: style.bg, color: style.text, fontSize: '11px' }}>
              {shift.typeName || 'Shift'}
            </div>
            <span className="font-['Inter'] font-medium text-[#6B7280]" style={{ fontSize: '13px' }}>{timeRange}</span>
          </div>

          {/* Client info */}
          <div className="mb-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="relative">
                <div className="w-11 h-11 rounded-full flex items-center justify-center font-['Inter'] font-semibold" style={{ backgroundColor: '#F3F4F6', color: '#6B7280', fontSize: '14px' }}>
                  {initials}
                </div>
                {uiStatus !== 'completed' && (
                  <div className="absolute bottom-0 right-0 w-2 h-2 bg-[#22C55E] border-2 border-white rounded-full" />
                )}
              </div>
              <h3 className="font-['Inter'] font-semibold text-[#1A1A1A]" style={{ fontSize: '15px', opacity: uiStatus === 'completed' ? 0.7 : 1 }}>
                {clientName}
              </h3>
            </div>
            <div className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-[#9CA3AF] flex-shrink-0" strokeWidth={2} />
              <span className="font-['Inter'] text-[#6B7280] truncate" style={{ fontSize: '13px' }}>{location}</span>
            </div>
          </div>

          {/* ── State 1: Assigned → Confirm button ── */}
          {uiStatus === 'assigned' && (
            <button onClick={() => setShowDialog(true)} className="w-full h-11 bg-white rounded-[10px] font-['Inter'] font-semibold transition-colors active:bg-[#F0FDF4]" style={{ fontSize: '14px', color: '#1F6F43', border: '1.5px solid #1F6F43' }}>
              Confirm Shift
            </button>
          )}

          {/* ── State 2: Confirmed → Check In ── */}
          {uiStatus === 'confirmed' && (
            <div>
              <div className="flex items-center gap-1 mb-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#1F6F43]" strokeWidth={2} />
                <span className="font-['Inter'] font-medium text-[#1F6F43]" style={{ fontSize: '11px' }}>Confirmed ✓</span>
              </div>
              <button
                onClick={() => navigate(`/shifts/${shift.docId}`)}
                className="w-full h-11 bg-[#1F6F43] text-white rounded-[10px] font-['Inter'] font-semibold hover:bg-[#1a5e38] transition-colors"
                style={{ fontSize: '14px' }}
              >
                Check In
              </button>
            </div>
          )}

          {/* ── State 3: In Progress → Clock Out ── */}
          {uiStatus === 'in-progress' && (
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <div className="w-2 h-2 rounded-full bg-[#1E5FA6] animate-pulse" />
                <span className="font-['Inter'] font-medium text-[#1E5FA6]" style={{ fontSize: '11px' }}>
                  In Progress · Clocked in at {shift.clockIn}
                </span>
              </div>
              <button
                onClick={() => navigate(`/shifts/${shift.docId}/clock-out`)}
                className="w-full h-11 bg-white border-[1.5px] border-[#1F6F43] text-[#1F6F43] rounded-[10px] font-['Inter'] font-semibold hover:bg-[#F0FDF4] transition-colors"
                style={{ fontSize: '14px' }}
              >
                Clock Out
              </button>
            </div>
          )}

          {/* ── State 4: Completed ── */}
          {uiStatus === 'completed' && (
            <div>
              <div className="flex items-center gap-1 mb-2">
                <Check className="w-3.5 h-3.5 text-[#6B7280]" strokeWidth={2} />
                <span className="font-['Inter'] font-medium text-[#6B7280]" style={{ fontSize: '11px' }}>Completed</span>
              </div>
              <div className="flex items-center gap-2">
                <button className="h-10 bg-white rounded-[10px] font-['Inter'] font-medium text-[#1A1A1A] transition-colors hover:bg-[#F9FAFB]" style={{ fontSize: '13px', border: '1px solid #E5E7EB', width: '60%' }}>
                  View Report
                </button>
                <button onClick={() => navigate(`/shifts/${shift.docId}`)} className="flex-1 font-['Inter'] font-medium text-[#1F6F43] text-center" style={{ fontSize: '13px' }}>
                  Details &gt;
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <ConfirmShiftDialog
        open={showDialog}
        onClose={() => setShowDialog(false)}
        onConfirmed={handleConfirmed}
        shiftDocId={shift.docId}
        serviceType={shift.typeName || 'Shift'}
        clientName={clientName}
        date={shift.dateKey_iso || ''}
        timeRange={timeRange}
        location={location}
      />
    </>
  );
}

/* ─── Transportation shift card ───────────────────────────────────── */
function TransportationShiftCard({ shift: seedShift }: { shift: Shift }) {
  const navigate = useSafeNavigate();
  const [showDialog, setShowDialog] = useState(false);

  // Subscribe directly to this document for instant real-time status changes
  const { shift: live } = useSingleShift(seedShift.docId);
  const shift = live ?? seedShift;

  const uiStatus = getShiftUIStatus(shift);
  const timeRange = `${formatTime(shift.startTime || '')} – ${formatTime(shift.endTime || '')}`;
  const clientName = shift.clientName || 'Unknown Client';
  const initials = clientName.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
  const pts = shift.shiftPoints || [];
  const pickup   = pts[0]?.pickupLocation || '—';
  const visit    = pts[0]?.visitLocation  || '';
  const dropoff  = pts[pts.length - 1]?.dropLocation || '—';

  const handleConfirmed = async () => {
    try {
      await updateDoc(doc(db, 'dev_shifts', shift.docId), { shiftConfirmed: true });
    } catch (e) {
      console.error('Failed to confirm shift:', e);
    }
  };

  return (
    <>
      <div className="bg-white overflow-hidden" style={{ borderRadius: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        {uiStatus === 'assigned' && (
          <div className="flex items-center gap-2" style={{ padding: '12px 16px', backgroundColor: '#FFF8E1', borderRadius: '16px 16px 0 0' }}>
            <Clock className="w-4 h-4 text-[#92600A] flex-shrink-0" strokeWidth={2} />
            <span className="font-['Inter'] font-semibold text-[#92600A]" style={{ fontSize: '12px' }}>Confirmation required</span>
          </div>
        )}

        <div className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="px-3 py-1 rounded-full font-['Inter'] font-semibold" style={{ backgroundColor: '#FFF8E1', color: '#92600A', fontSize: '11px' }}>Transportation</div>
            <span className="font-['Inter'] text-[#9CA3AF]" style={{ fontSize: '12px' }}>{timeRange}</span>
          </div>

          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center justify-center rounded-full font-['Inter'] font-medium" style={{ width: '36px', height: '36px', backgroundColor: '#F3F0FF', color: '#5B21B6', fontSize: '13px' }}>
              {initials}
            </div>
            <span className="font-['Inter'] font-medium text-[#1A1A1A]" style={{ fontSize: '14px' }}>{clientName}</span>
          </div>

          {/* Route summary */}
          <div className="flex items-center gap-0 mb-5">
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: '#F0FDF4' }}>
                <Navigation className="w-3 h-3 text-[#1F6F43]" strokeWidth={2.5} />
              </div>
              <span className="font-['Inter'] text-[#6B7280]" style={{ fontSize: '12px' }}>{pickup.split(',')[0]}</span>
            </div>

            <div className="flex-1 mx-1.5 border-t-[1.5px] border-dotted border-[#D1D5DB]" />

            {visit && (
              <>
                <div className="flex items-center gap-1.5">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: '#EBF5FF' }}>
                    <Building2 className="w-3 h-3 text-[#185FA5]" strokeWidth={2.5} />
                  </div>
                  <span className="font-['Inter'] text-[#6B7280]" style={{ fontSize: '12px' }}>{visit.split(',')[0]}</span>
                </div>
                <div className="flex-1 mx-1.5 border-t-[1.5px] border-dotted border-[#D1D5DB]" />
              </>
            )}

            <div className="flex items-center gap-1.5">
              <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: '#FEF2F2' }}>
                <Flag className="w-3 h-3 text-[#B91C1C]" strokeWidth={2.5} />
              </div>
              <span className="font-['Inter'] text-[#6B7280]" style={{ fontSize: '12px' }}>{dropoff.split(',')[0]}</span>
            </div>
          </div>

          {uiStatus === 'assigned' && (
            <button onClick={() => setShowDialog(true)} className="w-full bg-white font-['Inter'] font-semibold transition-colors active:bg-[#F0FDF4]" style={{ height: '44px', fontSize: '14px', color: '#1F6F43', border: '1.5px solid #1F6F43', borderRadius: '10px' }}>
              Confirm Shift
            </button>
          )}

          {uiStatus === 'confirmed' && (
            <div>
              <div className="flex items-center gap-1 mb-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#1F6F43]" strokeWidth={2} />
                <span className="font-['Inter'] font-medium text-[#1F6F43]" style={{ fontSize: '11px' }}>Confirmed ✓</span>
              </div>
              <button
                onClick={() => navigate(`/shifts/${shift.docId}/transportation-detail`)}
                className="w-full bg-[#1F6F43] text-white font-['Inter'] font-semibold hover:bg-[#1a5e38] transition-colors"
                style={{ height: '44px', fontSize: '14px', borderRadius: '10px' }}
              >
                Check In
              </button>
            </div>
          )}

          {uiStatus === 'in-progress' && (
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <div className="w-2 h-2 rounded-full bg-[#1E5FA6] animate-pulse" />
                <span className="font-['Inter'] font-medium text-[#1E5FA6]" style={{ fontSize: '11px' }}>In Progress</span>
              </div>
              <button onClick={() => navigate(`/shifts/${shift.docId}/transportation-detail`)} className="w-full h-11 bg-white border-[1.5px] border-[#1F6F43] text-[#1F6F43] rounded-[10px] font-['Inter'] font-semibold" style={{ fontSize: '14px' }}>
                Continue Route
              </button>
            </div>
          )}

          {uiStatus === 'completed' && (
            <div className="flex items-center gap-1">
              <Check className="w-3.5 h-3.5 text-[#6B7280]" strokeWidth={2} />
              <span className="font-['Inter'] font-medium text-[#6B7280]" style={{ fontSize: '11px' }}>Completed</span>
            </div>
          )}
        </div>
      </div>

      <ConfirmShiftDialog
        open={showDialog}
        onClose={() => setShowDialog(false)}
        onConfirmed={handleConfirmed}
        shiftDocId={shift.docId}
        serviceType="Transportation"
        clientName={clientName}
        date={shift.dateKey_iso || ''}
        timeRange={timeRange}
        location={`${pickup.split(',')[0]} → ${dropoff.split(',')[0]}`}
      />
    </>
  );
}

/* ─── Today's Shifts section ──────────────────────────────────────── */
export function TodaysShifts() {
  const navigate = useSafeNavigate();
  const { user } = useAppContext();
  const { shifts, loading } = useTodayShifts(user?.userId);

  return (
    <section className="mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className="font-['Poppins'] font-semibold text-[#1A1A1A]" style={{ fontSize: '16px', letterSpacing: '-0.2px' }}>
            Today's shifts
          </h2>
          <div className="w-2 h-2 bg-[#22C55E] rounded-full animate-pulse" />
        </div>
        <button onClick={() => navigate('/shifts')} className="flex items-center gap-1 font-['Inter'] font-semibold text-[#1F6F43] hover:opacity-75 transition-opacity" style={{ fontSize: '13px' }}>
          View all
          <ChevronRight className="w-4 h-4" strokeWidth={2} />
        </button>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="w-6 h-6 text-[#1F6F43] animate-spin" />
        </div>
      )}

      {!loading && shifts.length === 0 && (
        <div className="bg-white rounded-2xl p-6 text-center" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <p className="font-['Inter'] text-[#9CA3AF]" style={{ fontSize: '14px' }}>No shifts scheduled for today</p>
        </div>
      )}

      <div className="space-y-4">
        {shifts.map((shift) => {
          const isTransport = (shift.typeName || '').toLowerCase().includes('transport');
          return isTransport
            ? <TransportationShiftCard key={shift.docId} shift={shift} />
            : <ShiftCard key={shift.docId} shift={shift} />;
        })}
      </div>
    </section>
  );
}
