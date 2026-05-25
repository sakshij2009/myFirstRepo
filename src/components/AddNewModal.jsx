import { X, UserPlus, Users, Building, Calendar, FileText, Car } from "lucide-react";

const SHORTCUTS = [
  {
    label: "Add Client",
    icon: <UserPlus size={20} strokeWidth={1.7} />,
    path: "/admin-dashboard/add/add-client",
    iconBg: "#dbeafe",
    iconColor: "#3b82f6",
  },
  {
    label: "Add Staff",
    icon: <Users size={20} strokeWidth={1.7} />,
    path: "/admin-dashboard/add/add-user",
    iconBg: "#d1fae5",
    iconColor: "#10b981",
  },
  {
    label: "Add Shift",
    icon: <Calendar size={20} strokeWidth={1.7} />,
    path: "/admin-dashboard/add/add-user-shift",
    iconBg: "#fef3c7",
    iconColor: "#f59e0b",
  },
  {
    label: "Intake Form",
    icon: <FileText size={20} strokeWidth={1.7} />,
    path: "/admin-dashboard/add/add-intake-form",
    iconBg: "#e9d5ff",
    iconColor: "#a855f7",
  },
  {
    label: "Add Agency",
    icon: <Building size={20} strokeWidth={1.7} />,
    path: "/admin-dashboard/add/add-agency",
    iconBg: "#fed7aa",
    iconColor: "#ea580c",
  },
  {
    label: "Transportation",
    icon: <Car size={20} strokeWidth={1.7} />,
    path: "/admin-dashboard/transportation",
    iconBg: "#fde68a",
    iconColor: "#d97706",
  },
];

const AddNewModal = ({ onClose, onNavigate }) => {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
      onClick={onClose}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0"
        style={{ backgroundColor: "rgba(14, 61, 32, 0.5)", backdropFilter: "blur(5px)" }}
      />

      {/* Modal */}
      <div
        className="bg-white rounded-2xl p-6 relative"
        style={{
          width: "460px",
          maxWidth: "95vw",
          boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)",
          zIndex: 1,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 flex items-center justify-center rounded transition-colors hover:bg-gray-100"
          style={{ width: "28px", height: "28px", backgroundColor: "#f3f4f6" }}
        >
          <X size={15} strokeWidth={2} style={{ color: "#6b7280" }} />
        </button>

        {/* Title */}
        <div className="mb-6">
          <h2 className="font-bold mb-1" style={{ fontSize: "17px", fontWeight: 700, color: "#111827" }}>
            Add New
          </h2>
          <p style={{ fontSize: "12.5px", color: "#6b7280" }}>
            Select what you'd like to create
          </p>
        </div>

        {/* Action Tiles Grid – 2 columns */}
        <div className="grid grid-cols-2 gap-3">
          {SHORTCUTS.map((s) => (
            <button
              key={s.label}
              onClick={() => { onNavigate(s.path); onClose(); }}
              className="flex flex-col items-center justify-center gap-3 p-5 rounded-xl border transition-all hover:shadow-md hover:-translate-y-0.5"
              style={{
                borderColor: "#e5e7eb",
                borderWidth: "1.5px",
                backgroundColor: "#f9fafb",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#34b85f";
                e.currentTarget.style.backgroundColor = "#f0faf4";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "#e5e7eb";
                e.currentTarget.style.backgroundColor = "#f9fafb";
              }}
            >
              {/* Icon */}
              <div
                className="flex items-center justify-center rounded-xl"
                style={{ width: "40px", height: "40px", backgroundColor: s.iconBg, color: s.iconColor }}
              >
                {s.icon}
              </div>
              {/* Label */}
              <span style={{ fontSize: "12px", fontWeight: 600, color: "#111827" }}>
                {s.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AddNewModal;
