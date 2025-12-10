import React from "react";
import { NavLink } from "react-router-dom";

const SideBar = () => {
  const sidebarItems = [
     { label: "Dashboard", path: "/admin-dashboard/dashboard", icon: "/images/dashboard.png" },
    { label: "Manage Agency", path: "/admin-dashboard/agency", icon: "/images/agency.png" },
    { label: "Manage Client", path: "/admin-dashboard/clients", icon: "/images/client.png" },
    { label: "Manage User", path: "/admin-dashboard/users", icon: "/images/client.png" },
    { label: "Manage IntakeWorkers", path: "/admin-dashboard/intake-workers", icon: "/images/client.png" },
     { label: "Manage IntakeForms", path: "/admin-dashboard/intake-forms", icon: "/images/client.png" },
    { label: "Billing", path: "/admin-dashboard/billing", icon: "/images/billing.png" },
    // { label: "Bootcamp", path: "/admin-dashboard/bootcamp", icon: "/images/bootcamp.png" },
  ];

  return (
    <aside className="flex flex-col bg-dark-green gap-[14px] px-[20px] py-[20px] w-auto group min-h-screen">
      {sidebarItems.map((item, index) => (
        <NavLink
          key={index}
          to={item.path}
          end
          className={({ isActive }) =>
            `flex rounded-[4px] h-[44px]   items-center p-[19px] cursor-pointer text-nowrap gap-[12px] 
            ${isActive ? "bg-green text-white font-bold" : "text-gray-200 hover:bg-green/70 hover:text-white"}`
          }
        >
          <img src={item.icon} alt="" className="w-5 h-5" />
          <span className="hidden group-hover:block group-hover:w-[170px] text-[16px] leading-[24px]">
            {item.label}
          </span>
        </NavLink>
      ))}
    </aside>
  );
};

export default SideBar;
