import { useState, useEffect, useCallback } from 'react';
import { MapPin, Check, Clock, AlertTriangle, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useSafeNavigate } from '../hooks/useSafeNavigate';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';
import { useParams } from 'react-router';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';

const MAP_IMG = 'https://images.unsplash.com/photo-1567612365380-46b90f9bf281?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzdHJlZXQlMjBtYXAlMjBzYXRlbGxpdGUlMjB2aWV3JTIwbmVpZ2hib3Job29kfGVufDB8fHx8MTc3MzU1NTI5NXww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral';

type Phase = 'loading' | 'confirmation' | 'success';
type Scenario = 'match' | 'mismatch';
type ReportStatus = 'complete' | 'partial' | 'empty';

export function GeoCheckOut() {
  const navigate = useSafeNavigate();
  const { id: shiftDocId } = useParams<{ id: string }>();
  const [phase, setPhase] = useState<Phase>('loading');
  const [scenario] = useState<Scenario>('match');
  const [reportStatus] = useState<ReportStatus>('complete');
  const reportCharCount = reportStatus === 'complete' ? 1247 : reportStatus === 'partial' ? 724 : 0;

  useEffect(() => {
    const timer = setTimeout(() => setPhase('confirmation'), 1800);
    return () => clearTimeout(timer);
  }, []);

  const handleConfirm = useCallback(async () => {
    if (shiftDocId) {
      try {
        await updateDoc(doc(db, 'shifts', shiftDocId), { clockOut: serverTimestamp() });
      } catch (e) {
        console.error('Clock-out write failed:', e);
      }
    }
    setPhase('success');
  }, [shiftDocId]);

  const handleCancel = useCallback(() => navigate(-1), [navigate]);

  const checkInTime = '';   // will come from Firestore via ShiftDetail
  const checkOutTime = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  const totalDuration = '';
  const isOvertime = false;

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
            <CheckOutConfirmation
              scenario={scenario}
              checkInTime={checkInTime}
              checkOutTime={checkOutTime}
              totalDuration={totalDuration}
              isOvertime={isOvertime}
              reportStatus={reportStatus}
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
            className="flex-1 flex flex-col items-center justify-center px-5"
          >
            <CheckOutSuccess
              checkOutTime={checkOutTime}
              totalDuration={totalDuration}
              navigate={navigate}
              reportStatus={reportStatus}
              reportCharCount={reportCharCount}
            />
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
      <div className="relative flex items-center justify-center w-24 h-24">
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

/* ─── Clock-Out Confirmation ─────────────────────────────────────────── */
function CheckOutConfirmation({
  scenario,
  checkInTime,
  checkOutTime,
  totalDuration,
  isOvertime,
  reportStatus,
  onConfirm,
  onCancel,
}: {
  scenario: Scenario;
  checkInTime: string;
  checkOutTime: string;
  totalDuration: string;
  isOvertime: boolean;
  reportStatus: ReportStatus;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const isMismatch = scenario === 'mismatch';

  return (
    <>
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
            Clock Out
          </h1>
          <div className="w-16" />
        </header>

        <div className="px-5 pb-6">
          {/* Map Preview Card */}
          <div
            className="bg-white rounded-2xl overflow-hidden mb-4"
            style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
          >
            <div className="relative" style={{ height: '180px' }}>
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
            </div>

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
              style={{ backgroundColor: '#FFF8E1', borderLeft: '4px solid #F59E0B' }}
            >
              <AlertTriangle className="w-6 h-6 text-[#F59E0B] flex-shrink-0 mt-0.5" strokeWidth={2} />
              <div>
                <p className="font-['Inter'] font-semibold text-[#92600A]" style={{ fontSize: '14px' }}>
                  Location mismatch detected
                </p>
                <p className="font-['Inter'] text-[#92600A] mt-1" style={{ fontSize: '13px', lineHeight: '1.5' }}>
                  You are 1.2 km from the expected shift location. Your current location will be recorded.
                </p>
              </div>
            </div>
          )}

          {/* Shift Duration Summary Card */}
          <div
            className="bg-white rounded-2xl p-5 mb-4"
            style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
          >
            <h3
              className="font-['Poppins'] font-semibold text-[#1A1A1A] mb-4"
              style={{ fontSize: '14px' }}
            >
              Shift Summary
            </h3>

            {/* Clock In / Clock Out comparison */}
            <div className="flex items-start justify-between relative mb-5">
              {/* Clock In Column */}
              <div className="flex flex-col items-center flex-1">
                <div className="w-8 h-8 rounded-full bg-[#F0FDF4] flex items-center justify-center mb-1.5">
                  <Clock className="w-4 h-4 text-[#1F6F43]" strokeWidth={2} />
                </div>
                <span className="font-['Inter'] text-[#9CA3AF]" style={{ fontSize: '12px' }}>
                  Clock In
                </span>
                <span
                  className="font-['Poppins'] font-bold text-[#1A1A1A] mt-1"
                  style={{ fontSize: '18px' }}
                >
                  {checkInTime}
                </span>
                <span className="font-['Inter'] text-[#9CA3AF] mt-0.5" style={{ fontSize: '11px' }}>
                  1234 Oak Street
                </span>
              </div>

              {/* Connecting dashed line */}
              <div className="absolute top-4 left-[25%] right-[25%] flex items-center justify-center">
                <div
                  className="flex-1 border-t-2 border-dashed border-[#E5E7EB]"
                  style={{ margin: '0 8px' }}
                />
              </div>

              {/* Clock Out Column */}
              <div className="flex flex-col items-center flex-1">
                <div className="w-8 h-8 rounded-full border-2 border-[#1F6F43] flex items-center justify-center mb-1.5 relative">
                  <motion.div
                    className="w-2.5 h-2.5 rounded-full bg-[#1F6F43]"
                    animate={{ opacity: [1, 0.4, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                </div>
                <span className="font-['Inter'] text-[#9CA3AF]" style={{ fontSize: '12px' }}>
                  Clock Out
                </span>
                <span
                  className="font-['Poppins'] font-bold text-[#1A1A1A] mt-1"
                  style={{ fontSize: '18px' }}
                >
                  {checkOutTime}
                </span>
                <span className="font-['Inter'] text-[#9CA3AF] mt-0.5" style={{ fontSize: '11px' }}>
                  1234 Oak Street
                </span>
              </div>
            </div>

            {/* Total Duration */}
            <div className="flex flex-col items-center mb-4">
              <span
                className="font-['Poppins'] font-bold"
                style={{
                  fontSize: '28px',
                  color: isOvertime ? '#F59E0B' : '#1F6F43',
                }}
              >
                {totalDuration}
              </span>
              <span className="font-['Inter'] text-[#9CA3AF]" style={{ fontSize: '12px' }}>
                Total shift duration
              </span>
              {isOvertime && (
                <span
                  className="font-['Inter'] font-medium mt-1 px-2.5 py-0.5 rounded-full"
                  style={{
                    fontSize: '11px',
                    backgroundColor: '#FFF8E1',
                    color: '#F59E0B',
                  }}
                >
                  Overtime: +6 min
                </span>
              )}
            </div>

            {/* Comparison row */}
            <div
              className="flex items-center justify-between pt-3"
              style={{ borderTop: '1px solid #F3F4F6' }}
            >
              <span className="font-['Inter'] text-[#9CA3AF]" style={{ fontSize: '13px' }}>
                Scheduled: 4h 00m
              </span>
              <span
                className="font-['Inter'] font-semibold text-[#1A1A1A]"
                style={{ fontSize: '13px' }}
              >
                Actual: {totalDuration}
              </span>
            </div>
          </div>

          {/* Report Completion Status */}
          <ReportStatusCard reportStatus={reportStatus} reportCharCount={reportStatus === 'complete' ? 1247 : reportStatus === 'partial' ? 724 : 0} onGoBack={onCancel} />
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
          Confirm clock-out at {checkOutTime}?
        </h3>
        <p
          className="font-['Inter'] mb-5"
          style={{ fontSize: '13px', color: '#9CA3AF' }}
        >
          Your final time, location, and report will be recorded
        </p>

        {/* Report-aware primary button */}
        {reportStatus === 'complete' ? (
          <button
            onClick={onConfirm}
            className="w-full font-['Poppins'] font-semibold rounded-[14px] active:scale-[0.98] transition-transform"
            style={{
              height: '52px',
              fontSize: '15px',
              color: '#1F6F43',
              backgroundColor: 'white',
              border: '2px solid #1F6F43',
            }}
          >
            Confirm Clock Out
          </button>
        ) : reportStatus === 'partial' ? (
          <button
            onClick={onConfirm}
            className="w-full font-['Poppins'] font-semibold text-white rounded-[14px] active:scale-[0.98] transition-transform"
            style={{
              height: '52px',
              fontSize: '15px',
              backgroundColor: '#F59E0B',
              boxShadow: '0 4px 12px rgba(245,158,11,0.2)',
            }}
          >
            Clock Out Anyway
          </button>
        ) : (
          <button
            onClick={onConfirm}
            className="w-full font-['Poppins'] font-semibold rounded-[14px] active:scale-[0.98] transition-transform"
            style={{
              height: '52px',
              fontSize: '15px',
              color: '#DC2626',
              backgroundColor: 'white',
              border: '2px solid #DC2626',
            }}
          >
            Clock Out Without Report
          </button>
        )}

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

/* ─── Clock-Out Success ──────────────────────────────────────────────── */
function CheckOutSuccess({
  checkOutTime,
  totalDuration,
  navigate,
  reportStatus,
  reportCharCount,
}: {
  checkOutTime: string;
  totalDuration: string;
  navigate: ReturnType<typeof useSafeNavigate>;
  reportStatus: ReportStatus;
  reportCharCount: number;
}) {
  return (
    <div className="flex flex-col items-center w-full">
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
        Clocked Out!
      </h2>
      <p className="font-['Inter'] text-[#9CA3AF] mt-2" style={{ fontSize: '14px' }}>
        {checkOutTime} · 1234 Oak Street, Suite 5
      </p>
      <p
        className="font-['Poppins'] font-semibold text-[#1A1A1A] mt-3"
        style={{ fontSize: '18px' }}
      >
        Total: {totalDuration}
      </p>

      {/* Report submission confirmation */}
      {reportStatus === 'complete' || reportStatus === 'partial' ? (
        <div className="flex items-center gap-1.5 mt-5">
          <Check className="w-3.5 h-3.5 text-[#1F6F43]" strokeWidth={3} />
          <span className="font-['Inter'] text-[#6B7280]" style={{ fontSize: '13px' }}>
            Shift report submitted · {reportCharCount.toLocaleString()} characters
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-1.5 mt-5">
          <AlertTriangle className="w-3.5 h-3.5 text-[#DC2626]" strokeWidth={2} />
          <span className="font-['Inter'] text-[#DC2626]" style={{ fontSize: '13px' }}>
            No shift report submitted
          </span>
        </div>
      )}

      <button
        onClick={() => navigate('/shifts')}
        className="w-full mt-6 font-['Poppins'] font-semibold text-white bg-[#1F6F43] rounded-[14px]"
        style={{
          height: '54px',
          fontSize: '16px',
          boxShadow: '0 4px 12px rgba(31,111,67,0.2)',
        }}
      >
        Back to My Shifts
      </button>
    </div>
  );
}

/* ─── Report Status Card (for checkout confirmation) ─────────────────── */
function ReportStatusCard({
  reportStatus,
  reportCharCount,
  onGoBack,
}: {
  reportStatus: ReportStatus;
  reportCharCount: number;
  onGoBack: () => void;
}) {
  if (reportStatus === 'complete') {
    return (
      <div
        className="flex items-start gap-3 p-3.5 rounded-xl mb-4"
        style={{ backgroundColor: '#F0FDF4' }}
      >
        <div className="w-6 h-6 rounded-full bg-[#1F6F43] flex items-center justify-center flex-shrink-0 mt-0.5">
          <Check className="w-3 h-3 text-white" strokeWidth={3} />
        </div>
        <div>
          <p className="font-['Inter'] font-semibold text-[#1F6F43]" style={{ fontSize: '14px' }}>
            Shift report complete
          </p>
          <p className="font-['Inter'] text-[#6B7280] mt-0.5" style={{ fontSize: '12px' }}>
            {reportCharCount.toLocaleString()} characters · Report will be submitted with checkout
          </p>
        </div>
      </div>
    );
  }

  if (reportStatus === 'partial') {
    return (
      <div className="mb-4">
        <div
          className="flex items-start gap-3 p-3.5 rounded-xl"
          style={{ backgroundColor: '#FFF8E1', borderLeft: '3px solid #F59E0B' }}
        >
          <AlertTriangle className="w-6 h-6 text-[#F59E0B] flex-shrink-0 mt-0.5" strokeWidth={2} />
          <div>
            <p className="font-['Inter'] font-semibold text-[#92600A]" style={{ fontSize: '14px' }}>
              Report below recommended minimum
            </p>
            <p className="font-['Inter'] text-[#92600A] mt-1" style={{ fontSize: '13px', lineHeight: '1.5' }}>
              Your report is {reportCharCount} characters. Recommended minimum is 1,000 characters.
            </p>
            <button
              onClick={onGoBack}
              className="font-['Inter'] font-medium text-[#1F6F43] mt-2"
              style={{ fontSize: '13px' }}
            >
              Continue editing report
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Empty report
  return (
    <div className="mb-4">
      <div
        className="flex items-start gap-3 p-3.5 rounded-xl"
        style={{ backgroundColor: '#FEF2F2', borderLeft: '4px solid #DC2626' }}
      >
        <AlertTriangle className="w-6 h-6 text-[#DC2626] flex-shrink-0 mt-0.5" strokeWidth={2} />
        <div>
          <p className="font-['Inter'] font-semibold text-[#DC2626]" style={{ fontSize: '14px' }}>
            No shift report written
          </p>
          <p className="font-['Inter'] text-[#DC2626] mt-1" style={{ fontSize: '13px', lineHeight: '1.5' }}>
            You have not written a shift report. This will be flagged for owner review.
          </p>
          <button
            onClick={onGoBack}
            className="font-['Inter'] font-semibold text-[#1F6F43] mt-2"
            style={{ fontSize: '13px' }}
          >
            Go back and write report
          </button>
        </div>
      </div>
    </div>
  );
}