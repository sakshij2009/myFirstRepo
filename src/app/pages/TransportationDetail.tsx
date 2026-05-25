import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  ArrowLeft,
  Calendar,
  User,
  Hash,
  Clock,
  ChevronDown,
  Plus,
  MapPin,
  Upload,
  CheckCircle2,
  Navigation,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';

interface Stop {
  id: number;
  address: string;
}

export function TransportationDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isNew = id === 'new';

  // Pre-populated data for existing records
  const existingData = !isNew
    ? {
        clientName: 'Joseph',
        clientInitials: 'JW',
        clientId: '6587879',
        staffName: 'Benjamin Harris',
        staffId: '9987775',
        date: '10/02/2001',
        shiftTime: '08:30 - 13:30',
        kmRateBefore: '72',
        kmRateAfter: '66',
        totalHours: '13',
      }
    : {
        clientName: 'Emma Thompson',
        clientInitials: 'ET',
        clientId: '0988765',
        staffName: 'Sarah Johnson',
        staffId: '1432569',
        date: '03/14/2026',
        shiftTime: '09:00 - 13:00',
        kmRateBefore: '72',
        kmRateAfter: '66',
        totalHours: '4',
      };

  const [activeTab, setActiveTab] = useState<'Reports' | 'Medications' | 'Transportations'>('Transportations');
  const [stops, setStops] = useState<Stop[]>([{ id: 1, address: '' }]);
  const [startingPoint, setStartingPoint] = useState('');
  const [endingPoint, setEndingPoint] = useState('');
  const [totalKm, setTotalKm] = useState('');
  const [kmByStaff, setKmByStaff] = useState('');
  const [receiptFile, setReceiptFile] = useState<string | null>(null);

  const addStop = () => {
    setStops([...stops, { id: stops.length + 1, address: '' }]);
  };

  const removeStop = (stopId: number) => {
    if (stops.length > 1) {
      setStops(stops.filter((s) => s.id !== stopId));
    }
  };

  const updateStopAddress = (stopId: number, address: string) => {
    setStops(stops.map((s) => (s.id === stopId ? { ...s, address } : s)));
  };

  const handleSubmit = () => {
    toast.success('Transportation report submitted successfully!');
    navigate('/routes');
  };

  const tabs = ['Reports', 'Medications', 'Transportations'] as const;

  return (
    <div className="pb-6">
      {/* Header */}
      <header className="px-5 pt-4 mb-1">
        <div className="flex items-center gap-3 mb-1">
          <button
            onClick={() => navigate('/routes')}
            className="w-10 h-10 flex items-center justify-center -ml-2"
          >
            <ArrowLeft className="w-6 h-6 text-[#1A1A1A]" strokeWidth={2} />
          </button>
          <div>
            <h1 className="font-['Poppins'] font-semibold text-[#1A1A1A]" style={{ fontSize: '18px' }}>
              Reports
            </h1>
            <p className="font-['Inter'] text-[#9CA3AF]" style={{ fontSize: '12px' }}>
              {existingData.staffName} | Intake Worker
            </p>
          </div>
        </div>
      </header>

      {/* Client selector bar */}
      <div className="px-5 mb-4">
        <button className="w-full flex items-center justify-between py-3 px-4 bg-white rounded-xl" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center font-['Inter'] font-semibold"
              style={{
                backgroundColor: '#E8F5F0',
                color: '#1F6F43',
                fontSize: '14px',
              }}
            >
              {existingData.clientInitials}
            </div>
            <div className="text-left">
              <div className="font-['Inter'] font-semibold text-[#1A1A1A]" style={{ fontSize: '14px' }}>
                {existingData.clientName}
              </div>
              <div className="font-['Inter'] text-[#9CA3AF]" style={{ fontSize: '12px' }}>
                ID: {existingData.clientId}
              </div>
            </div>
          </div>
          <ChevronDown className="w-5 h-5 text-[#9CA3AF]" strokeWidth={2} />
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="px-5 mb-5">
        <div className="flex border-b border-[#E5E7EB]">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="flex-1 pb-2.5 font-['Inter'] font-medium transition-colors relative"
              style={{
                fontSize: '13px',
                color: activeTab === tab ? '#1F6F43' : '#9CA3AF',
              }}
            >
              {tab}
              {activeTab === tab && (
                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#1F6F43] rounded-full"></div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Transportations Content */}
      <div className="px-5">
        {/* Transportation Info Card */}
        <div
          className="bg-white rounded-2xl p-5 mb-4 border-l-4 border-[#1F6F43]"
          style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
        >
          <h3 className="font-['Poppins'] font-semibold text-[#1A1A1A] mb-4" style={{ fontSize: '16px' }}>
            Transportations
          </h3>

          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Calendar className="w-4.5 h-4.5 text-[#9CA3AF] flex-shrink-0" strokeWidth={2} />
              <span className="font-['Inter'] text-[#6B7280]" style={{ fontSize: '14px' }}>
                Date - <span className="font-semibold text-[#1A1A1A]">{existingData.date}</span>
              </span>
            </div>

            <div className="flex items-center gap-3">
              <User className="w-4.5 h-4.5 text-[#9CA3AF] flex-shrink-0" strokeWidth={2} />
              <span className="font-['Inter'] text-[#6B7280]" style={{ fontSize: '14px' }}>
                Staff Name - <span className="font-semibold text-[#1A1A1A]">{existingData.staffName}</span>
              </span>
            </div>

            <div className="flex items-center gap-3">
              <Hash className="w-4.5 h-4.5 text-[#9CA3AF] flex-shrink-0" strokeWidth={2} />
              <span className="font-['Inter'] text-[#6B7280]" style={{ fontSize: '14px' }}>
                Staff ID - <span className="font-semibold text-[#1A1A1A]">{existingData.staffId}</span>
              </span>
            </div>

            <div className="flex items-center gap-3">
              <User className="w-4.5 h-4.5 text-[#9CA3AF] flex-shrink-0" strokeWidth={2} />
              <span className="font-['Inter'] text-[#6B7280]" style={{ fontSize: '14px' }}>
                Client Name - <span className="font-semibold text-[#1A1A1A]">{existingData.clientName}</span>
              </span>
            </div>

            <div className="flex items-center gap-3">
              <Clock className="w-4.5 h-4.5 text-[#9CA3AF] flex-shrink-0" strokeWidth={2} />
              <span className="font-['Inter'] text-[#6B7280]" style={{ fontSize: '14px' }}>
                Shift Time - <span className="font-semibold text-[#1A1A1A]">{existingData.shiftTime}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Kilometer per Rate Card */}
        <div
          className="bg-white rounded-2xl p-5 mb-4"
          style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
        >
          <h3 className="font-['Poppins'] font-semibold text-[#1A1A1A] mb-3" style={{ fontSize: '16px' }}>
            Kilometer per rate
          </h3>

          <div className="space-y-2">
            <div className="font-['Inter'] text-[#374151]" style={{ fontSize: '14px' }}>
              Before 5000 Kilometer{' '}
              <span className="font-semibold">{existingData.kmRateBefore}(¢)</span>
            </div>
            <div className="font-['Inter'] text-[#374151]" style={{ fontSize: '14px' }}>
              After 5000 Kilometer{' '}
              <span className="font-semibold">{existingData.kmRateAfter}(¢)</span>
            </div>
            <div className="font-['Inter'] text-[#1F6F43] font-semibold pt-1" style={{ fontSize: '14px' }}>
              Total Hours {existingData.totalHours} Hours
            </div>
          </div>
        </div>

        {/* Visit Destinations Card */}
        <div
          className="bg-white rounded-2xl p-5 mb-4 border-l-4 border-[#1F6F43]"
          style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-['Poppins'] font-semibold text-[#1A1A1A]" style={{ fontSize: '16px' }}>
              Visit Destinations
            </h3>
            <button
              onClick={addStop}
              className="flex items-center gap-1 font-['Inter'] font-medium text-[#1F6F43] hover:underline"
              style={{ fontSize: '13px' }}
            >
              <Plus className="w-4 h-4" strokeWidth={2} />
              Add another stop
            </button>
          </div>

          <div className="space-y-4">
            {stops.map((stop, index) => (
              <div key={stop.id}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-['Inter'] font-medium text-[#6B7280]" style={{ fontSize: '13px' }}>
                    Stop {index + 1}
                  </span>
                  {stops.length > 1 && (
                    <button
                      onClick={() => removeStop(stop.id)}
                      className="text-[#DC2626] hover:text-[#b91c1c]"
                    >
                      <Trash2 className="w-4 h-4" strokeWidth={2} />
                    </button>
                  )}
                </div>
                <textarea
                  value={stop.address}
                  onChange={(e) => updateStopAddress(stop.id, e.target.value)}
                  placeholder="Enter destination address"
                  className="w-full h-20 px-4 py-3 bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl font-['Inter'] text-[#1A1A1A] placeholder:text-[#9CA3AF] resize-none focus:outline-none focus:border-[#1F6F43] focus:ring-1 focus:ring-[#1F6F43] transition-colors"
                  style={{ fontSize: '14px' }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Route Details Card */}
        <div
          className="bg-white rounded-2xl p-5 mb-4"
          style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
        >
          <h3 className="font-['Poppins'] font-semibold text-[#1A1A1A] mb-4" style={{ fontSize: '16px' }}>
            Route Details
          </h3>

          <div className="space-y-4">
            <div>
              <label className="font-['Inter'] font-medium text-[#374151] mb-2 block" style={{ fontSize: '13px' }}>
                Starting Point
              </label>
              <input
                type="text"
                value={startingPoint}
                onChange={(e) => setStartingPoint(e.target.value)}
                placeholder="Enter starting location"
                className="w-full h-11 px-4 bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl font-['Inter'] text-[#1A1A1A] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#1F6F43] focus:ring-1 focus:ring-[#1F6F43] transition-colors"
                style={{ fontSize: '14px' }}
              />
            </div>

            <div>
              <label className="font-['Inter'] font-medium text-[#374151] mb-2 block" style={{ fontSize: '13px' }}>
                Ending Point
              </label>
              <input
                type="text"
                value={endingPoint}
                onChange={(e) => setEndingPoint(e.target.value)}
                placeholder="Enter ending location"
                className="w-full h-11 px-4 bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl font-['Inter'] text-[#1A1A1A] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#1F6F43] focus:ring-1 focus:ring-[#1F6F43] transition-colors"
                style={{ fontSize: '14px' }}
              />
            </div>

            <div>
              <label className="font-['Inter'] font-medium text-[#374151] mb-2 block" style={{ fontSize: '13px' }}>
                Total Kilometer
              </label>
              <input
                type="text"
                value={totalKm}
                onChange={(e) => setTotalKm(e.target.value)}
                placeholder="Enter total kilometers"
                className="w-full h-11 px-4 bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl font-['Inter'] text-[#1A1A1A] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#1F6F43] focus:ring-1 focus:ring-[#1F6F43] transition-colors"
                style={{ fontSize: '14px' }}
              />
            </div>
          </div>
        </div>

        {/* Kilometer Done by Staff Card */}
        <div
          className="bg-white rounded-2xl p-5 mb-4"
          style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
        >
          <h3 className="font-['Poppins'] font-semibold text-[#1A1A1A] mb-3" style={{ fontSize: '16px' }}>
            Kilometer Done by Staff
          </h3>
          <input
            type="text"
            value={kmByStaff}
            onChange={(e) => setKmByStaff(e.target.value)}
            placeholder="Enter kilometers completed"
            className="w-full h-11 px-4 bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl font-['Inter'] text-[#1A1A1A] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#1F6F43] focus:ring-1 focus:ring-[#1F6F43] transition-colors"
            style={{ fontSize: '14px' }}
          />
        </div>

        {/* Upload Receipt Card */}
        <div
          className="bg-white rounded-2xl p-5 mb-6"
          style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
        >
          <h3 className="font-['Poppins'] font-semibold text-[#1A1A1A] mb-3" style={{ fontSize: '16px' }}>
            Upload Receipt
          </h3>
          <button
            onClick={() => {
              setReceiptFile('receipt_march14.pdf');
              toast.success('Receipt uploaded successfully');
            }}
            className="w-full h-11 px-4 bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl font-['Inter'] text-[#9CA3AF] flex items-center justify-between hover:border-[#1F6F43] transition-colors"
            style={{ fontSize: '14px' }}
          >
            <span>{receiptFile || 'Please upload any receipt'}</span>
            <Upload className="w-5 h-5 text-[#9CA3AF]" strokeWidth={2} />
          </button>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            onClick={handleSubmit}
            className="px-8 h-12 bg-[#1F6F43] text-white rounded-[14px] font-['Poppins'] font-semibold hover:bg-[#1a5e38] transition-colors"
            style={{
              fontSize: '16px',
              boxShadow: '0 4px 12px rgba(31,111,67,0.2)',
            }}
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  );
}
