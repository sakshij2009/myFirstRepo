// IntakeForm.jsx

import React, { useEffect, useRef, useState } from "react";
import { Formik, Form, Field, ErrorMessage, FieldArray } from "formik";
import * as Yup from "yup";
import {
  doc,
  setDoc,
  getDocs,
  collection,
  getDoc,
  where,
  addDoc,
  Timestamp,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage, auth } from "../firebase";
import { sendSignInLinkToEmail } from "firebase/auth";
import { FaChevronDown } from "react-icons/fa6";
import { Upload, X } from "lucide-react";
import SignatureCanvas from "react-signature-canvas";
import { useParams, useSearchParams } from "react-router-dom";
import GoogleAddressInput from "./GoogleAddressInput";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { EditableProvider } from "./EditableContext";
import { CustomTimePicker } from "./CustomTimePicker";

//
// ---------- helpers ----------
//

// normalize "Male"/"MALE"/etc → "male" to match select values
const normalizeGender = (g) => {
  if (!g) return "";
  const v = String(g).toLowerCase();
  if (v === "male") return "male";
  if (v === "female") return "female";
  return "other";
};

// convert "DD-MM-YYYY" → "YYYY-MM-DD" for <input type="date">
const convertToISO = (d) => {
  if (!d) return "";

  // If already ISO (YYYY-MM-DD)
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
    return d;
  }

  // Handle DD-MM-YYYY
  if (/^\d{2}-\d{2}-\d{4}$/.test(d)) {
    const [dd, mm, yyyy] = d.split("-");
    return `${yyyy}-${mm}-${dd}`;
  }

  return "";
};


// format JS Date → YYYY-MM-DD in local time (no timezone shift)
const formatDateLocal = (date) => {
  if (!date) return "";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// age in years from YYYY-MM-DD
const calculateAgeYears = (dateStr) => {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) {
    age--;
  }
  return age;
};

// age string formatted as X years and Y months
const calculateAgeDisplay = (dateStr) => {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  const today = new Date();

  let years = today.getFullYear() - d.getFullYear();
  let months = today.getMonth() - d.getMonth();

  if (today.getDate() < d.getDate()) {
    months--;
  }

  if (months < 0) {
    years--;
    months += 12;
  }

  if (years < 0) return null;

  if (years === 0) {
    return `0 year and ${months} month${months > 1 || months === 0 ? 's' : ''}`;
  } else if (months > 0) {
    return `${years} year${years > 1 ? 's' : ''} and ${months} month${months > 1 ? 's' : ''}`;
  }

  return `${years} year${years > 1 ? 's' : ''}`;
};

// Alberta-style rules → car seat recommendation
const deriveCarSeatFromAge = (ageYears) => {
  if (ageYears == null || ageYears < 0) {
    return { required: "", type: "" };
  }

  if (ageYears < 2) {
    return { required: "yes", type: "Rear-facing seat" };
  }
  if (ageYears < 6) {
    return { required: "yes", type: "Forward-facing seat" };
  }
  if (ageYears < 9) {
    return { required: "yes", type: "Booster seat" };
  }
  // 9+ years → regular seat belt typically OK
  return { required: "no", type: "Seat belt only" };
};

const createEmptyInitialValues = () => ({
  // Top-level
  // avatar: null,

  // Services grouped
  services: {
    serviceType: [], // multi-select (array of ids)
    servicePhone: "",
    serviceEmail: "",
    serviceDates: [], // array of "YYYY-MM-DD"
    serviceDesc: "",
    safetyPlan: "",
  },

  // Clients (siblings)
  clients: [
    {
      fullName: "",
      gender: "",
      birthDate: "",
      address: "",
      apartmentUnit: "",
      latitude: "",
      longitude: "",
      startDate: "",
      clientInfo: "",
      phone: "",
      email: "",
      photos: [], // per-client photos
      cfsStatus: "",
      dfnaNumber: "",
      treatyNumber: "",
    },
  ],

  // Billing
  billingInfo: {
    invoiceEmail: "",
  },

  // Parent / Medical / Transport per client
  parentInfoList: [
    {
      clientName: "",
      parentName: "",
      relationShip: "",
      parentPhone: "",
      parentEmail: "",
      parentAddress: "",
    },
  ],

  medicalInfoList: [],

  transportationInfoList: [
    {
      clientName: "",
      pickupAddress: "",
      dropoffAddress: "",
      pickupTime: "",
      dropOffTime: "",
      transportationOverview: "",
      carSeatRequired: "",
      carSeatType: "",
    },
  ],

  supervisedVisitations: [
    {
      clientName: "",
      visitStartTime: "",
      visitEndTime: "",
      visitDuration: "",
      visitPurpose: "",
      visitAddress: "",
      visitOverview: "",
    },
  ],

  workerInfo: {
    workerName: "",
    date: "",
    signature: "",
  },

  caseworkerName: "",
  caseworkerAgencyName: "",
  caseworkerPhone: "",
  caseworkerEmail: "",

  // Case/Intake worker flat fields (for your two sections)
  intakeworkerName: "",
  agencyName: "",
  intakeworkerPhone: "",
  intakeworkerEmail: "",



  // Uploads
  uploadDocs: [],
  // uploadMedicalDocs: [],

  // Status (for update view)
  status: "",

  // Family name (shared across all siblings)
  familyName: "",
});

// Extract clients from old `inTakeClients` into new `clients` array
const extractOldClients = (data) => {
  if (!Array.isArray(data.inTakeClients)) return [];

  return data.inTakeClients.map((c) => ({
    fullName: c.name || "",
    gender: normalizeGender(c.gender || c.otherGender || ""),
    birthDate: convertToISO(c.dob || ""),
    address: c.address || "",
    latitude: c.latitude || "",
    longitude: c.longitude || "",
    startDate: convertToISO(
      c.serviceStartDate || data.serviceStartDate || ""
    ),
    clientInfo:
      c.servicePlanAndRisk || c.otherServiceConcerns || c.parentInfo || "",
    phone: c.parentPhone || "",
    email: c.parentEmail || "",
    photos: [], // old records had no photos
  }));
};

// Map *old* Firestore structure -> new formik shape
const mapOldIntakeToInitialValues = (raw) => {
  const base = createEmptyInitialValues();
  const inTakeClients = Array.isArray(raw.inTakeClients)
    ? raw.inTakeClients
    : [];
  const primaryClient = inTakeClients[0] || {};

  // Clients
  const clients =
    inTakeClients.length > 0
      ? inTakeClients.map((c) => ({
        fullName: c.name || "",
        gender: normalizeGender(c.gender || c.otherGender || ""),
        birthDate: convertToISO(c.dob || ""),
        address: c.address || "",
        latitude: c.latitude || "",
        longitude: c.longitude || "",
        startDate: formatDateLocal(
          c.serviceStartDate || raw.serviceStartDate || ""
        ),
        clientInfo: c.otherServiceConcerns || "",
        phone: c.parentPhone || "",
        email: c.parentEmail || "",
        photos: [],
        cfsStatus: c.cfsStatus || "",
        dfnaNumber: c.dfnaNumber || "",
        treatyNumber: c.treatyNumber || "",
        apartmentUnit: c.apartmentUnit || "",
      }))
      : base.clients;

  // Parent Info per client
  const parentInfoList =
    Array.isArray(raw.parentInfoList) && raw.parentInfoList.length > 0
      ? raw.parentInfoList
      : inTakeClients.length > 0
        ? inTakeClients.map((c) => ({
          clientName: c.name || "",
          parentName: c.parentName || "",
          relationShip: c.relationship || "",
          parentPhone: c.parentPhone || "",
          parentEmail: c.parentEmail || "",
          parentAddress: c.parentAddress || "",
        }))
        : base.parentInfoList;

  // Medical Info per client
  const medicalInfoList =
    Array.isArray(raw.medicalInfoList) && raw.medicalInfoList.length > 0
      ? raw.medicalInfoList
      : inTakeClients.length > 0
        ? inTakeClients.map((c) => ({
          clientName: c.name || "",
          healthCareNo: c.healthCareNumber || "",
          diagnosis: c.anyDiagnosis === "Yes" ? c.diagnosisType || "" : "",
          diagnosisType: c.diagnosisType || "",
          medicalConcern: c.criticalMedicalConcerns || "",
          mobilityAssistance: c.mobilityAssistanceRequired || "",
          mobilityInfo: c.mobilityAssistanceDetails || "",
          communicationAid: c.commAidRequired || "",
          communicationInfo: c.commAidDetails || "",
        }))
        : base.medicalInfoList;

  // Transportation per client
  const transportationInfoList =
    Array.isArray(raw.transportationInfoList) && raw.transportationInfoList.length > 0
      ? raw.transportationInfoList
      : inTakeClients.length > 0
        ? inTakeClients.map((c) => ({
          clientName: c.name || "",
          pickupAddress: c.pickupAddress || "",
          dropoffAddress: c.dropAddress || "",
          pickupTime: c.pickupTime || "",
          dropOffTime: c.dropTime || "",
          transportationOverview: c.transportOverView || "",
          carSeatRequired: c.typeOfSeat ? "yes" : "no",
          carSeatType: c.typeOfSeat || "",
        }))
        : base.transportationInfoList;

  // Supervised visit per client
  const supervisedVisitations =
    Array.isArray(raw.supervisedVisitations) && raw.supervisedVisitations.length > 0
      ? raw.supervisedVisitations
      : inTakeClients.length > 0
        ? inTakeClients.map((c) => ({
          clientName: c.name || "",
          visitStartTime: c.startVisitTime || "",
          visitEndTime: c.endVisitTime || "",
          visitDuration: c.visitDuration || "",
          visitPurpose: c.purposeOfVisit || "",
          visitAddress: c.visitAddress || "",
          visitOverview: c.visitOverView || "",
        }))
        : base.supervisedVisitations;

  return {
    ...base,
    name: primaryClient.name || raw.nameInClientTable || "",
    // your header field is text, so old DD-MM-YYYY is fine here
    dateOfIntake: raw.dateOfInTake || raw.date || "",
    avatar: raw.photo || null,
    services: {
      ...base.services,
      serviceType: [], // cannot reliably map to shiftCategories id
      servicePhone: "",
      serviceEmail: "",
      serviceDesc: raw.serviceDetail || "",
      safetyPlan: raw.servicePlanAndRisk || "",
    },
    clients,
    billingInfo: {
      invoiceEmail: raw.invoiceEmail || "",
    },
    parentInfoList: Array.isArray(parentInfoList) && parentInfoList.length > 0 ? parentInfoList : [],
    medicalInfoList: Array.isArray(medicalInfoList) && medicalInfoList.length > 0 ? medicalInfoList : [],
    transportationInfoList: Array.isArray(transportationInfoList) && transportationInfoList.length > 0 ? transportationInfoList : [],
    supervisedVisitations: Array.isArray(supervisedVisitations) && supervisedVisitations.length > 0 ? supervisedVisitations : [],
    workerInfo: {
      workerName: raw.nameOfPerson || "",
      // this is a <input type="date"> so we convert to ISO
      date: convertToISO(raw.dateOfInTake || raw.date || ""),
      signature: raw.signature || "",
    },
    intakeworkerName: raw.inTakeWorkerName || "",
    agencyName: raw.inTakeWorkerAgencyName || "",
    intakeworkerPhone: raw.inTakeWorkerPhone || "",
    intakeworkerEmail: raw.inTakeWorkerEmail || "",
    uploadDocs: [],
    uploadMedicalDocs: [],
    status: raw.status || "Submitted",
    familyName: raw.familyName || "",
  };
};

//
// ---------- component ----------
//

const IntakeForm = ({ mode = "add", isCaseWorker: propCaseWorker, user, id: propId, isEditable = true }) => {
  const [showServiceCalendar, setShowServiceCalendar] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [shiftCategories, setShiftCategories] = useState([]);
  const fileInputRef = useRef(null);
  const fileInputRefMedical = useRef(null);
  const hasResigned = useRef(false);

  const [showServiceDropdown, setShowServiceDropdown] = useState(false);

  // Add Intake Worker Modal State
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);


  const previousServiceStart = useRef(null);

  const { id: paramId } = useParams();
  const [searchParams] = useSearchParams();
  const formType = searchParams.get("type");


  const intakeFormId = propId || paramId;
  // Previously "type" could be Intake Worker or Private Family, but now
  // everything is treated as an Intake Worker form globally.
  const isCaseWorker = propCaseWorker ?? true;

  // signature canvas ref
  const sigCanvas = useRef(null);
  // service type dropdown outside-click ref
  const serviceDropdownRef = useRef(null);

  const [initialValues, setInitialValues] = useState(createEmptyInitialValues);
  const [refreshKey, setRefreshKey] = useState(0);

  // Slider active index for each info section
  const [activeClientIdx, setActiveClientIdx] = useState(0);
  const [activeParentIdx, setActiveParentIdx] = useState(0);
  const [activeMedicalIdx, setActiveMedicalIdx] = useState(0);
  const [activeTransportIdx, setActiveTransportIdx] = useState(0);
  const [activeSupervisedIdx, setActiveSupervisedIdx] = useState(0);

  // Transport client multi-select dropdown state keyed by entry index
  const [transportClientDropdown, setTransportClientDropdown] = useState({});

  // Fetch shift categories
  useEffect(() => {
    const fetchShiftCategories = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "shiftCategories"));
        const categories = querySnapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));
        setShiftCategories(categories);
      } catch (error) {
        console.error("Error fetching shift categories:", error);
      }
    };

    fetchShiftCategories();
  }, []);

  // Close service type dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (serviceDropdownRef.current && !serviceDropdownRef.current.contains(event.target)) {
        setShowServiceDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch intake form data in update mode (support new + old structures)
  useEffect(() => {
    const fetchIntakeForm = async () => {
      if (mode !== "update" || !intakeFormId) return;

      try {
        const docRef = doc(db, "InTakeForms", intakeFormId);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
          console.warn("No intake form found:", intakeFormId);
          return;
        }

        const data = docSnap.data();
        const base = createEmptyInitialValues();

        // ---------- detect structure ----------
        //     const hasNewStructure =
        // data.clients && !Array.isArray(data.clients);

        const isOldStructure = Array.isArray(data.inTakeClients);
        console.log(isOldStructure);



        let nextVals;

        // =================================================
        // NEW STRUCTURE
        // =================================================
        if (!isOldStructure) {
          const normalizedClients = data.clients
            ? Object.values(data.clients)
            : [];

          const clients =
            normalizedClients.length > 0
              ? normalizedClients.map((c) => ({
                fullName: c.fullName || "",
                gender: normalizeGender(c.gender),
                birthDate: convertToISO(c.birthDate),
                startDate: formatDateLocal(c.startDate),
                address: c.address || "",
                latitude: c.latitude || "",
                longitude: c.longitude || c.longtitude || "",
                clientInfo: c.clientInfo || "",
                phone: c.phone || "",
                email: c.email || "",
                photos: c.photos || [],
                cfsStatus: c.cfsStatus || "",
                dfnaNumber: c.dfnaNumber || "",
                treatyNumber: c.treatyNumber || "",
                apartmentUnit: c.apartmentUnit || "",
              }))
              : base.clients;

          nextVals = {
            ...base,

            services: {
              ...base.services,
              ...(data.services || {}),
              serviceType: Array.isArray(data.services?.serviceType)
                ? data.services.serviceType
                : [],
              serviceDates: Array.isArray(data.services?.serviceDates)
                ? data.services.serviceDates.map(convertToISO)
                : [],
            },

            clients,

            billingInfo: {
              invoiceEmail: data.billingInfo?.invoiceEmail || "",
            },

            parentInfoList: Array.isArray(data.parentInfoList) && data.parentInfoList.length > 0 ? data.parentInfoList : [],
            medicalInfoList: Array.isArray(data.medicalInfoList) && data.medicalInfoList.length > 0 ? data.medicalInfoList : [],
            transportationInfoList: Array.isArray(data.transportationInfoList) && data.transportationInfoList.length > 0 ? data.transportationInfoList : [],
            supervisedVisitations: Array.isArray(data.supervisedVisitations) && data.supervisedVisitations.length > 0 ? data.supervisedVisitations : [],

            workerInfo: {
              workerName: data.workerInfo?.workerName || "",
              date: formatDateLocal(
                data.workerInfo?.date || data.dateOfIntake
              ),

              signature: data.workerInfo?.signature || "",
            },

            intakeworkerName: data.intakeworkerName || "",
            agencyName: data.agencyName || "",
            intakeworkerPhone: data.intakeworkerPhone || "",
            intakeworkerEmail: data.intakeworkerEmail || "",
            familyName: data.familyName || "",

            uploadDocs: data.uploadedDocs || [],
            status: data.status,
          };

          if (data.avatar) setAvatarPreview(data.avatar);
          if (data.workerInfo?.signature && sigCanvas.current) {
            sigCanvas.current.fromDataURL(data.workerInfo.signature);
            hasResigned.current = false;
          }



        }

        // =================================================
        // OLD STRUCTURE
        // =================================================
        else {
          nextVals = mapOldIntakeToInitialValues(data);
          if (data.photo) setAvatarPreview(data.photo);
        }

        setInitialValues(nextVals);
        console.log("Prefilled intake values:", nextVals);
      } catch (err) {
        console.error("Error fetching intake form:", err);
      }
    };

    fetchIntakeForm();
  }, [mode, intakeFormId, refreshKey]);



  // Validation
  const validationSchema = Yup.object().shape({

    services: Yup.object().shape({
      serviceType: Yup.array()
        .of(Yup.string())
        .min(1, "Please select at least one type of service"),
      serviceDates: Yup.array()
        .of(Yup.string())
        .min(1, "At least one service date is required"),
    }),
    clients: Yup.array()
      .of(
        Yup.object().shape({
          fullName: Yup.string().required("Client name is required"),
          gender: Yup.string().required("Gender is required"),
          birthDate: Yup.string().required("Birth date is required"),
          address: Yup.string(),
          startDate: Yup.string().required("Start date is required"),
          clientInfo: Yup.string(),
          phone: Yup.string()
            .required("Phone number is required")
            .matches(/^[0-9]{10}$/, "Phone number must be 10 digits"),
          email: Yup.string().email("Invalid email address"),
        })
      )
      .min(1, "At least one client is required"),
    billingInfo: Yup.object().shape({
      invoiceEmail: Yup.string()
        .required("Invoice email is required")
        .email("Invalid email"),
    }),
  });

  const validate = () => {
    // extra manual validation not needed now
    return {};
  };

  // avatar
  // const handleAvatarChange = (event, setFieldValue) => {
  //   const file = event.currentTarget.files[0];
  //   if (file) {
  //     setFieldValue("avatar", file);
  //     const reader = new FileReader();
  //     reader.onloadend = () => {
  //       setAvatarPreview(reader.result);
  //     };
  //     reader.readAsDataURL(file);
  //   }
  // };

  // const handleRemoveAvatar = (setFieldValue) => {
  //   setFieldValue("avatar", null);
  //   setAvatarPreview(null);
  // };

  // per-client photos: add / remove
  const handleClientPhotosChange = (
    event,
    clientIndex,
    values,
    setFieldValue
  ) => {
    const files = Array.from(event?.currentTarget?.files || []);
    if (!files.length) return;
    const existing = values.clients?.[clientIndex]?.photos || [];
    setFieldValue(`clients.${clientIndex}.photos`, [...existing, ...files]);
  };

  const handleRemoveClientPhoto = (
    clientIndex,
    photoIndex,
    values,
    setFieldValue
  ) => {
    const current = values.clients?.[clientIndex]?.photos || [];
    const next = current.filter((_, i) => i !== photoIndex);
    setFieldValue(`clients.${clientIndex}.photos`, next);
  };

  // Utility to format date like "01 Dec 2025 12:53 PM"
  const formatReadableDate = (date) => {
    const d = new Date(date);
    return d.toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).replace(",", "");
  };


  ////client formation////////////////////////
  const generateClientCode = () =>
    Math.floor(100000 + Math.random() * 900000).toString();


  const createClientsFromIntake = async (intake, intakeId, db) => {
    // ── Resolve agency info (same as before for case-worker forms) ──────────
    let agencyName = intake.agencyName || "Private";
    let agencyId = "";
    let agencyAddress = "";
    let agencyType = "Private";
    let rateList = [];
    let clientRate = "";
    let kmRate = "";

    if (intake.isCaseWorker && agencyName) {
      try {
        const agencySnap = await getDocs(
          query(collection(db, "agencies"), where("agencyName", "==", agencyName))
        );
        if (!agencySnap.empty) {
          const agencyDoc = agencySnap.docs[0];
          const agency = agencyDoc.data();
          agencyId = agencyDoc.id;
          agencyAddress = agency.address || "";
          agencyType = agency.type || "";
          rateList = agency.rateList || [];

          const serviceId = intake.services?.serviceType?.[0];
          const matched = rateList.find((r) => r.id === serviceId);
          clientRate = matched?.rate ?? "";
          kmRate = matched?.kmRate ?? "";
        }
      } catch (e) {
        console.warn("Could not fetch agency for client creation:", e);
      }
    }

    // ── Family name ──────────────────────────────────────────────────────────
    const familyNameStr =
      intake.familyName ||
      (intake.clients[0]?.fullName
        ? intake.clients[0].fullName.split(" ").slice(-1)[0] + " Family"
        : "Family");

    // ── ONE shiftPoints entry per child = ALL info merged ────────────────────
    // Field names match AddClient.jsx emptyShiftPoint so the edit form shows them
    const shiftPoints = intake.clients.map((c) => {
      const parent = (intake.parentInfoList || []).find((p) => p.clientName && p.clientName.includes(c.fullName)) || {};
      const medical = (intake.medicalInfoList || []).find((m) => m.clientName && m.clientName.includes(c.fullName)) || {};
      const transport = (intake.transportationInfoList || []).find((t) => t.clientName && t.clientName.includes(c.fullName)) || {};
      return {
        // Personal
        name: c.fullName || "",
        gender: c.gender || "",
        dob: c.birthDate || "",
        address: c.address || "",
        phone: c.phone || "",
        email: c.email || "",
        photos: Array.isArray(c.photos) ? c.photos : [],
        clientInfo: c.clientInfo || "",
        cfsStatus: c.cfsStatus || "",
        dfnaNumber: c.dfnaNumber || "",
        treatyNumber: c.treatyNumber || "",
        apartmentUnit: c.apartmentUnit || "",
        // Parent
        parentName: parent.parentName || "",
        relationship: parent.relationShip || "",
        parentPhone: parent.parentPhone || "",
        parentEmail: parent.parentEmail || "",
        parentAddress: parent.parentAddress || "",
        // Medical
        healthCareNo: medical.healthCareNo || "",
        diagnosis: medical.diagnosis || "",
        medicalConcern: medical.medicalConcern || "",
        mobilityAssistance: medical.mobilityAssistance || "",
        mobilityInfo: medical.mobilityInfo || "",
        communicationAid: medical.communicationAid || "",
        communicationInfo: medical.communicationInfo || "",
        // Transportation → mapped to AddClient field names
        seatType: transport.carSeatType || "No Seat Required",
        carSeatRequired: transport.carSeatRequired || "no",
        pickupLocation: transport.pickupAddress || "",
        dropLocation: transport.dropoffAddress || "",
        pickupTime: transport.pickupTime || "",
        dropTime: transport.dropOffTime || "",
        transportationOverview: transport.transportationOverview || "",
        // Editable-later placeholders
        cyimId: c.cyimId || "",
        pickupDate: "", dropDate: "",
        visitDate: "", visitStartTime: "", visitEndTime: "",
        visitDuration: "", visitLocation: "",
      };
    });

    // ── Write the single family client document ──────────────────────────────
    const familyId = `family_${intakeId}`;
    await setDoc(doc(db, "clients", familyId), {
      // Identity
      name: familyNameStr,
      familyName: familyNameStr,
      isFamily: true,
      id: familyId,
      intakeId,

      // Status
      clientStatus: "Active",
      fileClosed: false,
      clientCode: generateClientCode(),

      // All children data in shiftPoints (no separate siblings array)
      shiftPoints,

      // Services & billing
      serviceDesc: intake.services?.serviceDesc || "",
      invoiceEmail: intake.billingInfo?.invoiceEmail || "",

      // Agency & rates
      agencyName,
      agencyId,
      agencyAddress,
      agencyType,
      clientRate,
      kmRate,
      rateList: intake.isCaseWorker ? rateList : [],

      // Intake worker
      intakeworkerName: intake.intakeworkerName || "",
      intakeworkerEmail: intake.intakeworkerEmail || "",
      intakeworkerPhone: intake.intakeworkerPhone || "",

      // Empty medical defaults (family-level, siblings have their own above)
      medications: [],
      pharmacy: {},
      hospital: {},

      createdAt: Timestamp.now(),
    });
  };






  const handleSubmit = async (values, { resetForm }) => {
    try {
      // ================== SIGNATURE UPLOAD ==================
      // No longer using Canvas drawing. Taking the typed name as the signature.
      let signatureURL = values.workerInfo.signature || "";

      // ================== CLIENT PHOTOS ==================
      const clientsWithPhotos = await Promise.all(
        (values.clients || []).map(async (client, idx) => {
          const uploadedPhotos = [];

          for (const photo of client.photos || []) {
            if (typeof photo === "string") {
              uploadedPhotos.push(photo);
              continue;
            }

            const photoRef = ref(
              storage,
              `client_photos/${Date.now()}_${idx}_${photo.name}`
            );
            await uploadBytes(photoRef, photo);
            uploadedPhotos.push(await getDownloadURL(photoRef));
          }

          return {
            ...client,
            photos: uploadedPhotos,
          };
        })
      );

      // ================== CLIENT OBJECT ==================
      const clientsObj = {};
      clientsWithPhotos.forEach((c, i) => {
        clientsObj[`client${i + 1}`] = c;
      });

      // ================== UPLOAD DOCS ==================
      const uploadedDocURLs = [];
      for (const file of values.uploadDocs || []) {
        if (typeof file === "string") {
          uploadedDocURLs.push(file);
        } else if (file instanceof File) {
          const docRef2 = ref(storage, `intake_docs/${Date.now()}_${file.name}`);
          await uploadBytes(docRef2, file);
          uploadedDocURLs.push(await getDownloadURL(docRef2));
        }
      }

      // ================== FINAL PAYLOAD ==================
      const payload = {
        avatar: avatarPreview || null,

        services: {
          ...values.services,
          serviceType: values.services.serviceType || [],
        },

        clients: clientsObj,

        billingInfo: values.billingInfo,
        parentInfoList: (values.parentInfoList || []).filter((p) =>
          p.parentName || p.parentPhone || p.parentEmail || p.relationShip || p.parentAddress
        ),
        medicalInfoList: (values.medicalInfoList || []).filter((m) =>
          m.healthCareNo || m.diagnosis || m.diagnosisType || m.medicalConcern || m.mobilityAssistance || m.mobilityInfo || m.communicationAid || m.communicationInfo
        ),
        transportationInfoList: (values.transportationInfoList || []).filter((t) =>
          t.pickupAddress || t.dropoffAddress || t.pickupTime || t.dropOffTime || t.transportationOverview || t.carSeatType
        ),
        supervisedVisitations: (values.supervisedVisitations || []).filter((s) =>
          s.visitStartTime || s.visitEndTime || s.visitDuration || s.visitPurpose || s.visitAddress || s.visitOverview
        ),

        uploadedDocs: uploadedDocURLs,

        workerInfo: {
          ...values.workerInfo,
          // Ensure worker name is always saved — fall back to logged-in user if blank
          workerName: values.workerInfo.workerName || user?.name || "",
          signature: signatureURL,
        },

        intakeworkerName: values.intakeworkerName || "",
        agencyName: values.agencyName || "",
        intakeworkerPhone: values.intakeworkerPhone || "",
        intakeworkerEmail: values.intakeworkerEmail || "",

        familyName: values.familyName || "", // Added familyName to payload

        isCaseWorker: !!isCaseWorker,
        status: values.status || "Submitted",

        // 🔐 IMPORTANT FLAG
        clientsCreated: values.clientsCreated || false,

        // 🔓 Admin edit access flag — new forms start as editable
        isEditable: mode === "update" ? (values.isEditable !== undefined ? values.isEditable : true) : true,

        createdAt: formatReadableDate(new Date()),

        // Last updated tracking (only meaningful on update, but stored on every save)
        ...(mode === "update" ? {
          lastUpdatedAt: formatReadableDate(new Date()),
          lastUpdatedBy: user?.name || user?.email || "Intake Worker",
        } : {}),
      };

      // ================== SAVE INTAKE ==================
      const formId = mode === "update" && intakeFormId ? intakeFormId : Date.now().toString();

      // 🔥 CREATE CLIENTS ONLY WHEN STATUS CHANGES TO ACCEPTED
      if (
        initialValues.status !== "Accepted" &&
        values.status === "Accepted" &&
        !values.clientsCreated
      ) {
        await createClientsFromIntake(values, formId, db);
        payload.clientsCreated = true; // mark processed
      }

      await setDoc(doc(db, "InTakeForms", formId), payload);

      // ✉️ NOTIFY ADMIN when intake is edited
      if (mode === "update") {
        try {
          await addDoc(collection(db, "adminNotifications"), {
            type: "intake_edited",
            message: `Intake form ${formId} was edited by ${user?.name || user?.email || "an intake worker"}.`,
            formId,
            editedBy: user?.name || user?.email || "Intake Worker",
            timestamp: new Date().toISOString(),
            read: false,
          });
        } catch (notifErr) {
          console.warn("Could not write admin notification:", notifErr);
        }
      }

      alert("✅ Intake form submitted successfully");

      if (mode === "update") {
        // Re-fetch the updated data so the form shows current values
        setRefreshKey((k) => k + 1);
      } else {
        resetForm();
        setAvatarPreview(null);
        sigCanvas.current?.clear();
      }
    } catch (err) {
      console.error("❌ Intake submit failed:", err);
      alert("Something went wrong while submitting the form");
    }
  };




  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="font-bold text-2xl leading-7 text-light-black">
          {mode === "update" ? "Update Intake Form" : "Add Intake Form"}{" "}
          {isCaseWorker ? "(Intake Worker)" : "(Private Form)"}
        </p>
      </div>
      <hr className="border-t border-gray" />

      <EditableProvider isEditable={isEditable}>
        <Formik
          enableReinitialize={true}
          initialValues={initialValues}
          validate={validate}

          onSubmit={handleSubmit}
        >
          {({ touched, errors, values, setFieldValue }) => {

            useEffect(() => {
              if (user) {
                setFieldValue("intakeworkerName", user.name || "");
                setFieldValue("agencyName", user.agency || "");
                setFieldValue("intakeworkerPhone", user.phone || "");
                setFieldValue("intakeworkerEmail", user.email || "");
                // Auto-fill worker name for new forms so the dashboard filter can match
                if (mode === "add") {
                  setFieldValue("workerInfo.workerName", user.name || "");
                }
              }
            }, [user, setFieldValue]);

            // Auto-derive seat type from DOB whenever clients or transportation rows change
            // This fixes the "seat type not calculating in update mode" issue
            useEffect(() => {
              if (!values.clients?.length || !values.transportationInfoList?.length) return;

              values.transportationInfoList.forEach((trans, idx) => {
                const matchedClient = values.clients.find(
                  (c) => c.fullName && trans.clientName && trans.clientName.includes(c.fullName)
                );

                if (matchedClient?.birthDate) {
                  const age = calculateAgeYears(matchedClient.birthDate);
                  const seat = deriveCarSeatFromAge(age);

                  // Only update if the current value differs (avoids infinite loop)
                  if (trans.carSeatRequired !== seat.required) {
                    setFieldValue(`transportationInfoList.${idx}.carSeatRequired`, seat.required);
                  }
                  if (trans.carSeatType !== seat.type) {
                    setFieldValue(`transportationInfoList.${idx}.carSeatType`, seat.type);
                  }
                }
              });
            }, [values.clients, values.transportationInfoList.map(t => t.clientName).join(","), setFieldValue]);

            // derive sections visibility from selected service types
            const selectedServiceIds = values.services?.serviceType || [];

            const selectedServiceCategories = shiftCategories.filter((cat) =>
              selectedServiceIds.includes(cat.id)
            );

            const showCombinedSection = selectedServiceCategories.some((cat) => {
              const name = (cat.name || "").toLowerCase();
              return (name.includes("supervised") || name.includes("supervisitation") || name.includes("visitation")) && name.includes("transportation");
            });

            const showTransportationSection = !showCombinedSection && selectedServiceCategories.some((cat) =>
              (cat.name || "").toLowerCase().includes("transport")
            );

            const showVisitationSection = !showCombinedSection && selectedServiceCategories.some((cat) => {
              const name = (cat.name || "").toLowerCase();
              return (
                name.includes("supervised") ||
                name.includes("supervisitation") ||
                name.includes("visitation")
              );
            });

            return (
              <Form className="flex flex-col gap-4 w-full ">
                {/* Status (only in update mode) */}
                {mode === "update" && (
                  <div className="flex justify-end">
                    <div className="bg-white border border-light-gray rounded p-3 ">
                      <label className="font-bold text-sm text-light-black mr-2">
                        Status
                      </label>
                      <Field
                        as="select"
                        name="status"
                        className="border border-light-gray rounded-sm p-[8px] text-sm cursor-pointer"
                      >
                        <option value="Submitted">Submitted</option>
                        <option value="Accepted">Accepted</option>
                        <option value="Rejected">Rejected</option>
                      </Field>
                    </div>
                  </div>
                )}


                {/* <div className="flex justify-end gap-3 ">
                <div
                  className="flex justify-center items-center text-white border gap-[10px] pt-[6px] pr-3 pb-[6px] pl-3 rounded-[6px] cursor-pointer bg-dark-green w-auto"
                  onClick={() => setShowTransportation((prev) => !prev)}
                >
                  <p className="w-[10px] ">
                    {!showTransportation ? <FaPlus /> : <FaMinus />}
                  </p>
                  <p className="font-medium text-[14px] leading-[20px] ">
                    {!showTransportation ? "Add" : "Remove"} Transportation
                  </p>
                </div>
                <div
                  className="flex justify-center items-center text-white border gap-[10px] pt-[6px] pr-3 pb-[6px] pl-3 rounded-[6px] cursor-pointer bg-dark-green w-auto"
                  onClick={() => setShowVisitation((prev) => !prev)}
                >
                  <p className="w-[10px] ">
                    {!showVisitation ? <FaPlus /> : <FaMinus />}
                  </p>
                  <p className="font-medium text-[14px] leading-[20px] ">
                    {!showVisitation ? "Add" : "Remove"} Supervised Visitation
                  </p>
                </div>
              </div> */}


                {/* ── FAMILY NAME ────────────────────────────── */}
                <div className="bg-white p-4 border border-light-gray rounded">
                  <h3 className="font-bold text-[20px] text-light-black mb-2">Family Name</h3>
                  <div className="max-w-sm">
                    <label className="font-bold text-sm leading-5 tracking-normal text-light-black">
                      Family Name <span className="text-red-500">*</span>
                    </label>
                    <Field
                      name="familyName"
                      type="text"
                      placeholder="Please Enter Family Name"
                      className="w-full border border-light-gray rounded-sm p-[10px] placeholder:text-[#72787E] placeholder:text-sm mt-1"
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      Enter the family/client name. All siblings added below will be grouped under this name.
                    </p>
                  </div>
                </div>

                {/* Services */}
                <div className="">
                  <h3 className="font-bold text-[24px] text-light-black ">
                    Services
                  </h3>
                  <div className="grid grid-cols-3 gap-16 gap-y-4 bg-white p-4 border border-light-gray w-full rounded">
                    {/* Multi-select Service Type */}
                    <div className="relative" ref={serviceDropdownRef}>
                      <label
                        htmlFor="shiftCategory"
                        className="font-bold text-sm leading-5 tracking-normal text-light-black"
                      >
                        Types of Services
                      </label>

                      {/* CLICKABLE DISPLAY BOX */}
                      <div
                        onClick={() => setShowServiceDropdown(!showServiceDropdown)}
                        className={`w-full border rounded-sm p-[10px] appearance-none pr-10 cursor-pointer 
      ${touched.services?.serviceType && errors.services?.serviceType
                            ? "border-red-500"
                            : "border-light-gray"
                          }
      ${(values.services.serviceType?.length ?? 0) > 0
                            ? "text-black"
                            : "text-[#72787E] text-sm"
                          }
    `}
                      >
                        {(values.services.serviceType?.length ?? 0) > 0
                          ? shiftCategories
                            .filter(cat => values.services.serviceType.includes(cat.id))
                            .map(cat => cat.name)
                            .join(", ")
                          : "Select the type of service"}
                      </div>

                      {/* DROPDOWN ICON */}
                      <span className="absolute right-3 top-[45px] -translate-y-1/2 pointer-events-none">
                        <FaChevronDown className="text-light-green w-4 h-4" />
                      </span>

                      {/* ACTUAL MULTI-SELECT MENU */}
                      {showServiceDropdown && (
                        <div
                          className="absolute z-50 mt-1 w-full bg-white border border-light-gray rounded shadow-md max-h-60 overflow-auto"
                        >
                          {shiftCategories
                            .filter(item => {
                              const lowers = (item.name || "").toLowerCase();
                              return lowers !== "respite care" &&
                                lowers !== "supervised visitation" &&
                                lowers !== "office admin";
                            })
                            .map(item => {
                              const isSelected = values.services.serviceType.includes(item.id);
                              return (
                                <div
                                  key={item.id}
                                  className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 cursor-pointer"
                                  onClick={() => {
                                    let updated = [...values.services.serviceType];

                                    if (isSelected) {
                                      updated = updated.filter(id => id !== item.id);
                                    } else {
                                      updated.push(item.id);
                                    }

                                    setFieldValue("services.serviceType", updated);
                                  }}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    readOnly
                                  />
                                  <span className="text-sm text-black">{item.name}</span>
                                </div>
                              );
                            })}
                        </div>
                      )}

                      <ErrorMessage
                        name="services.serviceType"
                        component="div"
                        className="text-red-500 text-xs mt-1"
                      />
                    </div>


                    <div>
                      <label className="font-bold text-sm leading-5 tracking-normal text-light-black">
                        Service Dates
                      </label>

                      <div
                        className="w-full border border-light-gray rounded-sm p-[10px] cursor-pointer text-sm text-[#72787E]"
                        onClick={() => setShowServiceCalendar(true)}
                      >
                        {(values.services?.serviceDates?.length ?? 0) > 0

                          ? values.services.serviceDates.join(", ")
                          : "Select the service dates"}
                      </div>

                      {showServiceCalendar && (
                        <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50">
                          <div className="bg-white p-5 rounded-md shadow-lg min-w-[360px]">
                            <h2 className="text-lg font-bold mb-3 text-light-black">
                              Select Service Dates
                            </h2>

                            <DayPicker
                              mode="multiple"
                              selected={(values.services?.serviceDates || []).map((str) => {
                                // str = "YYYY-MM-DD"
                                const [year, month, day] = (str || "").split("-").map(Number);
                                if (!year || !month || !day) return new Date();
                                return new Date(year, month - 1, day);
                              })}
                              onSelect={(dates) =>
                                setFieldValue(
                                  "services.serviceDates",
                                  (dates || []).map((date) => formatDateLocal(date))
                                )
                              }
                              className="custom-daypicker-green"
                            />


                            <div className="flex justify-between gap-3 mt-4">
                              <button
                                type="button"
                                onClick={() => setFieldValue("services.serviceDates", [])}
                                className="px-4 py-1 border border-gray-400 rounded"
                              >
                                Clear All
                              </button>

                              <div className="flex gap-3">
                                <button
                                  type="button"
                                  onClick={() => setShowServiceCalendar(false)}
                                  className="px-4 py-1 border border-gray-400 rounded"
                                >
                                  Cancel
                                </button>

                                <button
                                  type="button"
                                  onClick={() => setShowServiceCalendar(false)}
                                  className="px-4 py-1 bg-dark-green text-white rounded"
                                >
                                  Done
                                </button>
                              </div>
                            </div>

                          </div>
                        </div>
                      )}

                    </div>




                    <div className="col-span-3">
                      <label className="font-bold text-sm leading-5 tracking-normal text-light-black">
                        Safety Plan/Management Risk
                      </label>
                      <Field
                        as="textarea"
                        name="services.safetyPlan"
                        placeholder="Write down any risk or safety plan required for the plan"
                        className={`w-full border rounded-sm p-[10px] placeholder:text-[#72787E] placeholder:text-sm placeholder:font-normal h-50 ${touched.services?.safetyPlan &&
                          errors.services?.safetyPlan
                          ? "border-red-500"
                          : "border-light-gray"
                          }`}
                      />
                      <ErrorMessage
                        name="services.safetyPlan"
                        component="div"
                        className="text-red-500 text-xs mt-1"
                      />
                    </div>
                    <div className="col-span-3">
                      <label className="font-bold text-sm leading-5 tracking-normal text-light-black">
                        Service Description
                      </label>

                      <Field
                        as="textarea"
                        name="services.serviceDesc"
                        placeholder="Write down the details regarding the service"
                        className="w-full border border-light-gray rounded-sm p-[10px] placeholder:text-[#72787E] placeholder:text-sm placeholder:font-normal h-50"
                      />
                    </div>
                  </div>
                </div>

                {/* === CLIENT INFO (with Add Sibling) === */}
                <div>
                  <div className="flex justify-between items-center ">
                    <h3 className="font-bold text-[24px] text-light-black">
                      Client Info
                    </h3>
                    <button
                      type="button"
                      onClick={() => {
                        const newClients = [
                          ...values.clients,
                          {
                            fullName: "",
                            gender: "",
                            birthDate: "",
                            address: "",
                            apartmentUnit: "",
                            latitude: "",
                            longitude: "",
                            startDate: "",
                            clientInfo: "",
                            phone: "",
                            email: "",
                            photos: [],
                            cfsStatus: "",
                            dfnaNumber: "",
                            treatyNumber: "",
                            clientCode: "",
                          },
                        ];
                        setFieldValue("clients", newClients);
                        setActiveClientIdx(newClients.length - 1);
                      }}
                      className="bg-dark-green text-white px-4 py-2 rounded-md text-sm mb-1"
                    >
                      + Add Sibling
                    </button>
                  </div>

                  <FieldArray name="clients">
                    {({ remove }) => {
                      const total = values.clients.length;
                      if (total === 0) return null;
                      const idx = Math.min(activeClientIdx, total - 1);
                      const copyFromFirst = () => {
                        const src = values.clients[0];
                        setFieldValue(`clients.${idx}.address`, src.address);
                        setFieldValue(`clients.${idx}.apartmentUnit`, src.apartmentUnit);
                        setFieldValue(`clients.${idx}.latitude`, src.latitude);
                        setFieldValue(`clients.${idx}.longitude`, src.longitude);
                        setFieldValue(`clients.${idx}.startDate`, src.startDate);
                        setFieldValue(`clients.${idx}.clientInfo`, src.clientInfo);
                        setFieldValue(`clients.${idx}.cfsStatus`, src.cfsStatus);
                      };
                      return (
                        <div className="bg-white p-4 border border-light-gray rounded w-full">
                          {/* Slider nav */}
                          <div className="flex justify-between items-center mb-3">
                            <div className="flex items-center gap-2">
                              <button type="button" onClick={() => setActiveClientIdx(i => Math.max(0, i - 1))} disabled={idx === 0} className="px-2 py-1 border rounded text-sm disabled:opacity-40">‹</button>
                              <span className="font-semibold text-base text-light-black">Client {idx + 1} of {total}</span>
                              <button type="button" onClick={() => setActiveClientIdx(i => Math.min(total - 1, i + 1))} disabled={idx === total - 1} className="px-2 py-1 border rounded text-sm disabled:opacity-40">›</button>
                            </div>
                            {total > 1 && (
                              <button type="button" onClick={() => { remove(idx); setActiveClientIdx(i => Math.min(total - 2, Math.max(0, i))); }} className="text-red-500 text-sm font-semibold">Remove</button>
                            )}
                          </div>

                          {/* Copy from Client 1 (shown for idx > 0) */}
                          {idx > 0 && (
                            <label className="flex items-center gap-2 mb-4 px-3 py-2 rounded border-2 border-dark-green bg-green-50 cursor-pointer w-fit">
                              <input
                                type="checkbox"
                                className="h-4 w-4 accent-dark-green"
                                onChange={(e) => { if (e.target.checked) copyFromFirst(); }}
                              />
                              <span className="text-sm font-semibold text-dark-green">Copy shared info from Client 1</span>
                            </label>
                          )}

                          <div className="grid grid-cols-3 gap-8 gap-y-4">
                            {/* client photo */}
                            <div className="col-span-3 mt-2">
                              <input
                                id={`client-photo-input-${idx}`}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) =>
                                  handleClientPhotosChange(e, idx, values, setFieldValue)
                                }
                              />
                              <div className="flex items-center gap-7">
                                <div className="w-22 h-22 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden border border-gray-300">
                                  {values.clients[idx].photos && values.clients[idx].photos.length > 0 ? (
                                    <img
                                      src={
                                        typeof values.clients[idx].photos[0] === "string"
                                          ? values.clients[idx].photos[0]
                                          : URL.createObjectURL(values.clients[idx].photos[0])
                                      }
                                      alt="Client"
                                      className="object-cover w-full h-full"
                                    />
                                  ) : (
                                    <img src="/images/profile.jpeg" />
                                  )}
                                </div>
                                <div className="flex gap-2">
                                  <label
                                    htmlFor={`client-photo-input-${idx}`}
                                    className="px-4 py-1.5 rounded-sm border-2 border-dark-green bg-dark-green text-white cursor-pointer text-sm"
                                  >
                                    Add Photo
                                  </label>
                                  <button
                                    type="button"
                                    onClick={() => setFieldValue(`clients.${idx}.photos`, [])}
                                    className="px-4 py-1.5 rounded-sm border-2 border-light-green text-light-green text-sm"
                                  >
                                    Remove Photo
                                  </button>
                                </div>
                              </div>
                            </div>

                            {/* Full Name */}
                            <div>
                              <label className="font-bold text-sm text-light-black">Full Name</label>
                              <Field
                                name={`clients.${idx}.fullName`}
                                type="text"
                                placeholder="Enter client name"
                                className={`w-full border border-light-gray rounded-sm p-[10px] placeholder:text-[#72787E] placeholder:text-sm placeholder:font-normal ${touched.clients?.[idx]?.fullName && errors.clients?.[idx]?.fullName ? "border-red-500" : "border-light-gray"}`}
                              />
                              <ErrorMessage name={`clients.${idx}.fullName`} component="div" className="text-red-500 text-xs mt-1" />
                            </div>

                            {/* Gender */}
                            <div className="relative">
                              <label className="font-bold text-sm text-light-black">Gender</label>
                              <Field
                                as="select"
                                name={`clients.${idx}.gender`}
                                className={`w-full border rounded-sm p-[10px] appearance-none pr-10 text-sm ${values?.clients?.[idx]?.gender ? "text-black" : "text-[#72787E]"} border-light-gray`}
                              >
                                <option value="" className="text-[#72787E] text-sm">Select Gender</option>
                                <option value="male" className="text-black text-sm">Male</option>
                                <option value="female" className="text-black text-sm">Female</option>
                                <option value="other" className="text-black text-sm">Other</option>
                              </Field>
                              <span className="absolute right-3 top-11 -translate-y-1/2 pointer-events-none">
                                <FaChevronDown className="text-light-green w-4 h-4" />
                              </span>
                            </div>

                            {/* Birth Date */}
                            <div>
                              <label className="font-bold text-sm text-light-black">Date of Birth</label>
                              <Field
                                name={`clients.${idx}.birthDate`}
                                type="date"
                                className="w-full border border-light-gray rounded-sm p-[10px] placeholder:text-[#72787E] placeholder:text-sm placeholder:font-normal"
                              />
                              {(() => {
                                const displayAge = calculateAgeDisplay(values.clients?.[idx]?.birthDate);
                                return displayAge !== null ? (
                                  <p className="text-xs text-gray-500 mt-1">Age: {displayAge}</p>
                                ) : null;
                              })()}
                            </div>

                            {/* Address */}
                            <div className="col-span-2">
                              <label className="font-bold text-sm text-light-black">Address</label>
                              <GoogleAddressInput
                                value={values.clients[idx].address}
                                placeholder="Enter client address"
                                onChange={(val) => setFieldValue(`clients.${idx}.address`, val)}
                                onLocationSelect={(loc) => {
                                  setFieldValue(`clients.${idx}.latitude`, loc.lat);
                                  setFieldValue(`clients.${idx}.longitude`, loc.lng);
                                }}
                              />
                            </div>

                            {/* Apartment / Unit No. */}
                            <div>
                              <label className="font-bold text-sm text-light-black">Apartment / Unit No.</label>
                              <Field
                                name={`clients.${idx}.apartmentUnit`}
                                type="text"
                                placeholder="e.g. Apt 4B, Unit 12"
                                className="w-full border border-light-gray rounded-sm p-[10px] placeholder:text-[#72787E] placeholder:text-sm placeholder:font-normal"
                              />
                            </div>

                            {/* Start Date */}
                            <div>
                              <label className="font-bold text-sm text-light-black">Service Start Date</label>
                              <Field
                                name={`clients.${idx}.startDate`}
                                type="date"
                                className="w-full border border-light-gray rounded-sm p-[10px] placeholder:text-[#72787E] placeholder:text-sm placeholder:font-normal"
                              />
                            </div>

                            {/* Client Info */}
                            <div className="col-span-3">
                              <label className="font-bold text-sm text-light-black">Client Info</label>
                              <Field
                                as="textarea"
                                name={`clients.${idx}.clientInfo`}
                                placeholder="Write down any risk or safety plan required for the plan"
                                className="w-full border border-light-gray rounded-sm p-[10px] placeholder:text-[#72787E] placeholder:text-sm placeholder:font-normal h-50"
                              />
                            </div>

                            {/* CFS Status */}
                            <div className="relative">
                              <label className="font-bold text-sm text-light-black">CFS Status</label>
                              <Field
                                as="select"
                                name={`clients.${idx}.cfsStatus`}
                                className={`w-full border rounded-sm p-[10px] appearance-none pr-10 ${values.clients[idx]?.cfsStatus === "" ? "text-[#72787E] font-normal text-sm" : "text-light-black"} border-light-gray`}
                              >
                                <option value="">Select CFS status</option>
                                <option value="CAG">CAG</option>
                                <option value="ICO">ICO</option>
                                <option value="TGO">TGO</option>
                                <option value="PGO">PGO</option>
                                <option value="SFP">SFP</option>
                              </Field>
                              <span className="absolute right-3 top-[64%] -translate-y-1/2 pointer-events-none">
                                <FaChevronDown className="text-light-green w-4 h-4" />
                              </span>
                            </div>

                            {/* DFNA Number */}
                            <div>
                              <label className="font-bold text-sm text-light-black">DFNA Number</label>
                              <Field
                                name={`clients.${idx}.dfnaNumber`}
                                type="text"
                                placeholder="Enter DFNA number"
                                className="w-full border border-light-gray rounded-sm p-[10px] placeholder:text-[#72787E] placeholder:text-sm placeholder:font-normal"
                              />
                            </div>

                            {/* Treaty # */}
                            <div>
                              <label className="font-bold text-sm text-light-black">Treaty #</label>
                              <Field
                                name={`clients.${idx}.treatyNumber`}
                                type="text"
                                placeholder="Enter treaty number"
                                className="w-full border border-light-gray rounded-sm p-[10px] placeholder:text-[#72787E] placeholder:text-sm placeholder:font-normal"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    }}
                  </FieldArray>
                </div>

                {/* Case Worker Information */}
                {isCaseWorker && (
                  <div>
                    <h3 className="font-bold text-[24px] text-light-black">
                      Case Worker Information
                    </h3>
                    <div className="grid grid-cols-3 gap-16 gap-y-4 bg-white p-4 border border-light-gray w-full rounded">
                      <div>
                        <label className="font-bold text-sm leading-5 tracking-normal text-light-black">
                          Name
                        </label>
                        <Field
                          name="caseworkerName"
                          type="text"
                          placeholder="Please enter the name of case worker "
                          className={`w-full border rounded-sm p-[10px] placeholder:text-[#72787E] placeholder:text-sm placeholder:font-normal ${touched.caseworkerName && errors.caseworkerName
                            ? "border-red-500"
                            : "border-light-gray"
                            }`}
                        />
                        <ErrorMessage
                          name="caseworkerName"
                          component="div"
                          className="text-red-500 text-xs mt-1"
                        />
                      </div>
                      <div>
                        <label className="font-bold text-sm leading-5 tracking-normal text-light-black">
                          Name of Agency/Organisation
                        </label>
                        <Field
                          name="caseworkerAgencyName"
                          type="text"
                          placeholder="Please enter the name of agency/organisation"
                          className={`w-full border rounded-sm p-[10px] placeholder:text-[#72787E] placeholder:text-sm placeholder:font-normal ${touched.caseworkerAgencyName && errors.caseworkerAgencyName
                            ? "border-red-500"
                            : "border-light-gray"
                            }`}
                        />
                        <ErrorMessage
                          name="caseworkerAgencyName"
                          component="div"
                          className="text-red-500 text-xs mt-1"
                        />
                      </div>
                      <div>
                        <label className="font-bold text-sm leading-5 tracking-normal text-light-black">
                          Phone Number
                        </label>
                        <Field
                          name="caseworkerPhone"
                          type="text"
                          placeholder="Please enter the phone number"
                          className={`w-full border rounded-sm p-[10px] placeholder:text-[#72787E] placeholder:text-sm placeholder:font-normal ${touched.caseworkerPhone &&
                            errors.caseworkerPhone
                            ? "border-red-500"
                            : "border-light-gray"
                            }`}
                        />
                        <ErrorMessage
                          name="caseworkerPhone"
                          component="div"
                          className="text-red-500 text-xs mt-1"
                        />
                      </div>
                      <div>
                        <label className="font-bold text-sm leading-5 tracking-normal text-light-black">
                          E-mail
                        </label>
                        <Field
                          name="caseworkerEmail"
                          type="text"
                          placeholder="Please enter the e-mail of case worker"
                          className={`w-full border rounded-sm p-[10px] placeholder:text-[#72787E] placeholder:text-sm placeholder:font-normal ${touched.caseworkerEmail &&
                            errors.caseworkerEmail
                            ? "border-red-500"
                            : "border-light-gray"
                            }`}
                        />
                        <ErrorMessage
                          name="caseworkerEmail"
                          component="div"
                          className="text-red-500 text-xs mt-1"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Intake Worker Information (prefilled from user) */}
                {isCaseWorker && (
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-bold text-[24px] text-light-black">
                        Intake Worker Information
                      </h3>
                      <button
                        type="button"
                        onClick={() => setShowInviteModal(true)}
                        className="bg-dark-green text-white px-4 py-2 rounded-md text-sm mb-1 cursor-pointer"
                      >
                        + Add Intake Worker
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-16 gap-y-4 bg-white p-4 border border-light-gray w-full rounded">
                      <div>
                        <label className="font-bold text-sm leading-5 tracking-normal text-light-black">
                          Name
                        </label>
                        <Field
                          name="intakeworkerName"
                          type="text"
                          placeholder="Please enter the name of intake worker "


                          className={`w-full border rounded-sm p-[10px] placeholder:text-[#72787E] placeholder:text-sm placeholder:font-normal border-light-gray`}
                        />
                      </div>
                      <div>
                        <label className="font-bold text-sm leading-5 tracking-normal text-light-black">
                          Name of Agency/Organisation
                        </label>
                        <Field
                          name="agencyName"
                          type="text"
                          placeholder="Please enter the name of agency/organisation"


                          className={`w-full border rounded-sm p-[10px] placeholder:text-[#72787E] placeholder:text-sm placeholder:font-normal border-light-gray`}
                        />
                      </div>
                      <div>
                        <label className="font-bold text-sm leading-5 tracking-normal text-light-black">
                          Phone Number
                        </label>
                        <Field
                          name="intakeworkerPhone"
                          type="text"
                          placeholder="Please enter the phone number"


                          className={`w-full border rounded-sm p-[10px] placeholder:text-[#72787E] placeholder:text-sm placeholder:font-normal border-light-gray`}
                        />
                      </div>
                      <div>
                        <label className="font-bold text-sm leading-5 tracking-normal text-light-black">
                          E-mail
                        </label>
                        <Field
                          name="intakeworkerEmail"
                          type="text"
                          placeholder="Please enter the e-mail of intake worker"

                          className={`w-full border rounded-sm p-[10px] placeholder:text-[#72787E] placeholder:text-sm placeholder:font-normal border-light-gray`}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Parent Info Section */}
                <div className="">
                  <div className="flex justify-between items-center ">
                    <h3 className="font-bold text-[24px] text-light-black">
                      Parent Info
                    </h3>
                    <button
                      type="button"
                      onClick={() => {
                        const last = values.parentInfoList?.[values.parentInfoList.length - 1] || {
                          clientName: "", parentName: "", relationShip: "", parentPhone: "", parentEmail: "", parentAddress: "",
                        };
                        const newList = [...values.parentInfoList, { ...last, clientName: "" }];
                        setFieldValue("parentInfoList", newList);
                        setActiveParentIdx(newList.length - 1);
                      }}
                      className="bg-dark-green text-white px-4 py-2 rounded-md text-sm mb-1"
                    >
                      + Add Parent Info
                    </button>
                  </div>

                  <FieldArray name="parentInfoList">
                    {({ remove }) => {
                      const total = values.parentInfoList.length;
                      if (total === 0) return null;
                      const idx = Math.min(activeParentIdx, total - 1);
                      return (
                        <div className="bg-white p-4 border border-light-gray rounded w-full">
                          {/* Slider nav */}
                          <div className="flex justify-between items-center mb-3">
                            <div className="flex items-center gap-2">
                              <button type="button" onClick={() => setActiveParentIdx(i => Math.max(0, i - 1))} disabled={idx === 0} className="px-2 py-1 border rounded text-sm disabled:opacity-40">‹</button>
                              <span className="font-semibold text-base text-light-black">Parent {idx + 1} of {total}</span>
                              <button type="button" onClick={() => setActiveParentIdx(i => Math.min(total - 1, i + 1))} disabled={idx === total - 1} className="px-2 py-1 border rounded text-sm disabled:opacity-40">›</button>
                            </div>
                            {total > 1 && (
                              <button type="button" onClick={() => { remove(idx); setActiveParentIdx(i => Math.min(total - 2, Math.max(0, i))); }} className="text-red-500 text-sm font-semibold">Remove</button>
                            )}
                          </div>

                          <div className="grid grid-cols-3 gap-8 gap-y-4">
                            <div className="relative">
                              <label className="font-bold text-sm text-light-black">Client Name</label>
                              {(() => {
                                const usedByOthers = values.parentInfoList.filter((_, i) => i !== idx).map(p => p.clientName).filter(Boolean);
                                return (
                                  <Field as="select" name={`parentInfoList.${idx}.clientName`} className="w-full border border-light-gray rounded-sm p-[10px] text-sm h-[42px] mt-1">
                                    <option value="">Select Client</option>
                                    {values.clients.filter(c => c.fullName).map((c, i) => (
                                      <option key={i} value={c.fullName} disabled={usedByOthers.includes(c.fullName)}>
                                        {c.fullName}{usedByOthers.includes(c.fullName) ? " (already added)" : ""}
                                      </option>
                                    ))}
                                  </Field>
                                );
                              })()}
                            </div>

                            <div>
                              <label className="font-bold text-sm text-light-black">Parent Name</label>
                              <Field name={`parentInfoList.${idx}.parentName`} type="text" placeholder="Enter parent name" className="w-full border border-light-gray rounded-sm p-[10px] text-sm h-[42px]" />
                            </div>

                            <div>
                              <label className="font-bold text-sm text-light-black">Relationship</label>
                              <Field name={`parentInfoList.${idx}.relationShip`} type="text" placeholder="e.g. Father, Mother" className="w-full border border-light-gray rounded-sm p-[10px] text-sm h-[42px]" />
                            </div>

                            <div>
                              <label className="font-bold text-sm text-light-black">Phone</label>
                              <Field name={`parentInfoList.${idx}.parentPhone`} type="text" placeholder="Enter Parent's phone number" className="w-full border border-light-gray rounded-sm p-[10px] text-sm h-[42px]" />
                            </div>

                            <div>
                              <label className="font-bold text-sm text-light-black">Email</label>
                              <Field name={`parentInfoList.${idx}.parentEmail`} type="email" placeholder="Enter Parent's email" className="w-full border border-light-gray rounded-sm p-[10px] text-sm h-[42px]" />
                            </div>

                            <div className="col-span-3">
                              <label className="font-bold text-sm text-light-black">Address</label>
                              <GoogleAddressInput
                                value={values.parentInfoList[idx].parentAddress}
                                placeholder="Enter address"
                                onChange={(val) => setFieldValue(`parentInfoList.${idx}.parentAddress`, val)}
                                onLocationSelect={(loc) => {
                                  setFieldValue(`parentInfoList.${idx}.latitude`, loc.lat);
                                  setFieldValue(`parentInfoList.${idx}.longitude`, loc.lng);
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    }}
                  </FieldArray>
                </div>

                {/* Billing */}
                <div>
                  <h3 className="font-bold text-[24px] text-light-black">
                    Billing Information
                  </h3>
                  <div className="grid grid-cols-2 gap-16 gap-y-4 bg-white p-4 border border-light-gray w-full rounded">
                    <div>
                      <label className="font-bold text-sm leading-5 tracking-normal text-light-black">
                        Invoice E-mail
                      </label>
                      <Field
                        name="billingInfo.invoiceEmail"
                        type="email"
                        placeholder="Please enter the email for invoices"
                        className={`w-full border rounded-sm p-[10px] placeholder:text-[#72787E] placeholder:text-sm placeholder:font-normal ${touched.billingInfo?.invoiceEmail &&
                          errors.billingInfo?.invoiceEmail
                          ? "border-red-500"
                          : "border-light-gray"
                          }`}
                      />
                      <ErrorMessage
                        name="billingInfo.invoiceEmail"
                        component="div"
                        className="text-red-500 text-xs mt-1"
                      />
                    </div>
                  </div>
                </div>

                {/* Upload Documents */}
                <div>
                  <h3 className="font-bold text-[24px] text-light-black">
                    Upload Documents
                  </h3>
                  <div className="grid grid-cols-2 gap-16  bg-white p-4 border border-light-gray w-full rounded">
                    <div>
                      <label
                        htmlFor="uploadDocs"
                        className="font-bold text-sm leading-5 tracking-normal text-light-black"
                      >
                        Upload Documents
                      </label>

                      <div className="relative w-full">
                        <input
                          type="text"
                          name="uploadDocs"
                          value={
                            values.uploadDocs.length > 0
                              ? `${values.uploadDocs.length} file(s) selected`
                              : ""
                          }
                          readOnly
                          placeholder="Please upload documents regarding the client"
                          className={`w-full border rounded-sm p-[10px] placeholder:text-[#72787E] placeholder:text-sm placeholder:font-normal pr-10 ${touched.uploadDocs && errors.uploadDocs
                            ? "border-red-500"
                            : "border-light-gray"
                            }`}
                        />

                        <input
                          type="file"
                          ref={fileInputRef}
                          style={{ display: "none" }}
                          multiple
                          onChange={(event) => {
                            const files = Array.from(event.target.files || []);
                            const updatedFiles = [
                              ...(values.uploadDocs || []),
                              ...files,
                            ];
                            setFieldValue("uploadDocs", updatedFiles);
                          }}
                        />

                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-600 hover:text-blue-600"
                        >
                          <Upload size={20} />
                        </button>
                      </div>

                      <ErrorMessage
                        name="uploadDocs"
                        component="div"
                        className="text-red-500 text-xs mt-1"
                      />

                      {values.uploadDocs.length > 0 && (
                        <div className="mt-3 border rounded p-2 bg-gray-50">
                          <h4 className="text-sm font-semibold mb-2">
                            Selected Files:
                          </h4>
                          <ul className="space-y-1">
                            {values.uploadDocs.map((file, index) => {
                              // file can be a File object (new upload) or a URL string (loaded from Firestore)
                              const isUrl = typeof file === "string";
                              const fileName = isUrl
                                ? decodeURIComponent(file.split("/").pop().split("?")[0]).replace(/^intake_docs\/\d+_/, "")
                                : (file.name || `Document ${index + 1}`);
                              return (
                                <li
                                  key={index}
                                  className="flex justify-between items-center bg-white border p-2 rounded shadow-sm"
                                >
                                  {isUrl ? (
                                    <a
                                      href={file}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-sm text-blue-600 hover:underline truncate max-w-[70%]"
                                    >
                                      📄 {fileName}
                                    </a>
                                  ) : (
                                    <span className="text-sm truncate max-w-[70%]">{fileName}</span>
                                  )}
                                  <button
                                    type="button"
                                    className="text-red-500 hover:text-red-700"
                                    onClick={() => {
                                      const updatedFiles = values.uploadDocs.filter((_, i) => i !== index);
                                      setFieldValue("uploadDocs", updatedFiles);
                                    }}
                                  >
                                    <X size={18} />
                                  </button>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Medical Info */}
                <div className="">
                  <div className="flex justify-between items-center ">
                    <h3 className="font-bold text-[24px] text-light-black">
                      Medical Info
                    </h3>
                    {/* Apply same info to multiple clients at once */}
                    <button
                      type="button"
                      onClick={() => {
                        const last = values.medicalInfoList?.[values.medicalInfoList.length - 1] || {
                          clientName: "", healthCareNo: "", diagnosis: "", diagnosisType: "", medicalConcern: "", mobilityAssistance: "", mobilityInfo: "", communicationAid: "", communicationInfo: ""
                        };
                        const newList = [...values.medicalInfoList, { ...last, clientName: "" }];
                        setFieldValue("medicalInfoList", newList);
                        setActiveMedicalIdx(newList.length - 1);
                      }}
                      className="bg-dark-green text-white px-4 py-2 rounded-md text-sm mb-1"
                    >
                      + Add Medical Info
                    </button>
                  </div>

                  <FieldArray name="medicalInfoList">
                    {({ remove }) => {
                      const total = values.medicalInfoList.length;
                      if (total === 0) return null;
                      const idx = Math.min(activeMedicalIdx, total - 1);
                      return (
                        <div className="bg-white p-4 border border-light-gray rounded w-full">
                          {/* Slider nav */}
                          <div className="flex justify-between items-center mb-3">
                            <div className="flex items-center gap-2">
                              <button type="button" onClick={() => setActiveMedicalIdx(i => Math.max(0, i - 1))} disabled={idx === 0} className="px-2 py-1 border rounded text-sm disabled:opacity-40">‹</button>
                              <span className="font-semibold text-base text-light-black">Medical Info {idx + 1} of {total}</span>
                              <button type="button" onClick={() => setActiveMedicalIdx(i => Math.min(total - 1, i + 1))} disabled={idx === total - 1} className="px-2 py-1 border rounded text-sm disabled:opacity-40">›</button>
                            </div>
                            {total > 1 && (
                              <button type="button" onClick={() => { remove(idx); setActiveMedicalIdx(i => Math.min(total - 2, Math.max(0, i))); }} className="text-red-500 text-sm font-semibold">Remove</button>
                            )}
                          </div>

                          <div className="grid grid-cols-3 gap-8 gap-y-4">
                            <div className="relative col-span-3">
                              <label className="font-bold text-sm text-light-black">Client Name</label>
                              {(() => {
                                const usedByOthers = values.medicalInfoList.filter((_, i) => i !== idx).map(m => m.clientName).filter(Boolean);
                                return (
                                  <Field as="select" name={`medicalInfoList.${idx}.clientName`} className="w-full border border-light-gray rounded-sm p-[10px] text-sm h-[42px] mt-1">
                                    <option value="">Select Client</option>
                                    {values.clients.filter(c => c.fullName).map((c, i) => (
                                      <option key={i} value={c.fullName} disabled={usedByOthers.includes(c.fullName)}>
                                        {c.fullName}{usedByOthers.includes(c.fullName) ? " (already added)" : ""}
                                      </option>
                                    ))}
                                  </Field>
                                );
                              })()}
                            </div>

                            <div>
                              <label className="font-bold text-sm text-light-black">Health Care No.</label>
                              <Field name={`medicalInfoList.${idx}.healthCareNo`} type="text" placeholder="Enter health care no" className="w-full border border-light-gray rounded-sm p-[10px] text-sm h-[42px]" />
                            </div>

                            <div>
                              <label className="font-bold text-sm text-light-black">Diagnosis</label>
                              <Field name={`medicalInfoList.${idx}.diagnosis`} type="text" placeholder="Enter diagnosis" className="w-full border border-light-gray rounded-sm p-[10px] text-sm h-[42px]" />
                            </div>

                            <div>
                              <label className="font-bold text-sm text-light-black">Diagnosis Type</label>
                              <Field name={`medicalInfoList.${idx}.diagnosisType`} type="text" placeholder="Enter Type of Diagnosis" className="w-full border border-light-gray rounded-sm p-[10px] text-sm h-[42px]" />
                            </div>

                            <div className="col-span-3">
                              <label className="font-bold text-sm text-light-black">Medical Concern</label>
                              <Field as="textarea" name={`medicalInfoList.${idx}.medicalConcern`} placeholder="Enter Medical concerns" className="w-full border border-light-gray rounded-sm p-[10px] text-sm h-[42px]" />
                            </div>

                            <div>
                              <label className="font-bold text-sm text-light-black">Mobility Assistance</label>
                              <Field name={`medicalInfoList.${idx}.mobilityAssistance`} type="text" placeholder="Yes/No" className="w-full border border-light-gray rounded-sm p-[10px] text-sm h-[42px]" />
                            </div>

                            <div>
                              <label className="font-bold text-sm text-light-black">Mobility Info</label>
                              <Field name={`medicalInfoList.${idx}.mobilityInfo`} type="text" placeholder="Enter details" className="w-full border border-light-gray rounded-sm p-[10px] text-sm h-[42px]" />
                            </div>

                            <div>
                              <label className="font-bold text-sm text-light-black">Communication Aid</label>
                              <Field name={`medicalInfoList.${idx}.communicationAid`} type="text" placeholder="Yes/No" className="w-full border border-light-gray rounded-sm p-[10px] text-sm h-[42px]" />
                            </div>

                            <div className="col-span-3">
                              <label className="font-bold text-sm text-light-black">Communication Info</label>
                              <Field as="textarea" name={`medicalInfoList.${idx}.communicationInfo`} placeholder="Enter communication details" className="w-full border border-light-gray rounded-sm p-[10px] text-sm h-[42px]" />
                            </div>
                          </div>
                        </div>
                      );
                    }}
                  </FieldArray>
                </div>

                {/* Transportation Info */}
                {showTransportationSection && (
                  <div className="">
                    <div className="flex justify-between items-center ">
                      <h3 className="font-bold text-[24px] text-light-black">
                        Transportation Info
                      </h3>
                      <button
                        type="button"
                        onClick={() => {
                          const last = values.transportationInfoList?.[values.transportationInfoList.length - 1] || {
                            clientName: "", pickupAddress: "", dropoffAddress: "", pickupTime: "", dropOffTime: "", transportationOverview: "", carSeatType: "", carSeatRequired: "",
                          };
                          const newList = [...values.transportationInfoList, { ...last, clientName: "" }];
                          setFieldValue("transportationInfoList", newList);
                          setActiveTransportIdx(newList.length - 1);
                        }}
                        className="bg-dark-green text-white px-4 py-2 rounded-md text-sm mb-1"
                      >
                        + Add Transportation Info
                      </button>
                    </div>

                    <FieldArray name="transportationInfoList">
                      {({ remove }) => {
                        const total = values.transportationInfoList.length;
                        if (total === 0) return null;
                        const idx = Math.min(activeTransportIdx, total - 1);
                        const trans = values.transportationInfoList[idx];
                        return (
                          <div className="bg-white p-4 border border-light-gray rounded w-full">
                            {/* Slider nav */}
                            <div className="flex justify-between items-center mb-3">
                              <div className="flex items-center gap-2">
                                <button type="button" onClick={() => setActiveTransportIdx(i => Math.max(0, i - 1))} disabled={idx === 0} className="px-2 py-1 border rounded text-sm disabled:opacity-40">‹</button>
                                <span className="font-semibold text-base text-light-black">Transportation {idx + 1} of {total}</span>
                                <button type="button" onClick={() => setActiveTransportIdx(i => Math.min(total - 1, i + 1))} disabled={idx === total - 1} className="px-2 py-1 border rounded text-sm disabled:opacity-40">›</button>
                              </div>
                              {total > 1 && (
                                <button type="button" onClick={() => { remove(idx); setActiveTransportIdx(i => Math.min(total - 2, Math.max(0, i))); }} className="text-red-500 text-sm font-semibold">Remove</button>
                              )}
                            </div>

                            <div className="grid grid-cols-3 gap-8 gap-y-4">
                              {/* Client Name — simple select */}
                              <div className="relative col-span-3">
                                <label className="font-bold text-sm text-light-black">Client Name</label>
                                {(() => {
                                  const usedByOthers = values.transportationInfoList.filter((_, i) => i !== idx).map(t => t.clientName).filter(Boolean);
                                  return (
                                    <select
                                      value={trans.clientName || ""}
                                      className="w-full border border-light-gray rounded-sm p-[10px] text-sm h-[42px] mt-1"
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        setFieldValue(`transportationInfoList.${idx}.clientName`, val);
                                        const selected = values.clients.find(c => c.fullName === val);
                                        if (selected?.birthDate) {
                                          const seat = deriveCarSeatFromAge(calculateAgeYears(selected.birthDate));
                                          setFieldValue(`transportationInfoList.${idx}.carSeatRequired`, seat.required);
                                          setFieldValue(`transportationInfoList.${idx}.carSeatType`, seat.type);
                                        }
                                      }}
                                    >
                                      <option value="">Select Client</option>
                                      {values.clients.filter(c => c.fullName).map((c, i) => (
                                        <option key={i} value={c.fullName} disabled={usedByOthers.includes(c.fullName)}>
                                          {c.fullName}{usedByOthers.includes(c.fullName) ? " (already added)" : ""}
                                        </option>
                                      ))}
                                    </select>
                                  );
                                })()}
                              </div>

                              <div>
                                <label className="font-bold text-sm text-light-black">Pickup Address</label>
                                <GoogleAddressInput
                                  value={trans.pickupAddress}
                                  placeholder="Enter pickup address"
                                  onChange={(val) => setFieldValue(`transportationInfoList.${idx}.pickupAddress`, val)}
                                />
                              </div>

                              <div>
                                <label className="font-bold text-sm text-light-black">Dropoff Address</label>
                                <GoogleAddressInput
                                  value={trans.dropoffAddress}
                                  placeholder="Enter dropoff address"
                                  onChange={(val) => setFieldValue(`transportationInfoList.${idx}.dropoffAddress`, val)}
                                />
                              </div>

                              <div>
                                <label className="font-bold text-sm text-light-black">Pickup Time</label>
                                <CustomTimePicker value={trans.pickupTime || ""} onChange={(val) => setFieldValue(`transportationInfoList.${idx}.pickupTime`, val)} />
                              </div>

                              <div>
                                <label className="font-bold text-sm text-light-black">Dropoff Time</label>
                                <CustomTimePicker value={trans.dropOffTime || ""} onChange={(val) => setFieldValue(`transportationInfoList.${idx}.dropOffTime`, val)} />
                              </div>

                              <div>
                                <label className="font-bold text-sm text-light-black">Car Seat Required</label>
                                <Field
                                  as="select"
                                  name={`transportationInfoList.${idx}.carSeatRequired`}
                                  value={trans.carSeatType && trans.carSeatType !== "" ? "yes" : trans.carSeatRequired}
                                  onChange={(e) => {
                                    setFieldValue(`transportationInfoList.${idx}.carSeatRequired`, e.target.value);
                                    if (e.target.value === "no") setFieldValue(`transportationInfoList.${idx}.carSeatType`, "");
                                  }}
                                  className="w-full border border-light-gray rounded-sm p-[10px] text-sm h-[42px]"
                                >
                                  <option value="">Select</option>
                                  <option value="yes">Yes</option>
                                  <option value="no">No</option>
                                </Field>
                              </div>

                              {trans.carSeatRequired === "yes" && (
                                <div>
                                  <label className="font-bold text-sm text-light-black">Car Seat Type</label>
                                  <Field as="select" name={`transportationInfoList.${idx}.carSeatType`} value={trans.carSeatType} className="w-full border border-light-gray rounded-sm p-[10px] text-sm h-[42px]">
                                    <option value="">Select seat type</option>
                                    <option value="Rear-facing seat">Rear-facing seat</option>
                                    <option value="Forward-facing seat">Forward-facing seat</option>
                                    <option value="Booster seat">Booster seat</option>
                                    <option value="Seat belt only">Seat belt only</option>
                                  </Field>
                                </div>
                              )}

                              <div className="col-span-3">
                                <label className="font-bold text-sm text-light-black">Transportation Overview</label>
                                <Field as="textarea" name={`transportationInfoList.${idx}.transportationOverview`} placeholder="Add transportation Overview" className="w-full border border-light-gray rounded-sm p-[10px] placeholder:text-sm" />
                              </div>
                            </div>
                          </div>
                        );
                      }}
                    </FieldArray>
                  </div>
                )}

                {/* Supervised Visitations */}
                {showVisitationSection && (
                  <div className="">
                    <div className="flex justify-between items-center ">
                      <h3 className="font-bold text-[24px] text-light-black">
                        Supervised Visitations
                      </h3>
                      <button
                        type="button"
                        onClick={() => {
                          const last = values.supervisedVisitations?.[values.supervisedVisitations.length - 1] || {
                            clientName: "", visitStartTime: "", visitEndTime: "", visitDuration: "", visitPurpose: "", visitAddress: "", visitOverview: "",
                          };
                          const newList = [...values.supervisedVisitations, { ...last, clientName: "" }];
                          setFieldValue("supervisedVisitations", newList);
                          setActiveSupervisedIdx(newList.length - 1);
                        }}
                        className="bg-dark-green text-white px-4 py-2 rounded-md text-sm mb-1"
                      >
                        + Add Supervised Visitation
                      </button>
                    </div>

                    <FieldArray name="supervisedVisitations">
                      {({ remove }) => {
                        const total = values.supervisedVisitations.length;
                        if (total === 0) return null;
                        const idx = Math.min(activeSupervisedIdx, total - 1);
                        return (
                          <div className="bg-white p-4 border border-light-gray rounded w-full">
                            {/* Slider nav */}
                            <div className="flex justify-between items-center mb-3">
                              <div className="flex items-center gap-2">
                                <button type="button" onClick={() => setActiveSupervisedIdx(i => Math.max(0, i - 1))} disabled={idx === 0} className="px-2 py-1 border rounded text-sm disabled:opacity-40">‹</button>
                                <span className="font-semibold text-base text-light-black">Supervised Visitation {idx + 1} of {total}</span>
                                <button type="button" onClick={() => setActiveSupervisedIdx(i => Math.min(total - 1, i + 1))} disabled={idx === total - 1} className="px-2 py-1 border rounded text-sm disabled:opacity-40">›</button>
                              </div>
                              {total > 1 && (
                                <button type="button" onClick={() => { remove(idx); setActiveSupervisedIdx(i => Math.min(total - 2, Math.max(0, i))); }} className="text-red-500 text-sm font-semibold">Remove</button>
                              )}
                            </div>

                            <div className="grid grid-cols-3 gap-8 gap-y-4">
                              <div className="relative col-span-3">
                                <label className="font-bold text-sm text-light-black">Client Name</label>
                                {(() => {
                                  const usedByOthers = values.supervisedVisitations.filter((_, i) => i !== idx).map(v => v.clientName).filter(Boolean);
                                  return (
                                    <Field as="select" name={`supervisedVisitations.${idx}.clientName`} className="w-full border border-light-gray rounded-sm p-[10px] text-sm h-[42px] mt-1">
                                      <option value="">Select Client</option>
                                      {values.clients.filter(c => c.fullName).map((c, i) => (
                                        <option key={i} value={c.fullName} disabled={usedByOthers.includes(c.fullName)}>
                                          {c.fullName}{usedByOthers.includes(c.fullName) ? " (already added)" : ""}
                                        </option>
                                      ))}
                                    </Field>
                                  );
                                })()}
                              </div>

                              <div>
                                <label className="font-bold text-sm text-light-black">Visit Start Time</label>
                                <CustomTimePicker value={values.supervisedVisitations[idx]?.visitStartTime || ""} onChange={(val) => setFieldValue(`supervisedVisitations.${idx}.visitStartTime`, val)} />
                              </div>

                              <div>
                                <label className="font-bold text-sm text-light-black">Visit End Time</label>
                                <CustomTimePicker value={values.supervisedVisitations[idx]?.visitEndTime || ""} onChange={(val) => setFieldValue(`supervisedVisitations.${idx}.visitEndTime`, val)} />
                              </div>

                              <div>
                                <label className="font-bold text-sm text-light-black">Visit Duration</label>
                                <Field name={`supervisedVisitations.${idx}.visitDuration`} type="text" placeholder="Enter visit duration" className="w-full border border-light-gray rounded-sm p-[10px] text-sm h-[42px]" />
                              </div>

                              <div>
                                <label className="font-bold text-sm text-light-black">Purpose of Visit</label>
                                <Field name={`supervisedVisitations.${idx}.visitPurpose`} type="text" placeholder="Enter purpose of visit" className="w-full border border-light-gray rounded-sm p-[10px] text-sm h-[42px]" />
                              </div>

                              <div>
                                <label className="font-bold text-sm text-light-black">Visit Address</label>
                                <GoogleAddressInput value={values.supervisedVisitations[idx].visitAddress} placeholder="Enter visit address" onChange={(val) => setFieldValue(`supervisedVisitations.${idx}.visitAddress`, val)} />
                              </div>

                              <div className="col-span-3">
                                <label className="font-bold text-sm text-light-black">Visit Overview</label>
                                <Field as="textarea" name={`supervisedVisitations.${idx}.visitOverview`} placeholder="Write down the visit overview" className="w-full border border-light-gray rounded-sm p-[10px] text-sm h-[42px]" />
                              </div>
                            </div>
                          </div>
                        );
                      }}
                    </FieldArray>
                  </div>
                )}

                {/* Combined Transportation & Supervised Visitation Info */}
                {showCombinedSection && (
                  <div className="">
                    <div className="flex justify-between items-center ">
                      <h3 className="font-bold text-[24px] text-light-black">
                        Supervised Visitation & Transportation Info
                      </h3>
                      <button
                        type="button"
                        onClick={() => {
                          const lastT = values.transportationInfoList?.[values.transportationInfoList.length - 1] || { clientName: "", pickupAddress: "", dropoffAddress: "", pickupTime: "", dropOffTime: "", transportationOverview: "", carSeatType: "", carSeatRequired: "" };
                          const lastV = values.supervisedVisitations?.[values.supervisedVisitations.length - 1] || { clientName: "", visitStartTime: "", visitEndTime: "", visitDuration: "", visitPurpose: "", visitAddress: "", visitOverview: "" };
                          const newTransList = [...values.transportationInfoList, { ...lastT, clientName: "" }];
                          const newVisitList = [...values.supervisedVisitations, { ...lastV, clientName: "" }];
                          setFieldValue("transportationInfoList", newTransList);
                          setFieldValue("supervisedVisitations", newVisitList);
                          setActiveTransportIdx(newTransList.length - 1);
                        }}
                        className="bg-dark-green text-white px-4 py-2 rounded-md text-sm mb-1"
                      >
                        + Add Combined Info
                      </button>
                    </div>

                    <FieldArray name="transportationInfoList">
                      {({ remove }) => {
                        const total = values.transportationInfoList.length;
                        if (total === 0) return null;
                        const idx = Math.min(activeTransportIdx, total - 1);
                        return (
                          <div className="bg-white p-4 border border-light-gray rounded w-full">
                            {/* Slider nav */}
                            <div className="flex justify-between items-center mb-3">
                              <div className="flex items-center gap-2">
                                <button type="button" onClick={() => setActiveTransportIdx(i => Math.max(0, i - 1))} disabled={idx === 0} className="px-2 py-1 border rounded text-sm disabled:opacity-40">‹</button>
                                <span className="font-semibold text-base text-light-black">Combined Info {idx + 1} of {total}</span>
                                <button type="button" onClick={() => setActiveTransportIdx(i => Math.min(total - 1, i + 1))} disabled={idx === total - 1} className="px-2 py-1 border rounded text-sm disabled:opacity-40">›</button>
                              </div>
                              {total > 1 && (
                                <button type="button" onClick={() => {
                                  remove(idx);
                                  const newVisits = [...values.supervisedVisitations];
                                  newVisits.splice(idx, 1);
                                  setFieldValue("supervisedVisitations", newVisits);
                                  setActiveTransportIdx(i => Math.min(total - 2, Math.max(0, i)));
                                }} className="text-red-500 text-sm font-semibold">Remove</button>
                              )}
                            </div>

                            <div className="grid grid-cols-3 gap-8 gap-y-4">
                              <div className="relative col-span-3">
                                <label className="font-bold text-sm text-light-black">Client Name</label>
                                <select
                                  value={values.transportationInfoList[idx]?.clientName || ""}
                                  className="w-full border border-light-gray rounded-sm p-[10px] text-sm h-[42px] mt-1"
                                  onChange={(e) => {
                                    setFieldValue(`transportationInfoList.${idx}.clientName`, e.target.value);
                                    setFieldValue(`supervisedVisitations.${idx}.clientName`, e.target.value);
                                  }}
                                >
                                  <option value="">Select Client</option>
                                  {values.clients.filter(c => c.fullName).map((c, i) => (
                                    <option key={i} value={c.fullName}>{c.fullName}</option>
                                  ))}
                                </select>
                              </div>

                              {/* TRANS FIELDS */}
                              <div><label className="font-bold text-sm text-light-black">Pickup Address</label><GoogleAddressInput value={values.transportationInfoList[idx]?.pickupAddress || ""} placeholder="Enter pickup address" onChange={(val) => setFieldValue(`transportationInfoList.${idx}.pickupAddress`, val)} /></div>
                              <div><label className="font-bold text-sm text-light-black">Dropoff Address</label><GoogleAddressInput value={values.transportationInfoList[idx]?.dropoffAddress || ""} placeholder="Enter dropoff address" onChange={(val) => setFieldValue(`transportationInfoList.${idx}.dropoffAddress`, val)} /></div>
                              <div><label className="font-bold text-sm text-light-black">Pickup Time</label><CustomTimePicker value={values.transportationInfoList[idx]?.pickupTime || ""} onChange={(val) => setFieldValue(`transportationInfoList.${idx}.pickupTime`, val)} /></div>
                              <div><label className="font-bold text-sm text-light-black">Dropoff Time</label><CustomTimePicker value={values.transportationInfoList[idx]?.dropOffTime || ""} onChange={(val) => setFieldValue(`transportationInfoList.${idx}.dropOffTime`, val)} /></div>

                              <div className="col-span-1">
                                <label className="font-bold text-sm text-light-black">Car Seat Required</label>
                                <Field as="select" name={`transportationInfoList.${idx}.carSeatRequired`} className="w-full border border-light-gray rounded-sm p-[10px] text-sm h-[42px]"
                                  onChange={(e) => {
                                    setFieldValue(`transportationInfoList.${idx}.carSeatRequired`, e.target.value);
                                    if (e.target.value === "no") setFieldValue(`transportationInfoList.${idx}.carSeatType`, "");
                                  }}
                                >
                                  <option value="">Select</option><option value="yes">Yes</option><option value="no">No</option>
                                </Field>
                              </div>
                              {values.transportationInfoList[idx]?.carSeatRequired === "yes" && (
                                <div>
                                  <label className="font-bold text-sm text-light-black">Car Seat Type</label>
                                  <Field as="select" name={`transportationInfoList.${idx}.carSeatType`} className="w-full border border-light-gray rounded-sm p-[10px] text-sm h-[42px]">
                                    <option value="">Select seat type</option><option value="Rear-facing seat">Rear-facing seat</option><option value="Forward-facing seat">Forward-facing seat</option><option value="Booster seat">Booster seat</option><option value="Seat belt only">Seat belt only</option>
                                  </Field>
                                </div>
                              )}
                              <div className="col-span-3"><label className="font-bold text-sm text-light-black">Transportation Overview</label><Field as="textarea" name={`transportationInfoList.${idx}.transportationOverview`} placeholder="Add transportation Overview" className="w-full border border-light-gray rounded-sm p-[10px] text-sm h-[42px]" /></div>

                              {/* SUPERVISED VIS FIELDS */}
                              <div><label className="font-bold text-sm text-light-black">Visit Start Time</label><CustomTimePicker value={values.supervisedVisitations[idx]?.visitStartTime || ""} onChange={(val) => setFieldValue(`supervisedVisitations.${idx}.visitStartTime`, val)} /></div>
                              <div><label className="font-bold text-sm text-light-black">Visit End Time</label><CustomTimePicker value={values.supervisedVisitations[idx]?.visitEndTime || ""} onChange={(val) => setFieldValue(`supervisedVisitations.${idx}.visitEndTime`, val)} /></div>
                              <div><label className="font-bold text-sm text-light-black">Visit Duration</label><Field name={`supervisedVisitations.${idx}.visitDuration`} type="text" placeholder="Enter visit duration" className="w-full border border-light-gray rounded-sm p-[10px] text-sm h-[42px]" /></div>
                              <div><label className="font-bold text-sm text-light-black">Purpose of Visit</label><Field name={`supervisedVisitations.${idx}.visitPurpose`} type="text" placeholder="Enter purpose of visit" className="w-full border border-light-gray rounded-sm p-[10px] text-sm h-[42px]" /></div>
                              <div className="col-span-2"><label className="font-bold text-sm text-light-black">Visit Address</label><GoogleAddressInput value={values.supervisedVisitations[idx]?.visitAddress || ""} placeholder="Enter visit address" onChange={(val) => setFieldValue(`supervisedVisitations.${idx}.visitAddress`, val)} /></div>
                              <div className="col-span-3"><label className="font-bold text-sm text-light-black">Visit Overview</label><Field as="textarea" name={`supervisedVisitations.${idx}.visitOverview`} placeholder="Write down the visit overview" className="w-full border border-light-gray rounded-sm p-[10px] text-sm h-[42px]" /></div>
                            </div>
                          </div>
                        );
                      }}
                    </FieldArray>
                  </div>
                )}

                {/* Acknowledgement */}
                <div>
                  <h3 className="font-bold text-[24px] text-light-black">
                    Acknowledgement
                  </h3>
                  <div className="grid grid-cols-3 gap-16 gap-y-4 bg-white p-4 border border-light-gray w-full rounded">
                    <div>
                      <label className="font-bold text-sm leading-5 tracking-normal text-light-black">
                        {isCaseWorker ? "Worker Name" : "Parent/Guardian Name"}
                      </label>
                      <Field
                        name="workerInfo.workerName"
                        type="text"
                        placeholder="Enter the name of person filling out the form"
                        className="w-full border border-light-gray rounded-sm p-[10px] placeholder:text-sm"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-sm leading-5 tracking-normal text-light-black">
                        Date
                      </label>
                      <Field
                        name="workerInfo.date"
                        type="date"
                        placeholder="Please enter the current date(DD-MM-YYY)"
                        className="w-full border rounded-sm p-[10px] border-light-gray placeholder:text-sm"
                      />
                    </div>

                    <div className="col-span-3">
                      <label className="font-bold text-sm leading-5 tracking-normal text-light-black ">
                        {isCaseWorker
                          ? "Worker Digital Signature"
                          : "Parent/Guardian Digital Signature"}
                      </label>

                      <div className="mt-1">
                        <input
                          name="workerInfo.signature"
                          type="text"
                          value={values.workerInfo.signature}
                          onChange={(e) => {
                            // Allow only letters (a-z, A-Z) and spaces
                            const cleaned = e.target.value.replace(/[^a-zA-Z\s]/g, "");
                            setFieldValue("workerInfo.signature", cleaned);
                          }}
                          placeholder="Type your full name to sign"
                          className="w-full border border-light-gray rounded-sm p-[10px] text-sm"
                        />
                      </div>

                      {/* Live Signature Preview */}
                      <div className="mt-4 border border-dashed border-gray-300 rounded-md p-6 bg-gray-50 flex flex-col items-center justify-center min-h-[120px]">
                        {values.workerInfo.signature ? (
                          <span className="text-4xl text-blue-900" style={{ fontFamily: "'Dancing Script', cursive" }}>
                            {values.workerInfo.signature}
                          </span>
                        ) : (
                          <span className="text-gray-400 italic text-sm">
                            Signature will appear here...
                          </span>
                        )}
                      </div>

                      <ErrorMessage
                        name="workerInfo.signature"
                        component="div"
                        className="text-red-500 text-xs mt-1"
                      />
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="col-span-2 flex justify-center">
                  <button
                    type="submit"
                    className="bg-dark-green text-white px-6 py-2 rounded  cursor-pointer"
                  >
                    Submit Intake Form
                  </button>
                </div>
              </Form>
            );
          }}
        </Formik>
      </EditableProvider>

      {/* ADD INTAKE WORKER MODAL */}
      {showInviteModal && (
        <>
          <div
            className="fixed inset-0 z-50 transition-opacity"
            style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
            onClick={() => setShowInviteModal(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
            <div className="bg-white rounded-lg shadow-xl w-[500px] p-6 pointer-events-auto">
              {/* Header */}
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-xl text-light-black">Add Intake Worker</h3>
                  <p className="text-sm text-gray-500 mt-1">Enter email to generate registration link</p>
                </div>
                <button
                  onClick={() => setShowInviteModal(false)}
                  className="text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Body */}
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-semibold text-light-black">Email Address</label>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="worker@example.com"
                    className="border border-gray-300 rounded px-3 py-2 flex-1 focus:outline-none focus:border-dark-green text-light-black"
                  />
                </div>

                <div className="bg-green-50 border border-green-200 rounded p-3 text-sm text-green-800">
                  A unique registration link will be generated. The link will expire in 7 days.
                </div>
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowInviteModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50 font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (!inviteEmail) {
                      alert("Please enter an email address");
                      return;
                    }
                    setInviting(true);
                    const encodedEmail = encodeURIComponent(inviteEmail.trim().toLowerCase());
                    const actionCodeSettings = {
                      url: `${window.location.origin}/intake-form/login?email=${encodedEmail}`,
                      handleCodeInApp: true,
                    };
                    try {
                      await sendSignInLinkToEmail(auth, inviteEmail.trim().toLowerCase(), actionCodeSettings);
                      window.localStorage.setItem("emailForSignIn", inviteEmail.trim().toLowerCase());
                      alert(`Invitation link sent to ${inviteEmail}`);
                      setShowInviteModal(false);
                      setInviteEmail("");
                    } catch (error) {
                      console.error("Error sending invite:", error);
                      alert("Error sending invite: " + error.message);
                    } finally {
                      setInviting(false);
                    }
                  }}
                  disabled={inviting}
                  className="px-4 py-2 bg-dark-green text-white rounded hover:opacity-90 font-medium disabled:opacity-70 cursor-pointer"
                >
                  {inviting ? "Sending..." : "Send Link"}
                </button>
              </div>

            </div>
          </div>
        </>
      )}

    </div>
  );
};

export default IntakeForm;
