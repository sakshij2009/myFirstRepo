import React, { useEffect, useState } from "react";
import { Routes, Route, useNavigate, Navigate } from "react-router-dom";
import { auth } from "../firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase";

import IntakeLogin from "./IntakeLogin";
import IntakeWorkerDashboard from "./IntakeWorkerDashboard";
import IntakeFormPage from "./IntakeFormPage";

const IntakeFormMainPage = () => {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // ── Load user from localStorage synchronously on mount ──────────────────
  useEffect(() => {
    const stored = localStorage.getItem("intakeUser");
    if (stored) {
      try {
        const data = JSON.parse(stored);
        setUserData(data);
      } catch {
        localStorage.removeItem("intakeUser");
      }
    }
    setLoading(false);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("intakeUser");
    setUserData(null);
    navigate("/intake-form/login");
  };

  if (loading) return <p>Loading...</p>;

  // Helper: read user directly from localStorage (avoids stale closure state)
  const getUser = () => {
    const stored = localStorage.getItem("intakeUser");
    return stored ? JSON.parse(stored) : null;
  };

  return (
    <Routes>
      {/* LOGIN PAGE */}
      <Route
        path="login"
        element={
          getUser() ? (
            <Navigate to="/intake-form/dashboard" replace />
          ) : (
            <IntakeLogin />
          )
        }
      />

      {/* DASHBOARD PAGE (Protected) */}
      <Route
        path="dashboard"
        element={
          getUser() ? (
            <IntakeWorkerDashboard user={getUser()} onLogout={handleLogout} />
          ) : (
            <Navigate to="/intake-form/login" replace />
          )
        }
      />

      {/* ADD INTAKE PAGE (Protected) */}
      <Route
        path="add"
        element={
          getUser() ? (
            <IntakeFormPage user={getUser()} onBack={() => navigate("/intake-form/dashboard")} />
          ) : (
            <Navigate to="/intake-form/login" replace />
          )
        }
      />

      {/* UPDATE / VIEW INTAKE PAGE (Protected) */}
      <Route
        path="update-intake-form/:id"
        element={
          getUser() ? (
            <IntakeFormPage user={getUser()} onBack={() => navigate("/intake-form/dashboard")} />
          ) : (
            <Navigate to="/intake-form/login" replace />
          )
        }
      />

      <Route
        path="edit/:id"
        element={
          getUser() ? (
            <IntakeFormPage user={getUser()} onBack={() => navigate("/intake-form/dashboard")} />
          ) : (
            <Navigate to="/intake-form/login" replace />
          )
        }
      />

      {/* VIEW INTAKE PAGE - READ ONLY (Protected) */}
      <Route
        path="view/:id"
        element={
          getUser() ? (
            <IntakeFormPage user={getUser()} isViewOnly={true} onBack={() => navigate("/intake-form/dashboard")} />
          ) : (
            <Navigate to="/intake-form/login" replace />
          )
        }
      />

      {/* DEFAULT: Redirect unknown paths to login */}
      <Route path="*" element={<Navigate to="/intake-form/login" replace />} />
    </Routes>
  );
};

export default IntakeFormMainPage;
