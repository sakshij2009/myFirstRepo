import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { collection, doc, getDoc, getDocs, query, where, updateDoc, arrayUnion } from "firebase/firestore";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../firebase";
import PlacesAutocomplete from "./PlacesAutocomplete";
import CriticalIncidentForm from "./CriticalIncidentForm";
import NoteworthyIncidentForm from "./NoteworthyIncidentForm";
import FollowThroughForm from "./FollowThroughForm";
import MedicalLogForm from "./MedicalLogForm";
import {
  ArrowLeft, Calendar, Clock, User, MapPin, Phone, Mail,
  FileText, Download, CheckCircle, AlertCircle, Edit,
  ChevronRight, Flag, MessageSquare, Plus, TrendingUp,
  Shield, Clipboard, Activity, X, Printer, ChevronDown,
  PenLine, Stamp, Pill, Truck, Upload, Receipt,
  AlertTriangle, Stethoscope, CheckCircle2,
} from "lucide-react";

const PILL_COLORS = [
  { label: "Yellow", bg: "#fffae3", border: "#f1e19e" },
  { label: "White",  bg: "#f9fafb", border: "#e5e7eb" },
  { label: "Blue",   bg: "#eff6ff", border: "#bfdbfe" },
  { label: "Pink",   bg: "#fdf2f8", border: "#f9a8d4" },
  { label: "Red",    bg: "#fef2f2", border: "#fecaca" },
  { label: "Orange", bg: "#fff7ed", border: "#fdba74" },
  { label: "Purple", bg: "#faf5ff", border: "#d8b4fe" },
];
const EXPENSE_TYPES = ["Food", "Accommodation", "Parking", "Toll", "Medical Supply", "Other"];

// ─── Add Medication Modal ─────────────────────────────────────────────────────
function AddMedModal({ day, onClose, onSubmit }) {
  const [form, setForm] = useState({ medicineName: "", dosage: "", time: "", color: PILL_COLORS[0], errorField: "", staff: "", witness: "", reason: "" });
  const [showColorDrop, setShowColorDrop] = useState(false);
  const up = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const inp = "w-full bg-[#f3f3f5] border border-[#e6e6e6] rounded-lg px-3 py-2.5 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:border-[#145228] focus:bg-white transition-colors";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="relative bg-white rounded-xl flex flex-col overflow-hidden" style={{ width: 520, maxWidth: "95vw", maxHeight: "92vh", boxShadow: "0 24px 80px rgba(0,0,0,0.22)", fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
        <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0" style={{ borderColor: "#f3f4f6", background: "#fafafa" }}>
          <div className="flex items-center gap-2.5">
            <div className="rounded-lg p-2" style={{ background: "#f0fdf4" }}><Pill size={15} style={{ color: "#145228" }} /></div>
            <div>
              <p className="font-bold" style={{ fontSize: 15, color: "#111827" }}>Add Medicines — Day {day}</p>
              <p style={{ fontSize: 11, color: "#9ca3af" }}>Shift Medication Log</p>
            </div>
          </div>
          <button onClick={onClose} className="flex items-center justify-center rounded-lg border hover:bg-gray-50" style={{ width: 32, height: 32, borderColor: "#e5e7eb" }}><X size={14} style={{ color: "#6b7280" }} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <div className="rounded-lg p-3 border" style={{ background: "#eff6ff", borderColor: "#d8e9ff" }}>
            <p style={{ fontSize: 12, color: "#2f5ce9", lineHeight: 1.6 }}>Medications should be administered half an hour before and half an hour after the shift.</p>
          </div>
          <div><label className="block font-bold mb-1.5" style={{ fontSize: 13, color: "#2b3232" }}>Medicine Name</label>
            <input className={inp} placeholder="Enter Medicine Name" value={form.medicineName} onChange={e => up("medicineName", e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block font-bold mb-1.5" style={{ fontSize: 13, color: "#2b3232" }}>Dosage</label><input className={inp} placeholder="e.g., 500mg" value={form.dosage} onChange={e => up("dosage", e.target.value)} /></div>
            <div><label className="block font-bold mb-1.5" style={{ fontSize: 13, color: "#2b3232" }}>Time</label><input className={inp} type="time" value={form.time} onChange={e => up("time", e.target.value)} /></div>
          </div>
          <div>
            <label className="block font-bold mb-1.5" style={{ fontSize: 13, color: "#2b3232" }}>Pill Color</label>
            <div className="relative">
              <button className="w-full bg-[#f3f3f5] border border-[#e6e6e6] rounded-lg px-3 py-2.5 flex items-center gap-2.5" onClick={() => setShowColorDrop(d => !d)}>
                <div className="rounded w-5 h-5 border flex-shrink-0" style={{ background: form.color.bg, borderColor: form.color.border }} />
                <span className="flex-1 text-left text-sm text-gray-600">{form.color.label}</span>
                <ChevronDown size={16} style={{ color: "#39A75E" }} />
              </button>
              {showColorDrop && (
                <div className="absolute top-full mt-1 left-0 right-0 bg-white rounded-lg border shadow-lg z-20 overflow-hidden" style={{ borderColor: "#e5e7eb" }}>
                  {PILL_COLORS.map(c => (
                    <button key={c.label} className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50" onClick={() => { up("color", c); setShowColorDrop(false); }}>
                      <div className="rounded w-5 h-5 border flex-shrink-0" style={{ background: c.bg, borderColor: c.border }} />
                      <span className="text-sm text-gray-700">{c.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block font-bold mb-1.5" style={{ fontSize: 13, color: "#2b3232" }}>Staff</label><input className={inp} placeholder="Staff name" value={form.staff} onChange={e => up("staff", e.target.value)} /></div>
            <div><label className="block font-bold mb-1.5" style={{ fontSize: 13, color: "#2b3232" }}>Witness</label><input className={inp} placeholder="Witness name" value={form.witness} onChange={e => up("witness", e.target.value)} /></div>
          </div>
          <div><label className="block font-bold mb-1.5" style={{ fontSize: 13, color: "#2b3232" }}>Reason</label>
            <textarea className={inp + " resize-none"} rows={3} placeholder="Reason for medication…" value={form.reason} onChange={e => up("reason", e.target.value)} /></div>
        </div>
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t flex-shrink-0" style={{ borderColor: "#f3f4f6" }}>
          <button onClick={onClose} className="px-4 py-2 rounded-lg border font-semibold text-sm hover:bg-gray-50" style={{ borderColor: "#e5e7eb", color: "#374151" }}>Cancel</button>
          <button className="px-5 py-2 rounded-lg font-semibold text-sm text-white hover:opacity-90" style={{ background: "#145228" }}
            onClick={() => { onSubmit(day, form.medicineName || "Medicine"); onClose(); }}>Submit</button>
        </div>
      </div>
    </div>
  );
}

const FONT = { fontFamily: "'Plus Jakarta Sans', sans-serif" };

// ─── Full Report Modal ────────────────────────────────────────────────────────
function FullReportModal({ shiftData, normalized, primaryStaff, onClose }) {
  const reportText = shiftData?.shiftReport || "No shift report has been filed for this shift.";
  const staffName = primaryStaff?.name || normalized.clientName;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="relative flex flex-col bg-white rounded-2xl overflow-hidden"
        style={{ width: 860, maxWidth: "95vw", height: "90vh", boxShadow: "0 24px 80px rgba(0,0,0,0.22)", ...FONT }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 flex-shrink-0 border-b" style={{ borderColor: "#f3f4f6", background: "#fafafa" }}>
          <div className="flex items-center gap-3">
            <div className="rounded-lg flex items-center justify-center flex-shrink-0" style={{ width: 36, height: 36, background: "linear-gradient(135deg,#145228,#1f7a3c)" }}>
              <Shield size={17} style={{ color: "#fff" }} />
            </div>
            <div>
              <p className="font-bold" style={{ fontSize: 15, color: "#111827" }}>Daily Shift Report</p>
              <p style={{ fontSize: 11, color: "#9ca3af" }}>Report · {normalized.clientName} · {normalized.clientId}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-semibold" style={{ fontSize: 11, background: "#f0fdf4", color: "#15803d" }}>
              <CheckCircle size={11} /> Approved &amp; Filed
            </span>
            <button onClick={() => window.print()} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border font-semibold transition-all hover:bg-gray-50" style={{ fontSize: 12, color: "#374151", borderColor: "#e5e7eb" }}>
              <Printer size={13} /> Print
            </button>
            <button onClick={onClose} className="flex items-center justify-center rounded-lg border transition-all hover:bg-gray-50 ml-1" style={{ width: 34, height: 34, borderColor: "#e5e7eb" }}>
              <X size={15} style={{ color: "#6b7280" }} />
            </button>
          </div>
        </div>
        {/* Body */}
        <div className="flex-1 overflow-y-auto" style={{ background: "#f9fafb" }}>
          <div className="px-6 py-5 space-y-4">
            {/* Client Info + Shift Details */}
            <div className="grid gap-4" style={{ gridTemplateColumns: "1fr 1fr" }}>
              <div className="bg-white rounded-xl border p-5" style={{ borderColor: "#e5e7eb" }}>
                <p className="font-semibold uppercase tracking-widest mb-3" style={{ fontSize: 10, color: "#9ca3af" }}>Client Information</p>
                <div className="flex items-center gap-3 mb-4">
                  <div className="rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
                    style={{ width: 48, height: 48, background: "linear-gradient(135deg,#145228,#1f7a3c)", fontSize: 18 }}>
                    {normalized.clientName.split(" ").map(n => n[0]).join("").slice(0, 2)}
                  </div>
                  <div>
                    <p className="font-bold" style={{ fontSize: 16, color: "#111827" }}>{normalized.clientName}</p>
                    <p className="font-mono" style={{ fontSize: 11, color: "#9ca3af" }}>{normalized.clientId}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
                  {[
                    { label: "Service Type", value: normalized.serviceType },
                    { label: "Shift Type",   value: normalized.category    },
                    { label: "Agency",       value: normalized.agency      },
                    { label: "Staff",        value: primaryStaff?.name || "—" },
                  ].map((f, i) => (
                    <div key={i}>
                      <p style={{ fontSize: 10, color: "#9ca3af", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>{f.label}</p>
                      <p style={{ fontSize: 13, color: "#111827", fontWeight: 600 }}>{f.value}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-white rounded-xl border p-5" style={{ borderColor: "#e5e7eb" }}>
                <p className="font-semibold uppercase tracking-widest mb-3" style={{ fontSize: 10, color: "#9ca3af" }}>Shift Details</p>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {[
                    { label: "Date",      value: normalized.displayDate || "—", sub: "",            color: "#111827", bg: "#f9fafb" },
                    { label: "Clock In",  value: normalized.clockIn  || "—",   sub: "Start",       color: "#145228", bg: "#f0fdf4" },
                    { label: "Clock Out", value: normalized.clockOut || "—",   sub: "End",         color: "#dc2626", bg: "#fef2f2" },
                    { label: "Status",    value: normalized.statusVal,          sub: "Shift status", color: "#111827", bg: "#f9fafb" },
                  ].map((k, i) => (
                    <div key={i} className="rounded-xl p-3 border" style={{ background: k.bg, borderColor: "#f3f4f6" }}>
                      <p style={{ fontSize: 10, color: "#9ca3af", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>{k.label}</p>
                      <p className="font-bold" style={{ fontSize: 17, color: k.color, lineHeight: 1.1, marginTop: 4 }}>{k.value}</p>
                      {k.sub && <p style={{ fontSize: 10, color: "#9ca3af", marginTop: 2 }}>{k.sub}</p>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {/* Report narrative */}
            <div className="bg-white rounded-xl border p-6" style={{ borderColor: "#e5e7eb" }}>
              <div className="flex items-center gap-2.5 mb-4">
                <div className="rounded-lg p-2" style={{ background: "#f0fdf4" }}><PenLine size={15} style={{ color: "#145228" }} /></div>
                <div>
                  <p className="font-bold" style={{ fontSize: 15, color: "#111827" }}>Shift Narrative Report</p>
                  <p style={{ fontSize: 11, color: "#9ca3af" }}>Written by {staffName}</p>
                </div>
              </div>
              <div className="border-b mb-5" style={{ borderColor: "#f3f4f6" }} />
              <div style={{ fontSize: 14, color: "#374151", lineHeight: 1.9, whiteSpace: "pre-wrap" }}>
                {reportText}
              </div>
            </div>
          </div>
        </div>
        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t flex-shrink-0" style={{ borderColor: "#f3f4f6", background: "#fafafa" }}>
          <button onClick={onClose} className="px-4 py-2 rounded-lg border font-semibold text-sm hover:bg-gray-50 transition-colors" style={{ borderColor: "#e5e7eb", color: "#374151" }}>Close</button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
const ShiftReport = ({ user }) => {
  const { id: shiftId } = useParams();
  const navigate = useNavigate();

  const [activeTab, setActiveTab]       = useState("reports");
  const [shiftData, setShiftData]       = useState(null);
  const [loading, setLoading]           = useState(true);
  const [intakeData, setIntakeData]     = useState(null);
  const [clientData, setClientData]     = useState(null);
  const [recentReports, setRecentReports] = useState([]);
  const [primaryStaff, setPrimaryStaff] = useState(null);
  const [showFullReport, setShowFullReport] = useState(false);
  const [activeModal, setActiveModal]   = useState(null); // 'critical'|'medical'|'noteworthy'|'followthrough'
  const [agencyData, setAgencyData]     = useState(null);

  // ── Clock In/Out edit state ──
  const [editingClock, setEditingClock] = useState(false);
  const [editClockIn, setEditClockIn]   = useState("");
  const [editClockOut, setEditClockOut] = useState("");
  const [clockSaving, setClockSaving]   = useState(false);

  // ── Medications tab state ──
  const [showAddMed, setShowAddMed]     = useState(false);
  const [selectedMedDay, setSelMedDay]  = useState(null);
  const [calEntries, setCalEntries]     = useState({});
  const [authName, setAuthName]         = useState("");
  const [authCreds, setAuthCreds]       = useState("");
  const [achNum, setAchNum]             = useState("");
  const [doctorName, setDoctorName]     = useState("");

  // ── Transportation tab state ──
  const [stops, setStops]               = useState([""]);
  const [totalKilometer, setTotalKm]    = useState("");
  const [staffKilometer, setStaffKm]    = useState("");
  const [approvedKm, setApprovedKm]     = useState("");
  const [approvedBy, setApprovedBy]     = useState("");
  const [travelComments, setTravelComments] = useState("");
  const [uploadedReceipts, setReceipts] = useState([]);
  const [isDriving, setIsDriving]       = useState(false);
  const [watchId, setWatchId]           = useState(null);
  const [prevCoords, setPrevCoords]     = useState(null);
  const [liveDistance, setLiveDistance] = useState(0);
  const [startPoint, setStartPoint]     = useState("");
  const [endPoint, setEndPoint]         = useState("");
  const [expenses, setExpenses]         = useState([]);
  const [newExpense, setNewExpense]      = useState({ type: EXPENSE_TYPES[0], amount: "", note: "" });
  const [transSubmitting, setTransSubmitting] = useState(false);

  // ── Helpers ──
  function parseShiftDate(str) {
    if (!str) return null;
    const [day, mon, yr] = str.split(" ");
    const m = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
      .findIndex(x => x.toLowerCase() === (mon || "").slice(0, 3).toLowerCase());
    if (m === -1) return null;
    return new Date(Number(yr), m, Number(day));
  }

  const renderDate = (v) => {
    if (!v) return "—";
    if (v?.seconds) return new Date(v.seconds * 1000).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
    if (v instanceof Date) return v.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
    if (typeof v === "string") return v;
    return "—";
  };

  const resolveClientAndDate = (sd) => {
    if (!sd) return { clientId: "", startDate: null };
    const clientId = sd.clientId || sd.client || sd.clientDetails?.id || "";
    let startDate = null;
    if (sd.startDate?.toDate) startDate = sd.startDate.toDate();
    else if (typeof sd.startDate === "string") {
      const p = sd.startDate.split(" ");
      if (p.length === 3) startDate = new Date(`${p[0]} ${p[1]} ${p[2]}`);
    }
    return { clientId, startDate };
  };

  // ── Fetch shift ──
  useEffect(() => {
    if (!shiftId) return;
    (async () => {
      try {
        const snap = await getDoc(doc(db, "shifts", shiftId));
        if (snap.exists()) setShiftData(snap.data());
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, [shiftId]);

  // ── Fetch intake ──
  useEffect(() => {
    if (!shiftData?.clientId) return;
    (async () => {
      try {
        const snap = await getDoc(doc(db, "InTakeForms", shiftData.clientId));
        if (snap.exists()) setIntakeData(snap.data());
      } catch (e) { console.error(e); }
    })();
  }, [shiftData]);

  // ── Fetch client (for medication check) ──
  useEffect(() => {
    if (!shiftData) return;
    const clientId = shiftData.clientId || shiftData.client || shiftData.clientDetails?.id || "";
    if (!clientId) return;
    (async () => {
      try {
        // Try by doc ID first
        const direct = await getDoc(doc(db, "clients", clientId));
        if (direct.exists()) { setClientData(direct.data()); return; }
        // Fall back: query by userId or clientId field
        const snap = await getDocs(query(collection(db, "clients"), where("userId", "==", clientId)));
        if (!snap.empty) { setClientData(snap.docs[0].data()); return; }
        const snap2 = await getDocs(query(collection(db, "clients"), where("clientId", "==", clientId)));
        if (!snap2.empty) setClientData(snap2.docs[0].data());
      } catch (e) { console.error("clientData fetch:", e); }
    })();
  }, [shiftData]);

  // ── Fetch agency (for KM rates) ──
  useEffect(() => {
    if (!shiftData) return;
    const agencyName = shiftData.agencyName || shiftData.agency || "";
    const agencyId   = shiftData.agencyId   || "";
    if (!agencyName && !agencyId) return;
    (async () => {
      try {
        // Try by doc ID first
        if (agencyId) {
          const snap = await getDoc(doc(db, "agencies", agencyId));
          if (snap.exists()) { setAgencyData(snap.data()); return; }
        }
        // Fall back to query by name
        if (agencyName) {
          const snap = await getDocs(collection(db, "agencies"));
          snap.forEach(ds => {
            const d = ds.data();
            if ((d.name || d.agencyName || "").toLowerCase() === agencyName.toLowerCase()) {
              setAgencyData(d);
            }
          });
        }
      } catch (e) { console.error(e); }
    })();
  }, [shiftData]);

  // ── Fetch recent reports (last 24 h) ──
  useEffect(() => {
    if (!shiftData) return;
    const { clientId, startDate } = resolveClientAndDate(shiftData);
    if (!clientId || !startDate || isNaN(startDate)) return;
    const windowStart = new Date(startDate.getTime() - 24 * 60 * 60 * 1000);
    (async () => {
      try {
        const snap = await getDocs(collection(db, "shifts"));
        const list = [];
        snap.forEach(ds => {
          const d = ds.data();
          const cId = d.clientId || d.client || d.clientDetails?.id;
          if (String(cId) !== String(clientId)) return;
          let sDate = d.startDate?.toDate?.() || parseShiftDate(d.startDate);
          if (!sDate || isNaN(sDate)) return;
          if (sDate >= windowStart && sDate < startDate) {
            let rep = d.shiftReport;
            if (typeof rep === "string") { try { rep = JSON.parse(rep); } catch {} }
            list.push({ shiftId: ds.id, shiftReport: rep, staffName: d.name || "Unknown", date: sDate, clockIn: d.clockIn, clockOut: d.clockOut, service: d.typeName || d.shiftType || "Regular" });
          }
        });
        setRecentReports(list);
      } catch (e) { console.error(e); }
    })();
  }, [shiftData]);

  // ── Fetch primary staff ──
  useEffect(() => {
    if (!shiftData) return;
    (async () => {
      try {
        let ud = null;
        const ref = collection(db, "users");
        if (shiftData.userId) {
          const ds = await getDoc(doc(db, "users", shiftData.username || shiftData.userId));
          if (ds.exists()) ud = ds.data();
        }
        if (!ud && shiftData.userId) {
          const q = await getDocs(query(ref, where("userId", "==", shiftData.userId)));
          if (!q.empty) ud = q.docs[0].data();
        }
        if (!ud && shiftData.user) {
          const q = await getDocs(query(ref, where("username", "==", shiftData.user)));
          if (!q.empty) ud = q.docs[0].data();
        }
        setPrimaryStaff({
          name:     ud?.name     || shiftData.userName || shiftData.name || shiftData.user || "N/A",
          staffId:  ud?.id       || ud?.userId         || shiftData.userId || "N/A",
          category: shiftData.categoryName || shiftData.shiftCategory || "N/A",
          avatar:   ud?.profilePhotoUrl || ud?.photoURL || null,
        });
      } catch (e) { console.error(e); }
    })();
  }, [shiftData]);

  // ── Transportation prefill from shiftData ──
  useEffect(() => {
    if (!shiftData?.shiftPoints?.[0]) return;
    const sp = shiftData.shiftPoints[0];
    setStartPoint(sp.pickupAddress || "");
    setEndPoint(sp.dropAddress || "");
    setStops(sp.visitPoints?.length ? sp.visitPoints : [sp.visitPoint || ""]);
  }, [shiftData]);

  useEffect(() => {
    if (!shiftData?.extraShiftPoints?.length) return;
    const last = shiftData.extraShiftPoints[shiftData.extraShiftPoints.length - 1];
    const rawTotal = parseFloat(last.totalKilometer || last.totalKM || 0);
    const rawStaff = parseFloat(last.staffTraveledKM || last.staffKilometer || 0);
    setTotalKm(rawTotal ? String(Math.round(rawTotal)) : "");
    setStaffKm(rawStaff ? String(Math.round(rawStaff)) : "");
    setApprovedKm(String(last.approvedKM || last.approvedKm || ""));
    setApprovedBy(last.approvedBy || "");
    setTravelComments(shiftData.travelComments || "");
  }, [shiftData]);

  // ── Transportation helpers ──
  const haversineKm = (lat1, lng1, lat2, lng2) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  };

  const handleStartDrive = () => {
    if (!navigator.geolocation) return alert("Geolocation not supported.");
    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setPrevCoords({ lat, lng });
        setLiveDistance(0);
        setIsDriving(true);

        // Reverse geocode → fill Starting Point automatically
        if (window.google?.maps?.Geocoder) {
          new window.google.maps.Geocoder().geocode(
            { location: { lat, lng } },
            (res, st) => { if (st === "OK" && res[0]) setStartPoint(res[0].formatted_address); }
          );
        }

        // Start watching position for staff KM tracking
        const id = navigator.geolocation.watchPosition(
          p => {
            const { latitude: la, longitude: lo } = p.coords;
            setPrevCoords(prev => {
              if (prev) setLiveDistance(d => d + haversineKm(prev.lat, prev.lng, la, lo));
              return { lat: la, lng: lo };
            });
          },
          err => console.error(err),
          { enableHighAccuracy: true }
        );
        setWatchId(id);
      },
      err => { console.error(err); alert("Could not get your location. Please allow location access."); },
      { enableHighAccuracy: true }
    );
  };

  const handleEndDrive = () => {
    if (watchId !== null) { navigator.geolocation.clearWatch(watchId); setWatchId(null); }
    setIsDriving(false);
    // KM by Staff = actual distance physically traveled (haversine tracking)
    setStaffKm(liveDistance.toFixed(2));

    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude: lat, longitude: lng } = pos.coords;
        if (window.google?.maps?.Geocoder) {
          new window.google.maps.Geocoder().geocode(
            { location: { lat, lng } },
            (res, st) => {
              if (st === "OK" && res[0]) {
                const endAddr = res[0].formatted_address;
                setEndPoint(endAddr);
                // Total KM = Google Maps route distance (road distance, not straight-line)
                if (startPoint && window.google?.maps?.DirectionsService) {
                  new window.google.maps.DirectionsService().route(
                    { origin: startPoint, destination: endAddr, travelMode: window.google.maps.TravelMode.DRIVING },
                    (result, status) => {
                      if (status === "OK") {
                        setTotalKm((result.routes[0].legs[0].distance.value / 1000).toFixed(2));
                      } else {
                        setTotalKm(liveDistance.toFixed(2));
                      }
                    }
                  );
                } else {
                  setTotalKm(liveDistance.toFixed(2));
                }
              }
            }
          );
        } else {
          setTotalKm(liveDistance.toFixed(2));
        }
      },
      err => { console.error(err); setTotalKm(liveDistance.toFixed(2)); },
      { enableHighAccuracy: true }
    );
  };

  const handleReceiptUpload = async (e) => {
    const files = Array.from(e.target.files);
    for (const f of files) {
      try {
        const path = `shiftReceipts/${shiftId}/${Date.now()}_${f.name}`;
        const r = storageRef(storage, path);
        await uploadBytes(r, f);
        const url = await getDownloadURL(r);
        setReceipts(prev => [...prev, { url, name: f.name, path }]);
      } catch (err) { console.error(err); }
    }
  };

  const handleRemoveReceipt = (idx) => {
    setReceipts(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmitTransport = async () => {
    setTransSubmitting(true);
    try {
      const isTransportation = shiftData?.categoryName?.toLowerCase() === "transportation";
      const ref = doc(db, "shifts", shiftId);
      const receiptUrls = uploadedReceipts.map(r => (typeof r === "string" ? r : r.url));
      if (isTransportation) {
        await updateDoc(ref, {
          extraShiftPoints: arrayUnion({ stops, totalKilometer, staffTraveledKM: staffKilometer, approvedKM: approvedKm, approvedBy, createdAt: new Date().toISOString() }),
          travelComments,
          expenseReceiptUrls: receiptUrls,
        });
      } else {
        await updateDoc(ref, {
          extraShiftPoints: arrayUnion({ startLocation: startPoint, endLocation: endPoint, totalKilometer, staffTraveledKM: staffKilometer, approvedKM: approvedKm, approvedBy, createdAt: new Date().toISOString() }),
          travelComments,
          expenseReceiptUrls: receiptUrls,
        });
      }
      alert("Transportation log submitted!");
    } catch (e) {
      console.error(e);
      alert("Failed to submit. Please try again.");
    } finally {
      setTransSubmitting(false);
    }
  };

  // ── Loading / not found ──
  if (loading) return (
    <div className="flex items-center justify-center h-64" style={FONT}>
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-green-700 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p style={{ fontSize: 14, color: "#6b7280" }}>Loading shift data…</p>
      </div>
    </div>
  );
  if (!shiftData) return (
    <div className="flex items-center justify-center h-64" style={FONT}>
      <p style={{ fontSize: 14, color: "#dc2626" }}>Shift not found</p>
    </div>
  );

  // ── Normalise ──
  const statusVal = shiftData.clockIn && shiftData.clockOut ? "Completed" : shiftData.clockIn ? "Ongoing" : "Incomplete";
  const sc = {
    Completed:  { bg: "#f0fdf4", text: "#15803d", dot: "#16a34a" },
    Ongoing:    { bg: "#fef3c7", text: "#b45309", dot: "#f59e0b" },
    Incomplete: { bg: "#f3f4f6", text: "#6b7280", dot: "#9ca3af" },
  }[statusVal];

  const normalized = {
    clientId:    shiftData.clientId   || shiftData.client   || shiftData.clientDetails?.id   || "N/A",
    clientName:  shiftData.clientName || shiftData.clientDetails?.name || "N/A",
    dob:         shiftData.dob        || "N/A",
    avatar:      shiftData.clientAvatar || null,
    category:    shiftData.categoryName || shiftData.category || shiftData.shiftCategory || "N/A",
    serviceType: shiftData.serviceType  || intakeData?.serviceType || shiftData.typeName  || "N/A",
    agency:      shiftData.agencyName   || intakeData?.agencyName  || shiftData.agency    || "N/A",
    startDate:   shiftData.startDate    || null,
    displayDate: renderDate(shiftData.startDate),
    startTime:   shiftData.startTime    || "—",
    endTime:     shiftData.endTime      || "—",
    clockIn:     shiftData.clockIn      || null,
    clockOut:    shiftData.clockOut     || null,
    statusVal,
  };

  const initials = normalized.clientName.split(" ").filter(Boolean).map(n => n[0]).join("").slice(0, 2).toUpperCase() || "?";
  const staffInitials = (primaryStaff?.name || "?").split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();

  // Parse clockIn/Out — handles ISO timestamps and HH:mm strings
  const parseClockTime = (val) => {
    if (!val) return null;
    // ISO timestamp
    if (val.includes("T") || val.includes("Z")) {
      const d = new Date(val);
      return isNaN(d) ? null : d;
    }
    // HH:mm string
    const [h, m] = val.split(":").map(Number);
    if (isNaN(h)) return null;
    const d = new Date(); d.setHours(h, m || 0, 0, 0);
    return d;
  };

  const formatClockDisplay = (val) => {
    const d = parseClockTime(val);
    if (!d) return "—";
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  };

  const computeDuration = () => {
    const s = parseClockTime(normalized.clockIn);
    const e = parseClockTime(normalized.clockOut);
    if (!s || !e) return "—";
    const diffMs = e - s;
    if (diffMs <= 0) return "—";
    const totalMin = Math.floor(diffMs / 60000);
    return `${Math.floor(totalMin / 60)}h ${totalMin % 60}m`;
  };

  const duration = computeDuration();

  // Shift timeline bar percent
  const toMinutesOfDay = (val) => {
    const d = parseClockTime(val);
    if (!d) return null;
    return d.getHours() * 60 + d.getMinutes();
  };
  const clockInMins  = toMinutesOfDay(normalized.clockIn);
  const clockOutMins = toMinutesOfDay(normalized.clockOut);
  const barLeft  = clockInMins  != null ? `${(clockInMins / 1440) * 100}%`  : "37.5%";
  const barWidth = (clockInMins != null && clockOutMins != null) ? `${((clockOutMins - clockInMins) / 1440) * 100}%` : "25%";

  const hasMedication = Array.isArray(clientData?.medications) &&
    clientData.medications.some((m) => m.medicationName?.trim());

  const shiftCategoryName = (shiftData?.categoryName || shiftData?.shiftCategory || "").toLowerCase();
  const hasTransportation =
    shiftCategoryName.includes("transport") ||
    shiftCategoryName.includes("supervised") ||
    shiftCategoryName.includes("visitation");

  const TABS = [
    { key: "reports",        label: "Reports"        },
    ...(hasMedication ? [{ key: "medications", label: "Medications" }] : []),
    ...(hasTransportation ? [{ key: "transportation", label: "Transportation" }] : []),
  ];

  const actBg   = { success: "#f0fdf4", info: "#eff6ff", warning: "#fef3c7" };
  const actIcon = { success: "#16a34a", info: "#2563eb",  warning: "#d97706" };

  return (
    <div className="h-full flex flex-col" style={{ ...FONT, gap: 0 }}>

      {/* ── Modals ── */}
      {showFullReport && <FullReportModal shiftData={shiftData} normalized={normalized} primaryStaff={primaryStaff} onClose={() => setShowFullReport(false)} />}
      {activeModal === "critical"     && <CriticalIncidentForm   onCancel={() => setActiveModal(null)} onSuccess={() => setActiveModal(null)} user={user} />}
      {activeModal === "medical"      && <MedicalLogForm         onCancel={() => setActiveModal(null)} onSuccess={() => setActiveModal(null)} shiftData={shiftData} user={user} />}
      {activeModal === "noteworthy"   && <NoteworthyIncidentForm onCancel={() => setActiveModal(null)} onSuccess={() => setActiveModal(null)} />}
      {activeModal === "followthrough"&& <FollowThroughForm      onCancel={() => setActiveModal(null)} onSuccess={() => setActiveModal(null)} />}

      {/* ── Page Header ── */}
      <div className="flex items-center justify-between flex-shrink-0 mb-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border font-semibold transition-all hover:bg-white"
            style={{ borderColor: "#e5e7eb", fontSize: 13, color: "#374151" }}>
            <ArrowLeft size={15} /> Back
          </button>
          <div>
            <h1 className="font-bold" style={{ fontSize: 20, color: "#111827", letterSpacing: "-0.01em" }}>Client Report</h1>
            <p style={{ fontSize: 12, color: "#6b7280" }}>Daily records for {normalized.clientName}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 px-3.5 py-2 rounded-lg font-semibold border transition-all hover:bg-white"
            style={{ borderColor: "#e5e7eb", fontSize: 12, color: "#374151" }}>
            <Download size={14} /> Download PDF
          </button>
          <button className="flex items-center gap-2 px-3.5 py-2 rounded-lg font-semibold text-white transition-all hover:opacity-90"
            style={{ backgroundColor: "#145228", fontSize: 12 }}>
            <Edit size={14} /> Edit Report
          </button>
        </div>
      </div>

      {/* ── Compact Client Bar ── */}
      <div className="bg-white rounded-xl border flex items-center gap-4 px-5 py-3 flex-shrink-0 mb-3"
        style={{ borderColor: "#e5e7eb", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
        <div className="flex items-center gap-3 flex-shrink-0">
          {normalized.avatar
            ? <img src={normalized.avatar} className="rounded-full" style={{ width: 40, height: 40, objectFit: "cover" }} />
            : <div className="rounded-full flex items-center justify-center text-white font-bold"
                style={{ width: 40, height: 40, background: "linear-gradient(135deg,#145228,#1f7a3c)", fontSize: 15 }}>{initials}</div>
          }
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold" style={{ fontSize: 14, color: "#111827" }}>{normalized.clientName}</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold"
                style={{ fontSize: 10, background: sc.bg, color: sc.text }}>
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: sc.dot, display: "inline-block" }} />{statusVal}
              </span>
            </div>
            <span className="font-mono" style={{ fontSize: 11, color: "#9ca3af" }}>{normalized.clientId}</span>
          </div>
        </div>

        <div style={{ width: 1, height: 36, background: "#f3f4f6", flexShrink: 0 }} />

        <div className="flex items-center gap-6 flex-1 flex-wrap">
          {[
            { icon: <User size={12} style={{ color: "#145228" }} />,    label: "Assigned Staff", value: primaryStaff?.name || "—", bg: "#f0fdf4" },
            { icon: <FileText size={12} style={{ color: "#2563eb" }} />, label: "Service Type",   value: normalized.serviceType,   bg: "#eff6ff" },
            { icon: <Clock size={12} style={{ color: "#7c3aed" }} />,    label: "Shift Type",     value: normalized.category,      bg: "#faf5ff" },
            { icon: <MapPin size={12} style={{ color: "#ea580c" }} />,   label: "Agency",         value: normalized.agency,        bg: "#fff7ed" },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="rounded-md flex items-center justify-center flex-shrink-0" style={{ width: 26, height: 26, background: item.bg }}>{item.icon}</div>
              <div>
                <p style={{ fontSize: 10, color: "#9ca3af", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>{item.label}</p>
                <p style={{ fontSize: 12, color: "#111827", fontWeight: 600 }}>{item.value}</p>
              </div>
            </div>
          ))}
        </div>

        <div style={{ width: 1, height: 36, background: "#f3f4f6", flexShrink: 0 }} />
        <div className="flex items-center gap-2 flex-shrink-0">
          <button className="flex items-center justify-center rounded-lg border transition-all hover:bg-gray-50" style={{ width: 30, height: 30, borderColor: "#e5e7eb" }}><Phone size={13} style={{ color: "#6b7280" }} /></button>
          <button className="flex items-center justify-center rounded-lg border transition-all hover:bg-gray-50" style={{ width: 30, height: 30, borderColor: "#e5e7eb" }}><Mail size={13} style={{ color: "#6b7280" }} /></button>
        </div>
      </div>

      {/* ── Main 2-Column Grid ── */}
      <div className="flex-1 overflow-hidden grid gap-4" style={{ gridTemplateColumns: "1fr 272px" }}>

        {/* ── LEFT COLUMN ── */}
        <div className="overflow-auto flex flex-col gap-4 pr-0.5">

          {/* ★ TODAY'S SHIFT REPORT CARD ★ */}
          <div className="bg-white rounded-xl border border-[#e5e7eb] flex-shrink-0" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>

            {/* Card Header */}
            <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b" style={{ borderColor: "#f3f4f6" }}>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg" style={{ background: "#f0fdf4" }}><Clipboard size={15} style={{ color: "#145228" }} /></div>
                <div>
                  <h3 className="font-bold" style={{ fontSize: 15, color: "#111827" }}>Today's Shift Report</h3>
                  <p style={{ fontSize: 11, color: "#9ca3af" }}>{normalized.displayDate} · {normalized.startTime} – {normalized.endTime}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-semibold"
                  style={{ fontSize: 11, background: sc.bg, color: sc.text }}>
                  <CheckCircle size={11} /> {statusVal}
                </span>
                <button onClick={() => setShowFullReport(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold text-white transition-all hover:opacity-90"
                  style={{ fontSize: 11, background: "#145228" }}>
                  <FileText size={12} /> View Full Report
                </button>
              </div>
            </div>

            {/* Tab Bar */}
            <div className="flex border-b px-5 gap-0" style={{ borderColor: "#f3f4f6" }}>
              {TABS.map(t => (
                <button key={t.key} onClick={() => setActiveTab(t.key)}
                  className="relative py-2.5 px-4 font-semibold transition-colors"
                  style={{
                    fontSize: 13,
                    color: activeTab === t.key ? "#145228" : "#9ca3af",
                    borderBottom: activeTab === t.key ? "2px solid #145228" : "2px solid transparent",
                    marginBottom: -1,
                  }}>
                  {t.label}
                </button>
              ))}
            </div>

            {/* ── Reports Tab ── */}
            {activeTab === "reports" && (
              <div className="px-5 py-4">
                {/* 4 KPI cards */}
                <div className="grid grid-cols-4 gap-3 mb-4">
                  {[
                    { label: "Clock In",  value: formatClockDisplay(normalized.clockIn),  sub: "Start time",   color: "#145228", bg: "#f0fdf4" },
                    { label: "Clock Out", value: formatClockDisplay(normalized.clockOut), sub: "End time",     color: "#dc2626", bg: "#fef2f2" },
                    { label: "Duration",  value: duration,                                 sub: "Total hours",  color: "#374151", bg: "#f9fafb" },
                    { label: "Status",    value: statusVal,                                sub: "Report filed", color: sc.text,   bg: sc.bg    },
                  ].map((kpi, i) => (
                    <div key={i} className="rounded-xl p-3.5 border" style={{ background: kpi.bg, borderColor: "#f3f4f6" }}>
                      <p style={{ fontSize: 10, color: "#9ca3af", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>{kpi.label}</p>
                      <p className="font-bold" style={{ fontSize: 18, color: kpi.color, lineHeight: 1 }}>{kpi.value}</p>
                      <p style={{ fontSize: 10, color: "#9ca3af", marginTop: 3 }}>{kpi.sub}</p>
                    </div>
                  ))}
                </div>

                {/* Admin: Edit Clock In / Out */}
                {!editingClock ? (
                  <div className="flex justify-end mb-3">
                    <button
                      onClick={() => {
                        const toInputVal = (val) => {
                          const d = parseClockTime(val);
                          if (!d) return "";
                          return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
                        };
                        setEditClockIn(toInputVal(normalized.clockIn));
                        setEditClockOut(toInputVal(normalized.clockOut));
                        setEditingClock(true);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all hover:bg-gray-50"
                      style={{ borderColor: "#e5e7eb", color: "#374151" }}
                    >
                      <Edit size={12} strokeWidth={2} />
                      Edit Clock In / Out
                    </button>
                  </div>
                ) : (
                  <div className="rounded-xl border p-4 mb-3" style={{ borderColor: "#e5e7eb", background: "#fafafa" }}>
                    <p className="font-semibold mb-3" style={{ fontSize: 13, color: "#111827" }}>Adjust Clock In / Clock Out</p>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div>
                        <label className="block text-xs font-semibold mb-1" style={{ color: "#6b7280" }}>CLOCK IN</label>
                        <input type="time" value={editClockIn} onChange={(e) => setEditClockIn(e.target.value)}
                          className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none"
                          style={{ borderColor: "#e5e7eb", color: "#111827" }} />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold mb-1" style={{ color: "#6b7280" }}>CLOCK OUT</label>
                        <input type="time" value={editClockOut} onChange={(e) => setEditClockOut(e.target.value)}
                          className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none"
                          style={{ borderColor: "#e5e7eb", color: "#111827" }} />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 justify-end">
                      <button onClick={() => setEditingClock(false)}
                        className="px-3 py-1.5 rounded-lg border text-xs font-semibold hover:bg-gray-100"
                        style={{ borderColor: "#e5e7eb", color: "#6b7280" }}>
                        Cancel
                      </button>
                      <button
                        disabled={clockSaving}
                        onClick={async () => {
                          if (!shiftId) return;
                          setClockSaving(true);
                          try {
                            const toISO = (timeStr) => {
                              if (!timeStr) return null;
                              const base = shiftData?.startDate?.toDate?.() || new Date();
                              const [h, m] = timeStr.split(":").map(Number);
                              const d = new Date(base);
                              d.setHours(h, m, 0, 0);
                              return d.toISOString();
                            };
                            const updates = {};
                            if (editClockIn)  updates.clockIn  = toISO(editClockIn);
                            if (editClockOut) updates.clockOut = toISO(editClockOut);
                            await updateDoc(doc(db, "shifts", shiftId), updates);
                            setShiftData((prev) => ({ ...prev, ...updates }));
                            setEditingClock(false);
                          } catch (e) {
                            console.error("Failed to save clock times:", e);
                          } finally {
                            setClockSaving(false);
                          }
                        }}
                        className="px-4 py-1.5 rounded-lg text-white text-xs font-semibold transition-opacity hover:opacity-90"
                        style={{ background: "#145228" }}
                      >
                        {clockSaving ? "Saving…" : "Save Changes"}
                      </button>
                    </div>
                  </div>
                )}

                {/* Staff row with timeline */}
                <div className="flex items-center gap-4 p-3.5 rounded-xl mb-4" style={{ background: "#fafafa", border: "1px solid #f3f4f6" }}>
                  <div className="rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
                    style={{ width: 36, height: 36, background: "linear-gradient(135deg,#4338ca,#6366f1)", fontSize: 13 }}>
                    {staffInitials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="font-semibold" style={{ fontSize: 13, color: "#111827" }}>{primaryStaff?.name || "—"}</p>
                      <span className="px-1.5 py-0.5 rounded-md font-semibold" style={{ fontSize: 10, background: "#e0e7ff", color: "#4338ca" }}>{normalized.category}</span>
                    </div>
                    <p style={{ fontSize: 11, color: "#6b7280" }}>{normalized.serviceType} · {normalized.agency}</p>
                  </div>
                  <div className="flex-shrink-0" style={{ width: 200 }}>
                    <div className="flex items-center justify-between mb-1">
                      <span style={{ fontSize: 10, color: "#9ca3af" }}>{formatClockDisplay(normalized.clockIn)}</span>
                      <span style={{ fontSize: 10, color: "#9ca3af" }}>{formatClockDisplay(normalized.clockOut)}</span>
                    </div>
                    <div className="relative rounded-full overflow-hidden" style={{ height: 7, background: "#f3f4f6" }}>
                      <div className="absolute top-0 rounded-full"
                        style={{ left: barLeft, width: barWidth, height: "100%", background: "linear-gradient(90deg,#145228,#1f7a3c)" }} />
                    </div>
                  </div>
                </div>

                {/* Shift Notes */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold" style={{ fontSize: 13, color: "#111827" }}>Shift Notes</h4>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold"
                      style={{ fontSize: 10, background: shiftData?.shiftReport ? "#f0fdf4" : "#fef3c7", color: shiftData?.shiftReport ? "#15803d" : "#b45309" }}>
                      {shiftData?.shiftReport ? <><CheckCircle size={9} /> Report Filed</> : <><AlertCircle size={9} /> Pending</>}
                    </span>
                  </div>
                  <div className="rounded-xl p-4" style={{ background: "#f9fafb", border: "1px solid #f3f4f6" }}>
                    <p style={{ fontSize: 13, color: "#374151", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
                      {shiftData?.shiftReport || "No shift report has been filed for this shift yet."}
                    </p>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2 mt-4 pt-4 border-t" style={{ borderColor: "#f3f4f6" }}>
                  <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-semibold transition-all hover:bg-red-50 hover:border-red-200"
                    style={{ fontSize: 12, color: "#374151", borderColor: "#e5e7eb" }}>
                    <Flag size={12} style={{ color: "#dc2626" }} /> Flag Issue
                  </button>
                  <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-semibold transition-all hover:bg-gray-50"
                    style={{ fontSize: 12, color: "#374151", borderColor: "#e5e7eb" }}>
                    <MessageSquare size={12} /> Add Note
                  </button>
                  <button onClick={() => setShowFullReport(true)}
                    className="ml-auto flex items-center gap-1.5 px-4 py-1.5 rounded-lg font-semibold text-white transition-all hover:opacity-90"
                    style={{ fontSize: 12, background: "#145228" }}>
                    <FileText size={12} /> View Full Report
                  </button>
                </div>
              </div>
            )}

            {/* ── Medications Tab ── */}
            {activeTab === "medications" && (() => {
              const shiftDate = shiftData.startDate?.toDate?.() || (typeof shiftData.startDate === "string" ? new Date(shiftData.startDate) : new Date());
              const calYear = isNaN(shiftDate) ? new Date().getFullYear() : shiftDate.getFullYear();
              const calMonth = isNaN(shiftDate) ? new Date().getMonth() : shiftDate.getMonth();
              const firstDay = new Date(calYear, calMonth, 1).getDay();
              const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
              const monthLabel = (isNaN(shiftDate) ? new Date() : shiftDate).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
              const meds = intakeData?.medications || intakeData?.prescribedMeds || [];
              const calCells = [];
              for (let i = 0; i < firstDay; i++) calCells.push(null);
              for (let d = 1; d <= daysInMonth; d++) calCells.push(d);
              const inp = "w-full bg-[#f3f3f5] border border-[#e6e6e6] rounded-lg px-3 py-2.5 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:border-[#145228] focus:bg-white transition-colors";
              return (
                <div className="px-5 space-y-5 py-4">
                  {showAddMed && selectedMedDay && (
                    <AddMedModal day={selectedMedDay} onClose={() => { setShowAddMed(false); setSelMedDay(null); }}
                      onSubmit={(day, name) => { setCalEntries(prev => ({ ...prev, [day]: [...(prev[day] || []), { name }] })); setShowAddMed(false); setSelMedDay(null); }} />
                  )}

                  {/* MAR Header */}
                  <div className="rounded-xl border p-4" style={{ borderColor: "#e5e7eb", background: "#fafafa" }}>
                    <p className="font-bold mb-3" style={{ fontSize: 14, color: "#111827" }}>Medication Administration Record (MAR)</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div><label className="block mb-1" style={{ fontSize: 12, color: "#6b7280", fontWeight: 600 }}>Client Name</label><input className={inp} value={normalized.clientName} readOnly /></div>
                      <div><label className="block mb-1" style={{ fontSize: 12, color: "#6b7280", fontWeight: 600 }}>Month / Year</label><input className={inp} value={monthLabel} readOnly /></div>
                      <div><label className="block mb-1" style={{ fontSize: 12, color: "#6b7280", fontWeight: 600 }}>ACH #</label><input className={inp} placeholder="ACH Number" value={achNum} onChange={e => setAchNum(e.target.value)} /></div>
                      <div><label className="block mb-1" style={{ fontSize: 12, color: "#6b7280", fontWeight: 600 }}>Doctor's Name</label><input className={inp} placeholder="Doctor's name" value={doctorName} onChange={e => setDoctorName(e.target.value)} /></div>
                    </div>
                  </div>

                  {/* Meds table */}
                  {meds.length > 0 && (
                    <div className="rounded-xl border overflow-hidden" style={{ borderColor: "#e5e7eb" }}>
                      <div className="px-4 py-3 border-b" style={{ borderColor: "#f3f4f6", background: "#fafafa" }}>
                        <p className="font-bold" style={{ fontSize: 13, color: "#111827" }}>Medication Timing & Type</p>
                      </div>
                      <table className="w-full">
                        <thead>
                          <tr style={{ background: "#f9fafb" }}>
                            {["Medication","Dosage","Route","Frequency","Time"].map(h => (
                              <th key={h} className="text-left px-4 py-2 font-semibold border-b" style={{ fontSize: 11, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em", borderColor: "#f3f4f6" }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {meds.map((m, i) => (
                            <tr key={i} className="border-b last:border-0 hover:bg-gray-50" style={{ borderColor: "#f9fafb" }}>
                              <td className="px-4 py-2.5"><span className="font-semibold" style={{ fontSize: 12, color: "#111827" }}>{m.name || m.medicationName || "—"}</span></td>
                              <td className="px-4 py-2.5"><span style={{ fontSize: 12, color: "#374151" }}>{m.dosage || "—"}</span></td>
                              <td className="px-4 py-2.5"><span style={{ fontSize: 12, color: "#374151" }}>{m.route || "Oral"}</span></td>
                              <td className="px-4 py-2.5"><span style={{ fontSize: 12, color: "#374151" }}>{m.frequency || "Daily"}</span></td>
                              <td className="px-4 py-2.5"><span style={{ fontSize: 12, color: "#374151" }}>{m.time || "—"}</span></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Calendar */}
                  <div className="rounded-xl border overflow-hidden" style={{ borderColor: "#e5e7eb" }}>
                    <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: "#f3f4f6", background: "#fafafa" }}>
                      <p className="font-bold" style={{ fontSize: 13, color: "#111827" }}>Monthly Administration Calendar</p>
                      <span style={{ fontSize: 12, color: "#9ca3af" }}>{monthLabel}</span>
                    </div>
                    <div className="p-4">
                      <div className="grid grid-cols-7 gap-1 mb-2">
                        {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => (
                          <div key={d} className="text-center font-semibold" style={{ fontSize: 10, color: "#9ca3af" }}>{d}</div>
                        ))}
                      </div>
                      <div className="grid grid-cols-7 gap-1">
                        {calCells.map((day, i) => (
                          <div key={i} className="relative group rounded-lg border min-h-[52px] p-1"
                            style={{ borderColor: day ? "#f3f4f6" : "transparent", background: day ? (calEntries[day]?.length ? "#f0fdf4" : "#fafafa") : "transparent", cursor: day ? "pointer" : "default" }}
                            onClick={() => { if (day) { setSelMedDay(day); setShowAddMed(true); } }}>
                            {day && <>
                              <p className="font-bold" style={{ fontSize: 11, color: "#111827", lineHeight: 1 }}>{day}</p>
                              {(calEntries[day] || []).map((e, ei) => (
                                <div key={ei} className="group/entry relative mt-0.5 rounded px-1 flex items-center justify-between gap-0.5"
                                  style={{ fontSize: 9, background: "#d1fae5", color: "#065f46" }}>
                                  <span className="truncate">{e.name}</span>
                                  <button
                                    onClick={ev => { ev.stopPropagation(); setCalEntries(prev => ({ ...prev, [day]: (prev[day] || []).filter((_, xi) => xi !== ei) })); }}
                                    className="flex-shrink-0 opacity-0 group-hover/entry:opacity-100 transition-opacity rounded"
                                    style={{ color: "#dc2626" }} title="Remove">
                                    <X size={8} strokeWidth={2.5} />
                                  </button>
                                </div>
                              ))}
                              <div className="absolute inset-0 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: "rgba(20,82,40,0.08)" }}>
                                <Plus size={14} style={{ color: "#145228" }} />
                              </div>
                            </>}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Bottom 3-column grid */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="rounded-xl border p-4" style={{ borderColor: "#e5e7eb" }}>
                      <p className="font-bold mb-3" style={{ fontSize: 13, color: "#111827" }}>Administration Codes</p>
                      {[["A","Administered"],["D","Declined"],["H","Hold"],["S","Self-Admin"],["NA","Not Available"]].map(([code, desc]) => (
                        <div key={code} className="flex items-center gap-2 mb-1.5">
                          <span className="rounded px-1.5 py-0.5 font-bold font-mono flex-shrink-0" style={{ fontSize: 10, background: "#f0fdf4", color: "#145228", minWidth: 24, textAlign: "center" }}>{code}</span>
                          <span style={{ fontSize: 11, color: "#6b7280" }}>{desc}</span>
                        </div>
                      ))}
                    </div>
                    <div className="rounded-xl border p-4" style={{ borderColor: "#e5e7eb" }}>
                      <p className="font-bold mb-3" style={{ fontSize: 13, color: "#111827" }}>Pharmacy Information</p>
                      {[
                        { label: "Pharmacy", value: intakeData?.pharmacyName || "—" },
                        { label: "Phone",    value: intakeData?.pharmacyPhone || "—" },
                        { label: "Address",  value: intakeData?.pharmacyAddress || "—" },
                      ].map((f, i) => (
                        <div key={i} className="mb-2">
                          <p style={{ fontSize: 10, color: "#9ca3af", fontWeight: 600, textTransform: "uppercase" }}>{f.label}</p>
                          <p style={{ fontSize: 12, color: "#374151", fontWeight: 500 }}>{f.value}</p>
                        </div>
                      ))}
                    </div>
                    <div className="rounded-xl border p-4" style={{ borderColor: "#e5e7eb" }}>
                      <p className="font-bold mb-3" style={{ fontSize: 13, color: "#111827" }}>Authorization (Trained)</p>
                      <div className="space-y-2">
                        <div><label className="block mb-1" style={{ fontSize: 11, color: "#6b7280", fontWeight: 600 }}>Staff Name</label>
                          <input className="w-full bg-[#f3f3f5] border border-[#e6e6e6] rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-[#145228] focus:bg-white transition-colors" placeholder="Your name" value={authName} onChange={e => setAuthName(e.target.value)} /></div>
                        <div><label className="block mb-1" style={{ fontSize: 11, color: "#6b7280", fontWeight: 600 }}>Credentials</label>
                          <input className="w-full bg-[#f3f3f5] border border-[#e6e6e6] rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-[#145228] focus:bg-white transition-colors" placeholder="RN, LPN, etc." value={authCreds} onChange={e => setAuthCreds(e.target.value)} /></div>
                      </div>
                    </div>
                  </div>

                  {/* Export / Submit */}
                  <div className="flex justify-end gap-3">
                    <button className="px-4 py-2 rounded-lg border font-semibold text-sm hover:bg-gray-50" style={{ borderColor: "#e5e7eb", color: "#374151" }}>Export MAR</button>
                    <button className="px-5 py-2 rounded-lg font-semibold text-sm text-white hover:opacity-90" style={{ background: "#145228" }}>Submit Record</button>
                  </div>
                </div>
              );
            })()}

            {/* ── Transportation Tab ── */}
            {activeTab === "transportation" && (() => {
              const isTransportation = shiftData?.categoryName?.toLowerCase() === "transportation";
              const inp = "w-full bg-[#f3f3f5] border border-[#e6e6e6] rounded-lg px-3 py-2.5 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:border-[#145228] focus:bg-white transition-colors";
              return (
                <div className="px-5 space-y-5 py-4">
                  {/* Info strip */}
                  <div className="flex flex-wrap items-center gap-6 p-3 rounded-xl" style={{ background: "#f9fafb", border: "1px solid #f3f4f6" }}>
                    {[
                      { label: "Date",       value: normalized.displayDate },
                      { label: "Staff",      value: primaryStaff?.name || "—" },
                      { label: "Staff ID",   value: primaryStaff?.staffId || "—" },
                      { label: "Client",     value: normalized.clientName },
                      { label: "Shift Time", value: `${normalized.startTime} – ${normalized.endTime}` },
                    ].map((f, i) => (
                      <div key={i}><span className="font-semibold" style={{ fontSize: 11, color: "#6b7280" }}>{f.label}: </span><span className="font-bold" style={{ fontSize: 12, color: "#111827" }}>{f.value}</span></div>
                    ))}
                  </div>

                  {/* Shift Transportation Info (read-only from shift data) */}
                  {(() => {
                    const sp = shiftData?.shiftPoints?.[0] || shiftData?.clientDetails?.shiftPoints?.[0] || {};
                    const pickupLoc      = sp.pickupLocation   || shiftData?.pickupLocation   || "N/A";
                    const pickupTime     = sp.pickupTime       || shiftData?.pickupTime       || "N/A";
                    const pickedUpTime   = sp.pickedUpTime     || shiftData?.pickedUpTime     || "N/A";
                    const pickedUpLoc    = sp.pickedUpLocation || shiftData?.pickedUpLocation || "N/A";
                    const visitLoc       = sp.visitLocation    || shiftData?.visitLocation    || "N/A";
                    const visitStartTime = sp.visitStartTime   || shiftData?.visitStartOfficialTime || "N/A";
                    const visitEndTime   = sp.visitEndTime     || shiftData?.visitEndOfficialTime   || "N/A";
                    const dropLoc        = sp.dropLocation     || shiftData?.dropLocation     || "N/A";
                    const dropTime       = sp.dropTime         || shiftData?.dropTime         || "N/A";

                    const mapLink = (addr) => addr && addr !== "N/A"
                      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}`
                      : null;

                    const Field = ({ label, value, mapUrl }) => (
                      <div>
                        <p style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600, textTransform: "uppercase" }}>{label}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className="font-semibold" style={{ fontSize: 13, color: value === "N/A" ? "#9ca3af" : "#111827" }}>{value}</p>
                          {mapUrl && (
                            <a href={mapUrl} target="_blank" rel="noreferrer"
                              className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-white font-semibold flex-shrink-0"
                              style={{ fontSize: 10, background: "#1f7a3c" }}>
                              <MapPin size={10} /> Map
                            </a>
                          )}
                        </div>
                      </div>
                    );

                    return (
                      <div className="rounded-xl border p-4 space-y-4" style={{ borderColor: "#e5e7eb", background: "#f9fafb" }}>
                        <p className="font-bold" style={{ fontSize: 13, color: "#2b3232" }}>Transport Information</p>

                        {/* Pickup */}
                        <div>
                          <p className="font-semibold mb-2" style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>Pickup</p>
                          <div className="grid grid-cols-2 gap-3">
                            <Field label="Pickup Time" value={pickupTime} />
                            <Field label="Pickup Location" value={pickupLoc} mapUrl={mapLink(pickupLoc)} />
                            <Field label="Picked Up Time (Actual)" value={pickedUpTime} />
                            <Field label="Picked Up Location (Actual)" value={pickedUpLoc} mapUrl={mapLink(pickedUpLoc)} />
                          </div>
                        </div>

                        <hr style={{ borderColor: "#e5e7eb" }} />

                        {/* Visit */}
                        <div>
                          <p className="font-semibold mb-2" style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>Visit</p>
                          <div className="grid grid-cols-2 gap-3">
                            <Field label="Visit Location" value={visitLoc} mapUrl={mapLink(visitLoc)} />
                            <div />
                            <Field label="Visit Start Time" value={visitStartTime} />
                            <Field label="Visit End Time" value={visitEndTime} />
                          </div>
                        </div>

                        <hr style={{ borderColor: "#e5e7eb" }} />

                        {/* Drop Off */}
                        <div>
                          <p className="font-semibold mb-2" style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>Drop Off</p>
                          <div className="grid grid-cols-2 gap-3">
                            <Field label="Drop Off Location" value={dropLoc} mapUrl={mapLink(dropLoc)} />
                            <Field label="Drop Off Time" value={dropTime} />
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* KM by Staff */}
                  <div style={{ maxWidth: 300 }}>
                    <label className="font-bold mb-1 block" style={{ fontSize: 13, color: "#2b3232" }}>KM Traveled by Staff</label>
                    <input className={inp} placeholder="0.00" value={staffKilometer} onChange={e => setStaffKm(e.target.value)} />
                  </div>

                  {/* Approved KM + By */}
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="font-bold mb-1 block" style={{ fontSize: 13, color: "#2b3232" }}>Approved KM</label>
                      <input className={inp} placeholder="0.00" value={approvedKm} onChange={e => setApprovedKm(e.target.value)} /></div>
                    <div><label className="font-bold mb-1 block" style={{ fontSize: 13, color: "#2b3232" }}>Approved By</label>
                      <input className={inp} placeholder="Manager name" value={approvedBy} onChange={e => setApprovedBy(e.target.value)} /></div>
                  </div>

                  {/* External Expenses */}
                  <div>
                    <label className="font-bold mb-3 block" style={{ fontSize: 13, color: "#2b3232" }}>External Expenses</label>
                    <div className="flex gap-2 mb-3 flex-wrap">
                      <select className={inp} style={{ maxWidth: 180 }} value={newExpense.type} onChange={e => setNewExpense(p => ({ ...p, type: e.target.value }))}>
                        {EXPENSE_TYPES.map(t => <option key={t}>{t}</option>)}
                      </select>
                      <input className={inp} placeholder="Amount ($)" value={newExpense.amount} onChange={e => setNewExpense(p => ({ ...p, amount: e.target.value }))} style={{ maxWidth: 120 }} />
                      <input className={inp} placeholder="Note (optional)" value={newExpense.note} onChange={e => setNewExpense(p => ({ ...p, note: e.target.value }))} />
                      <button onClick={() => { if (newExpense.amount) { setExpenses(prev => [...prev, { ...newExpense }]); setNewExpense({ type: EXPENSE_TYPES[0], amount: "", note: "" }); } }}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg font-semibold text-white flex-shrink-0 hover:opacity-90" style={{ background: "#145228", fontSize: 12 }}>
                        <Plus size={13} /> Add
                      </button>
                    </div>
                    {expenses.length > 0 && (
                      <table className="w-full rounded-xl overflow-hidden border" style={{ borderColor: "#e5e7eb" }}>
                        <thead>
                          <tr style={{ background: "#f9fafb" }}>
                            {["Type","Amount","Note",""].map(h => (
                              <th key={h} className="text-left px-3 py-2 font-semibold border-b" style={{ fontSize: 10, color: "#9ca3af", textTransform: "uppercase", borderColor: "#f3f4f6" }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {expenses.map((ex, i) => (
                            <tr key={i} className="border-b last:border-0" style={{ borderColor: "#f9fafb" }}>
                              <td className="px-3 py-2" style={{ fontSize: 12, color: "#374151" }}>{ex.type}</td>
                              <td className="px-3 py-2 font-semibold" style={{ fontSize: 12, color: "#111827" }}>${ex.amount}</td>
                              <td className="px-3 py-2" style={{ fontSize: 12, color: "#6b7280" }}>{ex.note || "—"}</td>
                              <td className="px-3 py-2">
                                <button onClick={() => setExpenses(prev => prev.filter((_, xi) => xi !== i))} className="p-1 rounded hover:bg-red-50">
                                  <X size={12} style={{ color: "#dc2626" }} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>

                  {/* Travel Comments */}
                  <div>
                    <label className="font-bold mb-1 block" style={{ fontSize: 13, color: "#2b3232" }}>Travel Comments</label>
                    <textarea className={inp + " resize-none"} rows={3} placeholder="Add any comments about the journey…" value={travelComments} onChange={e => setTravelComments(e.target.value)} />
                  </div>

                  {/* Upload Receipt */}
                  <div>
                    <label className="font-bold mb-2 block" style={{ fontSize: 13, color: "#2b3232" }}>Upload Receipt</label>
                    <label className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 cursor-pointer hover:bg-gray-50 transition-colors" style={{ borderColor: "#d1d5db" }}>
                      <Upload size={20} style={{ color: "#9ca3af" }} />
                      <span style={{ fontSize: 12, color: "#6b7280" }}>Click to upload or drag and drop receipts</span>
                      <input type="file" multiple accept="image/*,application/pdf" className="hidden" onChange={handleReceiptUpload} />
                    </label>
                    {uploadedReceipts.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {uploadedReceipts.map((rec, i) => {
                          const url  = typeof rec === "string" ? rec : rec.url;
                          const name = typeof rec === "string" ? `Receipt ${i + 1}` : (rec.name || `Receipt ${i + 1}`);
                          return (
                            <div key={i} className="flex items-center gap-2 p-2 rounded-lg border" style={{ borderColor: "#e5e7eb" }}>
                              <Receipt size={13} style={{ color: "#145228" }} />
                              <a href={url} target="_blank" rel="noreferrer" className="text-xs font-medium text-blue-600 truncate flex-1">{name}</a>
                              <button onClick={() => handleRemoveReceipt(i)}
                                className="flex-shrink-0 p-1 rounded hover:bg-red-50 transition-colors" title="Remove receipt">
                                <X size={12} style={{ color: "#dc2626" }} />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Buttons */}
                  <div className="flex justify-end gap-3 pt-2 border-t" style={{ borderColor: "#f3f4f6" }}>
                    <button
                      onClick={() => localStorage.setItem(`transport_draft_${shiftId}`, JSON.stringify({ stops, totalKilometer, staffKilometer, approvedKm, approvedBy, travelComments }))}
                      className="px-4 py-2 rounded-lg border font-semibold text-sm hover:bg-gray-50" style={{ borderColor: "#e5e7eb", color: "#374151" }}>
                      Save Draft
                    </button>
                    <button onClick={handleSubmitTransport} disabled={transSubmitting}
                      className="px-5 py-2 rounded-lg font-semibold text-sm text-white hover:opacity-90 disabled:opacity-50" style={{ background: "#145228" }}>
                      {transSubmitting ? "Submitting…" : "Submit Transport Log"}
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* ── Shift History Table ── */}
          <div className="bg-white rounded-xl border" style={{ borderColor: "#e5e7eb", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
            <div className="flex items-center justify-between px-5 py-3.5 border-b" style={{ borderColor: "#f3f4f6" }}>
              <div className="flex items-center gap-2">
                <Activity size={14} style={{ color: "#145228" }} />
                <h3 className="font-bold" style={{ fontSize: 14, color: "#111827" }}>Shift History</h3>
                <span className="px-2 py-0.5 rounded-full font-semibold" style={{ fontSize: 10, background: "#f3f4f6", color: "#6b7280" }}>Last 24 hours</span>
              </div>
            </div>
            {recentReports.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <Activity size={24} style={{ color: "#d1d5db", margin: "0 auto 8px" }} />
                <p style={{ fontSize: 13, color: "#9ca3af" }}>No shifts found in the previous 24 hours</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr style={{ background: "#fafafa" }}>
                    {["Date", "Staff", "Service", "Clock In", "Clock Out", "Report", "Status"].map(h => (
                      <th key={h} className="text-left px-4 py-2.5 font-semibold border-b"
                        style={{ fontSize: 10, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em", borderColor: "#f3f4f6" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recentReports.map((row, i) => {
                    const rs = row.clockIn && row.clockOut ? "Completed" : row.clockIn ? "Ongoing" : "Incomplete";
                    const rsStyle = { Completed: { bg: "#f0fdf4", text: "#15803d" }, Ongoing: { bg: "#fef3c7", text: "#b45309" }, Incomplete: { bg: "#f3f4f6", text: "#6b7280" } }[rs];
                    return (
                      <tr key={i} className="transition-colors hover:bg-gray-50/70 border-b last:border-0 group" style={{ borderColor: "#f9fafb" }}>
                        <td className="px-4 py-2.5"><p className="font-semibold" style={{ fontSize: 12, color: "#111827" }}>{row.date?.toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) || "—"}</p></td>
                        <td className="px-4 py-2.5"><span style={{ fontSize: 12, color: "#374151", fontWeight: 500 }}>{row.staffName}</span></td>
                        <td className="px-4 py-2.5"><span className="px-2 py-0.5 rounded-full font-semibold" style={{ fontSize: 10, background: "#f0fdf4", color: "#15803d" }}>{row.service}</span></td>
                        <td className="px-4 py-2.5"><span className="font-mono" style={{ fontSize: 12, color: "#374151" }}>{row.clockIn || "—"}</span></td>
                        <td className="px-4 py-2.5"><span className="font-mono" style={{ fontSize: 12, color: "#374151" }}>{row.clockOut || "—"}</span></td>
                        <td className="px-4 py-2.5">
                          {row.shiftReport
                            ? <span className="inline-flex items-center gap-1" style={{ fontSize: 11, color: "#15803d" }}><CheckCircle size={11} /> Filed</span>
                            : <span className="inline-flex items-center gap-1" style={{ fontSize: 11, color: "#f59e0b" }}><AlertCircle size={11} /> Missing</span>}
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full font-semibold" style={{ fontSize: 10, background: rsStyle.bg, color: rsStyle.text }}>{rs}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* ── Other Actions ── */}
          <div className="bg-white rounded-xl border flex-shrink-0" style={{ borderColor: "#e5e7eb", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
            <div className="px-5 py-4 border-b" style={{ borderColor: "#f3f4f6" }}>
              <h3 className="font-bold" style={{ fontSize: 16, color: "#111827" }}>Other Actions</h3>
            </div>
            <div className="px-5 py-4 space-y-3">

              {/* Critical Incident */}
              <div className="rounded-xl border p-4" style={{ background: "#fff5f5", borderColor: "#fecaca" }}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ width: 36, height: 36, background: "#fee2e2", border: "1px solid #fecaca" }}>
                      <AlertTriangle size={17} style={{ color: "#dc2626" }} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold" style={{ fontSize: 14, color: "#111827" }}>Critical Incident Reporting</p>
                      <p style={{ fontSize: 12, color: "#6b7280", marginTop: 2, lineHeight: 1.5 }}>For any incident requiring immediate management attention</p>
                    </div>
                  </div>
                  <button onClick={() => setActiveModal("critical")}
                    className="flex items-center justify-center gap-2 py-2 rounded-lg font-semibold text-white flex-shrink-0 hover:opacity-90 transition-all"
                    style={{ background: "#dc2626", fontSize: 13, width: 210, boxShadow: "0 1px 2px rgba(220,38,38,0.2)" }}>
                    <AlertTriangle size={14} /> Report Critical Incident
                  </button>
                </div>
                <p className="mt-3 pl-12" style={{ fontSize: 12, color: "#dc2626", lineHeight: 1.5 }}>
                  <span className="font-bold">Only Use When</span>&nbsp;Self-harm, violence, abuse allegations, serious accidents, medication errors, or any incident requiring immediate intervention occurs.
                </p>
              </div>

              {/* Medical Contact */}
              <div className="rounded-xl border p-4" style={{ background: "#eff6ff", borderColor: "#bfdbfe" }}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ width: 36, height: 36, background: "#dbeafe", border: "1px solid #bfdbfe" }}>
                      <Stethoscope size={17} style={{ color: "#2563eb" }} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold" style={{ fontSize: 14, color: "#111827" }}>Medical Contact Log</p>
                      <p style={{ fontSize: 12, color: "#6b7280", marginTop: 2, lineHeight: 1.5 }}>Use this form to document medical-related contacts, incidents, or communications involving a client.</p>
                    </div>
                  </div>
                  <button onClick={() => setActiveModal("medical")}
                    className="flex items-center justify-center gap-2 py-2 rounded-lg font-semibold text-white flex-shrink-0 hover:opacity-90 transition-all"
                    style={{ background: "#2563eb", fontSize: 13, width: 210, boxShadow: "0 1px 2px rgba(37,99,235,0.2)" }}>
                    <Stethoscope size={14} /> Contact Note
                  </button>
                </div>
                <p className="mt-3 pl-12" style={{ fontSize: 12, color: "#2563eb", lineHeight: 1.5 }}>
                  <span className="font-bold">Only Use When</span>&nbsp;Medical incidents, emergency care, medication errors, or health-related follow-ups.
                </p>
              </div>

              {/* Noteworthy Event */}
              <div className="rounded-xl border p-4" style={{ background: "#fff7ed", borderColor: "#fed7aa" }}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ width: 36, height: 36, background: "#ffedd5", border: "1px solid #fed7aa" }}>
                      <FileText size={17} style={{ color: "#ea580c" }} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold" style={{ fontSize: 14, color: "#111827" }}>Noteworthy Event</p>
                      <p style={{ fontSize: 12, color: "#6b7280", marginTop: 2, lineHeight: 1.5 }}>This form is used to record significant or critical incidents involving a client.</p>
                    </div>
                  </div>
                  <button onClick={() => setActiveModal("noteworthy")}
                    className="flex items-center justify-center gap-2 py-2 rounded-lg font-semibold text-white flex-shrink-0 hover:opacity-90 transition-all"
                    style={{ background: "#ea580c", fontSize: 13, width: 210, boxShadow: "0 1px 2px rgba(234,88,12,0.2)" }}>
                    <FileText size={14} /> Noteworthy Event
                  </button>
                </div>
                <p className="mt-3 pl-12" style={{ fontSize: 12, color: "#ea580c", lineHeight: 1.5 }}>
                  <span className="font-bold">Only Use When</span>&nbsp;Use this form only when the situation is a noteworthy / significant event (not routine stuff).
                </p>
              </div>

              {/* Follow Through */}
              <div className="rounded-xl border p-4" style={{ background: "#f0fdf4", borderColor: "#bbf7d0" }}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ width: 36, height: 36, background: "#dcfce7", border: "1px solid #bbf7d0" }}>
                      <CheckCircle2 size={17} style={{ color: "#16a34a" }} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold" style={{ fontSize: 14, color: "#111827" }}>Follow Through</p>
                      <p style={{ fontSize: 12, color: "#6b7280", marginTop: 2, lineHeight: 1.5 }}>Use this form to document follow-up actions, outcomes, or ongoing tasks related to a client.</p>
                    </div>
                  </div>
                  <button onClick={() => setActiveModal("followthrough")}
                    className="flex items-center justify-center gap-2 py-2 rounded-lg font-semibold text-white flex-shrink-0 hover:opacity-90 transition-all"
                    style={{ background: "#16a34a", fontSize: 13, width: 210, boxShadow: "0 1px 2px rgba(22,163,74,0.2)" }}>
                    <CheckCircle2 size={14} /> Follow Through
                  </button>
                </div>
                <p className="mt-3 pl-12" style={{ fontSize: 12, color: "#16a34a", lineHeight: 1.5 }}>
                  <span className="font-bold">Only Use When</span>&nbsp;Recording follow-up activities, actions taken, or outcomes related to a previously identified matter.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT SIDEBAR ── */}
        <div className="overflow-auto flex flex-col gap-4">

          {/* Recent Activity */}
          <div className="bg-white rounded-xl border" style={{ borderColor: "#e5e7eb", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
            <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "#f3f4f6" }}>
              <h3 className="font-bold" style={{ fontSize: 13, color: "#111827" }}>Recent Activity</h3>
            </div>
            <div className="px-4 py-2">
              {recentReports.length === 0 ? (
                <p className="py-3 text-center" style={{ fontSize: 12, color: "#9ca3af" }}>No recent activity</p>
              ) : recentReports.slice(0, 5).map((a, i) => {
                const type = a.shiftReport ? "success" : "warning";
                return (
                  <div key={i} className="flex items-start gap-3 py-2.5 border-b last:border-0" style={{ borderColor: "#f9fafb" }}>
                    <div className="rounded-md flex items-center justify-center flex-shrink-0 mt-0.5" style={{ width: 24, height: 24, background: actBg[type] }}>
                      {type === "success" ? <CheckCircle size={12} style={{ color: actIcon[type] }} /> : <AlertCircle size={12} style={{ color: actIcon[type] }} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold" style={{ fontSize: 11, color: "#111827", lineHeight: 1.3 }}>
                        {a.shiftReport ? "Report filed" : "Report pending"} — {a.staffName}
                      </p>
                      <p style={{ fontSize: 10, color: "#9ca3af", marginTop: 2 }}>{a.date?.toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) || "—"}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Shift Overview */}
          <div className="bg-white rounded-xl border" style={{ borderColor: "#e5e7eb", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
            <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: "#f3f4f6" }}>
              <TrendingUp size={13} style={{ color: "#145228" }} />
              <h3 className="font-bold" style={{ fontSize: 13, color: "#111827" }}>Shift Overview</h3>
            </div>
            <div className="px-4 py-3 space-y-2.5">
              {[
                { label: "Client",       value: normalized.clientName,  color: "#111827" },
                { label: "Client ID",    value: normalized.clientId,    color: "#6b7280" },
                { label: "Date of Birth",value: normalized.dob,         color: "#111827" },
                { label: "Shift Date",   value: normalized.displayDate, color: "#111827" },
                { label: "Status",       value: statusVal,              color: sc.text   },
              ].map((s, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span style={{ fontSize: 12, color: "#6b7280" }}>{s.label}</span>
                  <span className="font-bold text-right" style={{ fontSize: 12, color: s.color, maxWidth: 130, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Contact Info */}
          <div className="bg-white rounded-xl border" style={{ borderColor: "#e5e7eb", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
            <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: "#f3f4f6" }}>
              <Shield size={13} style={{ color: "#145228" }} />
              <h3 className="font-bold" style={{ fontSize: 13, color: "#111827" }}>Contact Info</h3>
            </div>
            <div className="px-4 py-3 space-y-2.5">
              {[
                { icon: <User size={11} />,   label: "Guardian", value: intakeData?.parentName || intakeData?.inTakeClients?.[0]?.parentEmail || "—", color: "#145228" },
                { icon: <Mail size={11} />,   label: "Email",    value: intakeData?.parentEmail || intakeData?.inTakeClients?.[0]?.parentEmail || "—", color: "#2563eb" },
                { icon: <MapPin size={11} />, label: "Agency",   value: normalized.agency,       color: "#ea580c" },
              ].map((c, i) => (
                <div key={i} className="flex items-center gap-2.5">
                  <div className="rounded-md p-1.5 flex-shrink-0" style={{ background: "#f9fafb", color: c.color }}>{c.icon}</div>
                  <div className="min-w-0">
                    <p style={{ fontSize: 10, color: "#9ca3af", fontWeight: 600 }}>{c.label}</p>
                    <p className="truncate" style={{ fontSize: 11, color: "#374151", fontWeight: 500 }}>{c.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-xl border" style={{ borderColor: "#e5e7eb", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
            <div className="px-4 py-3 border-b" style={{ borderColor: "#f3f4f6" }}>
              <h3 className="font-bold" style={{ fontSize: 13, color: "#111827" }}>Quick Actions</h3>
            </div>
            <div className="px-4 py-3 space-y-2">
              {[
                { icon: <FileText size={13} />, label: "View Full Report",  color: "#145228", bg: "#f0fdf4", action: () => setShowFullReport(true),        show: true            },
                { icon: <Pill size={13} />,     label: "Medications",       color: "#7c3aed", bg: "#faf5ff", action: () => setActiveTab("medications"),    show: hasMedication   },
                { icon: <Truck size={13} />,    label: "Transportation",    color: "#2563eb", bg: "#eff6ff", action: () => setActiveTab("transportation"), show: true            },
                { icon: <AlertTriangle size={13} />, label: "Log Incident", color: "#dc2626", bg: "#fef2f2", action: () => setActiveModal("critical"),     show: true            },
              ].filter((a) => a.show).map((a, i) => (
                <button key={i} onClick={a.action}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg border font-semibold transition-all hover:bg-gray-50"
                  style={{ borderColor: "#f3f4f6", fontSize: 12, color: "#374151", textAlign: "left" }}>
                  <div className="rounded-md p-1.5" style={{ background: a.bg, color: a.color }}>{a.icon}</div>
                  {a.label}
                  <ChevronRight size={12} style={{ color: "#d1d5db", marginLeft: "auto" }} />
                </button>
              ))}
            </div>
          </div>

          {/* Medical Info (if available) */}
          {intakeData?.medicalConcerns?.length > 0 && (
            <div className="bg-white rounded-xl border" style={{ borderColor: "#e5e7eb", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
              <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: "#f3f4f6" }}>
                <Stethoscope size={13} style={{ color: "#145228" }} />
                <h3 className="font-bold" style={{ fontSize: 13, color: "#111827" }}>Medical Info</h3>
              </div>
              <div className="px-4 py-3">
                <ul className="space-y-1.5">
                  {intakeData.medicalConcerns.map((m, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span style={{ color: "#145228", marginTop: 2 }}>•</span>
                      <span style={{ fontSize: 12, color: "#374151" }}>{m}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ShiftReport;
