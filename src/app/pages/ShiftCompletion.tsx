import { useState, useRef } from 'react';
import { ChevronLeft, Camera, X, CheckCircle2, MapPin } from 'lucide-react';
import { useSafeNavigate } from '../hooks/useSafeNavigate';
import { useSearchParams } from 'react-router';

const routeStops = [
  {
    label: 'Pickup',
    address: '1234 Oak Street, Suite 5',
    time: '2:00 PM',
    dotColor: '#1F6F43',
    dotBg: '#DCFCE7',
  },
  {
    label: 'Visit Location',
    address: '500 City Hall Plaza',
    time: '3:00 PM – 4:30 PM',
    dotColor: '#185FA5',
    dotBg: '#DBEAFE',
  },
  {
    label: 'Drop-off',
    address: '789 Maple Avenue, Apt 3',
    time: '6:00 PM',
    dotColor: '#B91C1C',
    dotBg: '#FEE2E2',
  },
];

export function ShiftCompletion() {
  const navigate = useSafeNavigate();
  const [searchParams] = useSearchParams();
  const isOffice = searchParams.get('vehicle') === 'office';

  const [endReading, setEndReading] = useState('');
  const [shiftReport, setShiftReport] = useState('');
  const [driveComments, setDriveComments] = useState('');
  const [receiptPhoto, setReceiptPhoto] = useState<string | null>(null);
  const [expenseAmount, setExpenseAmount] = useState('');
  const [attempted, setAttempted] = useState(false);
  const [approved, setApproved] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const startReading = 12480;
  const totalDistance = endReading ? Math.max(0, parseInt(endReading) - startReading) : null;

  const handleReceiptPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setReceiptPhoto(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = () => {
    setAttempted(true);
    if (!shiftReport.trim()) return;
    setApproved(true);
  };

  const reportEmpty = attempted && !shiftReport.trim();

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F8F8F6' }}>
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <div className="px-5 pt-4 pb-3">
          <div className="flex items-center gap-3 mb-1">
            <button
              onClick={() => navigate(-1)}
              className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[#F3F4F6] transition-colors -ml-1"
            >
              <ChevronLeft className="w-5 h-5 text-[#1A1A1A]" strokeWidth={2} />
            </button>
            <h1 className="font-['Poppins'] font-semibold text-[#1A1A1A]" style={{ fontSize: '17px' }}>
              Complete Shift
            </h1>
          </div>
          <p className="font-['Inter'] text-[#6B7280] ml-11" style={{ fontSize: '13px' }}>
            Thu, 20 Mar · 2:00 – 6:00 PM
          </p>
        </div>
      </div>

      <div className="px-5 pt-5 pb-32">
        {/* Route */}
        <div className="bg-white p-5 mb-4" style={{ borderRadius: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          <h3 className="font-['Poppins'] font-semibold text-[#1A1A1A] mb-5" style={{ fontSize: '15px' }}>
            Route
          </h3>
          <div className="relative">
            {/* Vertical connector line */}
            <div
              className="absolute left-[7px] top-[10px]"
              style={{
                width: '2px',
                height: 'calc(100% - 20px)',
                background: 'linear-gradient(to bottom, #1F6F43, #185FA5, #B91C1C)',
                borderRadius: '1px',
                opacity: 0.3,
              }}
            />

            {routeStops.map((stop, i) => (
              <div key={stop.label} className="relative flex gap-4" style={{ paddingBottom: i < routeStops.length - 1 ? '28px' : '0' }}>
                {/* Node dot */}
                <div className="relative z-10 flex-shrink-0 mt-[2px]">
                  <div
                    className="w-4 h-4 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: stop.dotBg }}
                  >
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: stop.dotColor }}
                    />
                  </div>
                </div>

                {/* Stop content */}
                <div className="flex-1 min-w-0">
                  <p className="font-['Inter'] font-semibold text-[#1A1A1A] mb-0.5" style={{ fontSize: '14px' }}>
                    {stop.label}
                  </p>
                  <p className="font-['Inter'] text-[#4B5563] mb-0.5" style={{ fontSize: '13px' }}>
                    {stop.address}
                  </p>
                  <p className="font-['Inter'] text-[#9CA3AF] mb-2" style={{ fontSize: '11px' }}>
                    {stop.time}
                  </p>
                  <button
                    onClick={() => window.open(`https://maps.google.com/?q=${encodeURIComponent(stop.address)}`, '_blank')}
                    className="inline-flex items-center gap-1.5 px-3 rounded-full font-['Inter'] font-medium active:opacity-80 transition-opacity"
                    style={{
                      height: '28px',
                      fontSize: '11px',
                      color: '#1F6F43',
                      backgroundColor: '#F0FDF4',
                    }}
                  >
                    <MapPin className="w-3 h-3" strokeWidth={2.5} />
                    View on Maps
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* End odometer — office vehicle only */}
        {isOffice && (
          <div className="bg-white p-5 mb-4" style={{ borderRadius: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <label
              className="block font-['Inter'] font-semibold text-[#9CA3AF] mb-3 tracking-wider"
              style={{ fontSize: '11px', textTransform: 'uppercase' }}
            >
              End meter reading
            </label>
            <div
              className="flex items-center justify-center mb-3"
              style={{
                height: '64px',
                border: '1.5px solid #E5E7EB',
                borderRadius: '12px',
                backgroundColor: '#FFFFFF',
              }}
            >
              <input
                type="number"
                inputMode="numeric"
                placeholder="Enter reading"
                value={endReading}
                onChange={(e) => setEndReading(e.target.value)}
                className="w-full text-center font-['Inter'] font-medium text-[#1A1A1A] bg-transparent outline-none placeholder:text-[#D1D5DB]"
                style={{ fontSize: '24px' }}
              />
            </div>
            {totalDistance !== null && totalDistance > 0 && (
              <div className="flex items-center justify-center gap-1.5">
                <span className="font-['Inter'] font-medium text-[#1F6F43]" style={{ fontSize: '13px' }}>
                  Total distance: {totalDistance} km
                </span>
              </div>
            )}
          </div>
        )}

        {/* Shift report */}
        <div className="bg-white p-5 mb-4" style={{ borderRadius: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          <label
            className="block font-['Inter'] font-semibold text-[#9CA3AF] mb-3 tracking-wider"
            style={{ fontSize: '11px', textTransform: 'uppercase' }}
          >
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
              border: reportEmpty ? '1px solid #EF4444' : '1.5px solid #E5E7EB',
              borderRadius: '12px',
              lineHeight: '1.6',
            }}
          />
          {reportEmpty && (
            <p className="font-['Inter'] text-[#EF4444] mt-1.5" style={{ fontSize: '11px' }}>
              Shift report is required before submitting.
            </p>
          )}
        </div>

        {/* Drive comments */}
        <div className="bg-white p-5 mb-4" style={{ borderRadius: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          <label
            className="block font-['Inter'] font-semibold text-[#9CA3AF] mb-3 tracking-wider"
            style={{ fontSize: '11px', textTransform: 'uppercase' }}
          >
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

        {/* Additional expenses */}
        <div className="bg-white p-5 mb-4" style={{ borderRadius: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          <label
            className="block font-['Inter'] font-semibold text-[#9CA3AF] mb-3 tracking-wider"
            style={{ fontSize: '11px', textTransform: 'uppercase' }}
          >
            Additional expenses — optional
          </label>

          {receiptPhoto ? (
            <div className="relative inline-block mb-4">
              <img
                src={receiptPhoto}
                alt="Receipt"
                className="object-cover"
                style={{ width: '120px', height: '120px', borderRadius: '12px' }}
              />
              <button
                onClick={() => {
                  setReceiptPhoto(null);
                  if (fileRef.current) fileRef.current.value = '';
                }}
                className="absolute -top-2 -right-2 w-6 h-6 bg-[#1A1A1A] rounded-full flex items-center justify-center"
              >
                <X className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full flex flex-col items-center justify-center gap-2 py-6 mb-4 transition-colors active:bg-[#FAFAFA]"
              style={{
                border: '2px dashed #D1D5DB',
                borderRadius: '12px',
                backgroundColor: '#FFFFFF',
              }}
            >
              <div className="w-10 h-10 rounded-full bg-[#F3F4F6] flex items-center justify-center">
                <Camera className="w-5 h-5 text-[#9CA3AF]" strokeWidth={1.8} />
              </div>
              <span className="font-['Inter'] font-medium text-[#4B5563]" style={{ fontSize: '13px' }}>
                Take live photo of receipt
              </span>
            </button>
          )}

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleReceiptPhoto}
          />

          <input
            type="number"
            inputMode="decimal"
            placeholder="Amount (CAD)"
            value={expenseAmount}
            onChange={(e) => setExpenseAmount(e.target.value)}
            className="w-full font-['Inter'] text-[#1A1A1A] bg-white outline-none placeholder:text-[#D1D5DB]"
            style={{
              height: '48px',
              padding: '0 16px',
              fontSize: '14px',
              border: '1.5px solid #E5E7EB',
              borderRadius: '12px',
            }}
          />
        </div>
      </div>

      {/* CTA / Approved state */}
      <div className="fixed bottom-[88px] left-0 right-0 px-5 pb-4 pt-3" style={{ background: 'linear-gradient(to top, #F8F8F6 70%, transparent)' }}>
        {approved ? (
          <div className="flex flex-col items-center gap-1.5 py-2">
            <div
              className="inline-flex items-center gap-2 px-6 font-['Inter'] font-semibold text-white"
              style={{
                height: '40px',
                backgroundColor: '#1F6F43',
                borderRadius: '20px',
                fontSize: '14px',
              }}
            >
              <CheckCircle2 className="w-4 h-4" strokeWidth={2} />
              Approved by owner
            </div>
            <span className="font-['Inter'] text-[#9CA3AF]" style={{ fontSize: '11px' }}>
              Approved on Mar 20, 2026 at 6:12 PM
            </span>
          </div>
        ) : (
          <button
            disabled={!shiftReport.trim()}
            onClick={handleSubmit}
            className="w-full text-white font-['Inter'] font-semibold transition-opacity disabled:opacity-40"
            style={{
              height: '52px',
              backgroundColor: '#1F6F43',
              borderRadius: '12px',
              fontSize: '15px',
              boxShadow: shiftReport.trim() ? '0 2px 8px rgba(31,111,67,0.25)' : 'none',
            }}
          >
            Submit Report
          </button>
        )}
      </div>
    </div>
  );
}