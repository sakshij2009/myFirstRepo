import React from "react";

const UserCardFront = ({ user }) => {
  const photo = user.profilePhotoUrl || user.avatar || "/images/profile.jpeg";

  return (
    <div
      className="bg-white rounded-2xl shadow-xl border border-gray-200 font-sans flex flex-col"
      style={{ width: 340, height: 500, overflow: "hidden" }}
    >
      {/* ── GREEN HEADER ── takes up ~55% of card */}
      <div
        className="relative flex-shrink-0 bg-[#134E3A] flex flex-col items-center"
        style={{ height: 330 }}
      >
        {/* Logo + Company Name */}
        <div className="flex items-center gap-2 mt-5 text-white z-10">
          <div className="w-9 h-9 rounded-full border-2 border-white/50 flex items-center justify-center overflow-hidden bg-white/10 p-0.5">
            <img
              src="/public/images/logo.png"
              alt="Logo"
              className="w-full h-full object-contain"
            />
          </div>
          <h2 className="text-xl font-bold tracking-wide">Family Forever Inc.</h2>
        </div>

        {/* Employee ID */}
        <p className="text-white text-sm font-medium mt-2 z-10">
          Employee ID {user.userId || "—"}
        </p>

        {/*
          WHITE ARCH — uses an SVG ellipse for a true smooth curve.
          Positioned at the bottom of the green block.
        */}
        <div className="absolute bottom-0 left-0 right-0 z-0" style={{ height: 160 }}>
          <svg
            viewBox="0 0 340 160"
            preserveAspectRatio="none"
            className="w-full h-full"
          >
            <ellipse cx="170" cy="160" rx="200" ry="160" fill="white" />
          </svg>
        </div>

        {/* Profile photo — centered on the curve */}
        <div
          className="absolute left-1/2 z-20"
          style={{ transform: "translateX(-50%)", bottom: 100 }}
        >
          <div
            className="rounded-full border-4 border-white overflow-hidden shadow-lg bg-gray-100"
            style={{ width: 120, height: 120 }}
          >
            <img
              src={photo}
              alt={user.name || "Profile"}
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </div>

      {/* ── WHITE CONTENT ── */}
      <div
        className="flex flex-col items-center text-center text-[#111827] px-6 flex-1 relative z-10"
        style={{ marginTop: -35 }}
      >
        <h3 className="text-[18px] font-bold leading-tight mb-1">
          {user.name || "Employee Name"}
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          {user.role || "Child and Youth Care Worker"}
        </p>

        {user.email && (
          <p className="text-sm text-gray-700 leading-relaxed">{user.email}</p>
        )}
        {user.phone && (
          <p className="text-sm text-gray-700 mt-1">{user.phone}</p>
        )}
      </div>

      {/* ── FOOTER TAGLINE ── */}
      <div className="border-t border-gray-200 py-3 text-center flex-shrink-0">
        <p className="text-xs font-bold text-[#111827] tracking-widest uppercase">
          From Humanity to Community
        </p>
      </div>
    </div>
  );
};

export default UserCardFront;
