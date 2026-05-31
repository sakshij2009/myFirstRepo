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
  ArrowRight
} from "lucide-react";
import ServiceOverview from "./ServiceOverview";

const ProgramCard = ({
  title,
  houses,
  clients,
  staff,
  compliance,
  complianceColor,
  pending,
  critical,
  icon: Icon,
  iconBg,
  iconColor,
  onClick
}) => {
  return (
    <div
      onClick={onClick}
      className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-all duration-200 group cursor-pointer"
    >
      {/* Card Header */}
      <div className="flex items-start gap-4 mb-8">
        <div className={`p-3 rounded-xl ${iconBg} ${iconColor} shrink-0`}>
          <Icon size={22} strokeWidth={2} />
        </div>
        <h3 className="font-bold text-[#0f172a] text-[17px] leading-tight pt-1">
          {title}
        </h3>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-y-7 gap-x-4 mb-8">
        <div>
          <p className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-wider mb-1.5">Total Houses</p>
          <p className="text-[22px] font-bold text-[#0f172a]">{houses}</p>
        </div>
        <div>
          <p className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-wider mb-1.5">Total Clients</p>
          <p className="text-[22px] font-bold text-[#0f172a]">{clients}</p>
        </div>
        <div>
          <p className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-wider mb-1.5">Total Staff</p>
          <p className="text-[22px] font-bold text-[#0f172a]">{staff}</p>
        </div>
        <div>
          <p className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-wider mb-1.5">Compliance</p>
          <p className={`text-[22px] font-bold ${complianceColor}`}>{compliance}</p>
        </div>
      </div>

      {/* Status Footer */}
      <div className="flex items-center justify-between pt-6 border-t border-gray-50 mb-6">
        <div className="flex items-center gap-1.5 text-[#f59e0b] text-[13px] font-semibold">
          <Clock size={16} strokeWidth={2.5} />
          <span>{pending} Pending</span>
        </div>
        {critical > 0 && (
          <div className="flex items-center gap-1.5 text-[#ef4444] text-[13px] font-semibold">
            <AlertCircle size={16} strokeWidth={2.5} />
            <span>{critical} Critical</span>
          </div>
        )}
      </div>

      {/* Action Button */}
      <div className="flex justify-center">
        <button className="flex items-center gap-2 text-[#64748b] font-bold text-[13px] group-hover:text-[#0f172a] transition-colors">
          View Houses
          <ArrowRight size={14} strokeWidth={3} className="transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>
    </div>
  );
};

const ServicesPage = ({ filter = "Weekly", dateRange }) => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    "family-treatment": { houses: 0 },
    "pdd": { houses: 0 },
    "child-youth": { houses: 0 }
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "houses"));
        const newStats = {
          "family-treatment": { houses: 0 },
          "pdd": { houses: 0 },
          "child-youth": { houses: 0 }
        };

        querySnapshot.forEach((doc) => {
          const data = doc.data();
          const type = data.programType || "family-treatment";
          if (newStats[type]) {
            newStats[type].houses += 1;
          }
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
      title: "Family Treatment Program",
      path: "/admin-dashboard/family-treatment-houses",
      houses: stats["family-treatment"].houses,
      clients: 0,
      staff: 0,
      compliance: "0%",
      complianceColor: "text-[#94a3b8]",
      pending: 0,
      critical: 0,
      icon: Building2,
      iconBg: "bg-blue-50",
      iconColor: "text-blue-500",
    },
    {
      title: "Person with Developmental Disability (PDD)",
      path: "/admin-dashboard/pdd-houses",
      houses: stats["pdd"].houses,
      clients: 0,
      staff: 0,
      compliance: "0%",
      complianceColor: "text-[#94a3b8]",
      pending: 0,
      critical: 0,
      icon: Users,
      iconBg: "bg-emerald-50",
      iconColor: "text-emerald-500",
    },
    {
      title: "Child & Youth Program Cycle",
      path: "/admin-dashboard/child-youth-houses",
      houses: stats["child-youth"].houses,
      clients: 0,
      staff: 0,
      compliance: "0%",
      complianceColor: "text-[#94a3b8]",
      pending: 0,
      critical: 0,
      icon: UserCheck,
      iconBg: "bg-purple-50",
      iconColor: "text-purple-500",
    },
  ];

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      {/* Page Title */}
      <h1
        className="font-bold text-[#0f172a] mb-1"
        style={{ fontSize: "22px", letterSpacing: "-0.01em" }}
      >
        Services
      </h1>
      <p
        className="text-[#6b7280] mb-6"
        style={{ fontSize: "14px" }}
      >
        Manage programs, houses, and compliance across all facilities
      </p>

      {/* Service Overview cards — Emergent Care, Respite Care, Supervised Visitation, Transportation */}
      <div className="mb-8">
        <ServiceOverview filter={filter} dateRange={dateRange} />
      </div>

      {/* Program Overview */}
      <p
        className="font-bold text-[#94a3b8] uppercase tracking-[0.1em] mb-4"
        style={{ fontSize: "11px" }}
      >
        PROGRAM OVERVIEW
      </p>

      <div className="grid grid-cols-3 gap-5">
        {programs.map((program, index) => (
          <ProgramCard
            key={index}
            {...program}
            onClick={() => program.path && navigate(program.path)}
          />
        ))}
      </div>
    </div>
  );
};

export default ServicesPage;
