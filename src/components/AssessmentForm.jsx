import React, { useState } from "react";
import { addDoc, collection, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db, COLLECTION_NEW_INTAKES } from "../firebase";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Check } from "lucide-react";

const GREEN = "#1f6f43";

const ASSESSMENT_STEPS = [
  { id: 1, label: "Information & Legal" },
  { id: 2, label: "Safety & Needs" },
  { id: 3, label: "Logistics & Boundaries" },
  { id: 4, label: "Admin & Consent" },
];

const emptyForm = () => ({
  // Basic Information
  childNames: "",
  datesOfBirth: "",
  relationshipToChild: "",
  contactInfo: "",
  otherParentName: "",

  // Court & Legal
  hasCourtOrder: "", // "Yes" or "No"
  orderDate: "",
  courtType: "", // "Provincial Court" or "King's Bench"
  specificConditions: "",
  accessAgreed: "", // "Yes" or "No"
  protectionOrders: "",

  // Safety & Risk
  safetyConcerns: "",
  familyViolence: false,
  childProtectionInvolvement: false,
  policeInvolvement: false,
  escalationTriggers: "",

  // Child's Needs
  medicalNeeds: "",
  allergies: "",
  behavioralConcerns: "",
  diagnoses: "",
  childResponseToVisits: "",
  comfortItems: "",

  // Visit Structure
  visitType: "", // "In-office" or "In-community"
  preferredDayTime: "",
  visitLength: "",
  visitFrequency: "",

  // Exchange
  arrivalResponsibility: "",
  pickupResponsibility: "",
  concernParentsSameSpace: "",

  // Communication
  comfortableDirectComms: "",
  forbiddenTopics: "",
  harassmentHistory: "",

  // Payment
  awareOfFees: "",
  paymentResponsibility: "",
  otherPartyAgreedCost: "",
  requireCourtReports: "",

  // Consent
  comfortableProceeding: false,
});

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
      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-700"
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
      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-700 resize-none"
    />
    {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
  </div>
);

const RadioGroup = ({ label, options, value, onChange, error, required }) => (
  <div className="mb-4">
    {label && <Label required={required}>{label}</Label>}
    <div className="flex flex-col gap-2 mt-2">
      {options.map((opt) => (
        <label
          key={opt}
          className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all text-sm ${
            value === opt
              ? "border-green-700 bg-green-50"
              : "border-gray-200 hover:border-gray-300"
          }`}
        >
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

const Checkbox = ({ label, checked, onChange }) => (
  <label className="flex items-start gap-3 cursor-pointer mb-3">
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      className="mt-1 w-4 h-4 rounded border-gray-400 text-green-700 focus:ring-green-700"
    />
    <span className="text-sm text-gray-700">{label}</span>
  </label>
);

const ProgressBar = ({ current, total }) => (
  <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
    <div
      className="bg-green-700 h-2 rounded-full transition-all duration-300"
      style={{ width: `${(current / total) * 100}%` }}
    />
  </div>
);

const Stepper = ({ steps, currentStep }) => (
  <div className="flex items-center justify-center mb-8 hidden md:flex">
    {steps.map((step, index) => (
      <React.Fragment key={step.id}>
        <div className="flex flex-col items-center flex-1">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
              index + 1 <= currentStep
                ? "bg-green-700 text-white"
                : "bg-gray-200 text-gray-500"
            }`}
          >
            {index + 1 < currentStep ? <Check size={14} strokeWidth={3} /> : step.id}
          </div>
          <span className={`text-[10px] mt-1 text-center px-1 ${index + 1 <= currentStep ? "text-green-700 font-semibold" : "text-gray-500"}`} style={{ lineHeight: 1.2 }}>
            {step.label}
          </span>
        </div>
        {index < steps.length - 1 && (
          <div
            className={`h-0.5 flex-1 mx-2 ${
              index + 1 < currentStep ? "bg-green-700" : "bg-gray-200"
            }`}
            style={{ marginTop: -15 }}
          />
        )}
      </React.Fragment>
    ))}
  </div>
);

const AssessmentForm = ({ user, assessmentId: existingAssessmentId, onSubmitSuccess }) => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(emptyForm());
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const set = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: null }));
  };

  const validate = () => {
    const errs = {};
    if (step === 1) {
      if (!form.childNames.trim()) errs.childNames = "Required";
      if (!form.relationshipToChild.trim()) errs.relationshipToChild = "Required";
      if (!form.otherParentName.trim()) errs.otherParentName = "Required";
      if (!form.hasCourtOrder) errs.hasCourtOrder = "Required";
      if (form.hasCourtOrder === "No" && !form.accessAgreed) errs.accessAgreed = "Required";
    }
    if (step === 2) {
      // Step 2 doesn't have strict required fields as they can be empty
    }
    if (step === 3) {
      if (!form.visitType) errs.visitType = "Required";
    }
    if (step === 4) {
      if (!form.comfortableProceeding) errs.comfortableProceeding = "You must acknowledge to continue";
    }
    setErrors(errs);

    if (Object.keys(errs).length > 0) {
      // Scroll to top to show errors
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    return Object.keys(errs).length === 0;
  };

  const handleNext = () => {
    if (!validate()) return;
    setStep((s) => s + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePrev = () => {
    setStep((s) => s - 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      const payload = {
        formType: "assessment",
        status: "Submitted",
        submittedAt: serverTimestamp(),
        submittedBy: user?.id || "",
        applicantEmail: user?.email || "",
        ...form
      };

      let newAssessmentId = existingAssessmentId;

      if (existingAssessmentId) {
        await updateDoc(doc(db, COLLECTION_NEW_INTAKES, existingAssessmentId), payload);
      } else {
        const docRef = await addDoc(collection(db, COLLECTION_NEW_INTAKES), payload);
        newAssessmentId = docRef.id;
      }

      if (user?.id) {
        await updateDoc(doc(db, "intakeUsers", user.id), {
          assessmentId: newAssessmentId,
        });
      }

      if (onSubmitSuccess) {
        onSubmitSuccess();
      } else {
        navigate("/intake-form/submitted");
      }
    } catch (err) {
      console.error("Assessment submit error:", err);
      alert("Failed to submit: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const renderSectionHeader = (title) => (
    <h3 className="text-lg font-bold text-gray-900 border-b pb-2 mb-4 mt-6" style={{ borderColor: "#E5E7EB" }}>
      {title}
    </h3>
  );

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center py-10 px-4 sm:px-6"
      style={{ background: "#F9FAFB", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-sm border p-6 sm:p-8">
        {/* Header */}
        <div className="text-center mb-6">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ background: "#FEF3C7" }} /* Amber tint for Assessment */
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "#111827", marginBottom: 6 }}>
            Family Intake Assessment
          </h1>
          <p style={{ fontSize: 14, color: "#6B7280" }}>
            Please complete this assessment to help us ensure visits are set up safely and appropriately.
          </p>
        </div>

        <ProgressBar current={step} total={ASSESSMENT_STEPS.length} />
        <Stepper steps={ASSESSMENT_STEPS} currentStep={step} />

        {/* ================= STEP 1 ================= */}
        {step === 1 && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            {renderSectionHeader("1. Basic Information")}
            <Input label="Full name of the child(ren)" required value={form.childNames} onChange={(e) => set("childNames", e.target.value)} error={errors.childNames} />
            <Input label="Date(s) of birth" placeholder="e.g. DD/MM/YYYY" value={form.datesOfBirth} onChange={(e) => set("datesOfBirth", e.target.value)} />
            <Input label="Your relationship to the child(ren)" required value={form.relationshipToChild} onChange={(e) => set("relationshipToChild", e.target.value)} error={errors.relationshipToChild} />
            <Input label="Best contact number and email" value={form.contactInfo} onChange={(e) => set("contactInfo", e.target.value)} />
            <Input label="Full name of the other parent / visiting party" required value={form.otherParentName} onChange={(e) => set("otherParentName", e.target.value)} error={errors.otherParentName} />

            {renderSectionHeader("2. Court & Legal Status")}
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 mb-4">
              <RadioGroup
                label="Is there a court order in place for supervised access?"
                required
                options={["Yes", "No"]}
                value={form.hasCourtOrder}
                onChange={(v) => set("hasCourtOrder", v)}
                error={errors.hasCourtOrder}
              />
              
              {form.hasCourtOrder === "Yes" && (
                <div className="pl-4 border-l-2 border-green-500 mt-4 animate-in fade-in">
                  <Input label="Date of the order" type="date" value={form.orderDate} onChange={(e) => set("orderDate", e.target.value)} />
                  <RadioGroup label="Court Type" options={["Provincial Court", "Court of King's Bench", "Other / Not Sure"]} value={form.courtType} onChange={(v) => set("courtType", v)} />
                  <Textarea label="Are there any specific conditions or restrictions listed? (e.g. no photos, no gifts)" value={form.specificConditions} onChange={(e) => set("specificConditions", e.target.value)} />
                </div>
              )}

              {form.hasCourtOrder === "No" && (
                <div className="pl-4 border-l-2 border-amber-500 mt-4 animate-in fade-in">
                  <RadioGroup label="Is this access agreed upon between both parties?" required options={["Yes", "No", "Unsure"]} value={form.accessAgreed} onChange={(v) => set("accessAgreed", v)} error={errors.accessAgreed} />
                </div>
              )}
            </div>
            
            <Textarea label="Are there any protection orders, restraining orders, or no-contact orders in place?" placeholder="Please list details if applicable..." value={form.protectionOrders} onChange={(e) => set("protectionOrders", e.target.value)} />
          </div>
        )}

        {/* ================= STEP 2 ================= */}
        {step === 2 && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            {renderSectionHeader("3. Safety & Risk Considerations")}
            <Textarea label="Are there any safety concerns we should be aware of? (e.g. past violence, threats, mental health)" value={form.safetyConcerns} onChange={(e) => set("safetyConcerns", e.target.value)} />
            
            <div className="mb-4 bg-red-50 p-4 rounded-xl border border-red-100">
              <Label>Has there ever been:</Label>
              <div className="mt-2 space-y-1">
                <Checkbox label="Family violence" checked={form.familyViolence} onChange={(v) => set("familyViolence", v)} />
                <Checkbox label="Child protection involvement (e.g. CFS/DFNA/Child Intervention)" checked={form.childProtectionInvolvement} onChange={(v) => set("childProtectionInvolvement", v)} />
                <Checkbox label="Police Involvement related to the other party" checked={form.policeInvolvement} onChange={(v) => set("policeInvolvement", v)} />
              </div>
            </div>

            <Textarea label="Are there any triggers we should know about that could escalate conflict?" value={form.escalationTriggers} onChange={(e) => set("escalationTriggers", e.target.value)} />

            {renderSectionHeader("4. Child's Needs & Wellbeing")}
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 mb-4">
              <Textarea label="Medical Needs & Allergies" placeholder="List any medical needs or allergies..." value={form.allergies} onChange={(e) => set("allergies", e.target.value)} />
              <Textarea label="Behavioral or emotional concerns" value={form.behavioralConcerns} onChange={(e) => set("behavioralConcerns", e.target.value)} />
              <Textarea label="Diagnoses (e.g. ADHD, autism, trauma-related needs)" value={form.diagnoses} onChange={(e) => set("diagnoses", e.target.value)} />
              <Textarea label="How does your child usually respond before or after visits with the other parent?" value={form.childResponseToVisits} onChange={(e) => set("childResponseToVisits", e.target.value)} />
              <Input label="Are there any comfort items the child should bring?" value={form.comfortItems} onChange={(e) => set("comfortItems", e.target.value)} placeholder="e.g. favorite toy, blanket" />
            </div>
          </div>
        )}

        {/* ================= STEP 3 ================= */}
        {step === 3 && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            {renderSectionHeader("5. Visit Structure & Expectations")}
            <RadioGroup label="What type of visit are you requesting?" required options={["In-office visit", "In-community visit (e.g. park, mall, restaurant)", "Not sure yet"]} value={form.visitType} onChange={(v) => set("visitType", v)} error={errors.visitType} />
            <Input label="Do you have a preferred day and time?" value={form.preferredDayTime} onChange={(e) => set("preferredDayTime", e.target.value)} />
            <Input label="How long is the visit supposed to be per the order or agreement?" value={form.visitLength} onChange={(e) => set("visitLength", e.target.value)} />
            <Input label="How often are visits expected to occur? (weekly, bi-weekly, etc.)" value={form.visitFrequency} onChange={(e) => set("visitFrequency", e.target.value)} />

            {renderSectionHeader("6. Exchange & Transportation")}
            <Input label="Who will be responsible for bringing the child to the visit?" value={form.arrivalResponsibility} onChange={(e) => set("arrivalResponsibility", e.target.value)} />
            <Input label="Who will pick the child up after the visit?" value={form.pickupResponsibility} onChange={(e) => set("pickupResponsibility", e.target.value)} />
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 mt-2">
              <RadioGroup label="Is there any concern about the parents being in the same space?" options={["Yes (staggered arrival/departure required)", "No"]} value={form.concernParentsSameSpace} onChange={(v) => set("concernParentsSameSpace", v)} />
            </div>

            {renderSectionHeader("7. Communication Boundaries")}
            <RadioGroup label="Are you comfortable with us communicating directly with the other party?" options={["Yes", "No"]} value={form.comfortableDirectComms} onChange={(v) => set("comfortableDirectComms", v)} />
            <Textarea label="Are there any topics the other party is not allowed to discuss with the child?" value={form.forbiddenTopics} onChange={(e) => set("forbiddenTopics", e.target.value)} />
            <Textarea label="Is there any history of harassment, manipulation, or boundary issues we should be aware of?" value={form.harassmentHistory} onChange={(e) => set("harassmentHistory", e.target.value)} />
          </div>
        )}

        {/* ================= STEP 4 ================= */}
        {step === 4 && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            {renderSectionHeader("8. Payment & Administration")}
            <RadioGroup label="Are you aware of our fees and payment structure?" options={["Yes", "No", "Need more information"]} value={form.awareOfFees} onChange={(v) => set("awareOfFees", v)} />
            <Input label="Who will be responsible for payment?" value={form.paymentResponsibility} onChange={(e) => set("paymentResponsibility", e.target.value)} />
            <RadioGroup label="Has the other party agreed to the cost of supervised visits?" options={["Yes", "No", "Not sure"]} value={form.otherPartyAgreedCost} onChange={(v) => set("otherPartyAgreedCost", v)} />
            <RadioGroup label="Do you require invoices, receipts, or reports for court?" options={["Yes", "No"]} value={form.requireCourtReports} onChange={(v) => set("requireCourtReports", v)} />

            {renderSectionHeader("9. Consent & Next Steps")}
            <div className="bg-emerald-50 p-5 rounded-xl border border-emerald-100 mb-4">
              <h4 className="font-bold text-emerald-900 mb-2">Almost Done</h4>
              <p className="text-sm text-emerald-800 mb-4 leading-relaxed">
                By proceeding, you acknowledge that we will require:
                <ul className="list-disc ml-5 mt-2 space-y-1">
                  <li>A copy of the court order (if applicable)</li>
                  <li>Completed Intake forms</li>
                  <li>A signed service agreement</li>
                </ul>
              </p>
              
              <Checkbox 
                label="I am comfortable proceeding and have provided accurate information." 
                checked={form.comfortableProceeding} 
                onChange={(v) => set("comfortableProceeding", v)} 
              />
              {errors.comfortableProceeding && <p className="text-red-500 text-xs ml-7 -mt-2">{errors.comfortableProceeding}</p>}
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between mt-8 pt-5 border-t" style={{ borderColor: "#E5E7EB" }}>
           <button
            onClick={handlePrev}
            disabled={step === 1}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${
              step === 1
                ? "text-gray-300 cursor-not-allowed bg-transparent"
                : "text-gray-600 bg-gray-100 hover:bg-gray-200"
            }`}
          >
            <ChevronLeft size={18} />
            Back
          </button>

          {step < ASSESSMENT_STEPS.length ? (
             <button
              onClick={handleNext}
              className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold text-white shadow-sm transition-all shadow-emerald-500/20"
              style={{ background: GREEN }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#166534")}
              onMouseLeave={(e) => (e.currentTarget.style.background = GREEN)}
            >
              Continue
              <ChevronRight size={18} />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold text-white shadow-md transition-all w-48 shadow-emerald-600/30"
              style={{ background: submitting ? "#9CA3AF" : GREEN, cursor: submitting ? "not-allowed" : "pointer" }}
            >
              {submitting ? "Submitting..." : "Submit Assessment"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AssessmentForm;