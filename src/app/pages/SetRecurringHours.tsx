import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router';
import {
  ChevronLeft,
  ChevronRight,
  Info,
  Sun,
  Cloud,
  Moon,
} from 'lucide-react';
import { toast } from 'sonner';

// ─── Types ────────────────────────────────────────────────────────────
type DayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
type SlotKey = 'morning' | 'afternoon' | 'night';

interface SlotConfig {
  enabled: boolean;
  from: string;
  to: string;
}

type DaySlots = Record<SlotKey, SlotConfig>;
type ScheduleData = Record<DayKey, DaySlots>;

// ─── Constants ────────────────────────────────────────────────────────
const allDays: { key: DayKey; label: string; full: string }[] = [
  { key: 'mon', label: 'Mon', full: 'Monday' },
  { key: 'tue', label: 'Tue', full: 'Tuesday' },
  { key: 'wed', label: 'Wed', full: 'Wednesday' },
  { key: 'thu', label: 'Thu', full: 'Thursday' },
  { key: 'fri', label: 'Fri', full: 'Friday' },
  { key: 'sat', label: 'Sat', full: 'Saturday' },
  { key: 'sun', label: 'Sun', full: 'Sunday' },
];

const slotMeta: {
  key: SlotKey;
  label: string;
  icon: typeof Sun;
  iconBg: string;
  iconColor: string;
  chipBg: string;
  chipColor: string;
  defaultFrom: string;
  defaultTo: string;
}[] = [
  {
    key: 'morning',
    label: 'Morning',
    icon: Sun,
    iconBg: '#FFF7E6',
    iconColor: '#D97706',
    chipBg: '#FFF7E6',
    chipColor: '#92600A',
    defaultFrom: '06:00',
    defaultTo: '12:00',
  },
  {
    key: 'afternoon',
    label: 'Afternoon',
    icon: Cloud,
    iconBg: '#EDF4FF',
    iconColor: '#2563EB',
    chipBg: '#EDF4FF',
    chipColor: '#1E40AF',
    defaultFrom: '12:00',
    defaultTo: '18:00',
  },
  {
    key: 'night',
    label: 'Night',
    icon: Moon,
    iconBg: '#EEEDFE',
    iconColor: '#7C3AED',
    chipBg: '#EEEDFE',
    chipColor: '#5B21B6',
    defaultFrom: '18:00',
    defaultTo: '23:00',
  },
];

function makeDefaultSlots(): DaySlots {
  return {
    morning: { enabled: true, from: '06:00', to: '12:00' },
    afternoon: { enabled: true, from: '12:00', to: '18:00' },
    night: { enabled: false, from: '18:00', to: '23:00' },
  };
}

function makeEmptySlots(): DaySlots {
  return {
    morning: { enabled: false, from: '06:00', to: '12:00' },
    afternoon: { enabled: false, from: '12:00', to: '18:00' },
    night: { enabled: false, from: '18:00', to: '23:00' },
  };
}

function formatTime(val: string): string {
  if (!val) return '';
  const [h, m] = val.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const display = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${display}:${m.toString().padStart(2, '0')} ${period}`;
}

// ─── Toggle Switch ────────────────────────────────────────────────────
function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="relative flex-shrink-0 transition-colors rounded-full"
      style={{
        width: '36px',
        height: '20px',
        backgroundColor: checked ? '#1F6F43' : '#D1D5DB',
      }}
    >
      <div
        className="absolute top-[2px] rounded-full bg-white transition-transform"
        style={{
          width: '16px',
          height: '16px',
          transform: checked ? 'translateX(18px)' : 'translateX(2px)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
        }}
      />
    </button>
  );
}

// ─── Day Card ─────────────────────────────────────────────────────────
function DayCard({
  dayKey,
  dayFull,
  slots,
  expanded,
  onToggleExpand,
  onUpdateSlot,
}: {
  dayKey: DayKey;
  dayFull: string;
  slots: DaySlots;
  expanded: boolean;
  onToggleExpand: () => void;
  onUpdateSlot: (slot: SlotKey, patch: Partial<SlotConfig>) => void;
}) {
  const activeSlots = slotMeta.filter(s => slots[s.key].enabled);
  const hasActiveSlots = activeSlots.length > 0;

  return (
    <div
      className="rounded-[12px] overflow-hidden transition-shadow"
      style={{
        backgroundColor: '#FFFFFF',
        boxShadow: expanded
          ? '0 4px 16px rgba(0,0,0,0.06)'
          : '0 1px 4px rgba(0,0,0,0.04)',
      }}
    >
      {/* Header row */}
      <button
        onClick={onToggleExpand}
        className="w-full flex items-center gap-2.5 px-3.5 py-3 text-left"
      >
        <div
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{
            backgroundColor: hasActiveSlots ? '#1F6F43' : '#EF4444',
          }}
        />
        <span
          className="font-['Inter'] font-medium text-[#1A1A1A] flex-shrink-0"
          style={{ fontSize: '13px' }}
        >
          {dayFull}
        </span>
        <span
          className="font-['Inter'] text-[#9CA3AF] flex-1 truncate"
          style={{ fontSize: '11px' }}
        >
          {hasActiveSlots
            ? activeSlots.map(s => s.label).join(', ')
            : 'No slots active'}
        </span>
        <ChevronRight
          className="w-4 h-4 text-[#D1D5DB] flex-shrink-0 transition-transform"
          strokeWidth={2}
          style={{
            transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
          }}
        />
      </button>

      {/* Expanded body */}
      {expanded && (
        <div
          className="px-3 pb-3 pt-0.5 space-y-2"
          style={{ backgroundColor: '#FAFAFA' }}
        >
          {slotMeta.map(meta => {
            const slot = slots[meta.key];
            const SlotIcon = meta.icon;

            return (
              <div
                key={meta.key}
                className="flex items-center gap-2.5 rounded-[10px] px-3 py-2.5 transition-opacity"
                style={{
                  backgroundColor: '#FFFFFF',
                  opacity: slot.enabled ? 1 : 0.45,
                  boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                }}
              >
                {/* Icon tile */}
                <div
                  className="flex items-center justify-center flex-shrink-0 rounded-lg"
                  style={{
                    width: '32px',
                    height: '32px',
                    backgroundColor: meta.iconBg,
                  }}
                >
                  <SlotIcon
                    className="w-4 h-4"
                    style={{ color: meta.iconColor }}
                    strokeWidth={2}
                  />
                </div>

                {/* Slot info + inputs */}
                <div className="flex-1 min-w-0">
                  <div
                    className="font-['Inter'] font-medium text-[#1A1A1A]"
                    style={{ fontSize: '12px' }}
                  >
                    {meta.label}
                  </div>
                  {slot.enabled ? (
                    <div className="flex items-center gap-1.5 mt-1">
                      <input
                        type="time"
                        value={slot.from}
                        onChange={e =>
                          onUpdateSlot(meta.key, { from: e.target.value })
                        }
                        disabled={!slot.enabled}
                        className="bg-[#F5F5F5] border border-[#E5E7EB] rounded-md font-['Inter'] text-[#1A1A1A] focus:outline-none focus:border-[#1F6F43] transition-colors"
                        style={{
                          fontSize: '12px',
                          padding: '4px 6px',
                          width: '78px',
                        }}
                      />
                      <span
                        className="text-[#9CA3AF]"
                        style={{ fontSize: '11px' }}
                      >
                        –
                      </span>
                      <input
                        type="time"
                        value={slot.to}
                        onChange={e =>
                          onUpdateSlot(meta.key, { to: e.target.value })
                        }
                        disabled={!slot.enabled}
                        className="bg-[#F5F5F5] border border-[#E5E7EB] rounded-md font-['Inter'] text-[#1A1A1A] focus:outline-none focus:border-[#1F6F43] transition-colors"
                        style={{
                          fontSize: '12px',
                          padding: '4px 6px',
                          width: '78px',
                        }}
                      />
                    </div>
                  ) : (
                    <span
                      className="font-['Inter'] text-[#9CA3AF]"
                      style={{ fontSize: '11px' }}
                    >
                      {formatTime(meta.defaultFrom)} –{' '}
                      {formatTime(meta.defaultTo)}
                    </span>
                  )}
                </div>

                {/* Toggle */}
                <Toggle
                  checked={slot.enabled}
                  onChange={v => onUpdateSlot(meta.key, { enabled: v })}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────
export function SetRecurringHours() {
  const navigate = useNavigate();

  const [selectedDays, setSelectedDays] = useState<Set<DayKey>>(
    new Set(['mon', 'tue', 'wed', 'thu', 'fri'])
  );

  const [schedule, setSchedule] = useState<ScheduleData>({
    mon: makeDefaultSlots(),
    tue: makeDefaultSlots(),
    wed: makeDefaultSlots(),
    thu: makeDefaultSlots(),
    fri: makeDefaultSlots(),
    sat: makeEmptySlots(),
    sun: makeEmptySlots(),
  });

  const [expandedDay, setExpandedDay] = useState<DayKey | null>('mon');

  const toggleDay = useCallback((day: DayKey) => {
    setSelectedDays(prev => {
      const next = new Set(prev);
      if (next.has(day)) {
        next.delete(day);
      } else {
        next.add(day);
        // Activate defaults when re-adding
        setSchedule(s => ({
          ...s,
          [day]: makeDefaultSlots(),
        }));
      }
      return next;
    });
  }, []);

  const selectPreset = useCallback(
    (preset: 'weekdays' | 'weekends' | 'all' | 'clear') => {
      const map: Record<string, DayKey[]> = {
        weekdays: ['mon', 'tue', 'wed', 'thu', 'fri'],
        weekends: ['sat', 'sun'],
        all: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
        clear: [],
      };
      const keys = map[preset];
      setSelectedDays(new Set(keys));
      if (preset !== 'clear') {
        setSchedule(s => {
          const next = { ...s };
          keys.forEach(k => {
            if (
              !next[k].morning.enabled &&
              !next[k].afternoon.enabled &&
              !next[k].night.enabled
            ) {
              next[k] = makeDefaultSlots();
            }
          });
          return next;
        });
      }
    },
    []
  );

  const updateSlot = useCallback(
    (day: DayKey, slot: SlotKey, patch: Partial<SlotConfig>) => {
      setSchedule(s => ({
        ...s,
        [day]: {
          ...s[day],
          [slot]: { ...s[day][slot], ...patch },
        },
      }));
    },
    []
  );

  const activeDays = allDays.filter(d => selectedDays.has(d.key));

  const handleSave = () => {
    if (selectedDays.size === 0) {
      toast.error('Select at least one day.');
      return;
    }
    toast.success('Recurring schedule saved successfully.');
    navigate('/availability');
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#F8F8F6]">
      <div className="flex-1 overflow-y-auto pb-28">
        {/* ── Header ────────────────────────────────────────────────── */}
        <header className="px-5 pt-5 pb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/availability')}
              className="w-9 h-9 flex items-center justify-center -ml-1.5 rounded-full hover:bg-[#F3F4F6] transition-colors"
            >
              <ChevronLeft
                className="w-6 h-6 text-[#1A1A1A]"
                strokeWidth={2}
              />
            </button>
            <div>
              <h1
                className="font-['Inter'] font-medium text-[#1A1A1A]"
                style={{ fontSize: '15px' }}
              >
                Set recurring hours
              </h1>
              <p
                className="font-['Inter'] text-[#9CA3AF]"
                style={{ fontSize: '12px' }}
              >
                Customize shift slots per day
              </p>
            </div>
          </div>
        </header>

        <div className="px-5 space-y-5">
          {/* ── SECTION 1: Days Available ────────────────────────────── */}
          <div>
            <label
              className="font-['Inter'] font-medium text-[#9CA3AF] mb-3 block uppercase"
              style={{ fontSize: '11px', letterSpacing: '0.04em' }}
            >
              Days available
            </label>
            <div className="flex gap-1.5">
              {allDays.map(day => {
                const isSelected = selectedDays.has(day.key);
                return (
                  <button
                    key={day.key}
                    onClick={() => toggleDay(day.key)}
                    className="font-['Inter'] font-medium transition-all flex-1 text-center"
                    style={{
                      fontSize: '12px',
                      padding: '7px 0',
                      borderRadius: '20px',
                      backgroundColor: isSelected ? '#1F6F43' : 'transparent',
                      color: isSelected ? '#FFFFFF' : '#374151',
                      border: isSelected
                        ? '1.5px solid #1F6F43'
                        : '1.5px solid #D1D5DB',
                    }}
                  >
                    {day.label}
                  </button>
                );
              })}
            </div>
            {/* Quick links */}
            <div className="flex items-center gap-1.5 mt-2.5 justify-center">
              {(
                [
                  ['Weekdays', 'weekdays'],
                  ['Weekends', 'weekends'],
                  ['Every day', 'all'],
                  ['Clear', 'clear'],
                ] as [string, 'weekdays' | 'weekends' | 'all' | 'clear'][]
              ).map(([label, preset], idx) => (
                <span key={preset} className="flex items-center gap-1.5">
                  {idx > 0 && (
                    <span
                      className="text-[#D1D5DB]"
                      style={{ fontSize: '11px' }}
                    >
                      ·
                    </span>
                  )}
                  <button
                    onClick={() => selectPreset(preset)}
                    className="font-['Inter'] hover:underline transition-colors"
                    style={{
                      fontSize: '11px',
                      color: preset === 'clear' ? '#9CA3AF' : '#1F6F43',
                    }}
                  >
                    {label}
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* ── SECTION 2: Shift Slots Per Day ──────────────────────── */}
          {activeDays.length > 0 && (
            <div>
              <label
                className="font-['Inter'] font-medium text-[#9CA3AF] mb-3 block uppercase"
                style={{ fontSize: '11px', letterSpacing: '0.04em' }}
              >
                Shift slots per day
              </label>
              <div className="space-y-2">
                {activeDays.map(day => (
                  <DayCard
                    key={day.key}
                    dayKey={day.key}
                    dayFull={day.full}
                    slots={schedule[day.key]}
                    expanded={expandedDay === day.key}
                    onToggleExpand={() =>
                      setExpandedDay(expandedDay === day.key ? null : day.key)
                    }
                    onUpdateSlot={(slot, patch) =>
                      updateSlot(day.key, slot, patch)
                    }
                  />
                ))}
              </div>
            </div>
          )}

          {/* ── SECTION 3: Weekly Preview ───────────────────────────── */}
          {activeDays.length > 0 && (
            <div>
              <label
                className="font-['Inter'] font-medium text-[#9CA3AF] mb-3 block uppercase"
                style={{ fontSize: '11px', letterSpacing: '0.04em' }}
              >
                Weekly preview
              </label>
              <div
                className="rounded-[12px] overflow-hidden"
                style={{ backgroundColor: '#F5F5F5', padding: '2px 0' }}
              >
                {allDays.map((day, idx) => {
                  const isActive = selectedDays.has(day.key);
                  const daySlots = schedule[day.key];
                  const enabledSlots = isActive
                    ? slotMeta.filter(s => daySlots[s.key].enabled)
                    : [];

                  return (
                    <div key={day.key}>
                      <div className="flex items-center justify-between px-3.5 py-2.5">
                        <span
                          className="font-['Inter'] text-[#6B7280]"
                          style={{
                            fontSize: '12px',
                            opacity: isActive ? 1 : 0.5,
                          }}
                        >
                          {day.full}
                        </span>
                        <div className="flex gap-1">
                          {isActive && enabledSlots.length > 0 ? (
                            enabledSlots.map(s => (
                              <span
                                key={s.key}
                                className="font-['Inter'] font-medium rounded-full"
                                style={{
                                  fontSize: '10px',
                                  padding: '2px 8px',
                                  backgroundColor: s.chipBg,
                                  color: s.chipColor,
                                }}
                              >
                                {s.label}
                              </span>
                            ))
                          ) : (
                            <span
                              className="font-['Inter'] font-medium rounded-full"
                              style={{
                                fontSize: '10px',
                                padding: '2px 8px',
                                backgroundColor: '#F0F0F0',
                                color: '#9CA3AF',
                              }}
                            >
                              Off
                            </span>
                          )}
                        </div>
                      </div>
                      {idx < allDays.length - 1 && (
                        <div
                          className="mx-3.5"
                          style={{
                            height: '0.5px',
                            backgroundColor: '#E5E7EB',
                          }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── SECTION 4: Info Notice ──────────────────────────────── */}
          <div
            className="rounded-[12px] flex items-start gap-2.5"
            style={{
              backgroundColor: '#E6F1FB',
              border: '0.5px solid #93C5FD',
              padding: '12px 14px',
            }}
          >
            <Info
              className="w-4 h-4 text-[#2563EB] flex-shrink-0 mt-[1px]"
              strokeWidth={2.5}
            />
            <div className="flex-1">
              <div
                className="font-['Inter'] font-semibold text-[#1E40AF]"
                style={{ fontSize: '13px' }}
              >
                Affects future shifts only
              </div>
              <p
                className="font-['Inter'] text-[#6B7280] mt-0.5"
                style={{ fontSize: '11px', lineHeight: '1.5' }}
              >
                Already confirmed shifts won't be changed. Use Override
                Availability to modify those.
              </p>
            </div>
          </div>

          {/* ── Empty state ─────────────────────────────────────────── */}
          {selectedDays.size === 0 && (
            <div
              className="rounded-[12px] flex items-center justify-center py-10"
              style={{ backgroundColor: '#F5F5F5' }}
            >
              <div className="text-center px-8">
                <div
                  className="w-10 h-10 rounded-full mx-auto mb-3 flex items-center justify-center"
                  style={{ backgroundColor: '#FEF2F2' }}
                >
                  <Moon
                    className="w-5 h-5 text-[#EF4444]"
                    strokeWidth={2}
                  />
                </div>
                <div
                  className="font-['Inter'] font-medium text-[#374151] mb-1"
                  style={{ fontSize: '13px' }}
                >
                  No days selected
                </div>
                <p
                  className="font-['Inter'] text-[#9CA3AF]"
                  style={{ fontSize: '12px', lineHeight: '1.5' }}
                >
                  Select at least one day above to configure your recurring
                  schedule.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Fixed Bottom CTA ───────────────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 max-w-[390px] mx-auto px-5 pb-6 pt-3 bg-gradient-to-t from-[#F8F8F6] via-[#F8F8F6] to-transparent">
        <button
          onClick={handleSave}
          disabled={selectedDays.size === 0}
          className="w-full rounded-[12px] font-['Inter'] font-semibold transition-all active:scale-[0.98]"
          style={{
            fontSize: '14px',
            padding: '13px 0',
            backgroundColor:
              selectedDays.size === 0 ? '#D1D5DB' : '#1F6F43',
            color: selectedDays.size === 0 ? '#9CA3AF' : '#FFFFFF',
            boxShadow:
              selectedDays.size === 0
                ? 'none'
                : '0 4px 14px rgba(31,111,67,0.2)',
            cursor: selectedDays.size === 0 ? 'not-allowed' : 'pointer',
          }}
        >
          Save schedule
        </button>
      </div>
    </div>
  );
}
