import { useState, useEffect, useRef } from "react";
import { Search, Bell, ChevronDown, Settings, LogOut, CreditCard } from "lucide-react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import NotificationSlider from "./NotificationSlider";
import UserCard from "./UserCard";
import { useLocation } from "react-router-dom";

const PAGE_TITLES = {
  "/admin-dashboard/dashboard":        "Business Dashboard",
  "/admin-dashboard/clients":          "Clients",
  "/admin-dashboard/users":            "Staff",
  "/admin-dashboard/agency":           "Agencies",
  "/admin-dashboard/intake-workers":   "Intake Workers",
  "/admin-dashboard/intake-forms":     "Intake Forms",
  "/admin-dashboard/intake-requests":  "Intake Requests",
  "/admin-dashboard/transportation":   "Transportations",
  "/admin-dashboard/billing":          "Billing",
  "/admin-dashboard/payroll":          "Payroll",
  "/admin-dashboard/gst-reporting":    "GST Reporting",
  "/admin-dashboard/reports":          "Reports & Analytics",
  "/admin-dashboard/settings":         "Settings",
  "/admin-dashboard/staff-evaluation": "Staff Evaluation",
  "/admin-dashboard/services":         "Services",
};

const TopBar = ({ user, onLogout, onAddNewClick }) => {
  const location = useLocation();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isCardOpen, setIsCardOpen] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const [filter, setFilter] = useState("Weekly");
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const dropdownRef = useRef(null);
  const filterRef = useRef(null);

  const userDocId = "familyforeverAdmin#1";

  const pageTitle = PAGE_TITLES[location.pathname] || "Business Dashboard";

  const initials = user?.name
    ? user.name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
    : "AD";

  const displayName = user?.name
    ? user.name.replace(/\b\w/g, (c) => c.toUpperCase())
    : "Admin";

  // Unread notifications listener
  useEffect(() => {
    const q = query(
      collection(db, "notifications", userDocId, "userNotifications"),
      where("read", "==", false)
    );
    const unsub = onSnapshot(q, (snap) => setHasUnread(snap.docs.length > 0));
    return () => unsub();
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
      if (filterRef.current && !filterRef.current.contains(e.target)) {
        setShowFilterMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <>
      <header
        className="h-[58px] border-b flex items-center justify-between px-6 bg-white sticky top-0 z-10 shrink-0"
        style={{
          borderColor: "#e5e7eb",
          fontFamily: "'Plus Jakarta Sans', sans-serif",
        }}
      >
        {/* Left: page title */}
        <h1
          className="font-bold tracking-tight"
          style={{ fontSize: "17px", fontWeight: 700, color: "#111827" }}
        >
          {pageTitle}
        </h1>

        {/* Right: actions */}
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={15}
              strokeWidth={2}
            />
            <input
              type="text"
              placeholder="Search…"
              className="pl-9 pr-4 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
              style={{ backgroundColor: "#f3f4f6", width: 210, border: "none" }}
            />
          </div>

          {/* Filter dropdown */}
          <div className="relative" ref={filterRef}>
            <button
              onClick={() => setShowFilterMenu((p) => !p)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition-all hover:border-gray-300"
              style={{ borderColor: "#e5e7eb", color: "#6b7280" }}
            >
              <span>{filter}</span>
              <ChevronDown size={13} strokeWidth={2.5} />
            </button>
            {showFilterMenu && (
              <div className="absolute right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-50 w-32">
                {["Weekly", "Monthly", "Yearly"].map((opt) => (
                  <button
                    key={opt}
                    onClick={() => { setFilter(opt); setShowFilterMenu(false); }}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors"
                    style={{ color: filter === opt ? "#1f7a3c" : "#374151", fontWeight: filter === opt ? 600 : 400 }}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Bell */}
          <button
            onClick={() => setShowNotifications(true)}
            className="relative p-2 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Bell size={18} strokeWidth={1.7} style={{ color: "#6b7280" }} />
            {hasUnread && (
              <span
                className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full"
                style={{ backgroundColor: "#ef4444" }}
              />
            )}
          </button>

          {/* User info + avatar */}
          <div
            ref={dropdownRef}
            className="relative flex items-center gap-2 pl-3 border-l cursor-pointer"
            style={{ borderColor: "#e5e7eb" }}
            onClick={() => setShowDropdown((p) => !p)}
          >
            <div className="text-right">
              <div className="text-sm font-semibold" style={{ color: "#111827" }}>
                {displayName}
              </div>
              <div className="text-xs" style={{ color: "#9ca3af" }}>
                {user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : "Admin"}
              </div>
            </div>
            {user?.profilePhotoUrl ? (
              <img
                src={user.profilePhotoUrl}
                alt={displayName}
                className="w-9 h-9 rounded-full object-cover"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-emerald-400 flex items-center justify-center text-white font-semibold text-sm">
                {initials}
              </div>
            )}

            {/* Dropdown */}
            {showDropdown && (
              <div className="absolute right-0 top-12 bg-white rounded-xl shadow-xl border border-gray-100 py-1.5 z-50 w-44">
                {user?.role === "user" && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setIsCardOpen(true); setShowDropdown(false); }}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <CreditCard size={15} strokeWidth={1.8} />
                    View My Card
                  </button>
                )}
                <button className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                  <Settings size={15} strokeWidth={1.8} />
                  Settings
                </button>
                <div className="my-1 border-t border-gray-100" />
                <button
                  onClick={(e) => { e.stopPropagation(); onLogout && onLogout(); }}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors"
                >
                  <LogOut size={15} strokeWidth={1.8} />
                  Log Out
                </button>
              </div>
            )}
          </div>

          {/* Add New */}
          <button
            onClick={onAddNewClick}
            className="px-4 py-2 rounded-lg text-white font-semibold text-sm transition-all hover:opacity-90 shrink-0"
            style={{
              backgroundColor: "#1f7a3c",
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              boxShadow: "0 1px 2px rgba(31,122,60,0.2)",
            }}
          >
            + Add New
          </button>
        </div>
      </header>

      {/* Notification drawer */}
      {showNotifications && (
        <div className="fixed top-0 right-0 h-full w-[400px] bg-white shadow-xl z-50">
          <NotificationSlider
            onClose={() => setShowNotifications(false)}
            userId={userDocId}
          />
        </div>
      )}

      {/* User card modal */}
      {isCardOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={() => setIsCardOpen(false)}
        >
          <div
            className="relative rounded-xl shadow-lg w-[374px] h-[270px]"
            onClick={(e) => e.stopPropagation()}
          >
            <UserCard user={user} />
          </div>
        </div>
      )}
    </>
  );
};

export default TopBar;
