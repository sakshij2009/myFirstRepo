import React, { useState, useRef, useEffect } from "react";
import { collection, addDoc, serverTimestamp, doc, setDoc, getDocs, query, where, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage, COLLECTION_NEW_INTAKES } from "../firebase";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Check, Plus, X, Upload, Pen, Trash2, ArrowLeft, ShieldCheck, Lock, CreditCard, FileText, Users, AlertCircle } from "lucide-react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { formatLocalISO } from "../utils/dateHelpers";
import PlacesAutocomplete from "./PlacesAutocomplete";

const GREEN = "#1f6f43";

// ── Step definitions ───────────────────────────────────────────────────────
const STEPS = [
  { id: 1,  short: "Contact Info",          sub: "Your details & other parent" },
  { id: 2,  short: "Children & Service",    sub: "Children info & visit details" },
  { id: 3,  short: "Court & Welfare",       sub: "Legal & caseworker info" },
  { id: 4,  short: "Needs & Safety",        sub: "Special needs & safety" },
  { id: 5,  short: "Contacts & Info",       sub: "Emergency & additional" },
  { id: 6,  short: "Payment",               sub: "Rates & payment details" },
  { id: 7,  short: "Engagement Protocols",  sub: "Visit protocols & guidelines" },
  { id: 8,  short: "Review & Submit",       sub: "Review & sign application" },
];

const REFERRAL_SOURCES = ["Self-referral","CFS / Child & Family Services","School","Healthcare Provider","Court Order","Legal Aid","Community Organization","Other"];
const RELATIONSHIPS = ["Mother","Father","Grandmother","Grandfather","Aunt","Uncle","Legal Guardian","Foster Parent","Other"];
const PROVINCES = ["Alberta","British Columbia","Manitoba","New Brunswick","Newfoundland and Labrador","Nova Scotia","Ontario","Prince Edward Island","Quebec","Saskatchewan","Northwest Territories","Nunavut","Yukon"];
const SERVICE_TYPES = [
  { value: "Respite Care", desc: "temporary care for the child" },
  { value: "Emergent Care", desc: "urgent / emergency care for the child" },
  { value: "Transportation", desc: "assistance with travel to and from visits" },
  { value: "Supervised Visitation", desc: "visits monitored by trained staff" },
];
const VISIT_FREQUENCIES = ["Weekly", "Bi-weekly", "Monthly", "As needed", "Other"];
const VISIT_DURATIONS = ["2 hours", "3 hours", "4 hours", "5 hours", "6 hours", "7 hours", "8 hours"];
const VISIT_LOCATIONS = ["Family Forever Office", "Community Location", "Client Home", "Public Place", "Other"];
const PAYMENT_RESPONSIBILITY = ["Applicant (me)", "Other Parent / Guardian", "Shared (50/50)", "Third Party / Agency", "Other"];
const PAYMENT_METHODS = ["E-Transfer", "Credit Card", "Debit", "Cheque", "Cash", "Other"];
const GENDERS = ["Male","Female","Non-binary","Prefer not to say"];
const CUSTODY_OPTIONS = ["Sole Custody","Shared Custody","Court-Ordered Visitation","Informal Arrangement","Other"];

const PROTOCOLS_LIST = [
  {
    num: 1,
    title: "Attendance and Scheduling",
    bullets: [
      "Participants must arrive on time and remain for the approved visit duration.",
      "Any inability to attend or request for changes must be communicated to the supervisor as soon as reasonably possible.",
      "Late arrivals may result in shortened or cancelled visits at the agency's discretion."
    ]
  },
  {
    num: 2,
    title: "Conduct and Professional Interaction",
    bullets: [
      "All participants are expected to behave respectfully and appropriately toward the child, staff, and other parties.",
      "Aggressive, confrontational, abusive, or disrespectful behaviour—verbal or physical—will not be tolerated.",
      "Concerns or feedback must be raised calmly and through appropriate channels."
    ]
  },
  {
    num: 3,
    title: "Compliance With Supervision",
    bullets: [
      "Participants must follow all instructions provided by the supervising staff.",
      "Limits placed on activities, interaction, or movement must be respected at all times.",
      "Supervisors have the authority to intervene, redirect, or end a visit where necessary."
    ]
  },
  {
    num: 4,
    title: "Child Safety and Well-Being",
    bullets: [
      "The emotional and physical safety of the child is the primary focus of all visits.",
      "Participants must act in a manner that supports the child's comfort, security, and developmental needs.",
      "All agency emergency procedures must be followed without exception."
    ]
  },
  {
    num: 5,
    title: "Communication Standards",
    bullets: [
      "Conversations must remain age-appropriate, supportive, and child-focused.",
      "Adult matters, legal issues, conflicts, or distressing topics must not be discussed in the child's presence.",
      "Language must be respectful, non-derogatory, and appropriate and English at all times."
    ]
  },
  {
    num: 6,
    title: "Physical Boundaries",
    bullets: [
      "Physical contact with the child must be appropriate, minimal, and consistent with supervision guidelines, court orders, and the child's comfort level.",
      "Physical contact with staff or supervisors is strictly prohibited."
    ]
  },
  {
    num: 7,
    title: "Activities and Materials",
    bullets: [
      "Only activities approved by the supervisor may occur during visits.",
      "Unsafe, inappropriate, or unapproved activities or materials are not permitted.",
      "All toys, books, and materials must be age-appropriate and suitable for supervised settings."
    ]
  },
  {
    num: 8,
    title: "Substance Use",
    bullets: [
      "Attendance under the influence of alcohol, drugs, or impairing substances is strictly prohibited.",
      "If impairment is suspected, the supervisor may immediately terminate the visit."
    ]
  },
  {
    num: 9,
    title: "Confidentiality and Privacy",
    bullets: [
      "Confidential or sensitive information must not be discussed in the presence of the child.",
      "Visit details must not be shared outside authorized or legally required reporting channels."
    ]
  },
  {
    num: 10,
    title: "Photography and Recording",
    bullets: [
      "Audio or video recording of visits is prohibited unless expressly authorized in writing by the agency.",
      "Photography of staff, supervisors, or other individuals is not permitted."
    ]
  },
  {
    num: 11,
    title: "Supervision Proximity",
    bullets: [
      "Supervising staff will remain within appropriate proximity throughout the visit to ensure safety and compliance.",
      "This level of supervision is mandatory for all supervised visits."
    ]
  },
  {
    num: 12,
    title: "Supervisor's Role and Documentation",
    bullets: [
      "Supervisors provide neutral oversight and objective documentation.",
      "Requests for biased, altered, or opinion-based reporting will not be accepted.",
      "All records reflect factual observations only."
    ]
  },
  {
    num: 13,
    title: "Reporting Concerns",
    bullets: [
      "Any concerns must be raised respectfully with the supervisor or through designated agency channels.",
      "Issues should not be discussed during the visit in a manner that impacts the child."
    ]
  },
  {
    num: 14,
    title: "Legal Compliance",
    bullets: [
      "All visits must comply with applicable court orders, legal agreements, and statutory requirements."
    ]
  }
];

const emptyChild = () => ({ fullName: "", dob: "", gender: "", custody: "", custodyWith: "", photo: null, photoPreview: "" });
const emptyEmergency = () => ({ fullName: "", relationship: "", phone: "" });

// ── Reusable field components ──────────────────────────────────────────────
const Label = ({ children, required }) => (
  <label className="block text-sm font-semibold text-gray-700 mb-1">
    {children}{required && <span className="text-red-500 ml-1">*</span>}
  </label>
);

const Input = ({ label, required, ...props }) => (
  <div className="mb-4">
    {label && <Label required={required}>{label}</Label>}
    <input
      {...props}
      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-700"
    />
  </div>
);

const Textarea = ({ label, required, ...props }) => (
  <div className="mb-4">
    {label && <Label required={required}>{label}</Label>}
    <textarea
      rows={3}
      {...props}
      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-700 resize-none"
    />
  </div>
);

const Select = ({ label, required, options, placeholder, value, onChange }) => (
  <div className="mb-4">
    {label && <Label required={required}>{label}</Label>}
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-700 bg-white"
    >
      <option value="">{placeholder || "Select..."}</option>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  </div>
);

const Radio = ({ label, options, value, onChange }) => (
  <div className="mb-4">
    {label && <Label>{label}</Label>}
    <div className="flex flex-wrap gap-4 mt-1">
      {options.map(o => (
        <label key={o} className="flex items-center gap-2 cursor-pointer text-sm">
          <input
            type="radio"
            value={o}
            checked={value === o}
            onChange={() => onChange(o)}
            className="accent-green-800 w-4 h-4"
          />
          {o}
        </label>
      ))}
    </div>
  </div>
);

const FileUpload = ({ label, hint, fileRef, file, onChange }) => (
  <div className="mb-4">
    {label && <Label>{label}</Label>}
    {hint && <p className="text-xs text-gray-500 mb-2">{hint}</p>}
    <div
      className="border border-dashed border-gray-300 rounded-lg p-4 flex flex-col items-center cursor-pointer hover:border-green-600 transition"
      onClick={() => fileRef?.current?.click()}
    >
      <Upload size={22} className="text-gray-400 mb-2" />
      <p className="text-xs text-gray-500">
        {file ? (
          <span className="text-green-700 font-semibold">{file.name}</span>
        ) : (
          "Click to upload — PDF, JPG, or PNG accepted"
        )}
      </p>
      <input
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        className="hidden"
        ref={fileRef}
        onChange={e => onChange(e.target.files[0])}
      />
    </div>
  </div>
);

const SectionCard = ({ num, title, subtitle, children, confidential }) => (
  <div className={`bg-white rounded-xl border border-gray-200 p-6 mb-6 ${confidential ? "border-amber-200 shadow-sm shadow-amber-50" : ""}`}>
    {confidential && (
      <div className="flex items-center gap-2 mb-4 px-3 py-1.5 bg-amber-50 border border-amber-100 rounded-lg text-amber-700 text-[10px] font-bold uppercase tracking-wider">
        <Lock size={12} /> Confidential – Not disclosed to the other party
      </div>
    )}
    <div className="flex items-center gap-3 mb-5">
      {num && (
        <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-base font-bold flex-shrink-0" style={{ background: GREEN }}>
          {num}
        </div>
      )}
      <div>
        <h3 className="text-lg font-semibold" style={{ color: GREEN }}>{title}</h3>
        {subtitle && <p className="text-sm text-gray-500 mt-0.5 whitespace-pre-line">{subtitle}</p>}
      </div>
    </div>
    {children}
  </div>
);

// ── Rate card (Service Rates & Fees) ───────────────────────────────────────
const RateCard = ({ title, rows }) => (
  <div className="border border-gray-200 rounded-xl p-4">
    <p className="text-sm font-semibold mb-3" style={{ color: GREEN }}>{title}</p>
    <div className="space-y-1.5">
      {rows.map(([label, val], i) => (
        <div key={i} className={`flex justify-between gap-3 text-xs ${label.startsWith("  ") ? "text-gray-400 italic" : "text-gray-600"}`}>
          <span>{label.trim()}</span>
          {val && <span className="font-semibold text-gray-800 whitespace-nowrap">{val}</span>}
        </div>
      ))}
    </div>
  </div>
);

// ── Age from DOB ───────────────────────────────────────────────────────────
const calcAge = (dob) => {
  if (!dob) return "";
  const d = new Date(dob);
  const today = new Date();
  let y = today.getFullYear() - d.getFullYear();
  let m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) { y--; m += 12; }
  if (y < 0) return "";
  if (y === 0) return `${m}m`;
  return m > 0 ? `${y}y ${m}m` : `${y}y`;
};

// ── Visit Dates Calendar (multi-select, next 6 months) ─────────────────────
const CAL_MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const CAL_DAYS = ["Su","Mo","Tu","We","Th","Fr","Sa"];
const VisitDatesCalendar = ({ selected = [], onToggle }) => {
  const [view, setView] = useState(new Date());
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const maxDate = new Date(); maxDate.setMonth(maxDate.getMonth() + 6); maxDate.setHours(23, 59, 59, 999);
  const y = view.getFullYear(), m = view.getMonth();
  const firstDay = new Date(y, m, 1).getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const iso = (d) => `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="border border-gray-200 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <button type="button" onClick={() => setView(new Date(y, m - 1, 1))}
          className="w-7 h-7 rounded-md border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50">‹</button>
        <span className="text-sm font-semibold text-gray-700">{CAL_MONTHS[m]} {y}</span>
        <button type="button" onClick={() => setView(new Date(y, m + 1, 1))}
          className="w-7 h-7 rounded-md border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50">›</button>
      </div>
      <div className="grid grid-cols-7 text-center text-[11px] font-semibold text-gray-400 mb-1">
        {CAL_DAYS.map(d => <div key={d}>{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          if (d === null) return <div key={`e${i}`} />;
          const dateObj = new Date(y, m, d); dateObj.setHours(0, 0, 0, 0);
          const di = iso(d);
          const disabled = dateObj < today || dateObj > maxDate;
          const sel = selected.includes(di);
          return (
            <button key={di} type="button" disabled={disabled} onClick={() => onToggle(di)}
              className={`h-9 rounded-lg text-sm transition-colors ${disabled ? "text-gray-300 cursor-not-allowed" : sel ? "text-white" : "text-gray-700 hover:bg-gray-100"}`}
              style={sel ? { background: GREEN } : {}}>
              {d}
            </button>
          );
        })}
      </div>
    </div>
  );
};

// ── Main Form Component ────────────────────────────────────────────────────
const PrivateFamilyIntakeForm = ({ user, onSubmitSuccess }) => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState({});
  const [completedSteps, setCompletedSteps] = useState([]);
  const [formId, setFormId] = useState(null);
  const [partyType, setPartyType] = useState("A"); // "A" or "B"

  const fileInputRefs = useRef({});
  const courtOrderFileRef = useRef(null);

  // ── Form state ──────────────────────────────────────────────────────────
  const [form, setForm] = useState({
    // Part A: Shared Case Info
    applicationDate: formatLocalISO(new Date()),
    referralSource: "",
    referralSourceOther: "",
    children: [emptyChild()],
    courtOrder: "",
    courtOrderFile: null,
    childWelfareInvolvement: "",
    visitType: "",
    visitGoals: "",
    schedulingPreferences: "",
    approvedVisitors: "",
    safetyConcerns: "",

    // Type of Service Required + Requested Visit Schedule
    serviceTypes: [],
    requestedFrequency: "",
    requestedDuration: "",
    visitLocation: "",
    preferredTimes: "",
    preferredVisitDates: [],

    // Needs & Safety (Step 4)
    specialNeeds: "",
    allergies: "",
    currentMedications: "",
    domesticViolence: "",
    additionalInfo: "",

    // Payment (Step 6)
    paymentResponsibility: "",
    paymentMethod: "",
    paymentNotes: "",
    payAckRates: false,
    payAck48h: false,
    payAckCancellation: false,

    // Part B/C: Party Confidential Profile (Dynamic) — Applicant Information
    fullName: "",
    address: "",
    streetAddress: "",
    streetAddress2: "",
    city: "",
    province: "Alberta",
    postalCode: "",
    phone: "",
    cellPhone: "",
    email: user?.email || "",
    relationship: "",
    relationshipOther: "",
    emergencyContact: emptyEmergency(),   // #1 — custodial parent (required)
    emergencyContact2: emptyEmergency(),  // #2 — optional backup

    // Other Parent / Guardian Information
    otherParentName: "",
    otherParentStreetAddress: "",
    otherParentStreet2: "",
    otherParentCity: "",
    otherParentProvince: "Alberta",
    otherParentPostalCode: "",
    otherParentCellPhone: "",
    otherParentEmail: "",
    otherParentRelationship: "",
    
    // Part D: Payment
    paymentOption: "",
    responsibleParty: "", // For Option 1
    thirdPartyName: "",
    costSplit: "50/50", // For Option 2
    costSplitDetail: "",
    thirdPartyPayer: "", // For Option 3
    billingContact: "",

    // Reports
    reportAckPayable: false,

    // Signature
    signatureDataUrl: "",
    signerName: "",
    signerDate: formatLocalISO(new Date()),

    // Protocols
    protocolAcknowledged: false,
    protocolName: "",
    protocolDate: formatLocalISO(new Date()),
    partyA_signed: false,
    partyB_signed: false,
  });

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }));

  // ── Initial Fetch ───────────────────────────────────────────────────────
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // 1. Determine if current user is Party A or B
        const qInv = query(collection(db, "dev_parentInvites"), where("primaryEmail", "==", user?.email?.toLowerCase()));
        const snapInv = await getDocs(qInv);
        
        let targetParty = "A";
        if (snapInv.empty) {
           const qInv2 = query(collection(db, "dev_parentInvites"), where("secondParentEmail", "==", user?.email?.toLowerCase()));
           const snapInv2 = await getDocs(qInv2);
           if (!snapInv2.empty) targetParty = "B";
        }
        setPartyType(targetParty);

        // 2. Load existing intake form
        const qForm = query(collection(db, COLLECTION_NEW_INTAKES), where("formType", "==", "private"));
        const snapForm = await getDocs(qForm);
        
        const existing = snapForm.docs.find(d => {
           const data = d.data();
           return (data.partyA_email === user?.email?.toLowerCase() || data.partyB_email === user?.email?.toLowerCase() || data.applicantEmail === user?.email?.toLowerCase() || data.secondaryParentEmail === user?.email?.toLowerCase());
        });

        if (existing) {
          const data = { id: existing.id, ...existing.data() };
          setFormId(existing.id);
          
          // Map data to local state
          const partyData = targetParty === "A" ? data.partyA : data.partyB;
          const shared = data.shared || {};
          
          setForm(prev => ({
            ...prev,
            ...shared,
            ...(partyData || {}),
            paymentOption: data.payment?.option || "",
            responsibleParty: data.payment?.responsibleParty || "",
            thirdPartyName: data.payment?.thirdPartyName || "",
            costSplit: data.payment?.costSplit || "50/50",
            costSplitDetail: data.payment?.costSplitDetail || "",
            thirdPartyPayer: data.payment?.thirdPartyPayer || "",
            billingContact: data.payment?.billingContact || "",
            reportAckPayable: data.reports?.acknowledged || false,
            partyA_signed: !!data.partyA?.signature,
            partyB_signed: !!data.partyB?.signature,
            signerName: partyData?.fullName || prev.signerName,
            protocolAcknowledged: partyData?.protocolAcknowledged || false,
            protocolName: partyData?.protocolName || partyData?.fullName || "",
            protocolDate: partyData?.protocolDate || prev.protocolDate || formatLocalISO(new Date()),
            signatureDataUrl: partyData?.signature || "",
          }));
        }
      } catch (err) {
        console.error("Error fetching intake data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  // ── Validation per step ─────────────────────────────────────────────────
  const validate = () => {
    const e = {};
    if (step === 1) {
      if (!form.fullName.trim()) e.fullName = "Full legal name is required";
      if (!form.email.trim()) e.email = "Email is required";
      if (!form.relationship) e.relationship = "Relationship is required";
    }
    if (step === 2) {
      if (!form.children[0].fullName.trim()) e.child0 = "At least one child name is required";
    }
    if (step === 3) {
      if (!form.courtOrder) e.courtOrder = "Please answer the court order question";
      if (!form.childWelfareInvolvement) e.childWelfareInvolvement = "Please answer the child welfare question";
    }
    if (step === 5) {
      if (!form.emergencyContact.fullName.trim() || !form.emergencyContact.relationship.trim() || !form.emergencyContact.phone.trim())
        e.emergencyContact = "Custodial parent emergency contact (name, relationship, phone) is required";
    }
    if (step === 6) {
      if (!form.paymentOption) e.paymentOption = "Please select a payment option";
    }
    if (step === 7) {
      if (!form.protocolAcknowledged) e.protocol = "You must acknowledge the protocols";
      if (!form.protocolName?.trim()) e.protocolName = "Name is required";
      if (!form.protocolDate?.trim()) e.protocolDate = "Date is required";
    }
    if (step === 8) {
      if (!form.signerName?.trim()) e.signerName = "Printed name is required";
      if (!form.signerDate?.trim()) e.signerDate = "Date is required";
      if (!form.signatureDataUrl?.trim()) e.signature = "Signature is required";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = () => { if (validate()) { setCompletedSteps([...new Set([...completedSteps, step])]); setStep(s => s + 1); } };
  const back = () => { setErrors({}); setStep(s => s - 1); };

  // ── Handlers ────────────────────────────────────────────────────────────
  const addChild = () => set("children", [...form.children, emptyChild()]);
  const removeChild = (i) => set("children", form.children.filter((_, idx) => idx !== i));
  const updateChild = (i, field, val) => {
    const updated = [...form.children];
    updated[i] = { ...updated[i], [field]: val };
    set("children", updated);
  };
  const updateEC = (field, val) => set("emergencyContact", { ...form.emergencyContact, [field]: val });
  const updateEC2 = (field, val) => set("emergencyContact2", { ...form.emergencyContact2, [field]: val });

  const clearSignature = () => { set("signatureDataUrl", ""); };

  // ── Submit ───────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      // 1. Upload signature/files if needed
      let courtOrderDocUrl = form.courtOrderDocUrl || "";
      if (form.courtOrderFile) {
        const coRef = ref(storage, `private_family_forms/court_orders/${Date.now()}_${form.courtOrderFile.name}`);
        await uploadBytes(coRef, form.courtOrderFile);
        courtOrderDocUrl = await getDownloadURL(coRef);
      }

      // Combined single-line address (for legacy readers) from the split fields
      const combinedAddress = [form.streetAddress, form.streetAddress2, form.city, form.province, form.postalCode]
        .filter(Boolean).join(", ") || form.address;

      const partyData = {
        fullName: form.fullName,
        address: combinedAddress,
        streetAddress: form.streetAddress,
        streetAddress2: form.streetAddress2,
        city: form.city,
        province: form.province,
        postalCode: form.postalCode,
        phone: form.cellPhone || form.phone,
        cellPhone: form.cellPhone,
        email: form.email,
        relationship: form.relationship,
        relationshipOther: form.relationshipOther,
        emergencyContact: form.emergencyContact,
        emergencyContact2: form.emergencyContact2,
        signature: form.signatureDataUrl,
        signedAt: serverTimestamp(),
        protocolAcknowledged: form.protocolAcknowledged,
        protocolName: form.protocolName,
        protocolDate: form.protocolDate,
        // Other parent / guardian
        otherParent: {
          fullName: form.otherParentName,
          streetAddress: form.otherParentStreetAddress,
          streetAddress2: form.otherParentStreet2,
          city: form.otherParentCity,
          province: form.otherParentProvince,
          postalCode: form.otherParentPostalCode,
          cellPhone: form.otherParentCellPhone,
          email: form.otherParentEmail,
          relationship: form.otherParentRelationship,
        },
      };

      const sharedData = {
        applicationDate: form.applicationDate,
        fileNumber: form.fileNumber || "",
        referralSource: form.referralSource,
        referralSourceOther: form.referralSourceOther,
        children: form.children.map(c => ({ fullName: c.fullName, dob: c.dob, age: calcAge(c.dob), gender: c.gender, custody: c.custody })),
        courtOrder: form.courtOrder,
        courtOrderDocUrl,
        childWelfareInvolvement: form.childWelfareInvolvement,
        visitType: form.visitType,
        visitGoals: form.visitGoals,
        schedulingPreferences: form.schedulingPreferences,
        approvedVisitors: form.approvedVisitors,
        safetyConcerns: form.safetyConcerns,
        serviceTypes: form.serviceTypes,
        requestedFrequency: form.requestedFrequency,
        requestedDuration: form.requestedDuration,
        visitLocation: form.visitLocation,
        preferredTimes: form.preferredTimes,
        preferredVisitDates: form.preferredVisitDates,
        specialNeeds: form.specialNeeds,
        allergies: form.allergies,
        currentMedications: form.currentMedications,
        domesticViolence: form.domesticViolence,
        additionalInfo: form.additionalInfo,
      };

      const payload = {
        formType: "private",
        lastUpdated: serverTimestamp(),
        shared: sharedData,
        payment: {
          option: form.paymentOption,
          responsibleParty: form.responsibleParty,
          thirdPartyName: form.thirdPartyName,
          costSplit: form.costSplit,
          costSplitDetail: form.costSplitDetail,
          thirdPartyPayer: form.thirdPartyPayer,
          billingContact: form.billingContact,
        },
        reports: { acknowledged: form.reportAckPayable },
        [`party${partyType}`]: partyData,
        [`party${partyType}_email`]: form.email.toLowerCase(),
        status: "Submitted",
      };

      if (formId) {
        await updateDoc(doc(db, COLLECTION_NEW_INTAKES, formId), payload);
      } else {
        await addDoc(collection(db, COLLECTION_NEW_INTAKES), payload);
      }

      if (onSubmitSuccess) onSubmitSuccess();
      else navigate("/intake-form/submitted");
    } catch (err) {
      console.error("Submission error:", err);
      alert("Submission failed: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><p className="text-gray-500 font-medium animate-pulse">Loading intake form...</p></div>;

  // ── Step renderers ───────────────────────────────────────────────────────
  const renderStep = () => {
    switch (step) {
      case 1: return (
        <div className="space-y-6">
          {/* Important Notice */}
          <div className="bg-[#f7fbf8] border border-emerald-100 rounded-2xl p-5">
            <h4 className="text-sm font-bold mb-3" style={{ color: GREEN }}>IMPORTANT NOTICE</h4>
            <ul className="space-y-2 text-sm text-gray-600 list-disc pl-5">
              <li>Intake processing time is <strong>1-3 weeks</strong> from receipt of a complete intake package.</li>
              <li>Please omit personal opinions. We remain a <strong>neutral, child-focused service provider</strong> and follow all applicable <strong>court orders and legal directions</strong>.</li>
              <li>If you have questions, contact: <strong>visits@familyforever.ca</strong> or <strong>admin@familyforever.ca</strong></li>
            </ul>
          </div>

          {/* 1. Application Information */}
          <SectionCard num={1} title="Application Information">
              <div className="grid grid-cols-2 gap-4">
                <Input label="Date of Application" required type="date" value={form.applicationDate} onChange={e => set("applicationDate", e.target.value)} />
                <Select
                  label="Referral Source" required
                  placeholder="Select referral source"
                  options={REFERRAL_SOURCES}
                  value={form.referralSource}
                  onChange={v => set("referralSource", v)}
                />
              </div>
              {form.referralSource === "Other" && (
                <Input label="Specify Referral Source" value={form.referralSourceOther} onChange={e => set("referralSourceOther", e.target.value)} />
              )}
          </SectionCard>

          {/* 2. Applicant Information */}
          <SectionCard num={2} title="Applicant Information" subtitle="Person completing this form and requesting services.">
              <Input label="Full Legal Name" required placeholder="First Name, Middle Name, Last Name" value={form.fullName} onChange={e => set("fullName", e.target.value)} />
              <Input label="Street Address" required placeholder="Street number and name" value={form.streetAddress} onChange={e => set("streetAddress", e.target.value)} />
              <Input label="Street Address Line 2 (Optional)" placeholder="Suite, Apartment, or Building Number" value={form.streetAddress2} onChange={e => set("streetAddress2", e.target.value)} />
              <div className="grid grid-cols-2 gap-4">
                <Input label="City" required placeholder="City" value={form.city} onChange={e => set("city", e.target.value)} />
                <Select label="Province" required options={PROVINCES} value={form.province} onChange={v => set("province", v)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Postal Code" required placeholder="A1A 1A1" value={form.postalCode} onChange={e => set("postalCode", e.target.value)} />
                <Input label="Cell Phone" required placeholder="(780) 123-4567" value={form.cellPhone} onChange={e => set("cellPhone", e.target.value)} />
              </div>
              <Input label="Email Address" required type="email" placeholder="your.email@example.com" value={form.email} onChange={e => set("email", e.target.value)} />
              <Select label="Relationship to Child/Children" required placeholder="Select relationship" options={RELATIONSHIPS} value={form.relationship} onChange={v => set("relationship", v)} />
              {form.relationship === "Other" && (
                <Input label="Specify Relationship" value={form.relationshipOther} onChange={e => set("relationshipOther", e.target.value)} />
              )}
          </SectionCard>

          {/* 3. Other Parent / Guardian Information */}
          <SectionCard num={3} title="Other Parent/Guardian Information">
              <Input label="Full Legal Name" placeholder="First Name, Middle Name, Last Name" value={form.otherParentName} onChange={e => set("otherParentName", e.target.value)} />
              <Input label="Street Address" placeholder="Street number and name" value={form.otherParentStreetAddress} onChange={e => set("otherParentStreetAddress", e.target.value)} />
              <Input label="Street Address Line 2 (Optional)" placeholder="Suite, Apartment, or Building Number" value={form.otherParentStreet2} onChange={e => set("otherParentStreet2", e.target.value)} />
              <div className="grid grid-cols-2 gap-4">
                <Input label="City" placeholder="City" value={form.otherParentCity} onChange={e => set("otherParentCity", e.target.value)} />
                <Select label="Province" options={PROVINCES} value={form.otherParentProvince} onChange={v => set("otherParentProvince", v)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Postal Code" placeholder="A1A 1A1" value={form.otherParentPostalCode} onChange={e => set("otherParentPostalCode", e.target.value)} />
                <Input label="Cell Phone" placeholder="(780) 123-4567" value={form.otherParentCellPhone} onChange={e => set("otherParentCellPhone", e.target.value)} />
              </div>
              <Input label="Email Address" type="email" placeholder="email@example.com" value={form.otherParentEmail} onChange={e => set("otherParentEmail", e.target.value)} />
              <Select label="Relationship to Child/Children" placeholder="Select relationship" options={RELATIONSHIPS} value={form.otherParentRelationship} onChange={v => set("otherParentRelationship", v)} />
          </SectionCard>
        </div>
      );

      case 2: return (
        <div className="space-y-6">
          {/* 4. Children's Information */}
          <SectionCard num={4} title="Children's Information">
            <div className="flex items-center justify-between mb-4">
              <Label required>Child/Children Details</Label>
              <button type="button" onClick={addChild}
                className="flex items-center gap-1.5 text-sm font-semibold border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50" style={{ color: GREEN }}>
                <Plus size={15} /> Add Child
              </button>
            </div>
            {form.children.map((child, i) => (
              <div key={i} className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-4 relative">
                {form.children.length > 1 && (
                  <button type="button" onClick={() => removeChild(i)} className="absolute top-3 right-3 text-red-400 hover:text-red-600"><X size={16} /></button>
                )}
                <div className="grid grid-cols-12 gap-4">
                  <div className="col-span-12 sm:col-span-5">
                    <Input label="Child's Full Name" placeholder="Full legal name" value={child.fullName} onChange={e => updateChild(i, "fullName", e.target.value)} />
                  </div>
                  <div className="col-span-7 sm:col-span-4">
                    <Input label="Date of Birth" type="date" value={child.dob} onChange={e => updateChild(i, "dob", e.target.value)} />
                  </div>
                  <div className="col-span-5 sm:col-span-3">
                    <Input label="Age" placeholder="—" value={calcAge(child.dob)} disabled readOnly />
                  </div>
                  <div className="col-span-6">
                    <Select label="Gender" options={GENDERS} value={child.gender} onChange={v => updateChild(i, "gender", v)} />
                  </div>
                  <div className="col-span-6">
                    <Select label="Custody" options={CUSTODY_OPTIONS} value={child.custody} onChange={v => updateChild(i, "custody", v)} />
                  </div>
                  <div className="col-span-12">
                    <Label>Child's Picture (Optional)</Label>
                    <input type="file" accept="image/*"
                      onChange={e => updateChild(i, "photo", e.target.files[0])}
                      className="block w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border file:border-gray-300 file:bg-white file:text-gray-700 file:text-sm file:cursor-pointer" />
                    <p className="text-xs text-gray-400 mt-1">Upload a recent photo of the child (JPG, PNG, or other image formats)</p>
                  </div>
                </div>
              </div>
            ))}
            {errors.child0 && <p className="text-red-500 text-xs mt-2">{errors.child0}</p>}
          </SectionCard>

          {/* 5. Type of Service Required */}
          <SectionCard num={5} title="Type of Service Required">
            <Label required>Service Type</Label>
            <div className="space-y-2.5 mt-1">
              {SERVICE_TYPES.map(s => {
                const checked = form.serviceTypes.includes(s.value);
                return (
                  <label key={s.value} className="flex items-start gap-3 cursor-pointer">
                    <input type="checkbox" checked={checked}
                      onChange={() => set("serviceTypes", checked ? form.serviceTypes.filter(v => v !== s.value) : [...form.serviceTypes, s.value])}
                      className="mt-1 w-4 h-4 accent-green-700" />
                    <span className="text-sm text-gray-700">{s.value} <span className="text-gray-400">({s.desc})</span></span>
                  </label>
                );
              })}
            </div>
          </SectionCard>

          {/* 6. Requested Visit Schedule */}
          <SectionCard num={6} title="Requested Visit Schedule">
            <div className="grid grid-cols-2 gap-4">
              <Select label="Requested Frequency" placeholder="Select frequency" options={VISIT_FREQUENCIES} value={form.requestedFrequency} onChange={v => set("requestedFrequency", v)} />
              <div>
                <Select label="Requested Duration per Visit" placeholder="Select duration" options={VISIT_DURATIONS} value={form.requestedDuration} onChange={v => set("requestedDuration", v)} />
                <p className="text-xs text-gray-400 -mt-2">Maximum 8 hours. Minimum 2-hour charge applies to all visits.</p>
              </div>
            </div>
            <Select label="Visit Location" placeholder="Select location" options={VISIT_LOCATIONS} value={form.visitLocation} onChange={v => set("visitLocation", v)} />
            <Input label="Preferred Time(s) of Day" placeholder="e.g., Morning (9am-12pm), Afternoon (1pm-4pm)" value={form.preferredTimes} onChange={e => set("preferredTimes", e.target.value)} />
            <div className="mb-2">
              <Label>Select Preferred Visit Dates (Optional)</Label>
              <p className="text-xs text-gray-500 mb-3">Click on dates in the calendar below to select your preferred visit dates. You can select dates over the next 6 months.</p>
              <VisitDatesCalendar
                selected={form.preferredVisitDates}
                onToggle={(di) => set("preferredVisitDates", form.preferredVisitDates.includes(di) ? form.preferredVisitDates.filter(x => x !== di) : [...form.preferredVisitDates, di])}
              />
            </div>
          </SectionCard>
        </div>
      );

      case 3: return (
        <div className="space-y-6">
          {/* 7. Court Order Information */}
          <SectionCard num={7} title="Court Order Information">
            <Label required>Is there a court order in place?</Label>
            <Radio options={["Yes", "No", "Pending"]} value={form.courtOrder} onChange={v => set("courtOrder", v)} />
            {errors.courtOrder && <p className="text-red-500 text-xs mt-1">{errors.courtOrder}</p>}
            {form.courtOrder === "Yes" && (
              <div className="mt-3">
                <FileUpload label="Upload Court Order (Optional)" fileRef={courtOrderFileRef} file={form.courtOrderFile} onChange={f => set("courtOrderFile", f)} />
              </div>
            )}
          </SectionCard>

          {/* 8. Child Welfare Involvement */}
          <SectionCard num={8} title="Child Welfare Involvement">
            <Label required>Is there current child welfare involvement?</Label>
            <Radio options={["Yes", "No"]} value={form.childWelfareInvolvement} onChange={v => set("childWelfareInvolvement", v)} />
            {errors.childWelfareInvolvement && <p className="text-red-500 text-xs mt-1">{errors.childWelfareInvolvement}</p>}
          </SectionCard>
        </div>
      );

      case 4: return (
        <div className="space-y-6">
          {/* 9. Special Needs & Accommodations */}
          <SectionCard num={9} title="Special Needs & Accommodations">
            <Textarea label="Child's Special Needs or Developmental Considerations" placeholder="Please describe any special needs, developmental delays, behavioral considerations, or support requirements..." value={form.specialNeeds} onChange={e => set("specialNeeds", e.target.value)} />
            <Textarea label="Allergies (Food, Environmental, Medication)" placeholder="List any known allergies..." value={form.allergies} onChange={e => set("allergies", e.target.value)} />
            <Textarea label="Current Medications" placeholder="List any medications the child is currently taking..." value={form.currentMedications} onChange={e => set("currentMedications", e.target.value)} />
          </SectionCard>

          {/* 10. Safety & Risk Assessment */}
          <SectionCard num={10} title="Safety & Risk Assessment">
            <Label>History of domestic violence or family violence?</Label>
            <Radio options={["Yes", "No"]} value={form.domesticViolence} onChange={v => set("domesticViolence", v)} />
            <div className="mt-3">
              <Textarea label="Additional Safety Concerns or Risk Factors" placeholder="Please describe any other safety concerns, threats, or risk factors we should be aware of to ensure everyone's safety..." value={form.safetyConcerns} onChange={e => set("safetyConcerns", e.target.value)} />
            </div>
          </SectionCard>
        </div>
      );

      case 5: return (
        <div className="space-y-6">
          {/* 11. Emergency Contacts */}
          <SectionCard num={11} title="Emergency Contacts">
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-5 flex items-start gap-3">
              <AlertCircle className="text-blue-500 shrink-0 mt-0.5" size={18} />
              <div>
                <h4 className="text-sm font-bold text-blue-800 mb-1">Important: Custodial Parent Information</h4>
                <p className="text-xs text-blue-700 leading-relaxed">
                  The <strong>first emergency contact must always be the custodial parent</strong> (the parent who has primary custody of the child/children). This ensures we can reach the legal guardian immediately in case of any emergency during visits or services. The second contact is optional and can be another trusted individual in case the custodial parent is unavailable.
                </p>
              </div>
            </div>

            {/* Emergency Contact #1 (Custodial Parent) */}
            <div className="border border-gray-200 rounded-xl p-4 mb-4">
              <h4 className="text-sm font-bold text-gray-700 mb-4">Emergency Contact #1 (Custodial Parent) <span className="text-red-500">*</span></h4>
              <div className="grid grid-cols-3 gap-4">
                <Input label="Full Name" required placeholder="Full name" value={form.emergencyContact.fullName} onChange={e => updateEC("fullName", e.target.value)} />
                <Input label="Relationship" required placeholder="e.g., Mother, Father" value={form.emergencyContact.relationship} onChange={e => updateEC("relationship", e.target.value)} />
                <Input label="Phone Number" required placeholder="(780) 123-4567" value={form.emergencyContact.phone} onChange={e => updateEC("phone", e.target.value)} />
              </div>
              {errors.emergencyContact && <p className="text-red-500 text-xs">{errors.emergencyContact}</p>}
            </div>

            {/* Emergency Contact #2 (Optional Backup) */}
            <div className="border border-gray-200 rounded-xl p-4">
              <h4 className="text-sm font-bold text-gray-700">Emergency Contact #2 (Optional Backup Contact)</h4>
              <p className="text-xs text-gray-500 mb-4">Provide a secondary contact person in case the custodial parent cannot be reached.</p>
              <div className="grid grid-cols-3 gap-4">
                <Input label="Full Name" placeholder="Full name" value={form.emergencyContact2.fullName} onChange={e => set("emergencyContact2", { ...form.emergencyContact2, fullName: e.target.value })} />
                <Input label="Relationship" placeholder="e.g., Grandmother, Aunt, Friend" value={form.emergencyContact2.relationship} onChange={e => set("emergencyContact2", { ...form.emergencyContact2, relationship: e.target.value })} />
                <Input label="Phone Number" placeholder="(780) 123-4567" value={form.emergencyContact2.phone} onChange={e => set("emergencyContact2", { ...form.emergencyContact2, phone: e.target.value })} />
              </div>
            </div>
          </SectionCard>

          {/* 12. Additional Information */}
          <SectionCard num={12} title="Additional Information">
            <Textarea label="Is there anything else we should know about your situation?" placeholder="Share any additional information that would help us understand your family's needs and provide better service..." value={form.additionalInfo} onChange={e => set("additionalInfo", e.target.value)} />
          </SectionCard>
        </div>
      );

      case 6: return (
        <div className="space-y-6">
          {/* Service Rates & Fees */}
          <SectionCard title="Fees & Payment">
            <p className="text-sm text-gray-600 mb-4">Family Forever, Inc. provides supervised visitation services on a fee-for-service basis.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <RateCard title="Supervised Visitation" rows={[["In Head Office", "$70.00/hr"], ["  (2-hour minimum)", ""], ["In Community", "$70.00/hr + Mileage"], ["  Mileage rate", "$0.72/km"], ["  (Calculated from and back to Family Forever Inc. Head office. May include 8% buffer for traffic, detours, or construction.)", ""]]} />
              <RateCard title="Additional Services" rows={[["Report", "$40.00"], ["  (Issued once payment is received)", ""], ["Court appearance", "$850.00"]]} />
              <RateCard title="Payment Terms" rows={[["Weekend visits", "Payment due before visit"], ["Weekday visits", "Payment due 3 days prior"]]} />
              <RateCard title="Cancellation Policy" rows={[["Cancellation (<24hrs)", "Full charge"], ["  Applies regardless of who cancels", ""], ["No-show", "Full fee"]]} />
            </div>
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 mt-4">
              <p className="text-xs text-amber-800 leading-relaxed"><strong>Financial Assistance:</strong> We understand that supervised access services represent a financial commitment. Sliding scale fees and payment plans may be available based on demonstrated financial need. Please discuss your situation with our intake coordinator.</p>
            </div>
          </SectionCard>

          {/* Payment Procedures */}
          <SectionCard title="Payment Procedures">
            <Select label="Who will be responsible for payment?" required placeholder="Select payment responsibility" options={PAYMENT_RESPONSIBILITY} value={form.paymentResponsibility} onChange={v => set("paymentResponsibility", v)} />
            <Select label="Preferred Payment Method" required placeholder="Select payment method" options={PAYMENT_METHODS} value={form.paymentMethod} onChange={v => set("paymentMethod", v)} />
            <Textarea label="Payment Notes or Special Arrangements" placeholder="Please provide any additional information about payment arrangements, financial assistance needs, or special circumstances..." value={form.paymentNotes} onChange={e => set("paymentNotes", e.target.value)} />
            <p className="text-xs text-gray-400 -mt-2 mb-5">This information will be discussed confidentially during your intake assessment.</p>

            <div className="border border-gray-200 rounded-xl p-4">
              <h4 className="text-sm font-semibold mb-3" style={{ color: GREEN }}>Payment Policy Acknowledgment</h4>
              <div className="space-y-3">
                {[
                  { key: "payAckRates", text: "I understand and acknowledge the service rates and payment policies outlined above." },
                  { key: "payAck48h", text: "I understand that payment is due before weekend visits or 3 days prior to weekday visits." },
                  { key: "payAckCancellation", text: "I understand the cancellation policy: cancellations with less than 24 hours notice will be charged in full, regardless of who cancels the visit." },
                ].map(ack => (
                  <label key={ack.key} className="flex items-start gap-3 cursor-pointer">
                    <input type="checkbox" checked={form[ack.key]} onChange={e => set(ack.key, e.target.checked)} className="mt-1 w-4 h-4 accent-green-700" />
                    <span className="text-sm text-gray-700">{ack.text} <span className="text-red-500">*</span></span>
                  </label>
                ))}
              </div>
              {errors.payAck && <p className="text-red-500 text-xs mt-2">{errors.payAck}</p>}
            </div>
          </SectionCard>
        </div>
      );

      case 7: return (
        <div className="space-y-6">
           <SectionCard title="Engagement Protocols">
             <div className="bg-[#f4faf7] border border-[#d5e9e0] rounded-xl p-5 mb-6 text-sm text-gray-700 leading-relaxed shadow-sm">
                Family Forever Inc.'s Engagement Protocols establish clear expectations to ensure that supervised visits are conducted in a safe, respectful, and child-focused manner. All individuals participating in supervised visits are required to comply with these protocols at all times. Failure to comply may result in immediate suspension or termination of the visit and/or services.
             </div>

             <div className="space-y-6 my-6 pl-1">
                {PROTOCOLS_LIST.map((p) => (
                  <div key={p.num} className="space-y-2">
                    <h4 className="text-base font-bold" style={{ color: GREEN }}>
                      {p.num}. {p.title}
                    </h4>
                    <ul className="list-disc pl-5 space-y-1.5 text-sm text-gray-700 marker:text-[#1f6f43]">
                      {p.bullets.map((bullet, idx) => (
                        <li key={idx}>
                          <span>{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
             </div>

             <div className="bg-[#f4faf7] border border-[#d5e9e0] rounded-xl p-6 mt-8 shadow-sm">
                <h4 className="text-base font-bold mb-2" style={{ color: GREEN }}>
                  Acknowledgement of Engagement Protocols
                </h4>
                <p className="text-xs text-gray-600 mb-5 leading-relaxed">
                  I acknowledge that I have read and understood the Engagement Protocols above and agree to comply with them throughout the visitation process.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Input
                      label="Name"
                      required
                      placeholder="Type your full name"
                      value={form.protocolName}
                      onChange={(e) => set("protocolName", e.target.value)}
                    />
                    {errors.protocolName && <p className="text-red-500 text-xs -mt-3 mb-2">{errors.protocolName}</p>}
                  </div>
                  <div>
                    <Input
                      label="Date"
                      required
                      type="date"
                      placeholder="Pick a date"
                      value={form.protocolDate}
                      onChange={(e) => set("protocolDate", e.target.value)}
                    />
                    {errors.protocolDate && <p className="text-red-500 text-xs -mt-3 mb-2">{errors.protocolDate}</p>}
                  </div>
                </div>
                
                <label className="flex items-start gap-3 cursor-pointer mt-4">
                  <input
                    type="checkbox"
                    checked={form.protocolAcknowledged}
                    onChange={(e) => set("protocolAcknowledged", e.target.checked)}
                    className="mt-1 w-4 h-4 accent-emerald-700 shrink-0"
                  />
                  <span className="text-sm text-gray-700 font-medium leading-relaxed">
                    I agree and consent to these terms. <span className="text-red-500">*</span>
                  </span>
                </label>
                {errors.protocol && <p className="text-red-500 text-xs mt-1">{errors.protocol}</p>}
             </div>
           </SectionCard>
        </div>
      );

      case 8: return (
        <SectionCard title="Review & Submit">
          <p className="text-sm text-gray-600 mb-6">By signing below, you confirm that all information provided is accurate and you agree to the confidentiality and payment terms outlined.</p>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <Input label="Name (Print)" required value={form.signerName} onChange={e => set("signerName", e.target.value)} />
              {errors.signerName && <p className="text-red-500 text-xs -mt-3 mb-2">{errors.signerName}</p>}
            </div>
            <div>
              <Input label="Date" type="date" required value={form.signerDate} onChange={e => set("signerDate", e.target.value)} />
              {errors.signerDate && <p className="text-red-500 text-xs -mt-3 mb-2">{errors.signerDate}</p>}
            </div>
          </div>
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <Label required>Digital Signature</Label>
              {form.signatureDataUrl && (
                <button onClick={clearSignature} className="text-xs text-red-500 font-bold hover:underline">Clear</button>
              )}
            </div>
            <input
              type="text"
              value={form.signatureDataUrl}
              onChange={(e) => {
                const cleaned = e.target.value.replace(/[^a-zA-Z\s]/g, "");
                set("signatureDataUrl", cleaned);
              }}
              placeholder="Type your full name to sign"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-700 bg-white"
            />
            {errors.signature && <p className="text-red-500 text-xs mt-2">{errors.signature}</p>}
            
            {/* Live cursive preview */}
            <div className="mt-3 border border-dashed rounded-xl p-6 bg-gray-50 flex flex-col items-center justify-center min-h-[120px]" style={{ borderColor: "#d1d5db" }}>
              {form.signatureDataUrl ? (
                <span className="text-4xl text-emerald-800 font-semibold" style={{ fontFamily: "'Dancing Script', cursive" }}>
                  {form.signatureDataUrl}
                </span>
              ) : (
                <span className="text-gray-400 italic text-sm">Signature will appear here...</span>
              )}
            </div>
          </div>
        </SectionCard>
      );

      default: return null;
    }
  };

  const currentIdx = step - 1;
  const progress = (step / STEPS.length) * 100;

  return (
    <div className="min-h-screen bg-[#FDFEFE] text-gray-900" style={{ fontFamily: "Roboto, system-ui, sans-serif" }}>
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-2">
             <div className="flex items-center gap-3">
                <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full transition-all text-gray-500"><ArrowLeft size={20} /></button>
                <div>
                   <h1 className="text-lg font-bold tracking-tight">Family Intake Form</h1>
                   <p className="text-[10px] uppercase font-bold text-emerald-700 tracking-widest">{partyType === "A" ? "Primary Party Section" : "Secondary Party Section"}</p>
                </div>
             </div>
             <div className="text-right">
                <p className="text-xs font-bold text-gray-400">Step {step} of {STEPS.length}</p>
                <div className="w-24 h-1.5 bg-gray-100 rounded-full mt-1 overflow-hidden">
                   <div className="h-full bg-emerald-600 transition-all duration-500" style={{ width: `${progress}%` }} />
                </div>
             </div>
          </div>
          
          {/* Step indicator — evenly spread, labelled, click any step to switch */}
          <div className="flex items-start py-2">
             {STEPS.map((s, i) => (
                <React.Fragment key={s.id}>
                   <button
                     type="button"
                     onClick={() => { setErrors({}); setStep(s.id); }}
                     className="flex flex-col items-center gap-1.5 flex-shrink-0 transition-all"
                     style={{ width: 70 }}
                   >
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                        style={
                          s.id === step
                            ? { background: GREEN, color: "#fff" }
                            : completedSteps.includes(s.id)
                              ? { background: "#d1fae5", color: "#047857" }
                              : { background: "#f3f4f6", color: "#9ca3af" }
                        }
                      >
                        {completedSteps.includes(s.id) && s.id !== step ? <Check size={14} /> : s.id}
                      </div>
                      <span
                        className="text-[11px] font-semibold text-center leading-tight"
                        style={{ color: s.id === step || completedSteps.includes(s.id) ? GREEN : "#6b7280" }}
                      >
                        {s.short}
                      </span>
                      <span className="text-[9px] text-center leading-tight text-gray-400 hidden sm:block">{s.sub}</span>
                   </button>
                   {i < STEPS.length - 1 && <div className="flex-1 h-[2px] bg-gray-200 mt-4" />}
                </React.Fragment>
             ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-3xl mx-auto px-6 py-8">
         <div className="transition-all duration-300 transform opacity-100 translate-y-0">
            {renderStep()}
         </div>

         <div className="flex items-center justify-between mt-8 pt-8 border-t border-gray-100">
            <button
               disabled={step === 1}
               onClick={back}
               className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold border border-gray-200 text-gray-600 hover:bg-gray-50 transition-all disabled:opacity-30"
            >
               <ChevronLeft size={18} /> Back
            </button>

            <div className="flex items-center gap-4">
               {step < STEPS.length ? (
                 <button
                    onClick={next}
                    className="flex items-center gap-2 px-8 py-3 rounded-xl text-sm font-bold bg-emerald-700 text-white shadow-lg shadow-emerald-700/20 hover:bg-emerald-800 transition-all active:scale-95"
                 >
                    Next <ChevronRight size={18} />
                 </button>
               ) : (
                 <button
                    disabled={submitting}
                    onClick={handleSubmit}
                    className="flex items-center gap-2 px-8 py-3 rounded-xl text-sm font-bold bg-emerald-700 text-white shadow-lg shadow-emerald-700/20 hover:bg-emerald-800 transition-all active:scale-95 disabled:opacity-50"
                 >
                    {submitting ? "Submitting..." : <><Check size={18} /> Submit Application</>}
                 </button>
               )}
            </div>
         </div>
      </div>
    </div>
  );
};

export default PrivateFamilyIntakeForm;
