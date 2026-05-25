import ServiceOverview from "./ServiceOverview";

export default function ServicesPage({ filter = "Weekly", dateRange }) {
  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      {/* Page header */}
      <div className="mb-6">
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "#111827", marginBottom: 4 }}>
          Services
        </h1>
        <p style={{ fontSize: 14, color: "#6b7280" }}>
          Overview of all active service categories and their case counts.
        </p>
      </div>

      {/* Service tiles */}
      <ServiceOverview filter={filter} dateRange={dateRange} />
    </div>
  );
}
