import React, { useEffect, useState, useRef } from "react";

// ── Date format helpers (Flutter compatibility) ───────────────────────────────
// Flutter stores: startDate="04 Jan 2025", dateKey="04-01-2025"
const _MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const formatFlutterDate = (d) =>
  `${String(d.getDate()).padStart(2,'0')} ${_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
const formatDDMMYYYY = (d) =>
  `${String(d.getDate()).padStart(2,'0')}-${String(d.getMonth()+1).padStart(2,'0')}-${d.getFullYear()}`;
// ─────────────────────────────────────────────────────────────────────────────
import { Formik, Form, Field, ErrorMessage, useFormikContext } from "formik";
import * as Yup from "yup";
import {
  getDocs,
  collection,
  addDoc,
  doc,
  getDoc,
  updateDoc,
  query,
  where,
  Timestamp,
  setDoc,
  deleteDoc,
  writeBatch,
} from "firebase/firestore";
import { db } from "../firebase";
import { FaChevronDown, FaRegCalendarAlt } from "react-icons/fa";
import SuccessSlider from "../components/SuccessSlider";
import { useParams } from "react-router-dom";
import { sendNotification } from "../utils/notificationHelper";
import { FaRegMap, FaExchangeAlt } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import PlacesAutocomplete from "./PlacesAutocomplete";
import { formatLocalISO, parseLocalSafe } from "../utils/dateHelpers";


// ---------------- OFFICE ADDRESS ----------------
const OFFICE_ADDRESS = "10110 124 St NW, Edmonton, AB T5N 1P6, Canada";

import { calculateRouteDistance } from "../utils/mapboxHelper";

// ---------------- MAPBOX DISTANCE CALCULATOR ----------------
// Returns { totalKm, officeToPickupKm, dropToOfficeKm }
const calculateTotalDistance = async (shiftPoint) => {
  const locations = [OFFICE_ADDRESS, shiftPoint.pickupLocation];
  if (shiftPoint.visitLocation) locations.push(shiftPoint.visitLocation);
  locations.push(shiftPoint.dropLocation, OFFICE_ADDRESS);

  try {
    // Calculate each leg separately so we can store them individually
    const [total, o2p, d2o] = await Promise.all([
      calculateRouteDistance(locations),
      calculateRouteDistance([OFFICE_ADDRESS, shiftPoint.pickupLocation]),
      calculateRouteDistance([shiftPoint.dropLocation, OFFICE_ADDRESS]),
    ]);
    return {
      totalKm: total ? parseFloat(total.km.toFixed(2)) : 0,
      officeToPickupKm: o2p ? parseFloat(o2p.km.toFixed(2)) : 0,
      dropToOfficeKm: d2o ? parseFloat(d2o.km.toFixed(2)) : 0,
    };
  } catch (err) {
    console.error("Mapbox Routing Error:", err);
    return { totalKm: 0, officeToPickupKm: 0, dropToOfficeKm: 0 };
  }
};


// ── Avatar colour helper ──────────────────────────────────────────────────
const AVATAR_COLORS = ['#145228','#1d4ed8','#7c3aed','#be123c','#b45309','#0e7490','#0f766e'];
const getAvatarColor = (name) => {
  let h = 0;
  for (let i = 0; i < (name || '').length; i++) h = (name.charCodeAt(i) + h * 31) % AVATAR_COLORS.length;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
};

// ── Staff Dropdown with availability badges ───────────────────────────────
function StaffDropdown({ label, sublabel, placeholder, value, onChange, users, allShifts, selectedDates, startTime, endTime, error, touched }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selectedUser = users.find(u => u.id === value);

  // Returns { count, hasConflict } for a given user across all selected dates
  const getAvailability = (userId) => {
    if (!selectedDates || selectedDates.length === 0) return null;
    let count = 0;
    let hasConflict = false;

    for (const d of selectedDates) {
      const dateISO = (d instanceof Date ? d : new Date(d)).toISOString().split('T')[0];
      const dayShifts = allShifts.filter(s => {
        const isUser =
          s.primaryUserId === userId ||
          s.userId === userId ||
          s.secondaryUserDocId === userId;
        if (!isUser) return false;
        try {
          let iso = s.dateKey_iso;
          if (!iso && s.dateKey) {
            const p = s.dateKey.split('-');
            if (p.length === 3) iso = `${p[2]}-${p[1]}-${p[0]}`;
          }
          if (!iso) {
            const sd = s.startDate?.toDate ? s.startDate.toDate() : new Date((s.startDate || '').replace(/,/g, '').trim());
            if (!isNaN(sd)) iso = sd.toISOString().split('T')[0];
          }
          return iso === dateISO;
        } catch { return false; }
      });
      count += dayShifts.length;
      if (startTime && endTime) {
        dayShifts.forEach(s => {
          if (s.startTime && s.endTime && s.startTime < endTime && startTime < s.endTime) hasConflict = true;
        });
      }
    }
    return { count, hasConflict };
  };

  return (
    <div className="relative" ref={ref}>
      <label className="block font-semibold mb-2" style={{ fontSize: 13, color: '#374151' }}>
        {label}{sublabel && <span style={{ fontWeight: 400, color: '#9ca3af' }}> {sublabel}</span>}
      </label>
      <button
        type="button"
        onClick={() => setOpen(p => !p)}
        className={`w-full px-3 py-2.5 rounded-lg border text-left flex items-center justify-between transition-all focus:outline-none text-sm ${error && touched ? 'border-red-400' : 'border-[#e5e7eb]'}`}
        style={{ color: value ? '#374151' : '#9ca3af' }}
      >
        <span className="truncate">{selectedUser ? selectedUser.name : placeholder}</span>
        <FaChevronDown className="text-gray-400 w-3.5 h-3.5 shrink-0 ml-2" />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white rounded-xl border shadow-lg" style={{ borderColor: '#e5e7eb', maxHeight: 300, overflowY: 'auto' }}>
          {/* Clear / none option for optional fields */}
          {sublabel && (
            <button type="button" onClick={() => { onChange(''); setOpen(false); }}
              className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 transition-colors"
              style={{ color: '#9ca3af', borderBottom: '1px solid #f3f4f6' }}>
              — None (optional)
            </button>
          )}
          {users.map((u, i) => {
            const avail = getAvailability(u.id);
            const isSelected = u.id === value;
            return (
              <button key={u.id} type="button"
                onClick={() => { onChange(u.id); setOpen(false); }}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
                style={{ background: isSelected ? '#f0fdf4' : undefined, borderBottom: i < users.length - 1 ? '1px solid #f3f4f6' : undefined }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
                    style={{ background: getAvatarColor(u.name) }}>
                    {(u.name || 'U').charAt(0).toUpperCase()}
                  </div>
                  <div className="text-left min-w-0">
                    <p className="font-semibold text-gray-900 truncate" style={{ fontSize: 13 }}>{u.name}</p>
                    {u.role && <p className="capitalize" style={{ fontSize: 11, color: '#9ca3af' }}>{u.role}</p>}
                  </div>
                </div>
                {avail !== null && (
                  avail.hasConflict ? (
                    <span className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ml-2"
                      style={{ background: '#fef2f2', color: '#ef4444' }}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                      Conflict
                    </span>
                  ) : avail.count > 0 ? (
                    <span className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ml-2"
                      style={{ background: '#fffbeb', color: '#d97706' }}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                      {avail.count} shift{avail.count > 1 ? 's' : ''} assigned
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ml-2"
                      style={{ background: '#f0fdf4', color: '#16a34a' }}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                      Available
                    </span>
                  )
                )}
              </button>
            );
          })}
        </div>
      )}
      {error && touched && <div className="text-red-500 text-xs mt-1">{error}</div>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
const AddUserShift = ({ mode = "add", user }) => {
  const { id } = useParams();

  const [shiftTypes, setShiftTypes] = useState([]);
  const [shiftCategories, setShiftCategories] = useState([]);
  // Maps every raw Firestore category ID → its normalized display name.
  // Built from ALL docs (before dedup), so IDs that get merged/dropped are still resolvable.
  const allCategoryIdMapRef = useRef({});
  const [clients, setClients] = useState([]);
  const [users, setUsers] = useState([]);

  const [initialValues, setInitialValues] = useState({
    shiftType: "",
    shiftCategory: "",
    client: "",
    primaryUser: "",
    secondaryUser: "",
    vehicleType: "",
    startDate: "",
    endDate: "",
    startTime: "",
    endTime: "",
    description: "",
    shiftAddress: "",
    accessToShiftReport: false,
    shiftDates: [],
  });

  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedPrimaryUser, setSelectedPrimaryUser] = useState(null);
  const [selectedSecondaryUser, setSelectedSecondaryUser] = useState(null);
  const [selectedShiftType, setSelectedShiftType] = useState(null);
  const [selectedShiftCategory, setSelectedShiftCategory] = useState(null);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [monthShifts, setMonthShifts] = useState([]);
  const [originalClockIn, setOriginalClockIn] = useState("");
  const [originalClockOut, setOriginalClockOut] = useState("");
  const [repeatEnabled, setRepeatEnabled] = useState(false);
  const [repeatDays, setRepeatDays] = useState([]); // 0=Mon … 6=Sun
  const [repeatEndCondition, setRepeatEndCondition] = useState("none"); // "none"|"after"|"on"
  const [repeatOccurrences, setRepeatOccurrences] = useState(4);
  const [repeatEndDate, setRepeatEndDate] = useState("");

  const navigate = useNavigate();



  const [slider, setSlider] = useState({
    show: false,
    title: "",
    subtitle: "",
    redirectTo: "",
  });
  const [createdShift, setCreatedShift] = useState(null);

  // shiftPoints: active members in this shift (editable)
  const [shiftPoints, setShiftPoints] = useState([]);
  // removedShiftPoints: members removed from this shift (can be added back)
  const [removedShiftPoints, setRemovedShiftPoints] = useState([]);
  // Scheduled km (office → pickup → drop → office), auto-calculated via map
  const [scheduledKm, setScheduledKm] = useState(0);
  const [kmCalculating, setKmCalculating] = useState(false);
  // Category warning when selected date doesn't match any configured weekday
  const [categoryWarning, setCategoryWarning] = useState("");
  // Return trip state (transportation only)
  const [returnTrip, setReturnTrip] = useState(false);
  const [returnStartTime, setReturnStartTime] = useState("");
  const [returnEndTime, setReturnEndTime] = useState("");
  const [returnShiftPoints, setReturnShiftPoints] = useState([]);
  // Return-trip driver: "" = same driver as the main shift; otherwise a staff doc id
  const [returnDriverId, setReturnDriverId] = useState("");
  const [showReturnDriverPicker, setShowReturnDriverPicker] = useState(false);
  // Track the client ID that was originally loaded from the saved shift (update mode)
  const initialLoadedClientIdRef = useRef(null);
  const batchIdRef = useRef(null); // batchId of the shift being edited (null = single shift)
  // Weekday schedule from intake: { transportationDays: number[], supervisedVisitationDays: number[] }
  const weekdayScheduleRef = useRef({ transportationDays: [], supervisedVisitationDays: [] });
  // Ref to Formik instance so we can call setFieldValue from outside the render
  const formikRef = useRef(null);

  // Auto-calculate scheduled km as ONE continuous route when multiple clients exist
  const recomputeScheduledKm = async () => {
    const valid = shiftPoints.filter((p) => p.pickupLocation && p.dropLocation);
    if (!valid.length) { setScheduledKm(0); return; }
    setKmCalculating(true);
    try {
      if (valid.length === 1) {
        const result = await calculateTotalDistance(valid[0]);
        setScheduledKm(result?.totalKm || 0);
      } else {
        // Build one continuous route: OFFICE → pickup → drop → ... → OFFICE.
        // Multiple family members sharing the same pickup/drop stop (the normal case —
        // one staff member picks up and drops off all siblings together) must only be
        // visited once each, otherwise the route re-drives the same leg per child and
        // the distance gets doubled (or worse) for no real-world reason.
        const waypoints = [OFFICE_ADDRESS];
        const seen = new Set([OFFICE_ADDRESS.trim().toLowerCase()]);
        const pushUnique = (addr) => {
          const key = (addr || "").trim().toLowerCase();
          if (!key || seen.has(key)) return;
          seen.add(key);
          waypoints.push(addr);
        };
        valid.forEach((p) => {
          pushUnique(p.pickupLocation);
          if (p.visitLocation) pushUnique(p.visitLocation);
          pushUnique(p.dropLocation);
        });
        waypoints.push(OFFICE_ADDRESS);
        const result = await calculateRouteDistance(waypoints);
        setScheduledKm(result ? parseFloat(result.km.toFixed(2)) : 0);
      }
    } catch (e) {
      console.warn("scheduled km error", e);
    } finally {
      setKmCalculating(false);
    }
  };

  useEffect(() => {
    const valid = shiftPoints.filter((p) => p.pickupLocation && p.dropLocation);
    if (!valid.length) { setScheduledKm(0); return; }
    const t = setTimeout(() => { recomputeScheduledKm(); }, 800);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(shiftPoints.map((p) => [p.pickupLocation, p.dropLocation]))]);
  // Description pulled from the matched intake form
  const [intakeDescription, setIntakeDescription] = useState("");

  // ---------------- VALIDATION SCHEMA ----------------
  const validationSchema = Yup.object().shape({
    shiftType: Yup.string().required("Shift type is required"),
    shiftCategory: Yup.string().required("Shift category is required"),
    client: Yup.string().required("Client selection is required"),
    primaryUser: Yup.string().required("Primary Staff selection is required"),
    secondaryUser: Yup.string().optional(),
    shiftDates: Yup.array()
      .of(Yup.date().typeError("Invalid date"))
      .min(1, "At least one shift date is required"),
    startTime: Yup.string()
      .required("Start time is required")
      .matches(
        /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
        "Please enter a valid time in HH:MM format"
      ),
    endTime: Yup.string()
      .required("End time is required")
      .matches(
        /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
        "Please enter a valid time in HH:MM format"
      ),
    description: Yup.string()
      .required("Shift description is required")
      .min(10, "Description should be at least 10 characters"),
  });

  // ---------------- FETCH DROPDOWNS ----------------
  useEffect(() => {
    const fetchDropdownData = async () => {
      try {
        const [shiftTypeSnap, shiftCategorySnap, clientSnap, userSnap] =
          await Promise.all([
            getDocs(collection(db, "dev_shiftTypes")),
            getDocs(collection(db, "dev_shiftCategories")),
            getDocs(collection(db, "dev_clients")),
            getDocs(collection(db, "dev_users")),
          ]);

        const sortByName = (a, b) => {
          const nameA = a.name || "";
          const nameB = b.name || "";
          return nameA.localeCompare(nameB);
        };

        setShiftTypes(
          shiftTypeSnap.docs
            .map((doc) => ({ id: doc.id, ...doc.data() }))
            .sort(sortByName)
        );

        // Build a complete id→normalizedName map from every raw Firestore category doc
        // so ID lookups work even for entries that get deduped out of the visible dropdown.
        const NORMALIZE_NAME = (name) => {
          if (!name) return "";
          const n = name.trim();
          if (n === "Supervised Visitation + Transportation") return "Supervised Visitation";
          if (n === "Office Admin") return "";  // excluded
          return n;
        };
        const idMap = {};
        shiftCategorySnap.docs.forEach((d) => {
          const normalized = NORMALIZE_NAME(d.data().name);
          if (normalized) idMap[d.id] = normalized;
        });
        allCategoryIdMapRef.current = idMap;

        // Only 4 visible categories; "Supervised Visitation + Transportation" maps to "Supervised Visitation"
        const FOUR_CATEGORIES = ["Emergent Care", "Respite Care", "Transportation", "Supervised Visitation"];
        const allowedNames = new Set([...FOUR_CATEGORIES, "Supervised Visitation + Transportation"]);
        const rawCategories = shiftCategorySnap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((c) => allowedNames.has(c.name));
        // Merge "Supervised Visitation + Transportation" under "Supervised Visitation"
        const seenNames = new Set();
        const mergedCategories = rawCategories
          .map((c) => c.name === "Supervised Visitation + Transportation"
            ? { ...c, name: "Supervised Visitation" }
            : c)
          .filter((c) => {
            if (seenNames.has(c.name)) return false;
            seenNames.add(c.name);
            return true;
          })
          .sort((a, b) => FOUR_CATEGORIES.indexOf(a.name) - FOUR_CATEGORIES.indexOf(b.name));
        setShiftCategories(mergedCategories.length > 0 ? mergedCategories : [
          { id: "emergent",      name: "Emergent Care" },
          { id: "respite",       name: "Respite Care" },
          { id: "transportation",name: "Transportation" },
          { id: "supervised",    name: "Supervised Visitation" },
        ]);

        setClients(
          clientSnap.docs
            .map((doc) => ({ id: doc.id, ...doc.data() }))
            .filter((c) => !c.isDeleted)
            .sort(sortByName)
        );

        setUsers(
          userSnap.docs
            .map((doc) => ({ id: doc.id, ...doc.data() }))
            .filter((u) => !u.isSuspended && !u.isDeleted)
            .sort(sortByName)
        );
      } catch (error) {
        console.error("Error fetching dropdown data: ", error);
      }
    };
    fetchDropdownData();
  }, []);

  // ---------------- DATE HELPERS ----------------
  // Converts any Firestore date value to a LOCAL "YYYY-MM-DD" string.
  // Uses parseLocalSafe so "YYYY-MM-DD" ISO strings are never treated as UTC midnight.
  const formatDateFromFirestore = (dateValue) => {
    if (!dateValue) return "";
    const d = parseLocalSafe(dateValue);
    if (!d) return "";
    const year  = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day   = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };


  const normalizeDate = (input) => {
    if (input instanceof Date) return input;
    if (input?.toDate) return input.toDate();

    const direct = new Date(input);
    if (!isNaN(direct)) return direct;

    const parts = String(input).split(" ");
    if (parts.length === 3) {
      const [day, monthName, year] = parts;
      const monthIndex = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
      ].findIndex(m => m.toLowerCase() === monthName.toLowerCase() || m.substring(0, 3).toLowerCase() === monthName.toLowerCase());

      if (monthIndex !== -1) {
        return new Date(Number(year), monthIndex, Number(day));
      }
    }

    throw new Error("Invalid date format: " + input);
  };

  // ---------------- UPDATE MODE: FETCH EXISTING SHIFT ----------------
  useEffect(() => {
    const fetchShiftData = async () => {
      if (mode === "update" && id) {
        try {
          const docRef = doc(db, "dev_shifts", id);
          const docSnap = await getDoc(docRef);

          if (!docSnap.exists()) return;
          const data = docSnap.data();

          // ✅ Normalize field names across old/new schemas
          const shiftTypeName =
            data.shiftType ||
            data.typeName ||
            data.shiftTypeName ||
            "";
          const shiftCategoryName =
            data.shiftCategory ||
            data.categoryName ||
            data.shiftCategoryName ||
            "";

          const clientName =
            data.clientName ||
            data.clientDetails?.name ||
            data.clientDetails?.fullName ||
            "";

          const userName =
            data.primaryUserName ||
            data.name ||
            data.userName ||
            data.userDetails?.name ||
            "";

          // ✅ Match type & category safely (case-insensitive)
          const shiftTypeObj = shiftTypes.find(
            (s) =>
              s.name?.toLowerCase() === shiftTypeName.toLowerCase() ||
              s.id === shiftTypeName
          );

          const shiftCategoryObj = shiftCategories.find(
            (c) =>
              c.name?.toLowerCase() === shiftCategoryName.toLowerCase() ||
              c.id === shiftCategoryName
          );

          // ✅ Match client & user safely
          const clientObj = clients.find(
            (c) =>
              c.name?.toLowerCase() === clientName.toLowerCase() ||
              String(c.id) === String(data.client) ||
              String(c.id) === String(data.clientId)
          );

          const userObj = users.find(
            (u) =>
              u.name?.toLowerCase() === userName.toLowerCase() ||
              String(u.id) === String(data.primaryUserId) ||
              String(u.id) === String(data.user) ||
              String(u.id) === String(data.userId)
          );

          const secondaryUserName = data.secondaryUserName || "";
          const secondaryUserObj = users.find(
            (u) =>
              (secondaryUserName && u.name?.toLowerCase() === secondaryUserName.toLowerCase()) ||
              String(u.id) === String(data.secondaryUserId)
          );

          // ✅ Normalize dates
          const startISO = formatDateFromFirestore(data.startDate);
          const endISO = formatDateFromFirestore(data.endDate);

          // Store batchId so the update handler can update all selected-date siblings
          batchIdRef.current = data.batchId || null;

          // Load ALL dates from this batch so editing one shift shows all sibling dates
          const calendarDates = [];
          if (data.batchId) {
            try {
              const batchSnap = await getDocs(
                query(collection(db, "dev_shifts"), where("batchId", "==", data.batchId))
              );
              batchSnap.docs.forEach((bDoc) => {
                const bData = bDoc.data();
                const bISO = formatDateFromFirestore(bData.startDate);
                if (bISO) {
                  const bd = parseLocalSafe(bISO);
                  if (bd) calendarDates.push(bd);
                }
              });
              // Sort ascending
              calendarDates.sort((a, b) => a - b);
            } catch (e) {
              console.warn("Batch load failed:", e);
            }
          }
          // Fallback: just the current shift's date
          if (calendarDates.length === 0 && startISO) {
            const d = parseLocalSafe(startISO);
            if (d) calendarDates.push(d);
          }

          // ✅ Handle all shift point schema versions (old + new)
          let points = [];

          if (Array.isArray(data.shiftPoints) && data.shiftPoints.length > 0) {
            points = data.shiftPoints.map((p) => ({
              name: p.name || "",
              order: p.order ?? 0,
              pickupLocation: p.pickupLocation || "",
              pickupTime: p.pickupTime || "",
              pickupLatitude: p.pickupLatitude || 0,
              pickupLongitude: p.pickupLongitude || 0,

              visitLocation: p.visitLocation || "",
              visitStartTime: p.visitStartTime || "",
              visitEndTime: p.visitEndTime || "",
              visitLatitude: p.visitLatitude || 0,
              visitLongitude: p.visitLongitude || 0,

              dropLocation: p.dropLocation || "",
              dropTime: p.dropTime || "",
              dropLatitude: p.dropLatitude || 0,
              dropLongitude: p.dropLongitude || 0,

              seatType: p.seatType || "",
              transportationMode: p.transportationMode || "",

              totalKilometers:
                p.totalKilometers !== undefined && p.totalKilometers !== null
                  ? Number(p.totalKilometers)
                  : 0,
              officeToPickupKm: Number(p.officeToPickupKm) || 0,
              dropToOfficeKm: Number(p.dropToOfficeKm) || 0,
            }));
          } else {
            points = [
              {
                pickupLocation: "",
                pickupTime: "",
                visitLocation: "",
                visitStartTime: "",
                visitEndTime: "",
                dropLocation: "",
                dropTime: "",
                seatType: "",
                transportationMode: "",
                totalKilometers: 0,
              },
            ];
          }

          setShiftPoints(points);


          // ✅ Set selectedClient so the intake fetch useEffect can run
          if (clientObj) {
            setSelectedClient(clientObj);
            // Remember this client ID — used to detect when user later changes client
            initialLoadedClientIdRef.current = clientObj.id;
          }
          if (userObj) setSelectedPrimaryUser(userObj);
          if (secondaryUserObj) setSelectedSecondaryUser(secondaryUserObj);
          if (shiftTypeObj) setSelectedShiftType(shiftTypeObj);
          if (shiftCategoryObj) setSelectedShiftCategory(shiftCategoryObj);

          // ✅ Prefill all fields
          setInitialValues((prev) => ({
            ...prev,
            shiftType: shiftTypeObj ? shiftTypeObj.name : shiftTypeName,
            shiftCategory: shiftCategoryObj ? shiftCategoryObj.name : shiftCategoryName,
            client: clientObj ? clientObj.id : "",
            primaryUser: userObj ? userObj.id : "",
            secondaryUser: secondaryUserObj ? secondaryUserObj.id : (data.secondaryUserId || ""),
            vehicleType: data.vehicleType || "",
            startDate: startISO,
            endDate: endISO,
            startTime: data.startTime || "",
            endTime: data.endTime || "",
            description: data.jobdescription || data.description || "",
            shiftAddress: data.shiftAddress || "",
            accessToShiftReport: data.accessToShiftReport || false,
            shiftDates: calendarDates,
          }));

          setOriginalClockIn(data.clockIn || "");
          setOriginalClockOut(data.clockOut || "");

          console.log("✅ Prefilled Shift Data:", {
            shiftTypeName,
            shiftCategoryName,
            clientName,
            userName,
            shiftPoints: points,
          });
        } catch (error) {
          console.error("Error fetching shift for update:", error);
        }
      }
    };

    if (
      shiftTypes.length &&
      shiftCategories.length &&
      clients.length &&
      users.length
    ) {
      fetchShiftData();
    }
  }, [mode, id, shiftTypes, shiftCategories, clients, users]);


  // ---------------- FETCH SHIFT POINTS & DESCRIPTION FROM CLIENT / INTAKE ----------------
  useEffect(() => {
    const loadFromClient = async () => {
      if (!selectedClient) {
        if (mode !== "update") {
          setShiftPoints([]);
          setRemovedShiftPoints([]);
          setIntakeDescription("");
          formikRef.current?.setFieldValue("description", "");
        }
        return;
      }

      // In update mode, only skip intake fetch if:
      // 1. The saved shift points have real data, AND
      // 2. The currently selected client is the same one that was originally loaded
      //    (i.e. the user has NOT changed the client — if they did, always re-fetch)
      // In update mode, skip intake fetch if we just loaded the specific shift data for this client
      if (mode === "update") {
        const isSameClientAsLoaded = initialLoadedClientIdRef.current &&
          selectedClient?.id === initialLoadedClientIdRef.current;

        // If it's the same client, we trust the points already in state (or just set by fetchShiftData)
        // We only proceed to fetch from intake if the user deliberately changed the client
        if (isSameClientAsLoaded) return;
      }

      // Always clear stale data from the previous client before loading new one
      setShiftPoints([]);
      setRemovedShiftPoints([]);
      // Clear category & description so the old client's values never bleed into the new client
      if (mode !== "update") {
        formikRef.current?.setFieldValue("shiftCategory", "");
        setSelectedShiftCategory(null);
        formikRef.current?.setFieldValue("description", "");
        setIntakeDescription("");
      }

      let pointsFound = [];

      // Helper: resolve any raw value (ID, name, array) to a normalized category name
      const resolveCategory = (raw) => {
        if (!raw) return "";
        const candidates = Array.isArray(raw) ? raw : [raw];
        const aliasMap = [
          { keywords: ["supervised visitation + transportation", "supervised + transportation", "supervisedvisitation+transportation"], name: "Supervised Visitation" },
          { keywords: ["supervised visitation", "supervisedvisitation", "supervised_visitation"], name: "Supervised Visitation" },
          { keywords: ["transportation", "transport"], name: "Transportation" },
          { keywords: ["respite care", "respite", "respitecare"], name: "Respite Care" },
          { keywords: ["emergent care", "emergent", "emergentcare", "emergency care", "emergency"], name: "Emergent Care" },
        ];
        for (const val of candidates) {
          const str = String(val).trim();
          if (!str) continue;
          // 1. Full Firestore ID map (catches IDs of merged/deduped entries)
          if (allCategoryIdMapRef.current[str]) return allCategoryIdMapRef.current[str];
          // 2. Exact name match against visible dropdown
          const exact = shiftCategories.find((c) => c.name.toLowerCase() === str.toLowerCase());
          if (exact) return exact.name;
          // 3. Explicit "+Transportation" name string
          if (str.toLowerCase() === "supervised visitation + transportation") return "Supervised Visitation";
          // 4. Keyword alias
          const strLower = str.toLowerCase();
          for (const alias of aliasMap) {
            if (alias.keywords.some((kw) => strLower.includes(kw))) return alias.name;
          }
        }
        return "";
      };

      // ── 0. Try to resolve category directly from the client document ──
      // Try every field that could contain the service type (string or array).
      if (mode !== "update") {
        // Collect all candidate values from the client document
        const clientCandidates = [
          selectedClient.serviceType,
          selectedClient.services?.serviceType,
          selectedClient.services?.serviceRequired,
          selectedClient.category,
          selectedClient.typeName,
          selectedClient.shiftCategory,
          selectedClient.categoryName,
          selectedClient.serviceCategory,
          selectedClient.serviceRequired,
          selectedClient.service,
          selectedClient.shiftType,
          selectedClient.type,
        ].filter(Boolean);

        // Also scan every string/array value inside selectedClient.services object
        if (selectedClient.services && typeof selectedClient.services === "object") {
          Object.values(selectedClient.services).forEach((v) => {
            if (v && (typeof v === "string" || Array.isArray(v))) clientCandidates.push(v);
          });
        }

        let resolvedFromClient = "";
        for (const raw of clientCandidates) {
          const r = resolveCategory(raw);
          if (r) { resolvedFromClient = r; break; }
        }

        // Structural heuristic: if client has pickup/drop info (shiftPoints or direct fields)
        // and no category found yet, it must be Transportation or Supervised Visitation
        if (!resolvedFromClient) {
          const pts = Array.isArray(selectedClient.shiftPoints) ? selectedClient.shiftPoints : [];
          const hasPickupDrop = pts.some(sp => sp.pickupLocation || sp.dropLocation)
            || selectedClient.pickupLocation || selectedClient.dropLocation;
          const hasVisit = pts.some(sp => sp.visitLocation) || selectedClient.visitLocation;

          if (hasPickupDrop && hasVisit) resolvedFromClient = "Supervised Visitation";
          else if (hasPickupDrop) resolvedFromClient = "Transportation";
        }

        if (resolvedFromClient) {
          formikRef.current?.setFieldValue("shiftCategory", resolvedFromClient);
          const catObj = shiftCategories.find((c) => c.name === resolvedFromClient);
          if (catObj) setSelectedShiftCategory(catObj);
        }
      }

      // ── 1. If client has shiftPoints (family client), use those first ──
      if (Array.isArray(selectedClient.shiftPoints) && selectedClient.shiftPoints.length > 0) {
        pointsFound = selectedClient.shiftPoints.map((sp) => ({
          name: sp.name || "",
          pickupLocation: sp.pickupLocation || "",
          pickupTime: sp.pickupTime || "",
          visitLocation: sp.visitLocation || "",
          visitStartTime: sp.visitStartTime || "",
          visitEndTime: sp.visitEndTime || "",
          dropLocation: sp.dropLocation || "",
          dropTime: sp.dropTime || "",
          seatType: sp.seatType || "",
          transportationMode: sp.transportationMode || "",
          totalKilometers: 0,
        }));
      }

      // ── 2. Fetch from intake form (Description AND Shift Points) ──
      try {
        const clientNameCandidate = (selectedClient.name || "").trim();
        if (!clientNameCandidate) return;

        const snap = await getDocs(collection(db, "dev_InTakeForms"));

        // Sort intake forms by createdAt (newest first) to prioritize most recent updates
        const sortedDocs = snap.docs.sort((a, b) => {
          const aData = a.data();
          const bData = b.data();
          const aTime = aData.createdAt?.toDate
            ? aData.createdAt.toDate().getTime()
            : (typeof aData.createdAt === "number" ? aData.createdAt : 0);
          const bTime = bData.createdAt?.toDate
            ? bData.createdAt.toDate().getTime()
            : (typeof bData.createdAt === "number" ? bData.createdAt : 0);
          return bTime - aTime;
        });

        let foundDesc = "";
        let foundCategory = "";
        let intakePoints = [];

        // Build surname/keyword list from the selected client name
        // e.g. "Kaskamin Family" → ["kaskamin"], "Justice Kaskamin" → ["justice","kaskamin"]
        const clientKeywords = clientNameCandidate
          .toLowerCase()
          .split(/\s+/)
          .filter((w) => w.length > 2 && w !== "family" && w !== "the");

        // Require ALL client keywords to match — using only surname caused false positives
        // when two clients share a surname (e.g. "Craig Owens" vs "Sandra Owens").
        const surnameKeyword = clientKeywords.length > 0
          ? clientKeywords[clientKeywords.length - 1]
          : null;

        sortedDocs.forEach((d) => {
          const data = d.id ? { id: d.id, ...d.data() } : d.data();
          const nameMatch = (n) => (n || "").trim().toLowerCase() === clientNameCandidate.toLowerCase();
          // Partial match: ALL client keywords must appear as complete words in the name.
          // e.g. "Craig Owens" (keywords: ["craig","owens"]) requires both words to match,
          // preventing false positives when two clients share only a surname.
          const partialMatch = (n) => {
            if (!n || clientKeywords.length === 0) return false;
            const words = (n || "").toLowerCase().split(/[\s,]+/);
            return clientKeywords.every(kw => words.includes(kw));
          };

          let isMatch = false;
          // ── Exact matches first ──
          // Also match by client Firestore document ID
          const idMatch = selectedClient.id && (
            data.clientId === selectedClient.id ||
            data.id === selectedClient.id ||
            d.id === selectedClient.id
          );

          if (
            idMatch ||
            nameMatch(data.clientName) || nameMatch(data.name) ||
            nameMatch(data.nameOfPerson) || nameMatch(data.familyName) ||
            nameMatch(data.nameInClientTable) || nameMatch(data.childsName)
          ) {
            isMatch = true;
          }
          if (!isMatch && Array.isArray(data.inTakeClients)) {
            if (data.inTakeClients.some(cl => nameMatch(cl.name) || nameMatch(cl.fullName))) isMatch = true;
          }
          if (!isMatch && data.clients && typeof data.clients === "object") {
            const clientObjects = Object.values(data.clients);
            if (clientObjects.some(c => nameMatch(c.fullName || c.name))) isMatch = true;
          }
          if (!isMatch && Array.isArray(data.parentInfoList)) {
            if (data.parentInfoList.some(p => nameMatch(p.parentName))) isMatch = true;
          }
          if (!isMatch && data.parentName && nameMatch(data.parentName)) isMatch = true;

          // ── Surname/partial fallback (e.g. "Kaskamin Family" → matches "Alice Kaskamin") ──
          if (!isMatch && clientKeywords.length > 0) {
            if (
              partialMatch(data.clientName) || partialMatch(data.name) ||
              partialMatch(data.nameOfPerson) || partialMatch(data.familyName) ||
              partialMatch(data.nameInClientTable) || partialMatch(data.childsName)
            ) {
              isMatch = true;
            }
            if (!isMatch && data.clients && typeof data.clients === "object") {
              if (Object.values(data.clients).some(c => partialMatch(c.fullName || c.name))) isMatch = true;
            }
            if (!isMatch && Array.isArray(data.parentInfoList)) {
              if (data.parentInfoList.some(p => partialMatch(p.parentName))) isMatch = true;
            }
            if (!isMatch && data.parentName && partialMatch(data.parentName)) isMatch = true;
            if (!isMatch && Array.isArray(data.inTakeClients)) {
              if (data.inTakeClients.some(cl => partialMatch(cl.name) || partialMatch(cl.fullName))) isMatch = true;
            }
          }

          if (isMatch) {
            // Find Description — check all known field names across old and new form schemas
            const possibleDesc = data.jobDescription || data.description || data.notes
              || data.services?.serviceDesc || data.serviceDesc
              || data.serviceDetail                         // old flutter private forms
              || (Array.isArray(data.inTakeClients) && data.inTakeClients[0]?.otherServiceConcerns)
              || (Array.isArray(data.inTakeClients) && data.inTakeClients[0]?.serviceDetail)
              || (Array.isArray(data.inTakeClients) && data.inTakeClients[0]?.servicePlanAndRisk)
              || "";
            if (possibleDesc && !foundDesc) foundDesc = possibleDesc;

            // Find Service Category — check every possible field in the intake form
            if (!foundCategory) {
              const rawCatCandidates = [
                data.serviceRequired,
                data.services?.serviceRequired,
                data.services?.serviceType,
                data.services?.category,
                data.serviceType,
                data.category,
                data.typeName,
                data.shiftCategory,
                data.categoryName,
                data.shiftType,
                data.type,
                data.serviceCategory,
                // Also check inside inTakeClients[0]
                Array.isArray(data.inTakeClients) && data.inTakeClients[0]?.serviceType,
                Array.isArray(data.inTakeClients) && data.inTakeClients[0]?.category,
              ].filter(Boolean);
              for (const raw of rawCatCandidates) {
                const r = resolveCategory(raw);
                if (r) { foundCategory = r; break; }
              }
            }

            // Capture weekday schedule (transportationDays / supervisedVisitationDays)
            if (
              Array.isArray(data.services?.transportationDays) && data.services.transportationDays.length > 0 ||
              Array.isArray(data.services?.supervisedVisitationDays) && data.services.supervisedVisitationDays.length > 0
            ) {
              weekdayScheduleRef.current = {
                transportationDays: data.services?.transportationDays || [],
                supervisedVisitationDays: data.services?.supervisedVisitationDays || [],
                transportationInfoList: data.transportationInfoList || [],
                supervisedVisitations: data.supervisedVisitations || [],
              };
            }

            // Find Siblings/Members for Shift Points if we don't have them yet
            if (intakePoints.length === 0) {

              // A. Support new Map structure (clients: { client1: {...}, client2: {...} })
              if (data.clients && typeof data.clients === "object" && !Array.isArray(data.clients)) {
                intakePoints = Object.values(data.clients).map((c) => {
                  const fullName = c.fullName || c.name || "";
                  // Match by THIS child's name, not the family/intake form name
                  const memberNameLower = fullName.trim().toLowerCase();
                  const memberMatch = (n) => (n || "").trim().toLowerCase() === memberNameLower;

                  // Lookup extra info from related lists by individual child name
                  const trans = Array.isArray(data.transportationInfoList)
                    ? data.transportationInfoList.find(t => memberMatch(t.clientName))
                    : null;
                  const visit = Array.isArray(data.supervisedVisitations)
                    ? data.supervisedVisitations.find(v => memberMatch(v.clientName))
                    : null;

                  return {
                    name: fullName,
                    pickupLocation: trans?.pickupAddress || c.address || "",
                    pickupTime: trans?.pickupTime || "",
                    visitLocation: visit?.visitAddress || "",
                    visitStartTime: visit?.visitStartTime || "",
                    visitEndTime: visit?.visitEndTime || "",
                    dropLocation: trans?.dropoffAddress || c.address || "",
                    dropTime: trans?.dropOffTime || "",
                    seatType: trans?.carSeatType || c.carSeatType || "",
                    transportationMode: "",
                    totalKilometers: 0,
                  };
                });
              }
              // B. Support old array structure (siblings: [...])
              else if (Array.isArray(data.siblings) && data.siblings.length > 0) {
                intakePoints = data.siblings.map((sib) => ({
                  name: sib.name || "",
                  pickupLocation: sib.pickupLocation || "",
                  pickupTime: sib.pickupTime || "",
                  visitLocation: sib.visitLocation || "",
                  visitStartTime: sib.visitStartTime || "",
                  visitEndTime: sib.visitEndTime || "",
                  dropLocation: sib.dropLocation || "",
                  dropTime: sib.dropTime || "",
                  seatType: sib.seatType || "",
                  transportationMode: sib.transportationMode || "",
                  totalKilometers: 0,
                }));
              }
              // C. Support old Flutter private forms — flat inTakeClients array
              //    Fields: pickupAddress, dropAddress, pickupTime, dropTime, address, parentAddress
              else if (Array.isArray(data.inTakeClients) && data.inTakeClients.length > 0) {
                intakePoints = data.inTakeClients.map((cl) => ({
                  name: cl.name || cl.fullName || "",
                  pickupLocation: cl.pickupAddress || cl.address || cl.parentAddress || "",
                  pickupTime: cl.pickupTime || "",
                  visitLocation: cl.visitAddress || "",
                  visitStartTime: cl.startVisitTime || cl.visitStartTime || "",
                  visitEndTime: cl.endVisitTime || cl.visitEndTime || "",
                  dropLocation: cl.dropAddress || cl.address || "",
                  dropTime: cl.dropTime || "",
                  seatType: cl.typeOfSeat || cl.carSeatRequired || "",
                  transportationMode: "",
                  totalKilometers: 0,
                }));
              }
            }
          }
        });


        // PRIORITIZE the client's own shiftPoints (accurate, tied to this exact client)
        // over the intake-form fuzzy name search, which only exists as a fallback for
        // legacy clients that don't have shiftPoints stored directly on their record.
        if (pointsFound.length > 0) {
          setShiftPoints(pointsFound);
        } else if (intakePoints.length > 0) {
          setShiftPoints(intakePoints);
        } else {
          setShiftPoints([]);
        }
        setRemovedShiftPoints([]);

        // Auto-fill description from intake form service description (only in add mode)
        if (mode !== "update" && foundDesc) {
          setIntakeDescription(foundDesc);
          formikRef.current?.setFieldValue("description", foundDesc);
        }

        // Auto-fill from intake form — override client-document value only if intake found something
        if (mode !== "update" && foundCategory) {
          formikRef.current?.setFieldValue("shiftCategory", foundCategory);
          const catObj = shiftCategories.find((c) => c.name === foundCategory);
          if (catObj) setSelectedShiftCategory(catObj);
        }

      } catch (err) {
        console.error("Error loading data from intake:", err);
      }
    };

    weekdayScheduleRef.current = { transportationDays: [], supervisedVisitationDays: [], transportationInfoList: [], supervisedVisitations: [] };
    setCategoryWarning("");
    loadFromClient();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClient, mode]);

  // applyWeekdaySchedule: called from handleDatesChange (inside Formik render) whenever dates change.
  const applyWeekdaySchedule = (dates, setFieldValue) => {
    if (mode === "update") return;
    const { transportationDays, supervisedVisitationDays, transportationInfoList, supervisedVisitations } = weekdayScheduleRef.current;
    if (!transportationDays.length && !supervisedVisitationDays.length) return;
    if (!dates.length) { setCategoryWarning(""); return; }

    const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const resolutions = dates.map(d => {
      const day = (d instanceof Date ? d : new Date(d)).getDay();
      if (transportationDays.includes(day)) return { category: "Transportation", day };
      if (supervisedVisitationDays.includes(day)) return { category: "Supervised Visitation", day };
      return { category: null, day };
    });

    const unmatched = resolutions.filter(r => !r.category);
    const matchedCategories = [...new Set(resolutions.filter(r => r.category).map(r => r.category))];

    if (unmatched.length > 0) {
      const unmatchedDayNames = [...new Set(unmatched.map(r => DAY_NAMES[r.day]))];
      setCategoryWarning(`⚠ No service is scheduled on ${unmatchedDayNames.join(" or ")}s for this client. Please select the category manually.`);
    } else {
      setCategoryWarning("");
    }

    if (matchedCategories.length === 1) {
      const resolved = matchedCategories[0];
      setFieldValue("shiftCategory", resolved);
      const catObj = shiftCategories.find(c => c.name === resolved);
      if (catObj) setSelectedShiftCategory(catObj);

      // Filter shift points to only clients in the relevant service list
      setShiftPoints(prev => {
        if (!prev.length) return prev;
        let relevantNames = [];
        if (resolved === "Transportation" && transportationInfoList.length > 0) {
          relevantNames = transportationInfoList.map(t => (t.clientName || "").trim().toLowerCase()).filter(Boolean);
        } else if (resolved === "Supervised Visitation" && supervisedVisitations.length > 0) {
          relevantNames = supervisedVisitations.map(v => (v.clientName || "").trim().toLowerCase()).filter(Boolean);
        }
        if (!relevantNames.length) return prev;
        const kept = prev.filter(p => relevantNames.includes((p.name || "").trim().toLowerCase()));
        const removed = prev.filter(p => !relevantNames.includes((p.name || "").trim().toLowerCase()));
        if (removed.length > 0) {
          setRemovedShiftPoints(rp => {
            const existing = new Set(rp.map(r => r.name));
            return [...rp, ...removed.filter(r => !existing.has(r.name))];
          });
        }
        return kept;
      });
    }
  };

  // ---------------- SUBMIT HANDLER ----------------
  const handleSubmit = async (values, { resetForm }) => {
    try {
      const { shiftDates, ...restValues } = values;
      const selectedDates = shiftDates || [];

      if (!selectedDates.length) {
        alert("Please select at least one shift date.");
        return;
      }

      // Auto-calculate Office→Pickup→Drop→Office km for any transportation/supervised shift
      // that has pickup+drop but no km yet (or is being freshly created).
      const isTransportShift = (values.shiftCategory || "").toLowerCase().match(/transportation|supervised/);
      let pointsWithKm = shiftPoints;
      let returnPointsWithKm = returnShiftPoints;
      if (isTransportShift) {
        pointsWithKm = await Promise.all(
          shiftPoints.map(async (fp) => {
            if (fp.pickupLocation && fp.dropLocation) {
              try {
                const { totalKm, officeToPickupKm, dropToOfficeKm } = await calculateTotalDistance(fp);
                return { ...fp, totalKilometers: totalKm, officeToPickupKm, dropToOfficeKm };
              } catch { /* keep existing value */ }
            }
            return fp;
          })
        );
        if (returnTrip && returnShiftPoints.length > 0) {
          returnPointsWithKm = await Promise.all(
            returnShiftPoints.map(async (fp) => {
              if (fp.pickupLocation && fp.dropLocation) {
                try {
                  const { totalKm, officeToPickupKm, dropToOfficeKm } = await calculateTotalDistance(fp);
                  return { ...fp, totalKilometers: totalKm, officeToPickupKm, dropToOfficeKm };
                } catch { /* keep existing value */ }
              }
              return fp;
            })
          );
        }
      }

      // Build final shiftPoints array — array index IS the priority order (0 = first pickup)
      const mapPoint = (fp, idx) => ({
        name: fp.name || "",
        order: idx + 1,               // 1 = first pickup, 2 = second, etc.
        pickupLocation: fp.pickupLocation || "",
        pickupTime: fp.pickupTime || "",
        pickupLatitude: fp.pickupLatitude || 0,
        pickupLongitude: fp.pickupLongitude || 0,
        visitLocation: fp.visitLocation || "",
        visitStartTime: fp.visitStartTime || "",
        visitEndTime: fp.visitEndTime || "",
        visitLatitude: fp.visitLatitude || 0,
        visitLongitude: fp.visitLongitude || 0,
        dropLocation: fp.dropLocation || "",
        dropTime: fp.dropTime || "",
        dropLatitude: fp.dropLatitude || 0,
        dropLongitude: fp.dropLongitude || 0,
        seatType: fp.seatType || "",
        transportationMode: fp.transportationMode || "",
        totalKilometers: Number(fp.totalKilometers) || 0,
        officeToPickupKm: Number(fp.officeToPickupKm) || 0,
        dropToOfficeKm: Number(fp.dropToOfficeKm) || 0,
      });
      const finalPoints = pointsWithKm.map(mapPoint);
      const finalReturnPoints = returnPointsWithKm.map(mapPoint);

      // ---------- UPDATE MODE ----------
      let batchId;
      let datesToCreate = [];

      if (mode === "update" && id) {
        const primaryStaff = users.find(u => String(u.id) === String(values.primaryUser) || String(u.userId) === String(values.primaryUser));
        const secondaryStaff = users.find(u => String(u.id) === String(values.secondaryUser) || String(u.userId) === String(values.secondaryUser));

        // Build the common field payload (everything except date-specific fields)
        const buildPayload = (shiftDate) => {
          const isOvernight = values.endTime < values.startTime;
          let endDateObj = new Date(shiftDate);
          if (isOvernight) endDateObj.setDate(endDateObj.getDate() + 1);
          const day = shiftDate.getDay();
          const isWeekend = day === 0 || day === 6;
          const cat = (values.shiftCategory || "").toLowerCase();
          const desc = (values.description || "").toLowerCase();
          const needsVisit = isWeekend || cat.includes("supervised") || desc.includes("supervised");

          return {
            ...restValues,
            clientDetails: selectedClient,
            clientId: selectedClient?.id || values.client || "",
            clientName: selectedClient?.name || "",
            userId: primaryStaff?.userId ?? primaryStaff?.id ?? values.primaryUser ?? "",
            userName: primaryStaff?.name || "",
            name: primaryStaff?.name || "",
            primaryUserId: primaryStaff?.id || "",
            primaryUserName: primaryStaff?.name || "",
            secondaryUserId: secondaryStaff?.userId || secondaryStaff?.id || "",
            secondaryUserDocId: secondaryStaff?.id || "",
            secondaryUserName: secondaryStaff?.name || "",
            vehicleType: values.vehicleType || "",
            shiftAddress: values.shiftAddress || "",
            agencyId: selectedClient?.agencyId || primaryStaff?.agencyId || "",
            agencyName: selectedClient?.agencyName || primaryStaff?.agencyName || "",
            updatedAt: new Date(),
            visitLocation: "", visitStartTime: "", visitEndTime: "",
            visitLatitude: 0, visitLongitude: 0,
            shiftPoints: finalPoints.map(p => {
              const vLoc = needsVisit ? (p.visitLocation || "").trim() : "";
              return { ...p, visitLocation: vLoc,
                visitStartTime: vLoc ? (p.visitStartTime || "") : "",
                visitEndTime: vLoc ? (p.visitEndTime || "") : "",
                visitLatitude: vLoc ? (p.visitLatitude || 0) : 0,
                visitLongitude: vLoc ? (p.visitLongitude || 0) : 0 };
            }),
            isRatified: false, isCancelled: false,
            shiftReportImageUrl: "", expenseReceiptUrl: "", profilePhotoUrl: "",
            dateKey:     formatDDMMYYYY(shiftDate),
            dateKey_iso: formatLocalISO(shiftDate),
            startDate:   formatFlutterDate(shiftDate),
            endDate:     formatFlutterDate(endDateObj),
            username:    primaryStaff?.username || primaryStaff?.name || "",
            phone:       primaryStaff?.phone    || "",
            email:       primaryStaff?.email    || "",
            typeName:    selectedShiftType?.name  || "",
            typeId:      selectedShiftType?.id    || "",
            categoryId:  selectedShiftCategory?.id || "",
            jobname:     selectedClient?.name   || "",
            jobdescription: values.description  || "",
          };
        };

        // Always update the specific shift being edited
        const qShift = query(collection(db, "shifts"), where("id", "==", id));
        const snap = await getDocs(qShift);
        if (!snap.empty) {
          const bData = snap.docs[0].data();
          const shiftDate = normalizeDate(selectedDates[0]);
          await updateDoc(snap.docs[0].ref, {
            ...buildPayload(shiftDate),
            clockIn:  bData.clockIn  || originalClockIn || "",
            clockOut: bData.clockOut || originalClockOut || "",
          });
          setSlider({
            show: true,
            title: "Shift Updated Successfully!",
            subtitle: `${selectedClient?.name || ""} on ${shiftDate.toDateString()} at ${values.startTime}`,
            redirectTo: "/admin-dashboard/dashboard",
          });

          // Any additional dates picked while editing become brand-new shifts,
          // linked to the original via the same batchId — they used to be silently dropped.
          batchId = bData.batchId || `batch_${Date.now()}`;
          datesToCreate = selectedDates.slice(1);
        }

        if (datesToCreate.length === 0) return;
      } else {
        // ---------- ADD MODE ----------
        // Shared batchId so all shifts from this submission can be found when editing
        batchId = `batch_${Date.now()}`;
        datesToCreate = selectedDates;
      }

      for (const date of datesToCreate) {
        const startDateObj = normalizeDate(date);
        const newShiftId = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

        const isOvernight = values.endTime < values.startTime;
        let endDateObj = new Date(startDateObj);
        if (isOvernight) endDateObj.setDate(endDateObj.getDate() + 1);

        const day = startDateObj.getDay();
        const isWeekend = day === 0 || day === 6;
        const cat = (values.shiftCategory || "").toLowerCase();
        const desc = (values.description || "").toLowerCase();
        const needsVisit = isWeekend || cat.includes("supervised") || desc.includes("supervised");

        const filteredPoints = finalPoints.map(p => ({
          ...p,
          visitLocation: needsVisit ? (p.visitLocation || "") : "",
          visitStartTime: needsVisit ? (p.visitStartTime || "") : "",
          visitEndTime: needsVisit ? (p.visitEndTime || "") : "",
          visitLatitude: needsVisit ? (p.visitLatitude || 0) : 0,
          visitLongitude: needsVisit ? (p.visitLongitude || 0) : 0,
        }));

        const primaryStaff = users.find(u => String(u.id) === String(values.primaryUser) || String(u.userId) === String(values.primaryUser));
        const secondaryStaff = users.find(u => String(u.id) === String(values.secondaryUser) || String(u.userId) === String(values.secondaryUser));

        // Look up client rate for this category
        const clientRateEntry = (selectedClient?.rateList || [])
          .find(r => r.id === selectedShiftCategory?.id);

        await setDoc(doc(db, "dev_shifts", newShiftId), {
          // ── Identity ──────────────────────────────────────────────
          id:            newShiftId,
          batchId:       batchId,      // links all shifts created together
          createdAt:     new Date(),

          // ── Dates — Flutter expects "DD Mon YYYY" strings + "DD-MM-YYYY" dateKey ──
          startDate:     formatFlutterDate(startDateObj),   // "04 Jan 2025"
          endDate:       formatFlutterDate(endDateObj),     // "04 Jan 2025"
          dateKey:       formatDDMMYYYY(startDateObj),      // "04-01-2025"
          timeStampId:   startDateObj.getTime(),            // Unix ms
          startTime:     values.startTime || "",
          endTime:       values.endTime   || "",

          // ── Client ────────────────────────────────────────────────
          clientId:      selectedClient?.id       || values.client || "",
          clientName:    selectedClient?.name     || "",
          jobname:       selectedClient?.name     || "",    // Flutter list title
          clientDetails: selectedClient           || null,

          // ── Staff — userId MUST be the custom userId field (Flutter queries by this) ──
          userId:        primaryStaff?.userId     ?? primaryStaff?.id ?? "",
          userName:      primaryStaff?.name       || "",
          name:          primaryStaff?.name       || "",
          username:      primaryStaff?.username   || primaryStaff?.name || "",
          phone:         primaryStaff?.phone      || "",
          email:         primaryStaff?.email      || "",
          primaryUserId: primaryStaff?.id         || "",
          primaryUserName: primaryStaff?.name     || "",
          // Secondary Staff — use custom userId; fall back to doc ID if userId is empty
          secondaryUserId: secondaryStaff?.userId || secondaryStaff?.id || "",
          secondaryUserDocId: secondaryStaff?.id || "",
          secondaryUserName: secondaryStaff?.name || "",
          vehicleType: values.vehicleType         || "",
          shiftAddress: values.shiftAddress       || "",

          // ── Shift type & category (with real Firestore IDs) ───────
          typeName:      selectedShiftType?.name  || values.shiftType     || "",
          typeId:        selectedShiftType?.id    || "",
          categoryName:  selectedShiftCategory?.name || values.shiftCategory || "",
          categoryId:    selectedShiftCategory?.id   || "",
          shiftType:     values.shiftType         || "",
          shiftCategory: values.shiftCategory     || "",

          // ── Description ───────────────────────────────────────────
          jobdescription: values.description      || "",
          description:    values.description      || "",

          // ── Agency ────────────────────────────────────────────────
          agencyId:      selectedClient?.agencyId    || primaryStaff?.agencyId    || "",
          agencyName:    selectedClient?.agencyName  || primaryStaff?.agencyName  || "",

          // ── Financial defaults ────────────────────────────────────
          clientRate:      clientRateEntry?.rate  || 0,
          clientKMRate:    clientRateEntry?.kmRate || 0,
          kms:             0,
          approvedKms:     0,
          expense:         0,
          approvedExpense: 0,

          // ── Status flags ──────────────────────────────────────────
          status:          "Confirmed",
          isRatify:        false,
          isCancelled:     false,
          shiftConfirmed:  false,
          billingStatus:   "Billable",
          locked:          false,
          accessToShiftReport: values.accessToShiftReport || false,
          totalScheduledKm: scheduledKm,

          // ── Location defaults ─────────────────────────────────────
          startLatitude:   0,
          startLongitude:  0,
          endLatitude:     0,
          endLongitude:    0,
          visitLocation:   "",
          visitStartTime:  "",
          visitEndTime:    "",
          visitLatitude:   0,
          visitLongitude:  0,

          // ── Shift points ──────────────────────────────────────────
          shiftPoints: filteredPoints.map(p => {
            const vLoc = needsVisit ? (p.visitLocation || "").trim() : "";
            return {
              ...p,
              visitLocation:  vLoc,
              visitStartTime: vLoc ? (p.visitStartTime || "") : "",
              visitEndTime:   vLoc ? (p.visitEndTime   || "") : "",
              visitLatitude:  vLoc ? (p.visitLatitude  || 0) : 0,
              visitLongitude: vLoc ? (p.visitLongitude || 0) : 0,
            };
          }),

          // ── Report / media ────────────────────────────────────────
          shiftReport:          "",
          shiftReportImageUrl:  "",
          expenseReceiptUrl:    "",
          expenseReceiptUrlList:[],
          profilePhotoUrl:      "",
          clockIn:              "",
          clockOut:             "",

          // ── React-specific extras (for admin app) ─────────────────
          dateKey_iso:   formatLocalISO(startDateObj),  // keep YYYY-MM-DD for React queries
        });


        // ✅ SEND ADMIN NOTIFICATION
        const adminQuery = query(collection(db, "dev_users"), where("role", "==", "admin"));
        const adminsSnapshot = await getDocs(adminQuery);
        for (const admin of adminsSnapshot.docs) {
          await sendNotification(admin.id, {
            type: "info",
            title: "New Shift Created",
            message: `A new shift has been added for ${selectedClient?.name || ""} on ${startDateObj.toDateString()}`,
            senderId: user.name,
            meta: {
              shiftId: newShiftId,
              entity: "Shift",
              date: startDateObj.toDateString(),
            },
          });
        }

        // ✅ SEND STAFF NOTIFICATION
        if (values.user) {
          try {
            await sendNotification(values.user, {
              type: "info",
              title: "New Shift Assigned",
              message: `You have been assigned a new shift for ${selectedClient?.name || ""} on ${startDateObj.toDateString()}`,
              senderId: user.name,
              meta: {
                shiftId: newShiftId,
                entity: "Shift",
                date: startDateObj.toDateString(),
              },
            });
          } catch (err) {
            console.error("Error sending staff notification:", err);
          }
        }

        // ── Return Trip shift (same date, swapped pickup/drop, own times) ──
        if (returnTrip && finalReturnPoints.length > 0 && returnStartTime && returnEndTime) {
          const returnShiftId = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}_ret`;
          const isReturnOvernight = returnEndTime < returnStartTime;
          let returnEndDateObj = new Date(startDateObj);
          if (isReturnOvernight) returnEndDateObj.setDate(returnEndDateObj.getDate() + 1);

          // Return trip driver — defaults to the main shift's primary staff,
          // unless the admin picked a different driver for the return leg.
          const returnStaff = returnDriverId
            ? users.find(u => String(u.id) === String(returnDriverId) || String(u.userId) === String(returnDriverId)) || primaryStaff
            : primaryStaff;

          await setDoc(doc(db, "dev_shifts", returnShiftId), {
            id:            returnShiftId,
            batchId:       batchId,
            isReturnTrip:  true,
            createdAt:     new Date(),
            startDate:     formatFlutterDate(startDateObj),
            endDate:       formatFlutterDate(returnEndDateObj),
            dateKey:       formatDDMMYYYY(startDateObj),
            timeStampId:   startDateObj.getTime(),
            startTime:     returnStartTime,
            endTime:       returnEndTime,
            clientId:      selectedClient?.id       || values.client || "",
            clientName:    selectedClient?.name     || "",
            jobname:       selectedClient?.name     || "",
            clientDetails: selectedClient           || null,
            userId:        returnStaff?.userId      ?? returnStaff?.id ?? "",
            userName:      returnStaff?.name        || "",
            name:          returnStaff?.name        || "",
            username:      returnStaff?.username    || returnStaff?.name || "",
            phone:         returnStaff?.phone       || "",
            email:         returnStaff?.email       || "",
            primaryUserId: returnStaff?.id          || "",
            primaryUserName: returnStaff?.name      || "",
            secondaryUserId: secondaryStaff?.userId || secondaryStaff?.id || "",
            secondaryUserDocId: secondaryStaff?.id  || "",
            secondaryUserName: secondaryStaff?.name || "",
            vehicleType:   values.vehicleType       || "",
            shiftAddress:  values.shiftAddress      || "",
            typeName:      selectedShiftType?.name  || values.shiftType     || "",
            typeId:        selectedShiftType?.id    || "",
            categoryName:  selectedShiftCategory?.name || values.shiftCategory || "",
            categoryId:    selectedShiftCategory?.id   || "",
            shiftType:     values.shiftType         || "",
            shiftCategory: values.shiftCategory     || "",
            jobdescription: values.description      || "",
            description:    values.description      || "",
            agencyId:      selectedClient?.agencyId    || primaryStaff?.agencyId    || "",
            agencyName:    selectedClient?.agencyName  || primaryStaff?.agencyName  || "",
            clientRate:    clientRateEntry?.rate  || 0,
            clientKMRate:  clientRateEntry?.kmRate || 0,
            kms: 0, approvedKms: 0, expense: 0, approvedExpense: 0,
            status:        "Confirmed",
            isRatify:      false,
            isCancelled:   false,
            shiftConfirmed: false,
            billingStatus: "Billable",
            locked:        false,
            accessToShiftReport: values.accessToShiftReport || false,
            startLatitude: 0, startLongitude: 0,
            endLatitude: 0, endLongitude: 0,
            visitLocation: "", visitStartTime: "", visitEndTime: "",
            visitLatitude: 0, visitLongitude: 0,
            shiftPoints:   finalReturnPoints,
            shiftReport: "", shiftReportImageUrl: "", expenseReceiptUrl: "",
            expenseReceiptUrlList: [], profilePhotoUrl: "",
            clockIn: "", clockOut: "",
            dateKey_iso: formatLocalISO(startDateObj),
          });

          // Notify the return-trip driver if they differ from the main shift's staff
          const returnStaffNotifyId = returnStaff?.userId ?? returnStaff?.id;
          const mainStaffNotifyId = primaryStaff?.userId ?? primaryStaff?.id;
          if (returnStaffNotifyId && returnStaffNotifyId !== mainStaffNotifyId) {
            try {
              await sendNotification(returnStaffNotifyId, {
                type: "info",
                title: "New Shift Assigned",
                message: `You have been assigned a return trip shift for ${selectedClient?.name || ""} on ${startDateObj.toDateString()}`,
                senderId: user.name,
                meta: {
                  shiftId: returnShiftId,
                  entity: "Shift",
                  date: startDateObj.toDateString(),
                },
              });
            } catch (err) {
              console.error("Error sending return driver notification:", err);
            }
          }
        }
      }

      // ✅ SUCCESS SLIDER
      if (mode === "update" && id) {
        // We already updated the original shift above; datesToCreate here are the
        // extra dates added during this edit, now created as new linked shifts.
        setSlider({
          show: true,
          title: "Shift Updated Successfully!",
          subtitle: `${selectedClient?.name || ""} – updated, plus ${datesToCreate.length} new date(s) added`,
          redirectTo: "/admin-dashboard/dashboard",
        });
        return;
      }

      const firstDate = normalizeDate(selectedDates[0]);
      setSlider({
        show: true,
        title: "Shifts Created Successfully!",
        subtitle: `${selectedClient?.name || ""} – ${selectedDates.length} day(s) starting ${firstDate.toDateString()} at ${values.startTime}`,
        redirectTo: "/admin-dashboard/dashboard",
      });

      setCreatedShift(values);
      resetForm();
      setShiftPoints([]);
      setRemovedShiftPoints([]);
      setReturnTrip(false);
      setReturnStartTime("");
      setReturnEndTime("");
      setReturnShiftPoints([]);
      setReturnDriverId("");
      setShowReturnDriverPicker(false);
      setIntakeDescription("");
    } catch (error) {
      console.error("Error saving shift:", error);
      alert("Failed to save shift: " + (error?.message || "Unknown error. Please try again."));
      throw error;
    }
  };


  const handleCalculateKilometers = async (shiftPoint, index) => {
    if (!shiftPoint.pickupLocation || !shiftPoint.dropLocation) {
      alert("Please enter both pickup and drop locations first.");
      return;
    }

    try {
      const { totalKm, officeToPickupKm, dropToOfficeKm } = await calculateTotalDistance(shiftPoint);
      setShiftPoints((prev) => prev.map((p, i) =>
        i === index ? { ...p, totalKilometers: totalKm, officeToPickupKm, dropToOfficeKm } : p
      ));
    } catch (err) {
      console.error("Error calculating total distance:", err);
      alert("Failed to calculate total kilometers.");
    }
  };

  // ---------------- FETCH ALL SHIFTS FOR CALENDAR DISPLAY ----------------
  useEffect(() => {
    const fetchAllShifts = async () => {
      try {
        const snap = await getDocs(collection(db, "dev_shifts"));
        setMonthShifts(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error("Error fetching shifts for calendar:", err);
      }
    };
    fetchAllShifts();
  }, []);

  // ---------------- CALENDAR GRID HELPER ----------------
  const getCalendarDays = (month) => {
    const year = month.getFullYear();
    const m = month.getMonth();
    const firstDay = new Date(year, m, 1);
    const lastDay = new Date(year, m + 1, 0);
    let startDow = firstDay.getDay(); // 0=Sun
    startDow = startDow === 0 ? 6 : startDow - 1; // Mon=0
    const days = [];
    for (let i = startDow - 1; i >= 0; i--) {
      days.push({ date: new Date(year, m, -i), isCurrentMonth: false });
    }
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push({ date: new Date(year, m, i), isCurrentMonth: true });
    }
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({ date: new Date(year, m + 1, i), isCurrentMonth: false });
    }
    return days;
  };

  // ---------------- REPEAT DATE GENERATOR ----------------
  const generateRepeatDates = (days, endCondition, occurrences, endDate) => {
    const dates = [];
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const maxDate =
      endCondition === "on" && endDate
        ? new Date(endDate)
        : new Date(start.getTime() + 365 * 24 * 60 * 60 * 1000);
    let current = new Date(start);
    let count = 0;
    const maxCount = endCondition === "after" ? occurrences : 365;
    while (current <= maxDate && count < maxCount) {
      const dow = current.getDay(); // 0=Sun
      const idx = dow === 0 ? 6 : dow - 1; // Mon=0
      if (days.includes(idx)) {
        dates.push(new Date(current));
        count++;
      }
      current.setDate(current.getDate() + 1);
    }
    return dates;
  };

  const inputCls = (hasError) =>
    `w-full px-3 py-2.5 rounded-lg border transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm text-gray-700 placeholder-gray-400 ${hasError ? "border-red-400" : "border-[#e5e7eb]"
    }`;

  const selectCls = (hasError, empty) =>
    `w-full px-3 py-2.5 rounded-lg border transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm appearance-none pr-9 ${hasError ? "border-red-400" : "border-[#e5e7eb]"
    } ${empty ? "text-gray-400" : "text-gray-700"}`;

  // ---------------- RENDER ----------------
  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      {/* Header */}
      <div className="mb-4 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border font-semibold transition-all hover:bg-gray-50 text-[13px]"
              style={{ borderColor: "#e5e7eb", color: "#374151" }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
              Back
            </button>
          </div>
          <h1 className="font-bold text-2xl text-gray-900" style={{ letterSpacing: "-0.02em" }}>
            {mode === "update" ? "Update Shift" : "Add User Shift"}
          </h1>
          <p className="text-[13px] text-gray-500 mt-0.5">
            Assign a staff member to a client — select one or more shift dates on the calendar
          </p>
        </div>
        {mode === "update" && (
          <button
            onClick={async () => {
              const batchId = batchIdRef.current;
              const isBatch = !!batchId;
              const confirmMsg = isBatch
                ? "This shift is part of a multi-date group. Delete ALL shifts in this group?"
                : "Are you sure you want to delete this shift?";
              if (window.confirm(confirmMsg)) {
                try {
                  if (isBatch) {
                    const snap = await getDocs(query(collection(db, "dev_shifts"), where("batchId", "==", batchId)));
                    const batch = writeBatch(db);
                    snap.docs.forEach(d => batch.update(d.ref, { isDeleted: true, deletedAt: new Date().toISOString() }));
                    await batch.commit();
                    alert(`Deleted ${snap.docs.length} shift(s) in this group.`);
                  } else {
                    await updateDoc(doc(db, "dev_shifts", id), { isDeleted: true, deletedAt: new Date().toISOString() });
                    alert("Shift deleted successfully!");
                  }
                  window.history.back();
                } catch (err) {
                  console.error("Error deleting shift:", err);
                  alert("Failed to delete shift. Please try again.");
                }
              }
            }}
            className="px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 transition-colors"
          >
            Delete Shift
          </button>
        )}
      </div>

      <div>
        <Formik
          innerRef={formikRef}
          enableReinitialize
          initialValues={initialValues}
          validationSchema={validationSchema}
          onSubmit={handleSubmit}
        >
          {({ touched, errors, values, setFieldValue, isSubmitting }) => {
            const handleDatesChange = (dates) => {
              const selected = dates || [];
              setFieldValue("shiftDates", selected);
              if (selected.length > 0) {
                const sorted = [...selected].sort((a, b) => a - b);
                setFieldValue("startDate", formatLocalISO(sorted[0]));
                setFieldValue("endDate", formatLocalISO(sorted[sorted.length - 1]));
              } else {
                setFieldValue("startDate", "");
                setFieldValue("endDate", "");
              }
              applyWeekdaySchedule(selected, setFieldValue);
            };

            return (
              <Form className="flex flex-col gap-5">
                <FormikSync
                  clients={clients}
                  users={users}
                  shiftTypes={shiftTypes}
                  shiftCategories={shiftCategories}
                  setSelectedClient={setSelectedClient}
                  setSelectedPrimaryUser={setSelectedPrimaryUser}
                  setSelectedShiftType={setSelectedShiftType}
                  setSelectedShiftCategory={setSelectedShiftCategory}
                  repeatEnabled={repeatEnabled}
                  repeatDays={repeatDays}
                  repeatEndCondition={repeatEndCondition}
                  repeatOccurrences={repeatOccurrences}
                  repeatEndDate={repeatEndDate}
                  generateRepeatDates={generateRepeatDates}
                  handleDatesChange={handleDatesChange}
                />

                {/* ── Main Card ── */}
                <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: "#e5e7eb", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>

                  {/* Assignment Context Header */}
                  {(selectedClient || selectedPrimaryUser) && (
                    <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50/50" style={{ borderColor: "#f3f4f6" }}>
                      <div className="flex flex-wrap items-center gap-6">
                        {/* Client Info */}
                        {selectedClient && (
                          <div className="flex items-center gap-3 pr-6 border-r border-gray-200 last:border-r-0">
                            <div className="w-10 h-10 rounded-full bg-[#145228] flex items-center justify-center text-white font-bold text-sm shadow-sm">
                              {(selectedClient.name || "C").charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-semibold text-[13px] text-gray-900">{selectedClient.name || "—"}</p>
                              <p className="text-[11px] text-gray-500 uppercase tracking-wider">Client</p>
                            </div>
                          </div>
                        )}

                        {/* Primary Staff Info */}
                        {selectedPrimaryUser && (
                          <div className="flex items-center gap-3 pr-6 border-r border-gray-200 last:border-r-0">
                            <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                              {(selectedPrimaryUser.name || "P").charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-semibold text-[13px] text-gray-900">{selectedPrimaryUser.name || "—"}</p>
                              <p className="text-[11px] text-emerald-600 font-medium uppercase tracking-wider">Primary Staff</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="p-6">
                    {/* Section label */}
                    <p className="font-semibold mb-4 uppercase tracking-wide" style={{ fontSize: 11, color: "#9ca3af" }}>Shift Details</p>

                    <div className="grid grid-cols-2 gap-5">

                      {/* Shift Type */}
                      <div className="relative">
                        <label className="block font-semibold mb-2" style={{ fontSize: 13, color: "#374151" }}>Shift Type</label>
                        <Field as="select" name="shiftType" className={selectCls(touched.shiftType && errors.shiftType, !values.shiftType)}>
                          <option value="">Please select the shift type</option>
                          {shiftTypes.map((item) => (
                            <option key={item.id} value={item.name}>{item.name}</option>
                          ))}
                        </Field>
                        <span className="absolute right-3 top-[60%] -translate-y-1/2 pointer-events-none">
                          <FaChevronDown className="text-gray-400 w-3.5 h-3.5" />
                        </span>
                        <ErrorMessage name="shiftType" component="div" className="text-red-500 text-xs mt-1" />
                      </div>

                      {/* Shift Category */}
                      <div className="relative">
                        <label className="block font-semibold mb-2" style={{ fontSize: 13, color: "#374151" }}>Shift Category</label>
                        <Field as="select" name="shiftCategory"
                          className={selectCls(touched.shiftCategory && errors.shiftCategory, !values.shiftCategory)}
                          onChange={e => { setFieldValue("shiftCategory", e.target.value); setCategoryWarning(""); }}>
                          <option value="">Please select the shift category</option>
                          {shiftCategories.map((item) => (
                            <option key={item.id} value={item.name}>{item.name}</option>
                          ))}
                        </Field>
                        <span className="absolute right-3 top-[60%] -translate-y-1/2 pointer-events-none">
                          <FaChevronDown className="text-gray-400 w-3.5 h-3.5" />
                        </span>
                        <ErrorMessage name="shiftCategory" component="div" className="text-red-500 text-xs mt-1" />
                        {/* Weekday schedule warning */}
                        {categoryWarning && (
                          <div className="mt-2 flex items-start gap-2 px-3 py-2 rounded-lg text-xs font-medium"
                            style={{ background: "#fefce8", color: "#854d0e", border: "1px solid #fde68a" }}>
                            <span className="flex-shrink-0 mt-0.5">⚠</span>
                            <span>{categoryWarning.replace(/^⚠\s*/, "")}</span>
                          </div>
                        )}
                      </div>

                      {/* Select Client */}
                      <div className="relative">
                        <label className="block font-semibold mb-2" style={{ fontSize: 13, color: "#374151" }}>Select Client</label>
                        <Field as="select" name="client" className={selectCls(touched.client && errors.client, !values.client)}>
                          <option value="">Please enter a specific username</option>
                          {clients.map((item) => (
                            <option key={item.id} value={item.id}>{item.name}</option>
                          ))}
                        </Field>
                        <span className="absolute right-3 top-[60%] -translate-y-1/2 pointer-events-none">
                          <FaChevronDown className="text-gray-400 w-3.5 h-3.5" />
                        </span>
                        <ErrorMessage name="client" component="div" className="text-red-500 text-xs mt-1" />
                      </div>

                      {/* Select Primary User (Staff) */}
                      <StaffDropdown
                        label="Primary User (Staff)"
                        placeholder="Select primary staff"
                        value={values.primaryUser}
                        onChange={(id) => setFieldValue('primaryUser', id)}
                        users={users}
                        allShifts={monthShifts}
                        selectedDates={values.shiftDates}
                        startTime={values.startTime}
                        endTime={values.endTime}
                        error={errors.primaryUser}
                        touched={touched.primaryUser}
                      />

                      {/* Select Secondary User (Staff) */}
                      <StaffDropdown
                        label="Secondary User (Staff)"
                        sublabel="(Optional)"
                        placeholder="Select secondary staff (optional)"
                        value={values.secondaryUser}
                        onChange={(id) => setFieldValue('secondaryUser', id)}
                        users={users}
                        allShifts={monthShifts}
                        selectedDates={values.shiftDates}
                        startTime={values.startTime}
                        endTime={values.endTime}
                        error={errors.secondaryUser}
                        touched={touched.secondaryUser}
                      />

                      {/* Vehicle Type — only for Transportation / Supervised Visitation */}
                      {(values.shiftCategory || "").toLowerCase().match(/transportation|supervised/) && (
                        <div className="relative">
                          <label className="block font-semibold mb-2" style={{ fontSize: 13, color: "#374151" }}>Vehicle Type</label>
                          <Field as="select" name="vehicleType" className={selectCls(touched.vehicleType && errors.vehicleType, !values.vehicleType)}>
                            <option value="">Select vehicle type</option>
                            <option value="Personal">Personal</option>
                            <option value="Agency">Agency</option>
                          </Field>
                          <span className="absolute right-3 top-[60%] -translate-y-1/2 pointer-events-none">
                            <FaChevronDown className="text-gray-400 w-3.5 h-3.5" />
                          </span>
                          <ErrorMessage name="vehicleType" component="div" className="text-red-500 text-xs mt-1" />
                        </div>
                      )}

                      {/* Start Time */}
                      <div>
                        <label className="block font-semibold mb-2" style={{ fontSize: 13, color: "#374151" }}>Start Time</label>
                        <Field name="startTime" type="text" placeholder="HH:MM (24-hour)" className={inputCls(touched.startTime && errors.startTime)} />
                        <ErrorMessage name="startTime" component="div" className="text-red-500 text-xs mt-1" />
                      </div>

                      {/* End Time */}
                      <div>
                        <label className="block font-semibold mb-2" style={{ fontSize: 13, color: "#374151" }}>End Time</label>
                        <Field name="endTime" type="text" placeholder="HH:MM (24-hour)" className={inputCls(touched.endTime && errors.endTime)} />
                        <ErrorMessage name="endTime" component="div" className="text-red-500 text-xs mt-1" />
                      </div>

                      {/* Access to Shift Report toggle */}
                      <div className="col-span-2">
                        <label className="block font-semibold mb-2" style={{ fontSize: 13, color: "#374151" }}>Access to Shift Report</label>
                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-[13px] text-gray-400">No</span>
                          <Field name="accessToShiftReport">
                            {({ field, form }) => (
                              <button type="button"
                                onClick={() => form.setFieldValue("accessToShiftReport", !field.value)}
                                className="relative inline-flex items-center rounded-full transition-all duration-200"
                                style={{ backgroundColor: field.value ? "#145228" : "#d1d5db", width: 52, height: 28, padding: 3 }}>
                                <span className="inline-block rounded-full bg-white shadow-sm transition-transform duration-200"
                                  style={{ width: 22, height: 22, transform: field.value ? "translateX(24px)" : "translateX(0)" }} />
                              </button>
                            )}
                          </Field>
                          <span className="font-semibold text-[13px] text-gray-700">Yes</span>
                        </div>
                      </div>


                      {/* Description */}
                      <div className="col-span-2">
                        <label className="block font-semibold mb-2" style={{ fontSize: 13, color: "#374151" }}>Description of Shift</label>
                        <Field as="textarea" name="description" placeholder="Describe responsibilities, special instructions, or notes..." rows={6}
                          className={`${inputCls(touched.description && errors.description)} resize-none`} />
                        <ErrorMessage name="description" component="div" className="text-red-500 text-xs mt-1" />
                      </div>

                      {/* Shift Address — only for Emergent Care / Respite Care (non-transport) */}
                      {values.shiftCategory && !(values.shiftCategory || "").toLowerCase().match(/transportation|supervised/) && (
                        <div className="col-span-2">
                          <label className="block font-semibold mb-2" style={{ fontSize: 13, color: "#374151" }}>Shift Address</label>
                          <PlacesAutocomplete
                            value={values.shiftAddress || ""}
                            onChange={(val) => setFieldValue("shiftAddress", val)}
                            placeholder="Enter the address where the shift will take place"
                            className={inputCls(touched.shiftAddress && errors.shiftAddress)}
                          />
                          <ErrorMessage name="shiftAddress" component="div" className="text-red-500 text-xs mt-1" />
                        </div>
                      )}

                      {/* Service Dates Summary */}
                      <div className="col-span-2">
                        <label className="block font-semibold mb-2" style={{ fontSize: 13, color: "#374151" }}>Service Dates</label>
                        <div className="relative">
                          <input
                            type="text"
                            readOnly
                            value={values.shiftDates?.length > 0 ? `${values.shiftDates.length} date(s) selected: ${values.shiftDates.map(d => (d instanceof Date ? d : new Date(d)).toLocaleDateString("en-US", { month: "short", day: "numeric" })).join(", ")}` : ""}
                            placeholder="(select multiple service dates)"
                            className={inputCls(touched.shiftDates && errors.shiftDates)}
                            onClick={() => {
                              document.getElementById("calendar-section")?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            }}
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                            <FaRegCalendarAlt className="text-gray-400 w-4 h-4" />
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-400 mt-1">Click the field to scroll to the calendar and select dates</p>
                        <ErrorMessage name="shiftDates" component="div" className="text-red-500 text-xs mt-1" />
                      </div>
                    </div>
                  </div>

                </div>

                {/* ── Calendar Card ── */}
                <div id="calendar-section" className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: "#e5e7eb", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                  {/* Calendar Header */}
                  <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "#f3f4f6" }}>
                    <div className="flex items-center gap-2">
                      <FaRegCalendarAlt className="w-4 h-4 text-gray-400" />
                      <span className="font-semibold text-gray-900" style={{ fontSize: 14 }}>Service Dates</span>
                    </div>
                    <span style={{ fontSize: 12, color: "#9ca3af" }}>Click a date to select · Click again to deselect</span>
                  </div>

                  <div className="flex">
                    {/* ── Month Grid ── */}
                    <div className="flex-1 p-5">
                      {/* Month navigation */}
                      <div className="flex items-center justify-between mb-5">
                        <button type="button"
                          onClick={() => setCalendarMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1))}
                          className="w-8 h-8 rounded-lg border flex items-center justify-center hover:bg-gray-50 transition-colors"
                          style={{ borderColor: "#e5e7eb" }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
                        </button>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-gray-900" style={{ fontSize: 16 }}>
                            {calendarMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                          </span>
                          <button type="button" onClick={() => setCalendarMonth(new Date())}
                            className="px-3 py-1 rounded-lg border font-semibold hover:bg-gray-50 transition-colors"
                            style={{ borderColor: "#e5e7eb", fontSize: 12, color: "#374151" }}>
                            Today
                          </button>
                        </div>
                        <button type="button"
                          onClick={() => setCalendarMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1))}
                          className="w-8 h-8 rounded-lg border flex items-center justify-center hover:bg-gray-50 transition-colors"
                          style={{ borderColor: "#e5e7eb" }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
                        </button>
                      </div>

                      {/* Day headers */}
                      <div className="grid grid-cols-7 mb-1">
                        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(d => (
                          <div key={d} className="text-center font-semibold uppercase py-2" style={{ fontSize: 11, color: "#9ca3af" }}>{d}</div>
                        ))}
                      </div>

                      {/* Day cells */}
                      <div className="grid grid-cols-7 border-l border-t" style={{ borderColor: "#f3f4f6" }}>
                        {getCalendarDays(calendarMonth).map((cell, i) => {
                          const dateKey = formatLocalISO(cell.date);
                          const isSelected = (values.shiftDates || []).some(d => {
                            const sd = d instanceof Date ? d : new Date(d);
                            return formatLocalISO(sd) === dateKey;
                          });
                          const isToday = formatLocalISO(new Date()) === dateKey;
                          const shiftPillColors = [
                            { bg: "#fef9c3", text: "#854d0e" },
                            { bg: "#dbeafe", text: "#1e40af" },
                            { bg: "#dcfce7", text: "#15803d" },
                            { bg: "#e0e7ff", text: "#4338ca" },
                            { bg: "#fce7f3", text: "#9d174d" },
                          ];
                          const cellShifts = monthShifts.filter(s => {
                            try {
                              const sd = s.startDate?.toDate ? s.startDate.toDate() : new Date(s.startDate);
                              return formatLocalISO(sd) === dateKey;
                            } catch { return false; }
                          }).slice(0, 3);

                          return (
                            <div key={i}
                              className="border-r border-b transition-colors"
                              style={{
                                borderColor: "#f3f4f6",
                                minHeight: 88,
                                background: isSelected ? "#f0fdf4" : "white",
                                cursor: cell.isCurrentMonth ? "pointer" : "default",
                              }}
                              onClick={() => {
                                if (!cell.isCurrentMonth) return;
                                const existing = values.shiftDates || [];
                                const already = existing.some(d => formatLocalISO(d instanceof Date ? d : new Date(d)) === dateKey);
                                handleDatesChange(already
                                  ? existing.filter(d => formatLocalISO(d instanceof Date ? d : new Date(d)) !== dateKey)
                                  : [...existing, cell.date]
                                );
                              }}
                            >
                              <div className="p-2">
                                <span className="inline-flex items-center justify-center w-7 h-7 rounded-full mb-1 font-semibold"
                                  style={{
                                    fontSize: 13,
                                    background: isSelected ? "#145228" : "transparent",
                                    color: isSelected ? "white" : isToday ? "#145228" : cell.isCurrentMonth ? "#374151" : "#d1d5db",
                                    border: isToday && !isSelected ? "1.5px solid #145228" : "none",
                                  }}>
                                  {cell.date.getDate()}
                                </span>
                                <div className="flex flex-col gap-0.5">
                                  {cellShifts.map((s, si) => {
                                    const c = shiftPillColors[si % shiftPillColors.length];
                                    return (
                                      <div key={si} className="truncate rounded px-1.5 py-0.5 font-medium"
                                        style={{ fontSize: 10, background: c.bg, color: c.text }}>
                                        {s.userName || s.name || "Staff"} · {s.startTime || ""}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <ErrorMessage name="shiftDates" component="div" className="text-red-500 text-xs mt-2" />
                    </div>

                    {/* ── Right Panel: Selected Dates ── */}
                    <div className="border-l flex-shrink-0" style={{ borderColor: "#f3f4f6", width: 220 }}>
                      <div className="p-5">
                        <p className="font-bold text-gray-900 mb-0.5" style={{ fontSize: 13 }}>Selected Dates</p>
                        <p style={{ fontSize: 11, color: "#9ca3af", marginBottom: 16 }}>
                          {values.shiftDates?.length > 0
                            ? `${values.shiftDates.length} shift${values.shiftDates.length !== 1 ? "s" : ""} to create`
                            : "0 shifts to create"}
                        </p>
                        {values.shiftDates?.length > 0 ? (
                          <div className="flex flex-col gap-2">
                            {[...values.shiftDates].sort((a, b) => a - b).map((d, i) => {
                              const date = d instanceof Date ? d : new Date(d);
                              return (
                                <div key={i} className="flex items-center justify-between rounded-lg px-2.5 py-2" style={{ background: "#f9fafb" }}>
                                  <p className="font-semibold text-gray-800" style={{ fontSize: 11 }}>
                                    {date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                                  </p>
                                  <button type="button"
                                    onClick={() => handleDatesChange(values.shiftDates.filter((_, idx) => idx !== i))}
                                    className="text-gray-400 hover:text-red-500 transition-colors font-bold ml-2"
                                    style={{ fontSize: 14 }}>×</button>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center py-8 text-center">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#e5e7eb" strokeWidth="1.5" className="mb-2">
                              <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                            </svg>
                            <p style={{ fontSize: 11, color: "#9ca3af" }}>Click dates on the<br />calendar to select them</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── Family Members / Shift Points — only for Transportation / Supervised Visitation ── */}
                {selectedClient && shiftPoints.length > 0 && (values.shiftCategory || "").toLowerCase().match(/transportation|supervised/) && (
                  <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: "#e5e7eb", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                    <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "#f3f4f6", background: "#fafafa" }}>
                      <div>
                        <h2 className="font-bold text-gray-900" style={{ fontSize: 15 }}>Family Members – Shift Points</h2>
                        <p className="text-[12px] text-gray-400 mt-0.5">Auto-filled from client record · click any field to edit · remove members not in this shift</p>
                      </div>
                      <span className="px-2.5 py-1 rounded-full font-semibold text-xs" style={{ background: "#dcfce7", color: "#15803d" }}>
                        {shiftPoints.length} active · {removedShiftPoints.length} removed
                      </span>
                    </div>

                    <div className="p-6 flex flex-col gap-5">
                      {shiftPoints.map((pt, idx) => (
                        <div key={idx} className="rounded-xl border overflow-hidden" style={{ borderColor: "#e5e7eb" }}>
                          {/* Member header */}
                          <div className="flex items-center justify-between px-4 py-3 border-b" style={{ background: "#f9fafb", borderColor: "#f3f4f6" }}>
                            <div className="flex items-center gap-2">
                              {/* Priority badge */}
                              <div className="w-5 h-5 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
                                style={{ background: "#145228", fontSize: 10 }}>
                                {idx + 1}
                              </div>
                              {/* Up / Down reorder buttons */}
                              <div className="flex flex-col gap-0.5">
                                <button type="button" disabled={idx === 0}
                                  onClick={() => setShiftPoints((prev) => {
                                    const arr = [...prev];
                                    [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
                                    return arr;
                                  })}
                                  className="leading-none text-gray-400 hover:text-[#145228] disabled:opacity-20 disabled:cursor-not-allowed"
                                  title="Move up (higher priority)">
                                  ▲
                                </button>
                                <button type="button" disabled={idx === shiftPoints.length - 1}
                                  onClick={() => setShiftPoints((prev) => {
                                    const arr = [...prev];
                                    [arr[idx + 1], arr[idx]] = [arr[idx], arr[idx + 1]];
                                    return arr;
                                  })}
                                  className="leading-none text-gray-400 hover:text-[#145228] disabled:opacity-20 disabled:cursor-not-allowed"
                                  title="Move down (lower priority)">
                                  ▼
                                </button>
                              </div>
                              <div className="w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0"
                                style={{ background: "linear-gradient(135deg,#145228,#1f7a3c)" }}>
                                {(pt.name || String.fromCharCode(65 + idx)).charAt(0).toUpperCase()}
                              </div>
                              <span className="font-semibold text-sm text-gray-900">{pt.name || `Member ${idx + 1}`}</span>
                              {pt.seatType && <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "#e0e7ff", color: "#4338ca" }}>{pt.seatType}</span>}
                              {/* Pickup order label */}
                              <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: "#fef9c3", color: "#854d0e" }}>
                                {idx === 0 ? "Pickup 1st" : idx === 1 ? "Pickup 2nd" : idx === 2 ? "Pickup 3rd" : `Pickup ${idx + 1}th`}
                              </span>
                            </div>
                            <button type="button"
                              onClick={() => {
                                setRemovedShiftPoints((prev) => [...prev, pt]);
                                setShiftPoints((prev) => prev.filter((_, i) => i !== idx));
                              }}
                              className="text-xs font-semibold px-3 py-1 rounded-lg border transition-all hover:bg-red-50"
                              style={{ borderColor: "#fca5a5", color: "#ef4444" }}>
                              Remove from shift
                            </button>
                          </div>

                          {/* Fields grid */}
                          <div className="p-4 grid grid-cols-2 gap-x-6 gap-y-4">

                            {/* Pickup Location — swap icon floats in the gap below */}
                            <div className="relative">
                              <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Pickup Location</label>
                              <div className="flex items-center gap-2">
                                <PlacesAutocomplete
                                  value={pt.pickupLocation || ""}
                                  onChange={(val) => setShiftPoints((prev) => prev.map((p, i) => i === idx ? { ...p, pickupLocation: val } : p))}
                                  placeholder="Search address"
                                  className="flex-1 bg-[#f3f3f5] border border-[#e6e6e6] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#145228] focus:bg-white"
                                />
                                <FaRegMap className="text-[#145228] text-lg cursor-pointer hover:opacity-70 flex-shrink-0"
                                  onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(pt.pickupLocation || "")}`, "_blank")} />
                              </div>
                              {/* Swap icon centred in the gap between pickup & drop inputs */}
                              <button
                                type="button"
                                title="Swap pickup & drop locations"
                                onClick={() => setShiftPoints((prev) => prev.map((p, i) =>
                                  i === idx
                                    ? { ...p, pickupLocation: p.dropLocation || "", dropLocation: p.pickupLocation || "" }
                                    : p
                                ))}
                                className="absolute left-1/2 z-10 w-5 h-5 rounded-full bg-white border border-[#e6e6e6] flex items-center justify-center text-gray-400 hover:text-[#145228] hover:border-[#145228] transition-colors cursor-pointer"
                                style={{ bottom: 0, transform: "translate(-50%, 50%)" }}
                              >
                                <FaExchangeAlt style={{ fontSize: 9 }} />
                              </button>
                            </div>

                            {/* Pickup Time */}
                            <div>
                              <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Pickup Time</label>
                              <input type="text"
                                className="w-full bg-[#f3f3f5] border border-[#e6e6e6] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#145228] focus:bg-white"
                                value={pt.pickupTime || ""}
                                onChange={(e) => setShiftPoints((prev) => prev.map((p, i) => i === idx ? { ...p, pickupTime: e.target.value } : p))}
                                placeholder="N/A"
                              />
                            </div>

                            {/* Drop Location */}
                            <div>
                              <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Drop Location</label>
                              <div className="flex items-center gap-2">
                                <PlacesAutocomplete
                                  value={pt.dropLocation || ""}
                                  onChange={(val) => setShiftPoints((prev) => prev.map((p, i) => i === idx ? { ...p, dropLocation: val } : p))}
                                  placeholder="Search address"
                                  className="flex-1 bg-[#f3f3f5] border border-[#e6e6e6] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#145228] focus:bg-white"
                                />
                                <FaRegMap className="text-[#145228] text-lg cursor-pointer hover:opacity-70 flex-shrink-0"
                                  onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(pt.dropLocation || "")}`, "_blank")} />
                              </div>
                            </div>

                            {/* Drop Time */}
                            <div>
                              <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Drop Time</label>
                              <input type="text"
                                className="w-full bg-[#f3f3f5] border border-[#e6e6e6] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#145228] focus:bg-white"
                                value={pt.dropTime || ""}
                                onChange={(e) => setShiftPoints((prev) => prev.map((p, i) => i === idx ? { ...p, dropTime: e.target.value } : p))}
                                placeholder="N/A"
                              />
                            </div>

                            {/* Visit fields — Supervised Visitation only (never for plain Transportation) */}
                            {(() => {
                              const cat = (values.shiftCategory || "").toLowerCase();
                              const showVisit = cat.includes("supervised") || cat.includes("visitation");

                              if (!showVisit) return null;

                              return (
                                <>
                                  {/* Visit Location */}
                                  <div>
                                    <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Visit Location</label>
                                    <div className="flex items-center gap-2">
                                      <input type="text"
                                        className="flex-1 bg-[#f3f3f5] border border-[#e6e6e6] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#145228] focus:bg-white"
                                        value={pt.visitLocation || ""}
                                        onChange={(e) => setShiftPoints((prev) => prev.map((p, i) => i === idx ? { ...p, visitLocation: e.target.value } : p))}
                                        placeholder="N/A"
                                      />
                                      <FaRegMap className="text-[#145228] text-lg cursor-pointer hover:opacity-70 flex-shrink-0"
                                        onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(pt.visitLocation || "")}`, "_blank")} />
                                    </div>
                                  </div>

                                  {/* Visit Time */}
                                  <div>
                                    <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Visit Time</label>
                                    <div className="flex items-center gap-2">
                                      <input type="text"
                                        className="flex-1 bg-[#f3f3f5] border border-[#e6e6e6] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#145228] focus:bg-white"
                                        value={pt.visitStartTime || ""}
                                        onChange={(e) => setShiftPoints((prev) => prev.map((p, i) => i === idx ? { ...p, visitStartTime: e.target.value } : p))}
                                        placeholder="Start"
                                      />
                                      <span className="text-gray-400 text-sm">–</span>
                                      <input type="text"
                                        className="flex-1 bg-[#f3f3f5] border border-[#e6e6e6] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#145228] focus:bg-white"
                                        value={pt.visitEndTime || ""}
                                        onChange={(e) => setShiftPoints((prev) => prev.map((p, i) => i === idx ? { ...p, visitEndTime: e.target.value } : p))}
                                        placeholder="End"
                                      />
                                    </div>
                                  </div>
                                </>
                              );
                            })()}

                            {/* Total KM + Calculate — hidden */}
                          </div>
                        </div>
                      ))}

                      {/* Removed members – add back */}
                      {removedShiftPoints.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Removed from this shift</p>
                          <div className="flex flex-wrap gap-2">
                            {removedShiftPoints.map((pt, idx) => (
                              <div key={idx} className="flex items-center gap-2 px-3 py-2 rounded-lg border" style={{ borderColor: "#e5e7eb", background: "#f9fafb" }}>
                                <span className="text-sm text-gray-500">{pt.name || `Member ${idx + 1}`}</span>
                                <button type="button"
                                  onClick={() => {
                                    setShiftPoints((prev) => [...prev, pt]);
                                    setRemovedShiftPoints((prev) => prev.filter((_, i) => i !== idx));
                                  }}
                                  className="text-xs font-semibold px-2 py-0.5 rounded-md transition-all"
                                  style={{ background: "#dcfce7", color: "#15803d" }}>
                                  Add back
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* ── Scheduled Kilometers (office → pickup → drop → office) ── */}
                      {shiftPoints.length > 0 && (
                        <div className="flex items-center justify-between mt-4 px-4 py-3 rounded-xl"
                          style={{ background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
                          <div>
                            <p className="font-bold text-sm" style={{ color: "#145228" }}>Scheduled Kilometers</p>
                            <p className="text-xs" style={{ color: "#6b7280" }}>Office → Pickup → Drop → Office (via map)</p>
                          </div>
                          <div className="flex items-center gap-3">
                            {kmCalculating
                              ? <span className="text-sm font-semibold" style={{ color: "#6b7280" }}>Calculating…</span>
                              : <span className="font-extrabold" style={{ fontSize: 20, color: "#145228" }}>{scheduledKm} km</span>}
                            <button type="button" onClick={recomputeScheduledKm}
                              className="p-2 rounded-lg hover:bg-green-100" title="Recalculate" style={{ color: "#145228" }}>
                              ↻
                            </button>
                          </div>
                        </div>
                      )}

                      {/* ── Add Return Trip button ── */}
                      {!returnTrip && mode !== "update" && (
                        <div className="flex justify-center mt-2">
                          <button type="button"
                            onClick={() => {
                              const swapped = shiftPoints.map(p => ({
                                ...p,
                                pickupLocation: p.dropLocation || "",
                                dropLocation: p.pickupLocation || "",
                                pickupTime: "",
                                dropTime: "",
                                officeToPickupKm: 0,
                                dropToOfficeKm: 0,
                                totalKilometers: 0,
                              }));
                              setReturnShiftPoints(swapped);
                              setReturnTrip(true);
                            }}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg border font-semibold text-sm transition-all hover:bg-blue-50"
                            style={{ borderColor: "#93c5fd", color: "#1d4ed8" }}>
                            ↩ Add Return Trip
                          </button>
                        </div>
                      )}

                      {/* ── Return Trip section ── */}
                      {returnTrip && (
                        <div className="rounded-xl border overflow-hidden mt-2" style={{ borderColor: "#bfdbfe" }}>
                          <div className="flex items-center justify-between px-4 py-3 border-b" style={{ background: "#eff6ff", borderColor: "#bfdbfe" }}>
                            <div>
                              <h3 className="font-bold text-sm" style={{ color: "#1d4ed8" }}>↩ Return Trip</h3>
                              <p className="text-xs text-blue-400 mt-0.5">Pickup and drop locations are swapped · set the return trip times below</p>
                            </div>
                            <button type="button"
                              onClick={() => { setReturnTrip(false); setReturnShiftPoints([]); setReturnStartTime(""); setReturnEndTime(""); setReturnDriverId(""); setShowReturnDriverPicker(false); }}
                              className="text-xs font-semibold px-3 py-1 rounded-lg border transition-all hover:bg-red-50"
                              style={{ borderColor: "#fca5a5", color: "#ef4444" }}>
                              Remove
                            </button>
                          </div>

                          {/* Return trip start/end times */}
                          <div className="px-4 py-3 grid grid-cols-2 gap-4 border-b" style={{ borderColor: "#bfdbfe", background: "#f8faff" }}>
                            <div>
                              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: "#1d4ed8" }}>Return Start Time</label>
                              <input type="text" placeholder="HH:MM"
                                className="w-full bg-white border rounded-lg px-3 py-2 text-sm focus:outline-none"
                                style={{ borderColor: "#93c5fd" }}
                                value={returnStartTime}
                                onChange={e => setReturnStartTime(e.target.value)} />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: "#1d4ed8" }}>Return End Time</label>
                              <input type="text" placeholder="HH:MM"
                                className="w-full bg-white border rounded-lg px-3 py-2 text-sm focus:outline-none"
                                style={{ borderColor: "#93c5fd" }}
                                value={returnEndTime}
                                onChange={e => setReturnEndTime(e.target.value)} />
                            </div>
                          </div>

                          {/* Return trip driver */}
                          <div className="px-4 py-3 border-b" style={{ borderColor: "#bfdbfe", background: "#f8faff" }}>
                            <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: "#1d4ed8" }}>Return Trip Driver</label>
                            {(() => {
                              const mainDriver = users.find(u => String(u.id) === String(values.primaryUser) || String(u.userId) === String(values.primaryUser));
                              const pickedDriver = returnDriverId ? users.find(u => String(u.id) === String(returnDriverId)) : null;
                              return (
                                <div className="flex items-center gap-3 flex-wrap">
                                  {!showReturnDriverPicker ? (
                                    <>
                                      <span className="text-sm font-semibold" style={{ color: pickedDriver ? "#1d4ed8" : "#374151" }}>
                                        {pickedDriver
                                          ? pickedDriver.name
                                          : `${mainDriver?.name || "Same as main shift"} (same as main shift)`}
                                      </span>
                                      <button type="button"
                                        onClick={() => setShowReturnDriverPicker(true)}
                                        className="text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all hover:bg-blue-50"
                                        style={{ borderColor: "#93c5fd", color: "#1d4ed8" }}>
                                        Change Driver
                                      </button>
                                      {pickedDriver && (
                                        <button type="button"
                                          onClick={() => setReturnDriverId("")}
                                          className="text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all hover:bg-gray-50"
                                          style={{ borderColor: "#d1d5db", color: "#6b7280" }}>
                                          Reset to Same Driver
                                        </button>
                                      )}
                                    </>
                                  ) : (
                                    <>
                                      <select
                                        className="bg-white border rounded-lg px-3 py-2 text-sm focus:outline-none"
                                        style={{ borderColor: "#93c5fd", minWidth: 260 }}
                                        value={returnDriverId}
                                        onChange={e => { setReturnDriverId(e.target.value); setShowReturnDriverPicker(false); }}>
                                        <option value="">{mainDriver?.name ? `${mainDriver.name} (same as main shift)` : "Same as main shift"}</option>
                                        {users
                                          .filter(u => String(u.id) !== String(values.primaryUser))
                                          .map(u => (
                                            <option key={u.id} value={u.id}>{u.name}</option>
                                          ))}
                                      </select>
                                      <button type="button"
                                        onClick={() => setShowReturnDriverPicker(false)}
                                        className="text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all hover:bg-gray-50"
                                        style={{ borderColor: "#d1d5db", color: "#6b7280" }}>
                                        Cancel
                                      </button>
                                    </>
                                  )}
                                </div>
                              );
                            })()}
                          </div>

                          {/* Return shift points */}
                          <div className="p-4 flex flex-col gap-4">
                            {returnShiftPoints.map((pt, idx) => (
                              <div key={idx} className="rounded-lg border p-4 grid grid-cols-2 gap-x-6 gap-y-3" style={{ borderColor: "#dbeafe" }}>
                                <div className="col-span-2 flex items-center gap-2 mb-1">
                                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 text-xs"
                                    style={{ background: "#1d4ed8" }}>
                                    {(pt.name || String.fromCharCode(65 + idx)).charAt(0).toUpperCase()}
                                  </div>
                                  <span className="font-semibold text-sm text-gray-900">{pt.name || `Member ${idx + 1}`}</span>
                                </div>
                                <div>
                                  <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Pickup Location</label>
                                  <PlacesAutocomplete
                                    value={pt.pickupLocation || ""}
                                    onChange={(val) => setReturnShiftPoints(prev => prev.map((p, i) => i === idx ? { ...p, pickupLocation: val } : p))}
                                    placeholder="Search address"
                                    className="w-full bg-[#f3f3f5] border border-[#e6e6e6] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1d4ed8]" />
                                </div>
                                <div>
                                  <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Pickup Time</label>
                                  <input type="text"
                                    className="w-full bg-[#f3f3f5] border border-[#e6e6e6] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1d4ed8]"
                                    value={pt.pickupTime || ""}
                                    onChange={(e) => setReturnShiftPoints(prev => prev.map((p, i) => i === idx ? { ...p, pickupTime: e.target.value } : p))}
                                    placeholder="N/A" />
                                </div>
                                <div>
                                  <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Drop Location</label>
                                  <PlacesAutocomplete
                                    value={pt.dropLocation || ""}
                                    onChange={(val) => setReturnShiftPoints(prev => prev.map((p, i) => i === idx ? { ...p, dropLocation: val } : p))}
                                    placeholder="Search address"
                                    className="w-full bg-[#f3f3f5] border border-[#e6e6e6] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1d4ed8]" />
                                </div>
                                <div>
                                  <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Drop Time</label>
                                  <input type="text"
                                    className="w-full bg-[#f3f3f5] border border-[#e6e6e6] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1d4ed8]"
                                    value={pt.dropTime || ""}
                                    onChange={(e) => setReturnShiftPoints(prev => prev.map((p, i) => i === idx ? { ...p, dropTime: e.target.value } : p))}
                                    placeholder="N/A" />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ── Repeat / Recurrence Card ── */}
                <div className="rounded-xl border overflow-hidden" style={{ borderColor: "#e5e7eb", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                  {/* Header row */}
                  <div className="flex items-center justify-between px-6 py-4" style={{ background: repeatEnabled ? "#f0fdf4" : "#fafafa", borderBottom: repeatEnabled ? "1px solid #dcfce7" : "1px solid #f3f4f6" }}>
                    <div className="flex items-center gap-3">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={repeatEnabled ? "#145228" : "#9ca3af"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="17 1 21 5 17 9" /><path d="M3 11V9a4 4 0 0 1 4-4h14" /><polyline points="7 23 3 19 7 15" /><path d="M21 13v2a4 4 0 0 1-4 4H3" />
                      </svg>
                      <div>
                        <p className="font-bold text-gray-900" style={{ fontSize: 14 }}>Repeat / Recurrence</p>
                        <p className="text-gray-400" style={{ fontSize: 12 }}>Automatically repeat this shift on a schedule</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-500" style={{ fontSize: 13 }}>
                        {repeatEnabled ? "Enabled" : "Disabled"}
                      </span>
                      <button type="button"
                        onClick={() => setRepeatEnabled(v => !v)}
                        className="relative inline-flex items-center rounded-full transition-all duration-200"
                        style={{ backgroundColor: repeatEnabled ? "#145228" : "#d1d5db", width: 52, height: 28, padding: 3 }}>
                        <span className="inline-block rounded-full bg-white shadow-sm transition-transform duration-200"
                          style={{ width: 22, height: 22, transform: repeatEnabled ? "translateX(24px)" : "translateX(0)" }} />
                      </button>
                    </div>
                  </div>

                  {/* Body — only when enabled */}
                  {repeatEnabled && (
                    <div className="p-6 bg-white grid grid-cols-2 gap-8">
                      {/* Left: Repeat on weekdays */}
                      <div>
                        <p className="font-semibold text-gray-700 mb-3" style={{ fontSize: 13 }}>Repeat on weekdays</p>
                        <div className="flex items-center gap-2">
                          {["M", "T", "W", "T", "F", "S", "S"].map((label, i) => (
                            <button key={i} type="button"
                              onClick={() => setRepeatDays(prev => prev.includes(i) ? prev.filter(d => d !== i) : [...prev, i])}
                              className="flex items-center justify-center rounded-full font-bold transition-all"
                              style={{
                                width: 36, height: 36, fontSize: 13,
                                background: repeatDays.includes(i) ? "#145228" : "#f3f4f6",
                                color: repeatDays.includes(i) ? "white" : "#6b7280",
                                border: repeatDays.includes(i) ? "none" : "1px solid #e5e7eb",
                              }}>
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Right: End condition */}
                      <div>
                        <p className="font-semibold text-gray-700 mb-3" style={{ fontSize: 13 }}>End condition</p>
                        <div className="flex flex-col gap-3">
                          {/* No end date */}
                          <label className="flex items-center gap-3 cursor-pointer">
                            <button type="button" onClick={() => setRepeatEndCondition("none")}
                              className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all"
                              style={{ borderColor: repeatEndCondition === "none" ? "#145228" : "#d1d5db", background: "white" }}>
                              {repeatEndCondition === "none" && <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#145228" }} />}
                            </button>
                            <span className="text-sm text-gray-700">No end date</span>
                          </label>

                          {/* After X occurrences */}
                          <label className="flex items-center gap-3 cursor-pointer">
                            <button type="button" onClick={() => setRepeatEndCondition("after")}
                              className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all"
                              style={{ borderColor: repeatEndCondition === "after" ? "#145228" : "#d1d5db", background: "white" }}>
                              {repeatEndCondition === "after" && <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#145228" }} />}
                            </button>
                            <span className="text-sm text-gray-700">After</span>
                            <input type="number" min={1} max={365}
                              value={repeatOccurrences}
                              onChange={e => setRepeatOccurrences(Number(e.target.value))}
                              onClick={() => setRepeatEndCondition("after")}
                              className="w-16 px-2 py-1 rounded-lg border text-sm text-center font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                              style={{ borderColor: "#e5e7eb", color: "#374151" }} />
                            <span className="text-sm text-gray-700">occurrences</span>
                          </label>

                          {/* On date */}
                          <label className="flex items-center gap-3 cursor-pointer">
                            <button type="button" onClick={() => setRepeatEndCondition("on")}
                              className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all"
                              style={{ borderColor: repeatEndCondition === "on" ? "#145228" : "#d1d5db", background: "white" }}>
                              {repeatEndCondition === "on" && <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#145228" }} />}
                            </button>
                            <span className="text-sm text-gray-700">On date</span>
                            <input type="date"
                              value={repeatEndDate}
                              onChange={e => { setRepeatEndDate(e.target.value); setRepeatEndCondition("on"); }}
                              className="px-2 py-1 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                              style={{ borderColor: "#e5e7eb", color: repeatEndDate ? "#374151" : "#9ca3af" }} />
                          </label>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* ── Bottom Footer Bar ── */}
                <div className="bg-white rounded-xl border flex items-center justify-between px-6 py-4" style={{ borderColor: "#e5e7eb", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                  <p style={{ fontSize: 13, color: "#9ca3af" }}>
                    {values.shiftDates?.length > 0
                      ? <span><span className="font-semibold" style={{ color: "#111827" }}>{values.shiftDates.length} shift{values.shiftDates.length !== 1 ? "s" : ""}</span><span style={{ color: "#6b7280" }}> ready to create</span></span>
                      : "No dates selected — choose dates on the calendar above"}
                  </p>
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={() => navigate(-1)}
                      className="px-5 py-2.5 rounded-lg border font-semibold text-sm hover:bg-gray-50 transition-colors"
                      style={{ borderColor: "#e5e7eb", color: "#374151" }}>
                      Cancel
                    </button>
                    <button type="submit"
                      disabled={isSubmitting}
                      className="flex items-center gap-2 px-6 py-2.5 rounded-lg font-semibold text-sm text-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                      style={{ backgroundColor: "#145228" }}>
                      {isSubmitting ? (
                        <>
                          <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                          </svg>
                          {mode === "update" ? "Updating..." : `Creating ${values.shiftDates?.length > 1 ? `${values.shiftDates.length} Shifts` : "Shift"}...`}
                        </>
                      ) : (
                        mode === "update"
                          ? "Update Shift"
                          : `Create Shift${values.shiftDates?.length > 1 ? `s (${values.shiftDates.length})` : ""}`
                      )}
                    </button>
                  </div>
                </div>

              </Form>
            );
          }}
        </Formik>

        <SuccessSlider
          show={slider.show}
          title={slider.title}
          subtitle={slider.subtitle}
          viewText="View Shift"
          onView={() => {
            if (mode === "update" && id) {
              navigate(`/admin-dashboard/shift-report/${id}`);
            } else {
              navigate("/admin-dashboard/dashboard", {
                state: { shiftCategory: selectedShiftCategory?.name }
              });
            }
            setSlider({ ...slider, show: false });

          }}
          onDismiss={() => setSlider({ ...slider, show: false })}
        />
      </div>
    </div>
  );
};

// ── Helper Component to sync Formik state with local state ──
const FormikSync = ({
  clients,
  users,
  shiftTypes,
  shiftCategories,
  setSelectedClient,
  setSelectedPrimaryUser,
  setSelectedShiftType,
  setSelectedShiftCategory,
  repeatEnabled,
  repeatDays,
  repeatEndCondition,
  repeatOccurrences,
  repeatEndDate,
  generateRepeatDates,
  handleDatesChange
}) => {
  const { values, setFieldValue } = useFormikContext();

  useEffect(() => {
    const clientData = clients.find((c) => c.id === values.client);
    setSelectedClient(clientData || null);

    const primaryData = users.find((u) => u.id === values.primaryUser);
    setSelectedPrimaryUser(primaryData || null);

    // Match by name (form stores name) OR by id (update mode stores id)
    const shiftTypeData = shiftTypes.find(
      (s) => s.name === values.shiftType || s.id === values.shiftType
    );
    setSelectedShiftType(shiftTypeData || null);

    const shiftCategoryData = shiftCategories.find(
      (s) => s.name === values.shiftCategory || s.id === values.shiftCategory
    );
    setSelectedShiftCategory(shiftCategoryData || null);
  }, [values.client, values.primaryUser, values.shiftType, values.shiftCategory, clients, users, shiftTypes, shiftCategories, setSelectedClient, setSelectedPrimaryUser, setSelectedShiftType, setSelectedShiftCategory]);

  useEffect(() => {
    if (repeatEnabled && repeatDays.length > 0) {
      const generated = generateRepeatDates(repeatDays, repeatEndCondition, repeatOccurrences, repeatEndDate);
      handleDatesChange(generated);
    } else if (!repeatEnabled) {
      handleDatesChange([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repeatEnabled, repeatDays, repeatEndCondition, repeatOccurrences, repeatEndDate]);

  return null;
};

export default AddUserShift;
