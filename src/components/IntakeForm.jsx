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
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import PlacesAutocomplete from "./PlacesAutocomplete";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { EditableProvider } from "./EditableContext";

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
  if (today.getDate() < d.getDate()) months--;
  if (months < 0) { years--; months += 12; }
  if (years < 0) return null;
  if (years === 0) return `0 year and ${months} month${months !== 1 ? "s" : ""}`;
  if (months > 0) return `${years} year${years !== 1 ? "s" : ""} and ${months} month${months !== 1 ? "s" : ""}`;
  return `${years} year${years !== 1 ? "s" : ""}`;
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
    serviceStartTime: "",
    serviceEndTime: "",
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

  // Family name (shared across all siblings)
  familyName: "",

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

  medicalInfoList: [
    {
      clientName: "",
      healthCareNo: "",
      diagnosis: "",
      diagnosisType: "",
      medicalConcern: "",
      mobilityAssistance: "",
      mobilityInfo: "",
      communicationAid: "",
      communicationInfo: "",
    },
  ],

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
});

// Extract clients from old `inTakeClients` into new `clients` array
const extractOldClients = (data) => {
  if (!Array.isArray(data.inTakeClients)) return [];

  return data.inTakeClients.map((c) => ({
    fullName: c.name || "",
    gender: normalizeGender(c.gender || c.otherGender || ""),
    birthDate: convertToISO(c.dob || ""),
    address: c.address || "",
    latitude: c.latitude,
    longitude: c.longitude,
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
          latitude: c.latitude,
          longitude: c.longitude,
          startDate: formatDateLocal(
            c.serviceStartDate || raw.serviceStartDate || ""
          ),
          clientInfo: c.otherServiceConcerns || "",
          phone: c.parentPhone || "",
          email: c.parentEmail || "",
          photos: [],
        }))
      : base.clients;

  // Parent Info per client
  const parentInfoList =
    inTakeClients.length > 0
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
    inTakeClients.length > 0
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
    inTakeClients.length > 0
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
    inTakeClients.length > 0
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
    parentInfoList,
    medicalInfoList,
    transportationInfoList,
    supervisedVisitations,
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

const IntakeForm = ({ mode = "add", isCaseWorker: propCaseWorker, user , id: propId,isEditable=true}) => {
  const navigate = useNavigate();
  const [showServiceCalendar, setShowServiceCalendar] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [shiftCategories, setShiftCategories] = useState([]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const fileInputRef = useRef(null);
  const docInputRef = useRef(null);
  const fileInputRefMedical = useRef(null);

const [showServiceDropdown, setShowServiceDropdown] = useState(false);
  const serviceDropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (serviceDropdownRef.current && !serviceDropdownRef.current.contains(e.target)) {
        setShowServiceDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const previousServiceStart = useRef(null);

  const { id:paramId } = useParams();
  const [searchParams] = useSearchParams();
  const formType = searchParams.get("type");
  
  
  const intakeFormId = propId || paramId;
  // type can be "Intake Worker" or "Private Family"
  const urlCaseWorker = formType === "Intake Worker";
  const isCaseWorker = propCaseWorker ?? urlCaseWorker;


  const [initialValues, setInitialValues] = useState(createEmptyInitialValues);

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

          parentInfoList: clients.map((c) =>
            data.parentInfoList?.find(
              (p) => p.clientName === c.fullName
            ) || {
              clientName: c.fullName,
              parentName: "",
              relationShip: "",
              parentPhone: "",
              parentEmail: "",
              parentAddress: "",
            }
          ),

          medicalInfoList: clients.map((c) =>
            data.medicalInfoList?.find(
              (m) => m.clientName === c.fullName
            ) || {
              clientName: c.fullName,
              healthCareNo: "",
              diagnosis: "",
              diagnosisType: "",
              medicalConcern: "",
              mobilityAssistance: "",
              mobilityInfo: "",
              communicationAid: "",
              communicationInfo: "",
            }
          ),

          transportationInfoList: clients.map((c) =>
            data.transportationInfoList?.find(
              (t) => t.clientName === c.fullName
            ) || {
              clientName: c.fullName,
              pickupAddress: "",
              dropoffAddress: "",
              pickupTime: "",
              dropOffTime: "",
              transportationOverview: "",
              carSeatRequired: "",
              carSeatType: "",
            }
          ),

          supervisedVisitations: clients.map((c) =>
            data.supervisedVisitations?.find(
              (v) => v.clientName === c.fullName
            ) || {
              clientName: c.fullName,
              visitStartTime: "",
              visitEndTime: "",
              visitDuration: "",
              visitPurpose: "",
              visitAddress: "",
              visitOverview: "",
            }
          ),

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

          uploadDocs: data.uploadedDocs || [],
          status: data.status ,
        };

        if (data.avatar) setAvatarPreview(data.avatar);



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
}, [mode, intakeFormId]);



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
          address: Yup.string().required("Address is required"),
          startDate: Yup.string().required("Start date is required"),
          clientInfo: Yup.string().required("Client info is required"),
          phone: Yup.string()
            .required("Phone number is required")
            .matches(/^[0-9]{10}$/, "Phone number must be 10 digits"),
          email: Yup.string()
            .required("Email is required")
            .email("Invalid email address"),
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
  for (const client of intake.clients) {
    await createSingleClient(intake, intakeId, client, db);
  }
};

const createSingleClient = async (intake, intakeId, client, db) => {
  let agencyName = "Private";
  let agencyId = "";
  let agencyAddress = "";
  let agencyType = "Private";

  let clientRate = "";
  let kmRate = "";
  let rateList = [];

  // ------------------------------------------------
  // CASE WORKER → fetch agency + rates
  // ------------------------------------------------
  if (intake.isCaseWorker) {
    agencyName = intake.agencyName || "";

    const agencySnap = await getDocs(
      query(
        collection(db, "agencies"),
        where("agencyName", "==", agencyName)
      )
    );

    if (!agencySnap.empty) {
      const agencyDoc = agencySnap.docs[0];
      const agency = agencyDoc.data();

      agencyId = agencyDoc.id;
      agencyAddress = agency.address || "";
      agencyType = agency.type || "";
      rateList = agency.rateList || [];

      // resolve rate from selected service
      const serviceId = intake.services?.serviceType?.[0];
      const matchedRate = rateList.find(
        (r) => r.id === serviceId
      );

      clientRate = matchedRate?.rate ?? "";
      kmRate = matchedRate?.kmRate ?? "";
    }
  }

  // ------------------------------------------------
  // PARENT EMAIL (from intake)
  // ------------------------------------------------
  const parent =
    intake.parentInfoList?.find(
      (p) => p.clientName === client.fullName
    ) || {};

  // ------------------------------------------------
  // CREATE CLIENT DOCUMENT
  // ------------------------------------------------
  
  const clientId = Date.now().toString();

await setDoc(doc(db, "clients", clientId), {
  // basic
  name: client.fullName,
  dob: client.birthDate,
  gender: client.gender || "",
  address: client.address || "",
  avatar: Array.isArray(client.photos) && client.photos.length > 0
  ? client.photos[0]
  : "",

  clientCode: generateClientCode(),
  clientStatus: "Active",
  fileClosed: false,

  description: client.clientInfo || "",
  parentEmail: parent.parentEmail || "",

  // agency
  agencyName,
  agencyId,
  agencyAddress,
  agencyType,

  // rates
  clientRate,
  kmRate,
  rateList: intake.isCaseWorker ? rateList : [],

  // empty initially
  medications: [],
  pharmacy: {},
  hospital: {},
  astrologist: {},

  // meta
  createdAt: Timestamp.now(),
  intakeId,
  id: clientId, // optional but matches old style
});

};


 


const handleSubmit = async (values, { resetForm }) => {
  try {
    // ================== SIGNATURE ==================
    const signatureURL = values.workerInfo.signature || "";

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

    // ================== FINAL PAYLOAD ==================
    const payload = {
      avatar: avatarPreview || null,

      services: {
        ...values.services,
        serviceType: values.services.serviceType || [],
      },

      clients: clientsObj,

      billingInfo: values.billingInfo,
      parentInfoList: values.parentInfoList || [],
      medicalInfoList: values.medicalInfoList || [],
      transportationInfoList: values.transportationInfoList || [],
      supervisedVisitations: values.supervisedVisitations || [],

      uploadedDocs: values.uploadDocs || [],

      workerInfo: {
        ...values.workerInfo,
        signature: signatureURL,
      },

      intakeworkerName: values.intakeworkerName || "",
      agencyName: values.agencyName || "",
      intakeworkerPhone: values.intakeworkerPhone || "",
      intakeworkerEmail: values.intakeworkerEmail || "",

      familyName: values.familyName || "",
      isCaseWorker: !!isCaseWorker,
      formType: isCaseWorker ? "intake-worker" : "private",
      status: values.status || "Submitted",

      // 🔐 IMPORTANT FLAG
      clientsCreated: values.clientsCreated || false,

      createdAt: formatReadableDate(new Date()),
    };

    // ================== SAVE INTAKE ==================
    const formId = mode === "update" && id ? id : Date.now().toString();

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

    alert("✅ Intake form submitted successfully");

    resetForm();
    setAvatarPreview(null);
  } catch (err) {
    console.error("❌ Intake submit failed:", err);
    alert("Something went wrong while submitting the form");
  }
};




  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

      {/* ─── Top Header ─── */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            Back
          </button>
          <div className="w-px h-5 bg-gray-200" />
          <h1 className="font-bold text-[20px] text-gray-900">
            {mode === "update" ? "Update Intake Form" : "Add Intake Form"}{" "}
            <span className="font-semibold text-[16px] text-gray-400">({isCaseWorker ? "Intake Worker" : "Owner"})</span>
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" className="px-4 py-2 rounded-lg border text-sm font-semibold text-gray-700 hover:bg-gray-50" style={{ borderColor: "#e5e7eb" }}>Save Draft</button>
        </div>
      </div>

      <EditableProvider isEditable={isEditable}>
        <Formik
          enableReinitialize={true}
          initialValues={initialValues}
          validate={validate}
          onSubmit={handleSubmit}
        >
          {({ touched, errors, values, setFieldValue }) => {
            // eslint-disable-next-line react-hooks/rules-of-hooks
            useEffect(() => {
              if (user) {
                setFieldValue("intakeworkerName", user.name || "");
                setFieldValue("agencyName", user.agency || "");
                setFieldValue("intakeworkerPhone", user.phone || "");
                setFieldValue("intakeworkerEmail", user.email || "");
              }
            }, [user, setFieldValue]);

            const selectedServiceIds = values.services?.serviceType || [];
            const selectedServiceCategories = shiftCategories.filter((cat) => selectedServiceIds.includes(cat.id));

            const showCombinedSection = selectedServiceCategories.some((cat) => {
              const name = (cat.name || "").toLowerCase();
              return (name.includes("supervised") || name.includes("visitation")) && name.includes("transport");
            });

            const showTransportationSection = !showCombinedSection && selectedServiceCategories.some((cat) => (cat.name || "").toLowerCase().includes("transport"));
            const showVisitationSection = !showCombinedSection && selectedServiceCategories.some((cat) => {
              const name = (cat.name || "").toLowerCase();
              return name.includes("supervised") || name.includes("supervisitation") || name.includes("visitation");
            });

            const showTransportSection = showTransportationSection;
            const showVisitSection = showVisitationSection;

            const iCls = (err) =>
              `w-full px-3 py-2.5 rounded-lg border transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm text-gray-700 placeholder-gray-400 ${err ? "border-red-400" : "border-[#e5e7eb]"}`;
            const sCls = (err, empty) =>
              `w-full px-3 py-2.5 rounded-lg border transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm appearance-none pr-9 ${err ? "border-red-400" : "border-[#e5e7eb]"} ${empty ? "text-gray-400" : "text-gray-700"}`;

            const SectionTitle = ({ title }) => (
              <div className="mb-5">
                <h2 className="font-bold text-gray-900 text-[15px]">{title}</h2>
                <div className="h-[3px] w-8 rounded-full mt-1" style={{ backgroundColor: "#145228" }} />
              </div>
            );

            const completionPct = (() => {
              let filled = 0; const total = 8;
              if (values.clients?.[0]?.fullName) filled++;
              if ((values.services?.serviceType?.length ?? 0) > 0) filled++;
              if ((values.services?.serviceDates?.length ?? 0) > 0) filled++;
              if (values.services?.serviceStartTime) filled++;
              if (values.parentInfoList?.[0]?.parentName) filled++;
              if (values.billingInfo?.invoiceEmail) filled++;
              if (values.medicalInfoList?.[0]?.clientName) filled++;
              if (values.workerInfo?.signature) filled++;
              return Math.round((filled / total) * 100);
            })();

            return (
              <Form>
                <div className="flex gap-5 items-start">


                  {/* ── LEFT: Main content ── */}
                  <div className="flex-1 min-w-0 flex flex-col gap-4">

                  {/* Status (update mode) */}
                  {mode === "update" && (
                    <div className="bg-white rounded-xl border p-5 flex items-center gap-3" style={{ borderColor: "#e5e7eb", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                      <label className="font-semibold text-sm text-gray-700">Status</label>
                      <div className="relative">
                        <Field as="select" name="status" disabled={isCaseWorker} className={sCls(false, !values.status)}>
                          <option value="Submitted">Submitted</option>
                          <option value="Accepted">Accepted</option>
                          <option value="Rejected">Rejected</option>
                        </Field>
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                          <FaChevronDown className="text-gray-400 w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>
                  )}

                {/* ── Family Name Card ── */}
                <div className="bg-white rounded-xl border p-6" style={{ borderColor: "#e5e7eb", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                  <SectionTitle title="Family Name" />
                  <div className="max-w-sm">
                    <label className="block font-semibold mb-2" style={{ fontSize: 13, color: "#374151" }}>Family Name <span className="text-red-500">*</span></label>
                    <Field name="familyName" type="text" placeholder="Enter family / client name"
                      className="w-full px-3 py-2.5 rounded-lg border text-sm border-[#e5e7eb] focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
                    <p className="text-xs text-gray-400 mt-1">All siblings added below will be grouped under this name.</p>
                  </div>
                </div>

                {/* ── Services Card ── */}
                <div className="bg-white rounded-xl border p-6" style={{ borderColor: "#e5e7eb", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                  <SectionTitle title="Services" />
                  <div className="grid grid-cols-2 gap-5">

                    {/* Types of Services — multi-select */}
                    <div>
                      <label className="block font-semibold mb-2" style={{ fontSize: 13, color: "#374151" }}>Types of Services</label>
                      <div className="relative" ref={serviceDropdownRef}>
                        <div
                          onClick={() => setShowServiceDropdown(!showServiceDropdown)}
                          className={`w-full px-3 py-2.5 rounded-lg border cursor-pointer text-sm ${
                            touched.services?.serviceType && errors.services?.serviceType ? "border-red-400" : "border-[#e5e7eb]"
                          } ${(values.services.serviceType?.length ?? 0) > 0 ? "text-gray-700" : "text-gray-400"}`}>
                          {(values.services.serviceType?.length ?? 0) > 0
                            ? shiftCategories.filter(cat => values.services.serviceType.includes(cat.id)).map(cat => cat.name).join(", ")
                            : "Select type of service"}
                        </div>
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                          <FaChevronDown className="text-gray-400 w-3.5 h-3.5" />
                        </span>
                        {showServiceDropdown && (
                          <div className="absolute z-50 mt-1 w-full bg-white border rounded-xl shadow-lg max-h-60 overflow-auto" style={{ borderColor: "#e5e7eb" }}>
                            {shiftCategories
                              .filter(item => {
                                const l = (item.name || "").toLowerCase();
                                const allowed = ["emergent care", "respite care", "supervised visitation", "transportation"];
                                return allowed.includes(l);
                              })
                              .map(item => {
                                const isSelected = values.services.serviceType.includes(item.id);
                                return (
                                  <div key={item.id}
                                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 cursor-pointer"
                                    onClick={() => {
                                      let updated = [...values.services.serviceType];
                                      updated = isSelected ? updated.filter(id => id !== item.id) : [...updated, item.id];
                                      setFieldValue("services.serviceType", updated);
                                    }}>
                                    <div className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0"
                                      style={{ background: isSelected ? "#145228" : "white", border: isSelected ? "none" : "1.5px solid #d1d5db" }}>
                                      {isSelected && <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><polyline points="2 6 5 9 10 3" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>}
                                    </div>
                                    <span className="text-sm text-gray-700">{item.name}</span>
                                  </div>
                                );
                              })}
                          </div>
                        )}
                      </div>
                      {touched.services?.serviceType && errors.services?.serviceType && (
                        <div className="text-red-500 text-xs mt-1">{errors.services.serviceType}</div>
                      )}
                    </div>

                    {/* Service Dates */}
                    <div>
                      <label className="block font-semibold mb-2" style={{ fontSize: 13, color: "#374151" }}>Service Dates</label>
                      <button type="button"
                        onClick={() => setShowServiceCalendar(true)}
                        className={`w-full text-left px-3 py-2.5 rounded-lg border text-sm transition-all ${
                          touched.services?.serviceDates && errors.services?.serviceDates ? "border-red-400" : "border-[#e5e7eb]"
                        } ${(values.services?.serviceDates?.length ?? 0) > 0 ? "text-gray-700" : "text-gray-400"}`}>
                        {(values.services?.serviceDates?.length ?? 0) > 0
                          ? values.services.serviceDates.join(", ")
                          : "Select service dates"}
                      </button>
                      {touched.services?.serviceDates && errors.services?.serviceDates && (
                        <div className="text-red-500 text-xs mt-1">{errors.services.serviceDates}</div>
                      )}
                      {showServiceCalendar && (
                        <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50">
                          <div className="bg-white p-6 rounded-xl shadow-xl min-w-[360px]">
                            <h2 className="font-bold text-gray-900 mb-4" style={{ fontSize: 15 }}>Select Service Dates</h2>
                            <DayPicker
                              mode="multiple"
                              selected={(values.services?.serviceDates || []).map((str) => {
                                const [year, month, day] = (str || "").split("-").map(Number);
                                if (!year || !month || !day) return new Date();
                                return new Date(year, month - 1, day);
                              })}
                              onSelect={(dates) => setFieldValue("services.serviceDates", (dates || []).map(formatDateLocal))}
                              className="custom-daypicker-green"
                            />
                            <div className="flex justify-between gap-3 mt-4">
                              <button type="button" onClick={() => setFieldValue("services.serviceDates", [])}
                                className="px-4 py-2 border rounded-lg text-sm font-semibold hover:bg-gray-50"
                                style={{ borderColor: "#e5e7eb", color: "#374151" }}>Clear All</button>
                              <div className="flex gap-3">
                                <button type="button" onClick={() => setShowServiceCalendar(false)}
                                  className="px-4 py-2 border rounded-lg text-sm font-semibold hover:bg-gray-50"
                                  style={{ borderColor: "#e5e7eb", color: "#374151" }}>Cancel</button>
                                <button type="button" onClick={() => setShowServiceCalendar(false)}
                                  className="px-4 py-2 text-white text-sm font-semibold rounded-lg"
                                  style={{ backgroundColor: "#145228" }}>Done</button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Start Time */}
                    <div>
                      <label className="block font-semibold mb-2" style={{ fontSize: 13, color: "#374151" }}>Service Start Time</label>
                      <Field name="services.serviceStartTime" type="time" className={iCls(false)} />
                    </div>

                    {/* End Time */}
                    <div>
                      <label className="block font-semibold mb-2" style={{ fontSize: 13, color: "#374151" }}>Service End Time</label>
                      <Field name="services.serviceEndTime" type="time" className={iCls(false)} />
                    </div>

                    {/* Safety Plan */}
                    <div className="col-span-2">
                      <label className="block font-semibold mb-2" style={{ fontSize: 13, color: "#374151" }}>Safety Plan / Management Risk</label>
                      <Field as="textarea" name="services.safetyPlan"
                        placeholder="Write down any risk or safety plan required"
                        rows={3} className={`${iCls(touched.services?.safetyPlan && errors.services?.safetyPlan)} resize-none`} />
                      {touched.services?.safetyPlan && errors.services?.safetyPlan && (
                        <div className="text-red-500 text-xs mt-1">{errors.services.safetyPlan}</div>
                      )}
                    </div>

                    {/* Service Description */}
                    <div className="col-span-2">
                      <label className="block font-semibold mb-2" style={{ fontSize: 13, color: "#374151" }}>Service Description</label>
                      <Field as="textarea" name="services.serviceDesc"
                        placeholder="Write down details regarding the service"
                        rows={3} className={`${iCls(false)} resize-none`} />
                    </div>
                  </div>
                </div>

                {/* ── Client Info Card ── */}
                <div className="bg-white rounded-xl border p-6" style={{ borderColor: "#e5e7eb", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                  <div className="flex items-center justify-between mb-5">
                    <SectionTitle title="Client Info" />
                    <button type="button"
                      onClick={() => setFieldValue("clients", [...values.clients, { fullName: "", gender: "", birthDate: "", address: "", apartmentUnit: "", latitude: "", longitude: "", startDate: "", clientInfo: "", phone: "", email: "", photos: [], cfsStatus: "", dfnaNumber: "", treatyNumber: "" }])}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors"
                      style={{ backgroundColor: "#145228" }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                      Add Sibling
                    </button>
                  </div>

                  <FieldArray name="clients">
                    {({ remove }) => (
                      <div className="flex flex-col gap-5">
                        {values.clients.map((client, index) => (
                          <div key={index} className="rounded-xl border p-5" style={{ borderColor: "#f3f4f6", background: "#fafafa" }}>
                            <div className="flex items-center justify-between mb-4">
                              <p className="font-bold text-gray-800" style={{ fontSize: 14 }}>Client {index + 1}</p>
                              {values.clients.length > 1 && (
                                <button type="button" onClick={() => remove(index)}
                                  className="text-red-500 text-sm font-semibold hover:text-red-600">Remove</button>
                              )}
                            </div>

                            {/* Photo */}
                            <div className="flex items-center gap-5 mb-5 pb-5 border-b" style={{ borderColor: "#e5e7eb" }}>
                              <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-100 flex-shrink-0">
                                {values.clients[index].photos?.length > 0 ? (
                                  <img
                                    src={typeof values.clients[index].photos[0] === "string" ? values.clients[index].photos[0] : URL.createObjectURL(values.clients[index].photos[0])}
                                    alt="Client" className="w-full h-full object-cover" />
                                ) : (
                                  <img src="/images/profile.jpeg" className="w-full h-full object-cover" alt="default" />
                                )}
                              </div>
                              <div>
                                <p className="font-semibold text-sm text-gray-800 mb-0.5">Client Photo</p>
                                <p className="text-xs text-gray-400 mb-2">JPG, PNG up to 5MB</p>
                                <div className="flex gap-2">
                                  <input id={`client-photo-input-${index}`} type="file" accept="image/*" className="hidden"
                                    onChange={(e) => handleClientPhotosChange(e, index, values, setFieldValue)} />
                                  <label htmlFor={`client-photo-input-${index}`}
                                    className="px-3 py-1.5 text-white text-xs font-semibold rounded-lg cursor-pointer"
                                    style={{ backgroundColor: "#145228" }}>Add Photo</label>
                                  <button type="button" onClick={() => setFieldValue(`clients.${index}.photos`, [])}
                                    className="px-3 py-1.5 border text-gray-600 text-xs font-semibold rounded-lg hover:bg-gray-50"
                                    style={{ borderColor: "#e5e7eb" }}>Remove Photo</button>
                                </div>
                              </div>
                            </div>

                            <div className="grid grid-cols-3 gap-5">
                              <div>
                                <label className="block font-semibold mb-2" style={{ fontSize: 13, color: "#374151" }}>Full Name</label>
                                <Field name={`clients.${index}.fullName`} type="text" placeholder="Enter client name"
                                  className={iCls(touched.clients?.[index]?.fullName && errors.clients?.[index]?.fullName)} />
                                {touched.clients?.[index]?.fullName && errors.clients?.[index]?.fullName && (
                                  <div className="text-red-500 text-xs mt-1">{errors.clients[index].fullName}</div>
                                )}
                              </div>

                              <div className="relative">
                                <label className="block font-semibold mb-2" style={{ fontSize: 13, color: "#374151" }}>Gender</label>
                                <Field as="select" name={`clients.${index}.gender`}
                                  className={sCls(touched.clients?.[index]?.gender && errors.clients?.[index]?.gender, !values.clients[index].gender)}>
                                  <option value="">Select gender</option>
                                  <option value="male">Male</option>
                                  <option value="female">Female</option>
                                  <option value="other">Other</option>
                                </Field>
                                <span className="absolute right-3 top-[60%] -translate-y-1/2 pointer-events-none">
                                  <FaChevronDown className="text-gray-400 w-3.5 h-3.5" />
                                </span>
                              </div>

                              <div>
                                <label className="block font-semibold mb-2" style={{ fontSize: 13, color: "#374151" }}>Date of Birth</label>
                                <Field name={`clients.${index}.birthDate`} type="date" className={iCls(touched.clients?.[index]?.birthDate && errors.clients?.[index]?.birthDate)} />
                                {(() => { const age = calculateAgeDisplay(values.clients?.[index]?.birthDate); return age ? <p className="text-xs text-gray-500 mt-1">Age: {age}</p> : null; })()}
                              </div>

                              <div>
                                <label className="block font-semibold mb-2" style={{ fontSize: 13, color: "#374151" }}>Phone</label>
                                <Field name={`clients.${index}.phone`} type="text" placeholder="10-digit phone number"
                                  className={iCls(touched.clients?.[index]?.phone && errors.clients?.[index]?.phone)} />
                                {touched.clients?.[index]?.phone && errors.clients?.[index]?.phone && (
                                  <div className="text-red-500 text-xs mt-1">{errors.clients[index].phone}</div>
                                )}
                              </div>

                              <div>
                                <label className="block font-semibold mb-2" style={{ fontSize: 13, color: "#374151" }}>Email</label>
                                <Field name={`clients.${index}.email`} type="email" placeholder="Enter email"
                                  className={iCls(touched.clients?.[index]?.email && errors.clients?.[index]?.email)} />
                                {touched.clients?.[index]?.email && errors.clients?.[index]?.email && (
                                  <div className="text-red-500 text-xs mt-1">{errors.clients[index].email}</div>
                                )}
                              </div>

                              <div>
                                <label className="block font-semibold mb-2" style={{ fontSize: 13, color: "#374151" }}>Service Start Date</label>
                                <Field name={`clients.${index}.startDate`} type="date"
                                  className={iCls(touched.clients?.[index]?.startDate && errors.clients?.[index]?.startDate)} />
                              </div>

                              <div className="col-span-2">
                                <label className="block font-semibold mb-2" style={{ fontSize: 13, color: "#374151" }}>Address</label>
                                <PlacesAutocomplete
                                  value={values.clients[index].address}
                                  placeholder="Enter client address"
                                  className={iCls(touched.clients?.[index]?.address && errors.clients?.[index]?.address)}
                                  onChange={(val) => setFieldValue(`clients.${index}.address`, val)} />
                              </div>

                              <div>
                                <label className="block font-semibold mb-2" style={{ fontSize: 13, color: "#374151" }}>Apartment / Unit No.</label>
                                <Field name={`clients.${index}.apartmentUnit`} type="text" placeholder="e.g. Apt 4B" className={iCls(false)} />
                              </div>

                              <div className="relative">
                                <label className="block font-semibold mb-2" style={{ fontSize: 13, color: "#374151" }}>CFS Status</label>
                                <Field as="select" name={`clients.${index}.cfsStatus`}
                                  className={sCls(false, !values.clients[index].cfsStatus)}>
                                  <option value="">Select CFS status</option>
                                  <option value="CAG">CAG</option>
                                  <option value="ICO">ICO</option>
                                  <option value="TGO">TGO</option>
                                  <option value="PGO">PGO</option>
                                  <option value="SFP">SFP</option>
                                </Field>
                                <span className="absolute right-3 top-[60%] -translate-y-1/2 pointer-events-none"><FaChevronDown className="text-gray-400 w-3.5 h-3.5" /></span>
                              </div>

                              <div>
                                <label className="block font-semibold mb-2" style={{ fontSize: 13, color: "#374151" }}>DFNA Number</label>
                                <Field name={`clients.${index}.dfnaNumber`} type="text" placeholder="Enter DFNA number" className={iCls(false)} />
                              </div>

                              <div>
                                <label className="block font-semibold mb-2" style={{ fontSize: 13, color: "#374151" }}>Treaty #</label>
                                <Field name={`clients.${index}.treatyNumber`} type="text" placeholder="Enter treaty number" className={iCls(false)} />
                              </div>

                              <div className="col-span-3">
                                <label className="block font-semibold mb-2" style={{ fontSize: 13, color: "#374151" }}>Client Info</label>
                                <Field as="textarea" name={`clients.${index}.clientInfo`}
                                  placeholder="Write down any risk or safety plan required"
                                  rows={3} className={`${iCls(touched.clients?.[index]?.clientInfo && errors.clients?.[index]?.clientInfo)} resize-none`} />
                                {touched.clients?.[index]?.clientInfo && errors.clients?.[index]?.clientInfo && (
                                  <div className="text-red-500 text-xs mt-1">{errors.clients[index].clientInfo}</div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </FieldArray>
                </div>

                {/* ── Case Worker Info ── */}
                {isCaseWorker && (
                  <div className="bg-white rounded-xl border p-6" style={{ borderColor: "#e5e7eb", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                    <SectionTitle title="Case Worker Information" />
                    <div className="grid grid-cols-2 gap-5">
                      <div>
                        <label className="block font-semibold mb-2" style={{ fontSize: 13, color: "#374151" }}>Name</label>
                        <Field name="caseworkerName" type="text" placeholder="Case worker name" className={iCls(touched.caseworkerName && errors.caseworkerName)} />
                        {touched.caseworkerName && errors.caseworkerName && <div className="text-red-500 text-xs mt-1">{errors.caseworkerName}</div>}
                      </div>
                      <div>
                        <label className="block font-semibold mb-2" style={{ fontSize: 13, color: "#374151" }}>Agency / Organisation</label>
                        <Field name="caseworkerAgencyName" type="text" placeholder="Agency or organisation name" className={iCls(touched.caseworkerAgencyName && errors.caseworkerAgencyName)} />
                      </div>
                      <div>
                        <label className="block font-semibold mb-2" style={{ fontSize: 13, color: "#374151" }}>Phone Number</label>
                        <Field name="caseworkerPhone" type="text" placeholder="Phone number" className={iCls(touched.caseworkerPhone && errors.caseworkerPhone)} />
                      </div>
                      <div>
                        <label className="block font-semibold mb-2" style={{ fontSize: 13, color: "#374151" }}>Email</label>
                        <Field name="caseworkerEmail" type="text" placeholder="Case worker email" className={iCls(touched.caseworkerEmail && errors.caseworkerEmail)} />
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Intake Worker Info ── */}
                {isCaseWorker && (
                  <div className="bg-white rounded-xl border p-6" style={{ borderColor: "#e5e7eb", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                    <div className="flex items-center justify-between mb-5">
                      <SectionTitle title="Intake Worker Information" />
                      <button type="button" onClick={() => setShowInviteModal(true)}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white"
                        style={{ backgroundColor: "#145228" }}>
                        + Add Intake Worker
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-5">
                      <div>
                        <label className="block font-semibold mb-2" style={{ fontSize: 13, color: "#374151" }}>Name</label>
                        <Field name="intakeworkerName" type="text" placeholder="Intake worker name" className={iCls(false)} />
                      </div>
                      <div>
                        <label className="block font-semibold mb-2" style={{ fontSize: 13, color: "#374151" }}>Agency / Organisation</label>
                        <Field name="agencyName" type="text" placeholder="Agency name" className={iCls(false)} />
                      </div>
                      <div>
                        <label className="block font-semibold mb-2" style={{ fontSize: 13, color: "#374151" }}>Phone Number</label>
                        <Field name="intakeworkerPhone" type="text" placeholder="Phone number" className={iCls(false)} />
                      </div>
                      <div>
                        <label className="block font-semibold mb-2" style={{ fontSize: 13, color: "#374151" }}>Email</label>
                        <Field name="intakeworkerEmail" type="text" placeholder="Intake worker email" className={iCls(false)} />
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Parent Info Card ── */}
                <div className="bg-white rounded-xl border p-6" style={{ borderColor: "#e5e7eb", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                  <div className="flex items-center justify-between mb-5">
                    <SectionTitle title="Parents Info" />
                    <button type="button"
                      onClick={() => setFieldValue("parentInfoList", [...values.parentInfoList, { clientName: "", parentName: "", relationShip: "", parentPhone: "", parentEmail: "", parentAddress: "" }])}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white"
                      style={{ backgroundColor: "#145228" }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                      Add Parent Info
                    </button>
                  </div>
                  <FieldArray name="parentInfoList">
                    {({ remove }) => (
                      <div className="flex flex-col gap-4">
                        {values.parentInfoList.map((parent, index) => (
                          <div key={index} className="rounded-xl border p-5" style={{ borderColor: "#f3f4f6", background: "#fafafa" }}>
                            <div className="flex items-center justify-between mb-4">
                              <p className="font-bold text-gray-800" style={{ fontSize: 14 }}>Parent {index + 1}</p>
                              {values.parentInfoList.length > 1 && (
                                <button type="button" onClick={() => remove(index)} className="text-red-500 text-sm font-semibold hover:text-red-600">Remove</button>
                              )}
                            </div>
                            <div className="grid grid-cols-3 gap-5">
                              <div className="relative">
                                <label className="block font-semibold mb-2" style={{ fontSize: 13, color: "#374151" }}>Client Name</label>
                                <Field as="select" name={`parentInfoList.${index}.clientName`}
                                  className={sCls(false, !values.parentInfoList[index].clientName)}>
                                  <option value="">Select Client</option>
                                  {values.clients.map((c, i) => <option key={i} value={c.fullName}>{c.fullName || `Client ${i+1}`}</option>)}
                                </Field>
                                <span className="absolute right-3 top-[60%] -translate-y-1/2 pointer-events-none"><FaChevronDown className="text-gray-400 w-3.5 h-3.5" /></span>
                              </div>
                              <div>
                                <label className="block font-semibold mb-2" style={{ fontSize: 13, color: "#374151" }}>Parent Name</label>
                                <Field name={`parentInfoList.${index}.parentName`} type="text" placeholder="Parent name" className={iCls(false)} />
                              </div>
                              <div>
                                <label className="block font-semibold mb-2" style={{ fontSize: 13, color: "#374151" }}>Relationship</label>
                                <Field name={`parentInfoList.${index}.relationShip`} type="text" placeholder="e.g. Father, Mother" className={iCls(false)} />
                              </div>
                              <div>
                                <label className="block font-semibold mb-2" style={{ fontSize: 13, color: "#374151" }}>Phone</label>
                                <Field name={`parentInfoList.${index}.parentPhone`} type="text" placeholder="Parent phone" className={iCls(false)} />
                              </div>
                              <div>
                                <label className="block font-semibold mb-2" style={{ fontSize: 13, color: "#374151" }}>Email</label>
                                <Field name={`parentInfoList.${index}.parentEmail`} type="email" placeholder="Parent email" className={iCls(false)} />
                              </div>
                              <div className="col-span-3">
                                <label className="block font-semibold mb-2" style={{ fontSize: 13, color: "#374151" }}>Address</label>
                                <PlacesAutocomplete value={values.parentInfoList[index].parentAddress} placeholder="Enter address"
                                  className={iCls(false)}
                                  onChange={(val) => setFieldValue(`parentInfoList.${index}.parentAddress`, val)} />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </FieldArray>
                </div>

                {/* ── Billing Card ── */}
                <div className="bg-white rounded-xl border p-6" style={{ borderColor: "#e5e7eb", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                  <SectionTitle title="Billing Info" />
                  <div className="grid grid-cols-2 gap-5">
                    <div>
                      <label className="block font-semibold mb-2" style={{ fontSize: 13, color: "#374151" }}>Invoice Email</label>
                      <Field name="billingInfo.invoiceEmail" type="email" placeholder="Enter invoice email"
                        className={iCls(touched.billingInfo?.invoiceEmail && errors.billingInfo?.invoiceEmail)} />
                      {touched.billingInfo?.invoiceEmail && errors.billingInfo?.invoiceEmail && (
                        <div className="text-red-500 text-xs mt-1">{errors.billingInfo.invoiceEmail}</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* ── Upload Documents Card ── */}
                <div className="bg-white rounded-xl border p-6" style={{ borderColor: "#e5e7eb", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                  <SectionTitle title="Upload Documents" />
                  <div>
                    <label className="block font-semibold mb-2" style={{ fontSize: 13, color: "#374151" }}>Documents</label>
                    <div className="flex items-center gap-3">
                      <div className={`flex-1 px-3 py-2.5 rounded-lg border text-sm ${touched.uploadDocs && errors.uploadDocs ? "border-red-400" : "border-[#e5e7eb]"} ${values.uploadDocs.length > 0 ? "text-gray-700" : "text-gray-400"}`}>
                        {values.uploadDocs.length > 0 ? `${values.uploadDocs.length} file(s) selected` : "No files selected"}
                      </div>
                      <input type="file" ref={docInputRef} className="hidden" multiple
                        onChange={(e) => {
                          const files = Array.from(e.target.files || []);
                          setFieldValue("uploadDocs", [...(values.uploadDocs || []), ...files]);
                        }} />
                      <button type="button" onClick={() => docInputRef.current?.click()}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-semibold hover:bg-gray-50 transition-colors"
                        style={{ borderColor: "#e5e7eb", color: "#374151" }}>
                        <Upload size={16} /> Browse Files
                      </button>
                    </div>
                    {values.uploadDocs.length > 0 && (
                      <div className="mt-3 flex flex-col gap-2">
                        {values.uploadDocs.map((file, i) => (
                          <div key={i} className="flex items-center justify-between px-3 py-2 rounded-lg border" style={{ borderColor: "#f3f4f6", background: "#fafafa" }}>
                            <span className="text-sm text-gray-700 truncate max-w-[80%]">{file.name}</span>
                            <button type="button" onClick={() => setFieldValue("uploadDocs", values.uploadDocs.filter((_, idx) => idx !== i))}
                              className="text-gray-400 hover:text-red-500 transition-colors"><X size={16} /></button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* ── Medical Info Card ── */}
                <div className="bg-white rounded-xl border p-6" style={{ borderColor: "#e5e7eb", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                  <div className="flex items-center justify-between mb-5">
                    <SectionTitle title="Medical Info" />
                    <button type="button"
                      onClick={() => setFieldValue("medicalInfoList", [...values.medicalInfoList, { clientName: "", healthCareNo: "", diagnosis: "", diagnosisType: "", medicalConcern: "", mobilityAssistance: "", mobilityInfo: "", communicationAid: "", communicationInfo: "" }])}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white"
                      style={{ backgroundColor: "#145228" }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                      Add Medical Info
                    </button>
                  </div>
                  <FieldArray name="medicalInfoList">
                    {({ remove }) => (
                      <div className="flex flex-col gap-4">
                        {values.medicalInfoList.map((medical, index) => (
                          <div key={index} className="rounded-xl border p-5" style={{ borderColor: "#f3f4f6", background: "#fafafa" }}>
                            <div className="flex items-center justify-between mb-4">
                              <p className="font-bold text-gray-800" style={{ fontSize: 14 }}>Medical Info {index + 1}</p>
                              {values.medicalInfoList.length > 1 && (
                                <button type="button" onClick={() => remove(index)} className="text-red-500 text-sm font-semibold hover:text-red-600">Remove</button>
                              )}
                            </div>
                            <div className="grid grid-cols-3 gap-5">
                              <div className="relative">
                                <label className="block font-semibold mb-2" style={{ fontSize: 13, color: "#374151" }}>Client Name</label>
                                <Field as="select" name={`medicalInfoList.${index}.clientName`}
                                  className={sCls(false, !values.medicalInfoList[index].clientName)}>
                                  <option value="">Select Client</option>
                                  {values.clients.map((c, i) => <option key={i} value={c.fullName}>{c.fullName || `Client ${i+1}`}</option>)}
                                </Field>
                                <span className="absolute right-3 top-[60%] -translate-y-1/2 pointer-events-none"><FaChevronDown className="text-gray-400 w-3.5 h-3.5" /></span>
                              </div>
                              <div>
                                <label className="block font-semibold mb-2" style={{ fontSize: 13, color: "#374151" }}>Health Care No.</label>
                                <Field name={`medicalInfoList.${index}.healthCareNo`} type="text" placeholder="Enter health care no." className={iCls(false)} />
                              </div>
                              <div>
                                <label className="block font-semibold mb-2" style={{ fontSize: 13, color: "#374151" }}>Diagnosis</label>
                                <Field name={`medicalInfoList.${index}.diagnosis`} type="text" placeholder="Enter diagnosis" className={iCls(false)} />
                              </div>
                              <div>
                                <label className="block font-semibold mb-2" style={{ fontSize: 13, color: "#374151" }}>Diagnosis Type</label>
                                <Field name={`medicalInfoList.${index}.diagnosisType`} type="text" placeholder="Type of diagnosis" className={iCls(false)} />
                              </div>
                              <div>
                                <label className="block font-semibold mb-2" style={{ fontSize: 13, color: "#374151" }}>Mobility Assistance</label>
                                <Field name={`medicalInfoList.${index}.mobilityAssistance`} type="text" placeholder="Yes / No" className={iCls(false)} />
                              </div>
                              <div>
                                <label className="block font-semibold mb-2" style={{ fontSize: 13, color: "#374151" }}>Mobility Info</label>
                                <Field name={`medicalInfoList.${index}.mobilityInfo`} type="text" placeholder="Enter details" className={iCls(false)} />
                              </div>
                              <div>
                                <label className="block font-semibold mb-2" style={{ fontSize: 13, color: "#374151" }}>Communication Aid</label>
                                <Field name={`medicalInfoList.${index}.communicationAid`} type="text" placeholder="Yes / No" className={iCls(false)} />
                              </div>
                              <div className="col-span-3">
                                <label className="block font-semibold mb-2" style={{ fontSize: 13, color: "#374151" }}>Medical Concern</label>
                                <Field as="textarea" name={`medicalInfoList.${index}.medicalConcern`} placeholder="Enter medical concerns" rows={2}
                                  className={`${iCls(false)} resize-none`} />
                              </div>
                              <div className="col-span-3">
                                <label className="block font-semibold mb-2" style={{ fontSize: 13, color: "#374151" }}>Communication Info</label>
                                <Field as="textarea" name={`medicalInfoList.${index}.communicationInfo`} placeholder="Enter communication details" rows={2}
                                  className={`${iCls(false)} resize-none`} />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </FieldArray>
                </div>

                {/* ── Transportation Info Card (conditional) ── */}
                {showTransportSection && (
                  <div className="bg-white rounded-xl border p-6" style={{ borderColor: "#e5e7eb", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                    <div className="flex items-center justify-between mb-5">
                      <SectionTitle title="Transportation Info" />
                      <button type="button"
                        onClick={() => setFieldValue("transportationInfoList", [...values.transportationInfoList, { clientName: "", pickupAddress: "", dropoffAddress: "", pickupTime: "", dropOffTime: "", transportationOverview: "", carSeatRequired: "", carSeatType: "" }])}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white"
                        style={{ backgroundColor: "#145228" }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                        Add Transportation
                      </button>
                    </div>
                    <FieldArray name="transportationInfoList">
                      {({ remove }) => (
                        <div className="flex flex-col gap-4">
                          {values.transportationInfoList.map((trans, index) => (
                            <div key={index} className="rounded-xl border p-5" style={{ borderColor: "#f3f4f6", background: "#fafafa" }}>
                              <div className="flex items-center justify-between mb-4">
                                <p className="font-bold text-gray-800" style={{ fontSize: 14 }}>Transportation {index + 1}</p>
                                {values.transportationInfoList.length > 1 && (
                                  <button type="button" onClick={() => remove(index)} className="text-red-500 text-sm font-semibold hover:text-red-600">Remove</button>
                                )}
                              </div>
                              <div className="grid grid-cols-3 gap-5">
                                <div className="relative">
                                  <label className="block font-semibold mb-2" style={{ fontSize: 13, color: "#374151" }}>Client Name</label>
                                  <Field as="select" name={`transportationInfoList.${index}.clientName`}
                                    value={values.transportationInfoList[index].clientName}
                                    onChange={(e) => {
                                      const selectedName = e.target.value;
                                      setFieldValue(`transportationInfoList.${index}.clientName`, selectedName);
                                      const c = values.clients.find(c => c.fullName === selectedName);
                                      if (c?.birthDate) {
                                        const age = calculateAgeYears(c.birthDate);
                                        const seat = deriveCarSeatFromAge(age);
                                        setFieldValue(`transportationInfoList.${index}.carSeatRequired`, seat.required);
                                        setFieldValue(`transportationInfoList.${index}.carSeatType`, seat.type);
                                      }
                                    }}
                                    className={sCls(false, !values.transportationInfoList[index].clientName)}>
                                    <option value="">Select Client</option>
                                    {values.clients.map((c, i) => <option key={i} value={c.fullName}>{c.fullName || `Client ${i+1}`}</option>)}
                                  </Field>
                                  <span className="absolute right-3 top-[60%] -translate-y-1/2 pointer-events-none"><FaChevronDown className="text-gray-400 w-3.5 h-3.5" /></span>
                                </div>
                                <div>
                                  <label className="block font-semibold mb-2" style={{ fontSize: 13, color: "#374151" }}>Pickup Address</label>
                                  <PlacesAutocomplete value={values.transportationInfoList[index].pickupAddress} placeholder="Enter pickup address"
                                    className={iCls(false)}
                                    onChange={(val) => setFieldValue(`transportationInfoList.${index}.pickupAddress`, val)} />
                                </div>
                                <div>
                                  <label className="block font-semibold mb-2" style={{ fontSize: 13, color: "#374151" }}>Dropoff Address</label>
                                  <PlacesAutocomplete value={values.transportationInfoList[index].dropoffAddress} placeholder="Enter dropoff address"
                                    className={iCls(false)}
                                    onChange={(val) => setFieldValue(`transportationInfoList.${index}.dropoffAddress`, val)} />
                                </div>
                                <div>
                                  <label className="block font-semibold mb-2" style={{ fontSize: 13, color: "#374151" }}>Pickup Time</label>
                                  <Field name={`transportationInfoList.${index}.pickupTime`} type="time" className={iCls(false)} />
                                </div>
                                <div>
                                  <label className="block font-semibold mb-2" style={{ fontSize: 13, color: "#374151" }}>Dropoff Time</label>
                                  <Field name={`transportationInfoList.${index}.dropOffTime`} type="time" className={iCls(false)} />
                                </div>
                                <div className="relative">
                                  <label className="block font-semibold mb-2" style={{ fontSize: 13, color: "#374151" }}>Car Seat Required</label>
                                  <Field as="select" name={`transportationInfoList.${index}.carSeatRequired`}
                                    className={sCls(false, !values.transportationInfoList[index].carSeatRequired)}>
                                    <option value="">Select</option>
                                    <option value="yes">Yes</option>
                                    <option value="no">No</option>
                                  </Field>
                                  <span className="absolute right-3 top-[60%] -translate-y-1/2 pointer-events-none"><FaChevronDown className="text-gray-400 w-3.5 h-3.5" /></span>
                                </div>
                                {trans.carSeatRequired === "yes" && (
                                  <div className="relative">
                                    <label className="block font-semibold mb-2" style={{ fontSize: 13, color: "#374151" }}>Car Seat Type</label>
                                    <Field as="select" name={`transportationInfoList.${index}.carSeatType`} value={trans.carSeatType}
                                      className={sCls(false, !trans.carSeatType)}>
                                      <option value="">Select seat type</option>
                                      <option value="Rear-facing seat">Rear-facing seat</option>
                                      <option value="Forward-facing seat">Forward-facing seat</option>
                                      <option value="Booster seat">Booster seat</option>
                                      <option value="Seat belt only">Seat belt only</option>
                                    </Field>
                                    <span className="absolute right-3 top-[60%] -translate-y-1/2 pointer-events-none"><FaChevronDown className="text-gray-400 w-3.5 h-3.5" /></span>
                                  </div>
                                )}
                                <div className="col-span-3">
                                  <label className="block font-semibold mb-2" style={{ fontSize: 13, color: "#374151" }}>Transportation Overview</label>
                                  <Field as="textarea" name={`transportationInfoList.${index}.transportationOverview`}
                                    placeholder="Add transportation overview" rows={2} className={`${iCls(false)} resize-none`} />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </FieldArray>
                  </div>
                )}

                {/* ── Supervised Visitations Card (conditional) ── */}
                {showVisitSection && (
                  <div className="bg-white rounded-xl border p-6" style={{ borderColor: "#e5e7eb", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                    <div className="flex items-center justify-between mb-5">
                      <SectionTitle title="Supervised Visitations" />
                      <button type="button"
                        onClick={() => setFieldValue("supervisedVisitations", [...values.supervisedVisitations, { clientName: "", visitStartTime: "", visitEndTime: "", visitDuration: "", visitPurpose: "", visitAddress: "", visitOverview: "" }])}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white"
                        style={{ backgroundColor: "#145228" }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                        Add Visitation
                      </button>
                    </div>
                    <FieldArray name="supervisedVisitations">
                      {({ remove }) => (
                        <div className="flex flex-col gap-4">
                          {values.supervisedVisitations.map((visit, index) => (
                            <div key={index} className="rounded-xl border p-5" style={{ borderColor: "#f3f4f6", background: "#fafafa" }}>
                              <div className="flex items-center justify-between mb-4">
                                <p className="font-bold text-gray-800" style={{ fontSize: 14 }}>Visitation {index + 1}</p>
                                {values.supervisedVisitations.length > 1 && (
                                  <button type="button" onClick={() => remove(index)} className="text-red-500 text-sm font-semibold hover:text-red-600">Remove</button>
                                )}
                              </div>
                              <div className="grid grid-cols-3 gap-5">
                                <div className="relative">
                                  <label className="block font-semibold mb-2" style={{ fontSize: 13, color: "#374151" }}>Client Name</label>
                                  <Field as="select" name={`supervisedVisitations.${index}.clientName`}
                                    className={sCls(false, !values.supervisedVisitations[index].clientName)}>
                                    <option value="">Select Client</option>
                                    {values.clients.map((c, i) => <option key={i} value={c.fullName || c.name}>{c.fullName || c.name || `Client ${i+1}`}</option>)}
                                  </Field>
                                  <span className="absolute right-3 top-[60%] -translate-y-1/2 pointer-events-none"><FaChevronDown className="text-gray-400 w-3.5 h-3.5" /></span>
                                </div>
                                <div>
                                  <label className="block font-semibold mb-2" style={{ fontSize: 13, color: "#374151" }}>Visit Start Time</label>
                                  <Field name={`supervisedVisitations.${index}.visitStartTime`} type="time" className={iCls(false)} />
                                </div>
                                <div>
                                  <label className="block font-semibold mb-2" style={{ fontSize: 13, color: "#374151" }}>Visit End Time</label>
                                  <Field name={`supervisedVisitations.${index}.visitEndTime`} type="time" className={iCls(false)} />
                                </div>
                                <div>
                                  <label className="block font-semibold mb-2" style={{ fontSize: 13, color: "#374151" }}>Visit Duration</label>
                                  <Field name={`supervisedVisitations.${index}.visitDuration`} type="text" placeholder="e.g. 2 hours" className={iCls(false)} />
                                </div>
                                <div>
                                  <label className="block font-semibold mb-2" style={{ fontSize: 13, color: "#374151" }}>Purpose of Visit</label>
                                  <Field name={`supervisedVisitations.${index}.visitPurpose`} type="text" placeholder="Enter purpose" className={iCls(false)} />
                                </div>
                                <div>
                                  <label className="block font-semibold mb-2" style={{ fontSize: 13, color: "#374151" }}>Visit Address</label>
                                  <PlacesAutocomplete value={values.supervisedVisitations[index].visitAddress} placeholder="Enter visit address"
                                    className={iCls(false)}
                                    onChange={(val) => setFieldValue(`supervisedVisitations.${index}.visitAddress`, val)} />
                                </div>
                                <div className="col-span-3">
                                  <label className="block font-semibold mb-2" style={{ fontSize: 13, color: "#374151" }}>Visit Overview</label>
                                  <Field as="textarea" name={`supervisedVisitations.${index}.visitOverview`}
                                    placeholder="Write down the visit overview" rows={2} className={`${iCls(false)} resize-none`} />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </FieldArray>
                  </div>
                )}

                {/* ── Combined Supervised Visitation & Transportation Card ── */}
                {showCombinedSection && (
                  <div className="bg-white rounded-xl border p-6" style={{ borderColor: "#e5e7eb", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                    <div className="flex items-center justify-between mb-5">
                      <SectionTitle title="Supervised Visitation & Transportation Info" />
                      <button type="button"
                        onClick={() => {
                          const lastT = values.transportationInfoList?.[values.transportationInfoList.length - 1] || { clientName: "", pickupAddress: "", dropoffAddress: "", pickupTime: "", dropOffTime: "", transportationOverview: "", carSeatType: "", carSeatRequired: "" };
                          const lastV = values.supervisedVisitations?.[values.supervisedVisitations.length - 1] || { clientName: "", visitStartTime: "", visitEndTime: "", visitDuration: "", visitPurpose: "", visitAddress: "", visitOverview: "" };
                          setFieldValue("transportationInfoList", [...values.transportationInfoList, { ...lastT, clientName: "" }]);
                          setFieldValue("supervisedVisitations", [...values.supervisedVisitations, { ...lastV, clientName: "" }]);
                        }}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white"
                        style={{ backgroundColor: "#145228" }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                        Add Combined Info
                      </button>
                    </div>
                    <FieldArray name="transportationInfoList">
                      {({ remove }) => (
                        <div className="flex flex-col gap-4">
                          {values.transportationInfoList.map((trans, index) => (
                            <div key={index} className="rounded-xl border p-5" style={{ borderColor: "#f3f4f6", background: "#fafafa" }}>
                              <div className="flex items-center justify-between mb-4">
                                <p className="font-bold text-gray-800" style={{ fontSize: 14 }}>Combined Info {index + 1}</p>
                                {values.transportationInfoList.length > 1 && (
                                  <button type="button" onClick={() => {
                                    remove(index);
                                    const newVisits = [...values.supervisedVisitations];
                                    newVisits.splice(index, 1);
                                    setFieldValue("supervisedVisitations", newVisits);
                                  }} className="text-red-500 text-sm font-semibold hover:text-red-600">Remove</button>
                                )}
                              </div>
                              <div className="grid grid-cols-3 gap-5">
                                {/* Client Name */}
                                <div className="col-span-3 relative">
                                  <label className="block font-semibold mb-2" style={{ fontSize: 13, color: "#374151" }}>Client Name</label>
                                  <select
                                    value={trans.clientName || ""}
                                    className={sCls(false, !trans.clientName)}
                                    onChange={(e) => {
                                      setFieldValue(`transportationInfoList.${index}.clientName`, e.target.value);
                                      setFieldValue(`supervisedVisitations.${index}.clientName`, e.target.value);
                                    }}>
                                    <option value="">Select Client</option>
                                    {values.clients.filter(c => c.fullName).map((c, i) => (
                                      <option key={i} value={c.fullName}>{c.fullName}</option>
                                    ))}
                                  </select>
                                  <span className="absolute right-3 top-[60%] -translate-y-1/2 pointer-events-none"><FaChevronDown className="text-gray-400 w-3.5 h-3.5" /></span>
                                </div>

                                {/* Transportation fields */}
                                <div>
                                  <label className="block font-semibold mb-2" style={{ fontSize: 13, color: "#374151" }}>Pickup Address</label>
                                  <PlacesAutocomplete value={trans.pickupAddress || ""} placeholder="Enter pickup address"
                                    className={iCls(false)}
                                    onChange={(val) => setFieldValue(`transportationInfoList.${index}.pickupAddress`, val)} />
                                </div>
                                <div>
                                  <label className="block font-semibold mb-2" style={{ fontSize: 13, color: "#374151" }}>Dropoff Address</label>
                                  <PlacesAutocomplete value={trans.dropoffAddress || ""} placeholder="Enter dropoff address"
                                    className={iCls(false)}
                                    onChange={(val) => setFieldValue(`transportationInfoList.${index}.dropoffAddress`, val)} />
                                </div>
                                <div>
                                  <label className="block font-semibold mb-2" style={{ fontSize: 13, color: "#374151" }}>Pickup Time</label>
                                  <Field name={`transportationInfoList.${index}.pickupTime`} type="time" className={iCls(false)} />
                                </div>
                                <div>
                                  <label className="block font-semibold mb-2" style={{ fontSize: 13, color: "#374151" }}>Dropoff Time</label>
                                  <Field name={`transportationInfoList.${index}.dropOffTime`} type="time" className={iCls(false)} />
                                </div>
                                <div className="relative">
                                  <label className="block font-semibold mb-2" style={{ fontSize: 13, color: "#374151" }}>Car Seat Required</label>
                                  <Field as="select" name={`transportationInfoList.${index}.carSeatRequired`}
                                    className={sCls(false, !trans.carSeatRequired)}
                                    onChange={(e) => {
                                      setFieldValue(`transportationInfoList.${index}.carSeatRequired`, e.target.value);
                                      if (e.target.value === "no") setFieldValue(`transportationInfoList.${index}.carSeatType`, "");
                                    }}>
                                    <option value="">Select</option>
                                    <option value="yes">Yes</option>
                                    <option value="no">No</option>
                                  </Field>
                                  <span className="absolute right-3 top-[60%] -translate-y-1/2 pointer-events-none"><FaChevronDown className="text-gray-400 w-3.5 h-3.5" /></span>
                                </div>
                                {trans.carSeatRequired === "yes" && (
                                  <div className="relative">
                                    <label className="block font-semibold mb-2" style={{ fontSize: 13, color: "#374151" }}>Car Seat Type</label>
                                    <Field as="select" name={`transportationInfoList.${index}.carSeatType`}
                                      className={sCls(false, !trans.carSeatType)}>
                                      <option value="">Select seat type</option>
                                      <option value="Rear-facing seat">Rear-facing seat</option>
                                      <option value="Forward-facing seat">Forward-facing seat</option>
                                      <option value="Booster seat">Booster seat</option>
                                      <option value="Seat belt only">Seat belt only</option>
                                    </Field>
                                    <span className="absolute right-3 top-[60%] -translate-y-1/2 pointer-events-none"><FaChevronDown className="text-gray-400 w-3.5 h-3.5" /></span>
                                  </div>
                                )}
                                <div className="col-span-3">
                                  <label className="block font-semibold mb-2" style={{ fontSize: 13, color: "#374151" }}>Transportation Overview</label>
                                  <Field as="textarea" name={`transportationInfoList.${index}.transportationOverview`}
                                    placeholder="Add transportation overview" rows={2} className={`${iCls(false)} resize-none`} />
                                </div>

                                {/* Supervised Visitation fields */}
                                <div>
                                  <label className="block font-semibold mb-2" style={{ fontSize: 13, color: "#374151" }}>Visit Start Time</label>
                                  <Field name={`supervisedVisitations.${index}.visitStartTime`} type="time" className={iCls(false)} />
                                </div>
                                <div>
                                  <label className="block font-semibold mb-2" style={{ fontSize: 13, color: "#374151" }}>Visit End Time</label>
                                  <Field name={`supervisedVisitations.${index}.visitEndTime`} type="time" className={iCls(false)} />
                                </div>
                                <div>
                                  <label className="block font-semibold mb-2" style={{ fontSize: 13, color: "#374151" }}>Visit Duration</label>
                                  <Field name={`supervisedVisitations.${index}.visitDuration`} type="text" placeholder="e.g. 2 hours" className={iCls(false)} />
                                </div>
                                <div>
                                  <label className="block font-semibold mb-2" style={{ fontSize: 13, color: "#374151" }}>Purpose of Visit</label>
                                  <Field name={`supervisedVisitations.${index}.visitPurpose`} type="text" placeholder="Enter purpose" className={iCls(false)} />
                                </div>
                                <div className="col-span-2">
                                  <label className="block font-semibold mb-2" style={{ fontSize: 13, color: "#374151" }}>Visit Address</label>
                                  <PlacesAutocomplete value={values.supervisedVisitations[index]?.visitAddress || ""} placeholder="Enter visit address"
                                    className={iCls(false)}
                                    onChange={(val) => setFieldValue(`supervisedVisitations.${index}.visitAddress`, val)} />
                                </div>
                                <div className="col-span-3">
                                  <label className="block font-semibold mb-2" style={{ fontSize: 13, color: "#374151" }}>Visit Overview</label>
                                  <Field as="textarea" name={`supervisedVisitations.${index}.visitOverview`}
                                    placeholder="Write down the visit overview" rows={2} className={`${iCls(false)} resize-none`} />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </FieldArray>
                  </div>
                )}

                {/* ── Acknowledgement Card ── */}
                <div className="bg-white rounded-xl border p-6" style={{ borderColor: "#e5e7eb", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                  <SectionTitle title="Acknowledgement" />
                  <div className="grid grid-cols-2 gap-5">
                    <div>
                      <label className="block font-semibold mb-2" style={{ fontSize: 13, color: "#374151" }}>
                        {isCaseWorker ? "Worker Name" : "Parent / Guardian Name"}
                      </label>
                      <Field name="workerInfo.workerName" type="text" placeholder="Name of person filling the form" className={iCls(false)} />
                    </div>
                    <div>
                      <label className="block font-semibold mb-2" style={{ fontSize: 13, color: "#374151" }}>Date</label>
                      <Field name="workerInfo.date" type="date" className={iCls(false)} />
                    </div>
                    <div className="col-span-2">
                      <label className="block font-semibold mb-2" style={{ fontSize: 13, color: "#374151" }}>
                        {isCaseWorker ? "Worker Digital Signature" : "Parent / Guardian Digital Signature"}
                      </label>
                      <input
                        type="text"
                        value={values.workerInfo.signature}
                        onChange={(e) => {
                          const cleaned = e.target.value.replace(/[^a-zA-Z\s]/g, "");
                          setFieldValue("workerInfo.signature", cleaned);
                        }}
                        placeholder="Type your full name to sign"
                        className={iCls(false)}
                      />
                      {/* Live cursive preview */}
                      <div className="mt-3 border border-dashed rounded-xl p-6 bg-gray-50 flex flex-col items-center justify-center min-h-[120px]" style={{ borderColor: "#d1d5db" }}>
                        {values.workerInfo.signature ? (
                          <span className="text-4xl text-blue-900" style={{ fontFamily: "'Dancing Script', cursive" }}>
                            {values.workerInfo.signature}
                          </span>
                        ) : (
                          <span className="text-gray-400 italic text-sm">Signature will appear here...</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                  </div>{/* end left column */}

                  {/* ── RIGHT: Form Summary sidebar ── */}
                  <div className="w-[280px] flex-shrink-0 sticky top-4">
                    <div className="bg-white rounded-xl border p-5" style={{ borderColor: "#e5e7eb", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                      <h3 className="font-bold text-gray-900 mb-4" style={{ fontSize: 15 }}>Form Summary</h3>

                      <div className="space-y-3 pb-4 border-b" style={{ borderColor: "#f3f4f6" }}>
                        <div className="flex items-center justify-between">
                          <span className="text-[13px] text-gray-500">Status</span>
                          <span className="text-[12px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "#fef3c7", color: "#d97706" }}>📄 Draft</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[13px] text-gray-500">Created</span>
                          <span className="text-[13px] font-semibold text-gray-700">Today</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[13px] text-gray-500">Last Saved</span>
                          <span className="text-[13px] font-semibold text-gray-700">Just now</span>
                        </div>
                      </div>

                      <div className="py-4 border-b" style={{ borderColor: "#f3f4f6" }}>
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-2">COMPLETION</p>
                        <div className="w-full h-1.5 rounded-full bg-gray-100 overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{ width: `${completionPct}%`, backgroundColor: "#145228" }} />
                        </div>
                        <p className="text-[12px] font-semibold text-gray-500 mt-1.5 text-right">{completionPct}%</p>
                      </div>

                      <div className="py-4">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-3">SECTIONS</p>
                        <ul className="space-y-2.5">
                          {[
                            { label: "Basic Info", filled: !!(values.clients?.[0]?.fullName) },
                            { label: "Services", filled: (values.services?.serviceType?.length ?? 0) > 0 },
                            { label: "Client Info", filled: !!(values.clients?.[0]?.fullName) },
                            { label: "Billing Info", filled: !!(values.billingInfo?.invoiceEmail) },
                            { label: "Parents Info", filled: !!(values.parentInfoList?.[0]?.parentName) },
                            { label: "Medical Info", filled: !!(values.medicalInfoList?.[0]?.clientName) },
                            { label: "Acknowledgement", filled: !!(values.workerInfo?.signature) },
                          ].map(({ label, filled }) => (
                            <li key={label} className="flex items-center gap-2.5">
                              <div className="w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center"
                                style={{ border: filled ? "none" : "1.5px solid #d1d5db", background: filled ? "#145228" : "white" }}>
                                {filled && (
                                  <svg width="8" height="8" viewBox="0 0 12 12" fill="none">
                                    <polyline points="2 6 5 9 10 3" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
                                  </svg>
                                )}
                              </div>
                              <span className="text-[13px]" style={{ color: filled ? "#145228" : "#6b7280", fontWeight: filled ? 600 : 400 }}>{label}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <button type="button" className="w-full py-2 rounded-lg border text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors mt-1" style={{ borderColor: "#e5e7eb" }}>
                        Save Draft
                      </button>
                    </div>
                  </div>

                </div>{/* end flex gap-5 */}

                {/* ── Bottom Footer ── */}
                <div className="sticky bottom-0 mt-4 bg-white border-t flex items-center justify-between px-6 py-4 -mx-6" style={{ borderColor: "#e5e7eb" }}>
                  <button type="button" onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm font-semibold text-gray-600 hover:text-gray-900">
                    ← Back to Dashboard
                  </button>
                  <div className="flex items-center gap-2">
                    <button type="button" className="px-4 py-2 rounded-lg border text-sm font-semibold text-gray-700 hover:bg-gray-50" style={{ borderColor: "#e5e7eb" }}>Save Draft</button>
                    <button type="submit" className="px-6 py-2 rounded-lg text-sm font-semibold text-white flex items-center gap-1.5" style={{ backgroundColor: "#145228" }}>
                      {mode === "update" ? "Update Form" : "Submit Form"} →
                    </button>
                  </div>
                </div>

              </Form>
            );
          }}
        </Formik>
      </EditableProvider>

      {/* ── Add Intake Worker Modal ── */}
      {showInviteModal && (
        <>
          <div className="fixed inset-0 z-50" style={{ backgroundColor: "rgba(0,0,0,0.5)" }} onClick={() => setShowInviteModal(false)}></div>
          <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
            <div className="bg-white rounded-xl shadow-xl w-[500px] p-6 pointer-events-auto">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-xl text-gray-900">Add Intake Worker</h3>
                  <p className="text-sm text-gray-500 mt-1">Enter email to generate registration link</p>
                </div>
                <button onClick={() => setShowInviteModal(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                  <X size={24} />
                </button>
              </div>
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-semibold text-gray-800">Email Address</label>
                  <input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="worker@example.com"
                    className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:border-green-700 text-gray-800 text-sm" />
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800">
                  A unique registration link will be generated. The link will expire in 7 days.
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button onClick={() => setShowInviteModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-semibold text-sm cursor-pointer">Cancel</button>
                <button
                  onClick={async () => {
                    if (!inviteEmail) { alert("Please enter an email address"); return; }
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
                  className="px-4 py-2 rounded-lg text-white font-semibold text-sm disabled:opacity-70 cursor-pointer"
                  style={{ backgroundColor: "#145228" }}>
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
