import { useEffect, useRef, useState, useMemo } from "react";
import { collection, getDocs, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { useNavigate } from "react-router-dom";
import {
  MapPin, Navigation, Clock, Eye, Car, CheckCircle2,
  ChevronLeft, ChevronRight, ChevronRight as ChevronRightIcon,
  Edit2, Search, Route, Activity, DollarSign, Baby, Shield,
  Timer, Maximize2, Plus, CalendarDays, X,
} from "lucide-react";
import CustomCalendar from "./CustomerCalender";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getOverallStatus(shift) {
  if (shift.clockIn && shift.clockOut) return "Completed";
  if (shift.clockIn && !shift.clockOut) return "In Progress";
  return "Scheduled";
}

function isTransportShift(shift) {
  const cat = (shift.categoryName || shift.shiftCategory || "").toLowerCase();
  return cat.includes("transport");
}

function normalizeSeat(raw) {
  const s = (raw || "").toLowerCase();
  if (s.includes("rear")) return "rear-facing";
  if (s.includes("forward")) return "forward-facing";
  if (s.includes("booster")) return "booster";
  if (s.includes("car seat")) return "rear-facing";
  if (s.includes("standard") || s.includes("regular")) return "regular";
  return "regular";
}

function getSeatInfo(cat) {
  switch (cat) {
    case "rear-facing":    return { label: "Rear-Facing",    color: "#dc2626", bg: "#fef2f2", border: "#fecaca", Icon: Baby };
    case "forward-facing": return { label: "Forward-Facing", color: "#ea580c", bg: "#fff7ed", border: "#fed7aa", Icon: Baby };
    case "booster":        return { label: "Booster Seat",   color: "#2563eb", bg: "#eff6ff", border: "#bfdbfe", Icon: Shield };
    default:               return { label: "Regular Seat",   color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0", Icon: Car };
  }
}

function getStatusStyle(status) {
  switch (status) {
    case "Completed":   return { color: "#1f7a3c", bg: "#f0fdf4", border: "#bbf7d0" };
    case "In Progress": return { color: "#2563eb", bg: "#eff6ff", border: "#bfdbfe" };
    default:            return { color: "#d97706", bg: "#fef3c7", border: "#fde68a" };
  }
}

function getStopColor(label, isLast) {
  if (label === "Pickup") return "#16a34a";
  if (isLast) return "#dc2626";
  return "#2563eb";
}

function isUrl(addr) {
  return typeof addr === "string" && (addr.startsWith("http://") || addr.startsWith("https://"));
}

function displayAddr(addr) {
  if (!addr || addr === "—") return "—";
  if (isUrl(addr)) return "Open in Maps →";
  return addr;
}

function buildGoogleMapsUrl(stops) {
  const parts = stops
    .map((s) => (isUrl(s.address) ? s.address : encodeURIComponent(s.address)))
    .join("/");
  return `https://www.google.com/maps/dir/${parts}`;
}

function buildEmbedSrc(stops) {
  // Prefer text addresses for embed; fall back to first URL address
  const textStop = stops.find((s) => s.address && s.address !== "—" && !isUrl(s.address));
  const urlStop  = stops.find((s) => isUrl(s.address));
  const addr = textStop?.address || urlStop?.address || "";
  if (!addr) return null;
  if (isUrl(addr)) return addr; // use the short URL directly as embed src
  return `https://maps.google.com/maps?q=${encodeURIComponent(addr)}&output=embed&hl=en&z=13`;
}

function formatDuration(min) {
  if (!min) return "—";
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}h ${m}m` : `${m} min`;
}

// ─── Date range helper ────────────────────────────────────────────────────────
function getPeriodRange(period) {
  const now = new Date();
  if (period === "Today") {
    const s = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const e = new Date(s); e.setHours(23, 59, 59);
    return { start: s, end: e };
  }
  if (period === "Weekly") {
    const day = now.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const s = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diff);
    const e = new Date(s); e.setDate(s.getDate() + 6); e.setHours(23, 59, 59);
    return { start: s, end: e };
  }
  if (period === "Monthly") {
    return {
      start: new Date(now.getFullYear(), now.getMonth(), 1),
      end:   new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59),
    };
  }
  if (period === "Yearly") {
    return {
      start: new Date(now.getFullYear(), 0, 1),
      end:   new Date(now.getFullYear(), 11, 31, 23, 59, 59),
    };
  }
  return null;
}

function getShiftDate(shift) {
  if (shift._rawStartDate instanceof Date) return shift._rawStartDate;
  return null;
}

// ─── Date Filter Component ────────────────────────────────────────────────────
function DateFilter({ value, customStart, customEnd, onChange, onCustomChange }) {
  const [open, setOpen] = useState(false);
  const [showCustom, setShowCustom] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const PERIODS = ["All", "Today", "Weekly", "Monthly", "Yearly"];

  const label = value === "Custom" && customStart && customEnd
    ? `${customStart} → ${customEnd}`
    : value === "All" ? "Date" : value;

  const isActive = value !== "All";

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all"
        style={{
          borderColor: isActive ? "#145228" : "#e5e7eb",
          background:  isActive ? "#f0fdf4"  : "#fff",
          color:       isActive ? "#145228"  : "#374151",
        }}
      >
        <CalendarDays size={12} strokeWidth={2} />
        {label}
        {isActive ? (
          <span onClick={(e) => { e.stopPropagation(); onChange("All"); setShowCustom(false); }}
            className="ml-0.5 hover:opacity-70"><X size={11} /></span>
        ) : (
          <ChevronRight size={11} style={{ transform: open ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.15s" }} />
        )}
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 rounded-lg border bg-white z-20 py-1 overflow-hidden"
          style={{ borderColor: "#e5e7eb", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", minWidth: 160 }}>
          {PERIODS.map((p) => (
            <button key={p} onClick={() => { onChange(p); setShowCustom(false); setOpen(false); }}
              className="w-full text-left px-3 py-1.5 text-xs font-medium hover:bg-gray-50 transition-colors"
              style={{ color: value === p ? "#145228" : "#374151", fontWeight: value === p ? 700 : 500 }}>
              {p}
            </button>
          ))}
          <div className="border-t mx-2 my-1" style={{ borderColor: "#f3f4f6" }} />
          <button onClick={() => { setShowCustom(!showCustom); onChange("Custom"); }}
            className="w-full text-left px-3 py-1.5 text-xs font-medium hover:bg-gray-50 transition-colors"
            style={{ color: value === "Custom" ? "#145228" : "#374151", fontWeight: value === "Custom" ? 700 : 500 }}>
            Custom Range
          </button>
          {showCustom && (
            <div className="px-3 pb-3 pt-1 flex flex-col gap-2">
              <div>
                <p className="text-[10px] font-semibold mb-1" style={{ color: "#9ca3af" }}>FROM</p>
                <input type="date" value={customStart}
                  onChange={(e) => onCustomChange("start", e.target.value)}
                  className="w-full rounded-lg border px-2 py-1 text-xs focus:outline-none"
                  style={{ borderColor: "#e5e7eb", color: "#374151" }} />
              </div>
              <div>
                <p className="text-[10px] font-semibold mb-1" style={{ color: "#9ca3af" }}>TO</p>
                <input type="date" value={customEnd}
                  onChange={(e) => onCustomChange("end", e.target.value)}
                  className="w-full rounded-lg border px-2 py-1 text-xs focus:outline-none"
                  style={{ borderColor: "#e5e7eb", color: "#374151" }} />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Filter Chip ──────────────────────────────────────────────────────────────
function FilterChip({ label, value, options, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all"
        style={{
          borderColor: value !== "All" ? "#145228" : "#e5e7eb",
          background: value !== "All" ? "#f0fdf4" : "#fff",
          color: value !== "All" ? "#145228" : "#374151",
        }}
      >
        {label}: {value}
        <ChevronRight size={11} style={{ transform: open ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.15s" }} />
      </button>
      {open && (
        <div
          className="absolute top-full left-0 mt-1 rounded-lg border bg-white z-20 py-1 min-w-[140px]"
          style={{ borderColor: "#e5e7eb", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
        >
          {options.map((opt) => (
            <button
              key={opt}
              onClick={() => { onChange(opt); setOpen(false); }}
              className="w-full text-left px-3 py-1.5 text-xs font-medium hover:bg-gray-50 transition-colors"
              style={{ color: opt === value ? "#145228" : "#374151", fontWeight: opt === value ? 700 : 500 }}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Seat Badge ───────────────────────────────────────────────────────────────
function SeatBadge({ category }) {
  const info = getSeatInfo(category);
  const { Icon } = info;
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full"
      style={{ fontSize: 10, fontWeight: 600, color: info.color, background: info.bg, border: `1px solid ${info.border}` }}
    >
      <Icon size={10} strokeWidth={2.5} />
      {info.label}
    </span>
  );
}

// ─── Timeline Node ────────────────────────────────────────────────────────────
function TimelineNode({ status, color }) {
  if (status === "completed") {
    return (
      <div className="flex-shrink-0 flex items-center justify-center rounded-full"
        style={{ width: 20, height: 20, background: color }}>
        <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
          <path d="M10 3L4.5 8.5L2 6" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    );
  }
  if (status === "in-progress") {
    return (
      <div className="relative flex-shrink-0 flex items-center justify-center" style={{ width: 20, height: 20 }}>
        <div className="absolute rounded-full animate-ping" style={{ width: 20, height: 20, background: color, opacity: 0.15 }} />
        <div className="rounded-full" style={{ width: 20, height: 20, background: color }} />
      </div>
    );
  }
  // pending
  return (
    <div className="flex-shrink-0 rounded-full border-2"
      style={{ width: 20, height: 20, borderColor: "#d1d5db", background: "#fff" }} />
  );
}

// ─── Trip Card ────────────────────────────────────────────────────────────────
function TripCard({ trip, isSelected, onClick, navigate, computed }) {
  const statusStyle  = getStatusStyle(trip.overallStatus);
  const displayKm    = trip.distanceKm || computed?.km || null;
  const displayMin   = trip.durationMin || computed?.durationMin || null;
  const totalCost    = displayKm ? (displayKm * 0.58).toFixed(2) : null;

  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-xl border transition-all duration-150 overflow-hidden"
      style={{
        borderColor: isSelected ? "#145228" : "#e5e7eb",
        background: isSelected ? "#f0fdf4" : "#ffffff",
        boxShadow: isSelected ? "0 0 0 1.5px #145228" : "0 1px 3px rgba(0,0,0,0.04)",
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between px-4 pt-4 pb-2 gap-2">
        <div className="flex items-center gap-3 min-w-0">
          {/* Avatar */}
          <div className="flex-shrink-0 flex items-center justify-center rounded-full text-white font-bold relative"
            style={{ width: 38, height: 38, fontSize: 13, background: "#145228" }}>
            {(trip.clientName || "?").charAt(0).toUpperCase()}
            {/* Live dot for In Progress */}
            {trip.overallStatus === "In Progress" && (
              <span className="absolute rounded-full border-2 border-white"
                style={{ width: 10, height: 10, background: "#16a34a", bottom: 0, right: 0 }} />
            )}
          </div>
          <div className="min-w-0">
            <p style={{ fontSize: 13.5, fontWeight: 700, color: isSelected ? "#145228" : "#111827", lineHeight: 1.2 }}>
              {trip.clientName || "—"}
            </p>
            <p style={{ fontSize: 11, color: "#9ca3af", fontWeight: 500 }}>
              TRP-{trip.tripId?.toString().slice(-4) || "0000"}
            </p>
          </div>
        </div>
        <span className="flex-shrink-0 px-2.5 py-0.5 rounded-full text-xs font-semibold"
          style={{ color: statusStyle.color, background: statusStyle.bg, border: `1px solid ${statusStyle.border}` }}>
          {trip.overallStatus}
        </span>
      </div>

      {/* Badges */}
      <div className="flex items-center gap-1.5 px-4 pb-3">
        <span className="px-2 py-0.5 rounded text-xs font-medium" style={{ color: "#374151", background: "#f3f4f6" }}>
          {trip.staffName}
        </span>
        <SeatBadge category={trip.seatCategory} />
      </div>

      {/* Timeline */}
      <div className="px-4 pb-3">
        {trip.stops.map((stop, i) => {
          const isLast  = i === trip.stops.length - 1;
          const color   = getStopColor(stop.label, isLast);
          return (
            <div key={i} className="flex items-start gap-3" style={{ paddingBottom: isLast ? 0 : 4 }}>
              {/* Node + connector column */}
              <div className="flex flex-col items-center flex-shrink-0" style={{ width: 20 }}>
                <TimelineNode status={stop.status} color={color} />
                {!isLast && (
                  <div style={{
                    width: 2, flex: 1, minHeight: 18,
                    background: stop.status === "completed" ? "#86efac" : "#e5e7eb",
                    marginTop: 2, marginBottom: 2,
                  }} />
                )}
              </div>
              {/* Content */}
              <div className="flex-1 min-w-0" style={{ paddingTop: 1, paddingBottom: isLast ? 0 : 4 }}>
                <div className="flex items-center justify-between gap-2">
                  <span style={{ fontSize: 12, fontWeight: 700, color }}>{stop.label}</span>
                  <span style={{ fontSize: 11, color: "#9ca3af" }}>{stop.time}</span>
                </div>
                {isUrl(stop.address) ? (
                  <a href={stop.address} target="_blank" rel="noopener noreferrer"
                    style={{ fontSize: 11, color: "#2563eb", textDecoration: "none" }}
                    onClick={(e) => e.stopPropagation()}>
                    Open in Maps →
                  </a>
                ) : (
                  <p className="truncate" style={{ fontSize: 11, color: "#6b7280" }}>{stop.address || "—"}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-t"
        style={{ borderColor: isSelected ? "#bbf7d0" : "#f3f4f6", background: isSelected ? "#ecfdf5" : "#fafafa" }}>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <Route size={12} style={{ color: "#6b7280" }} strokeWidth={2} />
            <span style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>
              {displayKm ? `${displayKm} km` : "— km"}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Timer size={12} style={{ color: "#6b7280" }} strokeWidth={2} />
            <span style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>
              {displayMin ? formatDuration(displayMin) : "— min"}
            </span>
          </div>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); navigate(`/admin-dashboard/shift-report/${trip.id}`); }}
          className="p-1 rounded-lg hover:bg-gray-200 transition-colors"
        >
          <ChevronRight size={16} style={{ color: "#9ca3af" }} strokeWidth={2} />
        </button>
      </div>
    </button>
  );
}

// ─── Real Google Maps Panel ───────────────────────────────────────────────────
function MapPanel({ trip }) {
  const mapsUrl  = buildGoogleMapsUrl(trip.stops);
  const embedSrc = buildEmbedSrc(trip.stops);

  return (
    <div className="relative w-full h-full rounded-xl overflow-hidden" style={{ background: "#eef2f7" }}>
      {embedSrc ? (
        <iframe
          title="route-map"
          src={embedSrc}
          width="100%"
          height="100%"
          style={{ border: 0, display: "block" }}
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      ) : (
        <div className="flex flex-col items-center justify-center h-full gap-3">
          <MapPin size={36} style={{ color: "#d1d5db" }} strokeWidth={1.5} />
          <p style={{ fontSize: 13, color: "#9ca3af" }}>No address available to display map</p>
        </div>
      )}

      {/* Open in Google Maps button */}
      <div className="absolute top-3 right-3">
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/95 backdrop-blur-sm transition-all hover:bg-white"
          style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.15)", border: "1px solid #e2e8f0", fontSize: 11, fontWeight: 600, color: "#145228", textDecoration: "none" }}
        >
          <Maximize2 size={12} strokeWidth={2.5} />
          Open in Google Maps
        </a>
      </div>

      {/* Legend */}
      <div
        className="absolute bottom-3 left-3 flex items-center gap-3 px-3 py-2 rounded-lg bg-white/95 backdrop-blur-sm"
        style={{ border: "1px solid #e2e8f0", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
      >
        {[{ color: "#16a34a", label: "Pickup" }, { color: "#2563eb", label: "Visit Stop" }, { color: "#dc2626", label: "Drop-off" }].map(item => (
          <div key={item.label} className="flex items-center gap-1.5">
            <div className="rounded-full" style={{ width: 10, height: 10, background: item.color, border: "1.5px solid white", boxShadow: `0 0 0 1px ${item.color}40` }} />
            <span style={{ fontSize: 10, color: "#374151", fontWeight: 500 }}>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Build trip stops from shift ──────────────────────────────────────────────
function buildStops(shift, clientForm) {
  const overallStatus = getOverallStatus(shift);
  const pickupDone = !!(shift.transportation?.pickupDone);
  const visitDone  = !!(shift.transportation?.visitDone);
  const dropDone   = !!(shift.transportation?.dropDone);

  const primaryPoint =
    Array.isArray(shift.shiftPoints) && shift.shiftPoints.length > 0
      ? shift.shiftPoints[0]
      : Array.isArray(shift.clientDetails?.shiftPoints) && shift.clientDetails.shiftPoints.length > 0
      ? shift.clientDetails.shiftPoints[0]
      : {};

  const pickupAddress = primaryPoint?.pickupLocation || clientForm.pickupAddress || shift.pickupLocation || "—";
  const pickupTime    = primaryPoint?.pickupTime || clientForm.pickupTime || shift.pickupTime || shift.startTime || "—";
  const visitAddress  = primaryPoint?.visitLocation || clientForm.visitAddress || shift.visitLocation || "";
  const visitTime     = shift.transportation?.visitTime || primaryPoint?.visitStartOfficialTime || clientForm.visitArrivalTime || "—";
  const dropAddress   = primaryPoint?.dropLocation || clientForm.dropOffAddress || shift.dropLocation || "—";
  const dropTime      = shift.transportation?.dropTime || primaryPoint?.dropTime || clientForm.dropOffTime || shift.endTime || "—";

  const pickupStatus = pickupDone ? "completed" : overallStatus === "In Progress" ? "in-progress" : "pending";
  const visitStatus  = visitDone ? "completed" : (pickupDone && overallStatus === "In Progress") ? "in-progress" : "pending";
  const dropStatus   = dropDone ? "completed" : (visitDone && overallStatus === "In Progress") ? "in-progress" : "pending";

  const stops = [{ label: "Pickup", address: pickupAddress, time: pickupTime, status: pickupStatus }];
  if (visitAddress && visitAddress.trim()) {
    stops.push({ label: "Visit", address: visitAddress, time: visitTime, status: visitStatus });
  }
  stops.push({ label: "Drop-off", address: dropAddress, time: dropTime, status: dropStatus });
  return stops;
}

// ─── Main Page ────────────────────────────────────────────────────────────────
const STATUS_OPTIONS = ["All", "Completed", "In Progress", "Scheduled"];
const SEAT_OPTIONS   = ["All", "Rear-Facing", "Forward-Facing", "Booster Seat", "Regular Seat"];
const SEAT_MAP = { "All": "All", "Rear-Facing": "rear-facing", "Forward-Facing": "forward-facing", "Booster Seat": "booster", "Regular Seat": "regular" };
const OFFICE_ADDRESS = "10110 124 Street, Edmonton, AB T5N 1P6";

// Calculate route distance + duration: office → pickup → (visit?) → drop → office
async function calcRoute(stops) {
  if (!window.google?.maps) return null;
  const service = new window.google.maps.DistanceMatrixService();
  const addrs = [OFFICE_ADDRESS, ...stops.map((s) => s.address).filter((a) => a && a !== "—"), OFFICE_ADDRESS];
  if (addrs.length < 3) return null;
  let totalMeters = 0, totalSeconds = 0;
  for (let i = 0; i < addrs.length - 1; i++) {
    const result = await new Promise((res) =>
      service.getDistanceMatrix(
        { origins: [addrs[i]], destinations: [addrs[i + 1]], travelMode: "DRIVING" },
        (r, s) => res(s === "OK" ? r : null)
      )
    );
    const elem = result?.rows?.[0]?.elements?.[0];
    if (!elem?.distance?.value) return null;
    totalMeters  += elem.distance.value;
    totalSeconds += elem.duration?.value || 0;
  }
  return { km: Math.round(totalMeters / 1000), durationMin: Math.round(totalSeconds / 60) };
}

export default function Transportation() {
  const navigate = useNavigate();
  const [trips, setTrips]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [distancesMap, setDistancesMap] = useState({});
  const [search, setSearch]         = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [seatFilter, setSeatFilter] = useState("All");
  const [selectedDates, setSelectedDates] = useState([new Date()]);
  const [calendarOpen, setCalendarOpen]   = useState(false);

  useEffect(() => {
    let formsCache = {};
    setLoading(true);

    // Load intake forms once (they rarely change)
    getDocs(collection(db, "InTakeForms")).then((formsSnap) => {
      formsSnap.forEach((d) => {
        const data = d.data();
        if (Array.isArray(data.inTakeClients)) {
          data.inTakeClients.forEach((c) => { if (c.name) formsCache[c.name] = c; });
        }
      });
    });

    // Real-time listener on shifts
    const unsub = onSnapshot(collection(db, "shifts"), (shiftsSnap) => {
      const allTrips = shiftsSnap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter(isTransportShift)
        .map((shift) => {
          const clientName = shift.clientName || shift.clientDetails?.name || "";
          const clientId   = shift.clientId   || shift.clientDetails?.id   || "";
          const staffName  = shift.name       || shift.staffName           || shift.user || "Unassigned";
          const clientForm = formsCache[clientName] || {};
          const seatRaw    = clientForm.typeOfSeat || "—";
          const stops      = buildStops(shift, clientForm);
          // Parse raw start date for filtering
          let rawStartDate = null;
          if (shift.startDate?.toDate) rawStartDate = shift.startDate.toDate();
          else if (typeof shift.startDate === "string") {
            const p = shift.startDate.replace(/,/g, "").trim();
            const d = new Date(p);
            if (!isNaN(d)) rawStartDate = d;
          }
          return {
            id: shift.id,
            tripId: clientId || shift.id?.slice(0, 10),
            clientName,
            staffName,
            agencyName: shift.agencyName || shift.clientDetails?.agencyName || "—",
            seatCategory: normalizeSeat(seatRaw),
            seatRaw,
            overallStatus: getOverallStatus(shift),
            stops,
            distanceKm: shift.distanceKm || null,
            durationMin: shift.durationMin || null,
            _rawStartDate: rawStartDate,
          };
        });

      setTrips(allTrips);
      setSelectedTrip((prev) => {
        if (!prev && allTrips.length > 0) return allTrips[0];
        // Keep selected trip updated with latest data
        if (prev) {
          const updated = allTrips.find((t) => t.id === prev.id);
          return updated || prev;
        }
        return prev;
      });
      setLoading(false);
    }, (e) => {
      console.error("Error fetching transportation data:", e);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  // Calculate route distances + duration for trips missing that data
  useEffect(() => {
    if (!trips.length) return;
    const pending = trips.filter((t) => !t.distanceKm && !distancesMap[t.id]);
    if (!pending.length) return;
    pending.forEach(async (trip) => {
      const result = await calcRoute(trip.stops);
      if (result) {
        setDistancesMap((prev) => ({ ...prev, [trip.id]: result }));
      }
    });
  }, [trips]);

  const filtered = useMemo(() => {
    return trips.filter((t) => {
      const q = search.toLowerCase();
      const matchSearch = !q || t.clientName.toLowerCase().includes(q) || t.tripId.toLowerCase().includes(q) || t.staffName.toLowerCase().includes(q);
      const matchStatus = statusFilter === "All" || t.overallStatus === statusFilter;
      const matchSeat   = seatFilter === "All" || t.seatCategory === SEAT_MAP[seatFilter];
      let matchDate = true;
      if (selectedDates.length > 0) {
        const d = t._rawStartDate;
        if (!d) matchDate = false;
        else {
          matchDate = selectedDates.some((sel) =>
            sel.getDate() === d.getDate() &&
            sel.getMonth() === d.getMonth() &&
            sel.getFullYear() === d.getFullYear()
          );
        }
      }
      return matchSearch && matchStatus && matchSeat && matchDate;
    });
  }, [trips, search, statusFilter, seatFilter, selectedDates]);

  const totalTrips    = trips.length;
  const activeTrips   = trips.filter((t) => t.overallStatus === "In Progress").length;
  const getKm = (t) => t.distanceKm || distancesMap[t.id]?.km || 0;
  const getMin = (t) => t.durationMin || distancesMap[t.id]?.durationMin || 0;
  const totalDistance = trips.reduce((s, t) => s + getKm(t), 0);
  const totalRevenue  = trips.reduce((s, t) => s + (getKm(t) ? getKm(t) * 0.58 : 0), 0);
  const selKm = selectedTrip ? getKm(selectedTrip) : 0;
  const selectedCost  = selKm ? (selKm * 0.58).toFixed(2) : null;

  return (
    <div className="h-full flex flex-col overflow-hidden" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

      {/* ── Page Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#111827", letterSpacing: "-0.3px" }}>
            Transportations
          </h1>
          <p style={{ fontSize: 13, color: "#6b7280", marginTop: 2 }}>
            Manage and track all client transportation trips
          </p>
        </div>
        <button
          onClick={() => navigate("/admin-dashboard/add/add-user-shift")}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white transition-all hover:opacity-90"
          style={{ background: "#145228", fontSize: 13, fontWeight: 600 }}
        >
          <Car size={15} strokeWidth={2} />
          New Trip
        </button>
      </div>

      {/* ── KPI Strip ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-3.5 mb-4 flex-shrink-0">
        {[
          { label: "Total Trips",    value: String(totalTrips),                     Icon: Route,      iconBg: "#f8fafc", iconColor: "#475569", sub: "This month" },
          { label: "Active Trips",   value: String(activeTrips),                    Icon: Activity,   iconBg: "#eff6ff", iconColor: "#2563eb", sub: "Currently en-route" },
          { label: "Total Distance", value: totalDistance > 0 ? `${totalDistance.toFixed(0)} km` : "—", Icon: Navigation, iconBg: "#f0fdf4", iconColor: "#16a34a", sub: "This month" },
          { label: "Trip Revenue",   value: totalRevenue > 0 ? `$${totalRevenue.toFixed(0)}` : "—",   Icon: DollarSign, iconBg: "#faf5ff", iconColor: "#7c3aed", sub: "Estimated earnings" },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-xl border px-4 py-3.5 flex items-center gap-3.5"
            style={{ borderColor: "#e5e7eb", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
            <div className="rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ width: 40, height: 40, background: kpi.iconBg }}>
              <kpi.Icon size={18} style={{ color: kpi.iconColor }} strokeWidth={1.8} />
            </div>
            <div>
              <p style={{ fontSize: 10.5, color: "#9ca3af", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>{kpi.label}</p>
              <p style={{ fontSize: 22, fontWeight: 700, color: "#111827", lineHeight: 1.2, marginTop: 1 }}>{kpi.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Main Two-Column Split ──────────────────────────────────────────── */}
      <div className="flex-1 grid grid-cols-2 gap-4 overflow-hidden min-h-0">

        {/* ─── LEFT: Trip List ──────────────────────────────────────────────── */}
        <div className="flex flex-col overflow-hidden bg-white rounded-xl border"
          style={{ borderColor: "#e5e7eb", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>

          {/* Search + Filters */}
          <div className="px-4 py-3 border-b flex-shrink-0" style={{ borderColor: "#f3f4f6" }}>
            <div className="relative mb-2.5">
              <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by client, trip ID, or staff..."
                className="w-full rounded-lg border bg-white focus:outline-none transition-all"
                style={{ paddingLeft: 34, paddingRight: 12, paddingTop: 8, paddingBottom: 8, borderColor: "#e5e7eb", fontSize: 12 }}
              />
            </div>
            <div className="flex items-center gap-2">
              <FilterChip label="Status" value={statusFilter} options={STATUS_OPTIONS} onChange={setStatusFilter} />
              <FilterChip label="Seat" value={seatFilter} options={SEAT_OPTIONS} onChange={setSeatFilter} />
              {/* Calendar picker — same as Dashboard */}
              <div className="relative">
                <button
                  onClick={() => setCalendarOpen((v) => !v)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all"
                  style={{
                    borderColor: "#145228", background: "#f0fdf4", color: "#145228",
                  }}
                >
                  <CalendarDays size={12} strokeWidth={2} />
                  {(() => {
                    const fmt = (d) => `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}`;
                    if (!selectedDates.length) return fmt(new Date());
                    const sorted = [...selectedDates].sort((a,b) => a-b);
                    return sorted.length === 1 ? fmt(sorted[0]) : `${fmt(sorted[0])} – ${fmt(sorted[sorted.length-1])}`;
                  })()}
                  <ChevronRight size={11} style={{ transform: calendarOpen ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.15s" }} />
                </button>
                {calendarOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setCalendarOpen(false)} />
                    <div className="absolute z-50 top-10 left-0 shadow-lg rounded-lg bg-white border" style={{ borderColor: "#e5e7eb" }}>
                      <CustomCalendar
                        selectedDates={selectedDates}
                        onDatesChange={(dates) => setSelectedDates(dates)}
                        onClose={() => setCalendarOpen(false)}
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Count bar */}
          <div className="px-4 py-2 border-b flex items-center justify-between flex-shrink-0"
            style={{ borderColor: "#f3f4f6", background: "#fafafa" }}>
            <span style={{ fontSize: 11, color: "#9ca3af", fontWeight: 500 }}>
              <strong style={{ color: "#374151" }}>{filtered.length}</strong> of {trips.length} trips
            </span>
            <div className="flex items-center gap-1">
              {["Completed", "In Progress", "Scheduled"].map((s) => {
                const st = getStatusStyle(s);
                return (
                  <span key={s} className="px-1.5 py-0.5 rounded"
                    style={{ fontSize: 9, fontWeight: 600, color: st.color, background: st.bg }}>
                    {trips.filter((t) => t.overallStatus === s).length}
                  </span>
                );
              })}
            </div>
          </div>

          {/* Trip list */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="animate-spin w-6 h-6 rounded-full border-2 border-emerald-600 border-t-transparent" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <Car size={36} style={{ color: "#e5e7eb" }} strokeWidth={1.5} />
                <p style={{ fontSize: 13, color: "#9ca3af", fontWeight: 500, marginTop: 10 }}>No trips match your filters</p>
              </div>
            ) : (
              filtered.map((trip) => (
                <TripCard
                  key={trip.id}
                  trip={trip}
                  isSelected={selectedTrip?.id === trip.id}
                  onClick={() => setSelectedTrip(trip)}
                  navigate={navigate}
                  computed={distancesMap[trip.id]}
                />
              ))
            )}
          </div>
        </div>

        {/* ─── RIGHT: Route Map Panel ──────────────────────────────────────── */}
        <div className="flex flex-col overflow-hidden bg-white rounded-xl border"
          style={{ borderColor: "#e5e7eb", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>

          {selectedTrip ? (
            <>
              {/* Map Header */}
              <div className="px-4 py-3 border-b flex items-center flex-shrink-0" style={{ borderColor: "#f3f4f6" }}>
                <div className="flex items-center gap-2.5">
                  <div className="rounded-lg flex items-center justify-center" style={{ width: 32, height: 32, background: "#145228" }}>
                    <Navigation size={14} style={{ color: "white" }} strokeWidth={2} />
                  </div>
                  <div>
                    <p style={{ fontSize: 13.5, fontWeight: 700, color: "#111827" }}>Route Map</p>
                    <p style={{ fontSize: 10.5, color: "#9ca3af" }}>{selectedTrip.tripId} · {selectedTrip.clientName}</p>
                  </div>
                </div>
              </div>

              {/* Route Summary Strip */}
              <div className="px-4 py-2.5 border-b flex items-center gap-5 flex-shrink-0"
                style={{ borderColor: "#f3f4f6", background: "#fafafa" }}>
                <div className="flex items-center gap-1.5">
                  <Route size={13} style={{ color: "#145228" }} strokeWidth={2} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#111827" }}>
                    {getKm(selectedTrip) ? `${getKm(selectedTrip)} km` : "—"}
                  </span>
                  <span style={{ fontSize: 10.5, color: "#9ca3af" }}>total distance</span>
                </div>
                <div style={{ width: 1, height: 16, background: "#e5e7eb" }} />
                <div className="flex items-center gap-1.5">
                  <Timer size={13} style={{ color: "#2563eb" }} strokeWidth={2} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#111827" }}>
                    {getMin(selectedTrip) ? formatDuration(getMin(selectedTrip)) : "—"}
                  </span>
                  <span style={{ fontSize: 10.5, color: "#9ca3af" }}>est. duration</span>
                </div>
                <div style={{ width: 1, height: 16, background: "#e5e7eb" }} />
                <div className="flex items-center gap-1.5">
                  <DollarSign size={13} style={{ color: "#145228" }} strokeWidth={2} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#145228" }}>
                    {selectedCost ? `$${selectedCost}` : "—"}
                  </span>
                  <span style={{ fontSize: 10.5, color: "#9ca3af" }}>trip cost</span>
                </div>
                <div style={{ width: 1, height: 16, background: "#e5e7eb" }} />
                <div className="flex items-center gap-1.5">
                  <MapPin size={13} style={{ color: "#6b7280" }} strokeWidth={2} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#111827" }}>{selectedTrip.stops.length}</span>
                  <span style={{ fontSize: 10.5, color: "#9ca3af" }}>stops</span>
                </div>
              </div>

              {/* Map Area */}
              <div className="flex-1 min-h-0 p-3">
                <MapPanel trip={selectedTrip} />
              </div>

              {/* Stop Details Strip */}
              <div className="px-4 py-3 border-t flex-shrink-0" style={{ borderColor: "#f3f4f6" }}>
                <div className="flex items-center gap-0">
                  {selectedTrip.stops.map((stop, i) => {
                    const isLast = i === selectedTrip.stops.length - 1;
                    const color = getStopColor(stop.label, isLast);
                    return (
                      <div key={i} className="flex items-center flex-1 min-w-0">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <div className="flex-shrink-0 flex items-center justify-center rounded-full"
                            style={{ width: 24, height: 24, background: color + "15", border: `1.5px solid ${color}` }}>
                            <MapPin size={10} style={{ color }} strokeWidth={2.5} />
                          </div>
                          <div className="min-w-0">
                            <p style={{ fontSize: 10, fontWeight: 700, color, textTransform: "uppercase", letterSpacing: "0.04em" }}>{stop.label}</p>
                            {isUrl(stop.address) ? (
                              <a href={stop.address} target="_blank" rel="noopener noreferrer"
                                className="truncate block" style={{ fontSize: 10.5, color: "#2563eb", textDecoration: "none" }}>
                                Open in Maps →
                              </a>
                            ) : (
                              <p className="truncate" style={{ fontSize: 10.5, color: "#6b7280" }}>{stop.address}</p>
                            )}
                          </div>
                        </div>
                        {!isLast && (
                          <div className="flex-shrink-0 mx-2 flex items-center">
                            <div style={{ width: 24, height: 1, background: "#d1d5db" }} />
                            <ChevronRightIcon size={10} style={{ color: "#d1d5db", marginLeft: -2 }} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full">
              <Navigation size={40} style={{ color: "#d1d5db" }} strokeWidth={1.5} />
              <p style={{ fontSize: 14, color: "#9ca3af", fontWeight: 500, marginTop: 12 }}>
                Select a trip to view its route
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
