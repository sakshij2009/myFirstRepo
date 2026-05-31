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
  CheckCircle,
  LayoutGrid
} from "lucide-react";

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

const ServicesPage = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    "family-treatment": { houses: 0 },
    "pdd": { houses: 0 },
    "child-youth": { houses: 0 }
  });

  const [summary, setSummary] = useState({
    totalHouses: 0,
    totalClients: 0,
    totalStaff: 0,
    activePrograms: 3,
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [housesSnap, clientsSnap, usersSnap] = await Promise.all([
          getDocs(collection(db, "houses")),
          getDocs(collection(db, "clients")),
          getDocs(collection(db, "users")),
        ]);

        const newStats = {
          "family-treatment": { houses: 0 },
          "pdd": { houses: 0 },
          "child-youth": { houses: 0 }
        };

        housesSnap.forEach((doc) => {
          const data = doc.data();
          const type = data.programType || "family-treatment";
          if (newStats[type]) newStats[type].houses += 1;
        });

        const staffCount = usersSnap.docs.filter(d => {
          const role = d.data().role;
          return role === "user" || role === "staff";
        }).length;

        setStats(newStats);
        setSummary({
          totalHouses: housesSnap.size,
          totalClients: clientsSnap.size,
          totalStaff: staffCount,
          activePrograms: 3,
        });
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

  const summaryCards = [
    {
      label: "Total Houses",
      value: summary.totalHouses,
      icon: <Building2 size={18} strokeWidth={1.8} />,
      iconBg: "#eff6ff",
      iconColor: "#3b82f6",
      border: "#bfdbfe",
    },
    {
      label: "Total Clients",
      value: summary.totalClients,
      icon: <Users size={18} strokeWidth={1.8} />,
      iconBg: "#f0fdf4",
      iconColor: "#22c55e",
      border: "#bbf7d0",
    },
    {
      label: "Total Staff",
      value: summary.totalStaff,
      icon: <UserCheck size={18} strokeWidth={1.8} />,
      iconBg: "#faf5ff",
      iconColor: "#a855f7",
      border: "#e9d5ff",
    },
    {
      label: "Active Programs",
      value: summary.activePrograms,
      icon: <LayoutGrid size={18} strokeWidth={1.8} />,
      iconBg: "#fff7ed",
      iconColor: "#f97316",
      border: "#fed7aa",
    },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-[#f8fafc]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      {/* Header Section */}
      <div className="px-8 py-10">
        <h1
          className="font-bold text-[#0f172a] mb-1.5"
          style={{ fontSize: "30px", letterSpacing: "-0.02em" }}
        >
          Services
        </h1>
        <p
          className="text-[#64748b] mb-10"
          style={{ fontSize: "15px", fontWeight: 500 }}
        >
          Manage programs, houses, and compliance across all facilities
        </p>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-[1200px] mb-12">
          {summaryCards.map((card, i) => (
            <div
              key={i}
              className="bg-white rounded-2xl p-5 border shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
              style={{ borderColor: card.border }}
            >
              <div className="flex items-center justify-between mb-4">
                <div
                  className="flex items-center justify-center rounded-xl"
                  style={{ width: 40, height: 40, backgroundColor: card.iconBg, color: card.iconColor }}
                >
                  {card.icon}
                </div>
              </div>
              <div
                className="font-bold mb-1"
                style={{ fontSize: 28, fontWeight: 700, color: "#0f172a", lineHeight: 1 }}
              >
                {card.value}
              </div>
              <div
                className="font-semibold"
                style={{ fontSize: 12, color: "#94a3b8", letterSpacing: "0.04em" }}
              >
                {card.label}
              </div>
            </div>
          ))}
        </div>

        <h2
          className="font-bold text-[#94a3b8] uppercase tracking-[0.1em] mb-8"
          style={{ fontSize: "11px" }}
        >
          PROGRAM OVERVIEW
        </h2>

        {/* Programs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-[1200px]">
          {programs.map((program, index) => (
            <ProgramCard
              key={index}
              {...program}
              onClick={() => program.path && navigate(program.path)}
            />
          ))}
        </div>
      </div>

      <div className="flex-1"></div>
    </div>
  );
};

export default ServicesPage;

