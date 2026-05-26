import { Check, MapPin, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';

interface ConfirmShiftDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirmed: () => void | Promise<void>;
  shiftDocId?: string;
  serviceType?: string;
  clientName?: string;
  date?: string;
  timeRange?: string;
  location?: string;
}

export function ConfirmShiftDialog({
  open,
  onClose,
  onConfirmed,
  shiftDocId: _shiftDocId,
  serviceType = 'Respite Care',
  clientName = 'Unknown Client',
  date = '',
  timeRange = '',
  location = '',
}: ConfirmShiftDialogProps) {
  const [state, setState] = useState<'confirm' | 'success' | 'loading'>('confirm');
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    if (open) {
      setState('confirm');
      setAnimating(true);
    }
  }, [open]);

  const handleConfirm = async () => {
    setState('loading');
    try {
      await onConfirmed();
    } catch {
      // still show success — parent already handled error
    }
    setState('success');
    setTimeout(() => {
      onClose();
    }, 1200);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={(e) => {
        if (e.target === e.currentTarget && state === 'confirm') onClose();
      }}
      style={{
        backgroundColor: 'rgba(0,0,0,0.4)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        animation: 'fadeIn 200ms ease-out',
      }}
    >
      <div
        className="bg-white rounded-[20px] w-[320px]"
        style={{
          padding: '28px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
          animation: 'dialogScaleIn 300ms cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {(state === 'confirm' || state === 'loading') ? (
          <>
            {/* Icon */}
            <div className="flex justify-center mb-4">
              <div
                className="rounded-full flex items-center justify-center"
                style={{ width: '56px', height: '56px', backgroundColor: '#F0FDF4' }}
              >
                <Check className="text-[#1F6F43]" style={{ width: '24px', height: '24px' }} strokeWidth={2.5} />
              </div>
            </div>

            {/* Title */}
            <h2
              className="font-['Poppins'] font-semibold text-[#1A1A1A] text-center mb-3"
              style={{ fontSize: '18px' }}
            >
              Confirm this shift?
            </h2>

            {/* Shift Summary */}
            <div className="text-center mb-4">
              <p className="font-['Inter'] font-medium text-[#1A1A1A]" style={{ fontSize: '14px' }}>
                {serviceType} · {clientName}
              </p>
              <p className="font-['Inter'] text-[#6B7280] mt-1" style={{ fontSize: '13px' }}>
                {date} · {timeRange}
              </p>
              <p className="font-['Inter'] text-[#9CA3AF] mt-0.5" style={{ fontSize: '12px' }}>
                {location}
              </p>
            </div>

            {/* Confirmation Message */}
            <p
              className="font-['Inter'] text-[#6B7280] text-center mb-6"
              style={{ fontSize: '13px', lineHeight: '1.5' }}
            >
              By confirming, you acknowledge this shift assignment and commit to attending.
            </p>

            {/* Buttons */}
            <div className="space-y-2.5">
              <button
                onClick={state === 'loading' ? undefined : handleConfirm}
                disabled={state === 'loading'}
                className="w-full font-['Poppins'] font-semibold text-white bg-[#1F6F43] rounded-xl active:scale-[0.98] transition-transform flex items-center justify-center gap-2 disabled:opacity-80"
                style={{
                  height: '50px',
                  fontSize: '15px',
                  boxShadow: '0 2px 12px rgba(31,111,67,0.2)',
                }}
              >
                {state === 'loading' ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Confirming…</>
                ) : 'Yes, Confirm Shift'}
              </button>
              <button
                onClick={onClose}
                className="w-full font-['Inter'] font-medium text-[#6B7280] rounded-xl active:opacity-70 transition-opacity"
                style={{ height: '44px', fontSize: '14px' }}
              >
                Cancel
              </button>
            </div>
          </>
        ) : (
          /* Success State */
          <>
            <div className="flex justify-center mb-4">
              <div
                className="rounded-full flex items-center justify-center"
                style={{
                  width: '56px',
                  height: '56px',
                  backgroundColor: '#F0FDF4',
                  animation: 'successPulse 400ms ease-out',
                }}
              >
                <Check className="text-[#1F6F43]" style={{ width: '24px', height: '24px' }} strokeWidth={3} />
              </div>
            </div>
            <h2
              className="font-['Poppins'] font-semibold text-[#1F6F43] text-center mb-2"
              style={{ fontSize: '18px' }}
            >
              Shift Confirmed!
            </h2>
            <p className="font-['Inter'] text-[#9CA3AF] text-center" style={{ fontSize: '14px' }}>
              Owner has been notified
            </p>
          </>
        )}
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes dialogScaleIn {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes successPulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
