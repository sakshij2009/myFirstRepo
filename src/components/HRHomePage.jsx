import { useState } from "react";
import { useNavigate } from "react-router-dom";
import TopBar from "./TopBar";
import HREmployeeProfiles from "./HREmployeeProfiles";
import HRDocuments from "./HRDocuments";
import HROnboardingApprovals from "./HROnboardingApprovals";

const TABS = [
  { key: "profiles", label: "Employee Profiles" },
  { key: "documents", label: "Documentation" },
  { key: "onboarding", label: "Onboarding Approvals" },
];

const HRHomePage = ({ user }) => {
  const navigate = useNavigate();
  const [tab, setTab] = useState("profiles");

  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/login");
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <TopBar user={user} onLogout={handleLogout} />
      <div className="p-4">
        <div className="flex gap-2 mb-4">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              style={
                tab === t.key
                  ? { background: "#1B5E37", color: "#fff" }
                  : { background: "#fff", color: "#374151", border: "1px solid #e5e7eb" }
              }
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "profiles" && <HREmployeeProfiles />}
        {tab === "documents" && <HRDocuments />}
        {tab === "onboarding" && <HROnboardingApprovals />}
      </div>
    </div>
  );
};

export default HRHomePage;
