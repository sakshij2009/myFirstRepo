import { useState, useRef } from 'react';
import { ChevronLeft, Building2, Car, Info, Camera, X, Loader2, CheckCircle2 } from 'lucide-react';
import { useSafeNavigate } from '../hooks/useSafeNavigate';
import { useParams } from 'react-router';
import { useSingleShift } from '../../hooks/useUserShifts';

/** Resolve a Firestore vehicleType string to a display label + office/personal type. */
function resolveVehicle(raw: string): { label: string; type: 'office' | 'personal' } {
  const lower = raw.toLowerCase();
  if (
    lower.includes('office') ||
    lower.includes('company') ||
    lower.includes('agency') ||
    lower.includes('staff car')
  ) {
    return { label: raw, type: 'office' };
  }
  return { label: raw, type: 'personal' };
}

export function VehicleCheck() {
  const navigate = useSafeNavigate();
  const { id: shiftDocId } = useParams<{ id: string }>();
  const { shift, loading } = useSingleShift(shiftDocId);

  const [odometer, setOdometer] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [witness, setWitness] = useState('');
  // Only used when the shift has no vehicleType set
  const [manualType, setManualType] = useState<'office' | 'personal' | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setPhoto(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  // Determine whether the shift already specifies a vehicle type
  const rawVehicleType = shift?.vehicleType?.trim();
  const shiftHasVehicle = !!rawVehicleType;

  // If shift has it → auto-resolved; otherwise use staff's manual pick
  const resolvedFromShift = shiftHasVehicle ? resolveVehicle(rawVehicleType!) : null;
  const activeType: 'office' | 'personal' | null =
    resolvedFromShift?.type ?? manualType ?? null;
  const activeLabel =
    resolvedFromShift?.label ??
    (manualType === 'office' ? 'Office Vehicle' : manualType === 'personal' ? 'Personal Vehicle' : null);

  const isOffice = activeType === 'office';
  const canProceed = activeType !== null;

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F8F8F6' }}>
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <div className="px-5 pt-4 pb-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[#F3F4F6] transition-colors -ml-1"
            >
              <ChevronLeft className="w-5 h-5 text-[#1A1A1A]" strokeWidth={2} />
            </button>
            <h1 className="font-['Poppins'] font-semibold text-[#1A1A1A]" style={{ fontSize: '17px' }}>
              Vehicle Check
            </h1>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-7 h-7 text-[#1F6F43] animate-spin" />
        </div>
      ) : (
        <div className="px-5 pt-5 pb-32">

          {/* ── Vehicle type section ─────────────────────────────── */}
          {shiftHasVehicle ? (
            /* Auto-selected from shift assignment — staff cannot change */
            <div className="mb-6">
              <p className="font-['Inter'] font-semibold text-[#9CA3AF] mb-3 tracking-wider uppercase" style={{ fontSize: '11px' }}>
                Vehicle — from shift assignment
              </p>
              <div
                className="flex items-center gap-4 p-4"
                style={{ borderRadius: '12px', border: '2px solid #1F6F43', backgroundColor: '#F0F7F3' }}
              >
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#DCF0E4' }}>
                  {isOffice
                    ? <Building2 className="w-5 h-5 text-[#1F6F43]" strokeWidth={1.8} />
                    : <Car className="w-5 h-5 text-[#1F6F43]" strokeWidth={1.8} />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-['Inter'] font-semibold text-[#1A1A1A]" style={{ fontSize: '14px' }}>
                    {activeLabel}
                  </p>
                  <p className="font-['Inter'] text-[#6B7280]" style={{ fontSize: '12px' }}>
                    {isOffice ? 'Transport hours billed only' : 'Shift + mileage compensation'}
                  </p>
                </div>
                <CheckCircle2 className="w-5 h-5 text-[#1F6F43] flex-shrink-0" strokeWidth={2} />
              </div>
            </div>
          ) : (
            /* No vehicle type on shift — let staff pick */
            <div className="mb-6">
              <p className="font-['Inter'] font-semibold text-[#9CA3AF] mb-1 tracking-wider uppercase" style={{ fontSize: '11px' }}>
                Select vehicle type
              </p>
              <p className="font-['Inter'] text-[#9CA3AF] mb-3" style={{ fontSize: '12px' }}>
                No vehicle was specified for this shift. Please select below.
              </p>
              <div className="grid grid-cols-2 gap-3">
                {/* Personal Vehicle */}
                <button
                  onClick={() => setManualType('personal')}
                  className="flex flex-col items-center gap-2 p-4 transition-colors"
                  style={{
                    borderRadius: '12px',
                    border: manualType === 'personal' ? '2px solid #1F6F43' : '1.5px solid #E5E7EB',
                    backgroundColor: manualType === 'personal' ? '#F0F7F3' : '#FFFFFF',
                  }}
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: manualType === 'personal' ? '#DCF0E4' : '#F3F4F6' }}
                  >
                    <Car
                      className="w-5 h-5"
                      style={{ color: manualType === 'personal' ? '#1F6F43' : '#9CA3AF' }}
                      strokeWidth={1.8}
                    />
                  </div>
                  <span
                    className="font-['Inter'] font-semibold"
                    style={{ fontSize: '13px', color: manualType === 'personal' ? '#1F6F43' : '#374151' }}
                  >
                    Personal Vehicle
                  </span>
                  <span className="font-['Inter'] text-center" style={{ fontSize: '11px', color: '#9CA3AF' }}>
                    Shift + mileage paid
                  </span>
                </button>

                {/* Office Vehicle */}
                <button
                  onClick={() => setManualType('office')}
                  className="flex flex-col items-center gap-2 p-4 transition-colors"
                  style={{
                    borderRadius: '12px',
                    border: manualType === 'office' ? '2px solid #1F6F43' : '1.5px solid #E5E7EB',
                    backgroundColor: manualType === 'office' ? '#F0F7F3' : '#FFFFFF',
                  }}
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: manualType === 'office' ? '#DCF0E4' : '#F3F4F6' }}
                  >
                    <Building2
                      className="w-5 h-5"
                      style={{ color: manualType === 'office' ? '#1F6F43' : '#9CA3AF' }}
                      strokeWidth={1.8}
                    />
                  </div>
                  <span
                    className="font-['Inter'] font-semibold"
                    style={{ fontSize: '13px', color: manualType === 'office' ? '#1F6F43' : '#374151' }}
                  >
                    Office Vehicle
                  </span>
                  <span className="font-['Inter'] text-center" style={{ fontSize: '11px', color: '#9CA3AF' }}>
                    Transport hours billed
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* Info box — shown once a vehicle type is determined */}
          {activeType && (
            <div className="flex gap-2.5 p-4 mb-6" style={{ backgroundColor: '#FAEEDA', border: '0.5px solid #E0A845', borderRadius: '10px' }}>
              <Info className="w-4 h-4 text-[#92600A] flex-shrink-0 mt-0.5" strokeWidth={2} />
              <p className="font-['Inter'] text-[#6B4A0A]" style={{ fontSize: '12px', lineHeight: '1.6' }}>
                {isOffice
                  ? 'Office vehicle: transport hours billed only. Mileage is tracked in-app.'
                  : 'Personal vehicle: shift + mileage paid. Only the car owner receives mileage compensation when sharing.'}
              </p>
            </div>
          )}

          {/* Odometer — office only */}
          {isOffice && (
            <div className="mb-6">
              <label className="block font-['Inter'] font-semibold text-[#9CA3AF] mb-2 tracking-wider uppercase" style={{ fontSize: '11px' }}>
                Start meter reading
              </label>
              <div
                className="flex items-center justify-center"
                style={{ height: '64px', border: '1.5px solid #E5E7EB', borderRadius: '12px', backgroundColor: '#FFFFFF' }}
              >
                <input
                  type="number"
                  inputMode="numeric"
                  placeholder="Enter reading"
                  value={odometer}
                  onChange={(e) => setOdometer(e.target.value)}
                  className="w-full text-center font-['Inter'] font-medium text-[#1A1A1A] bg-transparent outline-none placeholder:text-[#D1D5DB]"
                  style={{ fontSize: '24px' }}
                />
              </div>
            </div>
          )}

          {/* Damage Report — optional */}
          <div className="mb-6">
            <label className="block font-['Inter'] font-semibold text-[#9CA3AF] mb-2 tracking-wider uppercase" style={{ fontSize: '11px' }}>
              Damage report — optional
            </label>
            {photo ? (
              <div className="relative inline-block">
                <img src={photo} alt="Damage" className="object-cover" style={{ width: '120px', height: '120px', borderRadius: '12px' }} />
                <button
                  onClick={() => { setPhoto(null); if (fileRef.current) fileRef.current.value = ''; }}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-[#1A1A1A] rounded-full flex items-center justify-center"
                >
                  <X className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileRef.current?.click()}
                className="w-full flex flex-col items-center justify-center gap-2 py-8 transition-colors active:bg-[#FAFAFA]"
                style={{ border: '2px dashed #D1D5DB', borderRadius: '12px', backgroundColor: '#FFFFFF' }}
              >
                <div className="w-11 h-11 rounded-full bg-[#F3F4F6] flex items-center justify-center">
                  <Camera className="w-5 h-5 text-[#9CA3AF]" strokeWidth={1.8} />
                </div>
                <span className="font-['Inter'] font-medium text-[#4B5563]" style={{ fontSize: '13px' }}>Take live photo</span>
                <span className="font-['Inter'] text-[#EF4444]" style={{ fontSize: '11px' }}>Gallery not permitted — live camera only</span>
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhoto} />
          </div>

          {/* Witness — optional */}
          <div className="mb-6">
            <label className="block font-['Inter'] font-semibold text-[#9CA3AF] mb-2 tracking-wider uppercase" style={{ fontSize: '11px' }}>
              Other staff present? — optional
            </label>
            <input
              type="text"
              placeholder="Enter staff name or ID"
              value={witness}
              onChange={(e) => setWitness(e.target.value)}
              className="w-full font-['Inter'] text-[#1A1A1A] bg-white outline-none placeholder:text-[#D1D5DB]"
              style={{ height: '48px', padding: '0 16px', fontSize: '14px', border: '1.5px solid #E5E7EB', borderRadius: '12px' }}
            />
          </div>
        </div>
      )}

      {/* CTA — disabled until vehicle type is determined */}
      {!loading && (
        <div className="fixed bottom-[88px] left-0 right-0 px-5 pb-4 pt-3" style={{ background: 'linear-gradient(to top, #F8F8F6 70%, transparent)' }}>
          {!canProceed && (
            <p className="font-['Inter'] text-[#9CA3AF] text-center mb-2" style={{ fontSize: '12px' }}>
              Select a vehicle type above to continue
            </p>
          )}
          <button
            disabled={!canProceed}
            onClick={() => navigate(`/shifts/${shiftDocId}/active-route?vehicle=${activeType}`)}
            className="w-full text-white font-['Inter'] font-semibold transition-opacity disabled:opacity-40"
            style={{
              height: '52px',
              backgroundColor: '#1F6F43',
              borderRadius: '12px',
              fontSize: '15px',
              boxShadow: canProceed ? '0 2px 8px rgba(31,111,67,0.25)' : 'none',
            }}
          >
            Confirm &amp; Start Drive
          </button>
        </div>
      )}
    </div>
  );
}
