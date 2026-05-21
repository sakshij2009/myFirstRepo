import React, { useEffect, useState } from "react";
import { useParams, useLocation } from "react-router-dom";
import IntakeForm from "./IntakeForm";

const IntakeFormPage = ({ user, onBack, id: propId, isViewOnly }) => {
  const [isCaseWorker, setIsCaseWorker] = useState(false);

  const { id: routeId } = useParams();
  const location = useLocation();

  const formId = propId || routeId;

  const isUpdateMode = location.pathname.includes("update-intake-form") || location.pathname.includes("/edit/");
  const isViewMode = isViewOnly || location.pathname.includes("/view/") || location.pathname.includes("view-intake-form");

  useEffect(() => {
    // Determine isCaseWorker from user role, URL param, or stored intakeUser role
    const urlParams = new URLSearchParams(location.search);
    const formType = urlParams.get("type") || "";
    const roleStr = (user?.role || "").toLowerCase();
    const roleMatch = roleStr.includes("intake") || roleStr === "worker" || roleStr === "staff";
    const typeMatch = ["intake worker", "intake-worker", "intake_worker"].includes(formType.toLowerCase().trim());
    // Also check localStorage intakeUser role
    let storedRoleMatch = false;
    try {
      const stored = JSON.parse(localStorage.getItem("intakeUser") || "null");
      const storedRole = (stored?.role || "").toLowerCase();
      storedRoleMatch = storedRole.includes("intake") || storedRole === "worker" || storedRole === "staff";
    } catch { /* ignore */ }
    setIsCaseWorker(roleMatch || typeMatch || storedRoleMatch || true); // default true in intake-form app
  }, [user, location.search]);

  return (
    <div className="flex flex-col p-4 w-full">
      {/* IntakeForm handles its own data fetch with multi-strategy fallback */}
      <div className="flex w-full rounded">
        <IntakeForm
          user={user}
          isCaseWorker={isCaseWorker}
          existingData={null}
          mode={isViewMode ? "view" : isUpdateMode ? "update" : "add"}
          id={formId}
          isEditable={!isViewMode}
        />
      </div>
    </div>
  );
};

export default IntakeFormPage;
