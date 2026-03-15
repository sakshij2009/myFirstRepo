import { X, UserPlus, Users, Building, Calendar, FileText, UserCheck } from "lucide-react";

const SHORTCUTS = [
  { label: "Add Client",        icon: <Users size={20} strokeWidth={1.7} />,     path: "/admin-dashboard/add/add-client",        color: "#e0f2fe", iconColor: "#0284c7" },
  { label: "Add Staff",         icon: <UserPlus size={20} strokeWidth={1.7} />,  path: "/admin-dashboard/add/add-user",           color: "#f0fdf4", iconColor: "#16a34a" },
  { label: "Add Agency",        icon: <Building size={20} strokeWidth={1.7} />,  path: "/admin-dashboard/add/add-agency",         color: "#fdf4ff", iconColor: "#9333ea" },
  { label: "Add Shift",         icon: <Calendar size={20} strokeWidth={1.7} />,  path: "/admin-dashboard/add/add-user-shift",     color: "#fff7ed", iconColor: "#ea580c" },
  { label: "Add Intake Form",   icon: <FileText size={20} strokeWidth={1.7} />,  path: "/admin-dashboard/add/add-intake-form",    color: "#fef9c3", iconColor: "#ca8a04" },
  { label: "Add Intake Worker", icon: <UserCheck size={20} strokeWidth={1.7} />, path: "/admin-dashboard/add/add-intakeworker",   color: "#fdf2f8", iconColor: "#db2777" },
];

const AddNewModal = ({ onClose, onNavigate }) => {
  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl p-6 w-[480px] max-w-[95vw]"
        style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="font-bold text-gray-900" style={{ fontSize: 18 }}>Add New</h2>
            <p className="text-sm text-gray-400 mt-0.5">What would you like to create?</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600"
          >
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-3 gap-3">
          {SHORTCUTS.map((s) => (
            <button
              key={s.label}
              onClick={() => onNavigate(s.path)}
              className="flex flex-col items-center gap-2.5 p-4 rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all text-center group"
            >
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110"
                style={{ backgroundColor: s.color, color: s.iconColor }}
              >
                {s.icon}
              </div>
              <span className="text-xs font-semibold text-gray-700">{s.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AddNewModal;
