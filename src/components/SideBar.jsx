import { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutGrid, Users, UserPlus, Calendar, CheckCircle, Car, FileText, Building,
  BarChart3, Settings, ChevronLeft, ChevronRight, Inbox, UserCheck, ClipboardCheck,
  Receipt, Wallet, Landmark, LogOut,
} from "lucide-react";
import { collection, getCountFromServer } from "firebase/firestore";
import { db } from "../firebase";

const SideBar = ({ user, onLogout, onWidthChange }) => {
  const [collapsed, setCollapsed] = useState(true); // Default to collapsed
  const [badges, setBadges] = useState({ clients: null, shifts: null, intakeRequests: null, intakeWorkers: null });
  const navigate = useNavigate();

  const handleMouseEnter = () => {
    setCollapsed(false);
    if (onWidthChange) onWidthChange(242);
  };

  const handleMouseLeave = () => {
    setCollapsed(true);
    if (onWidthChange) onWidthChange(64);
  };

  const initials = user?.name
    ? user.name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
    : "AD";

  const displayName = user?.name
    ? user.name.replace(/\b\w/g, (c) => c.toUpperCase())
    : "Admin";

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const [clients, shifts, intakeWorkers] = await Promise.all([
          getCountFromServer(collection(db, "clients")),
          getCountFromServer(collection(db, "shifts")),
          getCountFromServer(collection(db, "intakeUsers")),
        ]);
        setBadges({
          clients: clients.data().count || null,
          shifts: shifts.data().count || null,
          intakeWorkers: intakeWorkers.data().count || null,
        });
      } catch (e) { /* silently ignore */ }
    };
    fetchCounts();
  }, []);

  const NAV_GROUPS = [
    {
      group: "Main",
      items: [
        { label: "Dashboard",  path: "/admin-dashboard/dashboard",      icon: <LayoutGrid size={16} strokeWidth={1.7} /> },
        { label: "Clients",    path: "/admin-dashboard/clients",         icon: <Users size={16} strokeWidth={1.7} />,      badge: badges.clients },
        { label: "Staff",      path: "/admin-dashboard/users",           icon: <UserPlus size={16} strokeWidth={1.7} /> },
        { label: "Shifts",     path: "/admin-dashboard/shifts",          icon: <Calendar size={16} strokeWidth={1.7} />,   badge: badges.shifts },
      ],
    },
    {
      group: "Services",
      items: [
        { label: "Services",        path: "/admin-dashboard/services",        icon: <CheckCircle size={16} strokeWidth={1.7} /> },
        { label: "Transportations", path: "/admin-dashboard/transportation",  icon: <Car size={16} strokeWidth={1.7} /> },
        { label: "Intake Requests", path: "/admin-dashboard/intake-requests", icon: <Inbox size={16} strokeWidth={1.7} /> },
        { label: "Intake Forms",    path: "/admin-dashboard/intake-forms",    icon: <FileText size={16} strokeWidth={1.7} /> },
        { label: "Intake Workers",  path: "/admin-dashboard/intake-workers",  icon: <UserCheck size={16} strokeWidth={1.7} />, badge: badges.intakeWorkers },
      ],
    },
    {
      group: "Admin",
      items: [
        { label: "Agencies",         path: "/admin-dashboard/agency",           icon: <Building size={16} strokeWidth={1.7} /> },
        { label: "Staff Evaluation", path: "/admin-dashboard/staff-evaluation", icon: <ClipboardCheck size={16} strokeWidth={1.7} /> },
        { label: "Billing",          path: "/admin-dashboard/billing",          icon: <Receipt size={16} strokeWidth={1.7} /> },
        { label: "Payroll",          path: "/admin-dashboard/payroll",          icon: <Wallet size={16} strokeWidth={1.7} /> },
        { label: "GST Reporting",    path: "/admin-dashboard/gst-reporting",    icon: <Landmark size={16} strokeWidth={1.7} /> },
        { label: "Reports",          path: "/admin-dashboard/reports",          icon: <BarChart3 size={16} strokeWidth={1.7} /> },
        { label: "Settings",         path: "/admin-dashboard/settings",         icon: <Settings size={16} strokeWidth={1.7} /> },
      ],
    },
  ];

  return (
    <aside
      className="h-screen flex flex-col shrink-0 transition-all duration-300 ease-out overflow-hidden z-50 cursor-pointer"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{ width: collapsed ? 64 : 242, backgroundColor: "#145228", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      {/* Logo */}
      <div className="px-4 py-5 flex items-center gap-3 shrink-0">
        <img src="/images/logo.png" alt="Family Forever" className="shrink-0 w-9 h-9 object-contain rounded-lg" />
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <div className="text-white font-bold text-sm leading-tight">Family Forever</div>
            <div className="text-xs" style={{ color: "rgba(255,255,255,0.48)" }}>Care Management</div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-2 overflow-y-auto overflow-x-hidden sidebar-nav"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
        <style>{`.sidebar-nav::-webkit-scrollbar{display:none!important}`}</style>
        {NAV_GROUPS.map(({ group, items }, gi) => (
          <div key={group}>
            {!collapsed && gi > 0 && group !== "Admin" && (
              <div
                className="px-3 pt-4 pb-2 text-[10px] uppercase font-semibold tracking-wider"
                style={{ color: "rgba(255,255,255,0.35)" }}
              >
                {group}
              </div>
            )}
            {items.map((item) => (
              <NavLink
                key={item.label}
                to={item.path}
                end={item.label === "Dashboard"}
                className={({ isActive }) =>
                  `w-full flex items-center gap-3 px-3 py-2.5 mb-1 rounded-lg transition-all relative group ${
                    isActive ? "bg-white/[0.11] text-white" : "text-white/50 hover:text-white hover:bg-white/10"
                  }`
                }
                title={collapsed ? item.label : undefined}
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <div
                        className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r"
                        style={{ backgroundColor: "#5ccf80" }}
                      />
                    )}
                    <div className="shrink-0" style={{ opacity: isActive ? 1 : 0.6 }}>
                      {item.icon}
                    </div>
                    {!collapsed && (
                      <>
                        <span className="flex-1 text-left text-sm font-medium truncate">{item.label}</span>
                        {item.badge != null && item.badge > 0 && (
                          <span
                            className="shrink-0 text-[11px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center leading-none"
                            style={{ backgroundColor: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.9)" }}
                          >
                            {item.badge}
                          </span>
                        )}
                      </>
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* Bottom */}
      <div className="p-3 shrink-0 border-t" style={{ borderColor: "rgba(255,255,255,0.08)" }}>

        {/* Logout */}
        {!collapsed ? (
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-2 px-3 py-2 mb-2 rounded-lg transition-colors hover:bg-white/10"
            style={{ fontSize: "13px", fontWeight: 500, color: "rgba(255,255,255,0.65)" }}
          >
            <LogOut size={15} strokeWidth={1.8} />
            Log Out
          </button>
        ) : (
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center p-2 mb-2 rounded-lg transition-colors hover:bg-white/10"
            title="Log Out"
          >
            <LogOut size={15} strokeWidth={1.8} style={{ color: "rgba(255,255,255,0.52)" }} />
          </button>
        )}

        {/* User profile (only info, no toggle) */}
        {!collapsed && (
          <div className="flex items-center gap-3 p-2">
            <div className="w-9 h-9 rounded-full bg-emerald-400 flex items-center justify-center text-white font-semibold text-sm shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white text-sm font-semibold truncate">{displayName}</div>
              <div className="text-xs truncate" style={{ color: "rgba(255,255,255,0.48)" }}>
                {user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : "Admin"}
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};

export default SideBar;
