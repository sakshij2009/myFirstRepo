import React, { useEffect, useState } from "react";
import { Routes, Route, useNavigate, Navigate } from "react-router-dom";
import { auth } from "../firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase";

import IntakeLogin from "./IntakeLogin";
import IntakeFormDashboard from "./IntakeFormDashboard";
import IntakeFormPage from "./IntakeFormPage";
import ShiftReport from "./ShiftReport";

const IntakeFormMainPage = () => {
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [userData, setUserData] = useState(null); // Firestore user data (name, role)
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // 🔥 Detect Firebase Auth Changes (Login / Logout)
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      setFirebaseUser(user);

      if (user) {
        // Fetch Firestore user info (name, role)
        try {
          const q = query(
            collection(db, "intakeUsers"),
            where("email", "==", user.email)
          );
          const snap = await getDocs(q);
          if (!snap.empty) {
            const data = snap.docs[0].data();
            setUserData(data);
            localStorage.setItem("user", JSON.stringify(data));
          }
        } catch (err) {
          console.error("Error fetching user data:", err);
        }
      } else {
        setUserData(null);
        localStorage.removeItem("user");
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) return <p>Loading...</p>;

  const handleLogout = () => {
    auth.signOut().then(() => {
      navigate("/intake-form/login");
    });
  };

  return (
    <Routes>
      {/* LOGIN PAGE */}
      <Route
        path="login"
        element={
          loading ? (
            <p className="p-10 text-center">Loading...</p>
          ) : firebaseUser && userData ? (
            <Navigate to="/intake-form/dashboard" replace />
          ) : (
            <IntakeLogin />
          )
        }
      />

      {/* DASHBOARD PAGE (Protected Route) */}
      <Route
        path="dashboard"
        element={
          firebaseUser ? (
            userData ? (
              <IntakeFormDashboard
                user={userData}
                onLogout={handleLogout}
                onAddIntake={() => navigate("/intake-form/add")}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-screen gap-4">
                <p className="text-xl font-bold text-red-500">Access Denied: User Profile Not Found</p>
                <p>You are logged in as {firebaseUser.email}, but no Intake Worker profile was found with this email.</p>
                <button onClick={handleLogout} className="bg-dark-green text-white px-4 py-2 rounded">
                  Logout
                </button>
              </div>
            )
          ) : (
            <Navigate to="/intake-form/login" replace />
          )
        }
      />

      {/* ADD INTAKE PAGE (Protected Route) */}
      <Route
        path="add"
        element={
          firebaseUser && userData ? (
            <IntakeFormPage
              user={userData}
              onBack={() => navigate("/intake-form/dashboard")}
            />
          ) : (
            <Navigate to="/intake-form/login" replace />
          )
        }
      />

      {/* UPDATE / VIEW INTAKE PAGE (Protected Route) */}
      <Route
        path="update-intake-form/:id"
        element={
          firebaseUser && userData ? (
            <IntakeFormPage
              user={userData}
              onBack={() => navigate("/intake-form/dashboard")}
            />
          ) : (
            <Navigate to="/intake-form/login" replace />
          )
        }
      />

      {/* VIEW SHIFT REPORT (Protected Route) */}
      <Route
        path="shift-report/:id"
        element={
          firebaseUser && userData ? (
            <ShiftReport
              user={userData}
            />
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
