import { useState, useRef, useCallback } from 'react';
import {
  ArrowLeft, ChevronDown, Calendar, User, BadgeCheck, Clock, Check, X,
  AlertTriangle, ClipboardList, Download, FileText, Pill, Phone, Mail,
  MapPin, Plus, Trash2, Upload, CircleCheck, Shield, ChevronRight,
} from 'lucide-react';
import { useSafeNavigate } from '../hooks/useSafeNavigate';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';

const MAP_IMG =
  'https://images.unsplash.com/photo-1664044056437-6330bcf8e2fe?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzdHJlZXQlMjBtYXAlMjBzYXRlbGxpdGUlMjBuZWlnaGJvcmhvb2R8ZW58MXx8fHwxNzczNTU3OTY3fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral';

type Tab = 'reports' | 'medications' | 'transportations';

/* ─────────────────────────── Main Component ────────────────────────── */
export function StaffReports() {
  const navigate = useSafeNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('reports');

  return (
    <div className="min-h-screen bg-[#F8F8F6]">
      {/* Sticky header area */}
      <div className="bg-[#F8F8F6] sticky top-0 z-20 px-5 pt-4 pb-0">
        {/* Header */}
        <header className="h-14 flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center -ml-2">
            <ArrowLeft className="w-6 h-6 text-[#1A1A1A]" strokeWidth={2} />
          </button>
          <div className="flex-1 text-center">
            <h1 className="font-['Poppins'] font-semibold text-[#1A1A1A]" style={{ fontSize: '18px' }}>
              Reports
            </h1>
            <p className="font-['Inter'] text-[#9CA3AF]" style={{ fontSize: '12px' }}>
              kibo Gin | Intake Worker
            </p>
          </div>
          <div className="w-10" />
        </header>

        {/* Client Selector */}
        <div
          className="flex items-center gap-3 bg-white rounded-xl p-3 mt-4"
          style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
        >
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center font-['Inter'] font-semibold flex-shrink-0"
            style={{ backgroundColor: '#E6F4EC', color: '#1F6F43', fontSize: '14px' }}
          >
            JW
          </div>
          <div className="flex-1 min-w-0">
            <span className="font-['Inter'] font-semibold text-[#1A1A1A]" style={{ fontSize: '15px' }}>
              Joseph
            </span>
            <span className="font-['Inter'] text-[#9CA3AF] ml-2" style={{ fontSize: '12px' }}>
              ID: 6587879
            </span>
          </div>
          <ChevronDown className="w-4 h-4 text-[#6B7280] flex-shrink-0" strokeWidth={2} />
        </div>

        {/* Tab Bar */}
        <div className="flex mt-3" style={{ borderBottom: '1px solid #E5E7EB' }}>
          {(['reports', 'medications', 'transportations'] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="flex-1 pb-3 text-center transition-colors"
              style={{
                borderBottom: activeTab === tab ? '2px solid #1F6F43' : '2px solid transparent',
              }}
            >
              <span
                className="font-['Inter'] capitalize"
                style={{
                  fontSize: '14px',
                  fontWeight: activeTab === tab ? 600 : 400,
                  color: activeTab === tab ? '#1A1A1A' : '#9CA3AF',
                }}
              >
                {tab}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="px-5 pt-4 pb-28">
        {activeTab === 'reports' && <ReportsTab />}
        {activeTab === 'medications' && <MedicationsTab />}
        {activeTab === 'transportations' && <TransportationsTab />}
      </div>
    </div>
  );
}

/* ═══════════════════════════ TAB 1: REPORTS ═════════════════════════ */
function ReportsTab() {
  const [reportText, setReportText] = useState('');

  return (
    <>
      {/* Report Summary Card */}
      <Card borderAccent="#1F6F43">
        <h3 className="font-['Poppins'] font-semibold text-[#1A1A1A] mb-4" style={{ fontSize: '16px' }}>
          Report 1
        </h3>
        <MetaRows />
      </Card>

      {/* Shift Timeline Card */}
      <Card className="mt-4">
        <h3 className="font-['Poppins'] font-semibold text-[#1A1A1A] mb-4" style={{ fontSize: '14px' }}>
          Shift Timeline
        </h3>
        <ShiftTimeline />
      </Card>

      {/* Daily Shift Report Card */}
      <Card className="mt-4">
        <h3 className="font-['Poppins'] font-semibold text-[#1A1A1A] mb-1" style={{ fontSize: '14px' }}>
          Daily Shift Report
        </h3>
        <p className="font-['Inter'] text-[#6B7280] mb-3" style={{ fontSize: '13px', lineHeight: '1.5' }}>
          Include details about: activities, medications, meals, mood, interactions, health observations, and any concerns.
        </p>
        <textarea
          value={reportText}
          onChange={(e) => setReportText(e.target.value)}
          placeholder="Begin your report"
          className="w-full font-['Inter'] text-[#1A1A1A] placeholder-[#D1D5DB] resize-none outline-none"
          style={{
            fontSize: '14px',
            minHeight: '140px',
            border: reportText.length > 0 ? '1.5px solid #1F6F43' : '1px solid #E5E7EB',
            borderRadius: '12px',
            padding: '16px',
            backgroundColor: '#F9FAFB',
          }}
        />
        <div className="flex items-center justify-between mt-1.5">
          <span className="font-['Inter'] text-[#9CA3AF]" style={{ fontSize: '11px' }}>
            Character count: {reportText.length} | Recommended: Minimum 1000 words for the report.
          </span>
        </div>
        <div className="flex items-center gap-1 mt-1">
          <CircleCheck className="w-3 h-3 text-[#22C55E]" strokeWidth={2} />
          <span className="font-['Inter'] text-[#9CA3AF]" style={{ fontSize: '10px' }}>Auto-saved</span>
        </div>
        <div className="flex gap-2 mt-4">
          <button
            className="flex-1 flex items-center justify-center gap-1.5 rounded-[10px] font-['Inter'] font-medium text-[#1A1A1A]"
            style={{ height: '44px', fontSize: '13px', border: '1px solid #E5E7EB' }}
          >
            <Download className="w-4 h-4" strokeWidth={2} />
            Download Report
          </button>
          <button
            className="flex-1 rounded-[10px] font-['Inter'] font-semibold text-white bg-[#1F6F43]"
            style={{ height: '44px', fontSize: '13px' }}
          >
            Submit
          </button>
        </div>
      </Card>

      {/* Other Actions */}
      <h3 className="font-['Poppins'] font-semibold text-[#1A1A1A] mt-6 mb-4" style={{ fontSize: '14px' }}>
        Other Actions
      </h3>

      {/* Critical Incident */}
      <Card borderAccent="#DC2626">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className="w-5 h-5 text-[#DC2626]" strokeWidth={2} />
          <span className="font-['Inter'] font-semibold text-[#1A1A1A]" style={{ fontSize: '15px' }}>
            Critical Incident Reporting
          </span>
        </div>
        <p className="font-['Inter'] text-[#6B7280] mb-2" style={{ fontSize: '13px' }}>
          For serious incident requiring immediate management attention
        </p>
        <p className="font-['Inter'] italic text-[#DC2626] mb-4" style={{ fontSize: '12px' }}>
          Self-harm, violence, abuse allegations, serious accidents, medication errors..
        </p>
        <button
          className="w-full rounded-[10px] font-['Inter'] font-semibold text-white bg-[#DC2626]"
          style={{ height: '44px', fontSize: '14px' }}
        >
          Report Critical Incident
        </button>
      </Card>

      {/* Medical Contact Log */}
      <Card className="mt-4" borderAccent="#1E5FA6">
        <div className="flex items-center gap-2 mb-2">
          <ClipboardList className="w-5 h-5 text-[#1E5FA6]" strokeWidth={2} />
          <span className="font-['Inter'] font-semibold text-[#1A1A1A]" style={{ fontSize: '15px' }}>
            Medical Contact Log
          </span>
        </div>
        <p className="font-['Inter'] text-[#6B7280] mb-2" style={{ fontSize: '13px' }}>
          Use this form to document medical-related contacts, incidents, or communications involving a client.
        </p>
        <p className="font-['Inter'] italic text-[#1E5FA6] mb-4" style={{ fontSize: '12px' }}>
          medical incidents, emergency care, medication
        </p>
        <button
          className="w-full rounded-[10px] font-['Inter'] font-semibold text-white bg-[#1E5FA6]"
          style={{ height: '44px', fontSize: '14px' }}
        >
          Contact Note
        </button>
      </Card>
    </>
  );
}

/* ═══════════════════════════ TAB 2: MEDICATIONS ════════════════════ */
interface Medication {
  id: number;
  name: string;
  dosage: string;
  schedule: string;
  scheduledTime: string;
  status: 'administered' | 'due' | 'pending' | 'missed';
  givenTime?: string;
  period: 'Morning' | 'Afternoon' | 'Night' | 'Emergency';
}

const INITIAL_MEDS: Medication[] = [
  { id: 1, name: 'Amoxicillin (antibiotic)', dosage: '500 mg', schedule: 'every 8 hours for 7 days', scheduledTime: '7:00 AM', status: 'administered', givenTime: '7:05 AM', period: 'Morning' },
  { id: 2, name: 'Amoxicillin (antibiotic)', dosage: '500 mg', schedule: 'every 8 hours for 7 days', scheduledTime: '3:00 PM', status: 'due', period: 'Afternoon' },
  { id: 3, name: 'Atorvastatin', dosage: '10 mg', schedule: 'once daily at bedtime', scheduledTime: '9:00 PM', status: 'pending', period: 'Night' },
  { id: 4, name: 'Albuterol inhaler', dosage: '2 puffs', schedule: 'as needed', scheduledTime: '', status: 'pending', period: 'Emergency' },
  { id: 5, name: 'Amoxicillin (antibiotic)', dosage: '500 mg', schedule: 'every 8 hours for 7 days', scheduledTime: '11:00 PM', status: 'pending', period: 'Night' },
];

function MedicationsTab() {
  const [meds, setMeds] = useState<Medication[]>(INITIAL_MEDS);
  const [toast, setToast] = useState<{ msg: string; medId: number } | null>(null);
  const toastTimeout = useRef<ReturnType<typeof setTimeout>>();
  const [errorExpanded, setErrorExpanded] = useState(false);
  const [signatureMode, setSignatureMode] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const administeredCount = meds.filter((m) => m.status === 'administered').length;

  const handleTapMed = useCallback((id: number) => {
    const med = meds.find((m) => m.id === id);
    if (!med || (med.status !== 'due' && med.status !== 'pending')) return;
    const time = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    setMeds((prev) =>
      prev.map((m) => (m.id === id ? { ...m, status: 'administered' as const, givenTime: time } : m))
    );
    setToast({ msg: `${med.name.split(' (')[0]} logged at ${time}`, medId: id });
    if (toastTimeout.current) clearTimeout(toastTimeout.current);
    toastTimeout.current = setTimeout(() => setToast(null), 3000);
  }, [meds]);

  const handleUndo = useCallback(() => {
    if (!toast) return;
    const med = INITIAL_MEDS.find((m) => m.id === toast.medId);
    if (med) {
      setMeds((prev) =>
        prev.map((m) => (m.id === toast.medId ? { ...m, status: med.status, givenTime: med.givenTime } : m))
      );
    }
    setToast(null);
    if (toastTimeout.current) clearTimeout(toastTimeout.current);
  }, [toast]);

  const periodColor: Record<string, { bg: string; text: string }> = {
    Morning: { bg: '#FFF8E1', text: '#92600A' },
    Afternoon: { bg: '#F3F0FF', text: '#5B21B6' },
    Night: { bg: '#EBF5FF', text: '#1E5FA6' },
    Emergency: { bg: '#FEF2F2', text: '#DC2626' },
  };

  // Simple canvas drawing
  const startDrawing = () => {
    setSignatureMode(true);
  };

  return (
    <>
      {/* Medication Info Banner */}
      <div className="flex items-start gap-2.5 p-3 px-4 rounded-xl" style={{ backgroundColor: '#FFF8E1' }}>
        <Pill className="w-[18px] h-[18px] text-[#92600A] flex-shrink-0 mt-0.5" strokeWidth={2} />
        <p className="font-['Inter'] text-[#92600A]" style={{ fontSize: '13px', lineHeight: '1.4' }}>
          Medications should be administered half an hour before and half an hour after the shift.
        </p>
      </div>

      {/* Today's Medications Card */}
      <Card className="mt-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-['Poppins'] font-semibold text-[#1A1A1A]" style={{ fontSize: '14px' }}>
            Today's Medications
          </h3>
          <div className="flex items-center gap-1.5">
            <span className="font-['Inter'] font-medium text-[#1F6F43]" style={{ fontSize: '12px' }}>
              {administeredCount} of {meds.length} given
            </span>
            <div className="relative" style={{ width: '20px', height: '20px' }}>
              <svg width="20" height="20" viewBox="0 0 20 20">
                <circle cx="10" cy="10" r="8" fill="none" stroke="#E5E7EB" strokeWidth="2.5" />
                <circle
                  cx="10" cy="10" r="8" fill="none" stroke="#1F6F43" strokeWidth="2.5"
                  strokeDasharray={`${(administeredCount / meds.length) * 50.27} 50.27`}
                  strokeLinecap="round" transform="rotate(-90 10 10)"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Medication rows */}
        <div>
          {meds.map((med, idx) => (
            <button
              key={med.id}
              onClick={() => handleTapMed(med.id)}
              className="flex items-center gap-3 w-full text-left py-3.5"
              style={{
                borderBottom: idx < meds.length - 1 ? '1px solid #F3F4F6' : 'none',
                minHeight: '72px',
              }}
              disabled={med.status === 'administered' || med.status === 'missed'}
            >
              {/* Status circle */}
              <div className="flex-shrink-0">
                {med.status === 'administered' ? (
                  <div className="w-9 h-9 rounded-full bg-[#1F6F43] flex items-center justify-center">
                    <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                  </div>
                ) : med.status === 'due' ? (
                  <div className="w-9 h-9 rounded-full border-2 border-[#1F6F43] flex items-center justify-center animate-pulse">
                    <div className="w-2 h-2 rounded-full bg-[#1F6F43]" />
                  </div>
                ) : med.status === 'missed' ? (
                  <div className="w-9 h-9 rounded-full bg-[#DC2626] flex items-center justify-center">
                    <X className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                  </div>
                ) : (
                  <div className="w-9 h-9 rounded-full border-2 border-[#D1D5DB]" />
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-['Inter'] font-semibold text-[#1F6F43] truncate" style={{ fontSize: '14px' }}>
                  {med.name}
                </p>
                <p className="font-['Inter'] text-[#6B7280]" style={{ fontSize: '12px' }}>
                  {med.dosage} · {med.schedule}
                </p>
                <p
                  className="font-['Inter'] font-medium"
                  style={{
                    fontSize: '12px',
                    color:
                      med.status === 'administered'
                        ? '#1F6F43'
                        : med.status === 'due'
                        ? '#1F6F43'
                        : med.status === 'missed'
                        ? '#DC2626'
                        : '#9CA3AF',
                  }}
                >
                  {med.status === 'administered'
                    ? `Given at ${med.givenTime}`
                    : med.status === 'due'
                    ? 'Due now'
                    : med.status === 'missed'
                    ? `Missed — was due at ${med.scheduledTime}`
                    : med.scheduledTime
                    ? `Next dose: ${med.scheduledTime}`
                    : 'Administer as needed'}
                </p>
              </div>

              {/* Period pill */}
              <span
                className="flex-shrink-0 px-2 py-0.5 rounded-xl font-['Inter'] font-semibold"
                style={{
                  fontSize: '10px',
                  backgroundColor: periodColor[med.period].bg,
                  color: periodColor[med.period].text,
                }}
              >
                {med.period}
              </span>
            </button>
          ))}
        </div>

        {/* Medication Error Logging */}
        <div className="mt-2 pt-3" style={{ borderTop: '1px solid #F3F4F6' }}>
          <button
            onClick={() => setErrorExpanded(!errorExpanded)}
            className="flex items-center justify-between w-full"
          >
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-[#F59E0B]" strokeWidth={2} />
              <span className="font-['Inter'] font-medium text-[#F59E0B]" style={{ fontSize: '13px' }}>
                Log Medication Error
              </span>
            </div>
            <ChevronDown
              className="w-3.5 h-3.5 text-[#F59E0B] transition-transform"
              style={{ transform: errorExpanded ? 'rotate(180deg)' : 'rotate(0)' }}
              strokeWidth={2}
            />
          </button>
          {errorExpanded && (
            <div className="mt-3 space-y-3">
              <select
                className="w-full font-['Inter'] text-[#1A1A1A] bg-[#F9FAFB] rounded-[10px] px-3.5 outline-none"
                style={{ height: '44px', fontSize: '13px', border: '1px solid #E5E7EB' }}
                defaultValue=""
              >
                <option value="" disabled>Select medication</option>
                {meds.map((m) => (
                  <option key={m.id} value={m.id}>{m.name} — {m.dosage}</option>
                ))}
              </select>
              <textarea
                placeholder="e.g., Wrong dosage given, medication missed due to..."
                className="w-full font-['Inter'] text-[#1A1A1A] placeholder-[#D1D5DB] bg-[#F9FAFB] rounded-[10px] p-3.5 resize-none outline-none"
                style={{ fontSize: '13px', height: '80px', border: '1px solid #E5E7EB' }}
              />
              <button
                className="w-full rounded-[10px] font-['Inter'] font-semibold text-[#F59E0B]"
                style={{ height: '40px', fontSize: '13px', border: '1.5px solid #F59E0B' }}
              >
                Submit Error Report
              </button>
              <p className="font-['Inter'] italic text-[#DC2626]" style={{ fontSize: '11px' }}>
                * Medication errors require an incident report
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* Pharmacy Information */}
      <Card className="mt-4">
        <div className="flex items-center gap-2 mb-3">
          <Pill className="w-5 h-5 text-[#DC2626]" strokeWidth={2} />
          <h3 className="font-['Poppins'] font-semibold text-[#1A1A1A]" style={{ fontSize: '14px' }}>
            Pharmacy Information
          </h3>
        </div>
        <div className="space-y-2">
          <InfoRow label="Name:" value="Dr. Tony Wales" />
          <InfoRow label="E-Mail:" value="tonywales21@gmail.com" isLink />
          <InfoRow label="Number:" value="+61-364837891" isLink />
          <InfoRow label="Address:" value="123, ABC Park" />
        </div>
      </Card>

      {/* Authorization & Signature */}
      <Card className="mt-4">
        <h3 className="font-['Poppins'] font-semibold text-[#1A1A1A] mb-4" style={{ fontSize: '14px' }}>
          Authorization Administration (Trained):
        </h3>
        <label className="font-['Inter'] text-[#6B7280] mb-1.5 block" style={{ fontSize: '13px' }}>Name</label>
        <input
          type="text"
          className="w-full font-['Inter'] text-[#1A1A1A] bg-[#F9FAFB] rounded-[10px] px-3.5 outline-none mb-4"
          style={{ height: '44px', fontSize: '14px', border: '1px solid #E5E7EB' }}
          placeholder="Enter name"
        />
        <label className="font-['Inter'] text-[#6B7280] mb-1.5 block" style={{ fontSize: '13px' }}>
          Work Signature <span className="text-[#DC2626]">*</span>
        </label>
        <div
          className="relative flex flex-col items-center justify-center bg-[#F9FAFB] rounded-xl cursor-pointer"
          style={{ height: '140px', border: '1px solid #E5E7EB' }}
          onClick={startDrawing}
        >
          {!signatureMode ? (
            <>
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center mb-2"
                style={{ backgroundColor: '#FFF8E1' }}
              >
                <Shield className="w-5 h-5 text-[#F59E0B]" strokeWidth={2} />
              </div>
              <span className="font-['Poppins'] font-semibold text-[#1A1A1A]" style={{ fontSize: '14px' }}>
                Tap to Sign
              </span>
              <span className="font-['Inter'] text-[#9CA3AF]" style={{ fontSize: '12px' }}>
                Draw your signature above
              </span>
            </>
          ) : (
            <canvas
              ref={canvasRef}
              width={280}
              height={130}
              className="absolute inset-0 w-full h-full touch-none"
              style={{ cursor: 'crosshair' }}
              onPointerDown={(e) => {
                const c = canvasRef.current;
                if (!c) return;
                const ctx = c.getContext('2d');
                if (!ctx) return;
                const rect = c.getBoundingClientRect();
                ctx.strokeStyle = '#1A1A1A';
                ctx.lineWidth = 2;
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
                const move = (ev: PointerEvent) => {
                  ctx.lineTo(ev.clientX - rect.left, ev.clientY - rect.top);
                  ctx.stroke();
                };
                const up = () => {
                  window.removeEventListener('pointermove', move);
                  window.removeEventListener('pointerup', up);
                };
                window.addEventListener('pointermove', move);
                window.addEventListener('pointerup', up);
              }}
            />
          )}
        </div>
        <div className="flex gap-2 mt-4">
          <button
            className="flex-1 rounded-[10px] font-['Inter'] font-semibold text-[#1F6F43]"
            style={{ height: '48px', fontSize: '14px', border: '1px solid #E5E7EB' }}
          >
            Export
          </button>
          <button
            className="flex-1 rounded-[10px] font-['Inter'] font-semibold text-white bg-[#1F6F43]"
            style={{ height: '48px', fontSize: '14px' }}
          >
            Submit
          </button>
        </div>
      </Card>

      {/* Toast */}
      {toast && (
        <div
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-3 bg-[#1F6F43] rounded-[10px]"
          style={{ boxShadow: '0 6px 20px rgba(31,111,67,0.3)', maxWidth: '340px', width: 'calc(100% - 40px)' }}
        >
          <Check className="w-4 h-4 text-white flex-shrink-0" strokeWidth={3} />
          <span className="font-['Inter'] font-semibold text-white flex-1" style={{ fontSize: '13px' }}>
            {toast.msg}
          </span>
          <button onClick={handleUndo} className="font-['Inter'] font-medium text-white/80" style={{ fontSize: '13px' }}>
            Undo
          </button>
        </div>
      )}
    </>
  );
}

/* ═══════════════════════════ TAB 3: TRANSPORTATIONS ════════════════ */
function TransportationsTab() {
  const [stops, setStops] = useState<string[]>(['']);
  const [receipts, setReceipts] = useState<{ name: string; size: string }[]>([]);

  const addStop = () => setStops((prev) => [...prev, '']);
  const removeStop = (idx: number) => setStops((prev) => prev.filter((_, i) => i !== idx));

  const simulateUpload = () => {
    setReceipts((prev) => [
      ...prev,
      { name: `receipt_${String(prev.length + 1).padStart(3, '0')}.jpg`, size: '2.4 MB' },
    ]);
  };

  return (
    <>
      {/* Transportation Summary */}
      <Card borderAccent="#1F6F43">
        <h3 className="font-['Poppins'] font-semibold text-[#1A1A1A] mb-4" style={{ fontSize: '16px' }}>
          Transportations
        </h3>
        <MetaRows />
      </Card>

      {/* Kilometer Rate */}
      <Card className="mt-4">
        <h3 className="font-['Poppins'] font-semibold text-[#1A1A1A] mb-3" style={{ fontSize: '14px' }}>
          Kilometer per rate
        </h3>
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="font-['Inter'] text-[#6B7280]" style={{ fontSize: '14px' }}>Before 5000 Kilometer</span>
            <span className="font-['Inter'] font-medium text-[#1A1A1A]" style={{ fontSize: '14px' }}>72(&#162;)</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-['Inter'] text-[#6B7280]" style={{ fontSize: '14px' }}>After 5000 Kilometer</span>
            <span className="font-['Inter'] font-medium text-[#1A1A1A]" style={{ fontSize: '14px' }}>66(&#162;)</span>
          </div>
          <div className="pt-2.5" style={{ borderTop: '1px solid #F3F4F6' }}>
            <div className="flex items-center justify-between">
              <span className="font-['Inter'] font-medium text-[#6B7280]" style={{ fontSize: '14px' }}>Total Hours</span>
              <span className="font-['Inter'] font-semibold text-[#1F6F43]" style={{ fontSize: '14px' }}>13 Hours</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Visit Destinations */}
      <Card className="mt-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-['Poppins'] font-semibold text-[#1A1A1A]" style={{ fontSize: '14px' }}>
            Visit Destinations
          </h3>
          <button onClick={addStop} className="flex items-center gap-1">
            <Plus className="w-3.5 h-3.5 text-[#1F6F43]" strokeWidth={2.5} />
            <span className="font-['Inter'] font-medium text-[#1F6F43]" style={{ fontSize: '13px' }}>
              Add another stop
            </span>
          </button>
        </div>
        <div className="space-y-3">
          {stops.map((_, idx) => (
            <div key={idx}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-['Inter'] font-semibold text-[#9CA3AF]" style={{ fontSize: '12px' }}>
                  Stop {idx + 1}
                </span>
                {idx > 0 && (
                  <button onClick={() => removeStop(idx)}>
                    <Trash2 className="w-4 h-4 text-[#DC2626]" strokeWidth={2} />
                  </button>
                )}
              </div>
              <input
                type="text"
                placeholder="Enter destination address"
                className="w-full font-['Inter'] text-[#1A1A1A] placeholder-[#D1D5DB] bg-[#F9FAFB] rounded-[10px] px-3.5 outline-none"
                style={{ height: '48px', fontSize: '14px', border: '1px solid #E5E7EB' }}
              />
            </div>
          ))}
        </div>
      </Card>

      {/* Route Details */}
      <Card className="mt-4">
        <h3 className="font-['Poppins'] font-semibold text-[#1A1A1A] mb-3" style={{ fontSize: '14px' }}>
          Route Details
        </h3>
        <div className="space-y-3">
          <FormField label="Starting Point" placeholder="Enter starting location" />
          <FormField label="Ending Point" placeholder="Enter ending location" />
          <FormField label="Total Kilometer" placeholder="Enter total kilometers" type="number" />
        </div>
      </Card>

      {/* Kilometer Done by Staff */}
      <Card className="mt-4" padding={16}>
        <h3 className="font-['Poppins'] font-semibold text-[#1A1A1A] mb-3" style={{ fontSize: '14px' }}>
          Kilometer Done by Staff
        </h3>
        <input
          type="number"
          placeholder="Enter kilometers completed"
          className="w-full font-['Inter'] text-[#1A1A1A] placeholder-[#D1D5DB] bg-[#F9FAFB] rounded-[10px] px-3.5 outline-none"
          style={{ height: '48px', fontSize: '14px', border: '1px solid #E5E7EB' }}
        />
      </Card>

      {/* Upload Receipt */}
      <Card className="mt-4">
        <h3 className="font-['Poppins'] font-semibold text-[#1A1A1A] mb-1" style={{ fontSize: '14px' }}>
          Upload Receipt
        </h3>
        <p className="font-['Inter'] text-[#6B7280] mb-3" style={{ fontSize: '13px' }}>
          Upload fuel or mileage receipts for reimbursement
        </p>
        <button
          onClick={simulateUpload}
          className="w-full flex flex-col items-center justify-center bg-[#F9FAFB] rounded-xl"
          style={{ height: '100px', border: '2px dashed #D1D5DB' }}
        >
          <Upload className="w-8 h-8 text-[#9CA3AF] mb-1" strokeWidth={1.5} />
          <span className="font-['Inter'] font-medium text-[#6B7280]" style={{ fontSize: '14px' }}>
            Tap to upload receipt
          </span>
          <span className="font-['Inter'] text-[#D1D5DB]" style={{ fontSize: '11px' }}>
            JPEG, PNG, or PDF · Max 10MB
          </span>
        </button>

        {/* Uploaded receipt previews */}
        {receipts.length > 0 && (
          <div className="mt-3 space-y-2">
            {receipts.map((r, idx) => (
              <div
                key={idx}
                className="flex items-center gap-3 bg-white rounded-[10px] p-3"
                style={{ border: '0.5px solid #E5E7EB', height: '60px' }}
              >
                <div
                  className="w-10 h-10 rounded-md bg-[#F3F4F6] flex items-center justify-center flex-shrink-0"
                >
                  <FileText className="w-5 h-5 text-[#9CA3AF]" strokeWidth={2} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-['Inter'] font-medium text-[#1A1A1A] truncate" style={{ fontSize: '13px' }}>
                    {r.name}
                  </p>
                  <p className="font-['Inter'] text-[#9CA3AF]" style={{ fontSize: '11px' }}>
                    {r.size} · Uploaded just now
                  </p>
                </div>
                <button onClick={() => setReceipts((prev) => prev.filter((_, i) => i !== idx))}>
                  <Trash2 className="w-4 h-4 text-[#DC2626]" strokeWidth={2} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Receipt total */}
        <div className="mt-3">
          <label className="font-['Inter'] font-semibold text-[#6B7280] mb-1.5 block" style={{ fontSize: '12px' }}>
            Total Amount
          </label>
          <div className="relative">
            <span
              className="absolute left-3.5 top-1/2 -translate-y-1/2 font-['Inter'] text-[#6B7280]"
              style={{ fontSize: '14px' }}
            >
              $
            </span>
            <input
              type="number"
              placeholder="0.00"
              className="w-full font-['Inter'] text-[#1A1A1A] placeholder-[#D1D5DB] bg-[#F9FAFB] rounded-[10px] pl-7 pr-3.5 outline-none"
              style={{ height: '48px', fontSize: '14px', border: '1px solid #E5E7EB' }}
            />
          </div>
        </div>
      </Card>

      {/* Submit */}
      <button
        className="w-full mt-6 font-['Poppins'] font-semibold text-white bg-[#1F6F43] rounded-xl"
        style={{ height: '50px', fontSize: '15px' }}
      >
        Submit
      </button>
      <p className="font-['Inter'] text-[#9CA3AF] text-center mt-2" style={{ fontSize: '11px' }}>
        Transportation data will be sent to owner for review
      </p>
    </>
  );
}

/* ═══════════════════════════ SHARED COMPONENTS ═════════════════════ */

function Card({
  children,
  className = '',
  borderAccent,
  padding = 20,
}: {
  children: React.ReactNode;
  className?: string;
  borderAccent?: string;
  padding?: number;
}) {
  return (
    <div
      className={`bg-white rounded-2xl ${className}`}
      style={{
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        padding: `${padding}px`,
        borderLeft: borderAccent ? `4px solid ${borderAccent}` : 'none',
      }}
    >
      {children}
    </div>
  );
}

function MetaRows() {
  const rows = [
    { icon: Calendar, label: 'Date:', value: '10/02/2001' },
    { icon: User, label: 'Staff Name:', value: 'Benjamin Harris' },
    { icon: BadgeCheck, label: 'Staff ID:', value: '9987775' },
    { icon: User, label: 'Client Name:', value: 'Joseph' },
    { icon: Clock, label: 'Shift Time:', value: '08:30 – 13:30' },
  ];
  return (
    <div className="space-y-2">
      {rows.map((r, i) => (
        <div key={i} className="flex items-center gap-2">
          <r.icon className="w-4 h-4 text-[#6B7280] flex-shrink-0" strokeWidth={2} />
          <span className="font-['Inter'] text-[#6B7280]" style={{ fontSize: '13px' }}>{r.label}</span>
          <span className="font-['Inter'] font-semibold text-[#1A1A1A]" style={{ fontSize: '13px' }}>{r.value}</span>
        </div>
      ))}
    </div>
  );
}

function ShiftTimeline() {
  return (
    <div className="relative pl-10">
      {/* Vertical line */}
      <div className="absolute left-4 top-4 w-0.5 bg-[#1F6F43]" style={{ height: 'calc(100% - 50px)' }} />

      {/* Clock In */}
      <div className="relative mb-5">
        <div className="absolute -left-10 top-0 w-8 h-8 rounded-full bg-[#1F6F43] flex items-center justify-center">
          <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
        </div>
        <div>
          <p className="font-['Inter'] font-semibold text-[#1A1A1A]" style={{ fontSize: '14px' }}>Clock In</p>
          <p className="font-['Inter'] text-[#6B7280]" style={{ fontSize: '13px' }}>9:30 AM</p>
          <p className="font-['Inter'] text-[#9CA3AF]" style={{ fontSize: '12px' }}>Ontario, 15 BH Street</p>
          <div className="mt-2 rounded-lg overflow-hidden" style={{ height: '70px', border: '0.5px solid #E5E7EB' }}>
            <div className="relative w-full h-full">
              <ImageWithFallback src={MAP_IMG} alt="Check-in map" className="w-full h-full object-cover" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full">
                <div className="w-4 h-4 rounded-full bg-[#1F6F43] flex items-center justify-center" style={{ boxShadow: '0 1px 4px rgba(31,111,67,0.4)' }}>
                  <div className="w-1.5 h-1.5 rounded-full bg-white" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Clock Out */}
      <div className="relative">
        <div className="absolute -left-10 top-0 w-8 h-8 rounded-full bg-[#DC2626] flex items-center justify-center">
          <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
        </div>
        <div>
          <p className="font-['Inter'] font-semibold text-[#1A1A1A]" style={{ fontSize: '14px' }}>Clock Out</p>
          <p className="font-['Inter'] text-[#6B7280]" style={{ fontSize: '13px' }}>10:30 PM</p>
          <p className="font-['Inter'] text-[#9CA3AF]" style={{ fontSize: '12px' }}>Ontario, 20 Main Street</p>
          <div className="mt-2 rounded-lg overflow-hidden" style={{ height: '70px', border: '0.5px solid #E5E7EB' }}>
            <div className="relative w-full h-full">
              <ImageWithFallback src={MAP_IMG} alt="Check-out map" className="w-full h-full object-cover" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full">
                <div className="w-4 h-4 rounded-full bg-[#DC2626] flex items-center justify-center" style={{ boxShadow: '0 1px 4px rgba(220,38,38,0.4)' }}>
                  <div className="w-1.5 h-1.5 rounded-full bg-white" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Total hours */}
      <div className="flex items-center justify-between mt-5 pt-3" style={{ borderTop: '1px solid #F3F4F6' }}>
        <span className="font-['Inter'] font-medium text-[#6B7280]" style={{ fontSize: '14px' }}>Total Hours:</span>
        <span className="font-['Inter'] font-semibold text-[#1F6F43]" style={{ fontSize: '14px' }}>13 Hours</span>
      </div>
    </div>
  );
}

function InfoRow({ label, value, isLink }: { label: string; value: string; isLink?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="font-['Inter'] text-[#6B7280]" style={{ fontSize: '13px' }}>{label}</span>
      <span
        className={`font-['Inter'] font-medium ${isLink ? 'text-[#1F6F43]' : 'text-[#1A1A1A]'}`}
        style={{ fontSize: '13px' }}
      >
        {value}
      </span>
    </div>
  );
}

function FormField({
  label,
  placeholder,
  type = 'text',
}: {
  label: string;
  placeholder: string;
  type?: string;
}) {
  return (
    <div>
      <label className="font-['Inter'] font-semibold text-[#6B7280] mb-1.5 block" style={{ fontSize: '12px' }}>
        {label}
      </label>
      <input
        type={type}
        placeholder={placeholder}
        className="w-full font-['Inter'] text-[#1A1A1A] placeholder-[#D1D5DB] bg-[#F9FAFB] rounded-[10px] px-3.5 outline-none"
        style={{ height: '48px', fontSize: '14px', border: '1px solid #E5E7EB' }}
      />
    </div>
  );
}
