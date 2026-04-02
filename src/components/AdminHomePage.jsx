import React, { useState } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import { Toaster } from "sonner";
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
import ManageIntakeWorkers from "./ManageIntakeWorkers";
import ManageIntakeForms from "./ManageIntakeForms";
import Payroll from "./Payroll";
import IntakeRequestsPage from "./IntakeRequestsPage";
import StaffEvaluationPage from "./StaffEvaluationPage";
import BillingPage from "./BillingPage";
import GSTReportingPage from "./GSTReportingPage";
import ShiftCommandPage from "./ShiftCommandPage";

// Form Components
import AddUserForm from "./AddUserForm";
import AddUserShift from "./AddUserShift";
import AddAgency from "./AddAgency";
import AddClient from "./AddClient";
import IntakeForm from "./IntakeForm";
import AddIntakeWorker from "./AddIntakeWorker";

// Add New modal — quick-access shortcuts
import AddNewModal from "./AddNewModal";

const UnderConstruction = ({ title }) => (
  <div className="flex-1 flex items-center justify-center">
    <div className="text-center">
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
        style={{ backgroundColor: "#f0fdf4" }}
      >
        <span style={{ fontSize: 28 }}>🚧</span>
      </div>
      <h2
        className="font-bold mb-1"
        style={{ fontSize: 20, color: "#111827", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
      >
        {title}
      </h2>
      <p style={{ color: "#6b7280", fontSize: 14 }}>This page is coming soon.</p>
    </div>
  </div>
);

const AdminHomePage = ({ user, setUser }) => {
  const navigate = useNavigate();
  const [sidebarWidth, setSidebarWidth] = useState(242);
  const [addNewOpen, setAddNewOpen] = useState(false);
  const [filter, setFilter] = useState("Weekly");
  const [dateRange, setDateRange] = useState({ from: "", to: "" });

  const handleLogout = () => {
    localStorage.removeItem("user");
    setUser(null);
    navigate("/");
  };

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      {/* Sidebar */}
      <SideBar
        user={user}
        onLogout={handleLogout}
        onWidthChange={setSidebarWidth}
      />

      {/* Main content */}
      <div
        className="flex flex-col flex-1 overflow-hidden transition-all duration-300 ease-out"
        style={{ backgroundColor: "#f0f2f5" }}
      >
        {/* Header */}
        <TopBar
          user={user}
          onLogout={handleLogout}
          onAddNewClick={() => setAddNewOpen(true)}
          filter={filter}
          setFilter={(f) => { setFilter(f); if (f !== "Custom") setDateRange({ from: "", to: "" }); }}
          dateRange={dateRange}
          setDateRange={setDateRange}
        />

        {/* Page area */}
        <main className="flex-1 overflow-auto" style={{ padding: "20px 24px" }}>
          <Routes>
            <Route path="dashboard"        element={<Dashboard user={user} filter={filter} dateRange={dateRange} />} />
            <Route path="shifts"           element={<ShiftCommandPage />} />
            <Route path="transportation"   element={<Transportation />} />
            <Route path="clients"          element={<ManageClients />} />
            <Route path="users"            element={<ManageUser />} />
            <Route path="agency"           element={<ManageAgency />} />
            <Route path="intake-workers"   element={<ManageIntakeWorkers />} />
            <Route path="intake-forms"     element={<ManageIntakeForms />} />
            <Route path="payroll"          element={<Payroll />} />
            <Route path="shift-report/:id" element={<ShiftReport user={user} />} />
            <Route path="critical-incident" element={<CriticalIncidentForm />} />

            {/* Built pages */}
            <Route path="intake-requests"  element={<IntakeRequestsPage />} />
            <Route path="staff-evaluation" element={<StaffEvaluationPage />} />
            <Route path="billing"          element={<BillingPage />} />
            <Route path="gst-reporting"    element={<GSTReportingPage />} />

            {/* Under construction pages */}
            <Route path="services"         element={<UnderConstruction title="Services" />} />
            <Route path="reports"          element={<UnderConstruction title="Reports & Analytics" />} />
            <Route path="settings"         element={<UnderConstruction title="Settings" />} />

            {/* Add/Edit forms */}
            <Route path="add" element={<AddingPage user={user} />}>
              <Route path="add-user"              element={<AddUserForm mode="add" user={user} />} />
              <Route path="update-user/:id"       element={<AddUserForm mode="update" user={user} />} />
              <Route path="add-user-shift"        element={<AddUserShift mode="add" user={user} />} />
              <Route path="update-user-shift/:id" element={<AddUserShift mode="update" user={user} />} />
              <Route path="add-agency"            element={<AddAgency mode="add" user={user} />} />
              <Route path="update-agency/:id"     element={<AddAgency mode="update" user={user} />} />
              <Route path="add-client"            element={<AddClient mode="add" user={user} />} />
              <Route path="update-client/:id"     element={<AddClient mode="update" user={user} />} />
              <Route path="add-intake-form"       element={<IntakeForm mode="add" user={user} />} />
              <Route path="update-intake-form/:id" element={<IntakeForm mode="update" user={user} />} />
              <Route path="add-intakeworker"      element={<AddIntakeWorker mode="add" user={user} />} />
              <Route path="update-intakeworker/:id" element={<AddIntakeWorker mode="update" user={user} />} />
            </Route>

            {/* View intake form (read-only) */}
            <Route path="view-intake-form/:id" element={<IntakeForm mode="view" user={user} isEditable={true} />} />

            <Route path="*" element={<Dashboard user={user} />} />
          </Routes>
        </main>
      </div>

      {/* Add New Modal */}
      {addNewOpen && (
        <AddNewModal onClose={() => setAddNewOpen(false)} onNavigate={(path) => { setAddNewOpen(false); navigate(path); }} />
      )}

      <Toaster position="top-right" richColors closeButton />
    </div>
  );
};

export default AdminHomePage;
