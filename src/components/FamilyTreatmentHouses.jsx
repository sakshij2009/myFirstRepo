import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Plus } from "lucide-react";

const FamilyTreatmentHouses = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  return (
    <div className="flex flex-col min-h-screen bg-[#f8fafc]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div className="px-8 py-10">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 mb-8 text-[14px] font-semibold">
          <span 
            className="text-[#145228] cursor-pointer hover:underline" 
            onClick={() => navigate("/admin-dashboard/services")}
          >
            Programs
          </span>
          <span className="text-[#94a3b8] font-normal">/</span>
          <span className="text-[#0f172a]">Family Treatment Program</span>
        </div>

        {/* Title Section */}
        <div className="mb-10">
          <h1 
            className="font-bold text-[#0f172a] mb-2" 
            style={{ fontSize: "32px", letterSpacing: "-0.02em" }}
          >
            Family Treatment Program – Houses
          </h1>
          <p 
            className="text-[#64748b]" 
            style={{ fontSize: "17px", fontWeight: 500 }}
          >
            Manage houses under Family Treatment Program
          </p>
        </div>

        {/* Action Bar: Search + Add Button */}
        <div className="flex items-center justify-between gap-4 mb-8">
          {/* Search Box */}
          <div className="relative max-w-[400px] flex-1">
            <Search
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
              size={18}
              strokeWidth={2}
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search houses..."
              className="w-full pl-11 pr-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all shadow-sm"
              style={{ borderColor: "#e5e7eb", backgroundColor: "white", fontSize: "14px" }}
            />
          </div>

          {/* Add Button */}
          <button
            onClick={() => navigate("/admin-dashboard/add/add-house")}
            className="flex items-center gap-2 px-5 py-3 rounded-xl text-white font-bold transition-all hover:opacity-90 shadow-sm shrink-0"

            style={{ 
              backgroundColor: "#1f7a3c", 
              fontSize: "14px",
              boxShadow: "0 1px 2px rgba(31,122,60,0.2)"
            }}
          >
            <Plus size={18} strokeWidth={2.5} />
            Add New House
          </button>
        </div>

        {/* Content area */}
        <div className="mt-12">
          {/* List of houses will go here */}
        </div>
      </div>
    </div>
  );
};

export default FamilyTreatmentHouses;
