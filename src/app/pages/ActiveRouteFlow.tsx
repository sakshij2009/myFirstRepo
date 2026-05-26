import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, Car, MapPin, Navigation, Clock, Gauge, Route, CheckCircle2, Flag, Camera, Upload, X } from 'lucide-react';
import { useSafeNavigate } from '../hooks/useSafeNavigate';
import { useSearchParams, useParams } from 'react-router';
import { useSingleShift, formatTime, type ShiftPoint } from '../../hooks/useUserShifts';

type StopType = 'pickup' | 'visit' | 'dropoff';
type Phase = 'driving' | 'arrived';

interface StopConfig {
  type: StopType;
  label: string;
  driveLabel: string;
  arrivedLabel: string;
  address: string;
  scheduledTime: string;
  eta: string;
  etaKm: string;
  color: string;
  colorBg: string;
  colorLight: string;
}

const stops: StopConfig[] = [
  {
    type: 'pickup',
    label: 'Pickup',
    driveLabel: 'Drive to Pickup',
    arrivedLabel: 'At Pickup Location',
    address: '1234 Oak Street, Suite 5',
    scheduledTime: '2:00 PM',
    eta: '12 min',
    etaKm: '4.2 km',
    color: '#1F6F43',
    colorBg: '#DCFCE7',
    colorLight: '#F0FDF4',
  },
  {
    type: 'visit',
    label: 'Visit',
    driveLabel: 'Drive to Visit Location',
    arrivedLabel: 'At Visit Location',
    address: '500 City Hall Plaza',
    scheduledTime: '3:00 PM',
    eta: '18 min',
    etaKm: '8.5 km',
    color: '#1E5FA6',
    colorBg: '#DBEAFE',
    colorLight: '#EFF6FF',
  },
  {
    type: 'dropoff',
    label: 'Drop-off',
    driveLabel: 'Drive to Drop-off',
    arrivedLabel: 'At Drop-off Location',
    address: '789 Maple Avenue, Apt 3',
    scheduledTime: '6:00 PM',
    eta: '22 min',
    etaKm: '14.3 km',
    color: '#D85A30',
    colorBg: '#FEE2E2',
    colorLight: '#FEF2F2',
  },
];

const arrivalTimes = ['2:05 PM', '3:02 PM', '6:04 PM'];
const legDistances = [
  { from: 'Pickup', to: 'Visit', km: '8.5 km', time: '18 min' },
  { from: 'Visit', to: 'Drop-off', km: '14.3 km', time: '30 min' },
];

/** Build stop configs from real shiftPoints data */
function buildStopsFromShift(pts: ShiftPoint[]): StopConfig[] {
  if (!pts || pts.length === 0) return stops; // fallback to demo data

  const result: StopConfig[] = [];

  pts.forEach((pt, i) => {
    // Pickup stop
    result.push({
      type: 'pickup',
      label: pt.name ? `Pickup – ${pt.name}` : 'Pickup',
      driveLabel: pt.name ? `Drive to Pickup – ${pt.name}` : 'Drive to Pickup',
      arrivedLabel: pt.name ? `At Pickup – ${pt.name}` : 'At Pickup Location',
      address: pt.pickupLocation || '—',
      scheduledTime: pt.pickupTime ? formatTime(pt.pickupTime) : '',
      eta: '—',
      etaKm: '—',
      color: '#1F6F43',
      colorBg: '#DCFCE7',
      colorLight: '#F0FDF4',
    });

    // Visit stop (if present)
    if (pt.visitLocation) {
      result.push({
        type: 'visit',
        label: 'Visit',
        driveLabel: 'Drive to Visit Location',
        arrivedLabel: 'At Visit Location',
        address: pt.visitLocation,
        scheduledTime: pt.visitStartTime ? formatTime(pt.visitStartTime) : '',
        eta: '—',
        etaKm: '—',
        color: '#1E5FA6',
        colorBg: '#DBEAFE',
        colorLight: '#EFF6FF',
      });
    }

    // Drop-off stop (add for each client, or just the last one if all share)
    result.push({
      type: 'dropoff',
      label: pt.name ? `Drop-off – ${pt.name}` : 'Drop-off',
      driveLabel: pt.name ? `Drive to Drop-off – ${pt.name}` : 'Drive to Drop-off',
      arrivedLabel: pt.name ? `At Drop-off – ${pt.name}` : 'At Drop-off Location',
      address: pt.dropLocation || '—',
      scheduledTime: pt.dropTime ? formatTime(pt.dropTime) : '',
      eta: '—',
      etaKm: '—',
      color: '#D85A30',
      colorBg: '#FEE2E2',
      colorLight: '#FEF2F2',
    });
  });

  return result.length ? result : stops;
}

export function ActiveRouteFlow() {
  const navigate = useSafeNavigate();
  const { id: shiftDocId } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const vehicle = searchParams.get('vehicle') || 'personal';
  const { shift } = useSingleShift(shiftDocId);

  // Build dynamic stops from real shift data; fall back to demo stops
  const activeStops = buildStopsFromShift(shift?.shiftPoints || []);

  const [currentStop, setCurrentStop] = useState(0);
  const [phase, setPhase] = useState<Phase>('driving');
  const [routeComplete, setRouteComplete] = useState(false);
  const [totalKm, setTotalKm] = useState(0.0);
  const [speed, setSpeed] = useState(32);
  const [elapsed, setElapsed] = useState(0);
  const [visitDuration, setVisitDuration] = useState(0);
  const [endReading, setEndReading] = useState('');
  const [receiptPhoto, setReceiptPhoto] = useState<string | null>(null);
  const [damagePhoto, setDamagePhoto] = useState<string | null>(null);
  const [witnessName, setWitnessName] = useState('');
  const [shiftReport, setShiftReport] = useState('');
  const [driveComments, setDriveComments] = useState('');
  const [attempted, setAttempted] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Simulate live km tracking
  useEffect(() => {
    if (routeComplete) return;
    if (phase !== 'driving') return;
    const interval = setInterval(() => {
      setTotalKm((k) => +(k + 0.1).toFixed(1));
      setSpeed(28 + Math.floor(Math.random() * 15));
      setElapsed((e) => e + 1);
    }, 2000);
    return () => clearInterval(interval);
  }, [phase, routeComplete]);

  // Simulate visit timer
  useEffect(() => {
    if (currentStop !== 1 || phase !== 'arrived') return;
    const interval = setInterval(() => {
      setVisitDuration((d) => d + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [currentStop, phase]);

  const handleArrive = useCallback(() => {
    setPhase('arrived');
  }, []);

  const handleComplete = useCallback(() => {
    if (currentStop < activeStops.length - 1) {
      setCurrentStop((s) => s + 1);
      setPhase('driving');
      setElapsed(0);
    } else {
      setRouteComplete(true);
    }
  }, [currentStop, activeStops.length]);

  const activeStop = activeStops[currentStop];

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    if (m < 1) return `${s}s`;
    return `${m}m ${s.toString().padStart(2, '0')}s`;
  };

  const formatVisitDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m} min`;
  };

  // Route summary
  if (routeComplete) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#F8F8F6' }}>
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div className="px-5 pt-4 pb-3">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate(-1)} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[#F3F4F6] -ml-1">
                <ChevronLeft className="w-5 h-5 text-[#1A1A1A]" strokeWidth={2} />
              </button>
              <h1 className="font-['Poppins'] font-semibold text-[#1A1A1A]" style={{ fontSize: '18px' }}>Complete Shift</h1>
            </div>
            <p className="font-['Inter'] text-[#9CA3AF] ml-12" style={{ fontSize: '13px' }}>Thu, 20 Mar · 2:00 – 6:00 PM</p>
          </div>
        </div>

        <div className="px-5 pt-6 pb-36">
          {/* Success animation */}
          <div className="flex flex-col items-center mb-6">
            <div className="w-16 h-16 rounded-full bg-[#1F6F43] flex items-center justify-center mb-3" style={{ animation: 'scaleIn 0.4s ease-out' }}>
              <CheckCircle2 className="w-7 h-7 text-white" strokeWidth={2} />
            </div>
            <h2 className="font-['Poppins'] font-semibold text-[#1F6F43]" style={{ fontSize: '20px' }}>Route Complete!</h2>
            <p className="font-['Inter'] text-[#9CA3AF]" style={{ fontSize: '14px' }}>All 3 stops completed</p>
          </div>

          {/* Route Summary */}
          <div className="bg-white p-5 mb-4" style={{ borderRadius: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <h3 className="font-['Poppins'] font-semibold text-[#1A1A1A] mb-4" style={{ fontSize: '14px' }}>Route Summary</h3>

            {/* Timeline */}
            <div className="relative mb-4">
              <div className="absolute left-[7px] top-[8px]" style={{ width: '2px', height: 'calc(100% - 16px)', backgroundColor: '#1F6F43', opacity: 0.3 }} />
              {activeStops.map((stop, i) => (
                <div key={`${stop.type}-${i}`} className="relative flex items-start gap-3" style={{ paddingBottom: i < activeStops.length - 1 ? '16px' : '0' }}>
                  <div className="relative z-10 mt-[4px]">
                    <div className="w-4 h-4 rounded-full flex items-center justify-center" style={{ backgroundColor: stop.colorBg }}>
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: stop.color }} />
                    </div>
                  </div>
                  <div className="flex-1 flex items-center justify-between">
                    <div>
                      <span className="font-['Inter'] font-medium text-[#1A1A1A]" style={{ fontSize: '13px' }}>
                        {stop.label} · {stop.address}
                      </span>
                      <p className="font-['Inter'] text-[#9CA3AF]" style={{ fontSize: '12px' }}>
                        {stop.scheduledTime || '—'}
                      </p>
                    </div>
                    <CheckCircle2 className="w-4 h-4 text-[#1F6F43] shrink-0" strokeWidth={2} />
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-[#F3F4F6] pt-4">
              <div className="grid grid-cols-3 text-center gap-2">
                <div>
                  <p className="font-['Inter'] text-[#9CA3AF] mb-1" style={{ fontSize: '11px' }}>Total Distance</p>
                  <p className="font-['Poppins'] font-semibold text-[#1A1A1A]" style={{ fontSize: '20px' }}>22.8 km</p>
                </div>
                <div>
                  <p className="font-['Inter'] text-[#9CA3AF] mb-1" style={{ fontSize: '11px' }}>Drive Time</p>
                  <p className="font-['Poppins'] font-semibold text-[#1A1A1A]" style={{ fontSize: '20px' }}>48 min</p>
                </div>
                <div>
                  <p className="font-['Inter'] text-[#9CA3AF] mb-1" style={{ fontSize: '11px' }}>Stops</p>
                  <p className="font-['Poppins'] font-semibold text-[#1F6F43]" style={{ fontSize: '20px' }}>{activeStops.length} of {activeStops.length}</p>
                </div>
              </div>
            </div>

            <div className="border-t border-[#F3F4F6] mt-4 pt-3">
              {activeStops.slice(0, -1).map((stop, i) => (
                <p key={`leg-${i}`} className="font-['Inter'] text-[#6B7280] mb-1" style={{ fontSize: '13px' }}>
                  {stop.label.split('–')[0].trim()} → {activeStops[i + 1].label.split('–')[0].trim()}
                </p>
              ))}
            </div>
          </div>

          {/* End Meter Reading */}
          {vehicle === 'office' && (
            <div className="bg-white p-5 mb-4" style={{ borderRadius: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <h3 className="font-['Poppins'] font-semibold text-[#1A1A1A] mb-3" style={{ fontSize: '14px' }}>End Meter Reading</h3>
              <input
                type="number"
                inputMode="numeric"
                placeholder="Enter reading"
                value={endReading}
                onChange={(e) => setEndReading(e.target.value)}
                className="w-full font-['Inter'] text-[#1A1A1A] bg-[#F9FAFB] outline-none placeholder:text-[#D1D5DB]"
                style={{ height: '52px', padding: '0 16px', fontSize: '15px', border: '1.5px solid #E5E7EB', borderRadius: '12px' }}
              />
              <p className="font-['Inter'] text-[#9CA3AF] mt-2" style={{ fontSize: '11px' }}>Optional — for vehicle odometer verification</p>
            </div>
          )}

          {/* Receipt Upload */}
          <div className="bg-white p-5 mb-4" style={{ borderRadius: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <h3 className="font-['Poppins'] font-semibold text-[#1A1A1A] mb-3" style={{ fontSize: '14px' }}>Fuel & Mileage Receipts</h3>
            {receiptPhoto ? (
              <div className="relative inline-block mb-2">
                <img src={receiptPhoto} alt="Receipt" className="object-cover" style={{ width: '100%', height: '80px', borderRadius: '12px' }} />
                <button
                  onClick={() => setReceiptPhoto(null)}
                  className="absolute top-2 right-2 w-5 h-5 bg-white rounded-full flex items-center justify-center"
                >
                  <X className="w-3 h-3 text-[#FF0000]" strokeWidth={2} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = 'image/*';
                  input.capture = 'environment';
                  input.onchange = (e: any) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (ev) => setReceiptPhoto(ev.target?.result as string);
                      reader.readAsDataURL(file);
                    }
                  };
                  input.click();
                }}
                className="w-full flex flex-col items-center justify-center gap-2 py-5"
                style={{ border: '2px dashed #D1D5DB', borderRadius: '12px', backgroundColor: '#F9FAFB' }}
              >
                <Upload className="w-6 h-6 text-[#9CA3AF]" strokeWidth={1.5} />
                <span className="font-['Inter'] text-[#6B7280]" style={{ fontSize: '13px' }}>Tap to upload receipt</span>
                <span className="font-['Inter'] text-[#D1D5DB]" style={{ fontSize: '11px' }}>JPEG, PNG, or PDF · Max 10MB</span>
              </button>
            )}
          </div>

          {/* Damage Upload */}
          <div className="bg-white p-5 mb-4" style={{ borderRadius: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <h3 className="font-['Poppins'] font-semibold text-[#1A1A1A] mb-1" style={{ fontSize: '14px' }}>Vehicle Condition Photo</h3>
            <p className="font-['Inter'] text-[#9CA3AF] mb-3" style={{ fontSize: '11px' }}>Take a live photo of the vehicle after your shift</p>
            {damagePhoto ? (
              <div className="relative mb-2">
                <img src={damagePhoto} alt="Vehicle" className="w-full object-cover" style={{ height: '140px', borderRadius: '12px' }} />
                <button
                  onClick={() => setDamagePhoto(null)}
                  className="absolute top-2 right-2 w-6 h-6 bg-[#1A1A1A] rounded-full flex items-center justify-center"
                >
                  <X className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = 'image/*';
                  input.capture = 'environment';
                  input.onchange = (e: any) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (ev) => setDamagePhoto(ev.target?.result as string);
                      reader.readAsDataURL(file);
                    }
                  };
                  input.click();
                }}
                className="w-full flex flex-col items-center justify-center gap-2 py-6"
                style={{ border: '2px dashed #D1D5DB', borderRadius: '12px', backgroundColor: '#FAFAFA' }}
              >
                <div className="w-10 h-10 rounded-full bg-[#F3F4F6] flex items-center justify-center">
                  <Camera className="w-5 h-5 text-[#9CA3AF]" strokeWidth={1.8} />
                </div>
                <span className="font-['Inter'] font-medium text-[#4B5563]" style={{ fontSize: '13px' }}>Take live photo</span>
                <span className="font-['Inter'] text-[#EF4444]" style={{ fontSize: '11px' }}>Gallery not permitted — live camera only</span>
              </button>
            )}
          </div>

          {/* Witness Name */}
          <div className="bg-white p-5 mb-4" style={{ borderRadius: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <h3 className="font-['Poppins'] font-semibold text-[#1A1A1A] mb-1" style={{ fontSize: '14px' }}>Witness</h3>
            <p className="font-['Inter'] text-[#9CA3AF] mb-3" style={{ fontSize: '11px' }}>Optional — name of person who can verify vehicle condition</p>
            <input
              type="text"
              placeholder="Full name of witness"
              value={witnessName}
              onChange={(e) => setWitnessName(e.target.value)}
              className="w-full font-['Inter'] text-[#1A1A1A] bg-white outline-none placeholder:text-[#D1D5DB]"
              style={{ height: '48px', padding: '0 16px', fontSize: '14px', border: '1.5px solid #E5E7EB', borderRadius: '12px' }}
            />
          </div>

          {/* Shift Report */}
          <div className="bg-white p-5 mb-4" style={{ borderRadius: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <label className="block font-['Inter'] font-semibold text-[#9CA3AF] mb-3 tracking-wider" style={{ fontSize: '11px', textTransform: 'uppercase' as const }}>
              Shift report <span className="text-[#EF4444]">*</span>
            </label>
            <textarea
              rows={4}
              placeholder="Summarise what happened during this shift…"
              value={shiftReport}
              onChange={(e) => setShiftReport(e.target.value)}
              className="w-full font-['Inter'] text-[#1A1A1A] bg-white outline-none resize-none placeholder:text-[#D1D5DB]"
              style={{
                padding: '14px 16px',
                fontSize: '14px',
                border: attempted && !shiftReport.trim() ? '1px solid #EF4444' : '1.5px solid #E5E7EB',
                borderRadius: '12px',
                lineHeight: '1.6',
              }}
            />
            {attempted && !shiftReport.trim() && (
              <p className="font-['Inter'] text-[#EF4444] mt-1.5" style={{ fontSize: '11px' }}>
                Shift report is required before submitting.
              </p>
            )}
          </div>

          {/* Drive Comments */}
          <div className="bg-white p-5 mb-4" style={{ borderRadius: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <label className="block font-['Inter'] font-semibold text-[#9CA3AF] mb-3 tracking-wider" style={{ fontSize: '11px', textTransform: 'uppercase' as const }}>
              Drive comments
            </label>
            <textarea
              rows={3}
              placeholder="Notes about the route, delays, or incidents…"
              value={driveComments}
              onChange={(e) => setDriveComments(e.target.value)}
              className="w-full font-['Inter'] text-[#1A1A1A] bg-white outline-none resize-none placeholder:text-[#D1D5DB]"
              style={{
                padding: '14px 16px',
                fontSize: '14px',
                border: '1.5px solid #E5E7EB',
                borderRadius: '12px',
                lineHeight: '1.6',
              }}
            />
          </div>
        </div>

        {/* Submit */}
        <div className="fixed bottom-[88px] left-0 right-0 px-5 pb-4 pt-3" style={{ background: 'linear-gradient(to top, #F8F8F6 70%, transparent)' }}>
          {submitted ? (
            <div className="flex flex-col items-center gap-1.5 py-2">
              <div
                className="inline-flex items-center gap-2 px-6 font-['Inter'] font-semibold text-white"
                style={{ height: '40px', backgroundColor: '#1F6F43', borderRadius: '20px', fontSize: '14px' }}
              >
                <CheckCircle2 className="w-4 h-4" strokeWidth={2} />
                Report Submitted
              </div>
              <span className="font-['Inter'] text-[#9CA3AF]" style={{ fontSize: '11px' }}>
                Submitted on Mar 20, 2026 at 6:12 PM
              </span>
            </div>
          ) : (
            <>
              <button
                disabled={!shiftReport.trim()}
                onClick={() => {
                  setAttempted(true);
                  if (!shiftReport.trim()) return;
                  setSubmitted(true);
                }}
                className="w-full text-white font-['Poppins'] font-semibold transition-opacity disabled:opacity-40"
                style={{ height: '56px', backgroundColor: '#1F6F43', borderRadius: '14px', fontSize: '16px', boxShadow: shiftReport.trim() ? '0 4px 12px rgba(31,111,67,0.2)' : 'none' }}
              >
                Submit Report
              </button>
            </>
          )}
        </div>

        <style>{`
          @keyframes scaleIn {
            from { transform: scale(0.5); opacity: 0; }
            to { transform: scale(1); opacity: 1; }
          }
        `}</style>
      </div>
    );
  }

  // Active route stepper
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F8F8F6' }}>
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <div className="px-5 pt-4 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate(-1)} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[#F3F4F6] -ml-1">
                <ChevronLeft className="w-5 h-5 text-[#1A1A1A]" strokeWidth={2} />
              </button>
              <div>
                <h1 className="font-['Poppins'] font-semibold text-[#1A1A1A]" style={{ fontSize: '18px' }}>Complete Shift</h1>
                <p className="font-['Inter'] text-[#9CA3AF]" style={{ fontSize: '13px' }}>Thu, 20 Mar · 2:00 – 6:00 PM</p>
              </div>
            </div>
            {/* Live km pill */}
            <div className="px-3 py-1 rounded-full font-['Inter'] font-semibold" style={{ backgroundColor: '#F0FDF4', color: '#1F6F43', fontSize: '12px' }}>
              {totalKm.toFixed(1)} km
            </div>
          </div>

          {/* Progress bar */}
          <div className="flex items-center justify-between mt-4 px-2">
            {activeStops.map((stop, i) => (
              <div key={`pb-${stop.type}-${i}`} className="flex items-center" style={{ flex: i < activeStops.length - 1 ? 1 : 'none' }}>
                {/* Circle */}
                <div className="flex flex-col items-center">
                  <div
                    className="flex items-center justify-center rounded-full"
                    style={{
                      width: '28px',
                      height: '28px',
                      backgroundColor: i < currentStop ? '#1F6F43' : i === currentStop ? '#1F6F43' : 'transparent',
                      border: i > currentStop ? '2px solid #D1D5DB' : 'none',
                      animation: i === currentStop && phase === 'driving' ? 'pulse 2s infinite' : 'none',
                    }}
                  >
                    {i < currentStop ? (
                      <CheckCircle2 className="w-3 h-3 text-white" strokeWidth={3} />
                    ) : i === currentStop ? (
                      <div className="w-2 h-2 rounded-full bg-white" />
                    ) : null}
                  </div>
                  <span
                    className="font-['Inter'] font-medium mt-1"
                    style={{
                      fontSize: '10px',
                      color: i === currentStop ? '#1F6F43' : i < currentStop ? '#6B7280' : '#D1D5DB',
                    }}
                  >
                    {stop.label}
                  </span>
                </div>
                {/* Connecting line */}
                {i < 2 && (
                  <div
                    className="flex-1 mx-2"
                    style={{
                      height: '2px',
                      marginBottom: '18px',
                      backgroundColor: i < currentStop ? '#1F6F43' : 'transparent',
                      borderTop: i >= currentStop ? '2px dashed #D1D5DB' : 'none',
                      ...(i === currentStop && phase === 'driving'
                        ? { borderTop: '2px dashed #1F6F43', animation: 'dashMove 1s linear infinite' }
                        : {}),
                    }}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="px-5 pt-4 pb-36">
        {/* Completed stops */}
        {stops.slice(0, currentStop).map((stop, i) => (
          <div
            key={stop.type}
            className="flex items-center gap-3 p-3.5 mb-3"
            style={{
              borderRadius: '12px',
              backgroundColor: '#F9FAFB',
              borderLeft: `3px solid ${stop.color}`,
            }}
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: stop.color }} strokeWidth={2} />
            <div className="flex-1 min-w-0">
              <span className="font-['Inter'] font-semibold" style={{ fontSize: '13px', color: stop.color }}>
                {stop.label} Complete
              </span>
              <span className="font-['Inter'] text-[#9CA3AF] ml-2" style={{ fontSize: '12px' }}>
                {stop.scheduledTime || ''} {stop.address.split(',')[0] ? `· ${stop.address.split(',')[0]}` : ''}
              </span>
            </div>
            <span className="font-['Inter'] text-[#6B7280] shrink-0" style={{ fontSize: '12px' }}>
              {stop.etaKm}
            </span>
          </div>
        ))}

        {/* Active step card */}
        <div className="bg-white p-5 mb-4" style={{ borderRadius: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          {/* Card header */}
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: activeStop.color }}>
              {phase === 'driving' ? (
                <Car className="w-5 h-5 text-white" strokeWidth={2} />
              ) : (
                <MapPin className="w-5 h-5 text-white" strokeWidth={2} />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-['Poppins'] font-semibold text-[#1A1A1A]" style={{ fontSize: '16px' }}>
                {phase === 'driving' ? activeStop.driveLabel : activeStop.arrivedLabel}
              </h3>
              <p className="font-['Inter'] text-[#6B7280]" style={{ fontSize: '14px' }}>{activeStop.address}</p>
              {phase === 'driving' && (
                <p className="font-['Inter'] font-medium mt-0.5" style={{ fontSize: '13px', color: activeStop.color }}>
                  ETA: {activeStop.eta} · {activeStop.etaKm}
                </p>
              )}
              {phase === 'arrived' && (
                <p className="font-['Inter'] font-medium mt-0.5" style={{ fontSize: '13px', color: activeStop.color }}>
                  {activeStop.scheduledTime ? `Scheduled: ${activeStop.scheduledTime}` : 'Arrived'}
                </p>
              )}
            </div>
            <span className="font-['Inter'] text-[#9CA3AF] shrink-0" style={{ fontSize: '12px' }}>{activeStop.scheduledTime}</span>
          </div>

          {phase === 'driving' ? (
            <>
              {/* Map placeholder */}
              <div
                className="w-full flex flex-col items-center justify-center mb-4 relative overflow-hidden"
                style={{ height: '200px', borderRadius: '12px', backgroundColor: '#E8F0E8' }}
              >
                <div className="absolute inset-0 opacity-20" style={{
                  backgroundImage: 'linear-gradient(90deg, #ccc 1px, transparent 1px), linear-gradient(180deg, #ccc 1px, transparent 1px)',
                  backgroundSize: '30px 30px',
                }} />
                {/* Turn-by-turn bar */}
                <div
                  className="absolute top-3 left-3 right-3 flex items-center gap-2 px-3.5 py-2"
                  style={{ backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: '8px' }}
                >
                  <Navigation className="w-3.5 h-3.5 text-white" strokeWidth={2} />
                  <span className="font-['Inter'] font-semibold text-white" style={{ fontSize: '13px' }}>
                    In 200m, turn right onto Oak Street
                  </span>
                </div>
                {/* Center pin */}
                <div className="relative z-10 flex flex-col items-center">
                  <MapPin className="w-8 h-8" style={{ color: activeStop.color }} strokeWidth={2} fill={activeStop.colorBg} />
                  <p className="font-['Inter'] font-medium text-[#6B7280] mt-2" style={{ fontSize: '12px' }}>Live map view</p>
                </div>
                {/* Blue pulsing dot (staff) */}
                <div className="absolute bottom-8 left-12">
                  <div className="w-3 h-3 rounded-full bg-[#3B82F6]" style={{ boxShadow: '0 0 0 4px rgba(59,130,246,0.25)', animation: 'pulse 2s infinite' }} />
                </div>
              </div>

              {/* Open navigation */}
              <button
                onClick={() => window.open(`https://maps.google.com/?q=${encodeURIComponent(activeStop.address)}`, '_blank')}
                className="w-full flex items-center justify-center gap-2 mb-2 text-white font-['Inter'] font-semibold"
                style={{ height: '48px', backgroundColor: activeStop.color, borderRadius: '12px', fontSize: '14px' }}
              >
                <Navigation className="w-5 h-5" strokeWidth={2} />
                Open Full Navigation
              </button>
              <p className="font-['Inter'] text-[#9CA3AF] text-center mb-4" style={{ fontSize: '11px' }}>Or use the mini map above</p>

              {/* Live tracking strip */}
              <div className="flex items-center justify-between p-3" style={{ backgroundColor: '#F9FAFB', borderRadius: '10px' }}>
                <div className="flex items-center gap-1.5">
                  <Gauge className="w-3.5 h-3.5 text-[#6B7280]" strokeWidth={2} />
                  <span className="font-['Inter'] font-medium text-[#1A1A1A]" style={{ fontSize: '12px' }}>{speed} km/h</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Route className="w-3.5 h-3.5 text-[#6B7280]" strokeWidth={2} />
                  <span className="font-['Inter'] font-medium text-[#1A1A1A]" style={{ fontSize: '12px' }}>{totalKm.toFixed(1)} km</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#6B7280]" strokeWidth={2} />
                  <span className="font-['Inter'] font-medium text-[#1A1A1A]" style={{ fontSize: '12px' }}>{formatDuration(elapsed)}</span>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Location confirmation */}
              <div className="flex items-center gap-3 p-4 mb-4" style={{ backgroundColor: activeStop.colorLight, borderRadius: '12px' }}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: activeStop.color }}>
                  <CheckCircle2 className="w-4 h-4 text-white" strokeWidth={2.5} />
                </div>
                <div>
                  <p className="font-['Inter'] font-semibold" style={{ fontSize: '14px', color: activeStop.color }}>Location captured</p>
                  <p className="font-['Inter'] text-[#9CA3AF]" style={{ fontSize: '11px' }}>43.6532° N, 79.3832° W</p>
                </div>
              </div>

              {/* Mini map */}
              <div className="w-full mb-4 flex items-center justify-center" style={{ height: '80px', borderRadius: '8px', backgroundColor: '#E8F0E8' }}>
                <MapPin className="w-5 h-5" style={{ color: activeStop.color }} strokeWidth={2} />
              </div>

              {/* Client info */}
              {(activeStop.type === 'pickup' || activeStop.type === 'dropoff') && (
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-full bg-[#F3F4F6] flex items-center justify-center font-['Inter'] font-semibold text-[#6B7280]" style={{ fontSize: '11px' }}>
                    MC
                  </div>
                  <div>
                    <p className="font-['Inter'] font-semibold text-[#1A1A1A]" style={{ fontSize: '14px' }}>Client: Michael Chen</p>
                    <p className="font-['Inter'] text-[#6B7280]" style={{ fontSize: '13px' }}>
                      {activeStop.type === 'pickup' ? "Confirm you've picked up the client" : 'Confirm client drop-off'}
                    </p>
                  </div>
                </div>
              )}

              {activeStop.type === 'visit' && (
                <div>
                  <p className="font-['Inter'] font-medium text-[#1A1A1A] mb-1" style={{ fontSize: '14px' }}>Client visit in progress</p>
                  <p className="font-['Inter'] font-medium mb-1" style={{ fontSize: '14px', color: activeStop.color }}>
                    Visit duration: {formatVisitDuration(visitDuration)}
                  </p>
                  <p className="font-['Inter'] text-[#9CA3AF]" style={{ fontSize: '12px' }}>Any visit notes can be added to your shift report</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Upcoming stops */}
        {phase === 'driving' && currentStop < 2 && (
          <div className="mb-4">
            {stops.slice(currentStop + 1).map((stop) => (
              <div key={stop.type} className="flex items-center gap-3 py-2.5">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#D1D5DB' }} />
                <span className="font-['Inter'] text-[#D1D5DB]" style={{ fontSize: '13px' }}>
                  {stop.label} · {stop.address} · {stop.scheduledTime}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom action bar */}
      <div className="fixed bottom-[88px] left-0 right-0 px-5 pb-4 pt-3" style={{ background: 'linear-gradient(to top, #F8F8F6 70%, transparent)' }}>
        {phase === 'driving' ? (
          <div>
            <button
              onClick={handleArrive}
              className="w-full font-['Poppins'] font-semibold"
              style={{
                height: '54px',
                border: `2px solid ${activeStop.color}`,
                borderRadius: '14px',
                fontSize: '15px',
                color: activeStop.color,
                backgroundColor: 'transparent',
              }}
            >
              I've Arrived at {activeStop.label}
            </button>
            <p className="font-['Inter'] text-[#9CA3AF] text-center mt-2" style={{ fontSize: '11px' }}>
              Tap when you reach the {activeStop.label.toLowerCase()} location
            </p>
          </div>
        ) : (
          <button
            onClick={handleComplete}
            className="w-full text-white font-['Poppins'] font-semibold"
            style={{
              height: '54px',
              backgroundColor: activeStop.color,
              borderRadius: '14px',
              fontSize: '15px',
              boxShadow: `0 4px 12px ${activeStop.color}33`,
            }}
          >
            {currentStop < 2 ? (
              <>{activeStop.label} Complete — Start Driving to {stops[currentStop + 1].label} ➜</>
            ) : (
              <>Drop-off Complete ✓</>
            )}
          </button>
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
        @keyframes dashMove {
          from { background-position: 0 0; }
          to { background-position: 20px 0; }
        }
      `}</style>
    </div>
  );
}