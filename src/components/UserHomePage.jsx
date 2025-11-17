import React from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import TopBar from "./TopBar";
import SideBar from "./SideBar";
import UserDashboard from "./UserDashboard";
import ShiftReport from "./ShiftReport";
import IntakeForm from "./IntakeForm";
import AddingPage from "./AddingPage";

const UserHomePage = ({ user }) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/login");
  };

  return (
    <div className="flex flex-col min-h-screen">
      <TopBar user={user} onLogout={handleLogout} />
      <div className="flex h-full">
       
        <div className="w-full overflow-hidden p-4">
          <Routes>
            {/* ✅ User Dashboard */}
            <Route path="/" element={<UserDashboard user={user} />} />
            <Route path="shift-report/:id" element={<ShiftReport />} />

            <Route path="add" element={<AddingPage />}>
             <Route path="intake-form/:id" element={<IntakeForm mode="update" />} /> 
            </Route>
           

            {/* Add more user-specific routes here */}
          </Routes>
        </div>
      </div>
    </div>
  );
};

export default UserHomePage;
