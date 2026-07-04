import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, getDocs } from "firebase/firestore";
import {
  Building2,
  Users,
  UserCheck,
  Clock,
  AlertCircle,
  ArrowRight,
} from "lucide-react";
import ServiceOverview from "./ServiceOverview";

const ProgramCard = ({ name, icon, iconBg, iconColor, totalHouses, totalClients, totalStaff, compliancePercent, pendingApprovals, criticalIssues, onClick, index }) => {
  return (
    <div
      onClick={onClick}
      className="bg-white rounded-xl p-5 border transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 cursor-pointer"
      style={{
        borderColor: '#e5e7eb',
        boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
        animation: `fadeUp 0.4s ease-out ${index * 0.08}s both`,
      }}
    >
      {/* Icon + Title */}
      <div className="flex items-center gap-3 mb-4">
        <div
          className="flex items-center justify-center rounded-lg shrink-0"
          style={{ width: 36, height: 36, backgroundColor: iconBg, color: iconColor }}
        >
          {icon}
        </div>
        <div
          className="leading-tight flex-1"
          style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}
        >
          {name}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 mb-4 pb-4 border-b" style={{ borderColor: '#f3f4f6' }}>
        <div>
          <div className="text-[11px] font-medium mb-1" style={{ color: '#9ca3af' }}>Total Houses</div>
          <div className="text-lg font-semibold" style={{ color: '#111827' }}>{totalHouses}</div>
        </div>
        <div>
          <div className="text-[11px] font-medium mb-1" style={{ color: '#9ca3af' }}>Total Clients</div>
          <div className="text-lg font-semibold" style={{ color: '#111827' }}>{totalClients}</div>
        </div>
        <div>
          <div className="text-[11px] font-medium mb-1" style={{ color: '#9ca3af' }}>Total Staff</div>
          <div className="text-lg font-semibold" style={{ color: '#111827' }}>{totalStaff}</div>
        </div>
        <div>
          <div className="text-[11px] font-medium mb-1" style={{ color: '#9ca3af' }}>Compliance</div>
          <div
            className="text-lg font-semibold"
            style={{
              color: compliancePercent >= 95
                ? '#16a34a'
                : compliancePercent >= 90
                ? '#f59e0b'
                : compliancePercent > 0
                ? '#dc2626'
                : '#9ca3af',
            }}
          >
            {compliancePercent > 0 ? `${compliancePercent}%` : '—'}
          </div>
        </div>
      </div>

      {/* Pending + Critical */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <Clock size={14} style={{ color: '#f59e0b' }} strokeWidth={2} />
          <span className="text-[11px] font-medium" style={{ color: '#6b7280' }}>
            {pendingApprovals} Pending
          </span>
        </div>
        {criticalIssues > 0 && (
          <div className="flex items-center gap-1.5">
            <AlertCircle size={14} style={{ color: '#dc2626' }} strokeWidth={2} />
            <span className="text-[11px] font-semibold" style={{ color: '#dc2626' }}>
              {criticalIssues} Critical
            </span>
          </div>
        )}
      </div>

      {/* View Houses */}
      <button
        className="w-full flex items-center justify-center gap-1 font-semibold transition-colors"
        style={{ fontSize: 12, color: '#6b7280' }}
        onMouseEnter={e => (e.currentTarget.style.color = '#1f7a3c')}
        onMouseLeave={e => (e.currentTarget.style.color = '#6b7280')}
      >
        <span>View Houses</span>
        <ArrowRight size={12} strokeWidth={2.5} />
      </button>
    </div>
  );
};

const ServicesPage = ({ filter = "Weekly", dateRange }) => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    "family-treatment": { houses: 0 },
    "pdd": { houses: 0 },
    "child-youth": { houses: 0 },
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "dev_houses"));
        const newStats = {
          "family-treatment": { houses: 0 },
          "pdd": { houses: 0 },
          "child-youth": { houses: 0 },
        };
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          const type = data.programType || "family-treatment";
          if (newStats[type]) newStats[type].houses += 1;
        });
        setStats(newStats);
      } catch (error) {
        console.error("Error fetching house stats:", error);
      }
    };
    fetchStats();
  }, []);

  const programs = [
    {
      name: "Family Treatment Program",
      path: "/admin-dashboard/family-treatment-houses",
      icon: <Building2 size={17} strokeWidth={1.7} />,
      iconBg: '#eff6ff',
      iconColor: '#3b82f6',
      totalHouses: stats["family-treatment"].houses,
      totalClients: 0,
      totalStaff: 0,
      compliancePercent: 0,
      pendingApprovals: 0,
      criticalIssues: 0,
    },
    {
      name: "Person with Developmental Disability (PDD)",
      path: "/admin-dashboard/pdd-houses",
      icon: <Users size={17} strokeWidth={1.7} />,
      iconBg: '#f0fdf4',
      iconColor: '#22c55e',
      totalHouses: stats["pdd"].houses,
      totalClients: 0,
      totalStaff: 0,
      compliancePercent: 0,
      pendingApprovals: 0,
      criticalIssues: 0,
    },
    {
      name: "Child & Youth Program Cycle",
      path: "/admin-dashboard/child-youth-houses",
      icon: <UserCheck size={17} strokeWidth={1.7} />,
      iconBg: '#faf5ff',
      iconColor: '#a855f7',
      totalHouses: stats["child-youth"].houses,
      totalClients: 0,
      totalStaff: 0,
      compliancePercent: 0,
      pendingApprovals: 0,
      criticalIssues: 0,
    },
  ];

  return (
    <div style={{ fontFamily: 'Roboto, sans-serif' }}>
      {/* Page Title */}
      <h1
        className="font-bold mb-1"
        style={{ fontSize: 22, letterSpacing: '-0.01em', color: '#111827' }}
      >
        Services
      </h1>
      <p className="mb-6" style={{ fontSize: 14, color: '#6b7280' }}>
        Manage programs, houses, and compliance across all facilities
      </p>

      {/* Service Overview — Emergent Care, Respite Care, Supervised Visitation, Transportation */}
      <div className="mb-8">
        <ServiceOverview filter={filter} dateRange={dateRange} />
      </div>

      {/* Program Overview label */}
      <p
        className="font-bold uppercase mb-4"
        style={{ fontSize: 11, color: '#6b7280', letterSpacing: '0.08em' }}
      >
        Program Overview
      </p>

      {/* Program Cards */}
      <div className="grid grid-cols-3 gap-3">
        {programs.map((program, index) => (
          <ProgramCard
            key={index}
            index={index}
            {...program}
            onClick={() => program.path && navigate(program.path)}
          />
        ))}
      </div>

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default ServicesPage;
