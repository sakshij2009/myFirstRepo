import { ChevronLeft, Phone, MapPin, Info, ClipboardList, AlertTriangle, ChevronRight, Armchair, Loader2 } from 'lucide-react';
import { useSafeNavigate } from '../hooks/useSafeNavigate';
import { useState } from 'react';
import { useParams } from 'react-router';
import { useSingleShift, formatTime } from '../../hooks/useUserShifts';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';

const cardStyle = { borderRadius: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' };

export function TransportationShiftDetail() {
  const navigate = useSafeNavigate();
  const { id: shiftDocId } = useParams<{ id: string }>();
  const { shift, loading } = useSingleShift(shiftDocId);

  // Derive real values from shift
  const clientName = shift?.clientName || 'Client';
  const pts = shift?.shiftPoints || [];
  const startTime = formatTime(shift?.startTime || '');
  const endTime = formatTime(shift?.endTime || '');
  const timeRange = startTime && endTime ? `${startTime} – ${endTime}` : '';

  // Date label from dateKey_iso
  const dateLabel = (() => {
    const iso = shift?.dateKey_iso;
    if (!iso) return '';
    const [y, m, d] = String(iso).split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric',
    });
  })();
  const headerSubtitle = dateLabel && timeRange ? `${dateLabel} · ${timeRange}` : timeRange;

  // Route stops from shiftPoints
  const stops = pts.length > 0
    ? [
        {
          label: 'Pickup',
          address: pts[0]?.pickupLocation || '—',
          time: pts[0]?.pickupTime ? formatTime(pts[0].pickupTime) : startTime,
          dotColor: '#1F6F43', dotBg: '#DCFCE7',
        },
        ...(pts[0]?.visitLocation ? [{
          label: 'Visit Location',
          address: pts[0].visitLocation,
          time: pts[0].visitStartTime ? `${formatTime(pts[0].visitStartTime)} – ${formatTime(pts[0].visitEndTime || '')}` : '',
          dotColor: '#185FA5', dotBg: '#DBEAFE',
        }] : []),
        {
          label: 'Drop-off',
          address: pts[pts.length - 1]?.dropLocation || '—',
          time: pts[pts.length - 1]?.dropTime ? formatTime(pts[pts.length - 1].dropTime!) : endTime,
          dotColor: '#B91C1C', dotBg: '#FEE2E2',
        },
      ]
    : [
        { label: 'Pickup', address: '—', time: startTime, dotColor: '#1F6F43', dotBg: '#DCFCE7' },
        { label: 'Drop-off', address: '—', time: endTime, dotColor: '#B91C1C', dotBg: '#FEE2E2' },
      ];

  // Write clockIn when staff starts the transportation shift
  const handleChooseVehicle = async () => {
    if (shiftDocId) {
      try {
        await updateDoc(doc(db, 'shifts', shiftDocId), {
          clockIn: serverTimestamp(),
          shiftConfirmed: true,
        });
      } catch (e) {
        console.error('[TransportationShiftDetail] Failed to write clockIn:', e);
      }
    }
    navigate(`/shifts/${shiftDocId}/vehicle-check`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-7 h-7 text-[#1F6F43] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F8F8F6' }}>
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <div className="px-5 pt-4 pb-3">
          <div className="flex items-center gap-3 mb-1">
            <button onClick={() => navigate(-1)} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[#F3F4F6] transition-colors -ml-1">
              <ChevronLeft className="w-5 h-5 text-[#1A1A1A]" strokeWidth={2} />
            </button>
            <h1 className="font-['Poppins'] font-semibold text-[#1A1A1A]" style={{ fontSize: '18px' }}>Transportation Shift</h1>
          </div>
          {headerSubtitle && (
            <p className="font-['Inter'] text-[#9CA3AF] ml-11" style={{ fontSize: '13px' }}>{headerSubtitle}</p>
          )}
        </div>
      </div>

      <div className="px-5 pt-5 pb-32">
        {/* SECTION 1: Client Info Card */}
        <div className="bg-white p-5 mb-4" style={cardStyle}>
          <div className="flex items-start justify-between">
            <div>
              <p className="font-['Poppins'] font-semibold text-[#1A1A1A]" style={{ fontSize: '16px' }}>{clientName}</p>
              {pts.map((pt, i) => pt.name && (
                <div key={i} className="flex items-center gap-1.5 mt-1.5">
                  <Armchair className="w-3.5 h-3.5 text-[#6B7280]" />
                  <span className="font-['Inter'] font-medium text-[#1A1A1A] px-2.5 py-1" style={{ fontSize: '12px', backgroundColor: '#F3F4F6', borderRadius: '8px' }}>
                    {pt.name}{pt.seatType ? ` · ${pt.seatType}` : ''}
                  </span>
                </div>
              ))}
              {pts.length === 0 && (
                <p className="font-['Inter'] text-[#9CA3AF] mt-1" style={{ fontSize: '13px' }}>Transportation shift</p>
              )}
            </div>
            <span className="px-3.5 py-1 rounded-full font-['Inter'] font-semibold" style={{ backgroundColor: '#FFF8E1', color: '#92600A', fontSize: '11px' }}>Transportation</span>
          </div>
        </div>

        {/* SECTION 2: Contacts Card */}
        <div className="bg-white p-5 mb-4" style={cardStyle}>
          <h3 className="font-['Poppins'] font-semibold text-[#1A1A1A] mb-4" style={{ fontSize: '14px' }}>Contacts</h3>

          {/* Caseworker */}
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 font-['Inter'] font-semibold" style={{ backgroundColor: '#F0FDF4', color: '#1F6F43', fontSize: '14px' }}>JR</div>
            <div className="flex-1 min-w-0">
              <p className="font-['Inter'] font-semibold text-[#1A1A1A]" style={{ fontSize: '14px' }}>Janet Robinson</p>
              <p className="font-['Inter'] text-[#9CA3AF]" style={{ fontSize: '12px' }}>Caseworker</p>
            </div>
            <button className="w-10 h-10 rounded-full bg-[#F0FDF4] flex items-center justify-center flex-shrink-0 active:bg-[#DCFCE7]">
              <Phone className="w-[18px] h-[18px] text-[#1F6F43]" strokeWidth={2} />
            </button>
          </div>

          <div className="border-t border-[#F3F4F6] my-3" />

          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 font-['Inter'] font-semibold" style={{ backgroundColor: '#EBF5FF', color: '#1E5FA6', fontSize: '14px' }}>DL</div>
            <div className="flex-1 min-w-0">
              <p className="font-['Inter'] font-semibold text-[#1A1A1A]" style={{ fontSize: '14px' }}>David Lee</p>
              <p className="font-['Inter'] text-[#9CA3AF]" style={{ fontSize: '12px' }}>Intake Worker</p>
            </div>
            <button className="w-10 h-10 rounded-full bg-[#F0FDF4] flex items-center justify-center flex-shrink-0 active:bg-[#DCFCE7]">
              <Phone className="w-[18px] h-[18px] text-[#1F6F43]" strokeWidth={2} />
            </button>
          </div>

          <div className="border-t border-[#F3F4F6] my-3" />

          <div className="flex items-center gap-2 px-3.5" style={{ backgroundColor: '#FFF8E1', borderRadius: '10px', height: '48px' }}>
            <Phone className="w-4 h-4 text-[#92600A] flex-shrink-0" strokeWidth={2} />
            <span className="font-['Inter'] font-semibold text-[#92600A] flex-1 min-w-0" style={{ fontSize: '13px' }}>Weekend & After-Hours</span>
            <div className="flex flex-col items-end flex-shrink-0">
              <a href="tel:8259823256" className="font-['Inter'] font-semibold text-[#92600A]" style={{ fontSize: '12px' }}>(825) 982-3256</a>
              <a href="tel:8255223256" className="font-['Inter'] text-[#92600A]" style={{ fontSize: '11px' }}>(825) 522-3256</a>
            </div>
          </div>

          <div className="border-t border-[#F3F4F6] my-3" />

          <div className="flex items-start gap-1.5 mt-1">
            <Info className="w-3 h-3 text-[#9CA3AF] flex-shrink-0 mt-0.5" />
            <p className="font-['Inter'] text-[#9CA3AF]" style={{ fontSize: '11px' }}>Caseworker & Intake Worker are unavailable on weekends. Use the emergency line above.</p>
          </div>
        </div>

        {/* SECTION 3: Intake Form Access Card */}
        <div className="bg-white p-5 mb-4" style={cardStyle}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-[#1F6F43]" />
              <h3 className="font-['Poppins'] font-semibold text-[#1A1A1A]" style={{ fontSize: '14px' }}>Intake Form</h3>
            </div>
            <button
              onClick={() => navigate(`/shifts/${shiftDocId}/intake-form`)}
              className="flex items-center gap-0.5 font-['Inter'] font-medium text-[#1F6F43] active:opacity-70"
              style={{ fontSize: '13px' }}
            >
              View Full Form <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex justify-between py-2.5 border-b border-[#F3F4F6]">
            <span className="font-['Inter'] text-[#9CA3AF]" style={{ fontSize: '12px' }}>Client</span>
            <span className="font-['Inter'] font-medium text-[#1A1A1A]" style={{ fontSize: '13px' }}>{clientName}</span>
          </div>

          {pts.length > 0 && (
            <div className="flex justify-between items-center py-2.5 border-b border-[#F3F4F6]">
              <span className="font-['Inter'] text-[#9CA3AF]" style={{ fontSize: '12px' }}>Passengers</span>
              <div className="flex flex-wrap gap-1 justify-end">
                {pts.map((pt, i) => pt.name && (
                  <span key={i} className="px-2 py-0.5 rounded-full font-['Inter'] font-medium" style={{ backgroundColor: '#F3F4F6', color: '#374151', fontSize: '11px' }}>
                    {pt.name}{pt.seatType ? ` (${pt.seatType})` : ''}
                  </span>
                ))}
              </div>
            </div>
          )}

          {shift?.description && (
            <div className="mt-3">
              <AlertTriangle className="w-3.5 h-3.5 text-[#F59E0B] inline mr-1" />
              <span className="font-['Inter'] font-semibold text-[#92600A]" style={{ fontSize: '12px' }}>{shift.description}</span>
            </div>
          )}

          <button
            onClick={() => navigate(`/shifts/${shiftDocId}/intake-form`)}
            className="w-full flex items-center justify-center gap-2 font-['Inter'] font-medium text-[#1A1A1A] border border-[#E5E7EB] active:bg-[#F9FAFB] transition-colors mt-4"
            style={{ height: '40px', borderRadius: '10px', fontSize: '13px' }}
          >
            <ClipboardList className="w-3.5 h-3.5" />
            View Complete Intake Form
          </button>
        </div>

        {/* SECTION 4: Route Timeline */}
        <div className="bg-white p-5" style={cardStyle}>
          <h3 className="font-['Poppins'] font-semibold text-[#1A1A1A] mb-5" style={{ fontSize: '15px' }}>Route</h3>
          <div className="relative">
            <div className="absolute left-[7px] top-[10px]" style={{ width: '2px', height: 'calc(100% - 20px)', background: 'linear-gradient(to bottom, #1F6F43, #185FA5, #B91C1C)', borderRadius: '1px', opacity: 0.3 }} />
            {stops.map((stop, i) => (
              <div key={stop.label} className="relative flex gap-4" style={{ paddingBottom: i < stops.length - 1 ? '28px' : '0' }}>
                <div className="relative z-10 flex-shrink-0 mt-[2px]">
                  <div className="w-4 h-4 rounded-full flex items-center justify-center" style={{ backgroundColor: stop.dotBg }}>
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: stop.dotColor }} />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-['Inter'] font-semibold text-[#1A1A1A] mb-0.5" style={{ fontSize: '14px' }}>{stop.label}</p>
                  <p className="font-['Inter'] text-[#4B5563] mb-0.5" style={{ fontSize: '13px' }}>{stop.address}</p>
                  {stop.time && <p className="font-['Inter'] text-[#9CA3AF] mb-2" style={{ fontSize: '11px' }}>{stop.time}</p>}
                  <button
                    onClick={() => window.open(`https://maps.google.com/?q=${encodeURIComponent(stop.address)}`, '_blank')}
                    className="inline-flex items-center gap-1.5 px-3 rounded-full font-['Inter'] font-medium active:opacity-80"
                    style={{ height: '28px', fontSize: '11px', color: '#1F6F43', backgroundColor: '#F0FDF4' }}
                  >
                    <MapPin className="w-3 h-3" strokeWidth={2.5} />
                    View on Maps
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom — Choose Vehicle writes clockIn to Firestore */}
      <div className="fixed bottom-[88px] left-0 right-0 px-5 pb-4 pt-3" style={{ background: 'linear-gradient(to top, #F8F8F6 70%, transparent)' }}>
        <button
          onClick={handleChooseVehicle}
          className="w-full text-white font-['Poppins'] font-semibold active:opacity-90 transition-opacity"
          style={{ height: '52px', backgroundColor: '#1F6F43', borderRadius: '14px', fontSize: '15px', boxShadow: '0 2px 8px rgba(31,111,67,0.25)' }}
        >
          Start Shift
        </button>
      </div>
    </div>
  );
}

function RouteDescription({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const needsTruncation = text.length > 180;
  const truncated = text.slice(0, 180);

  if (!text) return null;

  return (
    <div className="bg-white p-5 mb-4" style={{ borderRadius: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
      <h3 className="font-['Poppins'] font-semibold text-[#1A1A1A] mb-3" style={{ fontSize: '14px' }}>Route Description</h3>
      <p className="font-['Inter'] text-[#374151] whitespace-pre-line" style={{ fontSize: '14px', lineHeight: '1.6' }}>
        {expanded ? text : truncated + (needsTruncation ? '...' : '')}
        {needsTruncation && (
          <>
            {' '}
            <button onClick={() => setExpanded(!expanded)} className="font-['Inter'] font-medium text-[#1F6F43] inline active:opacity-70" style={{ fontSize: '14px' }}>
              {expanded ? 'Read Less' : 'Read More'}
            </button>
          </>
        )}
      </p>
    </div>
  );
}
