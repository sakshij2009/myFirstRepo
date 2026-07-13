import { useState } from "react";
import { useNavigate } from "react-router-dom";
import TopBar from "./TopBar";
import PayrollEmployeeList from "./PayrollEmployeeList";
import Payroll from "./Payroll";

const TABS = [
  { key: "employees", label: "Employee Details" },
  { key: "timesheets", label: "Timesheets" },
];

const PayrollHomePage = ({ user }) => {
  const navigate = useNavigate();
  const [tab, setTab] = useState("employees");

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

        {tab === "employees" ? <PayrollEmployeeList /> : <Payroll />}
      </div>
    </div>
  );
};

export default PayrollHomePage;
