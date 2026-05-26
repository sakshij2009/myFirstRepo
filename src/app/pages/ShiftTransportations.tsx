import { ArrowLeft, Plus, Camera, X, Upload } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useState } from 'react';

interface Stop {
  id: string;
  destination: string;
  purpose: string;
}

export function ShiftTransportations() {
  const navigate = useNavigate();
  const [stops, setStops] = useState<Stop[]>([
    { id: '1', destination: '1234 Oak Street, Suite 5', purpose: 'Client pickup' },
    { id: '2', destination: '456 Maple Avenue', purpose: 'Therapy appointment' },
  ]);
  const [startPoint, setStartPoint] = useState('1234 Oak Street, Suite 5');
  const [endPoint, setEndPoint] = useState('1234 Oak Street, Suite 5');
  const [totalKm, setTotalKm] = useState('24.5');
  const [staffKm, setStaffKm] = useState('12.0');
  const [receipts, setReceipts] = useState<string[]>([]);

  const addStop = () => {
    setStops((prev) => [...prev, { id: Date.now().toString(), destination: '', purpose: '' }]);
  };

  const removeStop = (id: string) => {
    setStops((prev) => prev.filter((s) => s.id !== id));
  };

  const updateStop = (id: string, field: 'destination' | 'purpose', value: string) => {
    setStops((prev) => prev.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
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
              Transportations
            </h1>
            <div className="font-['Inter'] text-[#9CA3AF] mt-1" style={{ fontSize: '12px' }}>
              Emma Thompson · ID: 0988765
            </div>
          </div>
        </header>

        {/* Transportation Summary */}
        <div
          className="bg-white rounded-2xl p-5 mb-4"
          style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
        >
          <h3 className="font-['Poppins'] font-semibold text-[#1A1A1A] mb-4" style={{ fontSize: '14px' }}>
            Transportation Summary
          </h3>
          <div className="space-y-2.5">
            {[
              { label: 'DATE', value: 'March 14, 2026' },
              { label: 'STAFF NAME', value: 'Sarah Johnson' },
              { label: 'STAFF ID', value: 'CYIM: 1432569' },
              { label: 'CLIENT', value: 'Emma Thompson' },
              { label: 'SHIFT TIME', value: '9:00 AM – 1:00 PM' },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between py-1">
                <span className="font-['Inter'] text-[#9CA3AF]" style={{ fontSize: '12px' }}>
                  {row.label}
                </span>
                <span className="font-['Inter'] font-medium text-[#1A1A1A]" style={{ fontSize: '13px' }}>
                  {row.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Kilometer Per Rate */}
        <div
          className="bg-white rounded-2xl p-5 mb-4"
          style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
        >
          <h3 className="font-['Poppins'] font-semibold text-[#1A1A1A] mb-3" style={{ fontSize: '14px' }}>
            Kilometer Reimbursement Rates
          </h3>
          <div className="space-y-2">
            {[
              { range: 'Before 5,000 km', rate: '72¢/km' },
              { range: 'After 5,000 km', rate: '66¢/km' },
            ].map((tier) => (
              <div
                key={tier.range}
                className="flex items-center justify-between py-2 px-3 rounded-lg"
                style={{ backgroundColor: '#F9FAFB' }}
              >
                <span className="font-['Inter'] text-[#6B7280]" style={{ fontSize: '13px' }}>
                  {tier.range}
                </span>
                <span className="font-['Inter'] font-semibold text-[#1F6F43]" style={{ fontSize: '13px' }}>
                  {tier.rate}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Visit Destinations */}
        <div
          className="bg-white rounded-2xl p-5 mb-4"
          style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
        >
          <h3 className="font-['Poppins'] font-semibold text-[#1A1A1A] mb-4" style={{ fontSize: '14px' }}>
            Visit Destinations
          </h3>
          <div className="space-y-3">
            {stops.map((stop, idx) => (
              <div
                key={stop.id}
                className="rounded-xl p-3"
                style={{ border: '1px solid #F3F4F6', backgroundColor: '#F9FAFB' }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-['Inter'] font-semibold text-[#1A1A1A]" style={{ fontSize: '13px' }}>
                    Stop {idx + 1}
                  </span>
                  {stops.length > 1 && (
                    <button onClick={() => removeStop(stop.id)} className="p-1">
                      <X className="w-4 h-4 text-[#9CA3AF]" strokeWidth={2} />
                    </button>
                  )}
                </div>
                <input
                  value={stop.destination}
                  onChange={(e) => updateStop(stop.id, 'destination', e.target.value)}
                  placeholder="Destination address"
                  className="w-full font-['Inter'] text-[#1A1A1A] placeholder-[#D1D5DB] outline-none mb-2"
                  style={{
                    fontSize: '13px',
                    height: '38px',
                    border: '1px solid #E5E7EB',
                    borderRadius: '10px',
                    padding: '0 12px',
                    backgroundColor: '#FFFFFF',
                  }}
                />
                <input
                  value={stop.purpose}
                  onChange={(e) => updateStop(stop.id, 'purpose', e.target.value)}
                  placeholder="Purpose of visit"
                  className="w-full font-['Inter'] text-[#1A1A1A] placeholder-[#D1D5DB] outline-none"
                  style={{
                    fontSize: '13px',
                    height: '38px',
                    border: '1px solid #E5E7EB',
                    borderRadius: '10px',
                    padding: '0 12px',
                    backgroundColor: '#FFFFFF',
                  }}
                />
              </div>
            ))}
          </div>
          <button
            onClick={addStop}
            className="w-full mt-3 flex items-center justify-center gap-1.5 rounded-[10px] font-['Inter'] font-medium text-[#1F6F43] transition-colors active:bg-[#F0FDF4]"
            style={{ height: '40px', fontSize: '13px', border: '1px dashed #1F6F43' }}
          >
            <Plus className="w-4 h-4" strokeWidth={2} />
            Add Another Stop
          </button>
        </div>

        {/* Route Details */}
        <div
          className="bg-white rounded-2xl p-5 mb-4"
          style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
        >
          <h3 className="font-['Poppins'] font-semibold text-[#1A1A1A] mb-4" style={{ fontSize: '14px' }}>
            Route Details
          </h3>
          <label className="font-['Inter'] text-[#6B7280] mb-1.5 block" style={{ fontSize: '12px' }}>
            Starting Point
          </label>
          <input
            value={startPoint}
            onChange={(e) => setStartPoint(e.target.value)}
            className="w-full font-['Inter'] text-[#1A1A1A] outline-none mb-3"
            style={{
              fontSize: '13px',
              height: '42px',
              border: '1.5px solid #E5E7EB',
              borderRadius: '12px',
              padding: '0 14px',
              backgroundColor: '#F9FAFB',
            }}
          />
          <label className="font-['Inter'] text-[#6B7280] mb-1.5 block" style={{ fontSize: '12px' }}>
            Ending Point
          </label>
          <input
            value={endPoint}
            onChange={(e) => setEndPoint(e.target.value)}
            className="w-full font-['Inter'] text-[#1A1A1A] outline-none mb-3"
            style={{
              fontSize: '13px',
              height: '42px',
              border: '1.5px solid #E5E7EB',
              borderRadius: '12px',
              padding: '0 14px',
              backgroundColor: '#F9FAFB',
            }}
          />
          <label className="font-['Inter'] text-[#6B7280] mb-1.5 block" style={{ fontSize: '12px' }}>
            Total Kilometers
          </label>
          <input
            value={totalKm}
            onChange={(e) => setTotalKm(e.target.value)}
            type="number"
            className="w-full font-['Inter'] text-[#1A1A1A] outline-none"
            style={{
              fontSize: '13px',
              height: '42px',
              border: '1.5px solid #E5E7EB',
              borderRadius: '12px',
              padding: '0 14px',
              backgroundColor: '#F9FAFB',
            }}
          />
        </div>

        {/* Kilometer Done by Staff */}
        <div
          className="bg-white rounded-2xl p-5 mb-4"
          style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
        >
          <h3 className="font-['Poppins'] font-semibold text-[#1A1A1A] mb-3" style={{ fontSize: '14px' }}>
            Kilometer Done by Staff
          </h3>
          <p className="font-['Inter'] text-[#6B7280] mb-3" style={{ fontSize: '12px' }}>
            Kilometers driven using personal vehicle for this shift
          </p>
          <input
            value={staffKm}
            onChange={(e) => setStaffKm(e.target.value)}
            type="number"
            className="w-full font-['Inter'] text-[#1A1A1A] outline-none"
            style={{
              fontSize: '13px',
              height: '42px',
              border: '1.5px solid #E5E7EB',
              borderRadius: '12px',
              padding: '0 14px',
              backgroundColor: '#F9FAFB',
            }}
          />
          <div className="flex items-center justify-between mt-3 p-3 rounded-lg" style={{ backgroundColor: '#F0FDF4' }}>
            <span className="font-['Inter'] text-[#1F6F43]" style={{ fontSize: '13px' }}>
              Estimated reimbursement
            </span>
            <span className="font-['Inter'] font-semibold text-[#1F6F43]" style={{ fontSize: '14px' }}>
              ${(parseFloat(staffKm || '0') * 0.52).toFixed(2)}
            </span>
          </div>
        </div>

        {/* Upload Receipt */}
        <div
          className="bg-white rounded-2xl p-5 mb-6"
          style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
        >
          <h3 className="font-['Poppins'] font-semibold text-[#1A1A1A] mb-3" style={{ fontSize: '14px' }}>
            Upload Receipts
          </h3>
          <p className="font-['Inter'] text-[#6B7280] mb-3" style={{ fontSize: '12px' }}>
            Upload fuel or mileage receipts for reimbursement
          </p>

          {receipts.length > 0 && (
            <div className="flex gap-2 overflow-x-auto mb-3 pb-1" style={{ scrollbarWidth: 'none' }}>
              {receipts.map((r, i) => (
                <div
                  key={i}
                  className="relative flex-shrink-0 rounded-lg overflow-hidden"
                  style={{ width: '80px', height: '80px', border: '1px solid #E5E7EB' }}
                >
                  <div className="w-full h-full bg-[#F3F4F6] flex items-center justify-center">
                    <span className="font-['Inter'] text-[#9CA3AF]" style={{ fontSize: '10px' }}>
                      Receipt {i + 1}
                    </span>
                  </div>
                  <button
                    onClick={() => setReceipts((prev) => prev.filter((_, idx) => idx !== i))}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/50 flex items-center justify-center"
                  >
                    <X className="w-3 h-3 text-white" strokeWidth={2.5} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={() => setReceipts((prev) => [...prev, 'receipt'])}
            className="w-full flex flex-col items-center justify-center gap-2 rounded-xl py-6 transition-colors active:bg-[#F9FAFB]"
            style={{ border: '1.5px dashed #D1D5DB' }}
          >
            <div className="w-10 h-10 rounded-full bg-[#F3F4F6] flex items-center justify-center">
              <Camera className="w-5 h-5 text-[#9CA3AF]" strokeWidth={2} />
            </div>
            <span className="font-['Inter'] text-[#6B7280]" style={{ fontSize: '13px' }}>
              Tap to upload receipt
            </span>
          </button>
        </div>

        {/* Submit Button */}
        <button
          className="w-full rounded-[14px] font-['Inter'] font-semibold text-white bg-[#1F6F43]"
          style={{
            height: '52px',
            fontSize: '16px',
            boxShadow: '0 4px 12px rgba(31,111,67,0.2)',
          }}
        >
          Submit Transportation Data
        </button>
      </div>
    </div>
  );
}