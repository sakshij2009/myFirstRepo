import React, { useEffect, useState } from "react";
import { Routes, Route, useNavigate, Navigate } from "react-router-dom";
import { auth } from "../firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase";

import IntakeLogin from "./IntakeLogin";
import IntakeWorkerDashboard from "./IntakeWorkerDashboard";
import IntakeFormPage from "./IntakeFormPage";
import PrivateFamilyIntakeForm from "./PrivateFamilyIntakeForm";

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
            (getUser().role || "").toLowerCase() === "parent" ? (
              <Navigate to="/intake-form/private-form" replace />
            ) : (
              <Navigate to="/intake-form/dashboard" replace />
            )
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

      {/* PRIVATE FAMILY INTAKE FORM (Protected — role=parent) */}
      <Route
        path="private-form"
        element={
          getUser() ? (
            <PrivateFamilyIntakeForm
              user={getUser()}
              onSubmitSuccess={() => navigate("/intake-form/submitted")}
            />
          ) : (
            <Navigate to="/intake-form/login" replace />
          )
        }
      />

      {/* SUBMISSION SUCCESS PAGE */}
      <Route
        path="submitted"
        element={
          <div
            style={{
              minHeight: "100vh",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              background: "#F9FAFB",
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              padding: "40px 20px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: 72, height: 72, borderRadius: "50%",
                background: "#D1FAE5",
                display: "flex", alignItems: "center", justifyContent: "center",
                marginBottom: 24,
              }}
            >
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#1B5E37" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h1 style={{ fontSize: 28, fontWeight: 700, color: "#111827", marginBottom: 12 }}>
              Form Submitted!
            </h1>
            <p style={{ fontSize: 15, color: "#6B7280", maxWidth: 400, lineHeight: 1.6 }}>
              Thank you for completing your intake form. Our team will review your information and reach out to you shortly.
            </p>
          </div>
        }
      />

      {/* DEFAULT: Redirect unknown paths to login */}
      <Route path="*" element={<Navigate to="/intake-form/login" replace />} />
    </Routes>
  );
};

export default IntakeFormMainPage;
