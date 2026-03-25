import KPIStrip from "./KPIStrip";
import ServiceOverview from "./ServiceOverview";
import ClientActivityTable from "./ClientActivityTable";
import RightPanel from "./RightPanel";

export default function Dashboard({ user, filter = "Weekly", dateRange }) {

  return (
    <div className="flex flex-col gap-[18px]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

      {/* KPI Strip — 6 cards */}
      <KPIStrip filter={filter} dateRange={dateRange} />

      {/* Two-column grid — align-items start so each column is its own height */}
      <div className="grid gap-[18px]" style={{ gridTemplateColumns: "1fr 360px", alignItems: "start" }}>

        {/* Left column */}
        <div className="flex flex-col gap-[18px] min-w-0">
          <ServiceOverview filter={filter} dateRange={dateRange} />
          <ClientActivityTable />
        </div>

        {/* Right column — fixed 360px */}
        <div style={{ width: 360 }}>
          <RightPanel filter={filter} dateRange={dateRange} />
        </div>

      </div>
    </div>
  );
}
