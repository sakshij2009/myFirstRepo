import { useState, useCallback } from 'react';
import { useSafeNavigate } from '../hooks/useSafeNavigate';
import {
  MapPin,
  Info,
  Search,
  Check,
  ChevronRight,
  AlertTriangle,
  XCircle,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

// ─── Types ────────────────────────────────────────────────────────────
type StaffAvailability = 'available' | 'conflict' | 'max-hours' | 'suspended' | 'unqualified';

interface StaffMember {
  id: string;
  name: string;
  initials: string;
  avatarBg: string;
  role: string;
  cyimId: string;
  qualifications: string[];
  availability: StaffAvailability;
  conflictReason?: string;
}

// ─── Data ─────────────────────────────────────────────────────────────
const reasons = [
  'Personal Emergency',
  'Schedule Conflict',
  'Illness',
  'Family Obligation',
  'Training/Course',
  'Other',
];

const staffMembers: StaffMember[] = [
  {
    id: '1',
    name: 'Benjamin Harris',
    initials: 'BH',
    avatarBg: '#EBF5FF',
    role: 'Intake Worker',
    cyimId: '1432570',
    qualifications: ['Respite', 'Emergency'],
    availability: 'available',
  },
  {
    id: '2',
    name: 'Christine Parker',
    initials: 'CP',
    avatarBg: '#F3F0FF',
    role: 'Care Worker',
    cyimId: '1432571',
    qualifications: ['Respite', 'Supervised'],
    availability: 'available',
  },
  {
    id: '3',
    name: 'David Wilson',
    initials: 'DW',
    avatarBg: '#F0FDF4',
    role: 'Intake Worker',
    cyimId: '1432572',
    qualifications: ['Respite'],
    availability: 'available',
  },
  {
    id: '4',
    name: 'Amanda Lee',
    initials: 'AL',
    avatarBg: '#FEF3C7',
    role: 'Care Worker',
    cyimId: '1432573',
    qualifications: ['Respite', 'Emergency'],
    availability: 'conflict',
    conflictReason: 'Has shift: Emergency Care 8:00 AM – 12:00 PM',
  },
  {
    id: '5',
    name: 'James Rivera',
    initials: 'JR',
    avatarBg: '#FEF2F2',
    role: 'Field Worker',
    cyimId: '1432574',
    qualifications: ['Respite', 'Transportation'],
    availability: 'max-hours',
    conflictReason: 'At maximum weekly hours (48/48 hrs)',
  },
  {
    id: '6',
    name: 'Kibo Gin',
    initials: 'KG',
    avatarBg: '#F3F4F6',
    role: 'Intake Worker',
    cyimId: '1432575',
    qualifications: ['Respite', 'Emergency'],
    availability: 'suspended',
  },
];

const approvalSteps = [
  { label: 'You submit transfer request', sub: 'Immediate' },
  { label: '{name} accepts or declines', sub: 'Notified immediately' },
  { label: 'Owner reviews and approves', sub: 'Final confirmation' },
  { label: 'Transfer confirmed', sub: 'Shift reassigned to {name}', isCheck: true },
];

// ─── Wizard Header ───────────────────────────────────────────────────
function WizardHeader({
  step,
  onCancel,
}: {
  step: number;
  onCancel: () => void;
}) {
  const [showConfirm, setShowConfirm] = useState(false);

  return (
    <>
      <div className="sticky top-0 z-20 bg-[#F8F8F6]" style={{ paddingTop: '16px' }}>
        <div className="flex items-center justify-between px-5" style={{ height: '56px' }}>
          <button
            onClick={() => setShowConfirm(true)}
            className="font-['Inter'] font-medium text-[#DC2626]"
            style={{ fontSize: '14px' }}
          >
            Cancel
          </button>
          <span
            className="font-['Poppins'] font-semibold text-[#1A1A1A]"
            style={{ fontSize: '16px' }}
          >
            Transfer Shift
          </span>
          <span
            className="font-['Inter'] text-[#9CA3AF]"
            style={{ fontSize: '12px' }}
          >
            Step {step} of 4
          </span>
        </div>
        <div className="px-5 pb-4">
          <div
            className="w-full rounded-sm overflow-hidden"
            style={{ height: '4px', backgroundColor: '#E5E7EB' }}
          >
            <motion.div
              className="h-full bg-[#1F6F43] rounded-sm"
              initial={false}
              animate={{ width: `${(step / 4) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
      </div>

      {/* Cancel confirmation dialog */}
      <AnimatePresence>
        {showConfirm && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white rounded-2xl w-full max-w-[310px] p-6"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              <h3
                className="font-['Poppins'] font-semibold text-[#1A1A1A] text-center"
                style={{ fontSize: '16px' }}
              >
                Cancel transfer?
              </h3>
              <p
                className="font-['Inter'] text-[#6B7280] text-center mt-2"
                style={{ fontSize: '14px' }}
              >
                Your progress will be lost.
              </p>
              <div className="flex gap-3 mt-5">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="flex-1 h-11 rounded-xl font-['Inter'] font-medium text-[#6B7280]"
                  style={{ border: '1px solid #E5E7EB', fontSize: '14px' }}
                >
                  Go Back
                </button>
                <button
                  onClick={onCancel}
                  className="flex-1 h-11 rounded-xl font-['Inter'] font-semibold text-white bg-[#DC2626]"
                  style={{ fontSize: '14px' }}
                >
                  Yes, Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ─── Step 1: Shift Summary & Reason ──────────────────────────────────
function Step1({
  selectedReason,
  setSelectedReason,
  notes,
  setNotes,
}: {
  selectedReason: string;
  setSelectedReason: (r: string) => void;
  notes: string;
  setNotes: (n: string) => void;
}) {
  return (
    <div className="px-5 pb-36">
      {/* Shift card */}
      <div
        className="bg-white mt-5"
        style={{
          borderRadius: '16px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          padding: '20px',
          borderLeft: '4px solid #1F6F43',
        }}
      >
        <h3
          className="font-['Poppins'] font-semibold text-[#1A1A1A] mb-4"
          style={{ fontSize: '14px' }}
        >
          Shift to Transfer
        </h3>
        <span
          className="inline-block px-3 py-1 rounded-full font-['Inter'] font-semibold"
          style={{ fontSize: '11px', backgroundColor: '#EBF5FF', color: '#1E5FA6' }}
        >
          Respite Care
        </span>
        <div
          className="font-['Inter'] font-semibold text-[#1A1A1A] mt-3"
          style={{ fontSize: '14px' }}
        >
          9:00 AM – 1:00 PM · 4 hours
        </div>
        <div
          className="font-['Inter'] text-[#6B7280] mt-1"
          style={{ fontSize: '13px' }}
        >
          Friday, March 14, 2026
        </div>
        <div className="flex items-center gap-3 mt-3">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center font-['Inter'] font-semibold text-[#1F6F43]"
            style={{ backgroundColor: '#F0FDF4', fontSize: '13px' }}
          >
            ET
          </div>
          <div>
            <div className="font-['Inter'] font-medium text-[#1A1A1A]" style={{ fontSize: '14px' }}>
              Emma Thompson
            </div>
            <div className="font-['Inter'] text-[#9CA3AF]" style={{ fontSize: '12px' }}>
              ID: 0988765
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 mt-3">
          <MapPin className="w-3.5 h-3.5 text-[#9CA3AF]" strokeWidth={2} />
          <span className="font-['Inter'] text-[#6B7280]" style={{ fontSize: '13px' }}>
            1234 Oak Street, Suite 5
          </span>
        </div>
      </div>

      {/* Info notice */}
      <div
        className="mt-4 flex gap-3"
        style={{
          backgroundColor: '#EBF5FF',
          borderRadius: '12px',
          padding: '14px 16px',
        }}
      >
        <Info className="w-[18px] h-[18px] text-[#1E5FA6] flex-shrink-0 mt-0.5" strokeWidth={2} />
        <p className="font-['Inter'] text-[#1E5FA6]" style={{ fontSize: '13px', lineHeight: '1.5' }}>
          This transfer requires approval from both the receiving staff member and the owner before
          it is confirmed. You will remain assigned until the transfer is fully approved.
        </p>
      </div>

      {/* Reason selection */}
      <div className="mt-5">
        <h3 className="font-['Poppins'] font-semibold text-[#1A1A1A]" style={{ fontSize: '14px' }}>
          Reason for Transfer <span className="text-[#DC2626]">*</span>
        </h3>
        <div className="flex flex-wrap gap-2 mt-3">
          {reasons.map(r => (
            <button
              key={r}
              onClick={() => setSelectedReason(r)}
              className="font-['Inter'] font-medium transition-colors"
              style={{
                fontSize: '13px',
                padding: '8px 16px',
                borderRadius: '20px',
                backgroundColor: selectedReason === r ? '#1F6F43' : '#F3F4F6',
                color: selectedReason === r ? '#FFFFFF' : '#6B7280',
              }}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Additional notes */}
      <div className="mt-4">
        <label
          className="font-['Inter'] text-[#9CA3AF] block mb-2"
          style={{ fontSize: '13px' }}
        >
          Additional Notes (optional)
        </label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value.slice(0, 500))}
          placeholder="Add any additional context for the owner..."
          className="w-full font-['Inter'] text-[#1A1A1A] resize-none outline-none"
          style={{
            fontSize: '14px',
            backgroundColor: '#F9FAFB',
            border: '1px solid #E5E7EB',
            borderRadius: '12px',
            padding: '14px',
            minHeight: '80px',
          }}
        />
        <div
          className="font-['Inter'] text-[#D1D5DB] text-right mt-1"
          style={{ fontSize: '11px' }}
        >
          {notes.length} / 500
        </div>
      </div>
    </div>
  );
}

// ─── Step 2: Select Staff ────────────────────────────────────────────
function Step2({
  selectedStaff,
  setSelectedStaff,
}: {
  selectedStaff: string | null;
  setSelectedStaff: (id: string | null) => void;
}) {
  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState<'available' | 'all'>('available');
  const [sameServiceOnly, setSameServiceOnly] = useState(false);

  const filtered = staffMembers.filter(s => {
    if (search && !s.name.toLowerCase().includes(search.toLowerCase()) && !s.cyimId.includes(search))
      return false;
    if (filterMode === 'available' && s.availability !== 'available') return false;
    if (sameServiceOnly && !s.qualifications.includes('Respite')) return false;
    return true;
  });

  const availableCount = filtered.filter(s => s.availability === 'available').length;

  return (
    <div className="px-5 pb-36">
      {/* Search bar */}
      <div
        className="mt-5 flex items-center gap-2"
        style={{
          height: '44px',
          backgroundColor: '#F3F4F6',
          borderRadius: '10px',
          padding: '0 14px',
        }}
      >
        <Search className="w-[18px] h-[18px] text-[#9CA3AF]" strokeWidth={2} />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search staff by name or ID"
          className="flex-1 bg-transparent outline-none font-['Inter'] text-[#1A1A1A] placeholder:text-[#D1D5DB]"
          style={{ fontSize: '14px' }}
        />
      </div>

      {/* Filter pills */}
      <div className="flex gap-2 mt-3 overflow-x-auto no-scrollbar">
        {[
          { key: 'available' as const, label: 'Available Only' },
          { key: 'all' as const, label: 'All Staff' },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFilterMode(f.key)}
            className="flex-shrink-0 font-['Inter'] font-medium transition-colors"
            style={{
              fontSize: '13px',
              padding: '8px 18px',
              borderRadius: '20px',
              minHeight: '36px',
              backgroundColor: filterMode === f.key ? '#1F6F43' : '#F3F4F6',
              color: filterMode === f.key ? '#FFFFFF' : '#6B7280',
            }}
          >
            {f.label}
          </button>
        ))}
        <button
          onClick={() => setSameServiceOnly(!sameServiceOnly)}
          className="flex-shrink-0 font-['Inter'] font-medium transition-colors"
          style={{
            fontSize: '13px',
            padding: '8px 18px',
            borderRadius: '20px',
            minHeight: '36px',
            backgroundColor: sameServiceOnly ? '#1F6F43' : '#F3F4F6',
            color: sameServiceOnly ? '#FFFFFF' : '#6B7280',
          }}
        >
          Same Service Type
        </button>
      </div>

      {/* Count */}
      <p className="font-['Inter'] text-[#9CA3AF] mt-3" style={{ fontSize: '13px' }}>
        {availableCount} staff available for this shift
      </p>

      {/* Staff list */}
      <div className="mt-4 space-y-3">
        {filtered.map(staff => {
          const isAvailable = staff.availability === 'available';
          const isSelected = selectedStaff === staff.id;

          return (
            <button
              key={staff.id}
              disabled={!isAvailable}
              onClick={() => isAvailable && setSelectedStaff(isSelected ? null : staff.id)}
              className="w-full text-left transition-all"
              style={{
                borderRadius: '14px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                padding: '16px',
                backgroundColor: isSelected ? '#FCFEFB' : '#FFFFFF',
                border: isSelected ? '2px solid #1F6F43' : '2px solid transparent',
                opacity: isAvailable ? 1 : 0.6,
              }}
            >
              <div className="flex items-center gap-3">
                {/* Avatar */}
                <div
                  className="w-11 h-11 rounded-full flex items-center justify-center font-['Inter'] font-semibold flex-shrink-0"
                  style={{ backgroundColor: staff.avatarBg, color: '#6B7280', fontSize: '14px' }}
                >
                  {staff.initials}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="font-['Inter'] font-semibold text-[#1A1A1A]" style={{ fontSize: '15px' }}>
                    {staff.name}
                  </div>
                  <div className="font-['Inter'] text-[#9CA3AF] mt-0.5" style={{ fontSize: '12px' }}>
                    {staff.role} · CYIM: {staff.cyimId}
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {staff.qualifications.map(q => (
                      <span
                        key={q}
                        className="font-['Inter'] font-semibold rounded-full"
                        style={{
                          fontSize: '10px',
                          padding: '2px 8px',
                          backgroundColor: '#F0FDF4',
                          color: '#1F6F43',
                        }}
                      >
                        {q} ✓
                      </span>
                    ))}
                  </div>
                </div>

                {/* Right indicator */}
                <div className="flex flex-col items-center flex-shrink-0">
                  {isSelected ? (
                    <div className="w-6 h-6 rounded-full bg-[#1F6F43] flex items-center justify-center">
                      <div className="w-2.5 h-2.5 rounded-full bg-white" />
                    </div>
                  ) : isAvailable ? (
                    <>
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: '#F0FDF4' }}
                      >
                        <Check className="w-3 h-3 text-[#1F6F43]" strokeWidth={2.5} />
                      </div>
                      <span className="font-['Inter'] text-[#1F6F43] mt-0.5" style={{ fontSize: '10px' }}>
                        Free
                      </span>
                    </>
                  ) : staff.availability === 'conflict' ? (
                    <>
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: '#FFF8E1' }}
                      >
                        <AlertTriangle className="w-3 h-3 text-[#F59E0B]" strokeWidth={2.5} />
                      </div>
                      <span className="font-['Inter'] text-[#F59E0B] mt-0.5" style={{ fontSize: '10px' }}>
                        Conflict
                      </span>
                    </>
                  ) : staff.availability === 'suspended' ? (
                    <>
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: '#FEF2F2' }}
                      >
                        <XCircle className="w-3 h-3 text-[#DC2626]" strokeWidth={2.5} />
                      </div>
                      <span className="font-['Inter'] text-[#DC2626] mt-0.5" style={{ fontSize: '10px' }}>
                        Suspended
                      </span>
                    </>
                  ) : (
                    <>
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: '#FFF8E1' }}
                      >
                        <AlertTriangle className="w-3 h-3 text-[#F59E0B]" strokeWidth={2.5} />
                      </div>
                      <span className="font-['Inter'] text-[#F59E0B] mt-0.5" style={{ fontSize: '10px' }}>
                        Max hrs
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Conflict detail banner */}
              {!isAvailable && staff.conflictReason && (
                <div
                  className="mt-3 font-['Inter'] text-[#92600A]"
                  style={{
                    fontSize: '12px',
                    backgroundColor: '#FFF8E1',
                    borderRadius: '8px',
                    padding: '8px 12px',
                  }}
                >
                  {staff.conflictReason}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Step 3: Review & Confirm ────────────────────────────────────────
function Step3({
  selectedStaff,
  selectedReason,
}: {
  selectedStaff: StaffMember;
  selectedReason: string;
}) {
  const stepsWithName = approvalSteps.map(s => ({
    ...s,
    label: s.label.replace('{name}', selectedStaff.name),
    sub: s.sub.replace('{name}', selectedStaff.name),
  }));

  return (
    <div className="px-5 pb-36">
      {/* Transfer summary card */}
      <div
        className="bg-white mt-5"
        style={{
          borderRadius: '16px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          padding: '20px',
        }}
      >
        <h3
          className="font-['Poppins'] font-semibold text-[#1A1A1A] mb-4"
          style={{ fontSize: '16px' }}
        >
          Transfer Summary
        </h3>

        {/* From → To */}
        <div className="flex items-center justify-center gap-4 mb-4">
          <div className="flex flex-col items-center">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center font-['Inter'] font-semibold text-[#1F6F43]"
              style={{ backgroundColor: '#F0FDF4', fontSize: '16px' }}
            >
              SJ
            </div>
            <span className="font-['Inter'] font-semibold text-[#1A1A1A] mt-2" style={{ fontSize: '14px' }}>
              Sarah Johnson
            </span>
            <span className="font-['Inter'] text-[#9CA3AF]" style={{ fontSize: '11px' }}>
              You
            </span>
          </div>

          <div className="flex flex-col items-center gap-1">
            <span className="font-['Inter'] text-[#9CA3AF]" style={{ fontSize: '10px' }}>
              Transfer
            </span>
            <ArrowRight className="w-6 h-6 text-[#1F6F43]" strokeWidth={2} />
          </div>

          <div className="flex flex-col items-center">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center font-['Inter'] font-semibold"
              style={{ backgroundColor: selectedStaff.avatarBg, color: '#6B7280', fontSize: '16px' }}
            >
              {selectedStaff.initials}
            </div>
            <span className="font-['Inter'] font-semibold text-[#1A1A1A] mt-2" style={{ fontSize: '14px' }}>
              {selectedStaff.name}
            </span>
            <span className="font-['Inter'] text-[#9CA3AF]" style={{ fontSize: '11px' }}>
              Receiving
            </span>
          </div>
        </div>

        <div className="h-px bg-[#F3F4F6] my-4" />

        {/* Shift details */}
        {[
          { label: 'Shift', value: 'Respite Care · 4 hours' },
          { label: 'Date & Time', value: 'March 14, 2026 · 9:00 AM – 1:00 PM' },
          { label: 'Client', value: 'Emma Thompson' },
          { label: 'Location', value: '1234 Oak Street, Suite 5' },
          { label: 'Reason', value: selectedReason },
        ].map((row, idx, arr) => (
          <div
            key={row.label}
            className="flex items-center justify-between py-2"
            style={{
              borderBottom: idx < arr.length - 1 ? '1px solid #F3F4F6' : 'none',
              minHeight: '36px',
            }}
          >
            <span className="font-['Inter'] text-[#9CA3AF]" style={{ fontSize: '13px' }}>
              {row.label}
            </span>
            <span className="font-['Inter'] font-medium text-[#1A1A1A] text-right" style={{ fontSize: '14px' }}>
              {row.value}
            </span>
          </div>
        ))}
      </div>

      {/* Approval process */}
      <div
        className="bg-white mt-4"
        style={{
          borderRadius: '16px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          padding: '20px',
        }}
      >
        <h3
          className="font-['Poppins'] font-semibold text-[#1A1A1A] mb-4"
          style={{ fontSize: '14px' }}
        >
          Approval Process
        </h3>
        <div className="space-y-0">
          {stepsWithName.map((step, idx) => (
            <div key={idx} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 font-['Inter'] font-semibold"
                  style={{
                    fontSize: '11px',
                    backgroundColor: idx === 0 ? '#1F6F43' : 'transparent',
                    color: idx === 0 ? '#FFFFFF' : '#9CA3AF',
                    border: idx === 0 ? 'none' : '1.5px solid #D1D5DB',
                  }}
                >
                  {step.isCheck ? (
                    <Check className="w-3 h-3" strokeWidth={2.5} />
                  ) : (
                    idx + 1
                  )}
                </div>
                {idx < stepsWithName.length - 1 && (
                  <div
                    className="flex-1 my-1"
                    style={{
                      width: '2px',
                      minHeight: '24px',
                      borderLeft: '2px dashed #D1D5DB',
                    }}
                  />
                )}
              </div>
              <div className="pb-4">
                <div className="font-['Inter'] font-medium text-[#1A1A1A]" style={{ fontSize: '13px' }}>
                  {step.label}
                </div>
                <div className="font-['Inter'] text-[#9CA3AF]" style={{ fontSize: '12px' }}>
                  {step.sub}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Client care notice */}
      <div
        className="bg-white mt-4"
        style={{
          borderRadius: '16px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          padding: '20px',
          borderLeft: '4px solid #F59E0B',
        }}
      >
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className="w-[18px] h-[18px] text-[#F59E0B]" strokeWidth={2} />
          <span className="font-['Inter'] font-semibold text-[#1A1A1A]" style={{ fontSize: '14px' }}>
            Client Care Handover
          </span>
        </div>
        <p className="font-['Inter'] text-[#6B7280]" style={{ fontSize: '13px', lineHeight: '1.5' }}>
          Emma Thompson has special care instructions including peanut allergy and separation anxiety
          protocol. {selectedStaff.name} will receive these notes upon transfer confirmation.
        </p>
      </div>

      {/* Important terms */}
      <div
        className="mt-4"
        style={{
          backgroundColor: '#F9FAFB',
          borderRadius: '12px',
          padding: '14px 16px',
        }}
      >
        {[
          'You remain assigned until the transfer is fully approved',
          `Either ${selectedStaff.name} or the owner can decline this request`,
          'You can cancel this transfer anytime before final approval',
          'If declined, you will be notified and remain assigned',
        ].map((term, idx) => (
          <p
            key={idx}
            className="font-['Inter'] text-[#6B7280]"
            style={{ fontSize: '12px', lineHeight: '1.6' }}
          >
            • {term}
          </p>
        ))}
      </div>
    </div>
  );
}

// ─── Step 4: Confirmation ────────────────────────────────────────────
function Step4({ selectedStaff }: { selectedStaff: StaffMember }) {
  const navigate = useSafeNavigate();
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const statusSteps = [
    {
      label: 'Request submitted',
      sub: 'Just now',
      state: 'complete' as const,
    },
    {
      label: `Awaiting ${selectedStaff.name}'s response`,
      sub: 'Notification sent',
      state: 'active' as const,
    },
    { label: 'Owner approval', sub: 'Pending', state: 'pending' as const },
    { label: 'Transfer confirmed', sub: 'Pending', state: 'pending' as const },
  ];

  return (
    <div className="px-5 pb-12">
      {/* Success animation */}
      <div className="flex flex-col items-center mt-6">
        <motion.div
          className="w-20 h-20 rounded-full bg-[#1F6F43] flex items-center justify-center"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <Check className="w-8 h-8 text-white" strokeWidth={2.5} />
        </motion.div>
        <h2
          className="font-['Poppins'] font-bold text-[#1A1A1A] mt-4 text-center"
          style={{ fontSize: '18px' }}
        >
          Transfer Request Submitted!
        </h2>
        <p
          className="font-['Inter'] text-[#9CA3AF] mt-2 text-center"
          style={{ fontSize: '14px', maxWidth: '280px' }}
        >
          Awaiting approval from {selectedStaff.name} and the owner
        </p>
      </div>

      {/* Live status card */}
      <div
        className="bg-white mt-6"
        style={{
          borderRadius: '16px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          padding: '20px',
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-['Poppins'] font-semibold text-[#1A1A1A]" style={{ fontSize: '14px' }}>
            Transfer Status
          </h3>
          <div className="flex items-center gap-1.5">
            <motion.div
              className="w-1.5 h-1.5 rounded-full bg-[#1F6F43]"
              animate={{ opacity: [1, 0.4, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            <span className="font-['Inter'] font-medium text-[#1F6F43]" style={{ fontSize: '11px' }}>
              Live
            </span>
          </div>
        </div>

        {statusSteps.map((step, idx) => (
          <div key={idx} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                style={{
                  backgroundColor:
                    step.state === 'complete'
                      ? '#1F6F43'
                      : step.state === 'active'
                        ? '#EBF5FF'
                        : 'transparent',
                  border:
                    step.state === 'pending'
                      ? '1.5px solid #D1D5DB'
                      : step.state === 'active'
                        ? '1.5px solid #1E5FA6'
                        : 'none',
                }}
              >
                {step.state === 'complete' ? (
                  <Check className="w-3 h-3 text-white" strokeWidth={2.5} />
                ) : step.state === 'active' ? (
                  <motion.div
                    className="w-2 h-2 rounded-full bg-[#1E5FA6]"
                    animate={{ opacity: [1, 0.4, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                ) : null}
              </div>
              {idx < statusSteps.length - 1 && (
                <div
                  className="flex-1 my-1"
                  style={{
                    width: '2px',
                    minHeight: '24px',
                    borderLeft:
                      step.state === 'complete'
                        ? '2px solid #1F6F43'
                        : '2px dashed #D1D5DB',
                  }}
                />
              )}
            </div>
            <div className="pb-4">
              <div
                className="font-['Inter'] text-[#1A1A1A]"
                style={{
                  fontSize: '13px',
                  fontWeight: step.state !== 'pending' ? 600 : 500,
                  color:
                    step.state === 'complete'
                      ? '#1F6F43'
                      : step.state === 'active'
                        ? '#1E5FA6'
                        : '#9CA3AF',
                }}
              >
                {step.label}
              </div>
              <div
                className="font-['Inter']"
                style={{
                  fontSize: '12px',
                  color: step.state === 'pending' ? '#D1D5DB' : '#9CA3AF',
                }}
              >
                {step.sub}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recap card */}
      <div
        className="bg-white mt-4"
        style={{
          borderRadius: '14px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          padding: '16px',
        }}
      >
        <div className="flex items-center justify-between">
          <span className="font-['Inter'] text-[#6B7280]" style={{ fontSize: '13px' }}>
            From: Sarah Johnson
          </span>
          <span className="font-['Inter'] font-medium text-[#1A1A1A]" style={{ fontSize: '13px' }}>
            To: {selectedStaff.name}
          </span>
        </div>
        <p className="font-['Inter'] text-[#9CA3AF] text-center mt-2" style={{ fontSize: '12px' }}>
          Respite Care · March 14 · 9:00 AM – 1:00 PM
        </p>
      </div>

      {/* Actions */}
      <div className="mt-6">
        <button
          onClick={() => navigate('/shifts')}
          className="w-full h-[50px] bg-[#1F6F43] text-white rounded-xl font-['Poppins'] font-semibold transition-colors active:bg-[#1a5e38]"
          style={{ fontSize: '15px' }}
        >
          Back to My Shifts
        </button>
        <button
          onClick={() => setShowCancelConfirm(true)}
          className="w-full mt-3 font-['Inter'] font-medium text-[#DC2626] text-center"
          style={{ fontSize: '13px' }}
        >
          Cancel Transfer Request
        </button>
      </div>

      {/* Cancel confirm dialog */}
      <AnimatePresence>
        {showCancelConfirm && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white rounded-2xl w-full max-w-[310px] p-6"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              <h3
                className="font-['Poppins'] font-semibold text-[#1A1A1A] text-center"
                style={{ fontSize: '16px' }}
              >
                Cancel this transfer request?
              </h3>
              <p
                className="font-['Inter'] text-[#6B7280] text-center mt-2"
                style={{ fontSize: '14px' }}
              >
                You will remain assigned to this shift.
              </p>
              <div className="flex gap-3 mt-5">
                <button
                  onClick={() => setShowCancelConfirm(false)}
                  className="flex-1 h-11 rounded-xl font-['Inter'] font-semibold text-white bg-[#1F6F43]"
                  style={{ fontSize: '14px' }}
                >
                  Keep Request
                </button>
                <button
                  onClick={() => {
                    toast('Transfer request cancelled');
                    navigate('/shifts');
                  }}
                  className="flex-1 h-11 rounded-xl font-['Inter'] font-medium text-[#DC2626]"
                  style={{ border: '1.5px solid #DC2626', fontSize: '14px' }}
                >
                  Yes, Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main Wizard Component ───────────────────────────────────────────
export function TransferShift() {
  const navigate = useSafeNavigate();
  const [step, setStep] = useState(1);
  const [selectedReason, setSelectedReason] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);

  const selectedStaff = staffMembers.find(s => s.id === selectedStaffId) || null;

  const canProceedStep1 = selectedReason.length > 0;
  const canProceedStep2 = selectedStaffId !== null;

  const handleCancel = useCallback(() => {
    navigate('/shifts');
  }, [navigate]);

  if (step === 4 && selectedStaff) {
    return (
      <div className="w-full h-screen max-w-[390px] mx-auto bg-[#F8F8F6] overflow-y-auto">
        <WizardHeader step={4} onCancel={handleCancel} />
        <Step4 selectedStaff={selectedStaff} />
      </div>
    );
  }

  return (
    <div className="w-full h-screen max-w-[390px] mx-auto bg-[#F8F8F6] flex flex-col overflow-hidden">
      <WizardHeader step={step} onCancel={handleCancel} />

      <div className="flex-1 overflow-y-auto">
        {step === 1 && (
          <Step1
            selectedReason={selectedReason}
            setSelectedReason={setSelectedReason}
            notes={notes}
            setNotes={setNotes}
          />
        )}
        {step === 2 && (
          <Step2
            selectedStaff={selectedStaffId}
            setSelectedStaff={setSelectedStaffId}
          />
        )}
        {step === 3 && selectedStaff && (
          <Step3 selectedStaff={selectedStaff} selectedReason={selectedReason} />
        )}
      </div>

      {/* Bottom action bar */}
      <div
        className="bg-white px-5 py-3 z-10 flex-shrink-0"
        style={{ borderTop: '0.5px solid #E5E7EB' }}
      >
        {step === 3 ? (
          <div className="flex gap-2">
            <button
              onClick={() => setStep(2)}
              className="h-[50px] rounded-xl font-['Inter'] font-medium text-[#6B7280]"
              style={{ width: '35%', border: '1px solid #E5E7EB', fontSize: '14px' }}
            >
              <span className="flex items-center justify-center gap-1">
                <ArrowLeft className="w-4 h-4" strokeWidth={2} /> Back
              </span>
            </button>
            <button
              onClick={() => setStep(4)}
              className="h-[50px] rounded-xl font-['Poppins'] font-semibold text-white bg-[#1F6F43] active:bg-[#1a5e38] transition-colors"
              style={{ width: '65%', fontSize: '15px' }}
            >
              Submit Transfer Request
            </button>
          </div>
        ) : (
          <button
            disabled={step === 1 ? !canProceedStep1 : !canProceedStep2}
            onClick={() => setStep(step + 1)}
            className="w-full h-[50px] rounded-xl font-['Poppins'] font-semibold text-white bg-[#1F6F43] transition-all active:bg-[#1a5e38] disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ fontSize: '15px' }}
          >
            {step === 1
              ? 'Select Staff →'
              : selectedStaff
                ? `Review Transfer with ${selectedStaff.name} →`
                : 'Review Transfer →'}
          </button>
        )}
      </div>
    </div>
  );
}