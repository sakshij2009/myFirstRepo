import { ArrowLeft, Check, Clock, AlertCircle, ChevronDown, ChevronUp, Phone, Mail, MapPin, Undo2 } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useState, useRef, useCallback, useEffect } from 'react';
import { toast } from 'sonner';

type MedStatus = 'administered' | 'due' | 'pending' | 'missed';

interface Medication {
  id: string;
  name: string;
  dosage: string;
  time: string;
  status: MedStatus;
}

const MEDICATIONS: Medication[] = [
  { id: '1', name: 'Vitamin D Supplement', dosage: '1000 IU', time: '9:00 AM', status: 'administered' },
  { id: '2', name: 'Methylphenidate (Ritalin)', dosage: '10mg', time: '10:00 AM', status: 'due' },
  { id: '3', name: 'Melatonin', dosage: '3mg', time: '12:00 PM', status: 'pending' },
  { id: '4', name: 'Iron Supplement', dosage: '18mg', time: '8:00 AM', status: 'missed' },
];

const statusConfig: Record<MedStatus, { bg: string; color: string; icon: React.ReactNode; label: string }> = {
  administered: {
    bg: '#1F6F43',
    color: '#FFFFFF',
    icon: <Check className="w-4 h-4 text-white" strokeWidth={3} />,
    label: 'Administered',
  },
  due: {
    bg: '#FFF8E1',
    color: '#92600A',
    icon: <Clock className="w-4 h-4 text-[#92600A]" strokeWidth={2} />,
    label: 'Due now',
  },
  pending: {
    bg: '#F3F4F6',
    color: '#6B7280',
    icon: <Clock className="w-4 h-4 text-[#9CA3AF]" strokeWidth={2} />,
    label: 'Pending',
  },
  missed: {
    bg: '#FEF2F2',
    color: '#DC2626',
    icon: <AlertCircle className="w-4 h-4 text-[#DC2626]" strokeWidth={2} />,
    label: 'Missed',
  },
};

export function ShiftMedications() {
  const navigate = useNavigate();
  const [meds, setMeds] = useState(MEDICATIONS);
  const [errorExpanded, setErrorExpanded] = useState(false);
  const [signatureName, setSignatureName] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const lastPosRef = useRef({ x: 0, y: 0 });

  const getPos = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height),
    };
  }, []);

  const startDrawing = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    isDrawingRef.current = true;
    const pos = getPos(e.clientX, e.clientY);
    lastPosRef.current = pos;
  }, [getPos]);

  const draw = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const pos = getPos(e.clientX, e.clientY);
    ctx.strokeStyle = '#1F6F43';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastPosRef.current = pos;
  }, [getPos]);

  const stopDrawing = useCallback(() => {
    isDrawingRef.current = false;
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const touch = e.touches[0];
    if (!touch) return;
    isDrawingRef.current = true;
    const pos = getPos(touch.clientX, touch.clientY);
    lastPosRef.current = pos;
  }, [getPos]);

  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const touch = e.touches[0];
    if (!touch) return;
    const pos = getPos(touch.clientX, touch.clientY);
    ctx.strokeStyle = '#1F6F43';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastPosRef.current = pos;
  }, [getPos]);

  const clearSignature = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }, []);

  const handleToggle = (id: string) => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    setMeds((prev) =>
      prev.map((m) => {
        if (m.id !== id) return m;
        if (m.status === 'administered') {
          // Undo — revert to previous non-administered state
          return { ...m, status: 'due' as MedStatus };
        }
        if (m.status === 'due' || m.status === 'pending') {
          toast.success(`${m.name} administered at ${timeStr}`, {
            action: {
              label: 'Undo',
              onClick: () => {
                setMeds((prev) =>
                  prev.map((med) =>
                    med.id === id ? { ...med, status: m.status === 'due' ? 'due' : 'pending' as MedStatus } : med
                  )
                );
              },
            },
            duration: 4000,
          });
          return { ...m, status: 'administered' as MedStatus };
        }
        return m; // missed stays missed
      })
    );
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F8F8F6' }}>
      <div className="px-5 pb-8">
        {/* Header */}
        <header className="h-14 flex items-center justify-center relative pt-4 mb-5">
          <button
            onClick={() => navigate(-1)}
            className="absolute left-0 top-4 w-10 h-10 flex items-center justify-center"
          >
            <ArrowLeft className="w-6 h-6 text-[#1A1A1A]" strokeWidth={2} />
          </button>
          <div className="text-center">
            <h1 className="font-['Poppins'] font-semibold text-[#1A1A1A]" style={{ fontSize: '18px' }}>
              Medications
            </h1>
            <div className="font-['Inter'] text-[#9CA3AF] mt-1" style={{ fontSize: '12px' }}>
              Emma Thompson · ID: 0988765
            </div>
          </div>
        </header>

        {/* Timing Reminder Banner */}
        <div
          className="rounded-xl p-3.5 mb-4 flex items-start gap-2.5"
          style={{ backgroundColor: '#FFF8E1' }}
        >
          <Clock className="w-4 h-4 text-[#92600A] mt-0.5 flex-shrink-0" strokeWidth={2} />
          <div>
            <p className="font-['Inter'] font-semibold text-[#92600A]" style={{ fontSize: '13px' }}>
              Medication timing reminder
            </p>
            <p className="font-['Inter'] text-[#92600A] mt-0.5" style={{ fontSize: '12px', opacity: 0.8 }}>
              Ensure medications are given within 30 minutes of their scheduled time.
            </p>
          </div>
        </div>

        {/* Today's Medications */}
        <div
          className="bg-white rounded-2xl p-5 mb-4"
          style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
        >
          <h3 className="font-['Poppins'] font-semibold text-[#1A1A1A] mb-4" style={{ fontSize: '14px' }}>
            Today's Medications
          </h3>

          <div className="space-y-3">
            {meds.map((med) => {
              const cfg = statusConfig[med.status];
              return (
                <button
                  key={med.id}
                  onClick={() => handleToggle(med.id)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition-colors active:bg-[#FAFAFA]"
                  style={{ border: '1px solid #F3F4F6' }}
                >
                  {/* Status Circle */}
                  <div
                    className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: cfg.bg }}
                  >
                    {cfg.icon}
                  </div>
                  {/* Med Info */}
                  <div className="flex-1 min-w-0">
                    <div className="font-['Inter'] font-semibold text-[#1A1A1A]" style={{ fontSize: '14px' }}>
                      {med.name}
                    </div>
                    <div className="font-['Inter'] text-[#6B7280] mt-0.5" style={{ fontSize: '12px' }}>
                      {med.dosage} · {med.time}
                    </div>
                  </div>
                  {/* Status Badge */}
                  <span
                    className="flex-shrink-0 px-2.5 py-0.5 rounded-xl font-['Inter'] font-semibold"
                    style={{ fontSize: '11px', backgroundColor: cfg.bg, color: cfg.color }}
                  >
                    {cfg.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Medication Error Logging */}
        <div
          className="bg-white rounded-2xl mb-4"
          style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
        >
          <button
            onClick={() => setErrorExpanded(!errorExpanded)}
            className="w-full flex items-center justify-between p-5"
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-[#DC2626]" strokeWidth={2} />
              <span className="font-['Poppins'] font-semibold text-[#1A1A1A]" style={{ fontSize: '14px' }}>
                Medication Error Logging
              </span>
            </div>
            {errorExpanded ? (
              <ChevronUp className="w-5 h-5 text-[#9CA3AF]" strokeWidth={2} />
            ) : (
              <ChevronDown className="w-5 h-5 text-[#9CA3AF]" strokeWidth={2} />
            )}
          </button>
          {errorExpanded && (
            <div className="px-5 pb-5">
              <p className="font-['Inter'] text-[#6B7280] mb-3" style={{ fontSize: '13px' }}>
                Report any medication errors, missed doses, or adverse reactions.
              </p>
              <textarea
                placeholder="Describe the medication error or issue..."
                className="w-full font-['Inter'] text-[#1A1A1A] placeholder-[#D1D5DB] resize-none outline-none"
                style={{
                  fontSize: '14px',
                  minHeight: '100px',
                  border: '1.5px solid #E5E7EB',
                  borderRadius: '12px',
                  padding: '16px',
                  backgroundColor: '#F9FAFB',
                }}
              />
              <button
                className="w-full mt-3 rounded-[10px] font-['Inter'] font-semibold text-white bg-[#DC2626]"
                style={{ height: '44px', fontSize: '14px' }}
              >
                Submit Error Report
              </button>
            </div>
          )}
        </div>

        {/* Pharmacy Information */}
        <div
          className="bg-white rounded-2xl p-5 mb-4"
          style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
        >
          <h3 className="font-['Poppins'] font-semibold text-[#1A1A1A] mb-4" style={{ fontSize: '14px' }}>
            Pharmacy Information
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-['Inter'] text-[#9CA3AF]" style={{ fontSize: '13px' }}>Prescribing Doctor</span>
              <span className="font-['Inter'] font-medium text-[#1A1A1A]" style={{ fontSize: '13px' }}>
                Dr. Maria Chen
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-['Inter'] text-[#9CA3AF]" style={{ fontSize: '13px' }}>Email</span>
              <div className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-[#1F6F43]" strokeWidth={2} />
                <span className="font-['Inter'] font-medium text-[#1F6F43]" style={{ fontSize: '13px' }}>
                  dr.chen@clinic.com
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-['Inter'] text-[#9CA3AF]" style={{ fontSize: '13px' }}>Phone</span>
              <div className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-[#1F6F43]" strokeWidth={2} />
                <span className="font-['Inter'] font-medium text-[#1F6F43]" style={{ fontSize: '13px' }}>
                  (555) 234-5678
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-['Inter'] text-[#9CA3AF]" style={{ fontSize: '13px' }}>Pharmacy</span>
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#6B7280]" strokeWidth={2} />
                <span className="font-['Inter'] font-medium text-[#1A1A1A]" style={{ fontSize: '13px' }}>
                  MedPlus Pharmacy
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Authorization & Signature */}
        <div
          className="bg-white rounded-2xl p-5"
          style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
        >
          <h3 className="font-['Poppins'] font-semibold text-[#1A1A1A] mb-4" style={{ fontSize: '14px' }}>
            Authorization & Signature
          </h3>
          <label className="font-['Inter'] text-[#6B7280] mb-2 block" style={{ fontSize: '13px' }}>
            Full Name
          </label>
          <input
            value={signatureName}
            onChange={(e) => setSignatureName(e.target.value)}
            placeholder="Enter your full name"
            className="w-full font-['Inter'] text-[#1A1A1A] placeholder-[#D1D5DB] outline-none mb-4"
            style={{
              fontSize: '14px',
              height: '44px',
              border: '1.5px solid #E5E7EB',
              borderRadius: '12px',
              padding: '0 16px',
              backgroundColor: '#F9FAFB',
            }}
          />
          <label className="font-['Inter'] text-[#6B7280] mb-2 block" style={{ fontSize: '13px' }}>
            Signature
          </label>
          <div
            className="w-full rounded-xl mb-4 overflow-hidden"
            style={{
              height: '100px',
              border: '1.5px solid #E5E7EB',
              backgroundColor: '#FFFFFF',
            }}
          >
            <canvas
              ref={canvasRef}
              width={338}
              height={98}
              className="w-full cursor-crosshair"
              style={{ display: 'block', touchAction: 'none' }}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={stopDrawing}
            />
          </div>
          <div className="flex gap-2 mb-3">
            <button
              onClick={clearSignature}
              className="flex-1 rounded-[10px] font-['Inter'] font-medium text-[#6B7280] flex items-center justify-center gap-1.5"
              style={{ height: '36px', fontSize: '12px', border: '1px solid #E5E7EB', backgroundColor: '#F9FAFB' }}
            >
              <Undo2 className="w-3.5 h-3.5" strokeWidth={2} />
              Clear
            </button>
          </div>
          <div className="flex gap-2">
            <button
              className="flex-1 rounded-[10px] font-['Inter'] font-medium text-[#1A1A1A]"
              style={{ height: '44px', fontSize: '13px', border: '1px solid #E5E7EB' }}
            >
              Export PDF
            </button>
            <button
              className="flex-1 rounded-[10px] font-['Inter'] font-semibold text-white bg-[#1F6F43]"
              style={{ height: '44px', fontSize: '13px' }}
            >
              Submit
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}