import "./App.css";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Toaster } from "sonner";

import Login from "./components/Login";
import AdminHomePage from "./components/AdminHomePage";
import IntakeFormMainPage from "./components/IntakeFormMainPage";
import IntakeLogin from "./components/IntakeLogin";
import UserHomePage from "./components/UserHomePage";
import MigrateIntakeForms from "./components/MigrateIntakeForms";

// ✅ Protected Route – Main App Only (Admin + User)
const ProtectedRoute = ({ children, allowedRoles }) => {
  const user = JSON.parse(localStorage.getItem("user"));

  if (!user) return <Navigate to="/" replace />;

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

function App() {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem("user");
    return stored ? JSON.parse(stored) : null;
  });

  // React to "mainUser" changes across tabs
  useEffect(() => {
    const handleStorageChange = () => {
      const updatedUser = localStorage.getItem("user");
      setUser(updatedUser ? JSON.parse(updatedUser) : null);
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // Sync user state inside same tab
 useEffect(() => {
  const updatedUser = localStorage.getItem("user");
  setUser(updatedUser ? JSON.parse(updatedUser) : null);
}, []);


  return (
    <Router>
      <Toaster position="top-right" richColors />
      <Routes>
        {/* 🌐 Main Public Login (Admin/Owner) */}
        <Route path="/" element={<Login setUser={setUser} />} />

        {/* 🌐 Intake Form Application (with its own internal routes) */}
        <Route path="/intake-form/*" element={<IntakeFormMainPage />} />

        {/* 🌐 Admin Dashboard */}
        <Route
          path="/admin-dashboard/*"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminHomePage user={user} setUser={setUser}/>
            </ProtectedRoute>
          }
        />

        {/* 🌐 User Dashboard */}
        <Route
          path="/user-dashboard/*"
          element={
            <ProtectedRoute allowedRoles={["user"]}>
              <UserHomePage user={user} />
            </ProtectedRoute>
          }
        />

        {/* 🔧 One-time migration tool — admin only */}
        <Route
          path="/migrate-intake-forms"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <MigrateIntakeForms />
            </ProtectedRoute>
          }
        />

        {/* 🌐 Fallback - goes to main login (Not overriding intake-form) */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
