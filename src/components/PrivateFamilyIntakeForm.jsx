import React, { useState, useRef } from "react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../firebase";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Check, Plus, X, Upload, Calendar } from "lucide-react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";

const GREEN = "#1f6f43";

// ── Step definitions ───────────────────────────────────────────────────────
const STEPS = [
  { id: 1,  label: "Application Info" },
  { id: 2,  label: "Applicant" },
  { id: 3,  label: "Other Guardian" },
  { id: 4,  label: "Children" },
  { id: 5,  label: "Services" },
  { id: 6,  label: "Schedule" },
  { id: 7,  label: "Court & Welfare" },
  { id: 8,  label: "Special Needs" },
  { id: 9,  label: "Safety" },
  { id: 10, label: "Emergency" },
  { id: 11, label: "Additional" },
  { id: 12, label: "Rates & Fees" },
  { id: 13, label: "Payment" },
  { id: 14, label: "Protocols" },
];

const PROVINCES = ["Alberta","British Columbia","Manitoba","New Brunswick","Newfoundland and Labrador","Northwest Territories","Nova Scotia","Nunavut","Ontario","Prince Edward Island","Quebec","Saskatchewan","Yukon"];
const REFERRAL_SOURCES = ["Self-referral","CFS / Child & Family Services","School","Healthcare Provider","Court Order","Legal Aid","Community Organization","Other"];
const RELATIONSHIPS = ["Mother","Father","Grandmother","Grandfather","Aunt","Uncle","Legal Guardian","Foster Parent","Other"];
const GENDERS = ["Male","Female","Non-binary","Prefer not to say"];
const CUSTODY_OPTIONS = ["Sole Custody","Shared Custody","Court-Ordered Visitation","Informal Arrangement","Other"];
const FREQUENCIES = ["Once a week","Twice a week","Three times a week","Bi-weekly","Monthly"];
const DURATIONS = ["1 hour","2 hours","3 hours","4 hours","Half day","Full day"];
const LOCATIONS = ["Community (parent chooses)","Family Forever Office","Neutral Location","Child's Home","Other"];
const PAYMENT_RESP = ["Applicant (self-pay)","CFS / Government","Legal Aid","Insurance","Other"];
const PAYMENT_METHODS = ["E-transfer","Cheque","Cash","Credit Card","Pre-authorized debit"];

const emptyChild = () => ({ fullName: "", dob: "", gender: "", custody: "", photo: null, photoPreview: "" });
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
    <div className="flex gap-6 mt-1">
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

const SectionCard = ({ num, title, subtitle, children }) => (
  <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
    <div className="flex items-start gap-3 mb-4">
      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0" style={{ background: GREEN }}>
        {num}
      </div>
      <div>
        <h3 className="text-base font-bold text-gray-800">{title}</h3>
        {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
    </div>
    {children}
  </div>
);

// ── Stepper ────────────────────────────────────────────────────────────────
const Stepper = ({ current, total }) => {
  const visible = 7;
  const half = Math.floor(visible / 2);
  let start = Math.max(0, current - 1 - half);
  let end = Math.min(total, start + visible);
  if (end - start < visible) start = Math.max(0, end - visible);
  const shown = STEPS.slice(start, end);

  return (
    <div className="flex items-center gap-0 overflow-x-auto pb-1">
      {shown.map((s, i) => {
        const isActive = s.id === current;
        const isDone = s.id < current;
        const isLast = i === shown.length - 1;
        return (
          <div key={s.id} className="flex items-center">
            <div className={`flex flex-col items-center ${isActive ? "opacity-100" : isDone ? "opacity-80" : "opacity-40"}`}>
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                style={{ background: isDone || isActive ? GREEN : "#E5E7EB", color: isDone || isActive ? "#fff" : "#6B7280" }}
              >
                {isDone ? <Check size={14} /> : s.id}
              </div>
              <span className="text-[9px] text-gray-500 mt-1 text-center w-16 leading-tight hidden sm:block">{s.label}</span>
            </div>
            {!isLast && (
              <div className="w-8 h-0.5 mx-1 flex-shrink-0" style={{ background: s.id < current ? GREEN : "#E5E7EB" }} />
            )}
          </div>
        );
      })}
    </div>
  );
};

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

// ── Main Form Component ────────────────────────────────────────────────────
const PrivateFamilyIntakeForm = ({ user, onSubmitSuccess }) => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [errors, setErrors] = useState({});
  const fileInputRefs = useRef({});

  // ── Form state ──────────────────────────────────────────────────────────
  const [form, setForm] = useState({
    // Step 1
    applicationDate: new Date().toISOString().split("T")[0],
    referralSource: "",

    // Step 2 — Applicant
    applicantFullName: "",
    applicantStreet: "",
    applicantStreet2: "",
    applicantCity: "",
    applicantProvince: "",
    applicantPostal: "",
    applicantPhone: "",
    applicantEmail: user?.email || "",
    applicantRelationship: "",

    // Step 3 — Other Parent/Guardian
    otherGuardianName: "",
    otherGuardianPhone: "",
    otherGuardianEmail: "",
    otherGuardianAddress: "",
    otherGuardianRelationship: "",

    // Step 4 — Children
    children: [emptyChild()],

    // Step 5 — Services
    serviceTypes: [],

    // Step 6 — Schedule
    visitFrequency: "",
    visitDuration: "",
    visitLocation: "",
    preferredTimes: "",
    preferredDates: [],

    // Step 7 — Court & Welfare
    courtOrder: "",
    childWelfareInvolvement: "",

    // Step 8 — Special Needs
    specialNeeds: "",
    allergies: "",
    currentMedications: "",

    // Step 9 — Safety
    domesticViolence: "",
    additionalSafetyConcerns: "",

    // Step 10 — Emergency Contacts
    emergencyContacts: [emptyEmergency(), emptyEmergency()],

    // Step 11 — Additional
    additionalInfo: "",

    // Step 13 — Payment
    paymentResponsibility: "",
    paymentMethod: "",
    paymentNotes: "",
    paymentAck1: false,
    paymentAck2: false,
    paymentAck3: false,

    // Step 14 — Protocols
    protocolAckName: "",
    protocolAckDate: new Date().toISOString().split("T")[0],
    protocolAcknowledged: false,
  });

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }));

  // ── Validation per step ─────────────────────────────────────────────────
  const validate = () => {
    const e = {};
    if (step === 1) {
      if (!form.applicationDate) e.applicationDate = "Required";
    }
    if (step === 2) {
      if (!form.applicantFullName.trim()) e.applicantFullName = "Full name is required";
      if (!form.applicantStreet.trim()) e.applicantStreet = "Street address is required";
      if (!form.applicantCity.trim()) e.applicantCity = "City is required";
      if (!form.applicantProvince) e.applicantProvince = "Province is required";
      if (!form.applicantPhone.trim()) e.applicantPhone = "Phone is required";
      if (!form.applicantEmail.trim()) e.applicantEmail = "Email is required";
      if (!form.applicantRelationship) e.applicantRelationship = "Relationship is required";
    }
    if (step === 4) {
      form.children.forEach((c, i) => {
        if (!c.fullName.trim()) e[`child_${i}_name`] = "Name is required";
        if (!c.dob) e[`child_${i}_dob`] = "Date of birth is required";
      });
    }
    if (step === 5) {
      if (form.serviceTypes.length === 0) e.serviceTypes = "Select at least one service";
    }
    if (step === 10) {
      if (!form.emergencyContacts[0].fullName.trim()) e.ec1_name = "Custodial parent name is required";
      if (!form.emergencyContacts[0].phone.trim()) e.ec1_phone = "Phone is required";
    }
    if (step === 14) {
      if (!form.protocolAcknowledged) e.protocolAcknowledged = "You must acknowledge the protocols";
      if (!form.protocolAckName.trim()) e.protocolAckName = "Name is required";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = () => { if (validate()) setStep(s => Math.min(STEPS.length, s + 1)); };
  const back = () => { setErrors({}); setStep(s => Math.max(1, s - 1)); };

  // ── Child photo upload ──────────────────────────────────────────────────
  const handleChildPhoto = (idx, file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      const updated = [...form.children];
      updated[idx] = { ...updated[idx], photo: file, photoPreview: e.target.result };
      set("children", updated);
    };
    reader.readAsDataURL(file);
  };

  const addChild = () => set("children", [...form.children, emptyChild()]);
  const removeChild = (i) => set("children", form.children.filter((_, idx) => idx !== i));

  const updateChild = (i, field, val) => {
    const updated = [...form.children];
    updated[i] = { ...updated[i], [field]: val };
    set("children", updated);
  };

  const updateEC = (i, field, val) => {
    const updated = [...form.emergencyContacts];
    updated[i] = { ...updated[i], [field]: val };
    set("emergencyContacts", updated);
  };

  const toggleService = (svc) => {
    const curr = form.serviceTypes;
    set("serviceTypes", curr.includes(svc) ? curr.filter(s => s !== svc) : [...curr, svc]);
  };

  const toggleDate = (date) => {
    const str = date.toISOString().split("T")[0];
    const curr = form.preferredDates;
    set("preferredDates", curr.includes(str) ? curr.filter(d => d !== str) : [...curr, str]);
  };

  // ── Submit ───────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      // Upload child photos
      const childrenData = await Promise.all(form.children.map(async (c) => {
        let photoUrl = "";
        if (c.photo) {
          const fileRef = ref(storage, `private_family_forms/${Date.now()}_${c.photo.name}`);
          await uploadBytes(fileRef, c.photo);
          photoUrl = await getDownloadURL(fileRef);
        }
        return { fullName: c.fullName, dob: c.dob, age: calcAge(c.dob), gender: c.gender, custody: c.custody, photoUrl };
      }));

      const payload = {
        formType: "private",
        status: "Submitted",
        submittedAt: serverTimestamp(),
        submittedBy: user?.id || "",
        applicantEmail: form.applicantEmail,

        applicationDate: form.applicationDate,
        referralSource: form.referralSource,

        applicant: {
          fullName: form.applicantFullName,
          street: form.applicantStreet,
          street2: form.applicantStreet2,
          city: form.applicantCity,
          province: form.applicantProvince,
          postalCode: form.applicantPostal,
          phone: form.applicantPhone,
          email: form.applicantEmail,
          relationship: form.applicantRelationship,
        },

        otherGuardian: {
          fullName: form.otherGuardianName,
          phone: form.otherGuardianPhone,
          email: form.otherGuardianEmail,
          address: form.otherGuardianAddress,
          relationship: form.otherGuardianRelationship,
        },

        children: childrenData,
        familyName: form.applicantFullName.split(" ").pop() + " Family",

        serviceTypes: form.serviceTypes,

        visitSchedule: {
          frequency: form.visitFrequency,
          duration: form.visitDuration,
          location: form.visitLocation,
          preferredTimes: form.preferredTimes,
          preferredDates: form.preferredDates,
        },

        courtOrder: form.courtOrder,
        childWelfareInvolvement: form.childWelfareInvolvement,

        specialNeeds: form.specialNeeds,
        allergies: form.allergies,
        currentMedications: form.currentMedications,

        domesticViolence: form.domesticViolence,
        additionalSafetyConcerns: form.additionalSafetyConcerns,

        emergencyContacts: form.emergencyContacts,

        additionalInfo: form.additionalInfo,

        payment: {
          responsibility: form.paymentResponsibility,
          method: form.paymentMethod,
          notes: form.paymentNotes,
          acknowledged: form.paymentAck1 && form.paymentAck2 && form.paymentAck3,
        },

        engagementProtocols: {
          acknowledged: form.protocolAcknowledged,
          acknowledgedBy: form.protocolAckName,
          acknowledgedDate: form.protocolAckDate,
        },
      };

      await addDoc(collection(db, "InTakeForms"), payload);

      if (onSubmitSuccess) onSubmitSuccess();
      else navigate("/intake-form/submitted");
    } catch (err) {
      console.error("Submission error:", err);
      alert("Submission failed: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Step renderers ───────────────────────────────────────────────────────
  const renderStep = () => {
    switch (step) {

      // ── STEP 1: Application Information ─────────────────────────────────
      case 1: return (
        <SectionCard num={1} title="Application Information">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Date of Application"
              type="date"
              value={form.applicationDate}
              onChange={e => set("applicationDate", e.target.value)}
            />
            <div className="mb-4">
              <Label>Referral Source</Label>
              <select
                value={form.referralSource}
                onChange={e => set("referralSource", e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-700 bg-white"
              >
                <option value="">Select referral source</option>
                {REFERRAL_SOURCES.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          </div>
        </SectionCard>
      );

      // ── STEP 2: Applicant Information ────────────────────────────────────
      case 2: return (
        <SectionCard num={2} title="Applicant Information" subtitle="Person completing this form and requesting service">
          <Input
            label="Full Legal Name"
            required
            placeholder="First Name, Middle Name, Last Name"
            value={form.applicantFullName}
            onChange={e => set("applicantFullName", e.target.value)}
          />
          {errors.applicantFullName && <p className="text-red-500 text-xs -mt-3 mb-3">{errors.applicantFullName}</p>}

          <Input
            label="Street Address"
            required
            placeholder="Street number and name"
            value={form.applicantStreet}
            onChange={e => set("applicantStreet", e.target.value)}
          />
          {errors.applicantStreet && <p className="text-red-500 text-xs -mt-3 mb-3">{errors.applicantStreet}</p>}

          <Input
            label="Street Address Line 2 (Optional)"
            placeholder="Suite, apartment, or building number"
            value={form.applicantStreet2}
            onChange={e => set("applicantStreet2", e.target.value)}
          />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Input
                label="City"
                required
                value={form.applicantCity}
                onChange={e => set("applicantCity", e.target.value)}
              />
              {errors.applicantCity && <p className="text-red-500 text-xs -mt-3 mb-3">{errors.applicantCity}</p>}
            </div>
            <div>
              <Label required>Province</Label>
              <select
                value={form.applicantProvince}
                onChange={e => set("applicantProvince", e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-700 bg-white mb-4"
              >
                <option value="">Alberta</option>
                {PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              {errors.applicantProvince && <p className="text-red-500 text-xs -mt-3 mb-3">{errors.applicantProvince}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Input
                label="Postal Code"
                placeholder="e.g. T5J 1P6"
                value={form.applicantPostal}
                onChange={e => set("applicantPostal", e.target.value)}
              />
            </div>
            <div>
              <Input
                label="Cell Phone"
                required
                placeholder="(780) 123-4567"
                value={form.applicantPhone}
                onChange={e => set("applicantPhone", e.target.value)}
              />
              {errors.applicantPhone && <p className="text-red-500 text-xs -mt-3 mb-3">{errors.applicantPhone}</p>}
            </div>
          </div>

          <Input
            label="Email Address"
            required
            type="email"
            placeholder="your@email.com"
            value={form.applicantEmail}
            onChange={e => set("applicantEmail", e.target.value)}
          />
          {errors.applicantEmail && <p className="text-red-500 text-xs -mt-3 mb-3">{errors.applicantEmail}</p>}

          <div>
            <Label required>Relationship to Child/Children</Label>
            <select
              value={form.applicantRelationship}
              onChange={e => set("applicantRelationship", e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-700 bg-white mb-1"
            >
              <option value="">Select relationship</option>
              {RELATIONSHIPS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            {errors.applicantRelationship && <p className="text-red-500 text-xs">{errors.applicantRelationship}</p>}
          </div>
        </SectionCard>
      );

      // ── STEP 3: Other Parent/Guardian ─────────────────────────────────────
      case 3: return (
        <SectionCard num={3} title="Other Parent/Guardian Information">
          <Input
            label="Full Legal Name"
            placeholder="First Name, Middle Name, Last Name"
            value={form.otherGuardianName}
            onChange={e => set("otherGuardianName", e.target.value)}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Phone"
              placeholder="(780) 123-4567"
              value={form.otherGuardianPhone}
              onChange={e => set("otherGuardianPhone", e.target.value)}
            />
            <Input
              label="Email"
              type="email"
              value={form.otherGuardianEmail}
              onChange={e => set("otherGuardianEmail", e.target.value)}
            />
          </div>
          <Input
            label="Address"
            value={form.otherGuardianAddress}
            onChange={e => set("otherGuardianAddress", e.target.value)}
          />
          <Select
            label="Relationship to Child/Children"
            options={RELATIONSHIPS}
            placeholder="Select relationship"
            value={form.otherGuardianRelationship}
            onChange={v => set("otherGuardianRelationship", v)}
          />
        </SectionCard>
      );

      // ── STEP 4: Children's Information ────────────────────────────────────
      case 4: return (
        <SectionCard num={4} title="Children's Information">
          {form.children.map((child, i) => (
            <div key={i} className="border border-gray-200 rounded-xl p-4 mb-4 relative">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-bold text-gray-700">Child {i + 1}</h4>
                {form.children.length > 1 && (
                  <button onClick={() => removeChild(i)} className="text-red-400 hover:text-red-600">
                    <X size={16} />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label required>Child's Full Name</Label>
                  <input
                    value={child.fullName}
                    onChange={e => updateChild(i, "fullName", e.target.value)}
                    placeholder="First name, Last name"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-700 mb-1"
                  />
                  {errors[`child_${i}_name`] && <p className="text-red-500 text-xs">{errors[`child_${i}_name`]}</p>}
                </div>
                <div>
                  <Label required>Date of Birth</Label>
                  <input
                    type="date"
                    value={child.dob}
                    onChange={e => updateChild(i, "dob", e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-700 mb-1"
                  />
                  {errors[`child_${i}_dob`] && <p className="text-red-500 text-xs">{errors[`child_${i}_dob`]}</p>}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Age</Label>
                  <input
                    readOnly
                    value={calcAge(child.dob)}
                    placeholder="Auto-calculated"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50"
                  />
                </div>
                <div>
                  <Label>Gender</Label>
                  <select
                    value={child.gender}
                    onChange={e => updateChild(i, "gender", e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-700 bg-white"
                  >
                    <option value="">Select</option>
                    {GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div>
                  <Label>Custody</Label>
                  <select
                    value={child.custody}
                    onChange={e => updateChild(i, "custody", e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-700 bg-white"
                  >
                    <option value="">Select</option>
                    {CUSTODY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div className="mt-3">
                <Label>Child's Picture (Optional)</Label>
                <div
                  className="border border-dashed border-gray-300 rounded-lg p-4 flex flex-col items-center cursor-pointer hover:border-green-600 transition"
                  onClick={() => fileInputRefs.current[`child_${i}`]?.click()}
                >
                  {child.photoPreview ? (
                    <img src={child.photoPreview} alt="preview" className="w-20 h-20 rounded-full object-cover mb-2" />
                  ) : (
                    <Upload size={24} className="text-gray-400 mb-2" />
                  )}
                  <p className="text-xs text-gray-500">
                    {child.photoPreview ? "Click to change" : "Choose File — jpg, jpeg, PNG, or other image formats"}
                  </p>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    ref={el => fileInputRefs.current[`child_${i}`] = el}
                    onChange={e => handleChildPhoto(i, e.target.files[0])}
                  />
                </div>
              </div>
            </div>
          ))}

          <button
            onClick={addChild}
            className="flex items-center gap-2 text-sm font-semibold border border-dashed border-green-700 text-green-700 rounded-lg px-4 py-2 hover:bg-green-50 transition"
          >
            <Plus size={16} /> Add Child
          </button>
        </SectionCard>
      );

      // ── STEP 5: Type of Service Required ─────────────────────────────────
      case 5: return (
        <SectionCard num={5} title="Type of Service Required">
          <Label required>Service Type</Label>
          {errors.serviceTypes && <p className="text-red-500 text-xs mb-2">{errors.serviceTypes}</p>}
          {[
            "Transportation assistance with travel to and from visits",
            "Respite care (temporary care for the child)",
            "Supervised visits (visits monitored by trained staff)",
            "Supervised Exchanges",
          ].map(svc => (
            <label key={svc} className="flex items-start gap-3 mb-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.serviceTypes.includes(svc)}
                onChange={() => toggleService(svc)}
                className="mt-0.5 w-4 h-4 accent-green-800"
              />
              <span className="text-sm text-gray-700">{svc}</span>
            </label>
          ))}
        </SectionCard>
      );

      // ── STEP 6: Requested Visit Schedule ─────────────────────────────────
      case 6: return (
        <SectionCard num={6} title="Requested Visit Schedule">
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Requested Frequency"
              options={FREQUENCIES}
              placeholder="Select Frequency"
              value={form.visitFrequency}
              onChange={v => set("visitFrequency", v)}
            />
            <Select
              label="Requested Duration per Visit"
              options={DURATIONS}
              placeholder="Select duration"
              value={form.visitDuration}
              onChange={v => set("visitDuration", v)}
            />
          </div>
          <Select
            label="Visit Location"
            options={LOCATIONS}
            placeholder="Select location"
            value={form.visitLocation}
            onChange={v => set("visitLocation", v)}
          />
          <Input
            label="Preferred Times of Day"
            placeholder="e.g., Morning (8am-12pm), Afternoon (1pm-5pm)"
            value={form.preferredTimes}
            onChange={e => set("preferredTimes", e.target.value)}
          />

          <div className="mb-4">
            <Label>Select Preferred Visit Dates (Optional)</Label>
            <p className="text-xs text-gray-500 mb-2">Click on the calendar below to select your preferred visit dates. You can select dates over the next 6 months.</p>
            {form.preferredDates.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {form.preferredDates.map(d => (
                  <span key={d} className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full flex items-center gap-1">
                    {d}
                    <button onClick={() => set("preferredDates", form.preferredDates.filter(x => x !== d))}><X size={10} /></button>
                  </span>
                ))}
              </div>
            )}
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <DayPicker
                mode="multiple"
                selected={form.preferredDates.map(d => new Date(d + "T12:00:00"))}
                onDayClick={toggleDate}
                fromDate={new Date()}
                toDate={new Date(Date.now() + 6 * 30 * 24 * 60 * 60 * 1000)}
                styles={{ root: { margin: 0 } }}
              />
            </div>
          </div>
        </SectionCard>
      );

      // ── STEP 7: Court Order & Child Welfare ───────────────────────────────
      case 7: return (
        <>
          <SectionCard num={7} title="Court Order Information">
            <Radio
              label="Is there a court order in place?"
              options={["Yes", "No", "Pending"]}
              value={form.courtOrder}
              onChange={v => set("courtOrder", v)}
            />
          </SectionCard>
          <SectionCard num={8} title="Child Welfare Involvement">
            <Radio
              label="Is there current child welfare involvement?"
              options={["Yes", "No"]}
              value={form.childWelfareInvolvement}
              onChange={v => set("childWelfareInvolvement", v)}
            />
          </SectionCard>
        </>
      );

      // ── STEP 8: Special Needs & Accommodations ────────────────────────────
      case 8: return (
        <SectionCard num={9} title="Special Needs & Accommodations">
          <Textarea
            label="Child's Special Needs or Developmental Considerations"
            placeholder="Describe any special needs, developmental delays, behavioral considerations, or support requirements..."
            value={form.specialNeeds}
            onChange={e => set("specialNeeds", e.target.value)}
          />
          <Textarea
            label="Allergies (Food, Environmental, Medications)"
            placeholder="List any known allergies..."
            value={form.allergies}
            onChange={e => set("allergies", e.target.value)}
          />
          <Textarea
            label="Current Medications"
            placeholder="List any medications the child is currently taking..."
            value={form.currentMedications}
            onChange={e => set("currentMedications", e.target.value)}
          />
        </SectionCard>
      );

      // ── STEP 9: Safety & Risk Assessment ──────────────────────────────────
      case 9: return (
        <SectionCard num={10} title="Safety & Risk Assessment">
          <Radio
            label="History of domestic violence or family violence?"
            options={["Yes", "No"]}
            value={form.domesticViolence}
            onChange={v => set("domesticViolence", v)}
          />
          <Textarea
            label="Additional Safety Concerns or Risk Factors"
            placeholder="Please describe any other safety concerns, threats, or risk factors we should be aware of to ensure everyone's safety..."
            value={form.additionalSafetyConcerns}
            onChange={e => set("additionalSafetyConcerns", e.target.value)}
          />
        </SectionCard>
      );

      // ── STEP 10: Emergency Contacts ────────────────────────────────────────
      case 10: return (
        <SectionCard num={11} title="Emergency Contacts">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-5 text-xs text-blue-700">
            <strong>Important: Custodial Parent Information</strong><br />
            The first emergency contact should be the custodial parent (the parent who has primary custody of the child/children). This allows us to reach the legal guardian in case of any emergency during visits or services. The second contact is optional and can be another trusted individual over the custodial parent is unavailable.
          </div>

          <h4 className="text-sm font-bold text-gray-700 mb-3">Emergency Contact #1 (Custodial Parent)</h4>
          <div className="grid grid-cols-3 gap-4 mb-5">
            <div>
              <Label required>Full Name</Label>
              <input
                value={form.emergencyContacts[0].fullName}
                onChange={e => updateEC(0, "fullName", e.target.value)}
                placeholder="Full name"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-700"
              />
              {errors.ec1_name && <p className="text-red-500 text-xs mt-1">{errors.ec1_name}</p>}
            </div>
            <div>
              <Label>Relationship</Label>
              <input
                value={form.emergencyContacts[0].relationship}
                onChange={e => updateEC(0, "relationship", e.target.value)}
                placeholder="e.g., Mother, Father"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-700"
              />
            </div>
            <div>
              <Label required>Phone Number</Label>
              <input
                value={form.emergencyContacts[0].phone}
                onChange={e => updateEC(0, "phone", e.target.value)}
                placeholder="(780) 123-4567"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-700"
              />
              {errors.ec1_phone && <p className="text-red-500 text-xs mt-1">{errors.ec1_phone}</p>}
            </div>
          </div>

          <h4 className="text-sm font-bold text-gray-700 mb-1">Emergency Contact #2 (Optional Backup Contact)</h4>
          <p className="text-xs text-gray-500 mb-3">Provide a secondary contact person in case the custodial parent cannot be reached.</p>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Full Name</Label>
              <input
                value={form.emergencyContacts[1].fullName}
                onChange={e => updateEC(1, "fullName", e.target.value)}
                placeholder="Full name"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-700"
              />
            </div>
            <div>
              <Label>Relationship</Label>
              <input
                value={form.emergencyContacts[1].relationship}
                onChange={e => updateEC(1, "relationship", e.target.value)}
                placeholder="e.g., Grandmother, Aunt, Friend"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-700"
              />
            </div>
            <div>
              <Label>Phone Number</Label>
              <input
                value={form.emergencyContacts[1].phone}
                onChange={e => updateEC(1, "phone", e.target.value)}
                placeholder="(780) 123-4567"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-700"
              />
            </div>
          </div>
        </SectionCard>
      );

      // ── STEP 11: Additional Information ───────────────────────────────────
      case 11: return (
        <SectionCard num={12} title="Additional Information">
          <Textarea
            label="Is there anything else we should know about your situation?"
            placeholder="Please share any other relevant details, concerns, or information that may help us provide the best service..."
            value={form.additionalInfo}
            onChange={e => set("additionalInfo", e.target.value)}
          />
        </SectionCard>
      );

      // ── STEP 12: Service Rates & Fees ──────────────────────────────────────
      case 12: return (
        <SectionCard num={13} title="Service Rates & Fees">
          <p className="text-sm text-gray-600 mb-5">Family Forever operates on a fee-for-service basis. Our rates are designed to be accessible while ensuring quality, supervised access services.</p>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="border border-gray-200 rounded-xl p-4">
              <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                <span className="w-5 h-5 rounded border-2 border-gray-300 flex-shrink-0"></span>
                Supervised Visits
              </h4>
              <div className="space-y-1 text-sm text-gray-600">
                <div className="flex justify-between"><span>1-hour visit</span><span className="font-semibold">$75.00</span></div>
                <div className="flex justify-between"><span>2-hour visit</span><span className="font-semibold">$130.00</span></div>
                <div className="flex justify-between"><span>3-hour visit</span><span className="font-semibold">$180.00</span></div>
                <div className="flex justify-between"><span>4-hour visit</span><span className="font-semibold">$230.00</span></div>
              </div>
            </div>
            <div className="border border-gray-200 rounded-xl p-4">
              <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                <span className="w-5 h-5 rounded border-2 border-gray-300 flex-shrink-0"></span>
                Supervised Exchanges
              </h4>
              <div className="space-y-1 text-sm text-gray-600">
                <div className="flex justify-between"><span>Standard exchange</span><span className="font-semibold">$45.00</span></div>
                <div className="flex justify-between"><span>Weekend exchange</span><span className="font-semibold">$60.00</span></div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="border border-gray-200 rounded-xl p-4">
              <h4 className="text-sm font-bold text-gray-700 mb-3">Additional Services</h4>
              <div className="space-y-1 text-sm text-gray-600">
                <div className="flex justify-between"><span>Report writing</span><span className="font-semibold">$60.00</span></div>
                <div className="flex justify-between"><span>Court attendance</span><span className="font-semibold">$75/hr</span></div>
                <div className="flex justify-between"><span>File preparation</span><span className="font-semibold">$35.00</span></div>
              </div>
            </div>
            <div className="border border-gray-200 rounded-xl p-4">
              <h4 className="text-sm font-bold text-gray-700 mb-3">Cancellation Policy</h4>
              <div className="space-y-1 text-sm text-gray-600">
                <div className="flex justify-between"><span>No charge</span><span className="font-semibold text-green-700">24h+ notice</span></div>
                <div className="flex justify-between"><span>Full charge</span><span className="font-semibold text-red-600">&lt;24h notice</span></div>
              </div>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
            <strong>Financial Assistance:</strong> We understand that supervised access services represent a financial commitment. Sliding scale and payment plans may be available based on demonstrated financial need. Please discuss your situation with our intake coordinator.
          </div>
        </SectionCard>
      );

      // ── STEP 13: Payment Procedures ────────────────────────────────────────
      case 13: return (
        <SectionCard num={14} title="Payment Procedures">
          <Select
            label="Who will be responsible for payment?"
            required
            options={PAYMENT_RESP}
            placeholder="Select payment responsibility"
            value={form.paymentResponsibility}
            onChange={v => set("paymentResponsibility", v)}
          />
          <Select
            label="Preferred Payment Method"
            options={PAYMENT_METHODS}
            placeholder="Select payment method"
            value={form.paymentMethod}
            onChange={v => set("paymentMethod", v)}
          />
          <Textarea
            label="Payment Notes or Special Arrangements"
            placeholder="Please provide any additional information about payment arrangements, financial assistance needs, or special circumstances..."
            value={form.paymentNotes}
            onChange={e => set("paymentNotes", e.target.value)}
          />

          <div className="mt-2">
            <Label>Payment Policy Acknowledgement</Label>
            <div className="space-y-3">
              {[
                { key: "paymentAck1", text: "I understand and acknowledge the service rates and payment policies outlined above." },
                { key: "paymentAck2", text: "I understand that payment must be made at least 48 hours in advance of scheduled services." },
                { key: "paymentAck3", text: "I understand the cancellation policy; cancellations with less than 24 hours notice will be charged in full, regardless of who cancels the visit." },
              ].map(({ key, text }) => (
                <label key={key} className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form[key]}
                    onChange={e => set(key, e.target.checked)}
                    className="mt-0.5 w-4 h-4 accent-green-800"
                  />
                  <span className="text-sm text-gray-700">{text}</span>
                </label>
              ))}
            </div>
          </div>
        </SectionCard>
      );

      // ── STEP 14: Engagement Protocols ─────────────────────────────────────
      case 14: return (
        <SectionCard num={15} title="Engagement Protocols – Family Forever Inc.">
          <p className="text-sm text-gray-600 mb-4">Family Forever Inc. Engagement Protocols establish clear expectations for participants to ensure visits are conducted in a safe, respectful, and child-focused manner. All individuals participating in supervised visits are required to comply with these protocols. Failure to comply may result in immediate suspension or termination of the visit and/or services.</p>

          <div className="space-y-4 text-sm text-gray-700 mb-6 max-h-96 overflow-y-auto pr-2 border border-gray-100 rounded-lg p-4 bg-gray-50">
            {[
              { title: "1. Attendance and Scheduling", points: ["Participants must arrive on time and have respect for the approved visit location.", "Any inability to attend or request for changes must be communicated to the supervisor as soon as reasonably possible.", "Late arrivals may result in shortened or cancelled visits at the agency's discretion."] },
              { title: "2. Conduct and Professional Interaction", points: ["All participants are expected to behave respectfully and appropriately toward the child, staff, and other parties.", "Aggressive, confrontational, abusive, or disrespectful behaviour, whether in person, will not be tolerated.", "Concerns or feedback must be raised safely and through appropriate channels."] },
              { title: "3. Compliance With Supervision", points: ["Participants must follow all instructions provided by the supervising staff.", "Limits placed on activities, discussion, or movement must be respected at all times.", "Supervisors have the authority to intervene, redirect, or end a visit where necessary."] },
              { title: "4. Child Safety and Well-Being", points: ["The emotional and physical safety of the child is the primary focus of all visits.", "Participants must act in a manner that supports the child's comfort, security, and developmental needs.", "All agency emergency procedures must be followed without exception."] },
              { title: "5. Communication Standards", points: ["Conversations must remain between age-appropriate, supportive, and child-focused.", "Adult matters, legal issues, conflicts, or distressing topics must not be discussed in the child's presence.", "Language must be respectful, non-derogatory, and appropriate and supportive of the child's well-being."] },
              { title: "6. Physical Boundaries", points: ["Physical contact with the child must be appropriate, minimal, and consistent with supervision guidelines, court orders, and the child's comfort level.", "Physical contact with staff or supervisors is strictly prohibited."] },
              { title: "7. Activities and Materials", points: ["Only activities approved by the supervisor may occur during visits.", "Visually inappropriate or unapproved activities or materials are not permitted.", "All food, books, and materials must be age-appropriate and suitable for supervised settings."] },
              { title: "8. Substance Use", points: ["Attendance under the influence of alcohol, drugs, or impairing substances is strictly prohibited.", "If impairment is suspected, the supervisor may immediately terminate the visit."] },
              { title: "9. Confidentiality and Privacy", points: ["Confidential or sensitive information must not be discussed in the presence of the child.", "Case details must not be shared outside the agency unless authorized or legally required through appropriate channels."] },
              { title: "10. Photography and Recording", points: ["Audio or video recording of visits is prohibited unless explicitly authorized in writing by the agency.", "Photography of staff, supervisors, or other individuals is not permitted."] },
              { title: "11. Supervision Proximity", points: ["Supervisory staff will remain within appropriate proximity throughout the visit to ensure safety and compliance.", "The level of supervision is mandatory for all supervised visits."] },
              { title: "12. Supervisor's Role and Documentation", points: ["Supervisors provide neutral oversight and objective documentation.", "Requests to favour, amend, or question supervisor reports in ways that are not accurate will not be accepted.", "All records reflect factual observations only."] },
              { title: "13. Reporting Concerns", points: ["Any concerns must be raised respectfully with the Supervisor or through designated agency channels.", "Issues should not be discussed during the visit in a manner that impacts the child."] },
              { title: "14. Legal Compliance", points: ["All visits must comply with applicable court orders, legal agreements, and statutory requirements."] },
            ].map(({ title, points }) => (
              <div key={title}>
                <p className="font-semibold text-gray-800 mb-1">{title}</p>
                <ul className="list-disc list-inside space-y-1 text-gray-600">
                  {points.map((p, i) => <li key={i}>{p}</li>)}
                </ul>
              </div>
            ))}
          </div>

          <div className="border border-gray-200 rounded-xl p-4 bg-white">
            <h4 className="text-sm font-bold text-gray-800 mb-3">Acknowledgement of Engagement Protocols</h4>
            <p className="text-xs text-gray-500 mb-4">I acknowledge that I have read and understood the Engagement Protocols above and agree to comply with them throughout the visitation process.</p>

            <label className="flex items-start gap-3 cursor-pointer mb-4">
              <input
                type="checkbox"
                checked={form.protocolAcknowledged}
                onChange={e => set("protocolAcknowledged", e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-green-800"
              />
              <span className="text-sm text-gray-700">I acknowledge that I have read and understood the Engagement Protocols above and agree to comply with them throughout the visitation process.</span>
            </label>
            {errors.protocolAcknowledged && <p className="text-red-500 text-xs mb-3">{errors.protocolAcknowledged}</p>}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label required>Name</Label>
                <input
                  value={form.protocolAckName}
                  onChange={e => set("protocolAckName", e.target.value)}
                  placeholder="Type your full name"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-700"
                />
                {errors.protocolAckName && <p className="text-red-500 text-xs mt-1">{errors.protocolAckName}</p>}
              </div>
              <div>
                <Label required>Date</Label>
                <input
                  type="date"
                  value={form.protocolAckDate}
                  onChange={e => set("protocolAckDate", e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-700"
                />
              </div>
            </div>
          </div>
        </SectionCard>
      );

      default: return null;
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold text-gray-800">Family Service Request</h1>
              <p className="text-xs text-gray-500 mt-0.5">Family Forever Inc. — Private Family Intake Form</p>
            </div>
            <div className="text-right">
              <span className="text-xs text-gray-500">Step {step} of {STEPS.length}</span>
              <div className="w-32 h-1.5 bg-gray-200 rounded-full mt-1">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{ width: `${(step / STEPS.length) * 100}%`, background: GREEN }}
                />
              </div>
            </div>
          </div>
          <Stepper current={step} total={STEPS.length} />
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-6 py-6">
        {renderStep()}

        {/* Navigation Buttons */}
        <div className="flex justify-between items-center mt-4 pb-8">
          <button
            onClick={back}
            disabled={step === 1}
            className="flex items-center gap-2 px-5 py-2 border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            <ChevronLeft size={16} /> Back
          </button>

          {step < STEPS.length ? (
            <button
              onClick={next}
              className="flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-semibold text-white transition"
              style={{ background: GREEN }}
            >
              Continue <ChevronRight size={16} />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-semibold text-white transition disabled:opacity-60"
              style={{ background: GREEN }}
            >
              {submitting ? "Submitting..." : <><Check size={16} /> Submit Application</>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PrivateFamilyIntakeForm;
