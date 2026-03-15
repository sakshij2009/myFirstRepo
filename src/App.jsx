import "./App.css";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";

import AdminHomePage from "./components/AdminHomePage";
import IntakeFormMainPage from "./components/IntakeFormMainPage";
import Login from "./components/Login";
import UserHomePage from "./components/UserHomePage";

// ✅ Protected Route – Main App Only (Admin + User)
const ProtectedRoute = ({ children, allowedRoles }) => {
  const user = JSON.parse(localStorage.getItem("user"));

  if (!user) {
    console.log("ProtectedRoute: No user found. Redirecting to /");
    return <Navigate to="/" replace />;
  }

  const role = user.role ? user.role.toLowerCase() : "";
  const allowed = allowedRoles ? allowedRoles.map(r => r.toLowerCase()) : [];

  console.log(`ProtectedRoute: Role=${role}, Allowed=${allowed}`);

  if (allowed.length > 0 && !allowed.includes(role)) {
    console.log(`ProtectedRoute: Role mismatch! ${role} not in ${allowed}. Redirecting to /`);
    // Consider clearing user if role is mismatch to prevent loop? 
    // localStorage.removeItem("user"); 
    // No, maybe they are just at wrong URL. But here they are redirected to / which redirects them back...
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
      <Routes>
        {/* 🌐 Main Public Login */}
        <Route path="/" element={<Login setUser={setUser} />} />

        {/* 🌐 Intake Form Application (with its own internal routes) */}
        <Route path="/intake-form/*" element={<IntakeFormMainPage />} />

        {/* 🌐 Admin Dashboard */}
        <Route
          path="/admin-dashboard/*"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminHomePage user={user} setUser={setUser} />
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

        {/* 🌐 Fallback - goes to main login (Not overriding intake-form) */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
