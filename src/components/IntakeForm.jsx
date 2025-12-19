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
import { db, storage } from "../firebase";
import { FaChevronDown } from "react-icons/fa6";
import { Upload, X } from "lucide-react";
import SignatureCanvas from "react-signature-canvas";
import { useParams, useSearchParams } from "react-router-dom";
import GoogleAddressInput from "./GoogleAddressInput";
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
      latitude: "",
      longitude: "",
      startDate: "",
      clientInfo: "",
      phone: "",
      email: "",
      photos: [], // per-client photos
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
  };
};

//
// ---------- component ----------
//

const IntakeForm = ({ mode = "add", isCaseWorker: propCaseWorker, user , id: propId,isEditable=true}) => {
  const [showServiceCalendar, setShowServiceCalendar] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [shiftCategories, setShiftCategories] = useState([]);
  const fileInputRef = useRef(null);
  const fileInputRefMedical = useRef(null);
  const hasResigned = useRef(false);

const [showServiceDropdown, setShowServiceDropdown] = useState(false);


  const previousServiceStart = useRef(null);

  const { id:paramId } = useParams();
  const [searchParams] = useSearchParams();
  const formType = searchParams.get("type");
  
  
  const intakeFormId = propId || paramId;
  // type can be "Intake Worker" or "Private Family"
  const urlCaseWorker = formType === "Intake Worker";
  const isCaseWorker = propCaseWorker ?? urlCaseWorker;

  // signature canvas ref
  const sigCanvas = useRef(null);

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
    // ================== SIGNATURE UPLOAD ==================
    let signatureURL = values.workerInfo.signature || "";

    if (
      sigCanvas.current &&
      hasResigned.current &&
      !sigCanvas.current.isEmpty()
    ) {
      const dataURL = sigCanvas.current
        .getTrimmedCanvas()
        .toDataURL("image/png");

      const res = await fetch(dataURL);
      const blob = await res.blob();

      const sigRef = ref(
        storage,
        `intake_signatures/${Date.now()}_${values.workerInfo.workerName}.png`
      );
      await uploadBytes(sigRef, blob);
      signatureURL = await getDownloadURL(sigRef);
    }

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

      isCaseWorker: !!isCaseWorker,
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
    sigCanvas.current?.clear();
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
      }
    }, [user, setFieldValue]);

  // derive sections visibility from selected service types
  const selectedServiceIds = values.services?.serviceType || [];

  const selectedServiceCategories = shiftCategories.filter((cat) =>
    selectedServiceIds.includes(cat.id)
  );

  const showTransportationSection = selectedServiceCategories.some((cat) =>
    (cat.name || "").toLowerCase().includes("transport")
  );

  const showVisitationSection = selectedServiceCategories.some((cat) => {
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
                      disabled={isCaseWorker}
                      className="border border-light-gray rounded-sm p-[8px] text-sm"
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

              {/* Services */}
              <div className="">
                <h3 className="font-bold text-[24px] text-light-black ">
                  Services
                </h3>
                <div className="grid grid-cols-3 gap-16 gap-y-4 bg-white p-4 border border-light-gray w-full rounded">
                  {/* Multi-select Service Type */}
      <div className="relative">
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
          return lowers !== "supervisitation + transportation" &&
                 lowers !== "supervisitation+transportation";
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

               {/* Service Start Time */}
<div>
  <label className="font-bold text-sm leading-5 tracking-normal text-light-black">
    Service Start Time
  </label>
  <Field
    name="services.serviceStartTime"
    type="time"
    className="w-full border border-light-gray rounded-sm p-[10px] text-sm"
  />
</div>

{/* Service End Time */}
<div>
  <label className="font-bold text-sm leading-5 tracking-normal text-light-black">
    Service End Time
  </label>
  <Field
    name="services.serviceEndTime"
    type="time"
    className="w-full border border-light-gray rounded-sm p-[10px] text-sm"
  />
</div>



                  <div className="col-span-3">
                    <label className="font-bold text-sm leading-5 tracking-normal text-light-black">
                      Safety Plan/Management Risk
                    </label>
                    <Field
                      as="textarea"
                      name="services.safetyPlan"
                      placeholder="Write down any risk or safety plan required for the plan"
                      className={`w-full border rounded-sm p-[10px] placeholder:text-[#72787E] placeholder:text-sm placeholder:font-normal h-50 ${
                        touched.services?.safetyPlan &&
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
                      setFieldValue("clients", [
                        ...values.clients,
                        {
                          fullName: "",
                          gender: "",
                          birthDate: "",
                          address: "",
                          latitude: "",
                          longtitude: "",
                          startDate: "",
                          clientInfo: "",
                          phone: "",
                          email: "",
                          photos: [],
                        },
                      ]);
                    }}
                    className="bg-dark-green text-white px-4 py-2 rounded-md text-sm mb-1"
                  >
                    + Add Sibling
                  </button>
                </div>

                <FieldArray name="clients">
                  {({ remove }) => (
                    <div className="flex flex-col gap-6">
                      {values.clients.map((client, index) => (
                        <div
                          key={index}
                          className="bg-white p-4 border border-light-gray rounded relative w-full"
                        >
                          <div className="flex justify-between items-center mb-3">
                            <h4 className="font-semibold text-lg text-light-black">
                              Client {index + 1}
                            </h4>
                            {values.clients.length > 1 && (
                              <button
                                type="button"
                                onClick={() => remove(index)}
                                className="text-red-500 font-semibold"
                              >
                                Remove
                              </button>
                            )}
                          </div>

                          <div className="grid grid-cols-3 gap-8 gap-y-4">
                            {/* client photo */}
                            <div className="col-span-3 mt-2">

                            {/* Hidden File Input */}
                            <input
                              id={`client-photo-input-${index}`}
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) =>
                                handleClientPhotosChange(e, index, values, setFieldValue)
                              }
                            />

                            {/* Round Photo + Buttons */}
                            <div className="flex items-center gap-7">
                              {/* Round Photo Display */}
                              <div className="w-22 h-22 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden border border-gray-300">
                                {values.clients[index].photos &&
                                values.clients[index].photos.length > 0 ? (
                                  <img
                                    src={
                                      typeof values.clients[index].photos[0] === "string"
                                        ? values.clients[index].photos[0]
                                        : URL.createObjectURL(values.clients[index].photos[0])
                                    }
                                    alt="Client"
                                    className="object-cover w-full h-full"
                                  />
                                ) : (
                                   <img src="/images/profile.jpeg" />
                                )}
                              </div>

                              {/* Buttons */}
                              <div className="flex gap-2">
                                <label
                                  htmlFor={`client-photo-input-${index}`}
                                  className="px-4 py-1.5 rounded-sm border-2 border-dark-green bg-dark-green text-white cursor-pointer text-sm"
                                >
                                  Add Photo
                                </label>

                                <button
                                  type="button"
                                  onClick={() => setFieldValue(`clients.${index}.photos`, [])}
                                  className="px-4 py-1.5 rounded-sm border-2 border-light-green text-light-green text-sm"
                                >
                                  Remove Photo
                                </button>
                              </div>
                            </div>
                          </div>

                            {/* Full Name */}
                            <div>
                              <label className="font-bold text-sm text-light-black">
                                Full Name
                              </label>
                              <Field
                                name={`clients.${index}.fullName`}
                                type="text"
                                placeholder="Enter client name"
                                className={`w-full border border-light-gray rounded-sm p-[10px] placeholder:text-[#72787E]  placeholder:text-sm placeholder:font-normal ${
                                  touched.clients?.[index]?.fullName &&
                                  errors.clients?.[index]?.fullName
                                    ? "border-red-500"
                                    : "border-light-gray"
                                }`}
                              />
                              <ErrorMessage
                                name={`clients.${index}.fullName`}
                                component="div"
                                className="text-red-500 text-xs mt-1"
                              />
                            </div>

                            {/* Gender */}
                            <div className="relative">
                              <label className="font-bold text-sm text-light-black">
                                Gender
                              </label>

                              <Field
                                as="select"
                                name={`clients.${index}.gender`}
                                className={`w-full border rounded-sm p-[10px] appearance-none pr-10 text-sm
                            ${
                              values?.clients?.[index]?.gender
                                ? "text-black"
                                : "text-[#72787E]"
                            }
                            border-light-gray
                          `}
                              >
                                <option
                                  value=""
                                  className="text-[#72787E] text-sm"
                                >
                                  Select Gender
                                </option>
                                <option
                                  value="male"
                                  className="text-black text-sm"
                                >
                                  Male
                                </option>
                                <option
                                  value="female"
                                  className="text-black text-sm"
                                >
                                  Female
                                </option>
                                <option
                                  value="other"
                                  className="text-black text-sm"
                                >
                                  Other
                                </option>
                              </Field>

                              <span className="absolute right-3 top-11 -translate-y-1/2 pointer-events-none">
                                <FaChevronDown className="text-light-green w-4 h-4" />
                              </span>
                            </div>

                            {/* Birth Date */}
                            <div>
                              <label className="font-bold text-sm text-light-black">
                                Date of Birth
                              </label>
                              <Field
                                name={`clients.${index}.birthDate`}
                                type="date"
                                className="w-full border border-light-gray rounded-sm p-[10px]  placeholder:text-[#72787E] placeholder:text-sm placeholder:font-normal"
                              />
                            </div>

                            {/* Address */}
                            <div>
                              <label className="font-bold text-sm text-light-black">
                                Address
                              </label>
                              <GoogleAddressInput
                                value={values.clients[index].address}
                                placeholder="Enter client address"
                                onChange={(val) =>
                                  setFieldValue(
                                    `clients.${index}.address`,
                                    val
                                  )
                                }
                                onLocationSelect={(loc) => {
                                  setFieldValue(
                                    `clients.${index}.latitude`,
                                    loc.lat
                                  );
                                  setFieldValue(
                                    `clients.${index}.longitude`,
                                    loc.lng
                                  );
                                }}
                              />
                            </div>

                            {/* Start Date */}
                            <div>
                              <label className="font-bold text-sm text-light-black">
                                Service Start Date
                              </label>
                              <Field
                                name={`clients.${index}.startDate`}
                                type="date"
                                className="w-full border border-light-gray rounded-sm p-[10px]  placeholder:text-[#72787E] placeholder:text-sm placeholder:font-normal"
                              />
                            </div>

                            {/* Client Info */}
                            <div className="col-span-3">
                              <label className="font-bold text-sm text-light-black">
                                Client Info
                              </label>
                              <Field
                                as="textarea"
                                name={`clients.${index}.clientInfo`}
                                placeholder="Write down any risk or safety plan required for the plan"
                                className={
                                  "w-full border border-light-gray rounded-sm p-[10px] placeholder:text-[#72787E] placeholder:text-sm placeholder:font-normal h-50"
                                }
                              />
                            </div>

                            
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
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
                        className={`w-full border rounded-sm p-[10px] placeholder:text-[#72787E] placeholder:text-sm placeholder:font-normal ${
                          touched.caseworkerName && errors.caseworkerName
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
                        className={`w-full border rounded-sm p-[10px] placeholder:text-[#72787E] placeholder:text-sm placeholder:font-normal ${
                          touched.caseworkerAgencyName && errors.caseworkerAgencyName
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
                        className={`w-full border rounded-sm p-[10px] placeholder:text-[#72787E] placeholder:text-sm placeholder:font-normal ${
                          touched.caseworkerPhone &&
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
                        className={`w-full border rounded-sm p-[10px] placeholder:text-[#72787E] placeholder:text-sm placeholder:font-normal ${
                          touched.caseworkerEmail &&
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
                  <h3 className="font-bold text-[24px] text-light-black">
                    Intake Worker Information
                  </h3>
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
                      setFieldValue("parentInfoList", [
                        ...values.parentInfoList,
                        {
                          clientName: "",
                          parentName: "",
                          relationShip: "",
                          parentPhone: "",
                          parentEmail: "",
                          parentAddress: "",
                        },
                      ]);
                    }}
                    className="bg-dark-green text-white px-4 py-2 rounded-md text-sm mb-1"
                  >
                    + Add Parent Info
                  </button>
                </div>

                <FieldArray name="parentInfoList">
                  {({ remove }) => (
                    <div className="flex flex-col gap-6">
                      {values.parentInfoList.map((parent, index) => (
                        <div
                          key={index}
                          className="bg-white p-4 border border-light-gray rounded relative w-full"
                        >
                          <div className="flex justify-between items-center mb-3">
                            <h4 className="font-semibold text-lg text-light-black">
                              Parent {index + 1}
                            </h4>
                            {values.parentInfoList.length > 1 && (
                              <button
                                type="button"
                                onClick={() => remove(index)}
                                className="text-red-500 font-semibold"
                              >
                                Remove
                              </button>
                            )}
                          </div>

                          <div className="grid grid-cols-3 gap-8 gap-y-4">
                            <div className="relative">
                              <label className="font-bold text-sm text-light-black">
                                Client Name
                              </label>

                              <Field
                                as="select"
                                name={`parentInfoList.${index}.clientName`}
                                value={values.parentInfoList[index].clientName}
                                className={`w-full border rounded-sm p-[10px] appearance-none pr-10
                    ${
                      values.parentInfoList[index].clientName
                        ? "text-black"
                        : "text-[#72787E] text-sm"
                    } border-light-gray`}
                                            >
                                <option
                                  value=""
                                  className="text-gray-400 text-sm"
                                >
                                  Select Client
                                </option>

                                {values.clients.map((client, i) => (
                                  <option
                                    key={i}
                                    value={client.fullName}
                                    className="text-black"
                                  >
                                    {client.fullName}
                                  </option>
                                ))}
                              </Field>

                              <span className="absolute right-3 top-11 -translate-y-1/2 pointer-events-none">
                                <FaChevronDown className="text-light-green w-4 h-4" />
                              </span>
                            </div>

                            <div>
                              <label className="font-bold text-sm text-light-black">
                                Parent Name
                              </label>
                              <Field
                                name={`parentInfoList.${index}.parentName`}
                                type="text"
                                placeholder="Enter parent name"
                                className="w-full border border-light-gray rounded-sm p-[10px] placeholder:text-sm"
                              />
                            </div>

                            <div>
                              <label className="font-bold text-sm text-light-black">
                                Relationship
                              </label>
                              <Field
                                name={`parentInfoList.${index}.relationShip`}
                                type="text"
                                placeholder="e.g. Father, Mother"
                                className="w-full border border-light-gray rounded-sm p-[10px] placeholder:text-sm"
                              />
                            </div>

                            <div>
                              <label className="font-bold text-sm text-light-black">
                                Phone
                              </label>
                              <Field
                                name={`parentInfoList.${index}.parentPhone`}
                                type="text"
                                placeholder="Enter Parent's phone number"
                                className="w-full border border-light-gray rounded-sm p-[10px] placeholder:text-sm"
                              />
                            </div>

                            <div>
                              <label className="font-bold text-sm text-light-black">
                                Email
                              </label>
                              <Field
                                name={`parentInfoList.${index}.parentEmail`}
                                type="email"
                                placeholder="Enter Parent's email"
                                className="w-full border border-light-gray rounded-sm p-[10px] placeholder:text-sm"
                              />
                            </div>

                            <div className="col-span-3">
                              <label className="font-bold text-sm text-light-black">
                                Address
                              </label>

                              <GoogleAddressInput
                                value={
                                  values.parentInfoList[index].parentAddress
                                }
                                placeholder="Enter address"
                                onChange={(val) =>
                                  setFieldValue(
                                    `parentInfoList.${index}.parentAddress`,
                                    val
                                  )
                                }
                                onLocationSelect={(loc) => {
                                  // If you also want lat/lng for parent
                                  setFieldValue(
                                    `parentInfoList.${index}.latitude`,
                                    loc.lat
                                  );
                                  setFieldValue(
                                    `parentInfoList.${index}.longitude`,
                                    loc.lng
                                  );
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
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
                      className={`w-full border rounded-sm p-[10px] placeholder:text-[#72787E] placeholder:text-sm placeholder:font-normal ${
                        touched.billingInfo?.invoiceEmail &&
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
                        className={`w-full border rounded-sm p-[10px] placeholder:text-[#72787E] placeholder:text-sm placeholder:font-normal pr-10 ${
                          touched.uploadDocs && errors.uploadDocs
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
                          {values.uploadDocs.map((file, index) => (
                            <li
                              key={index}
                              className="flex justify-between items-center bg-white border p-2 rounded shadow-sm"
                            >
                              <span className="text-sm truncate max-w-[70%]">
                                {file.name}
                              </span>
                              <button
                                type="button"
                                className="text-red-500 hover:text-red-700"
                                onClick={() => {
                                  const updatedFiles =
                                    values.uploadDocs.filter(
                                      (_, i) => i !== index
                                    );
                                  setFieldValue("uploadDocs", updatedFiles);
                                }}
                              >
                                <X size={18} />
                              </button>
                            </li>
                          ))}
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
                  <button
                    type="button"
                    onClick={() => {
                      setFieldValue("medicalInfoList", [
                        ...values.medicalInfoList,
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
                      ]);
                    }}
                    className="bg-dark-green text-white px-4 py-2 rounded-md text-sm mb-1"
                  >
                    + Add Medical Info
                  </button>
                </div>

                <FieldArray name="medicalInfoList">
                  {({ remove }) => (
                    <div className="flex flex-col gap-6">
                      {values.medicalInfoList.map((medical, index) => (
                        <div
                          key={index}
                          className="bg-white p-4 border border-light-gray rounded relative w-full"
                        >
                          <div className="flex justify-between items-center mb-3">
                            <h4 className="font-semibold text-lg text-light-black">
                              Medical Info {index + 1}
                            </h4>
                            {values.medicalInfoList.length > 1 && (
                              <button
                                type="button"
                                onClick={() => remove(index)}
                                className="text-red-500 font-semibold"
                              >
                                Remove
                              </button>
                            )}
                          </div>

                          <div className="grid grid-cols-3 gap-8 gap-y-4">
                            <div className="relative">
                              <label className="font-bold text-sm text-light-black">
                                Client Name
                              </label>

                              <Field
                                as="select"
                                name={`medicalInfoList.${index}.clientName`}
                                className={`w-full border rounded-sm p-[10px] appearance-none pr-10
                          ${
                            values.medicalInfoList[index].clientName
                              ? "text-black"
                              : "text-[#72787E] text-sm"
                          } border-light-gray`}
                                                  >
                                <option
                                  value=""
                                  className="text-sm text-gray-400"
                                >
                                  Select Client
                                </option>

                                {values.clients.map((client, i) => (
                                  <option
                                    key={i}
                                    value={client.fullName}
                                    className="text-black"
                                  >
                                    {client.fullName || `Client ${i + 1}`}
                                  </option>
                                ))}
                              </Field>

                              <span className="absolute right-3 top-11 -translate-y-1/2 pointer-events-none">
                                <FaChevronDown className="text-light-green w-4 h-4" />
                              </span>
                            </div>

                            <div>
                              <label className="font-bold text-sm text-light-black">
                                Health Care No.
                              </label>
                              <Field
                                name={`medicalInfoList.${index}.healthCareNo`}
                                type="text"
                                placeholder="Enter health care no"
                                className="w-full border border-light-gray rounded-sm p-[10px] placeholder:text-sm"
                              />
                            </div>

                            <div>
                              <label className="font-bold text-sm text-light-black">
                                Diagnosis
                              </label>
                              <Field
                                name={`medicalInfoList.${index}.diagnosis`}
                                type="text"
                                placeholder="Enter diagnosis"
                                className="w-full border border-light-gray rounded-sm p-[10px] placeholder:text-sm"
                              />
                            </div>

                            <div>
                              <label className="font-bold text-sm text-light-black">
                                Diagnosis Type
                              </label>
                              <Field
                                name={`medicalInfoList.${index}.diagnosisType`}
                                type="text"
                                placeholder="Enter Type of Diagnosis"
                                className="w-full border border-light-gray rounded-sm p-[10px] placeholder:text-sm"
                              />
                            </div>

                            <div className="col-span-3">
                              <label className="font-bold text-sm text-light-black">
                                Medical Concern
                              </label>
                              <Field
                                as="textarea"
                                name={`medicalInfoList.${index}.medicalConcern`}
                                placeholder="Enter Medical concerns"
                                className="w-full border border-light-gray rounded-sm p-[10px] placeholder:text-sm"
                              />
                            </div>

                            <div>
                              <label className="font-bold text-sm text-light-black">
                                Mobility Assistance
                              </label>
                              <Field
                                name={`medicalInfoList.${index}.mobilityAssistance`}
                                type="text"
                                placeholder="Yes/No"
                                className="w-full border border-light-gray rounded-sm p-[10px] placeholder:text-sm"
                              />
                            </div>

                            <div>
                              <label className="font-bold text-sm text-light-black">
                                Mobility Info
                              </label>
                              <Field
                                name={`medicalInfoList.${index}.mobilityInfo`}
                                type="text"
                                placeholder="Enter details"
                                className="w-full border border-light-gray rounded-sm p-[10px] placeholder:text-sm"
                              />
                            </div>

                            <div>
                              <label className="font-bold text-sm text-light-black">
                                Communication Aid
                              </label>
                              <Field
                                name={`medicalInfoList.${index}.communicationAid`}
                                type="text"
                                placeholder="Yes/No"
                                className="w-full border border-light-gray rounded-sm p-[10px] placeholder:text-sm"
                              />
                            </div>

                            <div className="col-span-3">
                              <label className="font-bold text-sm text-light-black">
                                Communication Info
                              </label>
                              <Field
                                as="textarea"
                                name={`medicalInfoList.${index}.communicationInfo`}
                                placeholder="Enter communication details"
                                className="w-full border border-light-gray rounded-sm p-[10px] placeholder:text-sm"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
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
                        setFieldValue("transportationInfoList", [
                          ...values.transportationInfoList,
                          {
                            clientName: "",
                            pickupAddress: "",
                            dropoffAddress: "",
                            pickupTime: "",
                            dropOffTime: "",
                            transportationOverview: "",
                            carSeatType: "",
                          },
                        ]);
                      }}
                      className="bg-dark-green text-white px-4 py-2 rounded-md text-sm mb-1"
                    >
                      + Add Transportation Info
                    </button>
                  </div>

                  <FieldArray name="transportationInfoList">
                    {({ remove }) => (
                      <div className="flex flex-col gap-6">
                        {values.transportationInfoList.map((trans, index) => (
                          <div
                            key={index}
                            className="bg-white p-4 border border-light-gray rounded relative w-full"
                          >
                            <div className="flex justify-between items-center mb-3">
                              <h4 className="font-semibold text-lg text-light-black">
                                Transportation {index + 1}
                              </h4>
                              {values.transportationInfoList.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => remove(index)}
                                  className="text-red-500 font-semibold"
                                >
                                  Remove
                                </button>
                              )}
                            </div>

                            <div className="grid grid-cols-3 gap-8 gap-y-4">
                              <div className="relative">
                                <label className="font-bold text-sm text-light-black">
                                  Client Name
                                </label>

                               <Field
                                        as="select"
                                        name={`transportationInfoList.${index}.clientName`}
                                        value={values.transportationInfoList[index].clientName}
                                        onChange={(e) => {
                                          const selectedName = e.target.value;
                                          setFieldValue(
                                            `transportationInfoList.${index}.clientName`,
                                            selectedName
                                          );

                                          const client = values.clients.find(
                                            (c) => c.fullName === selectedName
                                          );

                                          if (client?.birthDate) {
                                            const age = calculateAgeYears(client.birthDate);
                                            const seat = deriveCarSeatFromAge(age);
                                            // pre-fill but keep editable
                                            setFieldValue(
                                              `transportationInfoList.${index}.carSeatRequired`,
                                              seat.required
                                            );
                                            setFieldValue(
                                              `transportationInfoList.${index}.carSeatType`,
                                              seat.type
                                            );
                                          }
                                        }}
                                        className={`w-full border rounded-sm p-[10px] appearance-none pr-10
                                          ${
                                            values.transportationInfoList[index].clientName
                                              ? "text-black"
                                              : "text-[#72787E] text-sm"
                                          } border-light-gray`}
                                      >
                                        <option value="" className="text-sm text-gray-400">
                                          Select Client
                                        </option>

                                        {values.clients.map((client, i) => (
                                          <option
                                            key={i}
                                            value={client.fullName}
                                            className="text-black"
                                          >
                                            {client.fullName || `Client ${i + 1}`}
                                          </option>
                                        ))}
                                      </Field>


                                <span className="absolute right-3 top-11 -translate-y-1/2 pointer-events-none">
                                  <FaChevronDown className="text-light-green w-4 h-4" />
                                </span>
                              </div>

                             <div>
                              <label className="font-bold text-sm text-light-black">
                                Pickup Address
                              </label>

                              <GoogleAddressInput
                                value={values.transportationInfoList[index].pickupAddress}
                                placeholder="Enter pickup address"
                                onChange={(val) =>
                                  setFieldValue(
                                    `transportationInfoList.${index}.pickupAddress`,
                                    val
                                  )
                                }
                              />
                            </div>


                             <div>
                                <label className="font-bold text-sm text-light-black">
                                  Dropoff Address
                                </label>

                                <GoogleAddressInput
                                  value={values.transportationInfoList[index].dropoffAddress}
                                  placeholder="Enter dropoff address"
                                  onChange={(val) =>
                                    setFieldValue(
                                      `transportationInfoList.${index}.dropoffAddress`,
                                      val
                                    )
                                  }
                                />
                              </div>


                              <div>
                                <label className="font-bold text-sm text-light-black">
                                  Pickup Time
                                </label>
                                <Field
                                  name={`transportationInfoList.${index}.pickupTime`}
                                  type="time"
                                  className="w-full border border-light-gray rounded-sm p-[10px]  placeholder:text-sm"
                                />
                              </div>

                              <div>
                                <label className="font-bold text-sm text-light-black">
                                  Dropoff Time
                                </label>
                                <Field
                                  name={`transportationInfoList.${index}.dropOffTime`}
                                  type="time"
                                  className="w-full border border-light-gray rounded-sm p-[10px]"
                                />
                              </div>
                               {/* Car Seat Required */}
                              <div>
                                <label className="font-bold text-sm text-light-black">
                                  Car Seat Required
                                </label>
                                <Field
                                  as="select"
                                  name={`transportationInfoList.${index}.carSeatRequired`}
                                  className="w-full border border-light-gray rounded-sm p-[10px] text-sm"
                                >
                                  <option value="">Select</option>
                                  <option value="yes">Yes</option>
                                  <option value="no">No</option>
                                </Field>
                              </div>


                              {trans.carSeatRequired === "yes" && (
                                <div>
                                  <label className="font-bold text-sm text-light-black">
                                    Car Seat Type
                                  </label>
                                  <Field
                                    as="select"
                                    name={`transportationInfoList.${index}.carSeatType`}
                                    value={trans.carSeatType}

                                    className="w-full border border-light-gray rounded-sm p-[10px] text-sm"
                                  >
                                    <option value="">Select seat type</option>
                                    <option value="Rear-facing seat">
                                      Rear-facing seat
                                    </option>
                                    <option value="Forward-facing seat">
                                      Forward-facing seat
                                    </option>
                                    <option value="Booster seat">
                                      Booster seat
                                    </option>
                                    <option value="Seat belt only">
                                      Seat belt only
                                    </option>
                                  </Field>
                                </div>
                              )}

                              <div className="col-span-3">
                                <label className="font-bold text-sm text-light-black">
                                  Transportation Overview
                                </label>
                                <Field
                                  as="textarea"
                                  name={`transportationInfoList.${index}.transportationOverview`}
                                  placeholder="Add transportation Overview"
                                  className="w-full border border-light-gray rounded-sm p-[10px]  placeholder:text-sm"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
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
                        setFieldValue("supervisedVisitations", [
                          ...values.supervisedVisitations,
                          {
                            clientName: "",
                            visitStartTime: "",
                            visitEndTime: "",
                            visitDuration: "",
                            visitPurpose: "",
                            visitAddress: "",
                            visitOverview: "",
                          },
                        ]);
                      }}
                      className="bg-dark-green text-white px-4 py-2 rounded-md text-sm mb-1"
                    >
                      + Add Supervised Visitation
                    </button>
                  </div>

                  <FieldArray name="supervisedVisitations">
                    {({ remove }) => (
                      <div className="flex flex-col gap-6">
                        {values.supervisedVisitations.map((visit, index) => (
                          <div
                            key={index}
                            className="bg-white p-4 border border-light-gray rounded relative w-full"
                          >
                            <div className="flex justify-between items-center mb-3">
                              <h4 className="font-semibold text-lg text-light-black">
                                Supervised Visitation {index + 1}
                              </h4>
                              {values.supervisedVisitations.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => remove(index)}
                                  className="text-red-500 font-semibold"
                                >
                                  Remove
                                </button>
                              )}
                            </div>

                            <div className="grid grid-cols-3 gap-8 gap-y-4">
                              <div className="relative">
                                <label className="font-bold text-sm text-light-black">
                                  Client Name
                                </label>

                                <Field
                                  as="select"
                                  name={`supervisedVisitations.${index}.clientName`}
                                  className={`w-full border rounded-sm p-[10px] appearance-none pr-10
                    ${
                      values.supervisedVisitations[index].clientName
                        ? "text-black"
                        : "text-[#72787E] text-sm"
                    } border-light-gray`}
                                >
                                  <option
                                    value=""
                                    className="text-sm text-gray-400"
                                  >
                                    Select Client
                                  </option>

                                  {values.clients.map((client, i) => (
                                    <option
                                      key={i}
                                      value={client.fullName || client.name}
                                    >
                                      {client.fullName ||
                                        client.name ||
                                        `Client ${i + 1}`}
                                    </option>
                                  ))}
                                </Field>

                                <span className="absolute right-3 top-11 -translate-y-1/2 pointer-events-none">
                                  <FaChevronDown className="text-light-green w-4 h-4" />
                                </span>
                              </div>

                              <div>
                                <label className="font-bold text-sm text-light-black">
                                  Visit Start Time
                                </label>
                                <Field
                                  name={`supervisedVisitations.${index}.visitStartTime`}
                                  type="time"
                                  className="w-full border border-light-gray rounded-sm p-[10px]"
                                />
                              </div>

                              <div>
                                <label className="font-bold text-sm text-light-black">
                                  Visit End Time
                                </label>
                                <Field
                                  name={`supervisedVisitations.${index}.visitEndTime`}
                                  type="time"
                                  className="w-full border border-light-gray rounded-sm p-[10px]"
                                />
                              </div>

                              <div>
                                <label className="font-bold text-sm text-light-black">
                                  Visit Duration
                                </label>
                                <Field
                                  name={`supervisedVisitations.${index}.visitDuration`}
                                  type="text"
                                  placeholder="Enter visit duration"
                                  className="w-full border border-light-gray rounded-sm p-[10px] placeholder:text-sm"
                                />
                              </div>

                              <div>
                                <label className="font-bold text-sm text-light-black">
                                  Purpose of Visit
                                </label>
                                <Field
                                  name={`supervisedVisitations.${index}.visitPurpose`}
                                  type="text"
                                  placeholder="Enter purpose of visit"
                                  className="w-full border border-light-gray rounded-sm p-[10px] placeholder:text-sm"
                                />
                              </div>

                              <div>
                                <label className="font-bold text-sm text-light-black">
                                  Visit Address
                                </label>

                                <GoogleAddressInput
                                  value={values.supervisedVisitations[index].visitAddress}
                                  placeholder="Enter visit address"
                                  onChange={(val) =>
                                    setFieldValue(
                                      `supervisedVisitations.${index}.visitAddress`,
                                      val
                                    )
                                  }
                                />
                              </div>


                              <div className="col-span-3">
                                <label className="font-bold text-sm text-light-black">
                                  Visit Overview
                                </label>
                                <Field
                                  as="textarea"
                                  name={`supervisedVisitations.${index}.visitOverview`}
                                  placeholder="Write down the visit overview"
                                  className="w-full border border-light-gray rounded-sm p-[10px] placeholder:text-sm"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
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
                        ? "Worker Signature"
                        : "Parent/Guardian Signature"}
                    </label>

                    <div className="border rounded-sm mt-1 relative border-light-gray ">
                      <SignatureCanvas
                        ref={sigCanvas}
                        
                        penColor="black"
                        backgroundColor="#ffffff"
                        canvasProps={{
                          width: 400,
                          height: 120,
                          className: "rounded-md",
                        }}
                        minWidth={0.4}
                        maxWidth={1.0}
                        velocityFilterWeight={0.7}
                        onBegin={() => {
                          hasResigned.current = true;   // ✅ user started drawing
                        }}
                      />

                      <button
                        type="button"
                        onClick={() => {
                          if (sigCanvas.current) sigCanvas.current.clear();
                          setFieldValue("workerInfo.signature", "");
                        }}
                        className="absolute top-1 right-1 px-2 py-1 text-sm bg-gray-200 rounded hover:bg-gray-300"
                      >
                        Clear
                      </button>
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
      
    </div>
  );
};

export default IntakeForm;
