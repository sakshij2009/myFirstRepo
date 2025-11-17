import React, { useState } from "react";
import { AiOutlineUserAdd, AiOutlineUsergroupAdd } from "react-icons/ai";
import { HiOutlineBuildingOffice } from "react-icons/hi2";
import { MdAssignmentAdd } from "react-icons/md";
import { FaUserFriends } from "react-icons/fa";
import { useNavigate, Outlet, useLocation } from "react-router-dom";
import IntakeFormChoiceModel from "./IntakeFormChoiceModel";

const AddingPage = () => {
  const [showModel, setShowModel] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // ✅ Sidebar items with correct paths (match AdminHomePage nested routes)
  const sidebarItems = [
    { label: "Add User", path: "/admin-dashboard/add/add-user", icon: <AiOutlineUserAdd className="text-xl" /> },
    { label: "Add Shift", path: "/admin-dashboard/add/add-user-shift", icon: <AiOutlineUsergroupAdd className="text-xl" /> },
    { label: "Add Intake Form", path: null, icon: <MdAssignmentAdd className="text-xl" /> }, // opens modal
    { label: "Add Agency", path: "/admin-dashboard/add/add-agency", icon: <HiOutlineBuildingOffice className="text-xl" /> },
    { label: "Add Client", path: "/admin-dashboard/add/add-client", icon: <FaUserFriends className="text-xl" /> },
  ];

  // ✅ Helper function to check if current route is active
  const isActive = (path) => location.pathname === path;

  return (
    <div className="flex flex-col gap-6  h-full">
      <div className="flex gap-6 h-auto">
        {/* ✅ Sidebar */}
        <div className="flex flex-col bg-white w-1/6 p-4 gap-3 rounded-md">
          {sidebarItems.map((item, index) => (
            <div
              key={index}
              className={`flex p-3 rounded-md border gap-3 items-center cursor-pointer transition-all duration-200 ${
                item.path && isActive(item.path)
                  ? "bg-dark-green border-green text-[#F5FAFA]"
                  : "border-light-green text-light-black bg-transparent hover:bg-[#f4f4f4]"
              }`}
              onClick={() => {
                if (item.path) {
                  navigate(item.path);
                } else if (item.label === "Add Intake Form") {
                  setShowModel(true);
                }
              }}
            >
              {item.icon}
              <p className="font-bold text-base leading-6">{item.label}</p>
            </div>
          ))}
        </div>

        {/* ✅ Intake Form Selection Modal */}
        {showModel && (
          <IntakeFormChoiceModel
            setShowModal={setShowModel}
            handleOpenForm={(formTypePath) => {
              setShowModel(false);
              navigate(`/admin-dashboard/add/${formTypePath}`);
            }}
          />
        )}

        {/* ✅ Right content: dynamic form outlet */}
        <div className="flex flex-col gap-4 p-4 rounded-md  w-5/6">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default AddingPage;
