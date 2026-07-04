import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, Users, Phone, Check, X, MapPin, Navigation, Clock, AlertTriangle, Camera, Upload, ChevronRight, Car, FileText } from 'lucide-react';
import { useSafeNavigate } from '../hooks/useSafeNavigate';
import { useParams } from 'react-router';
import { useSingleShift, formatTime, type ShiftPoint } from '../../hooks/useUserShifts';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';

// --- Types ---
type ClientStatus = 'waiting' | 'in-vehicle' | 'visiting' | 'dropped-off' | 'cancelled' | 'early-removal';
type RoutePhase = 'pickup' | 'visit-drive' | 'visit-arrived' | 'visit-active' | 'dropoff' | 'summary';
type CancelReason = 'Client not available' | 'Client refused' | 'Wrong address' | 'Safety concern' | 'Other';

interface Client {
  id: string;
  initials: string;
  name: string;
  seatType?: string;
  avatarBg: string;
  avatarColor: string;
  status: ClientStatus;
  pickupAddress: string;
  dropoffAddress: string;
  pickupTime?: string;
  dropoffTime?: string;
  cancelReason?: string;
  cancelNote?: string;
}

interface Stop {
  id: string;
  type: 'pickup' | 'visit' | 'dropoff';
  address: string;
  scheduledTime: string;
  clientIds: string[];
  completed: boolean;
}

// --- Mock Data (fallback when Firestore shift has no shiftPoints) ---
const initialClients: Client[] = [
  { id: '1', initials: 'MC', name: 'Michael Chen', seatType: 'Car Seat', avatarBg: '#F0FDF4', avatarColor: '#1F6F43', status: 'waiting', pickupAddress: '1234 Oak Street, Suite 5', dropoffAddress: '789 Maple Avenue, Apt 3' },
  { id: '2', initials: 'AT', name: 'Adriana Torres', seatType: 'Booster', avatarBg: '#EBF5FF', avatarColor: '#1E5FA6', status: 'waiting', pickupAddress: '1234 Oak Street, Suite 5', dropoffAddress: '789 Maple Avenue, Apt 3' },
  { id: '3', initials: 'LK', name: 'Liam Kim', avatarBg: '#FFF8E1', avatarColor: '#92600A', status: 'waiting', pickupAddress: '456 Elm Drive, Unit 2', dropoffAddress: '321 Pine Road' },
];

const AVATAR_PALETTE = [
  { bg: '#F0FDF4', color: '#1F6F43' },
  { bg: '#EBF5FF', color: '#1E5FA6' },
  { bg: '#FFF8E1', color: '#92600A' },
  { bg: '#F3F0FF', color: '#5B21B6' },
  { bg: '#FEF3C7', color: '#92600A' },
];

function buildClientsFromShift(pts: ShiftPoint[]): Client[] {
  if (!pts || pts.length === 0) return initialClients;
  return pts.map((pt, i) => {
    const name = pt.name || `Client ${i + 1}`;
    const words = name.trim().split(/\s+/);
    const initials = words.slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('');
    const col = AVATAR_PALETTE[i % AVATAR_PALETTE.length];
    return {
      id: String(i),
      initials,
      name,
      seatType: pt.seatType,
      avatarBg: col.bg,
      avatarColor: col.color,
      status: 'waiting' as ClientStatus,
      pickupAddress: pt.pickupLocation || '—',
      dropoffAddress: pt.dropLocation || '—',
    };
  });
}

function buildStops(clients: Client[]): Stop[] {
  const stops: Stop[] = [];
  // Group pickups by address
  const pickupGroups = new Map<string, string[]>();
  clients.forEach(c => {
    const existing = pickupGroups.get(c.pickupAddress) || [];
    existing.push(c.id);
    pickupGroups.set(c.pickupAddress, existing);
  });
  let idx = 0;
  pickupGroups.forEach((ids, addr) => {
    stops.push({ id: `pickup-${idx}`, type: 'pickup', address: addr, scheduledTime: idx === 0 ? '2:00 PM' : '2:20 PM', clientIds: ids, completed: false });
    idx++;
  });
  // Visit
  stops.push({ id: 'visit', type: 'visit', address: '500 City Hall Plaza', scheduledTime: '3:00 PM', clientIds: clients.map(c => c.id), completed: false });
  // Group drop-offs by address
  const dropGroups = new Map<string, string[]>();
  clients.forEach(c => {
    const existing = dropGroups.get(c.dropoffAddress) || [];
    existing.push(c.id);
    dropGroups.set(c.dropoffAddress, existing);
  });
  idx = 0;
  dropGroups.forEach((ids, addr) => {
    stops.push({ id: `dropoff-${idx}`, type: 'dropoff', address: addr, scheduledTime: idx === 0 ? '5:30 PM' : '6:00 PM', clientIds: ids, completed: false });
    idx++;
  });
  return stops;
}

const phaseColors = {
  pickup: { primary: '#1F6F43', bg: '#F0FDF4', light: '#DCFCE7' },
  visit: { primary: '#1E5FA6', bg: '#EFF6FF', light: '#DBEAFE' },
  dropoff: { primary: '#D85A30', bg: '#FEF2F2', light: '#FEE2E2' },
};

// --- Helper Components ---

function StatusDot({ status }: { status: ClientStatus }) {
  const config: Record<ClientStatus, { color: string; label: string }> = {
    'waiting': { color: '#D1D5DB', label: 'Waiting' },
    'in-vehicle': { color: '#1F6F43', label: 'In vehicle' },
    'visiting': { color: '#1E5FA6', label: 'Visiting' },
    'dropped-off': { color: '#1F6F43', label: 'Complete' },
    'cancelled': { color: '#DC2626', label: 'Cancelled' },
    'early-removal': { color: '#F59E0B', label: 'Removed' },
  };
  const c = config[status];
  const isCheck = status === 'dropped-off';
  const isX = status === 'cancelled';
  return (
    <div className="flex items-center gap-1.5">
      {isCheck ? (
        <div className="w-3 h-3 rounded-full bg-[#1F6F43] flex items-center justify-center"><Check className="w-2 h-2 text-white" strokeWidth={3} /></div>
      ) : isX ? (
        <div className="w-3 h-3 rounded-full bg-[#DC2626] flex items-center justify-center"><X className="w-2 h-2 text-white" strokeWidth={3} /></div>
      ) : (
        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: c.color }} />
      )}
      <span className="font-['Inter']" style={{ fontSize: '10px', color: c.color }}>{c.label}</span>
    </div>
  );
}

function ProgressBar({ stops, currentStopIndex }: { stops: Stop[]; currentStopIndex: number }) {
  const dotSize = stops.length > 4 ? 16 : 20;
  const labelSize = stops.length > 4 ? '8px' : '9px';
  return (
    <div className="flex items-center justify-between relative px-2 mb-5">
      {/* Connecting line */}
      <div className="absolute top-[10px] left-6 right-6 h-[2px] bg-[#E5E7EB]" style={{ top: `${dotSize / 2}px` }} />
      <div className="absolute left-6 h-[2px] bg-[#1F6F43]" style={{ top: `${dotSize / 2}px`, width: `${currentStopIndex > 0 ? (currentStopIndex / (stops.length - 1)) * 100 : 0}%`, maxWidth: 'calc(100% - 48px)', transition: 'width 0.5s ease' }} />
      {stops.map((stop, i) => {
        const completed = i < currentStopIndex;
        const active = i === currentStopIndex;
        const label = stop.type === 'pickup' ? `Pickup${stops.filter(s => s.type === 'pickup').length > 1 ? ` ${String.fromCharCode(65 + stops.filter((s, j) => s.type === 'pickup' && j <= i).length - 1)}` : ''}` :
          stop.type === 'visit' ? 'Visit' :
          `Drop${stops.filter(s => s.type === 'dropoff').length > 1 ? ` ${String.fromCharCode(65 + stops.filter((s, j) => s.type === 'dropoff' && j <= i).length - 1)}` : ''}`;
        const clientCount = stop.clientIds.length;
        return (
          <div key={stop.id} className="flex flex-col items-center relative z-10" style={{ minWidth: dotSize + 8 }}>
            <div className="relative">
              <div
                className="rounded-full flex items-center justify-center"
                style={{
                  width: dotSize, height: dotSize,
                  backgroundColor: completed ? '#1F6F43' : active ? '#1F6F43' : '#fff',
                  border: completed || active ? 'none' : '2px solid #D1D5DB',
                  boxShadow: active ? '0 0 0 4px rgba(31,111,67,0.2)' : 'none',
                }}
              >
                {completed && <Check className="text-white" style={{ width: dotSize * 0.5, height: dotSize * 0.5 }} strokeWidth={3} />}
                {active && <div className="rounded-full bg-white" style={{ width: dotSize * 0.35, height: dotSize * 0.35 }} />}
              </div>
              {clientCount > 1 && (
                <div className="absolute -top-1 -right-1 rounded-full bg-[#1F6F43] text-white flex items-center justify-center font-['Inter'] font-semibold" style={{ width: 14, height: 14, fontSize: '8px' }}>
                  {clientCount}
                </div>
              )}
            </div>
            <span className="font-['Inter'] mt-1.5 text-center" style={{ fontSize: labelSize, color: active ? '#1F6F43' : completed ? '#1F6F43' : '#9CA3AF' }}>{label}</span>
          </div>
        );
      })}
    </div>
  );
}

// --- Main Component ---
export function CompleteShift() {
  const navigate = useSafeNavigate();
  const { id: shiftDocId } = useParams<{ id: string }>();
  const { shift } = useSingleShift(shiftDocId);

  // Initialize clients & stops from real Firestore shiftPoints (once, on first load)
  const [clients, setClients] = useState<Client[]>(initialClients);
  const [stops, setStops] = useState<Stop[]>(() => buildStops(initialClients));
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!initialized && shift) {
      const pts = (shift.shiftPoints ?? []) as ShiftPoint[];
      if (pts.length > 0) {
        const newClients = buildClientsFromShift(pts);
        setClients(newClients);
        setStops(buildStops(newClients));
      }
      setInitialized(true);
    }
  }, [shift, initialized]);

  // Real date/time for headers
  const dateLabel = (() => {
    const iso = shift?.dateKey_iso;
    if (!iso) return '';
    const [y, m, d] = String(iso).split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  })();
  const timeRange = shift
    ? `${formatTime(shift.startTime || '')} – ${formatTime(shift.endTime || '')}`
    : '';
  const headerSubtitle = dateLabel && timeRange ? `${dateLabel} · ${timeRange}` : 'Thu, 20 Mar · 2:00 – 6:00 PM';

  const [currentStopIndex, setCurrentStopIndex] = useState(0);
  const [phase, setPhase] = useState<RoutePhase>('pickup');
  const [cancelSheet, setCancelSheet] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState<CancelReason | null>(null);
  const [cancelNote, setCancelNote] = useState('');
  const [cancelEntireConfirm, setCancelEntireConfirm] = useState(false);
  const [visitArrivalTime, setVisitArrivalTime] = useState<string | null>(null);
  const [visitMinutes, setVisitMinutes] = useState(0);
  const [totalKm, setTotalKm] = useState(4.2);
  const [endMeter, setEndMeter] = useState('');
  const [shiftReport, setShiftReport] = useState('');

  // Visit timer
  useEffect(() => {
    if (phase !== 'visit-active') return;
    const interval = setInterval(() => setVisitMinutes(m => m + 1), 60000);
    return () => clearInterval(interval);
  }, [phase]);

  // Km ticker
  useEffect(() => {
    const interval = setInterval(() => setTotalKm(k => +(k + 0.1).toFixed(1)), 4000);
    return () => clearInterval(interval);
  }, []);

  const currentStop = stops[currentStopIndex];
  const activeClients = clients.filter(c => c.status !== 'cancelled' && c.status !== 'early-removal');
  const currentPhaseColor = currentStop?.type === 'visit' ? phaseColors.visit : currentStop?.type === 'dropoff' ? phaseColors.dropoff : phaseColors.pickup;

  const confirmClient = useCallback((clientId: string, type: 'pickup' | 'dropoff') => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    setClients(prev => prev.map(c => {
      if (c.id !== clientId) return c;
      if (type === 'pickup') return { ...c, status: 'in-vehicle' as ClientStatus, pickupTime: timeStr };
      return { ...c, status: 'dropped-off' as ClientStatus, dropoffTime: timeStr };
    }));
  }, []);

  const cancelClient = useCallback((clientId: string) => {
    if (!cancelReason) return;
    setClients(prev => prev.map(c => c.id === clientId ? { ...c, status: 'cancelled' as ClientStatus, cancelReason: cancelReason, cancelNote } : c));
    setCancelSheet(null);
    setCancelReason(null);
    setCancelNote('');
  }, [cancelReason, cancelNote]);

  const cancelEntireRoute = useCallback(() => {
    setClients(prev => prev.map(c => ({ ...c, status: 'cancelled' as ClientStatus, cancelReason: 'Entire route cancelled' })));
    setPhase('summary');
    setCancelSheet(null);
    setCancelEntireConfirm(false);
  }, []);

  // Check if current stop is complete
  const stopClients = currentStop ? clients.filter(c => currentStop.clientIds.includes(c.id)) : [];
  const confirmedAtStop = stopClients.filter(c => c.status === 'in-vehicle' || c.status === 'dropped-off' || c.status === 'visiting');
  const cancelledAtStop = stopClients.filter(c => c.status === 'cancelled');
  const waitingAtStop = stopClients.filter(c => c.status === 'waiting');
  const allAtStopHandled = waitingAtStop.length === 0 && stopClients.length > 0;
  const atLeastOneConfirmed = confirmedAtStop.length > 0;
  const allCancelled = activeClients.length === 0;

  const advanceStop = useCallback(() => {
    if (allCancelled) { setPhase('summary'); return; }
    const nextIdx = currentStopIndex + 1;
    if (nextIdx >= stops.length) { setPhase('summary'); return; }
    setCurrentStopIndex(nextIdx);
    const nextStop = stops[nextIdx];
    if (nextStop.type === 'visit') {
      setPhase('visit-drive');
      setClients(prev => prev.map(c => c.status === 'in-vehicle' ? { ...c, status: 'in-vehicle' as ClientStatus } : c));
    } else if (nextStop.type === 'dropoff') {
      setPhase('dropoff');
    } else {
      setPhase('pickup');
    }
  }, [currentStopIndex, stops, allCancelled]);

  const arriveAtVisit = useCallback(() => {
    const now = new Date();
    setVisitArrivalTime(now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }));
    setPhase('visit-arrived');
    setTimeout(() => setPhase('visit-active'), 300);
    setClients(prev => prev.map(c => c.status === 'in-vehicle' ? { ...c, status: 'visiting' as ClientStatus } : c));
  }, []);

  const completeVisit = useCallback(() => {
    setClients(prev => prev.map(c => c.status === 'visiting' ? { ...c, status: 'in-vehicle' as ClientStatus } : c));
    advanceStop();
  }, [advanceStop]);

  // --- Summary Screen ---
  if (phase === 'summary') {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#F8F8F6' }}>
        <div className="sticky top-0 z-10 bg-white" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div className="px-5 pt-4 pb-3">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate(`/shifts/${shiftDocId}/transportation-detail`)} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[#F3F4F6] -ml-1">
                <ChevronLeft className="w-5 h-5 text-[#1A1A1A]" strokeWidth={2} />
              </button>
              <h1 className="font-['Poppins'] font-semibold text-[#1A1A1A]" style={{ fontSize: '18px' }}>Route Summary</h1>
            </div>
          </div>
        </div>
        <div className="px-5 pt-8 pb-8">
          {/* Success */}
          <div className="flex flex-col items-center mb-6">
            <div className="w-16 h-16 rounded-full bg-[#1F6F43] flex items-center justify-center mb-3">
              <Check className="w-8 h-8 text-white" strokeWidth={2.5} />
            </div>
            <h2 className="font-['Poppins'] font-semibold text-[#1F6F43] mb-1" style={{ fontSize: '20px' }}>Route Complete!</h2>
            <p className="font-['Inter'] text-[#9CA3AF]" style={{ fontSize: '14px' }}>
              {allCancelled ? 'All clients were cancelled' : 'All clients delivered safely'}
            </p>
          </div>

          {/* Client breakdown */}
          <div className="bg-white p-5 mb-4" style={{ borderRadius: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <h3 className="font-['Poppins'] font-semibold text-[#1A1A1A] mb-4" style={{ fontSize: '14px' }}>Client Summary</h3>
            {clients.map(c => (
              <div key={c.id} className="mb-3 last:mb-0 p-3 rounded-xl" style={{ backgroundColor: c.status === 'cancelled' ? '#FEF2F2' : '#F0FDF4' }}>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center font-['Inter'] font-semibold" style={{ backgroundColor: c.avatarBg, color: c.avatarColor, fontSize: '10px' }}>{c.initials}</div>
                  <span className="font-['Inter'] font-semibold text-[#1A1A1A]" style={{ fontSize: '13px' }}>{c.name}</span>
                </div>
                {c.status === 'cancelled' ? (
                  <p className="font-['Inter'] text-[#DC2626] ml-9" style={{ fontSize: '12px' }}>Cancelled — {c.cancelReason}</p>
                ) : (
                  <div className="flex flex-wrap gap-x-3 gap-y-1 ml-9">
                    <span className="font-['Inter'] text-[#6B7280]" style={{ fontSize: '11px' }}>Pickup {c.pickupTime}</span>
                    <span className="font-['Inter'] text-[#6B7280]" style={{ fontSize: '11px' }}>Visit {visitArrivalTime}</span>
                    <span className="font-['Inter'] text-[#6B7280]" style={{ fontSize: '11px' }}>Drop-off {c.dropoffTime}</span>
                    <span className="font-['Inter'] font-semibold text-[#1F6F43]" style={{ fontSize: '11px' }}>Complete ✓</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Km Summary */}
          <div className="bg-white p-5 mb-4" style={{ borderRadius: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <h3 className="font-['Poppins'] font-semibold text-[#1A1A1A] mb-3" style={{ fontSize: '14px' }}>Distance & Time</h3>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="p-3 rounded-xl" style={{ backgroundColor: '#F0FDF4' }}>
                <p className="font-['Inter'] text-[#6B7280]" style={{ fontSize: '11px' }}>Total Distance</p>
                <p className="font-['Poppins'] font-semibold text-[#1F6F43]" style={{ fontSize: '18px' }}>{totalKm} km</p>
              </div>
              <div className="p-3 rounded-xl" style={{ backgroundColor: '#EFF6FF' }}>
                <p className="font-['Inter'] text-[#6B7280]" style={{ fontSize: '11px' }}>Visit Duration</p>
                <p className="font-['Poppins'] font-semibold text-[#1E5FA6]" style={{ fontSize: '18px' }}>{visitMinutes > 0 ? `${Math.floor(visitMinutes / 60)}h ${visitMinutes % 60}m` : '1h 30m'}</p>
              </div>
            </div>
            <div className="space-y-2">
              {[
                { from: 'Pickup A', to: 'Pickup B', km: '3.2 km', time: '8 min' },
                { from: 'Pickup B', to: 'Visit', km: '8.5 km', time: '18 min' },
                { from: 'Visit', to: 'Drop-off A', km: '10.2 km', time: '22 min' },
                { from: 'Drop-off A', to: 'Drop-off B', km: '4.1 km', time: '10 min' },
              ].map((leg, i) => (
                <div key={i} className="flex justify-between items-center py-1.5">
                  <span className="font-['Inter'] text-[#6B7280]" style={{ fontSize: '12px' }}>{leg.from} → {leg.to}</span>
                  <span className="font-['Inter'] font-medium text-[#1A1A1A]" style={{ fontSize: '12px' }}>{leg.km} · {leg.time}</span>
                </div>
              ))}
            </div>
          </div>

          {/* End Meter + Receipt */}
          <div className="bg-white p-5 mb-4" style={{ borderRadius: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            {/* Shift Report */}
            <div className="mb-5">
              <div className="flex items-center gap-2 mb-3">
                <FileText className="w-4 h-4 text-[#DC2626]" />
                <span className="font-['Inter'] font-semibold tracking-wider" style={{ fontSize: '11px', color: '#9CA3AF', textTransform: 'uppercase' as const }}>
                  Shift Report <span className="text-[#DC2626]">*</span>
                </span>
                {shiftReport.length > 0 && (
                  <span className="ml-auto font-['Inter'] text-[#1F6F43]" style={{ fontSize: '10px' }}>
                    {shiftReport.length} chars
                  </span>
                )}
              </div>
              <textarea
                value={shiftReport}
                onChange={e => setShiftReport(e.target.value)}
                placeholder="Summarise what happened during this shift..."
                className="w-full p-4 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] font-['Inter'] text-[#1A1A1A] placeholder:text-[#D1D5DB] resize-none focus:outline-none focus:border-[#1F6F43] transition-colors"
                style={{ minHeight: '120px', fontSize: '14px', lineHeight: '1.6' }}
              />
            </div>

            <div className="border-t border-[#F3F4F6] my-4" />

            <div className="mb-4">
              <label className="font-['Inter'] font-medium text-[#374151] mb-2 block" style={{ fontSize: '13px' }}>End Meter Reading (optional)</label>
              <input
                type="text"
                value={endMeter}
                onChange={e => setEndMeter(e.target.value)}
                placeholder="e.g. 48,235"
                className="w-full h-11 px-4 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] font-['Inter'] text-[#1A1A1A] placeholder:text-[#D1D5DB] focus:outline-none focus:border-[#1F6F43]"
                style={{ fontSize: '14px' }}
              />
            </div>
            <div>
              <label className="font-['Inter'] font-medium text-[#374151] mb-2 block" style={{ fontSize: '13px' }}>Upload Receipt (optional)</label>
              <button className="w-full h-20 border-2 border-dashed border-[#E5E7EB] rounded-xl flex flex-col items-center justify-center gap-1 active:bg-[#F9FAFB]">
                <Upload className="w-5 h-5 text-[#9CA3AF]" />
                <span className="font-['Inter'] text-[#9CA3AF]" style={{ fontSize: '12px' }}>Tap to upload</span>
              </button>
            </div>
          </div>

          <button
            disabled={!shiftReport.trim()}
            onClick={async () => {
              if (!shiftReport.trim()) return;
              // Write clockOut to Firestore — marks shift as Completed
              if (shiftDocId) {
                try {
                  await updateDoc(doc(db, 'dev_shifts', shiftDocId), {
                    clockOut: serverTimestamp(),
                  });
                } catch (e) {
                  console.error('[CompleteShift] Failed to write clockOut:', e);
                }
              }
              navigate(`/shifts/${shiftDocId}/shift-completion`);
            }}
            className="w-full text-white font-['Poppins'] font-semibold active:opacity-90 disabled:opacity-50"
            style={{ height: '54px', backgroundColor: '#1F6F43', borderRadius: '14px', fontSize: '15px', boxShadow: '0 2px 8px rgba(31,111,67,0.25)' }}
          >
            Submit Report
          </button>
        </div>
      </div>
    );
  }

  // --- Active Route Screen ---
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F8F8F6' }}>
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <div className="px-5 pt-4 pb-3">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate(-1)} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[#F3F4F6] -ml-1">
                <ChevronLeft className="w-5 h-5 text-[#1A1A1A]" strokeWidth={2} />
              </button>
              <h1 className="font-['Poppins'] font-semibold text-[#1A1A1A]" style={{ fontSize: '18px' }}>Complete Shift</h1>
            </div>
            <div className="px-3 py-1.5 rounded-full font-['Inter'] font-semibold" style={{ backgroundColor: '#F0FDF4', color: '#1F6F43', fontSize: '12px' }}>
              {totalKm} km
            </div>
          </div>
          <p className="font-['Inter'] text-[#9CA3AF] ml-11" style={{ fontSize: '13px' }}>{headerSubtitle}</p>
        </div>
      </div>

      <div className="px-5 pt-4 pb-36">
        {/* Progress Bar */}
        <ProgressBar stops={stops} currentStopIndex={currentStopIndex} />

        {/* Client Roster Card */}
        <div className="bg-white p-4 mb-4" style={{ borderRadius: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Users className="w-[18px] h-[18px] text-[#1F6F43]" />
              <span className="font-['Poppins'] font-semibold text-[#1A1A1A]" style={{ fontSize: '13px' }}>Clients on this route</span>
            </div>
            <span className="font-['Inter'] font-semibold px-2.5 py-1 rounded-xl" style={{ fontSize: '11px', color: '#1F6F43', backgroundColor: '#F0FDF4' }}>
              {clients.length} clients
            </span>
          </div>
          <div className="space-y-2">
            {clients.map(c => (
              <div key={c.id} className="flex items-center gap-2.5" style={{ height: '40px' }}>
                <div className="w-7 h-7 rounded-full flex items-center justify-center font-['Inter'] font-semibold flex-shrink-0" style={{ backgroundColor: c.avatarBg, color: c.avatarColor, fontSize: '10px' }}>{c.initials}</div>
                <div className="flex-1 min-w-0 flex items-center gap-2">
                  <span className="font-['Inter'] font-semibold text-[#1A1A1A] truncate" style={{ fontSize: '13px' }}>{c.name}</span>
                  {c.seatType && <span className="font-['Inter'] px-2 py-0.5 rounded-md flex-shrink-0" style={{ fontSize: '10px', backgroundColor: '#F3F4F6', color: '#6B7280' }}>{c.seatType}</span>}
                </div>
                <StatusDot status={c.status} />
              </div>
            ))}
          </div>
        </div>

        {/* Completed Stops (collapsed) */}
        {stops.slice(0, currentStopIndex).map(stop => {
          const sClients = clients.filter(c => stop.clientIds.includes(c.id));
          const color = stop.type === 'pickup' ? '#1F6F43' : stop.type === 'visit' ? '#1E5FA6' : '#D85A30';
          return (
            <div key={stop.id} className="bg-white mb-3 p-3 flex items-center gap-3" style={{ borderRadius: '12px', borderLeft: `3px solid ${color}`, boxShadow: '0 1px 4px rgba(0,0,0,0.03)' }}>
              <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: color }}>
                <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-['Inter'] font-semibold text-[#1A1A1A] truncate" style={{ fontSize: '12px' }}>
                  {stop.type === 'pickup' ? 'Pickup' : stop.type === 'visit' ? 'Visit' : 'Drop-off'} — {stop.address.split(',')[0]}
                </p>
                <p className="font-['Inter'] text-[#9CA3AF] truncate" style={{ fontSize: '10px' }}>
                  {sClients.filter(c => c.status !== 'cancelled').map(c => c.name).join(', ')}
                </p>
              </div>
            </div>
          );
        })}

        {/* Active Stop Card */}
        {currentStop && (
          <div className="bg-white p-5 mb-4" style={{ borderRadius: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            {/* Active stop header */}
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: currentPhaseColor.bg }}>
                {currentStop.type === 'visit' ? (
                  <Clock className="w-5 h-5" style={{ color: currentPhaseColor.primary }} />
                ) : (
                  <Car className="w-5 h-5" style={{ color: currentPhaseColor.primary }} />
                )}
              </div>
              <div className="flex-1">
                <p className="font-['Poppins'] font-semibold text-[#1A1A1A]" style={{ fontSize: '15px' }}>
                  {currentStop.type === 'pickup' ? 'Pickup' : currentStop.type === 'visit' ? 'Visit Location' : 'Drop-off'} — {currentStop.address.split(',')[0]}
                </p>
                <p className="font-['Inter'] text-[#6B7280]" style={{ fontSize: '12px' }}>
                  {stopClients.filter(c => c.status !== 'cancelled').length} client{stopClients.filter(c => c.status !== 'cancelled').length !== 1 ? 's' : ''} at this location
                </p>
              </div>
              <span className="font-['Inter'] text-[#9CA3AF] flex-shrink-0" style={{ fontSize: '12px' }}>{currentStop.scheduledTime}</span>
            </div>

            {/* Map placeholder */}
            <div className="rounded-xl mb-4 flex items-center justify-center relative overflow-hidden" style={{ height: '140px', backgroundColor: '#E8F5E9' }}>
              <div className="absolute inset-0 opacity-20" style={{ background: 'repeating-linear-gradient(0deg, transparent, transparent 20px, #1F6F43 20px, #1F6F43 21px), repeating-linear-gradient(90deg, transparent, transparent 20px, #1F6F43 20px, #1F6F43 21px)' }} />
              <div className="relative flex flex-col items-center">
                <MapPin className="w-8 h-8 text-[#1F6F43] mb-1" />
                <span className="font-['Inter'] font-medium text-[#1F6F43]" style={{ fontSize: '12px' }}>{currentStop.address}</span>
              </div>
            </div>

            <button className="w-full h-11 rounded-xl flex items-center justify-center gap-2 font-['Inter'] font-semibold text-white mb-5 active:opacity-90" style={{ backgroundColor: currentPhaseColor.primary }}>
              <Navigation className="w-4 h-4" />
              <span style={{ fontSize: '13px' }}>Open Full Navigation</span>
            </button>

            {/* Visit Phase: Arrived + Timer */}
            {(phase === 'visit-drive' || phase === 'visit-arrived' || phase === 'visit-active') && currentStop.type === 'visit' && (
              <>
                {phase === 'visit-drive' && (
                  <button
                    onClick={arriveAtVisit}
                    className="w-full h-12 rounded-xl font-['Inter'] font-semibold text-white active:opacity-90 mb-4"
                    style={{ backgroundColor: '#1E5FA6' }}
                  >
                    I've Arrived at Visit
                  </button>
                )}
                {(phase === 'visit-active') && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between p-3 rounded-xl mb-3" style={{ backgroundColor: '#EFF6FF' }}>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-[#1E5FA6]" />
                        <span className="font-['Inter'] font-semibold text-[#1E5FA6]" style={{ fontSize: '13px' }}>Visit in progress</span>
                      </div>
                      <span className="font-['Inter'] font-semibold text-[#1E5FA6]" style={{ fontSize: '13px' }}>
                        Arrived {visitArrivalTime}
                      </span>
                    </div>
                    {/* Client presence */}
                    <p className="font-['Inter'] font-semibold text-[#1A1A1A] mb-2" style={{ fontSize: '13px' }}>Clients present:</p>
                    {stopClients.filter(c => c.status === 'visiting').map(c => (
                      <div key={c.id} className="flex items-center gap-2 py-2">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center font-['Inter'] font-semibold" style={{ backgroundColor: c.avatarBg, color: c.avatarColor, fontSize: '9px' }}>{c.initials}</div>
                        <span className="font-['Inter'] font-medium text-[#1A1A1A] flex-1" style={{ fontSize: '13px' }}>{c.name}</span>
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full bg-[#22C55E]" />
                          <span className="font-['Inter'] text-[#1F6F43]" style={{ fontSize: '10px' }}>Present</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Shift Report — available during visit */}
            {phase === 'visit-active' && currentStop?.type === 'visit' && (
              <div className="mt-1">
                <div className="border-t border-[#F3F4F6] my-4" />
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="w-4 h-4 text-[#DC2626]" />
                  <span className="font-['Inter'] font-semibold tracking-wider" style={{ fontSize: '11px', color: '#9CA3AF', textTransform: 'uppercase' as const }}>
                    Shift Report <span className="text-[#DC2626]">*</span>
                  </span>
                </div>
                <textarea
                  value={shiftReport}
                  onChange={e => setShiftReport(e.target.value)}
                  placeholder="Summarise what happened during this shift..."
                  className="w-full p-4 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] font-['Inter'] text-[#1A1A1A] placeholder:text-[#D1D5DB] resize-none focus:outline-none focus:border-[#1E5FA6] transition-colors"
                  style={{ minHeight: '120px', fontSize: '14px', lineHeight: '1.6' }}
                />
                <p className="font-['Inter'] text-[#9CA3AF] mt-2" style={{ fontSize: '11px' }}>
                  Write your report now while details are fresh. You can continue editing until you submit.
                </p>
              </div>
            )}

            {/* Pickup/Dropoff: Individual Client Confirmation */}
            {(currentStop.type === 'pickup' || currentStop.type === 'dropoff') && (
              <div>
                <p className="font-['Inter'] font-semibold text-[#1A1A1A] mb-3" style={{ fontSize: '13px' }}>
                  Confirm each client {currentStop.type === 'pickup' ? 'pickup' : 'drop-off'}:
                </p>
                {stopClients.map(c => {
                  const isConfirmed = currentStop.type === 'pickup'
                    ? (c.status === 'in-vehicle' || c.status === 'visiting' || c.status === 'dropped-off')
                    : c.status === 'dropped-off';
                  const isCancelled = c.status === 'cancelled';
                  return (
                    <div
                      key={c.id}
                      className="p-3.5 mb-2.5 rounded-xl border-[1.5px] transition-colors"
                      style={{
                        backgroundColor: isCancelled ? '#FEF2F2' : isConfirmed ? '#F0FDF4' : '#fff',
                        borderColor: isCancelled ? '#DC2626' : isConfirmed ? '#1F6F43' : '#E5E7EB',
                        opacity: isCancelled ? 0.7 : 1,
                      }}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center font-['Inter'] font-semibold flex-shrink-0" style={{ backgroundColor: c.avatarBg, color: c.avatarColor, fontSize: '12px' }}>{c.initials}</div>
                        <div className="flex-1 min-w-0">
                          <p className={`font-['Inter'] font-semibold text-[#1A1A1A] ${isCancelled ? 'line-through' : ''}`} style={{ fontSize: '14px' }}>{c.name}</p>
                          {c.seatType && <span className="font-['Inter'] px-2 py-0.5 rounded-md inline-block mt-0.5" style={{ fontSize: '10px', backgroundColor: '#F3F4F6', color: '#6B7280' }}>{c.seatType}</span>}
                        </div>
                        {!isConfirmed && !isCancelled && (
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <button
                              onClick={() => confirmClient(c.id, currentStop.type as 'pickup' | 'dropoff')}
                              className="px-4 py-2 rounded-full font-['Inter'] font-semibold active:opacity-80"
                              style={{ fontSize: '12px', backgroundColor: '#F0FDF4', color: '#1F6F43' }}
                            >
                              Confirm {currentStop.type === 'pickup' ? 'Pickup' : 'Drop-off'}
                            </button>
                            <button onClick={() => setCancelSheet(c.id)} className="w-5 h-5 flex items-center justify-center">
                              <X className="w-4 h-4 text-[#D1D5DB]" />
                            </button>
                          </div>
                        )}
                        {isConfirmed && (
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <div className="w-6 h-6 rounded-full bg-[#1F6F43] flex items-center justify-center">
                              <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                            </div>
                            <div className="flex flex-col items-end">
                              <span className="font-['Inter'] font-semibold text-[#1F6F43]" style={{ fontSize: '11px' }}>
                                {currentStop.type === 'pickup' ? 'Picked up' : 'Dropped off'}
                              </span>
                              <span className="font-['Inter'] text-[#9CA3AF]" style={{ fontSize: '10px' }}>
                                {currentStop.type === 'pickup' ? (c.pickupTime || '') : (c.dropoffTime || '')}
                              </span>
                            </div>
                          </div>
                        )}
                        {isCancelled && (
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <div className="w-6 h-6 rounded-full bg-[#DC2626] flex items-center justify-center">
                              <X className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                            </div>
                            <span className="font-['Inter'] text-[#DC2626]" style={{ fontSize: '11px' }}>Cancelled</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 px-5 pb-6 pt-3" style={{ background: 'linear-gradient(to top, #F8F8F6 80%, transparent)' }}>
        {/* Visit phase */}
        {phase === 'visit-active' && (
          <button
            onClick={completeVisit}
            className="w-full text-white font-['Poppins'] font-semibold active:opacity-90"
            style={{ height: '54px', backgroundColor: '#1E5FA6', borderRadius: '14px', fontSize: '15px', boxShadow: '0 2px 8px rgba(30,95,166,0.25)' }}
          >
            Visit Complete — Ready to Leave ➜
          </button>
        )}
        {phase === 'visit-drive' && (
          <button
            disabled
            className="w-full text-white font-['Poppins'] font-semibold opacity-40"
            style={{ height: '54px', backgroundColor: '#1E5FA6', borderRadius: '14px', fontSize: '15px' }}
          >
            Arrive at visit to continue
          </button>
        )}
        {/* Pickup/Dropoff phase */}
        {(phase === 'pickup' || phase === 'dropoff') && (
          <>
            {allCancelled ? (
              <button
                onClick={() => setPhase('summary')}
                className="w-full text-white font-['Poppins'] font-semibold active:opacity-90"
                style={{ height: '54px', backgroundColor: '#DC2626', borderRadius: '14px', fontSize: '15px' }}
              >
                Return — No Clients
              </button>
            ) : !allAtStopHandled ? (
              <button
                disabled={!atLeastOneConfirmed}
                className="w-full text-white font-['Poppins'] font-semibold"
                style={{ height: '54px', backgroundColor: currentPhaseColor.primary, borderRadius: '14px', fontSize: '14px', opacity: atLeastOneConfirmed ? 0.7 : 0.4 }}
              >
                {confirmedAtStop.length > 0
                  ? `${confirmedAtStop.length} of ${stopClients.filter(c => c.status !== 'cancelled').length} confirmed — Continue`
                  : 'Confirm all clients to continue'}
              </button>
            ) : (
              <button
                onClick={advanceStop}
                className="w-full text-white font-['Poppins'] font-semibold active:opacity-90"
                style={{ height: '54px', backgroundColor: currentPhaseColor.primary, borderRadius: '14px', fontSize: '15px', boxShadow: `0 2px 8px ${currentPhaseColor.primary}40` }}
              >
                {phase === 'pickup'
                  ? (stops[currentStopIndex + 1]?.type === 'pickup' ? 'Next Pickup ➜' : 'All Picked Up — Drive to Visit ➜')
                  : (currentStopIndex < stops.length - 1 ? 'Next Drop-off ➜' : 'All Dropped Off — Complete ➜')}
              </button>
            )}
          </>
        )}
      </div>

      {/* Cancel Bottom Sheet */}
      {cancelSheet && (
        <div className="fixed inset-0 z-50 flex items-end" onClick={() => { setCancelSheet(null); setCancelReason(null); setCancelNote(''); setCancelEntireConfirm(false); }}>
          <div className="absolute inset-0" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }} />
          <div className="relative w-full bg-white" style={{ borderRadius: '20px 20px 0 0', padding: '24px 28px 32px' }} onClick={e => e.stopPropagation()}>
            <h3 className="font-['Poppins'] font-semibold text-[#1A1A1A] mb-1" style={{ fontSize: '16px' }}>Cancel Pickup</h3>
            <p className="font-['Inter'] text-[#6B7280] mb-4" style={{ fontSize: '13px' }}>
              {clients.find(c => c.id === cancelSheet)?.name} — {clients.find(c => c.id === cancelSheet)?.pickupAddress.split(',')[0]}
            </p>

            <p className="font-['Inter'] font-semibold text-[#374151] mb-2" style={{ fontSize: '13px' }}>Reason:</p>
            <div className="flex flex-wrap gap-2 mb-4">
              {(['Client not available', 'Client refused', 'Wrong address', 'Safety concern', 'Other'] as CancelReason[]).map(r => (
                <button
                  key={r}
                  onClick={() => setCancelReason(r)}
                  className="px-3 py-2 rounded-full font-['Inter'] transition-colors"
                  style={{ fontSize: '12px', backgroundColor: cancelReason === r ? '#DC2626' : '#F3F4F6', color: cancelReason === r ? '#fff' : '#6B7280' }}
                >
                  {r}
                </button>
              ))}
            </div>

            <textarea
              value={cancelNote}
              onChange={e => setCancelNote(e.target.value)}
              placeholder="Add details (optional)"
              className="w-full p-3 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] font-['Inter'] text-[#1A1A1A] placeholder:text-[#D1D5DB] resize-none focus:outline-none focus:border-[#DC2626] mb-4"
              style={{ height: '80px', fontSize: '13px' }}
            />

            {!cancelEntireConfirm ? (
              <>
                <button
                  onClick={() => cancelClient(cancelSheet)}
                  disabled={!cancelReason}
                  className="w-full h-12 rounded-xl font-['Inter'] font-semibold border-[1.5px] mb-1 transition-opacity"
                  style={{ borderColor: '#DC2626', color: '#DC2626', opacity: cancelReason ? 1 : 0.4 }}
                >
                  Cancel This Client Only
                </button>
                <p className="font-['Inter'] text-[#9CA3AF] text-center mb-3" style={{ fontSize: '11px' }}>Route continues with remaining clients</p>
                <button onClick={() => setCancelEntireConfirm(true)} className="w-full font-['Inter'] font-medium text-[#DC2626] text-center py-2" style={{ fontSize: '14px' }}>
                  Cancel Entire Route
                </button>
              </>
            ) : (
              <div className="p-4 rounded-xl mb-3" style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA' }}>
                <p className="font-['Inter'] font-semibold text-[#DC2626] mb-2" style={{ fontSize: '13px' }}>Cancel the entire transportation shift?</p>
                <p className="font-['Inter'] text-[#DC2626] mb-3" style={{ fontSize: '12px' }}>All clients will be removed and the owner will be notified.</p>
                <div className="flex gap-3">
                  <button onClick={() => setCancelEntireConfirm(false)} className="flex-1 h-10 rounded-xl border border-[#E5E7EB] font-['Inter'] font-medium text-[#6B7280]" style={{ fontSize: '13px' }}>Go Back</button>
                  <button onClick={cancelEntireRoute} className="flex-1 h-10 rounded-xl bg-[#DC2626] text-white font-['Inter'] font-semibold" style={{ fontSize: '13px' }}>Confirm Cancel</button>
                </div>
              </div>
            )}

            <button onClick={() => { setCancelSheet(null); setCancelReason(null); setCancelNote(''); setCancelEntireConfirm(false); }} className="w-full font-['Inter'] font-medium text-[#6B7280] text-center py-2 mt-1" style={{ fontSize: '14px' }}>
              Go Back
            </button>
          </div>
        </div>
      )}
    </div>
  );
}