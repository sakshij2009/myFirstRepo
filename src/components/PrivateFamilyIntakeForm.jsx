import React, { useState, useRef, useEffect } from "react";
import { collection, addDoc, serverTimestamp, doc, setDoc, getDocs, query, where, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage, COLLECTION_NEW_INTAKES } from "../firebase";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Check, Plus, X, Upload, Pen, Trash2, ArrowLeft, ShieldCheck, Lock, CreditCard, FileText, Users } from "lucide-react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { formatLocalISO } from "../utils/dateHelpers";
import SignatureCanvas from "react-signature-canvas";
import PlacesAutocomplete from "./PlacesAutocomplete";

const GREEN = "#1f6f43";

// ── Step definitions ───────────────────────────────────────────────────────
const STEPS = [
  { id: 1,  label: "Welcome & Privacy",            short: "Contact Info" },
  { id: 2,  label: "Part A: Case Information",      short: "Children & Service" },
  { id: 3,  label: "Part B/C: Confidential Profile", short: "Profile" },
  { id: 4,  label: "Part D: Payment Model",         short: "Payment" },
  { id: 5,  label: "Reports & Documentation",       short: "Reports" },
  { id: 6,  label: "Protocols & Confidentiality",   short: "Protocols" },
  { id: 7,  label: "Sign & Complete",               short: "Review & Submit" },
];

const REFERRAL_SOURCES = ["Self-referral","CFS / Child & Family Services","School","Healthcare Provider","Court Order","Legal Aid","Community Organization","Other"];
const RELATIONSHIPS = ["Mother","Father","Grandmother","Grandfather","Aunt","Uncle","Legal Guardian","Foster Parent","Other"];
const PROVINCES = ["Alberta","British Columbia","Manitoba","New Brunswick","Newfoundland and Labrador","Nova Scotia","Ontario","Prince Edward Island","Quebec","Saskatchewan","Northwest Territories","Nunavut","Yukon"];
const SERVICE_TYPES = [
  { value: "Transportation", desc: "assistance with travel to and from visits" },
  { value: "Respite Care", desc: "temporary care for the child" },
  { value: "Supervised Visits", desc: "visits monitored by trained staff" },
  { value: "Supervised Exchanges", desc: "safe handoff of the child between parties" },
  { value: "Virtual / Phone Visit Monitoring", desc: "monitored phone or video visits" },
];
const VISIT_FREQUENCIES = ["Weekly", "Bi-weekly", "Monthly", "As needed", "Other"];
const VISIT_DURATIONS = ["2 hours", "3 hours", "4 hours", "5 hours", "6 hours", "7 hours", "8 hours"];
const VISIT_LOCATIONS = ["Family Forever Office", "Community Location", "Client Home", "Public Place", "Other"];
const GENDERS = ["Male","Female","Non-binary","Prefer not to say"];
const CUSTODY_OPTIONS = ["Sole Custody","Shared Custody","Court-Ordered Visitation","Informal Arrangement","Other"];

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
        <h3 className="text-lg font-semibold" style={{ color: num ? GREEN : "#1f2937" }}>{title}</h3>
        {subtitle && <p className="text-sm text-gray-500 mt-0.5 whitespace-pre-line">{subtitle}</p>}
      </div>
    </div>
    {children}
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
  const sigCanvasRef = useRef(null);

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
    emergencyContact: emptyEmergency(),

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
        const qInv = query(collection(db, "parentInvites"), where("primaryEmail", "==", user?.email?.toLowerCase()));
        const snapInv = await getDocs(qInv);
        
        let targetParty = "A";
        if (snapInv.empty) {
           const qInv2 = query(collection(db, "parentInvites"), where("secondParentEmail", "==", user?.email?.toLowerCase()));
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
    if (step === 2) {
      if (!form.children[0].fullName.trim()) e.child0 = "At least one child name is required";
    }
    if (step === 3) {
      if (!form.fullName.trim()) e.fullName = "Full name is required";
      if (!form.phone.trim()) e.phone = "Phone is required";
      if (!form.relationship) e.relationship = "Relationship is required";
    }
    if (step === 4) {
      if (!form.paymentOption) e.paymentOption = "Please select a payment option";
    }
    if (step === 7) {
      if (!form.signatureDataUrl) e.signature = "Signature is required";
      if (!form.protocolAcknowledged) e.protocol = "You must acknowledge the protocols";
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

  const clearSignature = () => { sigCanvasRef.current?.clear(); set("signatureDataUrl", ""); };
  const saveSignature = () => {
    if (sigCanvasRef.current && !sigCanvasRef.current.isEmpty()) {
      set("signatureDataUrl", sigCanvasRef.current.toDataURL("image/png"));
    }
  };

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
        signature: form.signatureDataUrl,
        signedAt: serverTimestamp(),
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
        <SectionCard num={3} confidential title={`Part ${partyType === "A" ? "B" : "C"} – Personal Confidential Section`} subtitle="This information belongs only to you and will not be shared with the other party.">
            <Input label="Full Name" required value={form.fullName} onChange={e => set("fullName", e.target.value)} />
            <div className="mb-4">
              <Label>Home Address</Label>
              <PlacesAutocomplete value={form.address} onChange={v => set("address", v)} placeholder="Type address..." className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-700" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Phone Number" required value={form.phone} onChange={e => set("phone", e.target.value)} />
              <Input label="Email Address" required readOnly value={form.email} className="bg-gray-50 text-gray-500 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <Select label="Relationship to Child" required options={RELATIONSHIPS} value={form.relationship} onChange={v => set("relationship", v)} />
            {form.relationship === "Other" && <Input label="Specify Relationship" value={form.relationshipOther} onChange={e => set("relationshipOther", e.target.value)} />}
            
            <div className="mt-8 pt-6 border-t">
              <h4 className="text-sm font-bold text-gray-700 mb-4">Emergency Contact Details</h4>
              <Input label="Full Name" value={form.emergencyContact.fullName} onChange={e => updateEC("fullName", e.target.value)} />
              <div className="grid grid-cols-2 gap-4">
                <Input label="Relationship" value={form.emergencyContact.relationship} onChange={e => updateEC("relationship", e.target.value)} />
                <Input label="Phone" value={form.emergencyContact.phone} onChange={e => updateEC("phone", e.target.value)} />
              </div>
            </div>
            {errors.fullName && <p className="text-red-500 text-xs mt-2">{errors.fullName}</p>}
        </SectionCard>
      );

      case 4: return (
        <div className="space-y-6">
          <SectionCard num={4} title="Part D – Payment Model Section">
            <p className="text-sm text-gray-600 mb-6">Select how service costs will be handled for this case file.</p>
            
            <div className="space-y-4">
              {/* Option 1 */}
              <div className={`p-4 border rounded-xl transition-all cursor-pointer ${form.paymentOption === "Option 1" ? "border-emerald-600 bg-emerald-50" : "border-gray-200"}`} onClick={() => set("paymentOption", "Option 1")}>
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${form.paymentOption === "Option 1" ? "border-emerald-600" : "border-gray-300"}`}>
                    {form.paymentOption === "Option 1" && <div className="w-2.5 h-2.5 rounded-full bg-emerald-600" />}
                  </div>
                  <span className="font-bold text-gray-800 leading-tight">Option 1 – One Party Responsible for All Costs</span>
                </div>
                <p className="text-xs text-gray-500 ml-8 mb-3">One party will be responsible for all visit fees, mileage, and additional services.</p>
                {form.paymentOption === "Option 1" && (
                  <div className="ml-8 grid grid-cols-2 gap-3" onClick={e => e.stopPropagation()}>
                    <Radio label="Responsible Party" options={["Party A", "Party B", "Third Party / Agency"]} value={form.responsibleParty} onChange={v => set("responsibleParty", v)} />
                    {form.responsibleParty === "Third Party / Agency" && <Input label="Name of Third Party" value={form.thirdPartyName} onChange={e => set("thirdPartyName", e.target.value)} />}
                  </div>
                )}
              </div>

              {/* Option 2 */}
              <div className={`p-4 border rounded-xl transition-all cursor-pointer ${form.paymentOption === "Option 2" ? "border-emerald-600 bg-emerald-50" : "border-gray-200"}`} onClick={() => set("paymentOption", "Option 2")}>
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${form.paymentOption === "Option 2" ? "border-emerald-600" : "border-gray-300"}`}>
                    {form.paymentOption === "Option 2" && <div className="w-2.5 h-2.5 rounded-full bg-emerald-600" />}
                  </div>
                  <span className="font-bold text-gray-800 leading-tight">Option 2 – Shared Cost Between Parties</span>
                </div>
                <p className="text-xs text-gray-500 ml-8 mb-3">Both parties agree to share service costs. Full payment from both must be received before visit confirmation.</p>
                {form.paymentOption === "Option 2" && (
                  <div className="ml-8 grid grid-cols-2 gap-3" onClick={e => e.stopPropagation()}>
                    <Radio label="Cost Allocation" options={["50/50", "Other split"]} value={form.costSplit} onChange={v => set("costSplit", v)} />
                    {form.costSplit === "Other split" && <Input label="Specify Split Detail" placeholder="e.g. 70/30" value={form.costSplitDetail} onChange={e => set("costSplitDetail", e.target.value)} />}
                  </div>
                )}
              </div>

              {/* Option 3 */}
              <div className={`p-4 border rounded-xl transition-all cursor-pointer ${form.paymentOption === "Option 3" ? "border-emerald-600 bg-emerald-50" : "border-gray-200"}`} onClick={() => set("paymentOption", "Option 3")}>
                <div className="flex items-center gap-3 mb-2">
                   <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${form.paymentOption === "Option 3" ? "border-emerald-600" : "border-gray-300"}`}>
                    {form.paymentOption === "Option 3" && <div className="w-2.5 h-2.5 rounded-full bg-emerald-600" />}
                  </div>
                  <span className="font-bold text-gray-800 leading-tight">Option 3 – Third-Party Payment</span>
                </div>
                {form.paymentOption === "Option 3" && (
                  <div className="ml-8 mt-3 grid grid-cols-2 gap-4" onClick={e => e.stopPropagation()}>
                    <Select label="Payer" options={["CFS", "Agency", "Lawyer", "Other"]} value={form.thirdPartyPayer} onChange={v => set("thirdPartyPayer", v)} />
                    <Input label="Billing Contact" value={form.billingContact} onChange={e => set("billingContact", e.target.value)} />
                  </div>
                )}
              </div>
            </div>
            {errors.paymentOption && <p className="text-red-500 text-xs mt-4">{errors.paymentOption}</p>}
          </SectionCard>
        </div>
      );

      case 5: return (
        <SectionCard num={5} title="Reports & Documentation">
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 space-y-4">
            <div className="flex items-start gap-4">
              <FileText className="text-emerald-700 shrink-0 mt-1" size={20} />
              <div>
                <h4 className="text-sm font-bold text-gray-800">Standard Reports</h4>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                  Reports are optional and are not included in standard visit fees. 
                  Reports are available at <strong>$40 per report</strong>, per requesting party. 
                  Reports will only be released after payment is received.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4 pt-4 border-t">
              <CreditCard className="text-emerald-700 shrink-0 mt-1" size={20} />
              <div>
                <h4 className="text-sm font-bold text-gray-800">Billing Responsibility</h4>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                  A party requesting a report is responsible for that report cost unless otherwise agreed in writing. 
                  If both parties request the same report, each party is billed separately unless otherwise approved by Family Forever Inc.
                </p>
              </div>
            </div>
          </div>
          <label className="flex items-start gap-3 mt-6 cursor-pointer border p-4 rounded-xl hover:bg-gray-50 transition-all">
            <input type="checkbox" checked={form.reportAckPayable} onChange={e => set("reportAckPayable", e.target.checked)} className="mt-1 w-4 h-4 accent-emerald-700" />
            <span className="text-sm text-gray-700 font-medium italic">I understand that reports are billed separately and available upon request for a fee of $40 per requesting party.</span>
          </label>
        </SectionCard>
      );

      case 6: return (
        <div className="space-y-6">
           <SectionCard num={6} title="Engagement Protocols">
             <div className="max-h-80 overflow-y-auto border border-gray-100 rounded-lg p-4 bg-gray-50 text-[11px] text-gray-600 leading-relaxed mb-4">
                <p className="font-bold text-gray-800 mb-2">FAMILY FOREVER INC. – ENGAGEMENT PROTOCOLS</p>
                <div className="space-y-4">
                   {[
                    { t: "1. Attendance", d: "Participants must arrive on time. Late arrivals may result in shortened or cancelled visits." },
                    { t: "2. Conduct", d: "Respectful behaviour toward the child and staff is mandatory. Aggressive or abusive behaviour will not be tolerated." },
                    { t: "3. Compliance", d: "Participants must follow all instructions provided by the supervising staff." },
                    { t: "4. Child Focus", d: "Adult matters, legal issues, or conflicts must not be discussed in the child's presence." },
                    { t: "5. Substance Use", d: "Attendance under the influence of drugs or alcohol is strictly prohibited." },
                    { t: "6. Photography", d: "Audio or video recording is prohibited unless authorized in writing." }
                   ].map((p, i) => (
                     <div key={i}><span className="font-bold text-gray-700">{p.t}:</span> {p.d}</div>
                   ))}
                </div>
             </div>
             <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={form.protocolAcknowledged} onChange={e => set("protocolAcknowledged", e.target.checked)} className="mt-0.5 w-4 h-4 accent-emerald-700" />
                <span className="text-sm text-gray-700">I have read, understood, and agree to comply with the Engagement Protocols.</span>
             </label>
           </SectionCard>

           <SectionCard title="SECTION – PARTY CONFIDENTIALITY">
              <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
                 <p className="text-sm text-blue-800 font-medium mb-3">Confidential Information Policy</p>
                 <p className="text-xs text-blue-700 leading-relaxed">
                   Family Forever Inc. maintains one case file for administrative purposes. Personal contact information provided (address, phone, email, emergency contacts) will be kept confidential from the other party unless required by law.
                 </p>
              </div>
           </SectionCard>
        </div>
      );

      case 7: return (
        <SectionCard num={7} title="Applicant Signature">
          <p className="text-sm text-gray-600 mb-6">By signing below, you confirm that all information provided is accurate and you agree to the confidentiality and payment terms outlined.</p>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <Input label="Name (Print)" required value={form.signerName} onChange={e => set("signerName", e.target.value)} />
            <Input label="Date" type="date" required value={form.signerDate} onChange={e => set("signerDate", e.target.value)} />
          </div>
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <Label required>Signature</Label>
              <button onClick={clearSignature} className="text-xs text-red-500 font-bold hover:underline">Clear</button>
            </div>
            <div className="border border-gray-300 rounded-xl overflow-hidden bg-gray-50">
              <SignatureCanvas ref={sigCanvasRef} penColor={GREEN} canvasProps={{ width: 700, height: 180, className: "w-full cursor-crosshair" }} onEnd={saveSignature} />
            </div>
            {errors.signature && <p className="text-red-500 text-xs mt-2">{errors.signature}</p>}
          </div>
          {form.signatureDataUrl && <img src={form.signatureDataUrl} alt="Signature" className="h-16 object-contain border p-2 rounded mt-2" />}
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
                        className="text-[10px] font-semibold text-center leading-tight"
                        style={{ color: s.id === step ? GREEN : "#9ca3af" }}
                      >
                        {s.short}
                      </span>
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
