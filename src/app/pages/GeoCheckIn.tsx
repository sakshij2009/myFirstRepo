import { useState, useEffect, useCallback } from 'react';
import { MapPin, Check, Clock, AlertTriangle, Info, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useSafeNavigate } from '../hooks/useSafeNavigate';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';
import { useParams } from 'react-router';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';

const MAP_IMG = 'https://images.unsplash.com/photo-1567612365380-46b90f9bf281?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzdHJlZXQlMjBtYXAlMjBzYXRlbGxpdGUlMjB2aWV3JTIwbmVpZ2hib3Job29kfGVufDF8fHx8MTc3MzU1NTI5NXww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral';

type Phase = 'loading' | 'confirmation' | 'success';
type Scenario = 'match' | 'mismatch';
type TimingNotice = 'early' | 'late' | null;

export function GeoCheckIn() {
  const navigate = useSafeNavigate();
  const { id: shiftDocId } = useParams<{ id: string }>();
  const [phase, setPhase] = useState<Phase>('loading');
  const [scenario] = useState<Scenario>('match');
  const [timingNotice] = useState<TimingNotice>(null);

  // GPS resolving simulation (real GPS would go here)
  useEffect(() => {
    const timer = setTimeout(() => setPhase('confirmation'), 1800);
    return () => clearTimeout(timer);
  }, []);

  // Auto-dismiss success screen
  useEffect(() => {
    if (phase === 'success') {
      const timer = setTimeout(() => navigate(`/shifts/${shiftDocId}`), 2500);
      return () => clearTimeout(timer);
    }
  }, [phase, navigate, shiftDocId]);

  const handleConfirm = useCallback(async () => {
    // Write clockIn as a Firestore server timestamp — matches the format the
    // admin dashboard uses for payroll & hours calculation.
    if (shiftDocId) {
      try {
        await updateDoc(doc(db, 'dev_shifts', shiftDocId), {
          clockIn: serverTimestamp(),
          shiftConfirmed: true,
        });
      } catch (e) {
        console.error('Clock-in write failed:', e);
      }
    }
    setPhase('success');
  }, [shiftDocId]);

  const handleCancel = useCallback(() => navigate(-1), [navigate]);
  const handleSuccessTap = useCallback(() => navigate(`/shifts/${shiftDocId}`), [navigate, shiftDocId]);

  const currentTime = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  const currentDate = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  return (
    <div className="w-full h-screen max-w-[390px] mx-auto bg-[#F8F8F6] flex flex-col overflow-hidden">
      <AnimatePresence mode="wait">
        {phase === 'loading' && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="flex-1 flex flex-col items-center justify-center px-5"
          >
            <LoadingState />
          </motion.div>
        )}

        {phase === 'confirmation' && (
          <motion.div
            key="confirmation"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="flex-1 flex flex-col overflow-hidden"
          >
            <ConfirmationScreen
              scenario={scenario}
              timingNotice={timingNotice}
              currentTime={currentTime}
              currentDate={currentDate}
              onConfirm={handleConfirm}
              onCancel={handleCancel}
            />
          </motion.div>
        )}

        {phase === 'success' && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="flex-1 flex flex-col items-center justify-center px-5 cursor-pointer"
            onClick={handleSuccessTap}
          >
            <SuccessScreen currentTime={currentTime} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Loading State ──────────────────────────────────────────────────── */
function LoadingState() {
  return (
    <div className="flex flex-col items-center">
      {/* Pulsing GPS pin */}
      <div className="relative flex items-center justify-center w-24 h-24">
        {/* Pulsing rings */}
        <motion.div
          className="absolute w-20 h-20 rounded-full border-2 border-[#1F6F43]"
          animate={{ scale: [1, 1.8, 1.8], opacity: [0.6, 0, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
        />
        <motion.div
          className="absolute w-20 h-20 rounded-full border-2 border-[#1F6F43]"
          animate={{ scale: [1, 1.5, 1.5], opacity: [0.4, 0, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeOut', delay: 0.5 }}
        />
        <MapPin className="w-12 h-12 text-[#1F6F43]" strokeWidth={2} />
      </div>

      <h2
        className="font-['Poppins'] font-semibold text-[#1A1A1A] mt-5 text-center"
        style={{ fontSize: '16px' }}
      >
        Getting your location...
      </h2>
      <p
        className="font-['Inter'] text-[#9CA3AF] mt-2 text-center"
        style={{ fontSize: '13px' }}
      >
        Please ensure location services are enabled
      </p>
    </div>
  );
}

/* ─── Confirmation Screen ────────────────────────────────────────────── */
function ConfirmationScreen({
  scenario,
  timingNotice,
  currentTime,
  currentDate,
  onConfirm,
  onCancel,
}: {
  scenario: Scenario;
  timingNotice: TimingNotice;
  currentTime: string;
  currentDate: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const isMismatch = scenario === 'mismatch';

  return (
    <>
      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {/* Header */}
        <header className="flex items-center justify-between px-5 pt-14 pb-3">
          <button
            onClick={onCancel}
            className="font-['Inter'] font-medium text-[#6B7280]"
            style={{ fontSize: '14px' }}
          >
            ← Cancel
          </button>
          <h1
            className="font-['Poppins'] font-semibold text-[#1A1A1A]"
            style={{ fontSize: '18px' }}
          >
            Clock In
          </h1>
          <div className="w-16" />
        </header>

        <div className="px-5 pb-6">
          {/* Map Preview Card */}
          <div
            className="bg-white rounded-2xl overflow-hidden mb-4"
            style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
          >
            {/* Map area */}
            <div className="relative" style={{ height: '200px' }}>
              <ImageWithFallback
                src={MAP_IMG}
                alt="Map preview"
                className="w-full h-full object-cover"
              />
              {/* Green pin */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full">
                <div className="flex flex-col items-center">
                  <div
                    className="w-8 h-8 rounded-full bg-[#1F6F43] flex items-center justify-center"
                    style={{ boxShadow: '0 2px 8px rgba(31,111,67,0.4)' }}
                  >
                    <div className="w-3 h-3 rounded-full bg-white" />
                  </div>
                  <div className="w-0.5 h-3 bg-[#1F6F43]" />
                </div>
              </div>

              {/* Mismatch: second amber pin */}
              {isMismatch && (
                <div className="absolute top-[35%] left-[65%] -translate-x-1/2 -translate-y-full">
                  <div className="flex flex-col items-center">
                    <div
                      className="w-6 h-6 rounded-full bg-[#F59E0B] flex items-center justify-center"
                      style={{ boxShadow: '0 2px 6px rgba(245,158,11,0.4)' }}
                    >
                      <div className="w-2.5 h-2.5 rounded-full bg-white" />
                    </div>
                    <div className="w-0.5 h-2 bg-[#F59E0B]" />
                  </div>
                </div>
              )}
            </div>

            {/* Location details */}
            <div className="p-4">
              <p
                className="font-['Inter'] font-medium text-[#9CA3AF]"
                style={{ fontSize: '11px', letterSpacing: '0.3px' }}
              >
                YOUR CURRENT LOCATION
              </p>
              <p
                className="font-['Inter'] font-semibold text-[#1A1A1A] mt-1"
                style={{ fontSize: '15px' }}
              >
                1234 Oak Street, Suite 5, Ontario
              </p>
              <p
                className="font-['Inter'] text-[#D1D5DB] mt-0.5"
                style={{ fontSize: '11px' }}
              >
                43.6532° N, 79.3832° W
              </p>
            </div>
          </div>

          {/* Location Match Status */}
          {!isMismatch ? (
            <div
              className="flex items-start gap-3 p-3.5 rounded-xl mb-4"
              style={{ backgroundColor: '#F0FDF4' }}
            >
              <div className="w-6 h-6 rounded-full bg-[#1F6F43] flex items-center justify-center flex-shrink-0 mt-0.5">
                <Check className="w-3 h-3 text-white" strokeWidth={3} />
              </div>
              <div>
                <p className="font-['Inter'] font-semibold text-[#1F6F43]" style={{ fontSize: '14px' }}>
                  Location matches shift address
                </p>
                <p className="font-['Inter'] text-[#6B7280] mt-0.5" style={{ fontSize: '12px' }}>
                  1234 Oak Street, Suite 5
                </p>
              </div>
            </div>
          ) : (
            <div
              className="flex items-start gap-3 p-3.5 rounded-xl mb-4"
              style={{
                backgroundColor: '#FFF8E1',
                borderLeft: '4px solid #F59E0B',
              }}
            >
              <AlertTriangle className="w-6 h-6 text-[#F59E0B] flex-shrink-0 mt-0.5" strokeWidth={2} />
              <div>
                <p className="font-['Inter'] font-semibold text-[#92600A]" style={{ fontSize: '14px' }}>
                  Location mismatch detected
                </p>
                <p
                  className="font-['Inter'] text-[#92600A] mt-1"
                  style={{ fontSize: '13px', lineHeight: '1.5' }}
                >
                  You are 1.2 km from the expected shift location (1234 Oak Street, Suite 5). Your current location will be recorded.
                </p>
                <p className="font-['Inter'] font-medium text-[#92600A] mt-1" style={{ fontSize: '12px' }}>
                  This will be flagged for owner review
                </p>
              </div>
            </div>
          )}

          {/* Timing Notice (Early / Late) */}
          {timingNotice === 'early' && (
            <div
              className="flex items-start gap-2.5 p-3 rounded-xl mb-4"
              style={{ backgroundColor: '#EBF5FF' }}
            >
              <Info className="w-[18px] h-[18px] text-[#1E5FA6] flex-shrink-0 mt-0.5" strokeWidth={2} />
              <p className="font-['Inter'] text-[#1E5FA6]" style={{ fontSize: '13px', lineHeight: '1.5' }}>
                You're checking in 23 minutes early. Your actual start time ({currentTime}) will be recorded.
              </p>
            </div>
          )}
          {timingNotice === 'late' && (
            <div
              className="flex items-start gap-2.5 p-3 rounded-xl mb-4"
              style={{ backgroundColor: '#FEF2F2', borderLeft: '3px solid #DC2626' }}
            >
              <AlertTriangle className="w-[18px] h-[18px] text-[#DC2626] flex-shrink-0 mt-0.5" strokeWidth={2} />
              <p className="font-['Inter'] text-[#DC2626]" style={{ fontSize: '13px', lineHeight: '1.5' }}>
                You're clocking in 12 minutes late. Scheduled start was 9:00 AM. Your actual clock-in time ({currentTime}) will be recorded and flagged.
              </p>
            </div>
          )}

          {/* Shift Summary Card */}
          <div
            className="bg-white rounded-2xl p-4 mb-4"
            style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
          >
            <div className="flex items-center justify-between mb-2.5">
              <span
                className="px-3 py-1 rounded-full font-['Inter'] font-semibold"
                style={{ backgroundColor: '#EBF5FF', color: '#1E5FA6', fontSize: '12px' }}
              >
                Respite Care
              </span>
              <span
                className="font-['Inter'] font-medium text-[#6B7280]"
                style={{ fontSize: '13px' }}
              >
                4 hours
              </span>
            </div>
            <div className="flex items-center gap-2 mb-2">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center font-['Inter'] font-semibold"
                style={{ backgroundColor: '#F0FDF4', color: '#1F6F43', fontSize: '10px' }}
              >
                ET
              </div>
              <span className="font-['Inter'] font-semibold text-[#1A1A1A]" style={{ fontSize: '14px' }}>
                Emma Thompson
              </span>
            </div>
            <div className="flex items-center gap-1.5 mb-2">
              <Clock className="w-3.5 h-3.5 text-[#9CA3AF]" strokeWidth={2} />
              <span className="font-['Inter'] text-[#6B7280]" style={{ fontSize: '13px' }}>
                9:00 AM – 1:00 PM
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-['Inter'] text-[#6B7280]" style={{ fontSize: '14px' }}>
                Clock-in time:
              </span>
              <span className="font-['Inter'] font-semibold text-[#1F6F43]" style={{ fontSize: '14px' }}>
                {currentTime}
              </span>
            </div>
          </div>

          {/* Timestamp Confirmation */}
          <div className="flex flex-col items-center mb-4">
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-[#1F6F43]" strokeWidth={2} />
              <span
                className="font-['Poppins'] font-bold text-[#1A1A1A]"
                style={{ fontSize: '32px' }}
              >
                {currentTime}
              </span>
            </div>
            <p className="font-['Inter'] text-[#9CA3AF] mt-1" style={{ fontSize: '14px' }}>
              {currentDate}
            </p>
          </div>
        </div>
      </div>

      {/* Bottom Action Area — docked confirmation card */}
      <div
        className="px-7 pb-8 pt-6 bg-white"
        style={{
          borderRadius: '20px 20px 0 0',
          boxShadow: '0 -4px 24px rgba(0,0,0,0.08)',
        }}
      >
        <h3
          className="font-['Poppins'] font-semibold text-[#1A1A1A] mb-1"
          style={{ fontSize: '16px' }}
        >
          Confirm clock-in at {currentTime}?
        </h3>
        <p
          className="font-['Inter'] mb-5"
          style={{
            fontSize: '13px',
            color: isMismatch ? '#92600A' : '#9CA3AF',
          }}
        >
          {isMismatch
            ? 'Location mismatch will be reported to owner'
            : 'Your time and location will be recorded'}
        </p>
        <button
          onClick={onConfirm}
          className="w-full font-['Poppins'] font-semibold text-white rounded-[14px] active:scale-[0.98] transition-transform"
          style={{
            height: '52px',
            fontSize: '15px',
            backgroundColor: isMismatch ? '#F59E0B' : '#1F6F43',
            boxShadow: isMismatch
              ? '0 4px 12px rgba(245,158,11,0.2)'
              : '0 4px 12px rgba(31,111,67,0.2)',
          }}
        >
          {isMismatch ? 'Clock In Anyway' : 'Confirm Clock In'}
        </button>
        <button
          onClick={onCancel}
          className="w-full font-['Inter'] font-medium text-[#6B7280] mt-3 text-center"
          style={{ fontSize: '14px', height: '40px' }}
        >
          Cancel
        </button>
      </div>
    </>
  );
}

/* ─── Success Screen ─────────────────────────────────────────────────── */
function SuccessScreen({ currentTime }: { currentTime: string }) {
  return (
    <div className="flex flex-col items-center">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="w-20 h-20 rounded-full bg-[#1F6F43] flex items-center justify-center"
      >
        <Check className="w-8 h-8 text-white" strokeWidth={3} />
      </motion.div>

      <h2
        className="font-['Poppins'] font-bold text-[#1F6F43] mt-4"
        style={{ fontSize: '22px' }}
      >
        Clocked In!
      </h2>
      <p className="font-['Inter'] text-[#9CA3AF] mt-2" style={{ fontSize: '14px' }}>
        {currentTime} · 1234 Oak Street, Suite 5
      </p>
      <p className="font-['Inter'] text-[#6B7280] mt-4" style={{ fontSize: '13px' }}>
        Respite Care · Emma Thompson · 4 hrs
      </p>

      {/* Report reminder */}
      <div
        className="flex items-start gap-2.5 mt-6 p-3 px-4 rounded-[10px] max-w-[320px]"
        style={{ backgroundColor: '#F0FDF4' }}
      >
        <FileText className="w-4 h-4 text-[#1F6F43] flex-shrink-0 mt-0.5" strokeWidth={2} />
        <p className="font-['Inter'] text-[#1F6F43]" style={{ fontSize: '13px', lineHeight: '1.5' }}>
          Remember to document your shift observations throughout your visit
        </p>
      </div>
    </div>
  );
}