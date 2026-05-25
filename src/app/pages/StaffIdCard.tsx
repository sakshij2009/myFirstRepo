import { useState } from 'react';
import { ArrowLeft, Share2, RotateCcw, Sun } from 'lucide-react';
import { motion } from 'motion/react';
import { useSafeNavigate } from '../hooks/useSafeNavigate';
import { toast } from 'sonner';
import imgStaffPhoto from "figma:asset/1af2086220affecd5f498aeca93f64918a91bf86.png";
import imgLogo from "figma:asset/0d495a4b0b39eba28a6b72e320f92e9a00760e61.png";
import imgQrCode from "figma:asset/72e4462f590042cd762853a816e000ce1895aaad.png";

// ─── Card Front ──────────────────────────────────────────────────────
function CardFront() {
  return (
    <div
      className="w-full overflow-hidden relative"
      style={{
        borderRadius: '20px',
        height: '520px',
        backgroundColor: '#FFFFFF',
      }}
    >
      {/* Green header area */}
      <div
        className="relative"
        style={{
          backgroundColor: '#1F6F43',
          height: '180px',
          borderRadius: '20px 20px 0 0',
        }}
      >
        {/* Logo + company name */}
        <div className="flex items-center justify-center gap-2.5 pt-7">
          <img src={imgLogo} alt="Family Forever" className="w-8 h-8 object-cover" />
          <span
            className="font-['Poppins'] font-bold text-white"
            style={{ fontSize: '18px' }}
          >
            Family Forever Inc.
          </span>
        </div>

        {/* Employee ID */}
        <p
          className="font-['Poppins'] font-medium text-white text-center mt-3"
          style={{ fontSize: '16px' }}
        >
          Employee ID 27
        </p>

        {/* Curved white scoop at bottom of green */}
        <div
          className="absolute bottom-0 left-0 right-0 overflow-hidden"
          style={{ height: '60px' }}
        >
          <div
            className="absolute bg-white"
            style={{
              width: '420px',
              height: '120px',
              borderRadius: '50%',
              bottom: '-60px',
              left: '50%',
              transform: 'translateX(-50%)',
            }}
          />
        </div>
      </div>

      {/* Staff avatar - centered at green/white boundary */}
      <div
        className="absolute left-1/2 flex items-center justify-center"
        style={{
          width: '100px',
          height: '100px',
          top: '150px',
          transform: 'translateX(-50%)',
          zIndex: 10,
        }}
      >
        <div
          className="w-full h-full rounded-full overflow-hidden"
          style={{ border: '4px solid white', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
        >
          <img
            src={imgStaffPhoto}
            alt="Sarah Johnson"
            className="w-full h-full object-cover"
          />
        </div>
      </div>

      {/* White body content */}
      <div
        className="relative flex flex-col items-center justify-between"
        style={{
          paddingTop: '60px',
          paddingBottom: '28px',
          height: '320px',
          zIndex: 5,
        }}
      >
        <div className="flex flex-col items-center">
          {/* Name */}
          <h2
            className="font-['Poppins'] font-bold text-[#1A1A1A]"
            style={{ fontSize: '22px' }}
          >
            Sarah Johnson
          </h2>

          {/* Role */}
          <p
            className="font-['Inter'] text-[#6B7280] mt-1"
            style={{ fontSize: '14px' }}
          >
            Child and Youth Care Worker
          </p>

          {/* Contact */}
          <div className="flex flex-col items-center mt-7 gap-1.5">
            <p
              className="font-['Inter'] text-[#374151]"
              style={{ fontSize: '14px' }}
            >
              sarah.johnson@email.com
            </p>
            <p
              className="font-['Inter'] text-[#374151]"
              style={{ fontSize: '14px' }}
            >
              +1-555-987-6543
            </p>
          </div>
        </div>

        {/* Tagline */}
        <p
          className="font-['Poppins'] font-bold text-[#1F6F43] text-center"
          style={{ fontSize: '14px' }}
        >
          From Humanity to Community
        </p>
      </div>
    </div>
  );
}

// ─── Card Back ───────────────────────────────────────────────────────
function CardBack() {
  return (
    <div
      className="w-full bg-white flex flex-col items-center"
      style={{
        borderRadius: '20px',
        height: '520px',
        padding: '32px 24px',
      }}
    >
      {/* Company name */}
      <h2
        className="font-['Poppins'] font-bold text-[#374151] mt-2"
        style={{ fontSize: '22px' }}
      >
        Family Forever Inc.
      </h2>

      {/* QR Code */}
      <div className="mt-8">
        <img
          src={imgQrCode}
          alt="Verification QR Code"
          className="object-contain"
          style={{ width: '140px', height: '140px' }}
        />
      </div>

      {/* Terms */}
      <div className="flex-1 flex flex-col items-center mt-8">
        <h3
          className="font-['Poppins'] font-bold text-[#374151]"
          style={{ fontSize: '16px' }}
        >
          Terms &amp; Conditions
        </h3>
        <p
          className="font-['Inter'] text-[#6B7280] text-center mt-4"
          style={{
            fontSize: '13px',
            lineHeight: '1.6',
            maxWidth: '280px',
          }}
        >
          Use of this card indicates agreement with Family Forever Inc's. Policies and procedures. This Card is the property of Family Forever Inc. of Edmonton, if found please call
        </p>
        <p
          className="font-['Inter'] font-semibold text-[#374151] mt-2"
          style={{ fontSize: '14px' }}
        >
          825-982-3256 / 825-522-3256
        </p>
      </div>

      {/* Website */}
      <p
        className="font-['Inter'] text-[#6B7280]"
        style={{ fontSize: '14px' }}
      >
        www.familyforever.ca
      </p>
    </div>
  );
}

// ─── Main Full-Screen Card View ──────────────────────────────────────
export function StaffIdCard() {
  const navigate = useSafeNavigate();
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <div className="w-full h-screen max-w-[390px] mx-auto flex flex-col overflow-hidden"
      style={{ backgroundColor: 'rgba(26,26,26,0.95)' }}
    >
      {/* Top bar */}
      <header className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5"
        >
          <ArrowLeft className="w-5 h-5 text-white" strokeWidth={2} />
          <span
            className="font-['Inter'] font-medium text-white"
            style={{ fontSize: '14px' }}
          >
            Close
          </span>
        </button>

        <span
          className="font-['Poppins'] font-semibold text-white"
          style={{ fontSize: '16px' }}
        >
          Staff ID Card
        </span>

        <button
          onClick={() => toast('Share feature coming soon')}
          className="w-10 h-10 flex items-center justify-center"
        >
          <Share2 className="w-5 h-5 text-white" strokeWidth={2} />
        </button>
      </header>

      {/* Brightness indicator */}
      <div className="flex items-center justify-center gap-1.5 mb-4 flex-shrink-0">
        <Sun className="w-3.5 h-3.5 text-white/60" strokeWidth={2} />
        <span
          className="font-['Inter'] text-white/60"
          style={{ fontSize: '10px' }}
        >
          Auto-brightness on
        </span>
      </div>

      {/* Card area */}
      <div className="flex-1 flex flex-col items-center justify-center px-5">
        {/* 3D flip container */}
        <div
          className="relative w-full"
          style={{
            maxWidth: '350px',
            height: '520px',
            perspective: '1200px',
          }}
        >
          <motion.div
            className="w-full h-full relative"
            style={{
              transformStyle: 'preserve-3d',
            }}
            animate={{ rotateY: isFlipped ? 180 : 0 }}
            transition={{ duration: 0.4, ease: 'easeInOut' }}
          >
            {/* Front face */}
            <div
              className="absolute inset-0"
              style={{
                backfaceVisibility: 'hidden',
                boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                borderRadius: '20px',
              }}
            >
              <CardFront />
            </div>

            {/* Back face */}
            <div
              className="absolute inset-0"
              style={{
                backfaceVisibility: 'hidden',
                transform: 'rotateY(180deg)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                borderRadius: '20px',
              }}
            >
              <CardBack />
            </div>
          </motion.div>
        </div>

        {/* Flip button */}
        <button
          onClick={() => setIsFlipped(!isFlipped)}
          className="flex items-center gap-2 mt-6 transition-colors active:opacity-80"
          style={{
            backgroundColor: 'rgba(255,255,255,0.15)',
            border: '1px solid rgba(255,255,255,0.25)',
            borderRadius: '24px',
            padding: '10px 24px',
          }}
        >
          <RotateCcw className="w-4 h-4 text-white" strokeWidth={2} />
          <span
            className="font-['Inter'] font-medium text-white"
            style={{ fontSize: '13px' }}
          >
            {isFlipped ? 'Tap to see front' : 'Tap to flip card'}
          </span>
        </button>

        {/* Side indicator dots */}
        <div className="flex items-center gap-2 mt-3">
          <div
            className="w-2 h-2 rounded-full transition-colors"
            style={{
              backgroundColor: !isFlipped ? 'white' : 'rgba(255,255,255,0.3)',
            }}
          />
          <div
            className="w-2 h-2 rounded-full transition-colors"
            style={{
              backgroundColor: isFlipped ? 'white' : 'rgba(255,255,255,0.3)',
            }}
          />
        </div>
      </div>
    </div>
  );
}