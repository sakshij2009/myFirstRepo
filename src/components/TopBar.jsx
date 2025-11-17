import React, { useState, useEffect, useRef } from "react";
import { CiSettings } from "react-icons/ci";
import { FaRegAddressCard } from "react-icons/fa";
import { MdLogout } from "react-icons/md";
import { useNavigate } from "react-router-dom";
import UserCard from "./UserCard";

const TopBar = ({ user ,onLogout}) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  // ✅ Handle logout and redirect
   const handleLogout = () => {
    if (onLogout) {
      onLogout(); // use parent prop if provided
    } else {
      // fallback internal logout
      localStorage.removeItem("user");
      navigate("/"); // go to login page
    }
  };

  // ✅ Toggle profile dropdown
  const toggleDropdown = () => setShowDropdown((prev) => !prev);

  // ✅ Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ✅ Utility to format names properly
  const toTitleCase = (str = "") =>
    str
      .toLowerCase()
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");

  return (
    <div className="flex flex-col md:flex-row justify-between bg-dark-green py-2 px-4 md:px-8 shadow-[0_6px_12px_rgba(0,0,0,0.4)] relative z-10">
      {/* Left: Logo + Title */}
      <div className="flex items-center gap-2 md:gap-5">
        <img
          src="/images/logo.png"
          alt="Logo"
          className="w-12 h-12 md:w-16 md:h-16"
        />
        <h1 className="text-white font-bold leading-7 md:leading-9 text-lg md:text-2xl">
          Family Forever
        </h1>
      </div>

      {/* Right: User Info & Dropdown */}
      <div className="flex gap-2 md:gap-4 mt-2 md:mt-0 items-center">
        <div className="flex flex-col items-end justify-center">
          <p className="text-white text-sm md:text-base font-bold">
            {user?.name ? toTitleCase(user.name) : "Guest"}
          </p>
          <p className="text-white text-xs md:text-sm">
            {user?.role ? toTitleCase(user.role) : "User"}
          </p>
        </div>

        {/* Profile Picture */}
        <div
          className="w-10 h-10 md:w-14 md:h-14 rounded-full bg-white overflow-hidden flex items-center justify-center cursor-pointer"
          onClick={toggleDropdown}
        >
          {user?.profilePhotoUrl ? (
            <img
              src={user.profilePhotoUrl}
              alt={user.name || "User"}
              className={`block w-full h-full object-center ${
                user?.role === "admin" ? "object-contain" : "object-cover"
              }`}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-dark-green font-bold text-lg md:text-xl">
              {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
            </div>
          )}
        </div>

        {/* Dropdown Menu */}
        {showDropdown && (
          <div
            ref={dropdownRef}
            className="bg-white rounded flex flex-col text-light-black absolute right-3 top-20 shadow-2xl z-50 w-44"
          >
            {user?.role === "user" && (
              <div
                className="flex gap-2 py-2 px-3 items-center text-sm hover:bg-gray-100 hover:text-dark-green cursor-pointer"
                onClick={() => setIsModalOpen(true)}
              >
                <FaRegAddressCard className="text-[18px]" />
                <p>View My Card</p>
              </div>
            )}

            <div className="flex gap-2 py-2 px-3 items-center text-sm hover:bg-gray-100 hover:text-dark-green cursor-pointer">
              <CiSettings className="text-[18px]" />
              <p>Settings</p>
            </div>

            <div
              className="flex gap-2 py-2 px-3 items-center text-sm hover:bg-gray-100 hover:text-dark-green cursor-pointer"
              onClick={handleLogout}
            >
              <MdLogout className="text-[18px]" />
              <p>Log Out</p>
            </div>
          </div>
        )}

        {/* User Card Modal */}
        {isModalOpen && (
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={() => setIsModalOpen(false)}
          >
            <div
              className="relative rounded-xl shadow-lg w-[374px] h-[270px]"
              onClick={(e) => e.stopPropagation()}
            >
              <UserCard user={user} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TopBar;
