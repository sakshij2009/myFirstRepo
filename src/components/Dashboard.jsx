import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import KPIStrip from "./KPIStrip";
import ServiceOverview from "./ServiceOverview";
import ClientActivityTable from "./ClientActivityTable";
import RightPanel from "./RightPanel";

export default function Dashboard({ user }) {
  const navigate = useNavigate();

  const handleNavigateToClientReport = (clientData) => {
    // navigate to client report if it exists
  };

  return (
    <div className="flex flex-col gap-[18px]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

      {/* KPI Strip — 6 cards */}
      <KPIStrip />

      {/* Two-column grid */}
      <div className="grid gap-[18px]" style={{ gridTemplateColumns: "1fr 360px" }}>

        {/* Left column */}
        <div className="flex flex-col gap-[18px] min-w-0">
          <ServiceOverview />
          <ClientActivityTable onNavigateToReport={handleNavigateToClientReport} />
        </div>

        {/* Right column — fixed 360px */}
        <div style={{ width: 360 }}>
          <RightPanel />
        </div>

      </div>
    </div>
  );
}
