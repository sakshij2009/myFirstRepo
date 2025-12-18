import React from "react";

const UserCardFront = ({ user }) => {
  return (
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
          <div className="w-[120px] h-[120px] rounded-full border-4 border-white overflow-hidden shadow-md">
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
          From Humanity to Community
        </p>
      </div>
    </div>
  );
};

export default UserCardFront;
