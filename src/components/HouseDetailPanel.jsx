import { useState } from "react";
import { X, Check, AlertOctagon, ChevronDown, ChevronUp, Clock, User, Image as ImageIcon } from "lucide-react";

// Slide-over panel for Maintenance or Compliance record detail
export default function HouseDetailPanel({ isOpen, onClose, record, type }) {
  const [activeTab, setActiveTab] = useState("details");
  const [expandedSection, setExpandedSection] = useState(null);

  if (!isOpen || !record) return null;

  const topColor =
    type === "compliance"
      ? record.risk === "Low" ? "#16a34a" : record.risk === "Medium" ? "#f59e0b" : "#dc2626"
      : record.priority === "Low" ? "#6b7280" : record.priority === "Medium" ? "#eab308" : record.priority === "High" ? "#f59e0b" : "#dc2626";

  const statusStyle = (status) => {
    if (type === "compliance") {
      if (status === "Compliant") return { color: "#16a34a", bg: "#f0fdf4" };
      if (status === "Overdue") return { color: "#dc2626", bg: "#fef2f2" };
      return { color: "#f59e0b", bg: "#fffbeb" };
    }
    if (status === "In Progress") return { color: "#f59e0b", bg: "#fffbeb" };
    if (status === "Pending") return { color: "#6b7280", bg: "#f3f4f6" };
    return { color: "#16a34a", bg: "#f0fdf4" };
  };

  const priorityStyle = (val) => {
    if (val === "Low") return { color: "#6b7280", bg: "#f3f4f6" };
    if (val === "Medium") return { color: "#eab308", bg: "#fefce8" };
    if (val === "High") return { color: "#f59e0b", bg: "#fff7ed" };
    return { color: "#dc2626", bg: "#fef2f2" };
  };

  const ss = statusStyle(record.status);
  const ps = type === "compliance" ? priorityStyle(record.risk) : priorityStyle(record.priority);

  return (
    <>
      <div className="fixed inset-0 z-40" style={{ backgroundColor: "rgba(0,0,0,0.3)" }} onClick={onClose} />
      <div
        className="fixed right-0 top-0 bottom-0 z-50 bg-white shadow-2xl flex flex-col overflow-hidden"
        style={{ width: 480, borderLeft: "1px solid #e5e7eb" }}
      >
        <div className="h-1" style={{ backgroundColor: topColor }} />

        {/* Header */}
        <div className="px-6 py-4 border-b flex items-center justify-between sticky top-0 bg-white z-10" style={{ borderColor: "#e5e7eb" }}>
          <div className="flex-1 pr-4">
            <h2 className="font-semibold" style={{ fontSize: 16, color: "#111827" }}>
              {type === "compliance" ? record.name : record.issue}
            </h2>
            <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>
              {type === "compliance" ? "Compliance Checklist" : "Maintenance Issue"}
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors" style={{ color: "#6b7280" }}>
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        {/* Sub-tabs */}
        <div className="flex items-center border-b px-6" style={{ borderColor: "#e5e7eb" }}>
          {["details", "photos", "actions"].map((t) => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className="px-4 py-3 font-medium transition-all relative capitalize"
              style={{ fontSize: 13, color: activeTab === t ? "#1f7a3c" : "#6b7280", fontWeight: activeTab === t ? 600 : 500 }}
            >
              {t}
              {activeTab === t && <div className="absolute bottom-0 left-0 right-0 h-0.5" style={{ backgroundColor: "#1f7a3c" }} />}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === "details" && (
            <div className="p-6 space-y-6">
              {/* Status + Risk/Priority */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600, textTransform: "uppercase", marginBottom: 6 }}>Status</div>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-md font-medium" style={{ fontSize: 12, color: ss.color, backgroundColor: ss.bg }}>
                    {record.status}
                  </span>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600, textTransform: "uppercase", marginBottom: 6 }}>
                    {type === "compliance" ? "Risk Level" : "Priority"}
                  </div>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-md font-medium" style={{ fontSize: 12, color: ps.color, backgroundColor: ps.bg }}>
                    {type === "compliance" ? record.risk : record.priority}
                  </span>
                </div>
              </div>

              {/* Meta fields */}
              {type === "maintenance" && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600, textTransform: "uppercase", marginBottom: 6 }}>Type</div>
                      <div style={{ fontSize: 13, color: "#111827", fontWeight: 500 }}>{record.type}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600, textTransform: "uppercase", marginBottom: 6 }}>Due Date</div>
                      <div style={{ fontSize: 13, color: "#111827", fontWeight: 500 }}>{record.dueDate}</div>
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600, textTransform: "uppercase", marginBottom: 6 }}>Assigned To</div>
                    <div style={{ fontSize: 13, color: "#111827", fontWeight: 500 }}>{record.assignedTo}</div>
                  </div>
                </div>
              )}

              {/* Notes */}
              {record.notes && (
                <div>
                  <h3 className="font-semibold mb-2" style={{ fontSize: 14, color: "#111827" }}>Notes</h3>
                  <div className="p-3 rounded-lg" style={{ backgroundColor: "#f9fafb", border: "1px solid #f3f4f6", fontSize: 13, color: "#4b5563", lineHeight: 1.6 }}>
                    {record.notes}
                  </div>
                </div>
              )}

              {/* Timeline */}
              {record.timeline && record.timeline.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3" style={{ fontSize: 14, color: "#111827" }}>Activity Timeline</h3>
                  <div className="space-y-3">
                    {record.timeline.map((event, idx) => (
                      <div key={idx} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: "#1f7a3c", marginTop: 6 }} />
                          {idx < record.timeline.length - 1 && <div className="w-px flex-1 mt-1" style={{ backgroundColor: "#e5e7eb" }} />}
                        </div>
                        <div className="flex-1 pb-3">
                          <div style={{ fontSize: 13, color: "#111827", fontWeight: 500 }}>{event.action}</div>
                          <div className="flex items-center gap-2 mt-1">
                            <User size={12} style={{ color: "#9ca3af" }} strokeWidth={2} />
                            <span style={{ fontSize: 12, color: "#6b7280" }}>{event.by}</span>
                            <span style={{ fontSize: 12, color: "#9ca3af" }}>•</span>
                            <Clock size={12} style={{ color: "#9ca3af" }} strokeWidth={2} />
                            <span style={{ fontSize: 12, color: "#6b7280" }}>{event.date}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "photos" && (
            <div className="p-6">
              {record.photos && record.photos.length > 0 ? (
                <div className="grid grid-cols-2 gap-3">
                  {record.photos.map((photo, idx) => (
                    <div key={idx} className="rounded-lg overflow-hidden border" style={{ borderColor: "#e5e7eb" }}>
                      <img src={photo.url} alt={photo.caption} className="w-full h-40 object-cover" />
                      <div className="p-3 bg-white">
                        <div style={{ fontSize: 12, color: "#111827", fontWeight: 500 }}>{photo.caption}</div>
                        <div className="flex items-center gap-1 mt-1">
                          <User size={12} style={{ color: "#9ca3af" }} strokeWidth={2} />
                          <span style={{ fontSize: 11, color: "#6b7280" }}>{photo.uploadedBy}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <ImageIcon size={40} className="mx-auto mb-3" style={{ color: "#d1d5db" }} strokeWidth={1.5} />
                  <div style={{ fontSize: 14, color: "#6b7280" }}>No photos uploaded</div>
                </div>
              )}
            </div>
          )}

          {activeTab === "actions" && (
            <div className="p-6">
              <div className="text-center py-8" style={{ fontSize: 14, color: "#6b7280" }}>No corrective actions required</div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-gray-50" style={{ borderColor: "#e5e7eb" }}>
          <div className="flex items-center gap-2">
            <button className="flex-1 px-4 py-2.5 rounded-lg font-semibold transition-all hover:opacity-90" style={{ fontSize: 13, backgroundColor: "#1f7a3c", color: "#ffffff" }}>
              {type === "maintenance" ? "Mark Complete" : "Approve"}
            </button>
            <button className="flex-1 px-4 py-2.5 rounded-lg font-semibold hover:bg-gray-100 transition-all" style={{ fontSize: 13, backgroundColor: "#ffffff", color: "#6b7280", border: "1px solid #e5e7eb" }}>
              {type === "maintenance" ? "Reassign" : "Request Changes"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
