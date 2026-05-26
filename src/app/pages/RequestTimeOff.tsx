import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { ChevronLeft, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

// ─── Types ────────────────────────────────────────────────────────────
type LeaveType = 'vacation' | 'sick' | 'personal' | 'emergency';

interface ConflictShift {
  id: string;
  name: string;
  client: string;
  date: string;
  time: string;
  status: 'assigned' | 'pending';
  dotColor: string;
}

// ─── Mock Shifts Data ─────────────────────────────────────────────────
const allShifts: ConflictShift[] = [
  {
    id: '1',
    name: 'Respite Care',
    client: 'Emma Thompson',
    date: 'Mar 20, 2026',
    time: '9:00 AM – 1:00 PM',
    status: 'assigned',
    dotColor: '#EF4444',
  },
  {
    id: '2',
    name: 'Transportation',
    client: 'Liam Roberts',
    date: 'Mar 20, 2026',
    time: '2:00 PM – 4:00 PM',
    status: 'pending',
    dotColor: '#F59E0B',
  },
  {
    id: '3',
    name: 'Supervised Visit',
    client: 'Lucas Martinez',
    date: 'Mar 21, 2026',
    time: '10:00 AM – 12:00 PM',
    status: 'assigned',
    dotColor: '#EF4444',
  },
];

// ─── Component ────────────────────────────────────────────────────────
export function RequestTimeOff() {
  const navigate = useNavigate();

  const [leaveType, setLeaveType] = useState<LeaveType>('vacation');
  const [fromDate, setFromDate] = useState('2026-03-20');
  const [toDate, setToDate] = useState('2026-03-22');
  const [note, setNote] = useState('');

  // Simulate conflict detection based on date range
  const hasConflicts = useMemo(() => {
    // Conflicts exist when the range covers Mar 20 or 21
    const from = new Date(fromDate);
    const to = new Date(toDate);
    const conflictDate1 = new Date('2026-03-20');
    const conflictDate2 = new Date('2026-03-21');
    return (
      (from <= conflictDate1 && to >= conflictDate1) ||
      (from <= conflictDate2 && to >= conflictDate2)
    );
  }, [fromDate, toDate]);

  const shiftsInPeriod = hasConflicts ? allShifts : [];

  const leaveOptions: { key: LeaveType; label: string }[] = [
    { key: 'vacation', label: 'Vacation' },
    { key: 'sick', label: 'Sick leave' },
    { key: 'personal', label: 'Personal day' },
    { key: 'emergency', label: 'Emergency' },
  ];

  const handleSubmit = () => {
    toast.success('Time-off request submitted for manager review.');
    navigate('/availability');
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#F8F8F6]">
      {/* ── Scrollable Content ─────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto pb-28">
        {/* Header */}
        <header className="px-5 pt-5 pb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/availability')}
              className="w-9 h-9 flex items-center justify-center -ml-1.5 rounded-full hover:bg-[#F3F4F6] transition-colors"
            >
              <ChevronLeft className="w-6 h-6 text-[#1A1A1A]" strokeWidth={2} />
            </button>
            <div>
              <h1
                className="font-['Inter'] font-medium text-[#1A1A1A]"
                style={{ fontSize: '15px' }}
              >
                Request time off
              </h1>
              <p
                className="font-['Inter'] text-[#9CA3AF]"
                style={{ fontSize: '12px' }}
              >
                Conflict check runs automatically
              </p>
            </div>
          </div>
        </header>

        <div className="px-5 space-y-4">
          {/* ── 1. Leave Type Pills ──────────────────────────────────── */}
          <div>
            <label
              className="font-['Inter'] font-medium text-[#374151] mb-2.5 block"
              style={{ fontSize: '13px' }}
            >
              Leave type
            </label>
            <div className="flex flex-wrap gap-2">
              {leaveOptions.map(opt => {
                const isActive = leaveType === opt.key;
                return (
                  <button
                    key={opt.key}
                    onClick={() => setLeaveType(opt.key)}
                    className="rounded-full font-['Inter'] font-medium transition-all"
                    style={{
                      fontSize: '13px',
                      padding: '7px 16px',
                      backgroundColor: isActive ? '#1F6F43' : 'transparent',
                      color: isActive ? '#FFFFFF' : '#374151',
                      border: isActive ? '1.5px solid #1F6F43' : '1.5px solid #D1D5DB',
                    }}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── 2. From Date ─────────────────────────────────────────── */}
          <div>
            <label
              className="font-['Inter'] font-medium text-[#374151] mb-2 block"
              style={{ fontSize: '13px' }}
            >
              From
            </label>
            <input
              type="date"
              value={fromDate}
              onChange={e => setFromDate(e.target.value)}
              className="w-full bg-white border border-[#E5E7EB] rounded-lg font-['Inter'] text-[#1A1A1A] focus:outline-none focus:border-[#1F6F43] focus:ring-1 focus:ring-[#1F6F43] transition-colors"
              style={{ fontSize: '14px', padding: '10px 12px' }}
            />
          </div>

          {/* ── 3. To Date ───────────────────────────────────────────── */}
          <div>
            <label
              className="font-['Inter'] font-medium text-[#374151] mb-2 block"
              style={{ fontSize: '13px' }}
            >
              To
            </label>
            <input
              type="date"
              value={toDate}
              onChange={e => setToDate(e.target.value)}
              className="w-full bg-white border border-[#E5E7EB] rounded-lg font-['Inter'] text-[#1A1A1A] focus:outline-none focus:border-[#1F6F43] focus:ring-1 focus:ring-[#1F6F43] transition-colors"
              style={{ fontSize: '14px', padding: '10px 12px' }}
            />
          </div>

          {/* ── 4. Shifts in this Period ──────────────────────────────── */}
          <div>
            <label
              className="font-['Inter'] font-medium text-[#374151] mb-2 block"
              style={{ fontSize: '13px' }}
            >
              Shifts in this period
            </label>

            {shiftsInPeriod.length > 0 ? (
              <div
                className="rounded-[10px] overflow-hidden"
                style={{ backgroundColor: '#F5F5F5', padding: '12px' }}
              >
                {shiftsInPeriod.map((shift, idx) => (
                  <div key={shift.id}>
                    <div className="flex items-center justify-between py-2">
                      {/* Left: dot + info */}
                      <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        <div
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: shift.dotColor }}
                        />
                        <div className="min-w-0 flex-1">
                          <div
                            className="font-['Inter'] font-medium text-[#1A1A1A] truncate"
                            style={{ fontSize: '12px' }}
                          >
                            {shift.name} · {shift.client}
                          </div>
                          <div
                            className="font-['Inter'] text-[#9CA3AF]"
                            style={{ fontSize: '11px' }}
                          >
                            {shift.date} · {shift.time}
                          </div>
                        </div>
                      </div>

                      {/* Status pill */}
                      <div
                        className="flex-shrink-0 ml-2 px-2 py-[2px] rounded-full font-['Inter'] font-medium"
                        style={{
                          fontSize: '10px',
                          backgroundColor:
                            shift.status === 'assigned' ? '#FEF2F2' : '#FFF8E1',
                          color:
                            shift.status === 'assigned' ? '#B91C1C' : '#92600A',
                        }}
                      >
                        {shift.status === 'assigned' ? 'Assigned' : 'Pending'}
                      </div>
                    </div>

                    {/* Divider */}
                    {idx < shiftsInPeriod.length - 1 && (
                      <div className="h-px bg-[#E5E7EB] opacity-50" />
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div
                className="rounded-[10px] flex items-center justify-center py-5"
                style={{ backgroundColor: '#F5F5F5' }}
              >
                <span
                  className="font-['Inter'] text-[#9CA3AF]"
                  style={{ fontSize: '12px' }}
                >
                  No shifts scheduled in this period
                </span>
              </div>
            )}
          </div>

          {/* ── 5. Conflict Alert or Success Box ─────────────────────── */}
          {hasConflicts ? (
            <div
              className="rounded-[10px] overflow-hidden"
              style={{
                backgroundColor: '#FFF3F3',
                border: '0.5px solid #FECACA',
                padding: '12px 14px',
              }}
            >
              {/* Alert header */}
              <div className="flex items-start gap-2.5 mb-2">
                <AlertTriangle
                  className="w-4 h-4 text-[#DC2626] flex-shrink-0 mt-[1px]"
                  strokeWidth={2.5}
                />
                <div className="flex-1">
                  <div
                    className="font-['Inter'] font-semibold text-[#991B1B]"
                    style={{ fontSize: '13px' }}
                  >
                    Shift conflict detected
                  </div>
                  <p
                    className="font-['Inter'] text-[#9CA3AF] mt-0.5"
                    style={{ fontSize: '12px', lineHeight: '1.5' }}
                  >
                    The following assigned shifts overlap with your requested
                    dates. Your manager will be notified to arrange coverage.
                  </p>
                </div>
              </div>

              {/* Conflict bullet list */}
              <div
                className="ml-[26px] mt-2 pl-3"
                style={{ borderLeft: '2px solid #FECACA' }}
              >
                <div className="space-y-1.5">
                  <div
                    className="font-['Inter'] text-[#991B1B]"
                    style={{ fontSize: '12px', lineHeight: '1.5' }}
                  >
                    <span className="font-medium">Mar 20</span> — Respite Care
                    with Emma T. (9 AM – 1 PM)
                  </div>
                  <div
                    className="font-['Inter'] text-[#991B1B]"
                    style={{ fontSize: '12px', lineHeight: '1.5' }}
                  >
                    <span className="font-medium">Mar 20</span> —
                    Transportation with Liam R. (2 – 4 PM)
                  </div>
                  <div
                    className="font-['Inter'] text-[#991B1B]"
                    style={{ fontSize: '12px', lineHeight: '1.5' }}
                  >
                    <span className="font-medium">Mar 21</span> — Supervised
                    Visit with Lucas M. (10 AM – 12 PM)
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div
              className="rounded-[10px] flex items-center gap-2.5"
              style={{
                backgroundColor: '#F0FDF4',
                border: '0.5px solid #BBF7D0',
                padding: '14px 14px',
              }}
            >
              <CheckCircle2
                className="w-4 h-4 text-[#1F6F43] flex-shrink-0"
                strokeWidth={2.5}
              />
              <div>
                <div
                  className="font-['Inter'] font-semibold text-[#1F6F43]"
                  style={{ fontSize: '13px' }}
                >
                  You're free! No shifts scheduled.
                </div>
                <p
                  className="font-['Inter'] text-[#6B7280] mt-0.5"
                  style={{ fontSize: '12px' }}
                >
                  No conflicts found for the selected dates.
                </p>
              </div>
            </div>
          )}

          {/* ── 6. Optional Note ─────────────────────────────────────── */}
          <div>
            <label
              className="font-['Inter'] font-medium text-[#374151] mb-2 block"
              style={{ fontSize: '13px' }}
            >
              Note{' '}
              <span className="font-normal text-[#9CA3AF]">(optional)</span>
            </label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={2}
              placeholder="Add a note for your manager…"
              className="w-full bg-white border border-[#E5E7EB] rounded-lg font-['Inter'] text-[#1A1A1A] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#1F6F43] focus:ring-1 focus:ring-[#1F6F43] transition-colors resize-none"
              style={{ fontSize: '14px', padding: '10px 12px' }}
            />
          </div>
        </div>
      </div>

      {/* ── Fixed Bottom CTA ───────────────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 max-w-[390px] mx-auto px-5 pb-6 pt-3 bg-gradient-to-t from-[#F8F8F6] via-[#F8F8F6] to-transparent">
        <button
          onClick={handleSubmit}
          className="w-full bg-[#1F6F43] text-white rounded-[13px] font-['Inter'] font-semibold hover:bg-[#1a5e38] transition-colors active:scale-[0.98]"
          style={{
            fontSize: '14px',
            padding: '13px 0',
            boxShadow: '0 4px 14px rgba(31,111,67,0.2)',
          }}
        >
          {hasConflicts
            ? 'Submit (manager review required)'
            : 'Review & submit'}
        </button>
      </div>
    </div>
  );
}
