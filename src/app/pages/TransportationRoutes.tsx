import { useState } from 'react';
import { useNavigate } from 'react-router';
import { CheckCircle2, Circle, MapPin, Clock, Car, ChevronDown, Plus, Filter, Navigation } from 'lucide-react';

interface TransportationRecord {
  id: string;
  clientName: string;
  clientInitials: string;
  clientId: string;
  status: 'completed' | 'in-progress' | 'upcoming';
  date: string;
  time: string;
  seatType: string;
  transportationType: string;
  pickup: {
    address: string;
    time: string;
    completed: boolean;
  };
  visit?: {
    location: string;
    time: string;
    completed: boolean;
  };
  dropoff: {
    address: string;
    time: string;
    completed: boolean;
  };
}

const mockTransportations: TransportationRecord[] = [
  {
    id: '1',
    clientName: 'Joseph Walker',
    clientInitials: 'JW',
    clientId: '0987654',
    status: 'completed',
    date: 'March 14, 2026',
    time: '10:00 AM',
    seatType: 'Forward Facing Seat',
    transportationType: 'Staff Car',
    pickup: {
      address: 'Ontario, 15 BH Street',
      time: '10:00 AM',
      completed: true,
    },
    visit: {
      location: 'Family Forever, Inc',
      time: '10:30 AM',
      completed: true,
    },
    dropoff: {
      address: 'Ontario, 20 Main Street',
      time: '02:00 PM',
      completed: true,
    },
  },
  {
    id: '2',
    clientName: 'Emma Thompson',
    clientInitials: 'ET',
    clientId: '0988765',
    status: 'in-progress',
    date: 'March 14, 2026',
    time: '2:30 PM',
    seatType: 'Booster Seat',
    transportationType: 'Staff Car',
    pickup: {
      address: 'Ontario, 1234 Oak Street',
      time: '2:30 PM',
      completed: true,
    },
    visit: {
      location: 'Oakridge Elementary School',
      time: '2:45 PM',
      completed: false,
    },
    dropoff: {
      address: 'Ontario, 56 Elm Avenue',
      time: '3:30 PM',
      completed: false,
    },
  },
  {
    id: '3',
    clientName: 'Liam Roberts',
    clientInitials: 'LR',
    clientId: '0976543',
    status: 'upcoming',
    date: 'March 15, 2026',
    time: '9:00 AM',
    seatType: 'Regular Seat',
    transportationType: 'Agency Vehicle',
    pickup: {
      address: 'Ontario, 88 Willow Drive',
      time: '9:00 AM',
      completed: false,
    },
    dropoff: {
      address: 'Ontario, 42 Cedar Lane',
      time: '10:00 AM',
      completed: false,
    },
  },
];

function StatusBadge({ status }: { status: TransportationRecord['status'] }) {
  const config = {
    completed: { bg: '#F0FDF4', color: '#1F6F43', label: 'Completed', icon: CheckCircle2 },
    'in-progress': { bg: '#FFF8E1', color: '#92600A', label: 'In Progress', icon: Circle },
    upcoming: { bg: '#EBF5FF', color: '#1E5FA6', label: 'Upcoming', icon: Clock },
  }[status];

  const Icon = config.icon;

  return (
    <div
      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-['Inter'] font-semibold"
      style={{ backgroundColor: config.bg, color: config.color, fontSize: '11px' }}
    >
      <Icon className="w-3.5 h-3.5" strokeWidth={2.5} />
      {config.label}
    </div>
  );
}

function TimelineNode({ completed, color }: { completed: boolean; color: string }) {
  return (
    <div
      className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
      style={{
        backgroundColor: completed ? color : '#F3F4F6',
        border: completed ? 'none' : `2px solid #D1D5DB`,
      }}
    >
      {completed && <CheckCircle2 className="w-5 h-5 text-white" strokeWidth={2.5} />}
    </div>
  );
}

function TransportationCard({ transport }: { transport: TransportationRecord }) {
  const navigate = useNavigate();

  return (
    <div
      className="bg-white rounded-2xl p-5 mb-4"
      style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
    >
      {/* Header row */}
      <div className="flex items-center justify-between mb-4">
        <StatusBadge status={transport.status} />
        <span className="font-['Inter'] font-medium text-[#6B7280]" style={{ fontSize: '13px' }}>
          {transport.time}
        </span>
      </div>

      {/* Timeline */}
      <div className="relative pl-12 space-y-5 mb-5">
        {/* Vertical connector line */}
        <div
          className="absolute left-[15px] top-4 w-0.5 bg-[#E5E7EB]"
          style={{ height: transport.visit ? 'calc(100% - 32px)' : 'calc(100% - 40px)' }}
        ></div>

        {/* Pick Up */}
        <div className="relative">
          <div className="absolute -left-12 top-0">
            <TimelineNode completed={transport.pickup.completed} color="#22C55E" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#22C55E]" strokeWidth={2} />
              <span className="font-['Inter'] font-semibold text-[#1A1A1A]" style={{ fontSize: '14px' }}>
                Pick Up
              </span>
            </div>
            <div className="font-['Inter'] text-[#374151] mt-0.5" style={{ fontSize: '13px' }}>
              {transport.pickup.address}
            </div>
            <div className="font-['Inter'] text-[#9CA3AF]" style={{ fontSize: '12px' }}>
              {transport.pickup.time}
            </div>
          </div>
        </div>

        {/* Visit (optional) */}
        {transport.visit && (
          <div className="relative">
            <div className="absolute -left-12 top-0">
              <TimelineNode completed={transport.visit.completed} color="#F59E0B" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#F59E0B]" strokeWidth={2} />
                <span className="font-['Inter'] font-semibold text-[#1A1A1A]" style={{ fontSize: '14px' }}>
                  Visit
                </span>
              </div>
              <div className="font-['Inter'] text-[#374151] mt-0.5" style={{ fontSize: '13px' }}>
                {transport.visit.location}
              </div>
              <div className="font-['Inter'] text-[#9CA3AF]" style={{ fontSize: '12px' }}>
                {transport.visit.completed ? `Arrived: ${transport.visit.time}` : `ETA: ${transport.visit.time}`}
              </div>
            </div>
          </div>
        )}

        {/* Drop Off */}
        <div className="relative">
          <div className="absolute -left-12 top-0">
            <TimelineNode completed={transport.dropoff.completed} color="#EF4444" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#EF4444]" strokeWidth={2} />
              <span className="font-['Inter'] font-semibold text-[#1A1A1A]" style={{ fontSize: '14px' }}>
                Drop Off
              </span>
            </div>
            <div className="font-['Inter'] text-[#374151] mt-0.5" style={{ fontSize: '13px' }}>
              {transport.dropoff.address}
            </div>
            <div className="font-['Inter'] text-[#9CA3AF]" style={{ fontSize: '12px' }}>
              {transport.dropoff.completed ? `Dropped: ${transport.dropoff.time}` : `ETA: ${transport.dropoff.time}`}
            </div>
          </div>
        </div>
      </div>

      {/* Info rows */}
      <div className="border-t border-[#F3F4F6] pt-3 space-y-0">
        <div className="flex items-center justify-between py-2 border-b border-[#F3F4F6]">
          <span className="font-['Inter'] text-[#9CA3AF]" style={{ fontSize: '13px' }}>Client:</span>
          <span className="font-['Inter'] font-medium text-[#1A1A1A]" style={{ fontSize: '14px' }}>
            {transport.clientName}
          </span>
        </div>
        <div className="flex items-center justify-between py-2 border-b border-[#F3F4F6]">
          <span className="font-['Inter'] text-[#9CA3AF]" style={{ fontSize: '13px' }}>Client ID:</span>
          <span className="font-['Inter'] font-medium text-[#1A1A1A]" style={{ fontSize: '14px' }}>
            {transport.clientId}
          </span>
        </div>
        <div className="flex items-center justify-between py-2 border-b border-[#F3F4F6]">
          <span className="font-['Inter'] text-[#9CA3AF]" style={{ fontSize: '13px' }}>Seat Type:</span>
          <span className="font-['Inter'] font-medium text-[#1A1A1A]" style={{ fontSize: '14px' }}>
            {transport.seatType}
          </span>
        </div>
        <div className="flex items-center justify-between py-2">
          <span className="font-['Inter'] text-[#9CA3AF]" style={{ fontSize: '13px' }}>Transportation:</span>
          <span className="font-['Inter'] font-medium text-[#1A1A1A]" style={{ fontSize: '14px' }}>
            {transport.transportationType}
          </span>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3 mt-4">
        <button
          className="flex-1 h-11 rounded-[10px] font-['Inter'] font-semibold border-[1.5px] border-[#1F6F43] text-[#1F6F43] hover:bg-[#F0FDF4] transition-colors"
          style={{ fontSize: '14px' }}
        >
          View in Maps
        </button>
        <button
          onClick={() => navigate(`/routes/${transport.id}`)}
          className="flex-1 h-11 rounded-[10px] font-['Inter'] font-semibold bg-[#1F6F43] text-white hover:bg-[#1a5e38] transition-colors"
          style={{ fontSize: '14px' }}
        >
          View More
        </button>
      </div>
    </div>
  );
}

export function TransportationRoutes() {
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState<'all' | 'completed' | 'in-progress' | 'upcoming'>('all');

  const filteredTransportations =
    activeFilter === 'all'
      ? mockTransportations
      : mockTransportations.filter((t) => t.status === activeFilter);

  const filters = [
    { key: 'all' as const, label: 'All' },
    { key: 'upcoming' as const, label: 'Upcoming' },
    { key: 'in-progress' as const, label: 'Active' },
    { key: 'completed' as const, label: 'Done' },
  ];

  return (
    <div className="px-5 pb-6">
      {/* Header */}
      <header className="pt-4 mb-5">
        <div className="flex items-center justify-between mb-1">
          <div>
            <h1 className="font-['Poppins'] font-bold text-[#1A1A1A]" style={{ fontSize: '22px' }}>
              Transportation
            </h1>
            <p className="font-['Inter'] text-[#9CA3AF]" style={{ fontSize: '13px' }}>
              Recent Transportations
            </p>
          </div>
          <button
            onClick={() => navigate('/routes/new')}
            className="w-10 h-10 rounded-full bg-[#1F6F43] flex items-center justify-center hover:bg-[#1a5e38] transition-colors"
            style={{ boxShadow: '0 4px 12px rgba(31,111,67,0.25)' }}
          >
            <Plus className="w-5 h-5 text-white" strokeWidth={2.5} />
          </button>
        </div>
      </header>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setActiveFilter(f.key)}
            className="px-4 py-2 rounded-full font-['Inter'] font-medium whitespace-nowrap transition-colors"
            style={{
              fontSize: '13px',
              backgroundColor: activeFilter === f.key ? '#1F6F43' : '#F3F4F6',
              color: activeFilter === f.key ? '#FFFFFF' : '#6B7280',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Transportation Cards */}
      {filteredTransportations.length > 0 ? (
        filteredTransportations.map((transport) => (
          <TransportationCard key={transport.id} transport={transport} />
        ))
      ) : (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="w-16 h-16 rounded-full bg-[#F3F4F6] flex items-center justify-center mb-4">
            <Navigation className="w-7 h-7 text-[#9CA3AF]" strokeWidth={2} />
          </div>
          <div className="font-['Inter'] font-medium text-[#9CA3AF]" style={{ fontSize: '15px' }}>
            No transportations found
          </div>
          <div className="font-['Inter'] text-[#D1D5DB] mt-1" style={{ fontSize: '13px' }}>
            Try a different filter
          </div>
        </div>
      )}
    </div>
  );
}
