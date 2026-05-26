import { MapPinOff } from 'lucide-react';
import { useSafeNavigate } from '../hooks/useSafeNavigate';

export function GpsUnavailable() {
  const navigate = useSafeNavigate();

  return (
    <div className="w-full h-screen max-w-[390px] mx-auto bg-[#F8F8F6] flex flex-col items-center justify-center px-10">
      {/* Location disabled icon */}
      <div className="relative">
        <div className="w-20 h-20 rounded-full bg-[#FEF2F2] flex items-center justify-center">
          <MapPinOff className="w-10 h-10 text-[#DC2626]" strokeWidth={1.5} />
        </div>
      </div>

      <h1
        className="font-['Poppins'] font-bold text-[#1A1A1A] mt-5 text-center"
        style={{ fontSize: '18px' }}
      >
        Location Services Required
      </h1>

      <p
        className="font-['Inter'] text-[#6B7280] mt-2 text-center"
        style={{ fontSize: '14px', lineHeight: '1.5', maxWidth: '300px' }}
      >
        Family Forever requires your location to verify shift check-in. Please enable location services to continue.
      </p>

      {/* Action buttons */}
      <div className="w-full mt-6" style={{ maxWidth: '320px' }}>
        <button
          className="w-full bg-[#1F6F43] text-white font-['Poppins'] font-semibold rounded-xl"
          style={{ height: '50px', fontSize: '15px' }}
          onClick={() => {
            // In a real app this would open device settings
            // window.open('app-settings:', '_self');
          }}
        >
          Open Settings
        </button>

        <button
          onClick={() => navigate(-1)}
          className="w-full mt-3 font-['Inter'] font-medium text-[#6B7280] text-center"
          style={{ fontSize: '14px' }}
        >
          Go Back
        </button>
      </div>
    </div>
  );
}
