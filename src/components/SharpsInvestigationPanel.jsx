import { useState } from "react";
import { X, AlertTriangle, Clock, User, Camera } from "lucide-react";

export default function SharpsInvestigationPanel({ isOpen, onClose, sharpItem }) {
  const [checkedRooms, setCheckedRooms] = useState({});
  const [roomNotes, setRoomNotes] = useState({});
  const [itemFound, setItemFound] = useState(null);
  const [foundLocation, setFoundLocation] = useState("");
  const [actionTaken, setActionTaken] = useState("");
  const [finalNotes, setFinalNotes] = useState("");

  if (!isOpen || !sharpItem) return null;

  const rooms = ["Client Room 1", "Client Room 2", "Client Room 3", "Bathroom", "Kitchen", "Common Area"];
  const currentStaff = [{ name: "John Doe", role: "Senior Caregiver", shiftTime: "8:00 AM – 4:00 PM" }];
  const prevStaff = [{ name: "Jane Smith", role: "Caregiver", shiftTime: "12:00 AM – 8:00 AM" }];
  const incidentLog = [
    { time: "8:30 AM", action: "Missing item detected during routine check", by: "System" },
    { time: "8:35 AM", action: "Investigation initiated", by: "John Doe" },
  ];

  return (
    <>
      <div className="fixed inset-0 z-40" style={{ backgroundColor: "rgba(0,0,0,0.3)" }} onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 z-50 bg-white shadow-2xl flex flex-col overflow-hidden" style={{ width: 520, borderLeft: "1px solid #e5e7eb" }}>
        <div className="h-1" style={{ backgroundColor: "#dc2626" }} />

        {/* Header */}
        <div className="px-6 py-4 border-b flex items-center justify-between sticky top-0 bg-white z-10" style={{ borderColor: "#e5e7eb" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#fef2f2" }}>
              <AlertTriangle size={20} style={{ color: "#dc2626" }} strokeWidth={2} />
            </div>
            <div>
              <h2 className="font-semibold" style={{ fontSize: 16, color: "#111827" }}>Missing Sharp Investigation</h2>
              <div style={{ fontSize: 11, color: "#dc2626", fontWeight: 600 }}>HIGH PRIORITY – IMMEDIATE ACTION REQUIRED</div>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors" style={{ color: "#6b7280" }}>
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Issue Summary */}
            <div className="p-4 rounded-lg" style={{ backgroundColor: "#fef2f2", border: "1px solid #fecaca", borderLeft: "4px solid #dc2626" }}>
              <div className="grid grid-cols-2 gap-4">
                {[
                  ["Item Name", sharpItem.itemName],
                  ["Type", sharpItem.type],
                  ["Expected Qty", sharpItem.quantityExpected],
                  ["Found Qty", sharpItem.quantityPresent],
                  ["Missing Count", sharpItem.quantityExpected - sharpItem.quantityPresent],
                  ["Storage Location", sharpItem.location],
                ].map(([label, val], i) => (
                  <div key={i}>
                    <div style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600, textTransform: "uppercase" }}>{label}</div>
                    <div style={{ fontSize: 14, color: label === "Missing Count" || label === "Found Qty" ? "#dc2626" : "#111827", fontWeight: 600, marginTop: 4 }}>{val}</div>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t flex items-center gap-2" style={{ borderColor: "#fecaca" }}>
                <Clock size={16} style={{ color: "#dc2626" }} strokeWidth={2} />
                <span style={{ fontSize: 13, color: "#991b1b", fontWeight: 600 }}>
                  Detected: {sharpItem.lastChecked} by {sharpItem.checkedBy}
                </span>
              </div>
            </div>

            {/* Staff Traceability */}
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2" style={{ fontSize: 14, color: "#111827" }}>
                <User size={16} style={{ color: "#6b7280" }} strokeWidth={2} />
                Staff Traceability
              </h3>
              {[{ label: "Current Shift", labelColor: "#1e40af", labelBg: "#eff6ff", staff: currentStaff },
                { label: "Previous Shift", labelColor: "#6b7280", labelBg: "#f3f4f6", staff: prevStaff }].map(({ label, labelColor, labelBg, staff }) => (
                <div key={label} className="mb-3">
                  <div className="px-3 py-1.5 rounded-t-lg" style={{ backgroundColor: labelBg, fontSize: 11, color: labelColor, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    {label}
                  </div>
                  {staff.map((s, i) => (
                    <div key={i} className="p-3 border border-t-0 rounded-b-lg" style={{ borderColor: "#e5e7eb" }}>
                      <div className="flex items-center justify-between">
                        <div>
                          <div style={{ fontSize: 14, color: "#111827", fontWeight: 600 }}>{s.name}</div>
                          <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>{s.role}</div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock size={13} style={{ color: "#6b7280" }} strokeWidth={2} />
                          <span style={{ fontSize: 12, color: "#6b7280", fontWeight: 500 }}>{s.shiftTime}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            {/* Area Search Checklist */}
            <div>
              <div className="p-4 rounded-lg mb-3 flex items-start gap-3" style={{ backgroundColor: "#fffbeb", border: "1px solid #fef3c7" }}>
                <AlertTriangle size={18} className="shrink-0 mt-0.5" style={{ color: "#f59e0b" }} strokeWidth={2} />
                <div>
                  <div style={{ fontSize: 13, color: "#92400e", fontWeight: 600 }}>Please check all client rooms and common areas immediately.</div>
                  <div style={{ fontSize: 12, color: "#b45309", marginTop: 4 }}>Document each area checked and any findings.</div>
                </div>
              </div>
              <h3 className="font-semibold mb-3" style={{ fontSize: 14, color: "#111827" }}>Area Search Checklist</h3>
              <div className="space-y-2">
                {rooms.map((room) => (
                  <div key={room} className="p-3 rounded-lg border" style={{ borderColor: "#e5e7eb", backgroundColor: checkedRooms[room] ? "#f0fdf4" : "#ffffff" }}>
                    <div className="flex items-start gap-3">
                      <input type="checkbox" checked={checkedRooms[room] || false}
                        onChange={(e) => setCheckedRooms({ ...checkedRooms, [room]: e.target.checked })}
                        style={{ width: 16, height: 16, accentColor: "#16a34a", marginTop: 2 }} />
                      <div className="flex-1">
                        <div style={{ fontSize: 13, color: "#111827", fontWeight: 600 }}>{room}</div>
                        <textarea placeholder="Add notes about this area..." value={roomNotes[room] || ""}
                          onChange={(e) => setRoomNotes({ ...roomNotes, [room]: e.target.value })}
                          className="w-full mt-2 px-3 py-2 rounded-lg border resize-none" style={{ borderColor: "#e5e7eb", fontSize: 12 }} rows={2} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Evidence */}
            <div>
              <h3 className="font-semibold mb-3" style={{ fontSize: 14, color: "#111827" }}>Evidence & Documentation</h3>
              <button className="w-full px-4 py-3 rounded-lg border-2 border-dashed transition-colors hover:bg-gray-50 flex items-center justify-center gap-2 mb-3" style={{ borderColor: "#d1d5db" }}>
                <Camera size={18} style={{ color: "#6b7280" }} strokeWidth={2} />
                <span style={{ fontSize: 13, color: "#6b7280", fontWeight: 600 }}>Take Photo</span>
              </button>
              <textarea placeholder="Add investigation notes..." className="w-full px-4 py-3 rounded-lg border resize-none" style={{ borderColor: "#e5e7eb", fontSize: 13 }} rows={3} />
            </div>

            {/* Incident Log */}
            <div>
              <h3 className="font-semibold mb-3" style={{ fontSize: 14, color: "#111827" }}>Incident Timeline</h3>
              <div className="space-y-3">
                {incidentLog.map((log, idx) => (
                  <div key={idx} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: "#dc2626", marginTop: 6 }} />
                      {idx < incidentLog.length - 1 && <div className="w-px flex-1 mt-1" style={{ backgroundColor: "#e5e7eb" }} />}
                    </div>
                    <div className="flex-1 pb-3">
                      <div style={{ fontSize: 13, color: "#111827", fontWeight: 500 }}>{log.action}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <Clock size={12} style={{ color: "#9ca3af" }} strokeWidth={2} />
                        <span style={{ fontSize: 12, color: "#6b7280" }}>{log.time}</span>
                        <span style={{ fontSize: 12, color: "#9ca3af" }}>•</span>
                        <span style={{ fontSize: 12, color: "#6b7280" }}>{log.by}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Resolution */}
            <div>
              <h3 className="font-semibold mb-3" style={{ fontSize: 14, color: "#111827" }}>Resolution</h3>
              <div className="space-y-4">
                <div>
                  <div style={{ fontSize: 13, color: "#6b7280", fontWeight: 600, marginBottom: 8 }}>Item Found?</div>
                  <div className="flex gap-3">
                    {[{ val: "yes", label: "Yes – Found", activeColor: "#16a34a", activeBg: "#f0fdf4" },
                      { val: "no", label: "No – Not Found", activeColor: "#dc2626", activeBg: "#fef2f2" }].map(({ val, label, activeColor, activeBg }) => (
                      <button key={val} onClick={() => setItemFound(val)} className="flex-1 px-4 py-2.5 rounded-lg border-2 transition-all font-semibold"
                        style={{ borderColor: itemFound === val ? activeColor : "#e5e7eb", backgroundColor: itemFound === val ? activeBg : "#ffffff", color: itemFound === val ? activeColor : "#6b7280" }}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                {itemFound === "yes" && (
                  <div>
                    <label style={{ fontSize: 13, color: "#6b7280", fontWeight: 600 }}>Found Location</label>
                    <input type="text" value={foundLocation} onChange={(e) => setFoundLocation(e.target.value)}
                      placeholder="Where was the item found?" className="w-full mt-2 px-4 py-2.5 rounded-lg border" style={{ borderColor: "#e5e7eb", fontSize: 13 }} />
                  </div>
                )}
                <div>
                  <label style={{ fontSize: 13, color: "#6b7280", fontWeight: 600 }}>Action Taken</label>
                  <textarea value={actionTaken} onChange={(e) => setActionTaken(e.target.value)}
                    placeholder="Describe actions taken..." className="w-full mt-2 px-4 py-2.5 rounded-lg border resize-none" style={{ borderColor: "#e5e7eb", fontSize: 13 }} rows={3} />
                </div>
                <div>
                  <label style={{ fontSize: 13, color: "#6b7280", fontWeight: 600 }}>Final Notes</label>
                  <textarea value={finalNotes} onChange={(e) => setFinalNotes(e.target.value)}
                    placeholder="Additional information..." className="w-full mt-2 px-4 py-2.5 rounded-lg border resize-none" style={{ borderColor: "#e5e7eb", fontSize: 13 }} rows={3} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-gray-50" style={{ borderColor: "#e5e7eb" }}>
          <div className="grid grid-cols-2 gap-2">
            <button className="px-4 py-2.5 rounded-lg font-semibold transition-all hover:opacity-90" style={{ fontSize: 13, backgroundColor: "#1f7a3c", color: "#ffffff" }}>Save Investigation</button>
            <button className="px-4 py-2.5 rounded-lg font-semibold transition-all hover:opacity-90" style={{ fontSize: 13, backgroundColor: "#16a34a", color: "#ffffff" }}>Close Case</button>
          </div>
        </div>
      </div>
    </>
  );
}
