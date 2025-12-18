import React from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import TopBar from "./TopBar";
import SideBar from "./SideBar";
import Dashboard from "./Dashboard";
import Transportation from "./Transportation";
import ManageUser from "./ManageUser";
import AddingPage from "./AddingPage";
import ManageAgency from "./ManageAgency";
import ManageClients from "./ManageClients";
import ShiftReport from "./ShiftReport";
import CriticalIncidentForm from "./CriticalIncidentForm";

// Form Components
import AddUserForm from "./AddUserForm";
import AddUserShift from "./AddUserShift";
import AddAgency from "./AddAgency";
import AddClient from "./AddClient";
import IntakeForm from "./IntakeForm";
import ManageIntakeWorkers from "./ManageIntakeWorkers";
import ManageIntakeForms from "./ManageIntakeForms";
import AddIntakeWorkerForm from "./AddIntakeWorker";
import AddIntakeWorker from "./AddIntakeWorker";

const AdminHomePage = ({ user ,setUser}) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/");
    setUser(null);  // notify App to reset user state

  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* ✅ TopBar */}
      <TopBar user={user} onLogout={handleLogout} />

      <div className="flex h-full">
        {/* ✅ Sidebar */}
        <SideBar />

        {/* ✅ Main Content Area */}
        <div className="w-full overflow-hidden p-4">
          <Routes>
            {/* Dashboard and Core Pages */}
            <Route path="dashboard" element={<Dashboard user={user} />} />
            <Route path="transportation" element={<Transportation />} />
            <Route path="clients" element={<ManageClients />} />
            <Route path="users" element={<ManageUser />} />
            <Route path="agency" element={<ManageAgency />} />
             <Route path="intake-workers" element={<ManageIntakeWorkers/>} />
             <Route path="intake-forms" element={<ManageIntakeForms/>} />
            <Route path="shift-report/:id" element={<ShiftReport user={user}/>} />
            <Route path="critical-incident" element={<CriticalIncidentForm />} />

            {/* ✅ Adding Page (Route-based Forms) */}
            <Route path="add" element={<AddingPage  user={user}/>}>
              <Route path="add-user" element={<AddUserForm mode="add" user={user}/>} />
              <Route path="update-user/:id" element={<AddUserForm mode="update" user={user}/>} />
              <Route path="add-user-shift" element={<AddUserShift mode="add" user={user}/>} />
              <Route path="update-user-shift/:id" element={<AddUserShift mode="update" user={user}/>} />
              <Route path="add-agency" element={<AddAgency mode="add" user={user}/>} />
              <Route path="update-agency/:id" element={<AddAgency mode="update" user={user}/>} />
              <Route path="add-client" element={<AddClient mode="add" user={user}/>} />
              <Route path="update-client/:id" element={<AddClient mode="update" user={user}/>} />
              <Route path="add-intake-form" element={<IntakeForm mode="add" user={user}/>} />
              <Route path="update-intake-form/:id" element={<IntakeForm mode="update" user={user}/>} />
               <Route path="add-intakeworker" element={<AddIntakeWorker mode="add" user={user}/>} />
              <Route path="update-intakeworker/:id" element={<AddIntakeWorker mode="update" user={user}/>} />

            </Route>

            


            {/* ✅ Default fallback to dashboard */}
            <Route path="*" element={<Dashboard user={user} />} />
          </Routes>
        </div>
      </div>
    </div>
  );
};

export default AdminHomePage;
