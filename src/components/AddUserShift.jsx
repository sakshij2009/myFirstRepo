import React, { useEffect, useState, useRef } from "react";
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
} from "firebase/firestore";
import { db } from "../firebase";
import { FaChevronDown, FaRegCalendarAlt } from "react-icons/fa";
import SuccessSlider from "../components/SuccessSlider";
import { useParams } from "react-router-dom";
import { sendNotification } from "../utils/notificationHelper";
import { FaRegMap } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { formatLocalISO } from "../utils/dateHelpers";


// ---------------- OFFICE ADDRESS ----------------
const OFFICE_ADDRESS = "10110 124 Street, Edmonton, AB T5N 1P6";

import { calculateRouteDistance } from "../utils/mapboxHelper";

// ---------------- MAPBOX DISTANCE CALCULATOR ----------------
const calculateTotalDistance = async (shiftPoint) => {
  const locations = [OFFICE_ADDRESS, shiftPoint.pickupLocation];
  if (shiftPoint.visitLocation) locations.push(shiftPoint.visitLocation);
  locations.push(shiftPoint.dropLocation, OFFICE_ADDRESS);

  try {
    const result = await calculateRouteDistance(locations);
    return result ? result.km.toFixed(2) : "0.00";
  } catch (err) {
    console.error("Mapbox Routing Error:", err);
    return "0.00";
  }
};


const AddUserShift = ({ mode = "add", user }) => {
  const { id } = useParams();

  const [shiftTypes, setShiftTypes] = useState([]);
  const [shiftCategories, setShiftCategories] = useState([]);
  const [clients, setClients] = useState([]);
  const [users, setUsers] = useState([]);

  const [initialValues, setInitialValues] = useState({
    shiftType: "",
    shiftCategory: "",
    client: "",
    startDate: "",
    endDate: "",
    startTime: "",
    endTime: "",
    description: "",
    accessToShiftReport: false,
    shiftDates: [],
  });

  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedPrimaryUser, setSelectedPrimaryUser] = useState(null);
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
  // intakeDescription: auto-fetched from intake form
  const [intakeDescription, setIntakeDescription] = useState("");
  // Track the client ID that was originally loaded from the saved shift (update mode)
  const initialLoadedClientIdRef = useRef(null);

  // ---------------- VALIDATION SCHEMA ----------------
  const validationSchema = Yup.object().shape({
    shiftType: Yup.string().required("Shift type is required"),
    shiftCategory: Yup.string().required("Shift category is required"),
    client: Yup.string().required("Client selection is required"),
    primaryUser: Yup.string().required("Primary Staff selection is required"),
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
            getDocs(collection(db, "shiftTypes")),
            getDocs(collection(db, "shiftCategories")),
            getDocs(collection(db, "clients")),
            getDocs(collection(db, "users")),
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

        const allowedCategories = [
          { id: "emergent", name: "Emergent Care" },
          { id: "respite", name: "Respite Care" },
          { id: "supervised", name: "Supervised Visitation" },
          { id: "transportation", name: "Transportation" },
        ].sort(sortByName);
        setShiftCategories(allowedCategories);

        setClients(
          clientSnap.docs
            .map((doc) => ({ id: doc.id, ...doc.data() }))
            .sort(sortByName)
        );

        setUsers(
          userSnap.docs
            .map((doc) => ({ id: doc.id, ...doc.data() }))
            .sort(sortByName)
        );
      } catch (error) {
        console.error("Error fetching dropdown data: ", error);
      }
    };
    fetchDropdownData();
  }, []);

  // ---------------- DATE HELPERS ----------------
  const formatDateFromFirestore = (dateValue) => {
    if (!dateValue) return "";

    if (dateValue.toDate) {
      const d = dateValue.toDate();
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    }

    if (typeof dateValue === "string") {
      const parsed = new Date(dateValue);
      if (!isNaN(parsed)) {
        const year = parsed.getFullYear();
        const month = String(parsed.getMonth() + 1).padStart(2, "0");
        const day = String(parsed.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
      }
    }

    return "";
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
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
      ].indexOf(monthName);

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
          const docRef = doc(db, "shifts", id);
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

          const calendarDates = [];
          if (startISO) calendarDates.push(new Date(startISO));

          // ✅ Handle all shift point schema versions (old + new)
          let points = [];

          if (Array.isArray(data.shiftPoints) && data.shiftPoints.length > 0) {
            points = data.shiftPoints.map((p) => ({
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

              // ✅ THIS IS THE KEY FIX
              totalKilometers:
                p.totalKilometers !== undefined && p.totalKilometers !== null
                  ? Number(p.totalKilometers)
                  : 0,
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
            startDate: startISO,
            endDate: endISO,
            startTime: data.startTime || "",
            endTime: data.endTime || "",
            description: data.jobdescription || data.description || "",
            accessToShiftReport: data.accessToShiftReport || false,
            shiftDates: calendarDates,
            vehicleType: data.vehicleType || "",
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

      let pointsFound = [];
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

        const snap = await getDocs(collection(db, "InTakeForms"));

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
        let intakePoints = [];

        // Build surname/keyword list from the selected client name
        // e.g. "Kaskamin Family" → ["kaskamin"], "Justice Kaskamin" → ["justice","kaskamin"]
        const clientKeywords = clientNameCandidate
          .toLowerCase()
          .split(/\s+/)
          .filter((w) => w.length > 2 && w !== "family" && w !== "the");

        sortedDocs.forEach((d) => {
          const data = d.id ? { id: d.id, ...d.data() } : d.data();
          const nameMatch = (n) => (n || "").trim().toLowerCase() === clientNameCandidate.toLowerCase();
          // Partial match: any keyword from client name appears in the given string
          const partialMatch = (n) => {
            if (!n) return false;
            const nl = (n || "").toLowerCase();
            return clientKeywords.some((kw) => nl.includes(kw));
          };

          let isMatch = false;
          // ── Exact matches first ──
          if (
            nameMatch(data.clientName) || nameMatch(data.name) ||
            nameMatch(data.nameOfPerson) || nameMatch(data.familyName) ||
            nameMatch(data.nameInClientTable) || nameMatch(data.childsName)   // Flutter form fields
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

        if (foundDesc) setIntakeDescription(foundDesc);

        // PRIORITIZE Intake points if we found any, otherwise fallback to local client db points
        if (intakePoints.length > 0) {
          setShiftPoints(intakePoints);
        } else if (pointsFound.length > 0) {
          setShiftPoints(pointsFound);
        } else {
          setShiftPoints([]);
        }
        setRemovedShiftPoints([]);

      } catch (err) {
        console.error("Error loading data from intake:", err);
      }
    };

    loadFromClient();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClient, mode]);

  // ---------------- SUBMIT HANDLER ----------------
  const handleSubmit = async (values, { resetForm }) => {
    try {
      const { shiftDates, ...restValues } = values;
      const selectedDates = shiftDates || [];

      if (!selectedDates.length) {
        alert("Please select at least one shift date.");
        return;
      }

      // Build final shiftPoints array from all active points (strip _edit flags)
      const finalPoints = shiftPoints.map((fp) => ({
        name: fp.name || "",
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
      }));

      // ---------- UPDATE MODE ----------
      if (mode === "update" && id) {
        const shiftsRef = collection(db, "shifts");
        const qShift = query(shiftsRef, where("id", "==", id));
        const snap = await getDocs(qShift);

        if (!snap.empty) {
          const docRef = snap.docs[0].ref;

          const primaryDate = normalizeDate(selectedDates[0]);
          const isOvernight = values.endTime < values.startTime;
          let endDateObj = new Date(primaryDate);
          if (isOvernight) endDateObj.setDate(endDateObj.getDate() + 1);

          const primaryStaff = users.find(u => String(u.id) === String(values.primaryUser) || String(u.userId) === String(values.primaryUser));

          await updateDoc(docRef, {
            ...restValues,
            startDate: Timestamp.fromDate(primaryDate),
            endDate: Timestamp.fromDate(endDateObj),
            clientDetails: selectedClient,
            clientId: selectedClient?.id || values.client || "",
            clientName: selectedClient?.name || "",
            // Primary Staff
            userId: primaryStaff?.id || values.primaryUser || "",
            userName: primaryStaff?.name || "",
            name: primaryStaff?.name || "",
            primaryUserId: primaryStaff?.id || "",
            primaryUserName: primaryStaff?.name || "",
            agencyId: selectedClient?.agencyId || primaryStaff?.agencyId || "",
            agencyName: selectedClient?.agencyName || primaryStaff?.agencyName || "",
            updatedAt: new Date(),
            // Ensure legacy top-level visit fields are cleared
            visitLocation: "",
            visitStartTime: "",
            visitEndTime: "",
            visitLatitude: 0,
            visitLongitude: 0,
            shiftPoints: finalPoints.map(p => {
              const day = primaryDate.getDay();
              const isWeekend = day === 0 || day === 6;
              const cat = (values.shiftCategory || "").toLowerCase();
              const desc = (values.description || "").toLowerCase();
              const needsVisit = isWeekend || cat.includes("supervised") || desc.includes("supervised");

              // Respect manual clear/removal
              const vLoc = needsVisit ? (p.visitLocation || "").trim() : "";

              return {
                ...p,
                visitLocation: vLoc,
                visitStartTime: vLoc ? (p.visitStartTime || "") : "",
                visitEndTime: vLoc ? (p.visitEndTime || "") : "",
                visitLatitude: vLoc ? (p.visitLatitude || 0) : 0,
                visitLongitude: vLoc ? (p.visitLongitude || 0) : 0,
              };
            }),
            // SYNC CLOCK IN/OUT WITH NEW SCHEDULE (if they exist)
            clockIn: originalClockIn ? `${formatEdmontonISO(primaryDate)}, ${values.startTime}:00` : "",
            clockOut: originalClockOut ? `${formatEdmontonISO(endDateObj)}, ${values.endTime}:00` : "",
            isRatified: false,
            isCancelled: false,
            shiftReportImageUrl: "",
            expenseReceiptUrl: "",
            profilePhotoUrl: "",
            dateKey: formatLocalISO(primaryDate),
          });


          setSlider({
            show: true,
            title: "Shift Updated Successfully!",
            subtitle: `${selectedClient?.name || ""} on ${primaryDate.toDateString()} at ${values.startTime}`,
            redirectTo: "/admin-dashboard/dashboard",
          });
        }
        return;
      }

      // ---------- ADD MODE ----------
      for (const date of selectedDates) {
        const startDateObj = normalizeDate(date);
        const newShiftId = Date.now().toString();

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

        await setDoc(doc(db, "shifts", newShiftId), {
          ...values,
          startDate: startDateObj,
          endDate: endDateObj,
          clientDetails: selectedClient,
          clientId: selectedClient?.id || values.client || "",
          clientName: selectedClient?.name || "",
          userId: primaryStaff?.id || primaryStaff?.userId || values.user || "",
          userName: primaryStaff?.name || "",
          name: primaryStaff?.name || "",
          agencyId: selectedClient?.agencyId || primaryStaff?.agencyId || "",
          agencyName: selectedClient?.agencyName || primaryStaff?.agencyName || "",
          createdAt: new Date(),
          shiftReport: "",
          shiftConfirmed: false,
          id: newShiftId,
          // Explicitly clear top-level visit fields
          visitLocation: "",
          visitStartTime: "",
          visitEndTime: "",
          visitLatitude: 0,
          visitLongitude: 0,
          shiftPoints: filteredPoints.map(p => {
            const vLoc = needsVisit ? (p.visitLocation || "").trim() : "";
            return {
              ...p,
              visitLocation: vLoc,
              visitStartTime: vLoc ? (p.visitStartTime || "") : "",
              visitEndTime: vLoc ? (p.visitEndTime || "") : "",
              visitLatitude: vLoc ? (p.visitLatitude || 0) : 0,
              visitLongitude: vLoc ? (p.visitLongitude || 0) : 0,
            };
          }),
          clockIn: "",
          clockOut: "",
          isRatify: false,
          isCancelled: false,
          shiftReportImageUrl: "",
          expenseReceiptUrl: "",
          profilePhotoUrl: "",
          dateKey: formatLocalISO(startDateObj), // Added for consistency with update mode
        });


        // ✅ SEND ADMIN NOTIFICATION
        const adminQuery = query(collection(db, "users"), where("role", "==", "admin"));
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
      }

      // ✅ SUCCESS SLIDER
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
      setIntakeDescription("");
    } catch (error) {
      console.error("Error saving shift:", error);
    }
  };


  const handleCalculateKilometers = async (shiftPoint, index) => {
    if (!shiftPoint.pickupLocation || !shiftPoint.dropLocation) {
      alert("Please enter both pickup and drop locations first.");
      return;
    }

    try {
      const km = await calculateTotalDistance(shiftPoint);
      setShiftPoints((prev) => prev.map((p, i) => i === index ? { ...p, totalKilometers: km } : p));
    } catch (err) {
      console.error("Error calculating total distance:", err);
      alert("Failed to calculate total kilometers.");
    }
  };

  // ---------------- FETCH ALL SHIFTS FOR CALENDAR DISPLAY ----------------
  useEffect(() => {
    const fetchAllShifts = async () => {
      try {
        const snap = await getDocs(collection(db, "shifts"));
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
              if (window.confirm("Are you sure you want to delete this shift?")) {
                try {
                  await deleteDoc(doc(db, "shifts", id));
                  alert("Shift deleted successfully!");
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
          enableReinitialize
          initialValues={initialValues}
          validationSchema={validationSchema}
          onSubmit={handleSubmit}
        >
          {({ touched, errors, values, setFieldValue }) => {
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
                  intakeDescription={intakeDescription}
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
                        <Field as="select" name="shiftCategory" className={selectCls(touched.shiftCategory && errors.shiftCategory, !values.shiftCategory)}>
                          <option value="">Please select the shift category</option>
                          {shiftCategories.map((item) => (
                            <option key={item.id} value={item.name}>{item.name}</option>
                          ))}
                        </Field>
                        <span className="absolute right-3 top-[60%] -translate-y-1/2 pointer-events-none">
                          <FaChevronDown className="text-gray-400 w-3.5 h-3.5" />
                        </span>
                        <ErrorMessage name="shiftCategory" component="div" className="text-red-500 text-xs mt-1" />
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
                      <div className="relative">
                        <label className="block font-semibold mb-2" style={{ fontSize: 13, color: "#374151" }}>Primary User (Staff)</label>
                        <Field as="select" name="primaryUser" className={selectCls(touched.primaryUser && errors.primaryUser, !values.primaryUser)}>
                          <option value="">Select primary staff</option>
                          {users.map((item) => (
                            <option key={item.id} value={item.id}>{item.name}</option>
                          ))}
                        </Field>
                        <span className="absolute right-3 top-[60%] -translate-y-1/2 pointer-events-none">
                          <FaChevronDown className="text-gray-400 w-3.5 h-3.5" />
                        </span>
                        <ErrorMessage name="primaryUser" component="div" className="text-red-500 text-xs mt-1" />
                      </div>

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
                        <Field as="textarea" name="description" placeholder="Describe responsibilities, special instructions, or notes..." rows={3}
                          className={`${inputCls(touched.description && errors.description)} resize-none`} />
                        <ErrorMessage name="description" component="div" className="text-red-500 text-xs mt-1" />
                      </div>
                    </div>
                  </div>

                </div>

                {/* ── Calendar Card ── */}
                <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: "#e5e7eb", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                  {/* Calendar Header */}
                  <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "#f3f4f6" }}>
                    <div className="flex items-center gap-2">
                      <FaRegCalendarAlt className="w-4 h-4 text-gray-400" />
                      <span className="font-semibold text-gray-900" style={{ fontSize: 14 }}>Select Shift Dates</span>
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
                                const already = existing.some(d => (d instanceof Date ? d : new Date(d)).toISOString().split("T")[0] === dateKey);
                                handleDatesChange(already
                                  ? existing.filter(d => (d instanceof Date ? d : new Date(d)).toISOString().split("T")[0] !== dateKey)
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

                {/* ── Family Members / Shift Points (only for family clients) ── */}
                {selectedClient && shiftPoints.length > 0 && (
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
                              <div className="w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0"
                                style={{ background: "linear-gradient(135deg,#145228,#1f7a3c)" }}>
                                {(pt.name || String.fromCharCode(65 + idx)).charAt(0).toUpperCase()}
                              </div>
                              <span className="font-semibold text-sm text-gray-900">{pt.name || `Member ${idx + 1}`}</span>
                              {pt.seatType && <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "#e0e7ff", color: "#4338ca" }}>{pt.seatType}</span>}
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

                            {/* Pickup Location */}
                            <div>
                              <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Pickup Location</label>
                              <div className="flex items-center gap-2">
                                <input type="text"
                                  className="flex-1 bg-[#f3f3f5] border border-[#e6e6e6] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#145228] focus:bg-white"
                                  value={pt.pickupLocation || ""}
                                  onChange={(e) => setShiftPoints((prev) => prev.map((p, i) => i === idx ? { ...p, pickupLocation: e.target.value } : p))}
                                  placeholder="N/A"
                                />
                                <FaRegMap className="text-[#145228] text-lg cursor-pointer hover:opacity-70 flex-shrink-0"
                                  onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(pt.pickupLocation || "")}`, "_blank")} />
                              </div>
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
                                <input type="text"
                                  className="flex-1 bg-[#f3f3f5] border border-[#e6e6e6] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#145228] focus:bg-white"
                                  value={pt.dropLocation || ""}
                                  onChange={(e) => setShiftPoints((prev) => prev.map((p, i) => i === idx ? { ...p, dropLocation: e.target.value } : p))}
                                  placeholder="N/A"
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

                            {/* Conditionally show Visit fields */}
                            {(() => {
                              const cat = (values.shiftCategory || "").toLowerCase();
                              const desc = (values.description || "").toLowerCase();
                              const dates = values.shiftDates || [];
                              const isSupervised = cat.includes("supervised") || desc.includes("supervised");
                              const hasWeekend = dates.some((d) => {
                                const dateObj = d instanceof Date ? d : new Date(d);
                                const day = dateObj.getDay();
                                return day === 0 || day === 6;
                              });
                              const showVisit = isSupervised || hasWeekend;

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
                      className="flex items-center gap-2 px-6 py-2.5 rounded-lg font-semibold text-sm text-white transition-colors"
                      style={{ backgroundColor: "#145228" }}>
                      {mode !== "update" && (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <line x1="12" y1="5" x2="12" y2="19" />
                          <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                      )}
                      {mode === "update" ? "Update Shift" : `Create Shift${values.shiftDates?.length > 1 ? `s (${values.shiftDates.length})` : ""}`}
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
  intakeDescription,
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

    const shiftTypeData = shiftTypes.find((s) => s.id === values.shiftType);
    setSelectedShiftType(shiftTypeData || null);

    const shiftCategoryData = shiftCategories.find((s) => s.name === values.shiftCategory);
    setSelectedShiftCategory(shiftCategoryData || null);
  }, [values.client, values.primaryUser, values.shiftType, values.shiftCategory, clients, users, shiftTypes, shiftCategories, setSelectedClient, setSelectedPrimaryUser, setSelectedShiftType, setSelectedShiftCategory]);

  useEffect(() => {
    if (intakeDescription && !values.description) {
      setFieldValue("description", intakeDescription);
    }
  }, [intakeDescription, values.description, setFieldValue]);

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
