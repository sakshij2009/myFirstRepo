import React, { useState } from "react";

const UserCardFront = ({ user }) => {
  const [isZoomed, setIsZoomed] = useState(false);

  return (
    <>
      <div className="w-[340px] h-[500px] bg-white rounded-lg overflow-hidden shadow-lg border border-gray-200 flex flex-col items-center font-sans">
        {/* ====== GREEN HEADER ====== */}
        <div className="w-full bg-[#134E3A] flex flex-col items-center justify-start pt-5 pb-[120px] relative">
          {/* Logo + Company */}
          <div className="flex flex-col items-center text-white">
            <div className="flex items-center gap-2 mb-1">
              <img
                src="/images/Logo2.png"
                alt="Family Forever Logo"
                className="w-6 h-6 object-contain"
              />
              <h2 className="text-lg font-bold">Family Forever Inc.</h2>
            </div>
            <p className="text-sm font-medium">Employee ID {user.userId || "—"}</p>
          </div>

          {/* Semicircle */}
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-[180px] h-[180px] z-0"></div>

          {/* Profile Image */}
          <div className="absolute bottom-[-55px] left-1/2 transform -translate-x-1/2 z-10">
            <div 
              className="w-[120px] h-[120px] rounded-full border-4 border-white overflow-hidden shadow-md cursor-pointer transition-transform hover:scale-105 active:scale-95 z-50"
              onClick={(e) => {
                e.stopPropagation();
                setIsZoomed(true);
              }}
              title="Click to zoom"
            >
              <img
                src={user.profilePhotoUrl || "/images/profile.jpeg"}
                alt={user.name || "Profile"}
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>

        {/* ====== WHITE CONTENT AREA ====== */}
        <div className="flex flex-col items-center text-center text-[#111827] px-4 mt-[80px] flex-grow">
          <h3 className="text-lg font-semibold leading-tight">
            {user.name || "Employee Name"}
          </h3>
          <p className="text-sm text-gray-700 mb-3">
            {user.role || "Child and Youth Care Worker"}
          </p>

          {/* Contact Info */}
          {user.email && (
            <p className="text-sm text-gray-700 mb-[2px]">{user.email}</p>
          )}
          {user.phone && (
            <p className="text-sm text-gray-700 mb-5">{user.phone}</p>
          )}
        </div>

        {/* ====== FOOTER TAGLINE ====== */}
        <div className="w-full border-t border-gray-200 py-3 text-center">
          <p className="text-xs font-semibold text-[#111827]">
            From Humanity To Community.
          </p>
        </div>
      </div>

      {/* Image Zoom Modal/Overlay */}
      {isZoomed && (
        <div 
          className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setIsZoomed(false)}
        >
          <div className="relative max-w-[90vw] max-h-[90vh]">
            <img 
              src={user.profilePhotoUrl || "/images/profile.jpeg"} 
              alt={user.name || "Zoomed Profile"} 
              className="rounded-xl shadow-2xl max-w-full max-h-[80vh] border-2 border-white/20"
              onClick={(e) => e.stopPropagation()}
            />
            <button 
              className="absolute -top-12 right-0 text-white text-lg font-bold flex items-center gap-2 hover:text-gray-300 transition-colors"
              onClick={() => setIsZoomed(false)}
            >
              <span>Close</span>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default UserCardFront;
