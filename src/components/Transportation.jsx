import { useEffect, useRef, useState, useMemo } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { useNavigate } from "react-router-dom";
import {
  MapPin, Navigation, Clock, Eye, Car, CheckCircle2,
  ChevronLeft, ChevronRight, ChevronRight as ChevronRightIcon,
  Edit2, Search, Route, Activity, DollarSign, Baby, Shield,
  Timer, Maximize2, Plus,
} from "lucide-react";

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

function formatDuration(min) {
  if (!min) return "—";
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}h ${m}m` : `${m} min`;
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
  return (
    <div className="relative flex items-center justify-center flex-shrink-0" style={{ width: 14, height: 14 }}>
      {status === "in-progress" && (
        <div className="absolute rounded-full animate-ping" style={{ width: 14, height: 14, background: color, opacity: 0.2 }} />
      )}
      <div className="rounded-full" style={{
        width: 12, height: 12,
        background: status === "pending" ? "#ffffff" : color,
        border: `2px solid ${status === "pending" ? "#d1d5db" : color}`,
        position: "relative",
      }}>
        {status === "completed" && (
          <svg style={{ position: "absolute", inset: 0, margin: "auto", width: 7, height: 7 }} viewBox="0 0 12 12" fill="none">
            <path d="M10 3L4.5 8.5L2 6" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
    </div>
  );
}

// ─── Trip Card ────────────────────────────────────────────────────────────────
function TripCard({ trip, isSelected, onClick, navigate }) {
  const statusStyle = getStatusStyle(trip.overallStatus);
  const totalCost = trip.distanceKm ? (trip.distanceKm * 0.58).toFixed(2) : null;

  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-xl border transition-all duration-150 overflow-hidden"
      style={{
        borderColor: isSelected ? "#145228" : "#e5e7eb",
        background: isSelected ? "#f7fdf9" : "#ffffff",
        boxShadow: isSelected
          ? "0 0 0 1.5px #145228, 0 4px 16px rgba(20,82,40,0.13)"
          : "0 1px 3px rgba(0,0,0,0.04)",
      }}
    >
      <div className="flex">
        {/* Green accent bar */}
        <div
          className="flex-shrink-0 transition-all duration-150"
          style={{ width: isSelected ? 4 : 0, background: "#145228", borderRadius: "4px 0 0 4px" }}
        />

        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="px-4 pt-3.5 pb-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2.5">
                <div
                  className="flex items-center justify-center rounded-full text-white font-bold flex-shrink-0"
                  style={{
                    width: 32, height: 32, fontSize: 12,
                    backgroundColor: "#1f7a3c",
                    border: isSelected ? "2px solid #145228" : "2px solid #f3f4f6",
                  }}
                >
                  {(trip.clientName || "?").charAt(0).toUpperCase()}
                </div>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: isSelected ? "#145228" : "#111827", lineHeight: 1.2 }}>
                    {trip.clientName || "—"}
                  </p>
                  <p style={{ fontSize: 10.5, color: "#9ca3af", fontWeight: 500 }}>{trip.tripId}</p>
                </div>
              </div>
              <span
                className="px-2 py-0.5 rounded-full"
                style={{ fontSize: 10, fontWeight: 600, color: statusStyle.color, background: statusStyle.bg, border: `1px solid ${statusStyle.border}` }}
              >
                {trip.overallStatus}
              </span>
            </div>

            {/* Meta row */}
            <div className="flex items-center gap-1.5 flex-wrap mb-3">
              <span
                className="px-2 py-0.5 rounded"
                style={{ fontSize: 10, fontWeight: 500, color: "#374151", background: isSelected ? "#e6f4ea" : "#f3f4f6" }}
              >
                {trip.staffName}
              </span>
              <SeatBadge category={trip.seatCategory} />
            </div>

            {/* Vertical Timeline */}
            <div className="relative ml-1.5">
              {trip.stops.map((stop, i) => {
                const isLast = i === trip.stops.length - 1;
                const color = getStopColor(stop.label, isLast);
                return (
                  <div key={i} className="relative flex items-start gap-3" style={{ paddingBottom: isLast ? 0 : 10 }}>
                    {!isLast && (
                      <div
                        className="absolute rounded-full"
                        style={{
                          left: 5.5, top: 14, width: 1.5,
                          height: "calc(100% - 4px)",
                          background: stop.status === "completed" ? "#bbf7d0" : "#e5e7eb",
                        }}
                      />
                    )}
                    <TimelineNode status={stop.status} color={color} />
                    <div className="flex-1 min-w-0 pt-px">
                      <div className="flex items-center justify-between gap-2">
                        <span style={{ fontSize: 11, fontWeight: 700, color, letterSpacing: "0.02em" }}>{stop.label}</span>
                        <span style={{ fontSize: 10, color: "#9ca3af", fontWeight: 500 }}>{stop.time}</span>
                      </div>
                      <p className="truncate" style={{ fontSize: 11, color: "#6b7280", marginTop: 1 }}>{stop.address}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer */}
          <div
            className="flex items-center justify-between px-4 py-2 border-t"
            style={{
              borderColor: isSelected ? "#d1e7d9" : "#f3f4f6",
              background: isSelected ? "#eef8f1" : "#fafafa",
              borderRadius: "0 0 12px 12px",
            }}
          >
            <div className="flex items-center gap-4">
              {trip.distanceKm && (
                <div className="flex items-center gap-1">
                  <Route size={11} style={{ color: isSelected ? "#145228" : "#9ca3af" }} strokeWidth={2} />
                  <span style={{ fontSize: 11, fontWeight: 600, color: isSelected ? "#145228" : "#374151" }}>
                    {trip.distanceKm.toFixed(1)} km
                  </span>
                </div>
              )}
              {trip.durationMin && (
                <div className="flex items-center gap-1">
                  <Timer size={11} style={{ color: isSelected ? "#145228" : "#9ca3af" }} strokeWidth={2} />
                  <span style={{ fontSize: 11, fontWeight: 600, color: isSelected ? "#145228" : "#374151" }}>
                    {formatDuration(trip.durationMin)}
                  </span>
                </div>
              )}
              {totalCost && (
                <div className="flex items-center gap-1">
                  <DollarSign size={11} style={{ color: isSelected ? "#145228" : "#9ca3af" }} strokeWidth={2} />
                  <span style={{ fontSize: 11, fontWeight: 600, color: "#145228" }}>${totalCost}</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={(e) => { e.stopPropagation(); navigate(`/admin-dashboard/shift-report/${trip.id}`); }}
                className="p-1.5 rounded transition-all hover:bg-gray-100"
                style={{ color: "#6b7280" }}
                title="View Report"
              >
                <Eye size={13} strokeWidth={2} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); navigate(`/admin-dashboard/add/update-user-shift/${trip.id}`); }}
                className="p-1.5 rounded transition-all hover:bg-gray-100"
                style={{ color: "#6b7280" }}
                title="Edit"
              >
                <Edit2 size={13} strokeWidth={2} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </button>
  );
}

// ─── SVG Route Map ────────────────────────────────────────────────────────────
function MapPanel({ trip }) {
  const stops = trip.stops;
  const padding = 60;
  const width = 700;
  const height = 460;

  // Fake lat/lng from stop index for visualization
  const points = stops.map((stop, i) => ({
    x: padding + (i / Math.max(stops.length - 1, 1)) * (width - padding * 2),
    y: i % 2 === 0
      ? padding + (height - padding * 2) * 0.3
      : padding + (height - padding * 2) * 0.65,
    ...stop,
  }));

  let pathD = "";
  if (points.length >= 2) {
    pathD = `M ${points[0].x},${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const cx = (prev.x + curr.x) / 2;
      pathD += ` C ${cx},${prev.y} ${cx},${curr.y} ${curr.x},${curr.y}`;
    }
  }

  const routeColor = trip.overallStatus === "Completed" ? "#16a34a" : trip.overallStatus === "In Progress" ? "#2563eb" : "#6b7280";

  return (
    <div className="relative w-full h-full rounded-xl overflow-hidden" style={{ background: "#eef2f7" }}>
      <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet" className="block">
        <defs>
          <pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse">
            <path d="M 32 0 L 0 0 0 32" fill="none" stroke="#d6dce6" strokeWidth="0.5" />
          </pattern>
          <filter id="markerShadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="#000" floodOpacity="0.12" />
          </filter>
          <linearGradient id="routeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#16a34a" />
            <stop offset="50%" stopColor={routeColor} />
            <stop offset="100%" stopColor="#dc2626" />
          </linearGradient>
        </defs>

        <rect width="100%" height="100%" fill="url(#grid)" />

        {/* Street blocks */}
        {[
          { x: 80, y: 80, w: 160, h: 110 },
          { x: 300, y: 60, w: 130, h: 150 },
          { x: 490, y: 170, w: 110, h: 120 },
          { x: 120, y: 260, w: 150, h: 100 },
          { x: 380, y: 320, w: 170, h: 90 },
        ].map((b, i) => (
          <rect key={i} x={b.x} y={b.y} width={b.w} height={b.h} rx={6} fill="#e8edf3" stroke="#dce3ec" strokeWidth={0.5} />
        ))}

        {/* Streets */}
        {[
          { x1: 0, y1: 220, x2: width, y2: 220 },
          { x1: 0, y1: 360, x2: width, y2: 360 },
          { x1: 260, y1: 0, x2: 260, y2: height },
          { x1: 460, y1: 0, x2: 460, y2: height },
        ].map((l, i) => (
          <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke="#d0d7e2" strokeWidth={3} opacity={0.4} />
        ))}

        <path d={pathD} fill="none" stroke="#000" strokeWidth={6} strokeLinecap="round" opacity={0.06} />
        <path d={pathD} fill="none" stroke="white" strokeWidth={5} strokeLinecap="round" />
        <path d={pathD} fill="none" stroke="url(#routeGrad)" strokeWidth={3} strokeLinecap="round" />

        {trip.overallStatus === "In Progress" && (
          <path d={pathD} fill="none" stroke="white" strokeWidth={3} strokeLinecap="round" strokeDasharray="6 10" opacity={0.5}>
            <animate attributeName="stroke-dashoffset" from="0" to="-32" dur="1.2s" repeatCount="indefinite" />
          </path>
        )}

        {points.map((p, i) => {
          const isLast = i === points.length - 1;
          const markerColor = getStopColor(p.label, isLast);
          const size = (i === 0 || isLast) ? 14 : 11;
          return (
            <g key={i} filter="url(#markerShadow)">
              {p.status === "in-progress" && (
                <circle cx={p.x} cy={p.y} r={18} fill={markerColor} opacity={0}>
                  <animate attributeName="r" from="14" to="24" dur="1.6s" repeatCount="indefinite" />
                  <animate attributeName="opacity" from="0.18" to="0" dur="1.6s" repeatCount="indefinite" />
                </circle>
              )}
              <circle cx={p.x} cy={p.y} r={size} fill="white" />
              <circle cx={p.x} cy={p.y} r={size} fill="none" stroke={markerColor} strokeWidth={2.5} />
              <circle cx={p.x} cy={p.y} r={size - 5} fill={p.status === "pending" ? "#e5e7eb" : markerColor} />
              {p.status === "completed" && (
                <path
                  d={`M ${p.x - 3.5} ${p.y} L ${p.x - 1} ${p.y + 2.5} L ${p.x + 3.5} ${p.y - 2.5}`}
                  fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                />
              )}
              <rect x={p.x - 38} y={p.y - size - 22} width={76} height={18} rx={5} fill="white" stroke={markerColor} strokeWidth={1} opacity={0.95} />
              <text x={p.x} y={p.y - size - 10} textAnchor="middle" fill={markerColor}
                style={{ fontSize: "9px", fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: "0.03em" }}>
                {p.label.toUpperCase()}
              </text>
              <text x={p.x} y={p.y + size + 14} textAnchor="middle" fill="#6b7280"
                style={{ fontSize: "9px", fontWeight: 500, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                {p.time}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Controls */}
      <div className="absolute top-3 right-3">
        <button
          className="flex items-center justify-center rounded-lg bg-white/95 backdrop-blur-sm transition-all hover:bg-white"
          style={{ width: 32, height: 32, boxShadow: "0 1px 4px rgba(0,0,0,0.1)", border: "1px solid #e2e8f0" }}
        >
          <Maximize2 size={13} style={{ color: "#374151" }} strokeWidth={2} />
        </button>
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

      {/* Map Ready badge */}
      <div
        className="absolute bottom-3 right-3 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/95 backdrop-blur-sm"
        style={{ border: "1px solid #e2e8f0", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
      >
        <MapPin size={10} style={{ color: "#145228" }} strokeWidth={2.5} />
        <span style={{ fontSize: 9.5, fontWeight: 600, color: "#145228" }}>Google Maps / Mapbox Ready</span>
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

export default function Transportation() {
  const navigate = useNavigate();
  const [trips, setTrips]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [search, setSearch]         = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [seatFilter, setSeatFilter] = useState("All");

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [shiftsSnap, formsSnap] = await Promise.all([
          getDocs(collection(db, "shifts")),
          getDocs(collection(db, "InTakeForms")),
        ]);

        const forms = {};
        formsSnap.forEach((d) => {
          const data = d.data();
          if (Array.isArray(data.inTakeClients)) {
            data.inTakeClients.forEach((c) => { if (c.name) forms[c.name] = c; });
          }
        });

        const allTrips = shiftsSnap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter(isTransportShift)
          .map((shift) => {
            const clientName = shift.clientName || shift.clientDetails?.name || "";
            const clientId   = shift.clientId   || shift.clientDetails?.id   || "";
            const staffName  = shift.name       || shift.staffName           || shift.user || "Unassigned";
            const agencyName = shift.agencyName || shift.clientDetails?.agencyName || "—";
            const clientForm = forms[clientName] || {};
            const seatRaw    = clientForm.typeOfSeat || "—";
            const stops      = buildStops(shift, clientForm);
            return {
              id: shift.id,
              tripId: clientId || shift.id?.slice(0, 10),
              clientName,
              staffName,
              agencyName,
              seatCategory: normalizeSeat(seatRaw),
              seatRaw,
              overallStatus: getOverallStatus(shift),
              stops,
              distanceKm: shift.distanceKm || null,
              durationMin: shift.durationMin || null,
            };
          });

        setTrips(allTrips);
        if (allTrips.length > 0) setSelectedTrip(allTrips[0]);
      } catch (e) {
        console.error("Error fetching transportation data:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filtered = useMemo(() => {
    return trips.filter((t) => {
      const q = search.toLowerCase();
      const matchSearch = !q || t.clientName.toLowerCase().includes(q) || t.tripId.toLowerCase().includes(q) || t.staffName.toLowerCase().includes(q);
      const matchStatus = statusFilter === "All" || t.overallStatus === statusFilter;
      const matchSeat   = seatFilter === "All" || t.seatCategory === SEAT_MAP[seatFilter];
      return matchSearch && matchStatus && matchSeat;
    });
  }, [trips, search, statusFilter, seatFilter]);

  const totalTrips    = trips.length;
  const activeTrips   = trips.filter((t) => t.overallStatus === "In Progress").length;
  const totalDistance = trips.reduce((s, t) => s + (t.distanceKm || 0), 0);
  const totalRevenue  = trips.reduce((s, t) => s + (t.distanceKm ? t.distanceKm * 0.58 : 0), 0);
  const selectedCost  = selectedTrip?.distanceKm ? (selectedTrip.distanceKm * 0.58).toFixed(2) : null;

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
                    {selectedTrip.distanceKm ? `${selectedTrip.distanceKm.toFixed(1)} km` : "—"}
                  </span>
                  <span style={{ fontSize: 10.5, color: "#9ca3af" }}>total distance</span>
                </div>
                <div style={{ width: 1, height: 16, background: "#e5e7eb" }} />
                <div className="flex items-center gap-1.5">
                  <Timer size={13} style={{ color: "#2563eb" }} strokeWidth={2} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#111827" }}>
                    {selectedTrip.durationMin ? formatDuration(selectedTrip.durationMin) : "—"}
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
                            <p className="truncate" style={{ fontSize: 10.5, color: "#6b7280" }}>{stop.address}</p>
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
