import React, { useState } from "react";
import { addDoc, collection, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Check, Plus, X, ArrowLeft } from "lucide-react";

const GREEN = "#1f6f43";

const STEPS = [
  { id: 1, label: "Applicant Info" },
  { id: 2, label: "Family & Contacts" },
  { id: 3, label: "Visit Details" },
  { id: 4, label: "Legal & Risk" },
  { id: 5, label: "Fees & Guidelines" },
  { id: 6, label: "Consent & Signature" },
  { id: 7, label: "Engagement Protocols" },
];

const PROVINCES = [
  "Alberta", "British Columbia", "Manitoba", "New Brunswick",
  "Newfoundland and Labrador", "Northwest Territories", "Nova Scotia",
  "Nunavut", "Ontario", "Prince Edward Island", "Quebec", "Saskatchewan", "Yukon",
];

const COURT_ORDER_TYPES = [
  "Supervised Access / Supervised Parenting Time",
  "Access with Conditions",
  "No Contact Order (with supervised exception)",
  "Protection / Restraining Order",
  "Child Intervention (CFS) Order",
  "Interim / Temporary Order",
  "Family Law Act Order",
  "Divorce Act Order",
  "Other",
];

const RELEASE_PURPOSES = [
  "Court Documents",
  "Medical Information",
  "School Records",
  "CFS / Child & Family Services",
  "Other",
];

const FEES_ACKNOWLEDGEMENTS = [
  { key: "fee_hourly",         text: "I understand the hourly rate is $70/hour with a minimum 2-hour call-out." },
  { key: "fee_mileage",        text: "I understand the Mileage is calculated from and back to Family Forever Inc. Head office at $0.72/km. Actual travel time and distance may have a buffer of 8% to accommodate traffic, detours, or construction." },
  { key: "fee_reports",        text: "I understand reports are billed at $40 per report and will be issued once payment is received." },
  { key: "fee_court",          text: "I understand court appearances are billed at $850 per appearance." },
  { key: "fee_payment_timing", text: "I understand that all payments are due before scheduled weekend visits or 3 days prior to weekday visits." },
  { key: "fee_reminder",       text: "I understand that one payment reminder will be sent. If payment is not received on time, Family Forever Inc. will cancel the visit to allow another family to access the time slot." },
  { key: "fee_emt",            text: "I understand payments are made by Email Money Transfer (EMT). Instructions will be provided after the first visit is booked." },
  { key: "fee_refundable",     text: "I understand that all fees are refundable with more than 24 hours' notice." },
  { key: "fee_noshow",         text: "I understand that less than 24 hour cancellation / late cancellations or no-shows will be recorded as such and no refund will be provided. This will be documented in the file and may be shared with both parties upon request." },
  { key: "fee_receipts",       text: "I understand receipts are available upon request." },
];

const PROGRAM_GUIDELINES = [
  { key: "pg_payment",    text: "I understand visits may be cancelled if payment is not received on time." },
  { key: "pg_intro",      text: "I understand the first visit is an introduction visit and may be shorter." },
  { key: "pg_court",      text: "I understand the agency follows court orders but cannot enforce them." },
  { key: "pg_notes",      text: "I understand visit notes are recorded and available upon request for a fee." },
  { key: "pg_safety",     text: "I understand visits may be terminated if safety concerns arise." },
  { key: "pg_abusive",    text: "I understand abusive, threatening, or disrespectful behavior will result in termination of services." },
  { key: "pg_child",      text: "I understand if the child does not wish to participate, the visit may end without refund." },
  { key: "pg_ontime",     text: "I understand all parties must arrive on time; late arrivals may result in shortened or cancelled visits." },
  { key: "pg_toys",       text: "I understand appropriate toys and activities are welcome; no inappropriate items allowed." },
  { key: "pg_photo",      text: "I understand photography may be permitted unless restricted; video/recording is prohibited." },
  { key: "pg_weapons",    text: "I understand no weapons, pets, or unauthorized individuals are allowed." },
  { key: "pg_meds",       text: "I understand medication may only be administered by approved caregivers." },
  { key: "pg_dropoff",    text: "I understand drop-off and pick-up procedures must be followed as directed." },
  { key: "pg_supervision",text: "I understand extra supervision time is billable." },
];

const ENGAGEMENT_PROTOCOLS = [
  {
    num: "1", title: "Attendance and Scheduling",
    bullets: [
      "Participants must arrive on time and remain for the approved visit duration.",
      "Any inability to attend or request for changes must be communicated to the supervisor as soon as reasonably possible.",
      "Late arrivals may result in shortened or cancelled visits at the agency's discretion.",
    ],
  },
  {
    num: "2", title: "Conduct and Professional Interaction",
    bullets: [
      "All participants are expected to behave respectfully and appropriately toward the child, staff, and other parties.",
      "Aggressive, confrontational, abusive, or disrespectful behaviour—verbal or physical—will not be tolerated.",
      "Concerns or feedback must be raised calmly and through appropriate channels.",
    ],
  },
  {
    num: "3", title: "Compliance With Supervision",
    bullets: [
      "Participants must follow all instructions provided by the supervising staff.",
      "Limits placed on activities, interaction, or movement must be respected at all times.",
      "Supervisors have the authority to intervene, redirect, or end a visit where necessary.",
    ],
  },
  {
    num: "4", title: "Child Safety and Well-Being",
    bullets: [
      "The emotional and physical safety of the child is the primary focus of all visits.",
      "Participants must act in a manner that supports the child's comfort, security, and developmental needs.",
      "All agency emergency procedures must be followed without exception.",
    ],
  },
  {
    num: "5", title: "Communication Standards",
    bullets: [
      "Conversations must remain age-appropriate, supportive, and child-focused.",
      "Adult matters, legal issues, conflicts, or distressing topics must not be discussed in the child's presence.",
      "Language must be respectful, non-derogatory, and appropriate and English at all times.",
    ],
  },
  {
    num: "6", title: "Physical Boundaries",
    bullets: [
      "Physical contact with the child must be appropriate, minimal, and consistent with supervision guidelines, court orders, and the child's comfort level.",
      "Physical contact with staff or supervisors is strictly prohibited.",
    ],
  },
  {
    num: "7", title: "Activities and Materials",
    bullets: [
      "Only activities approved by the supervisor may occur during visits.",
      "Unsafe, inappropriate, or unapproved activities or materials are not permitted.",
      "All toys, books, and materials must be age-appropriate and suitable for supervised settings.",
    ],
  },
  {
    num: "8", title: "Substance Use",
    bullets: [
      "Attendance under the influence of alcohol, drugs, or impairing substances is strictly prohibited.",
      "If impairment is suspected, the supervisor may immediately terminate the visit.",
    ],
  },
  {
    num: "9", title: "Confidentiality and Privacy",
    bullets: [
      "Confidential or sensitive information must not be discussed in the presence of the child.",
      "Visit details must not be shared outside authorized or legally required reporting channels.",
    ],
  },
  {
    num: "10", title: "Photography and Recording",
    bullets: [
      "Audio or video recording of sessions is strictly prohibited unless authorized in writing by the agency.",
      "Photography of staff, supervisors, or other individuals is not permitted.",
    ],
  },
  {
    num: "11", title: "Supervision Proximity",
    bullets: [
      "Supervising staff will remain within appropriate proximity throughout the visit to ensure safety and compliance.",
      "This level of supervision is mandatory for all supervised visits.",
    ],
  },
  {
    num: "12", title: "Supervisor's Role and Documentation",
    bullets: [
      "Supervisors provide neutral oversight and objective documentation.",
      "Requests for biased, altered, or opinion-based reporting will not be accepted.",
      "All records reflect factual observations only.",
    ],
  },
  {
    num: "13", title: "Reporting Concerns",
    bullets: [
      "Any concerns must be raised respectfully with the supervisor or through designated agency channels.",
      "Issues should not be discussed during the visit in a manner that impacts the child.",
    ],
  },
  {
    num: "14", title: "Legal Compliance",
    bullets: [
      "All visits must comply with applicable court orders, legal agreements, and statutory requirements.",
      "Legal questions or disputes must be addressed with legal counsel and not during supervised visits.",
    ],
  },
];

const emptyChild = () => ({ name: "", dob: "" });
const emptyVisitor = () => ({ name: "", age: "", relationship: "" });

const emptyForm = () => ({
  // Section 1 - Applicant
  submissionDate: new Date().toISOString().split("T")[0],
  isCustodialParent: "",
  firstName: "",
  lastName: "",
  phone: "",
  email: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  province: "Alberta",
  postalCode: "",
  relationshipToChildren: "",

  // Section 2 - Children
  familyLastName: "",
  children: [emptyChild()],
  primaryPlacementAddress: "",

  // Section 3 - Parent Contacts
  motherFirstName: "",
  motherLastName: "",
  motherPhone: "",
  motherEmail: "",
  fatherFirstName: "",
  fatherLastName: "",
  fatherPhone: "",
  fatherEmail: "",

  // Section 4 - Emergency
  emergencyName: "",
  emergencyRelationship: "",
  emergencyPhone: "",

  // Section 5 - Cultural
  culturalSupports: "",

  // Section 6 - Visit Info
  visitDetails: "",
  requestedVisitDates: "",
  preferredLocation: "",
  preferredLocationOther: "",

  // Section 7 - Approved Visitors
  approvedVisitors: [emptyVisitor()],

  // Section 8 - Visit Goals
  visitGoal1: "",
  visitGoal2: "",
  purposeOfVisit: "",

  // Section 9 - Legal & Risk
  hasCourtOrder: "",
  courtOrderTypes: [],
  courtOrderOther: "",
  issuingCourt: "",
  dateOfOrder: "",
  knownRisks: "",
  hasRestrainingOrder: "",
  restrainingDetails: "",

  // Section 10 - Fees Initials
  ...Object.fromEntries(FEES_ACKNOWLEDGEMENTS.map(a => [a.key, ""])),

  // Section 11 - Program Guidelines Initials
  ...Object.fromEntries(PROGRAM_GUIDELINES.map(a => [a.key, ""])),

  // Section 12 - Confidentiality
  consentFullName: "",
  consentSignature: "",
  consentDate: new Date().toISOString().split("T")[0],

  // Section 13 - Release of Information
  disclosingPartyName: "",
  releasePurposes: [],
  releaseOther: "",
  releaseSignature: "",
  releaseDate: new Date().toISOString().split("T")[0],

  // Section 14 - Digital Signature
  sigFullName: "",
  sigSignature: "",
  sigDate: new Date().toISOString().split("T")[0],

  // Engagement Protocols Acknowledgement
  protocolAckName: "",
  protocolAckSignature: "",
  protocolAckDate: new Date().toISOString().split("T")[0],
});

// ── UI Components ──────────────────────────────────────────────────────────

const Label = ({ children, required }) => (
  <label className="block text-sm font-semibold text-gray-700 mb-1">
    {children}{required && <span className="text-red-500 ml-1">*</span>}
  </label>
);

const Input = ({ label, required, error, ...props }) => (
  <div className="mb-4">
    {label && <Label required={required}>{label}</Label>}
    <input
      {...props}
      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-700"
      style={{ borderColor: error ? "#ef4444" : "#d1d5db" }}
    />
    {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
  </div>
);

const Textarea = ({ label, required, error, ...props }) => (
  <div className="mb-4">
    {label && <Label required={required}>{label}</Label>}
    <textarea
      rows={3}
      {...props}
      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-700 resize-none"
      style={{ borderColor: error ? "#ef4444" : "#d1d5db" }}
    />
    {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
  </div>
);

const Select = ({ label, required, options, placeholder, value, onChange, error }) => (
  <div className="mb-4">
    {label && <Label required={required}>{label}</Label>}
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-700 bg-white"
      style={{ borderColor: error ? "#ef4444" : "#d1d5db" }}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
    {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
  </div>
);

const RadioGroup = ({ label, required, options, value, onChange, error }) => (
  <div className="mb-4">
    {label && <Label required={required}>{label}</Label>}
    <div className="flex gap-6 mt-2">
      {options.map(opt => (
        <label key={opt} className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
          <input
            type="radio"
            value={opt}
            checked={value === opt}
            onChange={() => onChange(opt)}
            className="w-4 h-4 text-green-700 focus:ring-green-700"
          />
          {opt}
        </label>
      ))}
    </div>
    {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
  </div>
);

const SectionCard = ({ title, description, children, titleTag }) => (
  <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
    {title && (
      <div className="mb-4 pb-3 border-b border-gray-100">
        <h3 className="text-base font-bold text-gray-800">{title}</h3>
        {titleTag && (
          <span className="inline-block mt-1 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-0.5">{titleTag}</span>
        )}
        {description && <p className="text-xs text-gray-500 mt-1 italic">{description}</p>}
      </div>
    )}
    {children}
  </div>
);

const InitialsRow = ({ text, value, onChange, error }) => (
  <div className="flex items-start gap-3 py-3 border-b border-gray-100 last:border-0">
    <div className="flex-shrink-0 w-14">
      <input
        type="text"
        maxLength={5}
        value={value}
        onChange={e => onChange(e.target.value.toUpperCase())}
        placeholder="___"
        className="w-full border rounded px-2 py-1 text-sm text-center font-bold focus:outline-none focus:border-green-700 uppercase tracking-widest"
        style={{ borderColor: error ? "#ef4444" : "#d1d5db" }}
      />
    </div>
    <div className="flex-1 text-sm text-gray-700 leading-relaxed pt-0.5">{text}</div>
  </div>
);

const Stepper = ({ current }) => {
  const pct = current <= 1 ? 0 : ((current - 1) / (STEPS.length - 1)) * 100;
  return (
    <div className="relative flex items-start justify-between mb-6 overflow-x-auto pb-1">
      <div className="absolute top-4 left-0 right-0 h-0.5 bg-gray-200 z-0">
        <div className="h-full transition-all duration-300" style={{ width: `${pct}%`, background: GREEN }} />
      </div>
      {STEPS.map(s => (
        <div key={s.id} className="relative z-10 flex flex-col items-center flex-1">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all bg-white"
            style={{
              background: s.id < current ? GREEN : s.id === current ? GREEN : "#fff",
              borderColor: s.id <= current ? GREEN : "#d1d5db",
              color: s.id <= current ? "#fff" : "#9ca3af",
            }}
          >
            {s.id < current ? <Check size={13} strokeWidth={3} /> : s.id}
          </div>
          <span
            className="text-xs mt-1 font-medium text-center leading-tight hidden sm:block"
            style={{ color: s.id <= current ? GREEN : "#9ca3af", maxWidth: 70 }}
          >
            {s.label}
          </span>
        </div>
      ))}
    </div>
  );
};

// ── Main Component ─────────────────────────────────────────────────────────

const FamilyIntakeAssessmentForm = ({ user, onSubmitSuccess }) => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(emptyForm());
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const setChild = (idx, field, value) => {
    const updated = form.children.map((c, i) => i === idx ? { ...c, [field]: value } : c);
    set("children", updated);
  };
  const addChild = () => set("children", [...form.children, emptyChild()]);
  const removeChild = idx => set("children", form.children.filter((_, i) => i !== idx));

  const setVisitor = (idx, field, value) => {
    const updated = form.approvedVisitors.map((v, i) => i === idx ? { ...v, [field]: value } : v);
    set("approvedVisitors", updated);
  };
  const addVisitor = () => set("approvedVisitors", [...form.approvedVisitors, emptyVisitor()]);
  const removeVisitor = idx => set("approvedVisitors", form.approvedVisitors.filter((_, i) => i !== idx));

  const toggleCourtType = type => {
    const curr = form.courtOrderTypes;
    set("courtOrderTypes", curr.includes(type) ? curr.filter(t => t !== type) : [...curr, type]);
  };
  const toggleReleasePurpose = p => {
    const curr = form.releasePurposes;
    set("releasePurposes", curr.includes(p) ? curr.filter(x => x !== p) : [...curr, p]);
  };

  const validate = () => {
    const errs = {};
    if (step === 1) {
      if (!form.isCustodialParent) errs.isCustodialParent = "Required";
      if (!form.firstName.trim()) errs.firstName = "Required";
      if (!form.lastName.trim()) errs.lastName = "Required";
      if (!form.phone.trim()) errs.phone = "Required";
      if (!form.email.trim()) errs.email = "Required";
      if (!form.addressLine1.trim()) errs.addressLine1 = "Required";
      if (!form.city.trim()) errs.city = "Required";
      if (!form.postalCode.trim()) errs.postalCode = "Required";
      if (!form.relationshipToChildren.trim()) errs.relationshipToChildren = "Required";
      if (!form.familyLastName.trim()) errs.familyLastName = "Required";
      if (form.children.some(c => !c.name.trim())) errs.childrenNames = "All children must have a name";
    }
    if (step === 2) {
      if (!form.emergencyName.trim()) errs.emergencyName = "Required";
      if (!form.emergencyPhone.trim()) errs.emergencyPhone = "Required";
    }
    if (step === 3) {
      if (!form.visitDetails.trim()) errs.visitDetails = "Required";
      if (!form.preferredLocation) errs.preferredLocation = "Required";
      if (form.preferredLocation === "Other" && !form.preferredLocationOther.trim()) errs.preferredLocationOther = "Required";
      if (!form.purposeOfVisit.trim()) errs.purposeOfVisit = "Required";
    }
    if (step === 4) {
      if (!form.hasCourtOrder) errs.hasCourtOrder = "Required";
      if (!form.hasRestrainingOrder) errs.hasRestrainingOrder = "Required";
    }
    if (step === 5) {
      FEES_ACKNOWLEDGEMENTS.forEach(a => {
        if (!form[a.key].trim()) errs[a.key] = "Required";
      });
      PROGRAM_GUIDELINES.forEach(a => {
        if (!form[a.key].trim()) errs[a.key] = "Required";
      });
    }
    if (step === 6) {
      if (!form.consentFullName.trim()) errs.consentFullName = "Required";
      if (!form.consentSignature.trim()) errs.consentSignature = "Required";
      if (!form.disclosingPartyName.trim()) errs.disclosingPartyName = "Required";
      if (!form.releaseSignature.trim()) errs.releaseSignature = "Required";
      if (!form.sigFullName.trim()) errs.sigFullName = "Required";
      if (!form.sigSignature.trim()) errs.sigSignature = "Required";
    }
    if (step === 7) {
      if (!form.protocolAckName.trim()) errs.protocolAckName = "Required";
      if (!form.protocolAckSignature.trim()) errs.protocolAckSignature = "Required";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = () => {
    if (!validate()) return;
    setStep(s => s + 1);
    window.scrollTo(0, 0);
  };
  const handleBack = () => {
    setStep(s => s - 1);
    window.scrollTo(0, 0);
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      const payload = {
        formType: "familyIntakeAssessment",
        status: "Submitted",
        submittedAt: serverTimestamp(),
        submittedBy: user?.id || "",
        applicantEmail: user?.email || "",
        ...form,
      };
      const docRef = await addDoc(collection(db, "familyIntakeForms"), payload);
      if (user?.id) {
        await updateDoc(doc(db, "intakeUsers", user.id), {
          familyIntakeFormId: docRef.id,
          familyIntakeStatus: "Submitted",
        });
      }
      if (onSubmitSuccess) onSubmitSuccess();
      else navigate("/intake-form/submitted");
    } catch (err) {
      console.error("Submit error:", err);
      alert("Failed to submit: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Step Renderers ─────────────────────────────────────────────────────────

  const renderStep1 = () => (
    <>
      <SectionCard title="Section 1 – Applicant Information">
        <div className="grid grid-cols-2 gap-4">
          <Input label="Today's Date" type="date" value={form.submissionDate} onChange={e => set("submissionDate", e.target.value)} />
        </div>

        <RadioGroup
          label="Are you the Custodial Parent/Guardian?"
          required
          options={["Yes", "No"]}
          value={form.isCustodialParent}
          onChange={v => set("isCustodialParent", v)}
          error={errors.isCustodialParent}
        />

        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Name of Person Submitting Intake</p>
        <div className="grid grid-cols-2 gap-4">
          <Input label="First Name" required value={form.firstName} onChange={e => set("firstName", e.target.value)} error={errors.firstName} />
          <Input label="Last Name" required value={form.lastName} onChange={e => set("lastName", e.target.value)} error={errors.lastName} />
        </div>
        <Input label="Phone Number" required type="tel" value={form.phone} onChange={e => set("phone", e.target.value)} error={errors.phone} />
        <Input label="Email Address" required type="email" value={form.email} onChange={e => set("email", e.target.value)} error={errors.email} />

        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 mt-2">Home Address</p>
        <Input label="Address Line 1" required value={form.addressLine1} onChange={e => set("addressLine1", e.target.value)} error={errors.addressLine1} />
        <Input label="Address Line 2" value={form.addressLine2} onChange={e => set("addressLine2", e.target.value)} />
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-1">
            <Input label="City" required value={form.city} onChange={e => set("city", e.target.value)} error={errors.city} />
          </div>
          <Select
            label="Province"
            options={PROVINCES}
            value={form.province}
            onChange={v => set("province", v)}
          />
          <Input label="Postal Code" required value={form.postalCode} onChange={e => set("postalCode", e.target.value)} error={errors.postalCode} />
        </div>
        <Input label="Country" value="Canada" disabled />
        <Input
          label="Relationship to Child(ren)"
          required
          placeholder="e.g. Mother, Father, Legal Guardian"
          value={form.relationshipToChildren}
          onChange={e => set("relationshipToChildren", e.target.value)}
          error={errors.relationshipToChildren}
        />
      </SectionCard>

      <SectionCard title="Section 2 – Child(ren) Information">
        <Input label="Family Last Name" required value={form.familyLastName} onChange={e => set("familyLastName", e.target.value)} error={errors.familyLastName} />

        <div className="mb-4">
          <Label required>Child(ren)'s Name(s) &amp; Date(s) of Birth</Label>
          {errors.childrenNames && <p className="text-red-500 text-xs mb-2">{errors.childrenNames}</p>}
          {form.children.map((child, idx) => (
            <div key={idx} className="flex items-center gap-3 mb-2">
              <span className="text-sm text-gray-500 font-semibold w-4 flex-shrink-0">{idx + 1}.</span>
              <div className="flex-1 grid grid-cols-2 gap-3">
                <input
                  placeholder="Full Name"
                  value={child.name}
                  onChange={e => setChild(idx, "name", e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-700"
                />
                <input
                  type="date"
                  value={child.dob}
                  onChange={e => setChild(idx, "dob", e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-700"
                />
              </div>
              {form.children.length > 1 && (
                <button onClick={() => removeChild(idx)} className="p-1.5 rounded-lg border border-red-200 text-red-400 hover:bg-red-50 flex-shrink-0">
                  <X size={14} />
                </button>
              )}
            </div>
          ))}
          {form.children.length < 6 && (
            <button
              onClick={addChild}
              className="mt-2 flex items-center gap-2 text-sm font-semibold px-3 py-2 border border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-green-600 hover:text-green-700 transition-all"
            >
              <Plus size={14} /> Add Child
            </button>
          )}
          <p className="text-xs text-gray-400 mt-2">(Attach additional sheet if required)</p>
        </div>

        <Input
          label="Primary Placement Address of Child(ren)"
          placeholder="If unknown, write N/A"
          value={form.primaryPlacementAddress}
          onChange={e => set("primaryPlacementAddress", e.target.value)}
        />
      </SectionCard>
    </>
  );

  const renderStep2 = () => (
    <>
      <SectionCard
        title="Section 3 – Parent / Legal Guardian Contact Information"
        description="For contact purposes only. Visits cannot be scheduled until communication is established."
      >
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Mother / Legal Guardian</p>
        <div className="grid grid-cols-2 gap-4">
          <Input label="First Name" value={form.motherFirstName} onChange={e => set("motherFirstName", e.target.value)} />
          <Input label="Last Name" value={form.motherLastName} onChange={e => set("motherLastName", e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Phone" type="tel" value={form.motherPhone} onChange={e => set("motherPhone", e.target.value)} />
          <Input label="Email" type="email" value={form.motherEmail} onChange={e => set("motherEmail", e.target.value)} />
        </div>

        <div className="border-t border-gray-100 pt-4 mt-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Father / Legal Guardian</p>
          <div className="grid grid-cols-2 gap-4">
            <Input label="First Name" value={form.fatherFirstName} onChange={e => set("fatherFirstName", e.target.value)} />
            <Input label="Last Name" value={form.fatherLastName} onChange={e => set("fatherLastName", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Phone" type="tel" value={form.fatherPhone} onChange={e => set("fatherPhone", e.target.value)} />
            <Input label="Email" type="email" value={form.fatherEmail} onChange={e => set("fatherEmail", e.target.value)} />
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Section 4 – Emergency Contact">
        <Input label="Emergency Contact Name" required value={form.emergencyName} onChange={e => set("emergencyName", e.target.value)} error={errors.emergencyName} />
        <Input label="Relationship" value={form.emergencyRelationship} onChange={e => set("emergencyRelationship", e.target.value)} />
        <Input label="Phone Number" required type="tel" value={form.emergencyPhone} onChange={e => set("emergencyPhone", e.target.value)} error={errors.emergencyPhone} />
      </SectionCard>

      <SectionCard title="Section 5 – Cultural &amp; Accessibility Supports">
        <Textarea
          label="Do you require any cultural, spiritual, language, or accessibility supports?"
          placeholder="e.g., smudging, interpreter, mobility accommodations"
          value={form.culturalSupports}
          onChange={e => set("culturalSupports", e.target.value)}
        />
      </SectionCard>
    </>
  );

  const renderStep3 = () => (
    <>
      <SectionCard title="Section 6 – Visit Information">
        <Textarea
          label="Visit Details / Court Order Information"
          required
          placeholder="Include any restrictions, conditions, or special instructions"
          value={form.visitDetails}
          onChange={e => set("visitDetails", e.target.value)}
          error={errors.visitDetails}
        />

        <div className="mb-4">
          <Label>Requested Visit Date(s) &amp; Time(s)</Label>
          <p className="text-xs text-gray-500 italic mb-2">
            Note: Requested times are subject to availability. We do not recommend specifying exact times in court orders as scheduling depends on visit length and staffing.
          </p>
          <Textarea
            value={form.requestedVisitDates}
            onChange={e => set("requestedVisitDates", e.target.value)}
            placeholder="Enter preferred dates and times..."
          />
        </div>

        <div className="mb-4">
          <Label required>Preferred Visit Location</Label>
          <div className="flex flex-col gap-2 mt-2">
            {["Agency Facility", "Community Location", "Other"].map(loc => (
              <label
                key={loc}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all text-sm ${
                  form.preferredLocation === loc ? "border-green-700 bg-green-50" : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <input
                  type="radio"
                  checked={form.preferredLocation === loc}
                  onChange={() => set("preferredLocation", loc)}
                  className="w-4 h-4 text-green-700"
                />
                {loc}
              </label>
            ))}
          </div>
          {errors.preferredLocation && <p className="text-red-500 text-xs mt-1">{errors.preferredLocation}</p>}
          {form.preferredLocation === "Other" && (
            <Input
              className="mt-3"
              placeholder="Please specify location"
              value={form.preferredLocationOther}
              onChange={e => set("preferredLocationOther", e.target.value)}
              error={errors.preferredLocationOther}
            />
          )}
          <p className="text-xs text-gray-500 italic mt-2">
            Facility-based and community-based visits are available. Families may request either option; however, the final determination will be made by Family Forever Inc. based on safety, readiness, court direction, and professional assessment.
          </p>
        </div>
      </SectionCard>

      <SectionCard
        title="Section 7 – Approved Visitors"
        description="List all individuals approved to attend visits: Name, Age, relationship to the child (per court order or custodial approval)"
      >
        {form.approvedVisitors.map((v, idx) => (
          <div key={idx} className="flex items-center gap-3 mb-2">
            <span className="text-sm text-gray-500 font-semibold w-4 flex-shrink-0">{idx + 1}.</span>
            <div className="flex-1 grid grid-cols-3 gap-2">
              <input placeholder="Full Name" value={v.name} onChange={e => setVisitor(idx, "name", e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-700" />
              <input placeholder="Age" type="number" min="0" value={v.age} onChange={e => setVisitor(idx, "age", e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-700" />
              <input placeholder="Relationship to Child" value={v.relationship} onChange={e => setVisitor(idx, "relationship", e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-700" />
            </div>
            {form.approvedVisitors.length > 1 && (
              <button onClick={() => removeVisitor(idx)} className="p-1.5 rounded-lg border border-red-200 text-red-400 hover:bg-red-50">
                <X size={14} />
              </button>
            )}
          </div>
        ))}
        {form.approvedVisitors.length < 10 && (
          <button
            onClick={addVisitor}
            className="mt-3 flex items-center gap-2 text-sm font-semibold px-3 py-2 border border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-green-600 hover:text-green-700 transition-all"
          >
            <Plus size={14} /> Add Visitor
          </button>
        )}
      </SectionCard>

      <SectionCard title="Section 8 – Visit Goals &amp; Phase">
        <Label>List Two Visit Goals</Label>
        <div className="flex items-start gap-3 mb-3">
          <span className="text-sm font-semibold text-gray-500 mt-2 w-4">1.</span>
          <div className="flex-1">
            <Input value={form.visitGoal1} onChange={e => set("visitGoal1", e.target.value)} placeholder="First visit goal" />
          </div>
        </div>
        <div className="flex items-start gap-3 mb-4">
          <span className="text-sm font-semibold text-gray-500 mt-2 w-4">2.</span>
          <div className="flex-1">
            <Input value={form.visitGoal2} onChange={e => set("visitGoal2", e.target.value)} placeholder="Second visit goal" />
          </div>
        </div>
        <Input
          label="Purpose of Visit"
          required
          value={form.purposeOfVisit}
          onChange={e => set("purposeOfVisit", e.target.value)}
          error={errors.purposeOfVisit}
        />
      </SectionCard>
    </>
  );

  const renderStep4 = () => (
    <SectionCard title="Section 9 – Legal &amp; Risk Information">
      <RadioGroup
        label="Is there a court order or legal agreement in place?"
        required
        options={["Yes", "No"]}
        value={form.hasCourtOrder}
        onChange={v => set("hasCourtOrder", v)}
        error={errors.hasCourtOrder}
      />
      {form.hasCourtOrder === "Yes" && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 italic">
          If yes, a copy must be provided before services are scheduled.
        </p>
      )}

      <div className="mb-4">
        <Label>Type of Court Order (check all that apply)</Label>
        <div className="flex flex-col gap-2 mt-2">
          {COURT_ORDER_TYPES.map(type => (
            <label
              key={type}
              className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all text-sm ${
                form.courtOrderTypes.includes(type) ? "border-green-700 bg-green-50" : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <input
                type="checkbox"
                checked={form.courtOrderTypes.includes(type)}
                onChange={() => toggleCourtType(type)}
                className="w-4 h-4 rounded text-green-700"
              />
              {type}
            </label>
          ))}
        </div>
        {form.courtOrderTypes.includes("Other") && (
          <Input className="mt-3" placeholder="Specify other court order type" value={form.courtOrderOther} onChange={e => set("courtOrderOther", e.target.value)} />
        )}
      </div>

      <Input label="Issuing Court / Judge (if known)" value={form.issuingCourt} onChange={e => set("issuingCourt", e.target.value)} />
      <Input label="Date of Order" type="date" value={form.dateOfOrder} onChange={e => set("dateOfOrder", e.target.value)} />

      <div className="mb-4">
        <Label>Known Risks / Important Information</Label>
        <p className="text-xs text-gray-500 italic mb-1">(e.g., safety concerns, infections, court-ordered conditions)</p>
        <textarea
          rows={4}
          value={form.knownRisks}
          onChange={e => set("knownRisks", e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-700 resize-none"
        />
      </div>

      <RadioGroup
        label="Are there any restraining / protection orders?"
        required
        options={["Yes", "No"]}
        value={form.hasRestrainingOrder}
        onChange={v => set("hasRestrainingOrder", v)}
        error={errors.hasRestrainingOrder}
      />
      {form.hasRestrainingOrder === "Yes" && (
        <>
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3 italic">
            If yes, a copy must be provided before services begin.
          </p>
          <Textarea
            placeholder="Please provide details..."
            value={form.restrainingDetails}
            onChange={e => set("restrainingDetails", e.target.value)}
          />
        </>
      )}
    </SectionCard>
  );

  const renderStep5 = () => (
    <>
      <SectionCard title="Section 10 – Fees &amp; Billing Acknowledgement" titleTag="Initial Each Line">
        <p className="text-xs text-gray-500 mb-4">
          Please write your initials in the box beside each statement to confirm you have read and understood it.
        </p>
        <div className="flex items-center justify-between mb-1 px-1">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide w-14 text-center">Initials</span>
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide flex-1 ml-3">Statement</span>
        </div>
        {FEES_ACKNOWLEDGEMENTS.map(a => (
          <InitialsRow
            key={a.key}
            text={a.text}
            value={form[a.key]}
            onChange={v => set(a.key, v)}
            error={errors[a.key]}
          />
        ))}
        {Object.keys(errors).some(k => FEES_ACKNOWLEDGEMENTS.map(a => a.key).includes(k)) && (
          <p className="text-red-500 text-xs mt-3 font-medium">All lines require your initials to continue.</p>
        )}
      </SectionCard>

      <SectionCard title="Section 11 – Program Guidelines" titleTag="Initial Each Line">
        <p className="text-xs text-gray-500 mb-4">
          Please write your initials in the box beside each statement to confirm you understand these guidelines.
        </p>
        <div className="flex items-center justify-between mb-1 px-1">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide w-14 text-center">Initials</span>
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide flex-1 ml-3">Statement</span>
        </div>
        {PROGRAM_GUIDELINES.map(a => (
          <InitialsRow
            key={a.key}
            text={a.text}
            value={form[a.key]}
            onChange={v => set(a.key, v)}
            error={errors[a.key]}
          />
        ))}
        {Object.keys(errors).some(k => PROGRAM_GUIDELINES.map(a => a.key).includes(k)) && (
          <p className="text-red-500 text-xs mt-3 font-medium">All lines require your initials to continue.</p>
        )}
      </SectionCard>
    </>
  );

  const renderStep6 = () => (
    <>
      <SectionCard title="Section 12 – Confidentiality &amp; Consent">
        <div className="p-4 rounded-lg bg-gray-50 border border-gray-200 mb-5 text-sm text-gray-700 leading-relaxed">
          I, <span className="font-semibold">[Full legal Name]</span>, authorize{" "}
          <span className="font-semibold">Family Forever Inc.</span> to collect, use, and disclose information necessary
          for the purpose of providing supervised services, in accordance with privacy legislation.
        </div>
        <Input label="Full Legal Name" required placeholder="Type your full legal name" value={form.consentFullName} onChange={e => set("consentFullName", e.target.value)} error={errors.consentFullName} />
        <Input label="Signature (type your full name)" required placeholder="Electronic signature" value={form.consentSignature} onChange={e => set("consentSignature", e.target.value)} error={errors.consentSignature} />
        <Input label="Date" type="date" value={form.consentDate} onChange={e => set("consentDate", e.target.value)} />
      </SectionCard>

      <SectionCard title="Section 13 – Release of Information">
        <Input label="Disclosing Party Name" required value={form.disclosingPartyName} onChange={e => set("disclosingPartyName", e.target.value)} error={errors.disclosingPartyName} />
        <p className="text-sm text-gray-600 mb-3">
          <span className="font-semibold">Receiving Organization:</span> Family Forever Inc.
        </p>
        <div className="mb-4">
          <Label>Purpose of Disclosure</Label>
          <div className="flex flex-col gap-2 mt-2">
            {RELEASE_PURPOSES.map(p => (
              <label key={p} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.releasePurposes.includes(p)}
                  onChange={() => toggleReleasePurpose(p)}
                  className="w-4 h-4 rounded text-green-700"
                />
                {p}
              </label>
            ))}
          </div>
          {form.releasePurposes.includes("Other") && (
            <Input className="mt-3" placeholder="Specify other purpose" value={form.releaseOther} onChange={e => set("releaseOther", e.target.value)} />
          )}
        </div>
        <p className="text-sm text-gray-700 mb-4 italic">
          <span className="font-semibold">Scope of Information:</span> I authorize the release of the above information for the purpose of providing supervised services.
        </p>
        <Input label="Signature (type your full name)" required placeholder="Electronic signature" value={form.releaseSignature} onChange={e => set("releaseSignature", e.target.value)} error={errors.releaseSignature} />
        <Input label="Date" type="date" value={form.releaseDate} onChange={e => set("releaseDate", e.target.value)} />
      </SectionCard>

      <SectionCard title="Section 14 – Digital Signature">
        <div className="p-4 rounded-lg bg-gray-50 border border-gray-200 mb-5 text-sm text-gray-700 leading-relaxed">
          By signing below, I confirm that all information provided is accurate and that I have read and understood the Intake Form and Program Guidelines.
        </div>
        <Input label="Full Name" required placeholder="Type your full name" value={form.sigFullName} onChange={e => set("sigFullName", e.target.value)} error={errors.sigFullName} />
        <Input label="Signature (type your full name)" required placeholder="Electronic signature" value={form.sigSignature} onChange={e => set("sigSignature", e.target.value)} error={errors.sigSignature} />
        <Input label="Date" type="date" value={form.sigDate} onChange={e => set("sigDate", e.target.value)} />
      </SectionCard>
    </>
  );

  const renderStep7 = () => (
    <>
      {/* Info banner */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "#f0fdf4" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={GREEN} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-800">Engagement Protocols – Family Forever Inc.</h3>
            <p className="text-sm text-gray-600 mt-1 leading-relaxed">
              Family Forever Inc.'s Engagement Protocols establish clear expectations to ensure that supervised visits are conducted in a{" "}
              <strong>safe, respectful, and child-focused manner</strong>. All individuals participating in supervised visits are required to comply
              with these protocols at all times.{" "}
              <strong>Failure to comply may result in immediate suspension or termination of the visit and/or services.</strong>
            </p>
          </div>
        </div>
      </div>

      {/* Protocol sections */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-4">
        <div className="space-y-5">
          {ENGAGEMENT_PROTOCOLS.map(protocol => (
            <div key={protocol.num} className="pb-5 border-b border-gray-100 last:border-0 last:pb-0">
              <h4 className="text-sm font-bold text-gray-800 mb-2">
                {protocol.num}. {protocol.title}
              </h4>
              <ul className="space-y-1.5">
                {protocol.bullets.map((bullet, bi) => (
                  <li key={bi} className="flex items-start gap-2 text-sm text-gray-600">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: GREEN }} />
                    {bullet}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Acknowledgement */}
      <SectionCard title="Acknowledgement of Engagement Protocols">
        <div className="p-4 rounded-lg bg-gray-50 border border-gray-200 mb-5 text-sm text-gray-700 leading-relaxed">
          I acknowledge that I have read and understood the Engagement Protocols above and agree to comply with them throughout the visitation process.
        </div>
        <Input
          label="Name"
          required
          placeholder="Type your full name"
          value={form.protocolAckName}
          onChange={e => set("protocolAckName", e.target.value)}
          error={errors.protocolAckName}
        />
        <Input
          label="Signature (type your full name)"
          required
          placeholder="Electronic signature"
          value={form.protocolAckSignature}
          onChange={e => set("protocolAckSignature", e.target.value)}
          error={errors.protocolAckSignature}
        />
        <Input
          label="Date"
          type="date"
          value={form.protocolAckDate}
          onChange={e => set("protocolAckDate", e.target.value)}
        />
      </SectionCard>
    </>
  );

  const renderStep = () => {
    switch (step) {
      case 1: return renderStep1();
      case 2: return renderStep2();
      case 3: return renderStep3();
      case 4: return renderStep4();
      case 5: return renderStep5();
      case 6: return renderStep6();
      case 7: return renderStep7();
      default: return null;
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-20">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border font-semibold transition-all hover:bg-gray-50 flex-shrink-0"
              style={{ borderColor: "#e5e7eb", fontSize: 13, color: "#374151" }}
            >
              <ArrowLeft size={15} /> Back
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold text-gray-800 truncate">Family Intake Assessment</h1>
              <p className="text-xs text-gray-500">Family Forever Inc. — Edmonton, Alberta 2026</p>
            </div>
            <div className="text-right flex-shrink-0">
              <span className="text-xs text-gray-500">Step {step} of {STEPS.length}</span>
              <div className="w-28 h-1.5 bg-gray-200 rounded-full mt-1">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{ width: `${(step / STEPS.length) * 100}%`, background: GREEN }}
                />
              </div>
            </div>
          </div>
          <Stepper current={step} />
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
        {renderStep()}

        {/* Navigation */}
        <div className="flex justify-between items-center mt-2 pb-10">
          <button
            onClick={handleBack}
            disabled={step === 1}
            className="flex items-center gap-2 px-5 py-2 border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronLeft size={16} /> Back
          </button>

          {step < STEPS.length ? (
            <button
              onClick={handleNext}
              className="flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-semibold text-white transition-all"
              style={{ background: GREEN }}
              onMouseEnter={e => (e.currentTarget.style.background = "#166534")}
              onMouseLeave={e => (e.currentTarget.style.background = GREEN)}
            >
              Continue <ChevronRight size={16} />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-semibold text-white transition-all"
              style={{ background: submitting ? "#9ca3af" : GREEN, cursor: submitting ? "not-allowed" : "pointer" }}
            >
              {submitting ? "Submitting..." : "Submit Form"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default FamilyIntakeAssessmentForm;
